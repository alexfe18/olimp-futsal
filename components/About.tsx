const directions = [
  {
    number: "01",
    title: "Молоді таланти",
    description:
      "Створюємо можливості для розвитку молодих гравців та їхнього переходу до дорослого футзалу.",
  },
  {
    number: "02",
    title: "Професійна команда",
    description:
      "Формуємо сильний колектив із місцевих гравців, характером, дисципліною та амбіціями.",
  },
  {
    number: "03",
    title: "Розвиток регіону",
    description:
      "Прагнемо стати центром футзального розвитку молоді у Миколаєві та області.",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="scroll-mt-24 bg-slate-50 px-6 py-24 text-slate-950 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              Про клуб
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Будуємо майбутнє футзалу
            </h2>
          </div>

          <div>
            <p className="text-xl leading-9 text-slate-700">
              «Олімп Футзал» — це спортивний проєкт із Миколаєва, створений для
              розвитку дитячо-юнацького футзалу та формування дорослої команди з
              місцевих талантів.
            </p>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Наша мета — створити шлях від перших тренувань у дитячій
              спортивній школі до виступів на всеукраїнському рівні.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {directions.map((item) => (
            <article
              key={item.number}
              className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
            >
              <span className="text-sm font-black text-sky-500">
                {item.number}
              </span>

              <h3 className="mt-8 text-2xl font-black text-slate-950">
                {item.title}
              </h3>

              <p className="mt-4 leading-7 text-slate-600">
                {item.description}
              </p>

              <div className="mt-8 h-1 w-12 rounded-full bg-sky-400 transition-all duration-300 group-hover:w-24" />
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-sky-500 px-7 py-9 text-white md:px-12 md:py-12">
          <p className="max-w-4xl text-2xl font-bold leading-10 md:text-3xl">
            Наша місія — створення професійної футзальної команди з місцевих
            талантів та розвиток нового покоління гравців.
          </p>
        </div>
      </div>
    </section>
  );
}
