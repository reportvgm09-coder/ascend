import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Label, PageHeader, Select } from "../components/ui";
import { post, put, useApi } from "../lib/api";
import type { Profile } from "../lib/types";

export default function SettingsPage({ onLogout }: { onLogout: () => void }) {
  const profile = useApi<Profile>("/profile");
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile.data) setP(profile.data); }, [profile.data]);
  if (!p) return <p className="text-muted">Loading…</p>;

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });
  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const save = async () => {
    await put("/profile", p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const changePassword = async () => {
    try {
      await post("/auth/password", pw);
      setMsg("Password changed ✓");
      setPw({ current: "", next: "" });
    } catch (e) { setMsg((e as Error).message); }
  };
  const restore = async (f: File) => {
    if (!confirm("Restoring replaces ALL current data with the backup. Continue?")) return;
    try {
      await post("/restore", JSON.parse(await f.text()));
      alert("Backup restored.");
      location.reload();
    } catch (e) { alert("Restore failed: " + (e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Your profile powers every recommendation the guide makes." />
      <Card title="Profile">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Label label="Name"><Input value={p.name} onChange={(e) => set("name", e.target.value)} /></Label>
          <Label label="Sex (for calorie formula)"><Select value={p.sex} onChange={(e) => set("sex", e.target.value as Profile["sex"])} options={[["male", "Male"], ["female", "Female"]]} /></Label>
          <Label label="Birth year"><Input type="number" inputMode="numeric" value={p.birth_year ?? ""} onChange={(e) => set("birth_year", numOrNull(e.target.value))} /></Label>
          <Label label="Height (cm)"><Input type="number" inputMode="decimal" value={p.height_cm ?? ""} onChange={(e) => set("height_cm", numOrNull(e.target.value))} /></Label>
          <Label label="Starting weight (kg)"><Input type="number" inputMode="decimal" value={p.weight_kg ?? ""} onChange={(e) => set("weight_kg", numOrNull(e.target.value))} /></Label>
          <Label label="Daily activity (outside workouts too)">
            <Select value={p.activity} onChange={(e) => set("activity", e.target.value as Profile["activity"])} options={[["sedentary", "Sedentary (desk, little walking)"], ["light", "Light (1–3 workouts/week)"], ["moderate", "Moderate (3–5 workouts/week)"], ["active", "Active (6–7 workouts/week)"], ["very_active", "Very active (physical job + training)"]]} />
          </Label>
          <Label label="Body goal"><Select value={p.fitness_goal} onChange={(e) => set("fitness_goal", e.target.value as Profile["fitness_goal"])} options={[["lose", "Lose fat"], ["maintain", "Maintain / recomp"], ["gain", "Build muscle"]]} /></Label>
          <Label label="Training experience"><Select value={p.experience} onChange={(e) => set("experience", e.target.value as Profile["experience"])} options={[["beginner", "Beginner (< 1 year)"], ["intermediate", "Intermediate (1–3 years)"], ["advanced", "Advanced (3+ years)"]]} /></Label>
          <Label label="Where you train"><Select value={p.equipment} onChange={(e) => set("equipment", e.target.value as Profile["equipment"])} options={[["home", "Home / no equipment"], ["gym", "Gym"]]} /></Label>
          <Label label="Training days per week"><Select value={String(p.training_days)} onChange={(e) => set("training_days", Number(e.target.value))} options={["2", "3", "4", "5", "6"].map((n) => [n, n])} /></Label>
          <Label label="Diet"><Select value={p.diet} onChange={(e) => set("diet", e.target.value as Profile["diet"])} options={[["veg", "Vegetarian"], ["egg", "Eggetarian"], ["nonveg", "Non-vegetarian"]]} /></Label>
        </div>
        <Button className="mt-4" onClick={save}>{saved ? "Saved ✓" : "Save profile"}</Button>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Backup">
          <p className="mb-3 text-sm text-muted">Download all your data as a JSON file, or restore from a backup.</p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/backup" download><Button variant="soft"><Download size={16} /> Export</Button></a>
            <Button variant="soft" onClick={() => file.current?.click()}><Upload size={16} /> Restore</Button>
            <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </div>
        </Card>
        <Card title="Password">
          <div className="space-y-2">
            <Input type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            <Input type="password" placeholder="New password (8+ characters)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            {msg && <p className="text-sm text-muted">{msg}</p>}
            <div className="flex gap-2">
              <Button variant="soft" disabled={!pw.current || !pw.next} onClick={changePassword}>Change password</Button>
              <Button variant="ghost" onClick={onLogout}>Sign out</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
