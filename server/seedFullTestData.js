const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Assignment = require("./models/Assignment");
const AssignmentSubmission = require("./models/AssignmentSubmission");
const Class = require("./models/Class");
const Course = require("./models/Course");
const Enrollment = require("./models/Enrollment");
const Feedback = require("./models/Feedback");
const Material = require("./models/Material");
const OnlineClassSession = require("./models/OnlineClassSession");
const Payment = require("./models/Payment");
const Schedule = require("./models/Schedule");
const User = require("./models/User");

const password = "Test@123456";
const emails = {
  admin: "admin.test1530@gmail.com",
  teacher: "teacher.test1530@gmail.com",
  student: "student.test1530@gmail.com",
  parent: "parent.test1530@gmail.com",
};

const todayAtMidnight = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (baseDate, days) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
};

const upsertUser = async ({ fullName, email, role }) => {
  const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
  return User.findOneAndUpdate(
    { email },
    {
      fullName,
      email,
      role,
      password: hashedPassword,
      avatar: "",
      caption: "Test account for full project demo.",
    },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const upsertById = async (Model, filter, data) =>
  Model.findOneAndUpdate(filter, data, {
    returnDocument: "after",
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const today = todayAtMidnight();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const [admin, teacher, student, parent] = await Promise.all([
    upsertUser({ fullName: "Test 15:30 Admin", email: emails.admin, role: "admin" }),
    upsertUser({ fullName: "Test 15:30 Teacher", email: emails.teacher, role: "teacher" }),
    upsertUser({ fullName: "Test 15:30 Student", email: emails.student, role: "student" }),
    upsertUser({ fullName: "Test 15:30 Parent", email: emails.parent, role: "parent" }),
  ]);

  const course = await upsertById(
    Course,
    { title: "TEST 15:30 Full Flow Course" },
    {
      title: "TEST 15:30 Full Flow Course",
      subject: "Full Project Testing",
      description: "Course created for testing all main project flows.",
      price: 1500000,
      duration: "4 weeks",
      mode: "hybrid",
      isActive: true,
    }
  );

  const classItem = await upsertById(
    Class,
    { className: "TEST-1530-FULL-FLOW" },
    {
      className: "TEST-1530-FULL-FLOW",
      courseId: course._id,
      teacherId: teacher._id,
      schedule: "Today 15:30 - 16:30",
      room: "Online Test Room",
      learningMode: "hybrid",
      startDate: yesterday,
      endDate: addDays(today, 30),
      capacity: 12,
      currentStudents: 1,
      status: "ongoing",
    }
  );

  const enrollment = await upsertById(
    Enrollment,
    { studentId: student._id, classId: classItem._id },
    {
      studentId: student._id,
      parentId: parent._id,
      classId: classItem._id,
      enrollDate: today,
      status: "approved",
      paymentStatus: "unpaid",
    }
  );

  const liveSchedule = await upsertById(
    Schedule,
    { classId: classItem._id, date: today, startTime: "15:30" },
    {
      classId: classItem._id,
      date: today,
      startTime: "15:30",
      endTime: "16:30",
      room: "Online Test Room",
      status: "scheduled",
      note: "TEST 15:30 online class - teacher can open this at 15:15-17:30.",
    }
  );

  const historySchedule = await upsertById(
    Schedule,
    { classId: classItem._id, date: yesterday, startTime: "14:00" },
    {
      classId: classItem._id,
      date: yesterday,
      startTime: "14:00",
      endTime: "15:00",
      room: "Room History",
      status: "completed",
      note: "TEST previous class for attendance display.",
    }
  );

  await upsertById(
    Payment,
    { enrollmentId: enrollment._id },
    {
      studentId: student._id,
      parentId: parent._id,
      classId: classItem._id,
      enrollmentId: enrollment._id,
      amount: course.price,
      paymentMethod: "bank_transfer",
      status: "pending",
      paidAt: null,
      bankTransferCode: `ML-${String(enrollment._id).slice(-8).toUpperCase()}`,
      bankTransferRequestedAt: new Date(),
      note: "TEST pending payment for parent bank transfer and admin confirmation.",
    }
  );

  await upsertById(
    OnlineClassSession,
    { scheduleId: liveSchedule._id },
    {
      scheduleId: liveSchedule._id,
      classId: classItem._id,
      teacherId: teacher._id,
      status: "waiting",
      openedAt: null,
      endedAt: null,
      participants: [],
      messages: [],
      signals: [],
    }
  );

  await upsertById(
    Assignment,
    { title: "TEST 15:30 Submit Homework", classId: classItem._id },
    {
      title: "TEST 15:30 Submit Homework",
      description: "Student can submit this assignment during testing.",
      classId: classItem._id,
      courseId: course._id,
      createdBy: teacher._id,
      dueDate: tomorrow,
      maxScore: 100,
      fileName: "test-homework.txt",
      fileType: "text/plain",
      fileSize: 30,
      fileData: "data:text/plain;base64,VEVTVCBob21ld29yayBmaWxl",
      status: "active",
    }
  );

  const submittedAssignment = await upsertById(
    Assignment,
    { title: "TEST 15:30 Grade Homework", classId: classItem._id },
    {
      title: "TEST 15:30 Grade Homework",
      description: "Teacher can grade this submitted assignment.",
      classId: classItem._id,
      courseId: course._id,
      createdBy: teacher._id,
      dueDate: tomorrow,
      maxScore: 100,
      fileName: "",
      fileType: "",
      fileSize: 0,
      fileData: "",
      status: "active",
    }
  );

  await upsertById(
    AssignmentSubmission,
    { assignmentId: submittedAssignment._id, studentId: student._id },
    {
      assignmentId: submittedAssignment._id,
      studentId: student._id,
      content: "This is a test submission waiting for teacher grading.",
      fileName: "student-answer.txt",
      fileType: "text/plain",
      fileSize: 42,
      fileData: "data:text/plain;base64,U3R1ZGVudCB0ZXN0IGFuc3dlcg==",
      status: "submitted",
      score: null,
      feedback: "",
      submittedAt: new Date(),
    }
  );

  await upsertById(
    Material,
    { title: "TEST 15:30 Study Material", classId: classItem._id },
    {
      title: "TEST 15:30 Study Material",
      description: "Material for testing student download.",
      classId: classItem._id,
      courseId: course._id,
      createdBy: teacher._id,
      fileName: "test-material.txt",
      fileType: "text/plain",
      fileSize: 36,
      fileData: "data:text/plain;base64,VGhpcyBpcyBhIHRlc3QgbWF0ZXJpYWw=",
      status: "active",
    }
  );

  await upsertById(
    Feedback,
    { classId: classItem._id, authorId: student._id, authorRole: "student" },
    {
      classId: classItem._id,
      courseId: course._id,
      teacherId: teacher._id,
      studentId: student._id,
      parentId: null,
      authorId: student._id,
      authorRole: "student",
      punctuality: "yes",
      teachingClarity: "yes",
      contentFit: "sometimes",
      supportiveness: "yes",
      comment: "TEST feedback from student.",
    }
  );

  await upsertById(
    Feedback,
    { classId: classItem._id, authorId: parent._id, authorRole: "parent" },
    {
      classId: classItem._id,
      courseId: course._id,
      teacherId: teacher._id,
      studentId: student._id,
      parentId: parent._id,
      authorId: parent._id,
      authorRole: "parent",
      punctuality: "yes",
      teachingClarity: "sometimes",
      contentFit: "yes",
      supportiveness: "yes",
      comment: "TEST feedback from parent.",
    }
  );

  console.log("Full test data ready.");
  console.log(`Date: ${today.toLocaleDateString("en-CA")}`);
  console.log("Online class: TEST-1530-FULL-FLOW at 15:30 - 16:30");
  console.log(`Password for all test accounts: ${password}`);
  console.log(`Admin:   ${emails.admin}`);
  console.log(`Teacher: ${emails.teacher}`);
  console.log(`Student: ${emails.student}`);
  console.log(`Parent:  ${emails.parent}`);

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
