import { COLORS, FONT_FAMILIES } from '../config/theme.js';
import { BUY_AMOUNT_OPTIONS, buyAmountLabel } from '../config/buyAmounts.js';

const MIN_HIT = 44;

/** Row of ×1 / ×10 / ×25 / MAX selectors for the STORE page. */
export function buildBuyAmountBar({ scene, y, selected, onSelect }) {
  const width = scene.scale.width;
  const padding = 28;
  const gap = 10;
  const count = BUY_AMOUNT_OPTIONS.length;
  const inner = width - padding * 2;
  const buttonWidth = Math.max(MIN_HIT, (inner - gap * (count - 1)) / count);
  const buttonHeight = Math.max(MIN_HIT, 44);
  const startX = padding + buttonWidth / 2;

  const buttons = BUY_AMOUNT_OPTIONS.map((amount, index) => {
    const x = startX + index * (buttonWidth + gap);
    const background = scene.add
      .rectangle(x, y, buttonWidth, buttonHeight, COLORS.panel)
      .setStrokeStyle(2, COLORS.panelBorder)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(x, y, buyAmountLabel(amount), {
        fontFamily: FONT_FAMILIES.display,
        fontSize: '16px',
        color: COLORS.inactiveText,
      })
      .setOrigin(0.5);

    background.on('pointerup', () => onSelect(amount));
    return { amount, background, label };
  });

  function refresh(nextSelected) {
    buttons.forEach((button) => {
      const active = button.amount === nextSelected;
      button.background.setFillStyle(active ? COLORS.primary : COLORS.panel);
      button.background.setStrokeStyle(2, active ? COLORS.primaryBorder : COLORS.panelBorder);
      button.label.setColor(active ? COLORS.primaryText : COLORS.inactiveText);
    });
  }

  refresh(selected);

  return {
    buttons,
    nodes: buttons.flatMap((button) => [button.background, button.label]),
    setVisible(visible) {
      buttons.forEach((button) => {
        button.background.setVisible(visible);
        button.label.setVisible(visible);
      });
    },
    refresh,
  };
}
