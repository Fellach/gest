import { GlobalState, MiddlewareFn } from './index';

export declare function useGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>): [S[K] | undefined, (value: S[K]) => void];
export declare function useSetGlobalState<S extends Record<string, any>, K extends keyof S>(key: K, store?: GlobalState<S>): (value: S[K]) => void;
export declare function useGlobalAll<S extends Record<string, any>>(store?: GlobalState<S>): Partial<S>;
export declare function useGlobalSelector<S extends Record<string, any>, T>(selector: (state: Partial<S>) => T, store?: GlobalState<S>, isEqual?: (a: T, b: T) => boolean): T;
export declare function useGlobalHistory<S extends Record<string, any>>(store?: GlobalState<S>): { undo: () => void; redo: () => void };
export declare function useGlobalMiddleware<S extends Record<string, any>>(type: 'before' | 'after', fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
export declare function useBeforeMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
export declare function useAfterMiddleware<S extends Record<string, any>>(fn: MiddlewareFn<S>, store?: GlobalState<S>): void;
export declare function createGlobalStateHooks<S extends Record<string, any>>(store: GlobalState<S>): {
  store: GlobalState<S>;
  useGlobalState: <K extends keyof S>(key: K) => [S[K] | undefined, (value: S[K]) => void];
  useSetGlobalState: <K extends keyof S>(key: K) => (value: S[K]) => void;
  useGlobalAll: () => Partial<S>;
  useGlobalSelector: <T>(selector: (s: Partial<S>) => T, isEqual?: (a: T, b: T) => boolean) => T;
  useGlobalHistory: () => { undo: () => void; redo: () => void };
  useBefore: (fn: MiddlewareFn<S>) => void;
  useAfter: (fn: MiddlewareFn<S>) => void;
};
export type { GlobalState };
