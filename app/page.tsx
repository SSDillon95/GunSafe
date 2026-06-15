"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { downloadActivityPdf } from "@/lib/generateActivityPdf";
import type { ActiveSession, CheckEvent, Locker, Officer } from "@/lib/types";

type Tab = "check" | "enroll" | "lockers" | "log";

function formatTime(iso: string) {
  const normalized = iso.includes("T") ? iso : iso.replace(" ", "T");
  return new Date(normalized).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GunSafeApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("check");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [events, setEvents] = useState<CheckEvent[]>([]);
  const [active, setActive] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [selectedLockerId, setSelectedLockerId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [loggingOutKey, setLoggingOutKey] = useState<string | null>(null);
  const [archivingKey, setArchivingKey] = useState<string | null>(null);

  const [enrollForm, setEnrollForm] = useState({
    badge_number: "",
    first_name: "",
    last_name: "",
    department: "",
  });

  const [lockerForm, setLockerForm] = useState({
    locker_number: "",
    location: "",
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      const [officersRes, lockersRes, eventsRes] = await Promise.all([
        fetch("/api/officers"),
        fetch("/api/lockers"),
        fetch("/api/events"),
      ]);

      const officersJson = await officersRes.json();
      const lockersJson = await lockersRes.json();
      const eventsJson = await eventsRes.json();

      if (officersJson.success) setOfficers(officersJson.data);
      if (lockersJson.success) setLockers(lockersJson.data);
      if (eventsJson.success) {
        setEvents(eventsJson.data.events);
        setActive(eventsJson.data.active);
      }
    } catch {
      showMessage("error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPairStatus = () => {
    if (!selectedOfficerId || !selectedLockerId) return null;
    const session = active.find(
      (s) =>
        s.officer_id === Number(selectedOfficerId) &&
        s.locker_id === Number(selectedLockerId)
    );
    return session ? "checked_in" : "checked_out";
  };

  const handleLogIn = async () => {
    if (!selectedOfficerId || !selectedLockerId) {
      showMessage("error", "Select an officer and a locker first.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officer_id: Number(selectedOfficerId),
          locker_id: Number(selectedLockerId),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage("success", "Log in recorded.");
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogOut = async (officerId: number, lockerId: number) => {
    const rowKey = `${officerId}-${lockerId}`;
    setLoggingOutKey(rowKey);

    try {
      const res = await fetch("/api/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officer_id: officerId,
          locker_id: lockerId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage("success", "Log out recorded.");
      if (
        selectedOfficerId === String(officerId) &&
        selectedLockerId === String(lockerId)
      ) {
        setSelectedOfficerId("");
        setSelectedLockerId("");
      }
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setLoggingOutKey(null);
    }
  };

  const handleOfficerArchive = async (id: number, archived: boolean) => {
    setArchivingKey(`officer-${id}`);
    try {
      const res = await fetch("/api/officers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage(
        "success",
        archived ? "Officer archived." : "Officer activated."
      );
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setArchivingKey(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleDownloadPdf = () => {
    downloadActivityPdf(events);
  };

  const handleLockerArchive = async (id: number, archived: boolean) => {
    setArchivingKey(`locker-${id}`);
    try {
      const res = await fetch("/api/lockers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage(
        "success",
        archived ? "Locker archived." : "Locker activated."
      );
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setArchivingKey(null);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage("success", `Officer ${json.data.first_name} ${json.data.last_name} enrolled.`);
      setEnrollForm({ badge_number: "", first_name: "", last_name: "", department: "" });
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/lockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lockerForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      showMessage("success", `Locker ${json.data.locker_number} added.`);
      setLockerForm({ locker_number: "", location: "" });
      await loadData();
    } catch (err) {
      showMessage("error", (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const status = selectedPairStatus();
  const activeOfficers = officers.filter((o) => !o.archived);
  const archivedOfficers = officers.filter((o) => o.archived);
  const activeLockers = lockers.filter((l) => !l.archived);
  const archivedLockers = lockers.filter((l) => l.archived);

  const tabs: { id: Tab; label: string }[] = [
    { id: "check", label: "Log In" },
    { id: "enroll", label: "Enroll Officer" },
    { id: "lockers", label: "Locker Setup" },
    { id: "log", label: "Activity Log" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 36 36" aria-label="GunSafe logo">
              <rect width="36" height="36" rx="8" fill="#141a24" stroke="#3b82f6" strokeWidth="1.5" />
              <rect x="8" y="10" width="20" height="16" rx="2" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <circle cx="24" cy="18" r="2.5" fill="#60a5fa" />
              <path d="M8 26h20" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <div className="font-semibold text-xl sm:text-2xl tracking-tighter">GunSafe</div>
              <div className="text-[10px] text-blue-400 -mt-0.5 tracking-widest uppercase">
                Detention Center Locker Log
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-[10px] sm:text-xs px-2 sm:px-3 py-1 bg-[var(--card)] rounded-full border border-[var(--border)] text-slate-400">
              Records cannot be deleted
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={`max-w-5xl mx-auto px-4 sm:px-6 pt-4 ${
            message.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          <div
            className={`rounded-xl px-4 py-3 text-sm border ${
              message.type === "success"
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      <nav className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                tab === t.id
                  ? "bg-blue-500 text-white"
                  : "bg-[var(--card)] border border-[var(--border)] text-slate-300 hover:bg-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12">
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading...</div>
        ) : tab === "check" ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-1">Locker Log In</h2>
              <p className="text-slate-400 text-sm mb-8">
                Select an officer and locker, then record log in. Use the list
                below to log out.
              </p>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    Officer
                  </label>
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-4 text-white"
                  >
                    <option value="">Select officer...</option>
                    {activeOfficers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.last_name}, {o.first_name} — Badge {o.badge_number}
                      </option>
                    ))}
                  </select>
                  {activeOfficers.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      No officers enrolled. Go to Enroll Officer first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    Locker Number
                  </label>
                  <select
                    value={selectedLockerId}
                    onChange={(e) => setSelectedLockerId(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-4 text-white"
                  >
                    <option value="">Select locker...</option>
                    {activeLockers.map((l) => (
                      <option key={l.id} value={l.id}>
                        Locker {l.locker_number}
                        {l.location ? ` — ${l.location}` : ""}
                      </option>
                    ))}
                  </select>
                  {activeLockers.length === 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      No lockers configured. Go to Locker Setup first.
                    </p>
                  )}
                </div>
              </div>

              {status && (
                <div
                  className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
                    status === "checked_in"
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                  }`}
                >
                  Status:{" "}
                  {status === "checked_in"
                    ? "Currently logged in to this locker"
                    : "Not logged in to this locker"}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogIn}
                disabled={actionLoading || status === "checked_in"}
                className="w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-lg transition"
              >
                Log In
              </button>
            </section>

            {active.length > 0 && (
              <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Currently Logged In ({active.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase tracking-widest border-b border-[var(--border)]">
                        <th className="pb-3 pr-4">Officer</th>
                        <th className="pb-3 pr-4">Badge</th>
                        <th className="pb-3 pr-4">Locker</th>
                        <th className="pb-3 pr-4">Logged In</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.map((s) => {
                        const rowKey = `${s.officer_id}-${s.locker_id}`;
                        const isLoggingOut = loggingOutKey === rowKey;

                        return (
                          <tr
                            key={rowKey}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-3 pr-4">{s.officer_name}</td>
                            <td className="py-3 pr-4 font-mono">{s.badge_number}</td>
                            <td className="py-3 pr-4 font-mono">{s.locker_number}</td>
                            <td className="py-3 pr-4 text-slate-400">
                              {formatTime(s.checked_in_at)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleLogOut(s.officer_id, s.locker_id)
                                }
                                disabled={isLoggingOut || actionLoading}
                                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold transition whitespace-nowrap"
                              >
                                {isLoggingOut ? "Logging out..." : "Log Out"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : tab === "enroll" ? (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 max-w-xl">
            <h2 className="text-2xl font-semibold mb-1">Enroll Officer</h2>
            <p className="text-slate-400 text-sm mb-8">
              Add a new officer to the system. Archive inactive officers or
              activate them again later.
            </p>
            <form onSubmit={handleEnroll} className="space-y-5">
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                  Badge Number
                </label>
                <input
                  required
                  value={enrollForm.badge_number}
                  onChange={(e) =>
                    setEnrollForm({ ...enrollForm, badge_number: e.target.value })
                  }
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                  placeholder="e.g. 4521"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    First Name
                  </label>
                  <input
                    required
                    value={enrollForm.first_name}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, first_name: e.target.value })
                    }
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    Last Name
                  </label>
                  <input
                    required
                    value={enrollForm.last_name}
                    onChange={(e) =>
                      setEnrollForm({ ...enrollForm, last_name: e.target.value })
                    }
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                  Department (optional)
                </label>
                <input
                  value={enrollForm.department}
                  onChange={(e) =>
                    setEnrollForm({ ...enrollForm, department: e.target.value })
                  }
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                  placeholder="e.g. Patrol, Corrections"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold transition"
              >
                Enroll Officer
              </button>
            </form>

            {activeOfficers.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-4">
                  Active Officers ({activeOfficers.length})
                </h3>
                <ul className="space-y-2 text-sm">
                  {activeOfficers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <span>
                        {o.last_name}, {o.first_name}
                        <span className="font-mono text-slate-400 ml-2">
                          Badge {o.badge_number}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOfficerArchive(o.id, true)}
                        disabled={archivingKey === `officer-${o.id}`}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition whitespace-nowrap"
                      >
                        {archivingKey === `officer-${o.id}`
                          ? "Archiving..."
                          : "Archive"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {archivedOfficers.length > 0 && (
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-4">
                  Archived Officers ({archivedOfficers.length})
                </h3>
                <ul className="space-y-2 text-sm">
                  {archivedOfficers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0 opacity-70"
                    >
                      <span>
                        {o.last_name}, {o.first_name}
                        <span className="font-mono text-slate-400 ml-2">
                          Badge {o.badge_number}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOfficerArchive(o.id, false)}
                        disabled={archivingKey === `officer-${o.id}`}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition whitespace-nowrap"
                      >
                        {archivingKey === `officer-${o.id}`
                          ? "Activating..."
                          : "Activate"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ) : tab === "lockers" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-1">Locker Setup</h2>
              <p className="text-slate-400 text-sm mb-8">
                Configure locker numbers for the detention center. Archive unused
                lockers or activate them again later.
              </p>
              <form onSubmit={handleAddLocker} className="space-y-5">
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    Locker Number
                  </label>
                  <input
                    required
                    value={lockerForm.locker_number}
                    onChange={(e) =>
                      setLockerForm({ ...lockerForm, locker_number: e.target.value })
                    }
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                    placeholder="e.g. 101"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-widest mb-2">
                    Location (optional)
                  </label>
                  <input
                    value={lockerForm.location}
                    onChange={(e) =>
                      setLockerForm({ ...lockerForm, location: e.target.value })
                    }
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-4 py-3"
                    placeholder="e.g. West Wing, Floor 2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold transition"
                >
                  Add Locker
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Active Lockers ({activeLockers.length})
                </h3>
                {activeLockers.length === 0 ? (
                  <p className="text-slate-400 text-sm">No active lockers yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeLockers.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-mono text-2xl font-bold text-blue-400">
                            {l.locker_number}
                          </div>
                          {l.location && (
                            <div className="text-xs text-slate-400 mt-1">
                              {l.location}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLockerArchive(l.id, true)}
                          disabled={archivingKey === `locker-${l.id}`}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition whitespace-nowrap"
                        >
                          {archivingKey === `locker-${l.id}`
                            ? "Archiving..."
                            : "Archive"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {archivedLockers.length > 0 && (
                <div className="pt-6 border-t border-[var(--border)]">
                  <h3 className="text-lg font-semibold mb-4">
                    Archived Lockers ({archivedLockers.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {archivedLockers.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 flex items-center justify-between gap-3 opacity-70"
                      >
                        <div>
                          <div className="font-mono text-2xl font-bold text-slate-500">
                            {l.locker_number}
                          </div>
                          {l.location && (
                            <div className="text-xs text-slate-500 mt-1">
                              {l.location}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLockerArchive(l.id, false)}
                          disabled={archivingKey === `locker-${l.id}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition whitespace-nowrap"
                        >
                          {archivingKey === `locker-${l.id}`
                            ? "Activating..."
                            : "Activate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Activity Log</h2>
                <p className="text-slate-400 text-sm">
                  Permanent audit trail. All log in and log out records are kept forever
                  and cannot be deleted.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={events.length === 0}
                className="px-5 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-sm font-semibold transition whitespace-nowrap"
              >
                Download PDF Report
              </button>
            </div>

            {events.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No activity recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-widest border-b border-[var(--border)]">
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Event</th>
                      <th className="pb-3 pr-4">Officer</th>
                      <th className="pb-3 pr-4">Badge</th>
                      <th className="pb-3">Locker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                          {formatTime(e.recorded_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              e.event_type === "check_in"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {e.event_type === "check_in" ? "Log In" : "Log Out"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{e.officer_name}</td>
                        <td className="py-3 pr-4 font-mono">{e.badge_number}</td>
                        <td className="py-3 font-mono">{e.locker_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}