import { describe, it, expect } from 'vitest';
import { Seagull } from './Seagull';

function tickUntilState(gull: Seagull, target: 'PERCHED' | 'FLYING', maxMs = 20000, stepMs = 16): void {
  for (let t = 0; t < maxMs; t += stepMs) {
    gull.update(stepMs);
    if (gull.state === target) return;
  }
}

describe('Seagull', () => {
  it('starts in PERCHED state', () => {
    const gull = new Seagull(150, 60);
    expect(gull.state).toBe('PERCHED');
  });

  it('stays PERCHED while timer has not expired', () => {
    const gull = new Seagull(150, 60);
    gull.update(500);
    expect(gull.state).toBe('PERCHED');
  });

  it('transitions to FLYING after perchTimer expires', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    expect(gull.state).toBe('FLYING');
  });

  it('returns to PERCHED after flight completes', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    tickUntilState(gull, 'PERCHED');
    expect(gull.state).toBe('PERCHED');
  });

  it('returns to origin after flight', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    tickUntilState(gull, 'PERCHED');
    expect(gull.x).toBe(150);
    expect(gull.y).toBe(60);
  });

  it('moves during FLYING state', () => {
    const gull = new Seagull(150, 60);
    tickUntilState(gull, 'FLYING');
    const xBefore = gull.x;
    gull.update(200);
    expect(gull.x).not.toBe(xBefore);
  });

  it('wingPhase advances during update', () => {
    const gull = new Seagull(150, 60);
    gull.update(100);
    expect(gull.wingPhase).toBeGreaterThan(0);
  });
});
