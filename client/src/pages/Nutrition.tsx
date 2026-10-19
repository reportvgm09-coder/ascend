import { ChevronLeft, ChevronRight, Droplets, Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Empty, Input, Label, Modal, PageHeader, Progress, Select } from "../components/ui";
import { del, post, shortDate, today, useApi } from "../lib/api";
import type { Meal, MealIdea, Targets, Totals } from "../lib/types";

interface NutritionGuide { targets: Targets | null; totals: Totals; ideas: MealIdea[]; meals: MealIdea[] }
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const blank = { meal_type: "lunch", name: "", calories: "", protein: "", carbs: "", fat: "" };

function addDaysTo(date: string, n: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Nutrition() {
  const [date, setDate] = useState(today());
  const guide = useApi<NutritionGuide>(`/guide/nutrition?date=${date}`);
  const meals = useApi<Meal[]>(`/data/meals?from=${date}&to=${date}`);
  const week = useApi<Meal[]>(`/data/meals?from=${addDaysTo(date, -6)}&to=${date}`);
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const [form, setForm] = useState(blank);

  const reload = () => { guide.reload(); meals.reload(); week.reload(); };
  const t = guide.data?.targets;
  const n = guide.data?.totals;

  const save = async () => {
    await post("/data/meals", { ...form, date, calories: Number(form.calories || 0), protein: Number(form.protein || 0), carbs: Number(form.carbs || 0), fat: Number(form.fat || 0) });
    setOpen(false);
    setForm(blank);
    reload();
  };
  const quickAdd = async (m: MealIdea) => {
    await post("/data/meals", { date, meal_type: m.type, name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat });
    reload();
  };
  const addWater = async (ml: number) => { await post("/data/water_logs", { date, ml }); reload(); };

  const days = Array.from({ length: 7 }, (_, i) => addDaysTo(date, i - 6));
  const chart = days.map((d) => {
    const ms = (week.data ?? []).filter((m) => m.date === d);
    return { date: shortDate(d), calories: Math.round(ms.reduce((s, m) => s + m.calories, 0)), protein: Math.round(ms.reduce((s, m) => s + m.protein, 0)) };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Nutrition" subtitle="Fuel your goals. Aim for consistency, not perfection."
        action={
          <div className="flex items-center gap-1 rounded-xl bg-panel p-1">
            <Button variant="ghost" size="sm" onClick={() => setDate(addDaysTo(date, -1))} aria-label="Previous day"><ChevronLeft size={16} /></Button>
            <span className="min-w-24 text-center text-sm">{date === today() ? "Today" : shortDate(date)}</span>
            <Button variant="ghost" size="sm" disabled={date >= today()} onClick={() => setDate(addDaysTo(date, 1))} aria-label="Next day"><ChevronRight size={16} /></Button>
          </div>
        } />

      {t && n ? (
        <Card title="Daily targets" action={<Button size="sm" variant="ghost" onClick={() => setWhy(true)}><Info size={14} /> How these are calculated</Button>}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Calories", n.calories, t.calories, "kcal", "#22c55e"],
              ["Protein", n.protein, t.protein, "g", "#f97316"],
              ["Carbs", n.carbs, t.carbs, "g", "#eab308"],
              ["Fat", n.fat, t.fat, "g", "#a855f7"],
              ["Water", n.water_ml, t.water_ml, "ml", "#38bdf8"],
            ].map(([label, v, max, unit, color]) => (
              <div key={label as string}>
                <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="text-muted">{Math.round(v as number)} / {max} {unit}</span></div>
                <Progress value={v as number} max={max as number} color={color as string} />
                <div className="mt-1 text-xs text-muted">{Math.max(0, Math.round((max as number) - (v as number)))} {unit} left</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={() => addWater(250)}><Droplets size={14} /> +250 ml</Button>
            <Button size="sm" variant="soft" onClick={() => addWater(500)}><Droplets size={14} /> +500 ml</Button>
          </div>
        </Card>
      ) : <Empty>Add your age, height and weight in Settings to get personalized calorie and macro targets.</Empty>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Meals" action={<Button size="sm" onClick={() => setOpen(true)}><Plus size={14} /> Log food</Button>}>
          <div className="space-y-4">
            {MEAL_TYPES.map((type) => {
              const list = (meals.data ?? []).filter((m) => m.meal_type === type);
              return (
                <div key={type}>
                  <div className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                    <span>{type}</span><span>{Math.round(list.reduce((s, m) => s + m.calories, 0))} kcal</span>
                  </div>
                  {list.length ? list.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 border-b border-line py-2 text-sm last:border-0">
                      <span className="min-w-0 truncate">{m.name}</span>
                      <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                        {Math.round(m.calories)} kcal · P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                        <button onClick={async () => { await del(`/data/meals/${m.id}`); reload(); }} className="hover:text-red-400" aria-label="Delete"><Trash2 size={14} /></button>
                      </span>
                    </div>
                  )) : <p className="py-1 text-sm text-slate-600">Nothing logged</p>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Suggested for you">
          <p className="mb-3 text-xs text-muted">High-protein picks that fit your remaining calories. Tap to log.</p>
          <div className="space-y-2">
            {(guide.data?.ideas.length ? guide.data.ideas : guide.data?.meals.slice(0, 4) ?? []).map((m) => (
              <button key={m.name} onClick={() => quickAdd(m)} className="w-full rounded-xl bg-panel-2 p-3 text-left hover:bg-line">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted">{m.calories} kcal · {m.protein} g protein · {m.type}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Last 7 days">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="#232d3a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#8b98a9" fontSize={11} />
              <YAxis stroke="#8b98a9" fontSize={11} />
              <Tooltip cursor={{ fill: "#18202b" }} contentStyle={{ background: "#121821", border: "1px solid #232d3a", borderRadius: 12 }} />
              {t && <ReferenceLine y={t.calories} stroke="#10b981" strokeDasharray="4 4" />}
              <Bar dataKey="calories" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log food">
        <div className="space-y-3">
          <Label label="Quick pick">
            <Select value="" onChange={(e) => {
              const m = guide.data?.meals.find((x) => x.name === e.target.value);
              if (m) setForm({ meal_type: m.type, name: m.name, calories: String(m.calories), protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat) });
            }} options={[["", "Choose a common meal…"], ...(guide.data?.meals ?? []).map((m) => [m.name, m.name] as [string, string])]} />
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Label label="Meal" className="col-span-1"><Select value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })} options={MEAL_TYPES.map((m) => [m, m])} /></Label>
            <Label label="Food" className="col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2 roti + dal" /></Label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
              <Label key={k} label={k === "calories" ? "kcal" : `${k} (g)`}><Input type="number" inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Label>
            ))}
          </div>
          <p className="text-xs text-muted">Tip: approximate is fine. A palm of protein ≈ 25 g, a cupped hand of rice ≈ 25 g carbs, a thumb of oil/ghee ≈ 10 g fat.</p>
          <Button className="w-full" disabled={!form.name} onClick={save}>Save</Button>
        </div>
      </Modal>

      <Modal open={why} onClose={() => setWhy(false)} title="How your targets are calculated">
        <ul className="space-y-2 text-sm">{t?.explanation.map((e) => <li key={e} className="rounded-xl bg-panel-2 p-3">{e}</li>)}</ul>
        <p className="mt-3 text-xs text-muted">Formulas are estimates. Track your weight trend for 2–3 weeks and adjust by ±150 kcal if progress stalls. This isn't medical advice. Consult a professional if you have a medical condition.</p>
      </Modal>
    </div>
  );
}
