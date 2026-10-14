import { Compass, KeyRound, Mail, Sparkles, User as UserIcon, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
  const { user, initializing, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!initializing && user) return <Navigate to="/" replace />;

  const fillDemo = () => {
    setMode("login");
    setEmail("demo@lifepilot.app");
    setPassword("demo1234");
    setError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "register") await register({ name, email, password });
      else await login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">LifePilot</h1>
          <p className="mt-1 text-sm text-slate-500">Autonomous Agentic Daily Planner & Focus Coach</p>
        </div>

        {/* Auth Card */}
        <div className="card p-7 shadow-xl shadow-slate-200/50">
          {/* Quick Demo Fill Banner */}
          <div className="mb-6 rounded-xl border border-brand-200/80 bg-brand-50/60 p-3.5 text-xs text-brand-900 flex items-center justify-between gap-2">
            <div>
              <p className="font-bold flex items-center gap-1.5 text-brand-900">
                <Zap className="h-3.5 w-3.5 text-brand-600 fill-brand-600" />
                Quick Demo Account
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">Pre-seeded with tasks, plans & notes</p>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition shrink-0"
            >
              Fill Credentials
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            {(["login", "register"] as Mode[]).map((value) => (
              <button
                key={value}
                className={`flex-1 rounded-lg px-3 py-2 transition ${
                  mode === value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
              >
                {value === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="name"
                    className="field pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  className="field pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  className="field pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={mode === "register" ? 8 : undefined}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 shadow-md shadow-brand-500/20"
              disabled={submitting}
            >
              {submitting ? (
                <Spinner className="h-4 w-4 text-white" />
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-400 font-mono">
            demo@lifepilot.app / demo1234
          </p>
        </div>

        {/* Explore Link */}
        <p className="mt-6 text-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition"
          >
            <Compass className="h-4 w-4" />
            Explore LifePilot Architecture & Demo
          </Link>
        </p>
      </div>
    </div>
  );
}
