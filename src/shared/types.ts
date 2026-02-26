// Events sent from extension host → webview via postMessage
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'no-server';

export interface ProjectInfo {
  dirPath: string;
  /** Decoded folder path, e.g. `/Users/foo/my-project` */
  decodedPath: string;
  /** Short display name (last path segment) */
  name: string;
  sessionCount: number;
  latestSessionAt: number;
}

export interface SessionInfo {
  filePath: string;
  slug: string | null;
  /** First user prompt text (truncated) */
  summary: string | null;
  timestamp: string;
  modifiedAt: number;
  isActive: boolean;
}

export type PixelQuestEvent =
  | { type: 'tool-call'; toolName: string; toolInput: Record<string, unknown>; isTask: boolean; taskSubagentType?: string }
  | { type: 'subagent-spawn'; agentId: string; description?: string }
  | { type: 'subagent-complete'; agentId: string }
  | { type: 'session-state'; isOngoing: boolean; reason?: 'end_turn' | 'idle'; resumed?: boolean }
  | { type: 'connection'; state: ConnectionState }
  | { type: 'thinking'; messageId: string }
  | { type: 'text-output'; messageId: string }
  | { type: 'tool-error'; toolUseId: string }
  | { type: 'project-list'; projects: ProjectInfo[] }
  | { type: 'session-list'; sessions: SessionInfo[]; isFollowingLatest: boolean };

/** Picker state transferred across theme switches. */
export interface PickerState {
  projectList: ProjectInfo[];
  sessionList: SessionInfo[];
  currentProjectName: string | null;
  currentSessionLabel: string | null;
  isFollowingLatest: boolean;
}

// Messages sent from webview → extension host
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'theme-change'; themeId: string }
  | { type: 'request-projects' }
  | { type: 'request-sessions' }
  | { type: 'select-project-dir'; dirPath: string }
  | { type: 'watch-session'; filePath: string }
  | { type: 'follow-latest' };
