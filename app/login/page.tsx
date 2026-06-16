"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "@/components/Footer";
import GunSafeLogo from "@/components/GunSafeLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const timedOut = searchParams.get("timeout") === "1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Login failed.");
        return;
      }

      const from = searchParams.get("from") || "/";
      const destination =
        !from || from === "/site-access" || from.startsWith("/site-access/")
          ? "/"
          : from;
      router.push(destination);
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 space-y-5"
    >
      <h1 className="text-xl font-semibold text-center">Sign In</h1>

      {timedOut && (
        <div className="rounded-xl px-4 py-3 text-sm border bg-amber-500/10 border-amber-500/30 text-amber-300">
          Your session expired after 30 minutes of inactivity. Please sign in
          again.
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm border bg-red-500/10 border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
          Username
        </label>
        <input
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
          placeholder="Enter username"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
          Password
        </label>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
          placeholder="Enter password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold transition"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <GunSafeLogo size={40} />
            <span className="text-3xl font-semibold tracking-tighter">GunSafe</span>
          </div>
          <p className="text-slate-400 text-sm">Detention Center Locker Log</p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-slate-400">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
      </div>
      <Footer />
    </div>
  );
}