"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { decidePlayerRouteAccess } from "@/lib/auth/access-control";
import type { PlayerAccessContext } from "@/lib/auth/player-auth";
import { supabase } from "@/lib/supabase";

type PlayerSessionValue = {
  context: PlayerAccessContext;
  refreshAccess: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const PlayerSessionContext = createContext<PlayerSessionValue | null>(null);

export function usePlayerSession() {
  const value = useContext(PlayerSessionContext);

  if (!value) {
    throw new Error("usePlayerSession must be used inside PlayerAccessGate.");
  }

  return value;
}

export function PlayerAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [context, setContext] = useState<PlayerAccessContext | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const applyDecision = useCallback(
    async (nextContext: PlayerAccessContext) => {
      const decision = decidePlayerRouteAccess(nextContext);

      if (decision.allow) {
        setContext(nextContext);
        setIsChecking(false);
        return true;
      }

      setContext(null);
      setIsChecking(true);

      if (decision.signOut) {
        await supabase.auth.signOut();
      }

      router.replace(decision.redirectTo);
      return false;
    },
    [router],
  );

  const verifyAccess = useCallback(
    async (recordActivity: boolean) => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setContext(null);
        setIsChecking(true);
        router.replace("/login");
        return false;
      }

      const { data, error } = await supabase.rpc("get_my_access_context");

      if (error || !data) {
        console.error("Player route access context error:", {
          message: error?.message ?? null,
          code: error?.code ?? null,
          details: error?.details ?? null,
          hint: error?.hint ?? null,
        });
        await supabase.auth.signOut();
        setContext(null);
        setIsChecking(true);
        router.replace("/login");
        return false;
      }

      const nextContext = data as PlayerAccessContext;
      const allowed = await applyDecision(nextContext);

      if (allowed && recordActivity) {
        const { error: activityError } = await supabase.rpc("record_my_login");

        if (activityError) {
          console.warn("Player activity record warning:", {
            message: activityError.message,
            code: activityError.code,
          });
        }
      }

      return allowed;
    },
    [applyDecision, router],
  );

  useEffect(() => {
    let active = true;
    let authVerifyTimer: number | null = null;

    async function initialize() {
      const allowed = await verifyAccess(true);
      if (!active || !allowed) return;
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      // Startup access is already owned by initialize(). Ignoring the initial
      // event prevents a transient empty auth event from racing the route check.
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_OUT") {
        setContext(null);
        setIsChecking(true);
        router.replace("/login");
        return;
      }

      if (!session) {
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (authVerifyTimer !== null) {
          window.clearTimeout(authVerifyTimer);
        }

        // Keep Supabase API calls outside the auth callback.
        authVerifyTimer = window.setTimeout(() => {
          if (!active) return;
          void verifyAccess(false);
        }, 0);
      }
    });

    return () => {
      active = false;

      if (authVerifyTimer !== null) {
        window.clearTimeout(authVerifyTimer);
      }

      subscription.unsubscribe();
    };
  }, [router, verifyAccess]);

  const value = useMemo<PlayerSessionValue | null>(() => {
    if (!context) return null;

    return {
      context,
      refreshAccess: () => verifyAccess(false),
      logout: async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      },
    };
  }, [context, router, verifyAccess]);

  if (isChecking || !value) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="font-bold text-slate-500">Перевіряємо доступ гравця…</p>
      </main>
    );
  }

  return (
    <PlayerSessionContext.Provider value={value}>
      {children}
    </PlayerSessionContext.Provider>
  );
}
