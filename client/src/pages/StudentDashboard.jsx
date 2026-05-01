import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  PencilLine,
  Sparkles,
  Upload,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { OnlineClass } from "../components/online-class/OnlineClass";
import { dateKey } from "../utils/date";
import "../styles/student.css";
import "../styles/onlineClass.css";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["classes", "My Classes", BookOpen],
  ["schedule", "My Schedule", CalendarDays],
  ["attendance", "Attendance", ClipboardCheck],
  ["scores", "Scores", Award],
  ["assignments", "Assignments", FileText],
  ["materials", "Materials", FolderOpen],
  ["feedback", "Feedback", MessageSquare],
  ["online", "Online Classes", Video],
  ["profile", "Profile", UserRound],
];

const viewMeta = {
  dashboard: ["Daily Report", "Today's classes, scores, and tasks"],
  classes: ["My Classes", "Classes you are enrolled in"],
  schedule: ["My Schedule", "Your upcoming and past class sessions"],
  attendance: ["Attendance", "Your recorded attendance"],
  scores: ["My Scores", "View your grades and performance"],
  assignments: ["Assignments", "Track and submit your coursework"],
  materials: ["Materials", "Course materials and resources"],
  feedback: ["Feedback", "Share your class experience"],
  online: ["Online Classes", "Join live rooms when your teacher opens class"],
  profile: ["Profile", "Your account information"],
};

const initialData = {
  enrollments: [],
  schedules: [],
  attendances: [],
  payments: [],
  assignments: [],
  materials: [],
  feedbacks: [],
};

const monthTitle = (value) => value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const getId = (value) => (typeof value === "object" && value ? value._id : value);
const sameId = (left, right) => String(left || "") === String(right || "");
const className = (item) => item?.className || item?.courseId?.title || "Unknown class";
const shortName = (name = "ST") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const scorePercent = (score, max = 100) => Math.round((Number(score || 0) / Number(max || 100)) * 100);

const readFileData = (file) =>
  new Promise((resolve, reject) => {
    if (!file || !file.size) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
const readImageFile = (file) => (file?.size ? readFileData(file) : Promise.resolve(""));

const downloadFile = (item) => {
  if (!item?.fileData) return;
  const link = document.createElement("a");
  link.href = item.fileData;
  link.download = item.fileName || "download";
  link.click();
};

function Empty({ children = "No records found." }) {
  return <div className="empty-state">{children}</div>;
}

function Status({ text }) {
  const isSuccess = /success|successfully|submitted|received|updated/i.test(text || "");
  if (isSuccess) return null;
  return text ? <div className="status-message">{text}</div> : null;
}

function SuccessToast({ text, onDismiss }) {
  return null;
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function ListRow({ title, subtitle, badge }) {
  return (
    <div className="list-row">
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {badge && <Badge>{badge}</Badge>}
    </div>
  );
}

function Table({ rows, columns }) {
  if (!rows.length) return <Empty />;
  return (
    <article className="table-card">
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function StudentDashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [view, setView] = useState("dashboard");
  const [status, setStatus] = useState("");
  const [data, setData] = useState(initialData);
  const [classRosters, setClassRosters] = useState({});
  const [scheduleMonth, setScheduleMonth] = useState(new Date());
  const [submitPopup, setSubmitPopup] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");

  const load = async (successText = "") => {
    setStatus("Loading student data...");
    const [overview, assignments, materials, feedbacks] = await Promise.all([
      api("/api/student/overview"),
      api("/api/assignments/student"),
      api("/api/materials/student"),
      api("/api/feedbacks/mine"),
    ]);
    setData({ ...initialData, ...overview, assignments, materials, feedbacks });
    setStatus(successText);
  };

  useEffect(() => {
    load().catch((error) => setStatus(error.message || "Could not load student data."));
  }, []);

  const submitAssignment = async (assignmentId, form) => {
    const file = form.get("file");
    const content = String(form.get("content") || "").trim();
    if (!file?.size && !content) {
      setStatus("Please choose a file or add a note before submitting.");
      return;
    }

    const fileData = file?.size ? await readFileData(file) : "";
    await api(`/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        fileName: file?.name || "",
        fileType: file?.type || "",
        fileSize: file?.size || 0,
        fileData,
      }),
    });
    await load("Assignment submitted successfully.");
    setSubmitPopup({
      title: "Submission received",
      message: content || file?.name ? "Your assignment has been submitted successfully." : "Your assignment is up to date.",
    });
  };

  const sendFeedback = async (form) => {
    await api("/api/feedbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: String(form.get("classId") || ""),
        punctuality: String(form.get("punctuality") || ""),
        teachingClarity: String(form.get("teachingClarity") || ""),
        contentFit: String(form.get("contentFit") || ""),
        supportiveness: String(form.get("supportiveness") || ""),
        comment: String(form.get("comment") || "").trim(),
      }),
    });
    await load("Feedback sent successfully.");
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const avatar = await readImageFile(form.get("avatar"));
      const payload = {
        fullName: String(form.get("fullName") || "").trim(),
        email: String(form.get("email") || "").trim(),
        caption: String(form.get("caption") || "").trim(),
      };
      if (avatar) payload.avatar = avatar;
      const updated = await api(`/api/users/${currentUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCurrentUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setProfileOpen(false);
      setProfilePreview("");
      setStatus("Profile updated successfully.");
    } catch (error) {
      setStatus(error.message || "Could not update profile.");
    }
  };

  const loadRoster = async (classId) => {
    if (!classId || classRosters[classId]) return;
    try {
      const roster = await api(`/api/student/classes/${classId}/roster`);
      setClassRosters((current) => ({ ...current, [classId]: roster }));
    } catch (error) {
      setStatus(error.message || "Could not load classmates.");
    }
  };

  const [title, subtitle] = useMemo(() => viewMeta[view] || viewMeta.dashboard, [view]);

  return (
    <>
      <header className="student-topbar">
        <div className="student-brand">
          <div className="brand-mark">ML</div>
          <div>
            <strong>My Learning</strong>
            <span>{currentUser.fullName}</span>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
        <div className="avatar">{currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.fullName} /> : shortName(currentUser.fullName)}</div>
      </header>

      <nav className="student-nav" aria-label="Student navigation">
        {navItems.map(([key, label, Icon]) => (
          <button className={`nav-pill ${view === key ? "active" : ""}`} type="button" key={key} onClick={() => setView(key)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <main className="student-main">
        <SuccessToast text={status} onDismiss={() => setStatus("")} />
        <section className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </section>
        <Status text={status} />
        <section className="view active">
          {view === "dashboard" && <DashboardView data={data} />}
          {view === "classes" && <ClassesView enrollments={data.enrollments} rosters={classRosters} onLoadRoster={loadRoster} />}
          {view === "schedule" && <ScheduleView schedules={data.schedules} scheduleMonth={scheduleMonth} setScheduleMonth={setScheduleMonth} />}
          {view === "attendance" && <AttendanceView attendances={data.attendances} schedules={data.schedules} />}
          {view === "scores" && <ScoresView assignments={data.assignments} />}
          {view === "assignments" && (
            <AssignmentsView
              assignments={data.assignments}
              onSubmit={(assignmentId, form) =>
                submitAssignment(assignmentId, form).catch((error) => setStatus(error.message || "Could not submit assignment."))
              }
            />
          )}
          {view === "materials" && <MaterialsView materials={data.materials} />}
          {view === "feedback" && (
            <FeedbackView
              enrollments={data.enrollments}
              feedbacks={data.feedbacks}
              onSubmit={(form) => sendFeedback(form).catch((error) => setStatus(error.message || "Could not send feedback."))}
            />
          )}
          {view === "online" && <OnlineClass role="student" onStatus={setStatus} />}
          {view === "profile" && (
            <ProfileView
              user={currentUser}
              data={data}
              preview={profilePreview}
              setPreview={setProfilePreview}
              isOpen={profileOpen}
              setOpen={setProfileOpen}
              onSubmit={submitProfile}
            />
          )}
        </section>
      </main>
      <SubmitPopup popup={submitPopup} onClose={() => setSubmitPopup(null)} />
    </>
  );
}

function SubmitPopup({ popup, onClose }) {
  if (!popup) return null;
  return createPortal((
    <div className="submit-popup-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="submit-popup" role="dialog" aria-modal="true" aria-labelledby="submitPopupTitle">
        <button className="submit-popup-close" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        <span className="submit-popup-icon"><CheckCircle2 size={30} /></span>
        <h2 id="submitPopupTitle">{popup.title}</h2>
        <p>{popup.message}</p>
        <button className="assignment-button submit" type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  ), document.body);
}

function DashboardView({ data }) {
  const today = dateKey(new Date());
  const todayClasses = data.schedules.filter((item) => dateKey(item.date) === today);
  const pendingAssignments = data.assignments.filter((item) => !item.submission);
  const graded = data.assignments.filter((item) => item.submission && typeof item.submission.score === "number");
  const average = graded.length
    ? Math.round(graded.reduce((sum, item) => sum + scorePercent(item.submission.score, item.maxScore), 0) / graded.length)
    : 0;

  return (
    <>
      <section className="daily-report-hero">
        <div>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          <h2>Learning Briefing</h2>
          <p>{todayClasses.length} classes today, {graded.length} graded works, {pendingAssignments.length} pending tasks.</p>
        </div>
        <div className="daily-report-mark"><Sparkles size={34} /></div>
      </section>

      <div className="metric-grid">
        <article className="metric-card blue-card"><div className="metric-label">Today's Classes</div><strong>{todayClasses.length}</strong></article>
        <article className="metric-card green-card"><div className="metric-label">Latest Average</div><strong>{average}%</strong></article>
        <article className="metric-card purple-card"><div className="metric-label">Graded Work</div><strong>{graded.length}</strong></article>
        <article className="metric-card orange-card"><div className="metric-label">Pending Tasks</div><strong>{pendingAssignments.length}</strong></article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h2>Today's Classes</h2>
          <div className="stack-list">
            {todayClasses.length ? todayClasses.map((item) => (
              <ListRow key={item._id} title={className(item.classId)} subtitle={`${item.room || "No room"} - ${item.startTime || ""}`} badge={item.status} />
            )) : <Empty>No classes scheduled for today.</Empty>}
          </div>
        </article>
        <article className="panel">
          <h2>Daily Scores & Tasks</h2>
          <div className="stack-list">
            {data.assignments.slice(0, 5).map((item) => (
              <ListRow key={item._id} title={item.title} subtitle={className(item.classId)} badge={item.submission ? "done" : "pending"} />
            ))}
            {!data.assignments.length && <Empty>No assignments found.</Empty>}
          </div>
        </article>
      </div>
    </>
  );
}

function ClassesView({ enrollments, rosters, onLoadRoster }) {
  const [activeEnrollment, setActiveEnrollment] = useState(null);

  useEffect(() => {
    if (!activeEnrollment) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeEnrollment]);

  if (!enrollments.length) return <Empty>No enrolled classes yet.</Empty>;
  return (
    <>
      <section className="class-card-grid">
        {enrollments.map((row) => {
          const classId = getId(row.classId);
          return (
            <article className="class-summary-card" key={row._id}>
              <header>
                <div>
                  <h2>{className(row.classId)}</h2>
                  <p>{row.classId?.courseId?.title || "Course"} - {row.classId?.teacherId?.fullName || "No teacher"}</p>
                </div>
                <Badge>{row.status}</Badge>
              </header>
              <div className="class-summary-meta">
                <span><strong>Payment</strong>{row.paymentStatus}</span>
                <span><strong>Mode</strong>{row.classId?.learningMode || row.classId?.courseId?.mode || "N/A"}</span>
                <span><strong>Schedule</strong>{row.classId?.schedule || "N/A"}</span>
              </div>
              <button
                className="assignment-button primary class-detail-button"
                type="button"
                onClick={() => {
                  setActiveEnrollment(row);
                  onLoadRoster(classId);
                }}
              >
                View details
              </button>
            </article>
          );
        })}
      </section>
      <ClassDetailModal
        enrollment={activeEnrollment}
        roster={activeEnrollment ? rosters[getId(activeEnrollment.classId)] || [] : []}
        onClose={() => setActiveEnrollment(null)}
      />
    </>
  );
}

function ClassDetailModal({ enrollment, roster, onClose }) {
  if (!enrollment) return null;
  return createPortal((
    <div className="class-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="class-modal-card" role="dialog" aria-modal="true" aria-labelledby="classDetailTitle">
        <header>
          <div>
            <span>My class</span>
            <h3 id="classDetailTitle">{className(enrollment.classId)}</h3>
            <p>{enrollment.classId?.courseId?.title || "Course"} - {enrollment.classId?.teacherId?.fullName || "No teacher"}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="class-modal-meta">
          <span><strong>Status</strong>{enrollment.status}</span>
          <span><strong>Payment</strong>{enrollment.paymentStatus}</span>
          <span><strong>Mode</strong>{enrollment.classId?.learningMode || enrollment.classId?.courseId?.mode || "N/A"}</span>
          <span><strong>Schedule</strong>{enrollment.classId?.schedule || "N/A"}</span>
        </div>
        <div className="class-roster-list">
          {roster.length ? roster.map((student) => (
            <div className="class-roster-row" key={student._id}>
              <span className="class-roster-avatar">{shortName(student.fullName)}</span>
              <div className="class-roster-main">
                <strong>{student.fullName}</strong>
                <span>{student.email}</span>
              </div>
            </div>
          )) : <Empty>Loading classmates...</Empty>}
        </div>
      </section>
    </div>
  ), document.body);
}

function ScheduleView({ schedules, scheduleMonth, setScheduleMonth }) {
  const todayKey = dateKey(new Date());
  const viewYear = scheduleMonth.getFullYear();
  const viewMonth = scheduleMonth.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const byDay = schedules.reduce((map, item) => {
    const key = dateKey(item.date);
    if (!key) return map;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  byDay.forEach((items) => items.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || ""))));

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthSchedules = schedules.filter((item) => dateKey(item.date).startsWith(monthKey));
  const todaySchedules = byDay.get(todayKey) || [];

  return (
    <>
      <section className="schedule-calendar-card">
        <div className="calendar-toolbar">
          <div><span>Student calendar</span><h2>{monthTitle(scheduleMonth)}</h2></div>
          <div className="calendar-actions">
            <button className="icon-button" type="button" aria-label="Previous month" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth - 1, 1))}><ChevronLeft size={18} /></button>
            <button className="small-button" type="button" onClick={() => setScheduleMonth(new Date())}>Today</button>
            <button className="icon-button" type="button" aria-label="Next month" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth + 1, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="calendar-summary"><strong>{monthSchedules.length}</strong><span>sessions</span></div>
        </div>
        <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((date) => {
            const key = dateKey(date);
            const daySchedules = byDay.get(key) || [];
            return (
              <div className={`calendar-day ${date.getMonth() === viewMonth ? "" : "muted"} ${key === todayKey ? "today" : ""}`} key={key}>
                <div className="calendar-day-top"><span>{date.getDate()}</span>{key === todayKey && <strong>Today</strong>}</div>
                <div className="calendar-events">
                  {daySchedules.slice(0, 3).map((item) => (
                    <article className={`calendar-event ${item.status || "scheduled"}`} key={item._id}>
                      <strong>{className(item.classId)}</strong>
                      <span>{item.startTime || "--:--"} - {item.endTime || "--:--"}</span>
                      <small>{item.room || "No room"}{item.classId?.teacherId ? ` - ${item.classId.teacherId.fullName}` : ""}</small>
                    </article>
                  ))}
                  {daySchedules.length > 3 && <span className="calendar-more">+{daySchedules.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <article className="panel schedule-today-panel">
        <h2>Today's Classes</h2>
        <div className="stack-list">
          {todaySchedules.length ? todaySchedules.map((item) => (
            <ListRow key={item._id} title={className(item.classId)} subtitle={`${item.startTime || ""} - ${item.endTime || ""} - ${item.room || "No room"}`} badge={item.status || "scheduled"} />
          )) : <Empty>No classes scheduled today.</Empty>}
        </div>
      </article>
    </>
  );
}

function AttendanceView({ attendances, schedules }) {
  const present = attendances.filter((item) => item.status === "present").length;
  const late = attendances.filter((item) => item.status === "late").length;
  const absent = attendances.filter((item) => item.status === "absent").length;
  const total = present + late + absent;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return (
    <>
      <div className="metric-grid">
        <article className="metric-card green-card"><div className="metric-label">Present</div><strong>{present}</strong></article>
        <article className="metric-card orange-card"><div className="metric-label">Late</div><strong>{late}</strong></article>
        <article className="metric-card purple-card"><div className="metric-label">Absent</div><strong>{absent}</strong></article>
        <article className="metric-card blue-card"><div className="metric-label">On-time Rate</div><strong>{rate}%</strong></article>
      </div>
      <Table
        rows={attendances}
        columns={[
          { key: "class", label: "Class", render: (row) => className(row.scheduleId?.classId) },
          { key: "date", label: "Date", render: (row) => dateKey(row.scheduleId?.date || row.createdAt) },
          { key: "time", label: "Time", render: (row) => `${row.scheduleId?.startTime || ""} - ${row.scheduleId?.endTime || ""}` },
          { key: "status", label: "Status", render: (row) => <Badge>{row.status || "recorded"}</Badge> },
          { key: "note", label: "Note" },
        ]}
      />
    </>
  );
}

function ScoresView({ assignments }) {
  const graded = assignments.filter((item) => item.submission && typeof item.submission.score === "number");
  const earned = graded.reduce((sum, item) => sum + Number(item.submission.score || 0), 0);
  const possible = graded.reduce((sum, item) => sum + Number(item.maxScore || 100), 0);
  const average = possible ? Math.round((earned / possible) * 100) : 0;
  const subjectRows = Object.values(graded.reduce((groups, item) => {
    const key = className(item.classId);
    if (!groups[key]) groups[key] = { name: key, earned: 0, possible: 0, count: 0 };
    groups[key].earned += Number(item.submission.score || 0);
    groups[key].possible += Number(item.maxScore || 100);
    groups[key].count += 1;
    return groups;
  }, {})).map((item) => ({
    ...item,
    percent: item.possible ? Math.round((item.earned / item.possible) * 100) : 0,
  })).sort((a, b) => b.percent - a.percent);

  if (!graded.length) return <Empty>No graded assignments yet.</Empty>;

  return (
    <section className="score-dashboard">
      <section className="score-overview-card">
        <div>
          <span>Average Score</span>
          <strong>{average}%</strong>
          <p>{earned}/{possible} total points from {graded.length} graded assignments.</p>
        </div>
        <div className="score-donut" style={{ "--score": `${average}%` }}>
          <span>{average}%</span>
        </div>
      </section>

      <section className="score-subject-card">
        <h2>Scores by Class</h2>
        <div className="score-subject-list">
          {subjectRows.map((item) => (
            <article className="score-subject-row" key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.earned}/{item.possible} points - {item.count} assignments</span>
              </div>
              <div className="score-subject-meter"><i style={{ width: `${item.percent}%` }} /></div>
              <b>{item.percent}%</b>
            </article>
          ))}
        </div>
      </section>

      <section className="score-subject-card">
        <h2>Graded Assignments</h2>
        <div className="score-assignment-list compact">
          {graded.map((item) => {
            const percent = scorePercent(item.submission.score, item.maxScore);
            return (
              <article className="score-assignment-card" key={item._id}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{className(item.classId)}</p>
                  <small>{item.submission.feedback || "No feedback"}</small>
                </div>
                <strong>{item.submission.score}/{item.maxScore || 100}</strong>
                <span>{percent}%</span>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function AssignmentsView({ assignments, onSubmit }) {
  const [activeAssignment, setActiveAssignment] = useState(null);

  useEffect(() => {
    if (!activeAssignment) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeAssignment]);

  if (!assignments.length) return <Empty>No assignments yet.</Empty>;
  return (
    <>
      <section className="assignment-list">
        {assignments.map((item) => (
          <article className="assignment-card" key={item._id}>
            <div className="assignment-card-header">
              <div className="assignment-main">
                <h3>{item.title}</h3>
                <p>{className(item.classId)} - due {dateKey(item.dueDate)}</p>
              </div>
            </div>
            <p className="assignment-description">{item.description || "No description"}</p>
            <div className="assignment-actions">
              <Badge>{item.submission ? "submitted" : "pending"}</Badge>
              <button className="assignment-button primary" type="button" onClick={() => setActiveAssignment(item)}>
                View details
              </button>
            </div>
          </article>
        ))}
      </section>
      <AssignmentDetailModal
        assignment={activeAssignment}
        onClose={() => setActiveAssignment(null)}
        onSubmit={async (assignmentId, form) => {
          await onSubmit(assignmentId, form);
          setActiveAssignment(null);
        }}
      />
    </>
  );
}

function AssignmentDetailModal({ assignment, onClose, onSubmit }) {
  if (!assignment) return null;
  return createPortal((
    <div className="assignment-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="assignment-detail-modal" role="dialog" aria-modal="true" aria-labelledby="assignmentDetailTitle">
        <header className="assignment-detail-header">
          <div>
            <Badge>{assignment.submission ? "submitted" : "pending"}</Badge>
            <h2 id="assignmentDetailTitle">{assignment.title}</h2>
            <p>{className(assignment.classId)} - due {dateKey(assignment.dueDate)}</p>
          </div>
          <button className="submit-popup-close" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>

        <p className="assignment-detail-description">{assignment.description || "No description"}</p>

        <div className="assignment-actions">
          {assignment.fileName && (
            <button className="assignment-button primary" type="button" onClick={() => downloadFile(assignment)}>
              <Download size={16} /> Download assignment
            </button>
          )}
          {assignment.submission?.fileName && (
            <button className="assignment-button secondary" type="button" onClick={() => downloadFile(assignment.submission)}>
              <Download size={16} /> Download submitted file
            </button>
          )}
        </div>

        <form
          className="student-submit-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(assignment._id, new FormData(event.currentTarget));
          }}
        >
          <textarea name="content" placeholder="Submission note..." defaultValue={assignment.submission?.content || ""} />
          <div className="student-submit-row">
            <label className="student-file-picker">
              <input name="file" type="file" />
              <Upload size={16} />
              <span>Choose file</span>
            </label>
            <button className="assignment-button submit" type="submit">
              <Upload size={16} /> {assignment.submission ? "Update" : "Submit"}
            </button>
          </div>
        </form>
      </section>
    </div>
  ), document.body);
}

function MaterialsView({ materials }) {
  const [activeMaterial, setActiveMaterial] = useState(null);

  useEffect(() => {
    if (!activeMaterial) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMaterial]);

  if (!materials.length) return <Empty>No materials found.</Empty>;
  return (
    <>
      <section className="material-list student-material-list">
        {materials.map((item) => (
          <article className="material-row student-material-row" key={item._id}>
            <span className="material-icon"><FolderOpen size={20} /></span>
            <div className="material-info">
              <h3>{item.title}</h3>
              <p>{className(item.classId)}</p>
              <small>{item.fileName}</small>
            </div>
            <button className="assignment-button primary" type="button" onClick={() => setActiveMaterial(item)}>View details</button>
          </article>
        ))}
      </section>
      <MaterialDetailModal material={activeMaterial} onClose={() => setActiveMaterial(null)} />
    </>
  );
}

function MaterialDetailModal({ material, onClose }) {
  if (!material) return null;
  return createPortal((
    <div className="material-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="material-detail-modal" role="dialog" aria-modal="true" aria-labelledby="materialDetailTitle">
        <header className="material-detail-header">
          <span className="material-detail-icon"><FolderOpen size={24} /></span>
          <div>
            <h2 id="materialDetailTitle">{material.title}</h2>
            <p>{className(material.classId)}</p>
          </div>
          <button className="submit-popup-close" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="material-detail-body">
          <span>File</span>
          <strong>{material.fileName}</strong>
          {material.description && <p>{material.description}</p>}
        </div>
        <button className="assignment-button submit" type="button" onClick={() => downloadFile(material)}>
          <Download size={16} /> Download material
        </button>
      </section>
    </div>
  ), document.body);
}

function FeedbackView({ enrollments, feedbacks, onSubmit }) {
  return (
    <section className="feedback-layout">
      <form
        className="feedback-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget)).then(() => event.currentTarget.reset());
        }}
      >
        <div className="feedback-form-header">
          <h2>Course Feedback</h2>
          <p>Choose a class and answer the quick questions.</p>
        </div>
        <label className="feedback-field">
          Class / subject
          <select name="classId" required>
            <option value="">Select a class</option>
            {enrollments.map((row) => <option key={row._id} value={getId(row.classId)}>{className(row.classId)}</option>)}
          </select>
        </label>
        <FeedbackSelect name="punctuality" label="Teacher is on time?" />
        <FeedbackSelect name="teachingClarity" label="Lesson is easy to understand?" />
        <FeedbackSelect name="contentFit" label="Content matches the course?" />
        <FeedbackSelect name="supportiveness" label="Teacher supports students well?" />
        <label className="feedback-field feedback-wide">
          Additional comment
          <textarea name="comment" placeholder="Write your note..." />
        </label>
        <button className="small-button" type="submit">Send Feedback</button>
      </form>

      <div className="feedback-history">
        <h2>Sent Feedback</h2>
        <div className="feedback-list">
          {feedbacks.length ? feedbacks.map((item) => (
            <article className="feedback-card" key={item._id}>
              <strong>{className(item.classId)}</strong>
              <p>{item.comment || "No comment"}</p>
              <Badge>{item.authorRole || "student"}</Badge>
            </article>
          )) : <Empty>No feedback sent yet.</Empty>}
        </div>
      </div>
    </section>
  );
}

function FeedbackSelect({ name, label }) {
  return (
    <label className="feedback-field">
      {label}
      <select name={name} required>
        <option value="">Choose</option>
        <option value="yes">Yes</option>
        <option value="sometimes">Sometimes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

function ProfileView({ user, data, preview, setPreview, isOpen, setOpen, onSubmit }) {
  const avatar = preview || user.avatar || "";

  const previewFile = async (event) => {
    const nextPreview = await readImageFile(event.target.files?.[0]);
    if (nextPreview) setPreview(nextPreview);
  };

  return (
    <>
      <article className="profile-card profile-showcase">
        <div className="profile-cover" />
        <div className="profile-summary">
          <div className="profile-photo profile-photo-large">{user.avatar ? <img src={user.avatar} alt={user.fullName} /> : <span>{shortName(user.fullName)}</span>}</div>
          <div className="profile-title">
            <h3>{user.fullName}</h3>
            <p>Student Account</p>
            <small>{user.caption || "No caption yet."}</small>
          </div>
          <button className="ghost-button profile-edit-button" type="button" onClick={() => setOpen(true)}>
            <PencilLine size={16} />
            <span>Edit Profile</span>
          </button>
        </div>
        <div className="profile-info-grid">
          <section>
            <h4>Contact Information</h4>
            <p><span>Email</span>{user.email}</p>
            <p><span>Role</span>{user.role}</p>
          </section>
          <section>
            <h4>Learning Summary</h4>
            <p><span>Classes</span>{data.enrollments.length}</p>
            <p><span>Assignments</span>{data.assignments.length}</p>
            <p><span>Materials</span>{data.materials.length}</p>
          </section>
        </div>
      </article>

      {isOpen && createPortal((
        <div className="profile-modal" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <form className="profile-form profile-edit-form" onSubmit={onSubmit}>
            <div className="profile-modal-header">
              <div>
                <h3>Edit Profile</h3>
                <p>Update your personal information.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setOpen(false)}>x</button>
            </div>
            <div className="profile-avatar-picker">
              <label className="profile-avatar-preview" htmlFor="studentProfileAvatarInput">
                <span>{avatar ? <img src={avatar} alt={user.fullName} /> : <span>{shortName(user.fullName)}</span>}</span>
                <span className="profile-avatar-camera">Change photo</span>
              </label>
              <div>
                <strong>Profile picture</strong>
                <small>Choose an image to preview before saving.</small>
              </div>
            </div>
            <input id="studentProfileAvatarInput" className="profile-file-input" name="avatar" type="file" accept="image/*" onChange={previewFile} />
            <label>Full name<input name="fullName" defaultValue={user.fullName || ""} required /></label>
            <label>Email<input name="email" type="email" defaultValue={user.email || ""} required /></label>
            <label className="profile-wide">Caption<textarea name="caption" placeholder="Write something about yourself..." defaultValue={user.caption || ""} /></label>
            <div className="profile-modal-actions">
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="small-button" type="submit">Save Profile</button>
            </div>
          </form>
        </div>
      ), document.body)}
    </>
  );
}
