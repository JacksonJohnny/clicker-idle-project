import Decimal from 'decimal.js';
import { AUTO_TAP_INTERVAL_SECONDS } from '../data/upgrades.js';
import { ACHIEVEMENTS, getAchievementIdleMultiplier } from '../data/achievements.js';
import { calculateAscensionTokenGain, getAscensionTokenIdleMultiplier } from './prestige.js';
import { BOOST_ID_ALIASES, UPGRADE_ID_ALIASES, normalizeSaveState } from './saveState.js';
import {
  calculateBulkUpgradeCost,
  calculateStats,
  calculateUpgradeCost,
  getAutoTapLevel,
  getAutoTapWaveWhiteEquivalents,
  isMetaUpgradeUnlocked,
  isUpgradeUnlocked,
  resolveBuyAmount,
  toDecimal,
} from './clickerMath.js';

/**
 * Mutable clicker session: hydrate, buy, tick, prestige.
 * Formulas stay in `clickerMath.js`.
 */

/**
 * @typedef {object} SaveSnapshot
 * @property {string|number} coins
 * @property {string|number} [totalCoinsEarned]
 * @property {number} totalClicks
 * @property {number} [autoTapProgress]
 * @property {{ id: string, level: number }[]} [upgrades]
 * @property {{ id: string, purchased: boolean }[]} [boosts]
 * @property {number|string} [savedAt]
 */

function cloneUpgrades(upgrades) {
  return upgrades.map((upgrade) => ({ ...upgrade, level: 0 }));
}

function cloneBoosts(boosts) {
  return boosts.map((boost) => ({ ...boost, purchased: false }));
}

function recalculateState(state) {
  const stats = calculateStats(state);
  state.perClick = stats.perClick;
  state.perSecond = stats.perSecond;
  state.productionMultiplier = stats.productionMultiplier;
  return state;
}

function createInitialState(upgrades, boosts = []) {
  const state = {
    coins: new Decimal(0),
    totalCoinsEarned: new Decimal(0),
    coinsThisAscension: new Decimal(0),
    totalClicks: 0,
    ascensionTokens: 0,
    prestigeCount: 0,
    unlockedAchievements: [],
    perClick: new Decimal(1),
    perSecond: new Decimal(0),
    autoTapProgress: 0,
    lastAutoTaps: 0,
    upgrades: cloneUpgrades(upgrades),
    boosts: cloneBoosts(boosts),
  };

  return recalculateState(state);
}

function syncAchievements(state) {
  const unlocked = new Set(state.unlockedAchievements ?? []);
  let changed = false;

  ACHIEVEMENTS.forEach((achievement) => {
    if (unlocked.has(achievement.id)) {
      return;
    }
    try {
      if (achievement.check(state)) {
        unlocked.add(achievement.id);
        changed = true;
      }
    } catch {
      // Ignore bad checks against partial state.
    }
  });

  state.unlockedAchievements = [...unlocked];
  if (changed) {
    recalculateState(state);
  }
  return changed;
}

function creditCoins(state, amount) {
  const gain = toDecimal(amount);
  if (gain.lte(0)) {
    return gain;
  }
  state.coins = state.coins.plus(gain);
  state.totalCoinsEarned = toDecimal(state.totalCoinsEarned).plus(gain);
  state.coinsThisAscension = toDecimal(state.coinsThisAscension).plus(gain);
  return gain;
}

function findLoadedUpgrade(loadedUpgrades, catalogId) {
  if (!Array.isArray(loadedUpgrades)) {
    return null;
  }

  const direct = loadedUpgrades.find((entry) => entry.id === catalogId);
  const legacyId = Object.keys(UPGRADE_ID_ALIASES).find((oldId) => UPGRADE_ID_ALIASES[oldId] === catalogId);
  const legacy = legacyId ? loadedUpgrades.find((entry) => entry.id === legacyId) : null;
  const aliased = loadedUpgrades.find((entry) => UPGRADE_ID_ALIASES[entry.id] === catalogId);

  const candidates = [direct, legacy, aliased].filter(Boolean);
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, entry) => {
    const level = Number.isFinite(Number(entry.level)) ? Number(entry.level) : 0;
    const bestLevel = Number.isFinite(Number(best.level)) ? Number(best.level) : 0;
    return level >= bestLevel ? entry : best;
  });
}

function findLoadedBoost(loadedBoosts, catalogId) {
  if (!Array.isArray(loadedBoosts)) {
    return null;
  }

  const direct = loadedBoosts.find((entry) => entry.id === catalogId);
  if (direct?.purchased) {
    return direct;
  }

  const legacyId = Object.keys(BOOST_ID_ALIASES).find((oldId) => BOOST_ID_ALIASES[oldId] === catalogId);
  const legacy = legacyId ? loadedBoosts.find((entry) => entry.id === legacyId) : null;
  const aliased = loadedBoosts.find((entry) => BOOST_ID_ALIASES[entry.id] === catalogId);

  return [direct, legacy, aliased].find((entry) => entry?.purchased) ?? direct ?? legacy ?? aliased ?? null;
}

function mergeStateFromSave(state, loaded) {
  if (!loaded) {
    return state;
  }

  // Remap legacy ids (generator-N → upgrade-N, efficiency aliases) before merge.
  // Do NOT re-run legacy star compensation here — that belongs only in old migrations.
  const normalized = normalizeSaveState(loaded);

  state.coins = normalized.coins !== undefined ? toDecimal(normalized.coins) : state.coins;
  state.totalCoinsEarned =
    normalized.totalCoinsEarned !== undefined
      ? toDecimal(normalized.totalCoinsEarned)
      : Decimal.max(state.totalCoinsEarned, state.coins);
  state.coinsThisAscension =
    normalized.coinsThisAscension !== undefined
      ? toDecimal(normalized.coinsThisAscension)
      : toDecimal(state.totalCoinsEarned);
  state.ascensionTokens = Number.isFinite(Number(normalized.ascensionTokens))
    ? Math.max(0, Number(normalized.ascensionTokens))
    : state.ascensionTokens;
  state.prestigeCount = Number.isFinite(Number(normalized.prestigeCount))
    ? Math.max(0, Number(normalized.prestigeCount))
    : state.prestigeCount;
  state.unlockedAchievements = Array.isArray(normalized.unlockedAchievements)
    ? normalized.unlockedAchievements.filter((id) => typeof id === 'string')
    : state.unlockedAchievements;
  state.totalClicks = Number.isFinite(Number(normalized.totalClicks))
    ? Number(normalized.totalClicks)
    : state.totalClicks;
  state.autoTapProgress = Number.isFinite(Number(normalized.autoTapProgress))
    ? Math.max(0, Number(normalized.autoTapProgress))
    : state.autoTapProgress;

  state.upgrades = state.upgrades.map((upgrade) => {
    const existing = findLoadedUpgrade(normalized.upgrades, upgrade.id);
    const level = Number.isFinite(Number(existing?.level)) ? Math.max(0, Number(existing.level)) : 0;
    return existing ? { ...upgrade, level } : upgrade;
  });

  state.boosts = state.boosts.map((boost) => {
    const existing = findLoadedBoost(normalized.boosts, boost.id);
    return { ...boost, purchased: existing?.purchased === true };
  });

  recalculateState(state);
  syncAchievements(state);
  return state;
}

function buyUpgrade(state, upgradeId, buyAmount = 1) {
  const upgrade = state.upgrades.find((item) => item.id === upgradeId);

  if (!upgrade) {
    return { ok: false, reason: 'missing-upgrade' };
  }

  if (!isUpgradeUnlocked(upgrade, state.upgrades)) {
    return { ok: false, reason: 'locked' };
  }

  const amount = resolveBuyAmount(state, upgrade, buyAmount);
  if (amount <= 0) {
    return { ok: false, reason: 'insufficient-coins', cost: calculateUpgradeCost(upgrade), amount: 0 };
  }

  const cost = calculateBulkUpgradeCost(upgrade, amount);
  if (state.coins.lt(cost)) {
    return { ok: false, reason: 'insufficient-coins', cost, amount };
  }

  state.coins = state.coins.minus(cost);
  upgrade.level += amount;
  recalculateState(state);

  return {
    ok: true,
    cost,
    amount,
  };
}

function buyMetaUpgrade(state, boostId) {
  const boost = state.boosts.find((item) => item.id === boostId);

  if (!boost || boost.purchased) {
    return { ok: false, reason: boost ? 'already-purchased' : 'missing-boost' };
  }

  if (!isMetaUpgradeUnlocked(state, boost)) {
    return { ok: false, reason: 'locked' };
  }

  const cost = toDecimal(boost.cost).floor();
  if (state.coins.lt(cost)) {
    return { ok: false, reason: 'insufficient-coins', cost };
  }

  state.coins = state.coins.minus(cost);
  boost.purchased = true;
  recalculateState(state);

  return { ok: true, cost, boost };
}

function applyAutoIncome(state, seconds = 1) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;

  if (state.perSecond.lte(0) || safeSeconds <= 0) {
    return new Decimal(0);
  }

  const gain = state.perSecond.times(safeSeconds);
  return creditCoins(state, gain);
}

function applyAutoTaps(state, seconds = 1, intervalSeconds = AUTO_TAP_INTERVAL_SECONDS) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
  const level = getAutoTapLevel(state);

  if (level <= 0 || safeSeconds <= 0 || intervalSeconds <= 0) {
    return { gain: new Decimal(0), taps: 0 };
  }

  state.autoTapProgress = (state.autoTapProgress ?? 0) + safeSeconds;
  const waves = Math.floor(state.autoTapProgress / intervalSeconds);

  if (waves <= 0) {
    return { gain: new Decimal(0), taps: 0 };
  }

  state.autoTapProgress -= waves * intervalSeconds;
  const taps = waves * level;
  const whiteClickEquivalents = getAutoTapWaveWhiteEquivalents(level).times(waves);
  const gain = state.perClick.times(whiteClickEquivalents);
  state.coins = state.coins.plus(gain);
  state.totalCoinsEarned = toDecimal(state.totalCoinsEarned).plus(gain);
  state.coinsThisAscension = toDecimal(state.coinsThisAscension).plus(gain);
  state.totalClicks += Number(whiteClickEquivalents.toFixed(0));

  return { gain, taps };
}

function toTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function applyOfflineProgress(state, lastSavedAt, nowMs = Date.now(), maxOfflineSeconds = Number.POSITIVE_INFINITY) {
  const savedAtMs = toTimestampMs(lastSavedAt);

  if (!savedAtMs || nowMs <= savedAtMs) {
    return { gain: new Decimal(0), elapsedSeconds: 0 };
  }

  const elapsedSeconds = Math.floor((nowMs - savedAtMs) / 1000);
  const cappedSeconds =
    Number.isFinite(maxOfflineSeconds) && maxOfflineSeconds > 0
      ? Math.max(0, Math.min(elapsedSeconds, maxOfflineSeconds))
      : Math.max(0, elapsedSeconds);
  const income = applyAutoIncome(state, cappedSeconds);
  const autoTaps = applyAutoTaps(state, cappedSeconds);
  syncAchievements(state);

  return {
    gain: income.plus(autoTaps.gain),
    elapsedSeconds: cappedSeconds,
  };
}

function runPrestige(state) {
  const tokensGained = calculateAscensionTokenGain(state.coinsThisAscension);
  if (tokensGained <= 0) {
    return { ok: false, reason: 'no-tokens', tokensGained: 0 };
  }

  state.ascensionTokens = (state.ascensionTokens | 0) + tokensGained;
  state.prestigeCount = (state.prestigeCount | 0) + 1;
  state.coins = new Decimal(0);
  state.coinsThisAscension = new Decimal(0);
  state.autoTapProgress = 0;
  state.lastAutoTaps = 0;
  state.upgrades = state.upgrades.map((upgrade) => ({ ...upgrade, level: 0 }));
  state.boosts = state.boosts.map((boost) => ({ ...boost, purchased: false }));
  recalculateState(state);
  syncAchievements(state);
  return { ok: true, tokensGained, ascensionTokens: state.ascensionTokens };
}

function serializeState(state) {
  return {
    coins: state.coins.toString(),
    totalCoinsEarned: toDecimal(state.totalCoinsEarned).toString(),
    coinsThisAscension: toDecimal(state.coinsThisAscension).toString(),
    totalClicks: state.totalClicks,
    ascensionTokens: state.ascensionTokens | 0,
    prestigeCount: state.prestigeCount | 0,
    unlockedAchievements: [...(state.unlockedAchievements ?? [])],
    autoTapProgress: state.autoTapProgress ?? 0,
    upgrades: state.upgrades.map((upgrade) => ({ id: upgrade.id, level: upgrade.level })),
    boosts: state.boosts.map((boost) => ({ id: boost.id, purchased: boost.purchased })),
    savedAt: Date.now(),
  };
}

export function createClickerController(upgrades, boosts = []) {
  const state = createInitialState(upgrades, boosts);

  return {
    state,
    hydrate(saveData, options = {}) {
      const nowMs = options.nowMs ?? Date.now();
      const maxOfflineSeconds = options.maxOfflineSeconds ?? Number.POSITIVE_INFINITY;

      mergeStateFromSave(state, saveData);
      syncAchievements(state);

      const offline = applyOfflineProgress(state, saveData?.savedAt, nowMs, maxOfflineSeconds);
      syncAchievements(state);
      return offline;
    },
    tap() {
      creditCoins(state, state.perClick);
      state.totalClicks += 1;
      syncAchievements(state);
      return state.perClick;
    },
    tick(seconds = 1) {
      const income = applyAutoIncome(state, seconds);
      const autoTaps = applyAutoTaps(state, seconds);
      state.lastAutoTaps = autoTaps.taps;
      syncAchievements(state);
      return income.plus(autoTaps.gain);
    },
    tryBuyUpgrade(upgradeId, buyAmount = 1) {
      const result = buyUpgrade(state, upgradeId, buyAmount);
      if (result.ok) {
        syncAchievements(state);
      }
      return result;
    },
    tryBuyMetaUpgrade(boostId) {
      const result = buyMetaUpgrade(state, boostId);
      if (result.ok) {
        syncAchievements(state);
      }
      return result;
    },
    tryPrestige() {
      return runPrestige(state);
    },
    getMultiplierBreakdown() {
      const stats = calculateStats(state);
      return {
        metaMultiplier: stats.metaMultiplier,
        achievementMultiplier: stats.achievementMultiplier,
        ascensionTokensMultiplier: stats.ascensionTokensMultiplier,
        productionMultiplier: stats.productionMultiplier,
        ascensionTokens: state.ascensionTokens | 0,
      };
    },
    getPrestigePreview() {
      return {
        ascensionTokens: state.ascensionTokens | 0,
        ascensionTokensGain: calculateAscensionTokenGain(state.coinsThisAscension),
        ascensionTokensMultiplier: getAscensionTokenIdleMultiplier(state.ascensionTokens | 0),
        achievementMultiplier: getAchievementIdleMultiplier(state.unlockedAchievements ?? []),
        prestigeCount: state.prestigeCount | 0,
      };
    },
    getUpgradeCost(upgradeId, buyAmount = 1) {
      const upgrade = state.upgrades.find((item) => item.id === upgradeId);
      if (!upgrade) {
        return null;
      }
      const amount = resolveBuyAmount(state, upgrade, buyAmount);
      if (amount <= 0) {
        return calculateUpgradeCost(upgrade);
      }
      return calculateBulkUpgradeCost(upgrade, amount);
    },
    getUpgradeBuyPreview(upgradeId, buyAmount = 1) {
      const upgrade = state.upgrades.find((item) => item.id === upgradeId);
      if (!upgrade) {
        return null;
      }
      const amount = resolveBuyAmount(state, upgrade, buyAmount);
      const cost = amount > 0 ? calculateBulkUpgradeCost(upgrade, amount) : calculateUpgradeCost(upgrade);
      return {
        amount,
        cost,
        canBuy: amount > 0 && state.coins.gte(cost),
      };
    },
    snapshot() {
      return serializeState(state);
    },
  };
}
