import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

/*
 * Локально используется http://localhost:3000.
 * После публикации на Vercel мы добавим NEXT_PUBLIC_SITE_URL
 * с реальным адресом сайта.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Олімп Футзал — футзальна команда з Миколаєва",
    template: "%s | Олімп Футзал",
  },

  description:
    "Офіційний сайт «Олімп Футзал». Розвиваємо футзал у Миколаєві, підтримуємо молодих гравців та створюємо команду з характером, амбіціями й майбутнім.",

  applicationName: "Олімп Футзал",

  keywords: [
    "Олімп Футзал",
    "футзал Миколаїв",
    "футзальна команда Миколаїв",
    "футзал Україна",
    "дитячо-юнацький футзал",
    "футзальні тренування",
    "ФК Олімп Футзал",
    "спорт Миколаїв",
  ],

  authors: [
    {
      name: "Олімп Футзал",
    },
  ],

  creator: "Олімп Футзал",
  publisher: "Олімп Футзал",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/images/olimp-logo.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/images/olimp-logo.png",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: "Олімп Футзал",
    title: "Олімп Футзал — разом до вершин",
    description:
      "Футзальна команда з Миколаєва. Розвиваємо молодих гравців, об’єднуємо команду та створюємо майбутнє миколаївського футзалу.",
    images: [
      {
        url: "/images/hero-team.jpg",
        width: 1600,
        height: 1067,
        alt: "Команда Олімп Футзал",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Олімп Футзал — разом до вершин",
    description:
      "Офіційний сайт футзальної команди «Олімп Футзал» з Миколаєва.",
    images: ["/images/hero-team.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "sports",

  other: {
    "format-detection": "telephone=yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-full overflow-x-hidden antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
