import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react";
import { api } from "../api/client";
import { OnlineClass } from "../components/online-class/OnlineClass";

const dateKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getId = (value) => (typeof value === "object" && value ? value._id : value);
const sameId = (left, right) => String(left || "") === String(right || "");
const className = (value) => value?.className || value?.courseId?.title || "Unknown class";
const courseName = (value) => value?.courseId?.title || value?.courseId?.subject || "Course";
const money = (value = 0) => Number(value || 0).toLocaleString("vi-VN");

const roleNav = {
  admin: [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["users", "Users", UsersRound],
    ["courses", "Courses", BookOpen],
    ["classes", "Classes", GraduationCap],
    ["schedules", "Schedules", CalendarDays],
    ["payments", "Payments", CreditCard],
  ],
  teacher: [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["classes", "My Classes", BookOpen],
    ["schedule", "Schedule", CalendarDays],
    ["attendance", "Attendance", ClipboardCheck],
    ["assignments", "Assignments", FileText],
    ["materials", "Materials", BookOpen],
    ["feedback", "Feedback", MessageSquare],
    ["online", "Online", Video],
  ],
  student: [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["classes", "My Classes", BookOpen],
    ["schedule", "Schedule", CalendarDays],
    ["attendance", "Attendance", ClipboardCheck],
    ["payments", "Payments", CreditCard],
    ["online", "Online", Video],
  ],
  parent: [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["children", "Children", UsersRound],
    ["classes", "Classes", BookOpen],
    ["schedule", "Schedule", CalendarDays],
    ["payments", "Payments", CreditCard],
    ["online", "Online", Video],
  ],
};

function MetricCard({ label, value, helper }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function EmptyState({ text = "No data found." }) {
  return <div className="empty-state">{text}</div>;
}

function DataTable({ columns, rows, empty }) {
  if (!rows?.length) return <EmptyState text={empty} />;
  return (
    <div className="react-table-wrap">
      <table className="react-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OnlineClassesPanel({ items }) {
  return (
    <section className="panel">
      <h2>Online Classes</h2>
      <div className="stack-list">
        {items?.length ? (
          items.map((item) => (
            <article className="list-row" key={item.schedule?._id}>
              <div>
                <strong>{className(item.schedule?.classId)}</strong>
                <span>
                  {dateKey(item.schedule?.date)} {item.schedule?.startTime} - {item.schedule?.endTime}
                </span>
              </div>
              <span className={`badge ${item.session?.status === "live" ? "live" : ""}`}>
                {item.session?.status || (item.isClassTime ? "class time" : "scheduled")}
              </span>
            </article>
          ))
        ) : (
          <EmptyState text="No online classes available." />
        )}
      </div>
    </section>
  );
}

function AdminViews({ activeView, data }) {
  const { summary, users = [], courses = [], classes = [], schedules = [], payments = [] } = data;
  if (activeView === "users") {
    return (
      <DataTable
        rows={users}
        empty="No users found."
        columns={[
          { key: "fullName", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
        ]}
      />
    );
  }
  if (activeView === "courses") {
    return (
      <DataTable
        rows={courses}
        empty="No courses found."
        columns={[
          { key: "title", label: "Title" },
          { key: "subject", label: "Subject" },
          { key: "mode", label: "Mode" },
          { key: "price", label: "Price", render: (row) => `${money(row.price)} VND` },
        ]}
      />
    );
  }
  if (activeView === "classes") {
    return (
      <DataTable
        rows={classes}
        empty="No classes found."
        columns={[
          { key: "className", label: "Class" },
          { key: "course", label: "Course", render: (row) => courseName(row) },
          { key: "teacher", label: "Teacher", render: (row) => row.teacherId?.fullName || "N/A" },
          { key: "status", label: "Status" },
        ]}
      />
    );
  }
  if (activeView === "schedules") {
    return (
      <DataTable
        rows={schedules}
        empty="No schedules found."
        columns={[
          { key: "date", label: "Date", render: (row) => dateKey(row.date) },
          { key: "class", label: "Class", render: (row) => className(row.classId) },
          { key: "time", label: "Time", render: (row) => `${row.startTime} - ${row.endTime}` },
          { key: "room", label: "Room" },
          { key: "status", label: "Status" },
        ]}
      />
    );
  }
  if (activeView === "payments") {
    return (
      <DataTable
        rows={payments}
        empty="No payments found."
        columns={[
          { key: "student", label: "Student", render: (row) => row.studentId?.fullName || "N/A" },
          { key: "class", label: "Class", render: (row) => className(row.classId) },
          { key: "amount", label: "Amount", render: (row) => `${money(row.amount)} VND` },
          { key: "status", label: "Status" },
        ]}
      />
    );
  }
  return (
    <>
      <section className="metric-grid">
        <MetricCard label="Users" value={summary?.totalUsers || users.length} helper="All accounts" />
        <MetricCard label="Courses" value={summary?.totalCourses || courses.length} helper="Course catalog" />
        <MetricCard label="Classes" value={summary?.totalClasses || classes.length} helper="Active records" />
        <MetricCard label="Revenue" value={`${money(summary?.totalRevenue)} VND`} helper="Paid payments" />
      </section>
      <section className="dashboard-grid">
        <section className="panel">
          <h2>Recent Classes</h2>
          <div className="stack-list">
            {classes.slice(0, 5).map((item) => (
              <article className="list-row" key={item._id}>
                <div><strong>{item.className}</strong><span>{courseName(item)}</span></div>
                <span className="badge">{item.status}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Payment Status</h2>
          <div className="stack-list">
            <article className="list-row"><strong>Paid</strong><span className="badge">{summary?.paymentsByStatus?.paid || 0}</span></article>
            <article className="list-row"><strong>Pending</strong><span className="badge">{summary?.paymentsByStatus?.pending || 0}</span></article>
            <article className="list-row"><strong>Failed</strong><span className="badge">{summary?.paymentsByStatus?.failed || 0}</span></article>
          </div>
        </section>
      </section>
    </>
  );
}

function TeacherViews({ activeView, data }) {
  const { classes = [], schedules = [], attendances = [], assignments = [], materials = [], feedbacks = [], online = [] } = data;
  if (activeView === "classes") {
    return <ClassCards classes={classes} />;
  }
  if (activeView === "schedule") {
    return <ScheduleTable schedules={schedules} />;
  }
  if (activeView === "attendance") {
    return <AttendanceTable attendances={attendances} />;
  }
  if (activeView === "assignments") {
    return <AssignmentTable assignments={assignments} />;
  }
  if (activeView === "materials") {
    return <MaterialTable materials={materials} />;
  }
  if (activeView === "feedback") {
    return <FeedbackTable feedbacks={feedbacks} />;
  }
  if (activeView === "online") {
    return <OnlineClass role="teacher" />;
  }
  const today = dateKey(new Date());
  return (
    <>
      <section className="metric-grid">
        <MetricCard label="My Classes" value={classes.length} helper="Assigned classes" />
        <MetricCard label="Today" value={schedules.filter((item) => dateKey(item.date) === today).length} helper="Teaching sessions" />
        <MetricCard label="Attendance" value={attendances.length} helper="Records visible" />
        <MetricCard label="Assignments" value={assignments.length} helper="Coursework" />
      </section>
      <section className="dashboard-grid">
        <section className="panel">
          <h2>Today's Teaching</h2>
          <div className="stack-list">
            {schedules.filter((item) => dateKey(item.date) === today).map((item) => (
              <article className="list-row" key={item._id}>
                <div><strong>{className(item.classId)}</strong><span>{item.startTime} - {item.endTime}</span></div>
                <span className="badge">{item.room || "Room"}</span>
              </article>
            ))}
          </div>
        </section>
        <OnlineClassesPanel items={online.slice(0, 5)} />
      </section>
    </>
  );
}

function LearnerViews({ activeView, data, role }) {
  const { enrollments = [], schedules = [], attendances = [], payments = [], online = [] } = data;
  if (activeView === "classes" || activeView === "children") return <EnrollmentCards enrollments={enrollments} role={role} />;
  if (activeView === "schedule") return <ScheduleTable schedules={schedules} />;
  if (activeView === "attendance") return <AttendanceTable attendances={attendances} />;
  if (activeView === "payments") return <PaymentTable payments={payments} />;
  if (activeView === "online") return <OnlineClass role={role} />;
  return (
    <>
      <section className="metric-grid">
        <MetricCard label="Classes" value={enrollments.length} helper={role === "parent" ? "Child enrollments" : "Enrolled classes"} />
        <MetricCard label="Schedules" value={schedules.length} helper="Class sessions" />
        <MetricCard label="Attendance" value={attendances.length} helper="Recorded sessions" />
        <MetricCard label="Payments" value={payments.length} helper="Payment records" />
      </section>
      <section className="dashboard-grid">
        <section className="panel">
          <h2>Upcoming Schedule</h2>
          <div className="stack-list">
            {schedules.slice(0, 6).map((item) => (
              <article className="list-row" key={item._id}>
                <div><strong>{className(item.classId)}</strong><span>{dateKey(item.date)} {item.startTime}</span></div>
                <span className="badge">{item.status}</span>
              </article>
            ))}
          </div>
        </section>
        <OnlineClassesPanel items={online.slice(0, 5)} />
      </section>
    </>
  );
}

function ClassCards({ classes }) {
  if (!classes?.length) return <EmptyState text="No classes found." />;
  return (
    <section className="card-grid">
      {classes.map((item) => (
        <article className="summary-card" key={item._id}>
          <h2>{item.className}</h2>
          <p>{courseName(item)}</p>
          <div><span>Teacher</span><strong>{item.teacherId?.fullName || "N/A"}</strong></div>
          <div><span>Schedule</span><strong>{item.schedule || "N/A"}</strong></div>
          <div><span>Status</span><strong>{item.status || "N/A"}</strong></div>
        </article>
      ))}
    </section>
  );
}

function EnrollmentCards({ enrollments, role }) {
  if (!enrollments?.length) return <EmptyState text="No enrollments found." />;
  return (
    <section className="card-grid">
      {enrollments.map((item) => (
        <article className="summary-card" key={item._id}>
          <h2>{className(item.classId)}</h2>
          <p>{courseName(item.classId)}</p>
          {role === "parent" && <div><span>Student</span><strong>{item.studentId?.fullName || "N/A"}</strong></div>}
          <div><span>Teacher</span><strong>{item.classId?.teacherId?.fullName || "N/A"}</strong></div>
          <div><span>Status</span><strong>{item.status}</strong></div>
          <div><span>Payment</span><strong>{item.paymentStatus}</strong></div>
        </article>
      ))}
    </section>
  );
}

function ScheduleTable({ schedules }) {
  return (
    <DataTable
      rows={schedules}
      empty="No schedules found."
      columns={[
        { key: "date", label: "Date", render: (row) => dateKey(row.date) },
        { key: "class", label: "Class", render: (row) => className(row.classId) },
        { key: "time", label: "Time", render: (row) => `${row.startTime || ""} - ${row.endTime || ""}` },
        { key: "room", label: "Room" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}

function AttendanceTable({ attendances }) {
  return (
    <DataTable
      rows={attendances}
      empty="No attendance records found."
      columns={[
        { key: "student", label: "Student", render: (row) => row.studentId?.fullName || "Me" },
        { key: "class", label: "Class", render: (row) => className(row.scheduleId?.classId) },
        { key: "status", label: "Status" },
        { key: "note", label: "Note" },
      ]}
    />
  );
}

function PaymentTable({ payments }) {
  return (
    <DataTable
      rows={payments}
      empty="No payment records found."
      columns={[
        { key: "student", label: "Student", render: (row) => row.studentId?.fullName || "N/A" },
        { key: "class", label: "Class", render: (row) => className(row.classId) },
        { key: "amount", label: "Amount", render: (row) => `${money(row.amount)} VND` },
        { key: "status", label: "Status" },
      ]}
    />
  );
}

function AssignmentTable({ assignments }) {
  return (
    <DataTable
      rows={assignments}
      empty="No assignments found."
      columns={[
        { key: "title", label: "Title" },
        { key: "class", label: "Class", render: (row) => className(row.classId) },
        { key: "dueDate", label: "Due Date", render: (row) => dateKey(row.dueDate) },
        { key: "submissions", label: "Submissions", render: (row) => row.submissions?.length || 0 },
      ]}
    />
  );
}

function MaterialTable({ materials }) {
  return (
    <DataTable
      rows={materials}
      empty="No materials found."
      columns={[
        { key: "title", label: "Title" },
        { key: "class", label: "Class", render: (row) => className(row.classId) },
        { key: "fileName", label: "File" },
      ]}
    />
  );
}

function FeedbackTable({ feedbacks }) {
  return (
    <DataTable
      rows={feedbacks}
      empty="No feedback found."
      columns={[
        { key: "class", label: "Class", render: (row) => className(row.classId) },
        { key: "role", label: "Author", render: (row) => row.authorRole || "N/A" },
        { key: "comment", label: "Comment" },
      ]}
    />
  );
}

export function RoleDashboard({ user, path, onLogout }) {
  const [activeView, setActiveView] = useState("dashboard");
  const [data, setData] = useState({});
  const [status, setStatus] = useState("Loading data...");
  const nav = roleNav[user.role] || roleNav.student;

  const loadData = async () => {
    setStatus("Loading data...");
    if (user.role === "admin") {
      const [summary, users, courses, classes, schedules, payments] = await Promise.all([
        api("/api/dashboard/summary"),
        api("/api/users"),
        api("/api/courses"),
        api("/api/classes"),
        api("/api/schedules"),
        api("/api/payments"),
      ]);
      setData({ summary, users, courses, classes, schedules, payments });
    }

    if (user.role === "teacher") {
      const [classes, schedules, attendances, assignments, materials, feedbacks, online] = await Promise.all([
        api("/api/classes"),
        api("/api/schedules"),
        api("/api/attendances"),
        api("/api/assignments/teacher"),
        api("/api/materials/teacher"),
        api("/api/feedbacks/teacher"),
        api("/api/online-classes"),
      ]);
      const myClasses = classes.filter((item) => sameId(getId(item.teacherId), user._id));
      const myClassIds = new Set(myClasses.map((item) => String(item._id)));
      const mySchedules = schedules.filter((item) => myClassIds.has(String(getId(item.classId))));
      setData({ classes: myClasses, schedules: mySchedules, attendances, assignments, materials, feedbacks, online });
    }

    if (user.role === "student") {
      const [overview, online] = await Promise.all([api("/api/student/overview"), api("/api/online-classes")]);
      setData({ ...overview, online });
    }

    if (user.role === "parent") {
      const [overview, online] = await Promise.all([api("/api/parent/overview"), api("/api/online-classes")]);
      setData({ ...overview, online });
    }
    setStatus("");
  };

  useEffect(() => {
    loadData().catch((err) => setStatus(err.message || "Could not load data."));
  }, [user.role, user._id]);

  const title = useMemo(() => nav.find(([key]) => key === activeView)?.[1] || "Dashboard", [activeView, nav]);

  return (
    <main className={`role-app role-${user.role}`}>
      <header className="role-topbar">
        <div className="role-brand">
          <div className="brand-mark">{user.role.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.role === "teacher" ? "Teaching Hub" : user.role === "student" ? "My Learning" : user.role === "admin" ? "Admin Center" : "Parent Portal"}</strong>
            <span>{user.fullName}</span>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <nav className="role-nav">
        {nav.map(([key, label, Icon]) => (
          <button key={key} className={activeView === key ? "active" : ""} type="button" onClick={() => setActiveView(key)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <section className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>React frontend route: {path}</p>
        </div>
        <button className="refresh-button" type="button" onClick={() => loadData().catch((err) => setStatus(err.message))}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </section>

      {status && <div className="status-message">{status}</div>}

      <section className="role-content">
        {user.role === "admin" && <AdminViews activeView={activeView} data={data} />}
        {user.role === "teacher" && <TeacherViews activeView={activeView} data={data} />}
        {(user.role === "student" || user.role === "parent") && <LearnerViews activeView={activeView} data={data} role={user.role} />}
      </section>
    </main>
  );
}
