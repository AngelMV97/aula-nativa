// client/src/components/LoadingSkeleton.jsx
export function SkeletonCard({ height = "200px", width = "100%" }) {
  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "12px",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonText({ width = "100%", height = "16px" }) {
  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "4px",
      }}
    />
  );
}

export function SkeletonCircle({ size = "40px" }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "50%",
      }}
    />
  );
}

export function SkeletonList({ count = 3, gap = "1rem" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height="100px" />
      ))}
    </div>
  );
}
