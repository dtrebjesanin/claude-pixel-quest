import { describe, it, expect } from 'vitest';
import { FishingScene } from './FishingScene';

describe('FishingScene', () => {
  it('constructs without throwing', () => {
    expect(() => new FishingScene()).not.toThrow();
  });

  it('update does not throw', () => {
    const scene = new FishingScene();
    expect(() => scene.update(100)).not.toThrow();
  });

  it('has sea waves atmosphere', () => {
    const scene = new FishingScene();
    expect((scene as any).seaWaves).toBeDefined();
  });

  it('has seagulls', () => {
    const scene = new FishingScene();
    expect((scene as any).seagulls.length).toBeGreaterThan(0);
  });
});
