import Phaser from 'phaser';
import { CLICKER_UPGRADES } from '../data/upgrades.js';
import { createClickerController, formatCoins } from '../lib/clickerMath.js';
import { LOOP_CONFIG, SCENE_KEY } from '../config/gameConfig.js';
import { loadGameState, saveGameState } from '../services/saveStorage.js';

export class ClickerScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEY);
  }

  create() {
    this.engine = createClickerController(CLICKER_UPGRADES);
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

    this.add.rectangle(width / 2, height / 2, width, height, 0x081018, 0.2);

    this.titleText = this.add
      .text(width / 2, 46, 'CLICKER GAME', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '42px',
        color: '#ffd166',
        stroke: '#9f5f00',
        strokeThickness: 7,
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, 130, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '54px',
        color: '#ffffff',
        fontStyle: '800',
      })
      .setOrigin(0.5);

    this.statsText = this.add
      .text(width / 2, 188, '', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '26px',
        color: '#9bd3ff',
      })
      .setOrigin(0.5);

    this.coreButton = this.add.circle(width / 2, 355, 116, 0xff8f00).setInteractive({ useHandCursor: true });
    this.coreGlow = this.add.circle(width / 2, 355, 136, 0xffc04d, 0.35);
    this.add.circle(width / 2, 355, 84, 0xffd166);

    this.buttonLabel = this.add
      .text(width / 2, 355, 'TAP', {
        fontFamily: 'Bungee, sans-serif',
        fontSize: '48px',
        color: '#6c3200',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 462, 'Tap to earn coins', {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.coreButton.on('pointerdown', () => {
      if (!this.gameStarted) {
        return;
      }

      const gain = this.engine.tap();
      this.coreButton.setScale(0.94);
      this.tweens.add({
        targets: this.coreButton,
        scale: 1,
        duration: 120,
        ease: 'Back.Out',
      });
      this.spawnFloatingText(`+${formatCoins(gain)}`);
      this.renderState();
    });

    const compactRows = this.state.upgrades.length > 4;
    const rowHeight = compactRows ? 72 : 84;
    const rowGap = compactRows ? 12 : 16;
    const panelPadding = 12;
    const panelTop = 500;
    const panelBottomMargin = 14;
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

    this.upgradePanelBg = this.add.rectangle(width / 2, panelCenterY, width - 34, panelHeight, 0x0f1f2d, 0.86).setStrokeStyle(2, 0x2a5472);

    this.upgradeContent = this.add.container(0, 0);

    this.upgradeItems = [];
    this.buildUpgradeList();
    this.setupUpgradeViewportCamera();
    this.upgradeCamera.setVisible(this.gameStarted);
    this.setupUpgradeScroll();

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
      this.spawnFloatingText(`+${formatCoins(offline.gain)} offline`, '#9df4a3', 240);
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

      const buyButton = this.add.rectangle(buyButtonX, y, buyButtonWidth, buyButtonHeight, 0x2da1ff).setStrokeStyle(2, 0x94d4ff).setInteractive({ useHandCursor: true });
      const buyText = this.add
        .text(buyButtonX, y, 'BUY', {
          fontFamily: 'Bungee, sans-serif',
          fontSize: buyFontSize,
          color: '#05203a',
        })
        .setOrigin(0.5);

      buyButton.on('pointerdown', () => {
        if (!this.gameStarted) {
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
        buyButton,
        buyText,
      });

      this.upgradeContent.add([rowBg, label, info, buyButton, buyText]);
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
    this.scrollThumb = this.add
      .rectangle(trackX, listTop + thumbHeight / 2, 12, thumbHeight, 0x76c5ff, 0.95)
      .setStrokeStyle(1, 0xb5e5ff, 1)
      .setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(this.scrollThumb);
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject !== this.scrollThumb || this.maxUpgradeScroll <= 0) {
        return;
      }

      const minY = listTop + this.scrollThumb.height / 2;
      const maxY = listTop + visibleListHeight - this.scrollThumb.height / 2;
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
      item.buyButton.y = y;
      item.buyText.y = y;
    });

    if (this.maxUpgradeScroll <= 0) {
      this.scrollTrack.setAlpha(0.4);
      this.scrollThumb.setAlpha(0.45);
      this.scrollThumb.y = listTop + visibleListHeight / 2;
      return;
    }

    this.scrollTrack.setAlpha(1);
    this.scrollThumb.setAlpha(1);

    const minY = listTop + this.scrollThumb.height / 2;
    const maxY = listTop + visibleListHeight - this.scrollThumb.height / 2;
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

    this.upgradeItems.forEach((item) => {
      const upgrade = this.state.upgrades.find((entry) => entry.id === item.id);
      const cost = this.engine.getUpgradeCost(item.id);
      const canBuy = this.state.coins.gte(cost);
      const effectLabel = upgrade.type === 'click' ? '+tap' : '+/sec';

      item.label.setText(`${upgrade.label} Lv.${upgrade.level}`);
      item.info.setText(`${effectLabel} ${upgrade.baseValue}  |  cost ${formatCoins(cost)}`);

      item.buyButton.setFillStyle(canBuy ? 0x2da1ff : 0x51718a);
      item.buyText.setColor(canBuy ? '#05203a' : '#bcc9d4');
    });
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
    this.upgradeCamera.setVisible(true);

    this.startOverlayBg?.destroy();
    this.startOverlayText?.destroy();
    this.startOverlayHitArea?.destroy();

    this.renderState();
  }
}
