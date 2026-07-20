// Custo escala com fator 1.15 por unidade comprada (padrão Cookie Clicker).
// Preço da N-ésima unidade = baseCost × 1.15^(N-1)
// baseCost e baseValue espelham os valores dos buildings do Cookie Clicker.
export const GENERATOR_MILESTONES = [10, 25, 50, 100, 200];

export const CLICKER_UPGRADES = [
  { id: 'tap-power', label: 'Tap Power', baseCost: 15,          baseValue: 1,       growth: 1.15, type: 'click' },
  { id: 'upgrade-1', label: 'Upgrade 1', baseCost: 100,         baseValue: 1,       growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES },
  { id: 'upgrade-2', label: 'Upgrade 2', baseCost: 1100,        baseValue: 8,       growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-1' },
  { id: 'upgrade-3', label: 'Upgrade 3', baseCost: 12000,       baseValue: 47,      growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-2' },
  { id: 'upgrade-4', label: 'Upgrade 4', baseCost: 130000,      baseValue: 260,     growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-3' },
  { id: 'upgrade-5', label: 'Upgrade 5', baseCost: 1400000,     baseValue: 1400,    growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-4' },
  { id: 'upgrade-6', label: 'Upgrade 6', baseCost: 20000000,    baseValue: 7800,    growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-5' },
  { id: 'upgrade-7', label: 'Upgrade 7', baseCost: 330000000,   baseValue: 44000,   growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-6' },
  { id: 'upgrade-8', label: 'Upgrade 8', baseCost: 5100000000,  baseValue: 260000,  growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-7' },
  { id: 'upgrade-9', label: 'Upgrade 9', baseCost: 75000000000, baseValue: 1600000, growth: 1.15, type: 'auto', milestones: GENERATOR_MILESTONES, unlockAfter: 'upgrade-8' },
];
