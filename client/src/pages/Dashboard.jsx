import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import AnalyticsPanel from "../components/AnalyticsPanel";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/LoadingSkeleton";

function Dashboard() {
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploads, setUploads] = useState({}); // { [materialId]: { fileName, current, total, message, error, done, completedAt } }
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    async function loadUserId() {
      try {
        // Supabase v2:
        const getUser = supabase.auth && supabase.auth.getUser;
        if (typeof getUser === "function") {
          const { data, error } = await supabase.auth.getUser();
          if (!error && data && data.user && mounted) {
            setCurrentTeacherId(data.user.id);
            setLoadingUser(false);
            return;
          }
        }

        // Fallback for older supabase client versions:
        if (supabase.auth && typeof supabase.auth.user === "function") {
          const user = supabase.auth.user();
          if (user && mounted) {
            setCurrentTeacherId(user.id);
            setLoadingUser(false);
            return;
          }
        }

        // Final fallback: try session (v2)
        if (supabase.auth && typeof supabase.auth.getSession === "function") {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user ?? null;
          if (user && mounted) {
            setCurrentTeacherId(user.id);
            setLoadingUser(false);
          }
        }
      } catch (err) {
        console.warn("Could not load supabase user id:", err);
        if (mounted) setLoadingUser(false);
      }
    }
    loadUserId();
    return () => { mounted = false; };
  }, []);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // 🔔 Listen to SSE progress stream for a material
  function startProgressListener(materialId) {
    const es = new EventSource(`${API_BASE}/api/process-status/${materialId}`);

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);

        setUploads((prev) => {
          const prevEntry = prev[materialId] || {};
          const total = data.total || 0;
          const current = data.current || 0;
          const message = total > 0 ? `${current} / ${total} fragmentos procesados` : prevEntry.message || "";

          // If server reports an error, mark done and schedule removal
          if (data.error) {
            const errMsg = data.error;
            setTimeout(() => {
              setUploads((p) => {
                const copy = { ...p };
                delete copy[materialId];
                return copy;
              });
            }, 5000);
            try { es.close(); } catch (e) {}
            return {
              ...prev,
              [materialId]: {
                ...prevEntry,
                current,
                total,
                message: `❌ ${errMsg}`,
                error: errMsg,
                done: true,
                completedAt: Date.now(),
              },
            };
          }

          // If we received final progress (current >= total), treat as done
          if (total > 0 && current >= total) {
            const fileName = prevEntry.fileName || "archivo";
            setTimeout(() => {
              setUploads((p) => {
                const copy = { ...p };
                delete copy[materialId];
                return copy;
              });
            }, 5000);
            try { es.close(); } catch (e) {}
            return {
              ...prev,
              [materialId]: {
                ...prevEntry,
                current,
                total,
                message: `✅ Archivo ${fileName} procesado (${current} fragmentos).`,
                error: null,
                done: true,
                completedAt: Date.now(),
              },
            };
          }
          
          return {
            ...prev,
            [materialId]: {
              ...prevEntry,
              current,
              total,
              message,
              error: null,
            },
          };
        });
      } catch (err) {
        console.error("Invalid status event", err);
      }
    });

    es.addEventListener("done", (e) => {
      console.log("Done event received:", e.data);
      try {
        const d = JSON.parse(e.data);
        setUploads((prev) => {
          const prevEntry = prev[materialId] || {};
          const fileName = prevEntry.fileName || "archivo";
          // schedule removal after 5s
          setTimeout(() => {
            setUploads((p) => {
              const copy = { ...p };
              delete copy[materialId];
              return copy;
            });
          }, 5000);
          return {
            ...prev,
            [materialId]: {
              ...prevEntry,
              message: `✅ Archivo ${fileName} - ${d.inserted} fragmentos vectorizados exitosamente.`,
              current: d.inserted || 0,
              total: d.inserted || 0,
              done: true,
              completedAt: Date.now(),
            },
          };
        });
      } catch (err) {
        console.error("Invalid done event", err);
      }
      try { es.close(); } catch (e) {}
    });

    es.onerror = (err) => {
      try {
        if (es && typeof es.readyState !== "undefined" && es.readyState === 2) {
          return;
        }
      
        setUploads((prev) => {
          const prevEntry = prev[materialId] || {};
          if (prevEntry && prevEntry.total > 0 && prevEntry.current > 0 && !prevEntry.done) {
            const fileName = prevEntry.fileName || "archivo";
            setTimeout(() => {
              setUploads((p) => {
                const copy = { ...p };
                delete copy[materialId];
                return copy;
              });
            }, 5000);
            return {
              ...prev,
              [materialId]: {
                ...prevEntry,
                message: `✅ Archivo ${fileName} - ${prevEntry.current} fragmentos procesados.`,
                done: true,
                completedAt: Date.now(),
              },
            };
          }
          return prev;
        });
      } catch (e) {}
      try { es.close(); } catch (e) {}
    };

    return es;
  }

  // Handle file upload success (called by FileUploader)
  async function handleFileUploadSuccess(file, materialId) {
    // initialize/clear UI state for this material and start SSE listener
    setUploads((prev) => ({
      ...prev,
      [materialId]: {
        fileName: file.name,
        current: 0,
        total: 0,
        message: "Procesando archivo...",
        error: null,
      },
    }));

    // start listening for progress (server already started processing)
    startProgressListener(materialId);
  }

  // Get active uploads (still processing or recently completed)
  const activeUploads = Object.entries(uploads)
    .filter(([_, u]) => !u.done || Date.now() - (u.completedAt || 0) < 5000) // show for 5s after done
    .map(([id, u]) => ({ id, ...u }));

  return (
    <>
      <Navbar scrollBehavior="scroll" autoHide={true} />
      <div style={{ 
        padding: isMobile ? "1rem" : "2rem",
        paddingTop: isMobile ? "calc(60px + 1rem)" : "calc(60px + 1.5rem)",
        maxWidth: "1400px", 
        margin: "0 auto",
        minHeight: "calc(100vh - 64px)"
      }}>
        {/* Header Section */}
        <div style={{ marginBottom: isMobile ? "1.5rem" : "2rem" }}>
          <h1 style={{ 
            fontSize: isMobile ? "28px" : "36px", 
            marginBottom: "0.5rem", 
            color: "#2c3e50",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            Panel del Docente
          </h1>
          <p style={{ 
            margin: 0, 
            color: "#666", 
            fontSize: isMobile ? "14px" : "16px",
            lineHeight: "1.6"
          }}>
            Gestiona tus materiales y monitorea el desempeño de tus estudiantes en tiempo real
          </p>
        </div>

        {/* Upload Section */}
        <div style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          padding: isMobile ? "1.5rem" : "2rem",
          borderRadius: "16px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          marginBottom: "2rem",
          border: "1px solid #e0e0e0"
        }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ 
              margin: "0 0 0.5rem 0", 
              color: "#2c3e50", 
              fontSize: isMobile ? "20px" : "24px",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontWeight: "700"
            }}>
              Subir Material del Curso
            </h3>
            <p style={{
              margin: "0 0 1rem 0",
              color: "#666",
              fontSize: isMobile ? "13px" : "14px",
              lineHeight: "1.6"
            }}>
              Sube documentos PDF o Word para que tus estudiantes puedan consultarlos mediante el asistente virtual.
            </p>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "1rem"
            }}>
              <span style={{
                padding: "0.375rem 0.75rem",
                background: "#e3f2fd",
                color: "#1565c0",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem"
              }}>
                PDF, DOCX (Word)
              </span>
              <span style={{
                padding: "0.375rem 0.75rem",
                background: "#f3e5f5",
                color: "#7b1fa2",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem"
              }}>
                Procesamiento automático
              </span>
              <span style={{
                padding: "0.375rem 0.75rem",
                background: "#e8f5e9",
                color: "#2e7d32",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem"
              }}>
                IA integrada
              </span>
            </div>
          </div>
          <div style={{
            background: "white",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: "12px",
            border: "2px dashed #e0e0e0",
            transition: "all 0.3s ease"
          }}>
            <FileUploader onUploadSuccess={handleFileUploadSuccess} />
          </div>
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "#fff3e0",
            borderRadius: "8px",
            border: "1px solid #ffe0b2",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem"
          }}>
            <span style={{ fontSize: "18px", marginTop: "2px" }}>💡</span>
            <div style={{ flex: 1 }}>
              <p style={{ 
                margin: "0 0 0.25rem 0", 
                fontWeight: "600", 
                fontSize: isMobile ? "13px" : "14px", 
                color: "#e65100" 
              }}>
                Consejo:
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: isMobile ? "12px" : "13px", 
                color: "#ef6c00",
                lineHeight: "1.5"
              }}>
                Para mejores resultados, asegúrate de que tus documentos tengan texto legible y estén bien estructurados. Los archivos se procesarán automáticamente y estarán disponibles en minutos.
              </p>
            </div>
          </div>
        </div>

        {/* 🔹 Progress section for all active uploads */}
        {activeUploads.length > 0 && (
          <div style={{
            background: "white",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            marginBottom: "2rem"
          }}>
            <h3 style={{ 
              margin: "0 0 1rem 0", 
              color: "#2c3e50", 
              fontSize: isMobile ? "18px" : "20px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "24px" }}>⚙️</span>
              Estado de Procesamiento
            </h3>
            {activeUploads.map(({ id, current = 0, total = 0, message = "", error, done, fileName }) => (
              <div
                key={id}
                style={{
                  marginBottom: activeUploads.length > 1 ? "1rem" : "0",
                  padding: isMobile ? "0.75rem" : "1rem",
                  border: error ? "2px solid #d32f2f" : done ? "2px solid #4caf50" : "2px solid #1976d2",
                  borderRadius: "8px",
                  backgroundColor: error ? "#ffebee" : done ? "#e8f5e9" : "#e3f2fd",
                  animation: "slideIn 0.3s ease"
                }}
              >
                {/* Only show material ID while processing; hide when done */}
                {!done && (
                  <p style={{ 
                    fontWeight: "600", 
                    marginBottom: "0.5rem",
                    fontSize: isMobile ? "13px" : "14px",
                    color: "#666"
                  }}>
                    Material: {id.slice(0, 8)}...
                  </p>
                )}

                {/* Progress bar: only show if total > 0 and not done */}
                {total > 0 && !done && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "16px",
                        background: "#e0e0e0",
                        borderRadius: "8px",
                        overflow: "hidden",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
                      }}
                    >
                      <div
                        style={{
                          width: `${total > 0 ? (current / total) * 100 : 0}%`,
                          height: "16px",
                          background: error 
                            ? "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)"
                            : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
                          transition: "width 0.3s ease",
                          borderRadius: "8px"
                        }}
                      />
                    </div>
                    <p style={{
                      fontSize: "12px",
                      color: "#666",
                      margin: "0.25rem 0 0 0",
                      textAlign: "right"
                    }}>
                      {Math.round((current / total) * 100)}%
                    </p>
                  </div>
                )}

                {/* Status message */}
                <p
                  style={{
                    fontSize: done ? (isMobile ? "14px" : "15px") : (isMobile ? "13px" : "14px"),
                    color: error ? "#c62828" : done ? "#2e7d32" : "#1565c0",
                    margin: 0,
                    fontWeight: done ? "600" : "500",
                  }}
                >
                  {message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Overall message (kept for backward compat) */}
        {uploadMessage && (
          <div style={{
            padding: "1rem",
            marginBottom: "2rem",
            borderRadius: "8px",
            background: uploadMessage.startsWith("❌") ? "#ffebee" : "#e8f5e9",
            border: uploadMessage.startsWith("❌") ? "2px solid #d32f2f" : "2px solid #4caf50",
            color: uploadMessage.startsWith("❌") ? "#c62828" : "#2e7d32",
            fontWeight: "600",
            fontSize: isMobile ? "14px" : "15px"
          }}>
            {uploadMessage}
          </div>
        )}

        {/* Analytics Panel */}
        {loadingUser ? (
          <div style={{
            background: "white",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <SkeletonCard height="400px" />
          </div>
        ) : currentTeacherId ? (
          <AnalyticsPanel teacherId={currentTeacherId} />
        ) : (
          <div style={{
            background: "white",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <EmptyState
              icon="📊"
              title="No se pudo cargar la información"
              message="No pudimos identificar tu sesión. Por favor, intenta cerrar sesión y volver a iniciar."
              color="#d32f2f"
            />
          </div>
        )}

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default Dashboard;
