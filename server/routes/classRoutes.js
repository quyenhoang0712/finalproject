const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const Course = require("../models/Course");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET all classes
router.get("/", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("courseId", "title subject mode")
      .populate("teacherId", "fullName email role avatar caption");

    res.status(200).json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET class by id
router.get("/:id", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate("courseId", "title subject mode")
      .populate("teacherId", "fullName email role avatar caption");

    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    res.status(200).json(classItem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id/roster", authMiddleware, roleMiddleware("teacher", "admin"), async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (req.user.role === "teacher" && String(classItem.teacherId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "You can only view rosters for your own classes." });
    }

    const enrollments = await Enrollment.find({
      classId: req.params.id,
      status: { $ne: "cancelled" },
    })
      .populate("studentId", "fullName email role avatar caption")
      .sort({ createdAt: 1 });

    res.status(200).json(enrollments.map((item) => item.studentId).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE class (admin only)
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const {
      className,
      courseId,
      teacherId,
      schedule,
      room,
      learningMode,
      startDate,
      endDate,
      capacity,
      status,
    } = req.body;

    if (
      !className ||
      !courseId ||
      !teacherId ||
      !schedule ||
      !startDate ||
      !endDate ||
      !capacity
    ) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Không tìm thấy course" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Không tìm thấy teacher" });
    }

    if (teacher.role !== "teacher") {
      return res.status(400).json({ message: "User được chọn không phải teacher" });
    }

    const newClass = new Class({
      className,
      courseId,
      teacherId,
      schedule,
      room,
      learningMode,
      startDate,
      endDate,
      capacity,
      status,
    });

    const savedClass = await newClass.save();

    res.status(201).json(savedClass);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE class (admin only)
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const {
      className,
      courseId,
      teacherId,
      schedule,
      room,
      learningMode,
      startDate,
      endDate,
      capacity,
      currentStudents,
      status,
    } = req.body;

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Không tìm thấy course" });
      }
    }

    if (teacherId) {
      const teacher = await User.findById(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Không tìm thấy teacher" });
      }

      if (teacher.role !== "teacher") {
        return res.status(400).json({ message: "User được chọn không phải teacher" });
      }
    }

    const updateData = {};
    if (className) updateData.className = className;
    if (courseId) updateData.courseId = courseId;
    if (teacherId) updateData.teacherId = teacherId;
    if (schedule) updateData.schedule = schedule;
    if (room !== undefined) updateData.room = room;
    if (learningMode) updateData.learningMode = learningMode;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (currentStudents !== undefined) updateData.currentStudents = currentStudents;
    if (status) updateData.status = status;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("courseId", "title subject mode")
      .populate("teacherId", "fullName email role avatar caption");

    if (!updatedClass) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    res.status(200).json(updatedClass);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE class (admin only)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    res.status(200).json({ message: "Xóa class thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
