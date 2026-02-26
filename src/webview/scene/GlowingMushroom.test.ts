import { describe, it, expect } from 'vitest';
import { GlowingMushroom } from './GlowingMushroom';

describe('GlowingMushroom', () => {
  it('constructor sets position', () => {
    const mush = new GlowingMushroom(25, 350);
    expect(mush.getPosition()).toEqual({ x: 25, y: 350 });
  });

  it('generates 2-3 mushrooms in the cluster', () => {
    const mush = new GlowingMushroom(0, 0);
    const count = (mush as any).mushrooms.length;
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(3);
  });

  it('glowPhase advances with update', () => {
    const mush = new GlowingMushroom(0, 0);
    const initial = (mush as any).glowPhase;
    mush.update(1000);
    expect((mush as any).glowPhase).toBeGreaterThan(initial);
  });

  it('glowPhase wraps around at 2*PI (no unbounded growth)', () => {
    const mush = new GlowingMushroom(0, 0);
    for (let i = 0; i < 100; i++) {
      mush.update(1000);
    }
    const phase = (mush as any).glowPhase;
    expect(phase).toBeLessThan(Math.PI * 2);
    expect(phase).toBeGreaterThanOrEqual(0);
  });

  it('getPosition returns stable coordinates', () => {
    const mush = new GlowingMushroom(265, 340);
    mush.update(500);
    expect(mush.getPosition()).toEqual({ x: 265, y: 340 });
  });
});
