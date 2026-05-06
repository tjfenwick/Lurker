import type { Difficulty } from '../types';

const OPTIONS: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'distinct vibes' },
  { value: 'medium', label: 'Medium', hint: 'recognizable but easy to confuse' },
  { value: 'hard', label: 'Hard', hint: 'overlap heavily' },
];

interface Props {
  value: Difficulty;
  onChange: (next: Difficulty) => void;
}

export function DifficultyToggle({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Difficulty" className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-1">
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={
                'rounded-md px-3 py-2 text-sm font-medium transition-colors ' +
                (selected
                  ? 'bg-reddit-orange text-white shadow'
                  : 'text-neutral-300 hover:bg-neutral-800')
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-500">
        {OPTIONS.find((o) => o.value === value)?.hint}
      </p>
    </div>
  );
}
