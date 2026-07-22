import { COLORS, FONT_FAMILIES } from '../../config/theme.js';
import { UI_TEXT } from '../../config/uiText.js';
import { formatCoins } from '../../lib/clickerMath.js';
import { setActivePage } from './pageNavigation.js';

export function formatOfflineDuration(totalSeconds) {
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

/** List cameras composite over the main camera — hide them while a modal is up. */
function hideListCamerasForModal(scene) {
  scene.upgradeCamera?.setVisible(false);
  scene.metaCamera?.setVisible(false);
  scene.statusCamera?.setVisible(false);
  scene.upgradeScroll?.setVisible(false);
  scene.metaScroll?.setVisible(false);
  scene.statusScroll?.setVisible(false);
}

function restoreUiAfterModal(scene) {
  if (typeof scene.activePage === 'number') {
    setActivePage(scene, scene.activePage);
  }
}

function ignoreModalOnListCameras(scene, modal) {
  scene.upgradeCamera?.ignore(modal);
  scene.metaCamera?.ignore(modal);
  scene.statusCamera?.ignore(modal);
}

export function showOfflineReturn(scene, offline) {
  if (scene.offlineReturn) {
    return;
  }

  const width = scene.scale.width;
  const height = scene.scale.height;
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, COLORS.overlay, 0.78).setInteractive();
  const panel = scene.add
    .rectangle(width / 2, height / 2, width - 48, 380, COLORS.overlayPanel, 1)
    .setStrokeStyle(3, COLORS.overlayBorder);
  const title = scene.add
    .text(width / 2, height / 2 - 128, UI_TEXT.welcomeBack, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '32px',
      color: COLORS.accentText,
    })
    .setOrigin(0.5);
  const awayText = scene.add
    .text(width / 2, height / 2 - 68, `Away for ${formatOfflineDuration(offline.elapsedSeconds)}`, {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '23px',
      color: COLORS.overlayText,
    })
    .setOrigin(0.5);
  const earningsLabel = scene.add
    .text(width / 2, height / 2 - 12, UI_TEXT.offlineEarnings, {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '18px',
      color: COLORS.overlayMutedText,
      fontStyle: '800',
    })
    .setOrigin(0.5);
  const earnings = scene.add
    .text(width / 2, height / 2 + 34, `+${formatCoins(offline.gain)} coins`, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '30px',
      color: COLORS.positiveText,
    })
    .setOrigin(0.5);
  const continueButton = scene.add
    .rectangle(width / 2, height / 2 + 120, width - 104, 66, COLORS.primary)
    .setStrokeStyle(2, COLORS.primaryBorder)
    .setInteractive({ useHandCursor: true });
  const continueText = scene.add
    .text(width / 2, height / 2 + 120, UI_TEXT.continue, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '22px',
      color: COLORS.primaryText,
    })
    .setOrigin(0.5);

  scene.offlineReturn = scene.add
    .container(0, 0, [overlay, panel, title, awayText, earningsLabel, earnings, continueButton, continueText])
    .setDepth(3000);

  hideListCamerasForModal(scene);
  ignoreModalOnListCameras(scene, scene.offlineReturn);

  continueButton.on('pointerup', () => {
    scene.offlineReturn?.destroy(true);
    scene.offlineReturn = null;
    restoreUiAfterModal(scene);
    scene.renderState?.();
  });
}

export function showStartOverlay(scene, onStart) {
  const width = scene.scale.width;
  const height = scene.scale.height;

  scene.startOverlayBg = scene.add
    .rectangle(width / 2, height / 2, width, height, COLORS.startOverlay, 0.88)
    .setDepth(2000);
  scene.startOverlayText = scene.add
    .text(width / 2, height / 2, UI_TEXT.start, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '52px',
      color: COLORS.text,
      stroke: COLORS.startStroke,
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(2001);

  scene.startOverlayHitArea = scene.add
    .zone(width / 2, height / 2, width, height)
    .setInteractive({ useHandCursor: true })
    .setDepth(2002);

  scene.startOverlayHitArea.on('pointerdown', onStart);
}

export function destroyStartOverlay(scene) {
  scene.startOverlayBg?.destroy();
  scene.startOverlayText?.destroy();
  scene.startOverlayHitArea?.destroy();
  scene.startOverlayBg = null;
  scene.startOverlayText = null;
  scene.startOverlayHitArea = null;
}

/** Generic confirm modal (prestige, destructive actions). */
export function showConfirmDialog(scene, { title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  if (scene.confirmDialog) {
    return;
  }

  const width = scene.scale.width;
  const height = scene.scale.height;
  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, COLORS.overlay, 0.78).setInteractive();
  const panel = scene.add
    .rectangle(width / 2, height / 2, width - 48, 420, COLORS.overlayPanel, 1)
    .setStrokeStyle(3, COLORS.overlayBorder);
  const titleText = scene.add
    .text(width / 2, height / 2 - 150, title, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '28px',
      color: COLORS.accentText,
    })
    .setOrigin(0.5);
  const bodyText = scene.add
    .text(width / 2, height / 2 - 40, body, {
      fontFamily: FONT_FAMILIES.body,
      fontSize: '18px',
      color: COLORS.overlayText,
      align: 'center',
      wordWrap: { width: width - 120 },
    })
    .setOrigin(0.5);
  const confirmButton = scene.add
    .rectangle(width / 2, height / 2 + 100, width - 104, 60, COLORS.primary)
    .setStrokeStyle(2, COLORS.primaryBorder)
    .setInteractive({ useHandCursor: true });
  const confirmText = scene.add
    .text(width / 2, height / 2 + 100, confirmLabel, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '20px',
      color: COLORS.primaryText,
    })
    .setOrigin(0.5);
  const cancelButton = scene.add
    .rectangle(width / 2, height / 2 + 172, width - 104, 52, COLORS.disabled)
    .setStrokeStyle(2, COLORS.disabledBorder)
    .setInteractive({ useHandCursor: true });
  const cancelText = scene.add
    .text(width / 2, height / 2 + 172, cancelLabel, {
      fontFamily: FONT_FAMILIES.display,
      fontSize: '18px',
      color: COLORS.disabledText,
    })
    .setOrigin(0.5);

  const dialog = scene.add
    .container(0, 0, [
      overlay,
      panel,
      titleText,
      bodyText,
      confirmButton,
      confirmText,
      cancelButton,
      cancelText,
    ])
    .setDepth(3200);

  scene.confirmDialog = dialog;
  hideListCamerasForModal(scene);
  ignoreModalOnListCameras(scene, dialog);

  function close() {
    dialog.destroy(true);
    scene.confirmDialog = null;
    restoreUiAfterModal(scene);
  }

  confirmButton.on('pointerup', () => {
    close();
    onConfirm?.();
  });
  cancelButton.on('pointerup', () => {
    close();
    onCancel?.();
  });
}

export function showPrestigeConfirm(scene, onConfirm) {
  showConfirmDialog(scene, {
    title: UI_TEXT.prestigeConfirmTitle,
    body: UI_TEXT.prestigeConfirmBody,
    confirmLabel: UI_TEXT.prestigeConfirmYes,
    cancelLabel: UI_TEXT.prestigeConfirmNo,
    onConfirm,
  });
}
