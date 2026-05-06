import { useState } from 'react';
import type { Comment } from '../types';
import { compactNumber } from '../util/format';

const COMMENT_TRUNCATE = 600;

interface Props {
  comments: Comment[];
  hidden: boolean;
  onToggleHidden: () => void;
}

export function CommentsList({ comments, hidden, onToggleHidden }: Props) {
  if (comments.length === 0) return null;
  return (
    <div className="mt-4 border-t border-neutral-800 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Top comments
        </span>
        <button
          onClick={onToggleHidden}
          className="text-xs text-neutral-400 underline-offset-4 hover:text-neutral-200 hover:underline"
        >
          {hidden ? 'Show comments' : 'Hide comments'} <kbd className="text-neutral-600">(c)</kbd>
        </button>
      </div>
      {!hidden && (
        <ul className="space-y-2.5">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false);
  const long = comment.body.length > COMMENT_TRUNCATE;
  const display = !long || expanded ? comment.body : comment.body.slice(0, COMMENT_TRUNCATE) + '…';
  return (
    <li className="flex gap-3 rounded-md border border-neutral-800/60 bg-neutral-900/70 p-2.5 text-sm">
      <div className="flex w-12 shrink-0 flex-col items-center text-neutral-500">
        <span className="text-xs">▲</span>
        <span className="font-mono text-xs tabular-nums text-neutral-400">
          {compactNumber(comment.score)}
        </span>
      </div>
      <div className="min-w-0 flex-1 whitespace-pre-line text-neutral-200">
        {display}
        {long && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 text-xs text-neutral-400 hover:text-neutral-200"
          >
            {expanded ? 'show less' : 'show more'}
          </button>
        )}
      </div>
    </li>
  );
}
