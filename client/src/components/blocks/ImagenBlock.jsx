import { useState } from "react";
import { useAvisosStore } from "../../store/avisosStore";
import ImageLibraryModal from "../ImageLibraryModal";

function extractDriveFileId(url) {
  const cleaned = sanitizeUrlInput(url);
  if (!cleaned) return "";

  try {
    const u = new URL(cleaned);
    if (!u.hostname.includes("drive.google.com")) return "";

    const matchFile = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (matchFile && matchFile[1]) return matchFile[1];

    return u.searchParams.get("id") || "";
  } catch (e) {
    return "";
  }
}

function buildDrivePreviewUrl(url) {
  const id = extractDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : "";
}

function sanitizeUrlInput(value) {
  if (!value) return "";

  let text = String(value).trim();

  const firstUrl = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (firstUrl && firstUrl[0]) {
    text = firstUrl[0];
  }

  return text.replace(/[),.;]+$/, "");
}

function normalizeDriveUrl(url) {
  const cleaned = sanitizeUrlInput(url);
  if (!cleaned) return "";

  try {
    const u = new URL(cleaned);

    if (!u.hostname.includes("drive.google.com")) {
      return cleaned;
    }

    // Formato: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const matchFile = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (matchFile && matchFile[1]) {
      return `https://drive.google.com/thumbnail?id=${matchFile[1]}&sz=w2000`;
    }

    // Formatos: open?id=FILE_ID, uc?id=FILE_ID, etc.
    const id = u.searchParams.get("id");
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
    }

    return cleaned;
  } catch (e) {
    return cleaned;
  }
}

export default function ImagenBlock({ bloque, avisoId, bloqueIndex }) {
  const { avisos, setAvisos } = useAvisosStore();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showDriveFallback, setShowDriveFallback] = useState(false);

  const applyUrl = (value, { normalizeRaw = false } = {}) => {
    const cleaned = sanitizeUrlInput(value);
    const normalized = normalizeDriveUrl(cleaned);

    const indexAviso = avisos.findIndex(
      (a) => String(a.id) === String(avisoId),
    );

    if (indexAviso === -1) return;

    const nuevosAvisos = [...avisos];

    const bloqueRef = nuevosAvisos[indexAviso].bloques[bloqueIndex];
    bloqueRef.url = normalizeRaw ? normalized : cleaned;
    bloqueRef.normalizedUrl = normalized;

    setAvisos(nuevosAvisos);
  };

  const handleChangeUrl = (e) => {
    applyUrl(e.target.value);
  };

  const handlePasteUrl = (e) => {
    const pastedText = e.clipboardData?.getData("text") || "";

    if (!pastedText) return;

    e.preventDefault();
    applyUrl(pastedText, { normalizeRaw: true });
  };

  const handleBlurUrl = () => {
    applyUrl(bloque.url || "", { normalizeRaw: true });
  };

  const rawUrl = bloque.url || "";
  const previewUrl = bloque.normalizedUrl || rawUrl;
  const drivePreviewUrl = buildDrivePreviewUrl(rawUrl || previewUrl);

  return (
    <div className="block-body">
      <h4>Imagen</h4>

      <div className="inline-row">
        <input
          className="modern-input"
          value={rawUrl}
          onChange={handleChangeUrl}
          onPaste={handlePasteUrl}
          onBlur={handleBlurUrl}
          placeholder="Pega aquí el link de Drive o URL de imagen"
        />
        <button
          className="btn btn-neutral btn-img-gallery"
          onClick={() => setGalleryOpen(true)}
          title="Abrir galería de imágenes"
          type="button"
        >
          🖼️ Galería
        </button>
      </div>

      <ImageLibraryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => applyUrl(url, { normalizeRaw: true })}
      />

      {previewUrl ? (
        <div style={{ marginTop: "10px" }}>
          {!showDriveFallback ? (
            <img
              src={previewUrl}
              alt="Previsualización de imagen"
              onError={() => {
                if (drivePreviewUrl) setShowDriveFallback(true);
              }}
              style={{
                maxWidth: "100%",
                borderRadius: "10px",
                display: "block",
              }}
            />
          ) : null}

          {showDriveFallback && drivePreviewUrl ? (
            <div style={{ marginTop: "6px" }}>
              <a
                href={drivePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-neutral"
              >
                Abrir vista previa en Drive
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="empty-state small">Sin URL de imagen</div>
      )}
    </div>
  );
}