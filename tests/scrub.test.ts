import { describe, expect, it } from 'vitest';
import {
  isPostScrubbedTitleAcceptable,
  scrubComment,
  scrubText,
  scrubTitle,
  shouldRejectComment,
  shouldRejectPost,
  truncateComment,
  type RawRedditComment,
  type RawRedditPost,
} from '../scripts/scrub';

const basePost = (overrides: Partial<RawRedditPost> = {}): RawRedditPost => ({
  id: 't3_abc',
  subreddit: 'AskReddit',
  title: 'A perfectly fine title for this post',
  selftext: 'body',
  selftext_html: null,
  score: 100,
  num_comments: 10,
  permalink: '/r/AskReddit/comments/abc',
  created_utc: 0,
  link_flair_text: null,
  over_18: false,
  stickied: false,
  distinguished: null,
  author: 'someuser',
  removed_by_category: null,
  ...overrides,
});

const baseComment = (overrides: Partial<RawRedditComment> = {}): RawRedditComment => ({
  id: 't1_abc',
  body: 'A reasonable comment body that is long enough.',
  score: 50,
  author: 'someuser',
  stickied: false,
  distinguished: null,
  ...overrides,
});

describe('scrubText - subreddit name replacements', () => {
  it('replaces direct r/ mentions of the actual subreddit', () => {
    const out = scrubText('I posted in r/AskReddit yesterday.', 'AskReddit');
    expect(out).not.toMatch(/AskReddit/i);
    expect(out).toContain('r/[this sub]');
  });

  it('replaces /r/ slash variant of the actual subreddit', () => {
    const out = scrubText('Originally from /r/AskReddit, sorry.', 'AskReddit');
    expect(out).not.toMatch(/AskReddit/i);
    expect(out).toContain('/r/[this sub]');
  });

  it('replaces bare subreddit name without prefix', () => {
    const out = scrubText('AskReddit is the place for this kind of thing.', 'AskReddit');
    expect(out).not.toMatch(/AskReddit/i);
    expect(out).toContain('[this sub]');
  });

  it('replaces "this sub" / "this subreddit" with "this community"', () => {
    const out1 = scrubText('I love this sub so much.', 'AskReddit');
    expect(out1).toBe('I love this community so much.');
    const out2 = scrubText('Posted on this subreddit last week.', 'AskReddit');
    expect(out2).toContain('on this community');
  });

  it('replaces other-pool sub mentions with a generic placeholder', () => {
    const out = scrubText('Like that famous r/tifu post', 'AskReddit');
    expect(out).not.toMatch(/r\/tifu/i);
    expect(out).toContain('r/[some other sub]');
  });

  it('strips reddit markdown links pointing at sub URLs', () => {
    const out = scrubText('Check [this thread](/r/AskReddit) out.', 'AskReddit');
    expect(out).not.toMatch(/\(\/r\//);
    expect(out).toContain('Check this thread out.');
  });
});

describe('scrubText - initialism handling', () => {
  it('replaces AITA when fetched from AmItheAsshole', () => {
    const out = scrubText('AITA for being late?', 'AmItheAsshole');
    expect(out).not.toMatch(/\bAITA\b/);
    expect(out).toContain('[Am I in the wrong]');
  });

  it('replaces TIFU when fetched from tifu', () => {
    const out = scrubText('TIFU by eating sand', 'tifu');
    expect(out).not.toMatch(/\bTIFU\b/);
    expect(out).toContain('[I messed up]');
  });

  it('replaces YTA / NTA / ESH / NAH verdicts in body text', () => {
    const out = scrubText('People kept telling me NTA but YTA imo. ESH? NAH.', 'tifu');
    expect(out).not.toMatch(/\b(NTA|YTA|ESH|NAH)\b/);
    expect(out).toContain('[redacted judgment]');
  });

  it('replaces MIL when fetched from JUSTNOMIL', () => {
    const out = scrubText('My MIL came over again', 'JUSTNOMIL');
    expect(out).toContain('mother-in-law');
    expect(out).not.toMatch(/\bMIL\b/);
  });
});

describe('scrubText - housekeeping', () => {
  it('decodes common HTML entities', () => {
    const out = scrubText('Tom &amp; Jerry &#x200B; said &quot;hi&quot;', 'AskReddit');
    expect(out).toContain('Tom & Jerry');
    expect(out).toContain('"hi"');
    expect(out).not.toContain('&amp;');
    expect(out).not.toContain('&#x200B;');
  });

  it('strips AutoMod boilerplate paragraphs', () => {
    const text =
      'A normal sentence here.\n\n*This is a friendly reminder to read our rules.*\n\nMore content.';
    const out = scrubText(text, 'AskReddit');
    expect(out).not.toMatch(/friendly reminder/i);
    expect(out).toContain('A normal sentence');
    expect(out).toContain('More content');
  });

  it('collapses 3+ newlines to 2', () => {
    const out = scrubText('para one\n\n\n\n\npara two', 'AskReddit');
    expect(out).toBe('para one\n\npara two');
  });
});

describe('scrubComment - additional rules', () => {
  it('replaces verdict at start of comment with [verdict]', () => {
    const out = scrubComment('NTA. Your sister is being unreasonable.', 'relationships');
    expect(out.startsWith('[verdict]')).toBe(true);
    expect(out).not.toMatch(/\bNTA\b/);
  });

  it('replaces verdict tokens anywhere in comment regardless of source sub', () => {
    const out = scrubComment(
      'I think YTA in this case, honestly. Some say NAH but no.',
      'relationships',
    );
    expect(out).not.toMatch(/\b(NTA|YTA|ESH|NAH|INFO)\b/);
  });

  it('replaces INFO verdict in comments (always)', () => {
    const out = scrubComment('INFO needed before we can decide.', 'AmItheAsshole');
    expect(out).not.toMatch(/\bINFO\b/);
    expect(out).toContain('[verdict]');
  });
});

describe('shouldRejectComment', () => {
  it('rejects [deleted] / [removed] body', () => {
    expect(shouldRejectComment(baseComment({ body: '[deleted]' }))).toBe(true);
    expect(shouldRejectComment(baseComment({ body: '[removed]' }))).toBe(true);
  });

  it('rejects AutoModerator / [deleted] / *Bot authors', () => {
    expect(shouldRejectComment(baseComment({ author: 'AutoModerator' }))).toBe(true);
    expect(shouldRejectComment(baseComment({ author: '[deleted]' }))).toBe(true);
    expect(shouldRejectComment(baseComment({ author: 'sneaky-Bot' }))).toBe(true);
    expect(shouldRejectComment(baseComment({ author: 'WikiTextBot' }))).toBe(true);
  });

  it('rejects stickied or moderator-distinguished comments', () => {
    expect(shouldRejectComment(baseComment({ stickied: true }))).toBe(true);
    expect(shouldRejectComment(baseComment({ distinguished: 'moderator' }))).toBe(true);
  });

  it('rejects low-score / null-score / negative-score comments', () => {
    expect(shouldRejectComment(baseComment({ score: 4 }))).toBe(true);
    expect(shouldRejectComment(baseComment({ score: null }))).toBe(true);
    expect(shouldRejectComment(baseComment({ score: -3 }))).toBe(true);
  });

  it('truncates rather than rejects long comments', () => {
    const long = 'x'.repeat(2000);
    expect(truncateComment(long).length).toBe(1001); // 1000 + ellipsis
    expect(truncateComment(long).endsWith('…')).toBe(true);
  });

  it('keeps a healthy comment', () => {
    expect(shouldRejectComment(baseComment())).toBe(false);
  });
});

describe('shouldRejectPost', () => {
  it('rejects posts removed by mods/admins', () => {
    expect(shouldRejectPost(basePost({ removed_by_category: 'moderator' }))).toBe(true);
  });

  it('rejects [removed] / [deleted] selftext', () => {
    expect(shouldRejectPost(basePost({ selftext: '[removed]' }))).toBe(true);
    expect(shouldRejectPost(basePost({ selftext: '[deleted]' }))).toBe(true);
  });

  it('rejects NSFW posts (over_18)', () => {
    expect(shouldRejectPost(basePost({ over_18: true }))).toBe(true);
  });

  it('rejects stickied posts', () => {
    expect(shouldRejectPost(basePost({ stickied: true }))).toBe(true);
  });

  it('rejects mod- and admin-distinguished posts', () => {
    expect(shouldRejectPost(basePost({ distinguished: 'moderator' }))).toBe(true);
    expect(shouldRejectPost(basePost({ distinguished: 'admin' }))).toBe(true);
  });

  it('rejects AutoModerator / [deleted] authors', () => {
    expect(shouldRejectPost(basePost({ author: 'AutoModerator' }))).toBe(true);
    expect(shouldRejectPost(basePost({ author: '[deleted]' }))).toBe(true);
  });

  it('rejects crossposts', () => {
    expect(shouldRejectPost(basePost({ crosspost_parent_list: [{}] }))).toBe(true);
  });

  it('keeps a healthy post', () => {
    expect(shouldRejectPost(basePost())).toBe(false);
  });
});

describe('post body / title length gating', () => {
  it('flags titles under 15 chars after scrub as unacceptable', () => {
    expect(isPostScrubbedTitleAcceptable('short')).toBe(false);
    expect(isPostScrubbedTitleAcceptable('A perfectly fine title here')).toBe(true);
  });

  it('rejects an empty title after scrubbing (e.g. title was just the sub name)', () => {
    const scrubbed = scrubTitle('AskReddit', 'AskReddit');
    expect(isPostScrubbedTitleAcceptable(scrubbed)).toBe(false);
  });

  it('keeps link posts (empty body) — empty body is OK, not null', () => {
    expect(scrubText('', 'AskReddit')).toBe('');
  });
});
