import { COLORS, FONT_FAMILIES, UI_LAYOUT } from '../../config/theme.js';
import { UI_TEXT } from '../../config/uiText.js';
import { normalizeBuyAmount } from '../../config/buyAmounts.js';
import { ListScrollController } from '../../controllers/ListScrollController.js';
import { buildMetaUpgradesView } from '../../ui/metaUpgradesView.js';
import { buildStatusView } from '../../ui/statusView.js';
import { buildPrestigeView } from '../../ui/prestigeView.js';
import { buildSettingsView, buildSettingsButton } from '../../ui/settingsView.js';
import { buildBottomNavigation } from '../../ui/bottomNavigation.js';
import { buildBuyAmountBar } from '../../ui/buyAmountBar.js';
import { buildUpgradeListView } from '../../ui/upgradeListView.js';
import { setupListViewportCameras } from './viewportCameras.js';
import { PAGE } from './pageNavigation.js';

/** Shared panel metrics for full-height list pages under the section title. */
export function createFullHeightListLayout(scene, { panelTop = 294, rowHeight, rowGap = 0, panelPadding = 12 } = {}) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const panelBottomMargin = scene.navHeight + 14;
  const panelHeight = height - panelTop - panelBottomMargin;
  const panelCenterY = height - panelBottomMargin - panelHeight / 2;
  const panelTopY = panelCenterY - panelHeight / 2;
  const panelBottomY = panelCenterY + panelHeight / 2;
  const listTop = panelTopY + panelPadding;
  const listBottom = panelBottomY - panelPadding;

  return {
    rowHeight,
    rowGap,
    panelCenterY,
    panelTopY,
    panelBottomY,
    listLeft: 24,
    listWidth: width - 56,
    listTop,
    listBottom,
    visibleListHeight: listBottom - listTop,
    listHeight: 0,
    panelHeight,
  };
}

export function createStorePage(scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const compactRows = scene.state.upgrades.length > 4;
  const rowHeight = Math.max(compactRows ? 72 : 84, 72);
  const rowGap = compactRows ? 12 : 16;
  const panelPadding = 12;
  const panelTop = 330;
  const panelBottomMargin = scene.navHeight + 14;
  const maxPanelHeight = height - panelTop - panelBottomMargin;
  const listHeight = scene.state.upgrades.length * rowHeight + (scene.state.upgrades.length - 1) * rowGap;
  const minPanelHeight = rowHeight + panelPadding * 2;
  const panelHeight = Math.max(minPanelHeight, Math.min(listHeight + panelPadding * 2, maxPanelHeight));
  const panelCenterY = height - panelBottomMargin - panelHeight / 2;
  const panelTopY = panelCenterY - panelHeight / 2;
  const panelBottomY = panelCenterY + panelHeight / 2;
  const listTop = panelTopY + panelPadding;
  const listBottom = panelBottomY - panelPadding;

  scene.upgradeLayout = {
    rowHeight,
    rowGap,
    panelCenterY,
    compactRows,
    panelTopY,
    panelBottomY,
    listLeft: 24,
    listWidth: width - 56,
    listTop,
    listBottom,
    visibleListHeight: listBottom - listTop,
    listHeight,
  };

  scene.storeTitle = scene.add
    .text(28, UI_LAYOUT.sectionTitleY, UI_TEXT.storeTitle, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '24px',
      color: COLORS.accentText,
    })
    .setOrigin(0, 0.5);

  scene.buyAmountBar = buildBuyAmountBar({
    scene,
    y: 286,
    selected: normalizeBuyAmount(scene.settings.buyAmount),
    onSelect: (amount) => scene.setBuyAmount(amount),
  });
  scene.buyAmountBar.setVisible(false);

  scene.upgradePanelBg = scene.add
    .rectangle(width / 2, panelCenterY, width - 34, panelHeight, COLORS.storePanel, 0.86)
    .setStrokeStyle(2, COLORS.storePanelBorder);

  scene.upgradeContent = scene.add.container(0, 0);
  scene.upgradeItems = buildUpgradeListView({
    scene,
    container: scene.upgradeContent,
    upgrades: scene.state.upgrades,
    layout: scene.upgradeLayout,
    onBuy: (upgrade) => scene.buyStoreUpgrade(upgrade),
  });
}

export function createMetaUpgradePage(scene) {
  const width = scene.scale.width;
  const layout = createFullHeightListLayout(scene, { rowHeight: 98, rowGap: 16, panelPadding: 12 });
  scene.metaLayout = layout;

  scene.metaUpgradesTitle = scene.add
    .text(28, UI_LAYOUT.sectionTitleY, UI_TEXT.metaUpgradesTitle, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '24px',
      color: COLORS.accentText,
    })
    .setOrigin(0, 0.5);

  scene.metaPanelBg = scene.add
    .rectangle(width / 2, layout.panelCenterY, width - 34, layout.panelHeight, COLORS.storePanel, 0.86)
    .setStrokeStyle(2, COLORS.storePanelBorder);

  scene.metaEmptyText = scene.add
    .text(width / 2, layout.panelCenterY, UI_TEXT.unlockHint, {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '20px',
      color: COLORS.mutedText,
    })
    .setOrigin(0.5)
    .setVisible(false);

  scene.metaContent = scene.add.container(0, 0);
  // Persist field remains state.boosts (legacy save key).
  scene.metaItems = buildMetaUpgradesView({
    scene,
    container: scene.metaContent,
    metaUpgrades: scene.state.boosts,
    layout: scene.metaLayout,
    onPointerDown: (pointer) => scene.beginPageSwipe(pointer),
    onBuy: (meta) => scene.buyMetaUpgrade(meta),
  });
}

export function createStatusPage(scene) {
  const width = scene.scale.width;
  const layout = createFullHeightListLayout(scene, { rowHeight: 28, rowGap: 0, panelPadding: 12 });
  scene.statusLayout = layout;

  scene.statusPage = scene.add.container(0, 0).setVisible(false);
  scene.statusPanelBg = scene.add
    .rectangle(width / 2, layout.panelCenterY, width - 34, layout.panelHeight, COLORS.storePanel, 0.86)
    .setStrokeStyle(2, COLORS.storePanelBorder)
    .setVisible(false);
  scene.statusContent = scene.add.container(0, 0);
  scene.statusView = buildStatusView({
    scene,
    content: scene.statusContent,
    listTop: layout.listTop,
  });
  scene.statusPage.add(scene.statusView.title);
}

export function createPrestigePage(scene) {
  scene.prestigePage = scene.add.container(0, 0).setVisible(false);
  scene.prestigeView = buildPrestigeView({
    scene,
    container: scene.prestigePage,
    onRequestPrestige: () => scene.requestPrestige(),
  });
}

export function createSettingsChrome(scene) {
  scene.settingItems = buildSettingsView({
    scene,
    container: scene.settingsPage,
    onToggle: (settingKey) => scene.toggleSetting(settingKey),
  });
  const settingsButton = buildSettingsButton(scene, () => scene.toggleSettingsPage());
  scene.settingsButtonBackground = settingsButton.background;
  scene.settingsButtonIcon = settingsButton.icon;
  scene.navTabs = buildBottomNavigation({
    scene,
    navTop: scene.navTop,
    navHeight: scene.navHeight,
    onSelect: (index) => scene.selectPage(index),
  });
}

/** List cameras + scroll controllers for STORE / UPGRADE / STATUS. */
export function setupListInteraction(scene) {
  setupListViewportCameras(scene, [
    { key: 'upgradeCamera', content: scene.upgradeContent, layout: scene.upgradeLayout },
    { key: 'metaCamera', content: scene.metaContent, layout: scene.metaLayout },
    { key: 'statusCamera', content: scene.statusContent, layout: scene.statusLayout },
  ]);
  scene.statusCamera.setVisible(false);

  scene.upgradeScroll = new ListScrollController({
    scene,
    layout: scene.upgradeLayout,
    items: scene.upgradeItems,
    isEnabled: () => scene.gameStarted && scene.activePage === PAGE.STORE,
  });
  scene.upgradeScroll.setup();

  scene.metaScroll = new ListScrollController({
    scene,
    layout: scene.metaLayout,
    items: scene.metaItems,
    isEnabled: () => scene.gameStarted && scene.activePage === PAGE.UPGRADE,
    syncItem: (item, y) => {
      item.background.y = y;
      item.name.y = y - 22;
      item.condition.y = y + 8;
      item.effect.y = y + 30;
      item.buyButton.y = y;
      item.buyText.y = y;
    },
  });
  scene.metaScroll.setup();

  scene.statusScroll = new ListScrollController({
    scene,
    layout: scene.statusLayout,
    items: scene.statusView.items,
    isEnabled: () => scene.gameStarted && scene.activePage === PAGE.STATUS,
    syncItem: (item, y) => {
      const yy = y + (item.offsetY ?? 0);
      (item.nodes ?? [item.node]).forEach((node) => {
        node.y = yy;
      });
    },
  });
  scene.statusScroll.setup();
  scene.statusScroll.setVisible(false);
}
