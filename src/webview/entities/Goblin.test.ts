import { describe, it, expect, vi } from 'vitest';
import { Goblin } from './Goblin';
import { ParticleEmitter } from './ParticleEmitter';

function createGoblin(x = 100, y = 100) {
  const particles = new ParticleEmitter();
  return { goblin: new Goblin(x, y, particles, 'test'), particles };
}

/** Simulate game loop updates until the goblin arrives or maxMs elapses */
function tickUntilIdle(goblin: Goblin, maxMs = 5000, stepMs = 16) {
  let elapsed = 0;
  while (elapsed < maxMs) {
    goblin.update(stepMs);
    elapsed += stepMs;
    if (goblin.getState() !== 'WALKING') return elapsed;
  }
  return elapsed;
}

describe('Goblin', () => {
  it('starts in IDLE state', () => {
    const { goblin } = createGoblin();
    expect(goblin.getState()).toBe('IDLE');
  });

  // ── walkTo ──

  it('transitions to WALKING when walkTo is called', () => {
    const { goblin } = createGoblin();
    goblin.walkTo(200, 100);
    expect(goblin.getState()).toBe('WALKING');
  });

  it('faces right when target is to the right', () => {
    const { goblin } = createGoblin(100, 100);
    goblin.walkTo(200, 100);
    // Internal facingRight is private, but we can verify via movement
    goblin.update(16);
    expect(goblin.x).toBeGreaterThan(100);
  });

  it('faces left when target is to the left', () => {
    const { goblin } = createGoblin(200, 100);
    goblin.walkTo(100, 100);
    goblin.update(16);
    expect(goblin.x).toBeLessThan(200);
  });

  it('moves toward target during update', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(110, 0);
    goblin.update(500); // 0.5s at 110px/s = 55px
    expect(goblin.x).toBeGreaterThan(0);
    expect(goblin.x).toBeLessThan(110);
  });

  // ── Arrival ──

  it('transitions to IDLE on arrival', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(10, 0); // Short distance
    tickUntilIdle(goblin);
    expect(goblin.getState()).toBe('IDLE');
  });

  it('reaches exact target position on arrival', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(50, 30);
    tickUntilIdle(goblin);
    expect(goblin.x).toBe(50);
    expect(goblin.y).toBe(30);
  });

  it('fires onArrival callback', () => {
    const { goblin } = createGoblin(0, 0);
    let arrived = false;
    goblin.walkTo(10, 0, () => { arrived = true; });
    tickUntilIdle(goblin);
    expect(arrived).toBe(true);
  });

  // ── THE BUG: walk → arrive → mine must work ──

  it('can transition to MINING from arrival callback', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(10, 0, () => {
      goblin.transitionTo('MINING');
    });
    tickUntilIdle(goblin, 2000);
    expect(goblin.getState()).toBe('MINING');
  });

  it('can transition to CART from arrival callback', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(10, 0, () => {
      goblin.transitionTo('CART');
    });
    tickUntilIdle(goblin, 2000);
    expect(goblin.getState()).toBe('CART');
  });

  it('can transition to DEPOSITING from arrival callback', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(10, 0, () => {
      goblin.transitionTo('DEPOSITING');
    });
    tickUntilIdle(goblin, 2000);
    expect(goblin.getState()).toBe('DEPOSITING');
  });

  // ── Full action sequences (mirrors CaveScene flow) ──

  it('completes full explore sequence: walk → idle → timeout', () => {
    const { goblin } = createGoblin(0, 0);
    let actionDone = false;

    goblin.walkTo(30, 0, () => {
      goblin.actionLabel = 'Searching...';
      // CaveScene uses setTimeout but we simulate it here
      actionDone = true;
    });

    tickUntilIdle(goblin);
    expect(goblin.getState()).toBe('IDLE');
    expect(actionDone).toBe(true);
    expect(goblin.actionLabel).toBe('Searching...');
  });

  it('completes full mine sequence: walk → mining → idle', () => {
    const { goblin } = createGoblin(0, 0);
    let miningDone = false;

    goblin.walkTo(30, 0, () => {
      goblin.actionLabel = 'Mining!';
      goblin.transitionTo('MINING', () => {
        goblin.actionLabel = '';
        miningDone = true;
      });
    });

    // Walk to target
    tickUntilIdle(goblin);
    expect(goblin.getState()).toBe('MINING');
    expect(goblin.actionLabel).toBe('Mining!');

    // Let mining complete (1500ms)
    for (let t = 0; t < 1600; t += 16) goblin.update(16);
    expect(goblin.getState()).toBe('IDLE');
    expect(miningDone).toBe(true);
    expect(goblin.actionLabel).toBe('');
  });

  it('completes full cart sequence: walk with cart → deposit → idle', () => {
    const { goblin } = createGoblin(0, 0);
    let depositDone = false;

    goblin.showCart = true;
    goblin.actionLabel = 'Running...';
    goblin.walkTo(50, 50, () => {
      goblin.showCart = false;
      goblin.actionLabel = 'Depositing';
      goblin.transitionTo('DEPOSITING', () => {
        goblin.actionLabel = '';
        depositDone = true;
      });
    });

    // During walk, cart should be visible
    expect(goblin.showCart).toBe(true);

    // Walk to target
    tickUntilIdle(goblin);
    expect(goblin.getState()).toBe('DEPOSITING');
    expect(goblin.showCart).toBe(false);

    // Let depositing complete (800ms)
    for (let t = 0; t < 900; t += 16) goblin.update(16);
    expect(goblin.getState()).toBe('IDLE');
    expect(depositDone).toBe(true);
  });

  // ── Re-targeting during walk ──

  it('can be redirected to new target while walking', () => {
    const { goblin } = createGoblin(0, 0);
    let firstArrived = false;
    let secondArrived = false;

    goblin.walkTo(200, 0, () => { firstArrived = true; });
    goblin.update(16); // Start moving right

    // Redirect to different target
    goblin.walkTo(50, 0, () => { secondArrived = true; });
    tickUntilIdle(goblin);

    expect(firstArrived).toBe(false);
    expect(secondArrived).toBe(true);
    expect(goblin.x).toBe(50);
  });

  // ── transitionTo ──

  it('transitionTo clears movement targets', () => {
    const { goblin } = createGoblin(0, 0);
    goblin.walkTo(200, 0);
    goblin.update(16);
    const xAfterOneStep = goblin.x;

    goblin.transitionTo('IDLE');
    goblin.update(16);
    // Should not continue moving
    expect(goblin.x).toBe(xAfterOneStep);
  });

  // ── sleep / wake ──

  it('sleep transitions to SLEEPING and clears labels', () => {
    const { goblin } = createGoblin();
    goblin.actionLabel = 'Mining!';
    goblin.showCart = true;
    goblin.showScroll = true;
    goblin.sleep();
    expect(goblin.getState()).toBe('SLEEPING');
    expect(goblin.actionLabel).toBe('');
    expect(goblin.showCart).toBe(false);
    expect(goblin.showScroll).toBe(false);
  });

  it('wake transitions from SLEEPING to IDLE', () => {
    const { goblin } = createGoblin();
    goblin.sleep();
    goblin.wake();
    expect(goblin.getState()).toBe('IDLE');
  });

  // ── Particles emit during correct states ──

  it('emits sparks during MINING', () => {
    const { goblin, particles } = createGoblin();
    goblin.transitionTo('MINING');
    // Run enough frames to trigger particle emission (every 200ms)
    for (let t = 0; t < 500; t += 16) goblin.update(16);
    expect(particles.count).toBeGreaterThan(0);
  });

  it('emits zzz during SLEEPING', () => {
    const { goblin, particles } = createGoblin();
    goblin.sleep();
    // Run enough frames to trigger zzz emission (every 1200ms)
    for (let t = 0; t < 1500; t += 16) goblin.update(16);
    expect(particles.count).toBeGreaterThan(0);
  });

  // ── Labels ──

  it('roleLabel defaults to empty string', () => {
    const { goblin } = createGoblin();
    expect(goblin.roleLabel).toBe('');
  });

  it('variant defaults to "default"', () => {
    const { goblin } = createGoblin();
    expect(goblin.variant).toBe('default');
  });

  it('variant can be set to "boss"', () => {
    const { goblin } = createGoblin();
    goblin.variant = 'boss';
    expect(goblin.variant).toBe('boss');
  });

  // ── Action queue simulation (multiple actions in sequence) ──

  it('can process explore → mine → cart in sequence', () => {
    const { goblin } = createGoblin(100, 100);
    const completedActions: string[] = [];

    // Action 1: explore — walk to (50, 100), then idle briefly
    goblin.showScroll = true;
    goblin.walkTo(50, 100, () => {
      goblin.showScroll = false;
      completedActions.push('explore');

      // Action 2: mine — walk to (150, 100), then mine
      goblin.walkTo(150, 100, () => {
        goblin.transitionTo('MINING', () => {
          completedActions.push('mine');

          // Action 3: cart — walk to (100, 200)
          goblin.showCart = true;
          goblin.walkTo(100, 200, () => {
            goblin.showCart = false;
            goblin.transitionTo('DEPOSITING', () => {
              completedActions.push('cart');
            });
          });
        });
      });
    });

    // Run game loop for enough time to complete all actions
    // Walk 1: ~50px @ 110px/s = ~0.45s
    // Walk 2: ~100px @ 110px/s = ~0.9s
    // Mining: 1.5s
    // Walk 3: ~110px @ 110px/s = ~1.0s
    // Depositing: 0.8s
    // Total: ~4.65s
    for (let t = 0; t < 6000; t += 16) goblin.update(16);

    expect(completedActions).toEqual(['explore', 'mine', 'cart']);
    expect(goblin.getState()).toBe('IDLE');
  });

  // ── Ground shadow ──

  describe('renderShadow', () => {
    it('draws to the canvas context', () => {
      const { goblin } = createGoblin(100, 100);
      const ctx = {
        fillStyle: '',
        globalAlpha: 1,
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      goblin.renderShadow(ctx, 1);
      // Should have drawn at least one shape
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('shadow stays grounded during jump (CELEBRATING)', () => {
      const { goblin } = createGoblin(100, 100);
      goblin.transitionTo('CELEBRATING');
      // Advance animation so jump offset is non-zero
      for (let t = 0; t < 100; t += 16) goblin.update(16);

      const ctx = {
        fillStyle: '',
        globalAlpha: 1,
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      goblin.renderShadow(ctx, 1);
      // All fillRect calls should use the base y position (100 + SIZE area),
      // not the jump-adjusted position
      const calls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      for (const call of calls) {
        // y arg (index 1) should be near ground level (y + ~26-30), not above
        expect(call[1]).toBeGreaterThanOrEqual(100 + 26);
      }
    });
  });

  // ── forceIdle ──

  describe('forceIdle', () => {
    it('resets to IDLE from any non-interruptible state', () => {
      const { goblin } = createGoblin();

      // Put goblin into MINING (non-interruptible)
      goblin.transitionTo('MINING');
      expect(goblin.getState()).toBe('MINING');

      // Normal transition to IDLE should be blocked
      goblin.transitionTo('IDLE');
      expect(goblin.getState()).toBe('MINING');

      // forceIdle bypasses the guard
      goblin.forceIdle();
      expect(goblin.getState()).toBe('IDLE');
    });

    it('clears walk target', () => {
      const { goblin } = createGoblin(0, 0);

      // Start walking
      goblin.walkTo(500, 0);
      expect(goblin.getState()).toBe('WALKING');
      goblin.update(16);
      const xAfterOneStep = goblin.x;
      expect(xAfterOneStep).toBeGreaterThan(0);

      // forceIdle should clear walk target
      goblin.forceIdle();
      expect(goblin.getState()).toBe('IDLE');

      // Further updates should not move the goblin
      goblin.update(16);
      goblin.update(16);
      expect(goblin.x).toBe(xAfterOneStep);
    });

    it('does not fire pending callbacks', () => {
      const { goblin } = createGoblin();
      let callbackFired = false;

      goblin.transitionTo('MINING', () => { callbackFired = true; });
      expect(goblin.getState()).toBe('MINING');
      goblin.update(750); // halfway through mining

      goblin.forceIdle();
      expect(goblin.getState()).toBe('IDLE');

      // Run updates well past when the mining callback would have fired
      for (let t = 0; t < 3000; t += 16) goblin.update(16);
      expect(callbackFired).toBe(false);
    });
  });
});
