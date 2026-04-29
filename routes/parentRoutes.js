const express = require("express");
const router = express.Router();

const Enrollment = require("../models/Enrollment");
const Schedule = require("../models/Schedule");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/overview", authMiddleware, roleMiddleware("parent"), async (req, res) => {
  try {
    const parentId = req.user.userId;

    const enrollments = await Enrollment.find({ parentId })
      .populate("studentId", "fullName email role avatar caption")
      .populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode price duration" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      });

    const classIds = enrollments.map((item) => item.classId?._id).filter(Boolean);
    const studentIds = enrollments.map((item) => item.studentId?._id).filter(Boolean);

    const [schedules, attendances, payments] = await Promise.all([
      Schedule.find({ classId: { $in: classIds } }).populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      }),
      Attendance.find({ studentId: { $in: studentIds } })
        .populate("studentId", "fullName email role avatar caption")
        .populate({
          path: "scheduleId",
          populate: {
            path: "classId",
            populate: [
              { path: "courseId", select: "title subject mode" },
              { path: "teacherId", select: "fullName email role avatar caption" },
            ],
          },
        }),
      Payment.find({ parentId }).populate("studentId", "fullName email role avatar caption").populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      }),
    ]);

    res.status(200).json({
      enrollments,
      schedules,
      attendances,
      payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
