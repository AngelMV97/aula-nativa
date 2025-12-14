// server/student.js
const express = require("express");

// small helper to parse embeddings returned by Supabase (vector) into JS arrays
function parseEmbedding(e) {
  if (!e) return null;
  if (Array.isArray(e)) return e.map(Number);
  if (typeof e === "string") {
    // Supabase sometimes returns "{0.1,0.2,...}"
    const trimmed = e.replace(/^{|}$/g, "");
    return trimmed.split(",").map((x) => parseFloat(x));
  }
  return null;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a) {
  return Math.sqrt(dot(a, a));
}
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  const dn = norm(a) * norm(b);
  if (dn === 0) return -1;
  return dot(a, b) / dn;
}

module.exports = function (supabase, embeddingsClient, options = {}) {
  const router = express.Router();

  const USE_MOCK = process.env.MOCK_EMBEDDINGS === "true" || options.useMock === true;
  const OPENAI_KEY = process.env.OPENAI_API_KEY || null;

  // requireAuth (similar to analytics.js) - validate Bearer token with Supabase
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

      req.authUser = data.user;
      next();
    } catch (err) {
      console.error("requireAuth exception:", err);
      res.status(500).send("Auth error");
    }
  }

  // POST /api/assistant/query
  // Body: { question: string, teacherId?: uuid, materialIds?: [uuid], top_k?: number }
  // Requires auth (student or teacher). Returns { answer, suggestions: [..], sources: [..] }
  router.post("/assistant/query", requireAuth, async (req, res) => {
    try {
      const { question, teacherId, materialIds: requestedMaterialIds, top_k = 5 } = req.body || {};
      if (!question || typeof question !== "string" || question.trim().length < 3) {
        return res.status(400).send("Missing or too-short question");
      }

      // fetch authenticated user's profile to obtain grade (if present)
      let studentGrade = null;
      try {
        const userId = req.authUser?.id;
        if (userId) {
          const { data: profile, error: profErr } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();
          
          // If student, get grade from students table
          if (!profErr && profile?.role === 'student') {
            const { data: student, error: studentErr } = await supabase
              .from("students")
              .select("grade")
              .eq("user_id", userId)
              .single();
            
            if (!studentErr && student) {
              studentGrade = student.grade || null;
            }
          }
        }
      } catch (pe) {
      // ignore profile fetch error, continue without grade
      }

      // compute query embedding (use embeddingsClient from LangChain if available)
      let queryEmbedding = null;
      if (!USE_MOCK && embeddingsClient) {
        try {
          // embeddingsClient may expose embedQuery like in embeddings.js
          if (typeof embeddingsClient.embedQuery === "function") {
            queryEmbedding = await embeddingsClient.embedQuery(question);
          } else if (typeof embeddingsClient.embed === "function") {
            // fallback
            queryEmbedding = await embeddingsClient.embed(question);
          }
        } catch (err) {
          console.warn("embedding generation failed, falling back to mock:", err);
          queryEmbedding = null;
        }
      }

      // If still no embedding, create a deterministic mock vector (small)
      if (!queryEmbedding) {
        if (USE_MOCK) {
          queryEmbedding = new Array(1536).fill(0).map((_, i) => Math.sin(i + question.length) * 0.001);
        } else {
          // If OPENAI_API_KEY exists we tried above; if invalid key, fall back to mock
          queryEmbedding = new Array(1536).fill(0).map((_, i) => Math.cos(i + question.length) * 0.001);
        }
      }

      // Decide which materials to search:
      let materialIds = Array.isArray(requestedMaterialIds) && requestedMaterialIds.length > 0
        ? requestedMaterialIds.slice()
        : [];

      if (materialIds.length === 0) {
        // If teacherId provided: fetch materials for that teacher
        if (teacherId) {
          const { data: mats, error: matErr } = await supabase
            .from("materials")
            .select("id")
            .eq("teacher_id", teacherId)
            .limit(1000);

          if (!matErr && mats && mats.length) {
            materialIds = mats.map((m) => m.id);
          }
        }
      }

      // If still empty, fetch a limited set of recent materials
      if (materialIds.length === 0) {
        const { data: lastMats, error: lastErr } = await supabase
          .from("materials")
          .select("id")
          .order("uploaded_at", { ascending: false })
          .limit(50);
        if (!lastErr && lastMats) materialIds = lastMats.map((m) => m.id);
      }

      if (!materialIds || materialIds.length === 0) {
        return res.status(400).send("No materials available to search");
      }

      // Fetch embeddings for candidate materials (limit to avoid huge fetch)
      const fetchLimit = Math.min(2000, materialIds.length * 20); // rough cap
      const { data: candidates, error: embErr } = await supabase
        .from("material_embeddings")
        .select("id, material_id, content, embedding")
        .in("material_id", materialIds)
        .limit(fetchLimit);

      if (embErr) {
        console.error("Failed to fetch embeddings:", embErr);
        return res.status(500).send("Failed to fetch material embeddings");
      }

      // Compute similarities
      const scored = (candidates || []).map((c) => {
        const emb = parseEmbedding(c.embedding);
        const score = cosineSim(queryEmbedding, emb);
        return { id: c.id, content: c.content, material_id: c.material_id, score };
      });

      scored.sort((a, b) => (b.score || -1) - (a.score || -1));
      const top = scored.slice(0, top_k).filter(Boolean);

      // Build a short context from top results (cap characters)
      const MAX_CHARS = 2000;
      let context = "";
      const sources = [];
      for (const t of top) {
        const piece = (t.content || "").trim();
        if (!piece) continue;
        const truncated = piece.length > 800 ? piece.slice(0, 800) + "…" : piece;
        context += `---\n${truncated}\n`;
        sources.push({ material_id: t.material_id, excerpt: truncated, score: t.score });
        if (context.length > MAX_CHARS) break;
      }

      // Prepare a prompt for the model (or create a mock reply)
      const gradeContext = studentGrade ? `El estudiante está en grado ${studentGrade}.` : "El grado del estudiante no está especificado.";
      const systemPrompt = `Eres un asistente pedagógico para estudiantes colombianos. ${gradeContext} \
Tu objetivo es ayudar al estudiante a llegar a la solución por sí mismo. \
No des la respuesta exacta; en su lugar, guía con pasos, analogías y preguntas que el estudiante pueda responder. \
Proporciona 2-4 preguntas de seguimiento que el estudiante pueda elegir como botones. \
Si hay fragmentos relevantes, mencionalos brevemente y cita la fuente con su material_id.`;

      const userPrompt = `Pregunta del estudiante:
"${question}"

Contexto extraído:
${context}

Instrucciones:
- Ajusta el lenguaje y el nivel al grado del estudiante (ej. grado ${studentGrade || "N/A"}).
- Guía al estudiante sin dar la respuesta completa.
- Usa una analogía corta si ayuda.
- Da entre 2 y 4 preguntas sugeridas (cada una corta).
- Incluye una breve referencia a las fuentes si es pertinente.
- Mantén la respuesta en español.`;


      // Attempt to call OpenAI Chat if API key exists and not in MOCK mode
      let assistantText = null;
      let suggestions = [];
      if (OPENAI_KEY && !USE_MOCK) {
        try {
          const chatPayload = {
            model: "gpt-4o-mini", // fallback model name; adjust if you prefer a different model
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 512,
            temperature: 0.7,
          };

          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_KEY}`,
            },
            body: JSON.stringify(chatPayload),
          });

          if (!resp.ok) {
            const body = await resp.text();
            console.warn("OpenAI chat returned non-OK:", resp.status, body);
            // fall through to mock reply
          } else {
            const json = await resp.json();
            const text = json.choices?.[0]?.message?.content;
            if (text) {
              assistantText = text;
              // Try to extract suggestions from assistantText by looking for lines that start with "-" or numbered list.
              const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
              // crude suggestion extraction: lines that end with question mark or start with "¿"
              suggestions = lines.filter((l) => l.endsWith("?") || l.startsWith("¿")).slice(0, 4);
            }
          }
        } catch (err) {
          console.warn("OpenAI chat call failed:", err);
        }
      }

      // If assistantText still null, create a heuristic fallback reply
      if (!assistantText) {
        assistantText = `Buen trabajo preguntando sobre: "${question}". Para empezar, intenta comprender qué te piden: identifica los datos y qué se busca. \
Una analogía breve: imagina que el problema es como armar un rompecabezas donde cada dato es una pieza. Empieza por identificar las piezas que encajan más fácil.\n\nSugerencias:`;
        suggestions = [
          "¿Puedes reescribir el problema con tus palabras?",
          "¿Qué datos tienes y cuáles faltan?",
          "¿Cuál sería un primer paso razonable?",
        ];
      }

      // Log the assistant query to student_activity
      try {
        const payload = {
          student_id: req.authUser?.id || null,
          teacher_id: teacherId || null,
          material_id: (top[0] && top[0].material_id) || null,
          action_type: "assistant_query",
          metadata: {
            question,
            top_sources: sources.slice(0, 5),
            suggestion_count: suggestions.length,
          },
          success: null,
          score: null,
          duration_seconds: null,
        };
        await supabase.from("student_activity").insert([payload]);
      } catch (logErr) {
        console.warn("Failed to log assistant_query:", logErr);
      }

      return res.json({
        ok: true,
        answer: assistantText,
        suggestions,
        sources,
      });
    } catch (err) {
      console.error("assistant/query error:", err);
      return res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/practice/covered-topics?subject=X
  // Analyzes chat history to determine topics the student has covered
  router.get("/practice/covered-topics", requireAuth, async (req, res) => {
    try {
      const { subject } = req.query;
      const userId = req.authUser?.id;

      if (!subject) {
        return res.status(400).send("Missing subject");
      }

      // Get all chat sessions and messages for this subject
      const { data: sessions, error: sessErr } = await supabase
        .from("chat_sessions")
        .select(`
          id,
          chat_messages (
            message_text,
            sender,
            created_at
          )
        `)
        .eq("student_id", userId)
        .eq("phase", "assistant")
        .eq("subject", subject);

      if (sessErr) throw sessErr;

      // Extract topics from chat history
      const allMessages = [];
      (sessions || []).forEach(session => {
        if (session.chat_messages) {
          allMessages.push(...session.chat_messages.filter(m => m.sender === "student"));
        }
      });

      // Get practice history to determine progression
      const { data: practiceHistory } = await supabase
        .from("practice_answers")
        .select(`
          is_correct,
          practice_exercises!inner(subject, difficulty)
        `)
        .eq("student_id", userId)
        .eq("practice_exercises.subject", subject);

      // Calculate average accuracy per difficulty
      const difficultyStats = {
        easy: { total: 0, correct: 0 },
        medium: { total: 0, correct: 0 },
        hard: { total: 0, correct: 0 }
      };

      (practiceHistory || []).forEach(answer => {
        const diff = answer.practice_exercises.difficulty;
        if (difficultyStats[diff]) {
          difficultyStats[diff].total++;
          if (answer.is_correct) {
            difficultyStats[diff].correct++;
          }
        }
      });

      // Determine recommended difficulty
      let recommendedDifficulty = "easy";
      const easyAccuracy = difficultyStats.easy.total > 0 
        ? difficultyStats.easy.correct / difficultyStats.easy.total 
        : 0;
      const mediumAccuracy = difficultyStats.medium.total > 0 
        ? difficultyStats.medium.correct / difficultyStats.medium.total 
        : 0;

      if (easyAccuracy >= 0.8 && difficultyStats.easy.total >= 5) {
        recommendedDifficulty = "medium";
      }
      if (mediumAccuracy >= 0.8 && difficultyStats.medium.total >= 5) {
        recommendedDifficulty = "hard";
      }

      // Extract keywords from messages (simple approach)
      const messageTexts = allMessages.map(m => m.message_text.toLowerCase()).join(" ");
      const topicKeywords = extractTopicKeywords(messageTexts, subject);

      res.json({
        coveredTopics: topicKeywords,
        recommendedDifficulty,
        difficultyStats,
        messageCount: allMessages.length
      });
    } catch (err) {
      console.error("covered-topics error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Helper function to extract topic keywords
  function extractTopicKeywords(text, subject) {
    const topicsBySubject = {
      "Matemáticas": [
        "álgebra", "ecuaciones", "funciones", "geometría", "trigonometría",
        "cálculo", "derivadas", "integrales", "probabilidad", "estadística",
        "números", "fracciones", "porcentajes", "raíces", "potencias"
      ],
      "Ciencias Naturales": [
        "célula", "fotosíntesis", "respiración", "sistema", "órgano",
        "ecosistema", "energía", "materia", "reacción", "átomo"
      ],
      "Física": [
        "movimiento", "fuerza", "velocidad", "aceleración", "energía",
        "trabajo", "potencia", "onda", "luz", "electricidad"
      ],
      "Química": [
        "elemento", "compuesto", "átomo", "molécula", "reacción",
        "ácido", "base", "oxidación", "valencia", "tabla periódica"
      ]
    };

    const keywords = topicsBySubject[subject] || [];
    const foundTopics = keywords.filter(keyword => text.includes(keyword));
    
    return foundTopics.length > 0 ? foundTopics : ["temas básicos"];
  }

  // POST /api/practice/generate
  // Body: { subject: string, difficulty?: string, count?: number, sessionId: uuid }
  // Generates practice exercises based on subject and student's materials
  router.post("/practice/generate", requireAuth, async (req, res) => {
    try {
      const { subject, difficulty = "medium", count = 3, sessionId } = req.body || {};
      
      if (!subject || !sessionId) {
        return res.status(400).send("Missing subject or sessionId");
      }

      const userId = req.authUser?.id;
      
      // Get student's grade
      let studentGrade = null;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("grade")
          .eq("id", userId)
          .single();
        studentGrade = profile?.grade || null;
      } catch (e) {
        console.warn("Could not fetch student grade:", e);
      }

      // For MVP, just return mock exercises (skip OpenAI for now)
      const mockExercises = generateMockExercises(subject, count, difficulty, sessionId, userId);
      
      // Save exercises to database
      const savedExercises = [];
      for (const ex of mockExercises) {
        try {
          const { data, error } = await supabase
            .from("practice_exercises")
            .insert({
              session_id: sessionId,
              student_id: userId,
              subject,
              question_text: ex.question_text,  // Fixed: was ex.question
              question_type: ex.question_type,   // Fixed: was ex.type
              correct_answer: ex.correct_answer,
              options: ex.options || null,
              explanation: ex.explanation,
              difficulty,
              material_ids: []
            })
            .select()
            .single();

          if (!error && data) {
            savedExercises.push(data);
          } else {
            console.error("Error saving exercise:", error);
          }
        } catch (err) {
          console.error("Error in exercise save:", err);
        }
      }

      res.json({ exercises: savedExercises });
    } catch (err) {
      console.error("practice/generate error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Helper function to generate mock exercises
  function generateMockExercises(subject, count, difficulty, sessionId, userId) {
    const mockExercises = [];
    
    const templates = {
      "Matemáticas": [
        {
          question_type: "multiple_choice",
          question_text: "Si x + 5 = 12, ¿cuál es el valor de x?",
          options: ["5", "7", "12", "17"],
          correct_answer: "B",
          explanation: "Para resolver x + 5 = 12, restamos 5 de ambos lados: x = 12 - 5 = 7"
        },
        {
          question_type: "true_false",
          question_text: "¿Es verdadero que el área de un círculo se calcula con la fórmula πr²?",
          options: ["Verdadero", "Falso"],
          correct_answer: "Verdadero",
          explanation: "La fórmula correcta para el área de un círculo es A = πr², donde r es el radio."
        },
        {
          question_type: "multiple_choice",
          question_text: "¿Cuánto es 15% de 200?",
          options: ["15", "20", "30", "50"],
          correct_answer: "C",
          explanation: "15% de 200 = (15/100) × 200 = 0.15 × 200 = 30"
        }
      ],
      "Ciencias Naturales": [
        {
          question_type: "multiple_choice",
          question_text: "¿Cuál es el proceso por el cual las plantas producen su alimento?",
          options: ["Respiración", "Fotosíntesis", "Digestión", "Circulación"],
          correct_answer: "B",
          explanation: "La fotosíntesis es el proceso por el cual las plantas usan luz solar para convertir CO₂ y agua en glucosa."
        },
        {
          question_type: "true_false",
          question_text: "¿El agua hierve a 100°C a nivel del mar?",
          options: ["Verdadero", "Falso"],
          correct_answer: "Verdadero",
          explanation: "A nivel del mar, el agua hierve a 100 grados Celsius o 212 grados Fahrenheit."
        }
      ],
      "Lengua Castellana": [
        {
          question_type: "multiple_choice",
          question_text: "¿Qué tipo de palabra es 'rápidamente'?",
          options: ["Adjetivo", "Adverbio", "Sustantivo", "Verbo"],
          correct_answer: "B",
          explanation: "Las palabras terminadas en -mente son adverbios que modifican verbos, adjetivos u otros adverbios."
        }
      ]
    };

    const subjectTemplates = templates[subject] || templates["Matemáticas"];
    
    for (let i = 0; i < Math.min(count, subjectTemplates.length); i++) {
      const template = subjectTemplates[i % subjectTemplates.length];
      mockExercises.push({
        question_text: template.question_text,
        question_type: template.question_type,
        options: template.options,
        correct_answer: template.correct_answer,
        explanation: template.explanation
      });
    }

    return mockExercises;
  }

  // POST /api/practice/submit
  // Body: { exerciseId: uuid, answer: string, timeSpent?: number }
  // Submits an answer and gets feedback
  router.post("/practice/submit", requireAuth, async (req, res) => {
    try {
      const { exerciseId, answer, timeSpent } = req.body || {};
      
      if (!exerciseId || !answer) {
        return res.status(400).send("Missing exerciseId or answer");
      }

      const userId = req.authUser?.id;

      // Get the exercise
      const { data: exercise, error: exErr } = await supabase
        .from("practice_exercises")
        .select("*")
        .eq("id", exerciseId)
        .eq("student_id", userId)
        .single();

      if (exErr || !exercise) {
        return res.status(404).send("Exercise not found");
      }

      // Check if answer is correct
      const isCorrect = checkAnswer(exercise, answer);
      
      // Generate feedback
      let feedback = "";
      if (isCorrect) {
        feedback = `¡Correcto! ${exercise.explanation || ""}`;
      } else {
        feedback = `Incorrecto. La respuesta correcta es: ${exercise.correct_answer}. ${exercise.explanation || ""}`;
      }

      // Save answer
      const { data: savedAnswer, error: ansErr } = await supabase
        .from("practice_answers")
        .insert({
          exercise_id: exerciseId,
          student_id: userId,
          student_answer: answer,
          is_correct: isCorrect,
          feedback,
          time_spent_seconds: timeSpent || null
        })
        .select()
        .single();

      if (ansErr) {
        console.error("Error saving answer:", ansErr);
      }

      res.json({
        isCorrect,
        feedback,
        correctAnswer: exercise.correct_answer,
        explanation: exercise.explanation
      });
    } catch (err) {
      console.error("practice/submit error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/practice/progress?subject=X
  // Returns practice statistics for the authenticated student
  router.get("/practice/progress", requireAuth, async (req, res) => {
    try {
      const { subject } = req.query;
      const userId = req.authUser?.id;

      let query = supabase
        .from("practice_answers")
        .select(`
          *,
          practice_exercises!inner(subject, difficulty, question_type)
        `)
        .eq("student_id", userId);

      if (subject) {
        query = query.eq("practice_exercises.subject", subject);
      }

      const { data: answers, error } = await query;

      if (error) throw error;

      const total = answers.length;
      const correct = answers.filter(a => a.is_correct).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Group by subject
      const bySubject = {};
      answers.forEach(a => {
        const subj = a.practice_exercises.subject;
        if (!bySubject[subj]) {
          bySubject[subj] = { total: 0, correct: 0 };
        }
        bySubject[subj].total++;
        if (a.is_correct) bySubject[subj].correct++;
      });

      res.json({
        total,
        correct,
        accuracy,
        bySubject
      });
    } catch (err) {
      console.error("practice/progress error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // GET /api/practice/leaderboard?subject=X&limit=10
  router.get("/practice/leaderboard", requireAuth, async (req, res) => {
    try {
      const { subject, limit = 10 } = req.query;

      let query = supabase
        .from("practice_leaderboard")
        .select(`
          *,
          profiles!inner(full_name, grade)
        `)
        .order("total_score", { ascending: false })
        .limit(parseInt(limit));

      if (subject) {
        query = query.eq("subject", subject);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Add rankings
      const rankedData = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      res.json({ leaderboard: rankedData });
    } catch (err) {
      console.error("leaderboard error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // POST /api/practice/update-score
  // Updates leaderboard after completing exercises
  router.post("/practice/update-score", requireAuth, async (req, res) => {
    try {
      const { subject, score, timeSpent } = req.body;
      const userId = req.authUser?.id;

      // Get current leaderboard entry
      const { data: existing } = await supabase
        .from("practice_leaderboard")
        .select("*")
        .eq("student_id", userId)
        .eq("subject", subject)
        .single();

      if (existing) {
        // Update existing entry
        const newTotal = existing.total_score + score;
        const newCompleted = existing.exercises_completed + 1;
        const newFastest = existing.fastest_time_seconds 
          ? Math.min(existing.fastest_time_seconds, timeSpent)
          : timeSpent;

        await supabase
          .from("practice_leaderboard")
          .update({
            total_score: newTotal,
            exercises_completed: newCompleted,
            fastest_time_seconds: newFastest,
            updated_at: new Date().toISOString()
          })
          .eq("student_id", userId)
          .eq("subject", subject);
      } else {
        // Create new entry
        await supabase
          .from("practice_leaderboard")
          .insert({
            student_id: userId,
            subject,
            total_score: score,
            exercises_completed: 1,
            fastest_time_seconds: timeSpent
          });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("update-score error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Helper function to check if answer is correct
  function checkAnswer(exercise, studentAnswer) {
    const correct = exercise.correct_answer.toString().trim().toLowerCase();
    const student = studentAnswer.toString().trim().toLowerCase();

    switch (exercise.question_type) {
      case "multiple_choice":
        return student === correct;
      case "true_false":
        return student === correct;
      case "open_ended":
        // For open-ended, use fuzzy matching or keyword matching
        // Simple implementation: check if answer contains key terms
        return correct.includes(student) || student.includes(correct);
      default:
        return false;
    }
  }

  // POST /api/mocktest/generate
  // Body: { area: string, sessionId: uuid, questionCount: number }
  // Generates ICFES-style mock test questions
  router.post("/mocktest/generate", requireAuth, async (req, res) => {
    try {
      const { area, sessionId, questionCount = 20 } = req.body || {};
      
      if (!area || !sessionId) {
        return res.status(400).send("Missing area or sessionId");
      }

      const userId = req.authUser?.id;
      
      // For MVP, return mock ICFES-style questions
      const mockQuestions = generateICFESQuestions(area, questionCount, sessionId, userId);
      
      // Save questions to database
      const savedQuestions = [];
      for (const q of mockQuestions) {
        try {
          const { data, error } = await supabase
            .from("mocktest_questions")
            .insert({
              session_id: sessionId,
              student_id: userId,
              area,
              competency: q.competency,
              context: q.context || null,
              question_text: q.question_text,
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation,
              difficulty: q.difficulty || "medium"
            })
            .select()
            .single();

          if (!error && data) {
            savedQuestions.push(data);
          } else {
            console.error("Error saving question:", error);
          }
        } catch (err) {
          console.error("Error in question save:", err);
        }
      }

      res.json({ questions: savedQuestions });
    } catch (err) {
      console.error("mocktest/generate error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // POST /api/mocktest/submit
  // Body: { sessionId: uuid, area: string, answers: {questionId: answer}, timeSpent: number }
  // Submits mock test and returns results with competency analysis
  router.post("/mocktest/submit", requireAuth, async (req, res) => {
    try {
      const { sessionId, area, answers, timeSpent } = req.body || {};
      
      if (!sessionId || !answers) {
        return res.status(400).send("Missing sessionId or answers");
      }

      const userId = req.authUser?.id;

      // Get all questions for this test
      const { data: questions, error: questErr } = await supabase
        .from("mocktest_questions")
        .select("*")
        .eq("session_id", sessionId)
        .eq("student_id", userId);

      if (questErr || !questions) {
        return res.status(404).send("Questions not found");
      }

      // Grade answers and analyze by competency
      let totalScore = 0;
      const byCompetency = {};
      const savedAnswers = [];

      for (const question of questions) {
        const studentAnswer = answers[question.id];
        const isCorrect = studentAnswer === question.correct_answer;
        
        if (isCorrect) totalScore++;

        // Track by competency
        const comp = question.competency || "General";
        if (!byCompetency[comp]) {
          byCompetency[comp] = { total: 0, correct: 0 };
        }
        byCompetency[comp].total++;
        if (isCorrect) byCompetency[comp].correct++;

        // Save answer
        try {
          const { data } = await supabase
            .from("mocktest_answers")
            .insert({
              question_id: question.id,
              student_id: userId,
              student_answer: studentAnswer || null,
              is_correct: isCorrect,
              time_spent_seconds: timeSpent
            })
            .select()
            .single();

          if (data) savedAnswers.push(data);
        } catch (err) {
          console.error("Error saving answer:", err);
        }
      }

      // Generate recommendations
      const recommendations = [];
      for (const [comp, stats] of Object.entries(byCompetency)) {
        const percentage = (stats.correct / stats.total) * 100;
        if (percentage < 50) {
          recommendations.push(`Refuerza tus conocimientos en ${comp} - obtuviste ${Math.round(percentage)}%`);
        } else if (percentage < 70) {
          recommendations.push(`Practica más ejercicios de ${comp} para mejorar tu desempeño`);
        }
      }

      if (recommendations.length === 0) {
        recommendations.push("¡Excelente trabajo! Continúa practicando para mantener tu nivel.");
      }

      // Update leaderboard
      try {
        const { data: existingEntry } = await supabase
          .from("mocktest_leaderboard")
          .select("*")
          .eq("student_id", userId)
          .eq("area", area)
          .single();

        if (existingEntry) {
          await supabase
            .from("mocktest_leaderboard")
            .update({
              total_score: existingEntry.total_score + totalScore,
              tests_completed: existingEntry.tests_completed + 1,
              average_score: ((existingEntry.total_score + totalScore) / (existingEntry.tests_completed + 1)),
              updated_at: new Date().toISOString()
            })
            .eq("id", existingEntry.id);
        } else {
          await supabase
            .from("mocktest_leaderboard")
            .insert({
              student_id: userId,
              area,
              total_score: totalScore,
              tests_completed: 1,
              average_score: totalScore
            });
        }
      } catch (leaderErr) {
        console.warn("Failed to update leaderboard:", leaderErr);
      }

      res.json({
        score: totalScore,
        totalQuestions: questions.length,
        byCompetency,
        recommendations,
        timeSpent
      });
    } catch (err) {
      console.error("mocktest/submit error:", err);
      res.status(500).send(err.message || "Server error");
    }
  });

  // Helper function to generate ICFES-style mock questions
  function generateICFESQuestions(area, count, sessionId, userId) {
    const questionBank = {
      "Matemáticas": [
        {
          competency: "Razonamiento",
          context: "En una tienda, el precio de un producto aumenta un 20% y luego disminuye un 20%.",
          question_text: "¿Cuál es el precio final del producto en comparación con el precio original?",
          options: [
            "El mismo precio original",
            "4% menos que el precio original",
            "4% más que el precio original",
            "20% menos que el precio original"
          ],
          correct_answer: "B",
          explanation: "Si el precio es P, después del aumento es 1.2P. Luego, al reducir 20% de 1.2P: 1.2P × 0.8 = 0.96P. Por lo tanto, es 4% menos.",
          difficulty: "medium"
        },
        {
          competency: "Resolución de problemas",
          context: "Un tanque de agua se llena con dos grifos. El grifo A lo llena en 6 horas y el grifo B en 4 horas.",
          question_text: "¿Cuánto tiempo tardarán ambos grifos trabajando juntos en llenar el tanque?",
          options: [
            "2 horas",
            "2.4 horas",
            "3 horas",
            "5 horas"
          ],
          correct_answer: "B",
          explanation: "A llena 1/6 por hora, B llena 1/4 por hora. Juntos: 1/6 + 1/4 = 5/12 por hora. Tiempo = 1 ÷ (5/12) = 2.4 horas.",
          difficulty: "hard"
        },
        {
          competency: "Modelación",
          question_text: "Una función lineal pasa por los puntos (2, 5) y (4, 11). ¿Cuál es la pendiente de esta función?",
          options: [
            "2",
            "3",
            "4",
            "6"
          ],
          correct_answer: "B",
          explanation: "Pendiente m = (y₂ - y₁) / (x₂ - x₁) = (11 - 5) / (4 - 2) = 6 / 2 = 3",
          difficulty: "easy"
        }
      ],
      "Lectura Crítica": [
        {
          competency: "Comprensión",
          context: "El Realismo Mágico es un género literario que combina elementos fantásticos con la realidad cotidiana de manera natural. Gabriel García Márquez, uno de sus mayores exponentes, creó mundos donde lo extraordinario coexiste con lo ordinario sin causar asombro en los personajes. Esta técnica permite explorar temas sociales y políticos desde una perspectiva única.",
          question_text: "Según el texto, ¿cuál es una característica principal del Realismo Mágico?",
          options: [
            "La separación clara entre fantasía y realidad",
            "La naturalización de elementos fantásticos en contextos cotidianos",
            "El rechazo de temas sociales y políticos",
            "La sorpresa constante de los personajes ante lo extraordinario"
          ],
          correct_answer: "B",
          explanation: "El texto indica que el Realismo Mágico combina elementos fantásticos con la realidad de manera natural, sin causar asombro.",
          difficulty: "medium"
        },
        {
          competency: "Interpretación",
          context: "\"No hay peor sordo que el que no quiere oír\" es un refrán popular que trasciende su significado literal.",
          question_text: "¿Qué significa este refrán en sentido figurado?",
          options: [
            "Las personas con problemas auditivos tienen dificultades para comunicarse",
            "Es imposible hacer entender algo a quien se niega a escuchar",
            "La sordera es una condición que afecta la comprensión",
            "Hablar en voz alta ayuda a que todos entiendan"
          ],
          correct_answer: "B",
          explanation: "El refrán usa la metáfora de la sordera para referirse a personas que voluntariamente ignoran información o consejos.",
          difficulty: "easy"
        }
      ],
      "Ciencias Naturales": [
        {
          competency: "Indagación",
          context: "Un grupo de científicos observa que las plantas en un invernadero crecen más rápido cuando se aumenta la concentración de CO₂.",
          question_text: "¿Cuál sería la mejor hipótesis para explicar este fenómeno?",
          options: [
            "El CO₂ adicional permite que las plantas realicen más fotosíntesis",
            "El calor del invernadero hace que las plantas crezcan más",
            "Las plantas necesitan menos agua con más CO₂",
            "El CO₂ elimina plagas que afectan el crecimiento"
          ],
          correct_answer: "A",
          explanation: "El CO₂ es un reactivo esencial en la fotosíntesis. Mayor concentración permite más producción de glucosa y, por tanto, más crecimiento.",
          difficulty: "medium"
        },
        {
          competency: "Uso del conocimiento",
          question_text: "¿Qué tipo de energía se transforma principalmente en energía eléctrica en una central hidroeléctrica?",
          options: [
            "Energía química",
            "Energía nuclear",
            "Energía potencial gravitacional",
            "Energía térmica"
          ],
          correct_answer: "C",
          explanation: "El agua almacenada a gran altura tiene energía potencial gravitacional que se convierte en cinética al caer y luego en eléctrica mediante turbinas.",
          difficulty: "easy"
        }
      ],
      "Sociales y Ciudadanas": [
        {
          competency: "Pensamiento social",
          context: "La Revolución Industrial del siglo XVIII transformó radicalmente las sociedades europeas, generando migración masiva del campo a las ciudades y nuevas formas de organización laboral.",
          question_text: "¿Cuál fue una consecuencia social importante de este proceso?",
          options: [
            "Disminución de la población urbana",
            "Surgimiento de la clase trabajadora industrial",
            "Retorno a la economía agrícola tradicional",
            "Desaparición del comercio internacional"
          ],
          correct_answer: "B",
          explanation: "La industrialización creó una nueva clase social: el proletariado industrial, compuesto por trabajadores fabriles.",
          difficulty: "medium"
        },
        {
          competency: "Interpretación",
          question_text: "¿Cuál es el principal objetivo de los derechos humanos?",
          options: [
            "Regular el comercio internacional",
            "Proteger la dignidad inherente a todas las personas",
            "Establecer sistemas de gobierno democráticos",
            "Promover el desarrollo económico"
          ],
          correct_answer: "B",
          explanation: "Los derechos humanos buscan garantizar la dignidad, libertad e igualdad de todas las personas, independientemente de su condición.",
          difficulty: "easy"
        }
      ],
      "Inglés": [
        {
          competency: "Reading",
          context: "Technology has revolutionized the way we communicate. Social media platforms allow people to stay connected across vast distances, but some experts worry about the impact on face-to-face interactions and mental health.",
          question_text: "According to the text, what is a concern about social media?",
          options: [
            "It makes communication more expensive",
            "It may affect in-person communication and mental health",
            "It prevents people from using other technologies",
            "It is too difficult for most people to use"
          ],
          correct_answer: "B",
          explanation: "The text mentions that experts worry about the impact on face-to-face interactions and mental health.",
          difficulty: "medium"
        },
        {
          competency: "Grammar",
          question_text: "Choose the correct sentence:",
          options: [
            "She don't like coffee",
            "She doesn't likes coffee",
            "She doesn't like coffee",
            "She don't likes coffee"
          ],
          correct_answer: "C",
          explanation: "With third person singular (she), we use 'doesn't' + base verb (like), not 'likes'.",
          difficulty: "easy"
        }
      ]
    };

    const areaQuestions = questionBank[area] || questionBank["Matemáticas"];
    const questions = [];

    // Generate questions (repeat templates if needed)
    for (let i = 0; i < count; i++) {
      const template = areaQuestions[i % areaQuestions.length];
      questions.push({ ...template });
    }

    return questions;
  }

  return router;
};