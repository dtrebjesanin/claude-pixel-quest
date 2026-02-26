import { describe, it, expect } from 'vitest';
import { ForestBird } from './ForestBird';

function tickUntilState(bird: ForestBird, target: 'PERCHED' | 'FLYING', maxMs = 20000, stepMs = 16): void {
  for (let t = 0; t < maxMs; t += stepMs) {
    bird.update(stepMs);
    if (bird.state === target) return;
  }
}

describe('ForestBird', () => {
  it('starts in PERCHED state', () => {
    const bird = new ForestBird(50, 40);
    expect(bird.state).toBe('PERCHED');
  });

  it('stays PERCHED while perchTimer has not expired', () => {
    const bird = new ForestBird(50, 40);
    bird.update(500);
    expect(bird.state).toBe('PERCHED');
  });

  it('transitions to FLYING after perchTimer expires', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    expect(bird.state).toBe('FLYING');
  });

  it('returns to PERCHED after flight completes', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    tickUntilState(bird, 'PERCHED');
    expect(bird.state).toBe('PERCHED');
  });

  it('returns to origin after flight', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    tickUntilState(bird, 'PERCHED');
    expect(bird.x).toBe(50);
    expect(bird.y).toBe(40);
  });

  it('moves during FLYING state', () => {
    const bird = new ForestBird(50, 40);
    tickUntilState(bird, 'FLYING');
    const xBefore = bird.x;
    bird.update(200);
    expect(bird.x).not.toBe(xBefore);
  });

  it('wingPhase advances during update', () => {
    const bird = new ForestBird(50, 40);
    bird.update(100);
    expect(bird.wingPhase).toBeGreaterThan(0);
  });
});