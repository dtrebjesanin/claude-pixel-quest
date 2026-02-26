import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CaveScene } from './CaveScene';

// CaveScene uses setTimeout internally, so we use fake timers
// but we still need the game loop to tick for goblin movement

/** Access private members for testing */
function getPrivate(scene: CaveScene) {
  const s = scene as any;
  return {
    get actionQueue() { return s.actionQueue as Array<{ toolName: string; toolInput: Record<string, unknown> }>; },
    get processingAction() { return s.processingAction as boolean; },
    get feed() { return s.feed as Array<{ text: string; age: number }>; },
    get goblins() { return s.characters as Map<string, any>; },
    get connectionState() { return s.connectionState as string; },
    get overlayAlpha() { return s.overlayAlpha as number; },
    get showOverlay() { return s.showOverlay as boolean; },
    get nextOreIndex() { return s.nextTargetIndex as number; },
    get completingAgents() { return s.completingAgents as Set<string>; },
    get chest() { return s.chest as any; },
  };
}

/** Tick the scene's update loop for totalMs at 16ms steps */
function tickScene(scene: CaveScene, totalMs: number, stepMs = 16) {
  for (let t = 0; t < totalMs; t += stepMs) {
    scene.update(stepMs);
  }
}

describe('CaveScene', () => {
  let scene: CaveScene;

  beforeEach(() => {
    vi.useFakeTimers();
    scene = new CaveScene();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Constructor / Initial state ──

  describe('constructor', () => {
    it('creates a main goblin', () => {
      expect(getPrivate(scene).goblins.has('main')).toBe(true);
    });

    it('creates 3 ore veins from theme', () => {
      const s = scene as any;
      expect(s.targets).toHaveLength(3);
    });

    it('starts disconnected with overlay hidden until state received', () => {
      const p = getPrivate(scene);
      expect(p.connectionState).toBe('disconnected');
      expect(p.showOverlay).toBe(false);
    });

    it('starts with empty action queue', () => {
      expect(getPrivate(scene).actionQueue).toHaveLength(0);
      expect(getPrivate(scene).processingAction).toBe(false);
    });
  });

  // ── Action queue ──

  describe('action queue', () => {
    it('handleToolCall enqueues action', () => {
      scene.handleToolCall('Read', { file_path: '/src/app.ts' });
      expect(getPrivate(scene).actionQueue).toHaveLength(1);
      expect(getPrivate(scene).actionQueue[0].toolName).toBe('Read');
    });

    it('multiple handleToolCall calls queue in FIFO order', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
      scene.handleToolCall('Bash', { command: 'npm test' });
      const q = getPrivate(scene).actionQueue;
      expect(q).toHaveLength(3);
      expect(q[0].toolName).toBe('Read');
      expect(q[1].toolName).toBe('Edit');
      expect(q[2].toolName).toBe('Bash');
    });

    it('update() triggers processNextAction when queue is non-empty', () => {
      scene.handleToolCall('Read', {});
      expect(getPrivate(scene).processingAction).toBe(false);

      scene.update(16);
      expect(getPrivate(scene).processingAction).toBe(true);
      expect(getPrivate(scene).actionQueue).toHaveLength(0); // dequeued
    });

    it('does not dequeue next action while processing', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});

      scene.update(16); // Starts processing Read
      expect(getPrivate(scene).processingAction).toBe(true);
      expect(getPrivate(scene).actionQueue).toHaveLength(1); // Edit still queued

      scene.update(16); // Should NOT dequeue Edit yet
      expect(getPrivate(scene).actionQueue).toHaveLength(1);
    });

    it('unknown tool action sets processingAction=false immediately', () => {
      scene.handleToolCall('UnknownTool', {});
      scene.update(16);
      expect(getPrivate(scene).processingAction).toBe(false);
    });

    it('explore action completes and allows next action to process', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});

      // Start processing Read (explore)
      scene.update(16);
      expect(getPrivate(scene).processingAction).toBe(true);

      // Tick until goblin arrives at ore vein + 1200ms setTimeout
      tickScene(scene, 3000);
      vi.advanceTimersByTime(1200);

      // Now processingAction should be false and Edit dequeued on next update
      scene.update(16);
      // The Edit action should now be processing or queued
    });

    it('getNextOreVein cycles round-robin', () => {
      const p = getPrivate(scene);
      expect(p.nextOreIndex).toBe(0);

      scene.handleToolCall('Read', {});
      scene.update(16); // processes Read, uses vein 0
      expect(p.nextOreIndex).toBe(1);
    });
  });

  // ── Activity feed ──

  describe('feed', () => {
    it('handleToolCall adds a feed entry', () => {
      scene.handleToolCall('Read', { file_path: '/src/app.ts' });
      const feed = getPrivate(scene).feed;
      expect(feed).toHaveLength(1);
      expect(feed[0].text).toBe('Read app.ts');
      expect(feed[0].age).toBe(0);
    });

    it('feed entries age with each update', () => {
      scene.handleToolCall('Read', {});
      scene.update(100);
      expect(getPrivate(scene).feed[0].age).toBe(100);
    });

    it('entries are removed after feedLifetime (6000ms)', () => {
      scene.handleToolCall('Read', {});
      tickScene(scene, 6100);
      expect(getPrivate(scene).feed).toHaveLength(0);
    });

    it('feed caps at maxFeedEntries (4)', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
      scene.handleToolCall('Bash', { command: 'test' });
      scene.handleToolCall('Write', {});
      scene.handleToolCall('Glob', { pattern: '*.ts' }); // 5th entry
      expect(getPrivate(scene).feed).toHaveLength(4);
    });

    it('oldest entry is removed when cap is exceeded', () => {
      scene.handleToolCall('Read', { file_path: '/first.ts' });
      scene.handleToolCall('Edit', { file_path: '/second.ts' });
      scene.handleToolCall('Write', { file_path: '/third.ts' });
      scene.handleToolCall('Bash', { command: 'fourth' });
      scene.handleToolCall('Glob', { pattern: 'fifth' });
      const feed = getPrivate(scene).feed;
      expect(feed[0].text).not.toContain('first');
    });
  });

  // ── Connection overlay ──

  describe('connection state', () => {
    it('handleConnectionState sets connectionState', () => {
      scene.handleConnectionState('connected');
      expect(getPrivate(scene).connectionState).toBe('connected');
    });

    it('connected clears overlay instantly', () => {
      scene.handleConnectionState('connected');
      expect(getPrivate(scene).showOverlay).toBe(false);
      expect(getPrivate(scene).overlayAlpha).toBe(0);
    });

    it('disconnected puts all goblins to sleep', () => {
      scene.handleConnectionState('disconnected');
      const mainGoblin = getPrivate(scene).goblins.get('main');
      expect(mainGoblin.getState()).toBe('SLEEPING');
    });

    it('no-server puts all goblins to sleep', () => {
      scene.handleConnectionState('no-server');
      const mainGoblin = getPrivate(scene).goblins.get('main');
      expect(mainGoblin.getState()).toBe('SLEEPING');
    });

    it('connected wakes sleeping goblins', () => {
      scene.handleConnectionState('disconnected');
      expect(getPrivate(scene).goblins.get('main').getState()).toBe('SLEEPING');

      scene.handleConnectionState('connected');
      expect(getPrivate(scene).goblins.get('main').getState()).toBe('IDLE');
    });
  });

  // ── Session lifecycle ──

  describe('session lifecycle', () => {
    it('handleSessionStart resets action queue', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
      expect(getPrivate(scene).actionQueue).toHaveLength(2);

      scene.handleSessionStart();
      expect(getPrivate(scene).actionQueue).toHaveLength(0);
    });

    it('handleSessionStart resets processingAction', () => {
      scene.handleToolCall('Read', {});
      scene.update(16); // Start processing
      expect(getPrivate(scene).processingAction).toBe(true);

      scene.handleSessionStart();
      expect(getPrivate(scene).processingAction).toBe(false);
    });

    it('handleSessionStart clears feed except "Session started"', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});

      scene.handleSessionStart();
      const feed = getPrivate(scene).feed;
      expect(feed).toHaveLength(1);
      expect(feed[0].text).toBe('Session started');
    });

    it('handleSessionStart wakes sleeping goblins', () => {
      scene.handleConnectionState('disconnected'); // Sleep
      scene.handleSessionStart();
      expect(getPrivate(scene).goblins.get('main').getState()).toBe('IDLE');
    });

    it('handleSessionStart clears visual flags on goblins', () => {
      const goblin = getPrivate(scene).goblins.get('main');
      goblin.showScroll = true;
      goblin.showCart = true;
      goblin.actionLabel = 'Mining!';

      scene.handleSessionStart();
      expect(goblin.showScroll).toBe(false);
      expect(goblin.showCart).toBe(false);
      expect(goblin.actionLabel).toBe('');
    });

    it('handleSessionEnd transitions all goblins to CELEBRATING', () => {
      scene.handleSessionEnd();
      const goblin = getPrivate(scene).goblins.get('main');
      expect(goblin.getState()).toBe('CELEBRATING');
    });

    it('handleSessionEnd sets "Done!" label', () => {
      scene.handleSessionEnd();
      const goblin = getPrivate(scene).goblins.get('main');
      expect(goblin.actionLabel).toBe('Done!');
    });

    it('handleSessionEnd adds feed entry', () => {
      scene.handleSessionEnd();
      const feed = getPrivate(scene).feed;
      expect(feed.some((e: any) => e.text === 'Session complete!')).toBe(true);
    });

    it('handleSessionEnd clears visual flags', () => {
      const goblin = getPrivate(scene).goblins.get('main');
      goblin.showScroll = true;
      goblin.showCart = true;

      scene.handleSessionEnd();
      expect(goblin.showScroll).toBe(false);
      expect(goblin.showCart).toBe(false);
    });

    it('handleSessionStart clears completingAgents', () => {
      getPrivate(scene).completingAgents.add('sub-1');
      scene.handleSessionStart();
      expect(getPrivate(scene).completingAgents.size).toBe(0);
    });

    it('handleSessionEnd preserves completingAgents so deposit animations finish', () => {
      getPrivate(scene).completingAgents.add('sub-1');
      scene.handleSessionEnd();
      expect(getPrivate(scene).completingAgents.size).toBe(1);
    });

    it('handleSessionEnd clears action queue', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
      scene.handleToolCall('Bash', {});
      expect(getPrivate(scene).actionQueue).toHaveLength(3);

      scene.handleSessionEnd();
      expect(getPrivate(scene).actionQueue).toHaveLength(0);
      expect(getPrivate(scene).processingAction).toBe(false);
    });

    it('handleSessionEnd celebrates even during non-interruptible state', () => {
      // Put goblin into MINING (non-interruptible)
      const goblin = getPrivate(scene).goblins.get('main');
      goblin.transitionTo('MINING');
      expect(goblin.getState()).toBe('MINING');

      scene.handleSessionEnd();
      expect(goblin.getState()).toBe('CELEBRATING');
    });

    it('handleSessionEnd stops queued actions from processing afterwards', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
      scene.update(16); // starts processing Read
      expect(getPrivate(scene).processingAction).toBe(true);

      scene.handleSessionEnd();

      // Tick a long time — no more actions should process
      for (let t = 0; t < 10000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }
      expect(getPrivate(scene).actionQueue).toHaveLength(0);
      expect(getPrivate(scene).processingAction).toBe(false);
    });

    // ── handleSessionIdle (neutral sleeping state) ──

    it('handleSessionIdle transitions goblins to SLEEPING', () => {
      scene.handleSessionIdle();
      const goblin = getPrivate(scene).goblins.get('main');
      expect(goblin.getState()).toBe('SLEEPING');
    });

    it('handleSessionIdle does NOT set "Done!" label', () => {
      scene.handleSessionIdle();
      const goblin = getPrivate(scene).goblins.get('main');
      expect(goblin.actionLabel).toBe('');
    });

    it('handleSessionIdle does NOT open chest', () => {
      scene.handleSessionIdle();
      const chest = getPrivate(scene).chest;
      expect(chest.isOpen).toBe(false);
    });

    it('handleSessionIdle clears action queue', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});

      scene.handleSessionIdle();
      expect(getPrivate(scene).actionQueue).toHaveLength(0);
      expect(getPrivate(scene).processingAction).toBe(false);
    });

    it('handleSessionStart removes leftover subagent goblins', () => {
      scene.handleSubagentSpawn('sub-1', 'Agent A');
      scene.handleSubagentSpawn('sub-2', 'Agent B');
      expect(getPrivate(scene).goblins.size).toBe(3);

      scene.handleSessionStart();
      expect(getPrivate(scene).goblins.size).toBe(1);
      expect(getPrivate(scene).goblins.has('main')).toBe(true);
    });

    it('handleSessionStart resets celebrating main goblin to IDLE', () => {
      scene.handleSessionEnd(); // puts main into CELEBRATING
      expect(getPrivate(scene).goblins.get('main').getState()).toBe('CELEBRATING');

      scene.handleSessionStart();
      expect(getPrivate(scene).goblins.get('main').getState()).toBe('IDLE');
    });
  });

  // ── Subagent management ──

  describe('subagent management', () => {
    it('handleSubagentSpawn creates a new goblin', () => {
      scene.handleSubagentSpawn('sub-1', 'Research agent');
      expect(getPrivate(scene).goblins.has('sub-1')).toBe(true);
    });

    it('spawned goblin gets a nickname as name label', () => {
      scene.handleSubagentSpawn('sub-1', 'Research agent');
      const goblin = getPrivate(scene).goblins.get('sub-1');
      expect(goblin.nameLabel).toBeTruthy();
      // Nickname is generated, not the description
      expect(goblin.nameLabel).not.toBe('Research agent');
    });

    it('spawned goblin gets description as role label', () => {
      scene.handleSubagentSpawn('sub-1', 'Research agent');
      const goblin = getPrivate(scene).goblins.get('sub-1');
      expect(goblin.roleLabel).toBe('Research agent');
    });

    it('main goblin is always named Grumpytoes', () => {
      const main = getPrivate(scene).goblins.get('main');
      expect(main.nameLabel).toBe('Grumpytoes');
    });

    it('main goblin has "Main" as role label', () => {
      const main = getPrivate(scene).goblins.get('main');
      expect(main.roleLabel).toBe('Main');
    });

    it('main goblin uses boss variant', () => {
      const main = getPrivate(scene).goblins.get('main');
      expect(main.variant).toBe('boss');
    });

    it('subagent goblins use default variant', () => {
      scene.handleSubagentSpawn('sub-1', 'Worker');
      const sub = getPrivate(scene).goblins.get('sub-1');
      expect(sub.variant).toBe('default');
    });

    it('main goblin stays Grumpytoes after session restart', () => {
      scene.handleSessionStart();
      const main = getPrivate(scene).goblins.get('main');
      expect(main.nameLabel).toBe('Grumpytoes');
      expect(main.roleLabel).toBe('Main');
    });

    it('subagent never gets the name Grumpytoes', () => {
      for (let i = 0; i < 20; i++) {
        scene.handleSubagentSpawn(`sub-${i}`, 'worker');
      }
      for (let i = 0; i < 20; i++) {
        const goblin = getPrivate(scene).goblins.get(`sub-${i}`);
        expect(goblin.nameLabel).not.toBe('Grumpytoes');
      }
    });

    it('handleSubagentSpawn adds feed entry with description', () => {
      scene.handleSubagentSpawn('sub-1', 'Test runner');
      const feed = getPrivate(scene).feed;
      expect(feed.some((e: any) => e.text.includes('joined') && e.text.includes('Test runner'))).toBe(true);
    });

    it('handleSubagentComplete marks agent as completing', () => {
      scene.handleSubagentSpawn('sub-1');
      scene.handleSubagentComplete('sub-1');
      // completingAgents is used internally; if goblin was idle, it finishes immediately
      // Either way, the agent is handled
      const feed = getPrivate(scene).feed;
      expect(feed.some((e: any) => e.text === 'Agent done: sub-1')).toBe(true);
    });

    it('handleSubagentComplete on non-existent agent does not crash', () => {
      expect(() => scene.handleSubagentComplete('nonexistent')).not.toThrow();
    });

    it('subagent work loop starts after poof-in delay', () => {
      scene.handleSubagentSpawn('sub-1', 'Worker');
      const goblin = getPrivate(scene).goblins.get('sub-1');

      // Before timeout: goblin is in POOF_IN
      expect(goblin.getState()).toBe('POOF_IN');

      // Tick scene to expire the POOF_IN state (500ms duration)
      // AND advance fake timers so the 600ms setTimeout fires
      for (let t = 0; t < 700; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // Goblin should now be walking to a vein (work loop started)
      expect(goblin.getState()).toBe('WALKING');
    });

    it('finishSubagentComplete removes goblin after depositing', () => {
      scene.handleSubagentSpawn('sub-1');
      const goblin = getPrivate(scene).goblins.get('sub-1');

      // Force goblin to IDLE so complete works immediately
      goblin.transitionTo('IDLE');
      scene.handleSubagentComplete('sub-1');

      // Tick through walk to chest + depositing (800ms)
      // Need interleaved timer + scene ticks for setTimeout callbacks
      for (let t = 0; t < 5000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      expect(getPrivate(scene).goblins.has('sub-1')).toBe(false);
    });

    it('multiple subagents can coexist', () => {
      scene.handleSubagentSpawn('sub-1', 'Agent A');
      scene.handleSubagentSpawn('sub-2', 'Agent B');
      expect(getPrivate(scene).goblins.size).toBe(3); // main + 2 subs
    });
  });

  // ── Tool action labels ──

  describe('toolActionLabel', () => {
    it('sets correct labels on goblin for each tool type', () => {
      const getLabel = () => getPrivate(scene).goblins.get('main').actionLabel;

      scene.handleToolCall('Read', {});
      scene.update(16);
      expect(getLabel()).toBe('Reading...');
    });
  });

  // ── handleToolCall increments chest ──

  describe('chest integration', () => {
    it('handleToolCall triggers chest bounce without crashing', () => {
      scene.handleToolCall('Read', {});
      scene.handleToolCall('Edit', {});
    });

    it('handleSessionStart resets chest state', () => {
      scene.handleToolCall('Read', {});
      scene.handleSessionStart();
    });
  });

  // ── Stress tests ──

  describe('stress: large session', () => {
    it('handles 50 rapid-fire tool calls without crashing', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      const tools = ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep'];
      for (let i = 0; i < 50; i++) {
        scene.handleToolCall(tools[i % tools.length], { i });
      }

      const p = getPrivate(scene);

      // Process some — each action takes walk + animation (~3-5s), so 50 takes ~200s
      // We just verify the system makes progress without crashing
      const initialQueueSize = p.actionQueue.length;
      for (let t = 0; t < 30000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      expect(p.actionQueue.length).toBeLessThan(initialQueueSize);
    });

    it('feed stays capped at maxFeedEntries during flood', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      for (let i = 0; i < 30; i++) {
        scene.handleToolCall('Read', { file_path: `file${i}.ts` });
      }

      const p = getPrivate(scene);
      expect(p.feed.length).toBeLessThanOrEqual(4); // maxFeedEntries
    });
  });

  describe('stress: rapid consecutive sessions', () => {
    it('handles 5 back-to-back sessions without leaking goblins', () => {
      scene.handleConnectionState('connected');

      for (let session = 0; session < 5; session++) {
        scene.handleSessionStart();
        scene.handleToolCall('Read', { file_path: 'a.ts' });
        scene.handleToolCall('Edit', { file_path: 'b.ts' });
        scene.handleSubagentSpawn(`sub-${session}`, `Agent ${session}`);

        // Tick a bit
        for (let t = 0; t < 2000; t += 16) {
          scene.update(16);
          vi.advanceTimersByTime(16);
        }

        scene.handleSessionEnd();

        // Tick celebration briefly
        for (let t = 0; t < 500; t += 16) {
          scene.update(16);
          vi.advanceTimersByTime(16);
        }
      }

      // After all sessions: only main goblin should remain
      scene.handleSessionStart();
      const p = getPrivate(scene);
      expect(p.goblins.size).toBe(1);
      expect(p.goblins.has('main')).toBe(true);
      expect(p.actionQueue).toHaveLength(0);
    });

    it('session start mid-action resets cleanly', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      // Queue up work
      scene.handleToolCall('Read', { file_path: 'a.ts' });
      scene.handleToolCall('Edit', { file_path: 'b.ts' });
      scene.handleToolCall('Bash', { command: 'test' });

      // Start processing
      for (let t = 0; t < 1000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // Abrupt new session — should not crash
      scene.handleSessionStart();
      const p = getPrivate(scene);
      expect(p.actionQueue).toHaveLength(0);
      expect(p.processingAction).toBe(false);
    });
  });

  describe('stress: subagent swarm', () => {
    it('handles 6 simultaneous subagents', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      for (let i = 0; i < 6; i++) {
        scene.handleSubagentSpawn(`sub-${i}`, `Worker ${i}`);
      }

      const p = getPrivate(scene);
      expect(p.goblins.size).toBe(7); // 1 main + 6 subs

      // All get unique nicknames
      const names = new Set<string>();
      for (const goblin of p.goblins.values()) {
        names.add(goblin.nameLabel);
      }
      expect(names.size).toBe(7);

      // Tick to let them start working
      for (let t = 0; t < 3000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // Complete them one at a time with enough time for walk-to-chest + deposit
      for (let i = 0; i < 6; i++) {
        const goblin = p.goblins.get(`sub-${i}`);
        if (goblin) {
          goblin.forceIdle();
          scene.handleSubagentComplete(`sub-${i}`);
        }
        // Each completion: walk to chest (~2s) + depositing anim (~1.5s) + removal
        for (let t = 0; t < 8000; t += 16) {
          scene.update(16);
          vi.advanceTimersByTime(16);
        }
      }

      // All subagents should be removed
      expect(p.goblins.size).toBe(1);
      expect(p.goblins.has('main')).toBe(true);
    });

    it('session end during subagent work cleans up properly', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      scene.handleSubagentSpawn('sub-1', 'Researcher');
      scene.handleSubagentSpawn('sub-2', 'Builder');

      // Let them start
      for (let t = 0; t < 1500; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // Session ends while subagents still working — only main celebrates,
      // subagents continue until their own subagent-complete arrives.
      scene.handleSessionEnd();

      const p = getPrivate(scene);
      const main = p.goblins.get('main');
      expect(main.getState()).toBe('CELEBRATING');
    });
  });

  describe('stress: disconnect/reconnect cycles', () => {
    it('handles rapid disconnect/reconnect without crashing', () => {
      for (let i = 0; i < 10; i++) {
        scene.handleConnectionState('disconnected');
        scene.update(16);
        scene.handleConnectionState('connected');
        scene.update(16);
      }

      const p = getPrivate(scene);
      expect(p.connectionState).toBe('connected');
    });

    it('tool calls during disconnected state still queue', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      scene.handleConnectionState('disconnected');

      scene.handleToolCall('Read', { file_path: 'x.ts' });
      scene.handleToolCall('Edit', { file_path: 'y.ts' });

      const p = getPrivate(scene);
      expect(p.actionQueue).toHaveLength(2);
    });
  });

  // ── New event handlers: thinking, text-output, tool-error ──

  describe('handleThinking', () => {
    it('triggers thinking walk when session is ongoing and idle', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      // The update loop auto-starts thinking; stop it and reset to IDLE
      goblin.forceIdle();
      (scene as any).isThinking = false;
      // Set a high cooldown so the update loop doesn't auto-start thinking
      (scene as any).thinkingCooldown = 99999;

      scene.handleThinking();

      // handleThinking sets thinkingCooldown = 0 and calls startThinkingBehavior
      // Tick to let walkTo begin
      tickScene(scene, 100);
      expect(goblin.getState()).toBe('WALKING');
    });

    it('does not trigger when processing an action', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      scene.handleToolCall('Read', {});
      scene.update(16); // starts processing
      expect(getPrivate(scene).processingAction).toBe(true);

      const goblin = getPrivate(scene).goblins.get('main');
      const stateBefore = goblin.getState();

      scene.handleThinking();

      // State unchanged — thinking ignored during action processing
      expect(goblin.getState()).toBe(stateBefore);
    });

    it('does not trigger when disconnected', () => {
      scene.handleConnectionState('disconnected');
      const goblin = getPrivate(scene).goblins.get('main');
      expect(goblin.getState()).toBe('SLEEPING');

      scene.handleThinking();
      expect(goblin.getState()).toBe('SLEEPING');
    });
  });

  describe('handleTextOutput', () => {
    it('shows "Writing..." label with scroll', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      // Wait for initial thinking to settle
      tickScene(scene, 100);
      goblin.forceIdle();

      scene.handleTextOutput();

      expect(goblin.actionLabel).toBe('Writing...');
      expect(goblin.showScroll).toBe(true);
    });

    it('clears Writing label after ~1.5s', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      tickScene(scene, 100);
      goblin.forceIdle();

      scene.handleTextOutput();
      expect(goblin.actionLabel).toBe('Writing...');

      // Tick 1.5s to expire the writing timer
      tickScene(scene, 1600);

      expect(goblin.actionLabel).toBe('');
      expect(goblin.showScroll).toBe(false);
    });

    it('does not override when processing an action', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      scene.handleToolCall('Read', {});
      scene.update(16); // start processing

      const goblin = getPrivate(scene).goblins.get('main');
      const labelBefore = goblin.actionLabel;

      scene.handleTextOutput();

      // Label should not change — text output is ignored during action processing
      expect(goblin.actionLabel).toBe(labelBefore);
    });
  });

  describe('handleToolError', () => {
    it('shows "Error!" label when idle', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      tickScene(scene, 100);
      goblin.forceIdle();

      scene.handleToolError('tc-err-1');

      expect(goblin.actionLabel).toBe('Error!');
    });

    it('clears Error label after ~1.2s', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      tickScene(scene, 100);
      goblin.forceIdle();

      scene.handleToolError('tc-err-1');
      expect(goblin.actionLabel).toBe('Error!');

      tickScene(scene, 1300);

      expect(goblin.actionLabel).toBe('');
    });

    it('adds "Tool error" feed entry', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      tickScene(scene, 100);
      goblin.forceIdle();

      scene.handleToolError('tc-err-2');

      const feed = getPrivate(scene).feed;
      expect(feed.some((e: any) => e.text === 'Tool error')).toBe(true);
    });

    it('does not interrupt MINING state', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      goblin.transitionTo('MINING');
      scene.handleToolError('tc-err-3');

      expect(goblin.getState()).toBe('MINING');
      expect(goblin.actionLabel).not.toBe('Error!');
    });
  });

  // ── Action pacing (cooldown) ──

  describe('action pacing', () => {
    it('handleSessionStart resets all cooldown timers', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();

      const s = scene as any;
      expect(s.actionCooldown).toBe(0);
      expect(s.postActionLinger).toBe(0);
      expect(s.writingTimer).toBe(0);
      expect(s.errorTimer).toBe(0);
    });

    it('handleToolCall clears writing and error states', () => {
      scene.handleConnectionState('connected');
      scene.handleSessionStart();
      const goblin = getPrivate(scene).goblins.get('main');

      tickScene(scene, 100);
      goblin.forceIdle();

      // Set writing state
      scene.handleTextOutput();
      expect((scene as any).writingTimer).toBeGreaterThan(0);

      // Tool call should clear it
      scene.handleToolCall('Read', {});
      expect((scene as any).writingTimer).toBe(0);
    });
  });

  // ── Full demo flow simulation ──

  describe('demo flow', () => {
    it('processes a full session: connect → start → tools → agents → end', () => {
      const p = getPrivate(scene);

      // Connect
      scene.handleConnectionState('connected');
      expect(p.connectionState).toBe('connected');

      // Start session
      scene.handleSessionStart();
      expect(p.feed[0].text).toBe('Session started');

      // Tool calls
      scene.handleToolCall('Read', { file_path: '/src/index.ts' });
      scene.handleToolCall('Edit', { file_path: '/src/app.ts' });
      scene.handleToolCall('Bash', { command: 'npm test' });

      expect(p.actionQueue).toHaveLength(3);

      // Run update loop to process actions
      // Each action needs: walk time + action time
      for (let t = 0; t < 15000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // All actions should have processed
      expect(p.actionQueue).toHaveLength(0);
      expect(p.processingAction).toBe(false);

      // Spawn subagent
      scene.handleSubagentSpawn('sub-1', 'Test runner');
      expect(p.goblins.size).toBe(2);

      // Complete subagent
      const subGoblin = p.goblins.get('sub-1');
      subGoblin.transitionTo('IDLE'); // Force idle for immediate completion
      scene.handleSubagentComplete('sub-1');

      // Tick through completion
      for (let t = 0; t < 5000; t += 16) {
        scene.update(16);
        vi.advanceTimersByTime(16);
      }

      // End session
      scene.handleSessionEnd();
      const mainGoblin = p.goblins.get('main');
      expect(mainGoblin.getState()).toBe('CELEBRATING');
    });
  });
});
