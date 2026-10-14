import {
  BarChart3,
  CalendarClock,
  Compass,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200/80 bg-white">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md shadow-brand-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 tracking-tight">LifePilot</p>
            <p className="text-xs font-medium text-slate-400">Personal AI agent</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main Navigation">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-brand-50/80 text-brand-700 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 transition-colors group-hover:text-brand-600" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Sign Out */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 px-2 py-1 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 border border-slate-200">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-800">{user?.name ?? "User"}</p>
              <p className="truncate text-[11px] text-slate-400 font-mono">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary w-full text-xs font-semibold py-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm">LifePilot</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs pt-16">
          <div className="bg-white border-b border-slate-200 p-4 space-y-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600"
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{label}</span>
              </NavLink>
            ))}
            <div className="pt-3 border-t border-slate-100">
              <button onClick={handleLogout} className="btn-secondary w-full text-xs py-2">
                <LogOut className="h-3.5 w-3.5" />
                Sign out ({user?.name})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Sleek Top Header Bar */}
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="hidden md:flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-8 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks, notes, or ask assistant..."
                className="w-80 rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-50"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              MCP Tools Online (13)
            </span>
            <button
              onClick={() => navigate("/assistant")}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask LifePilot
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
