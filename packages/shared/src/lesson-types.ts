export interface LessonBlock {
  id: number;
  order: number;
  kind: string;
  text: string | null;
  assetPath: string | null;
}

export interface LessonDetail {
  id: number;
  title: string;
  blocks: LessonBlock[];
}

export interface LessonCompletion {
  xpAwarded: number;
}
