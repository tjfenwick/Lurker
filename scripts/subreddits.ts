import type { SubredditMeta } from '../src/types';

export const SUBREDDITS: SubredditMeta[] = [
  // ─── EASY (very distinct vibes) ───
  {
    name: 'AskReddit',
    difficulty: 'easy',
    category: 'discussion',
    description: 'Open-ended questions to the community.',
  },
  {
    name: 'AmItheAsshole',
    difficulty: 'easy',
    category: 'judgment',
    description: 'Judges who is in the wrong in interpersonal conflicts.',
  },
  {
    name: 'wallstreetbets',
    difficulty: 'easy',
    category: 'finance',
    description: 'High-risk options trading and memes.',
  },
  {
    name: 'cscareerquestions',
    difficulty: 'easy',
    category: 'career',
    description: 'Software engineering career advice.',
  },
  {
    name: 'personalfinance',
    difficulty: 'easy',
    category: 'finance',
    description: 'Budgeting, debt, retirement, and money basics.',
  },
  {
    name: 'legaladvice',
    difficulty: 'easy',
    category: 'advice',
    description: 'Free informal legal questions, US-centric.',
  },
  {
    name: 'relationships',
    difficulty: 'easy',
    category: 'advice',
    description: 'Long-form relationship advice posts.',
  },
  {
    name: 'tifu',
    difficulty: 'easy',
    category: 'stories',
    description: '"Today I F—-ed Up" — confession-style mishap stories.',
  },
  {
    name: 'MaliciousCompliance',
    difficulty: 'easy',
    category: 'stories',
    description: 'Following the rules to spite someone.',
  },
  {
    name: 'antiwork',
    difficulty: 'easy',
    category: 'work',
    description: 'Workplace grievances and anti-capitalism.',
  },

  // ─── MEDIUM (recognizable but easier to confuse) ───
  {
    name: 'CasualConversation',
    difficulty: 'medium',
    category: 'discussion',
    description: 'Low-stakes friendly chat.',
  },
  {
    name: 'Showerthoughts',
    difficulty: 'medium',
    category: 'humor',
    description: 'Mildly profound one-liners.',
  },
  {
    name: 'changemyview',
    difficulty: 'medium',
    category: 'discussion',
    description: 'Defending a stance and inviting rebuttals.',
  },
  {
    name: 'unpopularopinion',
    difficulty: 'medium',
    category: 'discussion',
    description: 'Hot takes the poster claims are unpopular.',
  },
  {
    name: 'NoStupidQuestions',
    difficulty: 'medium',
    category: 'discussion',
    description: 'Earnest questions, no judgment.',
  },
  {
    name: 'TwoXChromosomes',
    difficulty: 'medium',
    category: 'discussion',
    description: 'Posts and discussion centered on women.',
  },
  {
    name: 'pettyrevenge',
    difficulty: 'medium',
    category: 'stories',
    description: 'Small-scale revenge stories.',
  },
  {
    name: 'ProRevenge',
    difficulty: 'medium',
    category: 'stories',
    description: 'Larger, more elaborate revenge stories.',
  },
  {
    name: 'confession',
    difficulty: 'medium',
    category: 'stories',
    description: 'Anonymous confessions.',
  },
  {
    name: 'offmychest',
    difficulty: 'medium',
    category: 'stories',
    description: 'Venting about anything weighing on you.',
  },
  {
    name: 'JUSTNOMIL',
    difficulty: 'medium',
    category: 'stories',
    description: 'Stories about difficult mothers-in-law.',
  },

  // ─── HARD (overlap heavily with each other) ───
  {
    name: 'AmIOverreacting',
    difficulty: 'hard',
    category: 'judgment',
    description: 'Asking if a reaction was proportionate.',
  },
  {
    name: 'relationship_advice',
    difficulty: 'hard',
    category: 'advice',
    description: 'Shorter-form relationship questions.',
  },
  {
    name: 'Advice',
    difficulty: 'hard',
    category: 'advice',
    description: 'General life advice catch-all.',
  },
  {
    name: 'TrueOffMyChest',
    difficulty: 'hard',
    category: 'stories',
    description: 'Stricter-moderated venting community.',
  },
  {
    name: 'self',
    difficulty: 'hard',
    category: 'discussion',
    description: 'Self-posts, very general.',
  },
  {
    name: 'DecidingToBeBetter',
    difficulty: 'hard',
    category: 'advice',
    description: 'Self-improvement focus.',
  },
  {
    name: 'BestofRedditorUpdates',
    difficulty: 'hard',
    category: 'stories',
    description: 'Curated multi-part story updates from elsewhere on Reddit.',
  },
  {
    name: 'entitledparents',
    difficulty: 'hard',
    category: 'stories',
    description: 'Stories about overbearing parents (often disputed authenticity).',
  },
  {
    name: 'raisedbynarcissists',
    difficulty: 'hard',
    category: 'stories',
    description: 'Support and stories from people raised by narcissistic parents.',
  },
  {
    name: 'TalesFromRetail',
    difficulty: 'hard',
    category: 'work',
    description: 'Customer-service horror stories.',
  },
];
