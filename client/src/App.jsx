import { lazy, Suspense, useEffect, useState } from "react";
import { clearSession, getStoredUser } from "./auth/session";
import { LoginPage } from "./pages/LoginPage";

const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard").then((module) => ({ default: module.ParentDashboard })));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard").then((module) => ({ default: module.StudentDashboard })));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard").then((module) => ({ default: module.TeacherDashboard })));

export function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    document.title = user ? `${user.fullName} | Tutoring Center` : "Tutoring Center";
  }, [user]);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleLogin = (nextUser) => {
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
      <Dashboard user={user} path={path} onLogout={handleLogout} />
    </Suspense>
  );

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === "admin") return renderDashboard(AdminDashboard);
  if (user.role === "teacher") return renderDashboard(TeacherDashboard);
  if (user.role === "student") return renderDashboard(StudentDashboard);
  if (user.role === "parent") return renderDashboard(ParentDashboard);
  return <LoginPage onLogin={handleLogin} />;
}
