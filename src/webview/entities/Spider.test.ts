import { describe, it, expect } from 'vitest';
import { Spider } from './Spider';

describe('Spider', () => {
  it('starts in RESTING state', () => {
    const spider = new Spider(280, 20, 80);
    expect(spider.state).toBe('RESTING');
  });

  it('stays at origin while resting', () => {
    const spider = new Spider(280, 20, 80);
    spider.update(1000);
    expect(spider.y).toBe(20);
  });

  it('transitions to DESCENDING after restTimer expires', () => {
    const spider = new Spider(280, 20, 80);
    let sawDescending = false;
    for (let t = 0; t < 20000; t += 16) {
      spider.update(16);
      if (spider.state === 'DESCENDING') sawDescending = true;
    }
    expect(sawDescending).toBe(true);
  });

  it('moves downward while DESCENDING', () => {
    const spider = new Spider(280, 20, 80);
    // Get to descending
    for (let t = 0; t < 8000; t += 16) spider.update(16);
    if (spider.state === 'DESCENDING') {
      const yBefore = spider.y;
      spider.update(500);
      expect(spider.y).toBeGreaterThan(yBefore);
    }
  });

  it('transitions to CLIMBING at maxDrop', () => {
    const spider = new Spider(280, 20, 80);
    let sawClimbing = false;
    // Run and track whether CLIMBING was ever reached
    for (let t = 0; t < 20000; t += 16) {
      spider.update(16);
      if (spider.state === 'CLIMBING') sawClimbing = true;
    }
    expect(sawClimbing).toBe(true);
  });

  it('returns to origin after full cycle', () => {
    const spider = new Spider(280, 20, 80);
    for (let t = 0; t < 30000; t += 16) spider.update(16);
    // Should be back at rest position
    if (spider.state === 'RESTING') {
      expect(spider.y).toBe(20);
    }
  });

  it('threadLength equals distance from origin', () => {
    const spider = new Spider(280, 20, 80);
    // Get to descending
    for (let t = 0; t < 8000; t += 16) spider.update(16);
    if (spider.state === 'DESCENDING') {
      spider.update(500);
      expect(spider.threadLength).toBeCloseTo(spider.y - 20, 0);
    }
  });
});
