const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Course = require("./models/Course");
const Class = require("./models/Class");
const Enrollment = require("./models/Enrollment");
const Schedule = require("./models/Schedule");
const Attendance = require("./models/Attendance");
const Payment = require("./models/Payment");
const OnlineClassSession = require("./models/OnlineClassSession");

const password = "Demo123456";

const addDays = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const padTime = (value) => String(value).padStart(2, "0");

const minutesToTime = (value) => {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${padTime(hours)}:${padTime(minutes)}`;
};

const currentClassWindow = () => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return {
    startTime: minutesToTime(minutes - 5),
    endTime: minutesToTime(minutes + 55),
  };
};

const upsertUser = async ({ fullName, email, role }) => {
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
  return User.create({ fullName, email, password: hashedPassword, role });
};

const upsertCourse = async (course) => {
  const existing = await Course.findOne({ title: course.title });
  if (existing) return existing;
  return Course.create(course);
};

const upsertClass = async (classData) => {
  const existing = await Class.findOne({ className: classData.className });
  if (existing) return existing;
  return Class.create(classData);
};

const upsertSchedule = async (scheduleData) => {
  const query = scheduleData.note
    ? { classId: scheduleData.classId, date: scheduleData.date, note: scheduleData.note }
    : {
        classId: scheduleData.classId,
        date: scheduleData.date,
        startTime: scheduleData.startTime,
      };
  const existing = await Schedule.findOne(query);
  if (existing) {
    Object.assign(existing, scheduleData);
    return existing.save();
  }
  return Schedule.create(scheduleData);
};

const upsertEnrollment = async (enrollmentData) => {
  const existing = await Enrollment.findOne({
    studentId: enrollmentData.studentId,
    classId: enrollmentData.classId,
  });
  if (existing) return existing;
  return Enrollment.create(enrollmentData);
};

const upsertAttendance = async (attendanceData) => {
  const existing = await Attendance.findOne({
    scheduleId: attendanceData.scheduleId,
    studentId: attendanceData.studentId,
  });
  if (existing) return existing;
  return Attendance.create(attendanceData);
};

const upsertPayment = async (paymentData) => {
  const existing = await Payment.findOne({ enrollmentId: paymentData.enrollmentId });
  if (existing) return existing;
  return Payment.create(paymentData);
};

const upsertOnlineClassSession = async (sessionData) => {
  const existing = await OnlineClassSession.findOne({ scheduleId: sessionData.scheduleId });
  if (existing) {
    Object.assign(existing, sessionData);
    return existing.save();
  }
  return OnlineClassSession.create(sessionData);
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const [
    teacherA,
    teacherB,
    teacherC,
    teacherD,
    parentA,
    parentB,
    parentC,
    parentD,
    studentA,
    studentB,
    studentC,
    studentD,
    studentE,
    studentF,
    studentG,
    studentH,
  ] = await Promise.all([
    upsertUser({ fullName: "Dr. Sarah Johnson", email: "teacher1@gmail.com", role: "teacher" }),
    upsertUser({ fullName: "Mr. Daniel Lee", email: "teacher2@gmail.com", role: "teacher" }),
    upsertUser({ fullName: "Ms. Emily Carter", email: "teacher3@gmail.com", role: "teacher" }),
    upsertUser({ fullName: "Mr. Kevin Brown", email: "teacher4@gmail.com", role: "teacher" }),
    upsertUser({ fullName: "John Smith", email: "parent1@gmail.com", role: "parent" }),
    upsertUser({ fullName: "Maria Garcia", email: "parent2@gmail.com", role: "parent" }),
    upsertUser({ fullName: "Robert Nguyen", email: "parent3@gmail.com", role: "parent" }),
    upsertUser({ fullName: "Linda Tran", email: "parent4@gmail.com", role: "parent" }),
    upsertUser({ fullName: "Anna Smith", email: "student1@gmail.com", role: "student" }),
    upsertUser({ fullName: "Ben Smith", email: "student2@gmail.com", role: "student" }),
    upsertUser({ fullName: "Liam Garcia", email: "student3@gmail.com", role: "student" }),
    upsertUser({ fullName: "Mia Nguyen", email: "student4@gmail.com", role: "student" }),
    upsertUser({ fullName: "Noah Nguyen", email: "student5@gmail.com", role: "student" }),
    upsertUser({ fullName: "Sophia Tran", email: "student6@gmail.com", role: "student" }),
    upsertUser({ fullName: "Lucas Tran", email: "student7@gmail.com", role: "student" }),
    upsertUser({ fullName: "Olivia Brown", email: "student8@gmail.com", role: "student" }),
  ]);

  const [mathCourse, englishCourse, scienceCourse, codingCourse, examCourse, artCourse] = await Promise.all([
    upsertCourse({
      title: "Advanced Mathematics",
      subject: "Mathematics",
      description: "Algebra, geometry, and problem-solving for secondary students.",
      price: 2500000,
      duration: "12 weeks",
      mode: "hybrid",
    }),
    upsertCourse({
      title: "Academic English",
      subject: "English",
      description: "Reading, writing, speaking, and grammar practice.",
      price: 2200000,
      duration: "10 weeks",
      mode: "online",
    }),
    upsertCourse({
      title: "General Science",
      subject: "Science",
      description: "Physics, chemistry, and biology foundations.",
      price: 2400000,
      duration: "12 weeks",
      mode: "offline",
    }),
    upsertCourse({
      title: "Coding for Beginners",
      subject: "Computer Science",
      description: "Scratch, JavaScript basics, and logical thinking.",
      price: 2800000,
      duration: "8 weeks",
      mode: "hybrid",
    }),
    upsertCourse({
      title: "IELTS Foundation",
      subject: "English",
      description: "Vocabulary, listening, reading, and speaking foundations for IELTS.",
      price: 3200000,
      duration: "14 weeks",
      mode: "online",
    }),
    upsertCourse({
      title: "Creative Arts Workshop",
      subject: "Arts",
      description: "Drawing, color theory, and creative portfolio projects.",
      price: 1800000,
      duration: "6 weeks",
      mode: "offline",
    }),
  ]);

  const [mathClass, englishClass, scienceClass, codingClass, ieltsClass, artClass] = await Promise.all([
    upsertClass({
      className: "MATH-ADV-01",
      courseId: mathCourse._id,
      teacherId: teacherA._id,
      schedule: "Mon, Wed 18:00 - 19:30",
      room: "Room A1",
      learningMode: "hybrid",
      startDate: addDays(-14),
      endDate: addDays(70),
      capacity: 24,
      currentStudents: 2,
      status: "ongoing",
    }),
    upsertClass({
      className: "ENG-ACD-01",
      courseId: englishCourse._id,
      teacherId: teacherB._id,
      schedule: "Tue, Thu 19:00 - 20:30",
      room: "Online",
      learningMode: "online",
      startDate: addDays(-7),
      endDate: addDays(63),
      capacity: 20,
      currentStudents: 2,
      status: "ongoing",
    }),
    upsertClass({
      className: "SCI-GEN-01",
      courseId: scienceCourse._id,
      teacherId: teacherA._id,
      schedule: "Sat 09:00 - 11:00",
      room: "Lab 2",
      learningMode: "offline",
      startDate: addDays(7),
      endDate: addDays(91),
      capacity: 18,
      currentStudents: 1,
      status: "upcoming",
    }),
    upsertClass({
      className: "CODE-BEG-01",
      courseId: codingCourse._id,
      teacherId: teacherC._id,
      schedule: "Mon, Fri 17:30 - 19:00",
      room: "Computer Lab",
      learningMode: "hybrid",
      startDate: addDays(-10),
      endDate: addDays(46),
      capacity: 18,
      currentStudents: 3,
      status: "ongoing",
    }),
    upsertClass({
      className: "IELTS-FDN-01",
      courseId: examCourse._id,
      teacherId: teacherB._id,
      schedule: "Wed, Sat 19:00 - 20:30",
      room: "Online",
      learningMode: "online",
      startDate: addDays(-21),
      endDate: addDays(77),
      capacity: 16,
      currentStudents: 3,
      status: "ongoing",
    }),
    upsertClass({
      className: "ART-WRK-01",
      courseId: artCourse._id,
      teacherId: teacherD._id,
      schedule: "Sun 14:00 - 16:00",
      room: "Studio 1",
      learningMode: "offline",
      startDate: addDays(3),
      endDate: addDays(45),
      capacity: 14,
      currentStudents: 2,
      status: "upcoming",
    }),
  ]);

  const liveEnglishWindow = currentClassWindow();

  const schedules = await Promise.all([
    upsertSchedule({ classId: mathClass._id, date: addDays(-5), startTime: "18:00", endTime: "19:30", room: "Room A1", status: "completed" }),
    upsertSchedule({ classId: mathClass._id, date: addDays(2), startTime: "18:00", endTime: "19:30", room: "Room A1", status: "scheduled" }),
    upsertSchedule({ classId: englishClass._id, date: addDays(-3), startTime: "19:00", endTime: "20:30", room: "Online", status: "completed" }),
    upsertSchedule({ classId: englishClass._id, date: addDays(1), startTime: "19:00", endTime: "20:30", room: "Online", status: "scheduled" }),
    upsertSchedule({
      classId: englishClass._id,
      date: addDays(0),
      startTime: liveEnglishWindow.startTime,
      endTime: liveEnglishWindow.endTime,
      room: "Online",
      status: "scheduled",
      note: "Demo online class - live now",
    }),
    upsertSchedule({ classId: scienceClass._id, date: addDays(8), startTime: "09:00", endTime: "11:00", room: "Lab 2", status: "scheduled" }),
    upsertSchedule({ classId: codingClass._id, date: addDays(-4), startTime: "17:30", endTime: "19:00", room: "Computer Lab", status: "completed" }),
    upsertSchedule({ classId: codingClass._id, date: addDays(3), startTime: "17:30", endTime: "19:00", room: "Computer Lab", status: "scheduled" }),
    upsertSchedule({ classId: ieltsClass._id, date: addDays(-6), startTime: "19:00", endTime: "20:30", room: "Online", status: "completed" }),
    upsertSchedule({ classId: ieltsClass._id, date: addDays(4), startTime: "19:00", endTime: "20:30", room: "Online", status: "scheduled" }),
    upsertSchedule({ classId: artClass._id, date: addDays(5), startTime: "14:00", endTime: "16:00", room: "Studio 1", status: "scheduled" }),
    upsertSchedule({ classId: scienceClass._id, date: addDays(15), startTime: "09:00", endTime: "11:00", room: "Lab 2", status: "scheduled" }),
  ]);

  const enrollments = await Promise.all([
    upsertEnrollment({ studentId: studentA._id, parentId: parentA._id, classId: mathClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentB._id, parentId: parentA._id, classId: mathClass._id, status: "approved", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentA._id, parentId: parentA._id, classId: englishClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentC._id, parentId: parentB._id, classId: englishClass._id, status: "approved", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentC._id, parentId: parentB._id, classId: scienceClass._id, status: "pending", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentD._id, parentId: parentC._id, classId: codingClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentE._id, parentId: parentC._id, classId: codingClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentH._id, parentId: parentD._id, classId: codingClass._id, status: "approved", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentD._id, parentId: parentC._id, classId: ieltsClass._id, status: "approved", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentF._id, parentId: parentD._id, classId: ieltsClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentG._id, parentId: parentD._id, classId: ieltsClass._id, status: "approved", paymentStatus: "paid" }),
    upsertEnrollment({ studentId: studentF._id, parentId: parentD._id, classId: artClass._id, status: "pending", paymentStatus: "unpaid" }),
    upsertEnrollment({ studentId: studentG._id, parentId: parentD._id, classId: artClass._id, status: "approved", paymentStatus: "unpaid" }),
  ]);

  await Promise.all([
    upsertAttendance({ scheduleId: schedules[0]._id, studentId: studentA._id, status: "present", note: "On time" }),
    upsertAttendance({ scheduleId: schedules[0]._id, studentId: studentB._id, status: "late", note: "Arrived 10 minutes late" }),
    upsertAttendance({ scheduleId: schedules[2]._id, studentId: studentA._id, status: "present", note: "Participated well" }),
    upsertAttendance({ scheduleId: schedules[2]._id, studentId: studentC._id, status: "absent", note: "Parent notified" }),
    upsertAttendance({ scheduleId: schedules[6]._id, studentId: studentD._id, status: "present", note: "Completed coding exercise" }),
    upsertAttendance({ scheduleId: schedules[6]._id, studentId: studentE._id, status: "present", note: "Great teamwork" }),
    upsertAttendance({ scheduleId: schedules[6]._id, studentId: studentH._id, status: "late", note: "Joined after warmup" }),
    upsertAttendance({ scheduleId: schedules[8]._id, studentId: studentD._id, status: "absent", note: "Sick leave" }),
    upsertAttendance({ scheduleId: schedules[8]._id, studentId: studentF._id, status: "present", note: "Strong speaking practice" }),
    upsertAttendance({ scheduleId: schedules[8]._id, studentId: studentG._id, status: "present", note: "On time" }),
  ]);

  await Promise.all([
    upsertPayment({
      studentId: studentA._id,
      parentId: parentA._id,
      classId: mathClass._id,
      enrollmentId: enrollments[0]._id,
      amount: mathCourse.price,
      paymentMethod: "bank_transfer",
      status: "paid",
      paidAt: addDays(-10),
      note: "Paid in full",
    }),
    upsertPayment({
      studentId: studentB._id,
      parentId: parentA._id,
      classId: mathClass._id,
      enrollmentId: enrollments[1]._id,
      amount: mathCourse.price,
      paymentMethod: "cash",
      status: "pending",
      note: "Payment due this week",
    }),
    upsertPayment({
      studentId: studentA._id,
      parentId: parentA._id,
      classId: englishClass._id,
      enrollmentId: enrollments[2]._id,
      amount: englishCourse.price,
      paymentMethod: "momo",
      status: "paid",
      paidAt: addDays(-4),
      note: "Paid through wallet",
    }),
    upsertPayment({
      studentId: studentC._id,
      parentId: parentB._id,
      classId: englishClass._id,
      enrollmentId: enrollments[3]._id,
      amount: englishCourse.price,
      paymentMethod: "bank_transfer",
      status: "pending",
      note: "Awaiting confirmation",
    }),
    upsertPayment({
      studentId: studentD._id,
      parentId: parentC._id,
      classId: codingClass._id,
      enrollmentId: enrollments[5]._id,
      amount: codingCourse.price,
      paymentMethod: "bank_transfer",
      status: "paid",
      paidAt: addDays(-8),
      note: "Paid in full",
    }),
    upsertPayment({
      studentId: studentE._id,
      parentId: parentC._id,
      classId: codingClass._id,
      enrollmentId: enrollments[6]._id,
      amount: codingCourse.price,
      paymentMethod: "zalopay",
      status: "paid",
      paidAt: addDays(-6),
      note: "Paid through wallet",
    }),
    upsertPayment({
      studentId: studentH._id,
      parentId: parentD._id,
      classId: codingClass._id,
      enrollmentId: enrollments[7]._id,
      amount: codingCourse.price,
      paymentMethod: "cash",
      status: "pending",
      note: "Installment pending",
    }),
    upsertPayment({
      studentId: studentD._id,
      parentId: parentC._id,
      classId: ieltsClass._id,
      enrollmentId: enrollments[8]._id,
      amount: examCourse.price,
      paymentMethod: "bank_transfer",
      status: "pending",
      note: "Awaiting transfer confirmation",
    }),
    upsertPayment({
      studentId: studentF._id,
      parentId: parentD._id,
      classId: ieltsClass._id,
      enrollmentId: enrollments[9]._id,
      amount: examCourse.price,
      paymentMethod: "momo",
      status: "paid",
      paidAt: addDays(-14),
      note: "Paid before first class",
    }),
    upsertPayment({
      studentId: studentG._id,
      parentId: parentD._id,
      classId: ieltsClass._id,
      enrollmentId: enrollments[10]._id,
      amount: examCourse.price,
      paymentMethod: "bank_transfer",
      status: "paid",
      paidAt: addDays(-12),
      note: "Paid in full",
    }),
    upsertPayment({
      studentId: studentG._id,
      parentId: parentD._id,
      classId: artClass._id,
      enrollmentId: enrollments[12]._id,
      amount: artCourse.price,
      paymentMethod: "cash",
      status: "pending",
      note: "Due on first session",
    }),
  ]);

  const onlineSessions = await Promise.all([
    upsertOnlineClassSession({
      scheduleId: schedules[4]._id, // englishClass live demo for today
      classId: englishClass._id,
      teacherId: teacherB._id,
      status: "live",
      openedAt: new Date(Date.now() - 5 * 60 * 1000),
      endedAt: null,
      participants: [
        {
          userId: teacherB._id,
          peerId: "teacher-live-demo",
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          micAllowed: true,
          handRaised: false,
          joinedAt: new Date(Date.now() - 5 * 60 * 1000),
          lastSeen: new Date(),
        },
        {
          userId: studentA._id,
          peerId: "student-live-anna",
          fullName: "Anna Smith",
          role: "student",
          micAllowed: false,
          handRaised: true,
          joinedAt: new Date(Date.now() - 4 * 60 * 1000),
          lastSeen: new Date(),
        },
        {
          userId: studentC._id,
          peerId: "student-live-liam",
          fullName: "Liam Garcia",
          role: "student",
          micAllowed: false,
          handRaised: false,
          joinedAt: new Date(Date.now() - 3 * 60 * 1000),
          lastSeen: new Date(),
        },
      ],
      messages: [
        {
          senderId: teacherB._id,
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          text: "Welcome to the live demo class. Please test camera, mic, chat, and hand raise.",
          createdAt: new Date(Date.now() - 4 * 60 * 1000),
        },
        {
          senderId: studentA._id,
          fullName: "Anna Smith",
          role: "student",
          text: "I can see the class and I raised my hand.",
          createdAt: new Date(Date.now() - 3 * 60 * 1000),
        },
        {
          senderId: studentC._id,
          fullName: "Liam Garcia",
          role: "student",
          text: "Chat is working for me.",
          createdAt: new Date(Date.now() - 2 * 60 * 1000),
        },
      ],
      signals: [],
    }),
    upsertOnlineClassSession({
      scheduleId: schedules[3]._id, // englishClass scheduled for addDays(1)
      classId: englishClass._id,
      teacherId: teacherB._id,
      status: "waiting",
      participants: [
        {
          userId: teacherB._id,
          peerId: "teacher-peer-1",
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          micAllowed: true,
          handRaised: false,
          joinedAt: new Date(),
          lastSeen: new Date(),
        },
        {
          userId: studentA._id,
          peerId: "student-peer-1",
          fullName: "Anna Smith",
          role: "student",
          micAllowed: false,
          handRaised: false,
          joinedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          lastSeen: new Date(),
        },
        {
          userId: studentC._id,
          peerId: "student-peer-2",
          fullName: "Liam Garcia",
          role: "student",
          micAllowed: false,
          handRaised: true,
          joinedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        },
      ],
      messages: [
        {
          senderId: teacherB._id,
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          text: "Welcome to today's English class! Please introduce yourselves.",
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          senderId: studentA._id,
          fullName: "Anna Smith",
          role: "student",
          text: "Hi everyone, I'm Anna. Excited for the lesson!",
          createdAt: new Date(Date.now() - 12 * 60 * 1000),
        },
        {
          senderId: studentC._id,
          fullName: "Liam Garcia",
          role: "student",
          text: "Hello, I'm Liam. Ready to learn!",
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      ],
      signals: [],
    }),
    upsertOnlineClassSession({
      scheduleId: schedules[9]._id, // ieltsClass scheduled for addDays(4)
      classId: ieltsClass._id,
      teacherId: teacherB._id,
      status: "ended",
      openedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      participants: [
        {
          userId: teacherB._id,
          peerId: "teacher-peer-2",
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          micAllowed: true,
          handRaised: false,
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          userId: studentD._id,
          peerId: "student-peer-3",
          fullName: "Mia Nguyen",
          role: "student",
          micAllowed: false,
          handRaised: false,
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
          lastSeen: new Date(Date.now() - 35 * 60 * 1000),
        },
        {
          userId: studentF._id,
          peerId: "student-peer-4",
          fullName: "Sophia Tran",
          role: "student",
          micAllowed: false,
          handRaised: false,
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000),
          lastSeen: new Date(Date.now() - 32 * 60 * 1000),
        },
        {
          userId: studentG._id,
          peerId: "student-peer-5",
          fullName: "Lucas Tran",
          role: "student",
          micAllowed: false,
          handRaised: false,
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 15 * 60 * 1000),
          lastSeen: new Date(Date.now() - 31 * 60 * 1000),
        },
      ],
      messages: [
        {
          senderId: teacherB._id,
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          text: "Good morning! Let's start with IELTS listening practice.",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000),
        },
        {
          senderId: studentF._id,
          fullName: "Sophia Tran",
          role: "student",
          text: "I'm having trouble with the audio. Can you repeat?",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
        {
          senderId: teacherB._id,
          fullName: "Mr. Daniel Lee",
          role: "teacher",
          text: "Sure, Sophia. Let me replay it.",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 32 * 60 * 1000),
        },
        {
          senderId: studentG._id,
          fullName: "Lucas Tran",
          role: "student",
          text: "Thanks for the help!",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45 * 60 * 1000),
        },
      ],
      signals: [],
    }),
  ]);

  console.log("Demo data seeded without creating any admin account.");
  console.log("Demo password for seeded non-admin users:", password);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
