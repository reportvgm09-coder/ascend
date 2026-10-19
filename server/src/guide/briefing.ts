import { db } from "../db.js";
import { addDays } from "./dates.js";
import {
  challengeCount, dailyChallenges, dailyLesson, focusMinutes, goalInsights,
  habitScore, habitStatuses, learningStats, moodStats,
} from "./growth.js";
import { computeTargets, dayNutritionScore, dayTotals, suggestMeals } from "./nutrition.js";
import { getProfile, isProfileComplete } from "./profile.js";
import { muscleBalance, nextProgramDay, progressionAdvice, recommendedProgram, workoutDates } from "./training.js";

export interface Recommendation {
  area: "fitness" | "nutrition" | "discipline" | "mindset" | "confidence" | "knowledge" | "setup";
  priority: 1 | 2 | 3; // 1 = do this first
  title: string;
  detail: string;
  link?: string;
}

const pct = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

export function areaScores(today: string) {
  const profile = getProfile();
  const from = addDays(today, -6);
  const targets = computeTargets(profile);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const mood = moodStats(today);
  return {
    fitness: pct((workoutDates(from, today).length / Math.max(1, profile.training_days)) * 100),
    nutrition: pct(days.reduce((s, d) => s + dayNutritionScore(d, targets), 0) / 7),
    discipline: pct(habitScore(habitStatuses(today)) * 0.7 + Math.min(1, focusMinutes(from, today) / 300) * 30),
    mindset: pct((mood.journalDays7 / 7) * 70 + (mood.mood7 ? ((mood.mood7 - 1) / 4) * 30 : 0)),
    knowledge: pct((learningStats(today).minutes7 / 150) * 100),
    confidence: pct((challengeCount(from, today, "confidence") / 4) * 100),
  };
}

export function todayBriefing(today: string) {
  const profile = getProfile();
  const recs: Recommendation[] = [];
  const targets = computeTargets(profile);
  const totals = dayTotals(today);

  if (!isProfileComplete(profile)) {
    recs.push({ area: "setup", priority: 1, title: "Complete your profile", detail: "Add your age, height and weight so I can calculate your calorie and protein targets and pick a training program for you.", link: "/settings" });
  }

  // --- Fitness
  const program = recommendedProgram();
  const next = nextProgramDay(program);
  const recent = workoutDates(addDays(today, -6), today);
  const trainedToday = recent.includes(today);
  const lastWorkout = (db.prepare("SELECT MAX(date) d FROM workouts WHERE date <= ?").get(today) as { d: string | null }).d;
  if (!trainedToday) {
    const remaining = profile.training_days - recent.length;
    if (remaining > 0) {
      recs.push({
        area: "fitness",
        priority: lastWorkout && lastWorkout >= addDays(today, -1) ? 3 : 2,
        title: `Train: ${next.name}`,
        detail: `${remaining} of ${profile.training_days} sessions left this week (${program.name}). Today: ${next.exercises.map((e) => e.name).join(", ")}.`,
        link: "/fitness",
      });
    } else {
      recs.push({ area: "fitness", priority: 3, title: "Active recovery", detail: "You've hit your training target for the week. Go for a 20–30 min walk or do a mobility flow to recover.", link: "/fitness" });
    }
  }
  if (recent.length >= 2) {
    const neglected = muscleBalance(today).filter((m) => m.sets === 0).map((m) => m.muscle);
    if (neglected.length && neglected.length < 6) {
      recs.push({ area: "fitness", priority: 3, title: "Balance your training", detail: `No sets for ${neglected.join(", ")} in the last 7 days. Add at least 6 sets for each.`, link: "/fitness" });
    }
  }
  const ready = progressionAdvice(today).filter((a) => a.action === "increase").slice(0, 2);
  for (const a of ready) recs.push({ area: "fitness", priority: 3, title: `Level up: ${a.exercise}`, detail: a.detail, link: "/fitness" });

  // --- Nutrition
  if (targets) {
    const remaining = { calories: targets.calories - totals.calories, protein: targets.protein - totals.protein };
    if (totals.meals === 0) {
      recs.push({ area: "nutrition", priority: 2, title: "Log your meals", detail: `Your target today is ${targets.calories} kcal with ${targets.protein} g protein. Tracking, even roughly, is the biggest lever for changing body composition.`, link: "/nutrition" });
    } else if (remaining.protein > 25) {
      const ideas = suggestMeals(remaining, profile.diet).map((m) => `${m.name} (${m.protein} g)`);
      recs.push({ area: "nutrition", priority: 2, title: `${Math.round(remaining.protein)} g protein to go`, detail: `You have ${Math.max(0, Math.round(remaining.calories))} kcal left. Ideas: ${ideas.join("; ") || "add a protein-rich snack"}.`, link: "/nutrition" });
    } else if (remaining.calories < -200) {
      recs.push({ area: "nutrition", priority: 3, title: "Over target today", detail: `You're ${Math.round(-remaining.calories)} kcal over. No guilt: take a walk, and get back on plan tomorrow. Your weekly average is what counts.`, link: "/nutrition" });
    }
    if (totals.water_ml < targets.water_ml * 0.5) {
      recs.push({ area: "nutrition", priority: 3, title: "Drink water", detail: `${totals.water_ml} / ${targets.water_ml} ml so far. Keep a bottle within reach.`, link: "/nutrition" });
    }
  }

  // --- Habits & discipline
  const habits = habitStatuses(today);
  for (const h of habits.filter((h) => !h.done_today && h.streak >= 3)) {
    recs.push({ area: "discipline", priority: 1, title: `Protect your ${h.streak}-day streak: ${h.name}`, detail: h.cue ? `Your cue: ${h.cue}.` : "Do even a tiny version of it today. Never miss twice.", link: "/goals" });
  }
  if (!habits.length) {
    recs.push({ area: "discipline", priority: 2, title: "Create your first habit", detail: "Start small: a habit that takes under 2 minutes (e.g. \"read 1 page\", \"10 push-ups\"). Attach it to a cue: \"After I brush my teeth, I will…\"", link: "/goals" });
  }
  if (focusMinutes(today, today) === 0) {
    recs.push({ area: "discipline", priority: 3, title: "One deep-work block", detail: "Do 25 focused minutes on your most important task, with your phone in another room.", link: "/mind" });
  }

  // --- Goals
  for (const g of goalInsights(today)) {
    if (g.behind) recs.push({ area: "discipline", priority: 2, title: `Behind on: ${g.title}`, detail: `${g.progress}% done, but ${g.expected}% of the time has passed. What's the smallest next step you can take today?`, link: "/goals" });
    else if (g.daysLeft !== null && g.daysLeft >= 0 && g.daysLeft <= 7) recs.push({ area: "discipline", priority: 2, title: `Deadline in ${g.daysLeft} days: ${g.title}`, detail: `${g.progress}% complete. Plan the final push.`, link: "/goals" });
  }

  // --- Mindset
  const mood = moodStats(today);
  if (mood.mood3 !== null && mood.mood3 <= 2.5) {
    recs.push({ area: "mindset", priority: 1, title: "Your mood has been low", detail: "Be gentle with yourself. Try 4 rounds of box breathing, a walk outside, and talking to someone you trust. If it lasts more than two weeks, please consider speaking to a professional. That's a sign of strength.", link: "/mind" });
  }
  if (!mood.journaledToday) {
    recs.push({ area: "mindset", priority: 3, title: "Daily reflection", detail: "Take 3 minutes: how's your mood, 3 things you're grateful for, and today's win.", link: "/mind" });
  }

  // --- Learning
  const learning = learningStats(today);
  if (!learning.active.length) {
    recs.push({ area: "knowledge", priority: 3, title: "Pick something to learn", detail: "Add a book, course or skill you're actively working on. 20 minutes a day adds up to 120+ hours a year.", link: "/learn" });
  } else if (learning.stale.length) {
    recs.push({ area: "knowledge", priority: 2, title: `Resume: ${learning.stale[0].title}`, detail: "It's been 3+ days. Even 15 minutes keeps the momentum (and your memory) alive.", link: "/learn" });
  }

  return {
    profileName: profile.name,
    scores: areaScores(today),
    recommendations: recs.sort((a, b) => a.priority - b.priority),
    challenges: dailyChallenges(today),
    lesson: dailyLesson(today),
    nutrition: { targets, totals },
    habits,
    nextWorkout: { program: program.name, day: next },
  };
}

export function weeklyReview(today: string) {
  const range = (end: string) => ({ from: addDays(end, -6), to: end });
  const stats = (r: { from: string; to: string }) => {
    const cal = db.prepare("SELECT AVG(c) v FROM (SELECT SUM(calories) c FROM meals WHERE date BETWEEN ? AND ? GROUP BY date)").get(r.from, r.to) as { v: number | null };
    const protein = db.prepare("SELECT AVG(p) v FROM (SELECT SUM(protein) p FROM meals WHERE date BETWEEN ? AND ? GROUP BY date)").get(r.from, r.to) as { v: number | null };
    const mood = db.prepare("SELECT AVG(mood) v, COUNT(DISTINCT date) n FROM journal WHERE date BETWEEN ? AND ?").get(r.from, r.to) as { v: number | null; n: number };
    const learn = db.prepare("SELECT COALESCE(SUM(minutes),0) v FROM practice_logs WHERE date BETWEEN ? AND ?").get(r.from, r.to) as { v: number };
    const habitsDone = db.prepare("SELECT COUNT(*) v FROM habit_logs WHERE date BETWEEN ? AND ?").get(r.from, r.to) as { v: number };
    const weight = db.prepare("SELECT AVG(weight_kg) v FROM body_metrics WHERE date BETWEEN ? AND ?").get(r.from, r.to) as { v: number | null };
    return {
      workouts: workoutDates(r.from, r.to).length,
      avgCalories: cal.v ? Math.round(cal.v) : null,
      avgProtein: protein.v ? Math.round(protein.v) : null,
      habitChecks: habitsDone.v,
      journalDays: mood.n,
      avgMood: mood.v ? Math.round(mood.v * 10) / 10 : null,
      learningMinutes: learn.v,
      focusMinutes: focusMinutes(r.from, r.to),
      challenges: challengeCount(r.from, r.to),
      avgWeight: weight.v ? Math.round(weight.v * 10) / 10 : null,
    };
  };
  const thisWeek = stats(range(today));
  const lastWeek = stats(range(addDays(today, -7)));

  const wins: string[] = [];
  const focus: string[] = [];
  const better = (k: keyof typeof thisWeek) => (thisWeek[k] ?? 0) > (lastWeek[k] ?? 0);
  const profile = getProfile();

  if (thisWeek.workouts >= profile.training_days) wins.push(`Hit your training target: ${thisWeek.workouts} sessions.`);
  else focus.push(`Training: ${thisWeek.workouts}/${profile.training_days} sessions. Put your workouts in your calendar like meetings.`);
  if (better("habitChecks")) wins.push(`More habit check-ins than last week (${thisWeek.habitChecks} vs ${lastWeek.habitChecks}).`);
  if (better("learningMinutes")) wins.push(`Learned for ${thisWeek.learningMinutes} min, up from ${lastWeek.learningMinutes}.`);
  else if (thisWeek.learningMinutes < 100) focus.push("Learning: schedule a daily 20-minute learning slot.");
  if (thisWeek.journalDays >= 5) wins.push(`Reflected on ${thisWeek.journalDays} days. Strong self-awareness.`);
  else focus.push("Mindset: journal at least 5 days. Try right after dinner.");
  if (thisWeek.challenges >= 4) wins.push(`Completed ${thisWeek.challenges} growth challenges.`);
  else focus.push("Personality: take on at least 4 daily challenges this week. Growth happens just outside your comfort zone.");
  const targets = computeTargets(profile);
  if (targets && thisWeek.avgProtein !== null) {
    if (thisWeek.avgProtein >= targets.protein * 0.9) wins.push(`Protein on point (avg ${thisWeek.avgProtein} g).`);
    else focus.push(`Nutrition: average protein was ${thisWeek.avgProtein} g (target ${targets.protein} g). Add one protein source to every meal.`);
  }
  if (thisWeek.avgWeight && lastWeek.avgWeight) {
    const delta = Math.round((thisWeek.avgWeight - lastWeek.avgWeight) * 10) / 10;
    const onTrack = profile.fitness_goal === "lose" ? delta < 0 : profile.fitness_goal === "gain" ? delta > 0 : Math.abs(delta) <= 0.5;
    (onTrack ? wins : focus).push(`Average weight changed ${delta > 0 ? "+" : ""}${delta} kg week over week${onTrack ? ", on track for your goal." : ". Adjust calories by about 150 kcal."}`);
  }

  return { thisWeek, lastWeek, wins, focus };
}
