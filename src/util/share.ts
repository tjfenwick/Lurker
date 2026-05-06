import type { Difficulty, GameStats } from '../types';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function buildShareText(
  stats: GameStats,
  recentResults: readonly ('correct' | 'wrong')[],
  difficulty: Difficulty | null,
): string {
  if (recentResults.length === 0) {
    return `Lurker — no rounds yet`;
  }
  const correctInRecent = recentResults.filter((r) => r === 'correct').length;
  // recentResults is most-recent-first; reverse so the grid reads
  // oldest → newest left → right.
  const grid = recentResults
    .slice()
    .reverse()
    .map((r) => (r === 'correct' ? '🟧' : '⬛'))
    .join('');
  const diffLabel = difficulty ? DIFFICULTY_LABEL[difficulty].toLowerCase() : 'mixed';
  const header = `Lurker · ${diffLabel} · ${correctInRecent}/${recentResults.length}`;
  const lifetime =
    stats.totalRounds > 0
      ? `\n${stats.correctRounds}/${stats.totalRounds} lifetime · best ${stats.bestStreak}`
      : '';
  return `${header}\n${grid}${lifetime}`;
}
