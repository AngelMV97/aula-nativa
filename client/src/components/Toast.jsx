// client/src/components/Toast.jsx
export default function Toast({ show, message, type = 'info', onClose }) {
  const colors = {
    success: { bg: '#10b981', icon: '✅' },
    error: { bg: '#ef4444', icon: '❌' },
    info: { bg: '#3b82f6', icon: 'ℹ️' },
    warning: { bg: '#f59e0b', icon: '⚠️' }
  };

  const color = colors[type] || colors.info;

  // Don't render if show is false
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      minWidth: '300px',
      maxWidth: '400px',
      background: 'white',
      borderLeft: `4px solid ${color.bg}`,
      borderRadius: '8px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: 10000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span style={{ fontSize: '20px' }}>{color.icon}</span>
      <span style={{ flex: 1, fontSize: '14px', color: '#2c3e50' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: '#999',
          padding: '0',
          lineHeight: 1
        }}
      >
        ×
      </button>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}