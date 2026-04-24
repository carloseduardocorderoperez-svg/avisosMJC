import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileCode, ArrowRight, Loader } from "lucide-react"
import apiUrl from "../utils/api"

export default function Extra() {
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(null)

  const navigate = useNavigate()

  const handleImportar = async () => {
    if (!html.trim()) return

    setLoading(true)
    setError("")
    setSuccess(null)

    try {
      const res = await fetch(apiUrl("/import-html"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al procesar el HTML")
      }

      const data = await res.json()
      setSuccess(data)
      setHtml("")
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-card designer-page">
      <h1 className="page-title">Extra</h1>
      <p className="page-subtitle">Herramientas adicionales para gestión de avisos.</p>

      <div className="extra-tool-card">
        <div className="extra-tool-header">
          <FileCode size={20} />
          <div>
            <h2 className="extra-tool-title">Importar desde HTML</h2>
            <p className="extra-tool-desc">
              Pega el código HTML de un aviso viejo y la IA lo convierte en un nuevo set de avisos editable.
            </p>
          </div>
        </div>

        <textarea
          className="extra-html-input"
          placeholder="Pega aquí el HTML completo de los avisos..."
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          disabled={loading}
          rows={12}
        />

        {error && <div className="error-banner">{error}</div>}

        {success && (
          <div className="extra-success-banner">
            <span>
              ✓ Se crearon <strong>{success.avisos?.length ?? 0} avisos</strong> en el set <strong>{success.set?.code}</strong>
            </span>
            <button
              className="btn btn-small btn-primary"
              onClick={() => navigate(`/avisos/${success.set.id}`)}
            >
              Abrir set <ArrowRight size={13} />
            </button>
          </div>
        )}

        <div className="extra-tool-footer">
          <button
            className="btn btn-primary"
            onClick={handleImportar}
            disabled={loading || !html.trim()}
          >
            {loading ? (
              <><Loader size={14} className="spin" /> Procesando con IA...</>
            ) : (
              <><FileCode size={14} /> Importar avisos</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

