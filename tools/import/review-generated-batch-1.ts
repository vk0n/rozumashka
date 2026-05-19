import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type QuestionPatch = Partial<Omit<Question, "id" | "subject" | "sourceType" | "sourceUrl">>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const tznkPath = path.join(projectRoot, "data", "generated", "tznk.generated.json");
const englishPath = path.join(projectRoot, "data", "generated", "english.generated.json");

const tznkPatches: Record<string, QuestionPatch> = {
  "tznk-generated-batch-1-021": {
    question: "Яке розміщення відповідає всім умовам черги?",
    explanation:
      "Антон має бути перед Богданом, а Валерія - одразу після Антона. У правильному порядку це виконано, і Ганна не стоїть першою. Інші варіанти порушують хоча б одну з умов."
  },
  "tznk-generated-batch-1-022": {
    explanation:
      "Право не може бути о 10:00. Якщо право о 12:00, економіка може бути о 10:00; якщо право о 14:00, економіка може бути о 10:00 або 12:00. Отже, конкретний час лекції з права не визначається однозначно."
  },
  "tznk-generated-batch-1-024": {
    explanation:
      "У правильному порядку Ігор виступає першим, Олена - перед Марком, Марко - перед Софією, а Дарина не остання. Інші варіанти порушують порядок Олена-Марко-Софія або позицію Ігоря."
  },
  "tznk-generated-batch-1-026": {
    passage:
      "Команда має виконати аналіз, дизайн, тестування і презентацію. Дизайн виконують після аналізу. Тестування виконують після дизайну. Презентація остання.",
    explanation:
      "Презентація має бути останньою. Дизайн можливий лише після аналізу, а тестування - після дизайну. Тому єдиний порядок: аналіз, дизайн, тестування, презентація; другою дією є дизайн."
  },
  "tznk-generated-batch-1-028": {
    passage:
      "Чотири повідомлення надсилають послідовно: запрошення, підтвердження, нагадування і подяку. Підтвердження надсилають після запрошення. Нагадування надсилають після підтвердження. Подяка не може бути першою.",
    question: "Який порядок надсилання повідомлень можливий?",
    options: [
      "запрошення, підтвердження, нагадування, подяка",
      "підтвердження, запрошення, нагадування, подяка",
      "запрошення, нагадування, підтвердження, подяка",
      "подяка, запрошення, підтвердження, нагадування"
    ],
    correctAnswer: 0,
    explanation:
      "Підтвердження має бути після запрошення, а нагадування - після підтвердження. У правильному порядку ці умови виконано, і подяка не стоїть першою. Решта варіантів порушують принаймні одну умову."
  },
  "tznk-generated-batch-1-029": {
    passage:
      "На круглому столі мають виступити Ніна, Павло, Роман і Тетяна. Ніна виступає після Павла. Роман виступає перед Тетяною. Павло не перший.",
    options: [
      "Павло не може бути четвертим",
      "Павло обов'язково третій",
      "Тетяна не може бути другою",
      "Ніна обов'язково третя"
    ],
    correctAnswer: 0,
    explanation:
      "Ніна має виступити після Павла, тому Павло не може бути четвертим: після нього не залишилося б місця для Ніни. Інші твердження не є обов'язковими, бо можливі різні допустимі порядки."
  },
  "tznk-generated-batch-1-043": {
    question: "Який висновок не суперечить наведеній інформації?",
    explanation:
      "Сині папки вже забрали, зелені ще перевіряють, а червона лежить на полиці. Тому не суперечить інформації припущення, що червона папка може бути серед готових замовлень, які ще не забрали. Сильніші твердження не випливають."
  },
  "tznk-generated-batch-1-049": {
    difficulty: "medium",
    passage:
      "Організатори надсилають QR-код тільки після підтвердження участі. QR-код може надіслати координатор або асистент. Наталя отримала QR-код від асистента.",
    question: "Який висновок точно випливає?",
    options: [
      "Участь Наталі підтверджено",
      "QR-код завжди надсилає лише координатор",
      "Наталя не отримувала листів від організаторів",
      "Асистент не має права надсилати QR-коди"
    ],
    correctAnswer: 0,
    explanation:
      "За умовою QR-код надсилають тільки після підтвердження участі. Наталя отримала QR-код, отже її участь підтверджено. Те, що код надіслав асистент, не суперечить умові."
  },
  "tznk-generated-batch-1-050": {
    difficulty: "medium",
    passage:
      "На сайті курсу написано: «Підсумковий тест відкривається лише після виконання всіх практичних завдань». Інших причин блокування тесту правила не передбачають. Максим бачить підсумковий тест заблокованим.",
    question: "Який висновок випливає з правил сайту?",
    options: [
      "Максим ще не виконав усі практичні завдання",
      "Максим точно не виконав жодного завдання",
      "Підсумковий тест вилучено з курсу",
      "Усі студенти вже склали тест"
    ],
    correctAnswer: 0,
    explanation:
      "Якщо тест відкривається лише після виконання всіх практичних завдань і інших причин блокування немає, то заблокований тест означає, що Максим ще не виконав усі практичні завдання. Про кількість невиконаних завдань нічого не сказано."
  },
  "tznk-generated-batch-1-059": {
    difficulty: "medium"
  },
  "tznk-generated-batch-1-060": {
    question: "Яке число продовжує послідовність: 2, 5, 11, 23, 47, ...?",
    options: ["93", "94", "95", "96"],
    correctAnswer: 2,
    explanation:
      "Кожен наступний член утворюється за правилом «попередній × 2 + 1»: 2×2+1=5, 5×2+1=11, 11×2+1=23, 23×2+1=47. Отже, наступне число: 47×2+1=95."
  },
  "tznk-generated-batch-1-069": {
    question:
      "Середнє арифметичне чотирьох чисел дорівнює 12. Після додавання п'ятого числа середнє стало 15. Чому дорівнює п'яте число?",
    options: ["24", "27", "30", "33"],
    correctAnswer: 1,
    explanation:
      "Сума перших чотирьох чисел дорівнює 4×12=48. Сума п'яти чисел із середнім 15 дорівнює 5×15=75. П'яте число: 75-48=27."
  },
  "tznk-generated-batch-1-070": {
    subtopic: "Пропорції та швидкість",
    question:
      "Маршрут завдовжки 18 км поділили на дві частини у відношенні 2:1. Більшу частину йшли зі швидкістю 4 км/год, меншу - зі швидкістю 3 км/год. Скільки годин тривало проходження всього маршруту?",
    options: ["4 год", "5 год", "6 год", "7 год"],
    correctAnswer: 1,
    explanation:
      "Частини маршруту становлять 12 км і 6 км. Більшу частину проходять за 12/4=3 год, меншу - за 6/3=2 год. Загальний час: 3+2=5 год."
  },
  "tznk-generated-batch-1-079": {
    question:
      "Якщо час вправ збільшити на 50%, а час тестування зменшити на 1 год, якою стане загальна тривалість підготовки?",
    options: ["14 год", "15 год", "16 год", "17 год"],
    correctAnswer: 2,
    explanation:
      "Читання залишається 6 год, вправи збільшуються з 4 до 6 год, повторення залишається 2 год, тестування зменшується з 3 до 2 год. Нова сума: 6+6+2+2=16 год."
  },
  "tznk-generated-batch-1-080": {
    passage:
      "На складі було 70 наборів. У понеділок видали 20 наборів, у вівторок отримали 30 наборів, у середу видали 25% кількості, що була на складі після вівторка.",
    options: ["50", "55", "60", "65"],
    correctAnswer: 2,
    explanation:
      "Після понеділка залишилося 70-20=50 наборів. Після отримання у вівторок стало 80. У середу видали 25% від 80, тобто 20 наборів. Залишилося 80-20=60."
  },
  "tznk-generated-batch-1-091": {
    options: [
      "мистецька, історична, дитяча",
      "дитяча, мистецька, історична",
      "історична, дитяча, мистецька",
      "історична, мистецька, дитяча"
    ],
    correctAnswer: 1,
    explanation:
      "Дитяча екскурсія не остання, а історична має відбутися після мистецької. У правильному порядку дитяча перша, мистецька друга, історична третя. Інші варіанти порушують одну з умов."
  },
  "tznk-generated-batch-1-093": {
    question: "Який варіант заповнення зміни з 10:00 до 11:00 відповідає умовам?",
    explanation:
      "У кімнаті може бути не більше двох людей, а Анна вже працює о 10:00. Додати можна або Бориса, або Віру, але не обох; Гліб у цей час недоступний."
  },
  "tznk-generated-batch-1-094": {
    explanation:
      "У правильному розміщенні довідник стоїть поруч з атласом, а роман не стоїть поруч із поезією. Інші варіанти порушують сусідство довідника й атласа або ставлять роман поруч із поезією."
  },
  "tznk-generated-batch-1-099": {
    explanation:
      "Музей має бути після парку, а замок не може стояти між парком і музеєм. У правильному порядку парк стоїть безпосередньо перед музеєм, а замок - після них, тому умови виконано."
  }
};

const englishPatches: Record<string, QuestionPatch> = {
  "english-generated-batch-1-008": {
    options: [
      "They thought it made the hostel feel too formal.",
      "They immediately asked for stricter rules.",
      "They stopped writing reviews.",
      "They complained about breakfast."
    ],
    correctAnswer: 0,
    explanation: "The passage says some travellers disliked the rule because they felt hostels should be informal."
  },
  "english-generated-batch-1-061": {
    options: ["sent", "were sent", "are sent", "had sent"],
    correctAnswer: 1
  },
  "english-generated-batch-1-093": {
    options: ["concise", "informal", "temporary", "public"]
  },
  "english-generated-batch-1-094": {
    options: ["intuitive", "crowded", "temporary", "manual"]
  },
  "english-generated-batch-1-095": {
    options: ["persuasive", "colourful", "recent", "official"],
    explanation: "Convincing evidence is persuasive: it can make people believe that something is true."
  }
};

function applyPatches(questions: Question[], patches: Record<string, QuestionPatch>): number {
  let rewritten = 0;

  for (const question of questions) {
    const patch = patches[question.id];
    if (!patch) {
      continue;
    }

    Object.assign(question, patch);
    rewritten += 1;
  }

  return rewritten;
}

function setReadingSubtopics(questions: Question[]): number {
  let changed = 0;

  for (const question of questions) {
    if (question.topic !== "Reading comprehension") {
      continue;
    }

    const text = question.question.toLowerCase();
    let subtopic = question.subtopic ?? "Detail understanding";

    if (text.includes("main idea") || text.includes("main purpose") || text.includes("main focus")) {
      subtopic = "Main idea";
    } else if (
      text.includes("infer") ||
      text.includes("suggest") ||
      text.includes("imply") ||
      text.includes("supported") ||
      text.includes("broader idea")
    ) {
      subtopic = "Inference";
    } else if (text.includes("meaning") || text.includes("describes")) {
      subtopic = "Vocabulary in context";
    } else {
      subtopic = "Detail understanding";
    }

    if (question.subtopic !== subtopic) {
      question.subtopic = subtopic;
      changed += 1;
    }
  }

  return changed;
}

function markReviewed(questions: Question[]): void {
  for (const question of questions) {
    question.reviewed = !question.tags?.includes("needs_manual_review");
  }
}

function rebalanceCorrectAnswerPositions(questions: Question[]): number {
  let changed = 0;

  questions.forEach((question, index) => {
    const targetIndex = index % question.options.length;
    if (question.correctAnswer === targetIndex) {
      return;
    }

    const correctOption = question.options[question.correctAnswer];
    const distractors = question.options.filter((_, optionIndex) => optionIndex !== question.correctAnswer);
    const nextOptions = [...distractors];
    nextOptions.splice(targetIndex, 0, correctOption);

    question.options = nextOptions;
    question.correctAnswer = targetIndex;
    changed += 1;
  });

  return changed;
}

async function readQuestions(filePath: string): Promise<Question[]> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as Question[];
}

async function writeQuestions(filePath: string, questions: Question[]): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
}

async function main() {
  const tznk = await readQuestions(tznkPath);
  const english = await readQuestions(englishPath);

  const tznkRewritten = applyPatches(tznk, tznkPatches);
  const englishRewritten = applyPatches(english, englishPatches);
  const englishSubtopicsChanged = setReadingSubtopics(english);

  markReviewed(tznk);
  markReviewed(english);

  const tznkOptionOrderChanged = rebalanceCorrectAnswerPositions(tznk);
  const englishOptionOrderChanged = rebalanceCorrectAnswerPositions(english);

  await writeQuestions(tznkPath, tznk);
  await writeQuestions(englishPath, english);

  console.log(`TZNK substantive rewrites: ${tznkRewritten}`);
  console.log(`English substantive rewrites: ${englishRewritten}`);
  console.log(`English reading subtopics adjusted: ${englishSubtopicsChanged}`);
  console.log(`TZNK option orders rebalanced: ${tznkOptionOrderChanged}`);
  console.log(`English option orders rebalanced: ${englishOptionOrderChanged}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
