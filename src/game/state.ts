import type { Difficulty, GameStats, Post, Round } from '../types';
import { pickRound } from './selector';
import { defaultStats, loadStats, saveStats } from './storage';

export type GameStatus = 'idle' | 'playing' | 'answered';

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty | null;
  round: Round | null;
  lastResult: 'correct' | 'wrong' | null;
  lastChoiceIndex: number | null;
  stats: GameStats;
  recentlyUsedIds: string[];
  // Most-recent-first ring of round outcomes for the share grid (capped at 10).
  recentResults: ('correct' | 'wrong')[];
}

export type GameAction =
  | { type: 'START_GAME'; difficulty: Difficulty; posts: Post[] }
  | { type: 'ANSWER'; choiceIndex: number }
  | { type: 'NEXT_ROUND'; posts: Post[] }
  | { type: 'BACK_TO_IDLE' }
  | { type: 'RESET_STATS' };

const RECENT_IDS_LIMIT = 30;
const RECENT_RESULTS_LIMIT = 10;

export function initialState(): GameState {
  return {
    status: 'idle',
    difficulty: null,
    round: null,
    lastResult: null,
    lastChoiceIndex: null,
    stats: defaultStats(),
    recentlyUsedIds: [],
    recentResults: [],
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
        lastChoiceIndex: null,
        recentlyUsedIds: rememberId(state.recentlyUsedIds, round.post.id),
        recentResults: [],
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
      const result: 'correct' | 'wrong' = correct ? 'correct' : 'wrong';
      return {
        ...state,
        status: 'answered',
        lastResult: result,
        lastChoiceIndex: action.choiceIndex,
        stats,
        recentResults: [result, ...state.recentResults].slice(0, RECENT_RESULTS_LIMIT),
      };
    }
    case 'NEXT_ROUND': {
      if (state.status !== 'answered' || !state.difficulty) return state;
      const round = pickRound(action.posts, state.difficulty, state.recentlyUsedIds);
      return {
        ...state,
        status: 'playing',
        round,
        lastResult: null,
        lastChoiceIndex: null,
        recentlyUsedIds: rememberId(state.recentlyUsedIds, round.post.id),
      };
    }
    case 'BACK_TO_IDLE': {
      return {
        ...state,
        status: 'idle',
        round: null,
        lastResult: null,
        lastChoiceIndex: null,
      };
    }
    case 'RESET_STATS': {
      const stats = defaultStats();
      saveStats(stats);
      return { ...state, stats, recentResults: [] };
    }
    default:
      return state;
  }
}
