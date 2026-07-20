# Boilerplate Clicker

This project is organized to reuse a Phaser clicker game foundation.

## Structure

- src/config/gameConfig.js
  - Global game configuration (size, scene key, loops)
- src/data/upgrades.js
  - Initial upgrades catalog
- src/lib/clickerMath.js
  - Pure economy functions and clicker controller (tap, buy, tick, snapshot)
- src/services/saveStorage.js
  - localStorage persistence
- src/scenes/ClickerScene.js
  - UI and input layer

## How To Create A New Clicker With This Base

1. Update upgrades in src/data/upgrades.js
2. Tweak growth and formulas in src/lib/clickerMath.js
3. Replace texts and layout in src/scenes/ClickerScene.js
4. Adjust aspect ratio and loops in src/config/gameConfig.js

## Recommended Expansion Points

- Prestige: create a module in src/core/prestigeEngine.js
- Bonus system: create src/data/modifiers.js
- Offline progress: already implemented with savedAt in snapshot and cap by LOOP_CONFIG.maxOfflineSeconds
- Missions and achievements: create src/core/objectivesEngine.js

## Core Idle Systems Included

- Offline progress loop:
  - Uses direct math (single formula block), never frame-by-frame simulation for offline time.
  - `applyOfflineProgress` applies production from elapsed time in one step.
- Big number math:
  - Uses `decimal.js` for large-scale idle progression values.
  - Supports short suffix formatting and scientific notation fallback for very large numbers.
- Save and basic anti-cheat:
  - Autosaves in background every 10 seconds.
  - Save payload is wrapped with a checksum (basic tamper detection).
  - Includes a trusted-time hook (`fetchTrustedNowMs`) to compare against online UTC sources.
