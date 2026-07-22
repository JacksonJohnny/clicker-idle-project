import { COLORS, FONT_FAMILIES, UI_LAYOUT } from '../config/theme.js';
import { UI_TEXT } from '../config/uiText.js';
import { formatCoins } from '../lib/clickerMath.js';
import { createAscensionTokenBadge } from './ascensionTokenBadge.js';

export function buildPrestigeView({ scene, container, onRequestPrestige }) {
  const width = scene.scale.width;
  const title = scene.add
    .text(28, UI_LAYOUT.sectionTitleY, UI_TEXT.prestigeTitle, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '24px',
      color: COLORS.accentText,
    })
    .setOrigin(0, 0.5);

  const tokenBadge = createAscensionTokenBadge(scene, 28, 310, {
    size: 16,
    fontSize: '20px',
    fontFamily: FONT_FAMILIES.display,
    color: COLORS.accentText,
  });

  const tokenCount = scene.add
    .text(tokenBadge.endX + 10, 310, '', {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '20px',
      color: COLORS.text,
      fontStyle: '800',
    })
    .setOrigin(0, 0.5);

  const summary = scene.add
    .text(28, 360, '', {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '18px',
      color: COLORS.text,
      lineSpacing: 10,
    })
    .setOrigin(0, 0);

  const hint = scene.add
    .text(28, 560, UI_TEXT.prestigeHint, {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '15px',
      color: COLORS.mutedText,
      wordWrap: { width: width - 56 },
    })
    .setOrigin(0, 0);

  const button = scene.add
    .rectangle(width / 2, 720, width - 80, 64, COLORS.primary)
    .setStrokeStyle(2, COLORS.primaryBorder)
    .setInteractive({ useHandCursor: true });
  const buttonText = scene.add
    .text(width / 2, 720, UI_TEXT.prestigeAction, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '22px',
      color: COLORS.primaryText,
    })
    .setOrigin(0.5);

  button.on('pointerup', () => onRequestPrestige());

  container.add([title, ...tokenBadge.nodes, tokenCount, summary, hint, button, buttonText]);

  return {
    title,
    tokenBadge,
    tokenCount,
    summary,
    hint,
    button,
    buttonText,
    refresh(state, preview) {
      const gain = preview.ascensionTokensGain;
      const tokens = preview.ascensionTokens;
      tokenCount.setText(`× ${tokens}`);
      summary.setText(
        [
          UI_TEXT.prestigeIdleBonus.replace('{pct}', ((preview.ascensionTokensMultiplier - 1) * 100).toFixed(0)),
          UI_TEXT.prestigeCountLabel.replace('{count}', String(preview.prestigeCount)),
          UI_TEXT.prestigeCoinsThisRun.replace('{coins}', formatCoins(state.coinsThisAscension)),
          '',
          gain > 0
            ? UI_TEXT.prestigeNowFor.replace('{count}', String(gain))
            : UI_TEXT.prestigeEarnMore,
        ].join('\n'),
      );
      const canPrestige = gain > 0;
      button.setFillStyle(canPrestige ? COLORS.primary : COLORS.disabled);
      button.setStrokeStyle(2, canPrestige ? COLORS.primaryBorder : COLORS.disabledBorder);
      buttonText.setColor(canPrestige ? COLORS.primaryText : COLORS.disabledText);
      if (button.input) {
        button.input.enabled = canPrestige;
      }
    },
  };
}
