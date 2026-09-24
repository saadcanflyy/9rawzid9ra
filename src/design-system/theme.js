// 9rawZid9ra theme helper: 'dark' (default brand look), 'light', or 'system' (follows the OS).
import { useEffect, useState, useCallback } from 'react';

const KEY = 'qz-theme';

function read() {
  try { return localStorage.getItem(KEY) || 'dark'; } catch (e) { return 'dark'; }
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', dark ? '#080b12' : '#f6f7f9');
  }
}

// Call once before React renders (in src/index.js) to avoid a flash of the wrong theme.
export function initTheme() { applyTheme(read()); }

export function useTheme() {
  const [mode, setMode] = useState(read);
  useEffect(() => { applyTheme(mode); try { localStorage.setItem(KEY, mode); } catch (e) {} }, [mode]);
  const cycle = useCallback(() => setMode(m => (m === 'dark' ? 'light' : m === 'light' ? 'system' : 'dark')), []);
  return { mode, setMode, cycle };
}
