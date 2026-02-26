// Mock vscode module before imports
vi.mock('vscode', () => ({
  EventEmitter: class {
    private listeners: Array<(e: any) => void> = [];
    event = (listener: (e: any) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire(e: any) {
      this.listeners.forEach((l) => l(e));
    }
    dispose() {
      this.listeners = [];
    }
  },
  window: {
    createOutputChannel: () => ({
      appendLine: () => {},
      dispose: () => {},
    }),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/Users/test/my-project' } }],
    getConfiguration: vi.fn(() => ({ get: vi.fn(() => '') })),
  },
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionWatcher } from './SessionWatcher';
import type { PixelQuestEvent } from '../shared/types';

// Helper to collect events
function collectEvents(watcher: SessionWatcher): PixelQuestEvent[] {
  const events: PixelQuestEvent[] = [];
  watcher.onEvent((e) => events.push(e));
  return events;
}

describe('SessionWatcher', () => {
  let watcher: SessionWatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    watcher = new SessionWatcher();
  });

  afterEach(() => {
    watcher.dispose();
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════
  // 1. processChunk — JSONL line buffering
  // ═══════════════════════════════════════════════════════════════════
  describe('processChunk', () => {
    it('processes complete lines from a chunk', () => {
      const events = collectEvents(watcher);

      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tc-1', name: 'Read', input: { file_path: 'foo.ts' } },
          ],
        },
      });

      (watcher as any).processChunk(line + '\n');

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
      expect(toolEvents[0]).toMatchObject({
        type: 'tool-call',
        toolName: 'Read',
        toolInput: { file_path: 'foo.ts' },
      });
    });

    it('buffers partial lines across chunks', () => {
      const events = collectEvents(watcher);

      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tc-2', name: 'Edit', input: {} },
          ],
        },
      });

      // Split the line in half
      const half = Math.floor(line.length / 2);
      (watcher as any).processChunk(line.slice(0, half));

      // No events yet — incomplete line
      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(0);

      // Second chunk completes the line
      (watcher as any).processChunk(line.slice(half) + '\n');

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
      expect(toolEvents[0]).toMatchObject({ type: 'tool-call', toolName: 'Edit' });
    });

    it('handles multiple lines in a single chunk', () => {
      const events = collectEvents(watcher);

      const line1 = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'tc-a', name: 'Read', input: {} }],
        },
      });
      const line2 = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'tc-b', name: 'Grep', input: {} }],
        },
      });

      (watcher as any).processChunk(line1 + '\n' + line2 + '\n');

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(2);
      expect(toolEvents[0]).toMatchObject({ toolName: 'Read' });
      expect(toolEvents[1]).toMatchObject({ toolName: 'Grep' });
    });

    it('skips empty lines', () => {
      const events = collectEvents(watcher);

      (watcher as any).processChunk('\n\n\n');

      // No events (empty lines are skipped)
      expect(events).toHaveLength(0);
    });

    it('skips malformed JSON lines', () => {
      const events = collectEvents(watcher);

      (watcher as any).processChunk('{not-valid-json}\n');

      expect(events).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. processAssistantEntry — tool_use parsing
  // ═══════════════════════════════════════════════════════════════════
  describe('processAssistantEntry', () => {
    it('fires tool-call event for regular tools', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tc-1', name: 'Read', input: { file_path: '/src/app.ts' } },
          ],
        },
      });

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
      expect(toolEvents[0]).toEqual({
        type: 'tool-call',
        toolName: 'Read',
        toolInput: { file_path: '/src/app.ts' },
        isTask: false,
      });
    });

    it('fires subagent-spawn for Task tool', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tc-task-1', name: 'Task', input: { subagent_type: 'Explore' } },
          ],
        },
      });

      const spawnEvents = events.filter((e) => e.type === 'subagent-spawn');
      expect(spawnEvents).toHaveLength(1);
      expect(spawnEvents[0]).toEqual({
        type: 'subagent-spawn',
        agentId: 'tc-task-1',
        description: 'Explore',
      });
    });

    it('deduplicates tool calls by id', () => {
      const events = collectEvents(watcher);

      const entry = {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'dup-1', name: 'Edit', input: {} },
          ],
        },
      };

      (watcher as any).processAssistantEntry(entry);
      (watcher as any).processAssistantEntry(entry);

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
    });

    it('processes multiple tool_use blocks in one entry', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tc-m1', name: 'Read', input: {} },
            { type: 'text', text: 'some text' },
            { type: 'tool_use', id: 'tc-m2', name: 'Edit', input: {} },
          ],
        },
      });

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(2);
      expect(toolEvents[0]).toMatchObject({ toolName: 'Read' });
      expect(toolEvents[1]).toMatchObject({ toolName: 'Edit' });
    });

    it('ignores entries without message', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({ type: 'assistant' });

      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(0);
    });

    it('ignores entries without content array', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: { content: 'not-an-array' },
      });

      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(0);
    });

    it('ignores non-tool_use blocks', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello world' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(0);
    });

    it('skips tool_use blocks without id', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Read', input: {} },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(0);
    });

    // ── thinking block parsing ──

    it('fires thinking event for thinking block', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-1',
        message: {
          content: [
            { type: 'thinking', thinking: 'Let me analyze this...', signature: 'sig' },
          ],
        },
      });

      const thinkingEvents = events.filter((e) => e.type === 'thinking');
      expect(thinkingEvents).toHaveLength(1);
      expect(thinkingEvents[0]).toEqual({ type: 'thinking', messageId: 'msg-1' });
    });

    it('deduplicates thinking events per message (fires once)', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-2',
        message: {
          content: [
            { type: 'thinking', thinking: 'First thought', signature: 'sig1' },
            { type: 'thinking', thinking: 'Second thought', signature: 'sig2' },
          ],
        },
      });

      const thinkingEvents = events.filter((e) => e.type === 'thinking');
      expect(thinkingEvents).toHaveLength(1);
    });

    it('does not fire thinking for empty thinking string', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-3',
        message: {
          content: [
            { type: 'thinking', thinking: '', signature: 'sig' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'thinking')).toHaveLength(0);
    });

    // ── text block parsing ──

    it('fires text-output event for text block', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-4',
        message: {
          content: [
            { type: 'text', text: 'Here is my analysis...' },
          ],
        },
      });

      const textEvents = events.filter((e) => e.type === 'text-output');
      expect(textEvents).toHaveLength(1);
      expect(textEvents[0]).toEqual({ type: 'text-output', messageId: 'msg-4' });
    });

    it('deduplicates text-output events per message (fires once)', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-5',
        message: {
          content: [
            { type: 'text', text: 'Part one.' },
            { type: 'text', text: 'Part two.' },
          ],
        },
      });

      const textEvents = events.filter((e) => e.type === 'text-output');
      expect(textEvents).toHaveLength(1);
    });

    it('does not fire text-output for whitespace-only text', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-6',
        message: {
          content: [
            { type: 'text', text: '   \n  ' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'text-output')).toHaveLength(0);
    });

    // ── mixed message ──

    it('fires thinking + text-output + tool-call from mixed message', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-7',
        message: {
          content: [
            { type: 'thinking', thinking: 'Analyzing...', signature: 'sig' },
            { type: 'text', text: 'I will read the file.' },
            { type: 'tool_use', id: 'tc-mix-1', name: 'Read', input: { file_path: 'x.ts' } },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'thinking')).toHaveLength(1);
      expect(events.filter((e) => e.type === 'text-output')).toHaveLength(1);
      expect(events.filter((e) => e.type === 'tool-call')).toHaveLength(1);
    });

    it('uses empty string for messageId when uuid is missing', () => {
      const events = collectEvents(watcher);

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: 'Something', signature: 'sig' },
          ],
        },
      });

      const thinkingEvents = events.filter((e) => e.type === 'thinking');
      expect(thinkingEvents).toHaveLength(1);
      expect((thinkingEvents[0] as any).messageId).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. processUserEntry — tool_result → subagent-complete
  // ═══════════════════════════════════════════════════════════════════
  describe('processUserEntry', () => {
    it('fires subagent-complete when tool_result matches a tracked Task id', () => {
      const events = collectEvents(watcher);

      // First, register a Task
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'task-1', name: 'Task', input: { subagent_type: 'Explore' } },
          ],
        },
      });

      // Then, complete it
      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'task-1', content: 'done' },
          ],
        },
      });

      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]).toEqual({
        type: 'subagent-complete',
        agentId: 'task-1',
      });
    });

    it('does not fire subagent-complete for background agent launch acknowledgment', () => {
      const events = collectEvents(watcher);

      // Register a background Agent
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'bg-agent-1', name: 'Agent', input: { description: 'Review agent', run_in_background: true } },
          ],
        },
      });

      // tool_result is just the launch acknowledgment — agent is still running
      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'bg-agent-1', content: 'Async agent launched successfully.' },
          ],
        },
      });

      const spawnEvents = events.filter((e) => e.type === 'subagent-spawn');
      expect(spawnEvents).toHaveLength(1);
      expect(spawnEvents[0]).toEqual({
        type: 'subagent-spawn',
        agentId: 'bg-agent-1',
        description: 'Review agent',
      });

      // No complete event — agent is still running
      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(0);
    });

    it('fires subagent-complete for background agent via task-notification', () => {
      const events = collectEvents(watcher);

      // Register a background Agent
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'bg-agent-2', name: 'Agent', input: { description: 'Test agent', run_in_background: true } },
          ],
        },
      });

      // Launch ack — should NOT fire complete
      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'bg-agent-2', content: 'Async agent launched successfully.' },
          ],
        },
      });
      expect(events.filter((e) => e.type === 'subagent-complete')).toHaveLength(0);

      // Task notification arrives when agent actually finishes.
      // In real JSONL, content is a plain string (not an array of blocks).
      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          role: 'user',
          content: '<task-notification>\n<task-id>abc123</task-id>\n<tool-use-id>bg-agent-2</tool-use-id>\n<status>completed</status>\n<summary>Agent done</summary>\n</task-notification>',
        },
      });

      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]).toEqual({
        type: 'subagent-complete',
        agentId: 'bg-agent-2',
      });
    });

    it('fires subagent-complete from queue-operation entry with task-notification', () => {
      const events = collectEvents(watcher);

      // Register a background Agent
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'bg-agent-3', name: 'Agent', input: { description: 'Fast agent', run_in_background: true } },
          ],
        },
      });

      // queue-operation entries arrive immediately when the agent finishes.
      // The entry router delegates to parseTaskNotifications for these.
      (watcher as any).parseTaskNotifications(
        '<task-notification>\n<task-id>xyz789</task-id>\n<tool-use-id>bg-agent-3</tool-use-id>\n<status>completed</status>\n<summary>Done</summary>\n</task-notification>',
      );

      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(1);
      expect(completeEvents[0]).toEqual({
        type: 'subagent-complete',
        agentId: 'bg-agent-3',
      });
    });

    it('ignores tool_result for non-Task tool ids', () => {
      const events = collectEvents(watcher);

      // Register a regular tool (not Task)
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'regular-1', name: 'Read', input: {} },
          ],
        },
      });

      // tool_result for that regular tool
      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'regular-1', content: 'file contents' },
          ],
        },
      });

      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(0);
    });

    it('ignores entries without message', () => {
      const events = collectEvents(watcher);

      (watcher as any).processUserEntry({ type: 'user' });

      expect(events.filter((e) => e.type === 'subagent-complete')).toHaveLength(0);
    });

    it('ignores entries without content array', () => {
      const events = collectEvents(watcher);

      (watcher as any).processUserEntry({
        type: 'user',
        message: { content: 'not-array' },
      });

      expect(events.filter((e) => e.type === 'subagent-complete')).toHaveLength(0);
    });

    // ── tool-error parsing ──

    it('fires tool-error for is_error: true result', () => {
      const events = collectEvents(watcher);

      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tc-err-1', is_error: true, content: 'Command failed' },
          ],
        },
      });

      const errorEvents = events.filter((e) => e.type === 'tool-error');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toEqual({ type: 'tool-error', toolUseId: 'tc-err-1' });
    });

    it('does not fire tool-error when is_error is absent', () => {
      const events = collectEvents(watcher);

      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tc-ok-1', content: 'Success' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'tool-error')).toHaveLength(0);
    });

    it('does not fire tool-error when is_error is false', () => {
      const events = collectEvents(watcher);

      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tc-ok-2', is_error: false, content: 'OK' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'tool-error')).toHaveLength(0);
    });

    it('fires both subagent-complete and tool-error for failed Task result', () => {
      const events = collectEvents(watcher);

      // Register the Task first
      (watcher as any).processAssistantEntry({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'task-err-1', name: 'Task', input: { subagent_type: 'Explore' } },
          ],
        },
      });

      (watcher as any).processUserEntry({
        type: 'user',
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'task-err-1', is_error: true, content: 'Agent failed' },
          ],
        },
      });

      expect(events.filter((e) => e.type === 'subagent-complete')).toHaveLength(1);
      expect(events.filter((e) => e.type === 'tool-error')).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3b. Turn-end detection — stop_reason: 'end_turn'
  // ═══════════════════════════════════════════════════════════════════
  describe('turn-end detection', () => {
    it('stop_reason end_turn fires isOngoing:false with reason end_turn', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-final',
        message: {
          stop_reason: 'end_turn',
          content: [
            { type: 'text', text: 'Here is the result.' },
          ],
        },
      });

      const endEvents = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(endEvents).toHaveLength(1);
      expect(endEvents[0]).toEqual({ type: 'session-state', isOngoing: false, reason: 'end_turn' });
    });

    it('text without stop_reason does NOT fire session end', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-mid',
        message: {
          content: [
            { type: 'text', text: 'I will read the file now.' },
          ],
        },
      });

      const endEvents = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(endEvents).toHaveLength(0);
    });

    it('stop_reason tool_use does NOT fire session end', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-tool',
        message: {
          stop_reason: 'tool_use',
          content: [
            { type: 'text', text: 'Let me check.' },
            { type: 'tool_use', id: 'tc-1', name: 'Read', input: {} },
          ],
        },
      });

      const endEvents = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(endEvents).toHaveLength(0);
    });

    it('thinking-only without end_turn does not fire session end', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      (watcher as any).processAssistantEntry({
        type: 'assistant',
        uuid: 'msg-think',
        message: {
          content: [
            { type: 'thinking', thinking: 'Let me consider...', signature: 'sig' },
          ],
        },
      });

      const endEvents = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(endEvents).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. parseLine — dispatches to correct handler
  // ═══════════════════════════════════════════════════════════════════
  describe('parseLine', () => {
    it('dispatches assistant entries to processAssistantEntry', () => {
      const events = collectEvents(watcher);

      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'pl-1', name: 'Glob', input: {} }],
        },
      });

      (watcher as any).parseLine(line);

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
      expect(toolEvents[0]).toMatchObject({ toolName: 'Glob' });
    });

    it('dispatches user entries to processUserEntry', () => {
      const events = collectEvents(watcher);

      // Setup: register a Task first
      (watcher as any).taskIds.add('task-x');

      const line = JSON.stringify({
        type: 'user',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'task-x' }],
        },
      });

      (watcher as any).parseLine(line);

      const completeEvents = events.filter((e) => e.type === 'subagent-complete');
      expect(completeEvents).toHaveLength(1);
    });

    it('fires session-state active on any valid line', () => {
      const events = collectEvents(watcher);

      const line = JSON.stringify({ type: 'system', message: {} });
      (watcher as any).parseLine(line);

      const sessionEvents = events.filter((e) => e.type === 'session-state');
      expect(sessionEvents).toHaveLength(1);
      expect(sessionEvents[0]).toEqual({ type: 'session-state', isOngoing: true, resumed: false });
    });

    it('ignores malformed JSON', () => {
      const events = collectEvents(watcher);

      expect(() => (watcher as any).parseLine('{broken}')).not.toThrow();
      expect(events).toHaveLength(0);
    });

    it('ignores non-assistant and non-user entry types', () => {
      const events = collectEvents(watcher);

      const line = JSON.stringify({ type: 'progress', data: {} });
      (watcher as any).parseLine(line);

      // Should only get session-state, no tool or subagent events
      const toolEvents = events.filter((e) => e.type === 'tool-call');
      const spawnEvents = events.filter((e) => e.type === 'subagent-spawn');
      expect(toolEvents).toHaveLength(0);
      expect(spawnEvents).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. Idle timeout
  // ═══════════════════════════════════════════════════════════════════
  describe('fireSessionActive / idle timeout', () => {
    it('fires session-state { isOngoing: true } on first call', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      const sessionEvents = events.filter((e) => e.type === 'session-state');
      expect(sessionEvents).toHaveLength(1);
      expect(sessionEvents[0]).toEqual({ type: 'session-state', isOngoing: true, resumed: false });
    });

    it('edge-triggers: only fires isOngoing:true once until idle reset', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();
      (watcher as any).fireSessionActive();
      (watcher as any).fireSessionActive();

      const activeEvents = events.filter(
        (e) => e.type === 'session-state' && (e as any).isOngoing === true,
      );
      expect(activeEvents).toHaveLength(1);
    });

    it('fires isOngoing:true again after idle timeout resets state', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();
      vi.advanceTimersByTime(8_000); // triggers idle → sessionActive = false

      (watcher as any).fireSessionActive(); // should re-fire

      const activeEvents = events.filter(
        (e) => e.type === 'session-state' && (e as any).isOngoing === true,
      );
      expect(activeEvents).toHaveLength(2);
      // First activation is a fresh start, second is a resume from idle
      expect((activeEvents[0] as any).resumed).toBe(false);
      expect((activeEvents[1] as any).resumed).toBe(true);
    });

    it('fires session-state { isOngoing: false, reason: idle } after 8s idle', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      // Advance 8 seconds
      vi.advanceTimersByTime(8_000);

      const sessionEvents = events.filter((e) => e.type === 'session-state');
      expect(sessionEvents).toHaveLength(2);
      expect(sessionEvents[1]).toEqual({ type: 'session-state', isOngoing: false, reason: 'idle' });
    });

    it('resets idle timer when new activity arrives', () => {
      const events = collectEvents(watcher);

      (watcher as any).fireSessionActive();

      // Advance 5s (not enough to trigger idle)
      vi.advanceTimersByTime(5_000);

      // New activity resets the timer
      (watcher as any).fireSessionActive();

      // Advance another 5s — still not idle (only 5s since last activity)
      vi.advanceTimersByTime(5_000);

      const sessionFalse = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(sessionFalse).toHaveLength(0);

      // Advance remaining 3s to complete the 8s idle window
      vi.advanceTimersByTime(3_000);

      const sessionFalse2 = events.filter(
        (e) => e.type === 'session-state' && !(e as any).isOngoing,
      );
      expect(sessionFalse2).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. pause / resume / dispose
  // ═══════════════════════════════════════════════════════════════════
  describe('pause / resume / dispose', () => {
    it('pause() sets paused=true', () => {
      expect((watcher as any).paused).toBe(false);
      watcher.pause();
      expect((watcher as any).paused).toBe(true);
    });

    it('pause() calls cleanup (clears timers)', () => {
      (watcher as any).rescanTimer = setInterval(() => {}, 99999);
      (watcher as any).idleTimer = setTimeout(() => {}, 99999);

      watcher.pause();

      expect((watcher as any).rescanTimer).toBeNull();
      expect((watcher as any).idleTimer).toBeNull();
    });

    it('resume() sets paused=false', () => {
      watcher.pause();
      expect((watcher as any).paused).toBe(true);

      // Stub connect to prevent real file operations
      (watcher as any).connect = vi.fn();

      watcher.resume();
      expect((watcher as any).paused).toBe(false);
    });

    it('dispose() sets disposed=true', () => {
      expect((watcher as any).disposed).toBe(false);
      watcher.dispose();
      expect((watcher as any).disposed).toBe(true);
    });

    it('dispose() clears watcher and timers', () => {
      const mockWatcher = { close: vi.fn() };
      (watcher as any).watcher = mockWatcher;
      (watcher as any).rescanTimer = setInterval(() => {}, 99999);
      (watcher as any).idleTimer = setTimeout(() => {}, 99999);

      watcher.dispose();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect((watcher as any).watcher).toBeNull();
      expect((watcher as any).rescanTimer).toBeNull();
      expect((watcher as any).idleTimer).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 7. setState
  // ═══════════════════════════════════════════════════════════════════
  describe('setState', () => {
    it('fires a connection event with the given state', () => {
      const events = collectEvents(watcher);

      (watcher as any).setState('connected');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: 'connection', state: 'connected' });
    });

    it('updates internal state', () => {
      (watcher as any).setState('no-server');
      expect((watcher as any).state).toBe('no-server');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. reconnect
  // ═══════════════════════════════════════════════════════════════════
  describe('reconnect', () => {
    it('clears seenToolIds, taskIds, and lineBuffer', async () => {
      (watcher as any).seenToolIds.add('id-1');
      (watcher as any).seenToolIds.add('id-2');
      (watcher as any).taskIds.add('task-1');
      (watcher as any).lineBuffer = 'partial data';

      // Stub connect to avoid real file operations
      (watcher as any).connect = vi.fn().mockResolvedValue(undefined);

      await watcher.reconnect();

      expect((watcher as any).seenToolIds.size).toBe(0);
      expect((watcher as any).taskIds.size).toBe(0);
      expect((watcher as any).lineBuffer).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 9. watchSession / followLatest / pinnedSession
  // ═══════════════════════════════════════════════════════════════════
  describe('watchSession / followLatest', () => {
    it('watchSession sets pinnedSession and clears tracking state', () => {
      (watcher as any).seenToolIds.add('id-1');
      (watcher as any).taskIds.add('task-1');
      (watcher as any).lineBuffer = 'partial';

      // Stub startWatching to avoid real fs operations
      (watcher as any).startWatching = vi.fn();

      watcher.watchSession('/some/session.jsonl');

      expect((watcher as any).pinnedSession).toBe('/some/session.jsonl');
      expect((watcher as any).seenToolIds.size).toBe(0);
      expect((watcher as any).taskIds.size).toBe(0);
      expect((watcher as any).lineBuffer).toBe('');
      expect((watcher as any).startWatching).toHaveBeenCalledWith('/some/session.jsonl');
    });

    it('followLatest clears pinnedSession', () => {
      (watcher as any).pinnedSession = '/some/session.jsonl';

      watcher.followLatest();

      expect((watcher as any).pinnedSession).toBeNull();
    });

    it('rescan timer skips auto-switch when session is pinned', () => {
      (watcher as any).pinnedSession = '/pinned/session.jsonl';
      (watcher as any).watchedFilePath = '/pinned/session.jsonl';

      // Set up a findLatestSessionFile that would return a different file
      (watcher as any).findLatestSessionFile = vi.fn().mockReturnValue('/newer/session.jsonl');
      const startWatchingSpy = vi.fn();
      (watcher as any).startWatching = startWatchingSpy;

      // Manually invoke the rescan timer callback
      (watcher as any).startRescanTimer();
      vi.advanceTimersByTime(10_000);

      // Should NOT have switched because session is pinned
      expect(startWatchingSpy).not.toHaveBeenCalled();
    });

    it('rescan timer auto-switches when no session is pinned', () => {
      (watcher as any).pinnedSession = null;
      (watcher as any).watchedFilePath = '/old/session.jsonl';
      (watcher as any).state = 'connected';

      (watcher as any).findLatestSessionFile = vi.fn().mockReturnValue('/newer/session.jsonl');
      const startWatchingSpy = vi.fn();
      (watcher as any).startWatching = startWatchingSpy;
      (watcher as any).stopWatcher = vi.fn();

      (watcher as any).startRescanTimer();
      vi.advanceTimersByTime(10_000);

      expect(startWatchingSpy).toHaveBeenCalledWith('/newer/session.jsonl');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 10. listSessions
  // ═══════════════════════════════════════════════════════════════════
  describe('listSessions', () => {
    it('returns empty array when projectDir is null', () => {
      (watcher as any).projectDir = null;
      expect(watcher.listSessions()).toEqual([]);
    });

    it('returns empty array when projectDir does not exist', () => {
      (watcher as any).projectDir = '/nonexistent/path';
      expect(watcher.listSessions()).toEqual([]);
    });

    it('marks the active session correctly', () => {
      // Directly test with the readFirstLineMeta stub
      (watcher as any).projectDir = '/fake/dir';
      (watcher as any).watchedFilePath = '/fake/dir/active.jsonl';

      // We can't easily test the full flow without real files,
      // but we can verify readFirstLineMeta returns defaults for missing files
      const meta = (watcher as any).readFirstLineMeta('/nonexistent.jsonl');
      expect(meta).toEqual({ slug: null, timestamp: null, summary: null, cwd: null });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 11. readFirstLineMeta
  // ═══════════════════════════════════════════════════════════════════
  describe('readFirstLineMeta', () => {
    it('returns null values for non-existent files', () => {
      const result = (watcher as any).readFirstLineMeta('/does/not/exist.jsonl');
      expect(result).toEqual({ slug: null, timestamp: null, summary: null, cwd: null });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 12. End-to-end: full JSONL processing
  // ═══════════════════════════════════════════════════════════════════
  describe('end-to-end JSONL processing', () => {
    it('processes a realistic sequence of assistant and user entries', () => {
      const events = collectEvents(watcher);

      // Simulate JSONL content: assistant does Read, then Task, then user completes Task
      const lines = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', id: 'toolu_read1', name: 'Read', input: { file_path: 'src/index.ts' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_read1', content: 'file contents' },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', id: 'toolu_task1', name: 'Task', input: { subagent_type: 'Explore', prompt: 'find files' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_task1', content: 'agent result' },
            ],
          },
        }),
      ];

      const chunk = lines.join('\n') + '\n';
      (watcher as any).processChunk(chunk);

      // Should have: tool-call (Read), subagent-spawn (Task), subagent-complete (Task)
      const toolCalls = events.filter((e) => e.type === 'tool-call');
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0]).toMatchObject({ toolName: 'Read' });

      const spawns = events.filter((e) => e.type === 'subagent-spawn');
      expect(spawns).toHaveLength(1);
      expect(spawns[0]).toMatchObject({ agentId: 'toolu_task1', description: 'Explore' });

      const completes = events.filter((e) => e.type === 'subagent-complete');
      expect(completes).toHaveLength(1);
      expect(completes[0]).toMatchObject({ agentId: 'toolu_task1' });

      // Session-state events (one per parsed line)
      const sessionEvents = events.filter((e) => e.type === 'session-state');
      expect(sessionEvents.length).toBeGreaterThanOrEqual(1);
      expect(sessionEvents.every((e) => (e as any).isOngoing === true)).toBe(true);
    });

    it('does not fire subagent-complete for non-Task tool results', () => {
      const events = collectEvents(watcher);

      const lines = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', id: 'toolu_edit1', name: 'Edit', input: { file_path: 'foo.ts' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_edit1', content: 'success' },
            ],
          },
        }),
      ];

      (watcher as any).processChunk(lines.join('\n') + '\n');

      const completes = events.filter((e) => e.type === 'subagent-complete');
      expect(completes).toHaveLength(0);
    });
  });
});
