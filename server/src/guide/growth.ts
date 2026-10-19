import { db } from "../db.js";
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

export function habitStatuses(today: string): HabitStatus[] {
  const habits = db.prepare("SELECT * FROM habits WHERE archived = 0 ORDER BY id").all() as {
    id: number; name: string; area: string; cue: string; target_per_week: number;
  }[];
  const logStmt = db.prepare("SELECT date FROM habit_logs WHERE habit_id = ? AND date <= ? ORDER BY date DESC LIMIT 400");
  return habits.map((h) => {
    const dates = new Set((logStmt.all(h.id, today) as { date: string }[]).map((r) => r.date));
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

export function goalInsights(today: string) {
  const goals = db.prepare("SELECT * FROM goals WHERE status = 'active'").all() as GoalRow[];
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

export function moodStats(today: string) {
  const rows = db
    .prepare("SELECT date, AVG(mood) mood, AVG(energy) energy FROM journal WHERE date > ? AND date <= ? GROUP BY date ORDER BY date")
    .all(addDays(today, -14), today) as { date: string; mood: number | null; energy: number | null }[];
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

export function learningStats(today: string) {
  const minutes7 = (db.prepare("SELECT COALESCE(SUM(minutes),0) m FROM practice_logs WHERE date > ? AND date <= ?").get(addDays(today, -7), today) as { m: number }).m;
  const active = db.prepare("SELECT * FROM learning WHERE status = 'active' ORDER BY id").all() as { id: number; title: string; kind: string; progress: number }[];
  const lastPractice = db.prepare("SELECT MAX(date) d FROM practice_logs WHERE learning_id = ?");
  const stale = active.filter((a) => {
    const d = (lastPractice.get(a.id) as { d: string | null }).d;
    return !d || daysBetween(d, today) >= 3;
  });
  return { minutes7, active, stale };
}

export function focusMinutes(from: string, to: string) {
  return (db.prepare("SELECT COALESCE(SUM(minutes),0) m FROM focus_sessions WHERE date >= ? AND date <= ?").get(from, to) as { m: number }).m;
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
export function dailyChallenges(today: string): (Challenge & { done: boolean })[] {
  const completed = (db.prepare("SELECT COUNT(*) n FROM challenge_logs").get() as { n: number }).n;
  const maxLevel = completed >= 20 ? 3 : completed >= 7 ? 2 : 1;
  const doneToday = new Set(
    (db.prepare("SELECT challenge_key FROM challenge_logs WHERE date = ?").all(today) as { challenge_key: string }[]).map((r) => r.challenge_key),
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

export function challengeCount(from: string, to: string, area?: string) {
  const keys = area ? CHALLENGES.filter((c) => c.area === area).map((c) => c.key) : null;
  const rows = db.prepare("SELECT challenge_key FROM challenge_logs WHERE date >= ? AND date <= ?").all(from, to) as { challenge_key: string }[];
  return rows.filter((r) => !keys || keys.includes(r.challenge_key)).length;
}
