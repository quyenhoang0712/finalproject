const express = require("express");
const router = express.Router();

const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");
const Feedback = require("../models/Feedback");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const answerValues = ["yes", "sometimes", "no"];

const feedbackPopulate = [
  {
    path: "classId",
    select: "className schedule",
    populate: [
      { path: "courseId", select: "title subject mode" },
      { path: "teacherId", select: "fullName email role avatar caption" },
    ],
  },
  { path: "courseId", select: "title subject mode" },
  { path: "teacherId", select: "fullName email role avatar caption" },
  { path: "studentId", select: "fullName email role avatar caption" },
  { path: "parentId", select: "fullName email role avatar caption" },
  { path: "authorId", select: "fullName email role avatar caption" },
];

const sanitizeAnswer = (value) => String(value || "").trim();

const validateAnswers = ({ punctuality, teachingClarity, contentFit, supportiveness }) =>
  [punctuality, teachingClarity, contentFit, supportiveness].every((value) => answerValues.includes(value));

const populateFeedback = (query) => query.populate(feedbackPopulate);

router.get("/mine", authMiddleware, roleMiddleware("student", "parent"), async (req, res) => {
  try {
    const filter =
      req.user.role === "student"
        ? { authorId: req.user.userId, authorRole: "student" }
        : { authorId: req.user.userId, authorRole: "parent" };

    const feedbacks = await populateFeedback(Feedback.find(filter).sort({ createdAt: -1 }));
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teacher", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const feedbacks = await populateFeedback(
      Feedback.find({ teacherId: req.user.userId }).sort({ createdAt: -1 })
    );
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authMiddleware, roleMiddleware("student", "parent"), async (req, res) => {
  try {
    const classId = String(req.body.classId || "").trim();
    const studentId = String(req.body.studentId || "").trim() || null;
    const answers = {
      punctuality: sanitizeAnswer(req.body.punctuality),
      teachingClarity: sanitizeAnswer(req.body.teachingClarity),
      contentFit: sanitizeAnswer(req.body.contentFit),
      supportiveness: sanitizeAnswer(req.body.supportiveness),
    };

    if (!classId || !validateAnswers(answers)) {
      return res.status(400).json({ message: "Please answer all feedback questions." });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Class not found." });
    }

    let enrollment;
    if (req.user.role === "student") {
      enrollment = await Enrollment.findOne({ classId, studentId: req.user.userId });
    } else {
      if (!studentId) {
        return res.status(400).json({ message: "Please choose a child for this feedback." });
      }
      enrollment = await Enrollment.findOne({ classId, studentId, parentId: req.user.userId });
    }

    if (!enrollment) {
      return res.status(403).json({ message: "You can only send feedback for enrolled classes." });
    }

    const feedback = new Feedback({
      ...answers,
      classId,
      courseId: classItem.courseId,
      teacherId: classItem.teacherId,
      studentId: req.user.role === "student" ? req.user.userId : studentId,
      parentId: req.user.role === "parent" ? req.user.userId : null,
      authorId: req.user.userId,
      authorRole: req.user.role,
      comment: String(req.body.comment || "").trim(),
    });

    const saved = await feedback.save();
    const populated = await populateFeedback(Feedback.findById(saved._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
