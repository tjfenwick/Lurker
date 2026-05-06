import { useEffect, useState } from 'react';
import { SUBREDDITS } from '../../scripts/subreddits';
import type { Difficulty, GameStats } from '../types';
import { accuracyPct } from '../util/format';
import { buildShareText } from '../util/share';

interface Props {
  open: boolean;
  stats: GameStats;
  recentResults: ('correct' | 'wrong')[];
  difficulty: Difficulty | null;
  onClose: () => void;
  onResetStats: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function StatsModal({
  open,
  stats,
  recentResults,
  difficulty,
  onClose,
  onResetStats,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const rows = Object.entries(stats.perSubAccuracy)
    .map(([sub, acc]) => {
      const meta = SUBREDDITS.find((s) => s.name === sub);
      return {
        sub,
        ...acc,
        difficulty: meta?.difficulty ?? null,
        category: meta?.category ?? null,
      };
    })
    .sort((a, b) => {
      const aRate = a.correct / a.total;
      const bRate = b.correct / b.total;
      if (aRate !== bRate) return aRate - bRate;
      return b.total - a.total;
    });

  const shareText = buildShareText(stats, recentResults, difficulty);

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (older browsers, insecure contexts)
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Stats"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-50">Your stats</h2>
            <p className="text-xs text-neutral-500">
              {stats.totalRounds === 0
                ? 'Play a round to start tracking.'
                : `${stats.correctRounds}/${stats.totalRounds} · best streak ${stats.bestStreak}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            aria-label="Close stats"
          >
            ✕
          </button>
        </div>

        {recentResults.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Recent rounds
              </h3>
              <span className="text-xs text-neutral-500">
                last {recentResults.length}
              </span>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
              <pre className="whitespace-pre font-mono text-sm leading-snug text-neutral-200">
                {shareText}
              </pre>
            </div>
            <button
              onClick={copyShare}
              className="mt-3 w-full rounded-lg bg-reddit-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              {copied ? 'Copied!' : 'Share result'}
            </button>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Per-subreddit accuracy ({rows.length})
          </h3>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No subs played yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800/60 rounded-lg border border-neutral-800">
              {rows.map((r) => {
                const pct = r.total === 0 ? 0 : (r.correct / r.total) * 100;
                return (
                  <li
                    key={r.sub}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-neutral-100">
                        r/{r.sub}
                      </div>
                      {(r.difficulty || r.category) && (
                        <div className="text-[11px] text-neutral-500">
                          {r.difficulty ? DIFFICULTY_LABEL[r.difficulty] : ''}
                          {r.difficulty && r.category ? ' · ' : ''}
                          {r.category ?? ''}
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-xs tabular-nums text-neutral-400">
                      {r.correct}/{r.total}
                    </div>
                    <div
                      className={
                        'w-12 rounded-md px-1.5 py-0.5 text-center font-mono text-xs tabular-nums ' +
                        pctColor(pct)
                      }
                    >
                      {accuracyPct(r.correct, r.total)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {stats.totalRounds > 0 && (
          <button
            onClick={onResetStats}
            className="mt-5 text-xs text-neutral-500 hover:text-neutral-300"
          >
            Reset all stats
          </button>
        )}
      </div>
    </div>
  );
}

function pctColor(pct: number): string {
  if (pct >= 75) return 'bg-emerald-900/40 text-emerald-300';
  if (pct >= 50) return 'bg-amber-900/40 text-amber-300';
  return 'bg-red-900/40 text-red-300';
}
