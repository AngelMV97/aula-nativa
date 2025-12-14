// client/src/components/FileUploader.jsx
import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useIsMobile } from "../hooks/useMediaQuery";

const SUBJECTS = [
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

function FileUploader({ onUploadSuccess }) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    // Validate file types - Only PDF and DOCX are currently supported
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== newFiles.length) {
      setMessage({ 
        type: "warning", 
        text: "Algunos archivos fueron omitidos. Solo se aceptan PDF y DOCX." 
      });
    } else {
      setMessage({ type: "", text: "" });
    }

    setFiles(validFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    const validFiles = droppedFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== droppedFiles.length) {
      setMessage({ 
        type: "warning", 
        text: "Algunos archivos fueron omitidos. Solo se aceptan PDF y DOCX." 
      });
    } else {
      setMessage({ type: "", text: "" });
    }

    setFiles(validFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
    setMessage({ type: "", text: "" });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const sanitizeFileName = (fileName) => {
    // Remove accents and special characters
    const normalized = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore
    
    return normalized;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage({ type: "error", text: "Selecciona al menos un archivo" });
      return;
    }
    if (!selectedSubject) {
      setMessage({ type: "error", text: "Selecciona una asignatura" });
      return;
    }
    if (!selectedGrade) {
      setMessage({ type: "error", text: "Selecciona un grado" });
      return;
    }

    setUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const materialIds = [];
      for (const file of files) {
        // Sanitize filename to remove special characters
        const sanitizedName = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("materials")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: material, error: insertError } = await supabase
          .from("materials")
          .insert([{
            teacher_id: user.id,
            file_name: file.name, // Keep original name for display
            storage_path: fileName, // Use sanitized name for storage
            status: "processing",
            subject: selectedSubject,
            grade: parseInt(selectedGrade)
          }])
          .select()
          .single();

        // Handle duplicate filename error gracefully
        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            throw new Error(`Ya existe un material con el nombre "${file.name}". Por favor, renómbralo o elimina el anterior.`);
          }
          throw insertError;
        }

        materialIds.push(material.id);

        if (onUploadSuccess) {
          onUploadSuccess(file, material.id);
        }
      }

      await new Promise((r) => setTimeout(r, 100));

      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      materialIds.forEach((id) => formData.append("materialIds[]", id));
      formData.append("subject", selectedSubject);
      formData.append("grade", selectedGrade);

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const resp = await fetch(`${API_BASE}/api/process-materials`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error(await resp.text());

      // setMessage({ type: "success", text: "Archivos subidos y en procesamiento ✓" });
      setFiles([]);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Error al subir archivos" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Grade and Subject Selection */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "1rem",
        marginBottom: "1.5rem"
      }}>
        {/* Grade Selection */}
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: "600",
            color: "#2c3e50"
          }}>
            Grado
          </label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)} 
            disabled={uploading}
            aria-label="Seleccionar grado"
            style={{
              width: "100%",
              padding: isMobile ? "0.75rem" : "0.875rem",
              fontSize: isMobile ? "14px" : "15px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              background: "white",
              color: "#2c3e50",
              cursor: uploading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onFocus={(e) => e.target.style.borderColor = "#1976d2"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          >
            <option value="">Selecciona un grado</option>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
              <option key={g} value={g}>Grado {g}</option>
            ))}
          </select>
        </div>

        {/* Subject Selection */}
        <div>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: "600",
            color: "#2c3e50"
          }}>
            Asignatura
          </label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            disabled={uploading}
            aria-label="Seleccionar asignatura"
            style={{
              width: "100%",
              padding: isMobile ? "0.75rem" : "0.875rem",
              fontSize: isMobile ? "14px" : "15px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              background: "white",
              color: "#2c3e50",
              cursor: uploading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onFocus={(e) => e.target.style.borderColor = "#1976d2"}
            onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          padding: isMobile ? "2rem 1rem" : "3rem 2rem",
          border: isDragging 
            ? "3px dashed #1976d2" 
            : files.length > 0 
              ? "3px dashed #4caf50"
              : "3px dashed #e0e0e0",
          borderRadius: "12px",
          background: isDragging 
            ? "#e3f2fd" 
            : files.length > 0 
              ? "#e8f5e9"
              : "#fafafa",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          marginBottom: "1.5rem"
        }}
        onMouseEnter={(e) => {
          if (!uploading && files.length === 0) {
            e.currentTarget.style.background = "#f5f5f5";
            e.currentTarget.style.borderColor = "#bdbdbd";
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading && files.length === 0 && !isDragging) {
            e.currentTarget.style.background = "#fafafa";
            e.currentTarget.style.borderColor = "#e0e0e0";
          }
        }}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          onChange={handleFileChange} 
          disabled={uploading}
          accept=".pdf,.doc,.docx"
          aria-label="Seleccionar archivos"
          style={{ display: "none" }}
        />
        
        <h4 style={{ 
          margin: "0 0 0.5rem 0", 
          color: "#2c3e50",
          fontSize: isMobile ? "16px" : "18px",
          fontWeight: "700"
        }}>
          {isDragging 
            ? "Suelta los archivos aquí" 
            : files.length > 0 
              ? `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}`
              : "Arrastra archivos aquí o haz clic para seleccionar"}
        </h4>
        
        <p style={{ 
          margin: 0, 
          color: "#666",
          fontSize: isMobile ? "12px" : "13px",
          lineHeight: "1.5"
        }}>
          {files.length === 0 && "Formatos aceptados: PDF y DOCX"}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ 
            margin: "0 0 0.75rem 0",
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: "600",
            color: "#2c3e50"
          }}>
            Archivos seleccionados:
          </h4>
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "0.5rem" 
          }}>
            {files.map((file, index) => (
              <div 
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: isMobile ? "0.75rem" : "1rem",
                  background: "white",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1976d2";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.75rem",
                  flex: 1,
                  minWidth: 0
                }}>
                  <span style={{ fontSize: isMobile ? "24px" : "28px" }}>
                    {getFileIcon(file.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: "600",
                      fontSize: isMobile ? "13px" : "14px",
                      color: "#2c3e50",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {file.name}
                    </div>
                    <div style={{ 
                      fontSize: isMobile ? "11px" : "12px",
                      color: "#666",
                      marginTop: "0.25rem"
                    }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={uploading}
                  aria-label={`Eliminar ${file.name}`}
                  style={{
                    padding: isMobile ? "0.5rem" : "0.625rem",
                    background: "#ffebee",
                    color: "#d32f2f",
                    border: "none",
                    borderRadius: "6px",
                    cursor: uploading ? "not-allowed" : "pointer",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: isMobile ? "32px" : "36px",
                    height: isMobile ? "32px" : "36px"
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.background = "#d32f2f";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffebee";
                    e.currentTarget.style.color = "#d32f2f";
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button 
        onClick={handleUpload} 
        disabled={uploading || files.length === 0 || !selectedGrade}
        aria-label="Subir archivos"
        style={{
          width: "100%",
          padding: isMobile ? "0.875rem" : "1rem",
          background: uploading || files.length === 0 || !selectedGrade
            ? "#e0e0e0"
            : "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: uploading || files.length === 0 || !selectedGrade ? "#999" : "white",
          border: "none",
          borderRadius: "8px",
          fontSize: isMobile ? "15px" : "16px",
          fontWeight: "700",
          cursor: uploading || files.length === 0 || !selectedGrade ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          boxShadow: uploading || files.length === 0 || !selectedGrade
            ? "none"
            : "0 4px 12px rgba(25, 118, 210, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem"
        }}
        onMouseEnter={(e) => {
          if (!uploading && files.length > 0 && selectedGrade) {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(25, 118, 210, 0.4)";
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading && files.length > 0 && selectedGrade) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(25, 118, 210, 0.3)";
          }
        }}
      >
        {uploading ? (
          <>
            <span style={{ 
              display: "inline-block",
              width: "16px",
              height: "16px",
              border: "3px solid rgba(255,255,255,0.3)",
              borderTop: "3px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            Subiendo...
          </>
        ) : (
          <>
            {files.length === 0 
              ? "Selecciona archivos para subir" 
              : !selectedGrade
                ? "Selecciona un grado para continuar"
                : `Subir ${files.length} archivo${files.length > 1 ? 's' : ''}`}
          </>
        )}
      </button>

      {/* Message Display */}
      {message.text && (
        <div 
          role="alert"
          style={{ 
            marginTop: "1rem", 
            padding: isMobile ? "0.875rem" : "1rem", 
            borderRadius: "8px",
            backgroundColor: 
              message.type === "success" ? "#e8f5e9" : 
              message.type === "warning" ? "#fff3e0" :
              "#ffebee",
            color: 
              message.type === "success" ? "#2e7d32" : 
              message.type === "warning" ? "#e65100" :
              "#c62828",
            border: `2px solid ${
              message.type === "success" ? "#4caf50" : 
              message.type === "warning" ? "#ff9800" :
              "#d32f2f"
            }`,
            fontSize: isMobile ? "13px" : "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            animation: "slideIn 0.3s ease"
          }}
        >
          <span style={{ fontSize: "20px", lineHeight: 1 }}>
            {message.type === "success" ? "✅" : message.type === "warning" ? "⚠️" : "❌"}
          </span>
          <span style={{ flex: 1, lineHeight: "1.5" }}>{message.text}</span>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
  );
}

export default FileUploader;