import {
  buildQuizUnits,
  countQuestionsInUnits,
  createGroupMap,
  createQuestionMap,
  selectQuizUnitsByQuestionCount
} from "../src/quiz/buildQuizUnits";
import { filterExamSets } from "../src/quiz/filterExamSets";
import { flattenQuizUnits } from "../src/quiz/flattenQuizUnits";
import type { ExamSet, Question, QuestionGroup } from "../src/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function question(id: string, subject: Question["subject"], groupId?: string, groupOrder?: number): Question {
  return {
    id,
    subject,
    type: groupId ? "passage_single_choice" : "single_choice",
    topic: "fixture",
    difficulty: "easy",
    sourceType: "public_source",
    sourceUrl: "https://example.test/exam",
    sourceSite: "example.test",
    sourceYear: 2024,
    groupId,
    groupOrder,
    reviewed: true,
    question: `Question ${id}`,
    passage: groupId ? "Shared passage for fixture questions." : undefined,
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "Fixture explanation."
  };
}

const englishQuestions = [
  question("eng-1", "english", "group-eng", 1),
  question("eng-2", "english", "group-eng", 2),
  question("eng-3", "english", "group-eng", 3),
  question("eng-standalone", "english")
];

const tznkQuestions = [
  question("tznk-1", "tznk", "group-tznk", 1),
  question("tznk-2", "tznk", "group-tznk", 2),
  question("tznk-3", "tznk", "group-tznk", 3),
  question("tznk-4", "tznk", "group-tznk", 4)
];

const groups: QuestionGroup[] = [
  {
    id: "group-eng",
    subject: "english",
    title: null,
    passage: "Shared passage for English fixture questions.",
    questionIds: ["eng-1", "eng-2", "eng-3"],
    sourceType: "public_source",
    sourceUrl: "https://example.test/exam",
    sourceSite: "example.test",
    sourceYear: 2024,
    tags: ["fixture"]
  },
  {
    id: "group-tznk",
    subject: "tznk",
    title: null,
    passage: "Спільна умова для завдань ТЗНК.",
    questionIds: ["tznk-1", "tznk-2", "tznk-3", "tznk-4"],
    sourceType: "public_source",
    sourceUrl: "https://example.test/tznk",
    sourceSite: "example.test",
    sourceYear: 2023,
    tags: ["fixture"]
  }
];

const examSets: ExamSet[] = [
  {
    id: "english-2024",
    subject: "english",
    title: "English 2024",
    description: null,
    sourceType: "public_source",
    sourceSite: "example.test",
    sourceUrl: "https://example.test/exam",
    year: 2024,
    variant: "A",
    tags: ["fixture"],
    units: [{ type: "question", questionId: "eng-standalone" }, { type: "group", groupId: "group-eng" }]
  },
  {
    id: "tznk-2023",
    subject: "tznk",
    title: "TZNK 2023",
    description: null,
    sourceType: "public_source",
    sourceSite: "example.test",
    sourceUrl: "https://example.test/tznk",
    year: 2023,
    variant: "B",
    tags: ["fixture"],
    units: [{ type: "group", groupId: "group-tznk" }]
  }
];

const allQuestions = [...englishQuestions, ...tznkQuestions];
const questionsById = createQuestionMap(allQuestions);
const groupsById = createGroupMap(groups);

const randomUnits = buildQuizUnits(englishQuestions, groups);
assert(randomUnits.length === 2, "Expected one English group unit and one standalone unit");
assert(randomUnits[0].type === "group", "Expected grouped questions to become a group unit");

const flattened = flattenQuizUnits(randomUnits, questionsById, groupsById);
assert(
  flattened.questions.map((item) => item.id).join(",") === "eng-1,eng-2,eng-3,eng-standalone",
  "Expected flattened units to preserve group question order"
);
assert(
  flattened.groupContextByQuestionId.get("eng-2")?.order === 2,
  "Expected group context to preserve question position inside group"
);

const selected = selectQuizUnitsByQuestionCount(randomUnits, 2, groupsById);
assert(selected.length === 1 && selected[0].type === "question", "Expected selection to avoid splitting a large group");
assert(countQuestionsInUnits(selected, groupsById) === 1, "Expected compatible standalone selection under target");

const oversized = selectQuizUnitsByQuestionCount([{ type: "group", groupId: "group-tznk" }], 2, groupsById);
assert(oversized.length === 1, "Expected a full group when no compatible smaller unit exists");
assert(countQuestionsInUnits(oversized, groupsById) === 4, "Expected full group context to exceed target when necessary");

const mistakeUnits = buildQuizUnits([englishQuestions[1]], groups, { groupMatchMode: "any" });
const mistakeFlattened = flattenQuizUnits(mistakeUnits, questionsById, groupsById);
assert(
  mistakeFlattened.questions.map((item) => item.id).join(",") === "eng-1,eng-2,eng-3",
  "Expected mistakes mode to include full group context"
);

const filteredExamSets = filterExamSets(examSets, {
  subjectId: "english",
  sourceSite: "example.test",
  sourceYear: 2024,
  sourceFilter: "imported"
});
assert(filteredExamSets.length === 1 && filteredExamSets[0].id === "english-2024", "Expected source/year exam set filtering");

console.log("Quiz unit tests passed.");
