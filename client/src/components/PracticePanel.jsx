// client/src/components/PracticePanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";
import Modal from "./Modal";
import { CircularProgress, ThoughtBubble, CharacterDisplay } from "./PracticeComponents";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper function to get character image path with state
const getCharacterImage = (characterName, ageGroup, state = 'default') => {
  return `/image/characters/${ageGroup}/${characterName}/${state}.png`;
};

// Character assignment based on subject (from Brand Identity Guide)
const getCharacterForSubject = (subject, grade = null) => {

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

  // Initialize with default Pico
  let characterName = "Pico";
  let characterColor = "#1976D2";

  if (subject) {
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
      characterName = "Lili";
      characterColor = "#9C27B0";
    }
    // 2. Matemáticas → Maco (macaco)
    else if (
      subjectLower.includes("matemática") ||
      subjectLower.includes("matematica") ||
      subjectLower.includes("matemáticas") ||
      subjectLower.includes("matematicas")
    ) {
      characterName = "Maco";
      characterColor = "#1976D2";
    }
    // 3. Ciencias Naturales → Frailo (frailejón)
    else if (
      subjectLower.includes("ciencias naturales") ||
      subjectLower.includes("biología") ||
      subjectLower.includes("biologia") ||
      subjectLower.includes("naturales")
    ) {
      characterName = "Frailo";
      characterColor = "#4CAF50";
    }
    // 4. Ciencias Sociales → Cerita (palma de cera)
    else if (
      subjectLower.includes("sociales") ||
      subjectLower.includes("historia") ||
      subjectLower.includes("geografía") ||
      subjectLower.includes("geografia") ||
      subjectLower.includes("cívica") ||
      subjectLower.includes("civica")
    ) {
      characterName = "Cerita";
      characterColor = "#FF9800";
    }
    // 5. Educación Artística → Rosi (delfín rosado)
    else if (
      subjectLower.includes("artística") ||
      subjectLower.includes("artistica") ||
      subjectLower.includes("arte")
    ) {
      characterName = "Rosi";
      characterColor = "#E91E63";
    }
    // 6. Educación Física → Yagui (jaguar)
    else if (
      subjectLower.includes("educación física") ||
      subjectLower.includes("educacion fisica") ||
      subjectLower.includes("deporte") ||
      subjectLower.includes("gimnasia")
    ) {
      characterName = "Yagui";
      characterColor = "#FF5722";
    }
    // 7. Tecnología e Informática → Kundi (cóndor)
    else if (
      subjectLower.includes("tecnología") ||
      subjectLower.includes("tecnologia") ||
      subjectLower.includes("informática") ||
      subjectLower.includes("informatica") ||
      subjectLower.includes("computación") ||
      subjectLower.includes("computacion")
    ) {
      characterName = "Kundi";
      characterColor = "#3F51B5";
    }
    // 8. Ética y Valores → Guiro (chigüiro)
    else if (
      subjectLower.includes("ética") ||
      subjectLower.includes("etica") ||
      subjectLower.includes("valores")
    ) {
      characterName = "Guiro";
      characterColor = "#795548";
    }
    // 9. Química and Física → Pico (tucán)
    else if (
      subjectLower.includes("química") ||
      subjectLower.includes("quimica") ||
      subjectLower.includes("física") ||
      subjectLower.includes("fisica")
    ) {
      characterName = "Pico";
      characterColor = "#1976D2";
    }
    // 10. Religión and Filosofía → Tuko (oso de anteojos)
    else if (
      subjectLower.includes("religión") ||
      subjectLower.includes("religion") ||
      subjectLower.includes("filosofía") ||
      subjectLower.includes("filosofia")
    ) {
      characterName = "Tuko";
      characterColor = "#6A4F4B";
    }
  }

  // Return character object with getImage function
  return {
    name: characterName,
    ageGroup: ageGroup,
    icon: getCharacterImage(characterName, ageGroup, "default"),
    color: characterColor,
    getImage: (state = 'default') => getCharacterImage(characterName, ageGroup, state)
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
  const [userGrade, setUserGrade] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(true);
  const isMobile = useIsMobile();
  
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
  const [characterState, setCharacterState] = useState('waving'); // Character animation state
  const [inactivityTimer, setInactivityTimer] = useState(null);  

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
  
  const character = getCharacterForSubject(selectedSubject, userGrade);
  const selectedSubjectData = subjects.find(s => s.name === selectedSubject);

  // Timer to show reading state after 30 seconds of inactivity
  useEffect(() => {
    if (exercises.length > 0 && !submitted) {
      const timer = setTimeout(() => {
        setCharacterState('reading');
      }, 30000); // 30 seconds
      
      setInactivityTimer(timer);
      
      return () => clearTimeout(timer);
    }
  }, [currentExerciseIndex, submitted, exercises.length]);

  // Reset character state on user interaction
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (characterState === 'reading') {
      setCharacterState('pointing');
    }
  };

  useEffect(() => {
    if (session?.subject && session.subject !== selectedSubject) {
      // Subject changed from sidebar - reset everything
      setSelectedSubject(session.subject);
      setExercises([]);
      setCurrentExerciseIndex(0);
      setUserAnswer("");
      setSubmitted(false);
      setFeedback(null);
      setShowProgress(false);
      setCharacterState('waving');
      
      // Load progress for new subject
      if (session.subject) {
        loadProgress();
      }
    }
  }, [session?.subject, selectedSubject]);

  useEffect(() => {
    loadProgress();
  }, [selectedSubject]);

  useEffect(() => {
    async function loadGrade() {
      setGradeLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (userId) {
          const { data: student } = await supabase
            .from("students")
            .select("grade")
            .eq("user_id", userId)
            .single();
          if (student) {
            setUserGrade(student.grade);
          }
        }
      } catch (e) {
        console.warn("Error loading grade:", e);
      } finally {
        setGradeLoading(false);
      }
    }
    loadGrade();
  }, []);

  // Reset state when session changes
  useEffect(() => {
    if (session?.id) {
      // Reset all state when switching sessions
      setExercises([]);
      setCurrentExerciseIndex(0);
      setUserAnswer("");
      setSubmitted(false);
      setFeedback(null);
      setShowProgress(false);
      setCharacterState('waving');
      setSelectedSubject(session.subject || "");
      
      // Load progress for the new session's subject
      if (session.subject) {
        loadProgress();
      }
    }
  }, [session?.id]); // Only trigger when session ID changes

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
    setCharacterState('waving'); // Before generating
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
    resetInactivityTimer();
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
      // After getting feedback
      if (result.isCorrect) {
        setCharacterState('celebrating');
        setTimeout(() => setCharacterState('default'), 3000); // Return to default after 3s
      } else {
        setCharacterState('thinking');
        setTimeout(() => setCharacterState('default'), 3000);
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Error al enviar respuesta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  function nextExercise() {
    setCharacterState('pointing'); // Beginning of each exercise
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

  if (gradeLoading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid #e0e0e0",
            borderTopColor: "#1976D2",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem"
          }} />
          <p style={{ color: "#666", fontSize: "16px" }}>Cargando...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      marginTop: exercises.length > 0 ? "-60px" : "0", // Remove navbar space only after exercises generated
      paddingTop: exercises.length > 0 ? "60px" : "0" // Compensate with padding to maintain full height
    }}>
      {/* Header with Character - Hidden during active practice */}
      {exercises.length === 0 && (
      <div style={{
        background: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderBottom: `3px solid ${character.color}`,
        flexShrink: 0
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: isMobile ? "0.75rem 1rem" : "1rem 2rem 1rem",
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
        </div>
      </div>
      )}

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

      {/* Selected Subject Display - Hidden during active practice, minimal circular button instead */}
      {selectedSubject && exercises.length === 0 && (
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
      
      {/* Minimal Progress Button - Shows during active practice */}
      {selectedSubject && exercises.length > 0 && (
        <button
          onClick={() => setShowProgress(!showProgress)}
          style={{
            position: "fixed",
            top: isMobile ? "7px" : "90px",
            left: isMobile ? "1rem" : "2rem",
            width: isMobile ? "45px" : "50px",
            height: isMobile ? "45px" : "50px",
            borderRadius: "50%",
            background: character.color,
            border: "none",
            cursor: "pointer",
            fontSize: "20px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 100,
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.target.style.transform = "scale(1.1)";
              e.target.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
            }
          }}
          title="Ver Progreso"
        >
          📊
        </button>
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

      {/* Exercise Display - Minimalist Design */}
      {exercises.length > 0 && currentExercise && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: isMobile ? "1rem" : "2rem",
            maxWidth: "900px",
            margin: "0 auto",
            width: "100%"
          }}
        >
          {/* Circular Progress Indicator - Top Right */}
          <div style={{
            position: "fixed",
            top: isMobile ? "7px" : "165px",
            right: isMobile ? "7rem" : "2.5rem",
            zIndex: 100
          }}>
            <CircularProgress 
              current={currentExerciseIndex + 1} 
              total={exercises.length}
              size={isMobile ? 45 : 65}
              color={character.color}
            />
          </div>

          {/* Character + Thought Bubble Container - Always side-by-side */}
          <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: isMobile ? "1rem" : "2rem",
            marginBottom: "2rem",
            flexWrap: isMobile ? "nowrap" : "nowrap"
          }}>
            {/* Character Display - Smaller on mobile for side-by-side layout */}
            <div style={{ flexShrink: 0 }}>
              <CharacterDisplay 
                character={character}
                state={characterState}
                size={isMobile ? "medium" : "large"}
              />
            </div>

            {/* Exercise Statement in Thought Bubble */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <ThoughtBubble 
                content={currentExercise.question_text}
                characterColor={character.color}
                autoCollapse={isMobile}
                collapseDelay={5000}
              />
            </div>
          </div>

          {/* Answer Options */}
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: isMobile ? "1.25rem" : "1.75rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: `2px solid ${character.color}15`
          }}>
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
                  bgColor = `${character.color}10`;
                  borderColor = character.color;
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => !submitted && setUserAnswer(letter)}
                    disabled={submitted}
                    style={{
                      width: "100%",
                      padding: "1rem 1.25rem",
                      marginBottom: "0.75rem",
                      background: bgColor,
                      border: `3px solid ${borderColor}`,
                      borderRadius: "12px",
                      textAlign: "left",
                      cursor: submitted ? "not-allowed" : "pointer",
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      transition: "all 0.2s",
                      fontWeight: isSelected ? "600" : "400"
                    }}
                    onMouseEnter={(e) => {
                      if (!submitted && !isMobile) {
                        e.currentTarget.style.transform = "translateX(5px)";
                        e.currentTarget.style.boxShadow = `0 4px 12px ${character.color}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitted && !isMobile) {
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <span style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: submitted ? (isCorrect ? "#388e3c" : isWrong ? "#d32f2f" : "#ddd") : (isSelected ? character.color : "#e0e0e0"),
                      color: isSelected || submitted ? "white" : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      flexShrink: 0,
                      fontSize: "16px"
                    }}>
                      {letter}
                    </span>
                    <span style={{ flex: 1 }}>{option}</span>
                    {submitted && isCorrect && <span style={{ fontSize: "20px" }}>✓</span>}
                    {submitted && isWrong && <span style={{ fontSize: "20px" }}>✗</span>}
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