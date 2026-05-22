import React from 'react'
import { useAvisosStore } from '../../store/avisosStore'

export default function NotificationCenter() {
  const notifications = useAvisosStore((s) => s.notifications)
  const remove = useAvisosStore((s) => s.removeNotification)

  if (!notifications || notifications.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8 }}>
      {notifications.map((n) => (
        <div key={n.id} style={{ minWidth: 260, maxWidth: 420, padding: '10px 14px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', background: n.type === 'error' ? '#fdecea' : (n.type === 'success' ? '#e6f4ea' : '#eef6ff'), color: '#111', border: n.type === 'error' ? '1px solid #f5c6cb' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14 }}>{n.text}</div>
          <button onClick={() => remove(n.id)} style={{ marginLeft: 12, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      ))}
    </div>
  )
}
