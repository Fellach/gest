import { useSyncExternalStore, useRef, useCallback } from 'react';
import { getGlobalState } from './index';
// Internal subscription helper for a single key
function subscribeKey(store, key, cb) {
    return store.subscribe(key, () => cb());
}
// Internal subscription helper for wildcard (any change)
function subscribeAll(store, cb) {
    return store.subscribeAll(() => cb());
}
// Snapshot helpers
function getKeySnapshot(store, key) {
    return store.get(key);
}
function getAllSnapshot(store) {
    return store.getAll();
}
/**
 * Hook to read & write a single key from the global state.
 * Returns a tuple: [value, setValue].
 */
export function useGlobalState(key, store) {
    const gs = (store || getGlobalState());
    const value = useSyncExternalStore((cb) => subscribeKey(gs, key, cb), () => getKeySnapshot(gs, key), () => getKeySnapshot(gs, key));
    const setter = useCallback((v) => gs.set(key, v), [gs, key]);
    return [value, setter];
}
/**
 * Hook returning a setter function for a single key (write-only usage).
 */
export function useSetGlobalState(key, store) {
    const gs = (store || getGlobalState());
    return useCallback((v) => gs.set(key, v), [gs, key]);
}
/**
 * Hook returning the entire (shallow) global state object. Re-renders on any change.
 */
export function useGlobalAll(store) {
    const gs = (store || getGlobalState());
    return useSyncExternalStore((cb) => subscribeAll(gs, cb), () => getAllSnapshot(gs), () => getAllSnapshot(gs));
}
/**
 * Hook for deriving a computed slice from the global state with memoized comparison.
 * selector: (state) => derivedValue
 * isEqual: custom comparator (defaults to Object.is)
 */
export function useGlobalSelector(selector, store, isEqual = Object.is) {
    const gs = (store || getGlobalState());
    const lastRef = useRef(undefined);
    const snapshot = useSyncExternalStore((cb) => subscribeAll(gs, cb), () => {
        const full = getAllSnapshot(gs);
        const selected = selector(full);
        const prev = lastRef.current;
        if (prev === undefined || !isEqual(prev, selected)) {
            lastRef.current = selected;
        }
        return lastRef.current;
    }, () => {
        const full = getAllSnapshot(gs);
        return selector(full);
    });
    return snapshot;
}
/**
 * Convenience hook for undo/redo commands without forcing re-render.
 */
export function useGlobalHistory(store) {
    const gs = (store || getGlobalState());
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
export function createGlobalStateHooks(store) {
    const useStateHook = (key) => useGlobalState(key, store);
    const useSetterHook = (key) => useSetGlobalState(key, store);
    const useAllHook = () => useGlobalAll(store);
    const useSelectorHook = (selector, isEqual) => useGlobalSelector(selector, store, isEqual);
    const useHistoryHook = () => useGlobalHistory(store);
    return {
        store,
        useGlobalState: useStateHook,
        useSetGlobalState: useSetterHook,
        useGlobalAll: useAllHook,
        useGlobalSelector: useSelectorHook,
        useGlobalHistory: useHistoryHook,
    };
}
