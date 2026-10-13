import { Compass, Sparkles } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">LifePilot</p>
            <p className="text-xs text-slate-500">Your agentic day planner</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-5 flex rounded-lg bg-slate-100 p-1 text-sm">
            {(["login", "register"] as Mode[]).map((value) => (
              <button
                key={value}
                className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition ${
                  mode === value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                }`}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
              >
                {value === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <div>
                <label className="label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Doe"
                  required
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting && <Spinner />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Demo account: demo@lifepilot.app / demo1234
          </p>
        </div>
        <p className="mt-5 text-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <Compass className="h-4 w-4" />
            Explore how LifePilot works
          </Link>
        </p>
      </div>
    </div>
  );
}
