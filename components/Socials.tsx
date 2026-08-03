const socialNetworks = [
  {
    name: "Instagram",
    username: "@olimp_futsal_myko",
    description: "Фото, сторіс, тренування та життя команди.",
    href: "https://www.instagram.com/olimp_futsal_myko/",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
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
  {
    name: "Facebook",
    username: "ФК «Олімп Футзал» Миколаїв",
    description: "Новини клубу, анонси матчів та важливі події.",
    href: "https://www.facebook.com/profile.php?id=61571248874163",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.7 21V13.1H16.4L16.8 10H13.7V8C13.7 7.1 14 6.5 15.3 6.5H17V3.7C16.2 3.6 15.4 3.5 14.6 3.5C12.2 3.5 10.5 5 10.5 7.7V10H7.8V13.1H10.5V21H13.7Z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    username: "@ФКОлімпФутзалМиколаїв",
    description: "Матчі, відео команди, огляди та найкращі моменти.",
    href: "https://www.youtube.com/@ФКОлімпФутзалМиколаїв",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width="30"
        height="30"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M21 12C21 12 21 8.7 20.6 7.1C20.4 6.2 19.8 5.6 18.9 5.4C17.3 5 12 5 12 5C12 5 6.7 5 5.1 5.4C4.2 5.6 3.6 6.2 3.4 7.1C3 8.7 3 12 3 12C3 12 3 15.3 3.4 16.9C3.6 17.8 4.2 18.4 5.1 18.6C6.7 19 12 19 12 19C12 19 17.3 19 18.9 18.6C19.8 18.4 20.4 17.8 20.6 16.9C21 15.3 21 12 21 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10 9L15 12L10 15V9Z" fill="currentColor" />
      </svg>
    ),
  },
];

export default function Socials() {
  return (
    <section className="bg-white px-6 py-24 text-slate-950 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-600">
              Стежте за нами
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Ми в соцмережах
            </h2>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Підписуйтеся, щоб стежити за матчами, тренуваннями, новинами та
            життям «Олімп Футзал».
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {socialNetworks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-80 flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 p-7 transition duration-300 hover:-translate-y-2 hover:border-sky-300 hover:bg-white hover:shadow-2xl hover:shadow-sky-950/10 sm:p-8"
            >
              <div>
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-sky-300 transition duration-300 group-hover:bg-sky-400 group-hover:text-slate-950">
                  {social.icon}
                </span>

                <h3 className="mt-8 text-3xl font-black text-slate-950">
                  {social.name}
                </h3>

                <p className="mt-2 break-words text-sm font-bold text-sky-700">
                  {social.username}
                </p>

                <p className="mt-5 leading-7 text-slate-600">
                  {social.description}
                </p>
              </div>

              <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-5">
                <span className="font-black text-slate-950">Перейти</span>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 transition duration-300 group-hover:translate-x-1 group-hover:bg-sky-400 group-hover:text-slate-950">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12H19M14 7L19 12L14 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
