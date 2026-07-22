import Decimal from 'decimal.js';
import tiers from './baseMultiplierTiers.json';

/**
 * Genre-agnostic base production multipliers (lifetime-coin unlocks).
 * Effect stacks multiplicatively with global meta-upgrades.
 */
export function buildBaseMultipliers() {
  return tiers.map((tier, index) => ({
    id: `base-multiplier-${index + 1}`,
    name: `BASE MULTIPLIER ${index + 1}`,
    kind: 'base_multiplier',
    requiredTotalCoins: String(tier.unlock),
    multiplier: tier.mult,
    cost: new Decimal(tier.cost).toFixed(0),
  }));
}
