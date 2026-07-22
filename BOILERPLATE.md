# Boilerplate Clicker

Reusable Phaser + Capacitor idle clicker foundation.

## Structure

- `src/config` — resolution, theme, UI text, `SAVE_KEY` / `SAVE_VERSION`
- `src/controllers` — `ListScrollController` (visual scrollbar + finger scroll)
- `src/data` — generators, click upgrades, `metaUpgrades.js`, `achievements.js`
- `src/lib` — pure economy (`clickerMath`) + Auto Tap progress + `prestige.js`
- `src/services` — save/migrations, settings, feedback, storage adapter
- `src/ui` — Phaser builders (no buy rules) + `metaUpgradeCopy` + token badge
- `src/scenes` — thin `ClickerScene` + `scenes/clicker/*` helpers

## Rebrand in 15 minutes

1. Theme: `src/config/theme.js` + title in `src/config/uiText.js`
2. Generators: `src/data/generators.js` (stable ids `upgrade-1` … `upgrade-N`)
3. Click / Auto Tap: `src/data/upgrades.js`
4. Meta-upgrades: `src/data/metaUpgrades.js`
5. Prestige curve / Ascension Tokens: `src/lib/prestige.js`
6. Loops / resolution: `src/config/gameConfig.js`
7. Optional env: copy `.env.example` → `.env` (`VITE_APP_ID`, `VITE_SAVE_KEY`)
8. Run `npm test` and `npm run build`

### Changing save format without wiping players

1. Do **not** rename `SAVE_KEY` (or add the old key to `LEGACY_SAVE_KEYS`).
2. Bump `SAVE_VERSION` in `gameConfig.js`.
3. Add `{ from, to, migrate }` in `src/services/saveMigrations.js`.
4. If you rename an id, add it to `UPGRADE_ID_ALIASES` / `BOOST_ID_ALIASES`.

## Core systems included

- Wall-clock idle + offline catch-up (`savedAt`, `maxOfflineSeconds`; `null` = uncapped)
- Decimal.js economy + Cookie Clicker–style formatting
- Versioned save + checksum + soft salvage
- Progressive catalog (`???` for next locked)
- Hold-to-buy on STORE
- Auto Tap rings, color tiers, per-cursor floating gains
- Meta-upgrades (efficiency / global / tap-%-of-idle / base multiplier)
- Achievements → permanent idle %
- Prestige → Ascension Tokens (+1% idle each), with confirm dialog
- STATUS tab (stats, multipliers, achievements)
- Sound / vibration settings

## Suggested expansion points

- Extra modifiers: add `src/data/modifiers.js`
- Missions / seasonal events: add `src/lib/objectivesEngine.js`

See [README.md](README.md) for full gameplay and save docs.
