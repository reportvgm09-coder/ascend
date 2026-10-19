import { db, getKV } from "../db.js";

export interface Profile {
  name: string;
  sex: "male" | "female";
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitness_goal: "lose" | "maintain" | "gain";
  experience: "beginner" | "intermediate" | "advanced";
  equipment: "home" | "gym";
  training_days: number;
  diet: "veg" | "egg" | "nonveg";
  program: string | null;
  vision: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  sex: "male",
  birth_year: null,
  height_cm: null,
  weight_kg: null,
  activity: "light",
  fitness_goal: "maintain",
  experience: "beginner",
  equipment: "home",
  training_days: 3,
  diet: "veg",
  program: null,
  vision: "",
};

export function getProfile(): Profile {
  return { ...DEFAULT_PROFILE, ...getKV<Partial<Profile>>("profile", {}) };
}

export function isProfileComplete(p: Profile) {
  return Boolean(p.name && p.birth_year && p.height_cm && (p.weight_kg || latestWeight()));
}

/** Latest logged body weight, falling back to the profile value. */
export function latestWeight(): number | null {
  const row = db
    .prepare("SELECT weight_kg FROM body_metrics WHERE weight_kg IS NOT NULL ORDER BY date DESC, id DESC LIMIT 1")
    .get() as { weight_kg: number } | undefined;
  return row?.weight_kg ?? getKV<Partial<Profile>>("profile", {}).weight_kg ?? null;
}
