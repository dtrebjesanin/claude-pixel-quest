import { describe, it, expect } from 'vitest';
import { GoblinStateMachine } from './GoblinStateMachine';

describe('GoblinStateMachine', () => {
  it('starts in IDLE state', () => {
    const sm = new GoblinStateMachine();
    expect(sm.getState()).toBe('IDLE');
  });

  // ── Interruptible states ──

  it('transitions from IDLE to any state', () => {
    const sm = new GoblinStateMachine();
    expect(sm.transition('WALKING')).toBe(true);
    expect(sm.getState()).toBe('WALKING');
  });

  it('transitions from SLEEPING to any state', () => {
    const sm = new GoblinStateMachine();
    sm.transition('SLEEPING');
    expect(sm.transition('WALKING')).toBe(true);
    expect(sm.getState()).toBe('WALKING');
  });

  // ── WALKING transitions (the root cause of the "stuck walking" bug) ──

  it('WALKING → IDLE succeeds (arrival transition)', () => {
    const sm = new GoblinStateMachine();
    sm.transition('WALKING');
    expect(sm.getState()).toBe('WALKING');

    const result = sm.transition('IDLE');
    expect(result).toBe(true);
    expect(sm.getState()).toBe('IDLE');
  });

  it('WALKING → MINING succeeds', () => {
    const sm = new GoblinStateMachine();
    sm.transition('WALKING');
    expect(sm.transition('MINING')).toBe(true);
    expect(sm.getState()).toBe('MINING');
  });

  it('WALKING → CART succeeds', () => {
    const sm = new GoblinStateMachine();
    sm.transition('WALKING');
    expect(sm.transition('CART')).toBe(true);
    expect(sm.getState()).toBe('CART');
  });

  it('WALKING → WALKING succeeds (re-targeting)', () => {
    const sm = new GoblinStateMachine();
    sm.transition('WALKING');
    expect(sm.transition('WALKING')).toBe(true);
    expect(sm.getState()).toBe('WALKING');
  });

  // ── Non-interruptible states block transitions until expired ──

  it('MINING blocks transitions while active', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING');
    expect(sm.transition('IDLE')).toBe(false);
    expect(sm.transition('WALKING')).toBe(false);
    expect(sm.getState()).toBe('MINING');
  });

  it('CART blocks transitions while active', () => {
    const sm = new GoblinStateMachine();
    sm.transition('CART');
    expect(sm.transition('IDLE')).toBe(false);
    expect(sm.getState()).toBe('CART');
  });

  it('CELEBRATING blocks transitions while active', () => {
    const sm = new GoblinStateMachine();
    sm.transition('CELEBRATING');
    expect(sm.transition('IDLE')).toBe(false);
    expect(sm.getState()).toBe('CELEBRATING');
  });

  // ── Same-state transitions always succeed ──

  it('MINING → MINING succeeds (same state)', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING');
    expect(sm.transition('MINING')).toBe(true);
  });

  // ── Timed auto-transitions ──

  it('MINING auto-transitions to IDLE after duration', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING');

    // Not expired yet
    sm.update(1000);
    expect(sm.getState()).toBe('MINING');

    // Exceeds 1500ms duration
    sm.update(600);
    expect(sm.getState()).toBe('IDLE');
  });

  it('CART auto-transitions to IDLE after 2000ms', () => {
    const sm = new GoblinStateMachine();
    sm.transition('CART');

    sm.update(1999);
    expect(sm.getState()).toBe('CART');

    sm.update(2);
    expect(sm.getState()).toBe('IDLE');
  });

  it('DEPOSITING auto-transitions to IDLE after 800ms', () => {
    const sm = new GoblinStateMachine();
    sm.transition('DEPOSITING');

    sm.update(799);
    expect(sm.getState()).toBe('DEPOSITING');

    sm.update(2);
    expect(sm.getState()).toBe('IDLE');
  });

  // ── Callbacks ──

  it('fires onComplete when timed state expires', () => {
    const sm = new GoblinStateMachine();
    let fired = false;
    sm.transition('MINING', () => { fired = true; });

    sm.update(1500);
    expect(fired).toBe(true);
    expect(sm.getState()).toBe('IDLE');
  });

  it('does not fire old callback when transition is replaced', () => {
    const sm = new GoblinStateMachine();
    let oldFired = false;
    let newFired = false;
    sm.transition('IDLE', () => { oldFired = true; });
    sm.transition('MINING', () => { newFired = true; });

    sm.update(1500);
    expect(oldFired).toBe(false);
    expect(newFired).toBe(true);
  });

  it('resets elapsed on transition', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING');
    sm.update(1000); // 1000ms into mining
    expect(sm.getProgress()).toBeCloseTo(1000 / 1500, 2);

    // Re-transition to MINING resets timer
    sm.transition('MINING');
    expect(sm.getProgress()).toBe(0);
  });

  // ── Expired non-interruptible states can be interrupted ──

  it('expired MINING can be interrupted', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING');
    sm.update(1500); // expires → IDLE via auto-transition

    // Now in IDLE, should be interruptible
    expect(sm.getState()).toBe('IDLE');
    expect(sm.transition('WALKING')).toBe(true);
  });

  // ── Full walk→mine→idle sequence (the flow that was broken) ──

  it('completes WALKING → IDLE → MINING → IDLE sequence', () => {
    const sm = new GoblinStateMachine();

    // Start walking
    expect(sm.transition('WALKING')).toBe(true);
    expect(sm.getState()).toBe('WALKING');

    // Arrive → go IDLE
    expect(sm.transition('IDLE')).toBe(true);
    expect(sm.getState()).toBe('IDLE');

    // Start mining
    let miningDone = false;
    expect(sm.transition('MINING', () => { miningDone = true; })).toBe(true);
    expect(sm.getState()).toBe('MINING');

    // Mining completes
    sm.update(1500);
    expect(sm.getState()).toBe('IDLE');
    expect(miningDone).toBe(true);
  });

  it('completes WALKING → IDLE → CART → IDLE sequence', () => {
    const sm = new GoblinStateMachine();

    expect(sm.transition('WALKING')).toBe(true);
    expect(sm.transition('IDLE')).toBe(true);

    let cartDone = false;
    expect(sm.transition('CART', () => { cartDone = true; })).toBe(true);
    expect(sm.getState()).toBe('CART');

    sm.update(2000);
    expect(sm.getState()).toBe('IDLE');
    expect(cartDone).toBe(true);
  });

  // ── getProgress ──

  it('returns progress for timed states', () => {
    const sm = new GoblinStateMachine();
    sm.transition('MINING'); // 1500ms duration

    sm.update(750);
    expect(sm.getProgress()).toBeCloseTo(0.5, 2);
  });

  it('returns 0 progress for non-timed states', () => {
    const sm = new GoblinStateMachine();
    expect(sm.getProgress()).toBe(0); // IDLE
    sm.transition('WALKING');
    expect(sm.getProgress()).toBe(0); // WALKING
  });

  it('clamps progress to 1', () => {
    const sm = new GoblinStateMachine();
    sm.transition('POOF_IN'); // 500ms
    sm.update(250);
    expect(sm.getProgress()).toBeCloseTo(0.5, 2);
  });

  // ── forceIdle ──

  describe('forceIdle', () => {
    it('forces CELEBRATING to IDLE', () => {
      const sm = new GoblinStateMachine();
      sm.transition('CELEBRATING');
      expect(sm.getState()).toBe('CELEBRATING');

      // Normal transition should be blocked
      expect(sm.transition('IDLE')).toBe(false);

      // forceIdle bypasses the guard
      sm.forceIdle();
      expect(sm.getState()).toBe('IDLE');
    });

    it('forces MINING to IDLE mid-animation', () => {
      const sm = new GoblinStateMachine();
      sm.transition('MINING');
      sm.update(750); // halfway through 1500ms duration
      expect(sm.getState()).toBe('MINING');

      sm.forceIdle();
      expect(sm.getState()).toBe('IDLE');
    });

    it('forces POOF_IN to IDLE', () => {
      const sm = new GoblinStateMachine();
      sm.transition('POOF_IN');
      sm.update(100); // partially through 500ms duration
      expect(sm.getState()).toBe('POOF_IN');

      sm.forceIdle();
      expect(sm.getState()).toBe('IDLE');
    });

    it('clears elapsed timer', () => {
      const sm = new GoblinStateMachine();
      sm.transition('MINING');
      sm.update(750); // accumulate some elapsed time
      expect(sm.getProgress()).toBeCloseTo(0.5, 2);

      sm.forceIdle();
      // After forceIdle, progress should be 0 (IDLE has no duration, so getProgress returns 0)
      expect(sm.getProgress()).toBe(0);

      // Verify elapsed is truly reset by transitioning to a new timed state
      sm.transition('MINING');
      expect(sm.getProgress()).toBe(0);
      sm.update(750);
      expect(sm.getProgress()).toBeCloseTo(0.5, 2);
    });

    it('clears onStateComplete callback (does not fire it)', () => {
      const sm = new GoblinStateMachine();
      let callbackFired = false;
      sm.transition('MINING', () => { callbackFired = true; });
      sm.update(750); // halfway

      sm.forceIdle();
      // Simulate more time passing — callback should never fire
      sm.update(2000);
      expect(callbackFired).toBe(false);
    });

    it('works from IDLE (no-op effectively)', () => {
      const sm = new GoblinStateMachine();
      expect(sm.getState()).toBe('IDLE');
      sm.forceIdle();
      expect(sm.getState()).toBe('IDLE');
      // Still functional after no-op forceIdle
      expect(sm.transition('WALKING')).toBe(true);
      expect(sm.getState()).toBe('WALKING');
    });
  });
});
