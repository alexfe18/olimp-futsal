"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminMobileHeader from "./AdminMobileHeader";
import AdminSidebar from "./AdminSidebar";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [adminEmail, setAdminEmail] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;

    async function checkAdminSession() {
      setIsCheckingSession(true);

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (error || !session) {
          router.replace("/admin/login");
          return;
        }

        setAdminEmail(session.user.email ?? "");
      } catch (error) {
        console.error("Admin session checking error:", error);

        if (isMounted) {
          router.replace("/admin/login");
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkAdminSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(session.user.email ?? "");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Admin logout error:", error);
      setIsLoggingOut(false);
    }
  }

  if (isLoginPage) {
    return children;
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />

          <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-700">
            Завантаження кабінету...
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <AdminSidebar
        adminEmail={adminEmail}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <AdminMobileHeader
        isOpen={isMobileMenuOpen}
        adminEmail={adminEmail}
        isLoggingOut={isLoggingOut}
        onOpen={() => setIsMobileMenuOpen(true)}
        onClose={closeMobileMenu}
        onLogout={handleLogout}
      />

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 xl:px-10 xl:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
