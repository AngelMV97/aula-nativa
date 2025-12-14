import { useState, useEffect, forwardRef, useImperativeHandle } from "react";

const MaterialsTable = forwardRef((props, ref) => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [reprocessing, setReprocessing] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Expose fetchMaterials to parent via ref
  useImperativeHandle(ref, () => ({
    fetchMaterials,
  }));

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Apply filters whenever materials, searchTerm, or statusFilter changes
  useEffect(() => {
    let filtered = materials;

    // Search filter (by file name)
    if (searchTerm.trim()) {
      filtered = filtered.filter((m) =>
        m.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    setFilteredMaterials(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [materials, searchTerm, statusFilter]);

  async function fetchMaterials() {
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE}/api/materials`);
      if (!resp.ok) throw new Error("Failed to fetch materials");
      const data = await resp.json();
      setMaterials(data.materials || []);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(material) {
    setMaterialToDelete(material);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!materialToDelete) return;

    try {
      const resp = await fetch(`${API_BASE}/api/materials/${materialToDelete.id}`, {
        method: "DELETE",
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || "Failed to delete material");
      }

      // Remove from local state
      setMaterials((prev) => prev.filter((m) => m.id !== materialToDelete.id));
      setDeleteModalOpen(false);
      setMaterialToDelete(null);
    } catch (err) {
      console.error("Error deleting material:", err);
      alert(`Error: ${err.message}`);
    }
  }

  async function handleReprocess(material) {
    try {
      setReprocessing((prev) => ({ ...prev, [material.id]: true }));

      const resp = await fetch(`${API_BASE}/api/materials/${material.id}/reprocess`, {
        method: "POST",
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || "Failed to reprocess material");
      }

      alert(`Reprocesando ${material.file_name}...`);
      await fetchMaterials();
    } catch (err) {
      console.error("Error reprocessing material:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setReprocessing((prev) => ({ ...prev, [material.id]: false }));
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return <p>Cargando materiales...</p>;
  }

  return (
    <div style={{ marginTop: "3rem" }}>
      <h3>Materiales Subidos</h3>

      {/* Search and Filter Controls */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por nombre de archivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: "1 1 300px",
            padding: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "0.95rem",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          <option value="all">Todos los estados</option>
          <option value="processed">✅ Procesado</option>
          <option value="processing">⏳ Procesando</option>
          <option value="failed">❌ Error</option>
        </select>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          style={{
            padding: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          <option value={5}>5 por página</option>
          <option value={10}>10 por página</option>
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
        </select>
      </div>

      {/* Results summary */}
      <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
        Mostrando {currentMaterials.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredMaterials.length)} de{" "}
        {filteredMaterials.length} materiales
        {(searchTerm || statusFilter !== "all") && ` (filtrados de ${materials.length} totales)`}
      </p>

      {filteredMaterials.length === 0 ? (
        <p style={{ color: "#666" }}>
          {searchTerm || statusFilter !== "all"
            ? "No se encontraron materiales con los filtros aplicados."
            : "No hay materiales subidos aún."}
        </p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", textAlign: "left" }}>
                <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Archivo</th>
                <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Fecha de Subida</th>
                <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Estado</th>
                <th style={{ padding: "0.75rem", border: "1px solid #ddd" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentMaterials.map((material) => (
                <tr key={material.id}>
                  <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>{material.file_name}</td>
                  <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>
                    {new Date(material.uploaded_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        backgroundColor:
                          material.status === "processed"
                            ? "#d4edda"
                            : material.status === "failed"
                            ? "#f8d7da"
                            : "#fff3cd",
                        color:
                          material.status === "processed"
                            ? "#155724"
                            : material.status === "failed"
                            ? "#721c24"
                            : "#856404",
                      }}
                    >
                      {material.status === "processed" && "✅ Procesado"}
                      {material.status === "failed" && "❌ Error"}
                      {material.status === "processing" && "⏳ Procesando"}
                    </span>
                    {material.fragment_count > 0 && (
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
                        ({material.fragment_count} fragmentos)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem", border: "1px solid #ddd" }}>
                    <button
                      onClick={() => handleDeleteClick(material)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        marginRight: "0.5rem",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      Eliminar
                    </button>
                    {material.status === "failed" && (
                      <button
                        onClick={() => handleReprocess(material)}
                        disabled={reprocessing[material.id]}
                        style={{
                          padding: "0.4rem 0.8rem",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: reprocessing[material.id] ? "not-allowed" : "pointer",
                          fontSize: "0.9rem",
                          opacity: reprocessing[material.id] ? 0.6 : 1,
                        }}
                      >
                        {reprocessing[material.id] ? "Reprocesando..." : "Reprocesar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: currentPage === 1 ? "#f5f5f5" : "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ««
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: currentPage === 1 ? "#f5f5f5" : "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                «
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, current, and 2 pages around current
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  );
                })
                .map((page, idx, arr) => (
                  <span key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span style={{ padding: "0.5rem" }}>...</span>
                    )}
                    <button
                      onClick={() => goToPage(page)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        backgroundColor: currentPage === page ? "#007bff" : "white",
                        color: currentPage === page ? "white" : "black",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: currentPage === page ? "bold" : "normal",
                      }}
                    >
                      {page}
                    </button>
                  </span>
                ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: currentPage === totalPages ? "#f5f5f5" : "white",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                »
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: currentPage === totalPages ? "#f5f5f5" : "white",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                »»
              </button>

              <span style={{ marginLeft: "1rem", fontSize: "0.9rem", color: "#666" }}>
                Página {currentPage} de {totalPages}
              </span>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Confirmar Eliminación</h3>
            <p>
              ¿Estás seguro de que deseas eliminar <strong>{materialToDelete?.file_name}</strong>?
            </p>
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              Esta acción eliminará el material y todos sus fragmentos embeddings. No se puede deshacer.
            </p>
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>    
  );
})

export default MaterialsTable;