import type { LessonBlock } from '@contikids/shared';

export interface LessonStep {
  visual?: LessonBlock;
  paragraphs: string[];
  tip?: boolean;
}

/** La API entrega los bloques en orden. Cada visual inicia un paso y conserva sus textos. */
export function lessonSteps(blocks: readonly LessonBlock[]): LessonStep[] {
  const steps: LessonStep[] = [];
  const tips: LessonStep[] = [];
  for (const block of blocks) {
    const text = block.text?.trim();
    if ((block.kind === 'diagram' && text) || (block.kind === 'image' && block.assetPath?.trim())) {
      steps.push({ visual: block, paragraphs: [] });
    } else if (block.kind === 'text' && text) {
      if (!steps.length) steps.push({ paragraphs: [] });
      steps[steps.length - 1]!.paragraphs.push(text);
    } else if (block.kind === 'waddles_tip' && text) {
      tips.push({ tip: true, paragraphs: [text] });
    }
  }
  return [...steps, ...tips];
}
