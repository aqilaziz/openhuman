import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openWorkspacePath,
  revealWorkspacePath,
  readWorkspaceFileString,
  isWorkspaceLink,
  getWorkspacePathFromHref,
} from '../workspaceLinks';
import { invoke, isTauri } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
}));

describe('workspaceLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isTauri fallbacks', () => {
    it('openWorkspacePath logs warning if not tauri', async () => {
      vi.mocked(isTauri).mockReturnValue(false);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await openWorkspacePath('/test');
      expect(warnSpy).toHaveBeenCalledWith('Workspace links are only supported in Tauri.');
      expect(invoke).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('revealWorkspacePath logs warning if not tauri', async () => {
      vi.mocked(isTauri).mockReturnValue(false);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await revealWorkspacePath('/test');
      expect(warnSpy).toHaveBeenCalledWith('Workspace links are only supported in Tauri.');
      expect(invoke).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('readWorkspaceFileString throws if not tauri', async () => {
      vi.mocked(isTauri).mockReturnValue(false);
      await expect(readWorkspaceFileString('/test')).rejects.toThrow(
        'Workspace file preview is only supported in Tauri.'
      );
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe('isTauri true', () => {
    beforeEach(() => {
      vi.mocked(isTauri).mockReturnValue(true);
    });

    it('openWorkspacePath invokes correct command', async () => {
      await openWorkspacePath('/test');
      expect(invoke).toHaveBeenCalledWith('open_workspace_path', { path: '/test' });
    });

    it('revealWorkspacePath invokes correct command', async () => {
      await revealWorkspacePath('/test');
      expect(invoke).toHaveBeenCalledWith('reveal_workspace_path', { path: '/test' });
    });

    it('readWorkspaceFileString invokes correct command', async () => {
      vi.mocked(invoke).mockResolvedValue('file content');
      const res = await readWorkspaceFileString('/test');
      expect(invoke).toHaveBeenCalledWith('read_workspace_file_string', { path: '/test' });
      expect(res).toBe('file content');
    });
  });

  describe('isWorkspaceLink', () => {
    it('identifies file:// protocol', () => {
      expect(isWorkspaceLink('file:///tmp/workspace')).toBe(true);
    });

    it('identifies absolute paths without protocol', () => {
      expect(isWorkspaceLink('/tmp/workspace')).toBe(true);
    });

    it('identifies relative paths without protocol', () => {
      expect(isWorkspaceLink('wiki/summaries')).toBe(true);
    });

    it('rejects http/https URLs', () => {
      expect(isWorkspaceLink('http://example.com/wiki')).toBe(false);
      expect(isWorkspaceLink('https://example.com/wiki')).toBe(false);
    });
  });

  describe('getWorkspacePathFromHref', () => {
    it('extracts pathname from file:// url', () => {
      expect(getWorkspacePathFromHref('file:///tmp/workspace/file.txt')).toBe('/tmp/workspace/file.txt');
    });

    it('returns raw string for non-URL workspace links', () => {
      expect(getWorkspacePathFromHref('/tmp/workspace/file.txt')).toBe('/tmp/workspace/file.txt');
      expect(getWorkspacePathFromHref('wiki/summaries/file.txt')).toBe('wiki/summaries/file.txt');
    });

    it('returns null for non-workspace links', () => {
      expect(getWorkspacePathFromHref('https://example.com')).toBeNull();
    });
  });
});
