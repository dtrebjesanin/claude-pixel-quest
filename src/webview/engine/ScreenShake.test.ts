import { describe, it, expect } from 'vitest';
import { ScreenShake } from './ScreenShake';

describe('ScreenShake', () => {
  it('starts inactive', () => {
    const shake = new ScreenShake();
    expect(shake.active).toBe(false);
  });

  it('becomes active after trigger', () => {
    const shake = new ScreenShake();
    shake.trigger(4, 300);
    expect(shake.active).toBe(true);
  });

  it('becomes inactive after duration elapses', () => {
    const shake = new ScreenShake();
    shake.trigger(4, 300);
    shake.update(400);
    expect(shake.active).toBe(false);
  });

  it('offsets are zero when inactive', () => {
    const shake = new ScreenShake();
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
  });

  it('offsets are non-zero while active', () => {
    const shake = new ScreenShake();
    shake.trigger(4, 300);
    shake.update(50);
    // At least one offset should be non-zero (random, but intensity > 0)
    const hasOffset = shake.offsetX !== 0 || shake.offsetY !== 0;
    expect(hasOffset).toBe(true);
  });

  it('offsets stay within intensity bounds', () => {
    const shake = new ScreenShake();
    shake.trigger(4, 1000);
    for (let i = 0; i < 20; i++) {
      shake.update(30);
      expect(Math.abs(shake.offsetX)).toBeLessThanOrEqual(4);
      expect(Math.abs(shake.offsetY)).toBeLessThanOrEqual(4);
    }
  });

  it('offsets return to zero after shake ends', () => {
    const shake = new ScreenShake();
    shake.trigger(4, 100);
    shake.update(200);
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
  });
});
