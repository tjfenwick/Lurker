import { useState } from 'react';
import type { Post } from '../types';
import { compactNumber, timeAgo } from '../util/format';
import { CommentsList } from './CommentsList';

const BODY_TRUNCATE = 1500;

interface Props {
  post: Post;
  commentsHidden: boolean;
  onToggleCommentsHidden: () => void;
}

export function PostCard({ post, commentsHidden, onToggleCommentsHidden }: Props) {
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const longBody = post.body.length > BODY_TRUNCATE;
  const displayBody =
    !longBody || bodyExpanded ? post.body : post.body.slice(0, BODY_TRUNCATE).trimEnd() + '…';

  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-lg sm:p-5">
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
        <span>r/[hidden]</span>
        <span>•</span>
        <span>{timeAgo(post.createdUtc)}</span>
        {post.flair && (
          <>
            <span>•</span>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
              {post.flair}
            </span>
          </>
        )}
      </div>
      <h2 className="text-lg font-semibold leading-snug text-neutral-50 sm:text-xl">
        {post.title}
      </h2>
      {post.body && (
        <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-neutral-200">
          {displayBody}
          {longBody && (
            <button
              onClick={() => setBodyExpanded((v) => !v)}
              className="ml-1 text-sm text-neutral-400 hover:text-neutral-200"
            >
              {bodyExpanded ? 'show less' : '…read more'}
            </button>
          )}
        </div>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span>▲</span>
          <span className="tabular-nums">{compactNumber(post.score)}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>💬</span>
          <span className="tabular-nums">{compactNumber(post.numComments)}</span>
        </span>
      </div>
      <CommentsList
        comments={post.comments}
        hidden={commentsHidden}
        onToggleHidden={onToggleCommentsHidden}
      />
    </article>
  );
}
