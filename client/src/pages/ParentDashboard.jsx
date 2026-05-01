import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  PencilLine,
  Sparkles,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { api } from "../api/client";
import { OnlineClass } from "../components/online-class/OnlineClass";
import { dateKey } from "../utils/date";
import "../styles/parent.css";
import "../styles/onlineClass.css";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["children", "My Children", Users],
  ["schedule", "Child Schedule", CalendarDays],
  ["attendance", "Attendance", ClipboardCheck],
  ["feedback", "Teacher Feedback", MessageSquare],
  ["online", "Online Classes", Video],
  ["payments", "Payment Status", CreditCard],
  ["profile", "Profile", UserRound],
];

const viewMeta = {
  dashboard: ["Parent Dashboard", "Overview of your children's learning"],
  children: ["My Children", "Classes and learning status"],
  schedule: ["Child Schedule", "Upcoming and past sessions"],
  attendance: ["Attendance", "Attendance records for your children"],
  feedback: ["Teacher Feedback", "Feedback and family notes"],
  online: ["Online Classes", "Join live rooms when available"],
  payments: ["Payment Status", "Tuition and payment records"],
  profile: ["Profile", "Parent account information"],
};

const initialData = {
  enrollments: [],
  schedules: [],
  attendances: [],
  payments: [],
  assignments: [],
  feedbacks: [],
};

const getId = (value) => (typeof value === "object" && value ? value._id : value);
const sameId = (left, right) => String(left || "") === String(right || "");
const className = (item) => item?.className || item?.courseId?.title || "Unknown class";
const money = (value = 0) => Number(value || 0).toLocaleString("vi-VN");
const shortName = (name = "PA") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const paymentCode = (payment) => payment.bankTransferCode || `ML-${String(payment._id || "").slice(-8).toUpperCase()}`;
const bankQrUrl = (payment) => {
  const info = `ML ${paymentCode(payment)}`;
  return `https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=${Number(payment.amount || 0)}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent("Tutoring Center")}`;
};
const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file?.size) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function Empty({ children = "No records found." }) {
  return <div className="empty-state">{children}</div>;
}

function Status({ text }) {
  const isSuccess = /success|successfully|requested|copied|submitted|marked/i.test(text || "");
  if (isSuccess) return null;
  return text ? <div className="status-message">{text}</div> : null;
}

function SuccessToast({ text, onDismiss }) {
  return null;
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function ListRow({ title, subtitle, badge, icon, type = "" }) {
  return (
    <div className={`list-row ${icon ? "family-update-row" : ""} ${type ? `family-update-row-${type}` : ""}`}>
      {icon && <span className="family-update-icon">{icon}</span>}
      <div className="list-row-main">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {badge && <Badge>{badge}</Badge>}
    </div>
  );
}

function FamilyUpdateRow({ title, subtitle, badge, icon, type = "" }) {
  return (
    <article className={`family-update-card-row ${type ? `family-update-card-row-${type}` : ""}`}>
      <span className="family-update-card-icon">{icon}</span>
      <div className="family-update-card-main">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {badge && <Badge>{badge}</Badge>}
    </article>
  );
}

export function ParentDashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [view, setView] = useState("dashboard");
  const [status, setStatus] = useState("");
  const [data, setData] = useState(initialData);
  const [scheduleMonth, setScheduleMonth] = useState(new Date());
  const [attendanceModal, setAttendanceModal] = useState(null);
  const [bankModal, setBankModal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");

  const load = async (successText = "") => {
    setStatus("Loading parent data...");
    const [overview, assignments, feedbacks] = await Promise.all([
      api("/api/parent/overview"),
      api("/api/assignments/parent"),
      api("/api/feedbacks/mine"),
    ]);
    setData({ ...initialData, ...overview, assignments, feedbacks });
    setStatus(successText);
  };

  useEffect(() => {
    load().catch((error) => setStatus(error.message || "Could not load parent data."));
  }, []);

  const sendFeedback = async (form) => {
    await api("/api/feedbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: String(form.get("studentId") || ""),
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

  const requestBankTransfer = async (payment) => {
    try {
      const updated = await api(`/api/payments/${payment._id}/bank-transfer`, { method: "POST" });
      setData((current) => ({
        ...current,
        payments: current.payments.map((item) => (item._id === updated._id ? updated : item)),
      }));
      setBankModal(updated);
      setStatus("Bank transfer details requested.");
    } catch (error) {
      setStatus(error.message || "Could not create bank transfer request.");
    }
  };

  const submitBankTransfer = async (payment) => {
    try {
      const updated = await api(`/api/payments/${payment._id}/bank-transfer/submitted`, { method: "POST" });
      setData((current) => ({
        ...current,
        payments: current.payments.map((item) => (item._id === updated._id ? updated : item)),
      }));
      setBankModal(updated);
      setStatus("Transfer marked as submitted. Admin will confirm after money arrives.");
    } catch (error) {
      setStatus(error.message || "Could not mark transfer as submitted.");
    }
  };

  const copyPaymentCode = async (code) => {
    try {
      await navigator.clipboard?.writeText(code);
      setStatus("Transfer code copied.");
    } catch (error) {
      setStatus("Could not copy transfer code.");
    }
  };

  const [title, subtitle] = useMemo(() => viewMeta[view] || viewMeta.dashboard, [view]);

  return (
    <>
      <header className="parent-topbar">
        <div className="parent-brand">
          <div className="brand-mark">PD</div>
          <div>
            <strong>Parent Dashboard</strong>
            <span>{currentUser.fullName}</span>
          </div>
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
        <div className="avatar">{currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.fullName} /> : shortName(currentUser.fullName)}</div>
      </header>

      <main className="parent-main">
        <SuccessToast text={status} onDismiss={() => setStatus("")} />
        <nav className="parent-nav" aria-label="Parent navigation">
          {navItems.map(([key, label, Icon]) => (
            <button className={`nav-card ${view === key ? "active" : ""}`} type="button" data-view={key} key={key} onClick={() => setView(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <section className="content-card">
          <div className="page-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <Status text={status} />
          <section className="view active">
            {view === "dashboard" && <DashboardView data={data} />}
            {view === "children" && <ChildrenView enrollments={data.enrollments} payments={data.payments} assignments={data.assignments} />}
            {view === "schedule" && <ScheduleView data={data} scheduleMonth={scheduleMonth} setScheduleMonth={setScheduleMonth} />}
            {view === "attendance" && <AttendanceView data={data} setAttendanceModal={setAttendanceModal} />}
            {view === "feedback" && (
              <FeedbackView
                enrollments={data.enrollments}
                feedbacks={data.feedbacks}
                onSubmit={(form) => sendFeedback(form).catch((error) => setStatus(error.message || "Could not send feedback."))}
              />
            )}
            {view === "online" && <OnlineClass role="parent" onStatus={setStatus} />}
            {view === "payments" && <PaymentsView payments={data.payments} onBankTransfer={requestBankTransfer} />}
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
        </section>
      </main>

      {attendanceModal && <AttendanceModal details={attendanceModal} onClose={() => setAttendanceModal(null)} />}
      {bankModal && <BankTransferModal payment={bankModal} onClose={() => setBankModal(null)} onCopy={copyPaymentCode} onSubmitted={submitBankTransfer} />}
    </>
  );
}

function DashboardView({ data }) {
  const today = dateKey(new Date());
  const todaySchedules = data.schedules.filter((item) => dateKey(item.date) === today);
  const openPayments = data.payments.filter((item) => item.status !== "paid");
  const presentToday = data.attendances.filter((item) => dateKey(item.scheduleId?.date || item.createdAt) === today && item.status === "present").length;
  const attendanceRate = todaySchedules.length ? Math.round((presentToday / todaySchedules.length) * 100) : 0;
  const recentFeedback = data.feedbacks.slice(0, 3);

  return (
    <>
      <section className="daily-report-hero">
        <div>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          <h2>Family Briefing</h2>
          <p>{todaySchedules.length} classes today, {data.feedbacks.length} feedback sent, {openPayments.length} open payments.</p>
        </div>
        <div className="daily-report-mark"><Sparkles size={34} /></div>
      </section>

      <div className="metric-grid">
        <article className="metric-card"><span>Classes Today</span><strong>{todaySchedules.length}</strong></article>
        <article className="metric-card"><span>Feedback Sent</span><strong>{data.feedbacks.length}</strong></article>
        <article className="metric-card"><span>Attendance Today</span><strong>{attendanceRate}%</strong></article>
        <article className="metric-card"><span>Open Payments</span><strong>{openPayments.length}</strong></article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h2>Today's Child Classes</h2>
          <div className="stack-list">
            {todaySchedules.length ? todaySchedules.map((item) => (
              <ListRow key={item._id} title={className(item.classId)} subtitle={`${item.startTime || ""} - ${item.room || "No room"}`} badge={item.status} icon={<Clock size={18} />} />
            )) : <Empty>No child classes scheduled today.</Empty>}
          </div>
        </article>
        <article className="panel">
          <h2>Family Updates</h2>
          <div className="stack-list">
            {openPayments.slice(0, 3).map((item) => (
              <FamilyUpdateRow key={item._id} title={className(item.classId)} subtitle={`${money(item.amount)} VND`} badge={item.status || "pending"} icon={<CreditCard size={18} />} type="payment" />
            ))}
            {recentFeedback.map((item) => (
              <FamilyUpdateRow key={item._id} title={className(item.classId)} subtitle={item.comment || "Feedback sent"} badge={item.authorRole || "parent"} icon={<MessageSquare size={18} />} type="feedback" />
            ))}
            {!openPayments.length && !recentFeedback.length && <Empty>No family updates yet.</Empty>}
          </div>
        </article>
      </div>
    </>
  );
}

function ChildrenView({ enrollments, payments, assignments }) {
  const [activeChild, setActiveChild] = useState(null);
  const children = enrollments.reduce((map, enrollment) => {
    const student = enrollment.studentId;
    if (!student?._id) return map;
    if (!map.has(student._id)) map.set(student._id, { student, enrollments: [] });
    map.get(student._id).enrollments.push(enrollment);
    return map;
  }, new Map());

  useEffect(() => {
    if (!activeChild) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeChild]);

  if (!children.size) return <Empty>No children linked to this account yet.</Empty>;

  return (
    <>
      <section className="parent-child-grid">
        {[...children.values()].map(({ student, enrollments: childEnrollments }) => {
          const childPayments = payments.filter((item) => sameId(getId(item.studentId), student._id));
          const openPayments = childPayments.filter((item) => item.status !== "paid").length;
          const classIds = new Set(childEnrollments.map((item) => String(getId(item.classId))).filter(Boolean));
          const childAssignments = assignments.filter((assignment) => classIds.has(String(getId(assignment.classId))));
          const detail = { student, enrollments: childEnrollments, payments: childPayments, assignments: childAssignments };

          return (
            <article className="parent-child-card" key={student._id}>
              <header>
                <div className="parent-child-avatar">{shortName(student.fullName)}</div>
                <div>
                  <h2>{student.fullName}</h2>
                  <p>{student.email}</p>
                </div>
                <Badge>{childEnrollments.length} classes</Badge>
              </header>
              <div className="parent-child-meta">
                <span><strong>Assignments</strong>{childAssignments.length}</span>
                <span><strong>Open payments</strong>{openPayments}</span>
                <span><strong>Paid</strong>{childPayments.filter((item) => item.status === "paid").length}</span>
              </div>
              <button className="parent-child-button" type="button" onClick={() => setActiveChild(detail)}>
                <Users size={16} />
                View details
              </button>
            </article>
          );
        })}
      </section>
      <ChildDetailModal details={activeChild} onClose={() => setActiveChild(null)} />
    </>
  );
}

function ChildDetailModal({ details, onClose }) {
  if (!details) return null;
  const openPayments = details.payments.filter((item) => item.status !== "paid").length;

  return createPortal((
    <div className="child-detail-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="child-detail-card" role="dialog" aria-modal="true" aria-labelledby="childDetailTitle">
        <header>
          <div className="parent-child-avatar child-detail-avatar">{shortName(details.student.fullName)}</div>
          <div>
            <span>Child profile</span>
            <h3 id="childDetailTitle">{details.student.fullName}</h3>
            <p>{details.student.email}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="child-detail-metrics">
          <span><strong>Classes</strong>{details.enrollments.length}</span>
          <span><strong>Assignments</strong>{details.assignments.length}</span>
          <span><strong>Open payments</strong>{openPayments}</span>
          <span><strong>Paid</strong>{details.payments.filter((item) => item.status === "paid").length}</span>
        </div>
        <div className="child-detail-sections">
          <section>
            <h4>Classes</h4>
            <div className="child-detail-list">
              {details.enrollments.map((enrollment) => (
                <article className="child-detail-row" key={enrollment._id}>
                  <strong>{className(enrollment.classId)}</strong>
                  <span>{enrollment.classId?.teacherId?.fullName || "No teacher"} - {enrollment.classId?.schedule || "No schedule"}</span>
                </article>
              ))}
              {!details.enrollments.length && <Empty>No enrolled classes.</Empty>}
            </div>
          </section>
          <section>
            <h4>Assignments</h4>
            <div className="child-detail-list">
              {details.assignments.slice(0, 6).map((assignment) => (
                <article className="child-detail-row" key={assignment._id}>
                  <strong>{assignment.title}</strong>
                  <span>{className(assignment.classId)} - due {dateKey(assignment.dueDate) || "N/A"}</span>
                </article>
              ))}
              {!details.assignments.length && <Empty>No assignments found.</Empty>}
            </div>
          </section>
          <section>
            <h4>Payments</h4>
            <div className="child-detail-list">
              {details.payments.map((payment) => (
                <article className="child-detail-row" key={payment._id}>
                  <strong>{money(payment.amount)} VND</strong>
                  <span>{className(payment.classId)} - {payment.status || "pending"}</span>
                </article>
              ))}
              {!details.payments.length && <Empty>No payment records.</Empty>}
            </div>
          </section>
        </div>
      </section>
    </div>
  ), document.body);
}

function ScheduleView({ data, scheduleMonth, setScheduleMonth }) {
  const todayKey = dateKey(new Date());
  const viewYear = scheduleMonth.getFullYear();
  const viewMonth = scheduleMonth.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
  const byDay = data.schedules.reduce((map, item) => {
    const key = dateKey(item.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  const childrenForClass = (classId) =>
    data.enrollments
      .filter((item) => sameId(getId(item.classId), getId(classId)))
      .map((item) => item.studentId?.fullName)
      .filter(Boolean);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
  const monthScheduleCount = data.schedules.filter((item) => dateKey(item.date).startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)).length;
  const todaySchedules = byDay.get(todayKey) || [];

  return (
    <section className="admin-schedule-layout">
      <section className="schedule-calendar-card">
        <div className="calendar-toolbar">
          <div>
            <span>Current child calendar</span>
            <h2>{scheduleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
          </div>
          <div className="calendar-actions">
            <button className="icon-button" type="button" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth - 1, 1))}>‹</button>
            <button className="small-button" type="button" onClick={() => setScheduleMonth(new Date())}>Today</button>
            <button className="icon-button" type="button" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth + 1, 1))}>›</button>
          </div>
          <div className="calendar-summary"><strong>{monthScheduleCount}</strong><span>child sessions</span></div>
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
                      <small>{childrenForClass(item.classId).join(", ") || "Child"} - {item.room || "No room"}</small>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <article className="panel schedule-today-panel">
        <h2>Today's Child Classes</h2>
        <div className="stack-list">
          {todaySchedules.length ? todaySchedules.map((item) => (
            <ListRow key={item._id} title={className(item.classId)} subtitle={`${childrenForClass(item.classId).join(", ") || "Child"} - ${item.startTime || ""} - ${item.room || "No room"}`} badge={item.status} />
          )) : <Empty>No child classes scheduled today.</Empty>}
        </div>
      </article>
    </section>
  );
}

function AttendanceView({ data, setAttendanceModal }) {
  if (!data.enrollments.length) return <Empty>No classes found for attendance review.</Empty>;

  return (
    <section className="parent-attendance-grid">
      {data.enrollments.map((enrollment) => {
        const records = data.attendances.filter((item) => sameId(getId(item.studentId), getId(enrollment.studentId)) && sameId(getId(item.scheduleId?.classId), getId(enrollment.classId)));
        const attention = records.filter((item) => ["absent", "late"].includes(item.status));
        return (
          <article className="parent-attendance-card" key={enrollment._id}>
            <header>
              <div className="parent-child-avatar">{shortName(enrollment.studentId?.fullName || "ST")}</div>
              <div>
                <h2>{className(enrollment.classId)}</h2>
                <p>{enrollment.studentId?.fullName || "Student"}</p>
              </div>
              <Badge>{attention.length ? `${attention.length} notes` : "clear"}</Badge>
            </header>
            <div className="parent-attendance-meta">
              <span><strong>Records</strong>{records.length || "None"}</span>
              <span><strong>Absent</strong>{attention.filter((item) => item.status === "absent").length}</span>
              <span><strong>Late</strong>{attention.filter((item) => item.status === "late").length}</span>
            </div>
            <button className="small-button parent-attendance-button" type="button" onClick={() => setAttendanceModal({ enrollment, records })}>View Attendance</button>
          </article>
        );
      })}
    </section>
  );
}

function FeedbackView({ enrollments, feedbacks, onSubmit }) {
  const uniqueStudents = [...new Map(enrollments.map((row) => [getId(row.studentId), row.studentId])).values()].filter(Boolean);

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
          <p>Choose a child and class to send feedback.</p>
        </div>
        <label className="feedback-field">
          Child
          <select name="studentId" required>
            <option value="">Select child</option>
            {uniqueStudents.map((student) => <option key={student._id} value={student._id}>{student.fullName}</option>)}
          </select>
        </label>
        <label className="feedback-field">
          Class
          <select name="classId" required>
            <option value="">Select class</option>
            {enrollments.map((row) => <option key={row._id} value={getId(row.classId)}>{row.studentId?.fullName} - {className(row.classId)}</option>)}
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
        <button className="feedback-submit-button" type="submit">
          <MessageSquare size={16} />
          Send Feedback
        </button>
      </form>

      <div className="feedback-history">
        <h2>Sent Feedback</h2>
        <div className="feedback-list">
          {feedbacks.length ? feedbacks.map((item) => (
            <article className="feedback-card" key={item._id}>
              <strong>{className(item.classId)}</strong>
              <p>{item.comment || "No comment"}</p>
              <Badge>{item.authorRole || "parent"}</Badge>
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

function PaymentsView({ payments, onBankTransfer }) {
  if (!payments.length) return <Empty>No payment records yet.</Empty>;

  return (
    <section className="parent-payment-grid">
      {payments.map((payment) => {
        const isPaid = payment.status === "paid";
        return (
          <article className={`parent-payment-card ${isPaid ? "paid" : "pending"}`} key={payment._id}>
            <header>
              <span className="parent-payment-icon">{isPaid ? <Check size={22} /> : <CreditCard size={22} />}</span>
              <div>
                <h2>{className(payment.classId)}</h2>
                <p>{payment.studentId?.fullName || "Student"}</p>
              </div>
              <Badge>{payment.status || "pending"}</Badge>
            </header>
            <div className="parent-payment-amount">{money(payment.amount)} VND</div>
            <div className="parent-payment-meta">
              <span><strong>Method</strong>{payment.paymentMethod || "bank_transfer"}</span>
              <span><strong>Transfer code</strong>{paymentCode(payment)}</span>
            </div>
            {isPaid ? (
              <span className="parent-payment-paid">Paid{payment.paidAt ? ` on ${dateKey(payment.paidAt)}` : ""}</span>
            ) : (
              <button className="small-button parent-payment-button" type="button" onClick={() => onBankTransfer(payment)}>Bank Transfer</button>
            )}
          </article>
        );
      })}
    </section>
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
            <p>Parent Account</p>
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
            <h4>Family Summary</h4>
            <p><span>Children classes</span>{data.enrollments.length}</p>
            <p><span>Feedback sent</span>{data.feedbacks.length}</p>
            <p><span>Payments</span>{data.payments.length}</p>
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
              <label className="profile-avatar-preview" htmlFor="parentProfileAvatarInput">
                <span>{avatar ? <img src={avatar} alt={user.fullName} /> : <span>{shortName(user.fullName)}</span>}</span>
                <span className="profile-avatar-camera">Change photo</span>
              </label>
              <div>
                <strong>Profile picture</strong>
                <small>Choose an image to preview before saving.</small>
              </div>
            </div>
            <input id="parentProfileAvatarInput" className="profile-file-input" name="avatar" type="file" accept="image/*" onChange={previewFile} />
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

function AttendanceModal({ details, onClose }) {
  return (
    <div className="parent-attendance-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="parent-attendance-modal-card">
        <header>
          <div>
            <span>Attendance details</span>
            <h3>{className(details.enrollment.classId)}</h3>
            <p>{details.enrollment.studentId?.fullName}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="parent-attendance-modal-list">
          {details.records.length ? details.records.map((item) => (
            <article className={`parent-attendance-record ${item.status || ""}`} key={item._id}>
              <span className="parent-attendance-record-icon">{item.status === "absent" ? <X size={18} /> : <Clock size={18} />}</span>
              <div>
                <strong>{dateKey(item.scheduleId?.date || item.createdAt)}</strong>
                <p>{item.scheduleId?.startTime || ""} - {item.scheduleId?.endTime || ""} - {item.scheduleId?.room || "No room"}</p>
                <small>{item.note || "No note"}</small>
              </div>
              <Badge>{item.status || "recorded"}</Badge>
            </article>
          )) : <Empty>No attendance records for this class yet.</Empty>}
        </div>
      </section>
    </div>
  );
}

function BankTransferModal({ payment, onClose, onCopy, onSubmitted }) {
  const code = paymentCode(payment);
  const hasSubmittedTransfer = String(payment.note || "").includes("marked bank transfer as submitted");

  return (
    <div className="bank-transfer-modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bank-transfer-card">
        <header>
          <div>
            <span>Bank transfer</span>
            <h3>{money(payment.amount)} VND</h3>
            <p>{className(payment.classId)} - {payment.studentId?.fullName}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="bank-transfer-body">
          <div className="bank-transfer-qr">
            <img src={bankQrUrl(payment)} alt="VietQR bank transfer code" />
            <span>Scan with banking app</span>
          </div>
          <div className="bank-transfer-details">
            <div><span>Bank</span><strong>Vietcombank</strong></div>
            <div><span>Account name</span><strong>Tutoring Center</strong></div>
            <div><span>Account number</span><strong>0123456789</strong></div>
          </div>
          <div className="bank-transfer-code">
            <span>Transfer content</span>
            <strong>{code}</strong>
            <button className="bank-copy-button" type="button" onClick={() => onCopy(code)}><Copy size={16} />Copy code</button>
          </div>
          <div className="bank-transfer-actions">
            <p className="bank-transfer-note">Please enter this exact transfer code in the bank transfer content.</p>
            {hasSubmittedTransfer ? (
              <span className="bank-transfer-submitted"><Check size={16} />Transfer submitted. Waiting for admin confirmation.</span>
            ) : (
              <button className="bank-transfer-submit-button" type="button" onClick={() => onSubmitted(payment)}>
                <Check size={16} />
                I have transferred
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
