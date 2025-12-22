// client/src/components/PracticeComponents.jsx
import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/useMediaQuery";

/**
 * Circular Progress Indicator for Practice Phase
 */
export function CircularProgress({ current, total, size = 80, strokeWidth = 8, color = "#1976D2" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = total > 0 ? (current / total) : 0;
  const offset = circumference - (progress * circumference);

  return (
    <div style={{ 
      position: "relative", 
      width: size, 
      height: size,
      display: "inline-block"
    }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        fontWeight: "700",
        color: color
      }}>
        <div>{current}</div>
        <div style={{ fontSize: "12px", fontWeight: "400", color: "#666" }}>de {total}</div>
      </div>
    </div>
  );
}

/**
 * Thought Bubble Component for Exercise Statement
 * Collapses on mobile after a few seconds, expands on tap
 */
export function ThoughtBubble({ 
  content, 
  characterColor = "#1976D2",
  autoCollapse = true,
  collapseDelay = 5000 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasCollapsed, setHasCollapsed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!autoCollapse || !isMobile) return;

    const timer = setTimeout(() => {
      setIsExpanded(false);
      setHasCollapsed(true);
    }, collapseDelay);

    return () => clearTimeout(timer);
  }, [autoCollapse, collapseDelay, isMobile]);

  const handleToggle = () => {
    if (isMobile && hasCollapsed) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div 
      onClick={handleToggle}
      style={{
        position: "relative",
        cursor: (isMobile && hasCollapsed) ? "pointer" : "default",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {/* Collapsed state - small bubble */}
      {!isExpanded && hasCollapsed && (
        <div style={{
          background: "white",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: `3px solid ${characterColor}`,
          fontSize: "28px",
          animation: "pulse 2s infinite"
        }}>
          💭
        </div>
      )}

      {/* Expanded state - full content */}
      {isExpanded && (
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.25rem 1.5rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          border: `2px solid ${characterColor}20`,
          borderLeft: `5px solid ${characterColor}`,
          position: "relative",
          animation: "fadeIn 0.3s ease"
        }}>
          {/* Bubble tail */}
          <div style={{
            position: "absolute",
            left: "-12px",
            top: "20px",
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderRight: `12px solid ${characterColor}20`
          }}></div>

          {/* Content */}
          <div style={{
            fontSize: "15px",
            lineHeight: "1.6",
            color: "#2c3e50"
          }}>
            {content}
          </div>

          {/* Tap hint on mobile */}
          {isMobile && (
            <div style={{
              marginTop: "0.75rem",
              fontSize: "12px",
              color: "#7f8c8d",
              fontStyle: "italic",
              textAlign: "right"
            }}>
              Toca para minimizar
            </div>
          )}
        </div>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes fadeIn {
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
  );
}

/**
 * Character Display Component
 * Shows the character prominently in practice mode
 */
export function CharacterDisplay({ character, size = "large" }) {
  const isMobile = useIsMobile();
  
  const sizeMap = {
    small: isMobile ? "80px" : "100px",
    medium: isMobile ? "120px" : "150px",
    large: isMobile ? "150px" : "200px"
  };

  const actualSize = sizeMap[size] || sizeMap.medium;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.75rem"
    }}>
      {/* Character Image with glow effect */}
      <div style={{
        width: actualSize,
        height: actualSize,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${character.color}15 0%, ${character.color}05 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 8px 32px ${character.color}40`,
        position: "relative",
        animation: "float 3s ease-in-out infinite"
      }}>
        <img 
          src={character.icon}
          alt={character.name}
          style={{
            width: "120%",
            height: "120%",
            objectFit: "contain"
          }}
          onError={(e) => e.target.style.display = 'none'}
        />
      </div>

      {/* Character name badge */}
      <div style={{
        background: character.color,
        color: "white",
        padding: "0.5rem 1.25rem",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: "600",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        {character.name}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
