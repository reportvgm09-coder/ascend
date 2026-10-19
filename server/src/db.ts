import { createClient, type InArgs, type InStatement, type Transaction } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { EXERCISE_LIBRARY } from "./guide/exercises.js";

/**
 * libSQL client: a local SQLite file by default, or a hosted Turso database
 * when TURSO_DATABASE_URL is set (free hosts wipe local files on restart).
 */
function databaseUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.REQUIRE_REMOTE_DB) {
    throw new Error("TURSO_DATABASE_URL is not set. Refusing to start: data written to this host's disk would be lost on restart.");
  }
  const dataDir = process.env.DATA_DIR ?? path.resolve("data");
  fs.mkdirSync(dataDir, { recursive: true });
  return "file:" + path.join(dataDir, "ascend.db");
}

export const db = createClient({ url: databaseUrl(), authToken: process.env.TURSO_AUTH_TOKEN });

type Executor = Pick<Transaction, "execute">;
export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InArgs = [], ex: Executor = db): Promise<T[]> {
  const rs = await ex.execute({ sql, args });
  return rs.rows.map((r) => ({ ...r }) as T);
}

export async function get<T = Row>(sql: string, args: InArgs = [], ex: Executor = db): Promise<T | undefined> {
  return (await all<T>(sql, args, ex))[0];
}

export async function run(sql: string, args: InArgs = [], ex: Executor = db) {
  const rs = await ex.execute({ sql, args });
  return { lastInsertRowid: Number(rs.lastInsertRowid ?? 0), changes: rs.rowsAffected };
}

/** Run `fn` inside a write transaction; rolls back if it throws. */
export async function transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await db.transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  muscle TEXT NOT NULL,
  equipment TEXT NOT NULL DEFAULT 'bodyweight',
  category TEXT NOT NULL DEFAULT 'strength',
  instructions TEXT NOT NULL DEFAULT '',
  custom INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_min INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  set_no INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  minutes REAL
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  weight_kg REAL,
  body_fat REAL,
  waist_cm REAL
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'snack',
  name TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS water_logs (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  ml INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'personal',
  why TEXT NOT NULL DEFAULT '',
  metric TEXT NOT NULL DEFAULT '',
  start_value REAL NOT NULL DEFAULT 0,
  current_value REAL NOT NULL DEFAULT 0,
  target_value REAL NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT '%',
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'discipline',
  cue TEXT NOT NULL DEFAULT '',
  target_per_week INTEGER NOT NULL DEFAULT 7,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE IF NOT EXISTS journal (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  mood INTEGER,
  energy INTEGER,
  gratitude TEXT NOT NULL DEFAULT '',
  wins TEXT NOT NULL DEFAULT '',
  entry TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'book',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  progress INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS practice_logs (
  id INTEGER PRIMARY KEY,
  learning_id INTEGER REFERENCES learning(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  task TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS challenge_logs (
  id INTEGER PRIMARY KEY,
  challenge_key TEXT NOT NULL,
  date TEXT NOT NULL,
  reflection TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_sets_workout ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date);
`;

/** Create tables and seed the exercise library. Safe to run on every boot. */
export async function initDb() {
  await db.executeMultiple(SCHEMA);
  const seed: InStatement[] = EXERCISE_LIBRARY.map((e) => ({
    sql: `INSERT OR IGNORE INTO exercises (name, muscle, equipment, category, instructions)
          VALUES (@name, @muscle, @equipment, @category, @instructions)`,
    args: { ...e },
  }));
  await db.batch(seed, "write");
}

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await get<{ value: string }>("SELECT value FROM kv WHERE key = ?", [key]);
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export async function setKV(key: string, value: unknown) {
  await run(
    "INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, JSON.stringify(value)],
  );
}
