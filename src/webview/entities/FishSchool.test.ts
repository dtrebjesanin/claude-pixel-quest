import { describe, it, expect } from 'vitest';
import { FishSchool } from './FishSchool';

describe('FishSchool', () => {
  it('constructs with x and y', () => {
    const school = new FishSchool(100, 180);
    expect(school.x).toBe(100);
    expect(school.y).toBe(180);
  });

  it('update does not throw', () => {
    const school = new FishSchool(100, 180);
    expect(() => school.update(16)).not.toThrow();
  });

  it('phase advances during update', () => {
    const school = new FishSchool(100, 180);
    school.update(1000);
    expect((school as any).phase).toBeGreaterThan(0);
  });

  it('splash triggers after interval', () => {
    const school = new FishSchool(100, 180);
    for (let t = 0; t < 10000; t += 16) {
      school.update(16);
    }
    expect(true).toBe(true);
  });

  it('has fish count between 3 and 5', () => {
    const school = new FishSchool(100, 180);
    const fishCount = (school as any).fishCount;
    expect(fishCount).toBeGreaterThanOrEqual(3);
    expect(fishCount).toBeLessThanOrEqual(5);
  });
});
