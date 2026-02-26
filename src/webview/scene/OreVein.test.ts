import { describe, it, expect } from 'vitest';
import { OreVein } from './OreVein';

describe('OreVein', () => {
  it('constructor sets position', () => {
    const vein = new OreVein(40, 70);
    expect(vein.getPosition()).toEqual({ x: 40, y: 70 });
  });

  it('generates 5-7 ore spots', () => {
    const vein = new OreVein(0, 0);
    const count = (vein as any).oreSpots.length;
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
  });

  it('shimmerPhase advances with update', () => {
    const vein = new OreVein(0, 0);
    const initialPhase = (vein as any).shimmerPhase;
    vein.update(1000);
    expect((vein as any).shimmerPhase).toBeGreaterThan(initialPhase);
  });

  it('shimmerPhase wraps around at 2*PI (no unbounded growth)', () => {
    const vein = new OreVein(0, 0);
    // shimmerSpeed is 0.003-0.005, so at dt=1000, phase grows by 3-5
    // 2*PI ≈ 6.28
    // Run many updates to ensure wrapping works
    for (let i = 0; i < 100; i++) {
      vein.update(1000);
    }
    const phase = (vein as any).shimmerPhase;
    expect(phase).toBeLessThan(Math.PI * 2);
    expect(phase).toBeGreaterThanOrEqual(0);
  });

  it('getPosition returns stable coordinates', () => {
    const vein = new OreVein(230, 75);
    vein.update(500);
    expect(vein.getPosition()).toEqual({ x: 230, y: 75 });
  });
});
