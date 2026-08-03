"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const historyGuardKey = "__exerciseFormUnsavedGuard";
const warningMessage =
  "У вас є незбережені зміни. Якщо ви залишите сторінку, вони будуть втрачені. Продовжити?";

type UseUnsavedChangesProtectionOptions = {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
};

function getRelativeHref(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function useUnsavedChangesProtection({
  hasUnsavedChanges,
  isSaving,
}: UseUnsavedChangesProtectionOptions) {
  const router = useRouter();
  const guardActiveRef = useRef(false);
  const removingGuardRef = useRef(false);
  const allowNavigationRef = useRef(false);
  const currentUrlRef = useRef<string | null>(null);

  const shouldBlockNavigation = hasUnsavedChanges;

  const confirmDiscardChanges = useCallback(() => {
    if (isSaving) return false;
    if (!shouldBlockNavigation) return true;
    return window.confirm(warningMessage);
  }, [isSaving, shouldBlockNavigation]);

  const navigateSafely = useCallback(
    (href: string) => {
      if (!confirmDiscardChanges()) return false;

      allowNavigationRef.current = true;

      if (guardActiveRef.current) {
        guardActiveRef.current = false;
        router.replace(href);
      } else {
        router.push(href);
      }

      return true;
    },
    [confirmDiscardChanges, router],
  );

  const navigateAfterSave = useCallback(
    (href: string) => {
      allowNavigationRef.current = true;
      guardActiveRef.current = false;
      router.replace(href);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!hasUnsavedChanges) {
      allowNavigationRef.current = false;
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!shouldBlockNavigation) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlockNavigation]);

  useEffect(() => {
    function addHistoryGuard() {
      currentUrlRef.current = window.location.href;
      window.history.pushState(
        {
          ...(window.history.state ?? {}),
          [historyGuardKey]: true,
        },
        "",
        currentUrlRef.current,
      );
      guardActiveRef.current = true;
    }

    function handlePopState() {
      if (removingGuardRef.current) {
        removingGuardRef.current = false;
        guardActiveRef.current = false;
        return;
      }

      if (!guardActiveRef.current) return;

      guardActiveRef.current = false;

      if (!shouldBlockNavigation || allowNavigationRef.current) return;

      if (isSaving) {
        addHistoryGuard();
        return;
      }

      if (window.confirm(warningMessage)) {
        allowNavigationRef.current = true;
        window.history.back();
        return;
      }

      addHistoryGuard();
    }

    window.addEventListener("popstate", handlePopState);

    if (shouldBlockNavigation && !guardActiveRef.current) {
      addHistoryGuard();
    }

    if (!shouldBlockNavigation && guardActiveRef.current) {
      removingGuardRef.current = true;
      window.history.back();
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, [isSaving, shouldBlockNavigation]);

  useEffect(() => {
    if (!shouldBlockNavigation) return;

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) return;

      const destinationPage = `${destination.pathname}${destination.search}`;
      const currentPage = `${current.pathname}${current.search}`;

      if (destinationPage === currentPage) return;

      event.preventDefault();
      event.stopPropagation();
      navigateSafely(getRelativeHref(destination));
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [navigateSafely, shouldBlockNavigation]);

  return {
    navigateSafely,
    navigateAfterSave,
  };
}
