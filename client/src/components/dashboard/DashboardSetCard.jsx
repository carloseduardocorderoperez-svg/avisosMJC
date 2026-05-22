import React, { useEffect, useRef, useState } from "react"
import { Pencil, Eye, Clipboard, Copy, Trash2, MoreVertical, Calendar, FileText, Underline, Upload, Check } from "lucide-react"
import { getYear } from "../../utils/dateUtils"
import { apiUrl } from "../../utils/api"
import EditDateModal from "../EditDateModal"
import EditSlugModal from "../EditSlugModal"
import { useAvisosStore } from "../../store/avisosStore"

export default function DashboardSetCard({
  set,
  displayTitle,
  onEdit,
  onPreview,
  onCopyHtml,
  onDuplicate,
  onDelete,
  onPublish,
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

  const year = getYear(set?.date || set?.updatedAt || set?.createdAt)
  const actionAndClose = (action) => {
    action()
    setMenuOpen(false)
  }

  // Publish state
  const [isPublished, setIsPublished] = useState(!!set?.published)
  const [slugValue, setSlugValue] = useState(set?.publicSlug || (set?.code || '').toLowerCase())
  const [syncing, setSyncing] = useState(false)
  const [publishError, setPublishError] = useState("")
  const [editSlugOpen, setEditSlugOpen] = useState(false)
  const [editDateOpen, setEditDateOpen] = useState(false)
  const [editDateLoading, setEditDateLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const isPublishing = useAvisosStore((s) => s.isPublishing)
  const setPublishing = useAvisosStore((s) => s.setPublishing)

  useEffect(() => {
    setIsPublished(!!set?.published)
    setSlugValue(set?.publicSlug || (set?.code || '').toLowerCase())
  }, [set])

  const handleTogglePublish = async () => {
    setPublishError("")
    const targetPublished = !isPublished

    if (isPublishing) {
      setPublishError('Otra publicación está en curso. Espera a que termine.')
      return
    }

    // Validate slug when publishing
    if (targetPublished) {
      const slug = String(slugValue || '').trim().toLowerCase()
      // basic slug normalization and validation
      const normalized = slug.replace(/[^a-z0-9\-_.]+/g, '-').replace(/^-+|-+$/g, '')
      if (!normalized || normalized.length < 2) {
        setPublishError('Slug inválido. Usa letras, números y guiones (mínimo 2 caracteres).')
        return
      }
      if (normalized !== slugValue) setSlugValue(normalized)
    }

    try {
      setPublishing(true)
      setSyncing(true)
      const dateLabel = formatDate(set?.date) || (set?.title || '')
      setNotification({ type: 'info', text: `${targetPublished ? 'Publicando' : 'Despublicando'} avisos del ${dateLabel}...` })

      const res = await fetch(apiUrl(`/sets/${set.id}/publish`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: targetPublished, publicSlug: slugValue }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error((data && data.error) || 'Error actualizando estado público')
      }

      setIsPublished(!!data.set?.published)
      setSlugValue(data.set?.publicSlug || slugValue)
      setEditSlugOpen(false)
      if (typeof onPublish === 'function') onPublish(data.set)

      const successLabel = formatDate(data.set?.date) || (data.set?.title || '')
      setNotification({ type: 'success', text: `${data.set?.published ? 'Publicado' : 'Despublicado'} avisos del ${successLabel}` })
      setTimeout(() => setNotification(null), 4000)
    } catch (err) {
      console.error('Error publishing set', err)
      setPublishError(err.message || 'Error publicando')
      setNotification({ type: 'error', text: `Error publicando avisos: ${err.message || ''}` })
      setTimeout(() => setNotification(null), 6000)
    } finally {
      setSyncing(false)
      setPublishing(false)
    }
  }

  const handleEditDate = async (newDate) => {
    try {
      setEditDateLoading(true)
      const res = await fetch(apiUrl(`/sets/${set.id}/update-date`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data && data.error) || 'Error actualizando fecha')
      }

      const data = await res.json()
      setEditDateOpen(false)
      // Notify parent to refresh
      if (typeof onPublish === 'function') onPublish(data.set)
    } catch (err) {
      console.error('Error updating date', err)
      alert(err.message || 'Error actualizando fecha')
    } finally {
      setEditDateLoading(false)
    }
  }

  return (
    <article className={`dashboard-card ${isPublished ? 'published' : ''}`} aria-label={`Set ${displayTitle}`} ref={menuRef}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title-wrap">
          <Calendar size={16} className="dashboard-card-calendar" />
          <div>
            <div className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {displayTitle}
              {isPublished && (
                <div className="dashboard-card-published-inline">
                  <Check size={12} />
                  <span>Publicado</span>
                </div>
              )}
            </div>
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
              {isPublished?  <a type="button" className="dashboard-card-menu-item" style={{ textDecoration: 'none' }}  onClick={() => actionAndClose(onPreview)} href={`https://zonaomaha-8a35a.web.app/${slugValue}`} target="_blank" rel="noreferrer noopener">
                <Eye size={14} /> Ver publicación
              </a> : (
                <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onPreview)}>
                  <Eye size={14} /> Vista previa
                </button>
              )}
              <button type="button" className="dashboard-card-menu-item" onClick={() => { setMenuOpen(false); setEditDateOpen(true) }}>
                <Calendar size={14} /> Editar fecha
              </button>
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(() => setEditSlugOpen(true))}>
                <Underline size={14} /> Editar slug
              </button>
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onCopyHtml)}>
                <Clipboard size={14} /> Copiar HTML
              </button>
              <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onDuplicate)}>
                <Copy size={14} /> Duplicar
              </button>
                <button disabled={syncing || isPublishing} type="button" className={`dashboard-card-menu-item ${isPublished ? 'danger' : 'ok'}`} onClick={() => actionAndClose(handleTogglePublish)}>
                  <Upload size={14} /> {syncing ? '...' : isPublished ? 'Despublicar' : 'Publicar'}
              </button>
              <button type="button" className="dashboard-card-menu-item danger" onClick={() => actionAndClose(onDelete)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`publish-notification ${notification.type}`}
          style={{
            margin: '8px 12px',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            color: notification.type === 'error' ? '#3b0b0b' : '#042b14',
            background: notification.type === 'error' ? '#f8d7da' : (notification.type === 'success' ? '#d4edda' : '#e2f0ff'),
          }}
        >
          {notification.text}
        </div>
      )}

      {isPublished && <div className="published-ribbon" aria-hidden></div>}

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
        <button className="btn-editar-set"  onClick={onEdit}>
          <Pencil size={13} /> Editar
        </button>
        
        {editSlugOpen && (
          <EditSlugModal
            set={set}
            initialValue={slugValue}
            onClose={() => setEditSlugOpen(false)}
            onSave={async (newSlug) => {
              setPublishError("")
              if (isPublishing) {
                setPublishError('Otra publicación está en curso. Espera a que termine.')
                return
              }
              try {
                setPublishing(true)
                setSyncing(true)
                const slug = String(newSlug || '').trim().toLowerCase()
                const normalized = slug.replace(/[^a-z0-9\-_.]+/g, '-').replace(/^-+|-+$/g, '')
                if (!normalized || normalized.length < 2) {
                  setPublishError('Slug inválido. Usa letras, números y guiones (mínimo 2 caracteres).')
                  return
                }
                if (normalized !== newSlug) setSlugValue(normalized)

                const dateLabel = formatDate(set?.date) || (set?.title || '')
                setNotification({ type: 'info', text: `Actualizando slug para avisos del ${dateLabel}...` })

                const res = await fetch(apiUrl(`/sets/${set.id}/publish`), {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ published: isPublished, publicSlug: normalized }),
                })

                const data = await res.json()
                if (!res.ok) {
                  throw new Error((data && data.error) || 'Error actualizando slug')
                }

                setSlugValue(data.set?.publicSlug || normalized)
                setEditSlugOpen(false)
                if (typeof onPublish === 'function') onPublish(data.set)

                setNotification({ type: 'success', text: `Slug actualizado para avisos del ${dateLabel}` })
                setTimeout(() => setNotification(null), 3000)
              } catch (err) {
                console.error('Error updating slug', err)
                setPublishError(err.message || 'Error actualizando slug')
                setNotification({ type: 'error', text: `Error actualizando slug: ${err.message || ''}` })
                setTimeout(() => setNotification(null), 6000)
              } finally {
                setSyncing(false)
                setPublishing(false)
              }
            }}
            loading={syncing}
            error={publishError}
          />
        )}
      </div>

      <div className="dashboard-card-divider" />

      <div className="dashboard-card-stats">
        <div className="dashboard-card-count">{count} {count === 1 ? 'aviso' : 'avisos'}</div>
      </div>

      {year && <div className="dashboard-card-year">{year}</div>}

      {editDateOpen && (
        <EditDateModal
          set={set}
          onClose={() => setEditDateOpen(false)}
          onSave={handleEditDate}
          loading={editDateLoading}
        />
      )}
    </article>
  )
}
