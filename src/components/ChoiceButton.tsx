export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'disabled';

interface Props {
  choice: string;
  state: ChoiceState;
  index: number;
  onClick: () => void;
}

export function ChoiceButton({ choice, state, index, onClick }: Props) {
  const base =
    'group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors sm:text-base';
  const styleByState: Record<ChoiceState, string> = {
    idle:
      'border-neutral-700 bg-neutral-900 text-neutral-100 hover:border-neutral-600 hover:bg-neutral-800',
    correct: 'border-emerald-500/70 bg-emerald-600/20 text-emerald-100 animate-bump',
    wrong: 'border-red-500/70 bg-red-600/20 text-red-100 animate-shake',
    disabled: 'cursor-not-allowed border-neutral-800 bg-neutral-900/50 text-neutral-500',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== 'idle'}
      aria-label={`Choice ${index + 1}: r/${choice}`}
      className={`${base} ${styleByState[state]}`}
    >
      <span
        className={
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs ' +
          (state === 'idle'
            ? 'bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700'
            : state === 'correct'
              ? 'bg-emerald-500/30 text-emerald-100'
              : state === 'wrong'
                ? 'bg-red-500/30 text-red-100'
                : 'bg-neutral-800/60 text-neutral-500')
        }
      >
        {index + 1}
      </span>
      <span className="truncate">r/{choice}</span>
      {state === 'correct' && <span className="ml-auto text-xs">✓ correct</span>}
      {state === 'wrong' && <span className="ml-auto text-xs">✗ your pick</span>}
    </button>
  );
}
