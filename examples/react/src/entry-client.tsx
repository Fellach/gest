import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { App } from './App';
import { commitInitialState, readPersistedSnapshot } from './globalStore';

function readSSRSnapshot(): Record<string, unknown> | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('__GEST_STATE__');
  if (!el) return null;
  try {
    const json = el.textContent || '{}';
    return JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    console.warn('[gest] Failed to parse SSR state', err);
    return null;
  }
}

const ssrSnapshot = readSSRSnapshot();
const persistedSnapshot = readPersistedSnapshot();
const initialState = {
  ...(persistedSnapshot ?? {}),
  ...(ssrSnapshot ?? {}),
};

commitInitialState(initialState, true);

// Attempt to hydrate if server-rendered markup exists; otherwise create root.
const container = document.getElementById('root');
if (container?.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else if (container) {
  createRoot(container).render(<App />);
}
