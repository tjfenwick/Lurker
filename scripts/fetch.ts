import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Comment, Post, PostsFile } from '../src/types';
import { SUBREDDITS } from './subreddits';
import {
  type RawRedditComment,
  type RawRedditPost,
  isPostScrubbedBodyAcceptable,
  isPostScrubbedTitleAcceptable,
  scrubComment,
  scrubFlair,
  scrubText,
  scrubTitle,
  shouldRejectComment,
  shouldRejectPost,
  truncateComment,
} from './scrub';

const USER_AGENT = 'lurker/1.0 (Reddit subreddit-guessing game data fetcher)';
const TARGET_PER_SUB = 25;
const POSTS_PER_SUB_FETCH = 100;
const MIN_PER_SUB_WARN = 15;
const COMMENTS_PER_POST = 3;
const LISTING_SLEEP_MS = 2000;
const COMMENTS_SLEEP_MS = 3000;
const RATE_LIMIT_BACKOFF_MS = 60000;

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const OUT_PATH = resolve(ROOT, 'public', 'posts.json');

interface CliArgs {
  limitSubs: number | null;
  limitPosts: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  let limitSubs: number | null = null;
  let limitPosts: number | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit-subs' && i + 1 < argv.length) {
      limitSubs = parseInt(argv[i + 1]!, 10);
      i++;
    } else if (arg === '--limit-posts' && i + 1 < argv.length) {
      limitPosts = parseInt(argv[i + 1]!, 10);
      i++;
    }
  }
  return { limitSubs, limitPosts };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchJson(url: string, attempt = 1): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (res.status === 429) {
    if (attempt > 1) throw new Error(`Rate limited twice on ${url}, giving up.`);
    console.warn(`  ! 429 from ${url} — sleeping ${RATE_LIMIT_BACKOFF_MS / 1000}s and retrying`);
    await sleep(RATE_LIMIT_BACKOFF_MS);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json();
}

interface RawListingChild {
  kind: string;
  data: RawRedditPost;
}

interface RawListing {
  data: { children: RawListingChild[] };
}

interface RawCommentChild {
  kind: string;
  data: RawRedditComment;
}

interface RawCommentsResponse extends Array<unknown> {
  0: unknown;
  1: { data: { children: RawCommentChild[] } };
}

async function fetchTopPosts(subreddit: string): Promise<RawRedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=year&limit=${POSTS_PER_SUB_FETCH}`;
  const data = (await fetchJson(url)) as RawListing;
  return data.data.children.filter((c) => c.kind === 't3').map((c) => c.data);
}

async function fetchTopLevelComments(
  subreddit: string,
  postId: string,
): Promise<RawRedditComment[]> {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=20&depth=1&sort=top`;
  const data = (await fetchJson(url)) as RawCommentsResponse;
  if (!data || !Array.isArray(data) || !data[1]) return [];
  return data[1].data.children.filter((c) => c.kind === 't1').map((c) => c.data);
}

function buildPost(raw: RawRedditPost, scrubbedComments: Comment[]): Post {
  const scrubbedTitle = scrubTitle(raw.title, raw.subreddit);
  const scrubbedBody = scrubText(raw.selftext ?? '', raw.subreddit);
  return {
    id: raw.id,
    subreddit: raw.subreddit,
    title: scrubbedTitle,
    body: scrubbedBody,
    score: raw.score,
    numComments: raw.num_comments,
    permalink: `https://reddit.com${raw.permalink}`,
    createdUtc: raw.created_utc,
    flair: scrubFlair(raw.link_flair_text, raw.subreddit),
    comments: scrubbedComments,
  };
}

interface SubResult {
  subreddit: string;
  posts: Post[];
  fetched: number;
  rejectedRaw: number;
  rejectedScrub: number;
}

async function processSubreddit(subreddit: string, postLimit: number | null): Promise<SubResult> {
  console.log(`\n─── r/${subreddit} ───`);
  let raw: RawRedditPost[];
  try {
    raw = await fetchTopPosts(subreddit);
  } catch (err) {
    console.warn(`  ! listing fetch failed: ${(err as Error).message}`);
    return { subreddit, posts: [], fetched: 0, rejectedRaw: 0, rejectedScrub: 0 };
  }
  console.log(`  listing: ${raw.length} posts`);

  const ranked: Array<{ post: RawRedditPost; score: number }> = raw
    .map((p) => ({ post: p, score: p.score ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const kept: Post[] = [];
  let rejectedRaw = 0;
  let rejectedScrub = 0;
  let processed = 0;

  for (const { post } of ranked) {
    if (kept.length >= TARGET_PER_SUB) break;
    if (postLimit != null && processed >= postLimit) break;
    processed++;

    if (shouldRejectPost(post)) {
      rejectedRaw++;
      continue;
    }
    const scrubbedTitle = scrubTitle(post.title, post.subreddit);
    const scrubbedBody = scrubText(post.selftext ?? '', post.subreddit);
    if (!isPostScrubbedTitleAcceptable(scrubbedTitle)) {
      rejectedScrub++;
      continue;
    }
    if (!isPostScrubbedBodyAcceptable(scrubbedBody)) {
      rejectedScrub++;
      continue;
    }

    let rawComments: RawRedditComment[] = [];
    try {
      rawComments = await fetchTopLevelComments(post.subreddit, post.id);
    } catch (err) {
      console.warn(`  ! comments for ${post.id} failed: ${(err as Error).message}`);
    }
    await sleep(COMMENTS_SLEEP_MS);

    const surviving = rawComments
      .filter((c) => !shouldRejectComment(c))
      .map((c): Comment => {
        const scrubbed = scrubComment(c.body, post.subreddit);
        return {
          id: c.id,
          body: truncateComment(scrubbed),
          score: c.score ?? 0,
        };
      })
      .filter((c) => c.body.length >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, COMMENTS_PER_POST);

    kept.push(buildPost(post, surviving));
    process.stdout.write(`.`);
  }
  process.stdout.write(`\n`);
  console.log(
    `  kept ${kept.length}/${TARGET_PER_SUB}  rejected:raw=${rejectedRaw}  rejected:scrub=${rejectedScrub}`,
  );

  if (kept.length < MIN_PER_SUB_WARN) {
    console.warn(`  ⚠ low yield for r/${subreddit}: only ${kept.length} posts`);
  }
  return {
    subreddit,
    posts: kept,
    fetched: raw.length,
    rejectedRaw,
    rejectedScrub,
  };
}

function summarize(results: SubResult[]): void {
  console.log('\n━━━ Summary ━━━');
  console.log('subreddit'.padEnd(28) + 'kept'.padEnd(8) + 'avg comments');
  console.log('─'.repeat(50));
  let totalPosts = 0;
  let totalComments = 0;
  for (const r of results) {
    const cmtTotal = r.posts.reduce((sum, p) => sum + p.comments.length, 0);
    const avg = r.posts.length === 0 ? '0.00' : (cmtTotal / r.posts.length).toFixed(2);
    console.log(`r/${r.subreddit}`.padEnd(28) + String(r.posts.length).padEnd(8) + avg);
    totalPosts += r.posts.length;
    totalComments += cmtTotal;
  }
  console.log('─'.repeat(50));
  const avgAll = totalPosts === 0 ? '0.00' : (totalComments / totalPosts).toFixed(2);
  console.log(`TOTAL`.padEnd(28) + String(totalPosts).padEnd(8) + avgAll);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const subs = args.limitSubs != null ? SUBREDDITS.slice(0, args.limitSubs) : SUBREDDITS;

  console.log(`Fetching ${subs.length} subreddit(s)`);
  if (args.limitPosts != null) console.log(`(--limit-posts ${args.limitPosts} per sub)`);

  const results: SubResult[] = [];
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i]!;
    console.log(`\n[${i + 1}/${subs.length}]`);
    const result = await processSubreddit(sub.name, args.limitPosts);
    results.push(result);
    if (i < subs.length - 1) {
      await sleep(LISTING_SLEEP_MS);
    }
  }

  const allPosts = results.flatMap((r) => r.posts);
  const file: PostsFile = {
    generatedAt: new Date().toISOString(),
    count: allPosts.length,
    posts: allPosts,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(file, null, 2), 'utf8');
  console.log(`\nWrote ${OUT_PATH} (${allPosts.length} posts)`);

  summarize(results);
}

main().catch((err) => {
  console.error('Fetch failed:', err);
  process.exit(1);
});
