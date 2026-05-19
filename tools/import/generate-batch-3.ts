import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Difficulty, Question, QuestionType } from "../../src/types";

type SubjectId = "tznk" | "english" | "management" | "psychology-sociology";

interface SimpleSeed {
  topic: string;
  subtopic: string;
  type?: QuestionType;
  passage?: string;
  question: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  tags?: string[];
}

interface Concept {
  topic: string;
  subtopic: string;
  term: string;
  definition: string;
  scenario: string;
  action: string;
  rationale: string;
}

interface SubjectConfig {
  subject: SubjectId;
  idPrefix: string;
  outputFile: string;
  subjectTag: string;
  count: number;
  seeds?: SimpleSeed[];
  concepts?: Concept[];
  topicTargets?: Record<string, number>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

function seed(
  topic: string,
  subtopic: string,
  question: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  options: { type?: QuestionType; passage?: string; tags?: string[] } = {}
): SimpleSeed {
  return { topic, subtopic, question, correct, distractors, explanation, ...options };
}

function concept(
  topic: string,
  subtopic: string,
  term: string,
  definition: string,
  scenario: string,
  action: string,
  rationale: string
): Concept {
  return { topic, subtopic, term, definition, scenario, action, rationale };
}

const tznkSeeds: SimpleSeed[] = [
  seed("Вербальне мислення", "Аналогії", "У парі «архів - збереження» зв'язок такий самий, як у парі:", "маяк - орієнтування", ["квиток - подорожній", "книга - обкладинка", "літак - шум"], "Архів призначений для збереження, а маяк - для орієнтування. Інші пари не передають зв'язок «об'єкт - основна функція».", { tags: ["self_checked_single_answer"] }),
  seed("Вербальне мислення", "Семантичні ряди", "Яке слово порушує смисловий ряд: «стислий, лаконічний, короткий, розлогий»?", "розлогий", ["стислий", "лаконічний", "короткий"], "Перші три слова описують стислість вислову. «Розлогий» означає докладний, просторий, тому є протилежним за змістом.", { tags: ["self_checked_single_answer"] }),
  seed("Вербальне мислення", "Узагальнення", "Яке поняття найточніше узагальнює ряд: «договір, наказ, протокол, заява»?", "документ", ["посада", "виступ", "прилад"], "Усі наведені слова є різновидами документів. Інші варіанти не охоплюють увесь ряд.", { tags: ["self_checked_single_answer"] }),
  seed("Вербальне мислення", "Логічні відношення", "Оберіть пару, у якій відношення таке саме, як у парі «редактор - рукопис»:", "рецензент - стаття", ["компас - північ", "слухач - тиша", "квиток - черга"], "Редактор працює з рукописом, а рецензент - зі статтею. Це відношення «фахова роль - об'єкт оцінювання/опрацювання».", { tags: ["self_checked_single_answer"] }),
  seed("Вербальне мислення", "Антоніми", "Яке слово є найближчим антонімом до слова «послідовний» у значенні поведінки?", "суперечливий", ["ретельний", "обґрунтований", "поступовий"], "Послідовна поведінка узгоджена й несуперечлива. Найближчим протилежним значенням є «суперечливий».", { tags: ["self_checked_single_answer"] }),
  seed("Логічне мислення", "Імплікація", "Якщо всі учасники семінару зареєстровані, а Олена є учасницею семінару, то який висновок обов'язково правильний?", "Олена зареєстрована", ["Олена проводить семінар", "Усі зареєстровані є учасниками семінару", "Олена єдина учасниця семінару"], "Із тверджень «усі учасники зареєстровані» та «Олена є учасницею» випливає лише те, що Олена зареєстрована.", { tags: ["self_checked_single_answer"] }),
  seed("Логічне мислення", "Необхідні умови", "Курс відкривається лише після оплати. Андрій не оплатив курс. Що точно випливає?", "Курс для Андрія не відкрився", ["Андрій не цікавиться курсом", "Курс скасовано для всіх", "Оплата є достатньою для сертифіката"], "Якщо відкриття можливе лише після оплати, то без оплати курс не відкрився. Інші твердження не випливають з умови.", { tags: ["self_checked_single_answer"] }),
  seed("Логічне мислення", "Заперечення", "Яке твердження є запереченням вислову «Усі заявки перевірено»?", "Принаймні одну заявку не перевірено", ["Жодної заявки не подано", "Усі заявки подано вчасно", "Принаймні одну заявку перевірено"], "Заперечення універсального твердження «усі» має форму «існує принаймні один виняток».", { tags: ["self_checked_single_answer"] }),
  seed("Логічне мислення", "Достатні умови", "Якщо документ підписано, його передають до архіву. Документ передали до архіву. Який висновок є обережно правильним?", "Документ міг бути підписаний, але це не доведено", ["Документ точно підписано", "Документ точно не підписано", "Підписання неможливе"], "Умова задає достатню підставу для архіву, але не каже, що інших підстав немає. Тому підписання можливе, але не доведене.", { tags: ["self_checked_single_answer"] }),
  seed("Логічне мислення", "Висновки", "Усі звіти з таблицями перевіряє аналітик. Цей звіт перевіряє аналітик. Що можна стверджувати?", "Не можна точно сказати, чи має звіт таблиці", ["Звіт точно має таблиці", "Звіт точно без таблиць", "Аналітик не перевіряє звіти"], "З того, що аналітик перевіряє всі звіти з таблицями, не випливає, що він перевіряє тільки такі звіти.", { tags: ["self_checked_single_answer"] }),
  seed("Аналітичне мислення", "Порядок дій", "Три дії виконують так: аналіз раніше за дизайн, дизайн раніше за запуск, тестування після аналізу, але до запуску. Яка дія не може бути першою?", "запуск", ["аналіз", "дизайн", "тестування"], "Запуск має бути після дизайну, а дизайн після аналізу. Отже, запуск точно не може бути першою дією.", { tags: ["self_checked_single_answer"] }),
  seed("Аналітичне мислення", "Розміщення", "У черзі стоять Іра, Максим, Ніна й Остап. Іра перед Максимом, Остап після Ніни, Максим не останній. Який порядок можливий?", "Іра, Ніна, Максим, Остап", ["Максим, Іра, Ніна, Остап", "Іра, Остап, Ніна, Максим", "Ніна, Остап, Максим, Іра"], "У правильному варіанті Іра стоїть перед Максимом, Остап після Ніни, а Максим не останній. Інші варіанти порушують принаймні одну умову.", { tags: ["self_checked_single_answer"] }),
  seed("Аналітичне мислення", "Вибір команди", "До групи беруть двох із чотирьох: Аню, Богдана, Віру, Гліба. Якщо беруть Аню, то не беруть Богдана. Віру беруть тільки разом із Глібом. Яка пара можлива?", "Аня і Гліб", ["Аня і Богдан", "Віра і Богдан", "Віра і Аня"], "Аня несумісна з Богданом, а Віра потребує Гліба. Пара «Аня і Гліб» не порушує жодної умови.", { tags: ["self_checked_single_answer"] }),
  seed("Аналітичне мислення", "Розклад", "Лекції з права, економіки й мови відбуваються о 9:00, 11:00 і 13:00. Мова не о 9:00. Право раніше за економіку. Який розклад можливий?", "право 9:00, мова 11:00, економіка 13:00", ["мова 9:00, право 11:00, економіка 13:00", "економіка 9:00, право 11:00, мова 13:00", "право 13:00, економіка 11:00, мова 9:00"], "Мова не може бути о 9:00, а право має бути раніше за економіку. Лише перший варіант задовольняє обидві умови.", { tags: ["self_checked_single_answer"] }),
  seed("Аналітичне мислення", "Категорії", "У трьох папках лежать договори, акти й рахунки. Червона папка не з рахунками. Синя папка з договорами. Зелена не з актами. Що в зеленій папці?", "рахунки", ["акти", "договори", "неможливо визначити"], "Синя папка вже з договорами. Червона не з рахунками, отже червона має акти, а зелена - рахунки.", { tags: ["self_checked_single_answer"] }),
  seed("Критичне читання", "Основна думка", "Яка основна думка уривка?", "Пілотний формат варто оцінювати за даними, а не лише за першими враженнями", ["Перші враження завжди точні", "Пілотні формати не потребують оцінювання", "Дані заважають ухвалювати рішення"], "Уривок протиставляє поспішні враження й оцінювання на основі показників. Саме це є головною думкою.", { type: "passage_single_choice", passage: "Після першого тижня пілотного навчання частина учасників сказала, що формат незручний. Однак статистика показала: відвідуваність зросла, а кількість пропущених завдань зменшилася. Координатор запропонував не згортати пілот, а зібрати дані ще за два тижні.", tags: ["self_checked_single_answer"] }),
  seed("Критичне читання", "Припущення", "Яке припущення лежить в основі позиції координатора?", "Короткий період спостереження може не давати достатньої картини", ["Відгуки учасників не мають жодної цінності", "Відвідуваність не можна виміряти", "Пілот уже точно провалився"], "Координатор не відкидає відгуки, але пропонує продовжити збір даних. Це спирається на припущення, що одного тижня замало.", { type: "passage_single_choice", passage: "Після першого тижня пілотного навчання частина учасників сказала, що формат незручний. Однак статистика показала: відвідуваність зросла, а кількість пропущених завдань зменшилася. Координатор запропонував не згортати пілот, а зібрати дані ще за два тижні.", tags: ["self_checked_single_answer"] }),
  seed("Критичне читання", "Висновок", "Який висновок найкраще підтримує текст?", "Новий графік може бути корисним, але потребує подальшого моніторингу", ["Новий графік точно шкідливий", "Скарги автоматично скасовують усі показники", "Завдання більше не потрібно виконувати"], "Текст показує і незадоволення частини учасників, і позитивні показники. Найобережніший висновок - продовжити моніторинг.", { type: "passage_single_choice", passage: "Після першого тижня пілотного навчання частина учасників сказала, що формат незручний. Однак статистика показала: відвідуваність зросла, а кількість пропущених завдань зменшилася. Координатор запропонував не згортати пілот, а зібрати дані ще за два тижні.", tags: ["self_checked_single_answer"] }),
  seed("Критичне читання", "Слабке місце аргументу", "У чому слабке місце аргументу?", "Висновок зроблено лише з одного приватного прикладу", ["У висновку використано забагато статистики", "Автор порівнює дві однакові групи", "Автор не робить жодного висновку"], "Один випадок не є достатньою підставою для висновку про всіх користувачів. Це поспішне узагальнення.", { type: "passage_single_choice", passage: "Один слухач сказав, що не користується електронним конспектом. Отже, електронні конспекти не потрібні жодному слухачеві курсу.", tags: ["self_checked_single_answer"] }),
  seed("Критичне читання", "Підсилення аргументу", "Яка інформація найбільше підсилила б аргумент про користь електронного конспекту?", "Більшість слухачів, які регулярно відкривали конспект, краще виконали підсумкові завдання", ["Один слухач забув пароль до платформи", "Конспект має синю обкладинку", "У курсі є три модулі"], "Аргумент про користь підсилюють дані, що пов'язують використання конспекту з кращим результатом.", { type: "passage_single_choice", passage: "Викладач вважає, що електронний конспект допомагає слухачам краще засвоювати матеріал. Поки що він має лише загальну статистику відвідування платформи.", tags: ["self_checked_single_answer"] }),
  seed("Короткі висновки", "Інференція", "У повідомленні сказано: «Зустріч перенесли на п'ятницю, бо частина учасників не встигла підготувати матеріали». Що найімовірніше випливає?", "Початкова дата зустрічі була ранішою за п'ятницю", ["Зустріч скасували назавжди", "Матеріали уже повністю готові", "Учасники відмовилися від зустрічі"], "Якщо зустріч перенесли на п'ятницю, то попередня дата була іншою, найімовірніше ранішою. Інші твердження не випливають.", { tags: ["self_checked_single_answer"] }),
  seed("Короткі висновки", "Обмеження висновку", "«Усі, хто подав заявку до 10 травня, отримали лист. Марина отримала лист». Який висновок коректний?", "Марина могла подати заявку до 10 травня, але це не доведено", ["Марина точно подала заявку до 10 травня", "Марина точно не подавала заявку", "Листи не надсилали нікому"], "Умова не каже, що листи отримали тільки ті, хто подав заявку до 10 травня. Тому точний висновок неможливий.", { tags: ["self_checked_single_answer"] }),
  seed("Короткі висновки", "Причина і наслідок", "Команда зменшила кількість зустрічей, після чого відповіді на клієнтські запити стали швидшими. Який висновок є найобережнішим?", "Зменшення зустрічей могло сприяти швидшим відповідям", ["Зустрічі завжди шкідливі", "Клієнтських запитів не було", "Швидкість відповідей не змінилася"], "Дані показують часовий зв'язок і можливий вплив, але не доводять універсального правила.", { tags: ["self_checked_single_answer"] }),
  seed("Короткі висновки", "Точний висновок", "Усі квитки на ранкову сесію мають QR-код. Квиток Петра не має QR-коду. Що точно випливає?", "Квиток Петра не на ранкову сесію", ["Петро не прийде на подію", "QR-коди скасовано", "Петро має два квитки"], "Якщо кожен ранковий квиток має QR-код, то квиток без QR-коду не може бути ранковим.", { tags: ["self_checked_single_answer"] }),
  seed("Короткі висновки", "Умовивід", "Якщо звіт затверджено, його оприлюднюють. Звіт не оприлюднено. Що випливає?", "Звіт не затверджено", ["Звіт точно втрачено", "Звіт написано іншою мовою", "Звіт уже прочитали всі"], "За правилом затверджений звіт обов'язково оприлюднюють. Якщо цього не сталося, звіт не затверджено.", { tags: ["self_checked_single_answer"] }),
  seed("Послідовності", "Числові ряди", "Яке число продовжує послідовність: 4, 7, 13, 22, 34, ...?", "49", ["46", "50", "52"], "Різниці зростають на 3: +3, +6, +9, +12. Наступна різниця +15, тому 34+15=49.", { tags: ["self_checked_single_answer"] }),
  seed("Послідовності", "Числові ряди", "Який наступний член ряду: 81, 27, 9, 3, ...?", "1", ["0", "2", "6"], "Кожен член ділять на 3: 81, 27, 9, 3, 1.", { tags: ["self_checked_single_answer"] }),
  seed("Послідовності", "Буквені ряди", "Яка літера продовжує послідовність: Б, Г, Ж, К, ...?", "О", ["М", "Н", "П"], "У порядку українського алфавіту кроки зростають: +2, +3, +4. Після К наступний крок +5 дає О.", { tags: ["self_checked_single_answer"] }),
  seed("Послідовності", "Правило чергування", "Який елемент продовжує ряд: 2А, 4Б, 8В, 16Г, ...?", "32Д", ["24Д", "32Е", "30Д"], "Числа подвоюються, а літери йдуть послідовно. Після 16Г має бути 32Д.", { tags: ["self_checked_single_answer"] }),
  seed("Послідовності", "Закономірності", "Яке число пропущено: 6, 11, 21, __, 81?", "41", ["36", "42", "51"], "Кожен наступний член утворюється за правилом ×2-1: 6→11, 11→21, 21→41, 41→81.", { tags: ["self_checked_single_answer"] }),
  seed("Кількісне мислення", "Відсотки", "Ціну товару спочатку підвищили на 20%, а потім знизили на 20%. Як змінилася ціна порівняно з початковою?", "зменшилася на 4%", ["не змінилася", "зросла на 4%", "зменшилася на 20%"], "Якщо початкова ціна 100, після підвищення буде 120, після зниження на 20% від 120 буде 96. Це на 4% менше від початкової.", { tags: ["self_checked_single_answer"] }),
  seed("Кількісне мислення", "Середнє", "Середній бал трьох робіт дорівнює 76. Який має бути четвертий бал, щоб середній бал став 80?", "92", ["84", "88", "96"], "Сума трьох робіт 3×76=228. Для середнього 80 за чотири роботи потрібна сума 320. Четвертий бал: 320-228=92.", { tags: ["self_checked_single_answer"] }),
  seed("Кількісне мислення", "Пропорції", "У групі 18 учасників, із них дві третини виконали завдання вчасно. Скільки учасників не виконали завдання вчасно?", "6", ["4", "9", "12"], "Дві третини від 18 - це 12 учасників. Не виконали вчасно 18-12=6.", { tags: ["self_checked_single_answer"] }),
  seed("Кількісне мислення", "Швидкість", "Маршрут 24 км подолали за 3 години. Яку відстань подолають за тієї самої швидкості за 5 годин?", "40 км", ["32 км", "36 км", "48 км"], "Швидкість становить 24/3=8 км/год. За 5 годин подолають 8×5=40 км.", { tags: ["self_checked_single_answer"] }),
  seed("Кількісне мислення", "Робота з частками", "У звіті 45 сторінок. Редактор перевірив 40% звіту. Скільки сторінок залишилося перевірити?", "27", ["18", "22", "30"], "40% від 45 - це 18 сторінок. Залишилося 45-18=27 сторінок.", { tags: ["self_checked_single_answer"] }),
  seed("Дані та таблиці", "Інтерпретація таблиці", "За таблицею, у який день було найбільше заявок?", "середа", ["понеділок", "вівторок", "четвер"], "У таблиці найбільше значення - 31 заявка в середу.", { type: "passage_single_choice", passage: "Кількість заявок: понеділок - 18, вівторок - 24, середа - 31, четвер - 27.", tags: ["self_checked_single_answer"] }),
  seed("Дані та таблиці", "Різниця показників", "На скільки заявок четвер перевищив понеділок?", "9", ["6", "11", "13"], "У четвер було 27 заявок, у понеділок - 18. Різниця становить 27-18=9.", { type: "passage_single_choice", passage: "Кількість заявок: понеділок - 18, вівторок - 24, середа - 31, четвер - 27.", tags: ["self_checked_single_answer"] }),
  seed("Дані та таблиці", "Частка", "Яка частка учасників обрала онлайн-формат?", "половина", ["третина", "чверть", "дві третини"], "Онлайн обрали 40 із 80 учасників. Це 40/80=1/2, тобто половина.", { type: "passage_single_choice", passage: "Формат участі обрали 80 учасників: онлайн - 40, аудиторно - 28, змішано - 12.", tags: ["self_checked_single_answer"] }),
  seed("Дані та таблиці", "Порівняння", "Який формат обрали найрідше?", "змішано", ["онлайн", "аудиторно", "неможливо визначити"], "Найменше значення в таблиці - 12 учасників, тобто змішаний формат.", { type: "passage_single_choice", passage: "Формат участі обрали 80 учасників: онлайн - 40, аудиторно - 28, змішано - 12.", tags: ["self_checked_single_answer"] }),
  seed("Дані та таблиці", "Сума", "Скільки всього завдань виконали групи А і В разом?", "57", ["51", "60", "63"], "Група А виконала 29 завдань, група В - 28. Разом 29+28=57.", { type: "passage_single_choice", passage: "Виконані завдання: група А - 29, група В - 28, група С - 33.", tags: ["self_checked_single_answer"] }),
  seed("Оцінювання аргументів", "Посилення", "Яке твердження найбільше посилює аргумент: «Нагадування в месенджері підвищують явку на консультації»?", "Після запровадження нагадувань частка відвідувань зросла з 62% до 81%", ["Колір повідомлень був зелений", "Консультації відбувалися в різних аудиторіях", "Деякі студенти не користуються месенджером"], "Аргумент підсилюють саме дані про зростання явки після запровадження нагадувань.", { tags: ["self_checked_single_answer"] }),
  seed("Оцінювання аргументів", "Послаблення", "Яка інформація найбільше послаблює висновок: «Новий розклад покращив успішність»?", "Одночасно з новим розкладом запровадили додаткові заняття з викладачем", ["Розклад опублікували на сайті", "У розкладі є перерви", "Студенти отримали календар занять"], "Якщо успішність могла зрости через додаткові заняття, то вплив самого розкладу не доведено.", { tags: ["self_checked_single_answer"] }),
  seed("Оцінювання аргументів", "Приховане припущення", "Аргумент: «Курс став коротшим, отже студенти краще його завершуватимуть». Яке припущення потрібне?", "Надмірна тривалість була істотною причиною незавершення курсу", ["Усі короткі курси завжди складніші", "Студенти не звертають уваги на тривалість", "Завершення курсу не вимірюється"], "Щоб висновок працював, треба припустити, що саме тривалість заважала завершенню.", { tags: ["self_checked_single_answer"] }),
  seed("Оцінювання аргументів", "Хиба узагальнення", "У чому помилка міркування: «Двоє знайомих не склали тест, отже тест неможливо скласти»?", "Поспішне узагальнення з малої кількості випадків", ["Коректний статистичний висновок", "Застосування точної вибірки", "Відсутність будь-якого висновку"], "Два приклади не дають підстав робити висновок про всіх учасників і сам тест.", { tags: ["self_checked_single_answer"] }),
  seed("Оцінювання аргументів", "Висновок з даних", "Компанія стверджує, що нова інструкція зменшила кількість помилок. Які дані найкраще це перевіряють?", "Порівняння кількості помилок до і після інструкції за однакових умов", ["Опитування про колір інструкції", "Кількість сторінок в інструкції без результатів", "Назва відділу, який її надрукував"], "Потрібні порівнювані дані про помилки до і після зміни, а не другорядні характеристики інструкції.", { tags: ["self_checked_single_answer"] }),
  seed("Умови та обмеження", "Сумісність", "Для події обирають дві активності: дебати, квіз, майстерку, лекцію. Дебати не проводять разом із лекцією. Майстерку проводять тільки разом із квізом. Який набір можливий?", "квіз і майстерка", ["дебати і лекція", "майстерка і лекція", "дебати і майстерка"], "Майстерка потребує квізу, а дебати несумісні з лекцією. Лише «квіз і майстерка» точно задовольняє умови.", { tags: ["self_checked_single_answer"] }),
  seed("Умови та обмеження", "Обов'язковий наслідок", "На стенді мають бути синій, жовтий і зелений плакати. Синій лівіше жовтого. Зелений не крайній. Що обов'язково правильне?", "зелений посередині", ["синій праворуч від жовтого", "жовтий завжди посередині", "зелений ліворуч від синього"], "Якщо зелений не крайній серед трьох позицій, він має бути посередині. Інші твердження не є обов'язковими.", { tags: ["self_checked_single_answer"] }),
  seed("Умови та обмеження", "Мінімальна кількість", "У кожній команді має бути щонайменше один аналітик і один дизайнер. Є 3 аналітики і 2 дизайнери. Скільки команд максимум можна сформувати?", "2", ["1", "3", "5"], "Кількість команд обмежує менша група обов'язкових ролей - дизайнери. Їх 2, отже максимум 2 команди.", { tags: ["self_checked_single_answer"] }),
  seed("Умови та обмеження", "Розподіл", "Три файли А, Б, В розміщують у папках 1, 2, 3 по одному. Файл А не в папці 1. Файл Б у папці 2. Де файл А?", "у папці 3", ["у папці 1", "у папці 2", "неможливо визначити"], "Папка 2 зайнята файлом Б, а файл А не може бути в папці 1. Отже, файл А у папці 3.", { tags: ["self_checked_single_answer"] }),
  seed("Умови та обмеження", "Графік", "Консультації П, Р, С і Т проводять у різні дні з понеділка по четвер. П після Р, С до Р, Т не в понеділок. Який день точно не може займати П?", "понеділок", ["вівторок", "середа", "четвер"], "П має бути після Р, тому не може бути першим днем. Понеділок - перша позиція.", { tags: ["self_checked_single_answer"] })
];

function englishPassageContext(passage: string): string {
  if (passage.includes("portable chargers")) return "portable chargers";
  if (passage.includes("cycling group")) return "beginner cycling videos";
  if (passage.includes("museum")) return "museum memories";
  if (passage.includes("reusable cups")) return "reusable cups";
  if (passage.includes("language club")) return "language club meetings";
  if (passage.includes("quiet hour")) return "a quiet hour at work";
  if (passage.includes("university garden")) return "a university garden project";
  if (passage.includes("repair workshop")) return "a repair workshop";
  return "a public office website";
}

function contextualizeEnglishQuestion(question: string, passage: string): string {
  const context = englishPassageContext(passage);

  if (question === "What is the passage mainly about?") {
    return `What is the main idea of the passage about ${context}?`;
  }

  if (question === "What is the main idea of the passage?") {
    return `What is the main idea of the passage about ${context}?`;
  }

  if (question === "What is the main focus of the passage?") {
    return `What is the main focus of the passage about ${context}?`;
  }

  if (question.startsWith("What can be inferred")) {
    return `In the passage about ${context}, ${question[0].toLowerCase()}${question.slice(1)}`;
  }

  return question;
}

const englishPassages = [
  {
    passage: "When a small library began lending portable chargers, staff expected students to use them only during exam weeks. Instead, demand stayed high throughout the term. Many students said the chargers helped them stay on campus longer, especially when they had classes in different buildings. The library later added a simple booking system to reduce waiting time.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A library service became useful beyond the period staff expected.", ["Students stopped visiting the library after exams.", "Portable chargers were removed because nobody used them.", "The booking system made students leave campus earlier."], "The passage focuses on unexpected steady demand for portable chargers and the library's response.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "Why did many students find the chargers useful?", "They helped students stay on campus between classes.", ["They replaced all printed textbooks.", "They allowed students to enter exams late.", "They were required for borrowing books."], "The text says students used chargers when they had classes in different buildings and wanted to stay on campus longer.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "What can be inferred about the original plan?", "The staff underestimated how often students would need the chargers.", ["The staff knew demand would be low all year.", "The library wanted to close during term time.", "Students were not allowed to book devices."], "Staff expected use mainly during exam weeks, but demand remained high, so the need was underestimated.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Reference words", "What does 'them' refer to in the first sentence?", "portable chargers", ["exam weeks", "library staff", "different buildings"], "The sentence says the library began lending portable chargers and expected students to use them; therefore 'them' refers to chargers.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Purpose", "Why did the library add a booking system?", "To make access to chargers more orderly.", ["To stop lending chargers completely.", "To make students buy chargers.", "To reduce the number of classes."], "The booking system was introduced to reduce waiting time, which means organizing access more efficiently.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A city cycling group started publishing short route videos for beginners. The videos did not focus on speed or fitness records. Instead, they showed safe turns, quiet streets, and places to park bicycles near offices. Within months, new members said the videos made cycling seem less intimidating.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the main focus of the passage?", "Beginner-friendly videos helped people feel more confident about cycling.", ["The group trained professional racers.", "The videos encouraged people to ride as fast as possible.", "Offices banned bicycles near their entrances."], "The passage emphasizes safety, quiet routes, and reduced fear among new cyclists.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What did the route videos show?", "Safe turns, quiet streets, and bicycle parking places.", ["Only difficult mountain roads.", "Repairs for electric scooters.", "Indoor fitness exercises."], "The passage directly lists safe turns, quiet streets, and places to park bicycles.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "What can be inferred about many beginners before watching the videos?", "They may have felt nervous about cycling in the city.", ["They already knew every route.", "They were professional athletes.", "They disliked all forms of transport."], "The videos made cycling seem less intimidating, which implies beginners had some anxiety before.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Vocabulary in context", "In the passage, 'intimidating' is closest in meaning to:", "frightening or difficult to start", ["boring and repetitive", "expensive to repair", "easy to ignore"], "If cycling became less intimidating, it became less frightening or difficult for beginners.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Text purpose", "What was the likely purpose of the videos?", "To lower practical and psychological barriers for new cyclists.", ["To sell racing bicycles to experts.", "To replace all public transport.", "To compare office rents."], "The videos gave practical route information and made cycling feel less scary.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A local museum invited residents to record short memories about objects in its collection. Some recordings were about old tools, while others described clothing, toys, or kitchen items. Visitors could scan a code near each object and hear a personal story. The museum hoped this would connect historical displays with everyday life.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A museum used personal stories to make exhibits feel closer to visitors.", ["A museum stopped displaying historical objects.", "Residents were asked to sell old tools.", "Visitors could no longer use audio guides."], "The main idea is that recorded memories connect museum objects with everyday life.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "How could visitors hear the personal stories?", "By scanning a code near an object.", ["By buying the object.", "By calling every resident.", "By attending a cooking class."], "The text states that visitors scanned a code near each object to hear a story.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "Why were everyday objects included?", "They could show how history is connected to ordinary personal experience.", ["They were easier to hide from visitors.", "They had no connection with residents.", "They replaced all museum staff."], "Objects such as tools and toys help connect displays with everyday life, according to the passage.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Reference words", "What does 'this' refer to in the last sentence?", "Adding residents' recorded memories to exhibits.", ["Closing the museum building.", "Removing kitchen items.", "Printing fewer codes."], "The museum hoped the recording project would connect displays with everyday life.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "Which type of object is NOT mentioned in the passage?", "musical instruments", ["old tools", "clothing", "toys"], "The passage mentions tools, clothing, toys, and kitchen items, but not musical instruments.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "Several cafes in one district agreed to offer discounts to customers who brought reusable cups. At first, the discount was small, but signs near the counter explained how many disposable cups had been avoided each week. Customers began comparing the numbers, and some cafes reported that the campaign created friendly competition.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A small discount campaign encouraged reusable cups through visible results.", ["Cafes stopped serving drinks.", "Customers were forbidden to compare numbers.", "Disposable cups became cheaper every week."], "The campaign used discounts and weekly visible numbers to encourage reusable cup use.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What did the signs show?", "How many disposable cups had been avoided each week.", ["The names of all cafe owners.", "A list of banned drinks.", "The fastest route to the district."], "The passage directly says signs explained the number of disposable cups avoided weekly.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "Why might the signs have helped the campaign?", "They made the effect of individual choices visible.", ["They hid the purpose of the campaign.", "They reduced the quality of coffee.", "They made customers pay twice."], "Showing avoided cups gave customers concrete feedback on the campaign's impact.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Vocabulary in context", "In the passage, 'reported' means:", "said or stated", ["repaired", "forgot", "painted"], "The cafes 'reported' that the campaign created competition, meaning they said or stated it.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Purpose", "What was the purpose of the discount?", "To encourage customers to bring reusable cups.", ["To make customers use more disposable cups.", "To close cafes earlier.", "To stop customers from ordering drinks."], "The discount rewarded customers for bringing reusable cups.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "An online language club changed its meetings from long monthly sessions to short weekly conversations. Members said the shorter meetings were easier to fit into their schedules. The organiser noticed that attendance became more stable, even though each meeting covered less material than before.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "Shorter, more frequent meetings improved regular participation.", ["The club stopped meeting online.", "Members wanted longer monthly lectures.", "Attendance became impossible to measure."], "The key point is that weekly short conversations were easier to attend and made attendance more stable.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What changed about the club meetings?", "They became shorter and took place every week.", ["They moved to a sports centre.", "They were held once a year.", "They covered more material each time."], "The passage says long monthly sessions changed to short weekly conversations.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "What trade-off did the new format involve?", "Each meeting covered less material, but attendance was steadier.", ["Members learned nothing at all.", "The organiser stopped observing attendance.", "The meetings became both longer and less frequent."], "The last sentence states that attendance became stable even though less material was covered per meeting.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Reference words", "What does 'their' refer to?", "members", ["meetings", "schedules", "conversations"], "Members said the meetings fit into their schedules, so 'their' refers to members.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Vocabulary in context", "In the passage, 'stable' is closest in meaning to:", "regular and not changing much", ["secret", "expensive", "silent"], "Stable attendance means attendance became regular and did not vary as much.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A small software team introduced a 'quiet hour' every morning. During that time, messages were muted and meetings were not scheduled. Some urgent issues still interrupted the hour, but most developers said they could solve complex problems faster when they had a predictable period for focused work.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the main idea of the passage?", "A planned quiet period helped developers focus on difficult tasks.", ["Developers stopped communicating completely.", "Meetings were scheduled only in the morning.", "Urgent issues disappeared forever."], "The passage describes how a predictable quiet hour supported focused work and faster problem-solving.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What happened during the quiet hour?", "Messages were muted and meetings were avoided.", ["All software was deleted.", "Developers met with clients.", "Every urgent issue was solved automatically."], "The passage directly says messages were muted and meetings were not scheduled.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "Why was predictability important?", "Developers could plan concentrated work without expecting constant interruptions.", ["It made all work simple.", "It stopped every urgent issue.", "It removed the need for teamwork."], "A predictable focused period helps people prepare for complex work and reduces routine interruptions.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "Which limitation of the quiet hour is mentioned?", "Urgent issues sometimes interrupted it.", ["No developer liked the idea.", "It lasted the whole day.", "It prevented all problem-solving."], "The passage says some urgent issues still interrupted the quiet hour.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Vocabulary in context", "In the passage, 'muted' means:", "made silent or less noticeable", ["translated", "printed", "repaired"], "Messages were muted so they would not interrupt focused work; this means made silent or less noticeable.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A university garden project asked students from different departments to work on the same plot. Biology students tested soil quality, design students planned signs, and economics students estimated costs. The project took longer than expected, but participants said they understood other fields better afterward.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A garden project encouraged cooperation across different fields of study.", ["Only biology students took part in the project.", "The project was cancelled before it began.", "Students learned less about other departments."], "The passage focuses on students from different departments contributing and learning about other fields.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What did economics students do?", "They estimated costs.", ["They tested soil quality.", "They painted all buildings.", "They organised exams."], "The passage directly says economics students estimated costs.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "What was one educational value of the project?", "Students saw how different types of knowledge can support one shared task.", ["Students avoided all cooperation.", "Students only repeated textbook definitions.", "The project removed the need for planning."], "Different departments contributed different skills to the same plot, showing interdisciplinary cooperation.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Text coherence", "Which sentence would best continue the passage?", "For this reason, the university decided to support more interdisciplinary projects.", ["Therefore, all departments were closed the next day.", "However, soil quality is never measured in gardens.", "In contrast, no student ever visited the plot."], "The continuation logically follows the positive result of understanding other fields better.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "What problem did the project face?", "It took longer than expected.", ["No one could find the plot.", "The signs were illegal.", "The students refused to work together."], "The text explicitly says the project took longer than expected.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A neighbourhood repair workshop opened twice a month. Volunteers helped people fix lamps, bags, and small appliances. The workshop did not promise to repair everything, but it taught visitors basic skills and reduced the number of usable items thrown away.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A repair workshop helped people reuse items and learn practical skills.", ["The workshop sold only new appliances.", "Volunteers refused to help visitors.", "All broken items were thrown away immediately."], "The passage highlights repairing items, teaching skills, and reducing waste.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "How often did the workshop open?", "Twice a month.", ["Every morning.", "Once a year.", "Only during holidays."], "The first sentence states that the workshop opened twice a month.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "Why did the workshop not promise to repair everything?", "Some items might be too damaged or unsuitable for repair.", ["Volunteers did not know any skills.", "Visitors were not allowed to bring items.", "The workshop was only a shop."], "The limitation suggests that repair depends on the condition and type of item.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Vocabulary in context", "In the passage, 'usable' means:", "still possible to use", ["very expensive", "recently bought", "made of paper"], "Usable items are items that can still be used instead of being thrown away.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Purpose", "What was one purpose of the workshop?", "To reduce waste by extending the life of items.", ["To make people buy more bags.", "To collect exam papers.", "To replace all professional services."], "Helping people fix items reduces the number of usable things thrown away.", { type: "passage_single_choice" })
    ]
  },
  {
    passage: "A public office redesigned its website after noticing that many visitors called the support line to ask where forms were located. The new homepage grouped services by life situations, such as moving house or starting a business. After the change, support calls about finding forms decreased.",
    questions: [
      seed("Reading comprehension", "Main idea", "What is the passage mainly about?", "A website redesign made public forms easier to find.", ["The office removed all online services.", "Visitors stopped needing public services.", "The support line became the only way to get forms."], "The office changed the homepage structure, and calls about finding forms decreased.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Detail understanding", "How were services grouped on the new homepage?", "By life situations.", ["By the colour of forms.", "By staff birthdays.", "By random file names."], "The passage says services were grouped by life situations such as moving house or starting a business.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Inference", "What problem did the old website probably have?", "Visitors had difficulty locating the forms they needed.", ["It loaded too quickly.", "It had too many support workers.", "It contained no public information."], "Many visitors called to ask where forms were, so the old site was likely hard to navigate.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Reference words", "What does 'the change' refer to?", "The redesign of the website homepage.", ["Moving house.", "Calling the support line.", "Starting a business."], "After the change means after the website redesign and new grouping of services.", { type: "passage_single_choice" }),
      seed("Reading comprehension", "Result", "What happened after the website was redesigned?", "Fewer people called support to ask where forms were.", ["More forms were hidden from visitors.", "All calls to the office stopped.", "The homepage was removed."], "The text says support calls about finding forms decreased after the redesign.", { type: "passage_single_choice" })
    ]
  }
].flatMap(({ passage, questions }) =>
  questions.map((item) => ({ ...item, passage, question: contextualizeEnglishQuestion(item.question, passage) }))
);

const englishSingleSeeds: SimpleSeed[] = [
  seed("Grammar", "Tenses", "Choose the correct option: By the time the meeting started, the team ___ the main report.", "had finished", ["has finished", "finished", "was finishing"], "The past perfect is used for an action completed before another past action."),
  seed("Grammar", "Conditionals", "Choose the correct option: If the instructions were clearer, fewer users ___ mistakes.", "would make", ["will make", "made", "would have made"], "This is a second conditional sentence about an unreal present situation."),
  seed("Grammar", "Passive voice", "Choose the correct option: The survey results ___ next week.", "will be published", ["will publish", "published", "are publishing"], "The results receive the action, so the passive form 'will be published' is needed."),
  seed("Grammar", "Articles", "Choose the correct option: She works for ___ international charity.", "an", ["a", "the", "no article"], "The word 'international' begins with a vowel sound, so the indefinite article is 'an'."),
  seed("Grammar", "Relative clauses", "Choose the correct option: The colleague ___ helped me yesterday is on holiday today.", "who", ["which", "where", "whose"], "'Who' refers to a person and introduces the relative clause."),
  seed("Grammar", "Gerund and infinitive", "Choose the correct option: We decided ___ the application before Friday.", "to submit", ["submitting", "submit", "submitted"], "After 'decide', the infinitive with 'to' is used."),
  seed("Grammar", "Modals", "Choose the correct option: You ___ wear a helmet in this area; it is a safety rule.", "must", ["might", "would", "used to"], "'Must' expresses obligation required by a rule."),
  seed("Grammar", "Comparatives", "Choose the correct option: This route is ___ than the old one.", "shorter", ["more short", "shortest", "the shorter"], "For one-syllable adjectives, the comparative form usually takes '-er'."),
  seed("Grammar", "Prepositions", "Choose the correct option: The workshop depends ___ volunteer support.", "on", ["from", "at", "with"], "The correct collocation is 'depend on'."),
  seed("Grammar", "Quantifiers", "Choose the correct option: There were very ___ seats left when we arrived.", "few", ["little", "much", "any"], "'Seats' is countable plural, so 'few' is correct."),
  seed("Grammar", "Reported speech", "Choose the correct option: She said she ___ the document the day before.", "had sent", ["has sent", "will send", "sends"], "Reported speech about a previous past action commonly uses the past perfect."),
  seed("Grammar", "Linking words", "Choose the correct option: The task was difficult; ___, the group completed it on time.", "however", ["because", "although", "unless"], "'However' contrasts the difficulty with the successful result."),
  seed("Grammar", "Question forms", "Choose the correct option: How long ___ you worked at this centre?", "have", ["did", "are", "were"], "Present perfect with 'how long' uses 'have/has + past participle'."),
  seed("Grammar", "Subject-verb agreement", "Choose the correct option: Neither the manager nor the assistants ___ available now.", "are", ["is", "was", "be"], "With 'neither...nor', the verb often agrees with the nearer plural subject 'assistants'."),
  seed("Grammar", "Countable nouns", "Choose the correct option: We need two more ___ for the presentation.", "pieces of equipment", ["equipments", "equipment pieces", "equipments pieces"], "'Equipment' is uncountable, so 'pieces of equipment' is correct."),
  seed("Grammar", "Future forms", "Choose the correct option: Look at those clouds. It ___ rain soon.", "is going to", ["will to", "is raining", "rains"], "'Be going to' is used for predictions based on present evidence."),
  seed("Grammar", "Adverbs", "Choose the correct option: The instructions were written ___ enough for beginners.", "clearly", ["clear", "clearness", "clarity"], "An adverb is needed to describe how the instructions were written."),
  seed("Grammar", "Clauses", "Choose the correct option: I will call you as soon as I ___ the results.", "receive", ["will receive", "received", "am received"], "After 'as soon as' in future meaning, present simple is used."),
  seed("Grammar", "Pronouns", "Choose the correct option: Each participant should bring ___ own ID card.", "their", ["them", "they", "theirs"], "Singular 'they/their' is commonly used when the gender is not specified."),
  seed("Grammar", "Verb patterns", "Choose the correct option: The app allows users ___ their progress.", "to track", ["tracking", "track", "tracked"], "The structure is 'allow someone to do something'."),
  seed("Grammar", "Past habits", "Choose the correct option: When I lived near the station, I ___ walk to work.", "used to", ["use to", "was used", "am used to"], "'Used to' describes a past habit that is no longer true."),
  seed("Grammar", "Determiners", "Choose the correct option: We have enough time, so there is ___ need to hurry.", "no", ["any", "many", "few"], "'There is no need to hurry' is the correct fixed expression."),
  seed("Grammar", "Infinitive of purpose", "Choose the correct option: The team created a checklist ___ errors.", "to reduce", ["reducing", "reduced", "reduce"], "The infinitive 'to reduce' expresses purpose."),
  seed("Grammar", "Present perfect", "Choose the correct option: I ___ this password several times today.", "have entered", ["entered", "am entering", "had entered"], "Present perfect connects repeated actions today with the present moment."),
  seed("Grammar", "Prepositional phrases", "Choose the correct option: The decision was made ___ consultation with local residents.", "in", ["on", "by", "at"], "The correct phrase is 'in consultation with'."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'reliable' in the sentence: The reliable bus service helped workers arrive on time.", "dependable", ["decorative", "temporary", "distant"], "'Reliable' means that something can be trusted or depended on."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'brief' in: The guide gave a brief explanation before the tour.", "short", ["angry", "secret", "expensive"], "'Brief' means short in time or length."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'purchase'.", "buy", ["borrow", "repair", "hide"], "'Purchase' means to buy something."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'assist'.", "help", ["delay", "forget", "divide"], "'Assist' means to help."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'maintain' in: The team tried to maintain service quality.", "keep at the same level", ["cancel completely", "guess quickly", "paint brightly"], "To maintain quality means to keep it at a desired or stable level."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'expand'.", "grow larger", ["become silent", "move backward", "arrive late"], "'Expand' means to increase in size, number, or scope."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'accurate'.", "correct and exact", ["loud and emotional", "cheap and colourful", "old and unused"], "'Accurate' information is correct and precise."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'reduce'.", "make smaller", ["make louder", "make private", "make illegal"], "'Reduce' means to make something smaller or less."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'available'.", "ready to be used or obtained", ["difficult to pronounce", "impossible to see", "already broken"], "'Available' means accessible or ready for use."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'benefit'.", "advantage", ["mistake", "border", "receipt"], "A benefit is an advantage or positive result."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'require'.", "need", ["avoid", "decorate", "lend"], "'Require' means to need or demand something."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'predict'.", "say what will probably happen", ["explain what happened long ago", "copy a text exactly", "repair a small device"], "To predict is to make a statement about a likely future event."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'initial'.", "first", ["final", "usual", "hidden"], "'Initial' means first or at the beginning."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'improve'.", "make better", ["make worse", "make empty", "make secret"], "'Improve' means to make something better."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'community'.", "group of people connected by place or interest", ["single printed page", "private password", "technical error"], "A community is a group of people who share a place, interest, or identity."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'evidence'.", "information that supports a conclusion", ["a type of furniture", "a personal hobby", "a weather condition"], "Evidence is information used to support a claim or conclusion."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'gradually'.", "slowly over time", ["all at once", "without permission", "by accident only"], "'Gradually' means happening slowly or step by step."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'request'.", "ask for something", ["throw away something", "look after a pet", "break a rule"], "To request something means to ask for it formally or politely."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'suitable'.", "right for a particular purpose", ["impossible to use", "far away from town", "written in pencil"], "'Suitable' means appropriate or right for a specific purpose."),
  seed("Vocabulary", "Meaning in context", "Choose the word closest in meaning to 'encourage'.", "give support or confidence", ["make illegal", "hide carefully", "count silently"], "To encourage means to support someone or make them more willing to do something."),
  seed("Cloze and sentence completion", "Cloze", "Complete the sentence: The office introduced online booking ___ visitors would not wait in long lines.", "so that", ["because of", "despite", "unless"], "'So that' introduces the purpose of introducing online booking."),
  seed("Cloze and sentence completion", "Cloze", "Complete the sentence: The device is small; ___, it can store a large amount of data.", "nevertheless", ["therefore", "because", "before"], "'Nevertheless' shows contrast between small size and large storage capacity."),
  seed("Cloze and sentence completion", "Sentence completion", "Complete the sentence: Please check the address carefully before you ___ the form.", "submit", ["submitted", "submitting", "are submitted"], "After 'before you' with an instruction, the base present form 'submit' is correct."),
  seed("Cloze and sentence completion", "Sentence completion", "Complete the sentence: The new timetable made it easier for parents ___ evening classes.", "to attend", ["attending", "attended", "attend to"], "The structure is 'make it easier for someone to do something'."),
  seed("Cloze and sentence completion", "Cloze", "Complete the sentence: The team could not finish the task ___ the internet connection failed.", "because", ["although", "unless", "while"], "'Because' gives the reason for not finishing the task."),
  seed("Cloze and sentence completion", "Sentence completion", "Complete the sentence: A clear map helps visitors ___ the building without asking for directions.", "find their way around", ["lose their way around", "turn the building off", "borrow their way around"], "The expression 'find their way around' means navigate a place."),
  seed("Cloze and sentence completion", "Cloze", "Complete the sentence: The report is useful ___ it compares results from several years.", "because", ["unless", "despite", "before"], "'Because' introduces the reason the report is useful."),
  seed("Cloze and sentence completion", "Sentence completion", "Complete the sentence: The course is designed for learners who want ___ their speaking skills.", "to improve", ["improving", "improved", "improve to"], "After 'want', the infinitive with 'to' is used."),
  seed("Cloze and sentence completion", "Cloze", "Complete the sentence: The museum stayed open later ___ more families could visit after work.", "so that", ["even though", "instead of", "as soon as"], "'So that' expresses purpose."),
  seed("Cloze and sentence completion", "Text coherence", "Choose the sentence that best completes the text: The app sends reminders before deadlines. It also shows which tasks are already done. ___", "As a result, users can manage their work more easily.", ["For example, the app cannot be opened.", "However, deadlines are never important.", "In contrast, reminders are a type of furniture."], "The missing sentence should summarize the positive result of reminders and progress tracking.")
];

const englishSingles = englishSingleSeeds.map((item) => {
  if (item.topic === "Grammar") {
    return { ...item, question: item.question.replace("Choose the correct option:", "Choose the correct option for this sentence:") };
  }

  if (item.topic === "Vocabulary") {
    return { ...item, question: item.question.replace("Choose the word closest", "In this vocabulary item, choose the word closest") };
  }

  return { ...item, question: item.question.replace("Complete the sentence:", "Complete this sentence:") };
});

const managementConcepts: Concept[] = [
  concept("Теорія менеджменту", "Системний підхід", "системний підхід", "розгляд організації як цілісної системи взаємопов'язаних елементів", "підприємство аналізує, як зміна графіка складу впливає на продажі, сервіс і фінанси", "оцінити наслідки рішення для кількох підсистем, а не лише для одного відділу", "він допомагає бачити взаємозалежності й уникати локально вигідних, але шкідливих для системи рішень"),
  concept("Теорія менеджменту", "Ситуаційний підхід", "ситуаційний підхід", "добір управлінських методів відповідно до конкретних умов", "керівник змінює стиль роботи команди залежно від терміновості, досвіду працівників і ризику помилки", "спочатку оцінити контекст, а потім обрати інструмент управління", "немає універсального методу для всіх ситуацій, тому важлива відповідність умовам"),
  concept("Теорія менеджменту", "Ефективність", "ефективність управління", "співвідношення досягнутого результату з витраченими ресурсами", "команда виконала план продажів, але витратила вдвічі більше бюджету, ніж передбачалося", "порівняти результат із витратами часу, коштів і зусиль", "вона показує не лише факт досягнення мети, а й ціну цього результату"),
  concept("Теорія менеджменту", "Результативність", "результативність", "ступінь досягнення поставлених цілей", "відділ мав залучити 200 клієнтів і фактично залучив 210", "оцінити, чи досягнуто запланований цільовий показник", "результативність відповідає на питання, чи виконано ціль"),
  concept("Теорія менеджменту", "Повноваження", "делегування повноважень", "передання завдання разом із правами для його виконання", "керівник доручає координатору організувати захід і дозволяє самостійно узгоджувати підрядників у межах бюджету", "передати не лише завдання, а й межі рішень та критерії результату", "без повноважень виконавець не може відповідати за результат"),
  concept("Теорія менеджменту", "Ролі менеджера", "роль розповсюджувача інформації", "передавання важливої інформації працівникам організації", "менеджер після наради пояснює команді нові правила обслуговування клієнтів", "структуровано донести рішення й перевірити розуміння команди", "ця роль забезпечує рух інформації всередині організації"),
  concept("Теорія менеджменту", "Організаційні цілі", "SMART-ціль", "ціль, що є конкретною, вимірюваною, досяжною, релевантною та обмеженою в часі", "відділ формулює мету збільшити частку повторних покупок на 8% до кінця кварталу", "перевірити наявність показника, строку й зв'язку зі стратегією", "SMART-формат робить ціль придатною для планування і контролю"),
  concept("Функції менеджменту", "Планування", "тактичне планування", "конкретизація стратегічних цілей у середньострокові плани дій", "після затвердження стратегії підрозділ складає квартальний план запуску нових сервісів", "перекласти стратегічний напрям у конкретні програми й ресурси", "тактичний план пов'язує загальну стратегію з операційними діями"),
  concept("Функції менеджменту", "Організування", "організування", "створення структури ролей, відповідальності та ресурсів для виконання плану", "після затвердження проєкту керівник розподіляє завдання між маркетингом, фінансами й сервісом", "визначити ролі, відповідальних і канали взаємодії", "організування перетворює план на робочу систему виконання"),
  concept("Функції менеджменту", "Мотивація", "мотивація", "спонукання людей діяти для досягнення цілей організації", "команда має знання, але відкладає складне завдання через низьку зацікавленість у результаті", "поєднати значущу мету, визнання і зрозумілу винагороду", "мотивація впливає на інтенсивність, напрям і сталість зусиль"),
  concept("Функції менеджменту", "Контроль", "поточний контроль", "перевірка виконання роботи під час процесу, а не лише після завершення", "координатор щотижня порівнює фактичну готовність модулів із планом проєкту", "відстежувати проміжні показники й одразу коригувати відхилення", "поточний контроль дозволяє втручатися до того, як проблема стане критичною"),
  concept("Функції менеджменту", "Попередній контроль", "попередній контроль", "перевірка ресурсів і умов до початку роботи", "перед укладанням договору перевіряють ліцензії та досвід підрядника", "оцінити готовність ресурсів до старту виконання", "він зменшує ризик помилки ще до початку процесу"),
  concept("Функції менеджменту", "Координація", "координація", "узгодження дій різних виконавців для досягнення спільної мети", "відділ продажів обіцяє клієнтам терміни, які має підтвердити виробничий підрозділ", "узгодити графіки, залежності та відповідальних між підрозділами", "координація запобігає конфліктам і дублюванню роботи"),
  concept("Функції менеджменту", "Зворотний зв'язок", "зворотний зв'язок", "інформація про результат дії, що дає змогу коригувати поведінку або процес", "після запуску послуги клієнти повідомляють, які кроки форми були незрозумілими", "зібрати відгуки і перетворити їх на зміни у процесі", "без зворотного зв'язку менеджер не бачить реального ефекту рішення"),
  concept("Стратегія та організаційні структури", "Місія", "місія організації", "узагальнене формулювання призначення організації та цінності, яку вона створює", "команда оновлює опис того, для кого працює організація і яку суспільну користь вона дає", "сформулювати призначення мовою користі для зацікавлених сторін", "місія задає рамку стратегічних рішень і пріоритетів"),
  concept("Стратегія та організаційні структури", "Бачення", "бачення", "уявлення про бажаний майбутній стан організації", "керівництво описує, якою компанія має стати через п'ять років", "узгодити довгостроковий образ майбутнього з командою", "бачення спрямовує зміни і пояснює бажаний напрям розвитку"),
  concept("Стратегія та організаційні структури", "SWOT", "SWOT-аналіз", "оцінювання сильних і слабких сторін, можливостей і загроз", "команда одночасно аналізує власну експертизу, нестачу персоналу, новий ринок і появу конкурента", "розділити чинники на внутрішні та зовнішні, позитивні та негативні", "SWOT допомагає структурувати стратегічну ситуацію"),
  concept("Стратегія та організаційні структури", "PEST", "PEST-аналіз", "аналіз політичних, економічних, соціальних і технологічних чинників середовища", "перед виходом на ринок компанія оцінює законодавчі зміни, інфляцію, демографію й цифрові платформи", "оцінити макросередовище за чотирма групами чинників", "PEST показує зовнішні умови, які організація не контролює безпосередньо"),
  concept("Стратегія та організаційні структури", "Диференціація", "стратегія диференціації", "створення відмінної цінності, важливої для цільових клієнтів", "сервіс конкурує не найнижчою ціною, а швидкою підтримкою й персональними консультаціями", "підкреслити унікальні характеристики, за які клієнт готовий платити", "диференціація працює через значущу відмінність від альтернатив"),
  concept("Стратегія та організаційні структури", "Функціональна структура", "функціональна структура", "групування працівників за спеціалізованими функціями", "організація має окремі підрозділи маркетингу, фінансів, виробництва і персоналу", "посилити експертизу всередині функцій і налагодити міжфункціональну координацію", "така структура концентрує професійні компетентності в підрозділах"),
  concept("Стратегія та організаційні структури", "Матрична структура", "матрична структура", "поєднання функціонального та проєктного підпорядкування", "інженер одночасно звітує керівнику відділу і менеджеру проєкту", "чітко прописати пріоритети між функціональним і проєктним керівниками", "матрична структура гнучка, але створює ризик подвійного підпорядкування"),
  concept("Стратегія та організаційні структури", "Децентралізація", "децентралізація", "передання частини рішень нижчим рівням управління", "регіональні офіси отримали право самостійно адаптувати акції до місцевого попиту", "визначити межі автономії та показники контролю", "децентралізація пришвидшує реакцію на локальні умови"),
  concept("Лідерство, мотивація і комунікація", "Лідерство", "трансформаційне лідерство", "вплив через бачення, натхнення, розвиток і зміни", "керівник пояснює сенс реформи, залучає команду до нового бачення і підтримує навчання", "поєднати натхнення з розвитком працівників та спільним баченням", "трансформаційний лідер змінює мотивацію і погляд команди на цілі"),
  concept("Лідерство, мотивація і комунікація", "Стилі керівництва", "демократичний стиль", "залучення працівників до обговорення рішень за збереження відповідальності керівника", "керівник збирає пропозиції команди перед зміною графіка роботи", "організувати обговорення, але зафіксувати відповідального за фінальне рішення", "цей стиль підвищує залученість і якість інформації для рішення"),
  concept("Лідерство, мотивація і комунікація", "Мотивація", "теорія очікувань", "пояснення мотивації через зв'язок зусилля, результату і винагороди", "працівники не стараються, бо не вірять, що кращий результат буде помічено", "показати зв'язок між зусиллям, показником і винагородою", "мотивація зростає, коли люди бачать реалістичний шлях від дії до винагороди"),
  concept("Лідерство, мотивація і комунікація", "Справедливість", "теорія справедливості", "оцінювання мотивації через порівняння внеску і винагороди з іншими", "фахівець знижує зусилля, бо вважає свою оплату нижчою за оплату колеги з таким самим внеском", "перевірити прозорість критеріїв і сприйняття балансу внесок-винагорода", "відчуття несправедливості може змінювати поведінку навіть за формально правильної системи"),
  concept("Лідерство, мотивація і комунікація", "Комунікація", "комунікаційний шум", "перешкоди, що спотворюють передавання або розуміння повідомлення", "інструкцію надіслали в чат, але через неоднозначні скорочення частина команди зрозуміла її неправильно", "уточнити терміни, канал і перевірити розуміння адресатів", "шум знижує точність комунікації і може спричинити помилки"),
  concept("Лідерство, мотивація і комунікація", "Конфлікти", "конструктивний конфлікт", "суперечність, яка через обговорення допомагає поліпшити рішення", "два відділи сперечаються про запуск, але виявляють ризик, який раніше не врахували", "перевести суперечку з особистих оцінок на критерії та дані", "конфлікт може бути корисним, якщо фокус зміщується на проблему"),
  concept("Лідерство, мотивація і комунікація", "Переговори", "інтегративні переговори", "пошук рішення, яке враховує інтереси сторін і збільшує спільну вигоду", "постачальник і замовник замість торгу за ціну погоджують графік поставок і сервісну підтримку", "з'ясувати інтереси сторін і шукати варіант з додатковою цінністю", "інтегративний підхід не обмежується розподілом фіксованого ресурсу"),
  concept("HR та організаційна поведінка", "Підбір", "профіль посади", "опис вимог до ролі, компетентностей, відповідальності та умов роботи", "перед пошуком кандидата HR узгоджує потрібні навички, задачі й критерії успіху", "описати вимоги до ролі до початку відбору", "профіль посади зменшує випадковість у доборі персоналу"),
  concept("HR та організаційна поведінка", "Адаптація", "онбординг", "системне введення нового працівника в роль, команду і правила", "новачок отримує план першого місяця, наставника і пояснення процесів", "поєднати навчання, наставництво і перевірку розуміння ролі", "онбординг скорочує період невизначеності й допомагає швидше досягти продуктивності"),
  concept("HR та організаційна поведінка", "Оцінювання", "оцінювання за компетентностями", "перевірка поведінкових проявів знань, навичок і ставлень, потрібних для ролі", "під час оцінювання менеджер аналізує не лише результат продажів, а й уміння вести переговори та працювати з запереченнями", "порівняти поведінкові індикатори з моделлю компетентностей", "компетентності показують, як саме людина досягає результату"),
  concept("HR та організаційна поведінка", "Навчання", "план розвитку", "узгоджений набір дій для зростання компетентностей працівника", "після оцінювання працівник отримав цілі навчання, практичні завдання і контрольні точки", "пов'язати навчання з конкретними компетентностями і строками", "план розвитку перетворює загальне бажання навчатися на керований процес"),
  concept("HR та організаційна поведінка", "Команди", "командна роль", "типовий внесок учасника в роботу команди", "один учасник генерує ідеї, інший структурує план, третій перевіряє ризики", "розподілити ролі так, щоб різні сильні сторони доповнювали одна одну", "командні ролі допомагають збалансувати взаємодію і відповідальність"),
  concept("Маркетинг і клієнтська орієнтація", "Сегментація", "сегментування ринку", "поділ ринку на групи споживачів зі схожими потребами або поведінкою", "компанія окремо аналізує студентів, молодих батьків і власників малого бізнесу", "визначити групи клієнтів і адаптувати пропозицію до їхніх потреб", "сегментування дозволяє не звертатися до всіх однаковим повідомленням"),
  concept("Маркетинг і клієнтська орієнтація", "Позиціонування", "позиціонування", "формування бажаного сприйняття бренду в цільової аудиторії", "сервіс хоче, щоб його сприймали як найзручніше рішення для зайнятих фахівців", "узгодити обіцянку бренду, докази й комунікацію для цільового сегмента", "позиціонування відповідає на питання, чим пропозиція відрізняється у свідомості клієнта"),
  concept("Маркетинг і клієнтська орієнтація", "Цінність", "ціннісна пропозиція", "пояснення, яку користь клієнт отримує і чому має обрати саме цю пропозицію", "стартап описує, як його сервіс економить час бухгалтеру і зменшує ризик помилок", "сформулювати конкретну вигоду для цільового клієнта", "ціннісна пропозиція пов'язує потребу клієнта з перевагою продукту"),
  concept("Маркетинг і клієнтська орієнтація", "Маркетинг-мікс", "комплекс маркетингу 4P", "узгодження продукту, ціни, місця продажу і просування", "компанія одночасно змінює упаковку, ціну, канал продажу і рекламне повідомлення", "узгодити product, price, place і promotion як одну систему", "окремі маркетингові рішення мають підтримувати одне одного"),
  concept("Маркетинг і клієнтська орієнтація", "Лояльність", "клієнтська лояльність", "схильність клієнта повторно купувати і рекомендувати бренд", "покупці не лише повертаються, а й радять сервіс знайомим", "відстежувати повторні покупки, рекомендації та причини повернення", "лояльність показує сталість позитивного ставлення і поведінки клієнтів"),
  concept("Фінанси, облік та економіка", "Ліквідність", "ліквідність", "здатність організації своєчасно виконувати короткострокові зобов'язання", "підприємство має прибуток на папері, але не має грошей для оплати рахунків цього тижня", "оцінити поточні активи, платежі й строки надходжень", "ліквідність стосується доступності коштів для поточних платежів"),
  concept("Фінанси, облік та економіка", "Рентабельність", "рентабельність продажів", "частка прибутку в доході від реалізації", "компанія порівнює прибуток із виручкою, щоб оцінити маржинальність бізнесу", "розрахувати співвідношення прибутку до продажів", "цей показник показує, скільки прибутку дає одиниця виручки"),
  concept("Фінанси, облік та економіка", "Беззбитковість", "точка беззбитковості", "обсяг продажів, за якого доходи дорівнюють сукупним витратам", "підприємець визначає мінімальну кількість підписок, щоб покрити оренду, зарплату і змінні витрати", "знайти обсяг, де прибуток дорівнює нулю", "точка беззбитковості показує межу між збитком і прибутком"),
  concept("Фінанси, облік та економіка", "Бюджетування", "бюджетний контроль", "порівняння фактичних витрат і доходів із бюджетом", "керівник бачить, що витрати на рекламу перевищили план на 12%", "виявити відхилення і пояснити їх причини", "бюджетний контроль дає підстави для коригування фінансових рішень"),
  concept("Фінанси, облік та економіка", "Грошові потоки", "операційний грошовий потік", "рух коштів, пов'язаний з основною діяльністю організації", "сервіс аналізує надходження від клієнтів і платежі постачальникам за поточні послуги", "відокремити поточні надходження і платежі від інвестицій та фінансування", "операційний потік показує здатність основної діяльності генерувати гроші"),
  concept("Проєкти, операції, інновації і ризики", "Проєкти", "статут проєкту", "документ, що формально запускає проєкт і фіксує його цілі, межі та відповідальних", "перед стартом цифровізації команда погоджує цілі, очікувані результати і менеджера проєкту", "зафіксувати підстави, межі, роль менеджера і ключових стейкхолдерів", "статут створює спільне розуміння стартових рамок проєкту"),
  concept("Проєкти, операції, інновації і ризики", "Проєкти", "критичний шлях", "послідовність робіт, затримка яких затримує весь проєкт", "три залежні задачі не мають резерву часу, тому будь-яке запізнення переносить дату запуску", "визначити роботи без резерву і контролювати їх першочергово", "критичний шлях визначає мінімальну тривалість проєкту"),
  concept("Проєкти, операції, інновації і ризики", "Операції", "вузьке місце процесу", "етап, що обмежує пропускну здатність усього процесу", "замовлення швидко проходять перевірку і пакування, але очікують погодження одного фахівця", "усунути або розвантажити етап, який накопичує чергу", "продуктивність системи часто визначає найповільніша ланка"),
  concept("Проєкти, операції, інновації і ризики", "Якість", "цикл PDCA", "послідовність плануй - виконуй - перевіряй - дій для постійного поліпшення", "команда тестує новий стандарт, вимірює помилки і вносить зміни до процедури", "планувати зміни, перевіряти результат і стандартизувати покращення", "PDCA підтримує кероване безперервне вдосконалення"),
  concept("Проєкти, операції, інновації і ризики", "Lean", "втрати в Lean", "дії або ресурси, що не створюють цінності для клієнта", "у процесі тричі переписують однакові дані в різні таблиці без користі для клієнта", "прибрати дублювання і скоротити непотрібні кроки", "Lean фокусується на потоці цінності й усуненні втрат"),
  concept("Проєкти, операції, інновації і ризики", "Інновації", "процесна інновація", "новий або суттєво поліпшений спосіб виконання роботи", "служба підтримки впровадила автоматичний розподіл звернень, що скоротив час відповіді", "оцінити, як зміна процесу впливає на швидкість, якість і витрати", "процесна інновація змінює спосіб створення або доставки цінності"),
  concept("Проєкти, операції, інновації і ризики", "Ризики", "матриця ризиків", "інструмент оцінювання ризиків за ймовірністю та впливом", "команда розміщує ризики запуску в таблиці за шансом настання і масштабом наслідків", "пріоритезувати ризики з високою ймовірністю та великим впливом", "матриця допомагає обрати, на які ризики реагувати першими"),
  concept("Проєкти, операції, інновації і ризики", "Реагування на ризики", "передання ризику", "перенесення частини наслідків ризику на іншу сторону через договір або страхування", "компанія страхує обладнання від пошкодження під час транспортування", "закріпити відповідальність або компенсацію у договорі чи страховці", "передання не усуває ризик, але змінює розподіл його наслідків"),
  concept("Публічне адміністрування і підприємництво", "Врядування", "прозорість врядування", "відкритість інформації про рішення, процедури та критерії", "громада публікує критерії розподілу грантів і протоколи засідань комісії", "зробити правила, дані й мотиви рішення доступними для зацікавлених сторін", "прозорість зменшує недовіру і підсилює підзвітність"),
  concept("Публічне адміністрування і підприємництво", "Підзвітність", "підзвітність", "обов'язок пояснювати рішення і відповідати за їх наслідки", "керівник програми звітує громаді про витрати, результати і невиконані показники", "показати, хто відповідає за рішення і як оцінюється результат", "підзвітність пов'язує владу з відповідальністю перед суспільством"),
  concept("Публічне адміністрування і підприємництво", "Підприємництво", "ціннісна гіпотеза", "припущення про те, яку проблему клієнта розв'язує продукт і чому це важливо", "команда стартапу перевіряє, чи справді малі кав'ярні потребують автоматичного обліку залишків", "сформулювати проблему клієнта і перевірити її через інтерв'ю або тест", "ціннісна гіпотеза зменшує ризик створити непотрібний продукт"),
  concept("Публічне адміністрування і підприємництво", "Бізнес-модель", "канали бізнес-моделі", "способи, якими організація доносить цінність до клієнтів і взаємодіє з ними", "освітній сервіс продає курси через сайт, партнерів і корпоративні угоди", "оцінити, через які канали клієнт дізнається, купує і отримує продукт", "канали з'єднують ціннісну пропозицію з цільовими сегментами"),
  concept("Культура, зміни та результативність", "Культура", "артефакти культури", "видимі прояви організаційної культури, як-от ритуали, символи, мова і простір", "у компанії щотижня публічно обговорюють помилки як джерело навчання", "аналізувати видимі практики разом із цінностями, які вони підтримують", "артефакти показують культуру, але потребують інтерпретації"),
  concept("Культура, зміни та результативність", "Зміни", "коаліція змін", "група впливових прихильників, які підтримують і просувають організаційну зміну", "перед реформою керівник залучає лідерів підрозділів, які пояснюють зміни командам", "сформувати групу підтримки з авторитетних учасників", "коаліція допомагає подолати опір і поширити нову практику"),
  concept("Культура, зміни та результативність", "KPI", "провідний індикатор", "показник, який сигналізує про майбутній результат до його настання", "служба підтримки відстежує час першої відповіді, щоб передбачити майбутню задоволеність клієнтів", "обрати показник, який змінюється раніше за фінальний результат", "провідні індикатори дозволяють реагувати до появи підсумкової проблеми")
];

const psychologySociologyConcepts: Concept[] = [
  concept("Загальна психологія і когнітивні процеси", "Увага", "розподіл уваги", "здатність одночасно підтримувати виконання кількох дій або швидко перемикати контроль між ними", "студент слухає пояснення і паралельно занотовує ключові тези", "зменшити кількість паралельних задач, якщо одна з них нова або складна", "увага має обмежені ресурси, тому складні дії конкурують за контроль"),
  concept("Загальна психологія і когнітивні процеси", "Пам'ять", "робоча пам'ять", "тимчасове утримання й оброблення інформації під час виконання завдання", "людина тримає в голові номер кабінету, поки шукає потрібний поверх", "подати інформацію невеликими блоками й зменшити зайве навантаження", "робоча пам'ять обмежена, тому перевантаження знижує точність дії"),
  concept("Загальна психологія і когнітивні процеси", "Сприймання", "константність сприймання", "відносна сталість образу предмета попри зміну умов сприймання", "аркуш паперу здається білим і в тіні, і біля вікна", "враховувати, що сприймання не є механічною копією стимулу", "психіка стабілізує образи, щоб людина могла орієнтуватися в середовищі"),
  concept("Загальна психологія і когнітивні процеси", "Мислення", "узагальнення", "виділення спільних істотних ознак об'єктів або явищ", "дитина називає різні породи собак одним словом 'собака'", "порівняти об'єкти й знайти спільну істотну ознаку", "узагальнення допомагає формувати поняття, а не лише запам'ятовувати окремі приклади"),
  concept("Загальна психологія і когнітивні процеси", "Уява", "творча уява", "створення нових образів або рішень через перетворення досвіду", "дизайнер поєднує ідеї з різних проєктів і пропонує новий формат навчального стенду", "дати простір для комбінування образів і перевірити практичність ідеї", "творча уява не копіює досвід буквально, а перебудовує його"),
  concept("Загальна психологія і когнітивні процеси", "Мовлення", "внутрішнє мовлення", "мовлення, спрямоване на себе для планування й регуляції дій", "перед відповіддю студент подумки проговорює план пояснення", "використати самопояснення для структурування складного завдання", "внутрішнє мовлення підтримує мислення і саморегуляцію"),
  concept("Особистість, мотивація та емоції", "Мотивація", "ієрархія потреб Маслоу", "модель, що описує рівні потреб від базових до потреб самореалізації", "працівник не цікавиться навчанням, бо хвилюється через нестабільну оплату і безпеку", "спершу врахувати базові потреби, які блокують вищі мотиви", "модель підкреслює, що різні потреби можуть по-різному впливати на поведінку"),
  concept("Особистість, мотивація та емоції", "Темперамент", "емоційна реактивність", "швидкість і сила емоційної відповіді на події", "дві людини отримали однакове зауваження, але одна швидко й сильно засмутилася", "відрізняти динаміку реакції від моральної оцінки людини", "реактивність описує темп і силу відповіді, а не зміст переконань"),
  concept("Особистість, мотивація та емоції", "Самооцінка", "адекватна самооцінка", "відносно реалістичне оцінювання власних можливостей і обмежень", "студент визнає, що добре знає теорію, але потребує більше практики з тестами", "порівняти самооцінку з реальними результатами й зворотним зв'язком", "адекватність означає не завищення чи заниження, а відповідність фактам"),
  concept("Особистість, мотивація та емоції", "Локус контролю", "внутрішній локус контролю", "схильність пояснювати результати власними діями та рішеннями", "після невдачі людина аналізує, як змінити підготовку, а не лише звинувачує випадок", "виділити дії, які людина може контролювати в майбутньому", "внутрішній локус підтримує активне ставлення до результату"),
  concept("Особистість, мотивація та емоції", "Стрес", "еустрес", "помірне напруження, яке мобілізує і не руйнує функціонування", "короткий термін виконання допоміг команді зібратися і швидко завершити задачу", "відрізняти мобілізаційний виклик від виснажливого перевантаження", "не кожне напруження шкідливе; важливі інтенсивність, тривалість і ресурси"),
  concept("Особистість, мотивація та емоції", "Психологічний захист", "проєкція", "приписування власних неприйнятних переживань або мотивів іншій людині", "людина сердиться, але стверджує, що саме колега налаштований вороже без достатніх підстав", "обережно розрізняти факти поведінки іншого і власні переживання", "проєкція зменшує внутрішній дискомфорт, але може спотворювати сприймання"),
  concept("Вікова та соціальна психологія", "Розвиток", "зона найближчого розвитку", "рівень завдань, які дитина може виконати з підтримкою, але ще не самостійно", "учень розв'язує задачу після навідних питань учителя, хоча сам ще не справляється", "дати підтримку, яка поступово зменшується з розвитком уміння", "поняття Виготського пояснює навчання через співпрацю і потенціал розвитку"),
  concept("Вікова та соціальна психологія", "Прихильність", "безпечна прихильність", "стосунок, у якому дитина сприймає дорослого як надійну базу для дослідження світу", "дитина засмучується при розлуці, але заспокоюється після повернення близького дорослого", "підтримувати передбачувану чутливу взаємодію", "безпечна прихильність пов'язана з довірою до доступності дорослого"),
  concept("Вікова та соціальна психологія", "Соціальна психологія", "конформність", "зміна судження або поведінки під впливом групового тиску", "студент погоджується з очевидно хибною відповіддю, бо так відповіла більшість групи", "зменшити тиск більшості й дозволити незалежне висловлення думок", "конформність пояснює, як група може впливати на індивідуальні рішення"),
  concept("Вікова та соціальна психологія", "Атрибуція", "фундаментальна помилка атрибуції", "переоцінювання особистісних причин поведінки інших і недооцінювання ситуації", "спостерігач називає працівника лінивим, не знаючи, що система не працювала весь день", "перевірити ситуаційні обставини перед висновком про риси людини", "ця помилка виникає, коли поведінку інших пояснюють характером без урахування контексту"),
  concept("Вікова та соціальна психологія", "Групи", "соціальна фасилітація", "зміна продуктивності діяльності через присутність інших людей", "досвідчений оратор виступає впевненіше перед аудиторією, ніж наодинці", "оцінити складність завдання і рівень навички перед публічним виконанням", "присутність інших може підсилювати добре засвоєні дії"),
  concept("Вікова та соціальна психологія", "Стереотипи", "стереотип", "спрощене узагальнене уявлення про групу людей", "людині приписують певну рису лише через належність до професійної групи", "перевіряти індивідуальну інформацію, а не покладатися на групове узагальнення", "стереотип економить мислення, але може викривляти оцінку конкретної людини"),
  concept("Методи, діагностика і консультування", "Методи", "експеримент", "метод перевірки причинного впливу через контроль і зміну умов", "дослідник змінює тип підказки і порівнює успішність двох груп", "контролювати змінні й порівнювати групи за однакових умов", "експеримент краще за просте спостереження перевіряє причинні зв'язки"),
  concept("Методи, діагностика і консультування", "Валідність", "конструктна валідність", "відповідність тесту теоретичному психологічному конструкту, який він має вимірювати", "методику тривожності перевіряють на зв'язок із іншими показниками тривоги, а не з випадковими рисами", "зіставити результати тесту з теорією і спорідненими методиками", "валідність показує, чи тест справді вимірює заявлену властивість"),
  concept("Методи, діагностика і консультування", "Надійність", "ретестова надійність", "стабільність результатів методики при повторному вимірюванні", "учасники повторно проходять тест через два тижні, щоб перевірити сталість балів", "порівняти результати двох вимірювань за стабільної властивості", "надійність потрібна, щоб результат не був випадковим"),
  concept("Методи, діагностика і консультування", "Етика", "інформована згода", "добровільна участь після зрозумілого пояснення мети, умов і ризиків", "перед опитуванням респонденту пояснюють, які дані збирають і що він може відмовитися", "надати інформацію і отримати добровільну згоду без примусу", "інформована згода захищає автономію учасника дослідження"),
  concept("Методи, діагностика і консультування", "Кореляція", "кореляційне дослідження", "виявлення статистичного зв'язку між змінними без доведення причинності", "дослідник знаходить зв'язок між часом сну і балами, але не змінює режим сну учасників", "обережно описувати зв'язок і не робити автоматичного причинного висновку", "кореляція показує співзмінювання, а не обов'язкову причину"),
  concept("Методи, діагностика і консультування", "Консультування", "емпатичне слухання", "уважне розуміння переживань клієнта з перевіркою смислу його слів", "консультант перефразовує сказане клієнтом і уточнює, чи правильно зрозумів його почуття", "відображати зміст і емоції без оцінювання та поспішних порад", "емпатичне слухання підтримує довіру і точніше розуміння проблеми"),
  concept("Методи, діагностика і консультування", "Психотерапія", "когнітивна реструктуризація", "виявлення і перевірка неадаптивних думок з пошуком реалістичніших інтерпретацій", "клієнт вважає одну помилку доказом повної неспроможності, а консультант допомагає перевірити це переконання", "зібрати докази за і проти автоматичної думки", "цей прийом типовий для когнітивно-поведінкового підходу"),
  concept("Соціологічна теорія і поняття", "Соціологія", "соціальна дія", "дія, орієнтована на інших людей і наділена суб'єктивним смислом", "людина публікує звернення, очікуючи реакції громади", "аналізувати смисл дії та її орієнтацію на інших", "у веберівській традиції соціологія розуміє смисли соціальних дій"),
  concept("Соціологічна теорія і поняття", "Соціальні факти", "соціальний факт", "зовнішній щодо індивіда спосіб дії або мислення, що має примусовий вплив", "правила вступу діють для абітурієнтів незалежно від особистих бажань", "розглядати норму як суспільний факт, що впливає на поведінку", "поняття Дюркгайма підкреслює зовнішність і примусовість соціальних норм"),
  concept("Соціологічна теорія і поняття", "Функціоналізм", "структурний функціоналізм", "підхід, що аналізує функції елементів для підтримання соціальної системи", "дослідник пояснює, як освіта передає норми і готує людей до ролей", "з'ясувати, яку функцію інститут виконує для суспільства", "функціоналізм фокусується на внеску інститутів у стабільність і відтворення"),
  concept("Соціологічна теорія і поняття", "Конфлікт", "конфліктна перспектива", "аналіз суспільства через нерівність, владу і боротьбу за ресурси", "дослідник вивчає, як групи з різним доступом до власності впливають на політичні рішення", "поставити питання про інтереси, владу і розподіл ресурсів", "конфліктний підхід бачить соціальний порядок як результат боротьби інтересів"),
  concept("Соціологічна теорія і поняття", "Інтеракціонізм", "символічний інтеракціонізм", "підхід, що вивчає створення значень у повсякденній взаємодії", "дослідник аналізує, як учасники групи через жарти й символи формують спільну ідентичність", "вивчати мову, символи і тлумачення учасників", "цей підхід пояснює соціальність через значення, які виникають у взаємодії"),
  concept("Соціологічна теорія і поняття", "Норми", "соціальна норма", "очікуване правило поведінки, підтримуване санкціями групи або суспільства", "у бібліотеці прийнято говорити тихо, і порушників осуджують інші відвідувачі", "визначити правило поведінки і санкції за його порушення", "норма регулює поведінку через очікування та схвалення або осуд"),
  concept("Соціологічна теорія і поняття", "Статус і роль", "рольовий конфлікт", "суперечність між очікуваннями різних соціальних ролей однієї людини", "студент одночасно має бути на важливій парі й виконувати термінове робоче доручення", "розрізнити очікування різних ролей і визначити пріоритети", "рольовий конфлікт виникає не всередині однієї норми, а між різними рольовими вимогами"),
  concept("Інститути, стратифікація і мобільність", "Інститути", "соціальний інститут", "стійка система норм, ролей і практик для задоволення суспільної потреби", "освіта має правила вступу, ролі викладача і студента та процедури оцінювання", "аналізувати не окрему людину, а систему норм і ролей", "інститути організують повторювані важливі сфери суспільного життя"),
  concept("Інститути, стратифікація і мобільність", "Стратифікація", "соціальна стратифікація", "ієрархічне розшарування суспільства за доступом до ресурсів і престижу", "дослідження порівнює групи за доходом, освітою і владою", "виявити критерії нерівного розподілу життєвих шансів", "стратифікація показує структуровану соціальну нерівність"),
  concept("Інститути, стратифікація і мобільність", "Мобільність", "вертикальна мобільність", "переміщення на вищу або нижчу позицію в соціальній ієрархії", "працівник після навчання переходить на керівну посаду з вищим статусом", "визначити, чи змінився статусний рівень позиції", "вертикальна мобільність змінює місце в ієрархії"),
  concept("Інститути, стратифікація і мобільність", "Клас", "соціальний клас", "велика група з подібною економічною позицією і життєвими шансами", "дослідник порівнює власників бізнесу, найманих фахівців і низькооплачуваних працівників", "аналізувати економічні ресурси, працю і доступ до можливостей", "класова позиція пов'язана з економічною структурою суспільства"),
  concept("Інститути, стратифікація і мобільність", "Бідність", "відносна бідність", "нестача ресурсів порівняно зі стандартами життя конкретного суспільства", "родина має базове харчування, але не може дозволити участь дітей у звичних для однолітків освітніх активностях", "порівняти ресурси з нормами і стандартами конкретного суспільства", "відносна бідність залежить від соціального контексту, а не лише фізичного виживання"),
  concept("Інститути, стратифікація і мобільність", "Освіта", "латентна функція освіти", "непроголошений, але реальний соціальний наслідок діяльності освіти", "в університеті студенти формують професійні контакти, хоча офіційна мета програми - навчання", "відрізнити заявлену функцію від побічного соціального наслідку", "латентні функції не декларуються прямо, але впливають на суспільство"),
  concept("Інститути, стратифікація і мобільність", "Сім'я", "первинна соціалізація", "раннє засвоєння базових норм і ролей у близькому оточенні", "дитина в родині вчиться говорити, вітатися і виконувати прості правила взаємодії", "аналізувати роль сім'ї та найближчого середовища в ранньому засвоєнні норм", "первинна соціалізація формує базові моделі поведінки"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Культура", "культурний лаг", "відставання змін норм і цінностей від технологічних або матеріальних змін", "школа отримала цифрові інструменти, але правила взаємодії й оцінювання залишилися старими", "порівняти темп технологічних змін із темпом нормативної адаптації", "культурний лаг пояснює напругу між новими умовами і старими нормами"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Соціалізація", "вторинна соціалізація", "засвоєння нових ролей і норм у пізніших соціальних середовищах", "доросла людина вчиться правилам професійної спільноти після зміни роботи", "аналізувати інститути й групи, у яких людина набуває нової ролі", "вторинна соціалізація триває після дитинства і пов'язана з новими контекстами"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Девіація", "девіантна поведінка", "поведінка, що відхиляється від норм певної групи або суспільства", "у групі з чіткою нормою взаємодопомоги учасник систематично порушує домовленості", "оцінювати поведінку щодо конкретної норми і контексту", "девіація визначається соціально, а не існує поза нормами"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Санкції", "неформальна санкція", "схвалення або осуд, що здійснюється без офіційної процедури", "колеги перестають підтримувати працівника після порушення неписаної командної домовленості", "відрізнити груповий осуд від юридичного чи адміністративного покарання", "неформальні санкції підтримують норми через повсякденну взаємодію"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Медіа", "порядок денний медіа", "вплив медіа на те, які теми суспільство вважає важливими", "новини щодня висвітлюють транспортну проблему, і громадяни частіше називають її головною", "аналізувати частоту і рамки висвітлення тем", "медіа не завжди кажуть, що думати, але впливають на те, про що думають"),
  concept("Культура, соціалізація, девіація і сучасні процеси", "Цифровізація", "цифрова нерівність", "нерівний доступ до цифрових технологій, навичок і користі від них", "частина учнів не може виконати онлайн-завдання через відсутність стабільного інтернету", "оцінити доступ, навички і реальні можливості використання технологій", "цифровізація може посилювати нерівність, якщо доступ і компетентності розподілені нерівно"),
  concept("Демографія, урбанізація та соціальні інститути", "Демографія", "демографічне старіння", "зростання частки людей старших вікових груп у населенні", "місто планує більше послуг догляду, бо частка жителів 65+ швидко збільшується", "аналізувати вікову структуру і потреби різних груп населення", "старіння змінює навантаження на медицину, пенсійну систему і ринок праці"),
  concept("Демографія, урбанізація та соціальні інститути", "Міграція", "вимушена міграція", "переміщення людей через загрозу безпеці або неможливість залишатися вдома", "родина переїжджає до іншого регіону через небезпеку в місці проживання", "врахувати причину переміщення, потреби адаптації і доступ до послуг", "вимушена міграція відрізняється від добровільної мотивом безпеки або виживання"),
  concept("Демографія, урбанізація та соціальні інститути", "Урбанізація", "субурбанізація", "зростання приміських зон навколо великих міст", "родини переїжджають за місто, але продовжують працювати і навчатися в мегаполісі", "аналізувати зв'язки між містом, передмістям і транспортною інфраструктурою", "субурбанізація змінює просторову структуру поселень і щоденні маршрути"),
  concept("Демографія, урбанізація та соціальні інститути", "Релігія", "секуляризація", "зменшення впливу релігії на суспільні інститути й повсякденне життя", "частина рішень, які раніше обґрунтовували релігійними нормами, тепер регулюється світським правом", "аналізувати зміну ролі релігійних норм у суспільстві", "секуляризація описує не зникнення віри, а зміну суспільного впливу релігії"),
  concept("Демографія, урбанізація та соціальні інститути", "Економіка", "неформальна економіка", "економічна діяльність, що відбувається поза повним офіційним обліком і регулюванням", "люди продають послуги без реєстрації договорів і податкового обліку", "відрізнити фактичну економічну активність від формально зареєстрованої", "неформальна економіка має соціальні наслідки для зайнятості, податків і захисту працівників")
];

function difficultySequence(total: number): Difficulty[] {
  const easy = Math.round(total * 0.25);
  const hard = Math.round(total * 0.2);
  const medium = total - easy - hard;
  const values: Difficulty[] = [
    ...Array<Difficulty>(easy).fill("easy"),
    ...Array<Difficulty>(medium).fill("medium"),
    ...Array<Difficulty>(hard).fill("hard")
  ];

  return values
    .map((difficulty, index) => ({ difficulty, key: (index * 37 + 11) % total }))
    .sort((left, right) => left.key - right.key)
    .map((item) => item.difficulty);
}

function rotateOptions(options: string[], index: number): { options: string[]; correctAnswer: number } {
  const shift = index % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  return { options: rotated, correctAnswer: rotated.indexOf(options[0]) };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function otherConcepts(concepts: Concept[], current: Concept): Concept[] {
  return concepts.filter((item) => item.term !== current.term);
}

function pick<T>(items: T[], start: number, count: number): T[] {
  const result: T[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(items[(start + index) % items.length]);
  }
  return result;
}

function conceptSeed(current: Concept, concepts: Concept[], variant: number, serial: number, subject: SubjectId): SimpleSeed {
  const others = otherConcepts(concepts, current);
  const picked = pick(others, serial + variant, 3);
  const actor = subject === "management" ? "менеджер" : "дослідник";

  if (variant === 0) {
    return seed(
      current.topic,
      current.subtopic,
      `У завданні наведено опис: «${current.definition}». Яке поняття відповідає цьому опису?`,
      current.term,
      [picked[0].term, picked[1].term, picked[2].term],
      `Правильна відповідь - «${current.term}», бо це ${current.definition}.`
    );
  }

  if (variant === 1) {
    return seed(
      current.topic,
      current.subtopic,
      `Проаналізуйте ситуацію: ${current.scenario}. Яке поняття найточніше її описує?`,
      current.term,
      [picked[0].term, picked[1].term, picked[2].term],
      `Ситуація ілюструє «${current.term}», оскільки йдеться про ${current.definition}.`
    );
  }

  if (variant === 2) {
    return seed(
      current.topic,
      current.subtopic,
      `Яке твердження найточніше розкриває поняття «${current.term}»?`,
      current.definition,
      [picked[0].definition, picked[1].definition, picked[2].definition],
      `Поняття «${current.term}» означає саме ${current.definition}. Інші варіанти описують інші явища.`
    );
  }

  if (variant === 3) {
    return seed(
      current.topic,
      current.subtopic,
      `${actor[0].toUpperCase()}${actor.slice(1)} має практичну ситуацію: ${current.scenario}. Яка дія найкраще відповідає поняттю «${current.term}»?`,
      current.action,
      [picked[0].action, picked[1].action, picked[2].action],
      `Найкраща дія - ${current.action}, бо для поняття «${current.term}» ключовим є: ${current.rationale}.`
    );
  }

  return seed(
    current.topic,
    current.subtopic,
    `Чому поняття «${current.term}» важливе для аналізу цієї ситуації: ${current.scenario}?`,
    current.rationale,
    [picked[0].rationale, picked[1].rationale, picked[2].rationale],
    `Саме ця відповідь правильна, бо «${current.term}» пояснює ситуацію через ознаку: ${current.definition}.`
  );
}

function buildConceptSeeds(concepts: Concept[], targets: Record<string, number>, subject: SubjectId): SimpleSeed[] {
  const seeds: SimpleSeed[] = [];

  for (const [topic, count] of Object.entries(targets)) {
    const topicConcepts = concepts.filter((item) => item.topic === topic);

    if (topicConcepts.length === 0) {
      throw new Error(`No concepts for topic ${topic}`);
    }

    for (let index = 0; index < count; index += 1) {
      const current = topicConcepts[index % topicConcepts.length];
      const variant = Math.floor(index / topicConcepts.length) % 5;
      seeds.push(conceptSeed(current, concepts, variant, seeds.length, subject));
    }
  }

  return seeds;
}

function buildQuestions(config: SubjectConfig): Question[] {
  const difficulties = difficultySequence(config.count);
  const seeds =
    config.seeds ??
    buildConceptSeeds(config.concepts ?? [], config.topicTargets ?? {}, config.subject);

  if (seeds.length !== config.count) {
    throw new Error(`${config.subject} expected ${config.count} seeds, found ${seeds.length}.`);
  }

  return seeds.map((item, index) => {
    const { options, correctAnswer } = rotateOptions([item.correct, ...item.distractors], index);
    const tags = ["generated_batch_3", config.subjectTag, ...(item.tags ?? [])];

    return {
      id: `${config.idPrefix}-${String(index + 1).padStart(3, "0")}`,
      subject: config.subject,
      type: item.type ?? "single_choice",
      topic: item.topic,
      subtopic: item.subtopic,
      difficulty: difficulties[index],
      sourceType: "generated",
      sourceUrl: null,
      reviewed: false,
      question: item.question,
      ...(item.passage ? { passage: item.passage } : {}),
      options,
      correctAnswer,
      explanation: item.explanation,
      tags
    };
  });
}

async function readQuestionsIfExists(relativeFilePath: string): Promise<Question[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(projectRoot, relativeFilePath), "utf8")) as Question[];
  } catch {
    return [];
  }
}

async function loadComparisonQuestions(outputFiles: string[]): Promise<Question[]> {
  const generatedFiles = (await fs.readdir(path.join(projectRoot, "data", "generated")))
    .filter((file) => file.endsWith(".json"))
    .map((file) => `data/generated/${file}`);
  const files = [
    "public/data/questions/tznk.json",
    "public/data/questions/english.json",
    "public/data/questions/management.json",
    "public/data/questions/psychology-sociology.json",
    ...generatedFiles,
    "data/processed/third-party/tznk.third-party.json",
    "data/processed/third-party/english.third-party.json",
    "data/processed/third-party/management.third-party.json",
    "data/processed/third-party/psychology-sociology.third-party.json"
  ].filter((file) => !outputFiles.includes(file));

  const questionSets = await Promise.all(files.map(readQuestionsIfExists));
  return questionSets.flat();
}

function assertNoDuplicates(newQuestions: Question[], comparisonQuestions: Question[]): void {
  const seenIds = new Map<string, string>();
  const seenTexts = new Map<string, string>();
  const previousBySubject = new Map<string, Question[]>();

  for (const question of comparisonQuestions) {
    seenIds.set(question.id, question.id);
    seenTexts.set(`${question.subject}:${normalize(question.question)}`, question.id);
    previousBySubject.set(question.subject, [...(previousBySubject.get(question.subject) ?? []), question]);
  }

  for (const question of newQuestions) {
    if (seenIds.has(question.id)) {
      throw new Error(`Duplicate id detected before writing: ${question.id}`);
    }

    if (new Set(question.options.map(normalize)).size !== question.options.length) {
      throw new Error(`Duplicate options detected before writing: ${question.id}`);
    }

    const normalizedQuestion = normalize(question.question);
    const textKey = `${question.subject}:${normalizedQuestion}`;
    const duplicateTextId = seenTexts.get(textKey);

    if (duplicateTextId) {
      throw new Error(`Duplicate question text detected before writing: ${question.id} duplicates ${duplicateTextId}`);
    }

    for (const previous of previousBySubject.get(question.subject) ?? []) {
      const previousText = normalize(previous.question);
      const shorter = Math.min(previousText.length, normalizedQuestion.length);
      const longer = Math.max(previousText.length, normalizedQuestion.length);

      if (shorter >= 80 && shorter / longer >= 0.9 && tokenSimilarity(previousText, normalizedQuestion) >= 0.94) {
        throw new Error(`Near-duplicate question detected before writing: ${question.id} is close to ${previous.id}`);
      }
    }

    seenIds.set(question.id, question.id);
    seenTexts.set(textKey, question.id);
    previousBySubject.set(question.subject, [...(previousBySubject.get(question.subject) ?? []), question]);
  }
}

function countBy<T extends string>(questions: Question[], getter: (question: Question) => T): Record<T, number> {
  return questions.reduce<Record<T, number>>((counts, question) => {
    const key = getter(question);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function linesFromCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right, "uk"))
    .map(([label, count]) => `- ${label}: ${count}`)
    .join("\n");
}

function buildReport(allQuestions: Question[], questionsBySubject: Record<SubjectId, Question[]>): string {
  const expectedPublicAfterMerge: Record<SubjectId, number> = {
    tznk: 365 + 100 + questionsBySubject.tznk.length,
    english: 297 + 120 + questionsBySubject.english.length,
    management: 168 + 100 + questionsBySubject.management.length,
    "psychology-sociology": 168 + 100 + questionsBySubject["psychology-sociology"].length
  };

  return `# Generated Batch 3 Report

Generated on 2026-05-19.

## Counts

- ТЗНК: ${questionsBySubject.tznk.length}
- Англійська мова: ${questionsBySubject.english.length}
- Управління та адміністрування: ${questionsBySubject.management.length}
- Психологія та соціологія: ${questionsBySubject["psychology-sociology"].length}
- Total: ${allQuestions.length}

## Expected Public Counts After Merging Reviewed Generated Batches

- ТЗНК: ${expectedPublicAfterMerge.tznk}
- Англійська мова: ${expectedPublicAfterMerge.english}
- Управління та адміністрування: ${expectedPublicAfterMerge.management}
- Психологія та соціологія: ${expectedPublicAfterMerge["psychology-sociology"]}

## Topic Distribution

ТЗНК:
${linesFromCounts(countBy(questionsBySubject.tznk, (question) => question.topic))}

English:
${linesFromCounts(countBy(questionsBySubject.english, (question) => question.topic))}

Management:
${linesFromCounts(countBy(questionsBySubject.management, (question) => question.topic))}

Psychology and sociology:
${linesFromCounts(countBy(questionsBySubject["psychology-sociology"], (question) => question.topic))}

## Difficulty Distribution

ТЗНК:
${linesFromCounts(countBy(questionsBySubject.tznk, (question) => question.difficulty))}

English:
${linesFromCounts(countBy(questionsBySubject.english, (question) => question.difficulty))}

Management:
${linesFromCounts(countBy(questionsBySubject.management, (question) => question.difficulty))}

Psychology and sociology:
${linesFromCounts(countBy(questionsBySubject["psychology-sociology"], (question) => question.difficulty))}

## Known Limitations

- Batch 3 is original generated training content, not official exam material.
- All questions are marked \`reviewed=false\` and need strict review before merge.
- Large ЄФВВ sections use concept-driven templates with varied scenarios, so human review should pay extra attention to distractor plausibility and terminology.

## Recommendation

Run a dedicated batch 3 review before merging. Merge only reviewed questions that pass answer, ambiguity, duplicate, and subject terminology checks.

## Verification

- Validation: pending \`npm run validate:questions\`
- Build: pending \`npm run build\`
`;
}

async function main(): Promise<void> {
  const configs: SubjectConfig[] = [
    {
      subject: "tznk",
      idPrefix: "tznk-generated-b3",
      outputFile: "data/generated/tznk.generated-batch-3.json",
      subjectTag: "generated_tznk",
      count: 50,
      seeds: tznkSeeds
    },
    {
      subject: "english",
      idPrefix: "english-generated-b3",
      outputFile: "data/generated/english.generated-batch-3.json",
      subjectTag: "generated_english",
      count: 100,
      seeds: [...englishPassages, ...englishSingles]
    },
    {
      subject: "management",
      idPrefix: "management-generated-b3",
      outputFile: "data/generated/management.generated-batch-3.json",
      subjectTag: "generated_management",
      count: 250,
      concepts: managementConcepts,
      topicTargets: {
        "Теорія менеджменту": 18,
        "Функції менеджменту": 17,
        "Стратегія та організаційні структури": 30,
        "Лідерство, мотивація і комунікація": 35,
        "HR та організаційна поведінка": 25,
        "Маркетинг і клієнтська орієнтація": 25,
        "Фінанси, облік та економіка": 25,
        "Проєкти, операції, інновації і ризики": 40,
        "Публічне адміністрування і підприємництво": 20,
        "Культура, зміни та результативність": 15
      }
    },
    {
      subject: "psychology-sociology",
      idPrefix: "psych-soc-generated-b3",
      outputFile: "data/generated/psychology-sociology.generated-batch-3.json",
      subjectTag: "generated_psychology_sociology",
      count: 250,
      concepts: psychologySociologyConcepts,
      topicTargets: {
        "Загальна психологія і когнітивні процеси": 30,
        "Особистість, мотивація та емоції": 30,
        "Вікова та соціальна психологія": 30,
        "Методи, діагностика і консультування": 35,
        "Соціологічна теорія і поняття": 35,
        "Інститути, стратифікація і мобільність": 35,
        "Культура, соціалізація, девіація і сучасні процеси": 30,
        "Демографія, урбанізація та соціальні інститути": 25
      }
    }
  ];

  const outputFiles = configs.map((config) => config.outputFile);
  const questionsBySubject = Object.fromEntries(
    configs.map((config) => [config.subject, buildQuestions(config)])
  ) as Record<SubjectId, Question[]>;
  const allQuestions = Object.values(questionsBySubject).flat();
  const comparisonQuestions = await loadComparisonQuestions(outputFiles);

  assertNoDuplicates(allQuestions, comparisonQuestions);

  await fs.mkdir(path.join(projectRoot, "data", "generated"), { recursive: true });

  for (const config of configs) {
    await fs.writeFile(
      path.join(projectRoot, config.outputFile),
      `${JSON.stringify(questionsBySubject[config.subject], null, 2)}\n`,
      "utf8"
    );
  }

  await fs.writeFile(
    path.join(projectRoot, "data", "generated", "generated-batch-3-report.md"),
    buildReport(allQuestions, questionsBySubject),
    "utf8"
  );

  console.log(`Generated batch 3 questions: ${allQuestions.length}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
