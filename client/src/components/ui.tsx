import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { Area } from "../lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const AREA_META: Record<Area, { label: string; color: string; text: string; bg: string }> = {
  fitness: { label: "Fitness", color: "#f97316", text: "text-orange-400", bg: "bg-orange-500/15" },
  nutrition: { label: "Nutrition", color: "#22c55e", text: "text-green-400", bg: "bg-green-500/15" },
  discipline: { label: "Discipline", color: "#3b82f6", text: "text-blue-400", bg: "bg-blue-500/15" },
  mindset: { label: "Mindset", color: "#a855f7", text: "text-purple-400", bg: "bg-purple-500/15" },
  confidence: { label: "Confidence", color: "#ec4899", text: "text-pink-400", bg: "bg-pink-500/15" },
  knowledge: { label: "Knowledge", color: "#eab308", text: "text-yellow-400", bg: "bg-yellow-500/15" },
  setup: { label: "Setup", color: "#10b981", text: "text-emerald-400", bg: "bg-emerald-500/15" },
};

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-panel p-4 md:p-5", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft"; size?: "sm" | "md" };
export function Button({ variant = "primary", size = "md", className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-brand text-slate-950 hover:bg-emerald-400",
        variant === "soft" && "bg-panel-2 text-slate-200 hover:bg-line",
        variant === "ghost" && "text-muted hover:bg-panel-2 hover:text-slate-100",
        variant === "danger" && "text-red-400 hover:bg-red-500/10",
        className,
      )}
    />
  );
}

const field = "w-full rounded-xl border border-line bg-bg px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand";

export function Label({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(field, className)} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cx(field, "resize-y", className)} />;
export function Select({ className, options, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][] }) {
  return (
    <select {...p} className={cx(field, className)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Progress({ value, max = 100, color = "#10b981", className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-panel-2", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, color, label, size = 76 }: { value: number; color: string; label: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-panel-2)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} style={{ transition: "stroke-dashoffset .6s" }} />
        <text x="50%" y="50%" dy="0.35em" textAnchor="middle" className="rotate-90 fill-slate-100 text-base font-semibold" style={{ transformOrigin: "center" }}>
          {value}
        </text>
      </svg>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-panel p-1">
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={cx("shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition", value === k ? "bg-panel-2 text-slate-100" : "text-muted hover:text-slate-200")}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{children}</p>;
}

export function AreaTag({ area }: { area: Area }) {
  const m = AREA_META[area] ?? AREA_META.setup;
  return <span className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-medium", m.bg, m.text)}>{m.label}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-panel-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
