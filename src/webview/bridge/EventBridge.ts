import { PixelQuestEvent, ConnectionState } from '../../shared/types';
import { Scene } from '../scene/Scene';

export class EventBridge {
  private scene: Scene | null = null;

  constructor() {
    window.addEventListener('message', (event) => {
      const msg = event.data as PixelQuestEvent;
      if (msg && msg.type) {
        this.handleEvent(msg);
      }
    });
  }

  setScene(scene: Scene): void {
    this.scene = scene;
  }

  handleDataResponse(msg: PixelQuestEvent): void {
    if (this.scene) this.scene.handleDataResponse(msg);
  }

  private handleEvent(event: PixelQuestEvent): void {
    if (!this.scene) return;

    switch (event.type) {
      case 'tool-call':
        this.scene.handleToolCall(event.toolName, event.toolInput);
        break;
      case 'subagent-spawn':
        this.scene.handleSubagentSpawn(event.agentId, event.description);
        break;
      case 'subagent-complete':
        this.scene.handleSubagentComplete(event.agentId);
        break;
      case 'session-state':
        if (event.isOngoing && event.resumed) {
          this.scene.handleSessionResume();
        } else if (event.isOngoing) {
          this.scene.handleSessionStart();
        } else if (event.reason === 'idle') {
          this.scene.handleSessionIdle();
        } else {
          this.scene.handleSessionEnd();
        }
        break;
      case 'connection':
        this.scene.handleConnectionState(event.state as ConnectionState);
        break;
      case 'thinking':
        this.scene.handleThinking();
        break;
      case 'text-output':
        this.scene.handleTextOutput();
        break;
      case 'tool-error':
        this.scene.handleToolError(event.toolUseId);
        break;
    }
  }
}
