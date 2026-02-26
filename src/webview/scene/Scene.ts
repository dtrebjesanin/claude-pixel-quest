import { Camera } from '../engine/Camera';
import { ConnectionState, PickerState, PixelQuestEvent } from '../../shared/types';

export interface Scene {
  getPickerState(): PickerState;
  setPickerState(state: PickerState): void;
  load(): Promise<void>;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, camera: Camera): void;
  handleToolCall(toolName: string, toolInput: Record<string, unknown>): void;
  handleSubagentSpawn(agentId: string, description?: string): void;
  handleSubagentComplete(agentId: string): void;
  handleSessionEnd(): void;
  handleSessionIdle(): void;
  handleSessionStart(): void;
  handleSessionResume(): void;
  handleConnectionState(state: ConnectionState): void;
  handleThinking(): void;
  handleTextOutput(): void;
  handleToolError(toolUseId: string): void;
  handleDataResponse(response: PixelQuestEvent): void;
  resize(width: number, height: number): void;
  attachCanvas(canvas: HTMLCanvasElement): void;
  detachCanvas(): void;
}
