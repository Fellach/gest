import { describe, it, expect } from 'bun:test';
import { createState } from '../src/index';

interface PState { value: number; }

describe('Persistence (non-browser guard)', () => {
  it('does not throw when persist enabled without localStorage', () => {
    const store = createState<PState>({ persist: true, storageKey: 'x-test' });
    expect(() => store.set('value', 42)).not.toThrow();
  });
});
