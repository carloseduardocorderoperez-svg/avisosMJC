import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import apiUrl from "../utils/api"

export default function Preview() {

  const { setId } = useParams()

  const [loading, setLoading] = useState(false)
  const [htmlSource, setHtmlSource] = useState("")
  const [copyStatus, setCopyStatus] = useState("")
  const iframeRef = useRef(null)

  const generarPreview = async () => {

    if (!setId) return

    try {

      setLoading(true)

      const res = await fetch(apiUrl(`/sets/${setId}/generar-html`), {
        method: "POST"
      })

      const data = await res.json()

      if (!data || !data.archivo) {
        throw new Error("Respuesta inválida del servidor")
      }

      const file = data.archivo

      const htmlRes = await fetch(apiUrl(`/output/${file}`))

      const htmlText = await htmlRes.text()
      setHtmlSource(htmlText)

      const iframe = iframeRef.current

      const doc = iframe.contentDocument || iframe.contentWindow.document

      doc.open()
      doc.write(htmlText)
      doc.close()

    } catch (err) {

      console.error("Error generando preview:", err)

    } finally {

      setLoading(false)

    }

  }

  const copiarHtml = async () => {
    if (!htmlSource) return

    try {
      await navigator.clipboard.writeText(htmlSource)
      setCopyStatus("HTML copiado")
      setTimeout(() => setCopyStatus(""), 1800)
    } catch (err) {
      console.error("Error al copiar HTML:", err)
      setCopyStatus("No se pudo copiar")
      setTimeout(() => setCopyStatus(""), 1800)
    }
  }

  useEffect(() => {
    generarPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId])

  return (

    <div className="page-card designer-page">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <button
          className="btn btn-primary"
          onClick={copiarHtml}
          disabled={loading || !htmlSource}
        >
          Copiar HTML
        </button>
        {copyStatus ? <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{copyStatus}</span> : null}
      </div>
      <div className="preview-shell">
        <iframe
          ref={iframeRef}
          title="preview"
          className="preview-frame"
        />
        {loading && (
          <div className="preview-overlay">Generando preview…</div>
        )}
      </div>
    </div>

  )

}