import { useState } from "react";
import { Calendar } from "lucide-react";

export default function EditDateModal({ set, onClose, onSave, loading }) {
  const [dateInput, setDateInput] = useState(
    set?.date
      ? new Date(set.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const handleSave = async () => {
    if (!dateInput) {
      alert("Por favor selecciona una fecha");
      return;
    }
    await onSave(dateInput);
  };

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <Calendar size={16} />
            Editar fecha del set de avisos
          </div>
          <button
            className="ai-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="ai-step-body">
          <p style={{ margin: "0 0 12px 0", color: "var(--text-muted)", fontSize: "13px" }}>
            Actualiza la fecha de creación del set de avisos. Esta fecha será la que aparezca en el HTML generado.
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Fecha
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="modern-input"
              style={{ width: "100%" }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "12px", padding: "10px 12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}>
            <strong>Vista previa:</strong> {dateInput ? new Date(dateInput + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "-"}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "16px", borderTop: "1px solid var(--border-strong)", justifyContent: "flex-end" }}>
          <button
            className="btn btn-neutral"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
