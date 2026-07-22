const stats = [
  {
    value: "2019",
    label: "відкрито футзальне відділення",
  },
  {
    value: "2024",
    label: "новий старт проєкту",
  },
  {
    value: "4",
    label: "вагомі досягнення",
  },
  {
    value: "1",
    label: "спільна мета",
  },
];

export default function Stats() {
  return (
    <section
      id="stats"
      className="relative z-20 scroll-mt-20 bg-slate-950 px-6 py-10 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className="rounded-3xl border border-sky-400/15 bg-white/[0.045] px-5 py-7 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-400/40"
          >
            <strong className="block text-4xl font-black leading-none text-sky-400 lg:text-5xl">
              {item.value}
            </strong>

            <span className="mt-4 block max-w-40 text-sm font-medium leading-5 text-slate-300">
              {item.label}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
