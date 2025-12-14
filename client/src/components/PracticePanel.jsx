// client/src/components/PracticePanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";
import Modal from "./Modal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Character assignment based on subject (from Brand Identity Guide)
const getCharacterForSubject = (subject) => {
  if (!subject)
    return {
      name: "Pico",
      icon: "/image/characters/teen/Pico-Icon.png",
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
    subjectLower.includes("english")
  ) {
    return {
      name: "Lili",
      icon: "/image/characters/teen/Lili-Icon.png",
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
      icon: "/image/characters/teen/Maco-Icon.png",
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
      icon: "/image/characters/teen/Frailo-Icon.png",
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
    subjectLower.includes("civica")
  ) {
    return {
      name: "Cerita",
      icon: "/image/characters/teen/Cerita-Icon.png",
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
      icon: "/image/characters/teen/Rosi-Icon.png",
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
      icon: "/image/characters/teen/Yagui-Icon.png",
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
      icon: "/image/characters/teen/Kundi-Icon.png",
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
      icon: "/image/characters/teen/Guiro-Icon.png",
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
      icon: "/image/characters/teen/Pico-Icon.png",
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
      icon: "/image/characters/teen/Tuko-Icon.png",
      color: "#6A4F4B",
    };
  }

  // Default → Pico
  return {
    name: "Pico",
    icon: "/image/characters/teen/Pico-Icon.png",
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

export default function PracticePanel({ session }) {
  const [selectedSubject, setSelectedSubject] = useState(session?.subject || "");
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const isMobile = useIsMobile();
  
  const character = getCharacterForSubject(selectedSubject);
  
  const [exercises, setExercises] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ total: 0, correct: 0, accuracy: 0 });
  const [showProgress, setShowProgress] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const subjects = [
    { name: "Matemáticas", icon: "🔢" },
    { name: "Ciencias Naturales", icon: "🔬" },
    { name: "Lengua Castellana", icon: "📖" },
    { name: "Inglés", icon: "🇬🇧" },
    { name: "Ciencias Sociales", icon: "🌍" },
    { name: "Educación Física", icon: "🏃‍♂️" },
    { name: "Educación Artística", icon: "🎨" },
    { name: "Educación Ética y Valores", icon: "🤝" },
    { name: "Tecnología e Informática", icon: "💻" },
    { name: "Educación Religiosa", icon: "⛪" },
    { name: "Física", icon: "⚛️" },
    { name: "Química", icon: "🧪" },
    { name: "Filosofía", icon: "🤔" },
  ];

  const selectedSubjectData = subjects.find(s => s.name === selectedSubject);

  useEffect(() => {
    if (session?.subject && !selectedSubject) {
      setSelectedSubject(session.subject);
    }
  }, [session]);

  useEffect(() => {
    loadProgress();
  }, [selectedSubject]);

  async function loadProgress() {
    if (!selectedSubject) return;
    
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/practice/progress?subject=${encodeURIComponent(selectedSubject)}`, {
        headers
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Error loading progress:", e);
    }
  }

  async function generateExercises() {
    if (!selectedSubject || !session?.id) {
      alert("Por favor selecciona una asignatura primero");
      return;
    }

    setLoading(true);
    setExercises([]);
    setCurrentExerciseIndex(0);
    setSubmitted(false);
    setFeedback(null);

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader())
      };

      const resp = await fetch(`${API_BASE}/api/practice/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject: selectedSubject,
          difficulty: "medium",
          count: 5,
          sessionId: session.id
        })
      });

      if (!resp.ok) {
        throw new Error("Error generating exercises");
      }

      const data = await resp.json();
      setExercises(data.exercises || []);
      setStartTime(Date.now());
    } catch (e) {
      console.error("Error:", e);
      alert("Error al generar ejercicios. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!userAnswer.trim()) {
      alert("Por favor ingresa una respuesta");
      return;
    }

    const currentExercise = exercises[currentExerciseIndex];
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;

    setLoading(true);

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await getAuthHeader())
      };

      const resp = await fetch(`${API_BASE}/api/practice/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          exerciseId: currentExercise.id,
          answer: userAnswer,
          timeSpent
        })
      });

      if (!resp.ok) {
        throw new Error("Error submitting answer");
      }

      const result = await resp.json();
      setFeedback(result);
      setSubmitted(true);
      
      // Update progress
      await loadProgress();
    } catch (e) {
      console.error("Error:", e);
      alert("Error al enviar respuesta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function nextExercise() {
    setSubmitted(false);
    setUserAnswer("");
    setFeedback(null);

    const nextIndex = currentExerciseIndex + 1;
    
    if (nextIndex >= exercises.length) {
      // Show completion modal
      setModalConfig({
        title: "¡Has completado todos los ejercicios! 🎉",
        message: `Completaste ${exercises.length} ejercicios. ¿Qué te gustaría hacer ahora?`,
        confirmText: "Ver Progreso",
        cancelText: "Nuevos Ejercicios",
        onConfirm: () => {
          setShowModal(false);
          setShowProgress(true);
        },
        onCancel: () => {
          setShowModal(false);
          generateExercises();
        }
      });
      setShowModal(true);
      return;
    }
    
    setCurrentExerciseIndex(nextIndex);
    setStartTime(Date.now());
  }

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <div style={{ 
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
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
          padding: isMobile ? "0.75rem 1rem" : "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap"
        }}>
          {/* Left side: Character + Title */}
          <div style={{
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
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: isMobile ? "18px" : "22px",
                fontWeight: "700",
                color: "#2c3e50"
              }}>
                Práctica Interactiva
              </h2>
              {selectedSubject && (
                <p style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: isMobile ? "13px" : "14px",
                  color: "#7f8c8d"
                }}>
                  con {character.name}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Subject Selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSubjectMenu(!showSubjectMenu)}
              disabled={exercises.length > 0}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                border: selectedSubject ? `3px solid ${character.color}` : "2px solid #ddd",
                background: "white",
                cursor: exercises.length > 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
                opacity: exercises.length > 0 ? 0.5 : 1
              }}
              title={selectedSubject || "Seleccionar asignatura"}
            >
              {selectedSubjectData ? selectedSubjectData.icon : "📚"}
            </button>

          {/* Dropdown Menu */}
          {showSubjectMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                onClick={() => setShowSubjectMenu(false)}
              />

              <div
                style={{
                  position: "absolute",
                  top: "65px",
                  right: 0,
                  background: "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  borderRadius: "12px",
                  minWidth: "240px",
                  maxHeight: "350px",
                  overflowY: "auto",
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #f0f0f0",
                    fontWeight: "bold",
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  Seleccionar asignatura
                </div>
                {subjects.map((subject) => (
                  <button
                    key={subject.name}
                    onClick={() => {
                      setSelectedSubject(subject.name);
                      setShowSubjectMenu(false);
                      
                      // Update session subject if different
                      if (session?.id && session.subject !== subject.name) {
                        supabase
                          .from("chat_sessions")
                          .update({ subject: subject.name })
                          .eq("id", session.id)
                          .then(() => console.log("Subject updated"));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      border: "none",
                      background: selectedSubject === subject.name ? "#e3f2fd" : "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{subject.icon}</span>
                    <span>{subject.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: isMobile ? "1rem" : "2rem 1rem"
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto"
        }}>

      {/* Selected Subject Display */}
      {selectedSubject && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "white",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: `2px solid ${character.color}20`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "24px" }}>{selectedSubjectData?.icon}</span>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#2c3e50" }}>
              {selectedSubject}
            </span>
          </div>
          
          <button
            onClick={() => setShowProgress(!showProgress)}
            style={{
              padding: "8px 16px",
              background: character.color,
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              color: "white",
              fontWeight: "600",
              transition: "all 0.2s",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
              }
            }}
          >
            📊 Ver Progreso
          </button>
        </div>
      )}

      {/* Progress Panel */}
      {showProgress && progress.total > 0 && (
        <div
          style={{
            padding: "1.5rem",
            background: "white",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: `2px solid ${character.color}20`
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "18px", color: "#2c3e50", marginBottom: "1rem" }}>📊 Tu Progreso</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "1rem" }}>
            <div style={{ textAlign: "center", padding: "1.25rem", background: `${character.color}10`, borderRadius: "12px", border: `2px solid ${character.color}30` }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: character.color }}>
                {progress.total}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Ejercicios</div>
            </div>
            <div style={{ textAlign: "center", padding: "1.25rem", background: "#e8f5e9", borderRadius: "12px", border: "2px solid #a5d6a730" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#388e3c" }}>
                {progress.correct}
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Correctos</div>
            </div>
            <div style={{ textAlign: "center", padding: "1.25rem", background: "#fff3e0", borderRadius: "12px", border: "2px solid #ffb74d30" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f57c00" }}>
                {progress.accuracy}%
              </div>
              <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>Precisión</div>
            </div>
          </div>
        </div>
      )}

      {/* No exercises yet - Show start button */}
      {exercises.length === 0 && (
        <div
          style={{
            padding: isMobile ? "1.5rem" : "2rem",
            background: "white",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: selectedSubject ? `2px solid ${character.color}20` : "2px solid #e0e0e0"
          }}
        >
          <h3 style={{ fontSize: isMobile ? "20px" : "24px", marginTop: 0 }}>
            🎯 ¡Comienza a Practicar!
          </h3>
          <p style={{ color: "#666", fontSize: isMobile ? "14px" : "16px", marginBottom: "1.5rem" }}>
            {selectedSubject 
              ? `Genera ejercicios personalizados de ${selectedSubject} basados en tus materiales.`
              : "Selecciona una asignatura para comenzar."}
          </p>
          <button
            onClick={generateExercises}
            disabled={!selectedSubject || loading || !session}
            style={{
              padding: "14px 28px",
              background: selectedSubject && session ? `linear-gradient(135deg, ${character.color}, ${character.color}dd)` : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: selectedSubject && session ? "pointer" : "not-allowed",
              boxShadow: selectedSubject && session ? `0 4px 12px ${character.color}40` : "none",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              if (selectedSubject && session && !isMobile) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = `0 6px 16px ${character.color}50`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSubject && session && !isMobile) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = `0 4px 12px ${character.color}40`;
              }
            }}
          >
            {loading ? "Generando..." : "🚀 Generar Ejercicios"}
          </button>
          
          {!session && (
            <p style={{ marginTop: "1rem", fontSize: "13px", color: "#d32f2f" }}>
              Crea una nueva práctica desde el menú lateral para comenzar
            </p>
          )}
          
          <div style={{ marginTop: "2rem", textAlign: "left", maxWidth: "500px", margin: "2rem auto 0" }}>
            <h4 style={{ fontSize: "16px", marginBottom: "0.5rem" }}>✨ Características:</h4>
            <ul style={{ paddingLeft: "1.5rem", fontSize: "14px", color: "#666" }}>
              <li>Ejercicios generados por IA basados en tus materiales</li>
              <li>Retroalimentación inmediata con explicaciones</li>
              <li>Seguimiento de tu progreso y precisión</li>
              <li>Diferentes tipos de preguntas (opción múltiple, verdadero/falso)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Exercise Display */}
      {exercises.length > 0 && currentExercise && (
        <div
          style={{
            padding: isMobile ? "1.5rem" : "2rem",
            background: "white",
            borderRadius: "12px",
            border: `2px solid ${character.color}20`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          {/* Progress Bar */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "14px", color: "#666" }}>
              <span>Ejercicio {currentExerciseIndex + 1} de {exercises.length}</span>
              <span>{Math.round(((currentExerciseIndex + 1) / exercises.length) * 100)}%</span>
            </div>
            <div style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${character.color}, ${character.color}dd)`,
                  width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%`,
                  transition: "width 0.3s",
                  boxShadow: `0 0 8px ${character.color}50`
                }}
              />
            </div>
          </div>

          {/* Question */}
          <h3 style={{ fontSize: isMobile ? "18px" : "22px", marginBottom: "1.5rem", color: "#333" }}>
            {currentExercise.question_text}
          </h3>

          {/* Multiple Choice Options */}
          {currentExercise.question_type === "multiple_choice" && currentExercise.options && (
            <div style={{ marginBottom: "1.5rem" }}>
              {currentExercise.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                const isSelected = userAnswer === letter;
                const isCorrect = feedback && letter === currentExercise.correct_answer;
                const isWrong = feedback && isSelected && !feedback.isCorrect;
                
                let bgColor = "white";
                let borderColor = "#ddd";
                
                if (submitted) {
                  if (isCorrect) {
                    bgColor = "#e8f5e9";
                    borderColor = "#388e3c";
                  } else if (isWrong) {
                    bgColor = "#ffebee";
                    borderColor = "#d32f2f";
                  }
                } else if (isSelected) {
                  bgColor = "#e3f2fd";
                  borderColor = "#1976d2";
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => !submitted && setUserAnswer(letter)}
                    disabled={submitted}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      marginBottom: "0.75rem",
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: "8px",
                      textAlign: "left",
                      cursor: submitted ? "not-allowed" : "pointer",
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      transition: "all 0.2s"
                    }}
                  >
                    <span style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: submitted ? (isCorrect ? "#388e3c" : isWrong ? "#d32f2f" : "#ddd") : (isSelected ? character.color : "#ddd"),
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      flexShrink: 0
                    }}>
                      {letter}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* True/False Options */}
          {currentExercise.question_type === "true_false" && (
            <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {["Verdadero", "Falso"].map((option) => {
                const isSelected = userAnswer === option;
                const isCorrect = feedback && option === currentExercise.correct_answer;
                const isWrong = feedback && isSelected && !feedback.isCorrect;
                
                let bgColor = "white";
                let borderColor = "#ddd";
                
                if (submitted) {
                  if (isCorrect) {
                    bgColor = "#e8f5e9";
                    borderColor = "#388e3c";
                  } else if (isWrong) {
                    bgColor = "#ffebee";
                    borderColor = "#d32f2f";
                  }
                } else if (isSelected) {
                  bgColor = "#e3f2fd";
                  borderColor = "#1976d2";
                }
                
                return (
                  <button
                    key={option}
                    onClick={() => !submitted && setUserAnswer(option)}
                    disabled={submitted}
                    style={{
                      flex: 1,
                      minWidth: isMobile ? "100%" : "150px",
                      padding: "1rem",
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: "8px",
                      cursor: submitted ? "not-allowed" : "pointer",
                      fontSize: "16px",
                      fontWeight: "600",
                      transition: "all 0.2s"
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {/* Open-Ended Input */}
          {currentExercise.question_type === "open_ended" && (
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Escribe tu respuesta aquí..."
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "1rem",
                marginBottom: "1.5rem",
                border: "2px solid #ddd",
                borderRadius: "8px",
                fontSize: "15px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          )}

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: "1rem",
                marginBottom: "1.5rem",
                background: feedback.isCorrect ? "#e8f5e9" : "#fff3cd",
                border: `2px solid ${feedback.isCorrect ? "#388e3c" : "#f57c00"}`,
                borderRadius: "8px",
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "0.5rem", fontSize: "16px", color: feedback.isCorrect ? "#388e3c" : "#f57c00" }}>
                {feedback.isCorrect ? "✅ ¡Correcto!" : "❌ Incorrecto"}
              </div>
              <div style={{ fontSize: "14px", color: "#333" }}>
                {feedback.explanation}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            {!submitted ? (
              <button
                onClick={submitAnswer}
                disabled={!userAnswer || loading}
                style={{
                  padding: "12px 24px",
                  background: userAnswer ? `linear-gradient(135deg, ${character.color}, ${character.color}dd)` : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: userAnswer ? "pointer" : "not-allowed",
                  boxShadow: userAnswer ? `0 4px 12px ${character.color}40` : "none",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  if (userAnswer && !isMobile) {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = `0 6px 16px ${character.color}50`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (userAnswer && !isMobile) {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = `0 4px 12px ${character.color}40`;
                  }
                }}
              >
                {loading ? "Enviando..." : "Verificar Respuesta"}
              </button>
            ) : (
              <button
                onClick={nextExercise}
                style={{
                  padding: "12px 24px",
                  background: "#388e3c",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {currentExerciseIndex < exercises.length - 1 ? "Siguiente Ejercicio →" : "Finalizar"}
              </button>
            )}
          </div>
        </div>
      )}

        </div>
      </div>
      {/* Completion Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
        }}
        title={modalConfig.title || ""}
        message={modalConfig.message || ""}
        confirmText={modalConfig.confirmText || "Aceptar"}
        cancelText={modalConfig.cancelText || "Cancelar"}
        type="confirm"
      />
    </div>
  );
}