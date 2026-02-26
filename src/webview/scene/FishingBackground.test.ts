import { describe, it, expect } from 'vitest';
import { FishingBackground } from './FishingBackground';

describe('FishingBackground', () => {
  it('generates without throwing', () => {
    const bg = new FishingBackground();
    expect(() => bg.generate(300, 400)).not.toThrow();
  });

  it('re-generates on size change during render', () => {
    const bg = new FishingBackground();
    bg.generate(300, 400);
    expect(() => bg.generate(600, 800)).not.toThrow();
  });
});
