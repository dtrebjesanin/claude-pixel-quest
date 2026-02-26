export type GoblinAction = 'explore' | 'mine' | 'cart' | 'idle';

const TOOL_ACTION_MAP: Record<string, GoblinAction> = {
  Read: 'explore',
  Glob: 'explore',
  Grep: 'explore',
  Edit: 'mine',
  Write: 'mine',
  Bash: 'cart',
  Task: 'idle',
};

export function mapToolToAction(toolName: string): GoblinAction {
  return TOOL_ACTION_MAP[toolName] ?? 'idle';
}

export function toolDisplayName(toolName: string, toolInput: Record<string, unknown>): string {
  const file = typeof toolInput.file_path === 'string' ? toolInput.file_path : '';
  const short = file ? file.split('/').pop() : '';
  const pattern = typeof toolInput.pattern === 'string' ? toolInput.pattern : '';
  const command = typeof toolInput.command === 'string' ? toolInput.command : '';
  switch (toolName) {
    case 'Read': return `Read ${short || 'file'}`;
    case 'Glob': return `Search ${pattern || 'files'}`;
    case 'Grep': return `Grep ${pattern || '...'}`;
    case 'Edit': return `Edit ${short || 'file'}`;
    case 'Write': return `Write ${short || 'file'}`;
    case 'Bash': return `$ ${(command || '...').slice(0, 30)}`;
    default: return toolName;
  }
}
