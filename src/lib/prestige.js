import Decimal from 'decimal.js';

/** Ascension Tokens gained from coins earned this ascension (soft, readable curve). */
export function calculateAscensionTokenGain(coinsThisAscension) {
  const amount = coinsThisAscension instanceof Decimal ? coinsThisAscension : new Decimal(coinsThisAscension || 0);
  if (amount.lt(1e6)) {
    return 0;
  }
  // ~1 token at 1M, ~10 at 100M, ~100 at 10B
  return Math.floor(amount.div(1e6).sqrt().toNumber());
}

/** Idle production multiplier from held Ascension Tokens (+1% each, additive). */
export function getAscensionTokenIdleMultiplier(tokens) {
  const safe = Math.max(0, tokens | 0);
  return 1 + safe * 0.01;
}
