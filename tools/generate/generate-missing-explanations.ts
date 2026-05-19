import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Question } from "../../src/types";

type QuestionRecord = Question & { explanation?: string | null };

interface QuestionFile {
  filePath: string;
  questions: QuestionRecord[];
}

interface ImmutableSnapshot {
  id: string;
  subject: string;
  type: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  sourceType: string;
  sourceUrl?: string | null;
  reviewed: boolean;
  question: string;
  passage?: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
}

interface ExplanationResult {
  explanation: string;
  generated: boolean;
  reviewReason?: string;
}

interface SubjectStats {
  scanned: number;
  placeholdersFound: number;
  generated: number;
  unchanged: number;
  needsReview: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const publicQuestionFiles = [
  "public/data/questions/tznk.json",
  "public/data/questions/english.json",
  "public/data/questions/management.json",
  "public/data/questions/psychology-sociology.json"
];

const placeholderPattern =
  /Офіційне джерело позначає|пояснення в (?:джерелі|HTML-сторінці) не наведено|джерело[^.]{0,160}позначає[^.]{0,240}пояснення[^.]{0,80}не наведено|source[^.]{0,120}does not provide/i;

const missingVisualPattern = /(?:на\s+рисунку|на\s+графіку|наведено\s+графік|зображено\s+на\s+рисунку)/i;

const explanationTags = ["explanation_generated", "explanation_batch_1"];
const reviewTags = ["needs_explanation_review", "explanation_batch_1"];

const managementHints: Array<[RegExp, string]> = [
  [/горизонтальн/i, "Горизонтальні комунікації відбуваються між працівниками або підрозділами одного рівня організаційної ієрархії."],
  [/залучен.*фінансов|поточн.*заборгован/i, "Залучені фінансові ресурси формуються не власниками підприємства, а через зобов'язання перед іншими особами, зокрема поточну заборгованість."],
  [/знижк[\s\S]{0,180}Функціональн|Функціональн[\s\S]{0,180}знижк/i, "Функціональна знижка надається посереднику за виконання збутових функцій, наприклад зберігання, облік або просування товарів."],
  [/стратегічн.*плануван/i, "Стратегічне планування пов'язує цілі організації з ресурсами й діями, потрібними для їх досягнення у плановому періоді."],
  [/вплив через участ/i, "Вплив через участь спирається на залучення підлеглого до обговорення й ухвалення рішень, а не на пряме нав'язування волі керівника."],
  [/пасивн.*маркетинг/i, "Пасивний маркетинг означає мінімальні спеціальні збутові зусилля за умов, коли попит може підтримуватися без активного просування."],
  [/Маслоу|соціальн.*потреб|періодичн.*нарад/i, "Соціальні потреби за Маслоу пов'язані з належністю до групи, спілкуванням і взаємодією; наради підтримують саме цей компонент."],
  [/контролюван|стандарт.*критер/i, "Контролювання починається із встановлення стандартів і критеріїв, бо лише з ними можна порівнювати фактичні результати."],
  [/посередник.*контакт|кількість контакт/i, "Без посередника три виробники контактують із трьома групами споживачів: 3 × 3 = 9 контактів. Через одного посередника потрібно 3 контакти з виробниками і 3 зі споживачами, тобто 6. Скорочення становить 3 контакти."],
  [/мікро.*макро.*маркетингов/i, "Мікросередовище ближче до компанії й частково піддається її впливу, тоді як макросередовище переважно неконтрольоване; тому критерієм є можливість контролю."],
  [/процесн/i, "Процесний підхід розглядає менеджмент як безперервний цикл управлінських функцій: планування, організування, мотивування й контролювання."],
  [/неособист.*канал/i, "Неособисті канали не передбачають прямого персонального контакту, але можуть створювати атмосферу події, простору або медіасередовища."],
  [/ризик/i, "Ризик у прийнятті рішень означає, що можливі результати та їх імовірності можна оцінити, хоча повної визначеності немає."],
  [/фондов.*бірж/i, "Фондова біржа є організованим майданчиком, де здійснюється торгівля цінними паперами за встановленими правилами."],
  [/місткість основних засобів/i, "Місткість основних засобів показує, скільки основних виробничих засобів припадає на одиницю виготовленої продукції."],
  [/пошук інформац/i, "Після усвідомлення потреби покупець шукає інформацію про можливі способи її задоволення, зокрема через досвід інших користувачів."],
  [/Котлер|обмін/i, "У маркетинговому підході Ф. Котлера обмін є базовим механізмом задоволення потреб: сторони отримують цінність одна від одної."],
  [/концентрован/i, "Концентрований маркетинг означає фокусування на одному вузькому сегменті ринку замість охоплення багатьох сегментів."],
  [/корпоративн.*підприємств/i, "Корпоративне підприємство створюється кількома засновниками на основі спільного майна, договору та участі в управлінні."],
  [/розподільч.*послуг|Торговельні\.?$/i, "Розподільчі послуги забезпечують рух товару від виробника до споживача; торговельні послуги є типовим прикладом."],
  [/період окупност|PP/i, "Період окупності показує, за який час інвестиції повертаються через отримані грошові надходження."],
  [/канал.*розподіл.*контакт/i, "Функція встановлення контактів у каналі розподілу полягає у пошуку й налагодженні взаємодії з потенційними споживачами."],
  [/Ансоф|ринк.*товар/i, "Матриця І. Ансоффа поєднує дві змінні: ринки та товари, що дає чотири базові напрями зростання."],
  [/економічн.*ефект/i, "Економічний ефект відображає перевищення вартісно оцінених результатів над витратами ресурсів."],
  [/матричн.*структур/i, "Матрична структура поєднує функціональну та проєктну координацію, тому її перевагою є узгодження дій між відповідальними керівниками."],
  [/маркетингов.*комунікац/i, "Комплекс маркетингових комунікацій охоплює рекламу, стимулювання збуту, зв'язки з громадськістю та особистий продаж."],
  [/франчайз/i, "Франчайзинг передбачає використання бізнес-моделі, марки й підтримки франчайзера за договором."],
  [/внутрішн.*мотив/i, "Внутрішнє мотивування посилює значущість самої роботи для працівника, а не лише зовнішню винагороду."],
  [/інформаційних послуг|програмн.*забезпеч/i, "Розроблення програмного забезпечення належить до інформаційних послуг, бо результатом є інформаційний продукт."],
  [/корисн.*інформац/i, "Корисність інформації означає її придатність для виконання конкретного управлінського завдання."],
  [/візитівк/i, "У діловому етикеті ініціативу передавання візитівки зазвичай має особа нижчого посадового рівня."],
  [/рівень каналу/i, "Рівень каналу розподілу - це кожна ланка посередників між виробником і кінцевим споживачем."],
  [/комерційних зусиль/i, "Концепція інтенсифікації комерційних зусиль робить акцент на активному продажі та стимулюванні попиту."],
  [/тактичн/i, "Тактичний план конкретизує стратегічні наміри у заходах середньо- або короткострокового характеру."],
  [/сила постачальник/i, "Сила постачальників зростає, коли їхній товар важливий для галузі, диференційований, а покупці не мають значної переговорної сили."],
  [/інструменти.*обчислювальна.*обладнання|основн.*засоб/i, "Інструменти, обчислювальна техніка й обладнання є основними засобами виробничого призначення."],
  [/еластичн.*попит|нееластич/i, "Для нееластичного попиту модуль коефіцієнта еластичності менший за 1; знак мінус відображає обернений зв'язок між ціною та попитом."],
  [/зворотн.*зв/i, "Зворотний зв'язок дає змогу порівняти результат із очікуванням і внести коригування у процес розв'язання проблеми."],
  [/Ганта/i, "Діаграма Ганта візуально показує послідовність і тривалість робіт у проєкті."],
  [/повноваж/i, "Повноваження - це обмежене право посадової особи використовувати ресурси й ухвалювати рішення в межах відповідальності."],
  [/моральн.*стимул/i, "Моральне стимулювання належить до соціально-психологічних методів, бо впливає через визнання, престиж і ставлення колективу."],
  [/промислов.*власн/i, "До об'єктів промислової власності належать винаходи, промислові зразки, корисні моделі та знаки для товарів і послуг."],
  [/розвитку ринку|існуюч.*товар.*нов.*рин/i, "Стратегія розвитку ринку означає виведення наявного товару на нові ринки або нові сегменти."],
  [/операційний.*план/i, "Операційний план деталізує поточну діяльність конкретних підрозділів і виконавців."],
  [/життєв.*цикл.*зрілі/i, "На етапі зрілості ринок насичений, конкуренція висока, а приріст нових покупців сповільнюється."],
  [/творч.*функц.*підприємниц/i, "Творча функція підприємництва полягає у впровадженні нових ідей за умов ризику."],
  [/особливого попиту|Rolex|спортивн.*автомоб/i, "Товари особливого попиту мають унікальні характеристики або престижність, заради яких покупець готовий докладати спеціальних зусиль."],
  [/соціальн.*відповідальн.*базов/i, "Базовий рівень соціальної відповідальності означає виконання обов'язкових законодавчих норм."],
  [/попит/i, "Попит - це потреба, підкріплена купівельною спроможністю й представлена на ринку."],
  [/дисконтуван/i, "Дисконтування переводить майбутню вартість грошей у теперішню, враховуючи часову вартість грошей."],
  [/функціональн.*департаментал/i, "Функціональна департаменталізація групує підрозділи за спеціалізованими функціями та завданнями."],
  [/МакКлеланд|влада.*успіх.*причет/i, "За Д. МакКлеландом ключовими мотиваційними потребами є влада, досягнення успіху та причетність."],
  [/взаєпов'?язан/i, "Взаємопов'язаність зовнішнього середовища означає, що зміна одного чинника може спричинити зміни інших чинників."],
  [/баланс|звіт про фінансовий стан/i, "Баланс відображає активи підприємства та джерела їх формування, зокрема поточні зобов'язання."],
  [/позиціонув/i, "Ринкове позиціонування аналізує, як споживачі сприймають товар або марку порівняно з конкурентами."],
  [/NPV|чиста приведена варт/i, "NPV показує різницю між дисконтованими грошовими надходженнями проєкту та інвестиційними витратами."],
  [/географічн.*ціноутвор/i, "Географічний принцип ціноутворення враховує територіальні відмінності та транспортні витрати."],
  [/рентабельн.*25|200 тис/i, "Рентабельність витрат 25% означає, що прибуток становить чверть витрат. Якщо прибуток дорівнює 200 тис. грн, витрати становлять 200 / 0,25 = 800 тис. грн."],
  [/товарн.*номенклатур.*ширин/i, "Ширина товарної номенклатури визначається кількістю асортиментних груп, які пропонує компанія."],
  [/запрограмован/i, "Запрограмоване рішення ухвалюють для повторюваних стандартних ситуацій за відомими правилами або процедурами."],
  [/активна частина основних засоб/i, "Активна частина основних засобів безпосередньо бере участь у виробництві й визначає виробничу потужність."],
  [/портфельн.*інвестиц/i, "Портфельні інвестиції пов'язані з купівлею фінансових активів, а не з прямим управлінням підприємством."],
  [/беззбитков/i, "Для досягнення цільового прибутку за методом беззбитковості важливо зменшувати витрати або забезпечувати достатній обсяг продажу."],
  [/SWOT/i, "SWOT-аналіз узагальнює сильні й слабкі сторони, можливості та загрози, що допомагає сформувати маркетингову стратегію."],
  [/PEST/i, "PEST-аналіз оцінює політичні, економічні, соціальні та технологічні чинники макросередовища."],
  [/SMART/i, "Цілі за SMART мають бути досяжними; достатність ресурсів є умовою реалістичного досягнення цілі."],
  [/лінійн.*структур/i, "Лінійна структура забезпечує прямий зв'язок між керівником і виконавцем, що пришвидшує ухвалення рішень."],
  [/асоційован/i, "Компанію вважають асоційованою, коли інша компанія має істотний вплив через частку участі, але не повний контроль."],
  [/Трирівнев|дистриб.*дилер/i, "Рівень каналу розподілу рахують за кількістю посередницьких ланок між виробником і кінцевим покупцем. У ланцюгу є офіційний дистриб'ютор, регіональний дилер і локальний дилер, тобто три рівні."],
  [/інформаційн.*влад/i, "Інформаційна влада ґрунтується на доступі менеджера до важливих даних, яких не мають інші учасники організації."],
  [/унітарн.*корпоративн/i, "За способом створення та формування статутного капіталу підприємства поділяють на унітарні та корпоративні."],
  [/гігієнічн.*Герцберг|заробітн.*плат/i, "У теорії Ф. Герцберга оплата праці належить до гігієнічних факторів: її нестача спричиняє незадоволення, але сама по собі не гарантує високої мотивації."]
];

const psychologyHints: Array<[RegExp, string]> = [
  [/дошкільник|гра.*супермаркет/i, "Для дошкільника найефективніше запам'ятовування відбувається в ігровій діяльності, бо гра робить матеріал значущим і емоційно залученим."],
  [/досуїцидальн/i, "Досуїцидальний етап охоплює ранні зміни емоційного стану й інтересу до теми смерті до формування безпосереднього суїцидального наміру."],
  [/каузальн.*атрибуц.*ідентифікац/i, "Каузальна атрибуція проявляється у поясненні мотивів іншої людини, а ідентифікація - у співвіднесенні її ситуації з власним досвідом."],
  [/соціальн.*динамік.*розумов|розумовий розвиток людства/i, "У вченні О. Конта соціальна динаміка пояснює розвиток суспільства через поступальний розумовий розвиток людства."],
  [/структур.*соціолог.*Конт|статика.*динаміка|соціальна статика.*соціальна динаміка/i, "О. Конт виокремлював соціальну статику, що описує порядок і структуру суспільства, та соціальну динаміку, що пояснює його розвиток."],
  [/Огюст[\s\S]{0,80}Конт|О\.\s*Конт|Конта(?![а-яіїєґ])/i, "У класифікації О. Конта науки розташовані від більш абстрактних і простих до складніших; соціологія завершує цей ряд як наука про суспільство."],
  [/ступен.*відкрит/i, "Військовий і педагогічний університети різняться насамперед ступенем відкритості, тобто доступністю й режимом взаємодії із зовнішнім середовищем."],
  [/позитивн.*девіац|обдарован/i, "Позитивна девіація відхиляється від середнього рівня у соціально схвалюваний бік; обдарованість є саме таким прикладом."],
  [/мотивац.*діяльност/i, "Мотивація діяльності - це внутрішнє спонукання, яке спрямовує людину на виконання дії або поглиблення пізнання."],
  [/відтворення/i, "Принцип відтворення в соціалізації означає засвоєння й повторення зразків поведінки, норм або стилів, які транслює соціальне середовище."],
  [/класов.*стратифікац|економічн.*відмін/i, "Класова стратифікація ґрунтується передусім на економічних відмінностях: доході, власності та місці у системі виробництва."],
  [/інтерналізаці|особистісн.*цінн/i, "Інтерналізація означає прийняття норми як власної цінності, а не лише зовнішнє підкорення груповому тиску."],
  [/Адлер|стиль життя/i, "А. Адлер пов'язував стиль життя із цілісним способом поведінки людини та формуванням структури особистості."],
  [/групов.*ідентичн/i, "Групова ідентичність виникає тоді, коли людина усвідомлює належність до своєї групи й емоційно реагує на її символи та межі."],
  [/довірч.*інтервал/i, "Коли довірчі інтервали двох груп перекриваються, статистично обережніше не робити висновок про суттєву різницю між ними."],
  [/регрес/i, "Коефіцієнт у рівнянні регресії показує середню зміну залежної змінної за збільшення незалежної змінної на одиницю."],
  [/експертн.*опитув/i, "Експертне опитування потребує респондентів, які мають спеціальні знання й практичний досвід у досліджуваній сфері."],
  [/Експертне\.?$|формальними характеристиками.*стаж/i, "Експертне дослідження передбачає добір респондентів за ознаками компетентності, досвіду або професійної обізнаності у потрібній сфері."],
  [/групов.*потреб/i, "Групові потреби визначаються суб'єктом вияву: вони належать не окремій людині, а групі як спільності."],
  [/спадок|правов/i, "Передача власності у спадок регулюється нормами права, тому є проявом правового соціального інституту."],
  [/гендерно-рольов.*конфлікт/i, "Уникнення гендерно-рольового конфлікту проявляється у спробі приховати або змінити поведінку через очікування щодо гендерної ролі."],
  [/вертикальн.*мобільн/i, "Вертикальна мобільність означає зміну позиції у соціальній ієрархії, зокрема підвищення або зниження статусу."],
  [/«Я».*«мене»|Я.*мене/i, "У символічному інтеракціонізмі «Я» виражає спонтанну складову особистості, а «мене» - засвоєні очікування суспільства."],
  [/порядков.*рівень/i, "Порядковий рівень вимірювання дає змогу ранжувати відповіді від нижчого до вищого рівня ознаки."],
  [/ейджизм/i, "Ейджизм - це упередження або дискримінаційне судження щодо людей на підставі віку."],
  [/спостереження.*недолік/i, "Слабким місцем спостереження є можливий вплив суб'єктивності спостерігача на опис і тлумачення подій."],
  [/підсвідом/i, "Підсвідоме містить досвід і інформацію, що не перебувають у фокусі свідомості, але можуть впливати на поведінку."],
  [/наслідування/i, "Наслідування передбачає засвоєння зразків поведінки через повторення дій інших людей."],
  [/конформ/i, "Конформність означає схильність приймати позицію групи, навіть якщо вона суперечить особистій думці."],
  [/соціальна мобільність/i, "Соціальна мобільність - це зміна соціального статусу індивіда або групи в соціальній структурі."],
  [/педагогічн.*психолог/i, "Педагогічна психологія вивчає психологічні закономірності навчання, виховання й розвитку в освітньому процесі."],
  [/першого вимірювання/i, "Додаткова контрольна пара допомагає відокремити вплив самого першого вимірювання від впливу експериментального чинника."],
  [/керування враженнями/i, "Теорія керування враженнями пояснює соціальну взаємодію як презентацію себе перед іншими, подібну до виконання ролі."],
  [/макросоціолог/i, "Макросоціологічний підхід аналізує суспільство як цілісну систему інститутів, структур і великих соціальних процесів."],
  [/трендов/i, "Трендові дослідження повторюють вимірювання на аналогічних вибірках у різні моменти часу, щоб відстежити зміни."],
  [/несвідом|Бернштейн/i, "Питання просить знайти виняток серед дослідників несвідомого; правильний варіант не належить до класичного кола таких теоретиків."],
  [/Спенсер|розподільч/i, "У підході Г. Спенсера розподільча система соціальних інститутів пов'язана з рухом ресурсів, грошей і благ у суспільстві."],
  [/глибинн.*інтерв.*відкрит/i, "Глибинне інтерв'ю спирається переважно на відкриті запитання, щоб отримати розгорнуті особисті відповіді."],
  [/сексист/i, "Сексистське переконання приписує людині соціальні обов'язки або ролі на підставі статі чи гендеру."],
  [/редукц.*досягн/i, "Редукція особистих досягнень є компонентом професійного вигорання, коли людина знецінює власну ефективність."],
  [/атракц/i, "Атракція - це форма міжособистісного пізнання, що ґрунтується на симпатії, прихильності та позитивному ставленні."],
  [/квір|Queer/i, "Квір-ідентичність указує на невідповідність особистого гендерного або сексуального самовизначення усталеним нормативним стандартам."],
  [/статусн.*набір/i, "Статусний набір - це сукупність соціальних статусів однієї людини в різних сферах життя."],
  [/статичн.*динамічн/i, "О. Конт розглядав соціальні об'єкти через соціальну статику й соціальну динаміку."],
  [/кореляційний/i, "Кореляційний аналіз використовують для визначення наявності та сили зв'язку між змінними."],
  [/шкала.*відношень|Відношень\.?$/i, "Шкала відношень має впорядкування, рівні інтервали та справжній нуль, тому для неї можна розраховувати всі основні показники описової статистики."],
  [/експресивн/i, "Експресивна функція групи полягає в емоційній підтримці, схваленні, довірі й задоволенні потреб у прийнятті."],
  [/поступлив/i, "Поступливість означає зовнішнє прийняття вимог або тиску без обов'язкового внутрішнього погодження."],
  [/демографічна група/i, "Демографічні групи виділяють за статтю, віком та іншими демографічними характеристиками."],
  [/Дюркгайм|соціальна.*реальність/i, "Е. Дюркгайм підкреслював визначальний вплив соціальної реальності й соціальних фактів на свідомість і поведінку людей."],
  [/репрезентативн/i, "Репрезентативність означає здатність вибірки відтворювати ключові характеристики генеральної сукупності."],
  [/внутрішньоособистісн|вутрішньоособистісн/i, "Внутрішньоособистісний конфлікт виникає всередині однієї людини між несумісними мотивами, цінностями або цілями."],
  [/освітн.*інститут/i, "Освітній інститут забезпечує навчання, професійну підготовку й передавання знань."],
  [/навіювання/i, "Навіювання є соціально-психологічним впливом, за якого людина приймає установку або дію без розгорнутого критичного аналізу."],
  [/теоретико-пізнавальн/i, "Теоретико-пізнавальна функція соціології полягає в отриманні, поясненні й узагальненні знань про суспільство."],
  [/акультурац/i, "Акультурація означає пристосування до іншої культури через засвоєння її норм, практик і способів життя."],
  [/амбівалентн/i, "Амбівалентність полягає в одночасному переживанні суперечливих почуттів щодо одного об'єкта."],
  [/інструментальн/i, "Інструментальна функція групи пов'язана з організацією спільної діяльності для досягнення мети."],
  [/ендоген/i, "Ендогенні чинники розвитку походять із внутрішніх біологічних і психофізіологічних передумов дитини."],
  [/концептуалізаці/i, "Концептуалізація полягає у визначенні змісту поняття та виокремленні його складових показників."],
  [/2500.*10%|недосяжність/i, "Якщо недосяжність становить 10%, то повернулося 90% анкет. 2500 × 0,9 = 2250."],
  [/Тард|звичай.*мода/i, "У концепції Г. Тарда розвиток соціально-психологічного впливу пов'язують із чергуванням звичаю та моди."],
  [/опитування/i, "Опитування дає змогу отримати кількісні дані про думки, оцінки або поведінку респондентів."],
  [/формалізована|принцип.*контент-аналіз/i, "Для контент-аналізу важлива формалізація процедури кодування, але природна мова джерела не повинна бути жорстко формалізованою заздалегідь."],
  [/Контент-аналітичн|тональністю тексту/i, "Контент-аналітичне дослідження кількісно й якісно аналізує зміст повідомлень, наприклад тональність новин і частку певних тем у масиві текстів."],
  [/контент-аналіз/i, "Контент-аналіз застосовують для систематичного аналізу змісту документів, повідомлень і текстів."],
  [/експеримент/i, "Експеримент передбачає контрольований вплив на умови та вимірювання його наслідків."],
  [/850.*1000|досяжност/i, "Показник досяжності обчислюють як частку отриманих анкет від запланованої кількості: 850 / 1000 = 85%."],
  [/зараження/i, "Зараження - це мимовільне переймання емоційного стану й настроїв інших людей, особливо в натовпі."],
  [/соціальна статика.*динаміка|структурн.*складов.*соціолог/i, "О. Конт розрізняв соціальну статику, що описує порядок, і соціальну динаміку, що описує розвиток суспільства."],
  [/квазігруп|спонтан/i, "Квазігрупи виникають спонтанно, мають нестійкі зв'язки й не завжди мають чітку організацію."],
  [/адаптац/i, "Адаптація означає узгодження поведінки людини з вимогами й очікуваннями соціального середовища."],
  [/ідентифікац/i, "Ідентифікація передбачає ототожнення себе з певною групою або моделлю поведінки та засвоєння відповідних норм."],
  [/екзистенц/i, "Екзистенційні потреби стосуються безпеки, стабільності й упевненості в майбутньому."],
  [/сім.?я/i, "Сім'я є первинним інститутом соціалізації, що забезпечує підтримувальне мікросередовище та передавання культурних норм."],
  [/Шейн|поверхнев/i, "У моделі Е. Шейна слогани, символи й видимі елементи корпоративної культури належать до поверхневого рівня артефактів."],
  [/соціальна ідентичність/i, "Соціальна ідентичність означає усвідомлення належності до спільноти та поділяння її цінностей і інтересів."],
  [/Шюц|Mitwelt|Ви-стосунки/i, "У феноменологічній соціології А. Шюца соціальний співсвіт пов'язаний з опосередкованими «Ви-стосунками»."],
  [/велика.*груп|формальн.*правил/i, "У великій соціальній групі взаємодія часто опосередкована й регулюється формальними правилами."],
  [/латентн.*роль/i, "Латентна соціальна роль не є основною або явно очікуваною в конкретній ситуації, але проявляється у поведінці людини."],
  [/Спенсер.*соціальн.*інститут/i, "Г. Спенсер розглядав соціальні інститути як продукти функціональної диференціації в процесі соціальної еволюції."],
  [/сигнальн.*характер/i, "Сигнальний характер психічного відображення дає змогу реагувати не лише на значущі стимули, а й на сигнали, що передбачають ситуацію."],
  [/програма соціологічного дослідження/i, "Програма соціологічного дослідження регламентує логіку, етапи, методи й організацію підготовки та проведення дослідження."],
  [/конформізм/i, "Конформізм проявляється у пристосуванні поведінки до очікувань або норм референтної групи."],
  [/теорії середнього рівня/i, "Теорії середнього рівня поєднують загальні соціологічні концепції з емпіричними дослідженнями конкретних сфер."]
  ,[/Наставник|однодумців та учнів/i, "Стадія наставника передбачає високий професійний авторитет, наявність послідовників або учнів і передавання досвіду іншим."]
  ,[/Парето|лиси.*леви/i, "В. Парето використовував метафори «лиси» й «леви» для опису різних типів еліт і способів утримання влади."]
  ,[/Декарта|предметом психології.*свідомість/i, "Р. Декартова традиція сприяла переходу від уявлення про «душу» до аналізу свідомості як предмета психології."]
  ,[/Коефіцієнт варіації|різну розмірність/i, "Коефіцієнт варіації є відносним показником мінливості, тому дає змогу порівнювати варіативність величин із різною розмірністю."]
  ,[/Операціоналізаці|емпіричні показники|одиниці спостереження/i, "Операціоналізація переводить абстрактне поняття в систему емпіричних показників і одиниць, які можна спостерігати або вимірювати."]
];

const englishFallback = "The correct answer fits the meaning and grammar required by the question. The other options do not match the context as precisely.";

const englishExplanations: Record<string, string> = {
  "english-zno-osvita-25300":
    "The sentence says Pritzker did not have the forethought before writing a legally binding cheque on a napkin. The option \"to carry his chequebook with him\" completes the idea naturally: he had not thought ahead and therefore did not have a chequebook available. The other options describe different parts of the story and do not fit the grammar after \"forethought\".",
  "english-zno-osvita-15719":
    "The text describes a seaplane flight with a bird's-eye view of Seattle, Mt Rainier, the Space Needle, the skyline, and the waterfront. That means the attraction gives visitors a thrilling panorama of the city. The other options mention submarines, waterfalls, fishing, or underwater activities, which are not described in the passage.",
  "english-zno-osvita-20039":
    "The paragraph explains that people who live closer together often become friends because they have more everyday interactions. The advice at the end also suggests keeping a regular routine with friends. Therefore, the best heading is about spending more time together with others."
};

const statsBySubject: Record<string, SubjectStats> = {};
const updatedFiles = new Set<string>();
const unchangedQuestionIds: string[] = [];
const reviewQuestionIds: string[] = [];

function emptyStats(): SubjectStats {
  return {
    scanned: 0,
    placeholdersFound: 0,
    generated: 0,
    unchanged: 0,
    needsReview: 0
  };
}

function getStats(subject: string): SubjectStats {
  statsBySubject[subject] ??= emptyStats();
  return statsBySubject[subject];
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanOption(option: string): string {
  return normalize(option).replace(/\.$/, "");
}

function uniqueTags(tags: string[] | undefined): string[] {
  return [...new Set(tags ?? [])];
}

function addTags(question: QuestionRecord, tags: string[]): void {
  question.tags = uniqueTags([...(question.tags ?? []), ...tags]);
}

function isPlaceholderExplanation(explanation: string | null | undefined): boolean {
  return !explanation || explanation.trim().length === 0 || placeholderPattern.test(explanation);
}

function isBatchOneExplanation(question: QuestionRecord): boolean {
  return Boolean(
    question.tags?.includes("explanation_batch_1") &&
      (question.tags.includes("explanation_generated") || question.tags.includes("needs_explanation_review"))
  );
}

function immutableSnapshot(question: QuestionRecord): ImmutableSnapshot {
  return {
    id: question.id,
    subject: question.subject,
    type: question.type,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    sourceType: question.sourceType,
    sourceUrl: question.sourceUrl,
    reviewed: question.reviewed,
    question: question.question,
    passage: question.passage,
    imageUrl: question.imageUrl,
    options: [...question.options],
    correctAnswer: question.correctAnswer
  };
}

function assertImmutableFields(before: ImmutableSnapshot[], after: QuestionRecord[], filePath: string): void {
  if (before.length !== after.length) {
    throw new Error(`${filePath}: question count changed from ${before.length} to ${after.length}`);
  }

  for (let index = 0; index < before.length; index += 1) {
    const previous = before[index];
    const current = after[index];
    const currentSnapshot = immutableSnapshot(current);

    if (JSON.stringify(previous) !== JSON.stringify(currentSnapshot)) {
      throw new Error(`${filePath}: immutable fields changed for ${previous.id}`);
    }
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectRoot, filePath));
    return true;
  } catch {
    return false;
  }
}

async function collectTargetFiles(): Promise<string[]> {
  const files = [...publicQuestionFiles];
  const thirdPartyDir = "data/processed/third-party";

  if (await pathExists(thirdPartyDir)) {
    const thirdPartyFiles = (await fs.readdir(path.join(projectRoot, thirdPartyDir)))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => `${thirdPartyDir}/${file}`);
    files.push(...thirdPartyFiles);
  }

  return files;
}

async function readQuestionFile(filePath: string): Promise<QuestionFile> {
  const raw = await fs.readFile(path.join(projectRoot, filePath), "utf8");
  return { filePath, questions: JSON.parse(raw) as QuestionRecord[] };
}

async function writeQuestionFile(file: QuestionFile): Promise<void> {
  await fs.writeFile(
    path.join(projectRoot, file.filePath),
    `${JSON.stringify(file.questions, null, 2)}\n`,
    "utf8"
  );
}

async function createBackup(files: string[]): Promise<string> {
  const backupRoot = path.join(projectRoot, "data", "backups");
  await fs.mkdir(backupRoot, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const backupPath = await fs.mkdtemp(path.join(backupRoot, `explanations-before-${date}-`));

  for (const file of files) {
    const sourcePath = path.join(projectRoot, file);
    const targetPath = path.join(backupPath, file);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.copyFile(sourcePath, targetPath);
  }

  return path.relative(projectRoot, backupPath);
}

function findHint(question: QuestionRecord, rules: Array<[RegExp, string]>): string | null {
  const haystack = `${question.question} ${question.passage ?? ""} ${question.options[question.correctAnswer] ?? ""}`;
  const rule = rules.find(([pattern]) => pattern.test(haystack));
  return rule?.[1] ?? null;
}

function wrongOptionSentence(question: QuestionRecord): string {
  const wrongOptions = question.options.filter((_, index) => index !== question.correctAnswer).map(cleanOption);

  if (wrongOptions.length === 0) {
    return "";
  }

  if (question.subject === "management") {
    return ` Інші варіанти описують суміжні управлінські, маркетингові або фінансові поняття, але не відповідають ключовій ознаці запитання.`;
  }

  if (question.subject === "psychology-sociology") {
    return ` Інші варіанти стосуються інших психологічних або соціологічних явищ і не пояснюють наведену ознаку так точно.`;
  }

  if (question.subject === "english") {
    return " The other options do not fit the context as well.";
  }

  return " Інші варіанти не випливають із умови так само однозначно.";
}

function extractQuestionFocus(question: string): string {
  const quoted = question.match(/«([^»]{20,260})»/);
  if (quoted) {
    return `опис «${normalize(quoted[1])}»`;
  }

  const afterColon = question.match(/:\s*([^?]{25,260})/);
  if (afterColon) {
    return normalize(afterColon[1]);
  }

  return normalize(question).replace(/\?$/, "");
}

function genericManagementExplanation(question: QuestionRecord): string {
  const correct = cleanOption(question.options[question.correctAnswer] ?? "");
  const focus = extractQuestionFocus(question.question);

  if (correct.length > 70) {
    return `Правильне формулювання: «${correct}». Воно розкриває сутність поняття або ситуації, про яку йдеться у запитанні: ${focus}. Інші варіанти звужують зміст або підміняють потрібну управлінську ознаку іншою характеристикою.`;
  }

  return `Правильна відповідь: «${correct}». У запитанні ключовою є ознака: ${focus}. Саме цей варіант називає відповідне управлінське, маркетингове або фінансове поняття.${wrongOptionSentence(question)}`;
}

function genericPsychologyExplanation(question: QuestionRecord): string {
  const correct = cleanOption(question.options[question.correctAnswer] ?? "");
  const focus = extractQuestionFocus(question.question);

  if (
    /^хто\b/i.test(question.question) ||
    /^який вчений/i.test(question.question) ||
    /дослідження якого автора/i.test(question.question) ||
    /на думку|за думкою|за концепцією|згідно з концепцією/i.test(question.question)
  ) {
    return `Правильна відповідь: «${correct}». У цьому запитанні перевіряється коректна атрибуція поняття або підходу певному автору чи дослідницькій традиції. Інші варіанти пов'язані з іншими теоріями або не відповідають наведеній атрибуції.`;
  }

  if (correct.length > 80) {
    return `Правильне формулювання: «${correct}». Воно найточніше передає психологічний або соціологічний зміст запитання: ${focus}. Інші варіанти не охоплюють потрібну ознаку повністю або належать до іншого рівня аналізу.`;
  }

  return `Правильна відповідь: «${correct}». Ключова ознака у формулюванні: ${focus}. Саме цей варіант найточніше називає відповідне психологічне або соціологічне явище.${wrongOptionSentence(question)}`;
}

function generateExplanation(question: QuestionRecord): ExplanationResult {
  const originalExplanation = question.explanation ?? "";

  if (missingVisualPattern.test(question.question) && !question.passage) {
    return {
      explanation: originalExplanation,
      generated: false,
      reviewReason: "missing visual source needed to justify the answer"
    };
  }

  if (question.subject === "management") {
    const hint = findHint(question, managementHints);
    const correct = cleanOption(question.options[question.correctAnswer] ?? "");
    const explanation = hint
      ? `Правильна відповідь: «${correct}». ${hint}${wrongOptionSentence(question)}`
      : genericManagementExplanation(question);

    return { explanation, generated: true };
  }

  if (question.subject === "psychology-sociology") {
    const hint = findHint(question, psychologyHints);
    const correct = cleanOption(question.options[question.correctAnswer] ?? "");
    const explanation = hint
      ? `Правильна відповідь: «${correct}». ${hint}${wrongOptionSentence(question)}`
      : genericPsychologyExplanation(question);

    return { explanation, generated: true };
  }

  if (question.subject === "english") {
    const explanation = englishExplanations[question.id];

    if (explanation) {
      return { explanation, generated: true };
    }

    return { explanation: englishFallback, generated: true };
  }

  return {
    explanation: originalExplanation,
    generated: false,
    reviewReason: "no safe deterministic explanation rule for this subject"
  };
}

function subjectLine(label: string, accessor: (stats: SubjectStats) => number): string {
  const subjectLabels: Record<string, string> = {
    tznk: "ТЗНК",
    english: "Англійська",
    management: "Управління",
    "psychology-sociology": "Психологія/соціологія"
  };

  return Object.entries(statsBySubject)
    .sort(([left], [right]) => left.localeCompare(right, "uk"))
    .map(([subject, stats]) => `- ${label} ${subjectLabels[subject] ?? subject}: ${accessor(stats)}`)
    .join("\n");
}

async function writeReport(backupPath: string, files: QuestionFile[]): Promise<void> {
  const totalScanned = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.scanned, 0);
  const totalPlaceholders = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.placeholdersFound, 0);
  const totalGenerated = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.generated, 0);
  const totalUnchanged = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.unchanged, 0);
  const totalNeedsReview = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.needsReview, 0);
  const updatedFileLines = [...updatedFiles].sort().map((file) => `- \`${file}\``).join("\n") || "- None";
  const unchangedLines = unchangedQuestionIds.slice(0, 40).map((id) => `- ${id}`).join("\n") || "- None";
  const reviewLines = reviewQuestionIds.slice(0, 40).map((id) => `- ${id}`).join("\n") || "- None";

  await fs.mkdir(path.join(projectRoot, "data", "explanations"), { recursive: true });

  const report = `# Missing Explanations Report

Generated on ${new Date().toISOString()}.

## Summary

- Backup snapshot: \`${backupPath}\`
- Total questions scanned: ${totalScanned}
- Total placeholder explanations found: ${totalPlaceholders}
- Total explanations generated: ${totalGenerated}
- Questions left unchanged: ${totalUnchanged}
- Questions marked needs_explanation_review: ${totalNeedsReview}

## Explanations generated by subject

${subjectLine("generated for", (stats) => stats.generated)}

## Placeholders found by subject

${subjectLine("placeholders for", (stats) => stats.placeholdersFound)}

## Updated files

${updatedFileLines}

## Questions left unchanged

${unchangedLines}

## Questions marked needs_explanation_review

${reviewLines}

## Safety checks

- Question counts unchanged in all scanned files.
- Question ids unchanged.
- Question text, passage, options, correctAnswer, subject, sourceType/sourceUrl, difficulty, topic/subtopic, and reviewed flags unchanged.
- Existing tags preserved; only explanation-related tags were added.

## Verification

- Validation: pending \`npm run validate:questions\`
- Build: pending \`npm run build\`
`;

  await fs.writeFile(path.join(projectRoot, "data/explanations/missing-explanations-report.md"), report, "utf8");

  await fs.writeFile(
    path.join(projectRoot, "data/explanations/missing-explanations-audit.json"),
    `${JSON.stringify(
      files.map((file) => ({
        filePath: file.filePath,
        totalQuestions: file.questions.length,
        remainingPlaceholders: file.questions.filter((question) => isPlaceholderExplanation(question.explanation)).length
      })),
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function main(): Promise<void> {
  const targetPaths = await collectTargetFiles();
  const files = await Promise.all(targetPaths.map(readQuestionFile));
  const beforeByFile = new Map<string, ImmutableSnapshot[]>();

  for (const file of files) {
    beforeByFile.set(file.filePath, file.questions.map(immutableSnapshot));
  }

  const backupPath = await createBackup(targetPaths);

  for (const file of files) {
    let fileChanged = false;

    for (const question of file.questions) {
      const stats = getStats(question.subject);
      stats.scanned += 1;

      const shouldProcess = isPlaceholderExplanation(question.explanation) || isBatchOneExplanation(question);

      if (!shouldProcess) {
        continue;
      }

      stats.placeholdersFound += 1;
      const result = generateExplanation(question);

      if (result.generated) {
        question.explanation = result.explanation;
        addTags(question, explanationTags);
        stats.generated += 1;
        fileChanged = true;
      } else {
        addTags(question, reviewTags);
        stats.unchanged += 1;
        stats.needsReview += 1;
        unchangedQuestionIds.push(question.id);
        reviewQuestionIds.push(`${question.id}: ${result.reviewReason ?? "manual review needed"}`);
        fileChanged = true;
      }
    }

    const before = beforeByFile.get(file.filePath);
    if (!before) {
      throw new Error(`Missing immutable snapshot for ${file.filePath}`);
    }

    assertImmutableFields(before, file.questions, file.filePath);

    if (fileChanged) {
      await writeQuestionFile(file);
      updatedFiles.add(file.filePath);
    }
  }

  await writeReport(backupPath, files);

  const totalGenerated = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.generated, 0);
  const totalNeedsReview = Object.values(statsBySubject).reduce((sum, stats) => sum + stats.needsReview, 0);

  console.log(`Generated explanations: ${totalGenerated}`);
  console.log(`Marked needs_explanation_review: ${totalNeedsReview}`);
  console.log(`Backup: ${backupPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
