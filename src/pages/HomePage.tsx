import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="space-y-10">
      <section className="study-card relative overflow-hidden p-8 sm:p-12">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-honey/30 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-moss/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-moss/10 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-moss">
            підготовка до магістратури
          </p>
          <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
            Тренуйся спокійно. Бач прогрес. Закривай прогалини.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/75">
            Легкий статичний тренажер для ТЗНК, англійської, управління та
            психології з соціологією. Усе працює в браузері: питання з JSON,
            прогрес і помилки зберігаються локально.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/subjects"
              className="soft-ring rounded-full bg-ink px-6 py-3 font-black text-paper shadow-soft transition hover:-translate-y-0.5"
            >
              Обрати предмет
            </Link>
            <Link
              to="/progress"
              className="soft-ring rounded-full bg-white/70 px-6 py-3 font-black text-ink transition hover:bg-white"
            >
              Мій прогрес
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Практика",
            text: "Відповідай по одному питанню й одразу бач пояснення."
          },
          {
            title: "Іспит",
            text: "Проходь набір питань без підказок, з таймером за потреби."
          },
          {
            title: "Помилки",
            text: "Повертайся тільки до завдань, які колись дали збій."
          }
        ].map((item) => (
          <article key={item.title} className="study-card p-6">
            <h2 className="font-display text-3xl font-black">{item.title}</h2>
            <p className="mt-3 leading-7 text-ink/70">{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
