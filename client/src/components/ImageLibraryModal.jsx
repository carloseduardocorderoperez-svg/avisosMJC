import { useState, useEffect, useRef, useCallback } from "react";
import apiUrl from "../utils/api";

export default function ImageLibraryModal({ isOpen, onClose, onSelect }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [authorized, setAuthorized] = useState(null); // null=checking, true, false
  const [waitingAuth, setWaitingAuth] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/auth/status"));
      const data = await res.json();
      return data.authorized === true;
    } catch {
      return false;
    }
  }, []);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/images"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar imágenes");
      setImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearInterval(pollRef.current);
      setWaitingAuth(false);
      return;
    }
    setSelected(null);
    setError(null);
    setImages([]);

    (async () => {
      const ok = await checkAuth();
      setAuthorized(ok);
      if (ok) fetchImages();
    })();
  }, [isOpen, checkAuth, fetchImages]);

  // Cuando el usuario abrió la ventana de auth, sondear hasta que autorice
  useEffect(() => {
    if (!waitingAuth) return;
    pollRef.current = setInterval(async () => {
      const ok = await checkAuth();
      if (ok) {
        clearInterval(pollRef.current);
        setWaitingAuth(false);
        setAuthorized(true);
        fetchImages();
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [waitingAuth, checkAuth, fetchImages]);

  const handleConnectDrive = () => {
    window.open(apiUrl("/auth/start"), "_blank", "width=500,height=640");
    setWaitingAuth(true);
  };

  const handleFiles = async (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress(`Subiendo imagen ${i + 1} de ${imageFiles.length}...`);
        const formData = new FormData();
        formData.append("image", imageFiles[i]);
        const res = await fetch(apiUrl("/images/upload"), { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir imagen");
      }
      await fetchImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (e, img) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${img.name}" de Drive?`)) return;
    setError(null);
    try {
      const res = await fetch(apiUrl(`/images/${img.id}`), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      if (selected?.id === img.id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInsert = () => {
    if (!selected) return;
    onSelect(selected.url);
    onClose();
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ai-modal img-library-modal">
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-title">🖼️ Galería de Imágenes</div>
          <button className="ai-modal-close" onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* Estado: verificando auth */}
        {authorized === null && (
          <div className="img-library-grid">
            <div className="img-library-status">
              <span className="img-library-spinner" /> Verificando conexión con Drive...
            </div>
          </div>
        )}

        {/* Estado: no autorizado */}
        {authorized === false && (
          <div className="img-library-auth-screen">
            <div className="img-library-auth-icon">☁️</div>
            <p className="img-library-auth-title">Conecta tu Google Drive</p>
            <p className="img-library-auth-desc">
              Autoriza el acceso una sola vez para subir y gestionar imágenes directamente desde la app.
            </p>
            {waitingAuth ? (
              <div className="img-library-auth-waiting">
                <span className="img-library-spinner" />
                Esperando autorización... (completa el proceso en la ventana que se abrió)
              </div>
            ) : (
              <button className="btn btn-primary img-library-auth-btn" onClick={handleConnectDrive}>
                Conectar con Google Drive
              </button>
            )}
          </div>
        )}

        {/* Galería (solo cuando está autorizado) */}
        {authorized === true && (
          <>
            {/* Zona de subida */}
            <div
              className={`img-library-upload-zone ${dragOver ? "drag-over" : ""} ${uploading ? "uploading" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              {uploading ? (
                <><span className="img-library-spinner" /><span>{uploadProgress || "Subiendo a Drive..."}</span></>
              ) : (
                <><span className="img-library-upload-icon">🖼️</span><span>Clic aquí o arrastra imágenes para subir a Drive</span></>
              )}
            </div>

            {error && <div className="img-library-error"><strong>Error:</strong> {error}</div>}

            <div className="img-library-grid">
              {loading ? (
                <div className="img-library-status"><span className="img-library-spinner" /> Cargando imágenes...</div>
              ) : images.length === 0 ? (
                <div className="img-library-status img-library-empty">
                  No hay imágenes en la carpeta de Drive.<br />
                  <small>Sube tu primera imagen usando el área de arriba.</small>
                </div>
              ) : (
                images.map((img) => (
                  <div key={img.id} className={`img-library-item ${selected?.id === img.id ? "selected" : ""}`} onClick={() => setSelected(img)} title={img.name}>
                    <img src={img.thumbnailUrl} alt={img.name} loading="lazy" draggable={false} />
                    <div className="img-library-item-overlay">
                      <span className="img-library-item-name">{img.name}</span>
                      <button className="img-library-delete-btn" onClick={(e) => handleDelete(e, img)} title="Eliminar de Drive">🗑</button>
                    </div>
                    {selected?.id === img.id && <div className="img-library-check">✓</div>}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="img-library-footer">
          <span className="img-library-count">
            {authorized === true ? `${images.length} imagen${images.length !== 1 ? "es" : ""}` : ""}
          </span>
          <div className="img-library-footer-actions">
            <button className="btn btn-neutral" onClick={onClose}>Cancelar</button>
            {authorized === true && (
              <button className="btn btn-primary" onClick={handleInsert} disabled={!selected}>
                Insertar imagen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

