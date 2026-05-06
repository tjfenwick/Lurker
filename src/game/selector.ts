import { SUBREDDITS } from '../../scripts/subreddits';
import type { Difficulty, Post, Round, SubredditMeta } from '../types';

const SUB_BY_NAME: Map<string, SubredditMeta> = new Map(SUBREDDITS.map((s) => [s.name, s]));

export function getSubMeta(name: string): SubredditMeta | undefined {
  return SUB_BY_NAME.get(name);
}

export function subsForDifficulty(difficulty: Difficulty): SubredditMeta[] {
  return SUBREDDITS.filter((s) => s.difficulty === difficulty);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function pickRound(
  posts: Post[],
  difficulty: Difficulty,
  recentlyUsedIds: readonly string[],
  rng: () => number = Math.random,
): Round {
  const subsInDifficulty = subsForDifficulty(difficulty);
  if (subsInDifficulty.length < 4) {
    throw new Error(`Difficulty "${difficulty}" must have at least 4 subreddits in the pool`);
  }
  const namesInDifficulty = new Set(subsInDifficulty.map((s) => s.name));
  const recentlySet = new Set(recentlyUsedIds);

  let eligible = posts.filter((p) => namesInDifficulty.has(p.subreddit) && !recentlySet.has(p.id));
  if (eligible.length === 0) {
    eligible = posts.filter((p) => namesInDifficulty.has(p.subreddit));
    if (eligible.length === 0) {
      throw new Error(`No posts available for difficulty "${difficulty}"`);
    }
  }

  const post = eligible[Math.floor(rng() * eligible.length)]!;
  const correctMeta = getSubMeta(post.subreddit);
  const correctCategory = correctMeta?.category;

  const otherSubs = subsInDifficulty.filter((s) => s.name !== post.subreddit);
  const sameCategoryPool = shuffleInPlace(
    otherSubs.filter((s) => s.category === correctCategory),
    rng,
  );
  const otherCategoryPool = shuffleInPlace(
    otherSubs.filter((s) => s.category !== correctCategory),
    rng,
  );

  const decoys: string[] = [];
  // Prefer 2 same-category, then 1 from a different category.
  for (const s of sameCategoryPool) {
    if (decoys.length >= 2) break;
    decoys.push(s.name);
  }
  for (const s of otherCategoryPool) {
    if (decoys.length >= 3) break;
    decoys.push(s.name);
  }
  // Top up if either pool was too thin.
  if (decoys.length < 3) {
    const fallback = shuffleInPlace([...otherSubs], rng);
    for (const s of fallback) {
      if (decoys.length >= 3) break;
      if (!decoys.includes(s.name)) decoys.push(s.name);
    }
  }

  const choices = shuffleInPlace([post.subreddit, ...decoys], rng);
  const correctIndex = choices.indexOf(post.subreddit);

  return { post, choices, correctIndex };
}
