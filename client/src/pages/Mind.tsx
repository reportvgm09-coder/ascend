import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Empty, Input, Label, PageHeader, Tabs, Textarea, cx } from "../components/ui";
import { del, post, put, shortDate, today, useApi } from "../lib/api";
import type { JournalEntry } from "../lib/types";

type Tab = "journal" | "focus" | "calm";
const MOODS = ["😞", "😕", "😐", "🙂", "😄"];

export default function Mind() {
  const [tab, setTab] = useState<Tab>("journal");
  return (
    <div>
      <PageHeader title="Mind" subtitle="Self-awareness, focus, and calm: the foundation of a strong personality." />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[["journal", "Journal & mood"], ["focus", "Focus timer"], ["calm", "Calm tools"]]} /></div>
      {tab === "journal" && <Journal />}
      {tab === "focus" && <Focus />}
      {tab === "calm" && <Calm />}
    </div>
  );
}

function Journal() {
  const date = today();
  const entries = useApi<JournalEntry[]>(`/data/journal?from=${today(-60)}`);
  const existing = entries.data?.find((e) => e.date === date);
  const [f, setF] = useState<{ mood: number | null; energy: number | null; gratitude: string; wins: string; entry: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (entries.data && f === null) {
      setF(existing ? { mood: existing.mood, energy: existing.energy, gratitude: existing.gratitude, wins: existing.wins, entry: existing.entry } : { mood: null, energy: null, gratitude: "", wins: "", entry: "" });
    }
  }, [entries.data, existing, f]);

  const save = async () => {
    if (!f) return;
    if (existing) await put(`/data/journal/${existing.id}`, f);
    else await post("/data/journal", { ...f, date });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    entries.reload();
  };

  const chart = [...(entries.data ?? [])].reverse().filter((e) => e.mood).map((e) => ({ date: shortDate(e.date), mood: e.mood, energy: e.energy }));
  const prompts = [
    "What's one thing I learned about myself today?",
    "What drained my energy, and what gave me energy?",
    "What would make tomorrow great?",
    "What am I avoiding, and why?",
    "Where did I show courage today?",
  ];
  const prompt = prompts[new Date().getDate() % prompts.length];

  if (!f) return <p className="text-muted">Loading…</p>;
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3" title={`Today's reflection${existing ? " (saved)" : ""}`}>
        <div className="space-y-4">
          <Scale label="Mood" value={f.mood} onChange={(mood) => setF({ ...f, mood })} render={(i) => MOODS[i]} />
          <Scale label="Energy" value={f.energy} onChange={(energy) => setF({ ...f, energy })} render={(i) => String(i + 1)} />
          <Label label="3 things I'm grateful for"><Textarea value={f.gratitude} onChange={(e) => setF({ ...f, gratitude: e.target.value })} placeholder={"1.\n2.\n3."} /></Label>
          <Label label="Today's win (big or small)"><Input value={f.wins} onChange={(e) => setF({ ...f, wins: e.target.value })} /></Label>
          <Label label={`Free write · prompt: ${prompt}`}><Textarea rows={5} value={f.entry} onChange={(e) => setF({ ...f, entry: e.target.value })} /></Label>
          <Button onClick={save} className="w-full">{saved ? "Saved ✓" : "Save reflection"}</Button>
        </div>
      </Card>
      <div className="space-y-5 lg:col-span-2">
        <Card title="Mood & energy trend">
          {chart.length > 1 ? (
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={chart} margin={{ left: -30, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#232d3a" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#8b98a9" fontSize={10} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#8b98a9" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#121821", border: "1px solid #232d3a", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="mood" stroke="#a855f7" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="energy" stroke="#eab308" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>Reflect for a few days to see patterns.</Empty>}
        </Card>
        <Card title="Past entries">
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {(entries.data ?? []).filter((e) => e.date !== date).map((e) => (
              <details key={e.id} className="rounded-xl bg-panel-2 p-3 text-sm">
                <summary className="flex cursor-pointer items-center justify-between">
                  <span>{shortDate(e.date)} {e.mood ? MOODS[e.mood - 1] : ""}</span>
                  <span className="truncate pl-2 text-xs text-muted">{e.wins}</span>
                </summary>
                {e.gratitude && <p className="mt-2 whitespace-pre-wrap text-muted"><b className="text-slate-300">Grateful:</b> {e.gratitude}</p>}
                {e.entry && <p className="mt-2 whitespace-pre-wrap text-muted">{e.entry}</p>}
                <Button size="sm" variant="danger" className="mt-2" onClick={async () => { if (confirm("Delete entry?")) { await del(`/data/journal/${e.id}`); entries.reload(); } }}>Delete</Button>
              </details>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Scale({ label, value, onChange, render }: { label: string; value: number | null; onChange: (v: number) => void; render: (i: number) => string }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <button key={i} onClick={() => onChange(i + 1)}
            className={cx("h-11 flex-1 rounded-xl border text-lg transition", value === i + 1 ? "border-brand bg-brand/15" : "border-line hover:border-slate-500")}>
            {render(i)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Focus() {
  const date = today();
  const sessions = useApi<{ id: number; date: string; minutes: number; task: string }[]>(`/data/focus_sessions?from=${today(-6)}`);
  const [length, setLength] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const endAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? 0) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        post("/data/focus_sessions", { date, minutes: length, task }).then(sessions.reload);
        if ("Notification" in window && Notification.permission === "granted") new Notification("Focus session complete 🎉", { body: "Take a 5-minute break. Stand up, breathe, drink water." });
        else alert("Focus session complete! Take a 5-minute break.");
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, date, length, task, sessions.reload]);

  const start = () => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  };
  const reset = (min = length) => { setRunning(false); setLength(min); setLeft(min * 60); };
  const todayMin = (sessions.data ?? []).filter((s) => s.date === date).reduce((a, s) => a + s.minutes, 0);
  const weekMin = (sessions.data ?? []).reduce((a, s) => a + s.minutes, 0);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Deep work">
        <Input placeholder="What will you focus on?" value={task} onChange={(e) => setTask(e.target.value)} disabled={running} />
        <div className="my-6 text-center font-mono text-6xl font-bold tabular-nums">{mm}:{ss}</div>
        <div className="mb-4 flex justify-center gap-2">
          {[15, 25, 50, 90].map((m) => <Button key={m} size="sm" variant={length === m ? "primary" : "soft"} disabled={running} onClick={() => reset(m)}>{m}m</Button>)}
        </div>
        <div className="flex justify-center gap-2">
          {running ? <Button variant="soft" onClick={() => setRunning(false)}><Pause size={16} /> Pause</Button> : <Button onClick={start}><Play size={16} /> {left < length * 60 ? "Resume" : "Start"}</Button>}
          <Button variant="ghost" onClick={() => reset()}><RotateCcw size={16} /> Reset</Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Phone in another room. One task. When distracted, note it down and return.</p>
      </Card>
      <Card title="Focus log">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-panel-2 p-3"><div className="text-xs text-muted">Today</div><div className="text-lg font-semibold">{todayMin} min</div></div>
          <div className="rounded-xl bg-panel-2 p-3"><div className="text-xs text-muted">Last 7 days</div><div className="text-lg font-semibold">{weekMin} min</div></div>
        </div>
        <ul className="space-y-1 text-sm">
          {(sessions.data ?? []).slice(0, 12).map((s) => (
            <li key={s.id} className="flex justify-between gap-2 border-b border-line py-1.5 last:border-0"><span className="truncate">{s.task || "Focus session"}</span><span className="shrink-0 text-muted">{shortDate(s.date)} · {s.minutes}m</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Calm() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState(0);
  const phases = ["Breathe in", "Hold", "Breathe out", "Hold"];
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % 4), 4000);
    return () => clearInterval(id);
  }, [active]);
  const scale = phase === 0 ? "scale-100" : phase === 1 ? "scale-100" : "scale-50";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Box breathing">
        <div className="grid h-64 place-items-center">
          <div className={cx("grid h-48 w-48 place-items-center rounded-full bg-purple-500/20 ring-2 ring-purple-400/50 transition-transform duration-[4000ms] ease-in-out", active ? scale : "scale-75")}>
            <span className="text-lg font-medium">{active ? phases[phase] : "Ready"}</span>
          </div>
        </div>
        <Button className="w-full" variant={active ? "soft" : "primary"} onClick={() => { setPhase(0); setActive(!active); }}>{active ? "Stop" : "Start (4-4-4-4)"}</Button>
      </Card>
      <Card title="When you feel overwhelmed">
        <ul className="space-y-3 text-sm">
          <li className="rounded-xl bg-panel-2 p-3"><b>5-4-3-2-1 grounding:</b> name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.</li>
          <li className="rounded-xl bg-panel-2 p-3"><b>Physiological sigh:</b> two quick inhales through the nose, then one long exhale through the mouth. Repeat 3 times. It's the fastest way to calm down.</li>
          <li className="rounded-xl bg-panel-2 p-3"><b>Brain dump:</b> write every worry on paper. Circle what you can control and take one small action on it.</li>
          <li className="rounded-xl bg-panel-2 p-3"><b>Move:</b> a 10-minute brisk walk measurably lowers stress hormones.</li>
          <li className="rounded-xl bg-panel-2 p-3"><b>Connect:</b> message or call someone you trust. You don't have to carry everything alone.</li>
          <li className="rounded-xl bg-amber-500/10 p-3 text-amber-200">If you've felt low for more than two weeks, or have thoughts of harming yourself, please reach out to a mental health professional or a local helpline right away.</li>
        </ul>
      </Card>
    </div>
  );
}
