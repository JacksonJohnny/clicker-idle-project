import Phaser from 'phaser';
import { ClickerScene } from './scenes/ClickerScene.js';
import { GAME_CONFIG } from './config/gameConfig.js';
import './style.css';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  backgroundColor: GAME_CONFIG.backgroundColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ClickerScene],
};

new Phaser.Game(config);
