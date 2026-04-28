import React, { useEffect, useRef, useState } from "react"
import { Pencil, Eye, Clipboard, Copy, Trash2, MoreVertical, Calendar, FileText } from "lucide-react"

export default function DashboardSetCard({
  set,
  displayTitle,
  onEdit,
  onPreview,
  onCopyHtml,
  onDuplicate,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const count = set?.avisosCount ?? 0

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try {
      let d
      if (typeof dateStr === "string" && dateStr.includes("/")) {
        const parts = dateStr.split("/")
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10)
          d = new Date(year, month, day)
        } else {
          d = new Date(dateStr)
        }
      } else {
        d = new Date(dateStr)
      }
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" })
    } catch {
      return dateStr
    }
  }

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  const previewAvisos = Array.isArray(set?.previewAvisos) ? set.previewAvisos : []
  const PREVIEW_MAX = 3
  const previewToShow = previewAvisos.slice(0, PREVIEW_MAX)
  const overflowCount = typeof set?.overflowCount === "number"
    ? set.overflowCount
    : Math.max(0, count - previewToShow.length)

  const year = (() => {
    try {
      const d = new Date(set?.date || set?.updatedAt || set?.createdAt)
      return isNaN(d.getTime()) ? null : d.getFullYear()
    } catch {
      return null
    }
  })()
  const actionAndClose = (action) => {
    action()
    setMenuOpen(false)
  }

  return (
    <article className="dashboard-card" aria-label={`Set ${displayTitle}`} ref={menuRef}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-wrap">
          <Calendar size={16} className="dashboard-card-calendar" />
          <div>
            <div className="dashboard-card-title">{displayTitle}</div>
          </div>
        </div>
        <div className="dashboard-card-header-actions">
          <button
            type="button"
            className="dashboard-card-menu-trigger"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((open) => !open)
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="dashboard-card-menu" role="menu">
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onPreview)}>
                <Eye size={14} /> Vista previa
              </button>
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onCopyHtml)}>
                <Clipboard size={14} /> Copiar HTML
              </button>
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onDuplicate)}>
                <Copy size={14} /> Duplicar
              </button>
              <button type="button" className="dashboard-card-menu-item danger" onClick={() => actionAndClose(onDelete)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-card-preview">
        {previewToShow.length > 0 ? (
          previewToShow.map((aviso, index) => (
            <div key={aviso.id || index} className="dashboard-card-preview-item">
              <FileText size={14} className="dashboard-card-preview-item-icon" />
              <div className="dashboard-card-preview-item-text">
                {aviso.titulo || aviso.texto || aviso.categoria || `Aviso ${index + 1}`}
              </div>
            </div>
          ))
        ) : (
          <div className="dashboard-card-preview-empty">No hay avisos disponibles</div>
        )}
        {overflowCount > 0 && (
          <div className="dashboard-card-preview-more">y otros {overflowCount} más...</div>
        )}
      </div>

      <div className="dashboard-card-actions-row">
        <button className="btn btn-small btn-primary" onClick={onEdit}>
          <Pencil size={13} /> Editar
        </button>
      </div>

      <div className="dashboard-card-divider" />

      <div className="dashboard-card-stats">
        <div className="dashboard-card-count">{count} {count === 1 ? 'aviso' : 'avisos'}</div>
        {year && <div className="dashboard-card-year">{year}</div>}
      </div>
    </article>
  )
}
