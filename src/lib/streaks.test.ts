import { describe, it, expect } from "vitest";
import { currentStreak, longestStreak } from "./streaks";

const today = new Date(2026, 9, 22);
describe("streaks", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(new Set(["2026-10-20", "2026-10-21", "2026-10-22"]), today)).toBe(3);
  });
  it("keeps streak alive if today not yet logged", () => {
    expect(currentStreak(new Set(["2026-10-20", "2026-10-21"]), today)).toBe(2);
  });
  it("breaks after a missed day", () => {
    expect(currentStreak(new Set(["2026-10-19", "2026-10-20"]), today)).toBe(0);
  });
  it("finds longest run across month boundary", () => {
    expect(longestStreak(new Set(["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05"]))).toBe(3);
  });
});
