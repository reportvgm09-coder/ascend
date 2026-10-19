import { Check, Flame, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AREA_META, AreaTag, Button, Card, Empty, Input, Label, Modal, PageHeader, Progress, Select, Textarea, cx } from "../components/ui";
import { del, post, put, shortDate, today, useApi } from "../lib/api";
import type { Area, Goal, Habit, Profile } from "../lib/types";

const AREAS: [string, string][] = (["fitness", "nutrition", "discipline", "mindset", "confidence", "knowledge"] as const).map((a) => [a, AREA_META[a].label]);

export default function Goals() {
  const date = today();
  const habits = useApi<Habit[]>(`/habits/status?date=${date}`);
  const goals = useApi<Goal[]>(`/goals/insights?date=${date}`);
  const allGoals = useApi<Goal[]>("/data/goals");
  const profile = useApi<Profile>("/profile");
  const [habitOpen, setHabitOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [vision, setVision] = useState<string | null>(null);

  const finished = (allGoals.data ?? []).filter((g) => g.status !== "active");
  const reloadGoals = () => { goals.reload(); allGoals.reload(); };

  return (
    <div className="space-y-5">
      <PageHeader title="Goals & Habits" subtitle="Goals set the direction. Habits get you there." />

      <Card title="Your vision" action={vision === null && <Button size="sm" variant="ghost" onClick={() => setVision(profile.data?.vision ?? "")}>Edit</Button>}>
        {vision !== null ? (
          <div className="space-y-2">
            <Textarea value={vision} onChange={(e) => setVision(e.target.value)} placeholder="One year from now, I am someone who… (describe the person you're becoming: health, character, skills, relationships)" />
            <Button size="sm" onClick={async () => { await put("/profile", { vision }); setVision(null); profile.reload(); }}>Save</Button>
          </div>
        ) : profile.data?.vision ? <p className="whitespace-pre-wrap text-sm italic">“{profile.data.vision}”</p>
          : <p className="text-sm text-muted">Write who you want to become. Every habit is a vote for that identity.</p>}
      </Card>

      <Card title="Daily habits" action={<Button size="sm" onClick={() => setHabitOpen(true)}><Plus size={14} /> New habit</Button>}>
        {habits.data?.length ? (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_repeat(7,2rem)_4rem_2rem] items-center gap-1 px-2 text-center text-[10px] text-muted sm:grid">
              <span />
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i - 6);
                return <span key={i}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>;
              })}
              <span>streak</span><span />
            </div>
            {habits.data.map((h) => (
              <div key={h.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-panel-2 p-2 sm:grid-cols-[1fr_repeat(7,2rem)_4rem_2rem] sm:gap-1">
                <div className="min-w-0 px-1">
                  <div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{h.name}</span><AreaTag area={h.area as Area} /></div>
                  {h.cue && <div className="truncate text-xs text-muted">After I {h.cue}</div>}
                  <div className="text-xs text-muted sm:hidden">{h.week_count}/{h.target_per_week} this week · <Flame size={11} className="inline text-orange-400" /> {h.streak}</div>
                </div>
                {h.last7.map((done, i) => (
                  <button key={i} disabled={i !== 6}
                    onClick={async () => { await post(`/habits/${h.id}/toggle`, { date }); habits.reload(); }}
                    className={cx("hidden h-7 w-7 place-items-center justify-self-center rounded-lg border sm:grid", done ? "border-brand bg-brand text-slate-950" : "border-line", i === 6 ? "cursor-pointer hover:border-brand" : "cursor-default opacity-60")}
                    aria-label={i === 6 ? `Toggle ${h.name} today` : undefined}>
                    {done && <Check size={14} />}
                  </button>
                ))}
                <span className="hidden items-center justify-center gap-1 text-sm text-orange-400 sm:flex"><Flame size={14} />{h.streak}</span>
                <div className="flex items-center gap-1">
                  <button onClick={async () => { await post(`/habits/${h.id}/toggle`, { date }); habits.reload(); }}
                    className={cx("grid h-8 w-8 place-items-center rounded-lg border sm:hidden", h.done_today ? "border-brand bg-brand text-slate-950" : "border-line")} aria-label="Toggle today">
                    {h.done_today && <Check size={16} />}
                  </button>
                  <button onClick={async () => { if (confirm(`Archive "${h.name}"?`)) { await put(`/data/habits/${h.id}`, { archived: 1 }); habits.reload(); } }} className="p-1 text-muted hover:text-red-400" aria-label="Archive habit"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>No habits yet. Start with one tiny habit you can't fail, like “1 push-up” or “read 1 page”.</Empty>}
      </Card>

      <Card title="Goals" action={<Button size="sm" onClick={() => setGoalOpen(true)}><Plus size={14} /> New goal</Button>}>
        {goals.data?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {goals.data.map((g) => <GoalCard key={g.id} goal={g} onChange={reloadGoals} />)}
          </div>
        ) : <Empty>Set a SMART goal: Specific, Measurable, Achievable, Relevant and Time-bound.</Empty>}
        {finished.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">Completed & dropped ({finished.length})</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {finished.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-panel-2">
                  <span className={cx(g.status === "dropped" && "text-muted line-through")}>{g.status === "done" ? "🏆 " : ""}{g.title}</span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={async () => { await put(`/data/goals/${g.id}`, { status: "active" }); reloadGoals(); }}>Reopen</Button>
                    <Button size="sm" variant="danger" onClick={async () => { await del(`/data/goals/${g.id}`); reloadGoals(); }}>Delete</Button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <HabitModal open={habitOpen} onClose={() => setHabitOpen(false)} onSaved={habits.reload} />
      <GoalModal open={goalOpen} onClose={() => setGoalOpen(false)} onSaved={reloadGoals} />
    </div>
  );
}

function GoalCard({ goal: g, onChange }: { goal: Goal; onChange: () => void }) {
  const [value, setValue] = useState(String(g.current_value));
  const color = AREA_META[g.area as Area]?.color ?? "#10b981";
  return (
    <div className="rounded-xl bg-panel-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2"><span className="font-medium">{g.title}</span><AreaTag area={g.area as Area} /></div>
          {g.why && <p className="mt-0.5 text-xs text-muted">Why: {g.why}</p>}
        </div>
        {g.behind && <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-400">Behind</span>}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted">
        <span>{g.metric || "Progress"}: {g.current_value} / {g.target_value} {g.unit}</span>
        <span>{g.progress}%{g.deadline ? ` · due ${shortDate(g.deadline)}${g.daysLeft != null ? ` (${g.daysLeft}d)` : ""}` : ""}</span>
      </div>
      <div className="relative mt-1">
        <Progress value={g.progress ?? 0} color={color} />
        {g.expected != null && <div className="absolute top-[-2px] h-3 w-0.5 bg-slate-300" style={{ left: `${g.expected}%` }} title="Where you should be by now" />}
      </div>
      <div className="mt-3 flex gap-2">
        <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="py-1" />
        <Button size="sm" variant="soft" onClick={async () => { await put(`/data/goals/${g.id}`, { current_value: Number(value) }); onChange(); }}>Update</Button>
        <Button size="sm" variant="ghost" onClick={async () => { await put(`/data/goals/${g.id}`, { status: "done", current_value: g.target_value }); onChange(); }} title="Mark achieved">🏆</Button>
        <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Drop this goal?")) { await put(`/data/goals/${g.id}`, { status: "dropped" }); onChange(); } }}>Drop</Button>
      </div>
    </div>
  );
}

function HabitModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", area: "discipline", cue: "", target_per_week: "7" });
  const save = async () => {
    await post("/data/habits", f);
    setF({ name: "", area: "discipline", cue: "", target_per_week: "7" });
    onClose();
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title="New habit">
      <div className="space-y-3">
        <Label label="Habit (make it tiny)"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Read 10 pages" /></Label>
        <Label label="Cue: “After I …”"><Input value={f.cue} onChange={(e) => setF({ ...f, cue: e.target.value })} placeholder="finish dinner" /></Label>
        {f.name && f.cue && <p className="rounded-xl bg-panel-2 p-3 text-sm">Your plan: <b>After I {f.cue}, I will {f.name.toLowerCase()}.</b></p>}
        <div className="grid grid-cols-2 gap-2">
          <Label label="Area"><Select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} options={AREAS} /></Label>
          <Label label="Days per week"><Select value={f.target_per_week} onChange={(e) => setF({ ...f, target_per_week: e.target.value })} options={["1", "2", "3", "4", "5", "6", "7"].map((n) => [n, n])} /></Label>
        </div>
        <Button className="w-full" disabled={!f.name} onClick={save}>Create habit</Button>
      </div>
    </Modal>
  );
}

function GoalModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const empty = { title: "", area: "fitness", why: "", metric: "", start_value: "0", current_value: "0", target_value: "", unit: "", deadline: "" };
  const [f, setF] = useState(empty);
  const save = async () => {
    await post("/data/goals", { ...f, current_value: f.current_value || f.start_value, deadline: f.deadline || null });
    setF(empty);
    onClose();
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title="New SMART goal">
      <div className="space-y-3">
        <Label label="Specific: what exactly?"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Do 10 strict pull-ups" /></Label>
        <Label label="Relevant: why does it matter to you?"><Input value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="To feel strong and confident" /></Label>
        <Label label="Area"><Select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} options={AREAS} /></Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Label label="Measure" className="col-span-2 sm:col-span-1"><Input value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value })} placeholder="reps" /></Label>
          <Label label="Start"><Input type="number" inputMode="decimal" value={f.start_value} onChange={(e) => setF({ ...f, start_value: e.target.value, current_value: e.target.value })} /></Label>
          <Label label="Target"><Input type="number" inputMode="decimal" value={f.target_value} onChange={(e) => setF({ ...f, target_value: e.target.value })} /></Label>
          <Label label="Unit"><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="reps" /></Label>
        </div>
        <Label label="Time-bound: deadline"><Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Label>
        <p className="text-xs text-muted">Achievable: stretch, but don't break. If it scares you a little and excites you a lot, it's right.</p>
        <Button className="w-full" disabled={!f.title || !f.target_value} onClick={save}>Create goal</Button>
      </div>
    </Modal>
  );
}
