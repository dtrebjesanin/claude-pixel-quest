import { describe, it, expect } from 'vitest';
import { DrippingWater } from './DrippingWater';

const POSITIONS = [
  { x: 75, tipY: 15 },
  { x: 190, tipY: 12 },
  { x: 255, tipY: 18 },
];

describe('DrippingWater', () => {
  it('creates correct number of stalactites from config', () => {
    const water = new DrippingWater(POSITIONS, 400);
    const stalactites = (water as any).stalactites;
    expect(stalactites.length).toBe(3);
  });

  it('stalactite positions match config', () => {
    const water = new DrippingWater(POSITIONS, 400);
    const stalactites = (water as any).stalactites;
    expect(stalactites[0].x).toBe(75);
    expect(stalactites[0].tipY).toBe(15);
    expect(stalactites[1].x).toBe(190);
    expect(stalactites[2].x).toBe(255);
  });

  it('dripTimer decrements with update', () => {
    const water = new DrippingWater(POSITIONS, 400);
    const stalactites = (water as any).stalactites;
    const initialTimer = stalactites[0].nextDripTime;
    water.update(1000);
    expect(stalactites[0].nextDripTime).toBeLessThan(initialTimer);
  });

  it('drip spawns when timer reaches zero', () => {
    const water = new DrippingWater(POSITIONS, 400);
    const stalactites = (water as any).stalactites;
    // Force timer to near zero
    stalactites[0].nextDripTime = 10;
    water.update(50);
    // A drop should have been spawned in the pool
    const pool = (water as any).dropPool;
    expect(pool.count).toBeGreaterThanOrEqual(1);
  });

  it('timer resets to random interval after drip', () => {
    const water = new DrippingWater(POSITIONS, 400);
    const stalactites = (water as any).stalactites;
    stalactites[0].nextDripTime = 10;
    water.update(50);
    // Timer should have reset to a new positive value
    expect(stalactites[0].nextDripTime).toBeGreaterThan(0);
  });

  it('update does not throw with no active drops', () => {
    const water = new DrippingWater(POSITIONS, 400);
    expect(() => water.update(1000)).not.toThrow();
  });

  it('setFloorY updates the floor level', () => {
    const water = new DrippingWater(POSITIONS, 400);
    expect((water as any).floorY).toBe(380); // 400 - 20
    water.setFloorY(600);
    expect((water as any).floorY).toBe(580); // 600 - 20
  });
});
