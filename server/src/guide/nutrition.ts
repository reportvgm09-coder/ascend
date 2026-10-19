import { get } from "../db.js";
import { MEAL_IDEAS } from "./content.js";
import { getProfile, latestWeight, type Profile } from "./profile.js";

const ACTIVITY_FACTOR: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
  explanation: string[];
}

/** Mifflin-St Jeor BMR -> TDEE -> goal-adjusted calories and macros. */
export async function computeTargets(profile?: Profile): Promise<NutritionTargets | null> {
  profile ??= await getProfile();
  const weight = await latestWeight();
  if (!weight || !profile.height_cm || !profile.birth_year) return null;
  const age = new Date().getFullYear() - profile.birth_year;
  const bmr = Math.round(
    10 * weight + 6.25 * profile.height_cm - 5 * age + (profile.sex === "male" ? 5 : -161),
  );
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[profile.activity]);
  const adjust = { lose: -0.2, maintain: 0, gain: 0.1 }[profile.fitness_goal];
  const calories = Math.round((tdee * (1 + adjust)) / 10) * 10;
  const proteinPerKg = { lose: 2.0, maintain: 1.6, gain: 1.8 }[profile.fitness_goal];
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water_ml = Math.round((weight * 35) / 250) * 250;

  const explanation = [
    `Your BMR (the energy your body uses at rest) is about ${bmr} kcal (Mifflin-St Jeor formula, age ${age}).`,
    `With your activity level (${profile.activity.replace("_", " ")}), you burn about ${tdee} kcal/day (TDEE).`,
    profile.fitness_goal === "lose"
      ? `To lose fat, eat about 20% below that, ${calories} kcal. That works out to roughly 0.5–0.75% of body weight per week.`
      : profile.fitness_goal === "gain"
        ? `To build muscle, eat about 10% above that, ${calories} kcal. That's a lean surplus that limits fat gain.`
        : `To maintain, eat about ${calories} kcal.`,
    `Protein: ${proteinPerKg} g per kg of body weight = ${protein} g. It protects and builds muscle and keeps you full.`,
    `Fat ≈ 27% of calories (${fat} g) for hormones. Carbs fill the rest (${carbs} g) to fuel training.`,
    `Water: about 35 ml per kg = ${water_ml} ml. Drink more on training days and hot days.`,
  ];
  return { bmr, tdee, calories, protein, carbs, fat, water_ml, explanation };
}

export async function dayTotals(date: string) {
  const t = (await get<{ calories: number; protein: number; carbs: number; fat: number; meals: number }>(
    `SELECT COALESCE(SUM(calories),0) calories, COALESCE(SUM(protein),0) protein,
            COALESCE(SUM(carbs),0) carbs, COALESCE(SUM(fat),0) fat, COUNT(*) meals
     FROM meals WHERE date = ?`,
    [date],
  ))!;
  const water = (await get<{ ml: number }>("SELECT COALESCE(SUM(ml),0) ml FROM water_logs WHERE date = ?", [date]))!;
  return { ...t, water_ml: water.ml };
}

/** Score 0-100 for one day: half for hitting calories (±10%), half for protein. */
export async function dayNutritionScore(date: string, targets: NutritionTargets | null): Promise<number> {
  const t = await dayTotals(date);
  if (!targets || t.meals === 0) return 0;
  const calDiff = Math.abs(t.calories - targets.calories) / targets.calories;
  const calScore = calDiff <= 0.1 ? 1 : Math.max(0, 1 - (calDiff - 0.1) * 3);
  const proScore = Math.min(1, t.protein / (targets.protein * 0.9));
  return Math.round(50 * calScore + 50 * proScore);
}

export function suggestMeals(remaining: { calories: number; protein: number }, diet: Profile["diet"]) {
  const allowed = MEAL_IDEAS.filter((m) =>
    diet === "nonveg" ? true : diet === "egg" ? m.veg || /egg/i.test(m.name) : m.veg,
  );
  return allowed
    .filter((m) => m.calories <= remaining.calories + 100)
    .sort((a, b) => b.protein / b.calories - a.protein / a.calories)
    .slice(0, 3);
}
