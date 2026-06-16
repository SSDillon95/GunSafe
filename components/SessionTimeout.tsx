"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SESSION_TIMEOUT_MS } from "@/lib/session-config";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

const REFRESH_INTERVAL_MS = 60 * 1000;

export default function SessionTimeout() {
  const router = useRouter();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const logout = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login?timeout=1");
      router.refresh();
    };

    const refreshSession = async () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_INTERVAL_MS) return;

      lastRefreshRef.current = now;
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) await logout();
      } catch {
        await logout();
      }
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        void logout();
      }, SESSION_TIMEOUT_MS);
      void refreshSession();
    };

    resetIdleTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetIdleTimer);
      }
    };
  }, [router]);

  return null;
}