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

const USER_AGENT = 'reddit-geoguesser/1.0 (by /u/anonymous)';
const TARGET_PER_SUB = 25;
const POSTS_PER_SUB_FETCH = 100;
const MIN_PER_SUB_WARN = 15;
const COMMENTS_PER_POST = 5;
const LISTING_SLEEP_MS = 2000;
const COMMENTS_SLEEP_MS = 3000;

// Per-route 429 backoff schedule. Indexed by attempt number (1-based).
// Reddit's per-route bucket usually clears within 90–180s.
const BACKOFF_SCHEDULE_S = [90, 180, 270];
const MAX_RETRY_ATTEMPTS = BACKOFF_SCHEDULE_S.length;

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
    if (attempt > MAX_RETRY_ATTEMPTS) {
      throw new Error(`Rate limited ${MAX_RETRY_ATTEMPTS}+ times on ${url}, giving up.`);
    }
    // Honor Retry-After if Reddit sends it; cap at 5 minutes.
    const retryAfterHeader = res.headers.get('retry-after');
    const fromHeader = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
    const sleepSec =
      !isNaN(fromHeader) && fromHeader > 0
        ? Math.min(fromHeader, 300)
        : (BACKOFF_SCHEDULE_S[attempt - 1] ?? 270);
    process.stdout.write(
      `\n  ! 429 — sleeping ${sleepSec}s (retry ${attempt}/${MAX_RETRY_ATTEMPTS})\n  `,
    );
    await sleep(sleepSec * 1000);
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

interface SubQueue {
  name: string;
  candidates: RawRedditPost[]; // already passed shouldRejectPost + scrub-acceptability
  kept: Post[];
  rejectedRaw: number;
  rejectedScrub: number;
  commentsFailed: number;
  commentLimit: number;
}

interface SummaryRow {
  subreddit: string;
  posts: Post[];
  rejectedRaw: number;
  rejectedScrub: number;
  commentsFailed: number;
}

async function gatherListings(
  subs: { name: string }[],
  postLimit: number | null,
): Promise<SubQueue[]> {
  console.log(`\n━━━ Phase 1: listings (${subs.length} subs) ━━━`);
  const queues: SubQueue[] = [];
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i]!;
    process.stdout.write(`[${i + 1}/${subs.length}] r/${sub.name}  `);
    let raw: RawRedditPost[];
    try {
      raw = await fetchTopPosts(sub.name);
    } catch (err) {
      console.warn(`! listing failed: ${(err as Error).message}`);
      queues.push({
        name: sub.name,
        candidates: [],
        kept: [],
        rejectedRaw: 0,
        rejectedScrub: 0,
        commentsFailed: 0,
        commentLimit: postLimit ?? TARGET_PER_SUB,
      });
      continue;
    }

    const ranked = raw
      .map((p) => ({ post: p, score: p.score ?? 0 }))
      .sort((a, b) => b.score - a.score);

    let rejectedRaw = 0;
    let rejectedScrub = 0;
    const candidates: RawRedditPost[] = [];
    const cap = postLimit ?? TARGET_PER_SUB;
    for (const { post } of ranked) {
      if (candidates.length >= cap) break;
      if (shouldRejectPost(post)) {
        rejectedRaw++;
        continue;
      }
      const t = scrubTitle(post.title, post.subreddit);
      const b = scrubText(post.selftext ?? '', post.subreddit);
      if (!isPostScrubbedTitleAcceptable(t)) {
        rejectedScrub++;
        continue;
      }
      if (!isPostScrubbedBodyAcceptable(b)) {
        rejectedScrub++;
        continue;
      }
      candidates.push(post);
    }
    console.log(`fetched ${raw.length}, candidates ${candidates.length} (raw=${rejectedRaw} scrub=${rejectedScrub})`);

    queues.push({
      name: sub.name,
      candidates,
      kept: [],
      rejectedRaw,
      rejectedScrub,
      commentsFailed: 0,
      commentLimit: cap,
    });

    if (i < subs.length - 1) {
      await sleep(LISTING_SLEEP_MS);
    }
  }
  return queues;
}

async function harvestCommentsRoundRobin(queues: SubQueue[]): Promise<void> {
  const totalCandidates = queues.reduce((sum, q) => sum + Math.min(q.candidates.length, q.commentLimit), 0);
  console.log(`\n━━━ Phase 2: comment fetches — round-robin (${totalCandidates} posts) ━━━`);
  if (totalCandidates === 0) return;

  let tick = 0;
  while (true) {
    tick++;
    const tickLabel = String(tick).padStart(2, '0');
    process.stdout.write(`tick ${tickLabel}  `);
    let processedThisTick = 0;

    for (const q of queues) {
      if (q.kept.length >= q.commentLimit) continue;
      if (q.candidates.length === 0) continue;

      const post = q.candidates.shift()!;
      let rawComments: RawRedditComment[] = [];
      let mark = '.';
      try {
        rawComments = await fetchTopLevelComments(post.subreddit, post.id);
      } catch (err) {
        q.commentsFailed++;
        mark = 'x';
        // Keep on its own line so the tick row stays readable
        process.stdout.write(`\n  ! r/${post.subreddit} ${post.id}: ${(err as Error).message}\n  `);
      }

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

      q.kept.push(buildPost(post, surviving));
      process.stdout.write(mark);
      processedThisTick++;

      await sleep(COMMENTS_SLEEP_MS);
    }

    process.stdout.write(`  (${processedThisTick} posts)\n`);
    if (processedThisTick === 0) break;
  }
}

function summarize(rows: SummaryRow[]): void {
  console.log('\n━━━ Summary ━━━');
  console.log(
    'subreddit'.padEnd(28) +
      'kept'.padEnd(7) +
      'avg cmt'.padEnd(9) +
      'cmt-fail'.padEnd(10) +
      'rejected',
  );
  console.log('─'.repeat(70));
  let totalPosts = 0;
  let totalComments = 0;
  let totalCommentFails = 0;
  for (const r of rows) {
    const cmtTotal = r.posts.reduce((sum, p) => sum + p.comments.length, 0);
    const avg = r.posts.length === 0 ? '0.00' : (cmtTotal / r.posts.length).toFixed(2);
    const rej = `raw=${r.rejectedRaw} scrub=${r.rejectedScrub}`;
    console.log(
      `r/${r.subreddit}`.padEnd(28) +
        String(r.posts.length).padEnd(7) +
        avg.padEnd(9) +
        String(r.commentsFailed).padEnd(10) +
        rej,
    );
    totalPosts += r.posts.length;
    totalComments += cmtTotal;
    totalCommentFails += r.commentsFailed;
  }
  console.log('─'.repeat(70));
  const avgAll = totalPosts === 0 ? '0.00' : (totalComments / totalPosts).toFixed(2);
  console.log(
    `TOTAL`.padEnd(28) +
      String(totalPosts).padEnd(7) +
      avgAll.padEnd(9) +
      String(totalCommentFails).padEnd(10),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const subs = args.limitSubs != null ? SUBREDDITS.slice(0, args.limitSubs) : SUBREDDITS;

  console.log(`Fetching ${subs.length} subreddit(s)`);
  if (args.limitPosts != null) console.log(`(--limit-posts ${args.limitPosts} per sub)`);

  const queues = await gatherListings(subs, args.limitPosts);
  await harvestCommentsRoundRobin(queues);

  const rows: SummaryRow[] = queues.map((q) => ({
    subreddit: q.name,
    posts: q.kept,
    rejectedRaw: q.rejectedRaw,
    rejectedScrub: q.rejectedScrub,
    commentsFailed: q.commentsFailed,
  }));

  for (const r of rows) {
    if (r.posts.length < MIN_PER_SUB_WARN && (args.limitPosts ?? TARGET_PER_SUB) >= MIN_PER_SUB_WARN) {
      console.warn(`  ⚠ low yield for r/${r.subreddit}: only ${r.posts.length} posts`);
    }
  }

  const allPosts = rows.flatMap((r) => r.posts);
  const file: PostsFile = {
    generatedAt: new Date().toISOString(),
    count: allPosts.length,
    posts: allPosts,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(file, null, 2), 'utf8');
  console.log(`\nWrote ${OUT_PATH} (${allPosts.length} posts)`);

  summarize(rows);
}

main().catch((err) => {
  console.error('Fetch failed:', err);
  process.exit(1);
});
