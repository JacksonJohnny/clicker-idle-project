import { COLORS, FONT_FAMILIES } from '../config/theme.js';
import { GENERATOR_EFFICIENCY_STAR_MAX } from '../data/metaUpgrades.js';

const MIN_BUY_HIT = 44;
/** Half of row width inset (`width - 58`). */
const ROW_SIDE_INSET = 29;
/** Gap between BUY and the row's right border. */
const BUY_INNER_PAD = 10;

export function buildUpgradeListView({ scene, container, upgrades, layout, onBuy }) {
  const { rowHeight, rowGap, compactRows, listTop } = layout;
  const step = rowHeight + rowGap;
  const startY = listTop + rowHeight / 2;
  const labelFontSize = compactRows ? '20px' : '24px';
  const infoFontSize = compactRows ? '15px' : '17px';
  const buyButtonWidth = compactRows ? 112 : 124;
  const buyButtonHeight = Math.max(MIN_BUY_HIT, compactRows ? 44 : 48);
  const buyButtonX = scene.scale.width - ROW_SIDE_INSET - BUY_INNER_PAD - buyButtonWidth / 2;
  const levelX = buyButtonX - buyButtonWidth / 2 - 12;
  const infoMaxWidth = Math.max(120, levelX - 20 - 38);
  const buyFontSize = compactRows ? '15px' : '16px';
  const starFontSize = compactRows ? '14px' : '15px';

  return upgrades.map((upgrade, index) => {
    const y = startY + index * step;
    const rowBg = scene.add
      .rectangle(scene.scale.width / 2, y, scene.scale.width - 58, rowHeight, 0x133046, 0.95)
      .setStrokeStyle(2, 0x3f7ca4);
    const label = scene.add
      .text(38, y - rowHeight * 0.22, '', {
        fontFamily: FONT_FAMILIES.body,
        fontSize: labelFontSize,
        color: '#f4f7fa',
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);
    const level = scene.add
      .text(levelX, y - rowHeight * 0.22, '', {
        fontFamily: FONT_FAMILIES.body,
        fontSize: labelFontSize,
        color: '#f4f7fa',
        fontStyle: '700',
      })
      .setOrigin(1, 0.5);
    const stars = Array.from({ length: GENERATOR_EFFICIENCY_STAR_MAX }, () =>
      scene.add
        .text(0, y - rowHeight * 0.22, '★', {
          fontFamily: 'Arial, "Segoe UI Symbol", sans-serif',
          fontSize: starFontSize,
          color: '#ffd43b',
        })
        .setOrigin(0, 0.5)
        .setVisible(false),
    );
    const info = scene.add
      .text(38, y + rowHeight * 0.22, '', {
        fontFamily: FONT_FAMILIES.body,
        fontSize: infoFontSize,
        color: '#9dd7ff',
        wordWrap: { width: infoMaxWidth },
      })
      .setOrigin(0, 0.5);
    const buyButton = scene.add
      .rectangle(buyButtonX, y, buyButtonWidth, buyButtonHeight, COLORS.primary)
      .setStrokeStyle(2, COLORS.primaryBorder)
      .setInteractive({ useHandCursor: true });
    const buyText = scene.add
      .text(buyButtonX, y, 'BUY', {
        fontFamily: FONT_FAMILIES.display,
        fontSize: buyFontSize,
        color: COLORS.primaryText,
      })
      .setOrigin(0.5);

    buyButton.on('pointerdown', (pointer) => {
      buyButton.pointerDownAt = { x: pointer.x, y: pointer.y };
      scene.beginPageSwipe?.(pointer);
    });
    buyButton.on('pointerup', (pointer) => {
      const start = buyButton.pointerDownAt;
      const moved = start && Math.hypot(pointer.x - start.x, pointer.y - start.y) > 14;
      buyButton.pointerDownAt = null;
      if (!moved) {
        onBuy(upgrade);
      }
    });

    const item = { id: upgrade.id, baseY: y, rowBg, label, level, info, stars, buyButton, buyText };
    container.add([rowBg, label, level, info, ...stars, buyButton, buyText]);
    return item;
  });
}
