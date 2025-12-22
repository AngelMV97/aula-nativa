// client/src/components/Navbar.jsx
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIsMobile } from "../hooks/useMediaQuery";
import { useAutoHideNav } from "../hooks/useAutoHideNav";

function Navbar({ autoHide = false, scrollBehavior = null }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Auto-hide behavior for mobile phases or teacher scroll
  const { isVisible } = useAutoHideNav({
    enabled: autoHide && (isMobile || scrollBehavior === 'scroll'),
    hideDelay: 5000,
    showOnTap: isMobile,
    showOnScroll: scrollBehavior === 'scroll',
    scrollDirection: 'up'
  });

  useEffect(() => {
    async function fetchUserName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // First check if user is a teacher or student
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'student') {
          // Fetch from students table for students
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('user_id', user.id)
            .single();
          
          // Show only first name for privacy
          const firstName = student?.name?.split(' ')[0] || 'Estudiante';
          setUserName(firstName);
        } else if (profile?.role === 'teacher') {
          // For teachers, you could either:
          // Option A: Use email prefix
          const emailName = user.email?.split('@')[0] || 'Profesor';
          setUserName(emailName);
          
          // Option B: Or add a teachers table with names later
          // For now, we'll use email prefix
        }
      }
    }
    fetchUserName();
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setRole(profile?.role);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  const styles = {
    header: {
      background: "linear-gradient(135deg, #43606bf1 0%, #95abb4f1 100%)",
      backdropFilter: "blur(10px)",
      color: "#2c3e50",
      padding: isMobile ? "0.5rem 1rem" : "0.65rem 2rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      borderBottom: "1px solid rgba(0,0,0,0.05)",
      transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
      transition: 'transform 0.3s ease-in-out',
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      cursor: "pointer",
    },
    logoCircle: {
      width: isMobile ? "44px" : "52px",
      height: isMobile ? "44px" : "52px",
      borderRadius: "50%",
      background: "rgba(255, 255, 255, 0.97)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(255, 255, 255, 0.3)",
      transition: "all 0.3s ease",
    },
    logoImage: {
      width: "150%",
      height: "150%",
      objectFit: "contain",
      padding: "6px",
    },
    logoTitle: {
      margin: 0,
      fontSize: isMobile ? "18px" : "22px",
      fontWeight: "700",
      letterSpacing: "0.3px",
      color: "#ffffffff",
    },
    nav: {
      display: isMobile ? "none" : "flex",
      gap: "1.5rem",
      alignItems: "center",
    },
    navLink: {
      background: "transparent",
      border: "none",
      color: "#2c3e50",
      fontSize: "15px",
      cursor: "pointer",
      padding: "0.6rem 1.2rem",
      borderRadius: "8px",
      transition: "all 0.3s ease",
      fontWeight: "500",
    },
    userButton: {
      background: "rgba(25, 118, 210, 0.1)",
      border: "2px solid rgba(25, 118, 210, 0.2)",
      borderRadius: "50%",
      width: "42px",
      height: "42px",
      cursor: "pointer",
      fontSize: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
    },
    mobileMenuButton: {
      display: isMobile ? "block" : "none",
      background: "transparent",
      border: "none",
      color: "#2c3e50",
      fontSize: "24px",
      cursor: "pointer",
    },
  };

  return (
    <header style={styles.header}>
      {/* Logo */}
      <div
        style={styles.logo}
        onClick={() => navigate(role === "teacher" ? "/dashboard" : "/home")}
      >
        <div 
          style={styles.logoCircle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
          }}
        >
          <img 
            src="/image/logos/MinimalIconLogo.png" 
            alt="Aula Nativa" 
            style={styles.logoImage}
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
        <h1 style={styles.logoTitle}>Aula Nativa</h1>
      </div>

      {/* Desktop Navigation */}
      <nav style={styles.nav}>
        {role === "teacher" && (
          <>
            <button 
              onClick={() => navigate("/dashboard")} 
              style={{ ...styles.navLink, fontWeight: "550" }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(25, 118, 210, 0.1)";
                e.target.style.color = "#ffffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#2c3e50";
              }}
            >
              <img
                src="/image/icons/panel.svg"
                alt="Panel"
                style={{ width: 17, background: "transparent", marginRight: "8px" }}
              /> Panel
            </button>
            <button 
              onClick={() => navigate("/materials")} 
              style={{ ...styles.navLink, fontWeight: "550" }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(25, 118, 210, 0.1)";
                e.target.style.color = "#ffffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#2c3e50";
              }}
            >
              <img
                src="/image/icons/materials.svg"
                alt="Material"
                style={{ width: 17, background: "transparent", marginRight: "8px" }}
              /> Materiales
            </button>
            <button 
              onClick={() => navigate("/grades")} 
              style={{ ...styles.navLink, fontWeight: "550" }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(25, 118, 210, 0.1)";
                e.target.style.color = "#ffffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#2c3e50";
              }}
            >
              <img
                src="/image/icons/grades.svg"
                alt="Calificaciones"
                style={{ width: 17, background: "transparent", marginRight: "8px" }}
              /> Calificaciones
            </button>
          </>
        )}
        {role === "student" && (
          <>
            <button 
              onClick={() => navigate("/home")} 
              style={{ ...styles.navLink, fontWeight: "550" }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(25, 118, 210, 0.1)";
                e.target.style.color = "#ffffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#2c3e50";
              }}
            >
              <img
                src="/image/icons/home.svg"
                alt="Usuario"
                style={{ width: 17, background: "transparent", color: "#1976d2", marginRight: "8px" }}
              /> Inicio
            </button>
            <button 
              onClick={() => navigate("/materials")} 
              style={{ ...styles.navLink, fontWeight: "550" }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(25, 118, 210, 0.1)";
                e.target.style.color = "#ffffffff";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                e.target.style.color = "#2c3e50";
              }}
            >
              <img
                src="/image/icons/materials.svg"
                alt="Material"
                style={{ width: 17, background: "transparent", marginRight: "8px" }}
              /> Materiales
            </button>
          </>
        )}

        {/* User Menu */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            style={styles.userButton}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(25, 118, 210, 0.2)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(25, 118, 210, 0.1)";
              e.target.style.transform = "scale(1)";
            }}
          >
            <img
              src="/image/icons/user.svg"
              alt="Usuario"
              style={{ width: 24, height: 24, background: "transparent" }}
            />
          </button>

          {showMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                onClick={() => setShowMenu(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50px",
                  right: 0,
                  background: "white",
                  color: "black",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  minWidth: "200px",
                  overflow: "hidden",
                  zIndex: 1000,
                }}
              >
                <div style={{ padding: "1rem", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontSize: "14px", color: "#666", wordBreak: "break-word" }}>
                    <span>Hola, {userName}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#999", marginTop: "0.25rem" }}>
                    {role === "teacher" ? "Docente" : "Estudiante"}
                  </div>
                </div>
                {role === "student" && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/profile');
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "#1976d2",
                      fontSize: "14px"
                    }}
                  >
                    <img
                      src="/image/icons/profile.svg"
                      alt="Usuario"
                      style={{ width: 15, background: "transparent",  color: "#1976d2", marginRight: "8px" }}
                    /> Mi Perfil
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "#e74c3c",
                    fontWeight: "bold",
                  }}
                >
                  <img
                      src="/image/icons/logout.svg"
                      alt="Logout"
                      style={{ width: 15, height: 15, background: "transparent", marginRight: "8px" }}
                    /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button onClick={() => setShowMobileNav(!showMobileNav)} style={styles.mobileMenuButton}>
        ☰
      </button>

      {/* Mobile Navigation Drawer */}
      {showMobileNav && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1500,
          }}
          onClick={() => setShowMobileNav(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "280px",
              height: "100vh",
              backgroundColor: "white",
              boxShadow: "-2px 0 8px rgba(0,0,0,0.2)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMobileNav(false)}
              style={{
                alignSelf: "flex-end",
                background: "transparent",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <div style={{ padding: "1rem", borderBottom: "1px solid #eee" }}>
              <div style={{ fontSize: "14px", color: "#000000ff" }}><span>Hola, {userName}</span></div>
              <div style={{ fontSize: "12px", color: "#000000ff", marginTop: "0.25rem" }}>
                {role === "teacher" ? "Docente" : "Estudiante"}
              </div>
            </div>

            {role === "teacher" && (
              <>
                <button
                  onClick={() => {
                    navigate("/dashboard");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                    src="/image/icons/panel.svg"
                    alt="Panel"
                    style={{ width: 15, background: "transparent", marginRight: "8px" }}
                  /> Panel
                </button>
                <button
                  onClick={() => {
                    navigate("/materials");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                    src="/image/icons/materials.svg"
                    alt="Material"
                    style={{ width: 15, background: "transparent", marginRight: "8px" }}
                  /> Materiales
                </button>
                <button
                  onClick={() => {
                    navigate("/grades");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                    src="/image/icons/grades.svg"
                    alt="Calificaciones"
                    style={{ width: 15, background: "transparent", marginRight: "8px" }}
                  /> Calificaciones
                </button>
              </>
            )}
            {role === "student" && (
              <>
                <button
                  onClick={() => {
                    navigate("/home");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                    src="/image/icons/home.svg"
                    alt="Home"
                    style={{ width: 15, background: "transparent",  color: "#1976d2", marginRight: "8px" }}
                  /> Inicio
                </button>
                <button
                  onClick={() => {
                    navigate("/materials");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                    src="/image/icons/materials.svg"
                    alt="Material"
                    style={{ width: 15, background: "transparent", marginRight: "8px" }}
                  /> Materiales
                </button>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowMobileNav(false);
                  }}
                  style={{ ...mobileNavBtnStyle, backgroundColor: "#23334198", color: "#ffffffff" }}
                >
                  <img
                      src="/image/icons/profile.svg"
                      alt="Usuario"
                      style={{ width: 15, background: "transparent",  color: "#1976d2", marginRight: "8px" }}
                  /> Mi Perfil
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              style={{
                ...mobileNavBtnStyle,
                marginTop: "auto",
                backgroundColor: "#D1495B",
                color: "white",
              }}
            >
              <img
                src="/image/icons/logout.svg"
                alt="Usuario"
                style={{ width: 15, background: "transparent",  color: "#1976d2", marginRight: "8px" }}
              /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

const mobileNavBtnStyle = {
  padding: "1rem",
  border: "1px solid #ddd",
  background: "white",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "16px",
};

export default Navbar;