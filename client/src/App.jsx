import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "./api/client";
import { clearSession, getStoredUser, redirectForRole } from "./auth/session";
import { LoginPage } from "./pages/LoginPage";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard").then((module) => ({ default: module.ParentDashboard })));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard").then((module) => ({ default: module.StudentDashboard })));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard })));

export function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [path, setPath] = useState(() => window.location.pathname);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    document.title = user ? `${user.fullName} | Tutoring Center` : "Tutoring Center";
  }, [user]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setCheckingSession(false);
      return undefined;
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const freshUser = await api("/api/users/profile/me");
        if (cancelled) return;

        localStorage.setItem("user", JSON.stringify(freshUser));
        setUser(freshUser);

        const nextPath = redirectForRole(freshUser.role);
        if (nextPath && window.location.pathname !== nextPath) {
          window.history.replaceState({}, "", nextPath);
        }
        setPath(window.location.pathname);
      } catch (error) {
        if (cancelled) return;

        clearSession();
        window.history.replaceState({}, "", "/");
        setUser(null);
        setPath("/");
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleLogin = (nextUser) => {
    const nextPath = redirectForRole(nextUser.role);
    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setUser(nextUser);
    setPath(window.location.pathname);
  };

  const handleLogout = () => {
    clearSession();
    window.history.pushState({}, "", "/");
    setUser(null);
    setPath("/");
  };

  const renderDashboard = (Dashboard) => (
    <Suspense fallback={<div className="app-loading">Loading...</div>}>
      <Dashboard key={`${user._id}:${user.role}`} user={user} path={path} onLogout={handleLogout} />
    </Suspense>
  );

  if (checkingSession) return <div className="app-loading">Loading...</div>;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === "admin") return renderDashboard(AdminDashboard);
  if (user.role === "teacher") return renderDashboard(TeacherDashboard);
  if (user.role === "student") return renderDashboard(StudentDashboard);
  if (user.role === "parent") return renderDashboard(ParentDashboard);
  return <LoginPage onLogin={handleLogin} />;
}
