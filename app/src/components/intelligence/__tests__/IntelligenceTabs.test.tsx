import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ActionableItem, ActionableItemSource, TimeGroup } from '../../../types/intelligence';
import IntelligenceDreamsTab from '../IntelligenceDreamsTab';
import IntelligenceMemoryTab from '../IntelligenceMemoryTab';

vi.mock('../ActionableCard', () => ({
  ActionableCard: ({
    item,
    onComplete,
    onDismiss,
    onSnooze,
  }: {
    item: ActionableItem;
    onComplete: (item: ActionableItem) => Promise<void>;
    onDismiss: (item: ActionableItem) => void;
    onSnooze: (item: ActionableItem, duration: number) => Promise<void>;
  }) => (
    <div data-testid={`actionable-card-${item.id}`}>
      <span>{item.title}</span>
      <button type="button" onClick={() => void onComplete(item)}>
        Complete {item.title}
      </button>
      <button type="button" onClick={() => onDismiss(item)}>
        Dismiss {item.title}
      </button>
      <button type="button" onClick={() => void onSnooze(item, 1000)}>
        Snooze {item.title}
      </button>
    </div>
  ),
}));

function makeItem(overrides: Partial<ActionableItem> = {}): ActionableItem {
  const createdAt = new Date('2026-05-16T10:00:00Z');
  return {
    id: 'item-1',
    title: 'Reply to Alice',
    description: 'Send the launch note.',
    source: 'email',
    priority: 'important',
    status: 'active',
    createdAt,
    updatedAt: createdAt,
    actionable: true,
    ...overrides,
  };
}

function renderMemoryTab(
  overrides: Partial<React.ComponentProps<typeof IntelligenceMemoryTab>> = {}
) {
  const props: React.ComponentProps<typeof IntelligenceMemoryTab> = {
    handleAnalyzeNow: vi.fn().mockResolvedValue(undefined),
    handleComplete: vi.fn().mockResolvedValue(undefined),
    handleDismiss: vi.fn(),
    handleSnooze: vi.fn().mockResolvedValue(undefined),
    isRunning: false,
    items: [],
    itemsLoading: false,
    searchFilter: '',
    setSearchFilter: vi.fn(),
    setSourceFilter: vi.fn(),
    sourceFilter: 'all',
    timeGroups: [],
    usingMemoryData: false,
    ...overrides,
  };

  render(<IntelligenceMemoryTab {...props} />);
  return props;
}

describe('Intelligence tab panels', () => {
  it('renders the dreams placeholder copy', () => {
    render(<IntelligenceDreamsTab />);

    expect(screen.getByRole('heading', { name: 'Dreams' })).toBeInTheDocument();
    expect(screen.getByText(/generate a dream/i)).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
  });

  it('wires search and source filters', () => {
    const props = renderMemoryTab();

    fireEvent.change(screen.getByLabelText('Search actionable items'), {
      target: { value: 'alice' },
    });
    fireEvent.change(screen.getByLabelText('Filter by source'), {
      target: { value: 'calendar' satisfies ActionableItemSource },
    });

    expect(props.setSearchFilter).toHaveBeenCalledWith('alice');
    expect(props.setSourceFilter).toHaveBeenCalledWith('calendar');
  });

  it('shows the loading state before memory-backed items are ready', () => {
    renderMemoryTab({ itemsLoading: true, usingMemoryData: false });

    expect(screen.getByRole('heading', { name: 'Loading Intelligence...' })).toBeInTheDocument();
    expect(screen.getByText('Fetching your actionable items')).toBeInTheDocument();
  });

  it('shows the running empty state while analysis is in progress', () => {
    renderMemoryTab({ isRunning: true, items: [] });

    expect(screen.getByRole('heading', { name: /Analyzing your data/i })).toBeInTheDocument();
    expect(screen.getByText(/reviewing your connected skills/i)).toBeInTheDocument();
  });

  it('shows the no-analysis call to action and invokes analyze now', () => {
    const props = renderMemoryTab();

    expect(screen.getByRole('heading', { name: 'No analysis yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Now' }));

    expect(props.handleAnalyzeNow).toHaveBeenCalledTimes(1);
  });

  it('explains empty filtered and memory-backed states', () => {
    const { rerender } = render(
      <IntelligenceMemoryTab
        {...renderMemoryTabProps({ searchFilter: 'missing' })}
        timeGroups={[]}
      />
    );

    expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
    expect(screen.getByText('No items match your current filters.')).toBeInTheDocument();

    rerender(
      <IntelligenceMemoryTab
        {...renderMemoryTabProps({ searchFilter: '', usingMemoryData: true })}
        timeGroups={[]}
      />
    );

    expect(screen.getByRole('heading', { name: 'All caught up!' })).toBeInTheDocument();
    expect(screen.getByText('No actionable items at the moment.')).toBeInTheDocument();
  });

  it('renders grouped actionable cards and forwards item actions', () => {
    const item = makeItem();
    const timeGroups: TimeGroup[] = [{ label: 'Today', count: 1, items: [item] }];
    const props = renderMemoryTab({ isRunning: true, items: [item], timeGroups });

    expect(screen.getByText(/Analyzing your data/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('actionable-card-item-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete Reply to Alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Reply to Alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Snooze Reply to Alice' }));

    expect(props.handleComplete).toHaveBeenCalledWith(item);
    expect(props.handleDismiss).toHaveBeenCalledWith(item);
    expect(props.handleSnooze).toHaveBeenCalledWith(item, 1000);
  });
});

function renderMemoryTabProps(
  overrides: Partial<React.ComponentProps<typeof IntelligenceMemoryTab>> = {}
): React.ComponentProps<typeof IntelligenceMemoryTab> {
  return {
    handleAnalyzeNow: vi.fn().mockResolvedValue(undefined),
    handleComplete: vi.fn().mockResolvedValue(undefined),
    handleDismiss: vi.fn(),
    handleSnooze: vi.fn().mockResolvedValue(undefined),
    isRunning: false,
    items: [],
    itemsLoading: false,
    searchFilter: '',
    setSearchFilter: vi.fn(),
    setSourceFilter: vi.fn(),
    sourceFilter: 'all',
    timeGroups: [],
    usingMemoryData: false,
    ...overrides,
  };
}
