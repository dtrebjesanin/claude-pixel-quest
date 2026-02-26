# Fix Choppy Goblin Behavior & Repeated "Session started"

## Context
The extension tracks Claude Code sessions but the goblin's behavior is choppy — it does something for ~1.5s then goes idle for 5-30s while Claude thinks. Additionally, "Session started" appears in the feed with every single JSONL entry instead of once per session.

**Two root causes:**
1. `fireSessionActive()` fires `session-state: { isOngoing: true }` on **every parsed JSONL line**, and `handleSessionStart()` does a full state reset each time (clearing queue, feed, force-idling character)
2. No ambient behavior exists between tool events — the goblin goes IDLE the moment an action's 1.2-1.5s animation finishes

---

## Fix 1: Edge-trigger session-state events

**File:** `src/extension/SessionWatcher.ts`

Add `private sessionActive = false` field. Modify `fireSessionActive()` to only emit `isOngoing: true` on the idle→active transition. Subsequent JSONL lines just reset the 30s idle timer.

```typescript
private sessionActive = false;

private fireSessionActive(): void {
  if (!this.sessionActive) {
    this.sessionActive = true;
    this.eventEmitter.fire({ type: 'session-state', isOngoing: true });
  }

  if (this.idleTimer) clearTimeout(this.idleTimer);
  this.idleTimer = setTimeout(() => {
    this.idleTimer = null;
    this.sessionActive = false;
    this.eventEmitter.fire({ type: 'session-state', isOngoing: false });
  }, 30_000);
}
```

Also reset `this.sessionActive = false` in `reconnect()`, `connectToProject()`, and `watchSession()` alongside existing state clears.

## Fix 2: Ambient "thinking" behavior between tool events

**File:** `src/webview/scene/BaseScene.ts`

When the session is ongoing but no actions are queued and the main character is idle, start a "thinking" loop — the goblin walks between targets with a scroll, labeled "Thinking...". Real tool events interrupt this naturally since WALKING is interruptible.

**New fields:**
```typescript
private sessionOngoing = false;
private isThinking = false;
private thinkingCooldown = 0;
```

**Changes to existing methods:**
- `handleSessionStart()` — set `sessionOngoing = true`, `isThinking = false`, `thinkingCooldown = 0`
- `handleSessionEnd()` — set `sessionOngoing = false`, `isThinking = false`
- `handleToolCall()` — set `isThinking = false`, `thinkingCooldown = 0` (real action interrupts thinking)
- `update(dt)` — add thinking cooldown decrement + trigger logic after the existing action queue block

**New method:**
```typescript
private startThinkingBehavior(): void {
  const main = this.characters.get('main');
  if (!main) return;

  this.isThinking = true;
  main.showScroll = true;
  main.showCart = false;
  main.actionLabel = 'Thinking...';

  const target = this.getNextTarget();
  main.walkTo(target.x - 16 + (Math.random() - 0.5) * 20, target.y + 18, () => {
    if (!this.isThinking) {
      main.showScroll = false;
      main.actionLabel = '';
      return;
    }
    // Pause 0.8-2s at target before next walk
    this.thinkingCooldown = 800 + Math.random() * 1200;
    this.isThinking = false;
    main.showScroll = false;
    main.actionLabel = '';
  });
}
```

**Trigger in `update()`** (after the action queue check):
```typescript
if (this.thinkingCooldown > 0) this.thinkingCooldown -= dt;

if (
  this.sessionOngoing &&
  !this.processingAction &&
  this.actionQueue.length === 0 &&
  !this.isThinking &&
  this.thinkingCooldown <= 0 &&
  this.connectionState === 'connected'
) {
  const main = this.characters.get('main');
  if (main && main.getState() === 'IDLE') {
    this.startThinkingBehavior();
  }
}
```

---

## Files to modify
- `src/extension/SessionWatcher.ts` — add `sessionActive` field, edge-trigger `fireSessionActive()`
- `src/webview/scene/BaseScene.ts` — add thinking behavior fields/methods, update handlers

No changes needed to EventBridge, Scene interface, or GoblinStateMachine.

## Verification
1. `npx vitest run` — all tests pass
2. `npx webpack --mode production` — build succeeds
3. Manual: run extension, start a Claude session → "Session started" appears once (not repeated)
4. Manual: between tool calls, goblin walks around with "Thinking..." label instead of standing idle
5. Manual: when a tool call arrives mid-thinking, goblin seamlessly transitions to the real action
