import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { api, post } from "./lib/api";
import Coach from "./pages/Coach";
import Fitness from "./pages/Fitness";
import Goals from "./pages/Goals";
import Learn from "./pages/Learn";
import Login from "./pages/Login";
import Mind from "./pages/Mind";
import Nutrition from "./pages/Nutrition";
import SettingsPage from "./pages/Settings";
import Today from "./pages/Today";

interface AuthStatus { authed: boolean; needsSetup: boolean; canSetup: boolean }

export default function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const refresh = () => api<AuthStatus>("/auth/status").then(setStatus).catch(() => setStatus({ authed: false, needsSetup: false, canSetup: false }));

  useEffect(() => {
    refresh();
    const onLogout = () => setStatus((s) => (s ? { ...s, authed: false } : s));
    window.addEventListener("ascend:logout", onLogout);
    return () => window.removeEventListener("ascend:logout", onLogout);
  }, []);

  if (!status) return <div className="grid min-h-screen place-items-center text-muted">Loading…</div>;
  if (!status.authed) return <Login status={status} onDone={refresh} />;

  const logout = async () => {
    await post("/auth/logout", {});
    refresh();
  };

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/fitness" element={<Fitness />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/mind" element={<Mind />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/settings" element={<SettingsPage onLogout={logout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
