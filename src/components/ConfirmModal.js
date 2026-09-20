import { useEffect } from 'react'

const css = `
  .cm-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(15,14,23,0.85);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: cm-fade 0.18s ease;
  }
  @keyframes cm-fade { from { opacity:0 } to { opacity:1 } }
  .cm-card {
    background: #191826;
    border: 1px solid #2C2A42;
    border-radius: 14px;
    padding: 1.75rem;
    max-width: 380px;
    width: 100%;
    box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    animation: cm-up 0.2s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Outfit', sans-serif;
  }
  @keyframes cm-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  .cm-title {
    font-size: 1rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.4rem;
  }
  .cm-msg {
    font-size: 0.85rem; color: #A4A0C8; line-height: 1.6; margin-bottom: 1.5rem;
  }
  .cm-title:last-child, .cm-title + .cm-actions { margin-bottom: 0; }
  .cm-actions {
    display: flex; gap: 8px; justify-content: flex-end; margin-top: 1.5rem;
  }
  .cm-cancel {
    background: none; border: 1px solid #2C2A42; color: #A4A0C8;
    border-radius: 8px; padding: 8px 18px; font-size: 0.85rem;
    font-family: 'Outfit', sans-serif; cursor: pointer;
    transition: all 0.15s;
  }
  .cm-cancel:hover { border-color: #3D3B5C; color: #EAE7FF; }
  .cm-confirm {
    border: none; border-radius: 8px; padding: 8px 18px;
    font-size: 0.85rem; font-weight: 600;
    font-family: 'Outfit', sans-serif; cursor: pointer;
    color: #fff; transition: opacity 0.15s;
  }
  .cm-confirm:hover { opacity: 0.85; }
`

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirmer',
  confirmColor = '#6366F1',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') (onCancel || onConfirm)?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, onConfirm])

  return (
    <>
      <style>{css}</style>
      <div className="cm-overlay" onClick={onCancel ?? onConfirm}>
        <div className="cm-card" onClick={e => e.stopPropagation()}>
          {title   && <div className="cm-title">{title}</div>}
          {message && <div className="cm-msg">{message}</div>}
          <div className="cm-actions">
            {onCancel && (
              <button className="cm-cancel" onClick={onCancel}>Annuler</button>
            )}
            <button className="cm-confirm" style={{ background: confirmColor }} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
