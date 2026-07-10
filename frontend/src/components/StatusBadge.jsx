const LABELS = {
  ok: 'Online',
  checking: 'Verificando...',
  offline: 'Offline',
}

export default function StatusBadge({ status }) {
  return (
    <div className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" />
      {LABELS[status] ?? 'Offline'}
    </div>
  )
}
