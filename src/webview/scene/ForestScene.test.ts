import { describe, it, expect } from 'vitest';
import { ForestScene } from './ForestScene';

describe('ForestScene', () => {
  it('constructs without throwing', () => {
    expect(() => new ForestScene()).not.toThrow();
  });

  it('update does not throw', () => {
    const scene = new ForestScene();
    expect(() => scene.update(100)).not.toThrow();
  });

  it('has falling leaves atmosphere', () => {
    const scene = new ForestScene();
    expect((scene as any).fallingLeaves).toBeDefined();
    expect((scene as any).fallingLeaves.count).toBeGreaterThan(0);
  });

  it('has forest birds', () => {
    const scene = new ForestScene();
    expect((scene as any).birds.length).toBeGreaterThan(0);
  });

  it('does not have sunbeam shafts (removed for visual clarity)', () => {
    const scene = new ForestScene();
    expect((scene as any).sunbeams).toBeUndefined();
  });
});
