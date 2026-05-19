import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const tznkTextPassage = `Текст А

(1) Україні властивий патерналізм - політична практика, коли влада сприймає народ як «дитину», яка потребує «батьківської уваги», а населення очікує, що змінювати країну повинна саме влада. Статистика станом на 2018 р. демонструє: 30% українців хотіли б, щоб на чолі стояв диктатор. Але не тому, що їм подобається тиранія, а тому що «вождь» змінить усе самостійно. Значною мірою патерналізм став спадком СРСР, де було вирощено «людину радянську», або Homo Sovieticus.

(2) Цей термін не має єдиного визначення, але саме явище досліджують уже кілька десятиліть. Соціолог Л. Гудков у працях, які вже стали класикою, визначає, що цей тип людей характеризує: 1) масоподібність, або бажання «бути як усі»; 2) пристосуванство й адаптація до наявного соціального порядку, готовність вимагати менше; 3) простота й обмеженість в інтелектуальному та етичному планах; 4) ієрархічність - таким людям далеке поняття «еліти», вони певні, що як матеріальні блага, так і права людини, повага, інтелектуальні якості тощо розподіляють залежно від «посади» й «статусу»; 5) хронічна невдоволеність тим, що «дало життя»; 6) невпевненість у собі, оскільки через нерозвинутість державних інститутів у них немає відчуття соціальної захищеності, «стабільності», унаслідок чого виникає хронічний комплекс недооціненості; 7) відчуття винятковості й зверхності, яким «радянська людина» компенсує свою розчарованість і недооціненість; 8) корумпованість і, як результат, готовність терпіти жорстоке ставлення до себе з боку влади, причому ця корумпованість має різні сторони: не лише влада підкуповується, але й саме населення «продається» за привілеї.

(3) Людям, що сумують за Союзом чи вважають себе громадянами СРСР, характерні окремі ознаки «радянської людини». Але, на жаль, риси «гомосовєтікуса» притаманні значно ширшому колу українців. Крім того, «ностальгуючі» переважно мають низьку соціальну активність і не готові виходити на акції на підтримку своїх поглядів.

(4) Щоб у країні не переважали «гомосовєтікуси», потрібно змінювати політичну культуру. Науковці розрізняють чотири її типи: 1) активна антидемократична, характерна для епохи сталінізму; 2) пасивна антидемократична, властива періоду застою, коли система ще тоталітарна, але захищати її «мовчазна більшість» вже не бажає; 3) активна демократична, характерна для розвинутих держав, де люди готові боротися за демократію та 4) пасивна демократична, коли декларують демократичні принципи, але для їх утілення немає критичної маси людей.

(5) Саме четвертий тип суттєво домінує нині в Україні. А активний антидемократичний переважає над активним демократичним. Простіше кажучи, в Україні живе більше прибічників сталінізму, ніж демократів, готових боротися за права людини. Одна лиш декомунізація чи, як кажуть у народі, «смерть старшого покоління» не виправить цього. Почати треба зі зламу всередині себе.

За Н. Судаковою

Текст Б

(6) У найзагальнішому сенсі під патерналізмом розуміють практику, коли індивід або соціальна група покладає відповідальність за індивідуальне / групове благополуччя на владних суб'єктів, відмовляється від самостійного прийняття рішень, самоорганізації в ситуаціях сприятливих соціальних взаємодій. Патерналізм є станом ціннісної свідомості, проявом ставлення індивіда й колективних соціальних акторів до системи та її владних суб'єктів. Це складне й контроверсійне явище. З одного боку, воно сприяє розвитку в індивідів чи колективних акторів відчуття підтримки, захищеності, відсторонення від різних суспільних проблем, а з іншого, - пригнічує приватну ініціативу, налаштованість на самореалізацію, на чому будується громадянське суспільство.

(7) Як зазначає Є. Головаха, патерналізм характерний для громадян усіх пострадянських держав і є наслідком радянської системи соціального забезпечення, коли від громадян вимагали послуху, а у відповідь забезпечували соціальний мінімум. Це базисні передумови для виживання, і люди до всього цього звикли. Коли вони їх утратили, це був неабиякий удар по свідомості, адже багато хто вважав, що держава зобов'язана забезпечувати соціальний захист. Крім того, дослідник бачить і більш глибоке коріння патерналізму у феодальному минулому з його кріпосництвом. Сукупно весь цей «досвід, із яким ми прийшли до створення незалежної держави, зумовив усі ті проблеми та труднощі, які ми тепер перетравлюємо».

(8) Патерналізм в українському суспільстві не є адресним, він спрямований на будь-який орган влади, який здатен вирішити те чи те питання, попри недовіру громадян до всіх політичних інституцій. Це, скоріше, потреба, викликана низьким рівнем життя, невизначеністю, суспільними ризиками та політичним дискурсом і практиками турботи й опіки (як радянськими, так і сучасними), а не правило, звичай чи ментальна риса українського народу.

(9) Серед імовірних причин формування й відтворення патерналізму в Україні можна виокремити: пострадянські цінності в політичній культурі суспільства (потреба в стабільності, підтримці, допомозі; обережне ставлення до змін; небажання нести відповідальність тощо); соціальну політику держави, що передбачає різного роду соціальні пільги за загально низького рівня життя населення; акцентування в політичному дискурсі на допомозі, підтримці з боку держави; низький рівень оплати праці, що формує залежність від держдопомоги; низький рівень довіри між громадянами, що перешкоджає самоорганізації й призводить або до соціальної пасивності, або до корупційного вирішення питання з владою.

(10) Зважаючи на зростання почуття соціальної відповідальності серед частини населення, яка почала формуватися після подій Євромайдану кінця 2013 р. - початку 2014 р. і на сьогодні бере участь у різних формах самоорганізації, громадських ініціатив, контролі над владою та взаємодії з нею, можна припустити поступове зниження установок на патерналізм у вимірі ставлення індивіда до своєї ролі в суспільно-політичній системі України. Водночас в умовах сучасної кризи й суспільних ризиків патерналістські очікування громадян від самої системи залишатимуться високими, зокрема серед найменш забезпечених і найменш захищених верств суспільства.

За М. Колоколовою`;

const tznkSituationPassage = `Ситуація № 1

Упродовж суботи й неділі Марко планує зробити вісім хатніх справ: 1) приготувати їжу, 2) попрати речі, 3) попрасувати речі, 4) зробити прибирання у вітальні й спальні, 5) зробити прибирання у ванній кімнаті, 6) зробити прибирання на кухні, 7) помити вікна у всій квартирі, 8) скласти сезонний одяг. Марко витратить на кожну справу по одній годині й працюватиме в таких часових проміжках: з 10:00 до 11:00, з 12:00 до 13:00, з 14:00 до 15:00 та з 16:00 до 17:00.

Графік виконання справ має відповідати таким умовам:
1. Одночасно Марко робитиме тільки одну справу й виконуватиме її лише впродовж одного часового проміжку.
2. Приготувати їжу потрібно в суботу до 14:00.
3. Прасувати речі можна не раніше ніж через 3 години після завершення прання, але в той самий день, коли речі було випрано.
4. Марко буде мити вікна у всій квартирі в неділю.
5. Робити прибирання у ванній кімнаті, на кухні, у вітальні й у спальні Марко буде в один день, при цьому на кухні він прибиратиме в останню чергу.`;

const englishPearlsPassage = `A Brief History of Pearls

Many thousands of years ago, long before written history, human beings probably discovered the first pearl while searching the seashore for food. Throughout history, the pearl, with its warm inner glow and shimmering, has been one of the most highly prized and desired gems. Countless references to the pearl can be found in the religions and mythology of cultures from the earliest times. Legend has it that the ancient Egyptian Queen Cleopatra dissolved a single pearl in a glass of wine and drank it, simply to prove to Mark Antony, the Roman General visiting her palace, that she could swallow the wealth of an entire nation in just one meal.

In ancient Rome, pearls were considered a symbol of wealth and social standing. The Greeks valued the pearl for both its extraordinary beauty and association with love and marriage. During the Dark Ages, while ladies from wealthy families adored delicate pearl necklaces, gallant knights often wore pearls into battle. They believed the magic of these glossy gems would keep them unharmed. The Renaissance saw the royal courts of Europe full of pearls. Because pearls were so highly regarded, a number of European countries actually passed laws forbidding anyone but the nobility to decorate themselves with pearls.

During the European expansion into the New World, the discovery of pearls in Central American waters added to the wealth of Europe. Unfortunately, wish for the sea-grown gems resulted in the reduction of virtually all the American pearl oyster populations by the 17th century. Until the early 1900s, natural pearls were accessible only to the rich and famous. In 1916, famed French jeweller Jacques Cartier bought his landmark store on New York's famous Fifth Avenue by trading two pearl necklaces for the valuable property. But today, with the development of pearl cultivating industry, pearls are available and affordable to all.`;

const updates: Record<string, Partial<Question>> = {
  "tznk-tznk-demo-2024-001": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. Перелік ознак Homo Sovieticus використано, щоб показати складність патерналізму як соціального явища, а не довести його невикорінюваність чи універсальність для всіх українців."
  },
  "tznk-tznk-demo-2024-002": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. У тексті Б контроверсійність означає суперечливу природу явища: патерналізм водночас дає відчуття підтримки й пригнічує приватну ініціативу."
  },
  "tznk-tznk-demo-2024-003": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Г. Обидва тексти зосереджені на патерналізмі, владі та політичній культурі."
  },
  "tznk-tznk-demo-2024-004": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - В. Текст А подає патерналізм крізь практику влади щодо народу, а текст Б починає з індивіда або групи, що перекладає відповідальність на владних суб'єктів."
  },
  "tznk-tznk-demo-2024-005": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. Текст Б прямо говорить про пострадянський контекст загалом, тому твердження про унікальність України не є спільною позицією авторок."
  },
  "tznk-tznk-demo-2024-006": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Г. У тексті Б не актуалізовано прихильність до диктатури, тоді як текст А згадує бажання частини українців бачити диктатора на чолі держави."
  },
  "tznk-tznk-demo-2024-007": {
    passage: tznkTextPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Г. Текст Б акцентує адаптацію, залежність, недовіру й корупційні практики, але не розвиває ознаку відчуття винятковості й зверхності."
  },
  "tznk-tznk-demo-2024-008": {
    passage: tznkTextPassage,
    options: [
      "активний антидемократичний тип",
      "активний демократичний тип",
      "пасивний антидемократичний тип",
      "пасивний демократичний тип"
    ],
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. В абзаці 10 тексту Б йдеться про людей, які беруть участь у самоорганізації, громадських ініціативах і контролі над владою, тобто про активний демократичний тип."
  },
  "tznk-tznk-demo-2024-009": {
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. Твердження про необхідність дедалі більшої кількості дорогих інсектицидів є проміжним висновком, обґрунтованим зростанням стійкості комах, і водночас безпосередньо підтримує головну тезу про контрпродуктивність інсектицидів."
  },
  "tznk-tznk-demo-2024-010": {
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. Факт про те, що більшість нежитлових будівель містили неприродний для місцевості камінь, посилює висновок археолога щодо будівлі, складеної з кварцу, граніту й вапняку."
  },
  "tznk-tznk-demo-2024-011": {
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - В. Філософ покладає виживання людства на прогрес науки й технологій, тоді як йог заперечує цей шлях і пропонує гармонізацію через медитацію."
  },
  "tznk-tznk-demo-2024-012": {
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - В. Якщо більшість студентів є користувачами MathLab, а більшість цієї групи також програмує Python, гарантований перетин становить принаймні понад чверть усіх студентів."
  },
  "tznk-tznk-demo-2024-013": {
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - А. Сальваті доводить міркування Симпліціо до абсурду: просте додавання відсотків зниження втрат тепла може дати неможливий результат."
  },
  "tznk-tznk-demo-2024-014": {
    options: [
      "Деякі істини не є уявними лініями, що ділять наші ілюзії на дві частини.",
      "Будь-яка істина - це уявна лінія, що ділить наші ілюзії на дві частини.",
      "Деякі істини є уявними лініями, що ділять наші ілюзії на дві частини.",
      "Кожна уявна лінія, що ділить наші ілюзії на дві частини, є істиною."
    ],
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - А. Запереченням загального твердження «будь-яка істина є такою лінією» є часткове заперечне твердження: існують істини, які не є такими лініями."
  },
  "tznk-tznk-demo-2024-015": {
    passage: tznkSituationPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Б. Якщо сезонний одяг складають у неділю, то миття вікон, прання й прасування також припадають на неділю; отже, усі прибирання виконуються в суботу, а кухня як останнє прибирання припадає на 16:00-17:00."
  },
  "tznk-tznk-demo-2024-016": {
    passage: tznkSituationPassage,
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - Г. Якщо прасування в суботу о 14:00-15:00, то прання має бути о 10:00-11:00, приготування їжі - до 14:00, а вільний суботній проміжок 16:00-17:00 займає складання сезонного одягу."
  },
  "tznk-tznk-demo-2024-017": {
    passage: tznkSituationPassage,
    options: [
      "у суботу з 10:00 до 11:00",
      "у суботу з 16:00 до 17:00",
      "у неділю з 10:00 до 11:00",
      "у неділю з 16:00 до 17:00"
    ],
    explanation: "В офіційному коментованому демоваріанті правильна відповідь - В. Якщо прибирання у ванній відбувається в суботу, то всі прибирання разом із приготуванням їжі займають суботу, тому прання і прасування переносяться на неділю; прання має бути вранці, щоб прасування відбулося того самого дня після потрібної перерви."
  },
  "english-english-demo-2023-001": {
    passage: englishPearlsPassage,
    explanation: "Official answer key: C. Paragraph 1 mentions Cleopatra dissolving a pearl to prove she could swallow the wealth of an entire nation in one meal."
  },
  "english-english-demo-2023-002": {
    passage: englishPearlsPassage,
    explanation: "Official answer key: D. The passage says Cleopatra did it to prove something to Mark Antony, who was visiting her palace."
  },
  "english-english-demo-2023-003": {
    passage: englishPearlsPassage,
    explanation: "Official answer key: D. The passage says knights wore pearls into battle because they believed the gems would keep them unharmed."
  },
  "english-english-demo-2023-004": {
    passage: englishPearlsPassage,
    explanation: "Official answer key: A. The passage says some European countries passed laws forbidding anyone but the nobility to wear pearls."
  },
  "english-english-demo-2023-005": {
    passage: englishPearlsPassage,
    explanation: "Official answer key: B. Paragraph 3 contrasts pearls being accessible only to the rich and famous with modern cultivated pearls becoming available and affordable to all."
  }
};

const files = [
  "public/data/questions/tznk.json",
  "public/data/questions/english.json",
  "public/data/questions/management.json",
  "public/data/questions/psychology-sociology.json",
  "data/processed/tznk.imported.json",
  "data/processed/english.imported.json",
  "data/processed/management.imported.json",
  "data/processed/psychology-sociology.imported.json"
];

function cleanTags(tags: string[] | undefined, addReviewedTag: boolean): string[] {
  const next = new Set((tags ?? []).filter((tag) => !["needs_manual_review", "needs_answer_review", "low_confidence"].includes(tag)));

  if (addReviewedTag) {
    next.add("reviewed_official_source");
  }

  return [...next];
}

async function updateFile(relativePath: string): Promise<number> {
  const filePath = path.join(projectRoot, relativePath);
  const questions = JSON.parse(await fs.readFile(filePath, "utf8")) as Question[];
  let changed = 0;

  const nextQuestions = questions.map((question) => {
    const update = updates[question.id];

    if (update) {
      changed += 1;
      return {
        ...question,
        ...update,
        reviewed: true,
        tags: cleanTags(question.tags, true)
      };
    }

    if (
      (question.tags?.includes("official_collection") || question.tags?.includes("official_past_exam")) &&
      question.explanation === "Правильний варіант позначено в офіційному джерелі. Пояснення потребує ручного рецензування."
    ) {
      changed += 1;
      return {
        ...question,
        explanation: "Офіційне джерело позначає цей варіант як правильний; пояснення в джерелі не наведено.",
        reviewed: false,
        tags: cleanTags([...(question.tags ?? []), "source_has_no_explanation"], false)
      };
    }

    return question;
  });

  if (changed > 0) {
    await fs.writeFile(filePath, `${JSON.stringify(nextQuestions, null, 2)}\n`);
  }

  return changed;
}

async function main() {
  let total = 0;

  for (const file of files) {
    const changed = await updateFile(file);
    total += changed;
    console.log(`${file}: ${changed}`);
  }

  console.log(`Updated ${total} question records.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
