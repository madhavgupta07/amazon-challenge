import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { Spinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import AssistantPage from "./pages/AssistantPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import InsightsPage from "./pages/InsightsPage";
import NotesPage from "./pages/NotesPage";
import PlannerPage from "./pages/PlannerPage";
import TasksPage from "./pages/TasksPage";

const ExplorePage = lazy(() => import("./explore/ExplorePage"));

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center text-slate-500">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/explore"
        element={
          <Suspense fallback={<FullScreenLoader />}>
            <ExplorePage />
          </Suspense>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="insights" element={<InsightsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
