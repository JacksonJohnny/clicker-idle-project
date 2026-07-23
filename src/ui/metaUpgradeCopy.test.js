import { describe, expect, it } from 'vitest';
import { getMetaUpgradeConditionText, getMetaUpgradeEffectText } from './metaUpgradeCopy.js';

describe('metaUpgradeCopy', () => {
  it('builds generator efficiency condition and effect text', () => {
    const meta = {
      kind: 'generator',
      requiredOwned: 10,
      targetLabel: 'Generator 1',
      multiplier: 2,
    };

    expect(getMetaUpgradeConditionText(meta)).toContain('10');
    expect(getMetaUpgradeConditionText(meta)).toContain('Generator 1');
    expect(getMetaUpgradeEffectText(meta)).toContain('Generator 1');
    expect(getMetaUpgradeEffectText(meta)).toContain('2');
  });

  it('builds global / base multiplier and tap-% copy', () => {
    expect(getMetaUpgradeConditionText({ kind: 'global', requiredTotalOwned: 50 })).toContain('50');
    expect(getMetaUpgradeEffectText({ kind: 'global', multiplier: 1.05 })).toContain('1.05');

    expect(getMetaUpgradeConditionText({ kind: 'base_multiplier', requiredTotalCoins: 1_000_000 })).toMatch(
      /1 million|1,000,000|1000000/,
    );
    expect(getMetaUpgradeEffectText({ kind: 'base_multiplier', multiplier: 1.1 })).toContain('1.1');

    expect(getMetaUpgradeConditionText({ kind: 'click_per_second', requiredClicks: 1000 })).toContain('1,000');
    expect(getMetaUpgradeEffectText({ kind: 'click_per_second', clickPerSecondShare: 0.05 })).toContain('5');
  });

  it('returns empty strings for unknown kinds', () => {
    expect(getMetaUpgradeConditionText({ kind: 'unknown' })).toBe('');
    expect(getMetaUpgradeEffectText({ kind: 'unknown' })).toBe('');
  });
});
