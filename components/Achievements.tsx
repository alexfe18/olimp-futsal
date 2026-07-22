import Image from "next/image";

const achievements = [
  {
    number: "01",
    title: "Кубок України",
    subtitle: "Учасники турніру",
    year: "2025",
  },
  {
    number: "02",
    title: "Друга ліга України",
    subtitle: "Учасники змагань",
    year: "2025",
  },
  {
    number: "03",
    title: "Кубок Миколаєва",
    subtitle: "Призери турніру",
    year: "2025",
  },
  {
    number: "04",
    title: "Турнір у Кропивницькому",
    subtitle: "Переможці кубкового турніру",
    year: "2025",
  },
];

export default function Achievements() {
  return (
    <section
      id="achievements"
      className="scroll-mt-24 bg-slate-50 px-6 py-24 text-slate-950 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              Наші досягнення
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Перші кроки на великій арені
            </h2>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Кожен турнір — це новий досвід, сильніші суперники та ще один
            важливий етап у розвитку команди.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[2rem] bg-slate-900">
            <div className="relative md:min-h-[560px]">
              <Image
                src="/images/achievements-team.jpg"
                alt="Олімп Футзал із кубком"
                width={1600}
                height={1067}
                className="h-auto w-full object-contain md:absolute md:inset-0 md:h-full md:w-full md:object-cover"
                sizes="(max-width: 768px) 100vw, 55vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-7 text-white md:p-10">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-300">
                  Разом до вершин
                </p>

                <h3 className="mt-3 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Наші перемоги створює вся команда
                </h3>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {achievements.map((item) => (
              <article
                key={item.number}
                className="group flex min-h-52 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm font-black text-sky-500">
                    {item.number}
                  </span>

                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                    {item.year}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.subtitle}
                  </p>
                </div>

                <div className="h-1 w-12 rounded-full bg-sky-400 transition-all duration-300 group-hover:w-24" />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
