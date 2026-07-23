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

const MAIN_PAGE_MAX = PAGE.PRESTIGE;
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
          ? scene.metaScroll
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
  // Keep list cameras hidden while a full-screen modal owns the view.
  if (scene.offlineReturn || scene.confirmDialog) {
    scene.activePage = Math.min(SETTINGS_PAGE, Math.max(0, index));
    scene.upgradeCamera?.setVisible(false);
    scene.metaCamera?.setVisible(false);
    scene.statusCamera?.setVisible(false);
    scene.upgradeScroll?.setVisible(false);
    scene.metaScroll?.setVisible(false);
    scene.statusScroll?.setVisible(false);
    return;
  }

  scene.activePage = Math.min(SETTINGS_PAGE, Math.max(0, index));
  const showMeta = scene.activePage === PAGE.UPGRADE;
  const showStore = scene.activePage === PAGE.STORE;
  const showGame = scene.activePage === PAGE.TAP;
  const showStatus = scene.activePage === PAGE.STATUS;
  const showPrestige = scene.activePage === PAGE.PRESTIGE;
  const showSettings = scene.activePage === SETTINGS_PAGE;

  scene.gamePage.setVisible(showGame);
  scene.storeTitle.setVisible(showStore);
  scene.buyAmountBar?.setVisible(showStore);
  scene.upgradePanelBg.setVisible(showStore);
  scene.upgradeCamera.setVisible(scene.gameStarted && showStore);
  scene.upgradeScroll.setVisible(showStore);
  scene.metaUpgradesTitle.setVisible(showMeta);
  scene.metaPanelBg.setVisible(showMeta);
  scene.metaCamera.setVisible(scene.gameStarted && showMeta);
  scene.metaScroll.setVisible(showMeta);
  scene.statusPage?.setVisible(showStatus);
  scene.statusPanelBg?.setVisible(showStatus);
  scene.statusCamera?.setVisible(scene.gameStarted && showStatus);
  scene.statusScroll?.setVisible(showStatus);
  scene.prestigePage?.setVisible(showPrestige);
  scene.settingsPage.setVisible(showSettings);

  if (showMeta) {
    scene.updateMetaListLayout();
  } else {
    scene.metaEmptyText.setVisible(false);
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

  scene.navTabs.forEach((tab) => {
    if (tab.isOverflow) {
      const inOverflow = scene.activePage >= (tab.hiddenStart ?? 0);
      tab.indicator.setVisible(inOverflow && scene.activePage !== SETTINGS_PAGE);
      tab.text.setColor(inOverflow ? COLORS.activeText : COLORS.inactiveText);
      return;
    }
    const active = tab.index === scene.activePage;
    tab.indicator.setVisible(active);
    tab.text.setColor(active ? COLORS.activeText : COLORS.inactiveText);
  });
}
