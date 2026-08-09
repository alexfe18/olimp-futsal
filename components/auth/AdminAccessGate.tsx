"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";
import type { PlayerAccessContext } from "@/lib/auth/player-auth";

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setAllowed(true);
      return;
    }

    let active = true;

    async function verify() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase.rpc("get_my_access_context");

      if (!active) return;

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      const context = data as PlayerAccessContext;

      if (context.account_status !== "active") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (context.must_change_password) {
        router.replace("/account/change-password");
        return;
      }

      if (!context.can_access_admin) {
        router.replace("/player");
        return;
      }

      setAllowed(true);
    }

    void verify();

    return () => {
      active = false;
    };
  }, [isLoginPage, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="font-bold text-slate-500">Перевіряємо доступ…</p>
      </div>
    );
  }

  return <>{children}</>;
}
