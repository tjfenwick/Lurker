import type { Round } from '../types';
import { getSubMeta } from '../game/selector';

interface Props {
  round: Round;
  result: 'correct' | 'wrong';
  onNext: () => void;
}

export function ResultPanel({ round, result, onNext }: Props) {
  const meta = getSubMeta(round.post.subreddit);
  const correct = result === 'correct';
  return (
    <div
      className={
        'mt-4 rounded-xl border p-4 sm:p-5 ' +
        (correct
          ? 'border-emerald-500/40 bg-emerald-600/10'
          : 'border-red-500/40 bg-red-600/10')
      }
    >
      <div className="flex items-baseline gap-2">
        <span
          className={
            'text-xl font-bold ' + (correct ? 'text-emerald-300' : 'text-red-300')
          }
        >
          {correct ? 'Correct!' : 'Nope —'}
        </span>
        <span className="text-base font-medium text-neutral-100">r/{round.post.subreddit}</span>
      </div>
      {meta && <p className="mt-1 text-sm text-neutral-300">{meta.description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onNext}
          className="rounded-lg bg-reddit-orange px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600 active:bg-orange-700"
        >
          Next <kbd className="ml-1 text-xs opacity-80">↵</kbd>
        </button>
        <a
          href={round.post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
        >
          View on Reddit ↗
        </a>
      </div>
    </div>
  );
}
