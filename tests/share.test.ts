import { describe, expect, it } from 'vitest';
import { buildShareText } from '../src/util/share';
import type { GameStats } from '../src/types';

const baseStats = (overrides: Partial<GameStats> = {}): GameStats => ({
  totalRounds: 0,
  correctRounds: 0,
  currentStreak: 0,
  bestStreak: 0,
  perSubAccuracy: {},
  ...overrides,
});

describe('buildShareText', () => {
  it('returns a placeholder when no rounds played', () => {
    expect(buildShareText(baseStats(), [], 'easy')).toBe('Lurker — no rounds yet');
  });

  it('renders the share grid in chronological (oldest → newest) order', () => {
    // recentResults is most-recent-first. So this list, oldest first, was:
    //   round 1 (oldest) = correct
    //   round 2          = wrong
    //   round 3 (newest) = correct
    // L→R grid should read 🟧⬛🟧.
    const recent: ('correct' | 'wrong')[] = ['correct', 'wrong', 'correct'];
    const out = buildShareText(baseStats({ totalRounds: 3, correctRounds: 2 }), recent, 'easy');
    expect(out).toContain('🟧⬛🟧');
    expect(out).toContain('Lurker · easy · 2/3');
    expect(out).toContain('2/3 lifetime');
  });

  it('omits the lifetime line when no rounds are tracked in stats', () => {
    const out = buildShareText(baseStats(), ['correct'], 'medium');
    expect(out).not.toContain('lifetime');
    expect(out).toContain('Lurker · medium · 1/1');
  });

  it('counts correct rounds in the recent slice, not lifetime', () => {
    const recent: ('correct' | 'wrong')[] = ['correct', 'correct', 'wrong'];
    const out = buildShareText(
      baseStats({ totalRounds: 100, correctRounds: 50 }),
      recent,
      'hard',
    );
    expect(out).toContain('hard · 2/3');
    expect(out).toContain('50/100 lifetime');
  });

  it('handles a null difficulty (mixed sessions)', () => {
    const out = buildShareText(baseStats(), ['correct'], null);
    expect(out).toContain('Lurker · mixed · 1/1');
  });
});
