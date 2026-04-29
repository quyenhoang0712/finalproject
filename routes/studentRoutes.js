const express = require("express");
const router = express.Router();

const Enrollment = require("../models/Enrollment");
const Schedule = require("../models/Schedule");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/overview", authMiddleware, roleMiddleware("student"), async (req, res) => {
  try {
    const studentId = req.user.userId;

    const enrollments = await Enrollment.find({ studentId })
      .populate("parentId", "fullName email role avatar caption")
      .populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode price duration" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      });

    const classIds = enrollments
      .map((item) => item.classId?._id)
      .filter(Boolean);

    const [schedules, attendances, payments] = await Promise.all([
      Schedule.find({ classId: { $in: classIds } }).populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      }),
      Attendance.find({ studentId }).populate({
        path: "scheduleId",
        populate: {
          path: "classId",
          populate: [
            { path: "courseId", select: "title subject mode" },
            { path: "teacherId", select: "fullName email role avatar caption" },
          ],
        },
      }),
      Payment.find({ studentId }).populate({
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

router.get("/classes/:classId/roster", authMiddleware, roleMiddleware("student"), async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      studentId: req.user.userId,
      classId: req.params.classId,
      status: { $ne: "cancelled" },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You can only view classmates in your enrolled classes." });
    }

    const classmates = await Enrollment.find({
      classId: req.params.classId,
      status: { $ne: "cancelled" },
    })
      .populate("studentId", "fullName email role avatar caption")
      .sort({ createdAt: 1 });

    res.status(200).json(classmates.map((item) => item.studentId).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
