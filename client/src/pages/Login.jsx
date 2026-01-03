import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Toast from '../components/Toast';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [mode, setMode] = useState('login');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedParentalConsent, setAcceptedParentalConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  // Translate Supabase errors to Spanish
  const translateError = (errorMessage) => {
    const translations = {
      'User already registered': '❌ Este correo ya está registrado',
      'Invalid login credentials': '❌ Credenciales inválidas. Verifica tu correo y contraseña',
      'Email not confirmed': '❌ Por favor confirma tu correo antes de iniciar sesión',
      'Invalid email': '❌ Correo electrónico inválido',
      'Password should be at least 6 characters': '❌ La contraseña debe tener al menos 6 caracteres',
      'Unable to validate email address: invalid format': '❌ Formato de correo inválido',
      'Email rate limit exceeded': '❌ Demasiados intentos. Espera unos minutos e intenta de nuevo',
      'Network request failed': '❌ Error de conexión. Verifica tu internet',
    };

    // Check if error message contains any of the keys
    for (const [key, value] of Object.entries(translations)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    // Default message if no translation found
    return `❌ ${errorMessage}`;
  };

  // Check if form is valid for button enabling
  const isFormValid = () => {
    if (mode === 'login') {
      return email.trim() && password.length >= 6;
    } else {
      // Signup validation
      const baseValid = email.trim() && password.length >= 6 && name.trim();
      
      if (role === 'student') {
        return baseValid && grade && section.trim() && acceptedPrivacy && acceptedParentalConsent;
      } else {
        return baseValid && acceptedPrivacy;
      }
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);    

    try {
      if (mode === 'signup') {
        // Validations
        if (role === 'student' && (!grade || !section || !name)) {
          showToast('Los estudiantes deben completar: nombre, grado y curso', 'error');
          return;
        }
        if (role === 'teacher' && !name) {
          showToast('Por favor ingresa tu nombre', 'error');
          return;
        }
        if (!acceptedPrivacy) {
          showToast('Debes aceptar la política de privacidad', 'error');
          return;
        }
        if (role === 'student' && !acceptedParentalConsent) {
          showToast('Se requiere consentimiento de los padres/tutores', 'error');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              role, 
              name: name.trim(),
              grade: role === 'student' ? parseInt(grade) : null,
              section: role === 'student' ? section.toUpperCase() : null
            }
          }
        });

        if (error) throw error;

        // Create student record
        if (role === 'student' && data.user) {
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', data.user.id)
            .single();
          
          if (!existingStudent) {
            await supabase.from('students').insert({
              user_id: data.user.id,
              name: name.trim(),
              grade: parseInt(grade),
              section: section.toUpperCase()
            });
          }
        }
        
        showToast('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.', 'success');
        setTimeout(() => setMode('login'), 2000);

      } else {
        // Login
        setLoginError('');

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          // Set inline error message instead of toast
          setLoginError('Credenciales incorrectas. Verifica tu correo y contraseña.');
          throw error;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) throw new Error('No se pudo obtener el rol del usuario.');

        const userRole = profile?.role;
        if (userRole === 'teacher') {
          navigate('/dashboard');
        } else if (userRole === 'student') {
          navigate('/home');
        } else {
          throw new Error('No se detectó un rol válido.');
        }
      }
    } catch (error) {
      showToast(translateError(error.message || 'Ocurrió un error inesperado'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    },
    decorativeCircle: {
      position: 'absolute',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
    },
    card: {
      background: 'white',
      borderRadius: '24px',
      padding: '2.5rem 2rem',
      maxWidth: '440px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      position: 'relative',
      zIndex: 1
    },
    logo: {
      width: '180px',
      height: 'auto',
      display: 'block',
      margin: '0 auto 1.5rem'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#2c3e50',
      textAlign: 'center',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '14px',
      color: '#7f8c8d',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    inputGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      outline: 'none',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit'
    },
    radioGroup: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.25rem'
    },
    radioLabel: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      fontWeight: '500'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      marginBottom: '1rem',
      fontSize: '13px',
      color: '#555',
      lineHeight: '1.5'
    },
    button: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      fontWeight: '600',
      color: 'white',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    switchMode: {
      textAlign: 'center',
      marginTop: '1.5rem',
      fontSize: '14px',
      color: '#7f8c8d'
    },
    link: {
      color: '#667eea',
      fontWeight: '600',
      cursor: 'pointer',
      textDecoration: 'none'
    },
    character: {
      position: 'absolute',
      bottom: '-20px',
      right: '-20px',
      width: '120px',
      height: 'auto',
      opacity: 0.9
    }
  };

  return (
    <>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: '', type: '' })} />}
      
      <div style={styles.container}>
        {/* Decorative circles */}
        <div style={{...styles.decorativeCircle, width: '300px', height: '300px', top: '-150px', left: '-150px'}} />
        <div style={{...styles.decorativeCircle, width: '200px', height: '200px', bottom: '-100px', right: '-100px'}} />
        
        <div style={styles.card}>
          {/* Logo */}
          <img 
            src="/image/logos/MainLogo.png" 
            alt="Aula Nativa" 
            style={styles.logo}
            onError={(e) => e.target.style.display = 'none'}
          />
          
          <h1 style={styles.title}>
            {mode === 'signup' ? '¡Únete a Aula Nativa!' : 'Bienvenido de vuelta'}
          </h1>
          <p style={styles.subtitle}>
            {mode === 'signup' 
              ? 'Crea tu cuenta y comienza a aprender' 
              : 'Ingresa tus credenciales para continuar'}
          </p>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Ej: María García"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Correo electrónico *</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Contraseña *</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(''); // Clear error when user types
                }}
                required
                minLength={6}
                style={styles.input}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              {mode === 'login' && loginError && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#ffebee',
                  border: '1px solid #ef5350',
                  borderRadius: '8px',
                  color: '#c62828',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <label style={{...styles.label, marginBottom: '0.75rem'}}>Soy... *</label>
                <div style={styles.radioGroup}>
                  <label 
                    style={{
                      ...styles.radioLabel,
                      borderColor: role === 'student' ? '#667eea' : '#e0e0e0',
                      background: role === 'student' ? '#f0f4ff' : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={(e) => setRole(e.target.value)}
                    />
                    Estudiante
                  </label>
                  <label 
                    style={{
                      ...styles.radioLabel,
                      borderColor: role === 'teacher' ? '#667eea' : '#e0e0e0',
                      background: role === 'teacher' ? '#f0f4ff' : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="teacher"
                      checked={role === 'teacher'}
                      onChange={(e) => setRole(e.target.value)}
                    />
                    Docente
                  </label>
                </div>

                {role === 'student' && (
                  <>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem'}}>
                      <div>
                        <label style={styles.label}>Grado *</label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          required
                          style={{...styles.input, cursor: 'pointer'}}
                        >
                          <option value="">Seleccionar</option>
                          {[3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                            <option key={g} value={g}>{g}°</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Curso *</label>
                        <input
                          type="text"
                          placeholder="A, B, 1..."
                          value={section}
                          onChange={(e) => setSection(e.target.value.toUpperCase())}
                          maxLength="2"
                          required
                          style={{...styles.input, textTransform: 'uppercase'}}
                        />
                      </div>
                    </div>

                    <div style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        required
                        style={{marginTop: '2px'}}
                      />
                      <span>
                        Acepto la <a 
                          href="/privacy-policy" 
                          // target="_blank"
                          rel="noopener noreferrer"
                          style={{color: '#667eea', textDecoration: 'underline'}}
                        >
                          Política de Privacidad
                        </a> y el tratamiento de mis datos personales
                      </span>
                    </div>

                    <div style={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={acceptedParentalConsent}
                        onChange={(e) => setAcceptedParentalConsent(e.target.checked)}
                        required
                        style={{marginTop: '2px'}}
                      />
                      <span>
                        Confirmo que tengo autorización de mis padres/tutores para usar esta plataforma (Ley 1098 de 2006)
                      </span>
                    </div>
                  </>
                )}

                {role === 'teacher' && (
                  <div style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      required
                      style={{marginTop: '2px'}}
                    />
                    <span>
                      Acepto la <a 
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{color: '#667eea', textDecoration: 'underline'}}
                      >
                        Política de Privacidad
                      </a> y confirmo que usaré la plataforma con fines educativos
                    </span>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid()}
              style={{
                ...styles.button,
                opacity: (loading || !isFormValid()) ? 0.7 : 1,
                cursor: (loading || !isFormValid()) ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => !loading && isFormValid() && (e.target.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => !loading && isFormValid() && (e.target.style.transform = 'translateY(0)')}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Cargando...
                </>
              ) : (
                mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'
              )}
            </button>
          </form>

          <div style={styles.switchMode}>
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta? {' '}
                <span style={styles.link} onClick={() => setMode('signup')}>
                  Regístrate aquí
                </span>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta? {' '}
                <span style={styles.link} onClick={() => setMode('login')}>
                  Inicia sesión
                </span>
              </>
            )}
          </div>

          {/* Character decoration (only for students in signup) */}
          {mode === 'signup' && role === 'student' && (
            <img 
              src="/image/characters/teen/Pico/default.png" 
              alt="Pico"
              style={styles.character}
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
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

export default Login;