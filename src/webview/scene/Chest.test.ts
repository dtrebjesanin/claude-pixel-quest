import { describe, it, expect } from 'vitest';
import { Chest } from './Chest';

describe('Chest', () => {
  // ── State management ──

  describe('state', () => {
    it('returns initial position', () => {
      const chest = new Chest(100, 200);
      expect(chest.getPosition()).toEqual({ x: 100, y: 200 });
    });

    it('incrementProgress triggers bounce without crashing', () => {
      const chest = new Chest(0, 0);
      chest.incrementProgress();
      chest.incrementProgress();
      chest.incrementProgress();
    });

    it('resetProgress clears state', () => {
      const chest = new Chest(0, 0);
      chest.incrementProgress();
      chest.incrementProgress();
      chest.resetProgress();
      // After reset + 1 increment, bounce restarts cleanly
      chest.incrementProgress();
    });
  });

  // ── Bounce animation ──

  describe('bounce', () => {
    it('incrementProgress triggers bounce', () => {
      const chest = new Chest(0, 0);
      // Before increment: no bounce activity
      chest.update(100);

      // After increment: bounce should be active
      chest.incrementProgress();
      // The bounce phase progresses when bouncing = true
      // bounce completes when bouncePhase > PI (~314ms at dt*0.01)
    });

    it('bounce completes after ~314ms', () => {
      const chest = new Chest(0, 0);
      chest.incrementProgress();

      // bouncePhase += dt * 0.01
      // Completes when bouncePhase > PI ≈ 3.14159
      // At dt=100, bouncePhase += 1.0 per update
      // After 4 updates of 100ms: bouncePhase = 4.0 > PI

      chest.update(100); // phase = 1.0
      chest.update(100); // phase = 2.0
      chest.update(100); // phase = 3.0
      // Still bouncing (3.0 < PI is false, 3.0 < 3.14159 is true)

      chest.update(20); // phase = 3.2 > PI → bounce ends
      // Bounce should have ended, further updates don't change phase
      chest.update(100); // Should not crash
    });

    it('successive increments restart the bounce', () => {
      const chest = new Chest(0, 0);
      chest.incrementProgress();
      chest.update(200); // bouncePhase = 2.0

      // Second increment resets bouncePhase to 0
      chest.incrementProgress();
      // bouncePhase should restart from 0
      // Need 314ms+ to complete again
      chest.update(400); // bouncePhase = 4.0 > PI → done
    });

    it('update without bounce does nothing', () => {
      const chest = new Chest(0, 0);
      // No incrementProgress called, so no bouncing
      expect(() => {
        chest.update(1000);
        chest.update(1000);
      }).not.toThrow();
    });
  });

  // ── Opening animation ──

  describe('opening', () => {
    it('isOpen is false initially', () => {
      const chest = new Chest(0, 0);
      expect(chest.isOpen).toBe(false);
    });

    it('completeProgress sets isOpen to true', () => {
      const chest = new Chest(0, 0);
      chest.completeProgress();
      expect(chest.isOpen).toBe(true);
    });

    it('openPhase advances during update when open', () => {
      const chest = new Chest(0, 0);
      chest.completeProgress();
      chest.update(100);
      expect(chest.openPhase).toBeGreaterThan(0);
    });

    it('openPhase caps at 1', () => {
      const chest = new Chest(0, 0);
      chest.completeProgress();
      // Opening takes ~500ms → run well past that
      for (let t = 0; t < 1000; t += 16) chest.update(16);
      expect(chest.openPhase).toBe(1);
    });

    it('resetProgress resets isOpen and openPhase', () => {
      const chest = new Chest(0, 0);
      chest.completeProgress();
      for (let t = 0; t < 600; t += 16) chest.update(16);
      chest.resetProgress();
      expect(chest.isOpen).toBe(false);
      expect(chest.openPhase).toBe(0);
    });

    it('peek opens temporarily then closes', () => {
      const chest = new Chest(0, 0);
      chest.peek(500);
      expect(chest.isOpen).toBe(true);
      // Advance past peek duration
      for (let t = 0; t < 600; t += 16) chest.update(16);
      expect(chest.isOpen).toBe(false);
    });

    it('peek openPhase smoothly returns to 0 after close', () => {
      const chest = new Chest(0, 0);
      chest.peek(200);
      // Open fully
      for (let t = 0; t < 600; t += 16) chest.update(16);
      // isOpen should be false, openPhase should be back near 0
      expect(chest.isOpen).toBe(false);
      // Run more to let openPhase decay
      for (let t = 0; t < 500; t += 16) chest.update(16);
      expect(chest.openPhase).toBe(0);
    });
  });

  // ── Position ──

  describe('getPosition', () => {
    it('returns constructor coordinates', () => {
      const chest = new Chest(130, 310);
      expect(chest.getPosition()).toEqual({ x: 130, y: 310 });
    });

    it('position is immutable via getPosition', () => {
      const chest = new Chest(50, 50);
      const pos = chest.getPosition();
      pos.x = 999;
      expect(chest.getPosition().x).toBe(50);
    });
  });
});
