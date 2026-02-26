// src/webview/scene/ForestBackground.test.ts
import { describe, it, expect } from 'vitest';
import { ForestBackground } from './ForestBackground';

describe('ForestBackground', () => {
  it('generates without throwing', () => {
    const bg = new ForestBackground();
    expect(() => bg.generate(600, 800)).not.toThrow();
  });

  it('re-generates on size change during render', () => {
    const bg = new ForestBackground();
    bg.generate(300, 400);
    expect(() => bg.generate(600, 800)).not.toThrow();
  });
});
