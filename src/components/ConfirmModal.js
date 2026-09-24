import { useEffect, useRef } from 'react'
import { trapFocus } from '../design-system/focusTrap'

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirmer',
  confirmColor = '#4F8EF7',
  onConfirm,
  onCancel,
}) {
  const danger = confirmColor === '#F87171'
  const modalRef = useRef(null)
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') (onCancel || onConfirm)?.() }
    window.addEventListener('keydown', handler)
    const untrap = modalRef.current ? trapFocus(modalRef.current) : null
    const t = setTimeout(() => {
      (danger ? cancelRef.current : confirmRef.current)?.focus()
    }, 0)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(t); untrap?.() }
  }, [onCancel, onConfirm, danger])

  return (
    <div className="qz-scrim" onClick={onCancel ?? onConfirm}>
      <div className="qz-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="cm-title" onClick={e => e.stopPropagation()}>
        {title && <h2 className="qz-modal__title" id="cm-title">{title}</h2>}
        {message && <p className="qz-modal__body">{message}</p>}
        <div className="qz-modal__actions">
          {onCancel && (
            <button type="button" ref={cancelRef} className="qz-btn qz-btn--secondary" onClick={onCancel}>Annuler</button>
          )}
          <button type="button" ref={confirmRef} className={`qz-btn qz-btn--${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
