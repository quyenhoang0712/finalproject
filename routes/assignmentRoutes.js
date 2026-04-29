const express = require("express");
const router = express.Router();

const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const assignmentPopulate = [
  { path: "courseId", select: "title subject mode" },
  { path: "createdBy", select: "fullName email role avatar caption" },
  {
    path: "classId",
    populate: [
      { path: "courseId", select: "title subject mode" },
      { path: "teacherId", select: "fullName email role avatar caption" },
    ],
  },
];

const parseDueDate = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const [year, month, day] = raw.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);
  if (Number.isNaN(dueDate.getTime())) return null;
  if (dueDate.getFullYear() !== year || dueDate.getMonth() !== month - 1 || dueDate.getDate() !== day) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(today);
  latest.setFullYear(latest.getFullYear() + 5);

  if (dueDate < today || dueDate > latest) return null;
  return dueDate;
};

const attachSubmissions = async (assignments, studentId = null) => {
  const assignmentIds = assignments.map((item) => item._id);
  const filter = { assignmentId: { $in: assignmentIds } };
  if (studentId) filter.studentId = studentId;

  const submissions = await AssignmentSubmission.find(filter).populate("studentId", "fullName email role avatar caption");
  const byAssignment = new Map();

  submissions.forEach((submission) => {
    const key = String(submission.assignmentId);
    if (!byAssignment.has(key)) byAssignment.set(key, []);
    byAssignment.get(key).push(submission);
  });

  return assignments.map((assignment) => {
    const item = assignment.toObject();
    const records = byAssignment.get(String(assignment._id)) || [];
    item.submissions = records;
    item.submission = studentId ? records[0] || null : null;
    return item;
  });
};

router.get("/student", authMiddleware, roleMiddleware("student"), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      studentId: req.user.userId,
      status: { $ne: "cancelled" },
    }).select("classId");
    const classIds = enrollments.map((item) => item.classId).filter(Boolean);

    const assignments = await Assignment.find({
      classId: { $in: classIds },
      status: "active",
    })
      .populate(assignmentPopulate)
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json(await attachSubmissions(assignments, req.user.userId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teacher", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const assignments = await Assignment.find({ createdBy: req.user.userId })
      .populate(assignmentPopulate)
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json(await attachSubmissions(assignments));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/parent", authMiddleware, roleMiddleware("parent"), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      parentId: req.user.userId,
      status: { $ne: "cancelled" },
    }).select("studentId classId");
    const classIds = enrollments.map((item) => item.classId).filter(Boolean);
    const studentIds = new Set(enrollments.map((item) => String(item.studentId)).filter(Boolean));

    const assignments = await Assignment.find({
      classId: { $in: classIds },
      status: "active",
    })
      .populate(assignmentPopulate)
      .sort({ dueDate: 1, createdAt: -1 });

    const assignmentIds = assignments.map((item) => item._id);
    const submissions = await AssignmentSubmission.find({
      assignmentId: { $in: assignmentIds },
      studentId: { $in: [...studentIds] },
    }).populate("studentId", "fullName email role avatar caption");

    const byAssignment = new Map();
    submissions.forEach((submission) => {
      const key = String(submission.assignmentId);
      if (!byAssignment.has(key)) byAssignment.set(key, []);
      byAssignment.get(key).push(submission);
    });

    res.status(200).json(
      assignments.map((assignment) => ({
        ...assignment.toObject(),
        submissions: byAssignment.get(String(assignment._id)) || [],
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const { title, description, classId, dueDate, maxScore, fileName, fileType, fileSize, fileData } = req.body;

    if (!title || !classId || !dueDate) {
      return res.status(400).json({ message: "Title, class, and due date are required" });
    }

    const parsedDueDate = parseDueDate(dueDate);
    if (!parsedDueDate) {
      return res.status(400).json({ message: "Due date must be a valid future date within 5 years" });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (String(classItem.teacherId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "You can only create assignments for your own classes" });
    }

    const assignment = await Assignment.create({
      title,
      description,
      classId,
      courseId: classItem.courseId,
      createdBy: req.user.userId,
      dueDate: parsedDueDate,
      maxScore: maxScore === undefined ? 100 : Number(maxScore),
      fileName: fileName || "",
      fileType: fileType || "",
      fileSize: Number(fileSize || 0),
      fileData: fileData || "",
    });

    const populated = await Assignment.findById(assignment._id).populate(assignmentPopulate);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: req.user.userId });
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    await AssignmentSubmission.deleteMany({ assignmentId: assignment._id });
    await Assignment.findByIdAndDelete(assignment._id);

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/submit", authMiddleware, roleMiddleware("student"), async (req, res) => {
  try {
    const { fileName, fileType, fileSize, fileData } = req.body;
    const content = String(req.body.content || "").trim();

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || assignment.status !== "active") {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const enrollment = await Enrollment.findOne({
      studentId: req.user.userId,
      classId: assignment.classId,
      status: { $ne: "cancelled" },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this assignment class" });
    }

    if (!content && !fileData) {
      return res.status(400).json({ message: "Please attach a file or add a note before submitting" });
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignmentId: assignment._id, studentId: req.user.userId },
      {
        content,
        fileName: fileName || "",
        fileType: fileType || "",
        fileSize: Number(fileSize || 0),
        fileData: fileData || "",
        status: "submitted",
        submittedAt: new Date(),
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("studentId", "fullName email role avatar caption");

    res.status(200).json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:assignmentId/submissions/:submissionId/grade", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.assignmentId, createdBy: req.user.userId });
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const score = Number(req.body.score);
    if (Number.isNaN(score) || score < 0 || score > Number(assignment.maxScore || 100)) {
      return res.status(400).json({ message: "Score must be within the assignment max score" });
    }

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { _id: req.params.submissionId, assignmentId: assignment._id },
      {
        score,
        feedback: String(req.body.feedback || "").trim(),
        status: "graded",
      },
      { new: true, runValidators: true }
    ).populate("studentId", "fullName email role avatar caption");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.status(200).json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
