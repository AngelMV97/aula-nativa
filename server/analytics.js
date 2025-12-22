// server/analytics.js
const express = require("express");

module.exports = function (supabase) {
  const router = express.Router();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Middleware: require a Bearer token and validate it with Supabase
  async function requireAuth(req, res, next) {
    try {
      const authHeader = (req.headers.authorization || req.headers.Authorization || "").toString().trim();
      if (!authHeader) {
        console.warn("requireAuth: no auth header");
        return res.status(401).send("Missing Authorization header");
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        console.warn("requireAuth: malformed header:", authHeader.slice(0, 30));
        return res.status(401).send("Invalid Authorization header format");
      }

      const token = parts[1];
      if (!token || token.length < 20) {
        console.warn("requireAuth: token too short");
        return res.status(401).send("Invalid token");
      }

      // Validate token with Supabase
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data || !data.user) {
        console.warn("requireAuth: supabase.auth.getUser failed:", error?.message || "no user");
        return res.status(401).send("Invalid token");
      }

      // Attach authenticated user to request
      req.authUser = data.user;
      next();
    } catch (err) {
      console.error("requireAuth exception:", err);
      res.status(500).send("Auth error");
    }
  }

  // Ownership check: ensure the authenticated user is allowed to access data for teacherId
  // Logic:
  //  - allow if authUser.id === teacherId
  //  - otherwise look up profiles table for authUser.id; require role === 'teacher'
  //    and either profile.teacher_id === teacherId OR profile.id === teacherId
  async function ensureTeacherOwnership(req, res, next) {
    try {
      const teacherId = req.query.teacherId || req.body?.teacherId;
      if (!teacherId || !uuidRegex.test(teacherId)) return res.status(400).send("Missing/invalid teacherId");

      const authUserId = req.authUser && req.authUser.id;
      if (!authUserId) return res.status(401).send("Unauthenticated");

      if (authUserId === teacherId) {
        return next();
      }

      // Fetch the profile for authUserId and check role/teacher mapping
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, role, teacher_id")
        .eq("id", authUserId)
        .single();

      if (profileErr || !profile) {
        console.warn("ensureTeacherOwnership: profile lookup failed", profileErr);
        return res.status(403).send("Forbidden");
      }

      // Accept if profile.role === 'teacher' AND profile.teacher_id matches OR profile.id matches teacherId
      const role = (profile.role || "").toString().toLowerCase();
      const matchesTeacherId =
        (profile.teacher_id && profile.teacher_id === teacherId) ||
        (profile.id && profile.id === teacherId);

      if (role === "teacher" && matchesTeacherId) {
        return next();
      }

      return res.status(403).send("Forbidden: you are not authorized for this teacher's data");
    } catch (err) {
      console.error("ensureTeacherOwnership error:", err);
      return res.status(500).send("Server error");
    }
  }

  // Overview: unique students, total events, materials touched
  router.get("/statistics/overview", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;
      const days = parseInt(req.query.days || "90", 10);

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch recent events (limited to safe size)
      const { data, error } = await supabase
        .from("student_activity")
        .select("student_id, material_id, created_at")
        .eq("teacher_id", teacherId)
        .gte("created_at", since)
        .limit(10000);

      if (error) throw error;

      const totalEvents = (data || []).length;
      const uniqueStudents = new Set((data || []).map((r) => r.student_id).filter(Boolean)).size;
      const uniqueMaterials = new Set((data || []).map((r) => r.material_id).filter(Boolean)).size;

      res.json({
        ok: true,
        unique_students: uniqueStudents,
        total_events: totalEvents,
        materials_touched: uniqueMaterials,
      });
    } catch (err) {
      console.error("overview error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Events time-series (tries materialized view then falls back)
  router.get("/statistics/events", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;
      const days = parseInt(req.query.days || "30", 10);

      const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Try to use the materialized view if present
      try {
        const { data: mvData, error: mvErr } = await supabase
          .from("mv_daily_events")
          .select("day, events")
          .eq("teacher_id", teacherId)
          .gte("day", sinceDate.toISOString())
          .order("day", { ascending: true });

        if (!mvErr && mvData && mvData.length) {
          const series = mvData.map((r) => ({ day: r.day, events: r.events }));
          return res.json({ ok: true, series });
        }
      } catch (e) {
        // ignore and fallback
      }

      // Fallback aggregation in JS (limited fetch)
      const { data, error } = await supabase
        .from("student_activity")
        .select("created_at")
        .eq("teacher_id", teacherId)
        .gte("created_at", sinceDate.toISOString())
        .limit(10000);

      if (error) throw error;

      const buckets = {};
      (data || []).forEach((r) => {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        buckets[d] = (buckets[d] || 0) + 1;
      });

      // Build a contiguous series of last `days` days
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().slice(0, 10);
        series.push({ day: key, events: buckets[key] || 0 });
      }

      res.json({ ok: true, series });
    } catch (err) {
      console.error("events error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Top materials: events + accuracy
  router.get("/statistics/materials", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;
      const days = parseInt(req.query.days || "180", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("student_activity")
        .select("material_id, success, created_at")
        .eq("teacher_id", teacherId)
        .gte("created_at", since)
        .limit(10000);

      if (error) throw error;

      const map = {};
      (data || []).forEach((r) => {
        const id = r.material_id || "unknown";
        if (!map[id]) map[id] = { material_id: id, events: 0, successes: 0, attempts: 0 };
        map[id].events++;
        if (r.success === true) {
          map[id].successes++;
          map[id].attempts++;
        } else if (r.success === false) {
          map[id].attempts++;
        }
      });

      const arr = Object.values(map)
        .map((m) => ({
          material_id: m.material_id,
          events: m.events,
          attempts: m.attempts,
          accuracy: m.attempts > 0 ? m.successes / m.attempts : null,
        }))
        .sort((a, b) => b.events - a.events)
        .slice(0, limit);

      const materialIds = arr.map((a) => a.material_id).filter(Boolean);
      const { data: matData } = await supabase
        .from("materials")
        .select("id, file_name")
        .in("id", materialIds);

      const names = {};
      (matData || []).forEach((m) => (names[m.id] = m.file_name));

      const result = arr.map((a) => ({ ...a, file_name: names[a.material_id] || null }));

      res.json({ ok: true, materials: result });
    } catch (err) {
      console.error("materials error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // POST /api/statistics/event
  // Accepts JSON body:
  // { studentId, teacherId, materialId, actionType, metadata, success, score, durationSeconds }
  // Requires authentication. Authenticated user's id will be used as studentId if missing.
  router.post("/statistics/event", requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      let {
        studentId,
        teacherId,
        materialId,
        actionType,
        metadata = {},
        success = null,
        score = null,
        durationSeconds = null,
      } = body;

      if (!actionType) return res.status(400).send("Missing actionType");
      
      // teacherId is optional for student-initiated events (e.g., assistant queries)
      if (teacherId && !uuidRegex.test(teacherId)) {
        return res.status(400).send("Invalid teacherId format");
      }

      // Use authenticated user's id as studentId if client didn't provide it
      if (!studentId) studentId = req.authUser && req.authUser.id;

      const payload = {
        student_id: studentId || null,
        teacher_id: teacherId || null,
        material_id: materialId || null,
        action_type: actionType,
        metadata: metadata || {},
        success: success === null ? null : !!success,
        score: score === null ? null : score,
        duration_seconds: durationSeconds === null ? null : durationSeconds,
      };

      const { error } = await supabase.from("student_activity").insert([payload]);
      if (error) {
        console.error("insert student_activity error:", error);
        return res.status(500).send(error.message || "Insert error");
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("POST /statistics/event error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/statistics/grades-overview
  // Get grade statistics overview by grade level
  router.get("/statistics/grades-overview", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;

      // Get all periods for this teacher
      const { data: periods, error: periodError } = await supabase
        .from("grade_periods")
        .select("id, period_name, created_at")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(5); // Last 5 periods

      if (periodError) throw periodError;

      if (!periods || periods.length === 0) {
        return res.json({
          ok: true,
          hasPeriods: false,
          message: "No hay períodos registrados"
        });
      }

      // Get grades for all periods
      const periodIds = periods.map(p => p.id);
      const { data: allGrades, error: gradesError } = await supabase
        .from("student_grades")
        .select("period_id, score, student_code")
        .in("period_id", periodIds);

      if (gradesError) throw gradesError;

      // Calculate statistics per period
      const periodStats = periods.map(period => {
        const periodGrades = allGrades.filter(g => g.period_id === period.id);
        const scores = periodGrades.map(g => g.score);
        
        if (scores.length === 0) {
          return {
            period_id: period.id,
            period_name: period.period_name,
            created_at: period.created_at,
            total_students: 0,
            average_score: 0,
            passing_count: 0,
            failing_count: 0,
            passing_rate: 0
          };
        }

        const total = scores.length;
        const average = scores.reduce((a, b) => a + b, 0) / total;
        const passing = scores.filter(s => s >= 3.0).length;
        const failing = total - passing;

        return {
          period_id: period.id,
          period_name: period.period_name,
          created_at: period.created_at,
          total_students: total,
          average_score: parseFloat(average.toFixed(2)),
          passing_count: passing,
          failing_count: failing,
          passing_rate: parseFloat(((passing / total) * 100).toFixed(1))
        };
      });

      // Overall statistics
      const allScores = allGrades.map(g => g.score);
      const uniqueStudents = new Set(allGrades.map(g => g.student_code)).size;
      const overallAverage = allScores.length > 0 
        ? parseFloat((allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2))
        : 0;
      const overallPassing = allScores.filter(s => s >= 3.0).length;
      const overallPassingRate = allScores.length > 0
        ? parseFloat(((overallPassing / allScores.length) * 100).toFixed(1))
        : 0;

      res.json({
        ok: true,
        hasPeriods: true,
        overall: {
          total_students: uniqueStudents,
          total_grades: allScores.length,
          average_score: overallAverage,
          passing_rate: overallPassingRate,
          periods_count: periods.length
        },
        periods: periodStats
      });

    } catch (err) {
      console.error("grades-overview error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/statistics/top-students
  // Get top performing students across all periods or filtered by period
  router.get("/statistics/top-students", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;
      const limit = parseInt(req.query.limit || "10", 10);
      const periodId = req.query.periodId || null; // Period ID is a UUID string, not an integer

      // Build query for grades
      let query = supabase
        .from("student_grades")
        .select("student_code, student_name, score, period_id")
        .eq("teacher_id", teacherId);

      // Apply period filter if provided
      if (periodId) {
        query = query.eq("period_id", periodId);
      }

      const { data: allGrades, error } = await query;

      if (error) throw error;

      if (!allGrades || allGrades.length === 0) {
        return res.json({ ok: true, students: [] });
      }

      // Group by student and calculate average
      const studentMap = {};
      allGrades.forEach(grade => {
        const key = grade.student_code;
        if (!studentMap[key]) {
          studentMap[key] = {
            student_code: grade.student_code,
            student_name: grade.student_name,
            scores: [],
            total_grades: 0
          };
        }
        studentMap[key].scores.push(grade.score);
        studentMap[key].total_grades++;
      });

      // Calculate averages and sort
      const students = Object.values(studentMap)
        .map(student => ({
          student_code: student.student_code,
          student_name: student.student_name,
          average_score: parseFloat((student.scores.reduce((a, b) => a + b, 0) / student.scores.length).toFixed(2)),
          total_grades: student.total_grades,
          highest_score: Math.max(...student.scores),
          lowest_score: Math.min(...student.scores)
        }))
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, limit);

      res.json({ ok: true, students });

    } catch (err) {
      console.error("top-students error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/statistics/grade-distribution
  // Get score distribution (how many students in each score range)
  router.get("/statistics/grade-distribution", requireAuth, ensureTeacherOwnership, async (req, res) => {
    try {
      const teacherId = req.query.teacherId;
      const periodId = req.query.periodId; // Optional: specific period

      let query = supabase
        .from("student_grades")
        .select("score")
        .eq("teacher_id", teacherId);

      if (periodId) {
        query = query.eq("period_id", periodId);
      }

      const { data: grades, error } = await query;

      if (error) throw error;

      if (!grades || grades.length === 0) {
        return res.json({ ok: true, distribution: [] });
      }

      // Create distribution buckets
      const ranges = [
        { label: "0.0 - 1.0", min: 0, max: 1.0, count: 0 },
        { label: "1.1 - 2.0", min: 1.1, max: 2.0, count: 0 },
        { label: "2.1 - 2.9", min: 2.1, max: 2.9, count: 0 },
        { label: "3.0 - 3.5", min: 3.0, max: 3.5, count: 0 },
        { label: "3.6 - 4.0", min: 3.6, max: 4.0, count: 0 },
        { label: "4.1 - 4.5", min: 4.1, max: 4.5, count: 0 },
        { label: "4.6 - 5.0", min: 4.6, max: 5.0, count: 0 }
      ];

      grades.forEach(grade => {
        const score = grade.score;
        for (let range of ranges) {
          if (score >= range.min && score <= range.max) {
            range.count++;
            break;
          }
        }
      });

      res.json({ ok: true, distribution: ranges, total: grades.length });

    } catch (err) {
      console.error("grade-distribution error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // In analytics.js backend
  router.get('/enhanced-overview', requireAuth, async (req, res) => {
    const teacherId = req.authUser.id;
    
    // Get students with their activity and grades
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        grade,
        section,
        user_id,
        student_activity:student_activity(count),
        student_grades:student_grades(
          score,
          assessments,
          grade_periods(period_name)
        )
      `)
      .eq('grade', teacherGrade) // Filter by teacher's assigned grades
      .eq('section', teacherSection);
    
    // Aggregate data safely
    const studentsWithPerformance = data.map(student => ({
      name: student.name, // Safe for teacher view
      grade: student.grade,
      section: student.section,
      activityCount: student.student_activity?.[0]?.count || 0,
      averageGrade: calculateAverage(student.student_grades),
      lastActivity: getLastActivity(student.user_id)
    }));
    
    res.json({ students: studentsWithPerformance });
  });

  return router;
};