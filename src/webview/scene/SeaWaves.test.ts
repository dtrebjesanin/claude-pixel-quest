import { describe, it, expect } from 'vitest';
import { SeaWaves } from './SeaWaves';

describe('SeaWaves', () => {
  it('constructs with width and height', () => {
    const waves = new SeaWaves(300, 400);
    expect(waves).toBeDefined();
  });

  it('update advances phase', () => {
    const waves = new SeaWaves(300, 400);
    waves.update(1000);
    expect(waves.phase).toBeGreaterThan(0);
  });

  it('has wave count based on height', () => {
    const waves = new SeaWaves(300, 400);
    expect(waves.waveCount).toBeGreaterThan(0);
  });

  it('resize updates dimensions', () => {
    const waves = new SeaWaves(300, 400);
    waves.resize(600, 800);
    expect(waves.waveCount).toBeGreaterThan(0);
  });
});
