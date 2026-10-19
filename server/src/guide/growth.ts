import { all, get } from "../db.js";
import { CHALLENGES, LESSONS, type Challenge } from "./content.js";
import { addDays, daysBetween } from "./dates.js";

export interface HabitStatus {
  id: number;
  name: string;
  area: string;
  cue: string;
  target_per_week: number;
  done_today: boolean;
  streak: number;
  week_count: number;
  last7: boolean[];
}

export async function habitStatuses(today: string): Promise<HabitStatus[]> {
  const habits = await all<{ id: number; name: string; area: string; cue: string; target_per_week: number }>(
    "SELECT * FROM habits WHERE archived = 0 ORDER BY id",
  );
  const logs = await all<{ habit_id: number; date: string }>(
    "SELECT habit_id, date FROM habit_logs WHERE date > ? AND date <= ?",
    [addDays(today, -400), today],
  );
  return habits.map((h) => {
    const dates = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.date));
    const done_today = dates.has(today);
    // A streak survives until the end of today, so start counting from yesterday if today isn't done yet.
    let streak = 0;
    for (let d = done_today ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) streak++;
    const last7 = Array.from({ length: 7 }, (_, i) => dates.has(addDays(today, i - 6)));
    return { ...h, done_today, streak, week_count: last7.filter(Boolean).length, last7 };
  });
}

/** 0-100: average of each habit's completion vs its weekly target over the last 7 days. */
export function habitScore(statuses: HabitStatus[]) {
  if (!statuses.length) return 0;
  const avg = statuses.reduce((s, h) => s + Math.min(1, h.week_count / h.target_per_week), 0) / statuses.length;
  return Math.round(avg * 100);
}

export interface GoalRow {
  id: number; title: string; area: string; why: string; metric: string;
  start_value: number; current_value: number; target_value: number; unit: string;
  deadline: string | null; status: string; created_at: string;
}

export async function goalInsights(today: string) {
  const goals = await all<GoalRow>("SELECT * FROM goals WHERE status = 'active'");
  return goals.map((g) => {
    const span = g.target_value - g.start_value;
    const progress = span === 0 ? 1 : Math.max(0, Math.min(1, (g.current_value - g.start_value) / span));
    let expected: number | null = null;
    let daysLeft: number | null = null;
    if (g.deadline) {
      const total = Math.max(1, daysBetween(g.created_at, g.deadline));
      expected = Math.max(0, Math.min(1, daysBetween(g.created_at, today) / total));
      daysLeft = daysBetween(today, g.deadline);
    }
    const behind = expected !== null && expected - progress > 0.15;
    return { ...g, progress: Math.round(progress * 100), expected: expected === null ? null : Math.round(expected * 100), daysLeft, behind };
  });
}

export async function moodStats(today: string) {
  const rows = await all<{ date: string; mood: number | null; energy: number | null }>(
    "SELECT date, AVG(mood) mood, AVG(energy) energy FROM journal WHERE date > ? AND date <= ? GROUP BY date ORDER BY date",
    [addDays(today, -14), today],
  );
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const recent = rows.filter((r) => r.date > addDays(today, -3));
  const week = rows.filter((r) => r.date > addDays(today, -7));
  const prev = rows.filter((r) => r.date <= addDays(today, -7));
  return {
    journaledToday: rows.some((r) => r.date === today),
    journalDays7: week.length,
    mood3: avg(recent.map((r) => r.mood)),
    mood7: avg(week.map((r) => r.mood)),
    moodPrev7: avg(prev.map((r) => r.mood)),
  };
}

export async function learningStats(today: string) {
  const minutes7 = (await get<{ m: number }>("SELECT COALESCE(SUM(minutes),0) m FROM practice_logs WHERE date > ? AND date <= ?", [addDays(today, -7), today]))!.m;
  const active = await all<{ id: number; title: string; kind: string; progress: number }>("SELECT * FROM learning WHERE status = 'active' ORDER BY id");
  const last = await all<{ learning_id: number; d: string }>("SELECT learning_id, MAX(date) d FROM practice_logs GROUP BY learning_id");
  const lastByItem = new Map(last.map((r) => [r.learning_id, r.d]));
  const stale = active.filter((a) => {
    const d = lastByItem.get(a.id);
    return !d || daysBetween(d, today) >= 3;
  });
  return { minutes7, active, stale };
}

export async function focusMinutes(from: string, to: string) {
  return (await get<{ m: number }>("SELECT COALESCE(SUM(minutes),0) m FROM focus_sessions WHERE date >= ? AND date <= ?", [from, to]))!.m;
}

function hashString(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Two challenges a day: one confidence/communication challenge and one from
 * another area. Difficulty unlocks as you complete more of them.
 */
export async function dailyChallenges(today: string): Promise<(Challenge & { done: boolean })[]> {
  const completed = (await get<{ n: number }>("SELECT COUNT(*) n FROM challenge_logs"))!.n;
  const maxLevel = completed >= 20 ? 3 : completed >= 7 ? 2 : 1;
  const doneToday = new Set(
    (await all<{ challenge_key: string }>("SELECT challenge_key FROM challenge_logs WHERE date = ?", [today])).map((r) => r.challenge_key),
  );
  const seed = hashString(today);
  const pick = (pool: Challenge[], salt: number) => pool[(seed + salt) % pool.length];
  const conf = pick(CHALLENGES.filter((c) => c.area === "confidence" && c.level <= maxLevel), 0);
  const other = pick(CHALLENGES.filter((c) => c.area !== "confidence" && c.level <= maxLevel), 7);
  return [conf, other].map((c) => ({ ...c, done: doneToday.has(c.key) }));
}

export function dailyLesson(today: string) {
  return LESSONS[hashString(today + "lesson") % LESSONS.length];
}

export async function challengeCount(from: string, to: string, area?: string) {
  const keys = area ? CHALLENGES.filter((c) => c.area === area).map((c) => c.key) : null;
  const rows = await all<{ challenge_key: string }>("SELECT challenge_key FROM challenge_logs WHERE date >= ? AND date <= ?", [from, to]);
  return rows.filter((r) => !keys || keys.includes(r.challenge_key)).length;
}
