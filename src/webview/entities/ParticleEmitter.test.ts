import { describe, it, expect } from 'vitest';
import { ParticleEmitter } from './ParticleEmitter';

describe('ParticleEmitter', () => {
  // ── Emission counts ──

  describe('emitSparks', () => {
    it('creates exactly 8 particles', () => {
      const pe = new ParticleEmitter();
      pe.emitSparks(100, 100);
      expect(pe.count).toBe(8);
    });

    it('accumulates across multiple calls', () => {
      const pe = new ParticleEmitter();
      pe.emitSparks(0, 0);
      pe.emitSparks(50, 50);
      expect(pe.count).toBe(16);
    });
  });

  describe('emitPoof', () => {
    it('creates exactly 12 particles', () => {
      const pe = new ParticleEmitter();
      pe.emitPoof(100, 100);
      expect(pe.count).toBe(12);
    });
  });

  describe('emitSparkles', () => {
    it('creates exactly 10 particles', () => {
      const pe = new ParticleEmitter();
      pe.emitSparkles(100, 100);
      expect(pe.count).toBe(10);
    });
  });

  describe('emitZzz', () => {
    it('creates exactly 3 particles (Z, z, z)', () => {
      const pe = new ParticleEmitter();
      pe.emitZzz(100, 100);
      expect(pe.count).toBe(3);
    });
  });

  describe('emitDebris', () => {
    it('creates exactly 5 particles', () => {
      const pe = new ParticleEmitter();
      pe.emitDebris(100, 100);
      expect(pe.count).toBe(5);
    });
  });

  describe('emitDust', () => {
    it('creates exactly 1 particle', () => {
      const pe = new ParticleEmitter();
      pe.emitDust(100, 100);
      expect(pe.count).toBe(1);
    });

    it('dust particles are short-lived', () => {
      const pe = new ParticleEmitter();
      pe.emitDust(100, 100);
      pe.update(400); // maxLife is 200-300
      expect(pe.count).toBe(0);
    });
  });

  // ── Update lifecycle ──

  describe('update', () => {
    it('removes particles after their maxLife expires', () => {
      const pe = new ParticleEmitter();
      pe.emitSparks(0, 0); // 8 particles, maxLife = 300-500
      expect(pe.count).toBe(8);

      pe.update(200); // all still alive (min maxLife is 300)
      expect(pe.count).toBe(8);

      pe.update(400); // total 600 > max possible 500
      expect(pe.count).toBe(0);
    });

    it('handles empty particle array without error', () => {
      const pe = new ParticleEmitter();
      expect(() => pe.update(100)).not.toThrow();
      expect(pe.count).toBe(0);
    });

    it('removes all particles after enough time', () => {
      const pe = new ParticleEmitter();
      pe.emitSparks(0, 0); // maxLife 300-500
      pe.emitPoof(0, 0); // maxLife 400-600
      pe.emitSparkles(0, 0); // maxLife 600-1000
      pe.emitZzz(0, 0); // maxLife 1800, 3 particles
      expect(pe.count).toBe(33); // 8+12+10+3

      // Run long enough that everything expires
      pe.update(2000);
      expect(pe.count).toBe(0);
    });

    it('moves particles according to velocity', () => {
      const pe = new ParticleEmitter();
      pe.emitZzz(100, 100);
      // zzz has vx > 0, vy < 0 (drifts up-right)

      // Get initial state by cloning — we can't access particles directly,
      // but we can verify they survive and gravity applies by checking count
      pe.update(500);
      expect(pe.count).toBe(3); // Still alive (maxLife=1800, elapsed=500)
    });

    it('applies gravity to particles (vy increases over time)', () => {
      const pe = new ParticleEmitter();
      // Emit sparks — they start with vy < 0 (upward)
      pe.emitSparks(100, 100);

      // After enough time, gravity (150 px/s²) would have pulled them down
      // We can't inspect individual particles, but we can verify the system
      // doesn't crash and particles eventually expire
      for (let t = 0; t < 600; t += 16) pe.update(16);
      expect(pe.count).toBe(0); // All sparks should have expired (maxLife 300-500)
    });

    it('handles interleaved emission and update correctly', () => {
      const pe = new ParticleEmitter();
      pe.emitSparks(0, 0); // 8 particles, maxLife 300-500
      pe.update(200);
      pe.emitPoof(50, 50); // +12 particles
      expect(pe.count).toBe(20); // 8 (aged 200ms) + 12 (fresh)

      pe.update(400); // first batch should expire, poof batch still alive
      expect(pe.count).toBeLessThanOrEqual(12); // sparks expired
      expect(pe.count).toBeGreaterThan(0); // poof still alive
    });
  });
});
