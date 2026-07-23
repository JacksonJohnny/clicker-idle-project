import Decimal from 'decimal.js';
import { normalizeBuyAmount } from '../config/buyAmounts.js';
import { getAchievementIdleMultiplier } from '../data/achievements.js';
import { getAscensionTokenIdleMultiplier } from './prestige.js';
import { getAutoTapCursorTier, getMaxAutoTapCursorSlots } from './autoTapProgress.js';

/**
 * Pure clicker formulas (costs, rates, multipliers, unlock checks, number format).
 * Mutable game state lives in `clickerController.js`.
 */

/**
 * @typedef {object} UpgradeCatalogEntry
 * @property {string} id
 * @property {string} label
 * @property {number|string} baseCost
 * @property {number|string} baseValue
 * @property {number} [growth]
 * @property {'click'|'auto'|'auto_tap'} type
 * @property {string} [unlockAfter]
 * @property {number} [level]
 */

/**
 * @typedef {object} MetaUpgradeCatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {'generator'|'global'|'click_per_second'|'base_multiplier'} kind
 * @property {boolean} [purchased]
 */

// Cookie Clicker formatEveryThirdPower notations ('' is index 0 after the initial /1000).
const SCALE_FROM_MILLION = [
  '',
  ' million',
  ' billion',
  ' trillion',
  ' quadrillion',
  ' quintillion',
  ' sextillion',
  ' septillion',
  ' octillion',
  ' nonillion',
  ' decillion',
];

export function toDecimal(value) {
  if (value instanceof Decimal) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }

  try {
    return new Decimal(value);
  } catch (_error) {
    return new Decimal(0);
  }
}

function formatWithCommas(integerString) {
  return integerString.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Keep the last shown digit from updating more than ~2x/sec (avoids flicker).
function decimalsForRate(unitsPerSecond, maxDecimals) {
  const rate = Number(unitsPerSecond);

  if (!Number.isFinite(rate) || rate <= 0) {
    return maxDecimals;
  }

  return Math.max(0, Math.min(maxDecimals, Math.floor(Math.log10(2 / rate))));
}

function formatScaleCoefficient(value, decimals) {
  if (decimals <= 0) {
    return value.round().toFixed(0);
  }

  return value
    .toFixed(decimals)
    .replace(/\.?0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

// Cookie Clicker-style Beautify: commas below 1M, "X.XXX billion" from 1M up.
// Pass { rate } (e.g. perSecond) to drop decimals when the scale already ticks fast.
export function formatCoins(value, options = {}) {
  const floats = typeof options === 'number' ? options : (options.floats ?? 1);
  const rate = typeof options === 'number' ? undefined : options.rate;
  const amount = toDecimal(value);
  const rateAmount = rate === undefined || rate === null ? null : toDecimal(rate);

  if (!amount.isFinite() || amount.isNaN()) {
    return '0';
  }

  const sign = amount.isNeg() ? '-' : '';
  const abs = amount.abs();

  if (abs.gte(1_000_000)) {
    let scaled = abs.div(1000);
    let base = 0;

    while (scaled.round().gte(1000)) {
      if (base >= SCALE_FROM_MILLION.length - 1) {
        return `${sign}${abs.toExponential(2).replace('e+', 'e')}`;
      }

      scaled = scaled.div(1000);
      base += 1;
    }

    const scaleDivisor = Decimal.pow(1000, base + 1);
    const scaledRate = rateAmount && rateAmount.isFinite() ? rateAmount.abs().div(scaleDivisor) : null;
    const decimals = scaledRate ? decimalsForRate(scaledRate, 3) : 3;

    return `${sign}${formatScaleCoefficient(scaled, decimals)}${SCALE_FROM_MILLION[base]}`;
  }

  const decimals = rateAmount && rateAmount.isFinite() ? decimalsForRate(rateAmount.abs(), floats) : floats;

  if (decimals > 0 && !abs.trunc().eq(abs)) {
    const [integerPart, decimalPart] = abs.toFixed(decimals).split('.');
    return `${sign}${formatWithCommas(integerPart)}.${decimalPart}`;
  }

  return `${sign}${formatWithCommas(abs.trunc().toFixed(0))}`;
}

export function calculateUpgradeCost(upgrade) {
  const baseCost = toDecimal(upgrade.baseCost);
  const growth = toDecimal(upgrade.growth);
  return baseCost.times(growth.pow(upgrade.level)).floor();
}

/** Total cost to buy `amount` levels starting from current level (geometric series). */
export function calculateBulkUpgradeCost(upgrade, amount) {
  const levels = Math.max(0, Math.floor(Number(amount) || 0));
  if (levels <= 0) {
    return new Decimal(0);
  }

  const growth = toDecimal(upgrade.growth);
  const first = toDecimal(upgrade.baseCost).times(growth.pow(upgrade.level));

  if (growth.eq(1)) {
    return first.times(levels).floor();
  }

  return first.times(growth.pow(levels).minus(1)).div(growth.minus(1)).floor();
}

/** How many levels can be bought with current coins for this upgrade. */
export function getMaxAffordableUpgradeAmount(state, upgrade) {
  if (!upgrade || !isUpgradeUnlocked(upgrade, state.upgrades)) {
    return 0;
  }

  const coins = toDecimal(state.coins);
  if (coins.lte(0)) {
    return 0;
  }

  let low = 0;
  let high = 1;
  while (high < 1e9 && calculateBulkUpgradeCost(upgrade, high).lte(coins)) {
    low = high;
    high *= 2;
  }

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (calculateBulkUpgradeCost(upgrade, mid).lte(coins)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

export function resolveBuyAmount(state, upgrade, buyAmount) {
  const normalized = normalizeBuyAmount(buyAmount);
  if (normalized === 'max') {
    return getMaxAffordableUpgradeAmount(state, upgrade);
  }
  return normalized;
}

function getUpgradeLevel(state, upgradeId) {
  return state.upgrades.find((item) => item.id === upgradeId)?.level ?? 0;
}

function getTotalGeneratorOwned(state) {
  return state.upgrades.filter((upgrade) => upgrade.type === 'auto').reduce((sum, upgrade) => sum + upgrade.level, 0);
}

export function isMetaUpgradeUnlocked(state, boost) {
  if (!boost || boost.purchased) {
    return false;
  }

  if (boost.kind === 'generator') {
    return getUpgradeLevel(state, boost.targetId) >= boost.requiredOwned;
  }

  if (boost.kind === 'global') {
    return getTotalGeneratorOwned(state) >= boost.requiredTotalOwned;
  }

  if (boost.kind === 'base_multiplier') {
    return toDecimal(state.totalCoinsEarned).gte(boost.requiredTotalCoins);
  }

  if (boost.kind === 'click_per_second') {
    return state.totalClicks >= boost.requiredClicks;
  }

  return false;
}

function getPurchasedBoosts(boosts) {
  return boosts.filter((boost) => boost.purchased);
}

/** Yellow store efficiency pips: one per purchased generator efficiency meta-upgrade. */
export function getGeneratorEfficiencyStarCount(state, generatorId) {
  if (!state?.boosts || !generatorId) {
    return 0;
  }

  return getPurchasedBoosts(state.boosts).filter(
    (boost) => boost.kind === 'generator' && boost.targetId === generatorId,
  ).length;
}

function getGeneratorProductionMultiplier(state, generatorId) {
  let multiplier = new Decimal(1);

  getPurchasedBoosts(state.boosts).forEach((boost) => {
    if (boost.kind === 'generator' && boost.targetId === generatorId) {
      multiplier = multiplier.times(toDecimal(boost.multiplier));
    }
  });

  return multiplier;
}

export function getGeneratorAutoRate(state, upgrade) {
  return toDecimal(upgrade.baseValue).times(upgrade.level).times(getGeneratorProductionMultiplier(state, upgrade.id));
}

/**
 * Share of total idle (auto) production from one generator, 0..1.
 * Returns null when there is no idle yet or this generator contributes nothing (hide % in UI).
 */
export function getGeneratorIdleShare(state, generatorId) {
  if (!state?.upgrades || !generatorId) {
    return null;
  }

  const generators = state.upgrades.filter((upgrade) => upgrade.type === 'auto');
  let total = new Decimal(0);
  let own = new Decimal(0);

  generators.forEach((upgrade) => {
    const rate = getGeneratorAutoRate(state, upgrade);
    total = total.plus(rate);
    if (upgrade.id === generatorId) {
      own = rate;
    }
  });

  if (total.lte(0) || own.lte(0)) {
    return null;
  }

  return own.div(total).toNumber();
}

/** Compact percent label for STORE rows (`12%`, `1.2%`, `0.08%`). */
export function formatIdleSharePercent(share) {
  if (share == null || !(share > 0)) {
    return null;
  }

  const pct = share * 100;
  if (pct >= 9.95) {
    return `${Math.round(pct)}%`;
  }
  if (pct >= 0.995) {
    return `${pct.toFixed(1)}%`;
  }
  return `${pct.toFixed(2)}%`;
}

export function isUpgradeUnlocked(upgrade, upgrades) {
  if (!upgrade.unlockAfter || upgrade.level > 0) {
    return true;
  }

  const prerequisite = upgrades.find((item) => item.id === upgrade.unlockAfter);
  return prerequisite?.level > 0;
}

/** Derived rates / multipliers from the current economy snapshot (pure). */
export function calculateStats(state) {
  const clickExtra = state.upgrades
    .filter((upgrade) => upgrade.type === 'click')
    .reduce((sum, upgrade) => sum.plus(toDecimal(upgrade.baseValue).times(upgrade.level)), new Decimal(0));

  const autoRate = state.upgrades
    .filter((upgrade) => upgrade.type === 'auto')
    .reduce((sum, upgrade) => sum.plus(getGeneratorAutoRate(state, upgrade)), new Decimal(0));

  const metaMultiplier = getPurchasedBoosts(state.boosts)
    .filter((boost) => boost.kind === 'global' || boost.kind === 'base_multiplier')
    .reduce((multiplier, boost) => multiplier.times(toDecimal(boost.multiplier)), new Decimal(1));

  const achievementMultiplier = getAchievementIdleMultiplier(state.unlockedAchievements ?? []);
  const ascensionTokensMultiplier = getAscensionTokenIdleMultiplier(state.ascensionTokens ?? 0);
  const productionMultiplier = metaMultiplier.times(achievementMultiplier).times(ascensionTokensMultiplier);

  const perSecond = autoRate.times(productionMultiplier);

  const clickPerSecondShare = getPurchasedBoosts(state.boosts)
    .filter((boost) => boost.kind === 'click_per_second')
    .reduce((sum, boost) => sum.plus(toDecimal(boost.clickPerSecondShare ?? 0)), new Decimal(0));

  const perClick = new Decimal(1).plus(clickExtra).plus(perSecond.times(clickPerSecondShare));

  return {
    perClick,
    perSecond,
    productionMultiplier,
    metaMultiplier,
    achievementMultiplier,
    ascensionTokensMultiplier,
  };
}

export function getAutoTapLevel(state) {
  return state.upgrades.find((upgrade) => upgrade.type === 'auto_tap')?.level ?? 0;
}

export function getAutoTapCursorCount(state) {
  return getAutoTapLevel(state);
}

/** White-click equivalents produced by one Auto Tap wave at the given level. */
export function getAutoTapWaveWhiteEquivalents(level) {
  const maxSlots = getMaxAutoTapCursorSlots();
  const count = Math.min(level, maxSlots);

  if (level <= 0 || count <= 0) {
    return new Decimal(0);
  }

  let sum = new Decimal(0);
  for (let i = 0; i < level; i += 1) {
    const tier = getAutoTapCursorTier(level, i % count, maxSlots);
    sum = sum.plus(tier + 1);
  }

  return sum;
}
