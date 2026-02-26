import { describe, it, expect } from 'vitest';
import { DustMotes } from './DustMotes';

describe('DustMotes', () => {
  it('seeds initial motes on construction', () => {
    const dust = new DustMotes(300, 400);
    expect(dust.count).toBeGreaterThanOrEqual(12);
    expect(dust.count).toBeLessThanOrEqual(18);
  });

  it('count stays in 15-25 range after many updates', () => {
    const dust = new DustMotes(300, 400);
    for (let i = 0; i < 200; i++) {
      dust.update(100);
    }
    expect(dust.count).toBeGreaterThanOrEqual(5);
    expect(dust.count).toBeLessThanOrEqual(25);
  });

  it('resize updates bounds', () => {
    const dust = new DustMotes(300, 400);
    dust.resize(600, 800);
    expect((dust as any).width).toBe(600);
    expect((dust as any).height).toBe(800);
  });

  it('update does not throw on empty state', () => {
    const dust = new DustMotes(300, 400);
    expect(() => dust.update(1000)).not.toThrow();
  });
});
