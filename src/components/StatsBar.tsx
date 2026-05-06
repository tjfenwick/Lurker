import type { GameStats } from '../types';
import { accuracyPct } from '../util/format';

interface Props {
  stats: GameStats;
  onBackToStart?: () => void;
  onOpenStats?: () => void;
}

export function StatsBar({ stats, onBackToStart, onOpenStats }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-neutral-800 bg-neutral-950/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
      <div className="flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-reddit-orange">Lurker</span>
          {onBackToStart && (
            <button
              onClick={onBackToStart}
              className="text-xs text-neutral-500 hover:text-neutral-300"
              aria-label="Back to start"
            >
              ← menu
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-neutral-300">
          <Stat label="acc" value={accuracyPct(stats.correctRounds, stats.totalRounds)} />
          <Stat label="streak" value={String(stats.currentStreak)} />
          <Stat label="best" value={String(stats.bestStreak)} />
          {onOpenStats && (
            <button
              onClick={onOpenStats}
              aria-label="Open stats"
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            >
              📊
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-mono text-base font-semibold text-neutral-100 tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
    </div>
  );
}
