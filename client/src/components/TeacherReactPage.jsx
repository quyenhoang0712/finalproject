import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { OnlineClass } from "./OnlineClass";
import "../../assets/css/teacher.css";
import "../../assets/css/onlineClass.css";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["classes", "My Classes", BookOpen],
  ["schedule", "Teaching Schedule", CalendarDays],
  ["attendance", "Attendance", ClipboardCheck],
  ["assignments", "Assignments", FileText],
  ["materials", "Materials", FolderOpen],
  ["feedback", "Feedback", MessageSquare],
  ["online", "Online Classes", Video],
  ["profile", "Profile", UserRound],
];

const viewMeta = {
  dashboard: ["Daily Report", "Today's teaching, attendance, and grading"],
  classes: ["My Classes", "Classes and students assigned to you"],
  schedule: ["Teaching Schedule", "Sessions assigned to your classes"],
  attendance: ["Attendance", "Attendance records you can review"],
  assignments: ["Assignments", "Create and review coursework"],
  materials: ["Materials", "Upload course resources"],
  feedback: ["Feedback", "Feedback from students and parents"],
  online: ["Online Classes", "Live rooms for your scheduled classes"],
  profile: ["Profile", "Current teacher account"],
};

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const monthTitle = (value) => value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const isToday = (value) => safeDate(value) === safeDate(new Date());
const sameId = (left, right) => String(left || "") === String(right || "");
const getId = (value) => (typeof value === "object" && value ? value._id : value);
const className = (item) => item?.className || item?.courseId?.title || "Unknown class";
const studentName = (item) => item?.fullName || "Unknown student";
const shortName = (name = "TC") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const readFileData = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function Status({ text }) {
  return text ? <div className="status-message">{text}</div> : null;
}

function Empty({ children }) {
  return <div className="empty-state">{children}</div>;
}

function FileDownloadButton({ item, label = "Download", className = "small-button" }) {
  const download = () => {
    if (!item?.fileData) return;
    const link = document.createElement("a");
    link.href = item.fileData;
    link.download = item.fileName || "download";
    link.click();
  };
  return (
    <button className={className} type="button" disabled={!item?.fileData} onClick={download}>
      {label}
    </button>
  );
}

function TeacherDashboard({ data }) {
  const todaySchedules = data.schedules.filter((item) => isToday(item.date));
  const todayClassIds = new Set(todaySchedules.map((item) => String(getId(item.classId))));
  const pendingAttendance = todaySchedules.filter(
    (schedule) => !data.attendances.some((attendance) => sameId(getId(attendance.scheduleId), schedule._id))
  ).length;
  const ungraded = data.assignments.reduce(
    (sum, assignment) => sum + (assignment.submissions || []).filter((submission) => typeof submission.score !== "number").length,
    0
  );
  const studentsToday = data.enrollments
    .filter((item) => todayClassIds.has(String(getId(item.classId))) && item.studentId)
    .reduce((map, item) => map.set(String(item.studentId._id), item.studentId), new Map()).size;

  return (
    <>
      <section className="daily-report-hero">
        <div>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          <h2>Teaching Briefing</h2>
          <p>{todaySchedules.length} classes today, {pendingAttendance} attendance checks, {ungraded} submissions to grade.</p>
        </div>
        <div className="daily-report-mark"><Sparkles size={34} /></div>
      </section>
      <div className="metric-grid">
        <article className="metric-card"><span>Teaching Today</span><strong>{todaySchedules.length}</strong><small>Today's sessions</small><div className="metric-icon blue">CL</div></article>
        <article className="metric-card"><span>Students Today</span><strong>{studentsToday}</strong><small>Expected learners</small><div className="metric-icon purple">ST</div></article>
        <article className="metric-card"><span>Attendance Needed</span><strong>{pendingAttendance}</strong><small className="warn">Needs review</small><div className="metric-icon orange">AT</div></article>
        <article className="metric-card"><span>To Grade</span><strong>{ungraded}</strong><small>Pending submissions</small><div className="metric-icon green">TD</div></article>
      </div>
      <div className="dashboard-grid">
        <article className="panel">
          <h2>Today's Teaching</h2>
          <div className="stack-list">
            {todaySchedules.length ? todaySchedules.map((item) => (
              <div className="list-row daily-schedule-row" key={item._id}>
                <div className="list-main">
                  <div className="time-text">{item.startTime || "--:--"}</div>
                  <div><strong>{className(item.classId)}</strong><span>{item.endTime || "--:--"} - {item.room || "No room"}</span></div>
                </div>
                <span className="badge">{item.status || "scheduled"}</span>
              </div>
            )) : <Empty>No classes scheduled for today.</Empty>}
          </div>
        </article>
        <article className="panel">
          <h2>Daily Grading & Attendance</h2>
          <div className="performance-list">
            {todaySchedules.map((schedule) => {
              const records = data.attendances.filter((item) => sameId(getId(item.scheduleId), schedule._id));
              return (
                <div className={`performance-item daily-progress-card ${records.length ? "complete" : "needs-action"}`} key={schedule._id}>
                  <strong>{className(schedule.classId)}</strong>
                  <div className="progress-line">
                    <span>{records.length ? `${records.length} records` : "Attendance needed"}</span>
                    <div className="track"><div className="fill purple" style={{ width: records.length ? "100%" : "45%" }}>{records.length ? "complete" : "not recorded"}</div></div>
                  </div>
                </div>
              );
            })}
            {!todaySchedules.length && <Empty>No teaching report items for today.</Empty>}
          </div>
        </article>
      </div>
    </>
  );
}

function ClassesView({ classes, enrollments }) {
  return (
    <section className="class-card-grid">
      {classes.length ? classes.map((item) => {
        const count = enrollments.filter((enrollment) => sameId(getId(enrollment.classId), item._id)).length;
        return (
          <article className="class-summary-card teacher-class-card" key={item._id}>
            <header>
              <div><h2>{className(item)}</h2><p>{item.courseId?.title || "Course"} - {item.schedule || "No schedule"}</p></div>
              <span className="badge">{item.status || "ongoing"}</span>
            </header>
            <div className="teacher-class-meta">
              <span><strong>Status</strong>{item.status || "upcoming"}</span>
              <span><strong>Course</strong>{item.courseId?.subject || item.courseId?.title || "N/A"}</span>
              <span><strong>Students</strong>{count}</span>
            </div>
          </article>
        );
      }) : <Empty>No assigned classes yet.</Empty>}
    </section>
  );
}

function ScheduleView({ schedules, scheduleMonth, setScheduleMonth }) {
  const todayKey = safeDate(new Date());
  const viewYear = scheduleMonth.getFullYear();
  const viewMonth = scheduleMonth.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const byDay = schedules.reduce((map, item) => {
    const key = safeDate(item.date);
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
  const monthSchedules = schedules.filter((item) => safeDate(item.date).startsWith(monthKey));
  const todaySchedules = byDay.get(todayKey) || [];

  return (
    <>
      <section className="schedule-calendar-card">
        <div className="calendar-toolbar">
          <div><span>Teaching calendar</span><h2>{monthTitle(scheduleMonth)}</h2></div>
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
            const key = safeDate(date);
            const daySchedules = byDay.get(key) || [];
            return (
              <div className={`calendar-day ${date.getMonth() === viewMonth ? "" : "muted"} ${key === todayKey ? "today" : ""}`} key={key}>
                <div className="calendar-day-top"><span>{date.getDate()}</span>{key === todayKey && <strong>Today</strong>}</div>
                <div className="calendar-events">
                  {daySchedules.slice(0, 3).map((item) => (
                    <article className={`calendar-event ${item.status || "scheduled"}`} key={item._id}>
                      <strong>{className(item.classId)}</strong>
                      <span>{item.startTime || "--:--"} - {item.endTime || "--:--"}</span>
                      <small>{item.room || "No room"}</small>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <article className="panel schedule-today-panel">
        <h2>Today's Teaching</h2>
        <div className="stack-list">
          {todaySchedules.length ? todaySchedules.map((item) => (
            <div className="list-row" key={item._id}>
              <div><strong>{className(item.classId)}</strong><span>{item.startTime || ""} - {item.endTime || ""} - {item.room || "No room"}</span></div>
              <span className="badge">{item.status || "scheduled"}</span>
            </div>
          )) : <Empty>No classes scheduled today.</Empty>}
        </div>
      </article>
    </>
  );
}

function AttendanceView({ schedules, onOpenRoster }) {
  const todaySchedules = schedules.filter((item) => isToday(item.date));
  return (
    <section className="attendance-layout">
      <article className="panel">
        <h2>Attendance Sessions</h2>
        <div className="stack-list">
          {(todaySchedules.length ? todaySchedules : schedules).map((schedule) => (
            <div className="list-row" key={schedule._id}>
              <div><strong>{className(schedule.classId)}</strong><span>{safeDate(schedule.date)} {schedule.startTime} - {schedule.endTime}</span></div>
              <button className="small-button" type="button" onClick={() => onOpenRoster(schedule._id)}>Manage</button>
            </div>
          ))}
          {!schedules.length && <Empty>No attendance sessions found.</Empty>}
        </div>
      </article>
    </section>
  );
}

function AttendanceRosterModal({ rosterId, roster, onClose, onSave }) {
  if (!rosterId) return null;

  return (
    <div className="attendance-modal" role="dialog" aria-modal="true" aria-labelledby="attendanceRosterTitle">
      <section className="attendance-modal-card">
        <header className="attendance-modal-header">
          <div>
            <span>Class roster</span>
            <h3 id="attendanceRosterTitle">{roster ? className(roster.schedule?.classId) : "Loading roster"} Roster</h3>
            <p>{roster?.schedule ? `${safeDate(roster.schedule.date)} ${roster.schedule.startTime || ""} - ${roster.schedule.endTime || ""}` : "Loading attendance data..."}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close roster" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="attendance-modal-list">
          {roster ? (roster.students || []).map((student) => {
            const record = (roster.attendances || []).find((item) => sameId(item.studentId?._id || item.studentId, student._id));
            return <AttendanceRow key={student._id} student={student} record={record} scheduleId={rosterId} onSave={onSave} />;
          }) : <Empty>Loading roster...</Empty>}
          {roster && !(roster.students || []).length && <Empty>No students found for this class.</Empty>}
        </div>
        <footer className="attendance-modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}

function AttendanceRow({ student, record, scheduleId, onSave }) {
  const [status, setStatus] = useState(record?.status || "present");
  const [note, setNote] = useState(record?.note || "");
  useEffect(() => {
    setStatus(record?.status || "present");
    setNote(record?.note || "");
  }, [record?.status, record?.note]);
  return (
    <div className="attendance-modal-row">
      <div className="attendance-student-main">
        <div className="attendance-student-avatar">{shortName(student.fullName)}</div>
        <div><strong>{student.fullName}</strong><span>{student.email}</span></div>
      </div>
      <label className="attendance-status-field">
        <span>Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
      </label>
      <label className="attendance-note-field">
        <span>Note</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" />
      </label>
      <button className="small-button" type="button" onClick={() => onSave(scheduleId, student._id, status, note)}>Save</button>
    </div>
  );
}

function AssignmentsView({ classes, assignments, onCreate, onDelete, onGrade }) {
  const [form, setForm] = useState({ title: "", description: "", classId: "", dueDate: "", maxScore: 100 });
  const [file, setFile] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewAssignment, setReviewAssignment] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    await onCreate(form, file);
    setForm({ title: "", description: "", classId: "", dueDate: "", maxScore: 100 });
    setFile(null);
    event.currentTarget.reset();
    setCreateOpen(false);
  };
  return (
    <section className="teacher-assignment-layout assignment-overview">
      <section className="teacher-assignment-list">
        <header className="assignment-list-header">
          <div>
            <h2>Assignments</h2>
            <p>Create work, review submissions, and save grades.</p>
          </div>
          <span>{assignments.length} items</span>
          <button className="small-button" type="button" onClick={() => setCreateOpen(true)}>Create Assignment</button>
        </header>
        <div className="teacher-assignment-grid">
          {assignments.length ? assignments.map((assignment) => (
            <article className="teacher-assignment-card" key={assignment._id}>
              <header className="teacher-card-top">
                <div>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.description || "No description"}</p>
                </div>
                <button className="icon-danger-button" type="button" aria-label={`Delete ${assignment.title}`} onClick={() => onDelete(assignment._id)}><Trash2 size={16} /></button>
              </header>
              <div className="teacher-assignment-meta">
                <span><CalendarDays />Due {safeDate(assignment.dueDate)}</span>
                <span><BookOpen />{className(assignment.classId)}</span>
                <span><FileText />{assignment.submissions?.length || 0} submissions</span>
              </div>
              <div className="assignment-card-actions">
                {assignment.fileName && <FileDownloadButton item={assignment} label={assignment.fileName} className="submission-download-button" />}
                <button className="small-button" type="button" onClick={() => setReviewAssignment(assignment)}>Review</button>
              </div>
            </article>
          )) : <Empty>No assignments yet.</Empty>}
        </div>
      </section>
      {createOpen && createPortal(
        <div className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assignmentModalTitle">
          <form className="assignment-create-panel" onSubmit={submit}>
            <header className="assignment-modal-header">
              <div>
                <span>Teacher assignment</span>
                <h2 id="assignmentModalTitle">Create Assignment</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close assignment form" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            </header>
            <label>Class<select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">Select class</option>{classes.map((item) => <option value={item._id} key={item._id}>{className(item)}</option>)}</select></label>
            <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="assignment-form-row">
              <label>Due Date<input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
              <label>Max Score<input type="number" min="0" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} /></label>
            </div>
            <label className="file-picker">
              <span className="file-picker-icon"><FileText size={20} /></span>
              <span className="file-picker-text"><strong>{file?.name || "Choose attachment"}</strong><small>Optional file for students</small></span>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button className="small-button" type="submit">Create Assignment</button>
          </form>
        </div>,
        document.body
      )}
      {reviewAssignment && createPortal(
        <AssignmentReviewModal
          assignment={reviewAssignment}
          onClose={() => setReviewAssignment(null)}
          onGrade={onGrade}
        />,
        document.body
      )}
    </section>
  );
}

function AssignmentReviewModal({ assignment, onClose, onGrade }) {
  return (
    <div className="assignment-review-modal" role="dialog" aria-modal="true" aria-labelledby="assignmentReviewTitle">
      <section className="assignment-review-card">
        <header className="assignment-modal-header">
          <div>
            <span>Submission review</span>
            <h2 id="assignmentReviewTitle">{assignment.title}</h2>
            <p>{className(assignment.classId)} - due {safeDate(assignment.dueDate)}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close review" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="submission-list">
          {(assignment.submissions || []).length ? (
            assignment.submissions.map((submission) => <GradeRow key={submission._id} assignment={assignment} submission={submission} onGrade={onGrade} />)
          ) : (
            <div className="submission-empty">No submissions yet.</div>
          )}
        </div>
        <footer className="attendance-modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}

function GradeRow({ assignment, submission, onGrade }) {
  const [score, setScore] = useState(submission.score ?? "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  return (
    <form className="submission-grade-form" onSubmit={(event) => { event.preventDefault(); onGrade(assignment._id, submission._id, score, feedback); }}>
      <div className="submission-review-info">
        <strong>{studentName(submission.studentId)}</strong>
        <p>{submission.submittedAt ? `Submitted ${safeDate(submission.submittedAt)}` : "Submission received"}</p>
        {submission.fileName && <FileDownloadButton item={submission} label={submission.fileName} className="submission-download-button" />}
      </div>
      <div className="submission-grade-controls">
        <input type="number" min="0" max={assignment.maxScore || 100} value={score} onChange={(e) => setScore(e.target.value)} placeholder="Score" />
        <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" />
        <button className="small-button" type="submit">Save Grade</button>
      </div>
    </form>
  );
}

function MaterialsView({ classes, materials, onCreate, onDelete }) {
  const [form, setForm] = useState({ title: "", description: "", classId: "" });
  const [file, setFile] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    await onCreate(form, file);
    setForm({ title: "", description: "", classId: "" });
    setFile(null);
    event.currentTarget.reset();
    setUploadOpen(false);
  };
  return (
    <section className="teacher-assignment-layout assignment-overview">
      <section className="teacher-assignment-list">
        <header className="assignment-list-header">
          <div>
            <h2>Materials</h2>
            <p>Upload and manage files for your classes.</p>
          </div>
          <span>{materials.length} files</span>
          <button className="small-button" type="button" onClick={() => setUploadOpen(true)}>Upload Material</button>
        </header>
        {materials.length ? materials.map((material) => (
          <article className="teacher-material-row" key={material._id}>
            <span className="material-icon"><FolderOpen size={20} /></span>
            <div className="teacher-material-info">
              <h3>{material.title}</h3>
              <p>{className(material.classId)} - {material.fileName}</p>
            </div>
            <FileDownloadButton item={material} label="Download" className="small-button" />
            <button className="icon-danger-button" type="button" aria-label={`Delete ${material.title}`} onClick={() => onDelete(material._id)}><Trash2 size={16} /></button>
          </article>
        )) : <Empty>No materials uploaded yet.</Empty>}
      </section>
      {uploadOpen && createPortal(
        <div className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="materialModalTitle">
          <form className="assignment-create-panel" onSubmit={submit}>
            <header className="assignment-modal-header">
              <div>
                <span>Class material</span>
                <h2 id="materialModalTitle">Upload Material</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close material form" onClick={() => setUploadOpen(false)}><X size={18} /></button>
            </header>
            <label>Class<select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">Select class</option>{classes.map((item) => <option value={item._id} key={item._id}>{className(item)}</option>)}</select></label>
            <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="file-picker">
              <span className="file-picker-icon"><FolderOpen size={20} /></span>
              <span className="file-picker-text"><strong>{file?.name || "Choose material file"}</strong><small>Required file for this material</small></span>
              <input required type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button className="small-button" type="submit">Upload Material</button>
          </form>
        </div>,
        document.body
      )}
    </section>
  );
}

function FeedbackView({ feedbacks }) {
  const grouped = useMemo(() => {
    const map = new Map();
    feedbacks.forEach((item) => {
      const key = String(getId(item.classId) || className(item.classId));
      if (!map.has(key)) map.set(key, { key, classItem: item.classId, rows: [] });
      map.get(key).rows.push(item);
    });
    return Array.from(map.values()).sort((a, b) => className(a.classItem).localeCompare(className(b.classItem)));
  }, [feedbacks]);
  const [selectedClassKey, setSelectedClassKey] = useState("all");
  const [activeClassFeedback, setActiveClassFeedback] = useState(null);
  const visibleGroups = selectedClassKey === "all" ? grouped : grouped.filter((group) => group.key === selectedClassKey);
  const studentCount = feedbacks.filter((item) => item.authorRole === "student").length;
  const parentCount = feedbacks.filter((item) => item.authorRole === "parent").length;
  const commentCount = feedbacks.filter((item) => String(item.comment || "").trim()).length;

  useEffect(() => {
    if (selectedClassKey !== "all" && !grouped.some((group) => group.key === selectedClassKey)) {
      setSelectedClassKey("all");
    }
  }, [grouped, selectedClassKey]);

  return (
    <>
      <section className="feedback-summary-grid">
        <article className="feedback-summary-card"><span>Total feedback</span><strong>{feedbacks.length}</strong></article>
        <article className="feedback-summary-card"><span>Classes</span><strong>{grouped.length}</strong></article>
        <article className="feedback-summary-card"><span>Student</span><strong>{studentCount}</strong></article>
        <article className="feedback-summary-card"><span>Parent</span><strong>{parentCount}</strong></article>
      </section>

      <section className="feedback-filter-bar">
        <div>
          <strong>View by class</strong>
          <span>{commentCount} written comments</span>
        </div>
        <select value={selectedClassKey} onChange={(event) => setSelectedClassKey(event.target.value)}>
          <option value="all">All classes</option>
          {grouped.map((group) => (
            <option value={group.key} key={group.key}>{className(group.classItem)} ({group.rows.length})</option>
          ))}
        </select>
      </section>

      <section className="feedback-teacher-stack">
        {visibleGroups.length ? visibleGroups.map((group) => (
          <article className="feedback-class-card" key={group.key}>
            <header>
              <div>
                <h2>{className(group.classItem)}</h2>
                <p>{group.classItem?.courseId?.title || group.classItem?.courseId?.subject || "Class feedback"}</p>
              </div>
              <span>{group.rows.length} feedback</span>
            </header>
            <div className="feedback-class-preview">
              <div>
                <strong>{group.rows.filter((item) => item.authorRole === "student").length}</strong>
                <span>student</span>
              </div>
              <div>
                <strong>{group.rows.filter((item) => item.authorRole === "parent").length}</strong>
                <span>parent</span>
              </div>
              <div>
                <strong>{group.rows.filter((item) => String(item.comment || "").trim()).length}</strong>
                <span>comments</span>
              </div>
              <button className="small-button" type="button" onClick={() => setActiveClassFeedback(group)}>View feedback</button>
            </div>
          </article>
        )) : <Empty>No feedback yet.</Empty>}
      </section>

      {activeClassFeedback && createPortal(
        <FeedbackClassModal group={activeClassFeedback} onClose={() => setActiveClassFeedback(null)} />,
        document.body
      )}
    </>
  );
}

function FeedbackClassModal({ group, onClose }) {
  return (
    <div className="feedback-class-modal" role="dialog" aria-modal="true" aria-labelledby="feedbackClassTitle">
      <section className="feedback-class-modal-card">
        <header className="assignment-modal-header">
          <div>
            <span>Class feedback</span>
            <h2 id="feedbackClassTitle">{className(group.classItem)}</h2>
            <p>{group.classItem?.courseId?.title || group.classItem?.courseId?.subject || `${group.rows.length} feedback`}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close feedback" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="feedback-list">
          {group.rows.map((item) => (
            <article className="feedback-card" key={item._id}>
              <header>
                <div>
                  <h3>{item.authorId?.fullName || item.studentId?.fullName || item.parentId?.fullName || "Anonymous"}</h3>
                  <p>{item.authorRole || "feedback"} - {safeDate(item.createdAt)}</p>
                </div>
                <span className="badge">{item.authorRole || "feedback"}</span>
              </header>
              <div className="feedback-answer-grid">
                <span><strong>On time</strong>{answerLabel(item.punctuality)}</span>
                <span><strong>Clear</strong>{answerLabel(item.teachingClarity)}</span>
                <span><strong>Content</strong>{answerLabel(item.contentFit)}</span>
                <span><strong>Support</strong>{answerLabel(item.supportiveness)}</span>
              </div>
              <p className="feedback-comment">{item.comment || "No comment"}</p>
            </article>
          ))}
        </div>
        <footer className="attendance-modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
}

function answerLabel(value) {
  if (value === "yes") return "Yes";
  if (value === "sometimes") return "Sometimes";
  if (value === "no") return "No";
  return "N/A";
}

function OnlineView({ online }) {
  return (
    <section className="online-class-list">
      {online.length ? online.map((item) => (
        <article className={`online-class-card ${item.session?.status === "live" ? "live" : ""}`} key={item.schedule?._id}>
          <div className="online-class-main">
            <span className="online-class-date">{safeDate(item.schedule?.date)}</span>
            <h3>{className(item.schedule?.classId)}</h3>
            <p>{item.schedule?.classId?.courseId?.title || "Course"}</p>
            <div className="online-class-meta"><span>{item.schedule?.startTime} - {item.schedule?.endTime}</span><span>{item.schedule?.room || "Online"}</span></div>
          </div>
          <div className="online-class-actions"><span className={`online-status ${item.session?.status === "live" ? "live" : ""}`}>{item.session?.status || "scheduled"}</span></div>
        </article>
      )) : <Empty>No online classes found.</Empty>}
    </section>
  );
}

function ProfileView({ user }) {
  return (
    <article className="profile-card profile-showcase">
      <div className="profile-cover"></div>
      <div className="profile-summary">
        <div className="profile-photo profile-photo-large"><span>{shortName(user.fullName)}</span></div>
        <div className="profile-title"><h3>{user.fullName}</h3><p>Teacher Account</p><small>{user.caption || "No caption yet."}</small></div>
      </div>
      <div className="profile-info-grid">
        <section><h4>Contact Information</h4><p><span>Email</span>{user.email}</p><p><span>Role</span>{user.role}</p></section>
      </div>
    </article>
  );
}

export function TeacherReactPage({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ classes: [], schedules: [], attendances: [], enrollments: [], assignments: [], materials: [], feedbacks: [], online: [] });
  const [rosters, setRosters] = useState({});
  const [activeRosterId, setActiveRosterId] = useState("");
  const [scheduleMonth, setScheduleMonth] = useState(new Date());

  const loadData = async () => {
    setStatus("Loading teacher data...");
    const [classes, schedules, attendances, enrollments, assignments, materials, feedbacks, online] = await Promise.all([
      api("/api/classes"),
      api("/api/schedules"),
      api("/api/attendances"),
      api("/api/enrollments"),
      api("/api/assignments/teacher"),
      api("/api/materials/teacher"),
      api("/api/feedbacks/teacher"),
      api("/api/online-classes"),
    ]);
    const myClasses = classes.filter((item) => sameId(getId(item.teacherId), user._id));
    const myClassIds = new Set(myClasses.map((item) => String(item._id)));
    setData({
      classes: myClasses,
      schedules: schedules.filter((item) => myClassIds.has(String(getId(item.classId)))),
      attendances,
      enrollments: enrollments.filter((item) => myClassIds.has(String(getId(item.classId)))),
      assignments,
      materials,
      feedbacks,
      online,
    });
    setStatus("");
  };

  useEffect(() => {
    loadData().catch((err) => setStatus(err.message || "Could not load teacher data."));
  }, [user._id]);

  const loadRoster = async (scheduleId) => {
    const roster = await api(`/api/attendances/schedule/${scheduleId}/roster`);
    setRosters((current) => ({ ...current, [scheduleId]: roster }));
  };
  const openRoster = async (scheduleId) => {
    setActiveRosterId(scheduleId);
    await loadRoster(scheduleId);
  };
  const saveAttendance = async (scheduleId, studentId, attendanceStatus, note) => {
    const saved = await api(`/api/attendances/schedule/${scheduleId}/student/${studentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: attendanceStatus, note }),
    });
    await loadRoster(scheduleId);
    setData((current) => ({ ...current, attendances: [...current.attendances.filter((item) => item._id !== saved._id), saved] }));
  };
  const createAssignment = async (form, file) => {
    const fileData = await readFileData(file);
    await api("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fileName: file?.name || "", fileType: file?.type || "", fileSize: file?.size || 0, fileData: fileData || "" }),
    });
    await loadData();
  };
  const deleteAssignment = async (id) => {
    if (!window.confirm("Delete this assignment?")) return;
    await api(`/api/assignments/${id}`, { method: "DELETE" });
    await loadData();
  };
  const gradeSubmission = async (assignmentId, submissionId, score, feedback) => {
    await api(`/api/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: Number(score), feedback }),
    });
    await loadData();
  };
  const createMaterial = async (form, file) => {
    if (!file) throw new Error("Please choose a file.");
    const fileData = await readFileData(file);
    await api("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size, fileData }),
    });
    await loadData();
  };
  const deleteMaterial = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    await api(`/api/materials/${id}`, { method: "DELETE" });
    await loadData();
  };

  const [title, subtitle] = useMemo(() => viewMeta[view] || viewMeta.dashboard, [view]);

  return (
    <>
      <header className="teacher-topbar">
        <div className="teacher-brand"><div className="brand-mark">TH</div><div><strong>Teaching Hub</strong><span>{user.fullName}</span></div></div>
        <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
        <div className="avatar">{shortName(user.fullName)}</div>
      </header>
      <nav className="teacher-nav" aria-label="Teacher navigation">
        {navItems.map(([key, label, Icon]) => (
          <button className={`nav-tab ${view === key ? "active" : ""}`} type="button" key={key} onClick={() => setView(key)}>
            <Icon size={18} />{label}
          </button>
        ))}
      </nav>
      <main className="teacher-main">
        <section className="page-heading"><h1>{title}</h1><p>{subtitle}</p></section>
        <Status text={status} />
        <section className="view active">
          {view === "dashboard" && <TeacherDashboard data={data} />}
          {view === "classes" && <ClassesView classes={data.classes} enrollments={data.enrollments} />}
          {view === "schedule" && <ScheduleView schedules={data.schedules} scheduleMonth={scheduleMonth} setScheduleMonth={setScheduleMonth} />}
          {view === "attendance" && (
            <AttendanceView
              schedules={data.schedules}
              onOpenRoster={(scheduleId) => openRoster(scheduleId).catch((err) => setStatus(err.message || "Could not load roster."))}
            />
          )}
          {view === "assignments" && <AssignmentsView classes={data.classes} assignments={data.assignments} onCreate={createAssignment} onDelete={deleteAssignment} onGrade={gradeSubmission} />}
          {view === "materials" && <MaterialsView classes={data.classes} materials={data.materials} onCreate={createMaterial} onDelete={deleteMaterial} />}
          {view === "feedback" && <FeedbackView feedbacks={data.feedbacks} />}
          {view === "online" && <OnlineClass role="teacher" onStatus={setStatus} />}
          {view === "profile" && <ProfileView user={user} />}
        </section>
      </main>
      <AttendanceRosterModal
        rosterId={activeRosterId}
        roster={activeRosterId ? rosters[activeRosterId] : null}
        onClose={() => setActiveRosterId("")}
        onSave={saveAttendance}
      />
    </>
  );
}
