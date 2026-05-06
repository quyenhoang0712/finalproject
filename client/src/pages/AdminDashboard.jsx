import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  Presentation,
  School,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api, safeJson } from "../api/client";
import { dateKey } from "../utils/date";
import "../styles/admin.css";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["paymentTasks", "Payment Tasks", CreditCard],
  ["users", "Users", Users],
  ["teachers", "Teachers", Presentation],
  ["students", "Students", GraduationCap],
  ["parents", "Parents", HeartHandshake],
  ["subjects", "Subjects", BookOpen],
  ["classes", "Classes", School],
  ["schedules", "Schedules", CalendarDays],
  ["announcements", "Announcements", Megaphone],
  ["reports", "Reports", ChartColumn],
  ["profile", "Profile", UserRound],
];

const viewMeta = {
  dashboard: ["Dashboard", "System overview and key metrics"],
  paymentTasks: ["Payment Tasks", "Confirm bank transfers and payment requests"],
  users: ["Users", "Manage all system accounts"],
  teachers: ["Teachers", "Teaching staff accounts"],
  students: ["Students", "Learner account directory"],
  parents: ["Parents", "Parent account directory"],
  subjects: ["Subjects", "Course and subject catalog"],
  classes: ["Classes", "Class list and capacity"],
  schedules: ["Schedules", "Upcoming teaching sessions"],
  announcements: ["Announcements", "Messages for students, teachers and parents"],
  reports: ["Reports", "Revenue, attendance and payment insights"],
  profile: ["Profile", "Current admin account"],
};

const roleConfig = {
  admin: { title: "Admins", subtitle: "System operators", icon: ShieldCheck },
  teacher: { title: "Teachers", subtitle: "Teaching accounts", icon: Presentation },
  student: { title: "Students", subtitle: "Learner accounts", icon: GraduationCap },
  parent: { title: "Parents", subtitle: "Family accounts", icon: HeartHandshake },
};

const initialData = {
  users: [],
  courses: [],
  classes: [],
  schedules: [],
  enrollments: [],
  attendances: [],
  payments: [],
  summary: null,
  reports: null,
};

const monthTitle = (date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const getId = (value) => (typeof value === "object" && value ? value._id : value);
const sameId = (left, right) => String(left || "") === String(right || "");
const getName = (value, fallback = "Unknown") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.fullName || value.className || value.title || value.email || fallback;
};
const shortName = (name = "AD") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const fmtMoney = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
const transferCode = (payment) =>
  payment?.bankTransferCode || (payment?._id ? `ML-${String(payment._id).slice(-8).toUpperCase()}` : "N/A");
const needsConfirmation = (payment) =>
  payment.status !== "paid" && (payment.bankTransferCode || payment.paymentMethod === "bank_transfer");

const readImageFile = (file) =>
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

function StatusMessage({ status, onDismiss }) {
  if (!status.text) return null;
  if (status.type === "success") return <div className="status-message" />;
  return <div className={`status-message ${status.type || ""}`.trim()}>{status.text}</div>;
}

function Empty({ children = "No data yet." }) {
  return <div className="empty-state">{children}</div>;
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function Table({ rows, columns, title, actions }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title || "data"}...`}
        />
        {actions}
      </div>
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {filtered.length ? (
            filtered.map((row) => (
              <tr key={row._id || row.id}>
                {columns.map((column) => (
                  <td key={column.label}>{column.render ? column.render(row) : row[column.key] || ""}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr><td className="empty-cell" colSpan={columns.length}>No data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DirectoryHero({ title, subtitle, count, icon: Icon, action }) {
  return (
    <section className="directory-hero">
      <span className="directory-hero-icon"><Icon /></span>
      <div>
        <span>Admin directory</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <strong>{count}</strong>
      {action}
    </section>
  );
}

function CreateModal({ type, data, onClose, onSubmit }) {
  const activeEnrollments = data.enrollments
    .filter((item) => item.status !== "cancelled")
    .sort((a, b) => `${getName(a.studentId)} ${getName(a.classId)}`.localeCompare(`${getName(b.studentId)} ${getName(b.classId)}`));
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const selectedEnrollment = activeEnrollments.find((item) => item._id === selectedEnrollmentId);
  const existingPayments = selectedEnrollment
    ? data.payments.filter((item) => sameId(getId(item.enrollmentId), selectedEnrollment._id))
    : [];
  const selectedCourseId = getId(selectedEnrollment?.classId?.courseId);
  const selectedCourse = data.courses.find((item) => sameId(item._id, selectedCourseId));
  const suggestedAmount = Number(selectedCourse?.price || selectedEnrollment?.classId?.courseId?.price || 0);

  if (!type) return null;

  const modalMeta = {
    user: ["Add User", "Create a teacher, student, or parent account."],
    course: ["Add Subject", "Create a new course or subject."],
    class: ["Add Class", "Create a class and assign it to a teacher."],
    payment: ["Create Payment", "Create a tuition payment for an enrolled student."],
    announcement: ["Post Announcement", "Publish a message to a selected audience."],
  };
  const [title, subtitle] = modalMeta[type] || modalMeta.user;
  const teachers = data.users.filter((item) => item.role === "teacher");

  const submit = (event) => {
    event.preventDefault();
    onSubmit(type, new FormData(event.currentTarget));
  };

  return (
    <div className="modal-overlay active" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div className="modal-header">
          <div>
            <h3 id="modalTitle">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close modal" onClick={onClose}>x</button>
        </div>

        {type === "user" && (
          <form className="modal-form" onSubmit={submit}>
            <label>Full name<input name="fullName" placeholder="Full name" required /></label>
            <label>Email<input name="email" type="email" placeholder="Email address" required /></label>
            <label>Password<input name="password" type="password" placeholder="Temporary password" required /></label>
            <label>Role
              <select name="role" required>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <ModalActions onClose={onClose} />
          </form>
        )}

        {type === "course" && (
          <form className="modal-form" onSubmit={submit}>
            <label>Course title<input name="title" placeholder="Course title" required /></label>
            <label>Subject<input name="subject" placeholder="Subject" required /></label>
            <label>Price<input name="price" type="number" min="0" placeholder="Price" required /></label>
            <label>Mode
              <select name="mode">
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label>Duration<input name="duration" placeholder="Duration" /></label>
            <label className="modal-wide">Description<textarea name="description" placeholder="Description" /></label>
            <ModalActions onClose={onClose} />
          </form>
        )}

        {type === "class" && (
          <form className="modal-form" onSubmit={submit}>
            <label>Class name<input name="className" placeholder="Class name" required /></label>
            <label>Subject
              <select name="courseId" required>
                <option value="">Select subject</option>
                {data.courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
              </select>
            </label>
            <label>Teacher
              <select name="teacherId" required>
                <option value="">Select teacher</option>
                {teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.fullName}</option>)}
              </select>
            </label>
            <label>Schedule<input name="schedule" placeholder="Mon, Wed 18:00 - 19:30" required /></label>
            <label>Room<input name="room" placeholder="Room or online link" /></label>
            <label>Learning mode
              <select name="learningMode">
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label>Start date<input name="startDate" type="date" required /></label>
            <label>End date<input name="endDate" type="date" required /></label>
            <label>Capacity<input name="capacity" type="number" min="1" placeholder="30" required /></label>
            <label>Status
              <select name="status">
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <ModalActions onClose={onClose} />
          </form>
        )}

        {type === "payment" && (
          <form className="modal-form" onSubmit={submit}>
            <label className="modal-wide">Enrollment
              <select
                name="enrollmentId"
                value={selectedEnrollmentId}
                onChange={(event) => setSelectedEnrollmentId(event.target.value)}
                required
              >
                <option value="">Select enrolled student</option>
                {activeEnrollments.map((enrollment) => {
                  const paymentCount = data.payments.filter((item) => sameId(getId(item.enrollmentId), enrollment._id)).length;
                  return (
                    <option key={enrollment._id} value={enrollment._id}>
                      {getName(enrollment.studentId)} - {getName(enrollment.classId)}{paymentCount ? ` (${paymentCount} payment${paymentCount > 1 ? "s" : ""})` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="payment-create-context modal-wide">
              {selectedEnrollment ? (
                <>
                  <span><strong>Student</strong>{getName(selectedEnrollment.studentId)}</span>
                  <span><strong>Parent</strong>{getName(selectedEnrollment.parentId, "Not linked")}</span>
                  <span><strong>Class</strong>{getName(selectedEnrollment.classId)}</span>
                  <span><strong>Existing</strong>{existingPayments.length ? `${existingPayments.length} payment record${existingPayments.length > 1 ? "s" : ""}` : "No payment yet"}</span>
                </>
              ) : (
                <p>Select an enrollment to create the matching tuition payment.</p>
              )}
            </div>
            <label>Amount
              <input
                name="amount"
                type="number"
                min="0"
                step="1000"
                placeholder={suggestedAmount ? String(suggestedAmount) : "Amount"}
                defaultValue={suggestedAmount || ""}
                key={selectedEnrollmentId || "payment-amount"}
                required
              />
            </label>
            <label>Method
              <select name="paymentMethod" defaultValue="bank_transfer">
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="momo">Momo</option>
                <option value="zalopay">ZaloPay</option>
              </select>
            </label>
            <label>Status
              <select name="status" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>Paid date
              <input name="paidAt" type="date" />
            </label>
            <label className="modal-wide">Note
              <textarea name="note" placeholder="Optional payment note" />
            </label>
            <ModalActions onClose={onClose} />
          </form>
        )}

        {type === "announcement" && (
          <form className="modal-form" onSubmit={submit}>
            <label>Title<input name="title" placeholder="Announcement title" required /></label>
            <label>Audience
              <select name="audience">
                <option value="all">All</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
              </select>
            </label>
            <label className="modal-wide">Message<textarea name="message" placeholder="Message" required /></label>
            <ModalActions onClose={onClose} />
          </form>
        )}
      </div>
    </div>
  );
}

function ModalActions({ onClose }) {
  return (
    <div className="modal-actions">
      <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
      <button className="small-button" type="submit">Save</button>
    </div>
  );
}

export function AdminDashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [view, setView] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState({ text: "", type: "" });
  const [announcements, setAnnouncements] = useState(() => safeJson(localStorage.getItem("announcements"), []));
  const [modal, setModal] = useState(null);
  const [paymentPanel, setPaymentPanel] = useState(null);
  const [scheduleEditor, setScheduleEditor] = useState(null);
  const [scheduleMonth, setScheduleMonth] = useState(new Date());
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = async (successText = "") => {
    setStatus({ text: "Loading admin data...", type: "" });
    const [summary, reports, users, courses, classes, schedules, enrollments, attendances, payments] = await Promise.all([
      api("/api/dashboard/summary"),
      api("/api/reports/overview"),
      api("/api/users"),
      api("/api/courses"),
      api("/api/classes"),
      api("/api/schedules"),
      api("/api/enrollments"),
      api("/api/attendances"),
      api("/api/payments"),
    ]);
    setData({ summary, reports, users, courses, classes, schedules, enrollments, attendances, payments });
    setStatus({ text: successText, type: successText ? "success" : "" });
  };

  useEffect(() => {
    loadData().catch((error) => setStatus({ text: error.message || "Could not load admin data.", type: "error" }));
  }, []);

  useEffect(() => {
    localStorage.setItem("announcements", JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  const setActiveView = (nextView) => {
    setView(nextView);
    setStatus({ text: "", type: "" });
    setSidebarOpen(false);
  };

  const submitCreate = async (type, form) => {
    try {
      const payload = Object.fromEntries(form);
      if (type === "user") {
        await api("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setModal(null);
        await loadData("User created successfully.");
      }
      if (type === "course") {
        await api("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, price: Number(payload.price || 0) }),
        });
        setModal(null);
        await loadData("Subject created successfully.");
      }
      if (type === "class") {
        await api("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, capacity: Number(payload.capacity || 0) }),
        });
        setModal(null);
        await loadData("Class created successfully.");
      }
      if (type === "payment") {
        const enrollment = data.enrollments.find((item) => item._id === payload.enrollmentId);
        const amount = Number(payload.amount || 0);
        if (!enrollment) throw new Error("Please select an enrollment.");
        if (!amount || amount <= 0) throw new Error("Payment amount must be greater than 0.");

        await api("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentId: enrollment._id,
            studentId: getId(enrollment.studentId),
            parentId: getId(enrollment.parentId) || undefined,
            classId: getId(enrollment.classId),
            amount,
            paymentMethod: payload.paymentMethod || "bank_transfer",
            status: payload.status || "pending",
            paidAt: payload.status === "paid" ? (payload.paidAt || new Date().toISOString()) : null,
            note: String(payload.note || "").trim(),
          }),
        });
        setModal(null);
        setPaymentPanel("parents");
        await loadData("Payment created successfully.");
      }
      if (type === "announcement") {
        setAnnouncements((items) => [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: String(payload.title || "").trim(),
            audience: String(payload.audience || "all"),
            message: String(payload.message || "").trim(),
            createdAt: new Date().toISOString(),
            createdBy: currentUser.fullName || "Admin",
          },
          ...items,
        ]);
        setModal(null);
        setView("announcements");
        setStatus({ text: `Announcement posted for ${payload.audience || "all"}.`, type: "success" });
      }
    } catch (error) {
      setStatus({ text: error.message || "Could not save.", type: "error" });
    }
  };

  const deleteRecord = async (kind, id) => {
    const labels = { user: "user", course: "subject", class: "class" };
    const endpoints = { user: "users", course: "courses", class: "classes" };
    if (!window.confirm(`Delete this ${labels[kind]}?`)) return;
    try {
      await api(`/api/${endpoints[kind]}/${id}`, { method: "DELETE" });
      await loadData(`${labels[kind][0].toUpperCase()}${labels[kind].slice(1)} deleted.`);
    } catch (error) {
      setStatus({ text: error.message || "Could not delete.", type: "error" });
    }
  };

  const addStudentToClass = async (classId, form) => {
    try {
      const payload = {
        classId,
        studentId: String(form.get("studentId") || ""),
        parentId: String(form.get("parentId") || ""),
        status: String(form.get("status") || "approved"),
        paymentStatus: String(form.get("paymentStatus") || "unpaid"),
      };

      if (!payload.studentId) {
        throw new Error("Please select a student.");
      }
      if (!payload.parentId) {
        delete payload.parentId;
      }

      await api("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadData("Student added to class.");
    } catch (error) {
      setStatus({ text: error.message || "Could not add student to class.", type: "error" });
      throw error;
    }
  };

  const updateEnrollment = async (id, form) => {
    try {
      const payload = {
        parentId: String(form.get("parentId") || "") || null,
        status: String(form.get("status") || "approved"),
        paymentStatus: String(form.get("paymentStatus") || "unpaid"),
      };

      await api(`/api/enrollments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadData("Enrollment updated.");
    } catch (error) {
      setStatus({ text: error.message || "Could not update enrollment.", type: "error" });
      throw error;
    }
  };

  const removeEnrollment = async (enrollment) => {
    const paymentCount = data.payments.filter((item) => sameId(getId(item.enrollmentId), enrollment._id)).length;
    const message = paymentCount
      ? `Remove ${getName(enrollment.studentId)} from this class?\n\nThis enrollment has ${paymentCount} payment record${paymentCount > 1 ? "s" : ""}. Payment records will stay in the payment list.`
      : `Remove ${getName(enrollment.studentId)} from this class?`;
    if (!window.confirm(message)) return;

    try {
      await api(`/api/enrollments/${enrollment._id}`, { method: "DELETE" });
      await loadData("Student removed from class.");
    } catch (error) {
      setStatus({ text: error.message || "Could not remove student from class.", type: "error" });
    }
  };

  const saveSchedule = async (form, schedule = null) => {
    try {
      const payload = {
        classId: String(form.get("classId") || ""),
        date: String(form.get("date") || ""),
        startTime: String(form.get("startTime") || ""),
        endTime: String(form.get("endTime") || ""),
        room: String(form.get("room") || "").trim(),
        status: String(form.get("status") || "scheduled"),
        note: String(form.get("note") || "").trim(),
      };

      if (!payload.classId || !payload.date || !payload.startTime || !payload.endTime) {
        throw new Error("Class, date, start time, and end time are required.");
      }
      if (payload.startTime >= payload.endTime) {
        throw new Error("End time must be after start time.");
      }

      await api(schedule ? `/api/schedules/${schedule._id}` : "/api/schedules", {
        method: schedule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setScheduleEditor(null);
      await loadData(schedule ? "Schedule updated successfully." : "Schedule created successfully.");
    } catch (error) {
      setStatus({ text: error.message || "Could not save schedule.", type: "error" });
      throw error;
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm("Delete this schedule?")) return;
    try {
      await api(`/api/schedules/${id}`, { method: "DELETE" });
      await loadData("Schedule deleted.");
    } catch (error) {
      setStatus({ text: error.message || "Could not delete schedule.", type: "error" });
    }
  };

  const confirmPayment = async (payment) => {
    const code = transferCode(payment);
    const ok = window.confirm(`Confirm this bank transfer as paid?\n\n${getName(payment?.studentId)} - ${fmtMoney(payment?.amount)}\nCode: ${code}`);
    if (!ok) return;
    try {
      const updated = await api(`/api/payments/${payment._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paymentMethod: "bank_transfer",
          paidAt: new Date().toISOString(),
          note: `Confirmed by admin. Transfer code: ${code}`,
        }),
      });
      setData((prev) => ({
        ...prev,
        payments: prev.payments.map((item) => (item._id === updated._id ? updated : item)),
      }));
      setStatus({ text: "Payment confirmed as paid.", type: "success" });
    } catch (error) {
      setStatus({ text: error.message || "Could not confirm payment.", type: "error" });
    }
  };

  const payrollStorageKey = () => `teacherPayroll:${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const getPaidPayroll = () => safeJson(localStorage.getItem(payrollStorageKey()), {});
  const savePaidPayroll = (rows) => localStorage.setItem(payrollStorageKey(), JSON.stringify(rows));
  const payrollRows = useMemo(() => getTeacherPayrollRows(data, getPaidPayroll()), [data]);

  const markTeacherPaid = (teacherId) => {
    const teacher = data.users.find((item) => item._id === teacherId);
    const ok = window.confirm(`Mark salary as paid for ${teacher?.fullName || "this teacher"}?`);
    if (!ok) return;
    const paid = getPaidPayroll();
    paid[teacherId] = { paidAt: new Date().toISOString() };
    savePaidPayroll(paid);
    setData((prev) => ({ ...prev }));
    setStatus({ text: "Teacher payroll marked as paid.", type: "success" });
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
      const password = String(form.get("password") || "");
      const confirmPassword = String(form.get("confirmPassword") || "");
      if (password || confirmPassword) {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== confirmPassword) throw new Error("Password confirmation does not match.");
        payload.password = password;
      }
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
      setStatus({ text: "Profile updated successfully.", type: "success" });
      await loadData("Profile updated successfully.");
    } catch (error) {
      setStatus({ text: error.message || "Could not update profile.", type: "error" });
    }
  };

  const [pageTitle, pageSubtitle] = viewMeta[view] || viewMeta.dashboard;

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">TC</div>
          <div>
            <strong>Admin Console</strong>
            <span>System Management</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Admin navigation">
          {navItems.map(([key, label, Icon]) => (
            <button
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              type="button"
              data-view={key}
              onClick={() => setActiveView(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="admin-chip">
          <Avatar user={currentUser} />
          <div>
            <strong>{currentUser.fullName || "System Admin"}</strong>
            <span>Administrator</span>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setSidebarOpen((open) => !open)}>Menu</button>
          <h1>{pageTitle}</h1>
          <button className="logout-button" type="button" onClick={onLogout}>Logout</button>
        </header>

        <section className="content">
          <div className="page-heading">
            <h2>{pageTitle}</h2>
            <p>{pageSubtitle}</p>
          </div>
          <StatusMessage status={status} onDismiss={() => setStatus({ text: "", type: "" })} />
          <section className="view active">
            {view === "dashboard" && <DashboardView data={data} announcements={announcements} onConfirmPayment={confirmPayment} />}
            {view === "paymentTasks" && (
              <PaymentTasksView
                data={data}
                payrollRows={payrollRows}
                paymentPanel={paymentPanel}
                setPaymentPanel={setPaymentPanel}
                onConfirmPayment={confirmPayment}
                onPayTeacher={markTeacherPaid}
                onOpenModal={setModal}
              />
            )}
            {view === "users" && <UsersOverview data={data} onOpenModal={setModal} onDelete={(id) => deleteRecord("user", id)} />}
            {view === "teachers" && <RoleDirectory view="teachers" role="teacher" data={data} onOpenModal={setModal} onDelete={(id) => deleteRecord("user", id)} />}
            {view === "students" && <RoleDirectory view="students" role="student" data={data} onOpenModal={setModal} onDelete={(id) => deleteRecord("user", id)} />}
            {view === "parents" && <RoleDirectory view="parents" role="parent" data={data} onOpenModal={setModal} onDelete={(id) => deleteRecord("user", id)} />}
            {view === "subjects" && <SubjectsView data={data} onOpenModal={setModal} onDelete={(id) => deleteRecord("course", id)} />}
            {view === "classes" && (
              <ClassesView
                data={data}
                onOpenModal={setModal}
                onDelete={(id) => deleteRecord("class", id)}
                onAddStudent={addStudentToClass}
                onUpdateEnrollment={updateEnrollment}
                onRemoveEnrollment={removeEnrollment}
              />
            )}
            {view === "schedules" && (
              <SchedulesView
                data={data}
                scheduleMonth={scheduleMonth}
                setScheduleMonth={setScheduleMonth}
                onCreateSchedule={(date = "") => setScheduleEditor({ schedule: null, date })}
                onEditSchedule={(schedule) => setScheduleEditor({ schedule, date: "" })}
                onDeleteSchedule={deleteSchedule}
              />
            )}
            {view === "announcements" && <AnnouncementsView rows={announcements} onOpenModal={setModal} onDelete={(id) => setAnnouncements((items) => items.filter((item) => item.id !== id))} />}
            {view === "reports" && <ReportsView data={data} payrollRows={payrollRows} />}
            {view === "profile" && (
              <ProfileView
                user={currentUser}
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

      <CreateModal type={modal} data={data} onClose={() => setModal(null)} onSubmit={submitCreate} />
      <ScheduleEditorModal
        data={data}
        editor={scheduleEditor}
        onClose={() => setScheduleEditor(null)}
        onSubmit={saveSchedule}
      />
    </>
  );
}

function Avatar({ user, className = "avatar" }) {
  return (
    <div className={className}>
      {user.avatar ? <img src={user.avatar} alt={user.fullName || "Admin"} /> : <span>{shortName(user.fullName)}</span>}
    </div>
  );
}

function DashboardView({ data, announcements, onConfirmPayment }) {
  const today = dateKey(new Date());
  const todaySchedules = data.schedules.filter((item) => dateKey(item.date) === today);
  const todayTeacherIds = new Set(todaySchedules.map((item) => getId(item.classId?.teacherId)).filter(Boolean));
  const todayAttendances = data.attendances.filter((item) => dateKey(item.scheduleId?.date || item.createdAt) === today);
  const todayPresent = todayAttendances.filter((item) => (item.status || "present") === "present").length;
  const attendanceRate = todayAttendances.length ? Math.round((todayPresent / todayAttendances.length) * 100) : 0;
  const todayPaid = data.payments.filter((item) => item.status === "paid" && dateKey(item.paidAt || item.updatedAt || item.createdAt) === today);
  const todayPaidAmount = todayPaid.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingPayments = data.payments.filter(needsConfirmation).slice(0, 6);

  const attendanceStats = ["present", "late", "absent"].map((status) => ({
    status,
    totalCount: todayAttendances.filter((item) => (item.status || "present") === status).length,
  }));
  const attendanceTotal = attendanceStats.reduce((sum, item) => sum + item.totalCount, 0);
  const distribution = buildTodayDistribution(data, today);
  const recentRows = buildRecentRows(data, announcements, today).slice(0, 10);

  return (
    <>
      <section className="daily-report-hero">
        <div>
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          <h2>Today's Report</h2>
          <p>{todaySchedules.length} sessions, {todayAttendances.length} attendance records, {todayPaid.length} paid payments, {data.enrollments.filter((item) => dateKey(item.createdAt || item.enrollDate) === today).length} new enrollments today.</p>
        </div>
        <div className="daily-report-mark"><Sparkles /></div>
      </section>

      <div className="metric-grid">
        <Metric title="Classes Today" value={todaySchedules.length} note="Scheduled sessions" color="blue" code="ST" />
        <Metric title="Teachers Today" value={todayTeacherIds.size} note="Assigned to sessions" color="purple" code="TE" />
        <Metric title="Attendance Today" value={todayAttendances.length ? `${attendanceRate}%` : "0%"} note="On-time rate" color="pink" code="PA" />
        <Metric title="Paid Today" value={fmtMoney(todayPaidAmount)} note={`${todayPaid.length} paid records`} color="orange" code="CL" />
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <div className="panel-title">
            <h3>Today's Attendance</h3>
            <strong>{attendanceRate}%</strong>
          </div>
          <div className="thin-progress"><span style={{ width: `${attendanceRate}%` }} /></div>
          <div className="bar-list">
            {attendanceStats.map((item) => {
              const width = attendanceTotal ? Math.round((item.totalCount / attendanceTotal) * 100) : 0;
              return (
                <div className="status-row" key={item.status}>
                  <div><strong>{item.status[0].toUpperCase() + item.status.slice(1)}</strong><span>{item.totalCount} records</span></div>
                  <div className="bar-track"><span className="bar-fill" style={{ width: `${width}%` }} /></div>
                  <strong>{width}%</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h3>Today's Teaching Load</h3>
          <div className="distribution-list">
            {distribution.length ? distribution.map((item, index) => (
              <div className="distribution-row" key={item.name}>
                <div className="distribution-top">
                  <strong><span className="dot" style={{ background: item.color }} />{item.name}</strong>
                  <span>{item.percent}%</span>
                </div>
                <div className="thin-progress"><span style={{ width: `${item.percent}%`, background: item.color }} /></div>
              </div>
            )) : <p className="list-meta">No teaching sessions scheduled today.</p>}
          </div>
        </article>
      </div>

      <article className="panel wide-panel">
        <h3>Today's Activity</h3>
        <div className="list-stack">
          {recentRows.length ? recentRows.map((item, index) => (
            <div className="list-row" key={`${item.title}-${index}`}>
              <div className="list-main">
                <div className="avatar">{shortName(item.title)}</div>
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              </div>
              <div className="list-meta"><strong>{item.meta}</strong></div>
            </div>
          )) : <p className="list-meta">No activity recorded today.</p>}
        </div>
      </article>

      <section className="admin-payment-center wide-panel">
        <div className="admin-payment-center-header">
          <div>
            <h3>Bank Transfer Alerts</h3>
            <p>Payments waiting for admin confirmation.</p>
          </div>
          <span>{pendingPayments.length} open</span>
        </div>
        <div className="list-stack">
          {pendingPayments.length ? pendingPayments.map((payment) => (
            <div className="list-row admin-payment-alert" key={payment._id}>
              <span className="admin-payment-alert-icon"><CreditCard /></span>
              <div>
                <strong>{getName(payment.studentId)} - {getName(payment.classId)}</strong>
                <span>{fmtMoney(payment.amount)} - Code {transferCode(payment)}</span>
              </div>
              <button className="small-button" type="button" onClick={() => onConfirmPayment(payment)}>Confirm Paid</button>
            </div>
          )) : <Empty>No bank transfers waiting for confirmation.</Empty>}
        </div>
      </section>
    </>
  );
}

function Metric({ title, value, note, color, code }) {
  return (
    <article className="metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small className={note?.includes("Scheduled") || note?.includes("Assigned") ? "good" : ""}>{note}</small>
      <div className={`metric-icon ${color}`}>{code}</div>
    </article>
  );
}

function PaymentTasksView({ data, payrollRows, paymentPanel, setPaymentPanel, onConfirmPayment, onPayTeacher, onOpenModal }) {
  const pendingBankTransfers = data.payments.filter(needsConfirmation);
  const paidPayments = data.payments.filter((item) => item.status === "paid").slice(0, 12);
  const unpaidPayroll = payrollRows.filter((item) => item.status !== "paid");

  return (
    <>
      <section className="payment-task-hero">
        <div>
          <span>Taskboard</span>
          <h2>Money Tasks</h2>
          <p>Handle incoming parent transfers and outgoing teacher payroll from one clean board.</p>
        </div>
        <div className="payment-task-actions">
          <button className="payment-create-button" type="button" onClick={() => onOpenModal("payment")}>
            Create Payment
          </button>
          <div className="payment-task-total">
            <strong>{pendingBankTransfers.length + unpaidPayroll.length}</strong>
            <span>open tasks</span>
          </div>
        </div>
      </section>

      <section className="money-task-split">
        <article className="money-task-card parent-money">
          <span className="money-task-icon"><ArrowDownToLine /></span>
          <div>
            <p>Receive from parents</p>
            <h3>{fmtMoney(pendingBankTransfers.reduce((sum, item) => sum + (item.amount || 0), 0))}</h3>
            <span>{pendingBankTransfers.length} transfers waiting, {paidPayments.length} recently paid</span>
          </div>
          <button className="small-button" type="button" onClick={() => setPaymentPanel("parents")}>Open board</button>
        </article>
        <article className="money-task-card payroll-money">
          <span className="money-task-icon"><WalletCards /></span>
          <div>
            <p>Pay teachers</p>
            <h3>{fmtMoney(unpaidPayroll.reduce((sum, item) => sum + item.amount, 0))}</h3>
            <span>{unpaidPayroll.length} payroll tasks, {payrollRows.length} teachers tracked</span>
          </div>
          <button className="small-button" type="button" onClick={() => setPaymentPanel("payroll")}>Open board</button>
        </article>
      </section>

      {paymentPanel && createPortal((
        <div className="payment-task-modal" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && setPaymentPanel(null)}>
          <div className="payment-task-dialog" role="dialog" aria-modal="true">
            <div className="payment-task-modal-header">
              <div>
                <span>{paymentPanel === "payroll" ? "Outgoing money" : "Incoming money"}</span>
                <h3>{paymentPanel === "payroll" ? "Teacher Payroll" : "Parent Transfers"}</h3>
                <p>{paymentPanel === "payroll" ? "Review this month's teaching sessions and mark teacher salary as paid." : "Check parent bank transfer codes, then confirm the payment after money arrives."}</p>
              </div>
              <button className="icon-button" type="button" onClick={() => setPaymentPanel(null)} aria-label="Close">x</button>
            </div>
            <div id="paymentTaskModalBody">
              {paymentPanel === "payroll" ? (
                <>
                  <div className="payment-modal-summary">
                    <span><strong>{unpaidPayroll.length}</strong> unpaid teachers</span>
                    <span><strong>{fmtMoney(unpaidPayroll.reduce((sum, item) => sum + item.amount, 0))}</strong> waiting payout</span>
                    <span><strong>{payrollRows.reduce((sum, item) => sum + item.sessions, 0)}</strong> taught sessions</span>
                  </div>
                  <PayrollTable rows={payrollRows} onPayTeacher={onPayTeacher} />
                </>
              ) : (
                <>
                  <div className="payment-modal-summary">
                    <span><strong>{pendingBankTransfers.length}</strong> waiting transfers</span>
                    <span><strong>{fmtMoney(pendingBankTransfers.reduce((sum, item) => sum + item.amount, 0))}</strong> waiting confirmation</span>
                    <span><strong>{paidPayments.length}</strong> recently paid</span>
                  </div>
                  <ParentPaymentTable rows={[...pendingBankTransfers, ...paidPayments]} onConfirmPayment={onConfirmPayment} />
                </>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}

function ParentPaymentTable({ rows, onConfirmPayment }) {
  return (
    <div className="payment-modal-table">
      <table className="data-table">
        <thead><tr><th>Student</th><th>Class / Code</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((payment) => (
            <tr key={payment._id}>
              <td><strong>{getName(payment.studentId)}</strong><br /><span className="list-meta">{getName(payment.parentId)}</span></td>
              <td><strong>{getName(payment.classId)}</strong><br /><span className="list-meta">Code {transferCode(payment)}</span></td>
              <td>{fmtMoney(payment.amount)}</td>
              <td><Badge>{payment.status || "pending"}</Badge></td>
              <td>{payment.status === "paid" ? <span className="admin-payment-paid">Paid</span> : <button className="small-button" type="button" onClick={() => onConfirmPayment(payment)}>Confirm Paid</button>}</td>
            </tr>
          )) : <tr><td className="empty-cell" colSpan="5">No parent transfer records in this list.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function PayrollTable({ rows, onPayTeacher }) {
  return (
    <div className="payment-modal-table">
      <table className="data-table">
        <thead><tr><th>Teacher</th><th>Workload</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((item) => (
            <tr key={item.teacher._id}>
              <td><strong>{item.teacher.fullName}</strong><br /><span className="list-meta">{item.teacher.email}</span></td>
              <td>{item.classes.length} classes<br /><span className="list-meta">{item.sessions} sessions this month</span></td>
              <td>{fmtMoney(item.amount)}</td>
              <td><Badge>{item.status}</Badge></td>
              <td>{item.status === "paid" ? <span className="admin-payment-paid">Paid{item.paidAt ? ` ${new Date(item.paidAt).toLocaleDateString("vi-VN")}` : ""}</span> : <button className="small-button" type="button" onClick={() => onPayTeacher(item.teacher._id)}>Mark Paid</button>}</td>
            </tr>
          )) : <tr><td className="empty-cell" colSpan="5">No teacher payroll data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function UsersOverview({ data, onOpenModal, onDelete }) {
  return (
    <>
      <section className="users-role-hero">
        <div>
          <span>Account directory</span>
          <h2>Users by role</h2>
          <p>Manage all accounts in four clear groups.</p>
        </div>
        <button className="small-button" type="button" onClick={() => onOpenModal("user")}>Add User</button>
      </section>
      <section className="users-role-grid">
        {["admin", "teacher", "student", "parent"].map((role) => <UserRoleCard key={role} role={role} data={data} onDelete={onDelete} />)}
      </section>
    </>
  );
}

function UserRoleCard({ role, data, onDelete }) {
  const config = roleConfig[role];
  const Icon = config.icon;
  const rows = data.users.filter((item) => item.role === role);
  const [query, setQuery] = useState("");
  const filtered = rows.filter((item) => `${item.fullName} ${item.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <article className={`user-role-card role-${role}`}>
      <header>
        <span className="user-role-icon"><Icon /></span>
        <div><h3>{config.title}</h3><p>{config.subtitle}</p></div>
        <strong>{rows.length}</strong>
      </header>
      <input className="role-search-input" type="search" placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="user-role-list">
        {filtered.length ? filtered.map((user) => (
          <div className="user-role-row" key={user._id}>
            <div className="avatar">{shortName(user.fullName)}</div>
            <div><strong>{user.fullName}</strong><span>{user.email}</span><small>Created {new Date(user.createdAt || Date.now()).toLocaleDateString("vi-VN")}</small></div>
            <button className="danger-button" type="button" onClick={() => onDelete(user._id)}>Delete</button>
          </div>
        )) : <Empty>No {config.title.toLowerCase()} yet.</Empty>}
      </div>
    </article>
  );
}

function RoleDirectory({ view, role, data, onOpenModal, onDelete }) {
  const config = roleConfig[role];
  const rows = data.users.filter((item) => item.role === role);
  const [query, setQuery] = useState("");
  const filtered = rows.filter((item) => `${item.fullName} ${item.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <DirectoryHero
        title={config.title}
        subtitle={config.subtitle}
        count={rows.length}
        icon={config.icon}
        action={<button className="small-button" type="button" onClick={() => onOpenModal("user")}>Add User</button>}
      />
      <div className="directory-toolbar">
        <input className="search-input" type="search" placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <section className="directory-grid">
        {filtered.length ? filtered.map((user) => (
          <article className={`directory-card role-${role}`} key={user._id}>
            <header>
              <div className="directory-avatar">{shortName(user.fullName)}</div>
              <div><h3>{user.fullName}</h3><p>{user.email}</p></div>
              <Badge>{role}</Badge>
            </header>
            <div className="directory-card-meta">
              <span><strong>Created</strong>{new Date(user.createdAt || Date.now()).toLocaleDateString("vi-VN")}</span>
              <span><strong>Summary</strong>{userRoleStat(user, role, data)}</span>
            </div>
            <button className="danger-button" type="button" onClick={() => onDelete(user._id)}>Delete</button>
          </article>
        )) : <Empty>No {config.title.toLowerCase()} yet.</Empty>}
      </section>
    </>
  );
}

function SubjectsView({ data, onOpenModal, onDelete }) {
  const [query, setQuery] = useState("");
  const rows = data.courses.filter((item) => `${item.title} ${item.subject} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <DirectoryHero title="Subjects" subtitle="Course catalog, prices and delivery modes." count={data.courses.length} icon={BookOpen} action={<button className="small-button" type="button" onClick={() => onOpenModal("course")}>Add Subject</button>} />
      <div className="directory-toolbar">
        <input className="search-input" type="search" placeholder="Search subjects..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <section className="directory-grid subjects-directory">
        {rows.length ? rows.map((course) => (
          <article className="directory-card subject-card" key={course._id}>
            <header>
              <span className="directory-avatar"><BookOpen /></span>
              <div><h3>{course.title}</h3><p>{course.description || "No description"}</p></div>
              <Badge>{course.mode || "online"}</Badge>
            </header>
            <div className="directory-card-meta">
              <span><strong>Price</strong>{fmtMoney(course.price)}</span>
              <span><strong>Category</strong>{course.subject || "Subject"}</span>
            </div>
            <button className="danger-button" type="button" onClick={() => onDelete(course._id)}>Delete</button>
          </article>
        )) : <Empty>No subjects yet.</Empty>}
      </section>
    </>
  );
}

function ClassesView({ data, onOpenModal, onDelete, onAddStudent, onUpdateEnrollment, onRemoveEnrollment }) {
  const [query, setQuery] = useState("");
  const [activeClassId, setActiveClassId] = useState("");
  const rows = data.classes.filter((item) => `${item.className} ${getName(item.courseId)} ${getName(item.teacherId)}`.toLowerCase().includes(query.toLowerCase()));
  const activeClass = data.classes.find((item) => item._id === activeClassId);

  return (
    <>
      <DirectoryHero title="Classes" subtitle="Class sections, teacher assignments and capacity." count={data.classes.length} icon={School} action={<button className="small-button" type="button" onClick={() => onOpenModal("class")}>Add Class</button>} />
      <div className="directory-toolbar">
        <input className="search-input" type="search" placeholder="Search classes..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <section className="directory-grid classes-directory">
        {rows.length ? rows.map((classItem) => {
          const current = classItem.currentStudents || 0;
          const capacity = classItem.capacity || 0;
          const percent = capacity ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
          return (
            <article className="directory-card class-card" key={classItem._id}>
              <header>
                <span className="directory-avatar"><School /></span>
                <div><h3>{classItem.className}</h3><p>{getName(classItem.courseId)}</p></div>
                <Badge>{classItem.status || "upcoming"}</Badge>
              </header>
              <div className="directory-card-meta">
                <span><strong>Teacher</strong>{getName(classItem.teacherId)}</span>
                <span><strong>Schedule</strong>{classItem.schedule || "No schedule"}</span>
              </div>
              <div className="class-capacity">
                <div><strong>{current}/{capacity}</strong><span>{percent}% full</span></div>
                <div className="thin-progress"><span style={{ width: `${percent}%` }} /></div>
              </div>
              <div className="class-card-actions">
                <button className="small-button" type="button" onClick={() => setActiveClassId(classItem._id)}>
                  Manage Students
                </button>
                <button className="danger-button" type="button" onClick={() => onDelete(classItem._id)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </article>
          );
        }) : <Empty>No classes yet.</Empty>}
      </section>
      {activeClass && (
        <ClassDetailModal
          classItem={activeClass}
          data={data}
          onClose={() => setActiveClassId("")}
          onAddStudent={onAddStudent}
          onUpdateEnrollment={onUpdateEnrollment}
          onRemoveEnrollment={onRemoveEnrollment}
        />
      )}
    </>
  );
}

function ClassDetailModal({ classItem, data, onClose, onAddStudent, onUpdateEnrollment, onRemoveEnrollment }) {
  const [adding, setAdding] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const enrollments = data.enrollments.filter((item) => sameId(getId(item.classId), classItem._id));
  const enrolledStudentIds = new Set(enrollments.map((item) => String(getId(item.studentId))).filter(Boolean));
  const availableStudents = data.users
    .filter((item) => item.role === "student" && !enrolledStudentIds.has(String(item._id)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const parents = data.users.filter((item) => item.role === "parent").sort((a, b) => a.fullName.localeCompare(b.fullName));
  const capacity = Number(classItem.capacity || 0);
  const activeEnrollmentCount = enrollments.filter((item) => item.status !== "cancelled").length;
  const current = Math.max(Number(classItem.currentStudents || 0), activeEnrollmentCount);
  const isFull = capacity > 0 && current >= capacity;

  const submit = async (event) => {
    event.preventDefault();
    setAdding(true);
    try {
      await onAddStudent(classItem._id, new FormData(event.currentTarget));
      event.currentTarget.reset();
    } catch (error) {
      // The page status area already shows the actionable error.
    } finally {
      setAdding(false);
    }
  };

  const submitEnrollmentEdit = async (event) => {
    event.preventDefault();
    if (!editingEnrollment) return;
    setSavingEnrollment(true);
    try {
      await onUpdateEnrollment(editingEnrollment._id, new FormData(event.currentTarget));
      setEditingEnrollment(null);
    } catch (error) {
      // The page status area already shows the actionable error.
    } finally {
      setSavingEnrollment(false);
    }
  };

  return createPortal((
    <div className="modal-overlay active class-detail-overlay" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card class-detail-card" role="dialog" aria-modal="true" aria-labelledby="classDetailTitle">
        <header className="modal-header class-detail-header">
          <div>
            <span>Class details</span>
            <h3 id="classDetailTitle">{classItem.className}</h3>
            <p>{getName(classItem.courseId)} - {getName(classItem.teacherId)}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close class detail" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="class-detail-body">
          <section className="class-detail-summary">
            <div><strong>Teacher</strong><span>{getName(classItem.teacherId)}</span></div>
            <div><strong>Subject</strong><span>{getName(classItem.courseId)}</span></div>
            <div><strong>Schedule</strong><span>{classItem.schedule || "No schedule"}</span></div>
            <div><strong>Room</strong><span>{classItem.room || "No room"}</span></div>
            <div><strong>Dates</strong><span>{dateKey(classItem.startDate)} - {dateKey(classItem.endDate)}</span></div>
            <div><strong>Capacity</strong><span>{current}/{capacity || "N/A"} students</span></div>
          </section>

          <section className="class-detail-main">
            <article className="class-roster-panel">
              <header>
                <div>
                  <h4>Students</h4>
                  <p>{enrollments.length} enrolled in this class.</p>
                </div>
                <Badge>{classItem.status || "upcoming"}</Badge>
              </header>
              <div className="class-roster-list">
                {enrollments.length ? enrollments.map((enrollment) => (
                  <div className="class-roster-row" key={enrollment._id}>
                    <span className="class-roster-avatar">{shortName(getName(enrollment.studentId, "ST"))}</span>
                    <div>
                      <strong>{getName(enrollment.studentId)}</strong>
                      <span>{enrollment.studentId?.email || "No email"}</span>
                      <small>Parent: {getName(enrollment.parentId, "Not linked")}</small>
                    </div>
                    <div className="class-roster-controls">
                      <div className="class-roster-badges">
                        <Badge>{enrollment.status || "pending"}</Badge>
                        <Badge>{enrollment.paymentStatus || "unpaid"}</Badge>
                      </div>
                      <div className="class-roster-actions">
                        <button type="button" onClick={() => setEditingEnrollment(enrollment)}>Edit</button>
                        <button type="button" className="danger" onClick={() => onRemoveEnrollment(enrollment)}>Remove</button>
                      </div>
                    </div>
                  </div>
                )) : <Empty>No students in this class yet.</Empty>}
              </div>
            </article>

            {editingEnrollment ? (
              <form className="class-add-student-form class-edit-enrollment-form" onSubmit={submitEnrollmentEdit} key={editingEnrollment._id}>
                <div>
                  <h4>Edit Enrollment</h4>
                  <p>{getName(editingEnrollment.studentId)} in {classItem.className}.</p>
                </div>
                <label>
                  Parent
                  <select name="parentId" defaultValue={getId(editingEnrollment.parentId) || ""} disabled={savingEnrollment}>
                    <option value="">No parent linked</option>
                    {parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.fullName} - {parent.email}</option>)}
                  </select>
                </label>
                <div className="class-add-student-row">
                  <label>
                    Enrollment status
                    <select name="status" defaultValue={editingEnrollment.status || "approved"} disabled={savingEnrollment}>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label>
                    Payment status
                    <select name="paymentStatus" defaultValue={editingEnrollment.paymentStatus || "unpaid"} disabled={savingEnrollment}>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </label>
                </div>
                <div className="class-edit-enrollment-actions">
                  <button className="ghost-button" type="button" onClick={() => setEditingEnrollment(null)} disabled={savingEnrollment}>Cancel</button>
                  <button className="small-button" type="submit" disabled={savingEnrollment}>{savingEnrollment ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            ) : (
            <form className="class-add-student-form" onSubmit={submit}>
              <div>
                <h4>Add Student</h4>
                <p>Select a student account and optionally link a parent account.</p>
              </div>
              <label>
                Student
                <select name="studentId" required disabled={adding || isFull || !availableStudents.length}>
                  <option value="">{isFull ? "Class is full" : "Select student"}</option>
                  {availableStudents.map((student) => <option key={student._id} value={student._id}>{student.fullName} - {student.email}</option>)}
                </select>
              </label>
              <label>
                Parent
                <select name="parentId" disabled={adding}>
                  <option value="">No parent linked</option>
                  {parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.fullName} - {parent.email}</option>)}
                </select>
              </label>
              <div className="class-add-student-row">
                <label>
                  Enrollment status
                  <select name="status" defaultValue="approved" disabled={adding}>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label>
                  Payment status
                  <select name="paymentStatus" defaultValue="unpaid" disabled={adding}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </label>
              </div>
              {!availableStudents.length && !isFull && <p className="class-add-note">All student accounts are already enrolled in this class.</p>}
              <button className="small-button" type="submit" disabled={adding || isFull || !availableStudents.length}>
                {adding ? "Adding..." : "Add Student"}
              </button>
            </form>
            )}
          </section>
        </div>
      </section>
    </div>
  ), document.body);
}

function ScheduleEditorModal({ data, editor, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);
  if (!editor) return null;

  const schedule = editor.schedule;
  const classes = [...data.classes].sort((a, b) => String(a.className || "").localeCompare(String(b.className || "")));
  const selectedClassId = getId(schedule?.classId) || "";
  const initialDate = editor.date || dateKey(schedule?.date) || "";

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(new FormData(event.currentTarget), schedule);
    } catch (error) {
      // The admin status area already shows the actionable error.
    } finally {
      setSaving(false);
    }
  };

  return createPortal((
    <div className="modal-overlay active" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card schedule-editor-card" role="dialog" aria-modal="true" aria-labelledby="scheduleEditorTitle">
        <div className="modal-header">
          <div>
            <h3 id="scheduleEditorTitle">{schedule ? "Edit Schedule" : "Add Schedule"}</h3>
            <p>{schedule ? "Update this teaching session." : "Create a teaching session for a class."}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close schedule editor" onClick={onClose}>x</button>
        </div>
        <form className="modal-form schedule-editor-form" onSubmit={submit}>
          <label className="modal-wide">
            Class
            <select name="classId" defaultValue={selectedClassId} required disabled={saving}>
              <option value="">Select class</option>
              {classes.map((classItem) => (
                <option key={classItem._id} value={classItem._id}>
                  {classItem.className} - {getName(classItem.courseId)} - {getName(classItem.teacherId)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" defaultValue={initialDate} required disabled={saving} />
          </label>
          <label>
            Start time
            <input name="startTime" type="time" defaultValue={schedule?.startTime || ""} required disabled={saving} />
          </label>
          <label>
            End time
            <input name="endTime" type="time" defaultValue={schedule?.endTime || ""} required disabled={saving} />
          </label>
          <label>
            Room
            <input name="room" placeholder="Room or online link" defaultValue={schedule?.room || ""} disabled={saving} />
          </label>
          <label>
            Status
            <select name="status" defaultValue={schedule?.status || "scheduled"} disabled={saving}>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="modal-wide">
            Note
            <textarea name="note" placeholder="Optional schedule note" defaultValue={schedule?.note || ""} disabled={saving} />
          </label>
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="small-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Schedule"}</button>
          </div>
        </form>
      </section>
    </div>
  ), document.body);
}

function SchedulesView({ data, scheduleMonth, setScheduleMonth, onCreateSchedule, onEditSchedule, onDeleteSchedule }) {
  const now = new Date();
  const todayKey = dateKey(now);
  const viewYear = scheduleMonth.getFullYear();
  const viewMonth = scheduleMonth.getMonth();
  const viewMonthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthStart = new Date(viewYear, viewMonth, 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const byDay = data.schedules.reduce((map, item) => {
    const key = dateKey(item.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
  byDay.forEach((items) => items.sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || ""))));

  const days = [];
  for (let index = 0; index < firstDay; index += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(new Date(viewYear, viewMonth, day));

  const visibleMonthSchedules = data.schedules.filter((item) => dateKey(item.date).startsWith(viewMonthKey));
  const todaySchedules = byDay.get(todayKey) || [];
  const upcomingSchedules = data.schedules
    .filter((item) => new Date(item.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.startTime || "").localeCompare(String(b.startTime || "")))
    .slice(0, 8);

  return (
    <section className="admin-schedule-layout">
      <section className="schedule-calendar-card">
        <div className="calendar-toolbar">
          <div><span>Academic calendar</span><h2>{monthTitle(scheduleMonth)}</h2></div>
          <div className="calendar-actions">
            <button className="small-button" type="button" onClick={() => onCreateSchedule(dateKey(new Date()))}>Add Session</button>
            <button className="icon-button" type="button" aria-label="Previous month" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth - 1, 1))}><ChevronLeft /></button>
            <button className="small-button" type="button" onClick={() => setScheduleMonth(new Date())}>Today</button>
            <button className="icon-button" type="button" aria-label="Next month" onClick={() => setScheduleMonth(new Date(viewYear, viewMonth + 1, 1))}><ChevronRight /></button>
          </div>
          <div className="calendar-summary"><strong>{visibleMonthSchedules.length}</strong><span>sessions</span></div>
        </div>
        <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((date, index) => {
            if (!date) return <div className="calendar-day muted" key={`empty-${index}`} />;
            const key = dateKey(date);
            const daySchedules = byDay.get(key) || [];
            return (
              <div className={`calendar-day ${key === todayKey ? "today" : ""}`} key={key}>
                <div className="calendar-day-top">
                  <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <div>
                    <strong>{date.getDate()}</strong>
                    <button className="calendar-day-add" type="button" aria-label={`Add schedule on ${key}`} onClick={() => onCreateSchedule(key)}>+</button>
                  </div>
                </div>
                <div className="calendar-events">
                  {daySchedules.slice(0, 4).map((item) => (
                    <article className={`calendar-event ${item.status || "scheduled"}`} key={item._id}>
                      <strong>{getName(item.classId)}</strong>
                      <span>{item.startTime || "--:--"} - {item.endTime || "--:--"}</span>
                      <small>{item.room || "No room"}{item.classId?.teacherId ? ` - ${getName(item.classId.teacherId)}` : ""}</small>
                      <div className="calendar-event-actions">
                        <button type="button" onClick={() => onEditSchedule(item)}>Edit</button>
                        <button type="button" className="danger" onClick={() => onDeleteSchedule(item._id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                  {daySchedules.length > 4 && <span className="calendar-more">+{daySchedules.length - 4} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <aside className="admin-schedule-side">
        <article className="panel schedule-today-panel">
          <h3>Today</h3>
          <div className="list-stack">
            {todaySchedules.length ? todaySchedules.map((item) => (
              <div className="list-row" key={item._id}>
                <div><strong>{getName(item.classId)}</strong><span>{item.startTime || ""} - {item.endTime || ""} - {item.room || "No room"}</span></div>
                <div className="schedule-row-actions">
                  <Badge>{item.status || "scheduled"}</Badge>
                  <button type="button" onClick={() => onEditSchedule(item)}>Edit</button>
                  <button type="button" className="danger" onClick={() => onDeleteSchedule(item._id)}>Delete</button>
                </div>
              </div>
            )) : <Empty>No classes scheduled today.</Empty>}
          </div>
        </article>
        <article className="panel schedule-today-panel">
          <h3>Upcoming</h3>
          <div className="list-stack">
            {upcomingSchedules.length ? upcomingSchedules.map((item) => (
              <div className="list-row" key={item._id}>
                <div><strong>{getName(item.classId)}</strong><span>{dateKey(item.date)} - {item.startTime || ""}</span></div>
                <div className="schedule-row-actions">
                  <Badge>{item.status || "scheduled"}</Badge>
                  <button type="button" onClick={() => onEditSchedule(item)}>Edit</button>
                  <button type="button" className="danger" onClick={() => onDeleteSchedule(item._id)}>Delete</button>
                </div>
              </div>
            )) : <Empty>No upcoming sessions.</Empty>}
          </div>
        </article>
      </aside>
    </section>
  );
}

function AnnouncementsView({ rows, onOpenModal, onDelete }) {
  return (
    <Table
      rows={rows}
      title="announcements"
      actions={<button className="small-button" type="button" onClick={() => onOpenModal("announcement")}>Post Announcement</button>}
      columns={[
        { label: "Title", render: (row) => <><strong>{row.title}</strong><br /><span className="list-meta">{row.message}</span></> },
        { label: "Audience", render: (row) => <Badge>{row.audience}</Badge> },
        { label: "Date", render: (row) => new Date(row.createdAt).toLocaleDateString("vi-VN") },
        { label: "Action", render: (row) => <button className="danger-button" type="button" onClick={() => onDelete(row.id)}>Delete</button> },
      ]}
    />
  );
}

function ReportsView({ data, payrollRows }) {
  const payment = data.reports?.paymentStats || [];
  const pendingBankTransfers = data.payments.filter(needsConfirmation);
  const paidPayments = data.payments.filter((item) => item.status === "paid");
  const paidStudentTotal = paidPayments.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingStudentTotal = data.payments.filter((item) => item.status !== "paid").reduce((sum, item) => sum + (item.amount || 0), 0);
  const teacherSalaryTotal = payrollRows.reduce((sum, item) => sum + item.amount, 0);
  const paidTeacherSalary = payrollRows.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
  const unpaidTeacherSalary = teacherSalaryTotal - paidTeacherSalary;
  const attendanceCounts = data.attendances.reduce((sum, item) => {
    const status = item.status || "present";
    if (sum[status] !== undefined) sum[status] += 1;
    return sum;
  }, { present: 0, late: 0, absent: 0 });
  const attendanceTotal = attendanceCounts.present + attendanceCounts.late + attendanceCounts.absent;
  const attendancePercent = (value) => (attendanceTotal ? Math.round((value / attendanceTotal) * 100) : 0);
  const presentPercent = attendancePercent(attendanceCounts.present);
  const latePercent = attendancePercent(attendanceCounts.late);
  const absentPercent = Math.max(0, 100 - presentPercent - latePercent);
  const lateStop = presentPercent + latePercent;
  const subjectProgress = data.courses.map((course) => {
    const classIds = new Set(data.classes.filter((item) => getId(item.courseId) === course._id).map((item) => item._id));
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const courseSchedules = data.schedules.filter((item) => classIds.has(getId(item.classId)) && item.status !== "cancelled");
    const completedSchedules = courseSchedules.filter((item) => item.status === "completed" || new Date(item.date) <= today).length;
    const completedClasses = data.classes.filter((item) => getId(item.courseId) === course._id && item.status === "completed").length;
    const total = courseSchedules.length || classIds.size || 0;
    const completed = courseSchedules.length ? completedSchedules : completedClasses;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { title: course.title, total, completed, percent };
  });

  return (
    <>
      <section className="report-hero">
        <div>
          <span>Management report</span>
          <h2>Center Performance</h2>
          <p>Subjects, attendance, student payments, teacher salary, and system totals.</p>
        </div>
        <div className="report-hero-actions">
          <strong>{new Date().toLocaleDateString("vi-VN")}</strong>
          <button className="small-button" type="button" onClick={() => window.print()}>Download PDF</button>
        </div>
      </section>

      <div className="report-metric-grid">
        <ReportMetric title="Paid student payments" value={fmtMoney(paidStudentTotal)} note={`${paidPayments.length} paid records`} />
        <ReportMetric title="Teacher salary" value={fmtMoney(teacherSalaryTotal)} note={`${fmtMoney(unpaidTeacherSalary)} unpaid this month`} />
        <ReportMetric title="Subjects managed" value={data.courses.length} note={`${data.classes.length} classes`} />
        <ReportMetric title="Open bank transfers" value={pendingBankTransfers.length} note={`${fmtMoney(pendingStudentTotal)} waiting`} />
      </div>

      <section className="report-grid">
        <article className="report-panel report-wide">
          <header><h3>Subject Teaching Progress</h3><span>{subjectProgress.length} subjects</span></header>
          <div className="report-progress-list">
            {subjectProgress.length ? subjectProgress.map((item) => (
              <div className="report-progress-row" key={item.title}>
                <div><strong>{item.title}</strong><span>{item.completed}/{item.total} sessions completed</span></div>
                <em>{item.percent}%</em>
                <div className="thin-progress"><span style={{ width: `${item.percent}%` }} /></div>
              </div>
            )) : <Empty>No subject data yet.</Empty>}
          </div>
        </article>
        <article className="report-panel">
          <header><h3>Attendance Ratio</h3><span>{attendanceTotal} records</span></header>
          <div className="attendance-donut" style={{ "--present": presentPercent, "--late": lateStop }}>
            <strong>{presentPercent}%</strong>
            <span>on time</span>
          </div>
          <div className="report-legend">
            <span><i className="present" />On time <strong>{presentPercent}%</strong></span>
            <span><i className="late" />Late <strong>{latePercent}%</strong></span>
            <span><i className="absent" />Absent <strong>{absentPercent}%</strong></span>
          </div>
        </article>
        <article className="report-panel">
          <header><h3>Student Payments</h3><span>{data.payments.length} records</span></header>
          <div className="report-money-stack">
            <p><span>Paid</span><strong>{fmtMoney(paidStudentTotal)}</strong></p>
            <p><span>Pending / failed</span><strong>{fmtMoney(pendingStudentTotal)}</strong></p>
            <p><span>Payment status</span><strong>{payment.map((item) => `${item.status}: ${item.totalCount}`).join(" / ") || "No data"}</strong></p>
          </div>
        </article>
        <article className="report-panel">
          <header><h3>Teacher Salary</h3><span>{payrollRows.length} teachers</span></header>
          <div className="report-money-stack">
            <p><span>Total salary</span><strong>{fmtMoney(teacherSalaryTotal)}</strong></p>
            <p><span>Paid</span><strong>{fmtMoney(paidTeacherSalary)}</strong></p>
            <p><span>Unpaid</span><strong>{fmtMoney(unpaidTeacherSalary)}</strong></p>
          </div>
        </article>
        <article className="report-panel">
          <header><h3>System Totals</h3><span>Live data</span></header>
          <div className="report-compact-list">
            <p><span>Users</span><strong>{data.users.length}</strong></p>
            <p><span>Classes</span><strong>{data.classes.length}</strong></p>
            <p><span>Schedules</span><strong>{data.schedules.length}</strong></p>
          </div>
        </article>
      </section>
    </>
  );
}

function ReportMetric({ title, value, note }) {
  return <article className="report-metric-card"><span>{title}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ProfileView({ user, preview, setPreview, isOpen, setOpen, onSubmit }) {
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
            <p>System Administrator</p>
            <small>{user.caption || "No caption yet."}</small>
          </div>
          <button className="ghost-button" type="button" onClick={() => setOpen(true)}>Edit Profile</button>
        </div>
        <div className="profile-info-grid">
          <section>
            <h4>Contact Information</h4>
            <p><span>Email</span>{user.email}</p>
            <p><span>Role</span>{user.role}</p>
            <p><span>Account</span>Administrator</p>
          </section>
          <section>
            <h4>Permissions</h4>
            <p><span>Access</span>Full System Access</p>
            <p><span>Manage</span>Users, classes, courses</p>
            <p><span>Reports</span>Revenue and attendance</p>
          </section>
        </div>
      </article>

      {isOpen && (
        <div className="profile-modal" aria-hidden="false" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <form className="profile-form profile-edit-form" onSubmit={onSubmit}>
            <div className="profile-modal-header">
              <div>
                <h3>Edit Profile</h3>
                <p>Update your personal information and password.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setOpen(false)}>x</button>
            </div>
            <div className="profile-avatar-picker">
              <label className="profile-avatar-preview" htmlFor="profileAvatarInput">
                <span>{avatar ? <img src={avatar} alt={user.fullName} /> : <span>{shortName(user.fullName)}</span>}</span>
                <span className="profile-avatar-camera">Change photo</span>
              </label>
              <div>
                <strong>Profile picture</strong>
                <small>Choose an image to preview before saving.</small>
              </div>
            </div>
            <input id="profileAvatarInput" className="profile-file-input" name="avatar" type="file" accept="image/*" onChange={previewFile} />
            <label>Full name<input name="fullName" defaultValue={user.fullName || ""} required /></label>
            <label>Email<input name="email" type="email" defaultValue={user.email || ""} required /></label>
            <label>New password<input name="password" type="password" placeholder="Leave blank to keep current password" autoComplete="new-password" /></label>
            <label>Confirm password<input name="confirmPassword" type="password" placeholder="Repeat new password" autoComplete="new-password" /></label>
            <label className="profile-wide">Caption<textarea name="caption" placeholder="Write something about yourself..." defaultValue={user.caption || ""} /></label>
            <div className="profile-modal-actions">
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="small-button" type="submit">Save Profile</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function userRoleStat(user, role, data) {
  if (role === "teacher") {
    return `${data.classes.filter((item) => getId(item.teacherId) === user._id).length} assigned classes`;
  }
  if (role === "student") {
    return `${data.enrollments.filter((item) => getId(item.studentId) === user._id).length} enrollments`;
  }
  if (role === "parent") {
    const linked = new Set(data.enrollments.filter((item) => getId(item.parentId) === user._id).map((item) => getId(item.studentId)).filter(Boolean)).size;
    return `${linked} linked students`;
  }
  return "Admin access";
}

function getTeacherPayrollRows(data, paidPayroll) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const payrollRate = 200000;

  return data.users.filter((user) => user.role === "teacher").map((teacher) => {
    const teacherClasses = data.classes.filter((item) => getId(item.teacherId) === teacher._id);
    const classIds = new Set(teacherClasses.map((item) => item._id));
    const monthSchedules = data.schedules.filter((schedule) => {
      const startDate = new Date(schedule.date || schedule.startTime || schedule.createdAt);
      return classIds.has(getId(schedule.classId)) && !Number.isNaN(startDate.getTime()) && startDate.getMonth() === month && startDate.getFullYear() === year;
    });
    return {
      teacher,
      classes: teacherClasses,
      sessions: monthSchedules.length,
      amount: monthSchedules.length * payrollRate,
      status: paidPayroll[teacher._id] ? "paid" : "pending",
      paidAt: paidPayroll[teacher._id]?.paidAt || "",
    };
  });
}

function buildTodayDistribution(data, today) {
  const source = data.schedules.filter((item) => dateKey(item.date) === today).reduce((rows, item) => {
    const className = getName(item.classId);
    const existing = rows.find((row) => row.className === className);
    if (existing) existing.totalStudents += 1;
    else rows.push({ className, courseTitle: item.classId?.courseId?.title || className, totalStudents: 1 });
    return rows;
  }, []);
  const colors = ["#2563ff", "#7c3aed", "#db2777", "#ea580c", "#059669"];
  const total = source.reduce((sum, item) => sum + (item.totalStudents || 0), 0);
  return source.slice(0, 5).map((item, index) => ({
    name: item.courseTitle || item.className || `Class ${index + 1}`,
    percent: total ? Math.round(((item.totalStudents || 0) / total) * 100) : 0,
    color: colors[index % colors.length],
  }));
}

function buildRecentRows(data, announcements, today) {
  const scheduleRows = data.schedules.filter((item) => dateKey(item.date) === today).sort((a, b) => String(a.startTime || "").localeCompare(String(b.startTime || ""))).map((item) => ({
    title: getName(item.classId),
    detail: `${item.startTime || "--:--"} - ${item.endTime || "--:--"} - ${item.room || "No room"}`,
    meta: item.status || "scheduled",
  }));
  const enrollmentRows = data.enrollments.filter((item) => dateKey(item.createdAt || item.enrollDate) === today).map((item) => ({
    title: getName(item.studentId),
    detail: `New enrollment - ${getName(item.classId)}`,
    meta: item.paymentStatus || "unpaid",
  }));
  const paymentRows = data.payments.filter((item) => item.status === "paid" && dateKey(item.paidAt || item.updatedAt || item.createdAt) === today).map((item) => ({
    title: getName(item.studentId),
    detail: `Payment received - ${getName(item.classId)}`,
    meta: fmtMoney(item.amount),
  }));
  const announcementRows = announcements.filter((item) => dateKey(item.createdAt) === today).map((item) => ({
    title: item.title,
    detail: `Announcement - ${item.message}`,
    meta: item.audience || "all",
  }));
  return [...scheduleRows, ...enrollmentRows, ...paymentRows, ...announcementRows];
}
