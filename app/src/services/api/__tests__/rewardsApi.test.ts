import { describe, expect, it, vi } from 'vitest';

import { normalizeRewardsSnapshot, rewardsApi } from '../rewardsApi';

vi.mock('../../apiClient', () => ({ apiClient: { get: vi.fn() } }));

describe('normalizeRewardsSnapshot', () => {
  it('normalizes a backend rewards payload', () => {
    const snapshot = normalizeRewardsSnapshot({
      discord: {
        linked: true,
        discordId: 'discord-123',
        inviteUrl: 'https://discord.gg/openhuman',
        membershipStatus: 'member',
      },
      summary: {
        unlockedCount: 2,
        totalCount: 8,
        assignedDiscordRoleCount: 1,
        plan: 'PRO',
        hasActiveSubscription: true,
      },
      metrics: {
        currentStreakDays: 7,
        longestStreakDays: 10,
        cumulativeTokens: 12000000,
        featuresUsedCount: 2,
        trackedFeaturesCount: 6,
        lastEvaluatedAt: '2026-04-09T00:00:00.000Z',
        lastSyncedAt: '2026-04-09T01:00:00.000Z',
      },
      achievements: [
        {
          id: 'STREAK_7',
          title: '7-Day Streak',
          description: 'Use OpenHuman on seven consecutive active days.',
          actionLabel: 'Keep your streak alive for 7 days',
          unlocked: true,
          progressLabel: 'Unlocked',
          roleId: 'role-streak-7',
          discordRoleStatus: 'assigned',
          creditAmountUsd: null,
        },
      ],
    });

    expect(snapshot.discord.membershipStatus).toBe('member');
    expect(snapshot.summary.plan).toBe('PRO');
    expect(snapshot.metrics.currentStreakDays).toBe(7);
    expect(snapshot.achievements[0].discordRoleStatus).toBe('assigned');
  });

  it('falls back safely for malformed payloads', () => {
    const snapshot = normalizeRewardsSnapshot({
      discord: { membershipStatus: 'weird' },
      summary: { plan: 'strange', unlockedCount: '2' },
      achievements: [
        { id: 'POWER_10M', discordRoleStatus: 'mystery', creditAmountUsd: 'not-a-number' },
      ],
    });

    expect(snapshot.discord.membershipStatus).toBe('unavailable');
    expect(snapshot.summary.plan).toBe('FREE');
    expect(snapshot.summary.unlockedCount).toBe(2);
    expect(snapshot.achievements[0].discordRoleStatus).toBe('unavailable');
    expect(snapshot.achievements[0].creditAmountUsd).toBeNull();
  });

  it('handles edge cases in number parsing and normalization', () => {
    const snapshot = normalizeRewardsSnapshot({
      summary: {
        unlockedCount: ' 42 ', // string number
        totalCount: 'not-a-number', // string not a number
        assignedDiscordRoleCount: NaN,
      },
      metrics: {
        currentStreakDays: Infinity,
        longestStreakDays: ' ',
      },
      achievements: [
        {
          id: 'ACH_1',
          creditAmountUsd: 10, // finite number
        },
        {
          id: 'ACH_2',
          creditAmountUsd: Infinity, // non-finite number
        },
        {
          id: 'ACH_3',
          creditAmountUsd: NaN, // NaN number
        },
        {
          id: 'ACH_4',
          creditAmountUsd: '20', // string number
        },
        {
          id: 'ACH_5',
          creditAmountUsd: 'bad-string', // string not a number
        },
        {
          id: 'ACH_6',
          creditAmountUsd: ' ', // whitespace string
        },
        {
          // missing id, should be filtered out
          title: 'No ID',
        },
        null, // invalid achievement
      ],
    });

    // Summary
    expect(snapshot.summary.unlockedCount).toBe(42);
    expect(snapshot.summary.totalCount).toBe(0); // 'not-a-number' -> 0
    expect(snapshot.summary.assignedDiscordRoleCount).toBe(0); // NaN -> 0

    // Metrics
    expect(snapshot.metrics.currentStreakDays).toBe(0); // Infinity -> 0
    expect(snapshot.metrics.longestStreakDays).toBe(0); // ' ' -> 0

    // Achievements
    expect(snapshot.achievements.length).toBe(6);
    expect(snapshot.achievements[0].id).toBe('ACH_1');
    expect(snapshot.achievements[0].creditAmountUsd).toBe(10);

    expect(snapshot.achievements[1].id).toBe('ACH_2');
    expect(snapshot.achievements[1].creditAmountUsd).toBeNull();

    expect(snapshot.achievements[2].id).toBe('ACH_3');
    expect(snapshot.achievements[2].creditAmountUsd).toBeNull();

    expect(snapshot.achievements[3].id).toBe('ACH_4');
    expect(snapshot.achievements[3].creditAmountUsd).toBe(20);

    expect(snapshot.achievements[4].id).toBe('ACH_5');
    expect(snapshot.achievements[4].creditAmountUsd).toBeNull();

    expect(snapshot.achievements[5].id).toBe('ACH_6');
    expect(snapshot.achievements[5].creditAmountUsd).toBeNull();
  });

  it('handles null, undefined, or array payloads safely', () => {
    const emptySnapshot1 = normalizeRewardsSnapshot(null);
    expect(emptySnapshot1.achievements).toEqual([]);
    expect(emptySnapshot1.summary.plan).toBe('FREE');

    const emptySnapshot2 = normalizeRewardsSnapshot([1, 2, 3]);
    expect(emptySnapshot2.achievements).toEqual([]);

    const emptySnapshot3 = normalizeRewardsSnapshot('some string');
    expect(emptySnapshot3.achievements).toEqual([]);
  });
});

describe('rewardsApi', () => {
  it('loads and normalizes /rewards/me', async () => {
    const { apiClient } = await import('../../apiClient');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        discord: {
          linked: false,
          discordId: null,
          inviteUrl: null,
          membershipStatus: 'not_linked',
        },
        summary: {
          unlockedCount: 0,
          totalCount: 8,
          assignedDiscordRoleCount: 0,
          plan: 'FREE',
          hasActiveSubscription: false,
        },
        metrics: {
          currentStreakDays: 0,
          longestStreakDays: 0,
          cumulativeTokens: 0,
          featuresUsedCount: 0,
          trackedFeaturesCount: 6,
          lastEvaluatedAt: null,
          lastSyncedAt: null,
        },
        achievements: [],
      },
    });

    const snapshot = await rewardsApi.getMyRewards();

    expect(apiClient.get).toHaveBeenCalledWith('/rewards/me');
    expect(snapshot.discord.membershipStatus).toBe('not_linked');
    expect(snapshot.summary.totalCount).toBe(8);
  });

  it('throws the backend error when /rewards/me reports failure', async () => {
    const { apiClient } = await import('../../apiClient');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: false,
      data: null,
      error: 'Rewards service unavailable',
    });

    await expect(rewardsApi.getMyRewards()).rejects.toMatchObject({
      error: 'Rewards service unavailable',
    });
  });
});
