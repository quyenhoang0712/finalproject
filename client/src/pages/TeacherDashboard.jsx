import { TeacherReactPage } from "./TeacherReactPage";

export function TeacherDashboard({ user, onLogout }) {
  return <TeacherReactPage user={user} onLogout={onLogout} />;
}
