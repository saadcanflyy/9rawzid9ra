import { useEffect, useRef } from 'react'

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirmer',
  confirmColor = '#4F8EF7',
  onConfirm,
  onCancel,
}) {
  const danger = confirmColor === '#F87171'
  const cancelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') (onCancel || onConfirm)?.() }
    window.addEventListener('keydown', handler)
    if (danger) cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, onConfirm, danger])

  return (
    <div className="qz-scrim" onClick={onCancel ?? onConfirm}>
      <div className="qz-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" onClick={e => e.stopPropagation()}>
        {title && <h2 className="qz-modal__title" id="cm-title">{title}</h2>}
        {message && <p className="qz-modal__body">{message}</p>}
        <div className="qz-modal__actions">
          {onCancel && (
            <button type="button" ref={cancelRef} className="qz-btn qz-btn--secondary" onClick={onCancel}>Annuler</button>
          )}
          <button type="button" className={`qz-btn qz-btn--${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
