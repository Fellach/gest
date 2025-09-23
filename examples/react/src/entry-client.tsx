import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { App, store } from './App';

// If server provided an initial state snapshot, apply it before first render.
(() => {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('__GEST_STATE__');
  if (!el) return;
  try {
    const json = el.textContent || '{}';
    const data = JSON.parse(json);
    (store as any).hydrate ? (store as any).hydrate(data, { mode: 'merge', onlyNew: true }) : Object.entries(data).forEach(([k, v]) => (store as any).set(k, v));
  } catch (e) {
    console.warn('[gest] Failed to parse SSR state', e);
  }
})();

// Attempt to hydrate if server-rendered markup exists; otherwise create root.
const container = document.getElementById('root');
if (container?.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else if (container) {
  createRoot(container).render(<App />);
}
