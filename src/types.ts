export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SubredditMeta {
  name: string;
  difficulty: Difficulty;
  category: string;
  description: string;
}

export interface Comment {
  id: string;
  body: string;
  score: number;
}

export interface Post {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  score: number;
  numComments: number;
  permalink: string;
  createdUtc: number;
  flair: string | null;
  comments: Comment[];
}

export interface PostsFile {
  generatedAt: string;
  count: number;
  posts: Post[];
}

export interface Round {
  post: Post;
  choices: string[];
  correctIndex: number;
}

export interface GameStats {
  totalRounds: number;
  correctRounds: number;
  currentStreak: number;
  bestStreak: number;
  perSubAccuracy: Record<string, { correct: number; total: number }>;
}
