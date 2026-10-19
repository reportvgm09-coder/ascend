import { Router, type Request } from "express";
import { z } from "zod";
import { all, db, get, run, setKV, transaction, type Row } from "./db.js";
import type { InStatement } from "@libsql/client";
import { todayBriefing, weeklyReview } from "./guide/briefing.js";
import { CHALLENGES, LESSONS, MEAL_IDEAS, PROGRAMS } from "./guide/content.js";
import { isDate, serverToday } from "./guide/dates.js";
import { habitStatuses, goalInsights } from "./guide/growth.js";
import { computeTargets, dayTotals, suggestMeals } from "./guide/nutrition.js";
import { DEFAULT_PROFILE, getProfile } from "./guide/profile.js";
import { exerciseHistory, muscleBalance, nextProgramDay, progressionAdvice, recommendedProgram } from "./guide/training.js";

export const api = Router();

const today = (req: Request) => (isDate(req.query.date) ? req.query.date : serverToday());
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = z.coerce.number().finite();
const optNum = num.nullable().optional();

/**
 * Simple tables share one CRUD implementation. Each schema whitelists the
 * columns a client may write, so request bodies can't touch anything else.
 */
const resources = {
  body_metrics: { schema: z.object({ date, weight_kg: optNum, body_fat: optNum, waist_cm: optNum }), order: "date DESC, id DESC" },
  meals: { schema: z.object({ date, meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]), name: z.string().min(1), calories: num, protein: num, carbs: num, fat: num }), order: "date DESC, id" },
  water_logs: { schema: z.object({ date, ml: z.coerce.number().int() }), order: "date DESC, id DESC" },
  goals: {
    schema: z.object({
      title: z.string().min(1), area: z.string(), why: z.string().default(""), metric: z.string().default(""),
      start_value: num.default(0), current_value: num.default(0), target_value: num.default(100), unit: z.string().default("%"),
      deadline: date.nullable().optional(), status: z.enum(["active", "done", "dropped"]).default("active"),
    }),
    order: "status = 'active' DESC, deadline IS NULL, deadline",
  },
  habits: { schema: z.object({ name: z.string().min(1), area: z.string(), cue: z.string().default(""), target_per_week: z.coerce.number().int().min(1).max(7).default(7), archived: z.coerce.number().int().default(0) }), order: "id" },
  journal: { schema: z.object({ date, mood: z.coerce.number().int().min(1).max(5).nullable().optional(), energy: z.coerce.number().int().min(1).max(5).nullable().optional(), gratitude: z.string().default(""), wins: z.string().default(""), entry: z.string().default("") }), order: "date DESC, id DESC" },
  learning: { schema: z.object({ kind: z.enum(["book", "course", "skill"]), title: z.string().min(1), status: z.enum(["planned", "active", "done"]).default("planned"), progress: z.coerce.number().int().min(0).max(100).default(0), notes: z.string().default("") }), order: "status = 'active' DESC, status = 'planned' DESC, id DESC" },
  practice_logs: { schema: z.object({ learning_id: z.coerce.number().int().nullable().optional(), date, minutes: z.coerce.number().int().min(1), note: z.string().default("") }), order: "date DESC, id DESC" },
  focus_sessions: { schema: z.object({ date, minutes: z.coerce.number().int().min(1), task: z.string().default("") }), order: "date DESC, id DESC" },
  challenge_logs: { schema: z.object({ challenge_key: z.string(), date, reflection: z.string().default("") }), order: "date DESC, id DESC" },
  exercises: { schema: z.object({ name: z.string().min(1), muscle: z.string(), equipment: z.string().default("bodyweight"), category: z.enum(["strength", "cardio", "mobility"]).default("strength"), instructions: z.string().default("") }), order: "muscle, name" },
} satisfies Record<string, { schema: z.ZodObject; order: string }>;

type ResourceName = keyof typeof resources;
const isResource = (name: string): name is ResourceName => name in resources;
const hasDate = (name: ResourceName) => "date" in resources[name].schema.shape;

api.get("/data/:resource", async (req, res) => {
  const name = req.params.resource;
  if (!isResource(name)) return res.status(404).json({ error: "Unknown resource" });
  const where: string[] = [];
  const params: unknown[] = [];
  if (hasDate(name) && isDate(req.query.from)) { where.push("date >= ?"); params.push(req.query.from); }
  if (hasDate(name) && isDate(req.query.to)) { where.push("date <= ?"); params.push(req.query.to); }
  const sql = `SELECT * FROM ${name} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${resources[name].order} LIMIT 2000`;
  res.json(await all(sql, params as never));
});

api.post("/data/:resource", async (req, res) => {
  const name = req.params.resource;
  if (!isResource(name)) return res.status(404).json({ error: "Unknown resource" });
  const parsed = resources[name].schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  const data = parsed.data as Record<string, unknown>;
  const cols = Object.keys(data);
  const info = await run(`INSERT INTO ${name} (${cols.join(",")}) VALUES (${cols.map((c) => "@" + c).join(",")})`, nullify(data));
  res.status(201).json(await get(`SELECT * FROM ${name} WHERE id = ?`, [info.lastInsertRowid]));
});

api.put("/data/:resource/:id", async (req, res) => {
  const name = req.params.resource;
  if (!isResource(name)) return res.status(404).json({ error: "Unknown resource" });
  const parsed = resources[name].schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  // partial() still applies defaults, so only write the fields the client actually sent
  const data = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => k in req.body));
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: "Nothing to update" });
  await run(`UPDATE ${name} SET ${cols.map((c) => `${c} = @${c}`).join(",")} WHERE id = @id`, nullify({ ...data, id: Number(req.params.id) }));
  res.json(await get(`SELECT * FROM ${name} WHERE id = ?`, [Number(req.params.id)]));
});

// Child rows are deleted explicitly: SQLite only cascades when foreign_keys is on for the connection.
const CHILDREN: Partial<Record<ResourceName, [string, string]>> = {
  learning: ["practice_logs", "learning_id"],
  habits: ["habit_logs", "habit_id"],
};

api.delete("/data/:resource/:id", async (req, res) => {
  const name = req.params.resource;
  if (!isResource(name)) return res.status(404).json({ error: "Unknown resource" });
  const id = Number(req.params.id);
  const child = CHILDREN[name];
  const stmts: InStatement[] = [{ sql: `DELETE FROM ${name} WHERE id = ?`, args: [id] }];
  if (child) stmts.unshift({ sql: `DELETE FROM ${child[0]} WHERE ${child[1]} = ?`, args: [id] });
  await db.batch(stmts, "write");
  res.json({ ok: true });
});

// ---- Profile
const profileSchema = z.object({
  name: z.string(), sex: z.enum(["male", "female"]), birth_year: z.coerce.number().int().min(1900).max(2100).nullable(),
  height_cm: optNum.transform((v) => v ?? null), weight_kg: optNum.transform((v) => v ?? null),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  fitness_goal: z.enum(["lose", "maintain", "gain"]), experience: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.enum(["home", "gym"]), training_days: z.coerce.number().int().min(1).max(7),
  diet: z.enum(["veg", "egg", "nonveg"]), program: z.string().nullable(), vision: z.string(),
}).partial();

api.get("/profile", async (_req, res) => res.json(await getProfile()));
api.put("/profile", async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const merged = { ...DEFAULT_PROFILE, ...(await getProfile()), ...parsed.data };
  await setKV("profile", merged);
  res.json(merged);
});

// ---- Workouts (with nested sets)
const workoutSchema = z.object({
  date, name: z.string().min(1), duration_min: z.coerce.number().int().nullable().optional(), notes: z.string().default(""),
  sets: z.array(z.object({ exercise_id: z.coerce.number().int(), reps: optNum, weight: optNum, minutes: optNum })).default([]),
});

function saveWorkout(id: number | null, body: z.infer<typeof workoutSchema>) {
  return transaction(async (tx) => {
    const { sets, ...w } = body;
    const row = { duration_min: null, ...w };
    if (id) {
      await run("UPDATE workouts SET date=@date, name=@name, duration_min=@duration_min, notes=@notes WHERE id=@id", { ...row, id }, tx);
      await run("DELETE FROM workout_sets WHERE workout_id = ?", [id], tx);
    } else {
      id = (await run("INSERT INTO workouts (date, name, duration_min, notes) VALUES (@date, @name, @duration_min, @notes)", row, tx)).lastInsertRowid;
    }
    const counters = new Map<number, number>();
    for (const s of sets) {
      const n = (counters.get(s.exercise_id) ?? 0) + 1;
      counters.set(s.exercise_id, n);
      await run("INSERT INTO workout_sets (workout_id, exercise_id, set_no, reps, weight, minutes) VALUES (?, ?, ?, ?, ?, ?)",
        [id, s.exercise_id, n, s.reps ?? null, s.weight ?? null, s.minutes ?? null], tx);
    }
    return id;
  });
}

async function loadWorkouts(where: string, params: (string | number)[]) {
  const workouts = await all<Row & { id: number }>(`SELECT * FROM workouts ${where} ORDER BY date DESC, id DESC LIMIT 200`, params);
  if (!workouts.length) return [];
  const ids = workouts.map((w) => w.id);
  const sets = await all<Row & { workout_id: number }>(
    `SELECT s.*, e.name exercise, e.muscle FROM workout_sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE workout_id IN (${ids.map(() => "?").join(",")}) ORDER BY s.id`,
    ids,
  );
  return workouts.map((w) => ({ ...w, sets: sets.filter((s) => s.workout_id === w.id) }));
}

api.get("/workouts", async (req, res) => {
  const from = isDate(req.query.from) ? req.query.from : "0000-01-01";
  const to = isDate(req.query.to) ? req.query.to : "9999-12-31";
  res.json(await loadWorkouts("WHERE date >= ? AND date <= ?", [from, to]));
});
api.post("/workouts", async (req, res) => {
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const id = await saveWorkout(null, parsed.data);
  res.status(201).json((await loadWorkouts("WHERE id = ?", [id]))[0]);
});
api.put("/workouts/:id", async (req, res) => {
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const id = await saveWorkout(Number(req.params.id), parsed.data);
  res.json((await loadWorkouts("WHERE id = ?", [id]))[0]);
});
api.delete("/workouts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.batch([
    { sql: "DELETE FROM workout_sets WHERE workout_id = ?", args: [id] },
    { sql: "DELETE FROM workouts WHERE id = ?", args: [id] },
  ], "write");
  res.json({ ok: true });
});
api.get("/exercises/:id/history", async (req, res) => res.json(await exerciseHistory(Number(req.params.id))));

// ---- Habits: toggle today's check-in
api.post("/habits/:id/toggle", async (req, res) => {
  const d = isDate(req.body?.date) ? req.body.date : serverToday();
  const id = Number(req.params.id);
  const exists = await get("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?", [id, d]);
  if (exists) await run("DELETE FROM habit_logs WHERE habit_id = ? AND date = ?", [id, d]);
  else await run("INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)", [id, d]);
  res.json({ done: !exists });
});
api.get("/habits/status", async (req, res) => res.json(await habitStatuses(today(req))));
api.get("/goals/insights", async (req, res) => res.json(await goalInsights(today(req))));

// ---- Guide (rule-based coaching)
api.get("/guide/today", async (req, res) => res.json(await todayBriefing(today(req))));
api.get("/guide/weekly", async (req, res) => res.json(await weeklyReview(today(req))));
api.get("/guide/fitness", async (req, res) => {
  const program = await recommendedProgram();
  const [nextDay, progression, balance] = await Promise.all([nextProgramDay(program), progressionAdvice(today(req)), muscleBalance(today(req))]);
  res.json({ program, nextDay, programs: PROGRAMS, progression, balance });
});
api.get("/guide/nutrition", async (req, res) => {
  const profile = await getProfile();
  const [targets, totals] = await Promise.all([computeTargets(profile), dayTotals(today(req))]);
  const ideas = targets
    ? suggestMeals({ calories: targets.calories - totals.calories, protein: targets.protein - totals.protein }, profile.diet)
    : [];
  res.json({ targets, totals, ideas, meals: MEAL_IDEAS });
});
api.get("/guide/content", (_req, res) => res.json({ challenges: CHALLENGES, lessons: LESSONS }));

// ---- Backup
const BACKUP_TABLES = ["exercises", "workouts", "workout_sets", "body_metrics", "meals", "water_logs", "goals", "habits", "habit_logs", "journal", "learning", "practice_logs", "focus_sessions", "challenge_logs", "coach_messages"] as const;

api.get("/backup", async (_req, res) => {
  const data: Record<string, unknown> = { version: 1, exported_at: new Date().toISOString(), profile: await getProfile() };
  for (const t of BACKUP_TABLES) data[t] = await all(`SELECT * FROM ${t}`);
  res.setHeader("Content-Disposition", `attachment; filename="ascend-backup-${serverToday()}.json"`);
  res.json(data);
});

api.post("/restore", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (body?.version !== 1) return res.status(400).json({ error: "Not an Ascend backup file" });
  const columns = new Map<string, string[]>();
  for (const t of BACKUP_TABLES) columns.set(t, (await all<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
  const stmts: InStatement[] = [...BACKUP_TABLES].reverse().map((t) => ({ sql: `DELETE FROM ${t}`, args: [] }));
  for (const t of BACKUP_TABLES) {
    const rows = Array.isArray(body[t]) ? (body[t] as Record<string, unknown>[]) : [];
    for (const r of rows) {
      const keys = Object.keys(r).filter((k) => columns.get(t)!.includes(k));
      if (!keys.length) continue;
      stmts.push({ sql: `INSERT INTO ${t} (${keys.join(",")}) VALUES (${keys.map((k) => "@" + k).join(",")})`, args: nullify(Object.fromEntries(keys.map((k) => [k, r[k]]))) });
    }
  }
  if (body.profile) stmts.push({ sql: "INSERT INTO kv (key, value) VALUES ('profile', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", args: [JSON.stringify(body.profile)] });
  await db.batch(stmts, "write"); // one atomic batch: all or nothing
  res.json({ ok: true });
});

/** libSQL rejects `undefined` values; store them as NULL. */
function nullify(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v])) as Record<string, string | number | null>;
}
