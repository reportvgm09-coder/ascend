import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { db } from "./db.js";
import { todayBriefing, weeklyReview } from "./guide/briefing.js";
import { addDays, isDate, serverToday } from "./guide/dates.js";
import { goalInsights, learningStats } from "./guide/growth.js";
import { getProfile } from "./guide/profile.js";
import { progressionAdvice } from "./guide/training.js";

const MODEL = process.env.COACH_MODEL ?? "claude-opus-5-5";
const HISTORY_LIMIT = 30;

const SYSTEM_PROMPT = `You are Ascend Coach, the personal guide inside the user's self-improvement app. You coach across six areas: fitness training, nutrition, discipline and productivity, mindset and emotional health, confidence and communication, and knowledge and skills. The goal is the user's overall personal growth.

How to coach:
- Ground your advice in the user's data snapshot, which arrives as a system message after their latest message. Mention specific numbers when they matter ("you've trained twice this week", "protein averaged 82 g against a 130 g target").
- Be warm, direct and practical, like a great personal coach who believes in them. Give concrete next actions with amounts, times and steps instead of generalities.
- Keep answers focused: short paragraphs or brief lists, and usually under 250 words unless they ask for a full plan (a workout program, meal plan or study plan), in which case give a complete, well-structured one.
- Respect their diet preference (veg / egg / non-veg) and equipment (home / gym).
- Use evidence-based guidance: progressive overload, adequate protein, sleep, spaced repetition, implementation intentions, habit stacking, cognitive reframing.
- For injuries, pain, eating disorders, medical conditions or persistent low mood, give general safe guidance and clearly recommend seeing a qualified professional. If they mention self-harm or suicidal thoughts, respond with care, encourage them to contact local emergency services or a crisis line right away, and to reach out to someone they trust.
- Don't invent data you don't have. If something isn't logged, say so and suggest logging it.`;

function snapshot(today: string): string {
  const profile = getProfile();
  const brief = todayBriefing(today);
  const weekly = weeklyReview(today);
  const workouts = db
    .prepare(
      `SELECT w.date, w.name, GROUP_CONCAT(e.name || ' ' || COALESCE(s.weight || 'kg×', '') || COALESCE(s.reps, s.minutes || 'min'), '; ') sets
       FROM workouts w LEFT JOIN workout_sets s ON s.workout_id = w.id LEFT JOIN exercises e ON e.id = s.exercise_id
       WHERE w.date > ? GROUP BY w.id ORDER BY w.date DESC LIMIT 10`,
    )
    .all(addDays(today, -14));
  const journal = db.prepare("SELECT date, mood, energy, wins, substr(entry, 1, 300) entry FROM journal WHERE date > ? ORDER BY date DESC LIMIT 5").all(addDays(today, -7));
  const learning = learningStats(today);

  return JSON.stringify({
    today,
    profile,
    area_scores_last_7_days: brief.scores,
    nutrition_targets: brief.nutrition.targets && { ...brief.nutrition.targets, explanation: undefined },
    nutrition_today: brief.nutrition.totals,
    next_workout: brief.nextWorkout,
    recent_workouts: workouts,
    progression_advice: progressionAdvice(today).slice(0, 6),
    habits: brief.habits.map(({ name, streak, week_count, target_per_week, done_today }) => ({ name, streak, week_count, target_per_week, done_today })),
    goals: goalInsights(today).map(({ title, area, progress, expected, daysLeft, behind, why }) => ({ title, area, progress, expected, daysLeft, behind, why })),
    recent_journal: journal,
    learning_active: learning.active,
    learning_minutes_7d: learning.minutes7,
    weekly_review: weekly,
    todays_rule_based_recommendations: brief.recommendations.map((r) => r.title),
  });
}

export const coachRouter = Router();

coachRouter.get("/status", (_req, res) => {
  res.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
});

coachRouter.get("/messages", (_req, res) => {
  res.json(db.prepare("SELECT * FROM coach_messages ORDER BY id DESC LIMIT 100").all().reverse());
});

coachRouter.delete("/messages", (_req, res) => {
  db.prepare("DELETE FROM coach_messages").run();
  res.json({ ok: true });
});

coachRouter.post("/chat", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "The AI coach isn't configured. Set ANTHROPIC_API_KEY on the server." });
  }
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Message is empty" });
  const today = isDate(req.body?.date) ? req.body.date : serverToday();

  const history = (
    db.prepare("SELECT role, content FROM coach_messages ORDER BY id DESC LIMIT ?").all(HISTORY_LIMIT) as { role: "user" | "assistant"; content: string }[]
  ).reverse();
  // The API requires the conversation to start with a user turn.
  while (history.length && history[0].role !== "user") history.shift();
  db.prepare("INSERT INTO coach_messages (role, content) VALUES ('user', ?)").run(message);

  // The data snapshot goes after the newest user message, so the cached prefix
  // (system prompt + earlier turns) stays byte-identical between requests.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    { role: "user", content: message },
    { role: "system", content: `User data snapshot (JSON):\n${snapshot(today)}` },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (data: unknown) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const client = new Anthropic();
  let text = "";
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages,
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    req.on("close", () => stream.abort());
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text;
        send({ type: "text", text: event.delta.text });
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      const note = (text ? "\n\n" : "") + "I can't help with that one. Let's get back to your goals.";
      text += note;
      send({ type: "text", text: note });
    }
    if (text) db.prepare("INSERT INTO coach_messages (role, content) VALUES ('assistant', ?)").run(text);
    send({ type: "done" });
  } catch (err) {
    let msg = "The coach is unavailable right now. Please try again.";
    if (err instanceof Anthropic.AuthenticationError) msg = "The API key was rejected. Check ANTHROPIC_API_KEY.";
    else if (err instanceof Anthropic.RateLimitError) msg = "Rate limited. Wait a moment and try again.";
    else if (err instanceof Anthropic.APIError) msg = `Coach error (${err.status}): ${err.message}`;
    if (!(err instanceof Anthropic.APIUserAbortError)) {
      console.error("coach error", err);
      send({ type: "error", error: msg });
    }
    if (text) db.prepare("INSERT INTO coach_messages (role, content) VALUES ('assistant', ?)").run(text);
  }
  res.end();
});
