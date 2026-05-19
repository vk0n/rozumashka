import type {
  CompletedAttempt,
  Question,
  QuestionResult,
  QuizMode,
  SourceFilter,
  Subject,
  TopicScore
} from "../types";

export function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createResults(
  questions: Question[],
  answers: Record<string, number | undefined>
): QuestionResult[] {
  return questions.map((question) => {
    const selectedAnswer = answers[question.id] ?? null;

    return {
      question,
      selectedAnswer,
      isCorrect: selectedAnswer === question.correctAnswer
    };
  });
}

export function calculateTopicScores(results: QuestionResult[]): TopicScore[] {
  const buckets = new Map<string, { correct: number; total: number }>();

  for (const result of results) {
    const current = buckets.get(result.question.topic) ?? { correct: 0, total: 0 };
    current.total += 1;

    if (result.isCorrect) {
      current.correct += 1;
    }

    buckets.set(result.question.topic, current);
  }

  return [...buckets.entries()].map(([topic, score]) => ({
    topic,
    correct: score.correct,
    total: score.total,
    percentage: score.total === 0 ? 0 : (score.correct / score.total) * 100
  }));
}

export function buildAttempt(
  subject: Subject,
  mode: QuizMode,
  results: QuestionResult[],
  sourceFilter: SourceFilter = "all"
): CompletedAttempt {
  const score = results.filter((result) => result.isCorrect).length;
  const totalQuestions = results.length;
  const wrongQuestionIds = results
    .filter((result) => !result.isCorrect)
    .map((result) => result.question.id);

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    dateTime: new Date().toISOString(),
    subject: subject.id,
    subjectTitle: subject.title,
    mode,
    sourceFilter,
    score,
    totalQuestions,
    percentage: totalQuestions === 0 ? 0 : (score / totalQuestions) * 100,
    wrongQuestionIds,
    topicScores: calculateTopicScores(results),
    results
  };
}
