// client/src/components/MockTestPanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";
import Modal from "./Modal";
import Toast from "./Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper function to get character image path
const getCharacterImage = (characterName, ageGroup, state = 'default') => {
  return `/image/characters/${ageGroup}/${characterName}/${state}.png`;
};

// Character assignment based on subject (from Brand Identity Guide)
const getCharacterForSubject = (subject, grade = null) => {
  // Determine age group folder based on grade
  // kid: 6-7, teen: 8-9, young_adult: 10-11
  let ageGroup = "teen"; // default
  if (grade) {
    if (grade >= 6 && grade <= 7) {
      ageGroup = "kid";
    } else if (grade >= 8 && grade <= 9) {
      ageGroup = "teen";
    } else if (grade >= 10 && grade <= 11) {
      ageGroup = "young_adult";
    }
  }

  if (!subject)
    return {
      name: "Pico",
      icon: getCharacterImage("Pico", ageGroup),
      color: "#1976D2",
    };

  const subjectLower = subject.toLowerCase();

  // 1. Lengua Castellana e Inglés → Lili (orquídea)
  if (
    subjectLower.includes("lengua") ||
    subjectLower.includes("castellana") ||
    subjectLower.includes("español") ||
    subjectLower.includes("literatura") ||
    subjectLower.includes("inglés") ||
    subjectLower.includes("ingles") ||
    subjectLower.includes("english") ||
    subjectLower.includes("lectura") ||
    subjectLower.includes("crítica")
  ) {
    return {
      name: "Lili",
      icon: getCharacterImage("Lili", ageGroup),
      color: "#9C27B0",
    };
  }

  // 2. Matemáticas → Maco (macaco)
  if (
    subjectLower.includes("matemática") ||
    subjectLower.includes("matematica") ||
    subjectLower.includes("matemáticas") ||
    subjectLower.includes("matematicas")
  ) {
    return {
      name: "Maco",
      icon: getCharacterImage("Maco", ageGroup),
      color: "#1976D2",
    };
  }

  // 3. Ciencias Naturales → Frailo (frailejón)
  if (
    subjectLower.includes("ciencias naturales") ||
    subjectLower.includes("biología") ||
    subjectLower.includes("biologia") ||
    subjectLower.includes("naturales")
  ) {
    return {
      name: "Frailo",
      icon: getCharacterImage("Frailo", ageGroup),
      color: "#4CAF50",
    };
  }

  // 4. Ciencias Sociales → Cerita (palma de cera)
  if (
    subjectLower.includes("sociales") ||
    subjectLower.includes("historia") ||
    subjectLower.includes("geografía") ||
    subjectLower.includes("geografia") ||
    subjectLower.includes("cívica") ||
    subjectLower.includes("civica") ||
    subjectLower.includes("ciudadanas")
  ) {
    return {
      name: "Cerita",
      icon: getCharacterImage("Cerita", ageGroup),
      color: "#FF9800",
    };
  }

  // 5. Educación Artística → Rosi (delfín rosado)
  if (
    subjectLower.includes("artística") ||
    subjectLower.includes("artistica") ||
    subjectLower.includes("arte")
  ) {
    return {
      name: "Rosi",
      icon: getCharacterImage("Rosi", ageGroup),
      color: "#E91E63",
    };
  }

  // 6. Educación Física → Yagui (jaguar)
  if (
    subjectLower.includes("educación física") ||
    subjectLower.includes("educacion fisica") ||
    subjectLower.includes("deporte") ||
    subjectLower.includes("gimnasia")
  ) {
    return {
      name: "Yagui",
      icon: getCharacterImage("Yagui", ageGroup),
      color: "#FF5722",
    };
  }

  // 7. Tecnología e Informática → Kundi (cóndor)
  if (
    subjectLower.includes("tecnología") ||
    subjectLower.includes("tecnologia") ||
    subjectLower.includes("informática") ||
    subjectLower.includes("informatica") ||
    subjectLower.includes("computación") ||
    subjectLower.includes("computacion")
  ) {
    return {
      name: "Kundi",
      icon: getCharacterImage("Kundi", ageGroup),
      color: "#3F51B5",
    };
  }

  // 8. Ética y Valores → Guiro (chigüiro)
  if (
    subjectLower.includes("ética") ||
    subjectLower.includes("etica") ||
    subjectLower.includes("valores")
  ) {
    return {
      name: "Guiro",
      icon: getCharacterImage("Guiro", ageGroup),
      color: "#795548",
    };
  }

  // 9. Química and Física → Pico (tucán)
  if (
    subjectLower.includes("química") ||
    subjectLower.includes("quimica") ||
    subjectLower.includes("física") ||
    subjectLower.includes("fisica")
  ) {
    return {
      name: "Pico",
      icon: getCharacterImage("Pico", ageGroup),
      color: "#1976D2",
    };
  }

  // 10. Religión and Filosofía → Tuko (oso de anteojos)
  if (
    subjectLower.includes("religión") ||
    subjectLower.includes("religion") ||
    subjectLower.includes("filosofía") ||
    subjectLower.includes("filosofia")
  ) {
    return {
      name: "Tuko",
      icon: getCharacterImage("Tuko", ageGroup),
      color: "#6A4F4B",
    };
  }

  // Default → Pico
  return {
    name: "Pico",
    icon: getCharacterImage("Pico", ageGroup),
    color: "#1976D2",
  };
};

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    console.warn("getAuthHeader:", e);
  }
  return {};
}

export default function MockTestPanel({ session }) {
  const [userGrade, setUserGrade] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [testState, setTestState] = useState("selection"); // selection, instructions, active, results
  const [questions, setQuestions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(90 * 60); // 90 minutes in seconds
  const [testStartTime, setTestStartTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const isMobile = useIsMobile();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const character = getCharacterForSubject(selectedArea?.name, userGrade);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    loadUserGrade();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (testState === "active" && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            submitTest(true); // Auto-submit when time expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [testState, timeRemaining]);

  async function loadUserGrade() {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (uid) {
      const { data: student } = await supabase
        .from("students")
        .select("grade")
        .eq("user_id", uid)
        .single();
      setUserGrade(student?.grade || null);
    }
  }

  async function startTest(area) {
    setSelectedArea(area);
    setTestState("instructions");
  }

  // Update beginTest to save the session ID
  async function beginTest() {
    setLoading(true);
    try {
      // Ensure we have a session
      let sessionId = session?.id;
        
      if (!sessionId) {
        // Create a new mocktest session
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        
        if (!uid) {
          throw new Error("User not authenticated");
        }
        
        const { data: newSession, error: sessionError } = await supabase
          .from("chat_sessions")
          .insert({
            student_id: uid,
            phase: "mocktest",
            title: `Simulacro ${selectedArea.name}`,
            subject: selectedArea.name
          })
          .select()
          .single();
        
        if (sessionError) {
          throw new Error("Failed to create session");
        }
        
        sessionId = newSession.id;
      }

      // Save session ID to state
      setCurrentSessionId(sessionId);

      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader())
      };

      const resp = await fetch(`${API_BASE}/api/mocktest/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          area: selectedArea.name,
          sessionId: sessionId,
          questionCount: 20
        })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Server error:", errorText);
        throw new Error(`Error generating test: ${errorText}`);
      }

      const data = await resp.json();
      setQuestions(data.questions || []);
      setTestStartTime(Date.now());
      setTestState("active");
    } catch (e) {
      console.error("Error:", e);
      showToast("❌ Error al generar el simulacro. Por favor, verifica tu conexión e intenta nuevamente.", "error");
      setTestState("selection");
    } finally {
      setLoading(false);
    }
  }

  // Update submitTest to use currentSessionId
  async function submitTest(autoSubmit = false) {
    if (!autoSubmit) {
      const unanswered = questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        setModalConfig({
          title: "⚠️ Preguntas sin responder",
          message: `Tienes ${unanswered} pregunta${unanswered > 1 ? 's' : ''} sin responder. ¿Deseas enviar el simulacro de todas formas? Las preguntas sin responder se contarán como incorrectas.`,
          confirmText: "Enviar de todas formas",
          cancelText: "Continuar respondiendo",
          onConfirm: () => submitTestConfirmed()
        });
        setShowModal(true);
        return;
      }
    }
    submitTestConfirmed();
  }

  async function submitTestConfirmed() {

    setLoading(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader())
      };

      const timeSpent = Math.floor((Date.now() - testStartTime) / 1000);

      const resp = await fetch(`${API_BASE}/api/mocktest/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: currentSessionId || session?.id,  // Use currentSessionId first
          area: selectedArea.name,
          answers,
          timeSpent
        })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Server error:", errorText);
        throw new Error(`Error submitting test: ${errorText}`);
      }

      const data = await resp.json();
      setResults(data);
      setTestState("results");
    } catch (e) {
      console.error("Error:", e);
      showToast("❌ Error al enviar el simulacro. Por favor, intenta nuevamente.", "error");
    } finally {
      setLoading(false);
    }
  }

  function selectAnswer(questionId, answer) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }

  function toggleMarkForReview(questionId) {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }

  function jumpToQuestion(index) {
    setCurrentQuestionIndex(index);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Grade restriction
  if (!userGrade || userGrade < 10) {
    return (
      <>
      <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{
          padding: "2rem",
          background: "#fff3cd",
          border: "2px solid #ffc107",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <h2>📝 Simulacros ICFES</h2>
          <p style={{ fontSize: "18px", color: "#856404" }}>
            Los simulacros están disponibles solo para estudiantes de grados 10 y 11.
          </p>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      </>
    );
  }

  const areas = [
    { name: "Matemáticas", icon: "🔢", color: "#1976d2", competencies: ["Razonamiento", "Resolución de problemas", "Modelación"] },
    { name: "Lectura Crítica", icon: "📖", color: "#7b1fa2", competencies: ["Comprensión", "Interpretación", "Reflexión"] },
    { name: "Sociales y Ciudadanas", icon: "🌍", color: "#388e3c", competencies: ["Pensamiento social", "Interpretación", "Reflexión"] },
    { name: "Ciencias Naturales", icon: "🔬", color: "#d32f2f", competencies: ["Indagación", "Uso del conocimiento", "Explicación"] },
    { name: "Inglés", icon: "🇬🇧", color: "#f57c00", competencies: ["Reading", "Vocabulary", "Grammar"] }
  ];

  // Area Selection Screen
  if (testState === "selection") {
    return (
      <div style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        {/* Header */}
        <div style={{
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderBottom: "3px solid #1976D2",
          flexShrink: 0
        }}>
          <div style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: isMobile ? "1rem" : "1.5rem 2rem"
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? "20px" : "24px",
              fontWeight: "700",
              color: "#2c3e50"
            }}>📝 Simulacros ICFES (Saber 11°)</h2>
            <p style={{ 
              color: "#7f8c8d", 
              margin: "0.5rem 0 0 0",
              fontSize: isMobile ? "14px" : "15px"
            }}>
              Prepárate para el examen de Estado con simulacros estilo ICFES.
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "1rem" : "2rem 1rem"
        }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}>
          {areas.map(area => (
            <div
              key={area.name}
              onClick={() => startTest(area)}
              style={{
                padding: "1.5rem",
                background: "white",
                border: "2px solid #ddd",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = area.color;
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#ddd";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "0.75rem" }}>{area.icon}</div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: area.color }}>{area.name}</h3>
              <p style={{ fontSize: "13px", color: "#666", margin: "0.5rem 0" }}>
                {area.competencies.join(" • ")}
              </p>
              <div style={{ marginTop: "1rem", fontSize: "12px", color: "#999" }}>
                ⏱️ 90 minutos • 20 preguntas
              </div>
            </div>
          ))}
        </div>

        {/* Historical Results Preview */}
        <div style={{
          marginTop: "3rem",
          padding: "1.5rem",
          background: "#f8f9fa",
          borderRadius: "12px",
        }}>
          <h3 style={{ margin: "0 0 1rem 0" }}>📊 Tus Resultados Anteriores</h3>
          <p style={{ color: "#666", fontSize: "14px" }}>
            Aquí podrás ver tus simulacros anteriores y tu progreso. ¡Completa tu primer simulacro para comenzar!
          </p>
        </div>

          </div>
        </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      </div>
    );
  }

  // Instructions Screen
  if (testState === "instructions") {
    return (
      <div style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        {/* Header with Character */}
        <div style={{
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderBottom: `3px solid ${character.color}`,
          flexShrink: 0
        }}>
          <div style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: isMobile ? "1rem" : "1.5rem 2rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}>
            {/* Character Icon */}
            <div style={{
              width: isMobile ? "50px" : "60px",
              height: isMobile ? "50px" : "60px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <img 
                src={character.icon}
                alt={character.name}
                style={{
                  width: "150%",
                  height: "150%",
                  objectFit: "contain"
                }}
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>

            {/* Title */}
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: isMobile ? "18px" : "22px",
                fontWeight: "700",
                color: "#2c3e50"
              }}>
                Simulacro de {selectedArea.name}
              </h2>
              <p style={{
                margin: "0.25rem 0 0 0",
                fontSize: isMobile ? "13px" : "14px",
                color: "#7f8c8d"
              }}>
                con {character.name} • Saber 11°
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "1rem" : "2rem 1rem"
        }}>
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <div style={{
              background: "white",
              padding: isMobile ? "1.5rem" : "2rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: `2px solid ${character.color}20`
            }}>

          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>📋 Instrucciones</h3>
            <ul style={{ lineHeight: "1.8", color: "#444" }}>
              <li>El simulacro consta de <strong>20 preguntas</strong> de selección múltiple</li>
              <li>Tiempo límite: <strong>90 minutos</strong></li>
              <li>Cada pregunta tiene <strong>4 opciones</strong> (A, B, C, D) con una única respuesta correcta</li>
              <li>Puedes <strong>navegar entre preguntas</strong> y cambiar tus respuestas antes de enviar</li>
              <li>Puedes <strong>marcar preguntas para revisar</strong> después</li>
              <li>El simulacro se <strong>enviará automáticamente</strong> cuando se acabe el tiempo</li>
              <li>Los resultados mostrarán tu desempeño por competencias</li>
            </ul>
          </div>

          <div style={{
            padding: "1rem",
            background: "#e3f2fd",
            borderRadius: "8px",
            marginBottom: "2rem"
          }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#1565c0" }}>
              💡 <strong>Consejo:</strong> Lee cada pregunta cuidadosamente. Las preguntas ICFES evalúan comprensión y razonamiento, no solo memorización.
            </p>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              onClick={() => setTestState("selection")}
              style={{
                padding: "12px 24px",
                border: "2px solid #ddd",
                background: "white",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={beginTest}
              disabled={loading}
              style={{
                padding: "12px 32px",
                border: "none",
                background: selectedArea.color,
                color: "white",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Generando..." : "Comenzar Simulacro"}
            </button>
          </div>
            </div>
          </div>
        </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      </div>
    );
  }

  // Active Test Screen
  if (testState === "active" && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    return (
      <div style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        {/* Top Bar */}
        <div style={{
          background: "white",
          borderBottom: `3px solid ${character.color}`,
          padding: isMobile ? "0.75rem 1rem" : "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div>
            <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "600", color: selectedArea.color }}>
              {selectedArea.icon} {selectedArea.name}
            </div>
            <div style={{ fontSize: isMobile ? "11px" : "12px", color: "#666" }}>
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </div>
          </div>
          
          <div style={{ textAlign: "right" }}>
            <div style={{ 
              fontSize: isMobile ? "18px" : "22px", 
              fontWeight: "700",
              color: timeRemaining < 300 ? "#d32f2f" : "#1976d2",
              fontFamily: "monospace"
            }}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
            <div style={{ fontSize: isMobile ? "10px" : "11px", color: "#666" }}>
              {answeredCount}/{questions.length} respondidas
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          <div style={{ 
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "1rem" : "2rem",
            padding: isMobile ? "1rem" : "2rem",
            maxWidth: "1400px",
            margin: "0 auto"
          }}>
          {/* Main Question Area */}
          <div style={{ flex: 1 }}>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: isMobile ? "1.5rem" : "2rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: isMobile ? "80px" : "0"
            }}>
              {/* Question Context/Passage (if exists) */}
              {currentQuestion.context && (
                <div style={{
                  padding: "1.5rem",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                  borderLeft: "4px solid " + selectedArea.color
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "0.5rem" }}>
                    TEXTO DE REFERENCIA
                  </div>
                  <div style={{ fontSize: "14px", lineHeight: "1.8", color: "#333", whiteSpace: "pre-wrap" }}>
                    {currentQuestion.context}
                  </div>
                </div>
              )}

              {/* Question */}
              <h3 style={{ 
                fontSize: isMobile ? "16px" : "18px", 
                marginBottom: "1.5rem",
                color: "#222",
                lineHeight: "1.6"
              }}>
                {currentQuestionIndex + 1}. {currentQuestion.question_text}
              </h3>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {currentQuestion.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = answers[currentQuestion.id] === letter;

                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(currentQuestion.id, letter)}
                      style={{
                        padding: "1.25rem",
                        border: `2px solid ${isSelected ? selectedArea.color : "#ddd"}`,
                        background: isSelected ? selectedArea.color + "15" : "white",
                        borderRadius: "8px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        fontSize: "15px"
                      }}
                      onMouseEnter={(e) => !isSelected && (e.currentTarget.style.borderColor = "#aaa")}
                      onMouseLeave={(e) => !isSelected && (e.currentTarget.style.borderColor = "#ddd")}
                    >
                      <span style={{ 
                        fontWeight: "700", 
                        marginRight: "0.75rem",
                        color: isSelected ? selectedArea.color : "#666"
                      }}>
                        {letter}.
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Buttons - Desktop Only */}
              {!isMobile && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  marginTop: "2rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid #eee"
                }}>
                  <button
                    onClick={() => toggleMarkForReview(currentQuestion.id)}
                    style={{
                      padding: "10px 20px",
                      border: "2px solid #f57c00",
                      background: markedForReview.has(currentQuestion.id) ? "#f57c00" : "white",
                      color: markedForReview.has(currentQuestion.id) ? "white" : "#f57c00",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    {markedForReview.has(currentQuestion.id) ? "✓ Marcada" : "🚩 Marcar"}
                  </button>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      onClick={() => jumpToQuestion(currentQuestionIndex - 1)}
                      disabled={currentQuestionIndex === 0}
                      style={{
                        padding: "10px 20px",
                        border: "2px solid #ddd",
                        background: "white",
                        borderRadius: "8px",
                        cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        opacity: currentQuestionIndex === 0 ? 0.5 : 1
                      }}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => jumpToQuestion(currentQuestionIndex + 1)}
                      disabled={currentQuestionIndex === questions.length - 1}
                      style={{
                        padding: "10px 20px",
                        border: "2px solid #ddd",
                        background: "white",
                        borderRadius: "8px",
                        cursor: currentQuestionIndex === questions.length - 1 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        opacity: currentQuestionIndex === questions.length - 1 ? 0.5 : 1
                      }}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Navigation Bar */}
              {isMobile && (
                <>
                  {/* Floating Menu Button */}
                  <button
                    onClick={() => setShowMobileNav(true)}
                    style={{
                      position: "fixed",
                      bottom: "80px",
                      right: "16px",
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: selectedArea.color,
                      color: "white",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                      fontSize: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 99
                    }}
                  >
                    ☰
                  </button>

                  {/* Question Navigator Overlay */}
                  {showMobileNav && (
                    <div
                      onClick={() => setShowMobileNav(false)}
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 200,
                        display: "flex",
                        alignItems: "flex-end"
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: "white",
                          width: "100%",
                          maxHeight: "70vh",
                          borderTopLeftRadius: "20px",
                          borderTopRightRadius: "20px",
                          padding: "1.5rem",
                          overflowY: "auto",
                          boxShadow: "0 -4px 16px rgba(0,0,0,0.2)"
                        }}
                      >
                        {/* Header */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem"
                        }}>
                          <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                            NAVEGACIÓN DE PREGUNTAS
                          </h4>
                          <button
                            onClick={() => setShowMobileNav(false)}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: "24px",
                              cursor: "pointer",
                              padding: "0",
                              width: "32px",
                              height: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: "1rem" }}>
                          <div style={{ 
                            height: "6px", 
                            background: "#f0f0f0", 
                            borderRadius: "3px",
                            overflow: "hidden"
                          }}>
                            <div style={{ 
                              height: "100%", 
                              background: selectedArea.color,
                              width: `${(Object.keys(answers).length / questions.length) * 100}%`,
                              transition: "width 0.3s"
                            }} />
                          </div>
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "0.5rem" }}>
                            {Object.keys(answers).length}/{questions.length} respondidas ({Math.round((Object.keys(answers).length / questions.length) * 100)}%)
                          </div>
                        </div>

                        {/* Question Grid */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: "0.75rem",
                          marginBottom: "1rem"
                        }}>
                          {questions.map((q, idx) => {
                            const isAnswered = answers[q.id];
                            const isMarked = markedForReview.has(q.id);
                            const isCurrent = idx === currentQuestionIndex;

                            let bgColor = "white";
                            let borderColor = "#ddd";
                            let textColor = "#666";

                            if (isCurrent) {
                              bgColor = selectedArea.color;
                              borderColor = selectedArea.color;
                              textColor = "white";
                            } else if (isAnswered) {
                              bgColor = "#e8f5e9";
                              borderColor = "#4caf50";
                              textColor = "#2e7d32";
                            }

                            return (
                              <div key={q.id} style={{ position: "relative" }}>
                                <button
                                  onClick={() => {
                                    jumpToQuestion(idx);
                                    setShowMobileNav(false);
                                  }}
                                  style={{
                                    width: "100%",
                                    aspectRatio: "1",
                                    border: `2px solid ${borderColor}`,
                                    background: bgColor,
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: textColor,
                                    transition: "all 0.2s"
                                  }}
                                >
                                  {idx + 1}
                                </button>
                                {isMarked && (
                                  <div style={{
                                    position: "absolute",
                                    top: "-4px",
                                    right: "-4px",
                                    fontSize: "14px"
                                  }}>
                                    🚩
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div style={{ fontSize: "12px", color: "#666", marginBottom: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <div style={{ width: "20px", height: "20px", background: "#e8f5e9", border: "2px solid #4caf50", borderRadius: "4px" }} />
                            <span>Respondida</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <div style={{ width: "20px", height: "20px", background: "white", border: "2px solid #ddd", borderRadius: "4px" }} />
                            <span>Sin responder</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "16px" }}>🚩</span>
                            <span>Marcada para revisar</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Navigation Bar */}
                  <div style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "white",
                    borderTop: "2px solid #ddd",
                    padding: "1rem",
                    display: "flex",
                    gap: "0.5rem",
                    boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
                    zIndex: 100
                  }}>
                    {/* Previous Button */}
                    <button
                      onClick={() => jumpToQuestion(currentQuestionIndex - 1)}
                      disabled={currentQuestionIndex === 0}
                      style={{
                        flex: "0 0 auto",
                        padding: "12px 16px",
                        border: "2px solid #ddd",
                        background: "white",
                        borderRadius: "8px",
                        cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                        fontSize: "18px",
                        opacity: currentQuestionIndex === 0 ? 0.3 : 1
                      }}
                    >
                      ←
                    </button>

                    {/* Mark for Review Button */}
                    <button
                      onClick={() => toggleMarkForReview(currentQuestion.id)}
                      style={{
                        flex: "0 0 auto",
                        padding: "12px 16px",
                        border: "2px solid #f57c00",
                        background: markedForReview.has(currentQuestion.id) ? "#f57c00" : "white",
                        color: markedForReview.has(currentQuestion.id) ? "white" : "#f57c00",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "18px"
                      }}
                    >
                      🚩
                    </button>

                    {/* Submit Button */}
                    <button
                      onClick={() => submitTest(false)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "12px",
                        border: "none",
                        background: answeredCount === questions.length ? "#4caf50" : character.color,
                        color: "white",
                        borderRadius: "8px",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? "Enviando..." : `Finalizar (${answeredCount}/${questions.length})`}
                    </button>

                    {/* Next Button */}
                    <button
                      onClick={() => jumpToQuestion(currentQuestionIndex + 1)}
                      disabled={currentQuestionIndex === questions.length - 1}
                      style={{
                        flex: "0 0 auto",
                        padding: "12px 16px",
                        border: "2px solid #ddd",
                        background: "white",
                        borderRadius: "8px",
                        cursor: currentQuestionIndex === questions.length - 1 ? "not-allowed" : "pointer",
                        fontSize: "18px",
                        opacity: currentQuestionIndex === questions.length - 1 ? 0.3 : 1
                      }}
                    >
                      →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          {!isMobile && (
            <div style={{ width: "280px", flexShrink: 0 }}>
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: `2px solid ${character.color}20`
              }}>
                <h4 style={{ margin: "0 0 1rem 0", fontSize: "14px", fontWeight: "600" }}>
                  NAVEGACIÓN DE PREGUNTAS
                </h4>

                {/* Progress Bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ 
                    height: "6px", 
                    background: "#f0f0f0", 
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      background: selectedArea.color,
                      width: `${progress}%`,
                      transition: "width 0.3s"
                    }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "0.5rem" }}>
                    {Math.round(progress)}% completado
                  </div>
                </div>

                {/* Question Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.5rem",
                  marginBottom: "1rem"
                }}>
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.id];
                    const isMarked = markedForReview.has(q.id);
                    const isCurrent = idx === currentQuestionIndex;

                    let bgColor = "white";
                    let borderColor = "#ddd";
                    let textColor = "#666";

                    if (isCurrent) {
                      bgColor = selectedArea.color;
                      borderColor = selectedArea.color;
                      textColor = "white";
                    } else if (isAnswered) {
                      bgColor = "#e8f5e9";
                      borderColor = "#4caf50";
                      textColor = "#2e7d32";
                    }

                    return (
                      <div key={q.id} style={{ position: "relative" }}>
                        <button
                          onClick={() => jumpToQuestion(idx)}
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            border: `2px solid ${borderColor}`,
                            background: bgColor,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: textColor,
                            transition: "all 0.2s"
                          }}
                        >
                          {idx + 1}
                        </button>
                        {isMarked && (
                          <div style={{
                            position: "absolute",
                            top: "-4px",
                            right: "-4px",
                            fontSize: "12px"
                          }}>
                            🚩
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <div style={{ width: "16px", height: "16px", background: "#e8f5e9", border: "2px solid #4caf50", borderRadius: "3px" }} />
                    <span>Respondida</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <div style={{ width: "16px", height: "16px", background: "white", border: "2px solid #ddd", borderRadius: "3px" }} />
                    <span>Sin responder</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>🚩</span>
                    <span>Marcada para revisar</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => submitTest(false)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    border: "none",
                    background: answeredCount === questions.length ? "#4caf50" : `linear-gradient(135deg, ${character.color}, ${character.color}dd)`,
                    color: "white",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "600",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.2s",
                    boxShadow: `0 4px 12px ${character.color}40`
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {loading ? "Enviando..." : "Finalizar Simulacro"}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      </div>
    );
  }

  // Results Screen
  if (testState === "results" && results) {
    const scorePercentage = (results.score / results.totalQuestions) * 100;
    let scoreColor = "#d32f2f";
    let scoreMessage = "Necesitas mejorar";
    
    if (scorePercentage >= 80) {
      scoreColor = "#4caf50";
      scoreMessage = "¡Excelente desempeño!";
    } else if (scorePercentage >= 60) {
      scoreColor = "#ff9800";
      scoreMessage = "Buen trabajo";
    }

    return (
      <>
      <div style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "1rem" : "2rem 1rem"
        }}>
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: isMobile ? "1.5rem" : "2rem",
          marginBottom: "2rem",
          textAlign: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "1rem" }}>🎯</div>
          <h2 style={{ margin: "0 0 0.5rem 0", color: selectedArea.color }}>
            Resultados - {selectedArea.name}
          </h2>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Completado el {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Score Circle */}
          <div style={{ margin: "2rem 0" }}>
            <div style={{
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              border: `12px solid ${scoreColor}`,
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: scoreColor + "10"
            }}>
              <div style={{ fontSize: "48px", fontWeight: "700", color: scoreColor }}>
                {results.score}/{results.totalQuestions}
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>
                {Math.round(scorePercentage)}%
              </div>
            </div>
          </div>

          <div style={{ fontSize: "20px", fontWeight: "600", color: scoreColor }}>
            {scoreMessage}
          </div>
        </div>

        {/* Performance by Competency */}
        <div style={{
          background: "white",
          borderRadius: "12px",
          padding: isMobile ? "1.5rem" : "2rem",
          marginBottom: "2rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ margin: "0 0 1.5rem 0" }}>📊 Desempeño por Competencia</h3>
          
          {results.byCompetency && Object.entries(results.byCompetency).map(([competency, data]) => {
            const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            return (
              <div key={competency} style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", fontSize: "14px" }}>{competency}</span>
                  <span style={{ fontSize: "14px", color: "#666" }}>
                    {data.correct}/{data.total} ({Math.round(percentage)}%)
                  </span>
                </div>
                <div style={{ 
                  height: "12px", 
                  background: "#f0f0f0", 
                  borderRadius: "6px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    background: percentage >= 70 ? "#4caf50" : percentage >= 50 ? "#ff9800" : "#d32f2f",
                    width: `${percentage}%`,
                    transition: "width 0.5s"
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {results.recommendations && results.recommendations.length > 0 && (
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: isMobile ? "1.5rem" : "2rem",
            marginBottom: "2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>💡 Recomendaciones</h3>
            <ul style={{ lineHeight: "1.8", color: "#444", paddingLeft: "1.5rem" }}>
              {results.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Statistics */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "0.5rem" }}>⏱️</div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: "#1976d2" }}>
              {formatTime(results.timeSpent)}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Tiempo usado</div>
          </div>

          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "0.5rem" }}>✓</div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: "#4caf50" }}>
              {results.score}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Respuestas correctas</div>
          </div>

          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "32px", marginBottom: "0.5rem" }}>✗</div>
            <div style={{ fontSize: "24px", fontWeight: "600", color: "#d32f2f" }}>
              {results.totalQuestions - results.score}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Respuestas incorrectas</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setTestState("selection");
              setSelectedArea(null);
              setQuestions([]);
              setAnswers({});
              setMarkedForReview(new Set());
              setResults(null);
              setTimeRemaining(90 * 60);
            }}
            style={{
              padding: "14px 28px",
              border: "2px solid #1976d2",
              background: "white",
              color: "#1976d2",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600"
            }}
          >
            Ver todas las áreas
          </button>
          <button
            onClick={() => {
              setTestState("instructions");
              setQuestions([]);
              setAnswers({});
              setMarkedForReview(new Set());
              setResults(null);
              setTimeRemaining(90 * 60);
            }}
            style={{
              padding: "14px 28px",
              border: "none",
              background: selectedArea.color,
              color: "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600"
            }}
          >
            Repetir simulacro
          </button>
        </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
      </>
    );
  }

  return (
    <>
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "1rem" }}>⏳</div>
        <p>Cargando...</p>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        {...modalConfig}
      />
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </>
  );
}