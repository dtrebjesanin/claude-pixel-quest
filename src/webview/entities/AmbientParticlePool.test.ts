import { describe, it, expect } from 'vitest';
import { AmbientParticlePool } from './AmbientParticlePool';

describe('AmbientParticlePool', () => {
  it('starts empty', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 20 });
    expect(pool.count).toBe(0);
  });

  it('spawn adds a particle', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 20 });
    pool.spawn({ x: 10, y: 20, vx: 1, vy: 0, maxLife: 1000, size: 2, color: '#fff', brightness: 1 });
    expect(pool.count).toBe(1);
  });

  it('maxParticles cap is enforced', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 3 });
    for (let i = 0; i < 5; i++) {
      pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, maxLife: 5000, size: 1, color: '#fff', brightness: 1 });
    }
    expect(pool.count).toBe(3);
  });

  it('update moves particles by velocity', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 10 });
    pool.spawn({ x: 0, y: 0, vx: 100, vy: 50, maxLife: 5000, size: 1, color: '#fff', brightness: 1 });
    pool.update(1000); // 1 second
    const particles = (pool as any).particles;
    expect(particles[0].x).toBeCloseTo(100, 0);
    expect(particles[0].y).toBeCloseTo(50, 0);
  });

  it('gravity is applied to vy', () => {
    const pool = new AmbientParticlePool({ gravity: 200, maxParticles: 10 });
    pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, maxLife: 5000, size: 1, color: '#fff', brightness: 1 });
    pool.update(1000); // 1 second
    const particles = (pool as any).particles;
    // After 1s with gravity 200: vy should be 200, y should be ~200
    expect(particles[0].vy).toBeCloseTo(200, 0);
    expect(particles[0].y).toBeGreaterThan(0);
  });

  it('expired particles are returned from update', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 10 });
    pool.spawn({ x: 5, y: 10, vx: 0, vy: 0, maxLife: 100, size: 1, color: '#abc', brightness: 0.5 });
    const expired = pool.update(200); // exceeds maxLife
    expect(expired.length).toBe(1);
    expect(expired[0].x).toBe(5);
    expect(expired[0].color).toBe('#abc');
    expect(pool.count).toBe(0);
  });

  it('non-expired particles are not returned', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 10 });
    pool.spawn({ x: 0, y: 0, vx: 0, vy: 0, maxLife: 5000, size: 1, color: '#fff', brightness: 1 });
    const expired = pool.update(100);
    expect(expired.length).toBe(0);
    expect(pool.count).toBe(1);
  });

  it('empty pool update does not throw', () => {
    const pool = new AmbientParticlePool({ gravity: 0, maxParticles: 10 });
    expect(() => pool.update(1000)).not.toThrow();
  });
});
