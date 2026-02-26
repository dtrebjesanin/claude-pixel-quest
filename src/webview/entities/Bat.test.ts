import { describe, it, expect } from 'vitest';
import { Bat } from './Bat';

/** Tick the bat until it enters the target state, or give up after maxMs. */
function tickUntilState(bat: Bat, target: 'HANGING' | 'FLYING', maxMs = 20000, stepMs = 16): void {
  for (let t = 0; t < maxMs; t += stepMs) {
    bat.update(stepMs);
    if (bat.state === target) return;
  }
}

/** Tick the bat through a full hang->fly->hang cycle. */
function tickThroughFullCycle(bat: Bat, maxMs = 20000, stepMs = 16): void {
  // First, get to FLYING
  tickUntilState(bat, 'FLYING', maxMs, stepMs);
  // Then, get back to HANGING
  tickUntilState(bat, 'HANGING', maxMs, stepMs);
}

describe('Bat', () => {
  it('starts in HANGING state', () => {
    const bat = new Bat(100, 30);
    expect(bat.state).toBe('HANGING');
  });

  it('stays HANGING while hangTimer has not expired', () => {
    const bat = new Bat(100, 30);
    bat.update(1000); // hangTimer is 3000-6000ms
    expect(bat.state).toBe('HANGING');
  });

  it('transitions to FLYING after hangTimer expires', () => {
    const bat = new Bat(100, 30);
    // Tick until FLYING is reached; hangTimer is 3000-6000ms so it will transition
    let reachedFlying = false;
    for (let t = 0; t < 7000; t += 16) {
      bat.update(16);
      if (bat.state === 'FLYING') { reachedFlying = true; break; }
    }
    expect(reachedFlying).toBe(true);
  });

  it('returns to HANGING after flight completes', () => {
    const bat = new Bat(100, 30);
    // Tick through one full hang -> fly -> hang cycle
    tickThroughFullCycle(bat);
    expect(bat.state).toBe('HANGING');
  });

  it('returns to original position after flight', () => {
    const bat = new Bat(100, 30);
    // Tick through one full hang -> fly -> hang cycle
    tickThroughFullCycle(bat);
    expect(bat.x).toBe(100);
    expect(bat.y).toBe(30);
  });

  it('moves during FLYING state', () => {
    const bat = new Bat(100, 30);
    // Get it to flying state
    tickUntilState(bat, 'FLYING');
    expect(bat.state).toBe('FLYING');
    const xBefore = bat.x;
    bat.update(200);
    expect(bat.x).not.toBe(xBefore);
  });

  it('wingPhase advances during update', () => {
    const bat = new Bat(100, 30);
    bat.update(100);
    expect(bat.wingPhase).toBeGreaterThan(0);
  });
});
