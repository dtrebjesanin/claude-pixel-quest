import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop', () => {
  let rafCallbacks: Array<(time: number) => void>;

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('performance', { now: () => 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function triggerFrame(time: number) {
    const cb = rafCallbacks.pop();
    if (cb) cb(time);
  }

  it('calls updateFn with fixedDt (~33.33ms) per accumulated step', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);
    const fixedDt = 1000 / 30;

    loop.start();
    // First frame at 50ms (> 33.33ms, so 1 update step)
    triggerFrame(50);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(fixedDt);
  });

  it('does not call updateFn when delta < fixedDt', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    loop.start();
    // Frame at 10ms (< 33.33ms, no update step)
    triggerFrame(10);

    expect(update).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1); // Render still called
  });

  it('calls updateFn multiple times for large deltas', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);
    const fixedDt = 1000 / 30;

    loop.start();
    // Frame at 80ms → 80/33.33 = 2.4 → 2 update steps
    triggerFrame(80);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(fixedDt);
  });

  it('caps delta at 100ms to prevent spiral-of-death', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    loop.start();
    // Simulate tab being backgrounded: 5000ms gap
    // Without cap, this would be 5000/33.33 = 150 updates
    // With 100ms cap, accumulator = 100. fixedDt = 1000/30 ≈ 33.333...
    // Due to floating point: 100 - 33.333... - 33.333... = 33.333...328
    // which is < fixedDt (33.333...336), so only 2 updates fit.
    triggerFrame(5000);

    expect(update).toHaveBeenCalledTimes(2);
    // Verify it's WAY less than uncapped (150 updates)
    expect(update.mock.calls.length).toBeLessThan(10);
  });

  it('calls renderFn with interpolation factor after updates', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    loop.start();
    triggerFrame(50);

    expect(render).toHaveBeenCalledTimes(1);
    // interpolation = accumulator / fixedDt
    const interpolation = render.mock.calls[0][0];
    expect(interpolation).toBeGreaterThanOrEqual(0);
    expect(interpolation).toBeLessThan(1);
  });

  it('stop() prevents further tick calls', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    loop.start();
    loop.stop();
    triggerFrame(50);

    expect(update).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('accumulator carries remainder across ticks', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);
    const fixedDt = 1000 / 30;

    loop.start();
    // First frame: 20ms → no update (accumulator = 20)
    triggerFrame(20);
    expect(update).toHaveBeenCalledTimes(0);

    // Second frame: 40ms → delta = 20ms, accumulator = 40 → 1 update
    triggerFrame(40);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(fixedDt);
  });

  it('schedules next frame via requestAnimationFrame', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = new GameLoop(update, render);

    loop.start();
    expect(rafCallbacks.length).toBe(1); // start() schedules first frame

    triggerFrame(50);
    expect(rafCallbacks.length).toBe(1); // tick() schedules next frame
  });
});
