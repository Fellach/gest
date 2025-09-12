export class GlobalState {
    constructor({ persist = false, storageKey = "global-state" } = {}) {
        this.state = {};
        this.eventTarget = new EventTarget();
        this.middlewares = { before: [], after: [] };
        this.history = [];
        this.future = [];
        this.persist = persist;
        this.storageKey = storageKey;
        if (this.persist)
            this.loadFromStorage();
    }
    // ---------- Core ----------
    get(key) {
        return this.state[key];
    }
    getAll() {
        return { ...this.state };
    }
    set(key, value) {
        this.runMiddlewares("before", { key, value });
        this.history.push({ ...this.state });
        this.state[key] = value;
        this.emit(String(key), value);
        this.emit("*", { [key]: value });
        this.runMiddlewares("after", { key, value });
        if (this.persist)
            this.saveToStorage();
    }
    setMany(updates) {
        Object.entries(updates).forEach(([k, v]) => {
            if (v !== undefined)
                this.set(k, v);
        });
    }
    remove(key) {
        if (key in this.state) {
            delete this.state[key];
            this.emit(String(key), undefined);
            if (this.persist)
                this.saveToStorage();
        }
    }
    clear() {
        this.state = {};
        this.emit("*", {});
        if (this.persist)
            this.saveToStorage();
    }
    // ---------- Events ----------
    subscribe(key, callback) {
        const eventName = `${this.storageKey}:${String(key)}`;
        const handler = (e) => callback(e.detail.value);
        this.eventTarget.addEventListener(eventName, handler);
        return () => this.eventTarget.removeEventListener(eventName, handler);
    }
    subscribeAll(callback) {
        const eventName = `${this.storageKey}:*`;
        const handler = (e) => callback(e.detail.value);
        this.eventTarget.addEventListener(eventName, handler);
        return () => this.eventTarget.removeEventListener(eventName, handler);
    }
    emit(key, value) {
        const event = new CustomEvent(`${this.storageKey}:${key}`, { detail: { value } });
        this.eventTarget.dispatchEvent(event);
    }
    // ---------- Middleware ----------
    useBefore(fn) {
        this.middlewares.before.push(fn);
    }
    useAfter(fn) {
        this.middlewares.after.push(fn);
    }
    runMiddlewares(type, ctx) {
        for (const fn of this.middlewares[type])
            fn(ctx, this.state);
    }
    // ---------- Persistence ----------
    hasStorage() {
        return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
    }
    saveToStorage() {
        if (!this.hasStorage())
            return; // noop in non-browser
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    }
    loadFromStorage() {
        if (!this.hasStorage())
            return;
        const raw = localStorage.getItem(this.storageKey);
        if (raw)
            this.state = JSON.parse(raw);
    }
    // ---------- Undo/Redo ----------
    undo() {
        if (this.history.length === 0)
            return;
        this.future.push({ ...this.state });
        this.state = this.history.pop();
        this.emit("*", { ...this.state });
        if (this.persist)
            this.saveToStorage();
    }
    redo() {
        if (this.future.length === 0)
            return;
        this.history.push({ ...this.state });
        this.state = this.future.pop();
        this.emit("*", { ...this.state });
        if (this.persist)
            this.saveToStorage();
    }
}
// ---------- Factory & Singleton (Typed) ----------
export function createState(options) {
    return new GlobalState(options);
}
let _globalStateInstance = null;
export function initGlobalState(options, force = false) {
    if (!_globalStateInstance || force) {
        _globalStateInstance = new GlobalState(options);
    }
    return _globalStateInstance;
}
export function getGlobalState() {
    if (!_globalStateInstance) {
        // default lazy init with non-persistent defaults
        _globalStateInstance = new GlobalState({ persist: false, storageKey: 'global-state' });
    }
    return _globalStateInstance;
}
export const globalState = getGlobalState();
