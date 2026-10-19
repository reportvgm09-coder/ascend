import { BookOpen, Check, GraduationCap, Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { AREA_META, AreaTag, Button, Card, Empty, Input, Label, Modal, PageHeader, Progress, Select, Tabs, Textarea, cx } from "../components/ui";
import { del, post, put, shortDate, today, useApi } from "../lib/api";
import type { Area, Challenge, LearningItem, PracticeLog } from "../lib/types";

type Tab = "learning" | "challenges" | "lessons";
const KIND_ICON = { book: BookOpen, course: GraduationCap, skill: Wrench };

export default function Learn() {
  const [tab, setTab] = useState<Tab>("learning");
  return (
    <div>
      <PageHeader title="Learn & Grow" subtitle="Knowledge, skills, and character, built a little every day." />
      <div className="mb-5"><Tabs value={tab} onChange={setTab} tabs={[["learning", "Books, courses & skills"], ["challenges", "Growth challenges"], ["lessons", "Lessons"]]} /></div>
      {tab === "learning" && <Learning />}
      {tab === "challenges" && <Challenges />}
      {tab === "lessons" && <Lessons />}
    </div>
  );
}

function Learning() {
  const items = useApi<LearningItem[]>("/data/learning");
  const logs = useApi<PracticeLog[]>(`/data/practice_logs?from=${today(-29)}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "book", title: "", status: "active" });
  const [practice, setPractice] = useState<LearningItem | null>(null);
  const [p, setP] = useState({ minutes: "20", note: "" });

  const reload = () => { items.reload(); logs.reload(); };
  const week = (logs.data ?? []).filter((l) => l.date > today(-7)).reduce((s, l) => s + l.minutes, 0);
  const month = (logs.data ?? []).reduce((s, l) => s + l.minutes, 0);
  const minutesFor = (id: number) => (logs.data ?? []).filter((l) => l.learning_id === id).reduce((s, l) => s + l.minutes, 0);

  const add = async () => {
    await post("/data/learning", form);
    setForm({ ...form, title: "" });
    setOpen(false);
    reload();
  };
  const logPractice = async () => {
    if (!practice) return;
    await post("/data/practice_logs", { learning_id: practice.id, date: today(), minutes: Number(p.minutes), note: p.note });
    setPractice(null);
    setP({ minutes: "20", note: "" });
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><div className="text-xs text-muted">Last 7 days</div><div className="text-2xl font-bold">{week} <span className="text-sm font-normal text-muted">min</span></div><Progress className="mt-2" value={week} max={150} color="#eab308" /><div className="mt-1 text-xs text-muted">Weekly target: 150 min</div></Card>
        <Card><div className="text-xs text-muted">Last 30 days</div><div className="text-2xl font-bold">{Math.round(month / 6) / 10} <span className="text-sm font-normal text-muted">hours</span></div></Card>
        <Card className="col-span-2 sm:col-span-1"><div className="text-xs text-muted">Completed</div><div className="text-2xl font-bold">{(items.data ?? []).filter((i) => i.status === "done").length}</div></Card>
      </div>

      <Card title="What you're learning" action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> Add</Button>}>
        {items.data?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.data.map((it) => {
              const Icon = KIND_ICON[it.kind];
              return (
                <div key={it.id} className={cx("rounded-xl bg-panel-2 p-4", it.status === "done" && "opacity-60")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2"><Icon size={16} className="shrink-0 text-yellow-400" /><span className="truncate font-medium">{it.title}</span></div>
                    <Select className="w-auto py-1 text-xs" value={it.status} onChange={async (e) => { await put(`/data/learning/${it.id}`, { status: e.target.value, ...(e.target.value === "done" ? { progress: 100 } : {}) }); reload(); }}
                      options={[["planned", "Planned"], ["active", "Active"], ["done", "Done"]]} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input type="range" min={0} max={100} step={5} value={it.progress} className="flex-1 accent-yellow-400"
                      onChange={(e) => items.setData((d) => d && d.map((x) => (x.id === it.id ? { ...x, progress: Number(e.target.value) } : x)))}
                      onMouseUp={() => put(`/data/learning/${it.id}`, { progress: it.progress })} onTouchEnd={() => put(`/data/learning/${it.id}`, { progress: it.progress })} onKeyUp={() => put(`/data/learning/${it.id}`, { progress: it.progress })} />
                    <span className="w-10 text-right text-sm text-muted">{it.progress}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{minutesFor(it.id)} min in the last 30 days</span>
                    <div className="flex gap-1">
                      {it.status !== "done" && <Button size="sm" variant="soft" onClick={() => setPractice(it)}>Log session</Button>}
                      <Button size="sm" variant="danger" onClick={async () => { if (confirm(`Delete "${it.title}"?`)) { await del(`/data/learning/${it.id}`); reload(); } }}>Delete</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <Empty>Add a book you're reading, a course, or a skill you're building (public speaking, coding, a language, an instrument…).</Empty>}
      </Card>

      <Card title="Recent sessions">
        {logs.data?.length ? (
          <ul className="space-y-1 text-sm">
            {logs.data.slice(0, 15).map((l) => (
              <li key={l.id} className="flex justify-between gap-2 border-b border-line py-1.5 last:border-0">
                <span className="truncate">{items.data?.find((i) => i.id === l.learning_id)?.title ?? "Practice"}{l.note && <span className="text-muted"> · {l.note}</span>}</span>
                <span className="shrink-0 text-muted">{shortDate(l.date)} · {l.minutes}m</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No sessions yet.</p>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add to your learning">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Label label="Type"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[["book", "Book"], ["course", "Course"], ["skill", "Skill"]]} /></Label>
            <Label label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[["active", "Active now"], ["planned", "Planned"]]} /></Label>
          </div>
          <Label label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Atomic Habits / Public speaking / Python" /></Label>
          <p className="text-xs text-muted">Ideas for personal growth: <i>Atomic Habits</i>, <i>How to Win Friends and Influence People</i>, <i>Deep Work</i>, <i>Mindset</i>, <i>The Psychology of Money</i>.</p>
          <Button className="w-full" disabled={!form.title} onClick={add}>Add</Button>
        </div>
      </Modal>

      <Modal open={!!practice} onClose={() => setPractice(null)} title={`Log session: ${practice?.title ?? ""}`}>
        <div className="space-y-3">
          <Label label="Minutes"><Input type="number" inputMode="numeric" value={p.minutes} onChange={(e) => setP({ ...p, minutes: e.target.value })} /></Label>
          <Label label="Key takeaway (writing it down helps you remember it)"><Textarea value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} /></Label>
          <Button className="w-full" disabled={!Number(p.minutes)} onClick={logPractice}>Save session</Button>
        </div>
      </Modal>
    </div>
  );
}

function Challenges() {
  const content = useApi<{ challenges: Challenge[] }>("/guide/content");
  const logs = useApi<{ id: number; challenge_key: string; date: string; reflection: string }[]>("/data/challenge_logs");
  const [area, setArea] = useState<Area | "">("");
  const [active, setActive] = useState<Challenge | null>(null);
  const [reflection, setReflection] = useState("");

  const counts = new Map<string, number>();
  for (const l of logs.data ?? []) counts.set(l.challenge_key, (counts.get(l.challenge_key) ?? 0) + 1);
  const list = (content.data?.challenges ?? []).filter((c) => !area || c.area === area);
  const total = logs.data?.length ?? 0;

  const complete = async () => {
    if (!active) return;
    await post("/data/challenge_logs", { challenge_key: active.key, date: today(), reflection });
    setActive(null);
    setReflection("");
    logs.reload();
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">You've completed <b>{total}</b> challenges. {total < 7 ? `${7 - total} more to unlock level 2 daily challenges.` : total < 20 ? `${20 - total} more to unlock level 3.` : "All levels unlocked. Keep stretching your comfort zone."}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        {(["", "confidence", "discipline", "mindset", "knowledge"] as const).map((a) => (
          <Button key={a} size="sm" variant={area === a ? "primary" : "soft"} onClick={() => setArea(a)}>{a ? AREA_META[a].label : "All"}</Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => (
          <Card key={c.key}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><AreaTag area={c.area} /><span className="text-xs text-muted">Level {c.level}</span></div>
                <div className="mt-1 font-medium">{c.title}</div>
              </div>
              <Button size="sm" variant="soft" onClick={() => setActive(c)}>{counts.get(c.key) ? <><Check size={14} className="text-brand" /> ×{counts.get(c.key)}</> : "Do it"}</Button>
            </div>
            <p className="mt-1 text-sm text-muted">{c.how}</p>
          </Card>
        ))}
      </div>
      {!!logs.data?.length && (
        <Card title="Your reflections">
          <ul className="space-y-2 text-sm">
            {logs.data.filter((l) => l.reflection).slice(0, 20).map((l) => (
              <li key={l.id} className="rounded-xl bg-panel-2 p-3">
                <div className="text-xs text-muted">{shortDate(l.date)} · {content.data?.challenges.find((c) => c.key === l.challenge_key)?.title}</div>
                <p className="mt-1">{l.reflection}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title ?? ""}>
        <p className="mb-3 text-sm text-muted">{active?.how}</p>
        <Label label="Reflection: what happened, and how did it feel?"><Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} /></Label>
        <Button className="mt-3 w-full" onClick={complete}>Mark completed</Button>
      </Modal>
    </div>
  );
}

function Lessons() {
  const content = useApi<{ lessons: { area: Area; title: string; body: string }[] }>("/guide/content");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(content.data?.lessons ?? []).map((l) => (
        <Card key={l.title}>
          <div className="mb-1 flex items-center gap-2"><AreaTag area={l.area} /><span className="font-medium">{l.title}</span></div>
          <p className="text-sm text-muted">{l.body}</p>
        </Card>
      ))}
    </div>
  );
}
