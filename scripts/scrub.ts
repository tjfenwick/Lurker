import { SUBREDDITS } from './subreddits';

export interface RawRedditPost {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  selftext_html: string | null;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
  link_flair_text: string | null;
  over_18: boolean;
  stickied: boolean;
  distinguished: string | null;
  author: string;
  removed_by_category: string | null;
  crosspost_parent_list?: unknown[];
}

export interface RawRedditComment {
  id: string;
  body: string;
  score: number | null;
  author: string;
  stickied: boolean;
  distinguished: string | null;
}

const POOL_NAMES = SUBREDDITS.map((s) => s.name);
const VERDICT_TOKENS = ['NTA', 'YTA', 'ESH', 'NAH'];
const COMMENT_VERDICT_TOKENS = [...VERDICT_TOKENS, 'INFO'];

// Sentinels prevent the "this sub" → "this community" rule from re-matching
// the inside of "[this sub]" placeholders. Swapped back at the end.
const S_THIS_SUB_PLAIN = 'THIS_SUB_PLAIN';
const S_THIS_SUB_R = 'THIS_SUB_R';
const S_THIS_SUB_SLASH_R = 'THIS_SUB_SLASH_R';
const S_OTHER_SUB_R = 'OTHER_SUB_R';
const S_OTHER_SUB_SLASH_R = 'OTHER_SUB_SLASH_R';

const PLACEHOLDER_LITERAL_RE =
  /\[(?:this sub|this community|some other sub|Am I in the wrong|Would I be in the wrong|I messed up|redacted judgment|verdict)\]/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeHtmlEntities(text: string): string {
  let out = text;
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.split(entity).join(replacement);
  }
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = parseInt(hex, 16);
    if (code === 0x200b || code === 0xfeff) return '';
    return String.fromCodePoint(code);
  });
  out = out.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return String.fromCodePoint(code);
  });
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripAutoModParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const kept = paragraphs.filter((p) => {
    const trimmed = p.trim();
    return !(
      /^\*?\s*This is a friendly reminder/i.test(trimmed) ||
      /^\*?\s*If you are seeing this/i.test(trimmed) ||
      /^I am a bot[, ]/i.test(trimmed) ||
      /^\*I am a bot/i.test(trimmed)
    );
  });
  return kept.join('\n\n');
}

function stripRedditMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(\/?r\/[A-Za-z0-9_]+\/?\)/gi, '$1');
}

function stripTrailingSubEdits(text: string, subreddit: string): string {
  const parts = text.split(/\n{2,}/);
  while (parts.length > 0) {
    const last = parts[parts.length - 1]!.trim();
    const looksLikeEdit = /^edit[: ]/i.test(last);
    if (
      looksLikeEdit &&
      (new RegExp(`(?:^|\\W)/?r/${escapeRegex(subreddit)}\\b`, 'i').test(last) ||
        new RegExp(`\\b${escapeRegex(subreddit)}\\b`, 'i').test(last) ||
        /\bthis sub(?:reddit)?\b/i.test(last) ||
        /\b(NTA|YTA|ESH|NAH)\b/.test(last))
    ) {
      parts.pop();
    } else {
      break;
    }
  }
  return parts.join('\n\n');
}

function replaceCorrectSub(text: string, subreddit: string): string {
  const escaped = escapeRegex(subreddit);
  let out = text;
  out = out.replace(new RegExp(`(?<![A-Za-z0-9_])/r/${escaped}\\b/?`, 'gi'), S_THIS_SUB_SLASH_R);
  out = out.replace(new RegExp(`\\br/${escaped}\\b/?`, 'gi'), S_THIS_SUB_R);
  out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), S_THIS_SUB_PLAIN);
  return out;
}

function replaceOtherPoolSubs(text: string, subreddit: string): string {
  let out = text;
  for (const other of POOL_NAMES) {
    if (other.toLowerCase() === subreddit.toLowerCase()) continue;
    const escaped = escapeRegex(other);
    out = out.replace(new RegExp(`(?<![A-Za-z0-9_])/r/${escaped}\\b/?`, 'gi'), S_OTHER_SUB_SLASH_R);
    out = out.replace(new RegExp(`\\br/${escaped}\\b/?`, 'gi'), S_OTHER_SUB_R);
    // Skip bare-name match for *other* subs — too many false positives on
    // generic names like "self", "Advice", "confession".
  }
  return out;
}

// Sub-specific initialisms that share letters with the sub name (e.g. "tifu" the sub
// vs "TIFU" the abbreviation). Runs before sub-name replacement to avoid the bare
// name match consuming the initialism first.
function replaceSubSpecificInitialisms(text: string, subreddit: string): string {
  let out = text;
  const sub = subreddit.toLowerCase();
  if (sub === 'amitheasshole') {
    out = out.replace(/\bWIBTA\b/g, '[Would I be in the wrong]');
    out = out.replace(/\bAITA\b/g, '[Am I in the wrong]');
  }
  if (sub === 'tifu') {
    out = out.replace(/\bTIFU\b/g, '[I messed up]');
  }
  if (sub === 'justnomil') {
    out = out.replace(/\bMIL\b/g, 'mother-in-law');
  }
  return out;
}

function replaceUniversalPhrases(
  text: string,
  verdictTokens: string[],
  verdictReplacement: string,
): string {
  let out = text;
  out = out.replace(/\bon this sub(?:reddit)?\b/gi, 'on this community');
  out = out.replace(/\bthis sub(?:reddit)?\b/gi, 'this community');
  // Verdict tokens leak judgment-style content. Match uppercase only.
  for (const v of verdictTokens) {
    out = out.replace(new RegExp(`\\b${v}\\b`, 'g'), verdictReplacement);
  }
  return out;
}

function unsentinel(text: string): string {
  return text
    .split(S_THIS_SUB_SLASH_R)
    .join('/r/[this sub]')
    .split(S_THIS_SUB_R)
    .join('r/[this sub]')
    .split(S_THIS_SUB_PLAIN)
    .join('[this sub]')
    .split(S_OTHER_SUB_SLASH_R)
    .join('/r/[some other sub]')
    .split(S_OTHER_SUB_R)
    .join('r/[some other sub]');
}

function applyBodyPipeline(
  text: string,
  subreddit: string,
  verdictTokens: string[],
  verdictReplacement: string,
): string {
  let out = text;
  out = decodeHtmlEntities(out);
  out = stripAutoModParagraphs(out);
  out = stripRedditMarkdownLinks(out);
  out = stripTrailingSubEdits(out, subreddit);
  out = replaceSubSpecificInitialisms(out, subreddit);
  out = replaceCorrectSub(out, subreddit);
  out = replaceOtherPoolSubs(out, subreddit);
  out = replaceUniversalPhrases(out, verdictTokens, verdictReplacement);
  out = unsentinel(out);
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function scrubText(text: string, subreddit: string): string {
  if (!text) return '';
  return applyBodyPipeline(text, subreddit, VERDICT_TOKENS, '[redacted judgment]');
}

export function scrubTitle(title: string, subreddit: string): string {
  if (!title) return '';
  let out = decodeHtmlEntities(title);
  out = stripRedditMarkdownLinks(out);
  out = replaceSubSpecificInitialisms(out, subreddit);
  out = replaceCorrectSub(out, subreddit);
  out = replaceOtherPoolSubs(out, subreddit);
  out = replaceUniversalPhrases(out, VERDICT_TOKENS, '[redacted judgment]');
  out = unsentinel(out);
  return out.replace(/\s+/g, ' ').trim();
}

export function scrubComment(body: string, subreddit: string): string {
  if (!body) return '';
  return applyBodyPipeline(body, subreddit, COMMENT_VERDICT_TOKENS, '[verdict]');
}

export function scrubFlair(flair: string | null, subreddit: string): string | null {
  if (!flair) return null;
  const lower = flair.toLowerCase();
  if (lower.includes(subreddit.toLowerCase())) return null;
  for (const v of VERDICT_TOKENS) {
    if (new RegExp(`\\b${v}\\b`).test(flair)) return null;
  }
  for (const other of POOL_NAMES) {
    if (other.toLowerCase() === subreddit.toLowerCase()) continue;
    if (lower.includes(other.toLowerCase())) return null;
  }
  return flair;
}

export function shouldRejectPost(post: RawRedditPost): boolean {
  if (post.removed_by_category != null) return true;
  if (post.selftext === '[removed]' || post.selftext === '[deleted]') return true;
  if (post.over_18) return true;
  if (post.stickied) return true;
  if (post.distinguished === 'moderator' || post.distinguished === 'admin') return true;
  if (post.author === 'AutoModerator' || post.author === '[deleted]') return true;
  if (Array.isArray(post.crosspost_parent_list) && post.crosspost_parent_list.length > 0) {
    return true;
  }
  return false;
}

export function shouldRejectComment(comment: RawRedditComment): boolean {
  if (!comment.body) return true;
  if (comment.body === '[removed]' || comment.body === '[deleted]') return true;
  if (comment.author === 'AutoModerator' || comment.author === '[deleted]') return true;
  if (/-?Bot$/i.test(comment.author)) return true;
  if (comment.stickied) return true;
  if (comment.distinguished === 'moderator' || comment.distinguished === 'admin') return true;
  if (comment.score == null || comment.score < 5) return true;
  return false;
}

export function truncateComment(body: string, max = 1000): string {
  if (body.length <= max) return body;
  return body.slice(0, max) + '…';
}

// Length-gating for scrubbed titles/bodies. Strips our injected placeholder
// tokens before measuring so a title that's "[this community]" alone reads
// as effectively empty.
export function isPostScrubbedTitleAcceptable(scrubbedTitle: string): boolean {
  const meaningful = scrubbedTitle.replace(PLACEHOLDER_LITERAL_RE, '').replace(/\s+/g, ' ').trim();
  return meaningful.length >= 15;
}

export function isPostScrubbedBodyAcceptable(scrubbedBody: string): boolean {
  return scrubbedBody.length <= 4000;
}
