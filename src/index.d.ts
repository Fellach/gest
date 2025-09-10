export interface GlobalStateOptions {
  persist?: boolean;
  storageKey?: string;
}

export type MiddlewareFn<S extends Record<string, any>> = <K extends keyof S>(
  ctx: { key: K; value: S[K] },
  state: Partial<S>
) => void;

export declare class GlobalState<S extends Record<string, any> = Record<string, any>> {
  constructor(options?: GlobalStateOptions);
  get<K extends keyof S>(key: K): S[K] | undefined;
  getAll(): Partial<S>;
  set<K extends keyof S>(key: K, value: S[K]): void;
  setMany(updates: Partial<S>): void;
  remove<K extends keyof S>(key: K): void;
  clear(): void;
  subscribe<K extends keyof S>(key: K, callback: (value: S[K] | undefined) => void): () => void;
  subscribeAll(callback: (delta: Partial<S>) => void): () => void;
  useBefore(fn: MiddlewareFn<S>): void;
  useAfter(fn: MiddlewareFn<S>): void;
  undo(): void;
  redo(): void;
}

export declare function createState<S extends Record<string, any>>(options?: GlobalStateOptions): GlobalState<S>;
export declare function initGlobalState<S extends Record<string, any>>(options?: GlobalStateOptions, force?: boolean): GlobalState<S>;
export declare function getGlobalState<S extends Record<string, any>>(): GlobalState<S>;
export declare const globalState: GlobalState<any>;
