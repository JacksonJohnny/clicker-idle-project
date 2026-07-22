import { COLORS, FONT_FAMILIES } from '../config/theme.js';
import { UI_TEXT } from '../config/uiText.js';

/** Purple square currency glyph + optional label text. */
export function createAscensionTokenBadge(scene, x, y, options = {}) {
  const size = options.size ?? 14;
  const showLabel = options.showLabel !== false;
  const fontSize = options.fontSize ?? '18px';
  const color = options.color ?? COLORS.text;

  const square = scene.add
    .rectangle(x, y, size, size, COLORS.ascensionToken)
    .setStrokeStyle(1.5, COLORS.ascensionTokenBorder)
    .setOrigin(0, 0.5);

  let label = null;
  let nextX = x + size + 8;

  if (showLabel) {
    label = scene.add
      .text(nextX, y, options.label ?? UI_TEXT.ascensionTokens, {
        fontFamily: options.fontFamily ?? FONT_FAMILIES.body,
        fontSize,
        color,
        fontStyle: options.fontStyle,
      })
      .setOrigin(0, 0.5);
    nextX = label.x + label.width;
  }

  return {
    square,
    label,
    nodes: label ? [square, label] : [square],
    endX: nextX,
  };
}
