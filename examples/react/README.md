# gest React SSR Example

This example demonstrates adding basic Server-Side Rendering (SSR) to the simple React demo using Vite + Express.

## Structure

- `server.ts` – Express server integrating Vite in middleware mode for dev SSR.
- `src/entry-server.tsx` – Server render entry exporting a `render()` function.
- `src/entry-client.tsx` – Client hydration entry (hydrates if markup exists, mounts otherwise).
- `vite.config.ts` – Now includes an `ssr.noExternal` rule so Vite bundles the local `global-event-state` code for SSR.
- `index.html` – Contains injection markers and points to the client entry.

## Commands

Inside this folder:

```bash
# Install (from repo root or here)
npm install

# Dev (CSR only)
npm run dev

# Dev SSR (Express + Vite middleware)
npm run dev:ssr

# Build client + server bundle (basic demo build)
npm run build:ssr
```

The `serve:ssr` script is a placeholder (would require an actual built server bundle step – you can adapt as needed). For demonstration we focus on development SSR.

## Notes

- State persistence via `localStorage` is disabled on the server automatically (no window). Server sets demo defaults (`theme: light`, `count: 42`, `user: Server Alice`).
- Initial state hydration uses a JSON script tag: `entry-server.tsx` injects `<script id="__GEST_STATE__" type="application/json">{...}</script>` and `entry-client.tsx` parses it, calling `store.hydrate(data, { onlyNew: true })`.
- No global variables are leaked on `window`; the script tag can be garbage-collected after parse.
- Undo/redo and persistence still function once hydrated in the browser.

## Extending

Adjust server-provided state per request (e.g. authenticated user):
1. In `server.ts`, build a per-request snapshot (e.g. `const user = req.user`).
2. Pass it into an enhanced `render(context)` or set values before calling `render()`.
3. Let `entry-server.tsx` serialize only the whitelisted keys.
4. Consider signing/encrypting if the data is sensitive.

## Troubleshooting

- If you see module resolution errors for `global-event-state`, ensure `ssr.noExternal` includes it (already configured).
- If using Bun instead of Node for the server, adapt the scripts (replace `node` with `bun`).

## Why JSON Script Tag?

Using a `<script type="application/json">` tag avoids executing arbitrary JS, prevents clobbering globals, and makes CSP (Content Security Policy) easier (no inline execution). The client simply finds the tag, parses its text, hydrates the store, and moves on.

Enjoy hacking! ✨
