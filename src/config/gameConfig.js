// Never rename the default SAVE_KEY — use SAVE_VERSION + migrations instead.
// Optional Vite override: VITE_SAVE_KEY (see .env.example).
// Native app id lives in capacitor.config.json (not driven by Vite env).
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const SAVE_KEY = env.VITE_SAVE_KEY || 'clicker-phaser-save-v1';
export const LEGACY_SAVE_KEYS = [];
export const SAVE_VERSION = 10;
export const SCENE_KEY = 'clicker-scene';

export const GAME_CONFIG = {
  width: 540,
  height: 960,
  backgroundColor: '#111822',
};

/** null = no offline earnings cap */
export const LOOP_CONFIG = {
  autoSaveDelayMs: 10000,
  maxOfflineSeconds: null,
};
