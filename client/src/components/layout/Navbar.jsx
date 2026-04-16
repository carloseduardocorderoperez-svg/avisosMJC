import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useAvisosStore } from "../../store/avisosStore"
import { Sparkles, Trash2 } from "lucide-react"
import AiImportModal from "../AiImportModal"

export default function Navbar() {

  const {
    currentSet,
    avisos,
    dirty,
    isSaving,
    markClean,
    setSaving,
    setAvisos,
    setSelectedAvisoId,
    initializeFromServer,
  } = useAvisosStore()

  const location = useLocation()

  const [toast, setToast] = useState(null)
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)
  const [clearConfirm, setClearConfirm] = useState(false)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  // Auto-cancel clear confirmation after 3 s if no second click
  useEffect(() => {
    if (!clearConfirm) return
    const id = setTimeout(() => setClearConfirm(false), 3000)
    return () => clearTimeout(id)
  }, [clearConfirm])

  const handleClearClick = () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      return
    }
    createBackupSnapshot()
    setAvisos([])
    setSelectedAvisoId(null)
    setClearConfirm(false)
    setToast({ type: "success", message: "Avisos borrados (backup creado)" })
  }

  const createBackupSnapshot = () => {
    const snapshot = JSON.parse(JSON.stringify(avisos || []))
    setLastBackup({ createdAt: new Date().toISOString(), avisos: snapshot })
  }

  const handleExportJson = () => {
    const payload = { avisos, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `avisos-backup-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setToast({ type: "success", message: "JSON exportado" })
  }

  const handleImported = (result) => {
    if (!result) return

    const { avisos: aiAvisos, set: backendSet, importMode } = result

    createBackupSnapshot()

    if (importMode === "append") {
      // Merge into current set without switching
      const merged = [
        ...avisos,
        ...aiAvisos.map((a, i) => ({
          ...a,
          id: crypto.randomUUID(),
          orden: avisos.length + i + 1,
        })),
      ]
      setAvisos(merged)
      setToast({ type: "success", message: `${aiAvisos.length} avisos adjuntados al set actual` })
    } else {
      // replace — switch to the AI-created backend set
      if (backendSet) {
        initializeFromServer({ avisos: aiAvisos, set: backendSet })
      } else {
        setAvisos(aiAvisos)
        setSelectedAvisoId(aiAvisos[0]?.id || null)
      }
      setToast({ type: "success", message: `${aiAvisos.length} avisos importados` })
    }
  }

  const handleRestoreBackup = () => {
    if (!lastBackup?.avisos) return
    setAvisos(lastBackup.avisos)
    setSelectedAvisoId(lastBackup.avisos[0]?.id || null)
    setToast({ type: "success", message: "Backup restaurado" })
  }

  const handleSave = async () => {

    if (!dirty || isSaving || avisos.length === 0) return

    try {

      setSaving(true)

      const payload = {
        avisos,
      }

      if (currentSet?.id) {
        payload.setId = currentSet.id
        if (currentSet.code != null) payload.code = currentSet.code
        if (currentSet.date != null) payload.date = currentSet.date
        if (currentSet.title != null) payload.title = currentSet.title
        if (currentSet.bannerMessage != null) payload.bannerMessage = currentSet.bannerMessage
      }

      const res = await fetch("http://localhost:3000/avisos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error("Error guardando avisos")
      }

      const data = await res.json()

      if (data?.set) {
        initializeFromServer({ avisos: data.set.avisos || avisos, set: data.set })
      }

      markClean()

      setToast({ type: "success", message: "Avisos guardados y HTML regenerado" })

    } catch (err) {

      console.error(err)
      setToast({ type: "error", message: "Error guardando avisos" })

    } finally {

      setSaving(false)

    }

  }

  const disabled = !dirty || isSaving || avisos.length === 0

  // Derivar estado de navegación
  const path = location.pathname
  const isDashboard = path === "/" || path.startsWith("/dashboard")
  const isSetRoute = path.startsWith("/avisos/")
  const isPreviewRoute = path.startsWith("/avisos/") && path.endsWith("/preview")
  const isSetContext = isSetRoute && !!currentSet?.id

  const shouldBlockLeavingSet = dirty && isSetRoute

  const confirmLeaveSet = () => {
    if (!shouldBlockLeavingSet) return true
    return window.confirm("Tienes cambios sin guardar. ¿Seguro que deseas salir de este set de avisos?")
  }

  const guardNavTo = (targetPath) => (event) => {
    if (path === targetPath) return
    const leavingSet = isSetRoute && !targetPath.startsWith("/avisos/")
    if (leavingSet && !confirmLeaveSet()) {
      event.preventDefault()
    }
  }

  useEffect(() => {
    if (!shouldBlockLeavingSet) return

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [shouldBlockLeavingSet])

  let pageTitle = null

  if (isDashboard) {
    pageTitle = "Dashboard"
  } else if (isSetRoute && !isPreviewRoute) {
    pageTitle = "Editor de avisos"
  } else if (isPreviewRoute) {
    pageTitle = "Vista previa HTML"
  }

  return (
    <>
      <div className="modern-navbar">
        <div className="brand-badge">
          MJC Avisos IA
        </div>

        <div className="nav-links">
          {/* Siempre mostrar Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={guardNavTo("/dashboard")}
            className={({ isActive }) =>
              isActive || path === "/" ? "nav-link active" : "nav-link"
            }
          >
            Dashboard
          </NavLink>

          {/* Breadcrumb del set actual si existe */}
          {isSetContext && (
            <span className="nav-breadcrumb">
              
              <span className="nav-breadcrumb-sep">→</span>
              <span className="nav-breadcrumb-set">
                {currentSet.date || "Set sin fecha"}
                {currentSet.code ? ` (ID ${currentSet.code})` : ""}
              </span>
            </span>
          )}

          {/* En rutas de un set, mostrar pestañas Avisos / Preview */}
          {isSetContext && (
            <>
              <NavLink
                to={`/avisos/${currentSet.id}`}
                onClick={guardNavTo(`/avisos/${currentSet.id}`)}
                className={({ isActive }) =>
                  isActive && !path.endsWith("/preview")
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Avisos
              </NavLink>

              <NavLink
                to={`/avisos/${currentSet.id}/preview`}
                onClick={guardNavTo(`/avisos/${currentSet.id}/preview`)}
                className={({ isActive }) =>
                  isActive || path.endsWith("/preview")
                    ? "nav-link active"
                    : "nav-link"
                }
              >
                Preview
              </NavLink>
            </>
          )}

          {/* Extra siempre disponible al final */}
          <NavLink
            to="/extra"
            onClick={guardNavTo("/extra")}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            Extra
          </NavLink>
        </div>

        {pageTitle && (
          <div className="navbar-title">
            {pageTitle}
          </div>
        )}

        <div className="navbar-actions" style={{ marginLeft: "auto" }}>
          {isSetContext && avisos.length > 0 && (
            <>
              <button
                className={`btn small-btn btn-clear${clearConfirm ? " btn-clear-confirm" : ""}`}
                onClick={handleClearClick}
                title={clearConfirm ? "Haz clic de nuevo para confirmar" : "Limpiar todos los avisos"}
              >
                {clearConfirm ? "¿Borrar todo?" : <Trash2 size={14} />}
              </button>
              <div className="navbar-divider" />
            </>
          )}

          {isSetContext && (
            <>
              <button
                className="btn btn-neutral small-btn ai-open-btn"
                onClick={() => setIsAiOpen(true)}
                title="Importar desde PDF con IA"
              >
                <Sparkles size={14} />
                IA
              </button>

              <button
                className={`btn small-btn ${
                  isSaving ? "btn-save-saving" : dirty ? "btn-save-active" : "btn-save-idle"
                }`}
                onClick={handleSave}
                disabled={disabled}
                title={dirty ? "Hay cambios sin guardar" : "Sin cambios pendientes"}
              >
                {isSaving ? "Guardando..." : dirty ? "● Guardar" : "Guardado"}
              </button>
            </>
          )}
        </div>
      </div>

      <AiImportModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        onImported={handleImported}
        lastBackup={lastBackup}
        onRestoreBackup={handleRestoreBackup}
        onExportJson={handleExportJson}
        currentSet={currentSet}
      />

      {toast && (
        <div
          className={
            toast.type === "error"
              ? "save-toast save-toast-error"
              : "save-toast save-toast-success"
          }
        >
          {toast.message}
        </div>
      )}
    </>
  )

}