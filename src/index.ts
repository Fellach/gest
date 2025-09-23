export interface GlobalStateOptions {
  persist?: boolean;
  storageKey?: string;
}

export type MiddlewareFn<S extends Record<string, any>> = <K extends keyof S>(ctx: { key: K; value: S[K] }, state: Partial<S>) => void;

export type EventCallback<T> = (value: T) => void;

export class GlobalState<S extends Record<string, any> = Record<string, any>> {
  private state: Partial<S>;
  private eventTarget: EventTarget;
  private middlewares: { before: MiddlewareFn<S>[]; after: MiddlewareFn<S>[] };
  private history: Partial<S>[];
  private future: Partial<S>[];
  private persist: boolean;
  private storageKey: string; // mutable to optionally allow late persistence enabling (see enablePersistence)
  private version: number; // monotonically increasing for snapshot stability

  constructor({ persist = false, storageKey = "global-state" }: GlobalStateOptions = {}) {
    this.state = {};
    this.eventTarget = new EventTarget();
    this.middlewares = { before: [], after: [] };
    this.history = [];
    this.future = [];
    this.persist = persist;
    this.storageKey = storageKey;
    this.version = 0;
    if (this.persist) this.loadFromStorage();
  }

  // ---------- Core ----------
  get<K extends keyof S>(key: K): S[K] | undefined {
    return this.state[key] as S[K] | undefined;
  }

  getAll(): Partial<S> {
    // Return a shallow clone to prevent accidental mutation, but callers that
    // need referential stability should rely on a caching layer (e.g. React hook).
    return { ...this.state };
  }

  set<K extends keyof S>(key: K, value: S[K]): void {
    this.runMiddlewares("before", { key, value });
    this.history.push({ ...this.state });
    (this.state as any)[key] = value;
    this.version++;
    this.emit(String(key), value);
    this.emit("*", { [key]: value } as any);
    this.runMiddlewares("after", { key, value });
    if (this.persist) this.saveToStorage();
  }

  setMany(updates: Partial<S>): void {
    (Object.entries(updates) as [keyof S, S[keyof S]][]).forEach(([k, v]) => {
      if (v !== undefined) this.set(k, v);
    });
  }

  remove<K extends keyof S>(key: K): void {
    if (key in this.state) {
      delete (this.state as any)[key];
      this.version++;
      this.emit(String(key), undefined);
      if (this.persist) this.saveToStorage();
    }
  }

  clear(): void {
    this.state = {};
    this.version++;
    this.emit("*", {} as any);
    if (this.persist) this.saveToStorage();
  }

  // ---------- Events ----------
  subscribe<K extends keyof S>(key: K, callback: EventCallback<S[K] | undefined>): () => void {
    const eventName = `${this.storageKey}:${String(key)}`;
    const handler = (e: Event) => callback((e as CustomEvent).detail.value as S[K] | undefined);
    this.eventTarget.addEventListener(eventName, handler);
    return () => this.eventTarget.removeEventListener(eventName, handler);
  }

  subscribeAll(callback: EventCallback<Partial<S>>): () => void {
    const eventName = `${this.storageKey}:*`;
    const handler = (e: Event) => callback((e as CustomEvent).detail.value as Partial<S>);
    this.eventTarget.addEventListener(eventName, handler);
    return () => this.eventTarget.removeEventListener(eventName, handler);
  }

  private emit(key: string, value: any): void {
    const event = new CustomEvent(`${this.storageKey}:${key}`, { detail: { value } });
    this.eventTarget.dispatchEvent(event);
  }

  // ---------- Middleware ----------
  useBefore(fn: MiddlewareFn<S>): void {
    this.middlewares.before.push(fn);
  }
  useAfter(fn: MiddlewareFn<S>): void {
    this.middlewares.after.push(fn);
  }
  private runMiddlewares(type: "before" | "after", ctx: { key: keyof S; value: any }): void {
    for (const fn of this.middlewares[type]) fn(ctx as any, this.state);
  }

  // ---------- Persistence ----------
  private hasStorage(): boolean {
    return typeof globalThis !== "undefined" && typeof (globalThis as any).localStorage !== "undefined";
  }
  private saveToStorage(): void {
    if (!this.hasStorage()) return; // noop in non-browser

    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }
  private loadFromStorage(): void {
    if (!this.hasStorage()) return;
    const raw = localStorage.getItem(this.storageKey);
    if (raw) this.state = JSON.parse(raw) as Partial<S>;
  }

  /**
   * Returns whether persistence is currently enabled for this instance.
   */
  isPersistent(): boolean {
    return this.persist;
  }

  /**
   * Enable persistence after the store has already been created (lazy upgrade).
   * Optionally provide a storageKey if changing from the default; existing
   * subscribers will continue to listen on the old key prefix, so changing the
   * key after subscriptions is discouraged. If a new key is provided and
   * differs, it will be applied before loading.
   */
  enablePersistence(storageKey?: string): void {
    if (this.persist) return; // already enabled
    if (storageKey && storageKey !== this.storageKey) {
      this.storageKey = storageKey;
    }
    this.persist = true;
    this.loadFromStorage();
    // Persist current state snapshot (might be empty if nothing set yet)
    this.saveToStorage();
  }

  // ---------- Undo/Redo ----------
  undo(): void {
    if (this.history.length === 0) return;
    this.future.push({ ...this.state });
    this.state = this.history.pop()!;
    this.version++;
    this.emit("*", { ...this.state });
    if (this.persist) this.saveToStorage();
  }
  redo(): void {
    if (this.future.length === 0) return;
    this.history.push({ ...this.state });
    this.state = this.future.pop()!;
    this.version++;
    this.emit("*", { ...this.state });
    if (this.persist) this.saveToStorage();
  }

  /**
   * Hydrate or batch apply a snapshot.
   * Options:
   *  - mode: 'merge' (default) merges keys, 'replace' overwrites entire state.
   *  - emit: whether to emit a single wildcard change event (default true).
   *  - recordHistory: push previous snapshot onto history stack (default false).
   *  - onlyNew: when mode='merge', only set keys that are currently undefined (useful for SSR to avoid overwriting client-changed values during HMR).
   */
  hydrate(snapshot: Partial<S>, opts: { mode?: 'merge' | 'replace'; emit?: boolean; recordHistory?: boolean; onlyNew?: boolean } = {}): void {
    const { mode = 'merge', emit = true, recordHistory = false, onlyNew = false } = opts;
    if (recordHistory) {
      this.history.push({ ...this.state });
    }
    let changed = false;
    if (mode === 'replace') {
      const prevKeys = Object.keys(this.state as any).length;
      this.state = { ...snapshot } as Partial<S>;
      changed = prevKeys > 0 || Object.keys(snapshot as any).length > 0;
    } else {
      for (const [k, v] of Object.entries(snapshot) as [keyof S, S[keyof S]][]) {
        if (onlyNew && this.state[k] !== undefined) continue;
        if (v !== undefined && this.state[k] !== v) {
          (this.state as any)[k] = v;
          changed = true;
        }
      }
    }
    if (changed) {
      this.version++;
      if (emit) this.emit('*', { ...this.state });
      if (this.persist) this.saveToStorage();
    }
  }
}

// ---------- Factory & Singleton (Typed) ----------
export function createState<S extends Record<string, any>>(options?: GlobalStateOptions) {
  return new GlobalState<S>(options);
}

let _globalStateInstance: GlobalState<any> | null = null;

export function initGlobalState<S extends Record<string, any>>(options?: GlobalStateOptions, force = false): GlobalState<S> {
  if (!_globalStateInstance || force) {
    _globalStateInstance = new GlobalState(options);
  }
  else if (options?.persist) {
    // Attempt to upgrade existing instance to persistent if it isn't already
    const inst = _globalStateInstance as GlobalState<any> & { isPersistent?: () => boolean; enablePersistence?: (k?: string) => void };
    if (typeof inst.isPersistent === 'function' && !inst.isPersistent()) {
      inst.enablePersistence?.(options.storageKey);
    }
  }
  return _globalStateInstance as GlobalState<S>;
}

export function getGlobalState<S extends Record<string, any>>(): GlobalState<S> {
  if (!_globalStateInstance) {
    // default lazy init with non-persistent defaults
    _globalStateInstance = new GlobalState({ persist: false, storageKey: 'global-state' });
  }
  return _globalStateInstance as GlobalState<S>;
}

export const globalState = getGlobalState();

// Convenience helper to explicitly enable persistence on the default singleton
// without forcing a complete reinitialization.
export function enableGlobalPersistence(storageKey?: string) {
  const gs = getGlobalState<any>();
  (gs as any).enablePersistence?.(storageKey);
  return gs as GlobalState<any>;
}
