import React from 'react'
import { createPortal } from 'react-dom'
import { useAvisosStore } from '../../store/avisosStore'

function PublishProgress({ title, dateLabel, onClose }) {
  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="ai-modal-header">
          <div className="ai-modal-title">Publicación en proceso</div>
          <button className="ai-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ai-step-body">
          <p>Se están publicando los avisos{dateLabel ? ` del ${dateLabel}` : ''}. Esto puede tardar hasta 3 minutos en verse reflejado en la página pública.</p>
          <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>Puedes cerrar este mensaje; la publicación seguirá en curso.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--border-strong)', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmUnpublish({ dateLabel, onCancel, onConfirm }) {
  return (
    <div className="ai-modal-backdrop" onClick={onCancel}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="ai-modal-header">
          <div className="ai-modal-title">Confirmar despublicación</div>
          <button className="ai-modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="ai-step-body">
          <p>¿Estás seguro que deseas despublicar los avisos{dateLabel ? ` del ${dateLabel}` : ''}? Esta acción quitará el contenido de la página pública y puede tardar hasta 3 minutos en propagarse.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--border-strong)', justifyContent: 'flex-end' }}>
          <button className="btn btn-neutral" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Sí, despublicar</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmPublish({ dateLabel, onCancel, onConfirm }) {
  return (
    <div className="ai-modal-backdrop" onClick={onCancel}>
      <div className="ai-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="ai-modal-header">
          <div className="ai-modal-title">Confirmar publicación</div>
          <button className="ai-modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="ai-step-body">
          <p>¿Deseas publicar los avisos{dateLabel ? ` del ${dateLabel}` : ''}? Esto generará el HTML estático y lanzará el despliegue; puede tardar hasta 3 minutos en verse reflejado en la página pública.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: 16, borderTop: '1px solid var(--border-strong)', justifyContent: 'flex-end' }}>
          <button className="btn btn-neutral" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>Sí, publicar</button>
        </div>
      </div>
    </div>
  )
}

export default function ModalHost() {
  const modal = useAvisosStore((s) => s.modal)
  const hide = useAvisosStore((s) => s.hideModal)

  if (!modal) return null

  const onClose = () => hide()

  if (modal.type === 'publish-progress') {
    return createPortal(<PublishProgress {...modal.props} onClose={onClose} />, document.body)
  }

  if (modal.type === 'confirm-unpublish') {
    return createPortal(<ConfirmUnpublish {...modal.props} onCancel={onClose} />, document.body)
  }

  if (modal.type === 'confirm-publish') {
    return createPortal(<ConfirmPublish {...modal.props} onCancel={onClose} />, document.body)
  }

  return null
}
