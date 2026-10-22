import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  currentStreak,
  dayKey,
  loggedIn,
  longestStreak,
  MILESTONES,
  unlocked,
} from "@/lib/streaks";
import armLogo from "@/assets/arm-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STREAK.SYS — Habit & Workout Tracker" },
      {
        name: "description",
        content:
          "Log daily habits and workouts, track streaks, weekly goals, activity and milestone unlocks.",
      },
      { property: "og:title", content: "STREAK.SYS — Habit & Workout Tracker" },
      {
        property: "og:description",
        content:
          "Log daily habits and workouts, track streaks, weekly goals, activity and milestone unlocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Habit = {
  id: string;
  name: string;
  kind: "habit" | "workout";
  log: string[];
  created: string;
  goal: number;
};

const KEY = "streak-sys-v1";
const FILTERS = ["all", "habit", "workout"] as const;
const clampGoal = (n: number) => Math.min(7, Math.max(1, Math.round(n) || 1));

function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Habit["kind"]>("habit");
  const [goal, setGoal] = useState(7);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      setHabits(
        Array.isArray(raw)
          ? raw.map((h: Habit) => ({ ...h, log: Array.isArray(h.log) ? h.log : [], goal: clampGoal(h.goal ?? 7) }))
          : [],
      );
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(habits));
  }, [habits, loaded]);

  const today = new Date();
  const todayK = dayKey(today);
  const days = useMemo(
    () => Array.from({ length: 84 }, (_, i) => dayKey(addDays(today, i - 83))),
    [todayK],
  );
  const week = days.slice(-7);
  const fortnight = days.slice(-14);

  const toggle = (id: string, k: string) =>
    setHabits((hs) =>
      hs.map((h) =>
        h.id !== id
          ? h
          : { ...h, log: h.log.includes(k) ? h.log.filter((x) => x !== k) : [...h.log, k] },
      ),
    );

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setHabits((hs) => [
      ...hs,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        kind,
        goal,
        log: [],
        created: todayK,
      },
    ]);
    setName("");
  };

  const setGoalFor = (id: string, n: number) =>
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, goal: clampGoal(n) } : h)));

  const shown = habits.filter(
    (h) =>
      (filter === "all" || h.kind === filter) &&
      h.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const stats = useMemo(() => {
    const sets = habits.map((h) => new Set(h.log));
    const bests = habits.map((h) => longestStreak(new Set(h.log)));
    return {
      doneToday: sets.filter((s) => s.has(todayK)).length,
      best: Math.max(0, ...sets.map((s) => currentStreak(s))),
      totalLogs: habits.reduce((a, h) => a + h.log.length, 0),
      weekLogs: sets.reduce((a, s) => a + loggedIn(s, week), 0),
      weekTarget: habits.reduce((a, h) => a + h.goal, 0),
      perDay: fortnight.map((d) => sets.reduce((a, s) => a + (s.has(d) ? 1 : 0), 0)),
      bests,
    };
  }, [habits, todayK, week.join(), fortnight.join()]);

  const maxDay = Math.max(1, ...stats.perDay);
  const earned = unlocked(stats.bests);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(habits, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `streak-sys-${todayK}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const rows = JSON.parse(await file.text());
      if (!Array.isArray(rows)) throw new Error("not an array");
      setHabits(
        rows
          .filter((r) => r && typeof r.name === "string")
          .map((r) => ({
            id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
            name: r.name,
            kind: r.kind === "workout" ? ("workout" as const) : ("habit" as const),
            log: Array.isArray(r.log) ? r.log.filter((x) => typeof x === "string") : [],
            created: typeof r.created === "string" ? r.created : todayK,
            goal: clampGoal(r.goal ?? 7),
          })),
      );
    } catch {
      alert("import failed — that file is not a streak.sys backup");
    }
  };

  const wipe = () => {
    if (confirm("Wipe all trackers and logs?")) {
      setHabits([]);
      localStorage.removeItem(KEY);
    }
  };

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="font-mono text-xs text-primary">// v1.1 · {todayK}</p>
            <h1 className="font-mono text-3xl font-bold tracking-tight">
              STREAK<span className="text-primary">.SYS</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-card px-3 py-2 glow">
            <img
              src={armLogo}
              alt="Flexed arm fitness emblem"
              width={816}
              height={816}
              loading="lazy"
              className="h-11 w-11 object-contain"
            />
            <div className="hidden sm:block">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                fitness module
              </p>
              <p className="font-mono text-sm font-bold">
                ARM<span className="text-primary">//</span>UNIT
              </p>
            </div>
            <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-primary blink" />
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["TODAY", `${stats.doneToday}/${habits.length}`],
            ["TOP_STREAK", `${stats.best}d`],
            ["WEEK_LOGS", `${stats.weekLogs}/${stats.weekTarget}`],
            ["TOTAL_LOGS", stats.totalLogs],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-md border bg-card p-4">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{l}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{v}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              activity // last 14d
            </p>
            <p className="font-mono text-[10px] text-primary">
              peak {maxDay} log{maxDay === 1 ? "" : "s"}/day
            </p>
          </div>
          <div className="mt-3 flex items-end gap-1">
            {stats.perDay.map((n, i) => (
              <div key={fortnight[i]} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end">
                  <div
                    title={`${fortnight[i]} · ${n}`}
                    className={`w-full rounded-t-[2px] ${n ? "bg-primary" : "bg-muted"}`}
                    style={{ height: `${n ? Math.max(10, (n / maxDay) * 100) : 6}%` }}
                  />
                </div>
                <span className="font-mono text-[8px] text-muted-foreground">
                  {new Date(fortnight[i] + "T00:00")
                    .toLocaleDateString("en", { weekday: "short" })
                    .slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              milestones
            </p>
            <p className="font-mono text-[10px] text-primary">
              {earned.length}/{MILESTONES.length} unlocked
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MILESTONES.map((m) => {
              const on = stats.bests.some((b) => b >= m);
              return (
                <div
                  key={m}
                  className={`rounded-sm border px-3 py-2 font-mono text-xs ${
                    on ? "border-primary text-primary glow" : "text-muted-foreground"
                  }`}
                >
                  {m}d {on ? "✓" : "—"}
                </div>
              );
            })}
          </div>
        </section>

        <form onSubmit={add} className="mb-4 flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row">
          <span className="hidden self-center font-mono text-primary sm:block">&gt;</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new_tracker e.g. 50 pushups, read 20min"
            className="flex-1 bg-transparent px-2 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            {(["habit", "workout"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-sm border px-3 py-2 ${
                  kind === k ? "border-primary text-primary" : "text-muted-foreground"
                }`}
              >
                {k}
              </button>
            ))}
            <div className="flex items-center gap-1 rounded-sm border px-2 py-1 text-muted-foreground">
              <span>goal/wk</span>
              <button type="button" onClick={() => setGoal((g) => clampGoal(g - 1))} aria-label="Lower weekly goal">
                −
              </button>
              <span className="w-4 text-center font-bold text-primary">{goal}</span>
              <button type="button" onClick={() => setGoal((g) => clampGoal(g + 1))} aria-label="Raise weekly goal">
                +
              </button>
            </div>
            <button className="rounded-sm bg-primary px-4 py-2 font-bold text-primary-foreground glow">
              ADD
            </button>
          </div>
        </form>

        <div className="mb-6 flex flex-wrap items-center gap-2 font-mono text-xs">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-sm border px-3 py-1 ${
                filter === f ? "border-primary text-primary" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="grep trackers…"
            className="ml-auto w-40 rounded-sm border bg-card px-2 py-1 outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {habits.length === 0 && loaded && (
          <p className="rounded-md border border-dashed p-10 text-center font-mono text-sm text-muted-foreground">
            no trackers initialized. add one above_
          </p>
        )}
        {habits.length > 0 && shown.length === 0 && (
          <p className="rounded-md border border-dashed p-8 text-center font-mono text-sm text-muted-foreground">
            no tracker matches this filter_
          </p>
        )}

        <div className="space-y-4">
          {shown.map((h) => {
            const set = new Set(h.log);
            const cur = currentStreak(set);
            const last30 = days.slice(-30).filter((d) => set.has(d)).length;
            const done = set.has(todayK);
            const weekDone = loggedIn(set, week);
            const pct = Math.min(100, Math.round((weekDone / h.goal) * 100));
            return (
              <article key={h.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggle(h.id, todayK)}
                    aria-label={`Log ${h.name} today`}
                    className={`grid h-10 w-10 place-items-center rounded-sm border font-mono text-lg ${
                      done
                        ? "border-primary bg-primary text-primary-foreground glow"
                        : "text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {done ? "✓" : "+"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {h.kind}
                    </p>
                    <h2 className="truncate font-medium">{h.name}</h2>
                  </div>
                  <div className="flex gap-5 font-mono text-xs">
                    <Stat l="streak" v={`${cur}d`} hi />
                    <Stat l="best" v={`${longestStreak(set)}d`} />
                    <Stat l="30d" v={`${Math.round((last30 / 30) * 100)}%`} />
                  </div>
                  <button
                    onClick={() =>
                      confirm(`Delete "${h.name}"?`) && setHabits((hs) => hs.filter((x) => x.id !== h.id))
                    }
                    className="font-mono text-xs text-muted-foreground hover:text-destructive"
                  >
                    [rm]
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    goal
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setGoalFor(h.id, n)}
                        aria-label={`Set ${h.name} weekly goal to ${n} days`}
                        className={`h-3 w-3 rounded-[2px] border ${
                          n <= h.goal ? "border-primary bg-primary/40" : "border-border"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="min-w-[80px] flex-1">
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {weekDone}/{h.goal} this week
                  </p>
                </div>

                <div className="mt-4 flex gap-1">
                  {week.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggle(h.id, d)}
                      className={`flex-1 rounded-sm border py-1 font-mono text-[10px] ${
                        set.has(d)
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(d + "T00:00")
                        .toLocaleDateString("en", { weekday: "short" })
                        .slice(0, 2)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto">
                  {days.map((d) => (
                    <div
                      key={d}
                      title={d}
                      className={`h-3 w-3 rounded-[2px] ${set.has(d) ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-8 flex flex-wrap items-center gap-2 border-t pt-4 font-mono text-xs">
          <button onClick={exportData} className="rounded-sm border px-3 py-1 hover:border-primary hover:text-primary">
            [export]
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-sm border px-3 py-1 hover:border-primary hover:text-primary"
          >
            [import]
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
              e.target.value = "";
            }}
          />
          <button onClick={wipe} className="rounded-sm border px-3 py-1 hover:border-destructive hover:text-destructive">
            [wipe]
          </button>
          <span className="ml-auto text-muted-foreground">local-only · no account</span>
        </section>
      </div>
    </div>
  );
}

function Stat({ l, v, hi }: { l: string; v: string; hi?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase text-muted-foreground">{l}</p>
      <p className={`text-base font-bold ${hi ? "text-primary" : ""}`}>{v}</p>
    </div>
  );
}
