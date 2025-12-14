// client/src/pages/Assistant.jsx
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StudentSidebar from "../components/StudentSidebar";
import ChatBox from "../components/ChatBox";
import PracticePanel from "../components/PracticePanel";
import MockTestPanel from "../components/MockTestPanel";
import { useIsMobile } from "../hooks/useMediaQuery";

export default function Assistant() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const phaseFromUrl = searchParams.get("phase") || "assistant";

  const [activePhase, setActivePhase] = useState(phaseFromUrl);
  const [currentSession, setCurrentSession] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const phase = searchParams.get("phase") || "assistant";
    setActivePhase(phase);
  }, [searchParams]);

  function renderPhaseContent() {
    switch (activePhase) {
      case "assistant":
        return <ChatBox session={currentSession} onSessionChange={setCurrentSession} />;
      case "practice":
        return <PracticePanel session={currentSession} />;
      case "mocktest":
        return <MockTestPanel session={currentSession} />;
      default:
        return <ChatBox session={currentSession} onSessionChange={setCurrentSession} />;
    }
  }

  // Show sidebar for assistant AND practice phases
  const showSidebar = activePhase === "assistant" || activePhase === "practice";

  return (
    <>
      <Navbar />
      <div style={{ display: "flex", height: "calc(100vh - 60px)", position: "relative" }}>
        {/* Sidebar - for assistant and practice phases */}
        {showSidebar && (
          <>
            {!isSidebarCollapsed && (
              <StudentSidebar
                activePhase={activePhase}
                onSelectSession={setCurrentSession}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                currentSessionId={currentSession?.id}
              />
            )}

            {/* Toggle button - always visible when sidebar is collapsed */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                style={{
                  position: "fixed",
                  top: isMobile ? "12px" : "95px", // Just below navbar
                  right: isMobile ? "50px" : "50px", // Top-right
                  width: isMobile ? "40px" : "48px",
                  height: isMobile ? "40px" : "48px",
                  borderRadius: "50%", // Circle button
                  background: "linear-gradient(135deg, #95abb4f1 0%, #43606bf1 100%)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                  fontSize: isMobile ? "24px" : "20px",
                  cursor: "pointer",
                  zIndex: isMobile ? 1000 : 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateX(-2px) scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateX(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
                  }
                }}
                title="Mostrar historial"
              >
                →
              </button>
            )}
          </>
        )}

        {/* Main Content */}
        <div style={{ 
          flex: 1, 
          marginLeft: showSidebar && !isSidebarCollapsed ? "280px" : "0",
          transition: "margin-left 0.3s ease",
          overflow: "hidden"
        }}>
          {renderPhaseContent()}
        </div>
      </div>
    </>
  );
}