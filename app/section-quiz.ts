import { bookSections, type BookSection } from "./book-content.generated";

export interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
}

function otherSections(index: number) {
  const offsets = [7, 13, 19];
  return offsets.map((offset) => bookSections[(index + offset) % bookSections.length]);
}

function rotateOptions(options: readonly string[], rotation: number) {
  const shift = rotation % options.length;
  return [...options.slice(shift), ...options.slice(0, shift)];
}

function question(id: string, prompt: string, correct: string, distractors: readonly string[], rotation: number): QuizQuestion {
  const unrotated = [correct, ...distractors];
  const options = rotateOptions(unrotated, rotation);
  return { id, prompt, options, correctIndex: options.indexOf(correct) };
}

function firstTopic(section: BookSection) {
  return section.markdown.match(/^## (.+)$/m)?.[1]?.trim() ?? section.title;
}

export function buildSectionQuiz(section: BookSection): readonly QuizQuestion[] {
  const index = bookSections.findIndex((item) => item.slug === section.slug);
  const others = otherSections(index);
  return [
    question("focus", "Which statement best matches this section?", section.summary, others.map((item) => item.summary), index),
    question("topic", "Which topic is explicitly covered here?", firstTopic(section), others.map(firstTopic), index + 1),
  ];
}
