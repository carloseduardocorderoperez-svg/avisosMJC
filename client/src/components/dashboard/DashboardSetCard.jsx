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
  const isPublishing = useAvisosStore((s) => s.isPublishing)
  const setPublishing = useAvisosStore((s) => s.setPublishing)
  const addNotification = useAvisosStore((s) => s.addNotification)

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

    const dateLabel = formatDate(set?.date) || (set?.title || '')

    // For unpublish, show confirmation first
    if (!targetPublished) {
      const doUnpublish = async () => {
        // hide confirm modal then show progress
        useAvisosStore.getState().hideModal()
        useAvisosStore.getState().showModal({ type: 'publish-progress', props: { dateLabel } })
        try {
          setPublishing(true)
          setSyncing(true)
          const res = await fetch(apiUrl(`/sets/${set.id}/publish`), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: false, publicSlug: slugValue }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error((data && data.error) || 'Error actualizando estado público')
          setIsPublished(!!data.set?.published)
          setSlugValue(data.set?.publicSlug || slugValue)
          if (typeof onPublish === 'function') onPublish(data.set)
          addNotification({ type: 'info', text: `Despublicación en curso. Puede tardar hasta 3 minutos.`, timeout: 4000 })
        } catch (err) {
          console.error('Error unpublishing set', err)
          setPublishError(err.message || 'Error despublicando')
          addNotification({ type: 'error', text: `Error despublicando avisos: ${err.message || ''}`, timeout: 8000 })
        } finally {
          setSyncing(false)
          setPublishing(false)
          useAvisosStore.getState().hideModal()
        }
      }

      useAvisosStore.getState().showModal({ type: 'confirm-unpublish', props: { dateLabel, onConfirm: doUnpublish } })
      return
    }

    // For publish: show confirmation modal first
    const doPublish = async () => {
      useAvisosStore.getState().hideModal()
      useAvisosStore.getState().showModal({ type: 'publish-progress', props: { dateLabel } })
      try {
        setPublishing(true)
        setSyncing(true)
        const res = await fetch(apiUrl(`/sets/${set.id}/publish`), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ published: true, publicSlug: slugValue }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error((data && data.error) || 'Error actualizando estado público')
        setIsPublished(!!data.set?.published)
        setSlugValue(data.set?.publicSlug || slugValue)
        setEditSlugOpen(false)
        if (typeof onPublish === 'function') onPublish(data.set)
        addNotification({ type: 'info', text: `Publicación en curso. Puede tardar hasta 3 minutos.`, timeout: 4000 })
      } catch (err) {
        console.error('Error publishing set', err)
        setPublishError(err.message || 'Error publicando')
        addNotification({ type: 'error', text: `Error publicando avisos: ${err.message || ''}`, timeout: 8000 })
      } finally {
        setSyncing(false)
        setPublishing(false)
        useAvisosStore.getState().hideModal()
      }
    }

    useAvisosStore.getState().showModal({ type: 'confirm-publish', props: { dateLabel, onConfirm: doPublish } })
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
              {isPublished ? (
                <a
                  className="dashboard-card-menu-item"
                  style={{ textDecoration: 'none' }}
                  href={`https://zonaomaha-8a35a.web.app/${slugValue}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                >
                  <Eye size={14} /> Ver publicación
                </a>
              ) : (
                <button type="button" className="dashboard-card-menu-item" onClick={() => actionAndClose(onPreview)}>
                  <Eye size={14} /> Vista previa
                </button>
              )}
              <button type="button" className="dashboard-card-menu-item" onClick={() => { setMenuOpen(false); setEditDateOpen(true) }}>
                <Calendar size={14} /> Editar fecha
              </button>
                   {isPublished && (
                     <button
                       type="button"
                       className="dashboard-card-menu-item"
                       onClick={() => actionAndClose(async () => {
                         const slug = String(slugValue || '').trim();
                         if (!slug) {
                           addNotification({ type: 'error', text: 'No hay URL pública disponible para copiar.', timeout: 3500 })
                           return
                         }
                         const url = `https://zonaomaha-8a35a.web.app/${slug}`
                         try {
                           if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                             await navigator.clipboard.writeText(url)
                           } else {
                             const ta = document.createElement('textarea')
                             ta.value = url
                             ta.style.position = 'fixed'
                             ta.style.left = '-9999px'
                             document.body.appendChild(ta)
                             ta.select()
                             document.execCommand('copy')
                             document.body.removeChild(ta)
                           }
                           addNotification({ type: 'success', text: 'URL pública copiada al portapapeles', timeout: 3000 })
                         } catch (err) {
                           console.error('Error copiando URL', err)
                           addNotification({ type: 'error', text: 'No se pudo copiar la URL', timeout: 4000 })
                         }
                       })}
                     >
                       <Clipboard size={14} /> Copiar URL
                     </button>
                   )}
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
                addNotification({ type: 'info', text: `Actualizando slug para avisos del ${dateLabel}...`, timeout: 5000 })

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

                addNotification({ type: 'success', text: `Slug actualizado para avisos del ${dateLabel}`, timeout: 3000 })
              } catch (err) {
                console.error('Error updating slug', err)
                setPublishError(err.message || 'Error actualizando slug')
                addNotification({ type: 'error', text: `Error actualizando slug: ${err.message || ''}`, timeout: 6000 })
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
