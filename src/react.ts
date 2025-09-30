import { useSyncExternalStore, useRef, useCallback, useEffect } from 'react';
import { getGlobalState, GlobalState, MiddlewareFn } from './index';

// Internal subscription helper for a single key
function subscribeKey<S extends Record<string, any>, K extends keyof S>(store: GlobalState<S>, key: K, cb: () => void) {
  return store.subscribe(key, () => cb());
}

// Internal subscription helper for wildcard (any change)
function subscribeAll<S extends Record<string, any>>(store: GlobalState<S>, cb: () => void) {
  return store.subscribeAll(() => cb());
}

// Snapshot helpers
function getKeySnapshot<S extends Record<string, any>, K extends keyof S>(store: GlobalState<S>, key: K) {
  return store.get(key);
}

// Cached snapshot utility: maintain last shallow object to satisfy
// useSyncExternalStore requirement that getSnapshot returns same ref when unchanged.
interface CachedAll<S extends Record<string, any>> {
  version: number;
  value: Partial<S>;
}

// We store the cache on the store instance via a WeakMap so multiple stores are supported.
const allCache = new WeakMap<object, CachedAll<any>>();

function getAllSnapshot<S extends Record<string, any>>(store: GlobalState<S>) {
  // Access internal version if present; fallback to increment heuristic.
  const anyStore = store as any as { getAll: () => Partial<S>; version?: number };
  const currentVersion = typeof anyStore.version === 'number' ? anyStore.version : -1;
  const cached = allCache.get(store);
  if (cached && cached.version === currentVersion) {
    return cached.value;
  }
  const fresh = anyStore.getAll();
  allCache.set(store, { version: currentVersion, value: fresh });
  return fresh;
}

/**
 * Hook to read & write a single key from the global state.
 * Returns a tuple: [value, setValue].
 */
export function useGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>): [S[K] | undefined, (value: S[K]) => void] {
  const gs = (store || getGlobalState<S>()) as GlobalState<S>;
  const value = useSyncExternalStore(
    (cb) => subscribeKey(gs, key, cb),
    () => getKeySnapshot(gs, key),
    () => getKeySnapshot(gs, key)
  );
  const setter = useCallback((v: S[K]) => gs.set(key, v), [gs, key]);
  return [value, setter];
}

/**
 * Hook returning a setter function for a single key (write-only usage).
 */
export function useSetGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>) {
  const gs = (store || getGlobalState<S>()) as GlobalState<S>;
  return useCallback((v: S[K]) => gs.set(key, v), [gs, key]);
}

/**
 * Hook returning the entire (shallow) global state object. Re-renders on any change.
 */
export function useGlobalAll<S extends Record<string, any>>(store?: GlobalState<S>): Partial<S> {
  const gs = (store || getGlobalState<S>()) as GlobalState<S>;
  return useSyncExternalStore(
    (cb) => subscribeAll(gs, cb),
    () => getAllSnapshot(gs),
    () => getAllSnapshot(gs)
  );
}

/**
 * Hook for deriving a computed slice from the global state with memoized comparison.
 * selector: (state) => derivedValue
 * isEqual: custom comparator (defaults to Object.is)
 */
export function useGlobalSelector<S extends Record<string, any>, T>(
  selector: (state: Partial<S>) => T,
  store?: GlobalState<S>,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const gs = (store || getGlobalState<S>()) as GlobalState<S>;
  const lastRef = useRef<T | undefined>(undefined);
  const snapshot = useSyncExternalStore(
    (cb) => subscribeAll(gs, cb),
    () => {
      const full = getAllSnapshot(gs);
      const selected = selector(full);
      const prev = lastRef.current;
      if (prev === undefined || !isEqual(prev, selected)) {
        lastRef.current = selected;
      }
      return lastRef.current as T;
    },
    () => {
      const full = getAllSnapshot(gs);
      return selector(full);
    }
  );
  return snapshot;
}

/**
 * Convenience hook for undo/redo commands without forcing re-render.
 */
export function useGlobalHistory<S extends Record<string, any>>(store?: GlobalState<S>) {
  const gs = (store || getGlobalState<S>()) as GlobalState<S>;
  const undo = useCallback(() => gs.undo(), [gs]);
  const redo = useCallback(() => gs.redo(), [gs]);
  return { undo, redo };
}

/**
 * Factory to create store-bound hooks with full type inference
 * so you don't need to pass generics at each call site.
 *
 * Example:
 *   interface AppState { theme: 'light'|'dark'; count: number; }
 *   const gs = initGlobalState<AppState>();
 *   const hooks = createGlobalStateHooks(gs);
 *   const [theme, setTheme] = hooks.useState('theme'); // inferred
 */
export function createGlobalStateHooks<S extends Record<string, any>>(store: GlobalState<S>) {
  const useStateHook = <K extends keyof S>(key: K) => useGlobalState<S, K>(key, store);
  const useSetterHook = <K extends keyof S>(key: K) => useSetGlobalState<S, K>(key, store);
  const useAllHook = () => useGlobalAll<S>(store);
  const useSelectorHook = <T>(selector: (s: Partial<S>) => T, isEqual?: (a: T, b: T) => boolean) => useGlobalSelector<S, T>(selector, store, isEqual);
  const useHistoryHook = () => useGlobalHistory<S>(store);
  const useBeforeHook = (fn: MiddlewareFn<S>) => useGlobalMiddleware<S>('before', fn, store);
  const useAfterHook = (fn: MiddlewareFn<S>) => useGlobalMiddleware<S>('after', fn, store);
  return {
    store,
    useGlobalState: useStateHook,
    useSetGlobalState: useSetterHook,
    useGlobalAll: useAllHook,
    useGlobalSelector: useSelectorHook,
    useGlobalHistory: useHistoryHook,
    useBefore: useBeforeHook,
    useAfter: useAfterHook,
  };
}

export type { GlobalState };

/**
 * React hook to register a middleware function (before/after) with automatic cleanup.
 * The function identity should be stable (wrap with useCallback if capturing props).
 */
export function useGlobalMiddleware<S extends Record<string, any>>(
  type: 'before' | 'after',
  fn: MiddlewareFn<S>,
  store?: GlobalState<S>
) {
  const gs = (store || getGlobalState<S>()) as GlobalState<S> & { removeMiddleware?: (t: 'before' | 'after', f: MiddlewareFn<S>) => void };
  // Register on mount / dependency change
  useEffect(() => {
    if (type === 'before') gs.useBefore(fn);
    else gs.useAfter(fn);
    return () => {
      gs.removeMiddleware?.(type, fn);
    };
  }, [gs, type, fn]);
}

/** Shorthand hook for before middleware */
export function useBeforeMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>) {
  return useGlobalMiddleware('before', fn, store);
}
/** Shorthand hook for after middleware */
export function useAfterMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>) {
  return useGlobalMiddleware('after', fn, store);
}