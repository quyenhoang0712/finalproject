import { BookOpen, CalendarDays, LayoutDashboard, LogOut, Video } from "lucide-react";

const cards = [
  { title: "Dashboard", icon: LayoutDashboard, text: "Daily summaries from the same backend data." },
  { title: "Classes", icon: BookOpen, text: "Classes, rosters, and enrollments will be migrated here." },
  { title: "Schedule", icon: CalendarDays, text: "Schedules continue to come from the Express API." },
  { title: "Online Classes", icon: Video, text: "Live class features will move into React components." },
];

export function RoleShell({ user, path, onLogout }) {
  return (
    <main className="app-page">
      <header className="app-topbar">
        <div>
          <span>React MERN Frontend</span>
          <h1>{user.fullName}</h1>
          <p>{user.role} account - {path}</p>
        </div>
        <button type="button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <section className="react-note">
        <strong>React migration area</strong>
        <p>This screen uses the same login token and backend data. Database records are not changed by the migration.</p>
      </section>

      <section className="feature-grid">
        {cards.map(({ title, icon: Icon, text }) => (
          <article key={title} className="feature-card">
            <Icon />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
