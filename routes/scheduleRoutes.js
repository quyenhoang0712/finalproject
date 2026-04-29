const express = require("express");
const router = express.Router();

const Schedule = require("../models/Schedule");
const Class = require("../models/Class");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET all schedules
router.get("/", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const schedules = await Schedule.find().populate({
      path: "classId",
      populate: [
        { path: "courseId", select: "title" },
        { path: "teacherId", select: "fullName" },
      ],
    });

    res.status(200).json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET by id
router.get("/:id", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate({
      path: "classId",
      populate: [
        { path: "courseId", select: "title" },
        { path: "teacherId", select: "fullName" },
      ],
    });

    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy schedule" });
    }

    res.status(200).json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE schedule (admin)
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { classId, date, startTime, endTime, room, status, note } = req.body;

    if (!classId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    const newSchedule = new Schedule({
      classId,
      date,
      startTime,
      endTime,
      room,
      status,
      note,
    });

    const saved = await newSchedule.save();

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const updated = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy schedule" });
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deleted = await Schedule.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy schedule" });
    }

    res.status(200).json({ message: "Xóa thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
