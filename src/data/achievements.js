/** Milestone achievements → permanent idle production bonuses (milk-like, no lore). */

function hasEarnedAtLeast(totalCoinsEarned, threshold) {
  if (totalCoinsEarned?.gte) {
    return Boolean(totalCoinsEarned.gte(threshold));
  }
  return Number(totalCoinsEarned) >= threshold;
}

export const ACHIEVEMENTS = [
  {
    id: 'taps-100',
    name: 'First Hundred',
    description: 'Reach 100 taps',
    idleBonus: 0.01,
    check: (s) => s.totalClicks >= 100,
  },
  {
    id: 'taps-1000',
    name: 'Tap Trainee',
    description: 'Reach 1,000 taps',
    idleBonus: 0.01,
    check: (s) => s.totalClicks >= 1000,
  },
  {
    id: 'taps-10000',
    name: 'Tap Veteran',
    description: 'Reach 10,000 taps',
    idleBonus: 0.02,
    check: (s) => s.totalClicks >= 10000,
  },
  {
    id: 'own-g1-10',
    name: 'Starter Pack',
    description: 'Own 10 Generator 1',
    idleBonus: 0.01,
    check: (s) => (s.upgrades.find((u) => u.id === 'upgrade-1')?.level ?? 0) >= 10,
  },
  {
    id: 'own-g1-50',
    name: 'Generator Fan',
    description: 'Own 50 Generator 1',
    idleBonus: 0.02,
    check: (s) => (s.upgrades.find((u) => u.id === 'upgrade-1')?.level ?? 0) >= 50,
  },
  {
    id: 'own-g5-25',
    name: 'Mid Tier',
    description: 'Own 25 Generator 5',
    idleBonus: 0.02,
    check: (s) => (s.upgrades.find((u) => u.id === 'upgrade-5')?.level ?? 0) >= 25,
  },
  {
    id: 'own-g10-1',
    name: 'Top Shelf',
    description: 'Own 1 Generator 10',
    idleBonus: 0.03,
    check: (s) => (s.upgrades.find((u) => u.id === 'upgrade-10')?.level ?? 0) >= 1,
  },
  {
    id: 'total-owned-100',
    name: 'Century Club',
    description: 'Own 100 generators total',
    idleBonus: 0.02,
    check: (s) => s.upgrades.filter((u) => u.type === 'auto').reduce((n, u) => n + u.level, 0) >= 100,
  },
  {
    id: 'total-owned-500',
    name: 'Factory Floor',
    description: 'Own 500 generators total',
    idleBonus: 0.03,
    check: (s) => s.upgrades.filter((u) => u.type === 'auto').reduce((n, u) => n + u.level, 0) >= 500,
  },
  {
    id: 'coins-1m',
    name: 'Millionaire',
    description: 'Earn 1 million coins (all time)',
    idleBonus: 0.01,
    check: (s) => hasEarnedAtLeast(s.totalCoinsEarned, 1e6),
  },
  {
    id: 'coins-1b',
    name: 'Billionaire',
    description: 'Earn 1 billion coins (all time)',
    idleBonus: 0.02,
    check: (s) => hasEarnedAtLeast(s.totalCoinsEarned, 1e9),
  },
  {
    id: 'efficiency-1',
    name: 'Tuned Up',
    description: 'Buy any generator efficiency',
    idleBonus: 0.01,
    check: (s) => s.boosts.some((b) => b.kind === 'generator' && b.purchased),
  },
  {
    id: 'base-mult-5',
    name: 'Stacked',
    description: 'Own 5 Base Multipliers',
    idleBonus: 0.02,
    check: (s) => s.boosts.filter((b) => b.kind === 'base_multiplier' && b.purchased).length >= 5,
  },
  {
    id: 'prestige-1',
    name: 'First Ascension',
    description: 'Prestige once',
    idleBonus: 0.05,
    check: (s) => (s.prestigeCount ?? 0) >= 1,
  },
  {
    id: 'stars-10',
    name: 'Token Collector',
    description: 'Hold 10 Ascension Tokens',
    idleBonus: 0.03,
    check: (s) => (s.ascensionTokens ?? 0) >= 10,
  },
];

export function getAchievementIdleMultiplier(unlockedIds) {
  const unlocked = new Set(unlockedIds);
  let bonus = 0;
  ACHIEVEMENTS.forEach((achievement) => {
    if (unlocked.has(achievement.id)) {
      bonus += achievement.idleBonus;
    }
  });
  return 1 + bonus;
}
