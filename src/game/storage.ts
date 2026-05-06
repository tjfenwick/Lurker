import type { GameStats } from '../types';

const STATS_KEY = 'lurker:stats:v1';

export function defaultStats(): GameStats {
  return {
    totalRounds: 0,
    correctRounds: 0,
    currentStreak: 0,
    bestStreak: 0,
    perSubAccuracy: {},
  };
}

export function loadStats(): GameStats {
  if (typeof localStorage === 'undefined') return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      totalRounds: parsed.totalRounds ?? 0,
      correctRounds: parsed.correctRounds ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      perSubAccuracy: parsed.perSubAccuracy ?? {},
    };
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: GameStats): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Quota exceeded or storage disabled — silently drop.
  }
}

export function clearStats(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    // ignore
  }
}
