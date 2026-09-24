// Shared focus-trap for dialogs (Modal, Sheet, ConfirmModal): keeps Tab/Shift+Tab
// cycling inside the container while it's open, and returns focus to whatever
// triggered it once the returned cleanup function runs.
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container) {
  const previouslyFocused = document.activeElement;

  function getFocusable() {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  }

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeyDown);

  return function release() {
    container.removeEventListener('keydown', onKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  };
}

export function focusFirst(container, fallbackRef) {
  const focusable = Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (focusable.length > 0) focusable[0].focus();
  else if (fallbackRef) fallbackRef.focus();
}
