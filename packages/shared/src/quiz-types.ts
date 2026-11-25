export interface QuizQuestion {
  id: number;
  prompt: string;
  kind: string;
  options: { id: number; text: string }[];
  visual?: string;
  buckets?: string[];
  items?: { text: string }[];
}

export interface QuizDetail {
  id: number;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizFeedback {
  correct: boolean;
  tryNumber: number;
  questionDone: boolean;
  hint?: string;
  explanation?: string;
  correctOptionId?: number;
  result?: string;
}

export interface QuizResult {
  score: number;
  stars: number;
  coinsAwarded: number;
  xpAwarded: number;
}
