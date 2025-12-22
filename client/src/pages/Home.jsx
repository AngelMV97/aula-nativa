// client/src/pages/Home.jsx
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import { useIsMobile } from "../hooks/useMediaQuery";

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userGrade, setUserGrade] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    loadUserData();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  async function loadUserData() {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id;
      
      if (uid) {
        const { data: student, error } = await supabase
          .from("students")
          .select("grade, name")
          .eq("user_id", uid)
          .single();
        
        if (error) throw error;
        
        setUserGrade(student?.grade || null);
        setUserName(student?.name || 'Estudiante');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      showToast('Error al cargar tus datos', 'error');
    } finally {
      setLoading(false);
    }
  }

  const phases = [
    {
      id: "assistant",
      title: "Asistente Virtual",
      icon: "💬",
      description: "Pregunta sobre cualquier tema de tus materiales",
      color: "#1976D2",
      available: true,
    },
    {
      id: "practice",
      title: "Práctica Interactiva",
      icon: "✍️",
      description: "Ejercicios personalizados con retroalimentación",
      color: "#2E7D32",
      available: true,
    },
    {
      id: "mocktest",
      title: "Simulacro ICFES",
      icon: "📝",
      description: "Prepárate para el examen de Estado (Grados 10-11)",
      color: "#FF6B35",
      available: userGrade >= 10,
    },
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ 
          minHeight: 'calc(100vh - 60px)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: isMobile ? '1.5rem 1rem' : '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#666', fontSize: '16px' }}>Cargando...</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: '' })} />}
      <Navbar />
      <div
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: isMobile ? "1.5rem 1rem" : "3rem 2rem",
          paddingTop: isMobile ? "calc(60px + 1.5rem)" : "calc(60px + 3rem)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-150px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255,107,53,0.1)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Hero Section with Pico */}
          <div style={{ 
            textAlign: "center", 
            color: "white", 
            marginBottom: isMobile ? "2.5rem" : "3.5rem",
            animation: "fadeIn 0.6s ease-out",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            justifyContent: "center",
            gap: isMobile ? "1.5rem" : "2.5rem",
          }}>
            {/* Pico Character */}
            <div style={{
              animation: "float 3s ease-in-out infinite",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))",
            }}>
              <img 
                src="/image/characters/teen/Pico-Icon.png" 
                alt="Pico"
                style={{
                  width: isMobile ? "120px" : "180px",
                  height: "auto",
                }}
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>

            {/* Combined Greeting */}
            <div style={{ textAlign: isMobile ? "center" : "left", maxWidth: "600px" }}>
              {loading ? (
                <div style={{
                  minHeight: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <div style={{
                    // background: 'rgba(255,255,255,0.95)',
                    padding: isMobile ? '1.5rem 2rem' : '2rem 2.5rem',
                    borderRadius: '16px',
                    // boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      border: '4px solid rgba(102, 126, 234, 0.2)',
                      borderTopColor: '#3d4b8bff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }} />
                    <p style={{ 
                      color: '#ffffff',//'#667eea', 
                      fontSize: isMobile ? '15px' : '16px',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      Cargando tu información...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h1 style={{ 
                    fontSize: isMobile ? "26px" : "42px", 
                    marginBottom: "1rem", 
                    fontWeight: "700",
                    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    lineHeight: "1.2",
                  }}>
                    ¡Hola, {userName.split(' ')[0]}! 👋
                  </h1>
                  <p style={{ 
                    fontSize: isMobile ? "16px" : "20px", 
                    opacity: 0.95,
                    fontWeight: "500",
                    marginBottom: "0.75rem",
                    lineHeight: "1.5",
                  }}>
                    Soy Pico y estoy aquí para ayudarte.
                  </p>
                  <p style={{ 
                    fontSize: isMobile ? "15px" : "18px", 
                    opacity: 0.9,
                    fontWeight: "400",
                    lineHeight: "1.5",
                  }}>
                    ¿Qué quieres aprender hoy?
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Phase Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile 
                ? "1fr" 
                : "repeat(auto-fit, minmax(300px, 1fr))",
              gap: isMobile ? "1.5rem" : "2rem",
              marginBottom: isMobile ? "2.5rem" : "3rem",
            }}
          >
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                onClick={() => {
                  if (phase.available && !loading) {
                    // Navigate to assistant with phase parameter
                    if (phase.id === "assistant") {
                      navigate("/assistant?phase=assistant");
                    } else if (phase.id === "practice") {
                      navigate("/assistant?phase=practice");
                    } else if (phase.id === "mocktest") {
                      navigate("/assistant?phase=mocktest");
                    }
                  }
                }}
                style={{
                  background: (phase.available && !loading) ? "white" : "rgba(255,255,255,0.5)",
                  borderRadius: "16px",
                  padding: isMobile ? "1.75rem" : "2rem",
                  boxShadow: (phase.available && !loading) 
                    ? "0 8px 24px rgba(0,0,0,0.12)" 
                    : "0 4px 12px rgba(0,0,0,0.08)",
                  cursor: phase.available && !loading ? "pointer" : "not-allowed",
                  opacity: 1,
                  transform: "translateY(0)",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                  animation: `slideUp 0.6s ease-out ${index * 0.1}s both`,
                  border: phase.available ? "2px solid transparent" : "2px solid rgba(0,0,0,0.1)",
                  filter: phase.available ? "none" : "grayscale(0.3)",
                }}
                onMouseEnter={(e) => {
                  if (phase.available && !loading) {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow = "0 15px 40px rgba(0,0,0,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
                }}
              >
                {/* Color Bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "5px",
                    background: `linear-gradient(90deg, ${phase.color}, ${phase.color}dd)`,
                  }}
                />

                {/* Icon */}
                <div style={{ 
                  fontSize: isMobile ? "56px" : "64px", 
                  marginBottom: "1rem",
                  filter: (phase.available && !loading) ? "none" : "grayscale(100%)"
                }}>
                  {phase.icon}
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontSize: isMobile ? "22px" : "24px",
                    marginBottom: "0.75rem",
                    color: phase.color,
                    fontWeight: "700",
                  }}
                >
                  {phase.title}
                </h2>

                {/* Description */}
                <p style={{ 
                  color: "#666", 
                  fontSize: isMobile ? "14px" : "15px", 
                  lineHeight: "1.6",
                  marginBottom: "1rem"
                }}>
                  {phase.description}
                </p>

                {/* Call to Action */}
                {phase.available && !loading && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: phase.color,
                    fontWeight: "600",
                    fontSize: "14px",
                    marginTop: "0.5rem"
                  }}>
                    Comenzar
                    <span style={{ transition: "transform 0.3s" }}>→</span>
                  </div>
                )}

                {/* Availability Badge */}
                {!phase.available && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem 1rem",
                      background: "#fff3cd",
                      border: "1px solid #ffc107",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#856404",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span>🔒</span>
                    <span>Solo disponible para grados 10-11</span>
                  </div>
                )}
              </div>
            ))}
            </div>

          {/* Quick Stats */}
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: isMobile ? "1.75rem 1.5rem" : "2.5rem 2rem",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(255,255,255,0.25)",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: isMobile ? "1.5rem" : "2.5rem",
              color: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "32px" : "40px", 
                fontWeight: "700",
                marginBottom: "0.5rem",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                3
              </div>
              <div style={{ 
                opacity: 0.95, 
                fontSize: isMobile ? "14px" : "15px",
                fontWeight: "500"
              }}>
                Herramientas de Estudio
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontSize: isMobile ? "32px" : "40px", 
                fontWeight: "700",
                marginBottom: "0.5rem",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                ∞
              </div>
              <div style={{ 
                opacity: 0.95, 
                fontSize: isMobile ? "14px" : "15px",
                fontWeight: "500"
              }}>
                Temas Disponibles
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              {loading ? (
                <>
                  <div style={{
                    height: "40px",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                  <div style={{
                    height: "20px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: "0.2s"
                  }} />
                </>
              ) : (
                <>
                  <div style={{ 
                    fontSize: isMobile ? "32px" : "40px", 
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    textShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    {userGrade ? `${userGrade}°` : "—"}
                  </div>
                  <div style={{ 
                    opacity: 0.95, 
                    fontSize: isMobile ? "14px" : "15px",
                    fontWeight: "500"
                  }}>
                    Tu Grado
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
  
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}