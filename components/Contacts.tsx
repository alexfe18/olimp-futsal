import Image from "next/image";

const contactItems = [
  {
    label: "Телефон",
    value: "063 601 59 20",
    href: "tel:+380636015920",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7.2 3.5L9.6 8.2L7.9 10.1C9.1 12.6 11.3 14.8 13.9 16.1L15.8 14.4L20.5 16.8V19.5C20.5 20.3 19.8 21 19 21C10.2 21 3 13.8 3 5C3 4.2 3.7 3.5 4.5 3.5H7.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Email",
    value: "fkolimpfutzalmikolaiv@gmail.com",
    href: "mailto:fkolimpfutzalmikolaiv@gmail.com",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4 7L12 13L20 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Instagram",
    value: "@olimp_futsal_myko",
    href: "https://www.instagram.com/olimp_futsal_myko/",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export default function Contacts() {
  return (
    <section
      id="contacts"
      className="scroll-mt-24 overflow-hidden bg-sky-50 px-4 py-20 text-slate-950 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="w-full overflow-hidden rounded-[1.75rem] bg-slate-950 text-white shadow-2xl sm:rounded-[2rem]">
          <div className="grid min-w-0 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Текстова частина */}
            <div className="min-w-0 px-5 py-8 sm:p-10 lg:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-400 sm:text-sm sm:tracking-[0.28em]">
                Контакти
              </p>

              <h2 className="mt-5 max-w-2xl text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Станьте частиною нашого шляху
              </h2>

              <p className="mt-6 max-w-xl break-words text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Відкриті до спілкування з гравцями, батьками, уболівальниками,
                партнерами та всіма, хто прагне розвивати футзал у Миколаєві.
              </p>

              <div className="mt-8 grid min-w-0 gap-4 sm:mt-10">
                {contactItems.map((item) => {
                  const isEmail = item.label === "Email";

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target={
                        item.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        item.href.startsWith("http") ? "noreferrer" : undefined
                      }
                      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/[0.08] sm:gap-4 sm:p-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-400 text-slate-950 transition group-hover:bg-sky-300 sm:h-14 sm:w-14">
                        {item.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                          {item.label}
                        </span>

                        <span
                          className={`mt-1 block min-w-0 text-sm font-bold leading-5 text-white sm:text-base ${
                            isEmail ? "break-all" : "break-words"
                          }`}
                        >
                          {item.value}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Фото */}
            <div className="relative min-h-[500px] overflow-hidden sm:min-h-[560px] lg:min-h-full">
              <Image
                src="/images/gallery-7.jpg"
                alt="Олімп Футзал — доросла та юнацька команди"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent lg:bg-gradient-to-r lg:from-slate-950 lg:via-transparent lg:to-transparent" />

              <div className="absolute inset-x-0 bottom-0 min-w-0 p-5 sm:p-8 lg:p-10">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300 sm:text-sm sm:tracking-[0.24em]">
                  Олімп Футзал
                </p>

                <p className="mt-3 max-w-md break-words text-2xl font-black leading-tight text-white sm:text-3xl">
                  Разом створюємо майбутнє миколаївського футзалу
                </p>

                <a
                  href="https://www.instagram.com/olimp_futsal_myko/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-center text-sm font-black text-slate-950 transition duration-300 hover:-translate-y-0.5 hover:bg-sky-300 sm:w-auto sm:px-6 sm:text-base"
                >
                  Долучитися в Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
