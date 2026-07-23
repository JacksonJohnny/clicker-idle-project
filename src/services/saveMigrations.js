import { SAVE_VERSION } from '../config/gameConfig.js';
import { cloneSave, compensateLegacyMilestoneStars, normalizeSaveState } from '../lib/saveState.js';

// Re-export pure save helpers so storage/tests keep a single import path for migrations.
export {
  BOOST_ID_ALIASES,
  UPGRADE_ID_ALIASES,
  compensateLegacyMilestoneStars,
  normalizeSaveState,
} from '../lib/saveState.js';

const MIGRATIONS = [
  {
    from: 1,
    to: 2,
    migrate(state) {
      return normalizeSaveState(state);
    },
  },
  {
    from: 2,
    to: 3,
    migrate(state) {
      return compensateLegacyMilestoneStars(state);
    },
  },
  {
    from: 3,
    to: 4,
    migrate(state) {
      return normalizeSaveState(state);
    },
  },
  {
    from: 4,
    to: 5,
    migrate(state) {
      // Roll back brief generator-N rename → stable upgrade-N ids, then re-grant stars.
      return compensateLegacyMilestoneStars(normalizeSaveState(state));
    },
  },
  {
    from: 5,
    to: 6,
    migrate(state) {
      const next = normalizeSaveState(state);
      if (next.totalCoinsEarned === undefined && next.coins !== undefined) {
        next.totalCoinsEarned = next.coins;
      }
      return next;
    },
  },
  {
    from: 6,
    to: 7,
    migrate(state) {
      const next = normalizeSaveState(state);
      if (next.coinsThisAscension === undefined) {
        next.coinsThisAscension = next.totalCoinsEarned ?? next.coins ?? '0';
      }
      if (next.stars === undefined) {
        next.stars = 0;
      }
      if (next.prestigeCount === undefined) {
        next.prestigeCount = 0;
      }
      if (!Array.isArray(next.unlockedAchievements)) {
        next.unlockedAchievements = [];
      }
      return next;
    },
  },
  {
    from: 7,
    to: 8,
    migrate(state) {
      const next = normalizeSaveState(state);
      if (next.ascensionTokens === undefined) {
        next.ascensionTokens = Number.isFinite(Number(next.stars)) ? Math.max(0, Number(next.stars)) : 0;
      }
      delete next.stars;
      return next;
    },
  },
  {
    from: 8,
    to: 9,
    migrate(state) {
      const next = normalizeSaveState(state);
      if (!Array.isArray(next.ownedModifiers)) {
        next.ownedModifiers = [];
      }
      return next;
    },
  },
  {
    from: 9,
    to: 10,
    migrate(state) {
      const next = normalizeSaveState(state);
      delete next.ownedModifiers;
      return next;
    },
  },
];

export function migrateSaveState(state, fromVersion = 1) {
  let version = Number.isFinite(Number(fromVersion)) ? Math.max(1, Number(fromVersion)) : 1;
  let next = normalizeSaveState(state);

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS.find((migration) => migration.from === version);

    if (step) {
      next = normalizeSaveState(step.migrate(cloneSave(next)));
      version = step.to;
      continue;
    }

    version += 1;
  }

  return {
    state: next,
    version: SAVE_VERSION,
  };
}
