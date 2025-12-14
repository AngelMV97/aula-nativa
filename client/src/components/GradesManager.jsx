// client/src/components/GradesManager.jsx - IMPROVED VERSION
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import Toast from "./Toast";
import Modal from "./Modal";
import EmptyState from "./EmptyState";
import { SkeletonCard } from "./LoadingSkeleton";
import { useIsMobile } from "../hooks/useMediaQuery";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {
    console.warn("getAuthHeader:", e);
  }
  return {};
}

export default function GradesManager({ teacherId }) {
  const [activeTab, setActiveTab] = useState("view");
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState("excel");
  const [processing, setProcessing] = useState(false);
  const isMobile = useIsMobile();
  const [editMode, setEditMode] = useState(false);
  const [editedGrades, setEditedGrades] = useState([]);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ show: false, periodId: null, periodName: "" });
  const [bulkDeleteModal, setBulkDeleteModal] = useState({ show: false });
  const [confirmUploadModal, setConfirmUploadModal] = useState({ show: false, data: null });

  // Bulk selection
  const [selectedPeriods, setSelectedPeriods] = useState(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterPeriodNum, setFilterPeriodNum] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Period structure states
  const [periodNumber, setPeriodNumber] = useState("1");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Manual entry states
  const [assessmentColumns, setAssessmentColumns] = useState(["Tarea 1", "Quiz 1", "Examen Final"]);
  const [manualGrades, setManualGrades] = useState([
    { studentCode: "", studentName: "", scores: {} }
  ]);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  function getPeriodName(num) {
    const names = { "1": "Primer", "2": "Segundo", "3": "Tercer", "4": "Cuarto" };
    return names[num] || "Primer";
  }

  function generatePeriodName() {
    if (!grade || !section) return "";
    return `${getPeriodName(periodNumber)} Período ${grade}°${section} ${year}`;
  }

  useEffect(() => {
    if (teacherId) {
      fetchPeriods();
    }
  }, [teacherId]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchGrades(selectedPeriod);
    }
  }, [selectedPeriod]);

  async function fetchPeriods() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("grade_periods")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPeriods(data || []);
      if (data && data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0].id);
      }
    } catch (e) {
      console.error("Error fetching periods:", e);
      showToast("Error al cargar períodos: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGrades(periodId) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_grades")
        .select("*")
        .eq("period_id", periodId)
        .order("student_code", { ascending: true });

      if (error) throw error;
      setGrades(data || []);

      if (data && data.length > 0 && data[0].assessments) {
        const cols = Object.keys(data[0].assessments);
        if (cols.length > 0) {
          setAssessmentColumns(cols);
        }
      }
    } catch (e) {
      console.error("Error fetching grades:", e);
      showToast("Error al cargar calificaciones: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!uploadFile) {
      showToast("Por favor selecciona un archivo", "warning");
      return;
    }

    if (!grade || !section) {
      showToast("Por favor completa el grado y la sección del período", "warning");
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("uploadType", uploadType);
      formData.append("teacherId", teacherId);

      const authHeader = await getAuthHeader();
      const response = await fetch(`${API_BASE}/api/grades/upload`, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al subir archivo");
      }

      const periodName = generatePeriodName();

      // Show confirmation modal
      setConfirmUploadModal({
        show: true,
        data: {
          gradesCount: result.gradesCount,
          periodName,
          grades: result.grades,
          assessmentColumns: result.assessmentColumns
        }
      });

    } catch (error) {
      console.error("Upload error:", error);
      showToast(error.message, "error");
    } finally {
      setProcessing(false);
    }
  }

  async function confirmUpload() {
    const { periodName, grades: uploadedGrades, assessmentColumns: cols } = confirmUploadModal.data;
    setProcessing(true);

    try {
      const authHeader = await getAuthHeader();
      const saveResponse = await fetch(`${API_BASE}/api/grades/period`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          teacherId,
          periodName,
          grades: uploadedGrades,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveResult.error || "Error al guardar");
      }

      showToast(`Período "${periodName}" guardado exitosamente con ${uploadedGrades.length} estudiantes`, "success");
      setUploadFile(null);

      if (cols && cols.length > 0) {
        setAssessmentColumns(cols);
      }

      await fetchPeriods();
      setActiveTab("view");
      setConfirmUploadModal({ show: false, data: null });

    } catch (error) {
      console.error("Save error:", error);
      showToast(error.message, "error");
    } finally {
      setProcessing(false);
    }
  }

  async function handleManualSave() {
    if (!grade || !section) {
      showToast("Por favor completa el grado y la sección del período", "warning");
      return;
    }

    const validGrades = manualGrades.filter(
      g => g.studentCode.trim() && g.studentName.trim() && Object.keys(g.scores).length > 0
    );

    if (validGrades.length === 0) {
      showToast("Por favor ingresa al menos un estudiante con calificaciones", "warning");
      return;
    }

    setLoading(true);

    try {
      const authHeader = await getAuthHeader();

      const gradesWithAverage = validGrades.map(g => {
        const scores = Object.values(g.scores).filter(s => s !== "" && !isNaN(parseFloat(s)));
        const avg = scores.length > 0
          ? scores.reduce((sum, s) => sum + parseFloat(s), 0) / scores.length
          : 0;

        return {
          student_code: g.studentCode,
          student_name: g.studentName,
          assessments: g.scores,
          score: parseFloat(avg.toFixed(2))
        };
      });

      const periodName = generatePeriodName();

      const response = await fetch(`${API_BASE}/api/grades/period`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          teacherId,
          periodName,
          grades: gradesWithAverage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar");
      }

      showToast(`Período "${periodName}" guardado: ${validGrades.length} estudiantes`, "success");
      setManualGrades([{ studentCode: "", studentName: "", scores: {} }]);
      await fetchPeriods();
      setActiveTab("view");
    } catch (error) {
      console.error("Save error:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeletePeriod() {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const response = await fetch(`${API_BASE}/api/grades/period/${deleteModal.periodId}`, {
        method: "DELETE",
        headers: authHeader,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al eliminar");
      }

      showToast("Período eliminado exitosamente", "success");
      setSelectedPeriod(null);
      setGrades([]);
      await fetchPeriods();
    } catch (error) {
      console.error("Delete error:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
      setDeleteModal({ show: false, periodId: null, periodName: "" });
    }
  }

  async function confirmBulkDelete() {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const deletePromises = Array.from(selectedPeriods).map(periodId =>
        fetch(`${API_BASE}/api/grades/period/${periodId}`, {
          method: "DELETE",
          headers: authHeader,
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        showToast(`${successCount} períodos eliminados, ${failCount} fallaron`, "warning");
      } else {
        showToast(`${successCount} períodos eliminados exitosamente`, "success");
      }

      setSelectedPeriods(new Set());
      setBulkSelectMode(false);
      setSelectedPeriod(null);
      setGrades([]);
      await fetchPeriods();
    } catch (error) {
      console.error("Bulk delete error:", error);
      showToast("Error en eliminación múltiple", "error");
    } finally {
      setLoading(false);
      setBulkDeleteModal({ show: false });
    }
  }

  function togglePeriodSelection(periodId) {
    const newSelection = new Set(selectedPeriods);
    if (newSelection.has(periodId)) {
      newSelection.delete(periodId);
    } else {
      newSelection.add(periodId);
    }
    setSelectedPeriods(newSelection);
  }

  function selectAllPeriods() {
    setSelectedPeriods(new Set(filteredPeriods.map(p => p.id)));
  }

  function clearSelection() {
    setSelectedPeriods(new Set());
  }

  // Filter periods
  const filteredPeriods = periods.filter(p => {
    const name = p.period_name.toLowerCase();
    const matchesSearch = searchTerm ? name.includes(searchTerm.toLowerCase()) : true;
    const matchesGrade = filterGrade ? name.includes(`${filterGrade}°`) : true;
    const matchesSection = filterSection ? name.includes(filterSection.toUpperCase()) : true;
    const matchesYear = filterYear ? name.includes(filterYear) : true;
    const matchesPeriodNum = filterPeriodNum ? name.startsWith(getPeriodName(filterPeriodNum)) : true;
    
    return matchesSearch && matchesGrade && matchesSection && matchesYear && matchesPeriodNum;
  });

  // Manual entry helpers
  function addRow() {
    setManualGrades([...manualGrades, { studentCode: "", studentName: "", scores: {} }]);
  }

  function removeRow(index) {
    if (manualGrades.length > 1) {
      setManualGrades(manualGrades.filter((_, i) => i !== index));
    }
  }

  function updateRow(index, field, value) {
    const updated = [...manualGrades];
    if (field === "studentCode" || field === "studentName") {
      updated[index][field] = value;
    } else {
      updated[index].scores[field] = value;
    }
    setManualGrades(updated);
  }

  function addAssessmentColumn() {
    const newColName = prompt("Nombre de la nueva evaluación:", `Quiz ${assessmentColumns.length + 1}`);
    if (newColName && newColName.trim()) {
      setAssessmentColumns([...assessmentColumns, newColName.trim()]);
    }
  }

  function removeAssessmentColumn(colName) {
    if (assessmentColumns.length <= 1) {
      showToast("Debe haber al menos una columna de evaluación", "warning");
      return;
    }

    setAssessmentColumns(assessmentColumns.filter(c => c !== colName));
    setManualGrades(manualGrades.map(g => {
      const newScores = { ...g.scores };
      delete newScores[colName];
      return { ...g, scores: newScores };
    }));
  }

  function calculateAverage(scores) {
    const validScores = Object.values(scores).filter(s => s !== "" && !isNaN(parseFloat(s)));
    if (validScores.length === 0) return 0;
    const sum = validScores.reduce((acc, s) => acc + parseFloat(s), 0);
    return (sum / validScores.length).toFixed(2);
  }

  // Edit mode functions
  function startEditing() {
    setEditMode(true);
    setEditedGrades(grades.map(g => ({
      ...g,
      assessments: { ...g.assessments }
    })));
  }

  function cancelEditing() {
    setEditMode(false);
    setEditedGrades([]);
  }

  function updateEditedGrade(index, field, value) {
    const updated = [...editedGrades];
    if (field === "student_code" || field === "student_name") {
      updated[index][field] = value;
    } else {
      if (value === "" || value === null || value === undefined) {
        delete updated[index].assessments[field];
      } else {
        const scoreValue = parseFloat(value);
        if (!isNaN(scoreValue)) {
          updated[index].assessments[field] = scoreValue;
        }
      }
    }
    
    const scores = Object.values(updated[index].assessments).filter(s => 
      typeof s === 'number' && !isNaN(s) && s >= 0 && s <= 5
    );
    const avg = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
    updated[index].score = parseFloat(avg.toFixed(2));
    
    setEditedGrades(updated);
  }

  function addNewStudent() {
    const newStudent = {
      id: `temp_${Date.now()}`,
      student_code: "",
      student_name: "",
      assessments: {},
      score: 0,
      isNew: true
    };
    setEditedGrades([...editedGrades, newStudent]);
  }

  function removeEditedGrade(index) {
    setEditedGrades(editedGrades.filter((_, i) => i !== index));
  }

  async function saveEdits() {
    setLoading(true);
    
    try {
      const authHeader = await getAuthHeader();
      
      const newStudents = editedGrades.filter(g => g.isNew && g.student_code.trim() && g.student_name.trim());
      const existingStudents = editedGrades.filter(g => !g.isNew);
      
      for (const grade of existingStudents) {
        const response = await fetch(`${API_BASE}/api/grades/${grade.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeader,
          },
          body: JSON.stringify({
            score: grade.score,
            assessments: grade.assessments
          }),
        });
        
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Error al actualizar calificación");
        }
      }
      
      if (newStudents.length > 0) {
        const gradesToInsert = newStudents.map(g => ({
          student_code: g.student_code,
          student_name: g.student_name,
          assessments: g.assessments,
          score: g.score
        }));
        
        const response = await fetch(`${API_BASE}/api/grades/period/${selectedPeriod}/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader,
          },
          body: JSON.stringify({
            teacherId,
            grades: gradesToInsert
          }),
        });
        
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Error al agregar estudiantes");
        }
      }
      
      showToast(`Cambios guardados: ${existingStudents.length} actualizados, ${newStudents.length} nuevos`, "success");
      setEditMode(false);
      setEditedGrades([]);
      await fetchGrades(selectedPeriod);
      
    } catch (error) {
      console.error("Save edits error:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "1rem" : "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h2 style={{ fontSize: isMobile ? "24px" : "32px", marginBottom: "0.5rem", color: "#2c3e50" }}>
        Gestión de Calificaciones
      </h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Administra calificaciones, sube archivos o ingrésalas manualmente
      </p>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "2px solid #f0f0f0",
        flexWrap: "wrap"
      }}>
        {["view", "upload", "manual"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: isMobile ? "0.65rem 1.25rem" : "0.75rem 1.5rem",
              border: "none",
              background: activeTab === tab 
                ? "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)" 
                : "transparent",
              color: activeTab === tab ? "white" : "#666",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              fontWeight: activeTab === tab ? "600" : "500",
              fontSize: isMobile ? "14px" : "15px",
              transition: "all 0.2s ease",
              boxShadow: activeTab === tab ? "0 -2px 8px rgba(25, 118, 210, 0.3)" : "none"
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) e.target.style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) e.target.style.background = "transparent";
            }}
          >
            {tab === "view" ? "Ver Calificaciones" : tab === "upload" ? "Subir Archivo" : "Entrada Manual"}
          </button>
        ))}
      </div>

      {/* View Tab */}
      {activeTab === "view" && (
        <div>
          {/* Loading State */}
          {loading && periods.length === 0 && (
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)" }}>
              <SkeletonCard height="150px" />
              <SkeletonCard height="150px" />
            </div>
          )}

          {/* Empty State */}
          {!loading && periods.length === 0 && (
            <EmptyState
              icon="📋"
              title="No hay períodos registrados"
              message="Comienza subiendo un archivo con calificaciones o usa la entrada manual para agregar un nuevo período."
              actionText="Subir Archivo"
              onAction={() => setActiveTab("upload")}
              color="#1976D2"
            />
          )}

          {/* Periods List with Filters */}
          {periods.length > 0 && (
            <div style={{
              background: "white",
              padding: isMobile ? "1rem" : "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              {/* Filters Section */}
              <div style={{
                marginBottom: "1.5rem",
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "2px solid #e9ecef"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem"
                }}>
                  <h4 style={{ margin: 0, color: "#1976d2", fontSize: "16px" }}>
                    🔍 Filtros
                  </h4>
                  <button
                    onClick={() => {
                      setFilterGrade("");
                      setFilterSection("");
                      setFilterYear("");
                      setFilterPeriodNum("");
                      setSearchTerm("");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "2px solid #1976d2",
                      background: "white",
                      color: "#1976d2",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}
                  >
                    Limpiar
                  </button>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.5rem"
                }}>
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  />
                  <select
                    value={filterPeriodNum}
                    onChange={(e) => setFilterPeriodNum(e.target.value)}
                    style={{
                      padding: "0.65rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="">Todos los períodos</option>
                    <option value="1">Primer Período</option>
                    <option value="2">Segundo Período</option>
                    <option value="3">Tercer Período</option>
                    <option value="4">Cuarto Período</option>
                  </select>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "6px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="">Todos los grados</option>
                    {[3,4,5,6,7,8,9,10,11].map(g => (
                      <option key={g} value={g}>{g}°</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Sección (A, B...)"
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value.toUpperCase())}
                    maxLength="2"
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      textTransform: "uppercase",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Año"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      // width: "155px"
                    }}
                  />
                </div>

                <div style={{ marginTop: "0.75rem", fontSize: "13px", color: "#666" }}>
                  Mostrando {filteredPeriods.length} de {periods.length} períodos
                </div>
              </div>

              {/* Bulk Actions Bar */}
              <div style={{
                marginBottom: "1rem",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center"
              }}>
                {!bulkSelectMode ? (
                  <button
                    onClick={() => setBulkSelectMode(true)}
                    style={{
                      padding: "0.65rem 1.25rem",
                      border: "2px solid #1976d2",
                      background: "white",
                      color: "#1976d2",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    ☑️ Selección Múltiple
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setBulkSelectMode(false);
                        clearSelection();
                      }}
                      style={{
                        padding: "0.65rem 1.25rem",
                        border: "2px solid #666",
                        background: "white",
                        color: "#666",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}
                    >
                      ✖️ Cancelar
                    </button>
                    <button
                      onClick={selectAllPeriods}
                      style={{
                        padding: "0.65rem 1.25rem",
                        border: "2px solid #1976d2",
                        background: "white",
                        color: "#1976d2",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}
                    >
                      Seleccionar Todos ({filteredPeriods.length})
                    </button>
                    <button
                      onClick={clearSelection}
                      disabled={selectedPeriods.size === 0}
                      style={{
                        padding: "0.65rem 1.25rem",
                        border: "2px solid #666",
                        background: "white",
                        color: "#666",
                        borderRadius: "8px",
                        cursor: selectedPeriods.size === 0 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        opacity: selectedPeriods.size === 0 ? 0.5 : 1
                      }}
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={() => setBulkDeleteModal({ show: true })}
                      disabled={selectedPeriods.size === 0}
                      style={{
                        padding: "0.65rem 1.25rem",
                        border: "none",
                        background: selectedPeriods.size === 0 ? "#ccc" : "#d32f2f",
                        color: "white",
                        borderRadius: "8px",
                        cursor: selectedPeriods.size === 0 ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}
                    >
                      Eliminar Seleccionados ({selectedPeriods.size})
                    </button>
                  </>
                )}
              </div>

              {/* Period Selector */}
              {!bulkSelectMode && (
                <div style={{
                  display: "flex",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                  alignItems: "flex-end",
                  flexWrap: "wrap"
                }}>
                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#666" }}>
                      Seleccionar período:
                    </label>
                    <select
                      value={selectedPeriod || ""}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      style={{
                        width: "94%",
                        padding: "0.85rem",
                        border: "2px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "15px",
                        fontWeight: "500",
                        cursor: "pointer",
                        height: "48px"
                      }}
                    >
                      {filteredPeriods.map(p => (
                        <option key={p.id} value={p.id}>{p.period_name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      const period = periods.find(p => p.id === selectedPeriod);
                      setDeleteModal({ 
                        show: true, 
                        periodId: selectedPeriod, 
                        periodName: period?.period_name || "" 
                      });
                    }}
                    disabled={loading || !selectedPeriod}
                    style={{
                      padding: "0.85rem 1.5rem",
                      border: "none",
                      background: loading || !selectedPeriod ? "#ccc" : "#d32f2f",
                      color: "white",
                      borderRadius: "8px",
                      cursor: loading || !selectedPeriod ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      fontSize: "15px"
                    }}
                  >
                    Eliminar Período
                  </button>
                </div>
              )}

              {/* Periods Grid (Bulk Select Mode) */}
              {bulkSelectMode && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.5rem"
                }}>
                  {filteredPeriods.map(p => (
                    <div
                      key={p.id}
                      onClick={() => togglePeriodSelection(p.id)}
                      style={{
                        padding: "1rem",
                        border: selectedPeriods.has(p.id) ? "3px solid #1976d2" : "2px solid #e0e0e0",
                        borderRadius: "8px",
                        cursor: "pointer",
                        background: selectedPeriods.has(p.id) ? "#e3f2fd" : "white",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem"
                      }}
                    >
                      <div style={{
                        width: "24px",
                        height: "24px",
                        border: "2px solid #1976d2",
                        borderRadius: "4px",
                        background: selectedPeriods.has(p.id) ? "#1976d2" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {selectedPeriods.has(p.id) && (
                          <span style={{ color: "white", fontSize: "16px" }}>✓</span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "#2c3e50", marginBottom: "0.25rem" }}>
                          {p.period_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {new Date(p.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grades Table */}
              {!bulkSelectMode && selectedPeriod && (
                <>
                  {loading ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                      <SkeletonCard height="300px" />
                    </div>
                  ) : grades.length === 0 ? (
                    <EmptyState
                      icon="📊"
                      title="No hay calificaciones"
                      message="Este período no tiene calificaciones registradas todavía."
                      color="#1976D2"
                    />
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      {/* Action Buttons */}
                      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {!editMode ? (
                          <button
                            onClick={startEditing}
                            style={{
                              padding: "0.65rem 1.25rem",
                              border: "2px solid #1976d2",
                              background: "white",
                              color: "#1976d2",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "600"
                            }}
                          >
                            ✏️ Editar Calificaciones
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={addNewStudent}
                              style={{
                                padding: "0.65rem 1.25rem",
                                border: "2px solid #4caf50",
                                background: "white",
                                color: "#4caf50",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "600"
                              }}
                            >
                              + Agregar Estudiante
                            </button>
                            <button
                              onClick={saveEdits}
                              disabled={loading}
                              style={{
                                padding: "0.65rem 1.25rem",
                                border: "none",
                                background: loading ? "#ccc" : "#4caf50",
                                color: "white",
                                borderRadius: "8px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: "600"
                              }}
                            >
                              💾 Guardar Cambios
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={loading}
                              style={{
                                padding: "0.65rem 1.25rem",
                                border: "2px solid #666",
                                background: "white",
                                color: "#666",
                                borderRadius: "8px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: "600"
                              }}
                            >
                              ✖️ Cancelar
                            </button>
                          </>
                        )}
                      </div>

                      {/* Table */}
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead style={{ background: "#f8f9fa", position: "sticky", top: 0 }}>
                          <tr>
                            <th style={{ padding: "0.85rem", textAlign: "left", borderBottom: "2px solid #e0e0e0", fontWeight: "600" }}>
                              Código
                            </th>
                            <th style={{ padding: "0.85rem", textAlign: "left", borderBottom: "2px solid #e0e0e0", fontWeight: "600" }}>
                              Nombre
                            </th>
                            {assessmentColumns.map(col => (
                              <th key={col} style={{ padding: "0.85rem", textAlign: "center", borderBottom: "2px solid #e0e0e0", fontWeight: "600" }}>
                                {col}
                              </th>
                            ))}
                            <th style={{ padding: "0.85rem", textAlign: "center", borderBottom: "2px solid #e0e0e0", fontWeight: "700", color: "#1976d2" }}>
                              Promedio
                            </th>
                            <th style={{ padding: "0.85rem", textAlign: "center", borderBottom: "2px solid #e0e0e0", fontWeight: "600" }}>
                              Estado
                            </th>
                            {editMode && (
                              <th style={{ padding: "0.85rem", textAlign: "center", borderBottom: "2px solid #e0e0e0", width: "60px" }}>
                                
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(editMode ? editedGrades : grades).map((grade, index) => {
                            const score = grade.score || 0;
                            const isPassing = score >= 3.0;
                            const assessments = grade.assessments || {};

                            return (
                              <tr key={grade.id} style={{ background: index % 2 === 0 ? "white" : "#f9f9f9" }}>
                                <td style={{ padding: "0.85rem", borderBottom: "1px solid #e9ecef" }}>
                                  {editMode ? (
                                    <input
                                      type="text"
                                      value={grade.student_code}
                                      onChange={(e) => updateEditedGrade(index, "student_code", e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: "2px solid #e0e0e0",
                                        borderRadius: "6px",
                                        fontSize: "14px"
                                      }}
                                    />
                                  ) : (
                                    grade.student_code
                                  )}
                                </td>
                                <td style={{ padding: "0.85rem", borderBottom: "1px solid #e9ecef" }}>
                                  {editMode ? (
                                    <input
                                      type="text"
                                      value={grade.student_name}
                                      onChange={(e) => updateEditedGrade(index, "student_name", e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "0.5rem",
                                        border: "2px solid #e0e0e0",
                                        borderRadius: "6px",
                                        fontSize: "14px"
                                      }}
                                    />
                                  ) : (
                                    grade.student_name
                                  )}
                                </td>
                                {assessmentColumns.map(col => (
                                  <td key={col} style={{ padding: "0.85rem", textAlign: "center", borderBottom: "1px solid #e9ecef" }}>
                                    {editMode ? (
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="5"
                                        value={assessments[col] !== undefined ? assessments[col] : ""}
                                        onChange={(e) => updateEditedGrade(index, col, e.target.value)}
                                        placeholder="0.0"
                                        style={{
                                          width: "100%",
                                          padding: "0.5rem",
                                          border: "2px solid #e0e0e0",
                                          borderRadius: "6px",
                                          fontSize: "14px",
                                          textAlign: "center"
                                        }}
                                      />
                                    ) : (
                                      assessments[col] !== undefined ? parseFloat(assessments[col]).toFixed(1) : "—"
                                    )}
                                  </td>
                                ))}
                                <td style={{
                                  padding: "0.85rem",
                                  textAlign: "center",
                                  borderBottom: "1px solid #e9ecef",
                                  fontWeight: "700",
                                  fontSize: "16px",
                                  color: isPassing ? "#4caf50" : "#d32f2f"
                                }}>
                                  {score > 0 ? score.toFixed(2) : "—"}
                                </td>
                                <td style={{ padding: "0.85rem", textAlign: "center", borderBottom: "1px solid #e9ecef" }}>
                                  {score > 0 ? (
                                    <span style={{
                                      padding: "0.35rem 0.85rem",
                                      borderRadius: "16px",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      background: isPassing ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)" : "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
                                      color: isPassing ? "#2e7d32" : "#c62828"
                                    }}>
                                      {isPassing ? "✓ Aprobado" : "✗ Reprobado"}
                                    </span>
                                  ) : "—"}
                                </td>
                                {editMode && (
                                  <td style={{ padding: "0.85rem", borderBottom: "1px solid #e9ecef", textAlign: "center" }}>
                                    <button
                                      onClick={() => removeEditedGrade(index)}
                                      style={{
                                        padding: "0.5rem",
                                        border: "none",
                                        background: "#ffebee",
                                        color: "#d32f2f",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "16px"
                                      }}
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Statistics */}
                      {!editMode && (
                        <div style={{
                          marginTop: "1.5rem",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                          gap: "1rem"
                        }}>
                          <div style={{ 
                            padding: "1.25rem", 
                            background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", 
                            borderRadius: "12px", 
                            textAlign: "center",
                            border: "2px solid #1976d2"
                          }}>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#1976d2" }}>
                              {grades.length}
                            </div>
                            <div style={{ fontSize: "14px", color: "#666", marginTop: "0.25rem", fontWeight: "500" }}>
                              Total Estudiantes
                            </div>
                          </div>
                          <div style={{ 
                            padding: "1.25rem", 
                            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
                            borderRadius: "12px", 
                            textAlign: "center",
                            border: "2px solid #4caf50"
                          }}>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#4caf50" }}>
                              {grades.filter(g => g.score >= 3.0).length}
                            </div>
                            <div style={{ fontSize: "14px", color: "#666", marginTop: "0.25rem", fontWeight: "500" }}>
                              Aprobados
                            </div>
                          </div>
                          <div style={{ 
                            padding: "1.25rem", 
                            background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)", 
                            borderRadius: "12px", 
                            textAlign: "center",
                            border: "2px solid #d32f2f"
                          }}>
                            <div style={{ fontSize: "32px", fontWeight: "700", color: "#d32f2f" }}>
                              {grades.filter(g => g.score < 3.0).length}
                            </div>
                            <div style={{ fontSize: "14px", color: "#666", marginTop: "0.25rem", fontWeight: "500" }}>
                              Reprobados
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div style={{
          background: "white",
          padding: isMobile ? "1rem" : "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          position: "relative"
        }}>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#2c3e50", fontSize: isMobile ? "20px" : "24px" }}>
              Subir Archivo de Calificaciones
            </h3>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              Sube archivos Excel, PDF o imágenes con las calificaciones de tus estudiantes
            </p>
          </div>

          {/* Shared Period Info Section */}
          <div style={{ 
            marginBottom: "2rem", 
            padding: isMobile ? "1rem" : "1.5rem", 
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", 
            borderRadius: "12px",
            border: "2px solid #dee2e6"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "1rem", 
              fontWeight: "600", 
              fontSize: "16px",
              color: "#1976d2",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              Información del Período
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
              gap: "1rem"
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Número de Período
                </label>
                <select
                  value={periodNumber}
                  onChange={(e) => setPeriodNumber(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px"
                  }}
                >
                  <option value="1">Primer</option>
                  <option value="2">Segundo</option>
                  <option value="3">Tercer</option>
                  <option value="4">Cuarto</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Grado *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px"
                  }}
                >
                  <option value="">Seleccionar</option>
                  {[3,4,5,6,7,8,9,10,11].map(g => (
                    <option key={g} value={g}>{g}°</option>
                  ))}
                </select>
                {!grade && manualGrades.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "12px", color: "#d32f2f" }}>
                    Campo requerido
                  </p>
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Curso *
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value.toUpperCase())}
                  placeholder="A, B, 1, 2..."
                  maxLength="2"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    textTransform: "uppercase"
                  }}
                />
                {!grade && manualGrades.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "12px", color: "#d32f2f" }}>
                    Campo requerido
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="manual-year-input" style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Año
                </label>
                <input
                  id="manual-year-input"
                  type="number"
                  value={year}
                  disabled
                  aria-label="Año del período (auto-completado)"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    background: "#f5f5f5",
                    color: "#666",
                    cursor: "not-allowed"
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            {grade && section && (
              <div style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#e3f2fd",
                borderRadius: "8px",
                fontSize: "14px"
              }}>
                <strong style={{ color: "#1976d2" }}>Vista previa del nombre:</strong>{" "}
                <span style={{ fontWeight: "600" }}>
                  {generatePeriodName()}
                </span>
              </div>
            )}
          </div>

          {/* Format Recommendations */}
          <div style={{ 
            marginBottom: "1.5rem", 
            padding: isMobile ? "1rem" : "1.5rem", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "12px",
            border: "2px solid #e9ecef"
          }}>
            <h4 style={{ 
              marginTop: 0, 
              marginBottom: "1rem", 
              color: "#1976d2",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              Formatos Recomendados
            </h4>

            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", 
                borderRadius: "8px",
                border: "2px solid #4caf50"
              }}>
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
                  <span style={{ fontSize: "20px" }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#2e7d32", fontSize: "15px" }}>Excel (.xlsx, .xls)</strong>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "14px", color: "#1b5e20", lineHeight: "1.5" }}>
                      <strong>Mejor opción</strong> - 100% de precisión. Formato: CODIGO | NOMBRE | Evaluación1 | Evaluación2 | ...
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", 
                borderRadius: "8px",
                border: "2px solid #1976d2"
              }}>
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
                  <span style={{ fontSize: "20px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#1565c0", fontSize: "15px" }}>PDF con texto seleccionable</strong>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "14px", color: "#0d47a1", lineHeight: "1.5" }}>
                      Excelente precisión para PDFs generados digitalmente (no escaneados)
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", 
                borderRadius: "8px",
                border: "2px solid #ff9800"
              }}>
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
                  <span style={{ fontSize: "20px" }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#e65100", fontSize: "15px" }}>Imágenes (PNG/JPG) - Solo texto impreso</strong>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "14px", color: "#e65100", lineHeight: "1.5" }}>
                      Funciona solo con texto impreso claro. Requiere buena iluminación y resolución alta (mín. 300 DPI)
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: "1rem", 
                background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)", 
                borderRadius: "8px",
                border: "2px solid #d32f2f",
                borderLeft: "6px solid #d32f2f"
              }}>
                <div style={{ display: "flex", alignItems: "start", gap: "0.75rem" }}>
                  <span style={{ fontSize: "20px" }}>❌</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#c62828", fontSize: "15px" }}>Formularios Escritos a Mano</strong>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "14px", color: "#b71c1c", lineHeight: "1.5" }}>
                      Para formularios físicos escritos a mano, usa la pestaña{" "}
                      <strong style={{ 
                        padding: "0.15rem 0.5rem", 
                        background: "#fff", 
                        borderRadius: "4px",
                        border: "1px solid #d32f2f"
                      }}>
                        Entrada Manual
                      </strong>{" "}
                      para transcribir las calificaciones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleFileUpload}>
            {/* Type Selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "0.75rem", 
                fontWeight: "600",
                fontSize: "15px",
                color: "#495057"
              }}>
                Tipo de archivo:
              </label>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", 
                gap: "1rem"
              }}>
                {[
                  { value: "excel", label: "Excel", color: "#4caf50" },
                  { value: "pdf", label: "PDF", color: "#1976d2" },
                  { value: "image", label: "Imagen", color: "#ff9800" }
                ].map(type => (
                  <label
                    key={type.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "1rem",
                      border: `3px solid ${uploadType === type.value ? type.color : "#e9ecef"}`,
                      borderRadius: "12px",
                      cursor: processing ? "not-allowed" : "pointer",
                      background: uploadType === type.value 
                        ? `linear-gradient(135deg, ${type.color}15 0%, ${type.color}25 100%)` 
                        : "white",
                      transition: "all 0.2s ease",
                      opacity: processing ? 0.6 : 1
                    }}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      checked={uploadType === type.value}
                      onChange={(e) => {
                        setUploadType(e.target.value);
                        setUploadFile(null);
                      }}
                      disabled={processing}
                      style={{ 
                        width: "20px", 
                        height: "20px", 
                        cursor: processing ? "not-allowed" : "pointer",
                        accentColor: type.color
                      }}
                      aria-label={`Seleccionar tipo ${type.label}`}
                    />
                    <span style={{ fontSize: "24px" }}>{type.icon}</span>
                    <span style={{ 
                      fontWeight: "600", 
                      fontSize: "15px",
                      color: uploadType === type.value ? type.color : "#495057"
                    }}>
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Input */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="file-upload" style={{ 
                display: "block", 
                marginBottom: "0.75rem", 
                fontWeight: "600",
                fontSize: "15px",
                color: "#495057"
              }}>
                Seleccionar archivo:
              </label>
              <input
                id="file-upload"
                type="file"
                accept={
                  uploadType === "excel" ? ".xlsx,.xls" :
                  uploadType === "pdf" ? ".pdf" :
                  ".jpg,.jpeg,.png"
                }
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    if (file.size > maxSize) {
                      showToast("El archivo es demasiado grande. Máximo 10MB.", "error");
                      e.target.value = "";
                      return;
                    }
                    setUploadFile(file);
                    showToast(`Archivo "${file.name}" cargado`, "success");
                  }
                }}
                disabled={processing}
                aria-label="Seleccionar archivo para subir"
                style={{
                  width: "100%",
                  padding: "1.5rem",
                  border: `3px dashed ${uploadFile ? "#4caf50" : "#ced4da"}`,
                  borderRadius: "12px",
                  cursor: processing ? "not-allowed" : "pointer",
                  background: uploadFile 
                    ? "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)" 
                    : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                  fontSize: "15px",
                  transition: "all 0.2s ease",
                  opacity: processing ? 0.6 : 1
                }}
              />
              {uploadFile && (
                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "#fff",
                  border: "2px solid #4caf50",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                    <span style={{ fontSize: "24px" }}>
                      {uploadType === "excel" ? "📊" : uploadType === "pdf" ? "📄" : "🖼️"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: "600", 
                        color: "#2c3e50",
                        fontSize: "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {uploadFile.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "0.25rem" }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadFile(null);
                      document.getElementById("file-upload").value = "";
                    }}
                    disabled={processing}
                    aria-label="Eliminar archivo seleccionado"
                    style={{
                      padding: "0.5rem",
                      border: "none",
                      background: "#ffebee",
                      color: "#d32f2f",
                      borderRadius: "6px",
                      cursor: processing ? "not-allowed" : "pointer",
                      fontSize: "18px",
                      transition: "all 0.2s ease",
                      flexShrink: 0
                    }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {/* Expected Format Info */}
            <div style={{
              padding: isMobile ? "1rem" : "1.25rem",
              background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
              borderRadius: "12px",
              marginBottom: "1.5rem",
              fontSize: "14px",
              border: "2px solid #1976d2"
            }}>
              <strong style={{ 
                color: "#1976d2", 
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem"
              }}>
                <span style={{ fontSize: "24px" }}>💡</span>
                Formato esperado:
              </strong>
              <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem", lineHeight: "1.8" }}>
                <li><strong>Columna 1:</strong> Código del estudiante</li>
                <li><strong>Columna 2:</strong> Nombre del estudiante</li>
                <li><strong>Columnas 3+:</strong> Calificaciones (0.0 - 5.0)</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || !uploadFile || !grade || !section}
              aria-label="Subir y procesar archivo"
              aria-busy={processing}
              style={{
                width: "100%",
                padding: isMobile ? "1rem" : "1.25rem",
                border: "none",
                background: (processing || !uploadFile || !grade || !section)
                  ? "#ccc" 
                  : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
                color: "white",
                borderRadius: "12px",
                cursor: (processing || !uploadFile || !grade || !section) ? "not-allowed" : "pointer",
                fontSize: isMobile ? "15px" : "17px",
                fontWeight: "700",
                transition: "all 0.3s ease",
                boxShadow: (processing || !uploadFile || !grade || !section)
                  ? "none"
                  : "0 4px 12px rgba(25, 118, 210, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem"
              }}
            >
              {processing ? (
                <>
                  <span style={{ 
                    width: "20px", 
                    height: "20px", 
                    border: "3px solid #ffffff40",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <span>Procesando archivo...</span>
                </>
              ) : (
                <>
                  <span>Subir y Procesar Archivo</span>
                </>
              )}
            </button>

            {!uploadFile && (
              <p style={{ 
                marginTop: "0.75rem", 
                textAlign: "center", 
                fontSize: "13px", 
                color: "#666" 
              }}>
                Selecciona un archivo para continuar
              </p>
            )}
            {uploadFile && (!grade || !section) && (
              <p style={{ 
                marginTop: "0.75rem", 
                textAlign: "center", 
                fontSize: "13px", 
                color: "#d32f2f",
                fontWeight: "600"
              }}>
                ⚠️ Completa el grado y la sección para continuar
              </p>
            )}
          </form>

          {/* Processing Overlay */}
          {processing && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              zIndex: 10,
              animation: "fadeIn 0.3s ease"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                border: "6px solid #e3f2fd",
                borderTop: "6px solid #1976d2",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: "20px", 
                  fontWeight: "700", 
                  color: "#1976d2",
                  marginBottom: "0.5rem"
                }}>
                  Procesando archivo...
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                  Esto puede tomar unos momentos
                </p>
              </div>
            </div>
          )}

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
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
      )}

      {/* Manual Entry Tab */}
      {activeTab === "manual" && (
        <div style={{
          background: "white",
          padding: isMobile ? "1rem" : "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          position: "relative"
        }}>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#2c3e50", fontSize: isMobile ? "20px" : "24px" }}>
              Entrada Manual de Calificaciones
            </h3>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
              Ingresa las calificaciones estudiante por estudiante de forma organizada
            </p>
          </div>

          {/* Period Info Section */}
          <div style={{ 
            marginBottom: "2rem", 
            padding: isMobile ? "1rem" : "1.5rem", 
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", 
            borderRadius: "12px",
            border: "2px solid #dee2e6"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "1rem", 
              fontWeight: "600", 
              fontSize: "16px",
              color: "#1976d2",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              Información del Período
            </label>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
              gap: "1rem"
            }}>
              <div>
                <label htmlFor="manual-period-number" style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Número de Período
                </label>
                <select
                  id="manual-period-number"
                  value={periodNumber}
                  onChange={(e) => setPeriodNumber(e.target.value)}
                  disabled={loading}
                  aria-label="Seleccionar número de período"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  <option value="1">Primer</option>
                  <option value="2">Segundo</option>
                  <option value="3">Tercer</option>
                  <option value="4">Cuarto</option>
                </select>
              </div>
              <div>
                <label htmlFor="manual-grade-select" style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Grado *
                </label>
                <select
                  id="manual-grade-select"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  disabled={loading}
                  aria-required="true"
                  aria-label="Seleccionar grado"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  <option value="">Seleccionar</option>
                  {[3,4,5,6,7,8,9,10,11].map(g => (
                    <option key={g} value={g}>{g}°</option>
                  ))}
                </select>
                {!grade && manualGrades.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "12px", color: "#d32f2f" }}>
                    Campo requerido
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="manual-section-input" style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Curso *
                </label>
                <input
                  id="manual-section-input"
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value.toUpperCase())}
                  placeholder="A, B, 1, 2..."
                  maxLength="2"
                  disabled={loading}
                  aria-required="true"
                  aria-label="Ingresar sección del curso"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    textTransform: "uppercase",
                    cursor: loading ? "not-allowed" : "text",
                    opacity: loading ? 0.6 : 1
                  }}
                />
                {!section && manualGrades.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "12px", color: "#d32f2f" }}>
                    Campo requerido
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="manual-year-input" style={{ display: "block", marginBottom: "0.25rem", fontSize: "13px", color: "#666" }}>
                  Año
                </label>
                <input
                  id="manual-year-input"
                  type="number"
                  value={year}
                  disabled
                  aria-label="Año del período (auto-completado)"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    fontSize: "15px",
                    background: "#f5f5f5",
                    color: "#666",
                    cursor: "not-allowed"
                  }}
                />
              </div>
            </div>

            {grade && section && (
              <div style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#e3f2fd",
                borderRadius: "8px",
                fontSize: "14px"
              }}>
                <strong style={{ color: "#1976d2" }}>Vista previa del nombre:</strong>{" "}
                <span style={{ fontWeight: "600" }}>
                  {generatePeriodName()}
                </span>
              </div>
            )}
          </div>

          {/* Assessment Columns Manager */}
          <div style={{
            marginBottom: "1.5rem",
            padding: isMobile ? "1rem" : "1.5rem",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
            borderRadius: "12px",
            border: "2px solid #dee2e6"
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "1rem", 
              fontWeight: "600",
              fontSize: "16px",
              color: "#1976d2",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              Columnas de Evaluación
            </label>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap", 
              gap: "0.75rem", 
              marginBottom: "1rem",
              animation: "slideIn 0.3s ease"
            }}>
              {assessmentColumns.map((col, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.65rem 1rem",
                    background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
                    border: "2px solid #1976d2",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1976d2",
                    boxShadow: "0 2px 4px rgba(25, 118, 210, 0.1)"
                  }}
                >
                  <span>{col}</span>
                  {assessmentColumns.length > 1 && (
                    <button
                      onClick={() => removeAssessmentColumn(col)}
                      disabled={loading}
                      aria-label={`Eliminar columna ${col}`}
                      style={{
                        border: "none",
                        background: "#ffebee",
                        color: "#d32f2f",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "16px",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontWeight: "700",
                        transition: "all 0.2s ease",
                        opacity: loading ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.background = "#d32f2f";
                          e.target.style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "#ffebee";
                        e.target.style.color = "#d32f2f";
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addAssessmentColumn}
              disabled={loading}
              aria-label="Agregar nueva columna de evaluación"
              style={{
                padding: "0.65rem 1.25rem",
                border: "2px solid #1976d2",
                background: "white",
                color: "#1976d2",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s ease",
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#1976d2";
                  e.target.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "white";
                e.target.style.color = "#1976d2";
              }}
            >
              + Agregar Columna
            </button>
            <p style={{ margin: "0.75rem 0 0 0", fontSize: "13px", color: "#666", lineHeight: "1.5" }}>
              💡 <strong>Consejo:</strong> Agrega columnas para cada evaluación (Quiz 1, Taller 1, Examen, etc.)
            </p>
          </div>

          {/* Grades Table */}
          {manualGrades.length === 0 ? (
            <div style={{
              padding: isMobile ? "2rem 1rem" : "3rem 2rem",
              textAlign: "center",
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              borderRadius: "12px",
              border: "2px dashed #dee2e6",
              marginBottom: "1.5rem"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "1rem" }}>✍️</div>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#2c3e50", fontSize: "18px" }}>
                Comienza a agregar estudiantes
              </h4>
              <p style={{ margin: 0, color: "#666", fontSize: "14px", lineHeight: "1.6" }}>
                Haz clic en "+ Agregar Estudiante" para comenzar a ingresar las calificaciones
              </p>
            </div>
          ) : (
            <div style={{ 
              overflowX: "auto", 
              marginBottom: "1rem",
              borderRadius: "12px",
              border: "2px solid #dee2e6",
              background: "white"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "800px" }}>
                <thead style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "3px solid #1976d2", minWidth: "120px", fontWeight: "600", color: "#2c3e50" }}>
                      Código
                    </th>
                    <th style={{ padding: "1rem", textAlign: "left", borderBottom: "3px solid #1976d2", minWidth: "200px", fontWeight: "600", color: "#2c3e50" }}>
                      Nombre
                    </th>
                    {assessmentColumns.map(col => (
                      <th key={col} style={{ padding: "1rem", textAlign: "center", borderBottom: "3px solid #1976d2", minWidth: "100px", fontWeight: "600", color: "#2c3e50" }}>
                        {col}
                      </th>
                    ))}
                    <th style={{ padding: "1rem", textAlign: "center", borderBottom: "3px solid #1976d2", minWidth: "100px", fontWeight: "700", color: "#1976d2" }}>
                      Promedio
                    </th>
                    <th style={{ padding: "1rem", textAlign: "center", borderBottom: "3px solid #1976d2", width: "80px" }}>
                    </th>
                  </tr>
                </thead>
              <tbody>
                {manualGrades.map((row, index) => {
                  const avg = calculateAverage(row.scores);
                  return (
                    <tr key={index} style={{ background: index % 2 === 0 ? "white" : "#f9f9f9" }}>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                        <input
                          type="text"
                          value={row.studentCode}
                          onChange={(e) => updateRow(index, "studentCode", e.target.value)}
                          placeholder="2024001"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px"
                          }}
                        />
                      </td>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                        <input
                          type="text"
                          value={row.studentName}
                          onChange={(e) => updateRow(index, "studentName", e.target.value)}
                          placeholder="Juan Pérez"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "14px"
                          }}
                        />
                      </td>
                      {assessmentColumns.map(col => (
                        <td key={col} style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={row.scores[col] || ""}
                            onChange={(e) => updateRow(index, col, e.target.value)}
                            placeholder="0.0"
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "14px",
                              textAlign: "center"
                            }}
                          />
                        </td>
                      ))}
                      <td style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid #eee",
                        textAlign: "center",
                        fontWeight: "700",
                        fontSize: "15px",
                        color: avg >= 3.0 ? "#4caf50" : "#d32f2f"
                      }}>
                        {avg > 0 ? avg : "—"}
                      </td>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", textAlign: "center" }}>
                        {manualGrades.length > 1 && (
                          <button
                            onClick={() => removeRow(index)}
                            style={{
                              padding: "0.5rem",
                              border: "none",
                              background: "#ffebee",
                              color: "#d32f2f",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "16px"
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            flexWrap: "wrap",
            marginBottom: "1.5rem",
            paddingTop: "1rem",
            borderTop: "2px solid #e9ecef"
          }}>
            <button
              onClick={addRow}
              disabled={loading}
              aria-label="Agregar nuevo estudiante a la tabla"
              style={{
                padding: "0.85rem 1.5rem",
                border: "2px solid #1976d2",
                background: "white",
                color: "#1976d2",
                borderRadius: "10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "all 0.2s ease",
                opacity: loading ? 0.5 : 1,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.background = "#1976d2";
                  e.target.style.color = "white";
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(25, 118, 210, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "white";
                e.target.style.color = "#1976d2";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              + Agregar Estudiante
            </button>

            <button
              onClick={handleManualSave}
              disabled={loading || manualGrades.length === 0 || !grade || !section}
              aria-label="Guardar todas las calificaciones del período"
              aria-busy={loading}
              style={{
                flex: isMobile ? "1 1 100%" : "0 0 auto",
                padding: "0.85rem 2rem",
                border: "none",
                background: (loading || manualGrades.length === 0 || !grade || !section)
                  ? "#ccc" 
                  : "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                color: "white",
                borderRadius: "10px",
                cursor: (loading || manualGrades.length === 0 || !grade || !section) ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "700",
                transition: "all 0.2s ease",
                boxShadow: (loading || manualGrades.length === 0 || !grade || !section)
                  ? "none"
                  : "0 4px 12px rgba(76, 175, 80, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem"
              }}
              onMouseEnter={(e) => {
                if (!loading && manualGrades.length > 0 && grade && section) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 16px rgba(76, 175, 80, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = (loading || manualGrades.length === 0 || !grade || !section)
                  ? "none"
                  : "0 4px 12px rgba(76, 175, 80, 0.3)";
              }}
            >
              {loading ? (
                <>
                  <span style={{ 
                    width: "18px", 
                    height: "18px", 
                    border: "3px solid #ffffff40",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar Período Completo</span>
                </>
              )}
            </button>
          </div>

          {/* Validation Messages */}
          {manualGrades.length === 0 && (
            <p style={{ 
              textAlign: "center", 
              fontSize: "13px", 
              color: "#666",
              padding: "0.75rem",
              background: "#f8f9fa",
              borderRadius: "8px"
            }}>
              Agrega al menos un estudiante para guardar el período
            </p>
          )}
          {manualGrades.length > 0 && (!grade || !section) && (
            <p style={{ 
              textAlign: "center", 
              fontSize: "13px", 
              color: "#d32f2f",
              fontWeight: "600",
              padding: "0.75rem",
              background: "#ffebee",
              borderRadius: "8px",
              border: "1px solid #ffcdd2"
            }}>
              ⚠️ Selecciona un grado y curso para guardar
            </p>
          )}

          {/* Processing Overlay */}
          {loading && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.5rem",
              zIndex: 10,
              animation: "fadeIn 0.3s ease"
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                border: "6px solid #e8f5e9",
                borderTop: "6px solid #4caf50",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: "20px", 
                  fontWeight: "700", 
                  color: "#4caf50",
                  marginBottom: "0.5rem"
                }}>
                  Guardando calificaciones...
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                  Por favor espera mientras procesamos {manualGrades.length} estudiante(s)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, periodId: null, periodName: "" })}
        title="Eliminar Período"
        message={`¿Estás seguro que deseas eliminar "${deleteModal.periodName}" y todas sus calificaciones? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeletePeriod}
        type="danger"
      />

      <Modal
        isOpen={bulkDeleteModal.show}
        onClose={() => setBulkDeleteModal({ show: false })}
        title="Eliminar Múltiples Períodos"
        message={`¿Estás seguro que deseas eliminar ${selectedPeriods.size} período(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        confirmText={`Eliminar ${selectedPeriods.size} Período(s)`}
        cancelText="Cancelar"
        onConfirm={confirmBulkDelete}
        type="danger"
      />

      <Modal
        isOpen={confirmUploadModal.show}
        onClose={() => !processing && setConfirmUploadModal({ show: false, data: null })}
        title="Confirmar Subida"
        message={confirmUploadModal.data ? 
          `Se detectaron ${confirmUploadModal.data.gradesCount} estudiantes.\n\nNombre del período: ${confirmUploadModal.data.periodName}\n\n¿Deseas continuar?` 
          : ""
        }
        confirmText={processing ? "Guardando..." : "Confirmar"}
        cancelText="Cancelar"
        onConfirm={confirmUpload}
        type="primary"
        confirmDisabled={processing}
      />

      {/* Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}