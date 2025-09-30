import React from 'react';
import { App } from './App';
import { renderToString } from 'react-dom/server';
import { store } from './globalStore';

export function render() {
  // Provide some default initial state for SSR (could be fetched per request)
  // Only set values that are undefined to avoid cross-request leakage if running in a shared module context.
  const existing = store.getAll?.() || {};
  if (existing.theme === undefined) store.set('theme', 'light');
  if (existing.count === undefined) store.set('count', 42);
  if (existing.user === undefined) store.set('user', { id: 1, name: 'Server Alice' });

  const finalSnapshot = store.getAll();
  const html = renderToString(<App />);
  const json = JSON.stringify(finalSnapshot).replace(/</g, '\\u003c');
  const head = `<script id="__GEST_STATE__" type="application/json">${json}</script>`;
  return { html, head };
}
