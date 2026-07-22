import { formatCoins } from '../lib/clickerMath.js';
import { UI_TEXT } from '../config/uiText.js';

/** Player-facing copy for meta-upgrades (kept out of the economy module). */
export function getMetaUpgradeConditionText(boost) {
  if (boost.kind === 'generator') {
    return UI_TEXT.metaOwnGenerator
      .replace('{count}', String(boost.requiredOwned))
      .replace('{label}', boost.targetLabel ?? UI_TEXT.metaFallbackUpgrade);
  }

  if (boost.kind === 'global') {
    return UI_TEXT.metaOwnTotal.replace('{count}', String(boost.requiredTotalOwned));
  }

  if (boost.kind === 'base_multiplier') {
    return UI_TEXT.metaReachCoins.replace('{count}', formatCoins(boost.requiredTotalCoins));
  }

  if (boost.kind === 'click_per_second') {
    return UI_TEXT.metaReachTaps.replace('{count}', formatCoins(boost.requiredClicks));
  }

  return '';
}

export function getMetaUpgradeEffectText(boost) {
  if (boost.kind === 'generator') {
    return UI_TEXT.metaEffectGenerator
      .replace('{label}', boost.targetLabel ?? UI_TEXT.metaFallbackUpgrade)
      .replace('{mult}', String(boost.multiplier));
  }

  if (boost.kind === 'global' || boost.kind === 'base_multiplier') {
    return UI_TEXT.metaEffectGlobal.replace('{mult}', String(boost.multiplier));
  }

  if (boost.kind === 'click_per_second') {
    const share = boost.clickPerSecondShare ?? 0;
    return UI_TEXT.metaEffectClickPerSecond.replace('{pct}', String(share * 100));
  }

  return '';
}
