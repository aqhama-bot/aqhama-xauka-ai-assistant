import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, currentStreak, dayKey, longestStreak } from "@/lib/streaks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STREAK.SYS — Habit & Workout Tracker" },
      { name: "description", content: "Log daily habits and workouts. Track streaks and progress." },
      { property: "og:title", content: "STREAK.SYS — Habit & Workout Tracker" },
      { property: "og:description", content: "Log daily habits and workouts. Track streaks and progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Habit = { id: string; name: string; kind: "habit" | "workout"; log: string[]; created: string };
const KEY = "streak-sys-v1";

function Index() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Habit["kind"]>("habit");

  useEffect(() => {
    try { setHabits(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(habits)); }, [habits, loaded]);

  const today = new Date();
  const todayK = dayKey(today);
  const days = useMemo(() => Array.from({ length: 84 }, (_, i) => dayKey(addDays(today, i - 83))), [todayK]);
  const week = days.slice(-7);

  const toggle = (id: string, k: string) =>
    setHabits((hs) => hs.map((h) => h.id !== id ? h : { ...h, log: h.log.includes(k) ? h.log.filter((x) => x !== k) : [...h.log, k] }));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setHabits((hs) => [...hs, { id: crypto.randomUUID(), name: name.trim(), kind, log: [], created: todayK }]);
    setName("");
  };

  const doneToday = habits.filter((h) => h.log.includes(todayK)).length;
  const best = Math.max(0, ...habits.map((h) => currentStreak(new Set(h.log))));
  const totalLogs = habits.reduce((a, h) => a + h.log.length, 0);

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 flex items-end justify-between border-b pb-4">
          <div>
            <p className="font-mono text-xs text-primary">// v1.0 · {todayK}</p>
            <h1 className="font-mono text-3xl font-bold tracking-tight">STREAK<span className="text-primary">.SYS</span></h1>
          </div>
          <p className="hidden font-mono text-xs text-muted-foreground sm:block">status: <span className="text-primary">online</span></p>
        </header>

        <section className="mb-8 grid grid-cols-3 gap-3">
          {[
            ["TODAY", `${doneToday}/${habits.length}`],
            ["TOP_STREAK", `${best}d`],
            ["TOTAL_LOGS", totalLogs],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-md border bg-card p-4">
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">{l}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{v}</p>
            </div>
          ))}
        </section>

        <form onSubmit={add} className="mb-8 flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row">
          <span className="hidden self-center font-mono text-primary sm:block">&gt;</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new_tracker e.g. 50 pushups, read 20min"
            className="flex-1 bg-transparent px-2 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex gap-1 font-mono text-xs">
            {(["habit", "workout"] as const).map((k) => (
              <button type="button" key={k} onClick={() => setKind(k)}
                className={`rounded-sm border px-3 py-2 ${kind === k ? "border-primary text-primary" : "text-muted-foreground"}`}>
                {k}
              </button>
            ))}
            <button className="rounded-sm bg-primary px-4 py-2 font-bold text-primary-foreground glow">ADD</button>
          </div>
        </form>

        {habits.length === 0 && loaded && (
          <p className="rounded-md border border-dashed p-10 text-center font-mono text-sm text-muted-foreground">
            no trackers initialized. add one above_
          </p>
        )}

        <div className="space-y-4">
          {habits.map((h) => {
            const set = new Set(h.log);
            const cur = currentStreak(set);
            const last30 = days.slice(-30).filter((d) => set.has(d)).length;
            const done = set.has(todayK);
            return (
              <article key={h.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => toggle(h.id, todayK)} aria-label={`Log ${h.name} today`}
                    className={`grid h-10 w-10 place-items-center rounded-sm border font-mono text-lg ${done ? "border-primary bg-primary text-primary-foreground glow" : "text-muted-foreground hover:border-primary"}`}>
                    {done ? "✓" : "+"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h.kind}</p>
                    <h2 className="truncate font-medium">{h.name}</h2>
                  </div>
                  <div className="flex gap-5 font-mono text-xs">
                    <Stat l="streak" v={`${cur}d`} hi />
                    <Stat l="best" v={`${longestStreak(set)}d`} />
                    <Stat l="30d" v={`${Math.round((last30 / 30) * 100)}%`} />
                  </div>
                  <button onClick={() => confirm(`Delete "${h.name}"?`) && setHabits((hs) => hs.filter((x) => x.id !== h.id))}
                    className="font-mono text-xs text-muted-foreground hover:text-destructive">[rm]</button>
                </div>

                <div className="mt-4 flex gap-1">
                  {week.map((d) => (
                    <button key={d} onClick={() => toggle(h.id, d)}
                      className={`flex-1 rounded-sm border py-1 font-mono text-[10px] ${set.has(d) ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                      {new Date(d + "T00:00").toLocaleDateString("en", { weekday: "short" }).slice(0, 2)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto">
                  {days.map((d) => (
                    <div key={d} title={d} className={`h-3 w-3 rounded-[2px] ${set.has(d) ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
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
