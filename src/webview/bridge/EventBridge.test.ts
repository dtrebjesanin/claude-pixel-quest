// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBridge } from './EventBridge';
import { Scene } from '../scene/Scene';

function createMockScene(): Scene {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    render: vi.fn(),
    handleToolCall: vi.fn(),
    handleSubagentSpawn: vi.fn(),
    handleSubagentComplete: vi.fn(),
    handleSessionEnd: vi.fn(),
    handleSessionIdle: vi.fn(),
    handleSessionStart: vi.fn(),
    handleSessionResume: vi.fn(),
    handleConnectionState: vi.fn(),
    handleThinking: vi.fn(),
    handleTextOutput: vi.fn(),
    handleToolError: vi.fn(),
    handleDataResponse: vi.fn(),
    getPickerState: vi.fn().mockReturnValue({ projectList: [], sessionList: [], currentProjectName: null, currentSessionLabel: null, isFollowingLatest: true }),
    setPickerState: vi.fn(),
    resize: vi.fn(),
    attachCanvas: vi.fn(),
    detachCanvas: vi.fn(),
  };
}

function postEvent(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data }));
}

describe('EventBridge', () => {
  let bridge: EventBridge;
  let scene: Scene;

  beforeEach(() => {
    bridge = new EventBridge();
    scene = createMockScene();
    bridge.setScene(scene);
  });

  // ── Tool calls ──

  it('dispatches tool-call to scene.handleToolCall', () => {
    postEvent({
      type: 'tool-call',
      toolName: 'Read',
      toolInput: { file_path: '/src/app.ts' },
      isTask: false,
    });
    expect(scene.handleToolCall).toHaveBeenCalledWith('Read', { file_path: '/src/app.ts' });
  });

  it('passes correct tool name and input for Edit', () => {
    postEvent({
      type: 'tool-call',
      toolName: 'Edit',
      toolInput: { file_path: '/src/foo.ts', old_string: 'a', new_string: 'b' },
      isTask: false,
    });
    expect(scene.handleToolCall).toHaveBeenCalledWith('Edit', {
      file_path: '/src/foo.ts',
      old_string: 'a',
      new_string: 'b',
    });
  });

  // ── Subagent events ──

  it('dispatches subagent-spawn with agentId and description', () => {
    postEvent({ type: 'subagent-spawn', agentId: 'sub-1', description: 'Research agent' });
    expect(scene.handleSubagentSpawn).toHaveBeenCalledWith('sub-1', 'Research agent');
  });

  it('dispatches subagent-spawn without description', () => {
    postEvent({ type: 'subagent-spawn', agentId: 'sub-2' });
    expect(scene.handleSubagentSpawn).toHaveBeenCalledWith('sub-2', undefined);
  });

  it('dispatches subagent-complete with agentId', () => {
    postEvent({ type: 'subagent-complete', agentId: 'sub-1' });
    expect(scene.handleSubagentComplete).toHaveBeenCalledWith('sub-1');
  });

  // ── Session state ──

  it('dispatches session-state isOngoing=true to handleSessionStart', () => {
    postEvent({ type: 'session-state', isOngoing: true });
    expect(scene.handleSessionStart).toHaveBeenCalled();
    expect(scene.handleSessionEnd).not.toHaveBeenCalled();
  });

  it('dispatches session-state isOngoing=false with reason end_turn to handleSessionEnd', () => {
    postEvent({ type: 'session-state', isOngoing: false, reason: 'end_turn' });
    expect(scene.handleSessionEnd).toHaveBeenCalled();
    expect(scene.handleSessionIdle).not.toHaveBeenCalled();
    expect(scene.handleSessionStart).not.toHaveBeenCalled();
  });

  it('dispatches session-state isOngoing=false with reason idle to handleSessionIdle', () => {
    postEvent({ type: 'session-state', isOngoing: false, reason: 'idle' });
    expect(scene.handleSessionIdle).toHaveBeenCalled();
    expect(scene.handleSessionEnd).not.toHaveBeenCalled();
    expect(scene.handleSessionStart).not.toHaveBeenCalled();
  });

  it('dispatches session-state isOngoing=true with resumed=true to handleSessionResume', () => {
    postEvent({ type: 'session-state', isOngoing: true, resumed: true });
    expect(scene.handleSessionResume).toHaveBeenCalled();
    expect(scene.handleSessionStart).not.toHaveBeenCalled();
  });

  it('dispatches session-state isOngoing=true with resumed=false to handleSessionStart', () => {
    postEvent({ type: 'session-state', isOngoing: true, resumed: false });
    expect(scene.handleSessionStart).toHaveBeenCalled();
    expect(scene.handleSessionResume).not.toHaveBeenCalled();
  });

  it('dispatches session-state isOngoing=false without reason to handleSessionEnd', () => {
    postEvent({ type: 'session-state', isOngoing: false });
    expect(scene.handleSessionEnd).toHaveBeenCalled();
    expect(scene.handleSessionIdle).not.toHaveBeenCalled();
  });

  // ── Connection state ──

  it('dispatches connection event to handleConnectionState', () => {
    postEvent({ type: 'connection', state: 'connected' });
    expect(scene.handleConnectionState).toHaveBeenCalledWith('connected');
  });

  it('dispatches disconnected state', () => {
    postEvent({ type: 'connection', state: 'disconnected' });
    expect(scene.handleConnectionState).toHaveBeenCalledWith('disconnected');
  });

  it('dispatches no-server state', () => {
    postEvent({ type: 'connection', state: 'no-server' });
    expect(scene.handleConnectionState).toHaveBeenCalledWith('no-server');
  });

  // ── Thinking / text-output / tool-error ──

  it('dispatches thinking to scene.handleThinking', () => {
    postEvent({ type: 'thinking', messageId: 'msg-1' });
    expect(scene.handleThinking).toHaveBeenCalled();
  });

  it('dispatches text-output to scene.handleTextOutput', () => {
    postEvent({ type: 'text-output', messageId: 'msg-2' });
    expect(scene.handleTextOutput).toHaveBeenCalled();
  });

  it('dispatches tool-error to scene.handleToolError', () => {
    postEvent({ type: 'tool-error', toolUseId: 'tc-err-1' });
    expect(scene.handleToolError).toHaveBeenCalledWith('tc-err-1');
  });

  // ── Data response forwarding ──

  it('forwards data response to scene.handleDataResponse', () => {
    const msg = { type: 'project-list' as const, projects: [] };
    bridge.handleDataResponse(msg);
    expect(scene.handleDataResponse).toHaveBeenCalledWith(msg);
  });

  it('handleDataResponse does nothing when no scene is set', () => {
    const orphanBridge = new EventBridge();
    expect(() => {
      orphanBridge.handleDataResponse({ type: 'project-list' as const, projects: [] });
    }).not.toThrow();
  });

  // ── Edge cases / safety ──

  it('ignores messages with no type property', () => {
    postEvent({ foo: 'bar' });
    expect(scene.handleToolCall).not.toHaveBeenCalled();
    expect(scene.handleSessionStart).not.toHaveBeenCalled();
  });

  it('ignores null data', () => {
    postEvent(null);
    expect(scene.handleToolCall).not.toHaveBeenCalled();
  });

  it('ignores undefined data', () => {
    postEvent(undefined);
    expect(scene.handleToolCall).not.toHaveBeenCalled();
  });

  it('does not crash when no scene is set', () => {
    const orphanBridge = new EventBridge();
    // No setScene called
    expect(() => {
      postEvent({ type: 'tool-call', toolName: 'Read', toolInput: {}, isTask: false });
    }).not.toThrow();
  });

  it('handles unknown event type gracefully', () => {
    expect(() => {
      postEvent({ type: 'some-future-event', data: 'whatever' });
    }).not.toThrow();
    expect(scene.handleToolCall).not.toHaveBeenCalled();
    expect(scene.handleSessionStart).not.toHaveBeenCalled();
    expect(scene.handleSessionEnd).not.toHaveBeenCalled();
  });

  it('processes multiple events in sequence', () => {
    postEvent({ type: 'connection', state: 'connected' });
    postEvent({ type: 'session-state', isOngoing: true });
    postEvent({ type: 'tool-call', toolName: 'Read', toolInput: {}, isTask: false });
    postEvent({ type: 'tool-call', toolName: 'Edit', toolInput: {}, isTask: false });

    expect(scene.handleConnectionState).toHaveBeenCalledTimes(1);
    expect(scene.handleSessionStart).toHaveBeenCalledTimes(1);
    expect(scene.handleToolCall).toHaveBeenCalledTimes(2);
  });
});
