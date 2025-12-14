// client/src/components/Modal.jsx
import { useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Modal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "confirm" // "confirm" or "alert"
}) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: isMobile ? '1rem' : '2rem',
        backdropFilter: 'blur(4px)'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '1.5rem' : '2rem',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h3 id="modal-title" style={{
            margin: 0,
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{
          padding: isMobile ? '1.5rem' : '2rem',
          fontSize: isMobile ? '15px' : '16px',
          lineHeight: '1.6',
          color: '#555'
        }}>
          {message}
        </div>

        {/* Actions */}
        <div style={{
          padding: isMobile ? '1rem 1.5rem 1.5rem' : '1rem 2rem 2rem',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          {type === 'confirm' && (
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '2px solid #ddd',
                background: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                color: '#666',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#999';
                e.target.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#ddd';
                e.target.style.color = '#666';
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            autoFocus
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'linear-gradient(135deg, #1976D2, #1565C0)',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
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
