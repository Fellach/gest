import { describe, it, expect } from 'bun:test';
import { createState } from '../src/index';
import { enableGlobalPersistence, initGlobalState, getGlobalState } from '../src/index';

interface PState { value: number; }

describe('Persistence (non-browser guard)', () => {
  it('does not throw when persist enabled without localStorage', () => {
    const store = createState<PState>({ persist: true, storageKey: 'x-test' });
    expect(() => store.set('value', 42)).not.toThrow();
  });

  it('allows enabling persistence after initial non-persistent init', () => {
    // Simulate absence of localStorage first
    const original = (globalThis as any).localStorage;
    delete (globalThis as any).localStorage;
    const gs = initGlobalState<PState>({ persist: false, storageKey: 'late-key' }, true);
    gs.set('value', 1);
    // Add mock localStorage then enable
    let stored: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => stored[k] || null,
      setItem: (k: string, v: string) => { stored[k] = v; },
      removeItem: (k: string) => { delete stored[k]; },
      clear: () => { stored = {}; }
    } as any;
    enableGlobalPersistence('late-key');
    gs.set('value', 2);
    expect(stored['late-key']).toContain('"value":2');
    // cleanup
    if (original) (globalThis as any).localStorage = original; else delete (globalThis as any).localStorage;
  });

  it('loads existing state when persistence enabled at construction with localStorage present', () => {
    let stored: Record<string, string> = { 'p-load': JSON.stringify({ value: 5 }) };
    const original = (globalThis as any).localStorage;
    (globalThis as any).localStorage = {
      getItem: (k: string) => stored[k] || null,
      setItem: (k: string, v: string) => { stored[k] = v; },
      removeItem: (k: string) => { delete stored[k]; },
      clear: () => { stored = {}; }
    } as any;
    const store = createState<PState>({ persist: true, storageKey: 'p-load' });
    expect(store.get('value')).toBe(5);
    store.set('value', 9);
    expect(stored['p-load']).toContain('"value":9');
    if (original) (globalThis as any).localStorage = original; else delete (globalThis as any).localStorage;
  });
});
