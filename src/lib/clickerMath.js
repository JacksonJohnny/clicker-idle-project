import Decimal from 'decimal.js';

const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

function toDecimal(value) {
  if (value instanceof Decimal) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return new Decimal(0);
  }

  try {
    return new Decimal(value);
  } catch (error) {
    return new Decimal(0);
  }
}

function formatDecimalForSuffix(value) {
  const fixed = value.toFixed(value.gte(100) ? 0 : value.gte(10) ? 1 : 2);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function cloneUpgrades(upgrades) {
  return upgrades.map((upgrade) => ({ ...upgrade, level: 0 }));
}

export function formatCoins(value) {
  const amount = toDecimal(value);

  if (!amount.isFinite() || amount.isNaN()) {
    return '0';
  }

  if (amount.abs().lt(1000)) {
    return amount.floor().toFixed(0);
  }

  const group = Math.floor(amount.e / 3);

  if (group > 0 && group < NUMBER_SUFFIXES.length) {
    const scaled = amount.div(Decimal.pow(10, group * 3));
    return `${formatDecimalForSuffix(scaled)}${NUMBER_SUFFIXES[group]}`;
  }

  return amount.toExponential(2).replace('e+', 'e');
}

export function calculateUpgradeCost(upgrade) {
  const baseCost = toDecimal(upgrade.baseCost);
  const growth = toDecimal(upgrade.growth);
  return baseCost.times(growth.pow(upgrade.level)).floor();
}

export function calculateStats(upgrades) {
  const clickExtra = upgrades
    .filter((upgrade) => upgrade.type === 'click')
    .reduce((sum, upgrade) => sum.plus(toDecimal(upgrade.baseValue).times(upgrade.level)), new Decimal(0));

  const autoRate = upgrades
    .filter((upgrade) => upgrade.type === 'auto')
    .reduce((sum, upgrade) => sum.plus(toDecimal(upgrade.baseValue).times(upgrade.level)), new Decimal(0));

  return {
    perClick: new Decimal(1).plus(clickExtra),
    perSecond: autoRate,
  };
}

export function createInitialState(upgrades) {
  const state = {
    coins: new Decimal(0),
    totalClicks: 0,
    perClick: new Decimal(1),
    perSecond: new Decimal(0),
    upgrades: cloneUpgrades(upgrades),
  };

  return recalculateState(state);
}

export function recalculateState(state) {
  const stats = calculateStats(state.upgrades);
  state.perClick = stats.perClick;
  state.perSecond = stats.perSecond;
  return state;
}

export function mergeStateFromSave(state, loaded) {
  if (!loaded) {
    return state;
  }

  state.coins = loaded.coins !== undefined ? toDecimal(loaded.coins) : state.coins;
  state.totalClicks = Number.isFinite(Number(loaded.totalClicks)) ? Number(loaded.totalClicks) : state.totalClicks;

  state.upgrades = state.upgrades.map((upgrade) => {
    const existing = loaded.upgrades?.find((entry) => entry.id === upgrade.id);
    const level = Number.isFinite(Number(existing?.level)) ? Math.max(0, Number(existing.level)) : 0;
    return existing ? { ...upgrade, level } : upgrade;
  });

  return recalculateState(state);
}

export function buyUpgrade(state, upgradeId) {
  const upgrade = state.upgrades.find((item) => item.id === upgradeId);

  if (!upgrade) {
    return { ok: false, reason: 'missing-upgrade' };
  }

  const cost = calculateUpgradeCost(upgrade);

  if (state.coins.lt(cost)) {
    return { ok: false, reason: 'insufficient-coins', cost };
  }

  state.coins = state.coins.minus(cost);
  upgrade.level += 1;
  recalculateState(state);

  return { ok: true, cost };
}

export function applyAutoIncome(state, seconds = 1) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;

  if (state.perSecond.lte(0) || safeSeconds <= 0) {
    return new Decimal(0);
  }

  const gain = state.perSecond.times(safeSeconds);
  state.coins = state.coins.plus(gain);
  return gain;
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

export function applyOfflineProgress(state, lastSavedAt, nowMs = Date.now(), maxOfflineSeconds = 8 * 60 * 60) {
  const savedAtMs = toTimestampMs(lastSavedAt);

  if (!savedAtMs || nowMs <= savedAtMs) {
    return { gain: new Decimal(0), elapsedSeconds: 0 };
  }

  const elapsedSeconds = Math.floor((nowMs - savedAtMs) / 1000);
  const cappedSeconds = Math.max(0, Math.min(elapsedSeconds, maxOfflineSeconds));
  const gain = applyAutoIncome(state, cappedSeconds);

  return {
    gain,
    elapsedSeconds: cappedSeconds,
  };
}

export function serializeState(state) {
  return {
    coins: state.coins.toString(),
    totalClicks: state.totalClicks,
    upgrades: state.upgrades.map((upgrade) => ({ id: upgrade.id, level: upgrade.level })),
    savedAt: Date.now(),
  };
}

export function createClickerController(upgrades) {
  const state = createInitialState(upgrades);

  return {
    state,
    hydrate(saveData, options = {}) {
      const nowMs = options.nowMs ?? Date.now();
      const maxOfflineSeconds = options.maxOfflineSeconds ?? 8 * 60 * 60;

      mergeStateFromSave(state, saveData);

      const offline = applyOfflineProgress(state, saveData?.savedAt, nowMs, maxOfflineSeconds);
      return offline;
    },
    tap() {
      state.coins = state.coins.plus(state.perClick);
      state.totalClicks += 1;
      return state.perClick;
    },
    tick(seconds = 1) {
      return applyAutoIncome(state, seconds);
    },
    tryBuyUpgrade(upgradeId) {
      return buyUpgrade(state, upgradeId);
    },
    getUpgradeCost(upgradeId) {
      const upgrade = state.upgrades.find((item) => item.id === upgradeId);
      return upgrade ? calculateUpgradeCost(upgrade) : null;
    },
    snapshot() {
      return serializeState(state);
    },
  };
}
