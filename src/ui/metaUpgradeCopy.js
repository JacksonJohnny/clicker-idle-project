import { formatCoins } from '../lib/clickerMath.js';
import { UI_TEXT } from '../config/uiText.js';

/** Player-facing copy for meta-upgrades (kept out of the economy module). */
export function getMetaUpgradeConditionText(meta) {
  if (meta.kind === 'generator') {
    return UI_TEXT.metaOwnGenerator
      .replace('{count}', String(meta.requiredOwned))
      .replace('{label}', meta.targetLabel ?? UI_TEXT.metaFallbackUpgrade);
  }

  if (meta.kind === 'global') {
    return UI_TEXT.metaOwnTotal.replace('{count}', String(meta.requiredTotalOwned));
  }

  if (meta.kind === 'base_multiplier') {
    return UI_TEXT.metaReachCoins.replace('{count}', formatCoins(meta.requiredTotalCoins));
  }

  if (meta.kind === 'click_per_second') {
    return UI_TEXT.metaReachTaps.replace('{count}', formatCoins(meta.requiredClicks));
  }

  return '';
}

export function getMetaUpgradeEffectText(meta) {
  if (meta.kind === 'generator') {
    return UI_TEXT.metaEffectGenerator
      .replace('{label}', meta.targetLabel ?? UI_TEXT.metaFallbackUpgrade)
      .replace('{mult}', String(meta.multiplier));
  }

  if (meta.kind === 'global' || meta.kind === 'base_multiplier') {
    return UI_TEXT.metaEffectGlobal.replace('{mult}', String(meta.multiplier));
  }

  if (meta.kind === 'click_per_second') {
    const share = meta.clickPerSecondShare ?? 0;
    return UI_TEXT.metaEffectClickPerSecond.replace('{pct}', String(share * 100));
  }

  return '';
}
