import { Plus, Search, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Empty, Input, Label, Modal, PageHeader, Select, Tabs, Textarea, cx } from "../components/ui";
import { del, post, put, shortDate, today, useApi } from "../lib/api";
import type { Exercise, Profile, Program, ProgramDay, Progression, Workout } from "../lib/types";

type Tab = "log" | "history" | "progress" | "plan" | "library";

interface FitnessGuide { program: Program; nextDay: ProgramDay; programs: Program[]; progression: Progression[]; balance: { muscle: string; sets: number }[] }

export default function Fitness() {
  const [tab, setTab] = useState<Tab>("log");
  const exercises = useApi<Exercise[]>("/data/exercises");
  const workouts = useApi<Workout[]>("/workouts");
  const guide = useApi<FitnessGuide>(`/guide/fitness?date=${today()}`);
  const [editing, setEditing] = useState<Workout | null>(null);

  const refreshAll = () => { workouts.reload(); guide.reload(); };

  return (
    <div>
      <PageHeader title="Fitness" subtitle="Train with a plan, log every set, and beat last time." />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[["log", "Log workout"], ["history", "History"], ["progress", "Progress"], ["plan", "Plan & coaching"], ["library", "Exercises"]]} /></div>
      {tab === "log" && exercises.data && guide.data && workouts.data && (
        <WorkoutForm key={editing?.id ?? "new"} exercises={exercises.data} guide={guide.data} workouts={workouts.data} editing={editing}
          onSaved={() => { setEditing(null); refreshAll(); setTab("history"); }} />
      )}
      {tab === "history" && workouts.data && (
        <History workouts={workouts.data} onEdit={(w) => { setEditing(w); setTab("log"); }} onDelete={async (id) => { await del(`/workouts/${id}`); refreshAll(); }} />
      )}
      {tab === "progress" && exercises.data && workouts.data && <ProgressTab exercises={exercises.data} workouts={workouts.data} />}
      {tab === "plan" && guide.data && <Plan guide={guide.data} onChange={guide.reload} />}
      {tab === "library" && exercises.data && <Library exercises={exercises.data} onAdded={exercises.reload} />}
    </div>
  );
}

interface Entry { exercise_id: number; sets: { reps: string; weight: string; minutes: string }[] }
const emptySet = { reps: "", weight: "", minutes: "" };

function WorkoutForm({ exercises, guide, workouts, editing, onSaved }: { exercises: Exercise[]; guide: FitnessGuide; workouts: Workout[]; editing: Workout | null; onSaved: () => void }) {
  const byName = useMemo(() => new Map(exercises.map((e) => [e.name, e])), [exercises]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Most recent sets for each exercise, used as placeholders ("beat last time").
  const lastSets = useMemo(() => {
    const m = new Map<number, Workout["sets"]>();
    for (const w of workouts) {
      if (w.id === editing?.id) continue;
      for (const s of w.sets) if (!m.has(s.exercise_id)) m.set(s.exercise_id, w.sets.filter((x) => x.exercise_id === s.exercise_id));
    }
    return m;
  }, [workouts, editing]);

  const fromDay = (day: ProgramDay): Entry[] =>
    day.exercises.filter((e) => byName.has(e.name)).map((e) => ({ exercise_id: byName.get(e.name)!.id, sets: Array.from({ length: e.sets }, () => ({ ...emptySet })) }));

  const fromWorkout = (w: Workout): Entry[] => {
    const entries: Entry[] = [];
    for (const s of w.sets) {
      let e = entries.find((x) => x.exercise_id === s.exercise_id);
      if (!e) entries.push((e = { exercise_id: s.exercise_id, sets: [] }));
      e.sets.push({ reps: s.reps?.toString() ?? "", weight: s.weight?.toString() ?? "", minutes: s.minutes?.toString() ?? "" });
    }
    return entries;
  };

  const [name, setName] = useState(editing?.name ?? guide.nextDay.name);
  const [date, setDate] = useState(editing?.date ?? today());
  const [duration, setDuration] = useState(editing?.duration_min?.toString() ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [entries, setEntries] = useState<Entry[]>(editing ? fromWorkout(editing) : fromDay(guide.nextDay));
  const [adding, setAdding] = useState("");
  const [error, setError] = useState("");

  const update = (i: number, j: number, field: keyof Entry["sets"][number], value: string) =>
    setEntries((es) => es.map((e, k) => (k !== i ? e : { ...e, sets: e.sets.map((s, l) => (l === j ? { ...s, [field]: value } : s)) })));

  const save = async () => {
    const sets = entries.flatMap((e) =>
      e.sets.filter((s) => s.reps || s.minutes).map((s) => ({
        exercise_id: e.exercise_id, reps: s.reps ? Number(s.reps) : null, weight: s.weight ? Number(s.weight) : null, minutes: s.minutes ? Number(s.minutes) : null,
      })),
    );
    if (!sets.length) return setError("Log at least one set (reps or minutes).");
    const body = { date, name, duration_min: duration ? Number(duration) : null, notes, sets };
    try {
      if (editing) await put(`/workouts/${editing.id}`, body);
      else await post("/workouts", body);
      onSaved();
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <Label label="Workout" className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} /></Label>
          <Label label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Label>
          <Label label="Duration (min)"><Input type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></Label>
        </div>
        {!editing && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="self-center text-xs text-muted">Load from plan:</span>
            {guide.program.days.map((d) => (
              <Button key={d.name} size="sm" variant={d.name === name ? "primary" : "soft"} onClick={() => { setName(d.name); setEntries(fromDay(d)); }}>{d.name}</Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => { setName("Custom workout"); setEntries([]); }}>Blank</Button>
          </div>
        )}
      </Card>

      {entries.map((e, i) => {
        const ex = byId.get(e.exercise_id);
        const cardio = ex?.category !== "strength";
        const prev = lastSets.get(e.exercise_id);
        const plan = guide.program.days.flatMap((d) => d.exercises).find((x) => x.name === ex?.name);
        return (
          <Card key={i} title={<span>{ex?.name} <span className="font-normal text-muted">· {ex?.muscle}{plan ? ` · target ${plan.reps}` : ""}</span></span>}
            action={<button onClick={() => setEntries((es) => es.filter((_, k) => k !== i))} className="text-muted hover:text-red-400" aria-label="Remove exercise"><Trash2 size={16} /></button>}>
            {prev && <p className="mb-2 text-xs text-muted">Last time: {prev.map((s) => (s.minutes ? `${s.minutes} min` : s.weight ? `${s.weight}kg×${s.reps}` : `${s.reps} reps`)).join(", ")}</p>}
            <div className="space-y-2">
              {e.sets.map((s, j) => (
                <div key={j} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs text-muted">{j + 1}</span>
                  {cardio ? (
                    <Input type="number" inputMode="decimal" placeholder={prev?.[j]?.minutes?.toString() ?? "minutes"} value={s.minutes} onChange={(ev) => update(i, j, "minutes", ev.target.value)} />
                  ) : (
                    <>
                      <Input type="number" inputMode="decimal" placeholder={prev?.[j]?.weight ? `${prev[j].weight} kg` : "kg (optional)"} value={s.weight} onChange={(ev) => update(i, j, "weight", ev.target.value)} />
                      <Input type="number" inputMode="numeric" placeholder={prev?.[j]?.reps ? `${prev[j].reps} reps` : plan && /\d+s$/.test(plan.reps) ? "seconds" : "reps"} value={s.reps} onChange={(ev) => update(i, j, "reps", ev.target.value)} />
                    </>
                  )}
                  <button onClick={() => setEntries((es) => es.map((x, k) => (k === i ? { ...x, sets: x.sets.filter((_, l) => l !== j) } : x)))} className="p-1 text-muted hover:text-red-400" aria-label="Remove set"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEntries((es) => es.map((x, k) => (k === i ? { ...x, sets: [...x.sets, { ...(x.sets.at(-1) ?? emptySet) }] } : x)))}>
              <Plus size={14} /> Add set
            </Button>
          </Card>
        );
      })}

      <Card>
        <div className="flex gap-2">
          <Select value={adding} onChange={(e) => setAdding(e.target.value)} options={[["", "Add an exercise…"], ...exercises.map((e) => [String(e.id), `${e.name} (${e.muscle})`] as [string, string])]} />
          <Button variant="soft" disabled={!adding} onClick={() => { setEntries((es) => [...es, { exercise_id: Number(adding), sets: [{ ...emptySet }, { ...emptySet }, { ...emptySet }] }]); setAdding(""); }}>Add</Button>
        </div>
        <Label label="Notes" className="mt-3"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Energy, sleep, form cues…" /></Label>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <Button className="mt-3 w-full" onClick={save}>{editing ? "Update workout" : "Save workout"}</Button>
      </Card>
    </div>
  );
}

function History({ workouts, onEdit, onDelete }: { workouts: Workout[]; onEdit: (w: Workout) => void; onDelete: (id: number) => void }) {
  if (!workouts.length) return <Empty>No workouts yet. Log your first one. Every rep counts.</Empty>;
  return (
    <div className="space-y-3">
      {workouts.map((w) => {
        const groups = new Map<string, Workout["sets"]>();
        for (const s of w.sets) groups.set(s.exercise!, [...(groups.get(s.exercise!) ?? []), s]);
        const volume = w.sets.reduce((v, s) => v + (s.weight ?? 0) * (s.reps ?? 0), 0);
        return (
          <Card key={w.id} title={<span>{w.name} <span className="font-normal text-muted">· {shortDate(w.date)}{w.duration_min ? ` · ${w.duration_min} min` : ""}{volume ? ` · ${Math.round(volume)} kg volume` : ""}</span></span>}
            action={<div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => onEdit(w)}>Edit</Button><Button size="sm" variant="danger" onClick={() => confirm("Delete this workout?") && onDelete(w.id)}>Delete</Button></div>}>
            <ul className="space-y-1 text-sm">
              {[...groups].map(([name, sets]) => (
                <li key={name} className="flex flex-wrap justify-between gap-2">
                  <span>{name}</span>
                  <span className="text-muted">{sets.map((s) => (s.minutes ? `${s.minutes}min` : s.weight ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(" · ")}</span>
                </li>
              ))}
            </ul>
            {w.notes && <p className="mt-2 text-sm italic text-muted">{w.notes}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function ProgressTab({ exercises, workouts }: { exercises: Exercise[]; workouts: Workout[] }) {
  const used = exercises.filter((e) => workouts.some((w) => w.sets.some((s) => s.exercise_id === e.id)));
  const [exId, setExId] = useState(used[0]?.id.toString() ?? "");
  const history = useApi<{ date: string; top_weight: number | null; top_reps: number | null; est_1rm: number; volume: number }[]>(exId ? `/exercises/${exId}/history` : null);
  const metrics = useApi<{ id: number; date: string; weight_kg: number | null; body_fat: number | null; waist_cm: number | null }[]>("/data/body_metrics");
  const [m, setM] = useState({ date: today(), weight_kg: "", body_fat: "", waist_cm: "" });

  const saveMetric = async () => {
    await post("/data/body_metrics", { date: m.date, weight_kg: m.weight_kg || null, body_fat: m.body_fat || null, waist_cm: m.waist_cm || null });
    setM({ ...m, weight_kg: "", body_fat: "", waist_cm: "" });
    metrics.reload();
  };

  const weighted = history.data?.some((h) => h.est_1rm > 0);
  const chartData = (history.data ?? []).map((h) => ({ date: shortDate(h.date), value: weighted ? Math.round(h.est_1rm * 10) / 10 : h.top_reps }));
  const weightData = [...(metrics.data ?? [])].filter((x) => x.weight_kg).reverse().map((x) => ({ date: shortDate(x.date), value: x.weight_kg }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={<span className="flex items-center gap-2"><TrendingUp size={16} /> Strength progress</span>}>
        {used.length ? (
          <>
            <Select value={exId} onChange={(e) => setExId(e.target.value)} options={used.map((e) => [String(e.id), e.name])} />
            <p className="mb-2 mt-2 text-xs text-muted">{weighted ? "Estimated 1-rep max (kg), Epley formula" : "Best set (reps)"}</p>
            <Chart data={chartData} color="#f97316" />
          </>
        ) : <Empty>Log workouts to see your strength curve.</Empty>}
      </Card>
      <Card title="Body weight">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} />
          <Input type="number" inputMode="decimal" placeholder="kg" value={m.weight_kg} onChange={(e) => setM({ ...m, weight_kg: e.target.value })} />
          <Input type="number" inputMode="decimal" placeholder="body fat %" value={m.body_fat} onChange={(e) => setM({ ...m, body_fat: e.target.value })} />
          <Input type="number" inputMode="decimal" placeholder="waist cm" value={m.waist_cm} onChange={(e) => setM({ ...m, waist_cm: e.target.value })} />
        </div>
        <Button size="sm" className="mb-3" onClick={saveMetric} disabled={!m.weight_kg && !m.body_fat && !m.waist_cm}>Log measurement</Button>
        {weightData.length > 1 ? <Chart data={weightData} color="#10b981" /> : <p className="text-sm text-muted">Weigh yourself 2–3× a week, in the morning after the bathroom, and watch the trend rather than single readings.</p>}
      </Card>
    </div>
  );
}

function Chart({ data, color }: { data: { date: string; value: number | null }[]; color: string }) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid stroke="#232d3a" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#8b98a9" fontSize={11} />
          <YAxis stroke="#8b98a9" fontSize={11} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "#121821", border: "1px solid #232d3a", borderRadius: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Plan({ guide, onChange }: { guide: FitnessGuide; onChange: () => void }) {
  const choose = async (key: string) => {
    await put<Profile>("/profile", { program: key });
    onChange();
  };
  const actionColor = { increase: "text-brand", hold: "text-amber-400", add_reps: "text-sky-400" };
  const maxSets = Math.max(10, ...guide.balance.map((b) => b.sets));
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Progressive overload coach">
          {guide.progression.length ? (
            <ul className="space-y-2">
              {guide.progression.map((p) => (
                <li key={p.exercise} className="rounded-xl bg-panel-2 p-3">
                  <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{p.exercise}</span><span className="text-xs text-muted">last: {p.last}</span></div>
                  <p className={cx("mt-1 text-sm", actionColor[p.action])}>{p.detail}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>Once you log strength workouts, I'll tell you exactly when to add weight or reps.</Empty>}
        </Card>
        <Card title="Weekly sets per muscle (last 7 days)">
          <p className="mb-3 text-xs text-muted">For growth, aim for 10–20 hard sets per muscle per week.</p>
          <div className="space-y-2">
            {guide.balance.map((b) => (
              <div key={b.muscle} className="flex items-center gap-3 text-sm">
                <span className="w-20 capitalize">{b.muscle}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full" style={{ width: `${(b.sets / maxSets) * 100}%`, background: b.sets >= 10 ? "#10b981" : b.sets > 0 ? "#f59e0b" : "transparent" }} /></div>
                <span className="w-8 text-right text-muted">{b.sets}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <h2 className="text-sm font-semibold">Training programs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {guide.programs.map((p) => (
          <Card key={p.key} className={cx(p.key === guide.program.key && "border-brand")}
            title={<span>{p.name} <span className="font-normal capitalize text-muted">· {p.level} · {p.daysPerWeek}×/week</span></span>}
            action={p.key === guide.program.key ? <span className="text-xs text-brand">Current</span> : <Button size="sm" variant="soft" onClick={() => choose(p.key)}>Use this</Button>}>
            <p className="mb-3 text-sm text-muted">{p.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {p.days.map((d) => (
                <div key={d.name} className="rounded-xl bg-panel-2 p-3 text-xs">
                  <div className="mb-1 font-semibold">{d.name}</div>
                  {d.exercises.map((e) => <div key={e.name} className="flex justify-between gap-2"><span>{e.name}</span><span className="text-muted">{e.sets}×{e.reps}</span></div>)}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Library({ exercises, onAdded }: { exercises: Exercise[]; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", muscle: "chest", equipment: "bodyweight", category: "strength", instructions: "" });
  const muscles = [...new Set(exercises.map((e) => e.muscle))];
  const list = exercises.filter((e) => (!muscle || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));

  const add = async () => {
    await post("/data/exercises", form);
    setOpen(false);
    setForm({ ...form, name: "", instructions: "" });
    onAdded();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-auto" value={muscle} onChange={(e) => setMuscle(e.target.value)} options={[["", "All muscles"], ...muscles.map((m) => [m, m] as [string, string])]} />
        <Button variant="soft" onClick={() => setOpen(true)}><Plus size={16} /> Custom</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((e) => (
          <Card key={e.id}>
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{e.name}</span><span className="text-xs capitalize text-muted">{e.muscle} · {e.equipment}</span></div>
            <p className="mt-1 text-sm text-muted">{e.instructions}</p>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add custom exercise">
        <div className="space-y-3">
          <Label label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Label>
          <div className="grid grid-cols-3 gap-2">
            <Label label="Muscle"><Select value={form.muscle} onChange={(e) => setForm({ ...form, muscle: e.target.value })} options={["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "mobility"].map((m) => [m, m])} /></Label>
            <Label label="Equipment"><Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} /></Label>
            <Label label="Type"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={[["strength", "Strength"], ["cardio", "Cardio"], ["mobility", "Mobility"]]} /></Label>
          </div>
          <Label label="How to"><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Label>
          <Button className="w-full" disabled={!form.name} onClick={add}>Add exercise</Button>
        </div>
      </Modal>
    </div>
  );
}
