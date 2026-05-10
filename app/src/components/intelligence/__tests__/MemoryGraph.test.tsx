import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryGraph, openSummaryInObsidian } from '../MemoryGraph';
import { openUrl } from '../../../utils/openUrl';
import { openWorkspacePath } from '../../../utils/workspaceLinks';
import { vi } from 'vitest';

vi.mock('../../../utils/openUrl', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/workspaceLinks', () => ({
  openWorkspacePath: vi.fn().mockResolvedValue(undefined),
}));

const mockNode = {
  kind: 'summary' as const,
  id: 'test-node',
  label: 'Test Node',
  tree_kind: 'source' as const,
  tree_scope: 'test-scope',
  level: 1,
  file_basename: 'test-file',
  parent_id: null,
  child_count: 0,
  time_range_start_ms: 0,
  time_range_end_ms: 0,
};

describe('MemoryGraph interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles workspace open failure gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(openWorkspacePath).mockRejectedValueOnce(new Error('Workspace failed'));

    render(
      <MemoryGraph
        nodes={[mockNode]}
        edges={[]}
        mode="tree"
        contentRootAbs="/tmp/workspace"
      />
    );

    const node = screen.getByTestId('memory-graph-node-test-node');
    fireEvent.click(node);

    await waitFor(() => {
      expect(openWorkspacePath).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });

  it('openSummaryInObsidian handles openUrl failure gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(openUrl).mockRejectedValueOnce(new Error('Browser failed'));

    await openSummaryInObsidian(mockNode, '/tmp/workspace');

    expect(openUrl).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('openSummaryInObsidian ignores nodes missing required properties', async () => {
    await openSummaryInObsidian({ ...mockNode, kind: 'chunk' } as any, '/tmp/workspace');
    expect(openUrl).not.toHaveBeenCalled();

    await openSummaryInObsidian({ ...mockNode, level: undefined }, '/tmp/workspace');
    expect(openUrl).not.toHaveBeenCalled();

    await openSummaryInObsidian({ ...mockNode, file_basename: undefined }, '/tmp/workspace');
    expect(openUrl).not.toHaveBeenCalled();

    await openSummaryInObsidian({ ...mockNode, tree_kind: undefined }, '/tmp/workspace');
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('openSummaryInObsidian handles global tree kind', async () => {
    await openSummaryInObsidian({ ...mockNode, tree_kind: 'global' }, '/tmp/workspace');
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('/tmp/workspace/wiki/summaries')));
  });

  it('MemoryGraph workspace opener handles global tree kind', async () => {
    render(
      <MemoryGraph
        nodes={[{ ...mockNode, tree_kind: 'global' }]}
        edges={[]}
        mode="tree"
        contentRootAbs="/tmp/workspace"
      />
    );

    const node = screen.getByTestId('memory-graph-node-test-node');
    fireEvent.click(node);

    await waitFor(() => {
      expect(openWorkspacePath).toHaveBeenCalledWith('/tmp/workspace/wiki/summaries');
    });
  });

  it('MemoryGraph workspace opener ignores missing properties', async () => {
    render(
      <MemoryGraph
        nodes={[{ ...mockNode, file_basename: undefined }]}
        edges={[]}
        mode="tree"
        contentRootAbs="/tmp/workspace"
      />
    );

    const node = screen.getByTestId('memory-graph-node-test-node');
    fireEvent.click(node);

    await waitFor(() => {
      expect(openWorkspacePath).not.toHaveBeenCalled();
    });
  });
});
