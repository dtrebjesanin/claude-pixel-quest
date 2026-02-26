export type GoblinState = 'IDLE' | 'SLEEPING' | 'WALKING' | 'MINING' | 'CART' | 'DEPOSITING' | 'CELEBRATING' | 'POOF_IN';

export interface StateConfig {
  canInterrupt: boolean;
  duration?: number; // Auto-transition to IDLE after this many ms (0 = no auto)
}

const STATE_CONFIGS: Record<GoblinState, StateConfig> = {
  IDLE: { canInterrupt: true },
  SLEEPING: { canInterrupt: true },
  WALKING: { canInterrupt: true },
  MINING: { canInterrupt: false, duration: 1500 },
  CART: { canInterrupt: false, duration: 2000 },
  DEPOSITING: { canInterrupt: false, duration: 800 },
  CELEBRATING: { canInterrupt: false, duration: 3000 },
  POOF_IN: { canInterrupt: false, duration: 500 },
};

export class GoblinStateMachine {
  private currentState: GoblinState = 'IDLE';
  private elapsed = 0;
  private onStateComplete?: () => void;

  getState(): GoblinState {
    return this.currentState;
  }

  transition(newState: GoblinState, onComplete?: () => void): boolean {
    const current = STATE_CONFIGS[this.currentState];

    // Can't interrupt non-interruptible states (unless transitioning from same state)
    if (!current.canInterrupt && this.currentState !== newState && !this.isExpired()) {
      return false;
    }

    this.currentState = newState;
    this.elapsed = 0;
    this.onStateComplete = onComplete;
    return true;
  }

  update(dt: number): void {
    const config = STATE_CONFIGS[this.currentState];
    this.elapsed += dt;

    // Auto-transition back to IDLE when timed state expires
    if (config.duration && this.elapsed >= config.duration) {
      const callback = this.onStateComplete;
      this.currentState = 'IDLE';
      this.elapsed = 0;
      this.onStateComplete = undefined;
      callback?.();
    }
  }

  /** Force-reset to IDLE, ignoring canInterrupt guards. Used for session reset. */
  forceIdle(): void {
    this.currentState = 'IDLE';
    this.elapsed = 0;
    this.onStateComplete = undefined;
  }

  isExpired(): boolean {
    const config = STATE_CONFIGS[this.currentState];
    return config.duration !== undefined && this.elapsed >= config.duration;
  }

  getProgress(): number {
    const config = STATE_CONFIGS[this.currentState];
    if (!config.duration) return 0;
    return Math.min(this.elapsed / config.duration, 1);
  }
}
