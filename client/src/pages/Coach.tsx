import { Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card, PageHeader, Textarea, cx } from "../components/ui";
import { del, today, useApi } from "../lib/api";

interface Msg { id?: number; role: "user" | "assistant"; content: string }

const STARTERS = [
  "Review my week and give me 3 priorities for next week",
  "Build me a 7-day meal plan that hits my targets",
  "I keep procrastinating. Help me make a plan for today",
  "How can I become more confident when speaking in groups?",
  "Adjust my workout plan. I can only train 3 days a week",
  "Make a 30-day learning plan for a skill I want to build",
];

export default function Coach() {
  const status = useApi<{ enabled: boolean; model: string }>("/coach/status");
  const history = useApi<Msg[]>("/coach/messages");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { if (history.data) setMessages(history.data); }, [history.data]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setError("");
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/coach/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, date: today() }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? "Coach unavailable");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          if (!ev.startsWith("data: ")) continue;
          const data = JSON.parse(ev.slice(6));
          if (data.type === "text") setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: m[m.length - 1].content + data.text }]);
          if (data.type === "error") setError(data.error);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMessages((m) => (m[m.length - 1]?.role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
      setBusy(false);
    }
  };

  if (status.data && !status.data.enabled) {
    return (
      <div>
        <PageHeader title="AI Coach" />
        <Card>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 shrink-0 text-brand" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">The AI coach isn't switched on yet.</p>
              <p className="text-muted">Your built-in guide is already working on the Today page and on every section. To chat with an AI coach that knows all your data, add an Anthropic API key on the server:</p>
              <pre className="overflow-x-auto rounded-xl bg-bg p-3 text-xs">ANTHROPIC_API_KEY=sk-ant-...</pre>
              <p className="text-muted">Get a key at console.anthropic.com, set it as an environment variable (or in <code>server/.env</code>), and restart the server.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col md:h-[calc(100vh-4rem)]">
      <PageHeader title="AI Coach" subtitle="Your personal guide. It sees your workouts, meals, habits, goals, journal and learning."
        action={messages.length > 0 && <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Clear the conversation?")) { await del("/coach/messages"); setMessages([]); } }}><Trash2 size={14} /> Clear</Button>} />
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {!messages.length && (
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-xl border border-line bg-panel p-3 text-left text-sm hover:border-brand">{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[90%] rounded-2xl px-4 py-3 text-sm md:max-w-[75%]", m.role === "user" ? "bg-brand/15 text-slate-100" : "border border-line bg-panel")}>
              {m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-muted">Thinking…</span>}
            </div>
          </div>
        ))}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line pt-3">
        <Textarea rows={1} className="max-h-40 min-h-[42px]" placeholder="Ask your coach anything…" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        <Button disabled={busy || !input.trim()} aria-label="Send"><Send size={16} /></Button>
      </form>
    </div>
  );
}

/** Minimal, safe markdown: headings, bullet/numbered lists, bold, paragraphs. */
function Markdown({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={blocks.length} className={cx("my-1 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>);
    list = null;
  };
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)/);
    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flush();
    if (heading) blocks.push(<p key={blocks.length} className="mt-2 font-semibold">{inline(heading[1])}</p>);
    else if (line.trim()) blocks.push(<p key={blocks.length} className="my-1">{inline(line)}</p>);
  }
  flush();
  return <div className="leading-relaxed">{blocks}</div>;
}
