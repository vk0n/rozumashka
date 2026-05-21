import type { Question } from "../types";

const ukrainianOptionLetters = ["А", "Б", "В", "Г", "Д", "Е", "Є", "Ж", "З", "И"];
const latinOptionLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function getOptionLetter(question: Pick<Question, "subject">, index: number): string {
  const letters = question.subject === "english" ? latinOptionLetters : ukrainianOptionLetters;
  return letters[index] ?? String(index + 1);
}
