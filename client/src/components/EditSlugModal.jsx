import { useState } from "react";
import { createPortal } from "react-dom";
import { Underline } from "lucide-react";

export default function EditSlugModal({ set, initialValue = "", onClose, onSave, loading, error }) {
  const [slugInput, setSlugInput] = useState(initialValue || "");

  const handleSave = async () => {
    const val = String(slugInput || "").trim().toLowerCase();
    if (!val || val.length < 2) {
      alert("Slug inválido. Usa letras, números y guiones (mínimo 2 caracteres).");
      return;
    }
    await onSave(val);
  };

  const modal = (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <Underline size={16} />
            Editar slug público
          </div>
          <button className="ai-modal-close" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        <div className="ai-step-body">
          <p style={{ margin: "0 0 12px 0", color: "var(--text-muted)", fontSize: "13px" }}>
            El slug será la parte final de la URL pública. Usa letras, números y guiones. Debe ser único al publicar.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Slug
            </label>
            <input
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              className="modern-input"
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ marginBottom: "12px", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: "12px", padding: "10px 12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}>
            <strong>Vista previa URL:</strong> {typeof window !== 'undefined' ? window.location.origin : ''}/avisos-semanales/{slugInput || "-"}/
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "16px", borderTop: "1px solid var(--border-strong)", justifyContent: "flex-end" }}>
          <button className="btn btn-neutral" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
