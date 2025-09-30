import { GlobalState, MiddlewareFn } from './index';
/**
 * Hook to read & write a single key from the global state.
 * Returns a tuple: [value, setValue].
 */
export declare function useGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>): [S[K] | undefined, (value: S[K]) => void];
/**
 * Hook returning a setter function for a single key (write-only usage).
 */
export declare function useSetGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>): (v: S[K]) => void;
/**
 * Hook returning the entire (shallow) global state object. Re-renders on any change.
 */
export declare function useGlobalAll<S extends Record<string, any>>(store?: GlobalState<S>): Partial<S>;
/**
 * Hook for deriving a computed slice from the global state with memoized comparison.
 * selector: (state) => derivedValue
 * isEqual: custom comparator (defaults to Object.is)
 */
export declare function useGlobalSelector<S extends Record<string, any>, T>(selector: (state: Partial<S>) => T, store?: GlobalState<S>, isEqual?: (a: T, b: T) => boolean): T;
/**
 * Convenience hook for undo/redo commands without forcing re-render.
 */
export declare function useGlobalHistory<S extends Record<string, any>>(store?: GlobalState<S>): {
    undo: () => void;
    redo: () => void;
};
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
export declare function createGlobalStateHooks<S extends Record<string, any>>(store: GlobalState<S>): {
    store: GlobalState<S>;
    useGlobalState: <K extends keyof S>(key: K) => [S[K] | undefined, (value: S[K]) => void];
    useSetGlobalState: <K extends keyof S>(key: K) => (v: S[K]) => void;
    useGlobalAll: () => Partial<S>;
    useGlobalSelector: <T>(selector: (s: Partial<S>) => T, isEqual?: (a: T, b: T) => boolean) => T;
    useGlobalHistory: () => {
        undo: () => void;
        redo: () => void;
    };
    useBefore: (fn: MiddlewareFn<S>) => void;
    useAfter: (fn: MiddlewareFn<S>) => void;
};
export type { GlobalState };
/**
 * React hook to register a middleware function (before/after) with automatic cleanup.
 * The function identity should be stable (wrap with useCallback if capturing props).
 */
export declare function useGlobalMiddleware<S extends Record<string, any>>(type: 'before' | 'after', fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
/** Shorthand hook for before middleware */
export declare function useBeforeMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
/** Shorthand hook for after middleware */
export declare function useAfterMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
