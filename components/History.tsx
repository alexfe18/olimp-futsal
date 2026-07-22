const historyItems = [
  {
    year: "2019",
    title: "Перший крок",
    description:
      "У КДЮСШ «Олімп» було відкрито відділення футзалу для дітей та юнаків.",
  },
  {
    year: "2022",
    title: "Створення дорослої команди",
    description:
      "На основі молодих гравців аматорської команди Б.Є.Д.А. було сформовано команду «Олімп».",
  },
  {
    year: "2022",
    title: "Перші офіційні виступи",
    description:
      "Команда успішно розпочала участь у чемпіонаті Миколаївської області, який не було завершено через повномасштабне вторгнення росії в Україну.",
  },
  {
    year: "2024",
    title: "Новий старт",
    description:
      "Проєкт було перезапущено під новою назвою «Олімп Футзал» із чіткою метою розвитку місцевих гравців.",
  },
  {
    year: "2025",
    title: "Перші великі досягнення",
    description:
      "Участь у Кубку України та Другій лізі України, призове місце у Кубку Миколаєва й перемога у турнірі в Кропивницькому.",
  },
];

export default function History() {
  return (
    <section
      id="history"
      className="scroll-mt-24 bg-slate-950 px-6 py-24 text-white lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-400">
            Наша історія
          </p>

          <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Наш шлях до вершин
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Від дитячо-юнацького відділення футзалу до команди, яка представляє
            Миколаїв на всеукраїнському рівні.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="absolute bottom-0 left-[15px] top-0 w-px bg-sky-400/25 md:left-1/2" />

          <div className="space-y-12">
            {historyItems.map((item, index) => {
              const isLeft = index % 2 === 0;

              return (
                <article
                  key={`${item.year}-${item.title}`}
                  className="relative grid md:grid-cols-2"
                >
                  <div
                    className={`pl-14 md:pl-0 ${
                      isLeft
                        ? "md:pr-12 md:text-right"
                        : "md:col-start-2 md:pl-12"
                    }`}
                  >
                    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-400/40 hover:bg-white/[0.08] md:min-h-56">
                      <span className="text-4xl font-black text-sky-400">
                        {item.year}
                      </span>

                      <h3 className="mt-4 text-2xl font-black">{item.title}</h3>

                      <p className="mt-4 leading-7 text-slate-300">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <span className="absolute left-0 top-8 h-8 w-8 rounded-full border-8 border-slate-950 bg-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.65)] md:left-1/2 md:-translate-x-1/2" />
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-sky-400/20 bg-sky-400/10 px-7 py-9 md:px-12">
          <p className="text-2xl font-bold leading-10 md:text-3xl">
            Наша історія продовжується. Кожне тренування, кожен матч і кожен
            гравець — це новий крок до спільної вершини.
          </p>
        </div>
      </div>
    </section>
  );
}
