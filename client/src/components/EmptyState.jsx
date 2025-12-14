// client/src/components/EmptyState.jsx
import { useIsMobile } from '../hooks/useMediaQuery';

export default function EmptyState({ 
  icon = "📭", 
  title = "No hay datos", 
  message = "No se encontró información para mostrar.",
  actionText,
  onAction,
  color = "#1976D2"
}) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        padding: isMobile ? "3rem 1.5rem" : "4rem 2rem",
        textAlign: "center",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: `2px solid ${color}20`
      }}
    >
      <div style={{ fontSize: isMobile ? "64px" : "80px", marginBottom: "1rem" }}>
        {icon}
      </div>
      <h3
        style={{
          margin: "0 0 0.75rem 0",
          fontSize: isMobile ? "20px" : "24px",
          fontWeight: "600",
          color: "#2c3e50",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: "0 0 2rem 0",
          fontSize: isMobile ? "14px" : "16px",
          color: "#7f8c8d",
          lineHeight: "1.6",
          maxWidth: "500px",
          marginLeft: "auto",
          marginRight: "auto"
        }}
      >
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: "12px 28px",
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: `0 4px 12px ${color}40`,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = `0 6px 16px ${color}50`;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = `0 4px 12px ${color}40`;
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
