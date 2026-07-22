import { describe, expect, it } from 'vitest';
import { calculateAscensionTokenGain, getAscensionTokenIdleMultiplier } from './prestige.js';

describe('prestige', () => {
  it('gains no tokens below 1M coins this ascension', () => {
    expect(calculateAscensionTokenGain(0)).toBe(0);
    expect(calculateAscensionTokenGain(999_999)).toBe(0);
  });

  it('uses a soft sqrt curve from 1M coins', () => {
    expect(calculateAscensionTokenGain(1_000_000)).toBe(1);
    expect(calculateAscensionTokenGain(100_000_000)).toBe(10);
    expect(calculateAscensionTokenGain(10_000_000_000)).toBe(100);
  });

  it('applies +1% idle per Ascension Token', () => {
    expect(getAscensionTokenIdleMultiplier(0)).toBe(1);
    expect(getAscensionTokenIdleMultiplier(1)).toBe(1.01);
    expect(getAscensionTokenIdleMultiplier(50)).toBe(1.5);
    expect(getAscensionTokenIdleMultiplier(-3)).toBe(1);
  });
});
