import { useState, type FormEvent } from "react";
import { Button, Input } from "../components/ui";
import { post } from "../lib/api";

export default function Login({ status, onDone }: { status: { needsSetup: boolean; canSetup: boolean }; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = status.needsSetup;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (setup && password !== confirm) return setError("Passwords don't match");
    setBusy(true);
    try {
      await post(setup ? "/auth/setup" : "/auth/login", { password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6">
        <img src="/favicon.svg" alt="" className="mb-4 h-10 w-10" />
        <h1 className="text-xl font-bold">{setup ? "Welcome to Ascend" : "Welcome back"}</h1>
        <p className="mb-5 mt-1 text-sm text-muted">
          {setup ? "Create a password to protect your personal growth data." : "Sign in to continue your growth."}
        </p>
        {setup && !status.canSetup ? (
          <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">
            This server has no password yet. Set the <code>APP_PASSWORD</code> environment variable on your host and restart the app.
          </p>
        ) : (
          <div className="space-y-3">
            <Input type="password" placeholder="Password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={setup ? "new-password" : "current-password"} />
            {setup && <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button className="w-full" disabled={busy || !password}>{setup ? "Create password" : "Sign in"}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
