import { useState, useEffect } from "react"
import { X, ArrowRight } from "lucide-react"
import apiUrl from "../utils/api"
import { formatFullDate } from "../utils/dateUtils"

export default function CopyToSetModal({ isOpen, onClose, aviso, currentSetId }) {
  const [sets, setSets]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [copying, setCopying]       = useState(false)
  const [error, setError]           = useState("")
  const [done, setDone]             = useState(false)

  useEffect(() => {
    if (!isOpen) {
      const id = setTimeout(() => {
        setSelectedId(null)
        setError("")
        setDone(false)
      }, 300)
      return () => clearTimeout(id)
    }

    setLoading(true)
    setError("")
    fetch(apiUrl("/sets"))
      .then((r) => r.json())
      .then((data) => setSets((data.sets || []).filter((s) => s.id !== currentSetId)))
      .catch(() => setError("No se pudieron cargar los sets"))
      .finally(() => setLoading(false))
  }, [isOpen, currentSetId])

  if (!isOpen) return null

  const handleCopy = async () => {
    if (!selectedId || !aviso) return
    setCopying(true)
    setError("")
    try {
      const res = await fetch(apiUrl(`/sets/${selectedId}/copy-avisos`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisos: [aviso] }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Error al copiar")
      }
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setCopying(false)
    }
  }

  return (
    <div
      className="ai-modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ai-modal copy-set-modal" role="dialog" aria-modal="true">
        <div className="ai-modal-header">
          <div className="ai-modal-title">Copiar aviso a otro set</div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="ai-step-body" style={{ gap: 12 }}>
          {done ? (
            <>
              <p className="copy-set-done-msg">
                ✓ El aviso fue copiado correctamente.
              </p>
              <div className="copy-set-actions">
                <button className="btn btn-neutral" onClick={onClose}>Cerrar</button>
              </div>
            </>
          ) : (
            <>
              <p className="copy-set-desc">
                Copia{" "}
                <strong style={{ color: "var(--text-main)" }}>
                  "{aviso?.titulo}"
                </strong>{" "}
                al set destino. El aviso original no se modifica.
              </p>

              {error && <div className="error-banner">{error}</div>}

              {loading ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Cargando sets…</p>
              ) : sets.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  No hay otros sets disponibles.
                </p>
              ) : (
                <div className="copy-set-list">
                  {sets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`copy-set-item${selectedId === s.id ? " selected" : ""}`}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <span className="copy-set-code">{s.code}</span>
                      {s.date && <span className="copy-set-date">{formatFullDate(s.date)}</span>}
                      <span className="copy-set-count">{s.avisosCount ?? 0} avisos</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="copy-set-actions">
                <button className="btn btn-neutral" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!selectedId || copying || loading}
                  onClick={handleCopy}
                >
                  <ArrowRight size={13} />
                  {copying ? "Copiando…" : "Copiar aviso"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
