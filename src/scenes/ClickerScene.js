import Phaser from 'phaser';
import { CLICKER_UPGRADES } from '../data/upgrades.js';
import { MILESTONE_BOOSTS } from '../data/boosts.js';
import { createClickerController, formatCoins, getReachedMilestones, isUpgradeUnlocked } from '../lib/clickerMath.js';
import { LOOP_CONFIG, SCENE_KEY } from '../config/gameConfig.js';
import { loadGameState, saveGameState } from '../services/saveStorage.js';

function formatOfflineDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export class ClickerScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY);
  }

  create() {
    this.engine = createClickerController(CLICKER_UPGRADES, MILESTONE_BOOSTS);
    const loadedState = loadGameState();
    const hasSave = !!loadedState;
    const offline = this.engine.hydrate(loadedState, {
      nowMs: Date.now(),
      maxOfflineSeconds: LOOP_CONFIG.maxOfflineSeconds,
    });
    this.state = this.engine.state;
    this.gameStarted = hasSave;

    const width = this.scale.width;
    const height = this.scale.height;

    this.activePage = 0;
    this.navHeight = 86;
    this.navTop = height - this.navHeight;
    this.tapCenterY = 495;
    this.gamePage = this.add.container(0, 0);
    this.boostsPage = this.add.container(0, 0);

    this.add.rectangle(width / 2, height / 2, width, height, 0x081018, 0.2);

    this.titleText = this.add
      .text(width / 2, 48, 'CLICKER GAME', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '38px',
        color: '#ffd166',
        stroke: '#9f5f00',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, 134, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '52px',
        color: '#ffffff',
        fontStyle: '800',
      })
      .setOrigin(0.5);

    this.statsText = this.add
      .text(width / 2, 202, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '24px',
        color: '#9bd3ff',
      })
      .setOrigin(0.5);

    this.coreGlow = this.add.circle(width / 2, this.tapCenterY, 136, 0xffc04d, 0.18);
    const coreRing = this.add.circle(width / 2, this.tapCenterY, 124, 0xffb000, 0.12).setStrokeStyle(3, 0xffc857, 0.5);
    this.coreButton = this.add.circle(width / 2, this.tapCenterY, 116, 0xe98600).setInteractive({ useHandCursor: true });
    const coreInner = this.add.circle(width / 2, this.tapCenterY, 84, 0xe0b552);

    this.buttonLabel = this.add
      .text(width / 2, this.tapCenterY, 'TAP', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '46px',
        color: '#6c3200',
      })
      .setOrigin(0.5);

    const tapHint = this.add
      .text(width / 2, 650, 'Tap to earn coins', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '22px',
        color: '#c9d6df',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    this.tapButtonVisuals = [coreRing, this.coreButton, coreInner, this.buttonLabel];
    this.gamePage.add([this.coreGlow, ...this.tapButtonVisuals, tapHint]);

    this.coreButton.on('pointerdown', (pointer) => {
      this.corePointerDown = { x: pointer.x, y: pointer.y };
      this.beginPageSwipe(pointer);
    });

    this.coreButton.on('pointerup', (pointer) => {
      const moved = this.corePointerDown && Phaser.Math.Distance.Between(this.corePointerDown.x, this.corePointerDown.y, pointer.x, pointer.y) > 14;
      this.corePointerDown = null;

      if (!this.gameStarted || moved || this.activePage !== 0) {
        return;
      }

      const gain = this.engine.tap();
      this.tapButtonVisuals.forEach((object) => object.setScale(0.94));
      this.tweens.add({
        targets: this.tapButtonVisuals,
        scale: 1,
        duration: 120,
        ease: 'Back.Out',
      });
      this.spawnFloatingText(`+${formatCoins(gain)}`, '#ffffff', this.tapCenterY);
      this.renderState();
    });

    const compactRows = this.state.upgrades.length > 4;
    const rowHeight = compactRows ? 72 : 84;
    const rowGap = compactRows ? 12 : 16;
    const panelPadding = 12;
    const panelTop = 270;
    const panelBottomMargin = this.navHeight + 14;
    const maxPanelHeight = height - panelTop - panelBottomMargin;
    const listHeight = this.state.upgrades.length * rowHeight + (this.state.upgrades.length - 1) * rowGap;
    const minPanelHeight = rowHeight + panelPadding * 2;
    const panelHeight = Math.max(minPanelHeight, Math.min(listHeight + panelPadding * 2, maxPanelHeight));
    const panelCenterY = height - panelBottomMargin - panelHeight / 2;
    const panelTopY = panelCenterY - panelHeight / 2;
    const panelBottomY = panelCenterY + panelHeight / 2;
    const listLeft = 24;
    const listWidth = width - 56;
    const listTop = panelTopY + panelPadding;
    const listBottom = panelBottomY - panelPadding;
    const visibleListHeight = listBottom - listTop;

    this.upgradeLayout = {
      rowHeight,
      rowGap,
      panelCenterY,
      compactRows,
      panelTopY,
      panelBottomY,
      listLeft,
      listWidth,
      listTop,
      listBottom,
      visibleListHeight,
      listHeight,
    };

    this.storeTitle = this.add
      .text(28, 224, 'GENERATORS', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '26px',
        color: '#ffd166',
      })
      .setOrigin(0, 0.5);

    this.upgradePanelBg = this.add.rectangle(width / 2, panelCenterY, width - 34, panelHeight, 0x0f1f2d, 0.86).setStrokeStyle(2, 0x2a5472);

    this.upgradeContent = this.add.container(0, 0);

    this.upgradeItems = [];
    this.buildUpgradeList();
    this.buildBoostsPage();
    this.buildBottomNavigation();
    this.setupUpgradeViewportCamera();
    this.setupUpgradeScroll();
    this.setupPageSwipe();
    this.setActivePage(0);

    this.time.addEvent({
      delay: LOOP_CONFIG.autoIncomeDelayMs,
      loop: true,
      callback: () => {
        if (!this.gameStarted) {
          return;
        }

        const gain = this.engine.tick();
        if (gain.gt(0)) {
          this.spawnFloatingText(`+${formatCoins(gain)}`, '#9df4a3', 300);
          this.renderState();
        }
      },
    });

    this.time.addEvent({
      delay: LOOP_CONFIG.autoSaveDelayMs,
      loop: true,
      callback: () => {
        if (!this.gameStarted) {
          return;
        }

        this.persist();
      },
    });

    this.input.on('gameout', () => {
      if (this.gameStarted) {
        this.persist();
      }
    });
    window.addEventListener('beforeunload', () => {
      if (this.gameStarted) {
        this.persist();
      }
    });

    this.renderState();

    if (!this.gameStarted) {
      this.showStartOverlay();
    }

    if (offline.gain.gt(0)) {
      this.persist();
      this.showOfflineReturn(offline);
    }

    this.tweens.add({
      targets: [this.coreGlow],
      alpha: { from: 0.2, to: 0.42 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  buildUpgradeList() {
    const { rowHeight, rowGap, compactRows, listTop } = this.upgradeLayout;
    const step = rowHeight + rowGap;
    const startY = listTop + rowHeight / 2;
    const labelFontSize = compactRows ? '20px' : '24px';
    const infoFontSize = compactRows ? '16px' : '20px';
    const buyButtonWidth = compactRows ? 130 : 146;
    const buyButtonHeight = compactRows ? 48 : 56;
    const buyButtonX = this.scale.width - buyButtonWidth / 2 - 34;
    const buyFontSize = compactRows ? '18px' : '20px';

    this.state.upgrades.forEach((upgrade, index) => {
      const y = startY + index * step;
      const rowBg = this.add.rectangle(this.scale.width / 2, y, this.scale.width - 58, rowHeight, 0x133046, 0.95).setStrokeStyle(2, 0x3f7ca4);
      const label = this.add
        .text(38, y - rowHeight * 0.22, '', {
          fontFamily: 'Nunito, sans-serif',
          fontSize: labelFontSize,
          color: '#f4f7fa',
          fontStyle: '700',
        })
        .setOrigin(0, 0.5);

      const info = this.add
        .text(38, y + rowHeight * 0.22, '', {
          fontFamily: 'Nunito, sans-serif',
          fontSize: infoFontSize,
          color: '#9dd7ff',
        })
        .setOrigin(0, 0.5);

      const stars = (upgrade.milestones ?? []).map(() =>
        this.add
          .text(0, y - rowHeight * 0.22, '★', {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '15px',
            color: '#ffd43b',
          })
          .setOrigin(0, 0.5)
          .setVisible(false),
      );

      const buyButton = this.add.rectangle(buyButtonX, y, buyButtonWidth, buyButtonHeight, 0x2da1ff).setStrokeStyle(2, 0x94d4ff).setInteractive({ useHandCursor: true });
      const buyText = this.add
        .text(buyButtonX, y, 'BUY', {
          fontFamily: 'Bungee, sans-serif',
          fontSize: buyFontSize,
          color: '#05203a',
        })
        .setOrigin(0.5);

      buyButton.on('pointerdown', (pointer) => {
        buyButton.pointerDownAt = { x: pointer.x, y: pointer.y };
        this.beginPageSwipe(pointer);
      });

      buyButton.on('pointerup', (pointer) => {
        const moved = buyButton.pointerDownAt && Phaser.Math.Distance.Between(buyButton.pointerDownAt.x, buyButton.pointerDownAt.y, pointer.x, pointer.y) > 14;
        buyButton.pointerDownAt = null;

        if (!this.gameStarted || moved || this.activePage !== 1) {
          return;
        }

        this.tryBuyUpgrade(upgrade.id);
      });

      this.upgradeItems.push({
        id: upgrade.id,
        baseY: y,
        rowBg,
        label,
        info,
        stars,
        buyButton,
        buyText,
      });

      this.upgradeContent.add([rowBg, label, info, ...stars, buyButton, buyText]);
    });
  }

  buildBoostsPage() {
    const width = this.scale.width;
    const title = this.add
      .text(28, 224, 'MILESTONE BOOSTS', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '26px',
        color: '#ffd166',
      })
      .setOrigin(0, 0.5);

    const objects = [title];
    this.boostItems = [];
    this.state.boosts.forEach((boost, index) => {
      const y = 320 + index * 122;
      const background = this.add.rectangle(width / 2, y, width - 48, 98, 0x13293a, 0.96).setStrokeStyle(2, 0x3f6178);
      const name = this.add
        .text(44, y - 19, boost.name, {
          fontFamily: 'Bungee, sans-serif',
          fontSize: '21px',
          color: '#e8f5ff',
        })
        .setOrigin(0, 0.5);
      const condition = this.add
        .text(44, y + 21, '', {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '18px',
          color: '#8ca7b9',
        })
        .setOrigin(0, 0.5);
      const buyButton = this.add
        .rectangle(width - 104, y, 148, 58, 0x2da1ff)
        .setStrokeStyle(2, 0x94d4ff)
        .setInteractive({ useHandCursor: true });
      const buyText = this.add
        .text(width - 104, y, '', {
          fontFamily: 'Bungee, sans-serif',
          fontSize: '17px',
          color: '#05203a',
        })
        .setOrigin(0.5);

      buyButton.on('pointerdown', (pointer) => {
        buyButton.pointerDownAt = { x: pointer.x, y: pointer.y };
        this.beginPageSwipe(pointer);
      });
      buyButton.on('pointerup', (pointer) => {
        const moved = buyButton.pointerDownAt && Phaser.Math.Distance.Between(buyButton.pointerDownAt.x, buyButton.pointerDownAt.y, pointer.x, pointer.y) > 14;
        buyButton.pointerDownAt = null;

        if (!this.gameStarted || moved || this.activePage !== 2) {
          return;
        }

        const result = this.engine.tryBuyBoost(boost.id);
        if (!result.ok) {
          this.cameras.main.shake(120, 0.004);
          return;
        }

        this.spawnFloatingText(`PRODUCTION x${boost.multiplier}`, '#9df4a3', 520);
        this.renderState();
        this.persist();
      });

      this.boostItems.push({ id: boost.id, background, name, condition, buyButton, buyText });
      objects.push(background, name, condition, buyButton, buyText);
    });

    this.boostsPage.add(objects);
  }

  buildBottomNavigation() {
    const width = this.scale.width;
    const tabs = ['JOGO', 'LOJA', 'BOOSTS', 'INFO'];
    const tabWidth = width / tabs.length;

    this.navContainer = this.add.container(0, 0).setDepth(1000);
    const background = this.add.rectangle(width / 2, this.navTop + this.navHeight / 2, width, this.navHeight, 0x09131c, 0.98).setStrokeStyle(2, 0x28485f);
    this.navContainer.add(background);
    this.navTabs = [];

    tabs.forEach((label, index) => {
      const x = tabWidth * index + tabWidth / 2;
      const indicator = this.add.rectangle(x, this.navTop + 6, tabWidth - 24, 4, 0xffc857).setOrigin(0.5, 0);
      const hitArea = this.add.zone(x, this.navTop + this.navHeight / 2, tabWidth, this.navHeight).setInteractive({ useHandCursor: true });
      const text = this.add
        .text(x, this.navTop + 47, label, {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '18px',
          color: '#8296a5',
          fontStyle: '800',
        })
        .setOrigin(0.5);

      hitArea.on('pointerup', () => {
        if (!this.gameStarted) {
          return;
        }

        if (index === 3) {
          this.showMoreSheet();
          return;
        }

        this.setActivePage(index);
      });

      this.navTabs.push({ indicator, text });
      this.navContainer.add([indicator, hitArea, text]);
    });
  }

  setupUpgradeViewportCamera() {
    const { listLeft, listTop, listWidth, visibleListHeight } = this.upgradeLayout;

    this.cameras.main.ignore(this.upgradeContent);

    this.upgradeCamera = this.cameras.add(listLeft, listTop, listWidth, visibleListHeight);
    this.upgradeCamera.setBackgroundColor('rgba(0,0,0,0)');
    this.upgradeCamera.setScroll(listLeft, listTop);

    const mainObjects = this.children.list.filter((obj) => obj !== this.upgradeContent);
    this.upgradeCamera.ignore(mainObjects);
  }

  setupUpgradeScroll() {
    const { visibleListHeight, listHeight, listTop, panelTopY, panelBottomY } = this.upgradeLayout;

    this.upgradeScrollOffset = 0;
    this.maxUpgradeScroll = Math.max(0, listHeight - visibleListHeight);
    this.isDraggingUpgradeList = false;
    this.activeUpgradePointerId = null;
    this.lastUpgradePointerY = 0;

    const trackX = this.scale.width - 16;
    this.scrollTrack = this.add
      .rectangle(trackX, (panelTopY + panelBottomY) / 2, 8, visibleListHeight, 0x0b2233, 0.9)
      .setStrokeStyle(1, 0x2f5f7c, 0.9);

    const thumbHeight = this.maxUpgradeScroll > 0 ? Math.max(40, visibleListHeight * (visibleListHeight / listHeight)) : visibleListHeight;
    this.scrollThumbHeight = thumbHeight;
    this.scrollThumb = this.add
      .rectangle(trackX, listTop + thumbHeight / 2, 12, thumbHeight, 0x76c5ff, 0.95)
      .setStrokeStyle(1, 0xb5e5ff, 1)
      .setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(this.scrollThumb);
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject !== this.scrollThumb || this.maxUpgradeScroll <= 0) {
        return;
      }

      const minY = listTop + this.scrollThumbHeight / 2;
      const maxY = listTop + visibleListHeight - this.scrollThumbHeight / 2;
      const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);
      gameObject.y = clampedY;

      const ratio = (clampedY - minY) / Math.max(1, maxY - minY);
      this.upgradeScrollOffset = ratio * this.maxUpgradeScroll;
      this.updateUpgradeScroll();
    });

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.gameStarted || !this.isPointerInsideUpgradePanel(pointer) || this.maxUpgradeScroll <= 0) {
        return;
      }

      this.setUpgradeScroll(this.upgradeScrollOffset + deltaY * 0.7);
    });

    this.input.on('pointerdown', (pointer) => {
      if (!this.gameStarted || !this.isPointerInsideUpgradePanel(pointer) || this.maxUpgradeScroll <= 0) {
        return;
      }

      const thumbBounds = this.scrollThumb.getBounds();
      if (thumbBounds.contains(pointer.x, pointer.y)) {
        return;
      }

      this.isDraggingUpgradeList = true;
      this.activeUpgradePointerId = pointer.id;
      this.lastUpgradePointerY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.isDraggingUpgradeList || !pointer.isDown || pointer.id !== this.activeUpgradePointerId) {
        return;
      }

      const deltaY = pointer.y - this.lastUpgradePointerY;
      this.lastUpgradePointerY = pointer.y;
      this.setUpgradeScroll(this.upgradeScrollOffset - deltaY);
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id !== this.activeUpgradePointerId) {
        return;
      }

      this.isDraggingUpgradeList = false;
      this.activeUpgradePointerId = null;
    });

    this.updateUpgradeScroll();
  }

  setupPageSwipe() {
    this.input.on('pointerdown', (pointer) => {
      this.beginPageSwipe(pointer);
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.pageSwipeStart || this.moreSheet) {
        this.pageSwipeStart = null;
        return;
      }

      const deltaX = pointer.x - this.pageSwipeStart.x;
      const deltaY = pointer.y - this.pageSwipeStart.y;
      this.pageSwipeStart = null;

      if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
        return;
      }

      const direction = deltaX < 0 ? 1 : -1;
      this.setActivePage(Phaser.Math.Clamp(this.activePage + direction, 0, 2));
    });
  }

  beginPageSwipe(pointer) {
    if (!this.gameStarted || this.moreSheet || this.offlineReturn || pointer.y >= this.navTop) {
      return;
    }

    this.pageSwipeStart = { x: pointer.x, y: pointer.y };
  }

  setActivePage(index) {
    this.activePage = Phaser.Math.Clamp(index, 0, 2);
    const showGame = this.activePage === 0;
    const showStore = this.activePage === 1;
    const showBoosts = this.activePage === 2;

    this.gamePage.setVisible(showGame);
    this.storeTitle.setVisible(showStore);
    this.upgradePanelBg.setVisible(showStore);
    this.upgradeCamera.setVisible(this.gameStarted && showStore);
    this.scrollTrack.setVisible(showStore);
    this.scrollThumb.setVisible(showStore);
    this.boostsPage.setVisible(showBoosts);

    this.navTabs.forEach((tab, tabIndex) => {
      const active = tabIndex === this.activePage;
      tab.indicator.setVisible(active);
      tab.text.setColor(active ? '#f6fbff' : '#8296a5');
    });
  }

  showMoreSheet() {
    if (this.moreSheet) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const sheetHeight = 350;
    const sheetTop = height - sheetHeight;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x02070b, 0.62).setInteractive();
    const panel = this.add.rectangle(width / 2, height - sheetHeight / 2, width, sheetHeight, 0x102230, 1).setStrokeStyle(2, 0x3f718f);
    const handle = this.add.rectangle(width / 2, sheetTop + 18, 62, 6, 0x7694a7);
    const title = this.add
      .text(30, sheetTop + 58, 'YOUR RUN', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '28px',
        color: '#ffd166',
      })
      .setOrigin(0, 0.5);
    const stats = this.add
      .text(30, sheetTop + 112, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '22px',
        color: '#dcecf7',
        lineSpacing: 14,
      });
    const closeText = this.add
      .text(width / 2, sheetTop + 306, 'CLOSE', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '20px',
        color: '#b9d0df',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    stats.setText([
      `Coins: ${formatCoins(this.state.coins)}`,
      `Per second: ${formatCoins(this.state.perSecond)}`,
      `Per tap: ${formatCoins(this.state.perClick)}`,
      `Total taps: ${this.state.totalClicks.toLocaleString()}`,
    ]);

    const sheetContent = this.add.container(0, 0, [panel, handle, title, stats, closeText]);
    this.moreSheet = this.add.container(0, 0, [overlay, sheetContent]).setDepth(2000);
    this.upgradeCamera.ignore(this.moreSheet);

    const close = () => this.hideMoreSheet();
    overlay.on('pointerup', close);
    closeText.on('pointerup', close);
  }

  hideMoreSheet() {
    if (!this.moreSheet) {
      return;
    }

    this.moreSheet.destroy(true);
    this.moreSheet = null;
  }

  showOfflineReturn(offline) {
    if (this.offlineReturn) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x03080d, 0.78).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, width - 48, 380, 0x102635, 1).setStrokeStyle(3, 0x4a8eb7);
    const title = this.add
      .text(width / 2, height / 2 - 128, 'WELCOME BACK', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '32px',
        color: '#ffd166',
      })
      .setOrigin(0.5);
    const awayText = this.add
      .text(width / 2, height / 2 - 68, `Away for ${formatOfflineDuration(offline.elapsedSeconds)}`, {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '23px',
        color: '#b8d4e5',
      })
      .setOrigin(0.5);
    const earningsLabel = this.add
      .text(width / 2, height / 2 - 12, 'OFFLINE EARNINGS', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '18px',
        color: '#79a8c5',
        fontStyle: '800',
      })
      .setOrigin(0.5);
    const earnings = this.add
      .text(width / 2, height / 2 + 34, `+${formatCoins(offline.gain)} coins`, {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '30px',
        color: '#9df4a3',
      })
      .setOrigin(0.5);
    const continueButton = this.add.rectangle(width / 2, height / 2 + 120, width - 104, 66, 0x2da1ff).setStrokeStyle(2, 0x94d4ff).setInteractive({ useHandCursor: true });
    const continueText = this.add
      .text(width / 2, height / 2 + 120, 'CONTINUE', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '22px',
        color: '#05203a',
      })
      .setOrigin(0.5);

    this.offlineReturn = this.add.container(0, 0, [overlay, panel, title, awayText, earningsLabel, earnings, continueButton, continueText]).setDepth(3000);
    this.upgradeCamera.ignore(this.offlineReturn);

    continueButton.on('pointerup', () => {
      this.offlineReturn?.destroy(true);
      this.offlineReturn = null;
    });
  }

  isPointerInsideUpgradePanel(pointer) {
    const panelLeft = this.upgradePanelBg.x - this.upgradePanelBg.width / 2;
    const panelRight = this.upgradePanelBg.x + this.upgradePanelBg.width / 2;

    return pointer.x >= panelLeft && pointer.x <= panelRight && pointer.y >= this.upgradeLayout.panelTopY && pointer.y <= this.upgradeLayout.panelBottomY;
  }

  setUpgradeScroll(nextValue) {
    this.upgradeScrollOffset = Phaser.Math.Clamp(nextValue, 0, this.maxUpgradeScroll);
    this.updateUpgradeScroll();
  }

  updateUpgradeScroll() {
    const { rowHeight, visibleListHeight, listTop } = this.upgradeLayout;

    this.upgradeScrollOffset = Phaser.Math.Clamp(this.upgradeScrollOffset, 0, this.maxUpgradeScroll);

    this.upgradeItems.forEach((item) => {
      const y = item.baseY - this.upgradeScrollOffset;

      item.rowBg.y = y;
      item.label.y = y - rowHeight * 0.22;
      item.info.y = y + rowHeight * 0.22;
      item.stars.forEach((star) => {
        star.y = y - rowHeight * 0.22;
      });
      item.buyButton.y = y;
      item.buyText.y = y;
    });

    if (this.maxUpgradeScroll <= 0) {
      this.scrollTrack.setAlpha(0);
      this.scrollThumb.setAlpha(0);
      this.scrollThumb.y = listTop + visibleListHeight / 2;
      return;
    }

    this.scrollTrack.setAlpha(1);
    this.scrollThumb.setAlpha(1);

    const minY = listTop + this.scrollThumbHeight / 2;
    const maxY = listTop + visibleListHeight - this.scrollThumbHeight / 2;
    const ratio = this.upgradeScrollOffset / this.maxUpgradeScroll;
    this.scrollThumb.y = minY + ratio * (maxY - minY);
  }

  tryBuyUpgrade(upgradeId) {
    if (!this.gameStarted) {
      return;
    }

    const result = this.engine.tryBuyUpgrade(upgradeId);

    if (!result.ok) {
      this.cameras.main.shake(120, 0.004);
      return;
    }

    if (result.milestoneReached) {
      this.spawnFloatingText('★ GENERATOR x2', '#ffd43b', 300);
    }

    this.renderState();
  }

  spawnFloatingText(text, color = '#ffffff', y = 355) {
    const floatText = this.add
      .text(this.scale.width / 2, y, text, {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '34px',
        color,
        fontStyle: '800',
      })
      .setOrigin(0.5);

    if (this.upgradeCamera) {
      this.upgradeCamera.ignore(floatText);
    }

    this.tweens.add({
      targets: floatText,
      y: y - 70,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.Out',
      onComplete: () => floatText.destroy(),
    });
  }

  renderState() {
    this.coinsText.setText(`${formatCoins(this.state.coins)} coins`);
    this.statsText.setText(`per tap: ${formatCoins(this.state.perClick)} | per second: ${formatCoins(this.state.perSecond)}`);

    this.updateUpgradeListLayout();

    this.upgradeItems.forEach((item) => {
      const upgrade = this.state.upgrades.find((entry) => entry.id === item.id);
      const cost = this.engine.getUpgradeCost(item.id);
      const canBuy = this.state.coins.gte(cost);
      const effectLabel = upgrade.type === 'click' ? `+${upgrade.baseValue} tap power` : `+${upgrade.baseValue} per second`;

      item.label.setText(`${upgrade.label} Lv.${upgrade.level}`);
      item.info.setText(`${effectLabel}  |  cost ${formatCoins(cost)}`);

      const reachedMilestones = getReachedMilestones(upgrade);
      item.stars.forEach((star, index) => {
        star.setVisible(index < reachedMilestones.length && item.rowBg.visible);
        star.x = item.label.x + item.label.width + 8 + index * 17;
      });

      item.buyButton.setFillStyle(canBuy ? 0x2da1ff : 0x51718a);
      item.buyText.setColor(canBuy ? '#05203a' : '#bcc9d4');
    });

    const highestGeneratorLevel = this.state.upgrades
      .filter((upgrade) => upgrade.type === 'auto')
      .reduce((highest, upgrade) => Math.max(highest, upgrade.level), 0);

    this.boostItems.forEach((item) => {
      const boost = this.state.boosts.find((entry) => entry.id === item.id);
      const unlocked = highestGeneratorLevel >= boost.requiredLevel;
      const canBuy = unlocked && !boost.purchased && this.state.coins.gte(boost.cost);

      item.condition.setText(boost.purchased ? `Active · Production x${boost.multiplier}` : `Requires generator Lv.${boost.requiredLevel}`);
      item.condition.setColor(boost.purchased ? '#9df4a3' : '#8ca7b9');
      item.buyText.setText(boost.purchased ? 'OWNED' : unlocked ? formatCoins(boost.cost) : 'LOCKED');
      item.buyButton.setFillStyle(boost.purchased ? 0x276749 : canBuy ? 0x2da1ff : 0x455f70);
      item.buyButton.setStrokeStyle(2, boost.purchased ? 0x65bd8f : canBuy ? 0x94d4ff : 0x6f8796);
      item.buyText.setColor(boost.purchased ? '#d8ffe9' : canBuy ? '#05203a' : '#b5c3cc');
    });
  }

  updateUpgradeListLayout() {
    const { rowHeight, rowGap, listTop, visibleListHeight } = this.upgradeLayout;
    const step = rowHeight + rowGap;
    let visibleIndex = 0;

    this.upgradeItems.forEach((item) => {
      const upgrade = this.state.upgrades.find((entry) => entry.id === item.id);
      const unlocked = isUpgradeUnlocked(upgrade, this.state.upgrades);
      const objects = [item.rowBg, item.label, item.info, ...item.stars, item.buyButton, item.buyText];

      objects.forEach((object) => object.setVisible(unlocked));
      if (item.buyButton.input) {
        item.buyButton.input.enabled = unlocked;
      }

      if (unlocked) {
        item.baseY = listTop + rowHeight / 2 + visibleIndex * step;
        visibleIndex += 1;
      }
    });

    const listHeight = visibleIndex > 0 ? visibleIndex * rowHeight + (visibleIndex - 1) * rowGap : 0;
    this.upgradeLayout.listHeight = listHeight;
    this.maxUpgradeScroll = Math.max(0, listHeight - visibleListHeight);
    this.upgradeScrollOffset = Phaser.Math.Clamp(this.upgradeScrollOffset, 0, this.maxUpgradeScroll);
    this.scrollThumbHeight = this.maxUpgradeScroll > 0 ? Math.max(40, visibleListHeight * (visibleListHeight / listHeight)) : visibleListHeight;
    this.scrollThumb.setDisplaySize(12, this.scrollThumbHeight);
    this.scrollThumb.input.enabled = this.maxUpgradeScroll > 0;
    this.updateUpgradeScroll();
  }

  persist() {
    saveGameState(this.engine.snapshot());
  }

  showStartOverlay() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.startOverlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a1119, 0.88).setDepth(2000);
    this.startOverlayText = this.add
      .text(width / 2, height / 2, 'Click to start', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '52px',
        color: '#e8f5ff',
        stroke: '#255d85',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(2001);

    this.startOverlayHitArea = this.add
      .zone(width / 2, height / 2, width, height)
      .setInteractive({ useHandCursor: true })
      .setDepth(2002);

    this.startOverlayHitArea.on('pointerdown', () => this.startGame());
  }

  startGame() {
    if (this.gameStarted) {
      return;
    }

    this.gameStarted = true;

    this.startOverlayBg?.destroy();
    this.startOverlayText?.destroy();
    this.startOverlayHitArea?.destroy();

    this.renderState();
    this.setActivePage(this.activePage);
  }
}
