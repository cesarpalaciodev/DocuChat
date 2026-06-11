import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('can be imported', async () => {
    const mod = await import('../src/App');
    expect(mod.default).toBeDefined();
  });
});
