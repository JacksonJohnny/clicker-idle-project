import { describe, expect, it } from 'vitest';
import { getAchievementListLines } from './achievementLines.js';

describe('achievementLines', () => {
  const sample = {
    id: 'taps-100',
    name: 'First Hundred',
    description: 'Reach 100 taps',
    idleBonus: 0.01,
  };

  it('hides locked achievements as a single spoiler line', () => {
    expect(getAchievementListLines(sample, false)).toEqual([{ text: '○ ???', kind: 'locked' }]);
  });

  it('shows name, idle bonus, and description when unlocked', () => {
    expect(getAchievementListLines(sample, true)).toEqual([
      { text: '✓ First Hundred  (+1% idle)', kind: 'unlocked-title' },
      { text: '   Reach 100 taps', kind: 'unlocked-desc' },
    ]);
  });
});
