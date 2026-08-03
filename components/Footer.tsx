import Image from "next/image";
import Link from "next/link";

const footerNavigation = [
  { label: "Про клуб", href: "/#about" },
  { label: "Історія", href: "/#history" },
  { label: "Досягнення", href: "/#achievements" },
  { label: "Тренування", href: "/training" },
  { label: "Новини", href: "/news" },
  { label: "Галерея", href: "/gallery" },
  { label: "Контакти", href: "/#contacts" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/olimp_futsal_myko/",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61571248874163",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ФКОлімпФутзалМиколаїв",
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 px-6 pb-8 pt-16 text-white lg:px-10 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-b border-white/10 pb-14 md:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_0.8fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-4">
              <Image
                src="/images/olimp-logo.png"
                alt="Олімп Футзал"
                width={72}
                height={72}
                className="h-16 w-16 object-contain sm:h-[72px] sm:w-[72px]"
              />

              <div>
                <strong className="block text-2xl font-black">
                  Олімп Футзал
                </strong>

                <span className="mt-1 block text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
                  Разом до вершин
                </span>
              </div>
            </Link>

            <p className="mt-7 max-w-md leading-7 text-slate-400">
              Футзальний проєкт із Миколаєва, який об’єднує досвід, молодість,
              амбіції та спільну любов до гри.
            </p>

            <div className="mt-7 space-y-2 text-sm text-slate-400">
              <p>Миколаїв, Україна</p>

              <a
                href="tel:+380636015920"
                className="block transition hover:text-sky-300"
              >
                +38 063 601 59 20
              </a>

              <a
                href="mailto:fkolimpfutzalmikolaiv@gmail.com"
                className="block break-words transition hover:text-sky-300"
              >
                fkolimpfutzalmikolaiv@gmail.com
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
              Навігація
            </h2>

            <nav className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-1">
              {footerNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="w-fit font-bold text-slate-300 transition hover:translate-x-1 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
              Соцмережі
            </h2>

            <div className="mt-6 space-y-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 font-bold text-slate-300 transition duration-300 hover:border-sky-400/40 hover:bg-white/[0.08] hover:text-white"
                >
                  <span>{social.label}</span>

                  <svg
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    aria-hidden="true"
                    className="transition duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M7 17L17 7M9 7H17V15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Олімп Футзал. Усі права захищено.</p>

          <p>Створено в Миколаєві з любов’ю до футзалу.</p>
        </div>
      </div>
    </footer>
  );
}
