// client/src/components/AnalyticsPanel.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";
import { SkeletonCard, SkeletonText } from "./LoadingSkeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL || "";

function SmallCard({ title, value, icon, color = "#1976d2", trend, trendValue }) {
  return (
    <div style={{
      padding: "1rem",
      borderRadius: 12,
      background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      minWidth: 180,
      border: `2px solid ${color}20`,
      transition: "all 0.3s ease",
      cursor: "pointer"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>{icon}</div>
        {trend && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "12px",
            background: trend === "up" ? "#e8f5e9" : trend === "down" ? "#ffebee" : "#f5f5f5",
            fontSize: "12px",
            fontWeight: "600",
            color: trend === "up" ? "#2e7d32" : trend === "down" ? "#c62828" : "#666"
          }}>
            <span>{trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}</span>
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 14, color: "#666", marginBottom: "0.25rem" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ActionCard({ icon, title, description, actionText, severity = "info", onClick }) {
  const colors = {
    warning: { bg: "#fff3e0", border: "#ff9800", text: "#e65100" },
    danger: { bg: "#ffebee", border: "#d32f2f", text: "#c62828" },
    success: { bg: "#e8f5e9", border: "#4caf50", text: "#2e7d32" },
    info: { bg: "#e3f2fd", border: "#1976d2", text: "#1565c0" }
  };
  const color = colors[severity];

  return (
    <div style={{
      padding: "1.5rem",
      borderRadius: 12,
      background: color.bg,
      border: `2px solid ${color.border}30`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "all 0.3s ease"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateX(4px)";
      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateX(0)";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ fontSize: 36, lineHeight: 1 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: 16, color: color.text, fontWeight: "700" }}>
            {title}
          </h4>
          <p style={{ margin: "0 0 1rem 0", fontSize: 14, color: color.text, lineHeight: "1.5" }}>
            {description}
          </p>
          {actionText && (
            <button
              onClick={onClick}
              style={{
                padding: "0.5rem 1rem",
                background: color.border,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>
              {actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

async function getAuthHeader() {
  try {
    if (supabase.auth && typeof supabase.auth.getSession === "function") {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
    if (supabase.auth && typeof supabase.auth.user === "function") {
      const user = supabase.auth.user();
      const token = user?.access_token || null;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch (err) {
    console.warn("getAuthHeader error:", err);
  }
  return {};
}

export default function AnalyticsPanel({ teacherId }) {
  const isMobile = useIsMobile();
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [gradesOverview, setGradesOverview] = useState(null);
  const [topStudents, setTopStudents] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [days] = useState(30);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  // Generate actionable recommendations based on data
  useEffect(() => {
    if (!overview || !gradesOverview) return;

    const recs = [];

    // Check student activity
    if (overview.unique_students < 5) {
      recs.push({
        icon: "👥",
        title: "Baja participación estudiantil",
        description: `Solo ${overview.unique_students} estudiantes han interactuado con el asistente. Considera promover su uso en clase.`,
        severity: "warning",
        actionText: "Ver estrategias"
      });
    }

    // Check material usage
    if (overview.materials_touched < 3) {
      recs.push({
        icon: "📚",
        title: "Pocos materiales consultados",
        description: "Los estudiantes solo han consultado " + overview.materials_touched + " materiales. Sube más contenido diverso.",
        severity: "info",
        actionText: "Subir material"
      });
    }

    // Check grades performance
    if (gradesOverview && gradesOverview.hasPeriods) {
      const avgScore = gradesOverview.overall.average_score;
      const passingRate = gradesOverview.overall.passing_rate;

      if (avgScore < 3.0) {
        recs.push({
          icon: "⚠️",
          title: "Promedio general bajo",
          description: `El promedio del curso es ${avgScore.toFixed(1)}/5.0. Considera sesiones de refuerzo o tutorías.`,
          severity: "danger",
          actionText: "Ver detalles"
        });
      } else if (avgScore >= 4.0) {
        recs.push({
          icon: "🎉",
          title: "Excelente desempeño",
          description: `El promedio del curso es ${avgScore.toFixed(1)}/5.0. ¡Felicitaciones por el gran trabajo!`,
          severity: "success",
          actionText: null
        });
      }

      if (passingRate < 70) {
        recs.push({
          icon: "📉",
          title: "Tasa de aprobación baja",
          description: `Solo el ${passingRate}% de estudiantes están aprobando. Revisa los temas más difíciles.`,
          severity: "danger",
          actionText: "Analizar"
        });
      }
    }

    // Check for students needing attention
    if (topStudents.length > 0) {
      const struggling = topStudents.filter(s => s.average_score < 3.0).length;
      if (struggling > 0) {
        recs.push({
          icon: "🆘",
          title: `${struggling} estudiante${struggling > 1 ? 's necesitan' : ' necesita'} atención`,
          description: "Hay estudiantes con promedios por debajo de 3.0. Considera apoyo personalizado.",
          severity: "warning",
          actionText: "Ver estudiantes"
        });
      }
    }

    // Default success message if no issues
    if (recs.length === 0) {
      recs.push({
        icon: "✅",
        title: "Todo va bien",
        description: "Los indicadores del curso están en buen estado. Continúa con el buen trabajo.",
        severity: "success",
        actionText: null
      });
    }

    setRecommendations(recs);
  }, [overview, gradesOverview, topStudents]);

  // Export functionality
  const handleExport = (type) => {
    if (type === "csv") {
      exportToCSV();
    } else if (type === "pdf") {
      alert("La exportación a PDF estará disponible próximamente. Por ahora, usa 'Imprimir' desde tu navegador.");
      window.print();
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Overview data
    csvContent += "Resumen General\n";
    csvContent += "Métrica,Valor\n";
    if (overview) {
      csvContent += `Estudiantes Activos,${overview.unique_students}\n`;
      csvContent += `Total Eventos,${overview.total_events}\n`;
      csvContent += `Materiales Usados,${overview.materials_touched}\n`;
    }
    csvContent += "\n";

    // Grades overview
    if (gradesOverview && gradesOverview.hasPeriods) {
      csvContent += "Desempeño Académico\n";
      csvContent += "Métrica,Valor\n";
      csvContent += `Estudiantes Calificados,${gradesOverview.overall.total_students}\n`;
      csvContent += `Promedio General,${gradesOverview.overall.average_score.toFixed(2)}\n`;
      csvContent += `Tasa de Aprobación,${gradesOverview.overall.passing_rate}%\n`;
      csvContent += `Períodos Registrados,${gradesOverview.overall.periods_count}\n`;
      csvContent += "\n";
    }

    // Top students
    if (topStudents && topStudents.length > 0) {
      csvContent += "Top Estudiantes\n";
      csvContent += "Posición,Código,Nombre,Promedio,Calificaciones,Mejor,Menor\n";
      topStudents.forEach((student, index) => {
        csvContent += `${index + 1},${student.student_code},"${student.student_name}",${student.average_score.toFixed(2)},${student.total_grades},${student.highest_score.toFixed(1)},${student.lowest_score.toFixed(1)}\n`;
      });
      csvContent += "\n";
    }

    // Period details
    if (gradesOverview && gradesOverview.periods) {
      csvContent += "Detalles por Período\n";
      csvContent += "Período,Estudiantes,Promedio,Aprobados,Reprobados,% Aprobación\n";
      gradesOverview.periods.forEach(period => {
        csvContent += `"${period.period_name}",${period.total_students},${period.average_score.toFixed(2)},${period.passing_count},${period.failing_count},${period.passing_rate}%\n`;
      });
    }

    // Create download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_dashboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    setAuthError(null);

    const fetchOverview = async (headers) => {
      try {
        const r = await fetch(`${API_BASE}/api/statistics/overview?teacherId=${teacherId}&days=90`, {
          method: "GET",
          headers,
        });
        if (r.status === 401 || r.status === 403) {
          const text = await r.text();
          setAuthError(text || (r.status === 401 ? "Please sign in to view analytics" : "You are not authorized"));
          return;
        }
        if (r.ok) {
          const json = await r.json();
          setOverview(json);
        }
      } catch (e) {
        console.warn("overview fetch error:", e);
      }
    };

    const fetchSeries = async (headers) => {
      try {
        const r = await fetch(`${API_BASE}/api/statistics/events?teacherId=${teacherId}&days=${days}`, {
          method: "GET",
          headers,
        });
        if (r.ok) {
          const json = await r.json();
          setSeries((json.series || []).map(s => ({ day: (s.day || "").slice(0,10), events: s.events || 0 })));
        }
      } catch (e) {
        console.warn("events fetch error:", e);
      }
    };

    const fetchMaterials = async (headers) => {
      try {
        const r = await fetch(`${API_BASE}/api/statistics/materials?teacherId=${teacherId}&days=180&limit=8`, {
          method: "GET",
          headers,
        });
        if (r.ok) {
          const json = await r.json();
          setMaterials(json.materials || []);
        }
      } catch (e) {
        console.warn("materials fetch error:", e);
      }
    };

    const fetchGradesOverview = async (headers) => {
      try {
        const r = await fetch(`${API_BASE}/api/statistics/grades-overview?teacherId=${teacherId}`, {
          method: "GET",
          headers,
        });
        if (r.ok) {
          const json = await r.json();
          setGradesOverview(json);
        }
      } catch (e) {
        console.warn("grades-overview fetch error:", e);
      }
    };

    const fetchGradeDistribution = async (headers) => {
      try {
        const r = await fetch(`${API_BASE}/api/statistics/grade-distribution?teacherId=${teacherId}`, {
          method: "GET",
          headers,
        });
        if (r.ok) {
          const json = await r.json();
          setGradeDistribution(json.distribution || []);
        }
      } catch (e) {
        console.warn("grade-distribution fetch error:", e);
      }
    };

    (async () => {
      const authHeader = await getAuthHeader();
      const headers = { ...authHeader };
      await Promise.all([
        fetchOverview(headers),
        fetchSeries(headers),
        fetchMaterials(headers),
        fetchGradesOverview(headers),
        fetchGradeDistribution(headers)
      ]);
      setLoading(false);
    })();
  }, [teacherId, days]);

  // Separate useEffect for fetching students based on selected period
  useEffect(() => {
    if (!teacherId) return;

    const fetchTopStudents = async () => {
      try {
        const authHeader = await getAuthHeader();
        const periodParam = selectedPeriod !== "all" ? `&periodId=${selectedPeriod}` : "";
        const url = `${API_BASE}/api/statistics/top-students?teacherId=${teacherId}&limit=1000${periodParam}`;
        
        const r = await fetch(url, {
          method: "GET",
          headers: authHeader,
        });
        if (r.ok) {
          const json = await r.json();
          setTopStudents(json.students || []);
        }
      } catch (e) {
        console.warn("top-students fetch error:", e);
      }
    };

    fetchTopStudents();
  }, [teacherId, selectedPeriod]);

  if (!teacherId) {
    return (
      <div style={{ marginTop: "2rem" }}>
        <h3>Estadísticas de Uso</h3>
        <div style={{ 
          padding: "2rem", 
          background: "#fff3", 
          borderRadius: 12,
          textAlign: "center"
        }}>
          Proporcione un <strong>teacherId</strong> al componente para ver estadísticas.
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ marginTop: "2rem" }}>
        <h3>Estadísticas de Uso</h3>
        <div style={{
          padding: "2rem",
          background: "#fff4f0",
          borderRadius: 12,
          border: "2px solid #ffd6c2",
          color: "#8a4b2a",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>🔒</div>
          <p style={{ margin: 0, fontWeight: "600", fontSize: 18 }}>No autorizado</p>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: 14 }}>{authError}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? "24px" : "32px" }}>📊 Estadísticas de Uso y Desempeño</h2>
        </div>
        
        {/* Loading skeleton for overview cards */}
        <div style={{ marginBottom: "2rem" }}>
          <SkeletonText width="200px" height="20px" style={{ marginBottom: "1rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <SkeletonCard height="120px" />
            <SkeletonCard height="120px" />
            <SkeletonCard height="120px" />
          </div>
        </div>

        {/* Loading skeleton for charts */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <SkeletonCard height="300px" />
          <SkeletonCard height="300px" />
        </div>

        {/* Loading skeleton for table */}
        <SkeletonCard height="400px" />
      </div>
    );
  }

  const COLORS = ['#d32f2f', '#f57c00', '#fbc02d', '#7cb342', '#388e3c', '#00897b', '#1976d2'];

  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Header with Export Button */}
      <div style={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between", 
        alignItems: isMobile ? "flex-start" : "center",
        marginBottom: "2rem",
        gap: isMobile ? "1rem" : "0"
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? "24px" : "32px", color: "#2c3e50" }}>
          Estadísticas de Uso y Desempeño
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => handleExport("csv")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #2E8B57 0%, #388e4dff 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(76, 175, 80, 0.3)";
            }}>
            Exportar CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #277DA1 0%, #1565c0 100%)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.3)";
            }}>
            Imprimir
          </button>
        </div>
      </div>

      {/* Quick Action Cards / Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ 
            marginBottom: "1rem", 
            fontSize: isMobile ? "18px" : "20px",
            color: "#2c3e50",
            fontWeight: "700"
          }}>
            💡 Recomendaciones y Alertas
          </h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", 
            gap: "1rem" 
          }}>
            {recommendations.map((rec, idx) => (
              <ActionCard key={idx} {...rec} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Overview Cards */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ 
          marginBottom: "1rem", 
          fontSize: isMobile ? "18px" : "20px",
          color: "#2c3e50",
          fontWeight: "700"
        }}>
          Actividad General (últimos 90 días)
        </h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: "1rem" 
        }}>
          <SmallCard 
            title="Estudiantes Activos" 
            value={overview ? overview.unique_students : "—"} 
            color="#1976d2"
            trend={overview && overview.unique_students > 10 ? "up" : overview && overview.unique_students > 0 ? "stable" : "down"}
          />
          <SmallCard 
            title="Total Eventos" 
            value={overview ? overview.total_events : "—"} 
            color="#7b1fa2"
            trend={overview && overview.total_events > 100 ? "up" : overview && overview.total_events > 0 ? "stable" : "down"}
          />
          <SmallCard 
            title="Materiales Usados" 
            value={overview ? overview.materials_touched : "—"} 
            color="#388e3c"
            trend={overview && overview.materials_touched > 5 ? "up" : overview && overview.materials_touched > 0 ? "stable" : "down"}
          />
        </div>
      </div>

      {/* Grades Overview Cards */}
      {gradesOverview && gradesOverview.hasPeriods && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ 
            marginBottom: "1rem", 
            fontSize: isMobile ? "18px" : "20px",
            color: "#2c3e50",
            fontWeight: "700"
          }}>
            Desempeño Académico
          </h3>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))", 
            gap: "1rem" 
          }}>
            <SmallCard 
              title="Estudiantes Calificados" 
              value={gradesOverview.overall.total_students} 
              color="#1976d2"
            />
            <SmallCard 
              title="Promedio General" 
              value={gradesOverview.overall.average_score.toFixed(1)} 
              color={gradesOverview.overall.average_score >= 3.5 ? "#4caf50" : gradesOverview.overall.average_score >= 3.0 ? "#ff9800" : "#d32f2f"}
              trend={gradesOverview.overall.average_score >= 4.0 ? "up" : gradesOverview.overall.average_score >= 3.0 ? "stable" : "down"}
            />
            <SmallCard 
              title="Tasa de Aprobación" 
              value={`${gradesOverview.overall.passing_rate}%`}
              color={gradesOverview.overall.passing_rate >= 70 ? "#4caf50" : gradesOverview.overall.passing_rate >= 50 ? "#ff9800" : "#d32f2f"}
              trend={gradesOverview.overall.passing_rate >= 70 ? "up" : gradesOverview.overall.passing_rate >= 50 ? "stable" : "down"}
            />
            <SmallCard 
              title="Períodos Registrados" 
              value={gradesOverview.overall.periods_count}
              color="#7b1fa2"
            />
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))", 
        gap: "1.5rem", 
        marginBottom: "2rem" 
      }}>
        {/* Events Timeline */}
        <div style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          padding: isMobile ? "1rem" : "1.5rem",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0"
        }}>
          <h4 style={{ 
            margin: "0 0 1rem 0", 
            fontSize: isMobile ? "15px" : "16px",
            fontWeight: "700",
            color: "#2c3e50"
          }}>
            Actividad Diaria (últimos {days} días)
          </h4>
          {(!series || series.length === 0) ? (
            <div style={{ 
              height: 250, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              color: "#999",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div style={{ fontSize: 48 }}>📊</div>
              <div style={{ fontSize: 14 }}>{loading ? "Cargando..." : "Sin datos disponibles"}</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976d2" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#1976d2" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }} 
                  stroke="#999"
                />
                <YAxis 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }} 
                  stroke="#999"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255,255,255,0.95)", 
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="events" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEvents)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Grade Distribution */}
        {gradeDistribution && gradeDistribution.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e0e0e0"
          }}>
            <h4 style={{ 
              margin: "0 0 1rem 0", 
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "700",
              color: "#2c3e50"
            }}>
              Distribución de Calificaciones
            </h4>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: isMobile ? 8 : 10, fill: "#666" }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke="#999"
                />
                <YAxis 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }} 
                  stroke="#999"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255,255,255,0.95)", 
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Bar 
                  dataKey="count" 
                  name="Estudiantes"
                  animationDuration={800}
                  radius={[8, 8, 0, 0]}
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Materials */}
        <div style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          padding: isMobile ? "1rem" : "1.5rem",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0"
        }}>
          <h4 style={{ 
            margin: "0 0 1rem 0", 
            fontSize: isMobile ? "15px" : "16px",
            fontWeight: "700",
            color: "#2c3e50"
          }}>
            Materiales Más Usados
          </h4>
          {(!materials || materials.length === 0) ? (
            <div style={{ 
              height: 250, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              color: "#999",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div style={{ fontSize: 48 }}>📚</div>
              <div style={{ fontSize: 14 }}>{loading ? "Cargando..." : "Sin materiales consultados"}</div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 200}>
                <BarChart data={materials} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }}
                    stroke="#999"
                  />
                  <YAxis 
                    dataKey="file_name" 
                    type="category" 
                    tick={{ fontSize: isMobile ? 8 : 10, fill: "#666" }} 
                    width={isMobile ? 80 : 100}
                    stroke="#999"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(255,255,255,0.95)", 
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    }}
                  />
                  <Bar 
                    dataKey="events" 
                    name="Eventos" 
                    fill="#4caf50"
                    animationDuration={800}
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: "1rem", maxHeight: 150, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: isMobile ? 11 : 12, borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
                    <tr>
                      <th style={{ padding: isMobile ? "0.4rem" : "0.5rem", textAlign: "left", fontSize: isMobile ? 10 : 11 }}>Material</th>
                      <th style={{ padding: isMobile ? "0.4rem" : "0.5rem", textAlign: "center", fontSize: isMobile ? 10 : 11 }}>Eventos</th>
                      <th style={{ padding: isMobile ? "0.4rem" : "0.5rem", textAlign: "center", fontSize: isMobile ? 10 : 11 }}>Precisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, idx) => (
                      <tr key={m.material_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ 
                          padding: isMobile ? "0.4rem" : "0.5rem", 
                          maxWidth: isMobile ? 100 : 150, 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}>
                          {m.file_name || m.material_id}
                        </td>
                        <td style={{ padding: isMobile ? "0.4rem" : "0.5rem", textAlign: "center", fontWeight: "600" }}>
                          {m.events}
                        </td>
                        <td style={{ 
                          padding: isMobile ? "0.4rem" : "0.5rem", 
                          textAlign: "center",
                          fontWeight: "600",
                          color: m.accuracy >= 0.7 ? "#4caf50" : m.accuracy >= 0.5 ? "#ff9800" : "#d32f2f"
                        }}>
                          {m.accuracy === null ? "—" : `${Math.round((m.accuracy || 0) * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Period Progress */}
        {gradesOverview && gradesOverview.hasPeriods && gradesOverview.periods && (
          <div style={{
            background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e0e0e0"
          }}>
            <h4 style={{ 
              margin: "0 0 1rem 0", 
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "700",
              color: "#2c3e50"
            }}>
              Progreso por Período
            </h4>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <LineChart data={[...gradesOverview.periods].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="period_name" 
                  tick={{ fontSize: isMobile ? 8 : 10, fill: "#666" }} 
                  angle={-20} 
                  textAnchor="end" 
                  height={60}
                  stroke="#999"
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  domain={[0, 5]} 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }}
                  stroke="#999"
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tick={{ fontSize: isMobile ? 9 : 11, fill: "#666" }}
                  stroke="#999"
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(255,255,255,0.95)", 
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="average_score" 
                  stroke="#1976d2" 
                  name="Promedio" 
                  strokeWidth={2}
                  animationDuration={800}
                  dot={{ r: 4, fill: "#1976d2" }}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="passing_rate" 
                  stroke="#4caf50" 
                  name="% Aprobación" 
                  strokeWidth={2}
                  animationDuration={800}
                  dot={{ r: 4, fill: "#4caf50" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Best and Worst Students Tables */}
      {topStudents && topStudents.length > 0 && (() => {
        const sortedStudents = [...topStudents].sort((a, b) => b.average_score - a.average_score);
        const bestStudents = sortedStudents.slice(0, 5);
        const worstStudents = sortedStudents.slice(-5).reverse();

        // Period filter UI
        const periodFilterSection = gradesOverview && gradesOverview.hasPeriods && gradesOverview.periods && (
          <div style={{
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}>
            <label style={{
              fontSize: isMobile ? "14px" : "15px",
              fontWeight: "600",
              color: "#2c3e50"
            }}>
              Filtrar por período:
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                padding: "0.5rem 1rem",
                fontSize: isMobile ? "13px" : "14px",
                borderRadius: 8,
                border: "2px solid #e0e0e0",
                background: "white",
                cursor: "pointer",
                fontWeight: "500",
                color: "#2c3e50",
                minWidth: isMobile ? "150px" : "200px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.borderColor = "#1976d2"}
              onMouseLeave={(e) => e.target.style.borderColor = "#e0e0e0"}
            >
              <option value="all">Todos los períodos</option>
              {gradesOverview.periods.map(period => (
                <option key={period.period_id} value={period.period_id}>
                  {period.period_name}
                </option>
              ))}
            </select>
            {selectedPeriod !== "all" && (
              <button
                onClick={() => setSelectedPeriod("all")}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: isMobile ? "12px" : "13px",
                  borderRadius: 8,
                  border: "none",
                  background: "#f5f5f5",
                  color: "#666",
                  cursor: "pointer",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#e0e0e0";
                  e.target.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#f5f5f5";
                  e.target.style.color = "#666";
                }}
              >
                ✕ Limpiar filtro
              </button>
            )}
          </div>
        );

        const renderStudentTable = (students, title, titleColor, isWorst = false) => (
          <div style={{
            background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
            padding: isMobile ? "1rem" : "1.5rem",
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #e0e0e0"
          }}>
            <h4 style={{ 
              margin: "0 0 1rem 0", 
              fontSize: isMobile ? "16px" : "18px",
              fontWeight: "700",
              color: titleColor
            }}>
              {title}
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 12 : 14 }}>
                <thead style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)" }}>
                  <tr>
                    <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Pos.</th>
                    {!isMobile && <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Código</th>}
                    <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Nombre</th>
                    <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Prom.</th>
                    {!isMobile && <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Calif.</th>}
                    {!isMobile && (
                      <>
                        <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Mejor</th>
                        <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Menor</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const actualPosition = isWorst ? sortedStudents.length - students.length + index + 1 : index + 1;
                    return (
                      <tr 
                        key={student.student_code} 
                        style={{ 
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem" }}>
                          <span style={{
                            display: "inline-block",
                            width: isMobile ? "24px" : "32px",
                            height: isMobile ? "24px" : "32px",
                            lineHeight: isMobile ? "24px" : "32px",
                            textAlign: "center",
                            borderRadius: "50%",
                            background: !isWorst && index < 3 
                              ? `linear-gradient(135deg, ${index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : "#cd7f32"} 0%, ${index === 0 ? "#ffed4e" : index === 1 ? "#e8e8e8" : "#e8a87c"} 100%)`
                              : "#f5f5f5",
                            fontWeight: "700",
                            color: !isWorst && index < 3 ? "#000" : "#666",
                            fontSize: isMobile ? "11px" : "14px",
                            boxShadow: !isWorst && index < 3 ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
                          }}>
                            {actualPosition}
                          </span>
                        </td>
                        {!isMobile && <td style={{ padding: "0.75rem", color: "#666" }}>{student.student_code}</td>}
                        <td style={{ 
                          padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", 
                          fontWeight: "600",
                          maxWidth: isMobile ? "120px" : "none",
                          overflow: isMobile ? "hidden" : "visible",
                          textOverflow: isMobile ? "ellipsis" : "clip",
                          whiteSpace: isMobile ? "nowrap" : "normal"
                        }}>
                          {student.student_name}
                        </td>
                        <td style={{ 
                          padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", 
                          textAlign: "center", 
                          fontWeight: "700",
                          fontSize: isMobile ? "13px" : "15px",
                          color: student.average_score >= 4.0 ? "#4caf50" : student.average_score >= 3.0 ? "#ff9800" : "#d32f2f"
                        }}>
                          {student.average_score.toFixed(1)}
                        </td>
                        {!isMobile && <td style={{ padding: "0.75rem", textAlign: "center", color: "#666" }}>{student.total_grades}</td>}
                        {!isMobile && (
                          <>
                            <td style={{ padding: "0.75rem", textAlign: "center", color: "#4caf50", fontWeight: "600" }}>
                              {student.highest_score.toFixed(1)}
                            </td>
                            <td style={{ padding: "0.75rem", textAlign: "center", color: "#d32f2f", fontWeight: "600" }}>
                              {student.lowest_score.toFixed(1)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <>
            {periodFilterSection}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              {renderStudentTable(bestStudents, "🏆 Top 5 Mejores Estudiantes", "#2c3e50", false)}
              {renderStudentTable(worstStudents, "⚠️ 5 Estudiantes con Menor Promedio", "#d32f2f", true)}
            </div>
          </>
        );
      })()}

      {/* Period Details Table */}
      {gradesOverview && gradesOverview.hasPeriods && gradesOverview.periods && (
        <div style={{
          background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
          padding: isMobile ? "1rem" : "1.5rem",
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0"
        }}>
          <h4 style={{ 
            margin: "0 0 1rem 0", 
            fontSize: isMobile ? "16px" : "18px",
            fontWeight: "700",
            color: "#2c3e50"
          }}>
            Detalles por Período
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 12 : 14 }}>
              <thead style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)" }}>
                <tr>
                  <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Período</th>
                  {!isMobile && <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Estudiantes</th>}
                  <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Promedio</th>
                  {!isMobile && (
                    <>
                      <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Aprobados</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>Reprobados</th>
                    </>
                  )}
                  <th style={{ padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", textAlign: "center", borderBottom: "2px solid #ddd", fontWeight: "700" }}>% Aprob.</th>
                </tr>
              </thead>
              <tbody>
                {gradesOverview.periods.map((period, index) => (
                  <tr 
                    key={period.period_id} 
                    style={{ 
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ 
                      padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", 
                      fontWeight: "600",
                      maxWidth: isMobile ? "120px" : "none",
                      overflow: isMobile ? "hidden" : "visible",
                      textOverflow: isMobile ? "ellipsis" : "clip",
                      whiteSpace: isMobile ? "nowrap" : "normal"
                    }}>
                      {period.period_name}
                    </td>
                    {!isMobile && <td style={{ padding: "0.75rem", textAlign: "center", color: "#666" }}>{period.total_students}</td>}
                    <td style={{ 
                      padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", 
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: isMobile ? "13px" : "15px",
                      color: period.average_score >= 4.0 ? "#4caf50" : period.average_score >= 3.0 ? "#ff9800" : "#d32f2f"
                    }}>
                      {period.average_score.toFixed(1)}
                    </td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: "0.75rem", textAlign: "center", color: "#4caf50", fontWeight: "600" }}>
                          {period.passing_count}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center", color: "#d32f2f", fontWeight: "600" }}>
                          {period.failing_count}
                        </td>
                      </>
                    )}
                    <td style={{ 
                      padding: isMobile ? "0.6rem 0.5rem" : "0.75rem", 
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: isMobile ? "13px" : "14px",
                      color: period.passing_rate >= 70 ? "#4caf50" : period.passing_rate >= 50 ? "#ff9800" : "#d32f2f"
                    }}>
                      {period.passing_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}