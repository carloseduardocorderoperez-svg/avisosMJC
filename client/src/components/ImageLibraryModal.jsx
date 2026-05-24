import { useState, useEffect, useRef, useCallback } from "react";
import apiUrl from "../utils/api";

export default function ImageLibraryModal({
  isOpen,
  onClose,
  onSelect,
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const [driveAuthorized, setDriveAuthorized] = useState(true);
  const [waitingAuth, setWaitingAuth] = useState(false);

  const fileInputRef = useRef(null);
  const popupRef = useRef(null);
  const authTriggeredRef = useRef(false);

  // ===============================
  // Cargar imágenes
  // ===============================

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl("/images"), {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        if (
          res.status === 401 &&
          data?.error === "drive_token_revoked"
        ) {
          setDriveAuthorized(false);

          if (!authTriggeredRef.current) {
            authTriggeredRef.current = true;
            handleConnectDrive();
          }

          return;
        }

        throw new Error(data.error || "Error cargando imágenes");
      }

      setDriveAuthorized(true);
      setImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===============================
  // Abrir modal
  // ===============================

  useEffect(() => {
    if (!isOpen) return;

    setSelected(null);
    setError(null);
    setImages([]);
    authTriggeredRef.current = false;

    fetchImages();
  }, [isOpen, fetchImages]);

  // ===============================
  // OAuth popup
  // ===============================

  const handleConnectDrive = () => {
    setWaitingAuth(true);

    // IMPORTANTE:
    // nombre único evita reutilizar tabs/popup viejos
    const popupName = `driveAuth_${Date.now()}`;

    const popup = window.open(
      apiUrl("/auth/start"),
      popupName,
      "width=520,height=720,resizable=yes,scrollbars=yes",
    );

    popupRef.current = popup;

    if (!popup) {
      setWaitingAuth(false);
      setError("El navegador bloqueó el popup.");
      return;
    }

    popup.focus();
  };

  // ===============================
  // Escuchar callback OAuth
  // ===============================

  useEffect(() => {
    const onMessage = async (e) => {
      try {
        const allowedOrigin = new URL(apiUrl("")).origin;

        if (e.origin !== allowedOrigin) return;

        if (e.data?.type === "drive-auth-success") {
          setWaitingAuth(false);
          setDriveAuthorized(true);
          authTriggeredRef.current = false;

          try {
            popupRef.current?.close();
          } catch {}

          await fetchImages();
        }

        if (e.data?.type === "drive-auth-error") {
          setWaitingAuth(false);
          setError("No se pudo conectar Google Drive.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [fetchImages]);

  // ===============================
  // Upload
  // ===============================

  const handleFiles = async (files) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    if (!imageFiles.length) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        setUploadProgress(
          `Subiendo ${i + 1} de ${imageFiles.length}`,
        );

        const formData = new FormData();
        formData.append("image", imageFiles[i]);

        const res = await fetch(apiUrl("/images/upload"), {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          if (
            res.status === 401 &&
            data?.error === "drive_token_revoked"
          ) {
            setDriveAuthorized(false);

            if (!authTriggeredRef.current) {
              authTriggeredRef.current = true;
              handleConnectDrive();
            }

            return;
          }

          throw new Error(data.error || "Error subiendo imagen");
        }
      }

      await fetchImages();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // ===============================
  // Delete
  // ===============================

  const handleDelete = async (e, img) => {
    e.stopPropagation();

    if (!window.confirm(`¿Eliminar "${img.name}"?`)) return;

    try {
      const res = await fetch(apiUrl(`/images/${img.id}`), {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error eliminando");
      }

      setImages((prev) =>
        prev.filter((i) => i.id !== img.id),
      );

      if (selected?.id === img.id) {
        setSelected(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // ===============================
  // Drag & drop
  // ===============================

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  // ===============================
  // Insertar
  // ===============================

  const handleInsert = () => {
    if (!selected) return;

    onSelect(selected.url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ai-modal img-library-modal">

        {/* HEADER */}

        <div className="ai-modal-header">
          <div className="ai-modal-title">
            🖼️ Galería de Imágenes
          </div>

          <button
            className="ai-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* AUTH SCREEN */}

        {!driveAuthorized && (
          <div className="img-library-auth-screen">

            <div className="img-library-auth-icon">
              ☁️
            </div>

            <p className="img-library-auth-title">
              Conecta Google Drive
            </p>

            <p className="img-library-auth-desc">
              Autoriza acceso para administrar imágenes.
            </p>

            {waitingAuth ? (
              <div className="img-library-auth-waiting">
                <span className="img-library-spinner" />
                Esperando autorización...
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleConnectDrive}
              >
                Conectar Drive
              </button>
            )}
          </div>
        )}

        {/* GALERÍA */}

        {driveAuthorized && (
          <>
            <div
              className={`img-library-upload-zone ${
                dragOver ? "drag-over" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                !uploading &&
                fileInputRef.current?.click()
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) =>
                  handleFiles(e.target.files)
                }
              />

              {uploading ? (
                <>
                  <span className="img-library-spinner" />
                  <span>{uploadProgress}</span>
                </>
              ) : (
                <>
                  <span className="img-library-upload-icon">
                    🖼️
                  </span>

                  <span>
                    Haz clic o arrastra imágenes
                  </span>
                </>
              )}
            </div>

            {error && (
              <div className="img-library-error">
                {error}
              </div>
            )}

            <div className="img-library-grid">

              {loading ? (
                <div className="img-library-status">
                  <span className="img-library-spinner" />
                  Cargando imágenes...
                </div>
              ) : images.length === 0 ? (
                <div className="img-library-status">
                  No hay imágenes.
                </div>
              ) : (
                images.map((img) => (
                  <div
                    key={img.id}
                    className={`img-library-item ${
                      selected?.id === img.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setSelected(img)}
                  >
                    <img
                      src={img.thumbnailUrl}
                      alt={img.name}
                      loading="lazy"
                      draggable={false}
                    />

                    <div className="img-library-item-overlay">
                      <span className="img-library-item-name">
                        {img.name}
                      </span>

                      <button
                        className="img-library-delete-btn"
                        onClick={(e) =>
                          handleDelete(e, img)
                        }
                      >
                        🗑
                      </button>
                    </div>

                    {selected?.id === img.id && (
                      <div className="img-library-check">
                        ✓
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* FOOTER */}

        <div className="img-library-footer">

          <span className="img-library-count">
            {images.length} imagen
            {images.length !== 1 ? "es" : ""}
          </span>

          <div className="img-library-footer-actions">

            <button
              className="btn btn-neutral"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button
              className="btn btn-primary"
              disabled={!selected}
              onClick={handleInsert}
            >
              Insertar imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}