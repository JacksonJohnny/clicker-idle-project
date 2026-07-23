import { describe, expect, it } from 'vitest';
import {
  calculateBulkUpgradeCost,
  calculateStats,
  calculateUpgradeCost,
  formatCoins,
  formatIdleSharePercent,
  getGeneratorEfficiencyStarCount,
  getGeneratorIdleShare,
  isUpgradeUnlocked,
} from './clickerMath.js';

describe('clickerMath', () => {
  it('formats small, suffixed and very large values', () => {
    expect(formatCoins(999)).toBe('999');
    expect(formatCoins(999.4)).toBe('999.4');
    expect(formatCoins(1500)).toBe('1,500');
    expect(formatCoins(705_026)).toBe('705,026');
    expect(formatCoins(1_014_000_000)).toBe('1.014 billion');
    expect(formatCoins(1_000_000)).toBe('1 million');
    expect(formatCoins('1e33')).toBe('1 decillion');
    expect(formatCoins('1e40')).toMatch(/e40$/);
  });

  it('drops scaled decimals when income already ticks the unit fast', () => {
    expect(formatCoins(388_557_000, { rate: 500_000 })).toBe('389 million');
    expect(formatCoins(388_557_000, { rate: 100 })).toBe('388.557 million');
  });

  it('computes geometric upgrade costs', () => {
    const upgrade = { baseCost: 15, growth: 1.15, level: 0 };
    expect(calculateUpgradeCost(upgrade).toString()).toBe('15');
    expect(calculateBulkUpgradeCost({ ...upgrade, level: 0 }, 2).toString()).toBe('32');
  });

  it('checks generator unlock prerequisites', () => {
    const upgrades = [
      { id: 'upgrade-1', level: 0 },
      { id: 'upgrade-2', unlockAfter: 'upgrade-1', level: 0 },
    ];
    expect(isUpgradeUnlocked(upgrades[1], upgrades)).toBe(false);
    upgrades[0].level = 1;
    expect(isUpgradeUnlocked(upgrades[1], upgrades)).toBe(true);
  });

  it('reports idle production share and percent labels', () => {
    const state = {
      boosts: [],
      upgrades: [
        { id: 'upgrade-1', type: 'auto', baseValue: 1, level: 10 },
        { id: 'upgrade-2', type: 'auto', baseValue: 8, level: 5 },
      ],
    };

    expect(getGeneratorIdleShare(state, 'upgrade-1')).toBeCloseTo(0.2, 5);
    expect(getGeneratorIdleShare(state, 'upgrade-2')).toBeCloseTo(0.8, 5);
    expect(getGeneratorIdleShare(state, 'upgrade-3')).toBeNull();
    expect(formatIdleSharePercent(0.2)).toBe('20%');
    expect(formatIdleSharePercent(0.012)).toBe('1.2%');
    expect(formatIdleSharePercent(0.0008)).toBe('0.08%');
    expect(formatIdleSharePercent(null)).toBeNull();
  });

  it('hides idle share when no generators produce', () => {
    const state = {
      boosts: [],
      upgrades: [{ id: 'upgrade-1', type: 'auto', baseValue: 1, level: 0 }],
    };
    expect(getGeneratorIdleShare(state, 'upgrade-1')).toBeNull();
  });

  it('counts efficiency stars and calculates production stats', () => {
    const state = {
      unlockedAchievements: [],
      ascensionTokens: 0,
      boosts: [
        { id: 'upgrade-1-efficiency-1', kind: 'generator', targetId: 'upgrade-1', multiplier: 2, purchased: true },
      ],
      upgrades: [
        { id: 'tap-power', type: 'click', baseValue: 1, level: 1 },
        { id: 'upgrade-1', type: 'auto', baseValue: 1, level: 5 },
      ],
    };

    expect(getGeneratorEfficiencyStarCount(state, 'upgrade-1')).toBe(1);
    const stats = calculateStats(state);
    expect(stats.perSecond.toString()).toBe('10');
    expect(stats.perClick.toString()).toBe('2');
  });
});
