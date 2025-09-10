## global-event-state

Lightweight, framework-agnostic global event-driven state store built on top of the browser's `CustomEvent` API.

Features:
- Per-key + wildcard subscriptions
- Undo / Redo history
- Middleware: `before` & `after`
- Optional `localStorage` persistence
- Isolated instances + lazy configurable singleton
- Tiny API surface

---
## Installation

```
npm install global-event-state
```

---
## 1. Initialization Patterns & Basic Usage

Define a schema interface for best TypeScript inference. You have three ways to work with state:

1. `createState` – create an isolated, fully typed instance (test-friendly, multiple stores)
2. `initGlobalState` + `getGlobalState` – initialize and use a typed shared singleton
3. `globalState` – untyped lazy singleton (only if you don't care about types)

```ts
import { createState, initGlobalState, getGlobalState } from 'global-event-state';

// Shared schema (recommended to keep in one module and reuse via import)
interface AppState {
  theme: 'light' | 'dark';
  user: { id: number; name: string } | null;
  loggedIn: boolean;
  count?: number;
}

// (A) Typed global singleton (call ONCE at startup)
const gs = initGlobalState<AppState>({ persist: true, storageKey: 'my-app' });
// Anywhere else (later modules):
// import { getGlobalState } from 'global-event-state'; const gs = getGlobalState<AppState>();

gs.set('theme', 'dark');                // OK
// gs.set('theme', 'blue');             // TS error
gs.set('user', { id: 1, name: 'Alice' });
gs.setMany({ loggedIn: true, count: 2 });

console.log(gs.get('theme'));           // 'dark' (type: 'light' | 'dark' | undefined)
console.log(gs.getAll());               // Partial<AppState>

// (B) Isolated instance (separate store)
const local = createState<AppState>({ persist: false, storageKey: 'local-scope' });
local.set('loggedIn', false);
```

---
## 2. Subscriptions (Typed)

```ts
// Using the same instance created earlier in this module

// Single key subscription
const offTheme = gs.subscribe('theme', (value) => {
  // value: 'light' | 'dark' | undefined
  console.log('Theme updated →', value);
});

// All changes (delta only contains keys that changed)
const offAll = gs.subscribeAll((delta) => {
  // delta: Partial<AppState>
  console.log('Delta →', delta);
});

// Cleanup
offTheme();
offAll();
```

---
## 3. Middleware (Typed)

`useBefore` / `useAfter` receive strongly typed `key` & `value`:

```ts
// Reuse your created instance

gs.useBefore(({ key, value }) => {
  if (key === 'count' && typeof value === 'number' && value < 0) {
    throw new Error('count must be >= 0');
  }
});

gs.useAfter(({ key, value }) => {
  console.log(`[after] ${String(key)} ->`, value);
});

gs.set('count', 5);   // OK
// gs.set('count', -1); // Throws at runtime by middleware
```

---
## 4. Undo / Redo

```js
gs.set('count', 1);
gs.set('count', 2);
gs.undo(); // back to 1
gs.redo(); // forward to 2
```

---
## 5. Persistence

```ts
import { createState } from 'global-event-state';
const persistent = createState<AppState>({ persist: true, storageKey: 'session-state' });
// Reloads restore automatically (browser environment).
```

---
## 6. Isolated Instances (Typed)

```ts
import { createState } from 'global-event-state';

const local = createState<AppState>({ persist: false, storageKey: 'isolated' });
local.set('theme', 'light');
```

---
## 7. Singleton Options: Typed vs Untyped

Preferred (typed):
```ts
// bootstrap.ts
import { initGlobalState } from 'global-event-state';
interface AppState { theme: 'light' | 'dark'; user: { id: number; name: string } | null; loggedIn: boolean; }
initGlobalState<AppState>({ persist: true });

// anywhere.ts
import { getGlobalState } from 'global-event-state';
const gs = getGlobalState<AppState>();
gs.set('theme', 'light');
```

Fallback (untyped, dynamic use):
```ts
import { globalState } from 'global-event-state';
globalState.set('anything', 123); // no compile-time checks
```

Re-initializing: calling `initGlobalState` again returns the existing instance (unless you pass `force: true`).

---
## TypeScript Notes

- For a shared singleton WITH types, always use `initGlobalState<AppState>()` once then `getGlobalState<AppState>()` elsewhere.
- Use `createState<AppState>()` for multiple stores, tests, or scoping.
- Avoid using `globalState` unless you intentionally want a dynamic, untyped bag.
- Middleware generics infer the value type based on the `key` parameter.
- Need to reset during tests? Call `initGlobalState<AppState>(opts, true)` with `force: true`.

---
## API Overview

| Method | Description |
|--------|-------------|
| `createState<AppState>(opts)` | Create isolated typed instance |
| `initGlobalState<AppState>(opts, force?)` | Initialize (or reuse) typed singleton |
| `getGlobalState<AppState>()` | Retrieve the singleton; lazily creates an untyped fallback if never initialized |
| `globalState` | Default untyped singleton instance |
| `new GlobalState<AppState>(opts)` | Same as createState but via class |
| `set(key, value)` | Set a value |
| `setMany(object)` | Batch set |
| `get(key)` | Get a value |
| `getAll()` | Snapshot copy |
| `remove(key)` | Delete a key |
| `clear()` | Remove all keys |
| `subscribe(key, cb)` | Listen to one key |
| `subscribeAll(cb)` | Listen to all changes |
| `useBefore(fn)` | Pre-mutation middleware |
| `useAfter(fn)` | Post-mutation middleware |
| `undo()` / `redo()` | History navigation |

---
## Example: Putting It Together

```ts
import { createState } from 'global-event-state';

interface AppState { theme: 'light' | 'dark'; user: { id: number }; loggedIn: boolean; }
const gs = createState<AppState>({ persist: true });

gs.useAfter(({ key, value }) => console.log('Changed:', key, value));
gs.subscribeAll(delta => console.log('Delta:', delta));

gs.set('user', { id: 1 });
gs.set('theme', 'dark');
gs.undo();
```

---
## License
MIT

---
## Testing

This project uses the Bun built-in test runner.

Commands:
```
bun test        # run the full suite once
bun test --watch # watch mode
```

Publish workflow runs `npm test` via the `prepublishOnly` script which maps to `bun test`.
