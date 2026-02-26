import { describe, it, expect } from 'vitest';
import { mapToolToAction, toolDisplayName } from './ActionMapper';

describe('mapToolToAction', () => {
  it('maps Read/Glob/Grep to explore', () => {
    expect(mapToolToAction('Read')).toBe('explore');
    expect(mapToolToAction('Glob')).toBe('explore');
    expect(mapToolToAction('Grep')).toBe('explore');
  });

  it('maps Edit/Write to mine', () => {
    expect(mapToolToAction('Edit')).toBe('mine');
    expect(mapToolToAction('Write')).toBe('mine');
  });

  it('maps Bash to cart', () => {
    expect(mapToolToAction('Bash')).toBe('cart');
  });

  it('maps Task to idle', () => {
    expect(mapToolToAction('Task')).toBe('idle');
  });

  it('returns idle for unknown tools', () => {
    expect(mapToolToAction('UnknownTool')).toBe('idle');
    expect(mapToolToAction('')).toBe('idle');
  });
});

describe('toolDisplayName', () => {
  it('shows filename for Read', () => {
    expect(toolDisplayName('Read', { file_path: '/src/app.ts' })).toBe('Read app.ts');
  });

  it('shows "file" when Read has no file_path', () => {
    expect(toolDisplayName('Read', {})).toBe('Read file');
  });

  it('shows pattern for Glob', () => {
    expect(toolDisplayName('Glob', { pattern: '**/*.ts' })).toBe('Search **/*.ts');
  });

  it('shows pattern for Grep', () => {
    expect(toolDisplayName('Grep', { pattern: 'function' })).toBe('Grep function');
  });

  it('shows filename for Edit', () => {
    expect(toolDisplayName('Edit', { file_path: '/src/index.ts' })).toBe('Edit index.ts');
  });

  it('shows filename for Write', () => {
    expect(toolDisplayName('Write', { file_path: '/src/new.ts' })).toBe('Write new.ts');
  });

  it('shows truncated command for Bash', () => {
    expect(toolDisplayName('Bash', { command: 'npm test' })).toBe('$ npm test');
  });

  it('truncates long Bash commands to 30 chars', () => {
    const longCmd = 'npm run build && npm run deploy --production';
    const result = toolDisplayName('Bash', { command: longCmd });
    expect(result).toBe(`$ ${longCmd.slice(0, 30)}`);
    expect(result.length).toBeLessThanOrEqual(32); // "$ " + 30 chars
  });

  it('returns tool name for unknown tools', () => {
    expect(toolDisplayName('CustomTool', {})).toBe('CustomTool');
  });

  it('extracts just the filename from deep paths', () => {
    expect(toolDisplayName('Read', { file_path: '/a/b/c/d/deep.ts' })).toBe('Read deep.ts');
  });

  // ── Edge cases ──

  describe('toolDisplayName edge cases', () => {
    it('handles file path with no directory separators', () => {
      expect(toolDisplayName('Read', { file_path: 'README.md' })).toBe('Read README.md');
    });

    it('handles empty file_path', () => {
      expect(toolDisplayName('Read', { file_path: '' })).toBe('Read file');
    });

    it('truncates long Bash commands at 30 chars', () => {
      const longCmd = 'a'.repeat(50);
      const result = toolDisplayName('Bash', { command: longCmd });
      expect(result).toBe(`$ ${'a'.repeat(30)}`);
      expect(result.length).toBe(32); // "$ " + 30 chars
    });

    it('handles Bash with no command', () => {
      expect(toolDisplayName('Bash', {})).toBe('$ ...');
    });
  });
});
