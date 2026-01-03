// client/src/components/StudentSidebar.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Modal from "./Modal";

export default function StudentSidebar({ 
  activePhase, 
  onSelectSession, 
  isCollapsed, 
  setIsCollapsed,
  currentSessionId 
}) {
  const [sessions, setSessions] = useState([]);
  const [userGrade, setUserGrade] = useState(null);
  const [userId, setUserId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, session: null });
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId) {
      loadSessions();
    }
  }, [activePhase, userId]);

  async function loadUserData() {
    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;
    if (uid) {
      setUserId(uid);
      const { data: student } = await supabase
        .from("students")
        .select("grade")
        .eq("user_id", uid)
        .single();
      setUserGrade(student?.grade || null);
    }
  }

  async function loadSessions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("student_id", userId)
        .eq("phase", activePhase)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (e) {
      console.error("Error loading sessions:", e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function createNewSession() {
    if (!userId) return;

    const titles = {
      assistant: "Nuevo Chat",
      practice: "Nueva Práctica",
      mocktest: "Nuevo Simulacro"
    };

    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          student_id: userId,
          phase: activePhase,
          title: titles[activePhase],
          subject: null
        })
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      onSelectSession(data);
    } catch (e) {
      console.error("Error creating session:", e);
      alert("Error al crear nueva conversación");
    }
  }

  function handleContextMenu(e, session) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, session });
  }

  function handleRename(session) {
    setEditingId(session.id);
    setEditTitle(session.title);
    setContextMenu(null);
  }

  async function saveRename(sessionId) {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title: editTitle })
        .eq("id", sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: editTitle } : s
      ));
      setEditingId(null);
    } catch (e) {
      console.error("Error renaming session:", e);
      alert("Error al renombrar");
    }
  }

  function handleDeleteClick(session) {
    setDeleteModal({ isOpen: true, session });
    setContextMenu(null);
  }

  async function confirmDelete() {
    const { session } = deleteModal;
    if (!session) return;

    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", session.id);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== session.id));
      
      // If deleted session was active, clear selection
      if (currentSessionId === session.id) {
        onSelectSession(null);
      }

      setDeleteModal({ isOpen: false, session: null });
    } catch (e) {
      console.error("Error deleting session:", e);
      alert("❌ Error al eliminar la sesión. Por favor intenta nuevamente.");
    }
  }

  async function handleSetSubject(sessionId, subject) {
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ subject })
        .eq("id", sessionId);

      if (error) throw error;

      // Update local sessions state
      const updatedSession = sessions.find(s => s.id === sessionId);
      if (updatedSession) {
        updatedSession.subject = subject;
        setSessions(prev => prev.map(s => 
          s.id === sessionId ? { ...s, subject } : s
        ));
        
        // If this is the current session, update it in parent component
        if (currentSessionId === sessionId) {
          onSelectSession({ ...updatedSession, subject });
        }
      }
      
      setContextMenu(null);
    } catch (e) {
      console.error("Error setting subject:", e);
      alert("Error al asignar materia");
    }
  }

  const phaseLabels = {
    assistant: "Asistente",
    practice: "Práctica",
    mocktest: "Simulacro"
  };

  const SUBJECTS = [
    "Matemáticas",
    "Ciencias Naturales",
    "Ciencias Sociales",
    "Lengua Castellana",
    "Inglés",
    "Tecnología e Informática",
    "Educación Física",
    "Educación Artística",
    "Educación Ética y Valores",
    "Educación Religiosa",
    "Química",
    "Física",
    "Filosofía"
  ];

  // Build modal message
  const getDeleteModalMessage = () => {
    const session = deleteModal.session;
    if (!session) return null;

    const phaseText = {
      'assistant': 'Conversación',
      'practice': 'Práctica',
      'mocktest': 'Simulacro'
    }[session.phase] || 'Sesión';

    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>📋 Título:</strong> {session.title}
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <strong>📚 Tipo:</strong> {phaseText}
        </div>
        {session.subject && (
          <div style={{ marginBottom: '1rem' }}>
            <strong>📖 Asignatura:</strong> {session.subject}
          </div>
        )}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          background: '#fff3cd', 
          borderRadius: '8px',
          borderLeft: '4px solid #ffc107'
        }}>
          <strong>⚠️ Esta acción no se puede deshacer.</strong>
          <div style={{ marginTop: '0.5rem', fontSize: '14px' }}>
            Se perderán todos los mensajes, respuestas y progreso de esta sesión.
          </div>
        </div>
      </div>
    );
  };

  if (isCollapsed) {
    return null;
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        onClick={() => setIsCollapsed(true)}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 98,
          display: window.innerWidth < 768 ? "block" : "none"
        }}
      />

      <div
        style={{
          width: "280px",
          height: "calc(100vh - 60px)",
          background: "#f5f5f5",
          borderRight: "1px solid #ddd",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          left: 0,
          top: "60px",
          zIndex: 99
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1rem",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "white"
        }}>
          <h3 style={{ margin: 0, fontSize: "18px" }}>
            {phaseLabels[activePhase]}
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            style={{
              padding: "4px 8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "18px"
            }}
            title="Colapsar"
          >
            ◀
          </button>
        </div>

        {/* New Session Button */}
        <div style={{ padding: "1rem" }}>
          <button
            onClick={createNewSession}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "2px dashed #1976d2",
              background: "white",
              color: "#1976d2",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            + Nuevo {phaseLabels[activePhase]}
          </button>
        </div>

        {/* Sessions List */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "0 1rem 1rem 1rem" 
        }}>
          {loading && <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>Cargando...</div>}
          
          {!loading && sessions.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#666", fontSize: "14px" }}>
              No hay conversaciones aún. Crea una nueva para comenzar.
            </div>
          )}

          {!loading && sessions.map(session => (
            <div
              key={session.id}
              onContextMenu={(e) => handleContextMenu(e, session)}
              onClick={() => onSelectSession(session)}
              style={{
                padding: "12px",
                background: currentSessionId === session.id ? "#e3f2fd" : "white",
                borderRadius: "8px",
                marginBottom: "0.5rem",
                cursor: "pointer",
                border: currentSessionId === session.id ? "2px solid #1976d2" : "1px solid #e0e0e0",
                position: "relative"
              }}
            >
              {editingId === session.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(session.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={{
                    width: "100%",
                    padding: "4px",
                    border: "1px solid #1976d2",
                    borderRadius: "4px",
                    fontSize: "14px"
                  }}
                />
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, session);
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "18px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      color: "#666",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#f0f0f0";
                      e.target.style.color = "#333";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                      e.target.style.color = "#666";
                    }}
                    title="Opciones"
                  >
                    ⋮
                  </button>
                  <div style={{ 
                    fontWeight: currentSessionId === session.id ? "600" : "500",
                    fontSize: "14px",
                    marginBottom: "4px",
                    paddingRight: "24px"
                  }}>
                    {session.title}
                  </div>
                  {session.subject && (
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      📚 {session.subject}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#999", marginTop: "4px" }}>
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            onClick={() => {
              setContextMenu(null);
              setShowSubjectMenu(false);
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 1000,
              minWidth: "200px"
            }}
          >
            <button
              onClick={() => handleRename(contextMenu.session)}
              style={{
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "14px",
                borderBottom: "1px solid #eee"
              }}
            >
              ✏️ Renombrar
            </button>
            
            {/* Subject submenu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubjectMenu(!showSubjectMenu);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  borderBottom: "1px solid #eee"
                }}
              >
                📚 Asignar materia →
              </button>
              {showSubjectMenu && (
              <div style={{
                position: window.innerWidth < 768 ? "fixed" : "absolute",
                left: window.innerWidth < 768 ? "50%" : "100%",
                top: window.innerWidth < 768 ? "50%" : 0,
                transform: window.innerWidth < 768 ? "translate(-50%, -50%)" : "none",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                maxHeight: window.innerWidth < 768 ? "70vh" : "300px",
                overflowY: "auto",
                minWidth: window.innerWidth < 768 ? "250px" : "180px",
                maxWidth: window.innerWidth < 768 ? "90vw" : "none",
                zIndex: 1001
              }}>
                {SUBJECTS.map(subj => (
                  <button
                    key={subj}
                    onClick={() => {
                      handleSetSubject(contextMenu.session.id, subj);
                      setShowSubjectMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      background: contextMenu.session.subject === subj ? "#e3f2fd" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "13px",
                      borderBottom: "1px solid #f0f0f0"
                    }}
                  >
                    {subj}
                  </button>
                ))}
              </div>
              )}
            </div>

            <button
              onClick={() => handleDeleteClick(contextMenu.session)}
              style={{
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "14px",
                color: "#d32f2f"
              }}
            >
              🗑️ Eliminar
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, session: null })}
        onConfirm={confirmDelete}
        title="¿Eliminar esta sesión?"
        message={getDeleteModalMessage()}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="confirm"
      />
    </>
  );
}