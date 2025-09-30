import { initGlobalState } from 'global-event-state';
import { createGlobalStateHooks } from 'global-event-state/react';

export interface AppState {
  theme: 'light' | 'dark';
  count: number;
  user: { id: number; name: string } | null;
}

const STORAGE_KEY = 'gest-demo';

const DEFAULTS: Partial<AppState> = {
  theme: 'light',
  count: 0,
  user: null,
};

export const store = initGlobalState<AppState>({ persist: false, storageKey: STORAGE_KEY });
export const gs = createGlobalStateHooks(store);

function hasStorage(): boolean {
  return typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined';
}

export function readPersistedSnapshot(): Partial<AppState> | null {
  if (!hasStorage()) return null;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppState>) : null;
  } catch (err) {
    console.warn('[gest] unable to read persisted snapshot', err);
    return null;
  }
}

export function commitInitialState(snapshot: Partial<AppState> | null, enablePersistence = true) {
  const initial = snapshot ?? {};
  store.hydrate(initial, { mode: 'replace', emit: false });
  store.hydrate(DEFAULTS, { onlyNew: true, emit: false });

  if (!enablePersistence || !hasStorage()) return;

  const current = store.getAll();
  store.enablePersistence(STORAGE_KEY);
  store.hydrate(current, { mode: 'replace', emit: false });
}

export { STORAGE_KEY };
