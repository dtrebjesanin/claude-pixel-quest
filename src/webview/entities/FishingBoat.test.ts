import { describe, it, expect } from 'vitest';
import { FishingBoat } from './FishingBoat';
import { ParticleEmitter } from './ParticleEmitter';

describe('FishingBoat', () => {
  it('constructs without throwing', () => {
    const particles = new ParticleEmitter();
    expect(() => new FishingBoat(100, 150, particles, 'test')).not.toThrow();
  });

  it('extends Goblin — has walkTo and transitionTo', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(typeof boat.walkTo).toBe('function');
    expect(typeof boat.transitionTo).toBe('function');
  });

  it('starts in IDLE state', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(boat.getState()).toBe('IDLE');
  });

  it('has boss variant', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    boat.variant = 'boss';
    expect(boat.variant).toBe('boss');
  });

  it('update does not throw', () => {
    const particles = new ParticleEmitter();
    const boat = new FishingBoat(100, 150, particles, 'test');
    expect(() => boat.update(16)).not.toThrow();
  });
});
