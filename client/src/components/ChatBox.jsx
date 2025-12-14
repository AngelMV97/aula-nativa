// client/src/components/ChatBox.jsx
import { useState, useEffect, useRef } from "react";
import { logEvent } from "../utils/analyticsClient";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Character assignment based on subject (Brand Identity Guide)
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
    if (supabase.auth && typeof supabase.auth.getSession === "function") {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("getSession error:", error);
        return {};
      }
      const token = data?.session?.access_token;
      if (token && token.length > 20) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (e) {
    console.warn("getAuthHeader:", e);
  }
  return {};
}

function ChatBox({ session, onSessionChange }) {
  const [messages, setMessages] = useState([
    { sender: "assistant", text: "¡Hola! Soy tu asistente. ¿En qué tema necesitas ayuda?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(session?.id || null);
  const messagesEndRef = useRef(null);
  const isMobile = useIsMobile();

  const character = getCharacterForSubject(session?.subject);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when session changes
  useEffect(() => {
    if (session?.id) {
      loadSessionMessages(session.id);
      setCurrentSessionId(session.id);
    } else {
      // Reset to default welcome message if no session
      setMessages([
        { sender: "assistant", text: "¡Hola! Soy tu asistente. ¿En qué tema necesitas ayuda?" },
      ]);
      setCurrentSessionId(null);
    }
  }, [session?.id]);

  async function loadSessionMessages(sessionId) {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedMessages = data.map(msg => ({
          sender: msg.sender,
          text: msg.message_text,
          meta: msg.metadata
        }));
        setMessages(loadedMessages);
      } else {
        // No messages yet, start with welcome message
        setMessages([
          { sender: "assistant", text: "¡Hola! Soy tu asistente. ¿En qué tema necesitas ayuda?" },
        ]);
      }
    } catch (e) {
      console.error("Error loading session messages:", e);
      setMessages([
        { sender: "assistant", text: "¡Hola! Soy tu asistente. ¿En qué tema necesitas ayuda?" },
      ]);
    }
  }

  async function saveMessageToSession(sender, text, metadata = null) {
    if (!currentSessionId) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          session_id: currentSessionId,
          sender,
          message_text: text,
          metadata
        });

      if (error) throw error;

      // Update session's updated_at timestamp
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentSessionId);

    } catch (e) {
      console.error("Error saving message:", e);
    }
  }

  function pushMessage(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  async function callAssistant(question) {
    setLoading(true);
    const userMessage = { sender: "student", text: question };
    pushMessage(userMessage);
    
    // Save user message
    await saveMessageToSession("student", question);

    // attempt client-side log (best-effort)
    try {
      const { data } = await supabase.auth.getSession();
      const studentId = data?.session?.user?.id || null;
      logEvent({
        studentId,
        teacherId: null,
        materialId: null,
        actionType: "assistant_query_sent",
        metadata: { question, session_id: currentSessionId, subject: session?.subject },
      });
    } catch (e) {}

    try {
      const headers = { "Content-Type": "application/json", ...(await getAuthHeader()) };

      // Include session subject in the query for better context
      const requestBody = { 
        question,
        subject: session?.subject
      };

      const resp = await fetch(`${API_BASE}/api/assistant/query`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        const errorMsg = { sender: "assistant", text: "Lo siento, no pude procesar tu pregunta. " + txt };
        pushMessage(errorMsg);
        await saveMessageToSession("assistant", errorMsg.text);
        setLoading(false);
        return;
      }

      const json = await resp.json();
      const answer = json.answer || "No tengo una respuesta ahora.";
      const suggestions = json.suggestions || [];

      const assistantMessage = { sender: "assistant", text: answer, meta: { suggestions } };
      pushMessage(assistantMessage);
      
      // Save assistant message
      await saveMessageToSession("assistant", answer, { suggestions, sources: json.sources });

      // client log (best-effort)
      try {
        const { data } = await supabase.auth.getSession();
        const studentId = data?.session?.user?.id || null;
        await logEvent({
          studentId,
          teacherId: null,
          materialId: json.sources?.[0]?.material_id || null,
          actionType: "assistant_query_received",
          metadata: { 
            question, 
            suggestions_count: suggestions.length,
            session_id: currentSessionId,
            subject: session?.subject
          },
        });
      } catch (e) {}
    } catch (err) {
      console.error("assistant call failed:", err);
      const errorMsg = { sender: "assistant", text: "Error al contactar al asistente. Intenta nuevamente." };
      pushMessage(errorMsg);
      await saveMessageToSession("assistant", errorMsg.text);
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    await callAssistant(q);
  };

  const handleSuggestionClick = async (suggestion) => {
    pushMessage({ sender: "student", text: suggestion });
    await callAssistant(suggestion);
    try {
      const { data } = await supabase.auth.getSession();
      const studentId = data?.session?.user?.id || null;
      await logEvent({
        studentId,
        teacherId: null,
        materialId: null,
        actionType: "assistant_suggestion_click",
        metadata: { suggestion, session_id: currentSessionId },
      });
    } catch (e) {}
  };

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
          padding: isMobile ? "0.75rem" : "1rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          {/* Character Icon */}
          <div style={{
            width: isMobile ? "50px" : "60px",
            height: isMobile ? "50px" : "60px",
            borderRadius: "50%",
            // background: `linear-gradient(135deg, ${character.color}, ${character.color}dd)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // boxShadow: `0 4px 12px ${character.color}40`
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

          {/* Session Info */}
          <div style={{ flex: 1 }}>
            {session ? (
              <>
                <h2 style={{
                  margin: 0,
                  fontSize: isMobile ? "18px" : "22px",
                  fontWeight: "700",
                  color: "#2c3e50"
                }}>
                  {session.subject || session.title}
                </h2>
                <p style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: isMobile ? "13px" : "14px",
                  color: "#7f8c8d"
                }}>
                  Asistente: {character.name}
                </p>
              </>
            ) : (
              <>
                <h2 style={{
                  margin: 0,
                  fontSize: isMobile ? "18px" : "22px",
                  fontWeight: "700",
                  color: "#2c3e50"
                }}>
                  Asistente Virtual
                </h2>
                <p style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: isMobile ? "13px" : "14px",
                  color: "#7f8c8d"
                }}>
                  Crea una conversación para comenzar
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container - SCROLLABLE */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: isMobile ? "0.5rem 0.7rem" : "2rem 1rem"
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto"
        }}>
          {messages.map((msg, index) => (
            <div 
              key={index} 
              style={{ 
                margin: "1rem 0", 
                display: "flex",
                justifyContent: msg.sender === "student" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: "0.75rem"
              }}
            >
              {/* Assistant Avatar */}
              {msg.sender === "assistant" && (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: `${character.color}20`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  <img 
                    src={character.icon}
                    alt={character.name}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "contain",
                      top: "12px",
                      position: "relative"
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}

              {/* Message Bubble */}
              <div style={{
                maxWidth: isMobile ? "85%" : "70%",
                padding: "1rem 1.25rem",
                borderRadius: msg.sender === "student" 
                  ? "18px 18px 4px 18px" 
                  : "18px 18px 18px 4px",
                background: msg.sender === "student" 
                  ? "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)"
                  : "white",
                color: msg.sender === "student" ? "white" : "#2c3e50",
                boxShadow: msg.sender === "student"
                  ? "0 4px 12px rgba(25, 118, 210, 0.3)"
                  : "0 2px 8px rgba(0,0,0,0.1)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: "1.6"
              }}>
                {msg.text}

                {/* Suggestions */}
                {msg.sender === "assistant" && msg.meta?.suggestions?.length > 0 && (
                  <div style={{ 
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #e0e0e0"
                  }}>
                    <div style={{
                      fontSize: "12px",
                      color: "#7f8c8d",
                      marginBottom: "0.5rem",
                      fontWeight: "600"
                    }}>
                      Preguntas sugeridas:
                    </div>
                    {msg.meta.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        style={{
                          marginRight: "0.5rem",
                          marginTop: "0.5rem",
                          background: character.color,
                          color: "white",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: "20px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                          transition: "all 0.3s ease",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = "translateY(-2px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Avatar */}
              {msg.sender === "student" && (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px"
                }}>
                  👤
                </div>
              )}
            </div>
          ))}
          
          {/* Loading indicator */}
          {loading && (
            <div style={{ 
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              margin: "1rem 0"
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `${character.color}20`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <img 
                  src={character.icon}
                  alt={character.name}
                  style={{
                    width: "28px",
                    height: "28px",
                    objectFit: "contain"
                  }}
                />
              </div>
              <div style={{
                padding: "1rem 1.25rem",
                borderRadius: "18px 18px 18px 4px",
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <div style={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "center"
                }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: character.color,
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: "0s"
                  }} />
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: character.color,
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: "0.16s"
                  }} />
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: character.color,
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: "0.32s"
                  }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - FIXED AT BOTTOM */}
      <div style={{
        background: "white",
        borderTop: "1px solid #e0e0e0",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        flexShrink: 0
      }}>
        <div style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: isMobile ? "1rem" : "1.5rem 2rem"
        }}>
          <form onSubmit={handleSend} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              value={input}
              placeholder={currentSessionId ? "Escribe tu pregunta..." : "Crea una conversación para comenzar"}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !currentSessionId}
              style={{
                flex: 1,
                padding: isMobile ? "0.75rem 1rem" : "1rem 1.25rem",
                borderRadius: "24px",
                border: "2px solid #e0e0e0",
                fontSize: "15px",
                outline: "none",
                transition: "all 0.3s ease",
                background: (!currentSessionId || loading) ? "#f5f5f5" : "white"
              }}
              onFocus={(e) => e.target.style.borderColor = character.color}
              onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
            />
            <button 
              type="submit" 
              disabled={loading || !currentSessionId || !input.trim()}
              style={{
                padding: isMobile ? "0.75rem 1.5rem" : "1rem 2rem",
                background: (loading || !currentSessionId || !input.trim())
                  ? "#ccc"
                  : `linear-gradient(135deg, ${character.color}, ${character.color}dd)`,
                color: "white",
                border: "none",
                borderRadius: "24px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: (loading || !currentSessionId || !input.trim()) ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: (loading || !currentSessionId || !input.trim())
                  ? "none"
                  : `0 4px 12px ${character.color}40`,
                minWidth: isMobile ? "80px" : "100px"
              }}
              onMouseEnter={(e) => {
                if (!loading && currentSessionId && input.trim()) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = `0 6px 16px ${character.color}60`;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = `0 4px 12px ${character.color}40`;
              }}
            >
              {loading ? "..." : "Enviar"}
            </button>
          </form>
          
          {!currentSessionId && (
            <div style={{ 
              marginTop: "0.75rem", 
              fontSize: "13px", 
              color: "#7f8c8d", 
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}>
              <span>ℹ️</span>
              <span>Crea una nueva conversación desde el menú lateral para comenzar</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default ChatBox;