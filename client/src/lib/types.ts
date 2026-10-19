export type Area = "fitness" | "nutrition" | "discipline" | "mindset" | "confidence" | "knowledge" | "setup";

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

export interface Exercise { id: number; name: string; muscle: string; equipment: string; category: "strength" | "cardio" | "mobility"; instructions: string; custom: number }
export interface WorkoutSet { id?: number; exercise_id: number; exercise?: string; muscle?: string; set_no?: number; reps: number | null; weight: number | null; minutes: number | null }
export interface Workout { id: number; date: string; name: string; duration_min: number | null; notes: string; sets: WorkoutSet[] }
export interface ProgramDay { name: string; exercises: { name: string; sets: number; reps: string }[] }
export interface Program { key: string; name: string; level: string; daysPerWeek: number; summary: string; days: ProgramDay[] }
export interface Progression { exercise: string; date: string; last: string; action: "increase" | "add_reps" | "hold"; detail: string }

export interface Targets { bmr: number; tdee: number; calories: number; protein: number; carbs: number; fat: number; water_ml: number; explanation: string[] }
export interface Totals { calories: number; protein: number; carbs: number; fat: number; meals: number; water_ml: number }
export interface Meal { id: number; date: string; meal_type: string; name: string; calories: number; protein: number; carbs: number; fat: number }
export interface MealIdea { name: string; type: string; calories: number; protein: number; carbs: number; fat: number; veg: boolean }

export interface Habit { id: number; name: string; area: string; cue: string; target_per_week: number; done_today: boolean; streak: number; week_count: number; last7: boolean[] }
export interface Goal {
  id: number; title: string; area: string; why: string; metric: string; start_value: number; current_value: number; target_value: number;
  unit: string; deadline: string | null; status: "active" | "done" | "dropped"; created_at: string;
  progress?: number; expected?: number | null; daysLeft?: number | null; behind?: boolean;
}
export interface JournalEntry { id: number; date: string; mood: number | null; energy: number | null; gratitude: string; wins: string; entry: string }
export interface LearningItem { id: number; kind: "book" | "course" | "skill"; title: string; status: "planned" | "active" | "done"; progress: number; notes: string }
export interface PracticeLog { id: number; learning_id: number | null; date: string; minutes: number; note: string }
export interface Challenge { key: string; area: Area; title: string; how: string; level: number; done?: boolean }
export interface Recommendation { area: Area; priority: 1 | 2 | 3; title: string; detail: string; link?: string }

export interface Briefing {
  profileName: string;
  scores: Record<"fitness" | "nutrition" | "discipline" | "mindset" | "knowledge" | "confidence", number>;
  recommendations: Recommendation[];
  challenges: Challenge[];
  lesson: { area: Area; title: string; body: string };
  nutrition: { targets: Targets | null; totals: Totals };
  habits: Habit[];
  nextWorkout: { program: string; day: ProgramDay };
}

export interface WeekStats {
  workouts: number; avgCalories: number | null; avgProtein: number | null; habitChecks: number; journalDays: number;
  avgMood: number | null; learningMinutes: number; focusMinutes: number; challenges: number; avgWeight: number | null;
}
export interface WeeklyReview { thisWeek: WeekStats; lastWeek: WeekStats; wins: string[]; focus: string[] }
