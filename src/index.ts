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
  private readonly storageKey: string;

  constructor({ persist = false, storageKey = "global-state" }: GlobalStateOptions = {}) {
    this.state = {};
    this.eventTarget = new EventTarget();
    this.middlewares = { before: [], after: [] };
    this.history = [];
    this.future = [];
    this.persist = persist;
    this.storageKey = storageKey;
    if (this.persist) this.loadFromStorage();
  }

  // ---------- Core ----------
  get<K extends keyof S>(key: K): S[K] | undefined {
    return this.state[key] as S[K] | undefined;
  }

  getAll(): Partial<S> {
    return { ...this.state };
  }

  set<K extends keyof S>(key: K, value: S[K]): void {
    this.runMiddlewares("before", { key, value });
    this.history.push({ ...this.state });
    (this.state as any)[key] = value;
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
      this.emit(String(key), undefined);
      if (this.persist) this.saveToStorage();
    }
  }

  clear(): void {
    this.state = {};
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

  // ---------- Undo/Redo ----------
  undo(): void {
    if (this.history.length === 0) return;
    this.future.push({ ...this.state });
    this.state = this.history.pop()!;
    this.emit("*", { ...this.state });
    if (this.persist) this.saveToStorage();
  }
  redo(): void {
    if (this.future.length === 0) return;
    this.history.push({ ...this.state });
    this.state = this.future.pop()!;
    this.emit("*", { ...this.state });
    if (this.persist) this.saveToStorage();
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
