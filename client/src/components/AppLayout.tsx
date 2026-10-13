import {
  BarChart3,
  CalendarClock,
  Compass,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Sparkles,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/planner", label: "Planner", icon: CalendarClock },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/assistant", label: "Assistant", icon: Sparkles },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/explore", label: "Explore", icon: Compass },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">LifePilot</p>
            <p className="text-xs text-slate-400">Personal AI agent</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-slate-200 p-4 md:block">
          <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <button className="btn-secondary mt-3 w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
