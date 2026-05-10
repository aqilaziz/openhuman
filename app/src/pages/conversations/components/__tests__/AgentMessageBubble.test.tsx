import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BubbleMarkdown, TableCellMarkdown } from '../AgentMessageBubble';
import { openWorkspacePath } from '../../../../utils/workspaceLinks';
import { openUrl } from '../../../../utils/openUrl';
import { vi } from 'vitest';

vi.mock('../../../../utils/workspaceLinks', async () => {
  const actual = await vi.importActual('../../../../utils/workspaceLinks');
  return {
    ...actual,
    openWorkspacePath: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../../../../utils/openUrl', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/format', async () => {
  const actual = await vi.importActual('../../utils/format');
  return {
    ...actual,
    isAllowedExternalHref: vi.fn().mockReturnValue(true),
  };
});

describe('AgentMessageBubble links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BubbleMarkdown', () => {
    it('handles workspace links correctly', async () => {
      // By using a relative URL format that matches isWorkspaceLink we can bypass markdown stripping file://
      const content = 'Check this out: [TestLink1](/wiki/summaries/file.md)';
      render(<BubbleMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink1' });
      fireEvent.click(link);
      await waitFor(() => {
        expect(openWorkspacePath).toHaveBeenCalledWith('/wiki/summaries/file.md');
        expect(openUrl).not.toHaveBeenCalled();
      });
    });

    it('handles regular links correctly', async () => {
      const content = 'Check this out: [TestLink2](https://example.com)';
      render(<BubbleMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink2' });
      fireEvent.click(link);
      await waitFor(() => {
        expect(openUrl).toHaveBeenCalledWith('https://example.com');
        expect(openWorkspacePath).not.toHaveBeenCalled();
      });
    });

    it('handles openWorkspacePath error gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(openWorkspacePath).mockRejectedValueOnce(new Error('Workspace link failed'));

      const content = 'Check this out: [TestLink3](/wiki/summaries/file.md)';
      render(<BubbleMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink3' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openWorkspacePath).toHaveBeenCalledWith('/wiki/summaries/file.md');
        expect(errorSpy).toHaveBeenCalled();
      });
      errorSpy.mockRestore();
    });

    it('ignores invalid external href', async () => {
      const { isAllowedExternalHref } = await import('../../utils/format');
      vi.mocked(isAllowedExternalHref).mockReturnValueOnce(false);

      // Let's create an external link but format says it's not allowed
      const content = 'Check this out: [TestLink4](https://malicious.com)';
      render(<BubbleMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink4' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openUrl).not.toHaveBeenCalled();
        expect(openWorkspacePath).not.toHaveBeenCalled();
      });
    });

    it('handles openUrl error gracefully', async () => {
      vi.mocked(openUrl).mockRejectedValueOnce(new Error('Browser failed'));

      const content = 'Check this out: [TestLink5](https://example.com)';
      render(<BubbleMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink5' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openUrl).toHaveBeenCalledWith('https://example.com');
      });
    });
  });

  describe('TableCellMarkdown', () => {
    it('handles workspace links correctly', async () => {
      const content = 'Check this out: [TestLink6](/wiki/summaries/file.md)';
      render(<TableCellMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink6' });
      fireEvent.click(link);
      await waitFor(() => {
        expect(openWorkspacePath).toHaveBeenCalledWith('/wiki/summaries/file.md');
        expect(openUrl).not.toHaveBeenCalled();
      });
    });

    it('handles regular links correctly', async () => {
      const content = 'Check this out: [TestLink7](https://example.com)';
      render(<TableCellMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink7' });
      fireEvent.click(link);
      await waitFor(() => {
        expect(openUrl).toHaveBeenCalledWith('https://example.com');
        expect(openWorkspacePath).not.toHaveBeenCalled();
      });
    });

    it('handles openWorkspacePath error gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(openWorkspacePath).mockRejectedValueOnce(new Error('Workspace link failed'));

      const content = 'Check this out: [TestLink8](/wiki/summaries/file.md)';
      render(<TableCellMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink8' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openWorkspacePath).toHaveBeenCalledWith('/wiki/summaries/file.md');
        expect(errorSpy).toHaveBeenCalled();
      });
      errorSpy.mockRestore();
    });

    it('ignores invalid external href', async () => {
      const { isAllowedExternalHref } = await import('../../utils/format');
      vi.mocked(isAllowedExternalHref).mockReturnValueOnce(false);

      const content = 'Check this out: [TestLink9](https://malicious.com)';
      render(<TableCellMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink9' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openUrl).not.toHaveBeenCalled();
        expect(openWorkspacePath).not.toHaveBeenCalled();
      });
    });

    it('handles openUrl error gracefully', async () => {
      vi.mocked(openUrl).mockRejectedValueOnce(new Error('Browser failed'));

      const content = 'Check this out: [TestLink10](https://example.com)';
      render(<TableCellMarkdown content={content} />);
      const link = screen.getByRole('link', { name: 'TestLink10' });
      fireEvent.click(link);

      await waitFor(() => {
        expect(openUrl).toHaveBeenCalledWith('https://example.com');
      });
    });
  });
});
