import React from 'react';
import { createRoot } from 'react-dom/client';
import { readPersistedSnapshot, commitInitialState } from './globalStore';
import { App } from './App';

commitInitialState(readPersistedSnapshot() ?? {}, true);

createRoot(document.getElementById('root')!).render(<App />);
