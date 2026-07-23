import { SAVE_KEY } from '../config/gameConfig.js';
import { normalizeBuyAmount } from '../config/buyAmounts.js';
import { storageGetItem, storageSetItem } from './storageAdapter.js';

const SETTINGS_KEY = `${SAVE_KEY}-settings`;
const DEFAULT_SETTINGS = {
  soundEnabled: true,
  buyAmount: 1,
};

export function loadSettings() {
  try {
    const raw = storageGetItem(SETTINGS_KEY);
    const saved = raw ? JSON.parse(raw) : null;

    return {
      soundEnabled: saved?.soundEnabled !== false,
      buyAmount: normalizeBuyAmount(saved?.buyAmount),
    };
  } catch (_error) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  storageSetItem(
    SETTINGS_KEY,
    JSON.stringify({
      soundEnabled: settings.soundEnabled !== false,
      buyAmount: normalizeBuyAmount(settings.buyAmount),
    }),
  );
}
