import { useState, useEffect, useRef, useCallback } from "react"
import { Sparkles, Upload, X, CheckCircle, AlertCircle, FileText, RotateCcw, Download } from "lucide-react"
import apiUrl from "../utils/api"

const CATEGORY_COLORS = {
  admin:     { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.5)",  text: "#fcd34d" },
  eventos:   { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.5)",  text: "#93c5fd" },
  pastoral:  { bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.5)",  text: "#f9a8d4" },
  formacion: { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.5)",  text: "#d8b4fe" },
  extras:    { bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.5)", text: "#9ca3af" },
}

const DEFAULT_COLOR = CATEGORY_COLORS.extras

function CategoryBadge({ categoria }) {
  const c = CATEGORY_COLORS[categoria] || DEFAULT_COLOR
  return (
    <span
      className="ai-cat-badge"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {categoria}
    </span>
  )
}

const PROCESS_STEPS = [
  { id: "upload",  label: "Subiendo PDF al servidor" },
  { id: "convert", label: "Convirtiendo slides a imágenes" },
  { id: "analyze", label: "Analizando contenido con IA" },
]

export default function AiImportModal({
  isOpen,
  onClose,
  onImported,
  lastBackup,
  onRestoreBackup,
  onExportJson,
  currentSet,        // object | null — set being edited right now
}) {
  const [step, setStep]             = useState("upload")   // upload | processing | review | error
  const [file, setFile]             = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [processStep, setProcessStep] = useState(-1)         // index in PROCESS_STEPS currently active
  const [result, setResult]         = useState(null)         // { avisos, byCategory, set }
  const [message, setMessage]       = useState("")
  const [errorMsg, setErrorMsg]     = useState("")

  // Import-mode state (only relevant in review step)
  const [importMode, setImportMode]           = useState("replace") // replace | append | choose
  const [checkedAvisoIds, setCheckedAvisoIds] = useState(() => new Set())

  const dropRef      = useRef(null)
  const fileInputRef = useRef(null)

  // Reset internal state shortly after close (allows close animation to finish)
  useEffect(() => {
    if (!isOpen) {
      const id = setTimeout(() => {
        setStep("upload")
        setFile(null)
        setProcessStep(-1)
        setResult(null)
        setMessage("")
        setErrorMsg("")
        setImportMode("replace")
        setCheckedAvisoIds(new Set())
      }, 300)
      return () => clearTimeout(id)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])
  const handleDrop      = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped?.type === "application/pdf") setFile(dropped)
  }, [])

  const handleAnalyze = async () => {
    if (!file) return

    setStep("processing")
    setProcessStep(0)
    setErrorMsg("")

    try {
      const formData = new FormData()
      formData.append("pdf", file)

      const uploadRes = await fetch(apiUrl("/upload-pdf"), {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!uploadRes.ok) throw new Error("No se pudo subir el PDF")

      setProcessStep(1)
      await new Promise((r) => setTimeout(r, 700)) // brief pause so step is visible

      setProcessStep(2)

      const analyzeRes = await fetch(apiUrl("/analyze-slides?persist=false"), {
        method: "POST",
        credentials: "include",
      })

      if (!analyzeRes.ok) throw new Error("Falló el análisis de IA")

      const data = await analyzeRes.json()
      console.debug("AiImportModal analysis response:", data)
      const avisosFromResponse = Array.isArray(data.avisos) ? data.avisos : []
      const backendSet = data.set || null
      const setAvisos = Array.isArray(backendSet?.avisos) ? backendSet.avisos : []
      const avisos = avisosFromResponse.length > 0 ? avisosFromResponse : setAvisos

      if (avisosFromResponse.length === 0 && setAvisos.length > 0) {
        console.warn("AiImportModal: uso avisos del set backend porque data.avisos estaba vacío", {
          data,
          backendSet,
        })
      }

      const byCategory = avisos.reduce((acc, aviso) => {
        const cat = (aviso.categoria || "extras").toLowerCase()
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})

      const fallbackNotice = avisosFromResponse.length === 0 && setAvisos.length > 0
        ? " (usando avisos guardados en el set de backend)"
        : ""

      setMessage(`¡Análisis completado! Se encontraron ${avisos.length} avisos.${fallbackNotice}`)
      setResult({ avisos, byCategory, set: backendSet })
      setImportMode("replace")
      setCheckedAvisoIds(new Set(avisos.map((a, i) => a.id ?? i)))
      setStep("review")
    } catch (err) {
      setErrorMsg(err.message || "Error inesperado")
      setStep("error")
    }
  }

  const handleImport = () => {
    if (!result) return

    let finalAvisos = result.avisos
    let mode = importMode

    if (mode === "choose") {
      finalAvisos = result.avisos.filter((a, i) => checkedAvisoIds.has(a.id ?? i))
      mode = "append"
    }

    onImported({ avisos: finalAvisos, set: result.set, importMode: mode })
    onClose()
  }

  const toggleCheck = (key) => {
    setCheckedAvisoIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleNewAnalysis = () => {
    setStep("upload")
    setFile(null)
    setResult(null)
    setProcessStep(-1)
  }

  if (!isOpen) return null

  return (
    <div
      className="ai-modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="ai-modal" role="dialog" aria-modal="true">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <Sparkles size={15} />
            Importar avisos con IA
          </div>

          <div className="ai-modal-header-actions">
            {lastBackup?.avisos?.length ? (
              <button
                className="ai-header-btn"
                onClick={onRestoreBackup}
                title={`Restaurar backup del ${new Date(lastBackup.createdAt).toLocaleTimeString()}`}
              >
                <RotateCcw size={13} />
                Restaurar backup
              </button>
            ) : null}

            <button
              className="ai-header-btn"
              onClick={onExportJson}
              title="Exportar JSON actual"
            >
              <Download size={13} />
              Exportar JSON
            </button>

            <button className="ai-modal-close" onClick={onClose} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Step indicator ──────────────────────────────────── */}
        {step !== "upload" && step !== "error" && (
          <div className="ai-step-bar">
            {["upload", "processing", "review"].map((s, i) => (
              <div
                key={s}
                className={`ai-step-dot ${
                  s === step ? "current" : i < ["upload","processing","review"].indexOf(step) ? "done" : "pending"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Step: upload ────────────────────────────────────── */}
        {step === "upload" && (
          <div className="ai-step-body">
            <div
              ref={dropRef}
              className={`ai-dropzone${isDragging ? " dragging" : ""}${file ? " has-file" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <div className="ai-dropzone-file">
                  <FileText size={32} className="ai-dropzone-file-icon" />
                  <div className="ai-dropzone-file-name">{file.name}</div>
                  <div className="ai-dropzone-file-size">{(file.size / 1024).toFixed(0)} KB</div>
                  <div className="ai-dropzone-change">Cambiar archivo</div>
                </div>
              ) : (
                <div className="ai-dropzone-empty">
                  <Upload size={28} className="ai-dropzone-empty-icon" />
                  <div className="ai-dropzone-label">Arrastra el PDF aquí</div>
                  <div className="ai-dropzone-meta">o haz clic para seleccionar</div>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary ai-analyze-btn"
              disabled={!file}
              onClick={handleAnalyze}
            >
              <Sparkles size={14} />
              Analizar con IA
            </button>

            <p className="ai-modal-hint">
              Sube el PDF de avisos semanales. La IA identificará, agrupará y estructurará cada aviso automáticamente en bloques editables.
            </p>
          </div>
        )}

        {/* ── Step: processing ────────────────────────────────── */}
        {step === "processing" && (
          <div className="ai-step-body ai-step-processing">
            <div className="ai-process-list">
              {PROCESS_STEPS.map((s, i) => {
                const isDone   = i < processStep
                const isActive = i === processStep
                return (
                  <div
                    key={s.id}
                    className={`ai-process-row ${isDone ? "done" : isActive ? "active" : "pending"}`}
                  >
                    <div className="ai-process-icon-wrap">
                      {isDone
                        ? <CheckCircle size={16} />
                        : isActive
                          ? <span className="ai-spinner" />
                          : <span className="ai-process-circle" />
                      }
                    </div>
                    <span className="ai-process-label">{s.label}</span>
                  </div>
                )
              })}
            </div>
            <p className="ai-modal-hint" style={{ marginTop: "24px" }}>
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>
          </div>
        )}

        {/* ── Step: review ────────────────────────────────────── */}
        {step === "review" && result && (
          <div className="ai-step-body ai-step-review">
            <div className="ai-review-header">
              <CheckCircle size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
              <span>
                <strong>{result.avisos.length}</strong> avisos detectados
              </span>
              <div className="ai-review-cats">
                {Object.entries(result.byCategory).map(([cat, count]) => (
                  <CategoryBadge key={cat} categoria={`${cat} · ${count}`} />
                ))}
              </div>
            </div>
            {result.avisos.length === 0 && (
              <div style={{
                marginTop: "16px",
                padding: "12px 16px",
                backgroundColor: "#fff3cd",
                color: "#856404",
                borderRadius: "8px",
                border: "1px solid #ffeeba"
              }}>
                No se detectaron avisos en este PDF. Revisa el documento o prueba con otro archivo.
              </div>
            )}

            {/* Aviso list — with checkboxes when mode = choose */}
            <div className="ai-aviso-list">
              {result.avisos.map((aviso, i) => {
                const key = aviso.id ?? i
                const checked = checkedAvisoIds.has(key)
                const isChoose = importMode === "choose"
                return (
                  <div
                    key={key}
                    className={`ai-aviso-row${isChoose ? " selectable" : ""}${isChoose && !checked ? " unchecked" : ""}`}
                    onClick={isChoose ? () => toggleCheck(key) : undefined}
                  >
                    {isChoose && (
                      <span className="ai-aviso-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheck(key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </span>
                    )}
                    <div className="ai-aviso-row-index">{aviso.orden ?? i + 1}</div>
                    <div className="ai-aviso-row-body">
                      <div className="ai-aviso-title">{aviso.titulo}</div>
                      <div className="ai-aviso-meta">
                        <CategoryBadge categoria={aviso.categoria || "extras"} />
                        <span className="ai-aviso-blocks">{aviso.bloques?.length ?? 0} bloques</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mode picker — only when editing an existing set */}
            {currentSet && (
              <div className="ai-import-mode">
                <div className="ai-import-mode-label">¿Cómo importar?</div>
                <div className="ai-import-mode-options">
                  <button
                    type="button"
                    className={`ai-mode-btn${importMode === "replace" ? " active" : ""}`}
                    onClick={() => setImportMode("replace")}
                    title="Reemplaza los avisos actuales del set con los de la IA"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    className={`ai-mode-btn${importMode === "append" ? " active" : ""}`}
                    onClick={() => setImportMode("append")}
                    title="Agrega todos los avisos de la IA al final del set actual"
                  >
                    Adjuntar todos
                  </button>
                  <button
                    type="button"
                    className={`ai-mode-btn${importMode === "choose" ? " active" : ""}`}
                    onClick={() => setImportMode("choose")}
                    title="Elige cuáles avisos adjuntar al set actual"
                  >
                    Elegir cuáles
                  </button>
                </div>
                {importMode === "choose" && (
                  <p className="ai-import-mode-hint">
                    {checkedAvisoIds.size} de {result.avisos.length} seleccionados — haz clic en un aviso para marcar/desmarcar.
                  </p>
                )}
              </div>
            )}

            <div className="ai-review-actions">
              <button className="btn btn-neutral" onClick={handleNewAnalysis}>
                Nuevo análisis
              </button>
              {currentSet && (
                <button className="btn btn-neutral" onClick={onClose}>
                  Cancelar
                </button>
              )}
              <button
                className="btn btn-success ai-import-btn"
                disabled={importMode === "choose" && checkedAvisoIds.size === 0}
                onClick={handleImport}
              >
                <CheckCircle size={14} />
                {currentSet
                  ? importMode === "replace"
                    ? "Reemplazar avisos"
                    : importMode === "choose"
                    ? `Adjuntar ${checkedAvisoIds.size} seleccionados`
                    : `Adjuntar ${result.avisos.length} avisos`
                  : `Importar ${result.avisos.length} avisos`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: error ─────────────────────────────────────── */}
        {step === "error" && (
          <div className="ai-step-body ai-step-error">
            <AlertCircle size={36} style={{ color: "#f87171" }} />
            <p className="ai-error-msg">{errorMsg}</p>
            <button className="btn btn-neutral" onClick={() => setStep("upload")}>
              Volver
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
