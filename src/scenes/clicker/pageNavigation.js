import { COLORS } from '../../config/theme.js';

/** Bottom-nav order: UPGRADE → STORE → TAP → STATUS → PRESTIGE */
export const PAGE = {
  UPGRADE: 0,
  STORE: 1,
  TAP: 2,
  STATUS: 3,
  PRESTIGE: 4,
  SETTINGS: 5,
};

export const MAIN_PAGE_MAX = PAGE.PRESTIGE;
export const SETTINGS_PAGE = PAGE.SETTINGS;

export function setupPageSwipe(scene) {
  scene.input.on('pointerdown', (pointer) => {
    beginPageSwipe(scene, pointer);
  });

  scene.input.on('pointerup', (pointer) => {
    if (!scene.pageSwipeStart) {
      scene.pageSwipeStart = null;
      return;
    }

    const deltaX = pointer.x - scene.pageSwipeStart.x;
    const deltaY = pointer.y - scene.pageSwipeStart.y;
    scene.pageSwipeStart = null;

    const scroll =
      scene.activePage === PAGE.STORE
        ? scene.upgradeScroll
        : scene.activePage === PAGE.UPGRADE
          ? scene.boostScroll
          : scene.activePage === PAGE.STATUS
            ? scene.statusScroll
            : null;
    if (scroll?.lastGestureAxis === 'vertical') {
      return;
    }

    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    const direction = deltaX < 0 ? 1 : -1;
    const next = Math.min(MAIN_PAGE_MAX, Math.max(0, scene.activePage + direction));
    setActivePage(scene, next);
  });
}

export function beginPageSwipe(scene, pointer) {
  if (
    !scene.gameStarted ||
    scene.activePage === SETTINGS_PAGE ||
    scene.offlineReturn ||
    scene.confirmDialog ||
    pointer.y >= scene.navTop
  ) {
    return;
  }

  scene.pageSwipeStart = { x: pointer.x, y: pointer.y };
}

export function setActivePage(scene, index) {
  scene.holdBuy.stopUpgradeHold();
  scene.activePage = Math.min(SETTINGS_PAGE, Math.max(0, index));
  const showBoosts = scene.activePage === PAGE.UPGRADE;
  const showStore = scene.activePage === PAGE.STORE;
  const showGame = scene.activePage === PAGE.TAP;
  const showStatus = scene.activePage === PAGE.STATUS;
  const showPrestige = scene.activePage === PAGE.PRESTIGE;
  const showSettings = scene.activePage === SETTINGS_PAGE;

  scene.gamePage.setVisible(showGame);
  scene.storeTitle.setVisible(showStore);
  scene.upgradePanelBg.setVisible(showStore);
  scene.upgradeCamera.setVisible(scene.gameStarted && showStore);
  scene.upgradeScroll.setVisible(showStore);
  scene.metaUpgradesTitle.setVisible(showBoosts);
  scene.boostPanelBg.setVisible(showBoosts);
  scene.boostCamera.setVisible(scene.gameStarted && showBoosts);
  scene.boostScroll.setVisible(showBoosts);
  scene.statusPage?.setVisible(showStatus);
  scene.statusPanelBg?.setVisible(showStatus);
  scene.statusCamera?.setVisible(scene.gameStarted && showStatus);
  scene.statusScroll?.setVisible(showStatus);
  scene.prestigePage?.setVisible(showPrestige);
  scene.settingsPage.setVisible(showSettings);

  if (showBoosts) {
    scene.updateBoostListLayout();
  } else {
    scene.boostEmptyText.setVisible(false);
  }

  if (showStatus) {
    scene.refreshStatusList?.();
  }
  if (showPrestige) {
    scene.prestigeView?.refresh(scene.state, scene.engine.getPrestigePreview());
  }

  scene.settingsButtonBackground.setFillStyle(0x000000, 0);
  scene.settingsButtonBackground.setStrokeStyle(
    1.5,
    showSettings ? COLORS.accentActive : COLORS.accent,
    showSettings ? 1 : 0.9,
  );
  scene.settingsButtonIcon.setColor(showSettings ? COLORS.accentActiveText : COLORS.accentText);

  scene.navTabs.forEach((tab, tabIndex) => {
    const active = tabIndex === scene.activePage;
    tab.indicator.setVisible(active);
    tab.text.setColor(active ? COLORS.activeText : COLORS.inactiveText);
  });
}
