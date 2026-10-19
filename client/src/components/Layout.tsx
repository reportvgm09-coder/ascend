import { Apple, Brain, BookOpen, Dumbbell, LogOut, MessageCircle, Settings, Sun, Target } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cx } from "./ui";

const NAV = [
  { to: "/", label: "Today", icon: Sun },
  { to: "/fitness", label: "Fitness", icon: Dumbbell },
  { to: "/nutrition", label: "Diet", icon: Apple },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/mind", label: "Mind", icon: Brain },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/coach", label: "Coach", icon: MessageCircle },
];

export default function Layout({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-panel px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight">Ascend</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", isActive ? "bg-panel-2 text-slate-100" : "text-muted hover:text-slate-200")}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", isActive ? "bg-panel-2 text-slate-100" : "text-muted hover:text-slate-200")}>
          <Settings size={18} /> Settings
        </NavLink>
        <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:text-slate-200">
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <span className="font-bold">Ascend</span>
        </div>
        <NavLink to="/settings" className="text-muted" aria-label="Settings"><Settings size={20} /></NavLink>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 md:px-8 md:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => cx("flex flex-col items-center gap-0.5 py-2 text-[10px]", isActive ? "text-brand" : "text-muted")}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
