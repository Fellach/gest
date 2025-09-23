import React from 'react';
import { initGlobalState } from 'global-event-state';
import { createGlobalStateHooks } from 'global-event-state/react';

interface AppState {
  theme: 'light' | 'dark';
  count: number;
  user: { id: number; name: string } | null;
}

// Initialize once (demo only; in real apps do this in a bootstrap module)
// Persistence will be a no-op on the server.
export const store = initGlobalState<AppState>({ persist: true, storageKey: 'gest-demo' });
const gs = createGlobalStateHooks(store);

function ThemeToggle() {
  const [theme, setTheme] = gs.useGlobalState('theme');
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Theme: {theme ?? 'unset'}
    </button>
  );
}

function Counter() {
  const [count, setCount] = gs.useGlobalState('count');
  return (
    <button onClick={() => setCount((count ?? 0) + 1)}>Count: {count ?? 0}</button>
  );
}

function UserEditor() {
  const [user, setUser] = gs.useGlobalState('user');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => setUser({ id: 1, name: 'Alice' })}>Set Alice</button>
      <button onClick={() => setUser({ id: 2, name: 'Bob' })}>Set Bob</button>
      <button onClick={() => setUser(null)}>Clear</button>
      <span>User: {user ? `${user.name} (#${user.id})` : 'none'}</span>
    </div>
  );
}

function DerivedDisplay() {
  const userName = gs.useGlobalSelector((s) => s.user?.name ?? 'Guest');
  return <div>Derived user name: {userName}</div>;
}

function HistoryControls() {
  const { undo, redo } = gs.useGlobalHistory();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}

function DebugState() {
  const state = gs.useGlobalAll();
  return (
    <pre style={{ background: '#111', color: '#0f0', padding: 12 }}>
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}

export function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>gest React Example</h1>
      <ThemeToggle />
      <Counter />
      <UserEditor />
      <DerivedDisplay />
      <HistoryControls />
      <DebugState />
    </div>
  );
}
