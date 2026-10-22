export const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** Current streak: consecutive days ending today (or yesterday if today not yet logged). */
export function currentStreak(log: Set<string>, today = new Date()): number {
  let d = log.has(dayKey(today)) ? today : addDays(today, -1);
  let n = 0;
  while (log.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

const parseKey = (k: string) =>
  new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)));

export function longestStreak(log: Set<string>): number {
  const days = [...log].sort();
  let best = 0, run = 0;
  let prev: string | null = null;
  for (const k of days) {
    run = prev && dayKey(addDays(parseKey(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}
