import { Check, ChevronRight, Droplets, Flame, Lightbulb, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AREA_META, AreaTag, Button, Card, Modal, Progress, Ring, Stat, Textarea, cx } from "../components/ui";
import { post, today, useApi } from "../lib/api";
import type { Briefing, Challenge, WeeklyReview } from "../lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Today() {
  const date = today();
  const { data: b, reload } = useApi<Briefing>(`/guide/today?date=${date}`);
  const { data: week } = useApi<WeeklyReview>(`/guide/weekly?date=${date}`);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [reflection, setReflection] = useState("");

  if (!b) return <p className="text-muted">Loading your briefing…</p>;

  const toggleHabit = async (id: number) => {
    await post(`/habits/${id}/toggle`, { date });
    reload();
  };
  const addWater = async (ml: number) => {
    await post("/data/water_logs", { date, ml });
    reload();
  };
  const completeChallenge = async () => {
    if (!challenge) return;
    await post("/data/challenge_logs", { challenge_key: challenge.key, date, reflection });
    setChallenge(null);
    setReflection("");
    reload();
  };

  const scores = Object.entries(b.scores) as [keyof Briefing["scores"], number][];
  const overall = Math.round(scores.reduce((s, [, v]) => s + v, 0) / scores.length);
  const t = b.nutrition.targets;
  const n = b.nutrition.totals;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}{b.profileName ? `, ${b.profileName}` : ""}</h1>
      </div>

      <Card title={<span className="flex items-center gap-2"><Trophy size={16} className="text-brand" /> Growth score, last 7 days: {overall}</span>}>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {scores.map(([k, v]) => <Ring key={k} value={v} color={AREA_META[k].color} label={AREA_META[k].label} />)}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3" title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-brand" /> Your guide recommends</span>}>
          <ul className="space-y-2">
            {b.recommendations.slice(0, 7).map((r, i) => (
              <li key={i}>
                <Link to={r.link ?? "/"} className="group flex items-start gap-3 rounded-xl bg-panel-2 p-3 hover:bg-line">
                  <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", r.priority === 1 ? "bg-red-400" : r.priority === 2 ? "bg-amber-400" : "bg-slate-500")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.title}</span>
                      <AreaTag area={r.area} />
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{r.detail}</p>
                  </div>
                  <ChevronRight size={16} className="mt-1 shrink-0 text-muted group-hover:text-slate-200" />
                </Link>
              </li>
            ))}
            {!b.recommendations.length && <p className="text-sm text-muted">You're on top of everything today. Outstanding.</p>}
          </ul>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card title="Today's growth challenges">
            <div className="space-y-2">
              {b.challenges.map((c) => (
                <div key={c.key} className="rounded-xl bg-panel-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><AreaTag area={c.area} /><span className="text-sm font-medium">{c.title}</span></div>
                    {c.done ? <Check size={18} className="text-brand" /> : <Button size="sm" variant="soft" onClick={() => setChallenge(c)}>Done</Button>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{c.how}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Lightbulb size={16} className="text-yellow-400" /> Lesson of the day</span>}>
            <div className="mb-1 flex items-center gap-2"><AreaTag area={b.lesson.area} /><span className="font-medium">{b.lesson.title}</span></div>
            <p className="text-sm text-muted">{b.lesson.body}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Habits" action={<Link to="/goals" className="text-xs text-muted hover:text-slate-200">Manage</Link>}>
          {b.habits.length ? (
            <ul className="space-y-1.5">
              {b.habits.map((h) => (
                <li key={h.id}>
                  <button onClick={() => toggleHabit(h.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-panel-2">
                    <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-md border", h.done_today ? "border-brand bg-brand text-slate-950" : "border-line")}>
                      {h.done_today && <Check size={14} />}
                    </span>
                    <span className={cx("flex-1 text-sm", h.done_today && "text-muted line-through")}>{h.name}</span>
                    {h.streak > 0 && <span className="flex items-center gap-0.5 text-xs text-orange-400"><Flame size={12} />{h.streak}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : <Link to="/goals" className="text-sm text-brand">Create your first habit →</Link>}
        </Card>

        <Card title="Nutrition today" action={<Link to="/nutrition" className="text-xs text-muted hover:text-slate-200">Log meal</Link>}>
          {t ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs"><span>Calories</span><span className="text-muted">{Math.round(n.calories)} / {t.calories}</span></div>
                <Progress value={n.calories} max={t.calories} color="#22c55e" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs"><span>Protein</span><span className="text-muted">{Math.round(n.protein)} / {t.protein} g</span></div>
                <Progress value={n.protein} max={t.protein} color="#f97316" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="flex items-center gap-1"><Droplets size={12} />Water</span><span className="text-muted">{n.water_ml} / {t.water_ml} ml</span></div>
                <Progress value={n.water_ml} max={t.water_ml} color="#38bdf8" />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="soft" onClick={() => addWater(250)}>+250 ml</Button>
                  <Button size="sm" variant="soft" onClick={() => addWater(500)}>+500 ml</Button>
                </div>
              </div>
            </div>
          ) : <Link to="/settings" className="text-sm text-brand">Complete your profile to get targets →</Link>}
        </Card>

        <Card title="Next workout" action={<Link to="/fitness" className="text-xs text-muted hover:text-slate-200">Start</Link>}>
          <p className="text-xs text-muted">{b.nextWorkout.program}</p>
          <p className="mb-2 font-medium">{b.nextWorkout.day.name}</p>
          <ul className="space-y-1 text-sm">
            {b.nextWorkout.day.exercises.map((e) => (
              <li key={e.name} className="flex justify-between gap-2"><span>{e.name}</span><span className="text-muted">{e.sets}×{e.reps}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      {week && (
        <Card title="Weekly review">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Workouts" value={week.thisWeek.workouts} sub={`last week ${week.lastWeek.workouts}`} />
            <Stat label="Habit check-ins" value={week.thisWeek.habitChecks} sub={`last week ${week.lastWeek.habitChecks}`} />
            <Stat label="Learning" value={`${week.thisWeek.learningMinutes} min`} sub={`last week ${week.lastWeek.learningMinutes}`} />
            <Stat label="Avg mood" value={week.thisWeek.avgMood ?? "–"} sub={`last week ${week.lastWeek.avgMood ?? "–"}`} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">Wins</h3>
              <ul className="space-y-1.5 text-sm">{week.wins.length ? week.wins.map((w) => <li key={w}>✓ {w}</li>) : <li className="text-muted">Your wins will show up here as you log.</li>}</ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">Focus next</h3>
              <ul className="space-y-1.5 text-sm">{week.focus.map((f) => <li key={f}>→ {f}</li>)}</ul>
            </div>
          </div>
        </Card>
      )}

      <Modal open={!!challenge} onClose={() => setChallenge(null)} title={`Completed: ${challenge?.title ?? ""}`}>
        <p className="mb-3 text-sm text-muted">Reflecting is what turns an experience into growth. How did it go? What did you notice?</p>
        <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="It felt awkward at first, but…" />
        <Button className="mt-3 w-full" onClick={completeChallenge}>Save & mark done</Button>
      </Modal>
    </div>
  );
}
