export interface GlobalStateOptions {
    persist?: boolean;
    storageKey?: string;
}
export type MiddlewareFn<S extends Record<string, any>> = <K extends keyof S>(ctx: {
    key: K;
    value: S[K];
}, state: Partial<S>) => void;
export type EventCallback<T> = (value: T) => void;
export declare class GlobalState<S extends Record<string, any> = Record<string, any>> {
    private state;
    private eventTarget;
    private middlewares;
    private history;
    private future;
    private persist;
    private storageKey;
    constructor({ persist, storageKey }?: GlobalStateOptions);
    get<K extends keyof S>(key: K): S[K] | undefined;
    getAll(): Partial<S>;
    set<K extends keyof S>(key: K, value: S[K]): void;
    setMany(updates: Partial<S>): void;
    remove<K extends keyof S>(key: K): void;
    clear(): void;
    subscribe<K extends keyof S>(key: K, callback: EventCallback<S[K] | undefined>): () => void;
    subscribeAll(callback: EventCallback<Partial<S>>): () => void;
    private emit;
    useBefore(fn: MiddlewareFn<S>): void;
    useAfter(fn: MiddlewareFn<S>): void;
    private runMiddlewares;
    private hasStorage;
    private saveToStorage;
    private loadFromStorage;
    /**
     * Returns whether persistence is currently enabled for this instance.
     */
    isPersistent(): boolean;
    /**
     * Enable persistence after the store has already been created (lazy upgrade).
     * Optionally provide a storageKey if changing from the default; existing
     * subscribers will continue to listen on the old key prefix, so changing the
     * key after subscriptions is discouraged. If a new key is provided and
     * differs, it will be applied before loading.
     */
    enablePersistence(storageKey?: string): void;
    undo(): void;
    redo(): void;
}
export declare function createState<S extends Record<string, any>>(options?: GlobalStateOptions): GlobalState<S>;
export declare function initGlobalState<S extends Record<string, any>>(options?: GlobalStateOptions, force?: boolean): GlobalState<S>;
export declare function getGlobalState<S extends Record<string, any>>(): GlobalState<S>;
export declare const globalState: GlobalState<Record<string, any>>;
export declare function enableGlobalPersistence(storageKey?: string): GlobalState<any>;
