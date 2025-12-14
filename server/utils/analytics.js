// server/utils/analytics.js
async function logStudentEvent(supabase, {
  studentId,
  teacherId,
  materialId,
  actionType,
  metadata,
  success,
  score,
  durationSeconds,
}) {
  try {
    const payload = {
      student_id: studentId || null,
      teacher_id: teacherId || null,
      material_id: materialId || null,
      action_type: actionType,
      metadata: metadata || {},
      success: success === undefined ? null : !!success,
      score: score === undefined ? null : score,
      duration_seconds: durationSeconds === undefined ? null : durationSeconds,
    };
    const { error } = await supabase.from("student_activity").insert([payload]);
    if (error) console.warn("logStudentEvent error:", error);
    return { ok: !error, error };
  } catch (err) {
    console.error("logStudentEvent exception:", err);
    return { ok: false, error: err };
  }
}

module.exports = { logStudentEvent };