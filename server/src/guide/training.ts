import { db } from "../db.js";
import { PROGRAMS, type Program } from "./content.js";
import { addDays } from "./dates.js";
import { MUSCLE_GROUPS } from "./exercises.js";
import { getProfile } from "./profile.js";

interface SetRow {
  workout_id: number;
  date: string;
  exercise_id: number;
  exercise: string;
  muscle: string;
  category: string;
  reps: number | null;
  weight: number | null;
}

export const estimate1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

export function recommendedProgram(): Program {
  const p = getProfile();
  const chosen = PROGRAMS.find((x) => x.key === p.program);
  if (chosen) return chosen;
  if (p.experience === "beginner") return PROGRAMS.find((x) => x.key === (p.equipment === "home" ? "home-beginner" : "gym-beginner"))!;
  if (p.experience === "intermediate" || p.training_days <= 4) return PROGRAMS.find((x) => x.key === "upper-lower")!;
  return PROGRAMS.find((x) => x.key === "ppl")!;
}

/** Next day in the program: the one after the most recent workout whose name matches a program day. */
export function nextProgramDay(program: Program) {
  const names = program.days.map((d) => d.name);
  const last = db
    .prepare(`SELECT name FROM workouts WHERE name IN (${names.map(() => "?").join(",")}) ORDER BY date DESC, id DESC LIMIT 1`)
    .get(...names) as { name: string } | undefined;
  const idx = last ? (names.indexOf(last.name) + 1) % names.length : 0;
  return program.days[idx];
}

/**
 * Double progression: train within a rep range; once every working set reaches
 * the top of the range, increase the load. Bodyweight work progresses by reps,
 * then by a harder variation.
 */
export function progressionAdvice(today: string) {
  const rows = db
    .prepare(
      `SELECT s.workout_id, w.date, s.exercise_id, e.name exercise, e.muscle, e.category, s.reps, s.weight
       FROM workout_sets s JOIN workouts w ON w.id = s.workout_id JOIN exercises e ON e.id = s.exercise_id
       WHERE w.date >= ? AND e.category = 'strength'
       ORDER BY w.date DESC, w.id DESC, s.set_no`,
    )
    .all(addDays(today, -42)) as SetRow[];

  const byExercise = new Map<number, SetRow[]>();
  for (const r of rows) {
    const list = byExercise.get(r.exercise_id) ?? [];
    // keep only the most recent session for each exercise
    if (list.length && list[0].workout_id !== r.workout_id) continue;
    list.push(r);
    byExercise.set(r.exercise_id, list);
  }

  const advice: { exercise: string; date: string; last: string; action: "increase" | "add_reps" | "hold"; detail: string }[] = [];
  for (const sets of byExercise.values()) {
    const { exercise, date, muscle } = sets[0];
    const reps = sets.map((s) => s.reps ?? 0);
    const weight = Math.max(...sets.map((s) => s.weight ?? 0));
    const minReps = Math.min(...reps);
    const last = sets.map((s) => (s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps}`)).join(", ");
    const bodyweight = weight === 0;
    const top = bodyweight ? 15 : 12;
    if (minReps >= top) {
      const inc = muscle === "legs" || exercise === "Deadlift" ? 5 : 2.5;
      advice.push({
        exercise, date, last, action: "increase",
        detail: bodyweight
          ? `All sets reached ${top}+ reps. Move to a harder variation, or add weight with a backpack.`
          : `Every set reached ${top} reps. Next time use ${weight + inc} kg and aim for 8 reps.`,
      });
    } else if (minReps > 0 && minReps < (bodyweight ? 5 : 6)) {
      advice.push({
        exercise, date, last, action: "hold",
        detail: bodyweight
          ? "Reps are low, so use an easier variation (incline push-ups, band-assisted pull-ups) and build up."
          : `Reps dropped below 6. Keep ${weight} kg until every set reaches 8. If you stay stuck for 2 sessions, drop 10%.`,
      });
    } else if (minReps > 0) {
      advice.push({
        exercise, date, last, action: "add_reps",
        detail: `Same ${bodyweight ? "variation" : `${weight} kg`}. Try to beat ${reps.join("/")} by adding 1 rep to at least one set.`,
      });
    }
  }
  const order = { increase: 0, hold: 1, add_reps: 2 };
  return advice.sort((a, b) => order[a.action] - order[b.action]);
}

export function muscleBalance(today: string) {
  const rows = db
    .prepare(
      `SELECT e.muscle, COUNT(*) sets FROM workout_sets s
       JOIN workouts w ON w.id = s.workout_id JOIN exercises e ON e.id = s.exercise_id
       WHERE w.date > ? AND w.date <= ? GROUP BY e.muscle`,
    )
    .all(addDays(today, -7), today) as { muscle: string; sets: number }[];
  const map = Object.fromEntries(rows.map((r) => [r.muscle, r.sets]));
  return MUSCLE_GROUPS.map((m) => ({ muscle: m, sets: map[m] ?? 0 }));
}

export function workoutDates(from: string, to: string): string[] {
  return (db.prepare("SELECT DISTINCT date FROM workouts WHERE date >= ? AND date <= ? ORDER BY date").all(from, to) as { date: string }[]).map((r) => r.date);
}

export function exerciseHistory(exerciseId: number) {
  return db
    .prepare(
      `SELECT w.date, MAX(s.weight) top_weight, MAX(s.reps) top_reps,
              MAX(COALESCE(s.weight,0) * (1 + COALESCE(s.reps,0) / 30.0)) est_1rm,
              SUM(COALESCE(s.weight,0) * COALESCE(s.reps,0)) volume
       FROM workout_sets s JOIN workouts w ON w.id = s.workout_id
       WHERE s.exercise_id = ? GROUP BY w.id ORDER BY w.date`,
    )
    .all(exerciseId);
}
