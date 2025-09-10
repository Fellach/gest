import { describe, it, expect } from 'bun:test';
import { createState, initGlobalState, getGlobalState } from '../src/index';

interface AppState {
  theme: 'light' | 'dark';
  user: { id: number; name: string } | null;
  loggedIn: boolean;
  count?: number;
}

describe('GlobalState (generic)', () => {
  it('sets and gets typed keys', () => {
    const store = createState<AppState>();
    store.set('theme', 'dark');
    expect(store.get('theme')).toBe('dark');
    store.set('user', { id: 1, name: 'Alice' });
    expect(store.get('user')?.name).toBe('Alice');
  });

  it('setMany applies batch updates', () => {
    const store = createState<AppState>();
    store.setMany({ loggedIn: true, theme: 'light' });
    expect(store.get('loggedIn')).toBe(true);
    expect(store.get('theme')).toBe('light');
  });

  it('subscribe listens to single key changes', () => {
    const store = createState<AppState>();
    return new Promise<void>(resolve => {
      const off = store.subscribe('theme', value => {
        expect(value).toBe('dark');
        off();
        resolve();
      });
      store.set('theme', 'dark');
    });
  });

  it('subscribeAll listens to any change', () => {
    const store = createState<AppState>();
    return new Promise<void>(resolve => {
      const off = store.subscribeAll(delta => {
        expect(delta).toHaveProperty('theme');
        off();
        resolve();
      });
      store.set('theme', 'light');
    });
  });

  it('undo and redo work', () => {
    const store = createState<AppState>();
    store.set('theme', 'light');
    store.set('theme', 'dark');
    expect(store.get('theme')).toBe('dark');
    store.undo();
    expect(store.get('theme')).toBe('light');
    store.redo();
    expect(store.get('theme')).toBe('dark');
  });

  it('middleware before/after are executed', () => {
    const store = createState<AppState>();
    const calls: string[] = [];
    store.useBefore(({ key }) => calls.push(`b:${String(key)}`));
    store.useAfter(({ key }) => calls.push(`a:${String(key)}`));
    store.set('theme', 'dark');
    expect(calls).toEqual(['b:theme', 'a:theme']);
  });

  it('initGlobalState creates typed singleton and getGlobalState reuses it', () => {
    const inst = initGlobalState<AppState>({ persist: false }, true); // force reset for isolation
    inst.set('theme', 'dark');
    const again = getGlobalState<AppState>();
    expect(again.get('theme')).toBe('dark');
  });
});
