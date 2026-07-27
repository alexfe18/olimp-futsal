import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: {
    default: "Адмін-кабінет",
    template: "%s | Олімп Футзал",
  },

  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
