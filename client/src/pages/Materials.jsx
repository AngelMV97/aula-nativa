// client/src/pages/Materials.jsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/LoadingSkeleton";
import { useIsMobile } from "../hooks/useMediaQuery";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SUBJECTS = [
  "Todas",
  "Ciencias Naturales",
  "Ciencias Sociales",
  "Educación Artística",
  "Educación Ética y Valores",
  "Educación Física",
  "Lengua Castellana",
  "Inglés",
  "Matemáticas",
  "Tecnología e Informática",
  "Educación Religiosa",
  "Química",
  "Física",
  "Filosofía"
];

export default function Materials() {
  const isMobile = useIsMobile();
  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState("Todas");
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userGrade, setUserGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ show: false, materialId: null, materialName: "" });
  const [reprocessModal, setReprocessModal] = useState({ show: false, materialId: null, materialName: "" });
  const [reprocessing, setReprocessing] = useState(false);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id;
      if (uid) {
        setUserId(uid);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();

        setUserRole(profile?.role || null);

        if (profile?.role === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('grade')
            .eq('user_id', uid)
            .single();
          setUserGrade(student?.grade || null);
        } else {
          setUserGrade(null);
        }
      }
    }
    loadUser();
  }, []);

  const loadMaterials = useCallback(async () => {
    if (!userId || !userRole) return;
    
    setLoading(true);
    try {
      let url = `${API_BASE}/api/materials/public`;
      const params = [];
      
      if (activeTab !== "Todas") {
        params.push(`subject=${encodeURIComponent(activeTab)}`);
      }
      
      if (userRole === "student" && userGrade) {
        params.push(`grade=${userGrade}`);
      }
      
      if (userRole === "teacher" && userId) {
        params.push(`teacherId=${userId}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const resp = await fetch(url);
      if (resp.ok) {
        const json = await resp.json();
        setMaterials(json.materials || []);
      } else {
        showToast("Error al cargar materiales", "error");
      }
    } catch (e) {
      console.error("fetch materials:", e);
      showToast("Error de conexión al cargar materiales", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, userId, userRole, userGrade]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const filteredMaterials = materials.filter((m) =>
    m.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  async function confirmDelete() {
    try {
      const resp = await fetch(`${API_BASE}/api/materials/${deleteModal.materialId}`, { 
        method: "DELETE" 
      });
      
      if (resp.ok) {
        showToast("Material eliminado exitosamente", "success");
        await loadMaterials();
      } else {
        const errorText = await resp.text();
        showToast(`Error al eliminar: ${errorText}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error de conexión al eliminar material", "error");
    } finally {
      setDeleteModal({ show: false, materialId: null, materialName: "" });
    }
  }

  async function confirmReprocess() {
    const materialId = reprocessModal.materialId;
    setReprocessing(true);
    
    try {
      const es = new EventSource(`${API_BASE}/api/process-status/${materialId}`);

      es.addEventListener("status", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("Reprocess status:", data);
        } catch (err) {
          console.error("Invalid status event", err);
        }
      });

      es.addEventListener("done", (e) => {
        console.log("Reprocess done:", e.data);
        es.close();
        setReprocessing(false);
        showToast("Reprocesamiento completado exitosamente", "success");
        loadMaterials();
      });

      es.onerror = (err) => {
        console.error("SSE error during reprocess:", err);
        es.close();
        setReprocessing(false);
        showToast("Error durante el reprocesamiento", "error");
      };

      const resp = await fetch(`${API_BASE}/api/materials/${materialId}/reprocess`, { 
        method: "POST" 
      });

      if (!resp.ok) {
        const txt = await resp.text();
        es.close();
        setReprocessing(false);
        showToast(`Error al reprocesar: ${txt}`, "error");
      }
    } catch (e) {
      console.error(e);
      setReprocessing(false);
      showToast(`Error al reprocesar: ${e.message}`, "error");
    } finally {
      setReprocessModal({ show: false, materialId: null, materialName: "" });
    }
  }

  async function handleDownload(material) {
    try {
      if (!material.storage_path) {
        showToast("Este material no tiene archivo disponible", "warning");
        return;
      }

      const { data, error } = await supabase.storage
        .from("materials")
        .createSignedUrl(material.storage_path, 60);

      if (error) {
        console.error("Error creating signed URL:", error);
        showToast("Error al generar enlace de descarga", "error");
        return;
      }

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = material.file_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      try {
        const { logEvent } = await import("../utils/analyticsClient");
        await logEvent({
          studentId: userId,
          teacherId: material.teacher_id,
          materialId: material.id,
          actionType: "material_downloaded",
          metadata: { file_name: material.file_name },
        });
      } catch (e) {
        console.warn("Failed to log download event:", e);
      }
    } catch (e) {
      console.error("Download error:", e);
      showToast(`Error al descargar: ${e.message}`, "error");
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ 
        padding: isMobile ? "1rem" : "2rem", 
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>
        <h2 style={{ 
          fontSize: isMobile ? "24px" : "32px",
          marginBottom: "1.5rem",
          color: "#2c3e50"
        }}>
          Materiales por Asignatura
        </h2>

        {/* Subject Tabs */}
        <div style={{ 
          display: "flex", 
          gap: 8, 
          flexWrap: "wrap", 
          marginBottom: "1.5rem",
          overflowX: isMobile ? "auto" : "visible"
        }}>
          {SUBJECTS.map((subj) => (
            <button
              key={subj}
              onClick={() => setActiveTab(subj)}
              style={{
                padding: isMobile ? "8px 12px" : "10px 16px",
                borderRadius: 8,
                border: activeTab === subj ? "2px solid #1976d2" : "1px solid #ddd",
                background: activeTab === subj 
                  ? "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)" 
                  : "#fff",
                color: activeTab === subj ? "white" : "#666",
                cursor: "pointer",
                fontSize: isMobile ? "13px" : "14px",
                fontWeight: activeTab === subj ? "600" : "500",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                boxShadow: activeTab === subj ? "0 2px 8px rgba(25, 118, 210, 0.3)" : "none"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== subj) {
                  e.target.style.background = "#f5f5f5";
                  e.target.style.borderColor = "#1976d2";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== subj) {
                  e.target.style.background = "#fff";
                  e.target.style.borderColor = "#ddd";
                }
              }}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Search and Items Per Page */}
        <div style={{ 
          marginBottom: "1.5rem", 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          gap: "1rem", 
          alignItems: isMobile ? "stretch" : "center" 
        }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: isMobile ? "12px" : "10px 14px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s ease"
            }}
            onFocus={(e) => e.target.style.borderColor = "#1976d2"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          />
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label htmlFor="itemsPerPage" style={{ fontSize: "14px", whiteSpace: "nowrap", color: "#666" }}>
                Mostrar:
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "8px", 
                  border: "2px solid #e0e0e0",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div style={{ 
            display: "grid", 
            gap: "1rem",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))"
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <SkeletonCard key={i} height="220px" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredMaterials.length === 0 && (
          <EmptyState
            icon={searchTerm ? "🔍" : "📚"}
            title={searchTerm ? "No se encontraron resultados" : "No hay materiales disponibles"}
            message={
              searchTerm 
                ? `No encontramos materiales que coincidan con "${searchTerm}". Intenta con otros términos de búsqueda.`
                : activeTab !== "Todas"
                ? `Aún no hay materiales en la asignatura de ${activeTab}.`
                : "No hay materiales disponibles en este momento."
            }
            color="#1976D2"
          />
        )}

        {/* Material Cards */}
        {!loading && paginatedMaterials.length > 0 && (
          <>
            <div style={{ 
              display: "grid", 
              gap: "1rem",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))"
            }}>
              {paginatedMaterials.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "white",
                    border: "2px solid #f0f0f0",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    position: "relative",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(25, 118, 210, 0.15)";
                    e.currentTarget.style.borderColor = "#1976d2";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "#f0f0f0";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* File Name */}
                  <div style={{ 
                    fontSize: "16px", 
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    wordBreak: "break-word",
                    paddingRight: userRole === "teacher" ? "40px" : "0",
                    color: "#2c3e50",
                    lineHeight: "1.4"
                  }}>
                    📄 {m.file_name}
                  </div>

                  {/* Metadata */}
                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    gap: "0.5rem",
                    marginBottom: "0.75rem" 
                  }}>
                    <span style={{
                      padding: "5px 10px",
                      background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#1976d2",
                      fontWeight: "500"
                    }}>
                      📚 {m.subject || "—"}
                    </span>
                    <span style={{
                      padding: "5px 10px",
                      background: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#7b1fa2",
                      fontWeight: "500"
                    }}>
                      🎓 {m.grade ? `Grado ${m.grade}` : "Todos"}
                    </span>
                    <span style={{
                      padding: "5px 10px",
                      background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#388e3c",
                      fontWeight: "500"
                    }}>
                      📊 {m.fragment_count} fragmentos
                    </span>
                  </div>

                  {/* Status */}
                  <div style={{ 
                    fontSize: "13px", 
                    color: "#666",
                    marginBottom: "1rem"
                  }}>
                    Estado: <span style={{ 
                      color: m.status === "processed" ? "#388e3c" : "#f57c00",
                      fontWeight: "600",
                      textTransform: "capitalize"
                    }}>
                      {m.status === "processed" ? "✓ Procesado" : "⏳ Procesando"}
                    </span>
                  </div>

                  {/* Actions */}
                  {userRole === "teacher" && userId === m.teacher_id && (
                    <>
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === m.id ? null : m.id)}
                        style={{
                          position: "absolute",
                          top: "1.25rem",
                          right: "1.25rem",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          border: "2px solid #e0e0e0",
                          background: "white",
                          cursor: "pointer",
                          fontSize: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = "#f5f5f5";
                          e.target.style.borderColor = "#1976d2";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "white";
                          e.target.style.borderColor = "#e0e0e0";
                        }}
                      >
                        ⋮
                      </button>
                      
                      {actionMenuOpen === m.id && (
                        <>
                          <div 
                            style={{
                              position: "fixed",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 99
                            }}
                            onClick={() => setActionMenuOpen(null)}
                          />
                          <div style={{
                            position: "absolute",
                            top: "4rem",
                            right: "1.25rem",
                            background: "white",
                            border: "2px solid #f0f0f0",
                            borderRadius: "10px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                            zIndex: 100,
                            minWidth: "170px",
                            overflow: "hidden"
                          }}>
                            <button
                              onClick={() => {
                                setReprocessModal({ 
                                  show: true, 
                                  materialId: m.id, 
                                  materialName: m.file_name 
                                });
                                setActionMenuOpen(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                fontSize: "14px",
                                fontWeight: "500",
                                borderBottom: "1px solid #f0f0f0",
                                color: "#1976d2",
                                transition: "background 0.2s ease"
                              }}
                              onMouseEnter={(e) => e.target.style.background = "#f5f5f5"}
                              onMouseLeave={(e) => e.target.style.background = "transparent"}
                            >
                              🔄 Reprocesar
                            </button>
                            <button
                              onClick={() => {
                                setDeleteModal({ 
                                  show: true, 
                                  materialId: m.id, 
                                  materialName: m.file_name 
                                });
                                setActionMenuOpen(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#d32f2f",
                                transition: "background 0.2s ease"
                              }}
                              onMouseEnter={(e) => e.target.style.background = "#ffebee"}
                              onMouseLeave={(e) => e.target.style.background = "transparent"}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  
                  {userRole === "student" && (
                    <button
                      onClick={() => handleDownload(m)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = "scale(1.02)";
                        e.target.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "scale(1)";
                        e.target.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.3)";
                      }}
                    >
                      Ver/Descargar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1.5rem",
                  background: "white",
                  borderRadius: "12px",
                  border: "2px solid #f0f0f0"
                }}
              >
                <div style={{ fontSize: "14px", color: "#666", fontWeight: "500" }}>
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredMaterials.length)} de{" "}
                  {filteredMaterials.length} materiales
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "10px 18px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      backgroundColor: currentPage === 1 ? "#f5f5f5" : "white",
                      color: currentPage === 1 ? "#999" : "#1976d2",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: isMobile ? "13px" : "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== 1) {
                        e.target.style.background = "#e3f2fd";
                        e.target.style.borderColor = "#1976d2";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 1) {
                        e.target.style.background = "white";
                        e.target.style.borderColor = "#e0e0e0";
                      }
                    }}
                  >
                    ← Anterior
                  </button>
                  <span style={{ 
                    padding: "10px 16px", 
                    fontSize: isMobile ? "13px" : "14px",
                    fontWeight: "600",
                    color: "#2c3e50"
                  }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "10px 18px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      backgroundColor: currentPage === totalPages ? "#f5f5f5" : "white",
                      color: currentPage === totalPages ? "#999" : "#1976d2",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: isMobile ? "13px" : "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== totalPages) {
                        e.target.style.background = "#e3f2fd";
                        e.target.style.borderColor = "#1976d2";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== totalPages) {
                        e.target.style.background = "white";
                        e.target.style.borderColor = "#e0e0e0";
                      }
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, materialId: null, materialName: "" })}
        title="Eliminar Material"
        message={`¿Estás seguro que deseas eliminar "${deleteModal.materialName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        type="danger"
      />

      {/* Reprocess Confirmation Modal */}
      <Modal
        isOpen={reprocessModal.show}
        onClose={() => !reprocessing && setReprocessModal({ show: false, materialId: null, materialName: "" })}
        title="Reprocesar Material"
        message={`¿Deseas reprocesar "${reprocessModal.materialName}"? Esto eliminará los fragmentos existentes y creará nuevos.`}
        confirmText={reprocessing ? "Procesando..." : "Reprocesar"}
        cancelText="Cancelar"
        onConfirm={confirmReprocess}
        type="warning"
        confirmDisabled={reprocessing}
      />

      {/* Toast Notifications */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </>
  );
}