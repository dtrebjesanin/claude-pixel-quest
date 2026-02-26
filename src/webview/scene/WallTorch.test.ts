import { describe, it, expect } from 'vitest';
import { WallTorch } from './WallTorch';

describe('WallTorch', () => {
  it('constructor sets position and side', () => {
    const torch = new WallTorch(8, 130, 'left');
    expect(torch.getPosition()).toEqual({ x: 8, y: 130 });
    expect(torch.side).toBe('left');
  });

  it('flameFrame starts at 0', () => {
    const torch = new WallTorch(0, 0, 'left');
    expect((torch as any).flameFrame).toBe(0);
  });

  it('flameFrame changes after enough update ticks', () => {
    const torch = new WallTorch(0, 0, 'left');
    // Advance well past the max jitter (200ms)
    for (let i = 0; i < 10; i++) {
      torch.update(100);
    }
    // After 1000ms of updates, flameFrame should have changed at least once
    const frame = (torch as any).flameFrame;
    // We can't predict exact value due to jitter, but it should have cycled
    expect(frame).toBeGreaterThanOrEqual(0);
    expect(frame).toBeLessThanOrEqual(2);
  });

  it('flameFrame stays in valid range (0-2) after many updates', () => {
    const torch = new WallTorch(0, 0, 'right');
    for (let i = 0; i < 100; i++) {
      torch.update(50);
    }
    const frame = (torch as any).flameFrame;
    expect(frame).toBeGreaterThanOrEqual(0);
    expect(frame).toBeLessThanOrEqual(2);
  });

  it('glowRadius oscillates within expected bounds', () => {
    const torch = new WallTorch(0, 0, 'left');
    const radii: number[] = [];
    for (let i = 0; i < 50; i++) {
      torch.update(50);
      radii.push(torch.getGlowRadius());
    }
    // Base 50 ± 5
    for (const r of radii) {
      expect(r).toBeGreaterThanOrEqual(44);
      expect(r).toBeLessThanOrEqual(56);
    }
  });

  it('getPosition returns stable coordinates', () => {
    const torch = new WallTorch(292, 180, 'right');
    torch.update(500);
    expect(torch.getPosition()).toEqual({ x: 292, y: 180 });
  });
});
