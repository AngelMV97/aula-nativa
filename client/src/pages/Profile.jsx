import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const isMobile = useIsMobile();

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'student') {
        const { data: studentData, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        setStudent({ ...studentData, email: user.email });
      }
    } catch (e) {
      console.error('Error loading profile:', e);
      showToast('Error al cargar tu perfil', 'error');
    } finally {
      setLoading(false);
    }
  }

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
              borderTopColor: '#1976D2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#666', fontSize: '16px' }}>Cargando tu perfil...</p>
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
      <div style={{ 
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: isMobile ? '1.5rem 1rem' : '3rem 2rem',
        paddingTop: isMobile ? 'calc(60px + 1rem)' : 'calc(60px + 1.5rem)',
        position: 'relative',
        overflow: 'hidden'
      }}>
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
          maxWidth: '900px', 
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header with Character */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '1.5rem',
            marginBottom: '2rem',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <h1 style={{ 
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: '700',
                color: 'white',
                marginBottom: '0.5rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)'
              }}>
                Mi Perfil
              </h1>
              <p style={{
                fontSize: isMobile ? '14px' : '16px',
                color: 'rgba(255,255,255,0.9)',
                margin: 0
              }}>
                Información de tu cuenta estudiantil
              </p>
            </div>
            
            {!isMobile && (
              <img 
                src="/image/characters/teen/Luna-Icon.png" 
                alt="Luna"
                style={{
                  width: '100px',
                  height: 'auto',
                  animation: 'float 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }}
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
          </div>
        
          {student && (
            <div style={{
              background: 'white',
              padding: isMobile ? '2rem 1.5rem' : '3rem 2.5rem',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              animation: 'slideUp 0.6s ease-out'
            }}>
              {/* Profile Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                marginBottom: '2.5rem',
                paddingBottom: '2rem',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <div style={{
                  width: isMobile ? '70px' : '90px',
                  height: isMobile ? '70px' : '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '35px' : '45px',
                  fontWeight: '500',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}>
                  {student.name.charAt(0).toUpperCase()}
                  {/* <img
                    src="/image/icons/profile-photo.svg"
                    alt="Usuario"
                    style={{ width: 50, background: "transparent",  color: "#1976d2"}}
                  /> */}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ 
                    fontSize: isMobile ? '22px' : '28px', 
                    fontWeight: '700', 
                    color: '#2c3e50',
                    marginBottom: '0.25rem'
                  }}>
                    {student.name}
                  </h2>
                  <p style={{
                    fontSize: isMobile ? '13px' : '15px',
                    color: '#7f8c8d',
                    margin: 0
                  }}>
                    Estudiante • Grado {student.grade}° - {student.section}
                  </p>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                gap: isMobile ? '1.5rem' : '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px solid #e9ecef'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    color: '#6c757d', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📧 Correo Electrónico
                  </label>
                  <div style={{ 
                    fontSize: isMobile ? '14px' : '16px', 
                    color: '#2c3e50',
                    fontWeight: '500',
                    wordBreak: 'break-word'
                  }}>
                    {student.email}
                  </div>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  border: '2px solid #e9ecef'
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    color: '#6c757d', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📚 Información Académica
                  </label>
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    marginTop: '0.5rem'
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#1976D2'
                      }}>
                        {student.grade}°
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Grado</div>
                    </div>
                    <div style={{
                      width: '2px',
                      background: '#e9ecef'
                    }} />
                    <div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700', 
                        color: '#1976D2'
                      }}>
                        {student.section}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Curso</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Code Display */}
              <div style={{
                padding: isMobile ? '1.5rem' : '2rem',
                background: student.student_code 
                  ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' 
                  : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                borderRadius: '16px',
                border: `3px solid ${student.student_code ? '#4caf50' : '#FF6B35'}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: student.student_code ? '#4caf50' : '#FF6B35',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px'
                  }}>
                    {student.student_code ? '✓' : '📋'}
                  </div>
                  <label style={{ 
                    fontSize: isMobile ? '15px' : '16px', 
                    color: '#2c3e50', 
                    fontWeight: '700',
                    flex: 1
                  }}>
                    Código de Estudiante
                  </label>
                </div>
                {student.student_code ? (
                  <div style={{ 
                    fontSize: isMobile ? '28px' : '32px', 
                    fontWeight: '700', 
                    color: '#2e7d32',
                    fontFamily: 'monospace',
                    letterSpacing: '3px',
                    textAlign: 'center',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '12px',
                    border: '2px dashed #4caf50'
                  }}>
                    {student.student_code}
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    color: '#5d4037', 
                    lineHeight: '1.6',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: '12px'
                  }}>
                    Tu código será asignado automáticamente cuando tu profesor suba la primera lista de calificaciones.
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '2rem',
                padding: isMobile ? '1.25rem' : '1.5rem',
                background: '#e3f2fd',
                borderRadius: '12px',
                border: '2px solid #90caf9',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  💡
                </div>
                <div>
                  <strong style={{ color: '#1565C0', fontSize: isMobile ? '14px' : '15px' }}>
                    ¿Qué es el código de estudiante?
                  </strong>
                  <p style={{ 
                    fontSize: isMobile ? '13px' : '14px', 
                    color: '#1976D2',
                    margin: '0.5rem 0 0 0',
                    lineHeight: '1.6'
                  }}>
                    Es un identificador único que vincula tus calificaciones con tu cuenta. 
                    Tu profesor lo asigna automáticamente al subir las listas de notas.
                  </p>
                </div>
              </div>
            </div>
          )}
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
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </>
  );
}