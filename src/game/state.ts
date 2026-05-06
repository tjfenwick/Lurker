import type { Difficulty, GameStats, Post, Round } from '../types';
import { pickRound } from './selector';
import { defaultStats, loadStats, saveStats } from './storage';

export type GameStatus = 'idle' | 'playing' | 'answered';

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty | null;
  round: Round | null;
  lastResult: 'correct' | 'wrong' | null;
  stats: GameStats;
  recentlyUsedIds: string[];
}

export type GameAction =
  | { type: 'START_GAME'; difficulty: Difficulty; posts: Post[] }
  | { type: 'ANSWER'; choiceIndex: number }
  | { type: 'NEXT_ROUND'; posts: Post[] }
  | { type: 'BACK_TO_IDLE' }
  | { type: 'RESET_STATS' };

const RECENT_IDS_LIMIT = 30;

export function initialState(): GameState {
  return {
    status: 'idle',
    difficulty: null,
    round: null,
    lastResult: null,
    stats: defaultStats(),
    recentlyUsedIds: [],
  };
}

export function loadInitialState(): GameState {
  return { ...initialState(), stats: loadStats() };
}

function rememberId(prev: readonly string[], id: string): string[] {
  return [...prev, id].slice(-RECENT_IDS_LIMIT);
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const round = pickRound(action.posts, action.difficulty, state.recentlyUsedIds);
      return {
        ...state,
        status: 'playing',
        difficulty: action.difficulty,
        round,
        lastResult: null,
        recentlyUsedIds: rememberId(state.recentlyUsedIds, round.post.id),
      };
    }
    case 'ANSWER': {
      if (state.status !== 'playing' || !state.round) return state;
      const correct = action.choiceIndex === state.round.correctIndex;
      const sub = state.round.post.subreddit;
      const prev = state.stats.perSubAccuracy[sub] ?? { correct: 0, total: 0 };
      const newStreak = correct ? state.stats.currentStreak + 1 : 0;
      const stats: GameStats = {
        totalRounds: state.stats.totalRounds + 1,
        correctRounds: state.stats.correctRounds + (correct ? 1 : 0),
        currentStreak: newStreak,
        bestStreak: Math.max(state.stats.bestStreak, newStreak),
        perSubAccuracy: {
          ...state.stats.perSubAccuracy,
          [sub]: {
            correct: prev.correct + (correct ? 1 : 0),
            total: prev.total + 1,
          },
        },
      };
      saveStats(stats);
      return {
        ...state,
        status: 'answered',
        lastResult: correct ? 'correct' : 'wrong',
        stats,
      };
    }
    case 'NEXT_ROUND': {
      if (!state.difficulty) return state;
      const round = pickRound(action.posts, state.difficulty, state.recentlyUsedIds);
      return {
        ...state,
        status: 'playing',
        round,
        lastResult: null,
        recentlyUsedIds: rememberId(state.recentlyUsedIds, round.post.id),
      };
    }
    case 'BACK_TO_IDLE': {
      return { ...state, status: 'idle', round: null, lastResult: null };
    }
    case 'RESET_STATS': {
      const stats = defaultStats();
      saveStats(stats);
      return { ...state, stats };
    }
    default:
      return state;
  }
}
