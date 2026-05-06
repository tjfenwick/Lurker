import { useCallback, useEffect, useReducer, useState } from 'react';
import { ChoiceButton, type ChoiceState } from './components/ChoiceButton';
import { DifficultyToggle } from './components/DifficultyToggle';
import { PostCard } from './components/PostCard';
import { ResultPanel } from './components/ResultPanel';
import { StatsBar } from './components/StatsBar';
import { loadInitialState, reducer } from './game/state';
import type { Difficulty, Post, PostsFile } from './types';

type PostsLoad =
  | { status: 'loading' }
  | { status: 'ready'; posts: Post[] }
  | { status: 'error'; message: string };

const COMMENTS_HIDDEN_KEY = 'lurker:commentsHidden';

function readSessionFlag(key: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string, value: boolean): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [postsLoad, setPostsLoad] = useState<PostsLoad>({ status: 'loading' });
  const [pickedDifficulty, setPickedDifficulty] = useState<Difficulty>('easy');
  const [commentsHidden, setCommentsHidden] = useState<boolean>(() =>
    readSessionFlag(COMMENTS_HIDDEN_KEY),
  );

  const loadPosts = useCallback(() => {
    setPostsLoad({ status: 'loading' });
    fetch('/posts.json')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as PostsFile;
      })
      .then((file) => setPostsLoad({ status: 'ready', posts: file.posts }))
      .catch((err: Error) => setPostsLoad({ status: 'error', message: err.message }));
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const toggleComments = useCallback(() => {
    setCommentsHidden((prev) => {
      const next = !prev;
      writeSessionFlag(COMMENTS_HIDDEN_KEY, next);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ignore if typing in an input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'c' || e.key === 'C') {
        toggleComments();
        return;
      }
      if (postsLoad.status !== 'ready') return;
      if (state.status === 'playing' && state.round) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) {
          dispatch({ type: 'ANSWER', choiceIndex: n - 1 });
        }
      } else if (state.status === 'answered') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dispatch({ type: 'NEXT_ROUND', posts: postsLoad.posts });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, state.round, postsLoad, toggleComments]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-8 pt-3 sm:pt-6">
      {state.status !== 'idle' && (
        <StatsBar
          stats={state.stats}
          onBackToStart={() => dispatch({ type: 'BACK_TO_IDLE' })}
        />
      )}

      {postsLoad.status === 'loading' && <LoadingScreen />}
      {postsLoad.status === 'error' && (
        <ErrorScreen message={postsLoad.message} onRetry={loadPosts} />
      )}
      {postsLoad.status === 'ready' && state.status === 'idle' && (
        <StartScreen
          stats={state.stats}
          difficulty={pickedDifficulty}
          onDifficultyChange={setPickedDifficulty}
          onStart={() =>
            dispatch({
              type: 'START_GAME',
              difficulty: pickedDifficulty,
              posts: postsLoad.posts,
            })
          }
          onResetStats={() => dispatch({ type: 'RESET_STATS' })}
        />
      )}
      {postsLoad.status === 'ready' && state.status !== 'idle' && state.round && (
        <RoundView
          state={state}
          posts={postsLoad.posts}
          dispatch={dispatch}
          commentsHidden={commentsHidden}
          onToggleComments={toggleComments}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-neutral-500">Loading posts…</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-12 rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-center">
      <h2 className="text-lg font-semibold text-red-200">Could not load posts</h2>
      <p className="mt-1 text-sm text-red-300/80">{message}</p>
      <p className="mt-2 text-xs text-neutral-400">
        Run <code className="rounded bg-neutral-800 px-1 py-0.5">npm run fetch</code> or{' '}
        <code className="rounded bg-neutral-800 px-1 py-0.5">npm run fixture</code> to generate
        the corpus.
      </p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-reddit-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
      >
        Retry
      </button>
    </div>
  );
}

interface StartScreenProps {
  stats: ReturnType<typeof loadInitialState>['stats'];
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onStart: () => void;
  onResetStats: () => void;
}

function StartScreen({
  stats,
  difficulty,
  onDifficultyChange,
  onStart,
  onResetStats,
}: StartScreenProps) {
  return (
    <div className="mt-6 sm:mt-12">
      <h1 className="text-3xl font-bold tracking-tight text-reddit-orange sm:text-4xl">Lurker</h1>
      <p className="mt-2 text-sm text-neutral-400 sm:text-base">
        Read a scrubbed Reddit post. Guess the subreddit. Multiple choice.
      </p>

      <div className="mt-8 space-y-4">
        <DifficultyToggle value={difficulty} onChange={onDifficultyChange} />
        <button
          onClick={onStart}
          className="w-full rounded-lg bg-reddit-orange px-4 py-3 text-base font-semibold text-white shadow hover:bg-orange-600 active:bg-orange-700"
        >
          Start playing
        </button>
      </div>

      {stats.totalRounds > 0 && (
        <div className="mt-10 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Your stats
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat
              label="rounds"
              value={`${stats.correctRounds}/${stats.totalRounds}`}
            />
            <Stat label="streak" value={String(stats.currentStreak)} />
            <Stat label="best" value={String(stats.bestStreak)} />
          </div>
          <button
            onClick={onResetStats}
            className="mt-4 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Reset stats
          </button>
        </div>
      )}

      <p className="mt-10 text-xs text-neutral-600">
        Keyboard: <kbd>1</kbd>–<kbd>4</kbd> pick · <kbd>↵</kbd> next · <kbd>c</kbd> toggle
        comments
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold tabular-nums text-neutral-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}

interface RoundViewProps {
  state: ReturnType<typeof reducer>;
  posts: Post[];
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
  commentsHidden: boolean;
  onToggleComments: () => void;
}

function RoundView({
  state,
  posts,
  dispatch,
  commentsHidden,
  onToggleComments,
}: RoundViewProps) {
  const round = state.round!;
  return (
    <div className="space-y-4">
      <PostCard
        post={round.post}
        commentsHidden={commentsHidden}
        onToggleCommentsHidden={onToggleComments}
      />
      <div className="space-y-2">
        {round.choices.map((choice, i) => {
          const choiceState = computeChoiceState(state, round.correctIndex, i);
          return (
            <ChoiceButton
              key={choice}
              choice={choice}
              index={i}
              state={choiceState}
              onClick={() => {
                if (state.status === 'playing') {
                  dispatch({ type: 'ANSWER', choiceIndex: i });
                }
              }}
            />
          );
        })}
      </div>
      {state.status === 'answered' && state.lastResult && (
        <ResultPanel
          round={round}
          result={state.lastResult}
          onNext={() => dispatch({ type: 'NEXT_ROUND', posts })}
        />
      )}
    </div>
  );
}

function computeChoiceState(
  state: ReturnType<typeof reducer>,
  correctIndex: number,
  i: number,
): ChoiceState {
  if (state.status === 'playing') return 'idle';
  if (i === correctIndex) return 'correct';
  if (state.lastChoiceIndex === i) return 'wrong';
  return 'disabled';
}
