import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, getAchievementIdleMultiplier } from './achievements.js';

describe('achievements', () => {
  it('stacks idle bonuses only for unlocked ids', () => {
    expect(getAchievementIdleMultiplier([])).toBe(1);
    expect(getAchievementIdleMultiplier(['taps-100'])).toBe(1.01);
    expect(getAchievementIdleMultiplier(['taps-100', 'prestige-1'])).toBe(1.06);
    expect(getAchievementIdleMultiplier(['missing-id'])).toBe(1);
  });

  it('unlocks tap and ownership milestones from state', () => {
    const taps = ACHIEVEMENTS.find((item) => item.id === 'taps-100');
    const owned = ACHIEVEMENTS.find((item) => item.id === 'own-g1-10');
    const prestige = ACHIEVEMENTS.find((item) => item.id === 'prestige-1');

    expect(taps.check({ totalClicks: 99 })).toBe(false);
    expect(taps.check({ totalClicks: 100 })).toBe(true);

    expect(
      owned.check({
        upgrades: [{ id: 'upgrade-1', level: 9 }],
      }),
    ).toBe(false);
    expect(
      owned.check({
        upgrades: [{ id: 'upgrade-1', level: 10 }],
      }),
    ).toBe(true);

    expect(prestige.check({ prestigeCount: 0 })).toBe(false);
    expect(prestige.check({ prestigeCount: 1 })).toBe(true);
  });

  it('treats Decimal-like coin totals as unlocked when large enough', () => {
    const million = ACHIEVEMENTS.find((item) => item.id === 'coins-1m');
    expect(million.check({ totalCoinsEarned: 999_999 })).toBe(false);
    expect(million.check({ totalCoinsEarned: 1_000_000 })).toBe(true);
    expect(million.check({ totalCoinsEarned: { gte: (n) => n <= 1e6 } })).toBe(true);
  });
});
