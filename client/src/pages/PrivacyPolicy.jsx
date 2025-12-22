// client/src/pages/PrivacyPolicy.jsx
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const sections = [
    {
      title: "1. Información General",
      content: `Aula Nativa es una plataforma educativa diseñada para apoyar el aprendizaje de estudiantes colombianos mediante el uso de inteligencia artificial, bajo una modalidad asincrónica. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos la información personal de nuestros usuarios, en cumplimiento con la Ley 1581 de 2012 (Protección de Datos Personales) y la Ley 1098 de 2006 (Código de la Infancia y la Adolescencia).

Última actualización: Diciembre, 2025`
    },
    {
      title: "2. Datos que Recopilamos",
      content: `**Estudiantes:**
• Nombre completo
• Correo electrónico
• Grado y sección académica (Curso)
• Código de estudiante (asignado por el docente)
• Historial de conversaciones con el asistente de IA
• Respuestas a ejercicios de práctica
• Calificaciones académicas
• Actividad en la plataforma (fechas, tiempos de uso)

**Docentes:**
• Nombre completo
• Correo electrónico institucional
• Materiales didácticos subidos
• Listas de calificaciones de estudiantes
• Estadísticas de uso agregadas`
    },
    {
      title: "3. Cómo Usamos tu Información",
      content: `Utilizamos tus datos personales exclusivamente para:

• **Proveer servicios educativos:** Generar respuestas personalizadas mediante IA, crear ejercicios de práctica adaptados a tu nivel, y administrar simulacros ICFES
• **Seguimiento académico:** Almacenar y mostrar tus calificaciones, vincular tu perfil con las notas subidas por tu profesor
• **Mejora del servicio:** Analizar patrones de uso (de forma agregada y anónima) para optimizar la experiencia educativa
• **Comunicación:** Enviar notificaciones importantes sobre tu cuenta o actualizaciones de la plataforma
• **Cumplimiento legal:** Responder a requerimientos judiciales cuando sea obligatorio

**NO compartimos, vendemos ni alquilamos tu información personal a terceros con fines comerciales o publicitarios.**`
    },
    {
      title: "4. Servicios de Terceros",
      content: `Para funcionar, Aula Nativa utiliza servicios externos que procesan datos bajo estrictas medidas de seguridad:

• **OpenAI (ChatGPT):** Procesa tus preguntas para generar respuestas educativas. Las conversaciones se envían de forma anónima (sin tu nombre ni correo)
• **Supabase:** Almacena de forma segura tu información en servidores con cifrado
• **Servicios de Autenticación:** Verifican tu identidad al iniciar sesión

Estos proveedores están contractualmente obligados a proteger tu información y no pueden usarla para otros fines.`
    },
    {
      title: "5. Protección de Menores de Edad",
      content: `Como plataforma educativa para estudiantes en Colombia, cumplimos con la **Ley 1098 de 2006** (Código de la Infancia y la Adolescencia):

• **Consentimiento parental:** Requerimos confirmación de que tus padres o tutores legales autorizan tu uso de la plataforma
• **Datos mínimos:** Solo recopilamos información esencial para el servicio educativo
• **Restricciones de acceso:** Los profesores solo ven datos de sus estudiantes registrados
• **Prohibición de contacto directo:** No hay mensajería entre estudiantes, ni foros públicos
• **Supervisión:** Los padres pueden solicitar ver los datos de sus hijos menores de 18 años

Si eres menor de edad, **NO uses la plataforma sin autorización de tus padres o tutores.**`
    },
    {
      title: "6. Seguridad de la Información",
      content: `Implementamos medidas técnicas y organizativas para proteger tus datos:

• **Cifrado:** Todas las comunicaciones usan HTTPS (SSL/TLS)
• **Autenticación segura:** Las contraseñas se almacenan con hash criptográfico
• **Control de acceso:** Solo personal autorizado puede acceder a datos sensibles
• **Respaldos regulares:** Copias de seguridad para prevenir pérdida de información
• **Monitoreo:** Detección de accesos no autorizados o actividad sospechosa

Sin embargo, ningún sistema es 100% seguro. Te recomendamos usar contraseñas fuertes y no compartirlas.`
    },
    {
      title: "7. Tus Derechos (Ley 1581 de 2012)",
      content: `Como titular de datos personales, tienes derecho a:

• **Conocer, actualizar y rectificar** tus datos personales
• **Solicitar prueba de la autorización** otorgada para el tratamiento de tus datos
• **Ser informado** sobre el uso que se ha dado a tus datos
• **Revocar la autorización** y/o solicitar la supresión de tus datos (cuando no exista obligación legal de mantenerlos)
• **Acceder de forma gratuita** a tus datos personales

Para ejercer estos derechos, contáctanos en: **luchomotta97@gmail.com**

**Nota:** Si eres estudiante y solicitas eliminar tu cuenta, también se eliminarán tus calificaciones y progreso académico de forma permanente.`
    },
    {
      title: "8. Retención de Datos",
      content: `Conservamos tu información mientras tu cuenta esté activa y durante el periodo académico necesario:

• **Estudiantes activos:** Datos retenidos durante todo el ciclo escolar
• **Cuentas inactivas:** Datos conservados por 2 años académicos, luego archivados
• **Calificaciones:** Conservadas por 5 años conforme a requisitos de instituciones educativas
• **Datos anonimizados:** Estadísticas agregadas sin identificación personal pueden conservarse indefinidamente para investigación educativa

Puedes solicitar eliminación anticipada de tus datos en cualquier momento.`
    },
    {
      title: "9. Compartir Información",
      content: `Tu información personal solo se comparte en estas circunstancias:

• **Con tu profesor:** Tu nombre, código de estudiante, calificaciones y progreso académico
• **Con tus padres/tutores:** Si eres menor de edad y ellos solicitan acceso
• **Por orden judicial:** Si la ley nos obliga a divulgar información
• **En caso de transferencia:** Si vendemos o fusionamos el servicio (con previo aviso y opción de eliminar tu cuenta)

**Jamás compartimos datos con:**
• Empresas de publicidad
• Redes sociales
• Otros estudiantes (tu información es privada)
• Terceros no autorizados`
    },
    {
      title: "10. Cookies y Tecnologías de Seguimiento",
      content: `Usamos tecnologías estándar para mejorar tu experiencia:

• **Cookies de sesión:** Mantienen tu sesión activa mientras usas la plataforma
• **Almacenamiento local:** Guarda preferencias (como tema oscuro, idioma)
• **Analítica básica:** Registra eventos anónimos de uso (clics, tiempo en página)

**No usamos cookies de publicidad ni rastreadores de terceros.**

Puedes configurar tu navegador para rechazar cookies, pero esto puede afectar la funcionalidad de la plataforma.`
    },
    {
      title: "11. Cambios a esta Política",
      content: `Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar:

• Cambios en la legislación colombiana
• Nuevas funcionalidades de la plataforma
• Mejoras en nuestras prácticas de seguridad

Te notificaremos cambios significativos mediante:
• Correo electrónico a tu dirección registrada
• Aviso destacado al iniciar sesión en la plataforma

La fecha de "Última actualización" siempre aparece al inicio de este documento.`
    },
    {
      title: "12. Contacto",
      content: `Si tienes preguntas, inquietudes o deseas ejercer tus derechos sobre tus datos personales:

**Responsable del tratamiento de datos:** Aula Nativa
**Correo electrónico:** luchomotta97@gmail.com
**Dirección:** Florencia, Caquetá, Colombia

**Tiempo de respuesta:** Máximo 15 días hábiles conforme a la Ley 1581 de 2012

**Autoridad de control:**
Superintendencia de Industria y Comercio (SIC)
Delegatura de Protección de Datos Personales
www.sic.gov.co`
    }
  ];

  const parseMarkdown = (text) => {
    // Split text by ** markers
    const parts = text.split('**');
    
    return parts.map((part, index) => {
      // Odd indices are the text between ** markers (should be bold)
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      // Even indices are regular text
      return part;
    });
  };

  return (
    <>
      {/* <Navbar /> */}
      <div style={{
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: isMobile ? '1.5rem 1rem' : '3rem 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Elements */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-150px',
          left: '-150px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }} />

        {/* Content Container */}
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '2rem' : '3rem',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '0',
              // background: 'rgba(255,255,255,0.15)',
              // borderRadius: '50px',
              backdropFilter: 'blur(10px)',
              // marginBottom: '1.5rem'
            }}>
              <img 
                src="/image/logos/MainLogo.png" 
                alt="Aula Nativa" 
                style={{
                  width: isMobile ? '150px' : '170px',
                  height: 'auto',
                  display: 'block'}}
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
            <h1 style={{
              fontSize: isMobile ? '28px' : '42px',
              color: 'white',
              marginBottom: '1rem',
              fontWeight: '700',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              Política de Privacidad
            </h1>
            <p style={{
              fontSize: isMobile ? '16px' : '18px',
              color: 'rgba(255,255,255,0.95)',
              fontWeight: '500',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Tu privacidad es nuestra prioridad. Conoce cómo protegemos tu información personal.
            </p>
          </div>

          {/* Policy Content */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: isMobile ? '1.5rem' : '2.5rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginBottom: '2rem'
          }}>
            {sections.map((section, index) => (
              <div
                key={index}
                style={{
                  marginBottom: index === sections.length - 1 ? '0' : (isMobile ? '2rem' : '2.5rem'),
                  paddingBottom: index === sections.length - 1 ? '0' : (isMobile ? '2rem' : '2.5rem'),
                  borderBottom: index === sections.length - 1 ? 'none' : '2px solid #f0f0f0'
                }}
              >
                <h2 style={{
                  fontSize: isMobile ? '18px' : '22px',
                  color: '#667eea',
                  marginBottom: '1rem',
                  fontWeight: '700'
                }}>
                  {section.title}
                </h2>
                <div style={{
                  fontSize: isMobile ? '14px' : '15px',
                  color: '#4a5568',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-line'
                }}>
                  {parseMarkdown(section.content)}
                </div>
              </div>
            ))}

            {/* Acceptance Notice */}
            <div style={{
              marginTop: isMobile ? '2rem' : '2.5rem',
              padding: isMobile ? '1.25rem' : '1.5rem',
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              borderRadius: '12px',
              border: '2px solid #4caf50'
            }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  fontSize: '28px',
                  flexShrink: 0
                }}>
                  ✓
                </div>
                <div>
                  <strong style={{
                    color: '#2e7d32',
                    fontSize: isMobile ? '15px' : '16px',
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}>
                    Consentimiento Informado
                  </strong>
                  <p style={{
                    fontSize: isMobile ? '13px' : '14px',
                    color: '#1b5e20',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Al crear una cuenta en Aula Nativa, confirmas que has leído, comprendido y aceptado esta Política de Privacidad. Si eres menor de edad, confirmas que cuentas con la autorización de tus padres o tutores legales.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: isMobile ? '12px 28px' : '14px 32px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <span>←</span>
              <span>Volver</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}