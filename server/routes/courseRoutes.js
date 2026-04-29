const express = require("express");
const router = express.Router();
const Course = require("../models/Course");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET all courses (ai cũng xem được)
router.get("/", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET course by id
router.get("/:id", authMiddleware, roleMiddleware("admin", "teacher", "student", "parent"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Không tìm thấy course" });
    }

    res.status(200).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE course (admin only)
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { title, description, subject, price, duration, mode } = req.body;

    if (!title || !subject || !price) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    const newCourse = new Course({
      title,
      description,
      subject,
      price,
      duration,
      mode,
    });

    const savedCourse = await newCourse.save();

    res.status(201).json(savedCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE course (admin only)
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Không tìm thấy course" });
    }

    res.status(200).json(updatedCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE course (admin only)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
      return res.status(404).json({ message: "Không tìm thấy course" });
    }

    res.status(200).json({ message: "Xóa course thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
