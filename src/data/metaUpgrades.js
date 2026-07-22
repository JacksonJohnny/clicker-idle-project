import Decimal from 'decimal.js';
import { CLICKER_GENERATORS } from './generators.js';
import { buildBaseMultipliers } from './baseMultipliers.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const GENERATOR_TIERS = [
  // Cookie Clicker starts at 1; we skip that so Efficiency I needs a small farm first.
  { owned: 5, costMult: '50' },
  { owned: 25, costMult: '500' },
  { owned: 50, costMult: '5000' },
  { owned: 100, costMult: '50000' },
  { owned: 200, costMult: '500000' },
];

/** Max yellow efficiency pips shown on a store row (one per efficiency tier). */
export const GENERATOR_EFFICIENCY_STAR_MAX = GENERATOR_TIERS.length;

const GLOBAL_TIERS = [
  { requiredTotalOwned: 25, multiplier: 1.05, cost: '100000' },
  { requiredTotalOwned: 50, multiplier: 1.05, cost: '1000000' },
  { requiredTotalOwned: 100, multiplier: 1.1, cost: '50000000' },
  { requiredTotalOwned: 200, multiplier: 1.1, cost: '5000000000' },
  { requiredTotalOwned: 400, multiplier: 1.25, cost: '500000000000' },
];

const CLICK_PER_SECOND_TIERS = [
  { requiredClicks: 100, clickPerSecondShare: 0.01, cost: '50000' },
  { requiredClicks: 1_000, clickPerSecondShare: 0.01, cost: '5000000' },
  { requiredClicks: 10_000, clickPerSecondShare: 0.01, cost: '500000000' },
  { requiredClicks: 100_000, clickPerSecondShare: 0.01, cost: '50000000000' },
  { requiredClicks: 1_000_000, clickPerSecondShare: 0.01, cost: '5000000000000' },
];

function buildGeneratorEfficiencyUpgrades(generators) {
  return generators.flatMap((generator) =>
    GENERATOR_TIERS.map((tier, index) => ({
      id: `${generator.id}-efficiency-${index + 1}`,
      name: `${generator.label.toUpperCase()} EFFICIENCY ${ROMAN[index]}`,
      kind: 'generator',
      targetId: generator.id,
      targetLabel: generator.label,
      requiredOwned: tier.owned,
      multiplier: 2,
      cost: new Decimal(generator.baseCost).times(tier.costMult).toFixed(0),
    })),
  );
}

function buildGlobalUpgrades() {
  return GLOBAL_TIERS.map((tier, index) => ({
    id: `global-production-${index + 1}`,
    name: `GLOBAL PRODUCTION ${ROMAN[index]}`,
    kind: 'global',
    requiredTotalOwned: tier.requiredTotalOwned,
    multiplier: tier.multiplier,
    cost: tier.cost,
  }));
}

function buildClickPerSecondUpgrades() {
  return CLICK_PER_SECOND_TIERS.map((tier, index) => ({
    id: `click-per-second-tap-${index + 1}`,
    name: `CLICKS PER SECOND TAP ${ROMAN[index]}`,
    kind: 'click_per_second',
    requiredClicks: tier.requiredClicks,
    clickPerSecondShare: tier.clickPerSecondShare,
    cost: tier.cost,
  }));
}

/** Genre-agnostic Cookie Clicker-style one-shot upgrades for the UPGRADE tab. */
export const META_UPGRADES = [
  ...buildGeneratorEfficiencyUpgrades(CLICKER_GENERATORS),
  ...buildGlobalUpgrades(),
  ...buildClickPerSecondUpgrades(),
  ...buildBaseMultipliers(),
];
