import { describe, it, expect } from 'vitest';
import { FallingLeaves } from './FallingLeaves';

describe('FallingLeaves', () => {
  it('seeds initial leaves on construction', () => {
    const leaves = new FallingLeaves(300, 400);
    expect(leaves.count).toBeGreaterThanOrEqual(5);
    expect(leaves.count).toBeLessThanOrEqual(12);
  });

  it('count stays in reasonable range after many updates', () => {
    const leaves = new FallingLeaves(300, 400);
    for (let i = 0; i < 200; i++) {
      leaves.update(100);
    }
    expect(leaves.count).toBeGreaterThanOrEqual(3);
    expect(leaves.count).toBeLessThanOrEqual(15);
  });

  it('resize updates bounds', () => {
    const leaves = new FallingLeaves(300, 400);
    leaves.resize(600, 800);
    expect((leaves as any).width).toBe(600);
    expect((leaves as any).height).toBe(800);
  });

  it('update does not throw', () => {
    const leaves = new FallingLeaves(300, 400);
    expect(() => leaves.update(1000)).not.toThrow();
  });
});