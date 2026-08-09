"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { decideAdminRouteAccess } from "@/lib/auth/access-control";
import type { PlayerAccessContext } from "@/lib/auth/player-auth";
import { supabase } from "@/lib/supabase";

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const verify = useCallback(async () => {
    if (isLoginPage) {
      setAllowed(true);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setAllowed(false);
      router.replace("/admin/login");
      return;
    }

    const { data, error } = await supabase.rpc("get_my_access_context");

    if (error || !data) {
      console.error("Admin access context error:", {
        message: error?.message ?? null,
        code: error?.code ?? null,
        details: error?.details ?? null,
        hint: error?.hint ?? null,
      });
      await supabase.auth.signOut();
      setAllowed(false);
      router.replace("/admin/login");
      return;
    }

    const context = data as PlayerAccessContext;
    const decision = decideAdminRouteAccess(context);

    if (decision.allow) {
      setAllowed(true);
      return;
    }

    setAllowed(false);

    if (decision.signOut) {
      await supabase.auth.signOut();
    }

    router.replace(decision.redirectTo);
  }, [isLoginPage, router]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      if (!active) return;
      await verify();
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || isLoginPage) return;

      if (event === "SIGNED_OUT" || !session) {
        setAllowed(false);
        router.replace("/admin/login");
        return;
      }

      if (event === "USER_UPDATED") {
        void verify();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isLoginPage, router, verify]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="font-bold text-slate-500">Перевіряємо доступ…</p>
      </div>
    );
  }

  return <>{children}</>;
}
