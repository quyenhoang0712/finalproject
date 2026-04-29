const express = require("express");
const router = express.Router();

const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Class = require("../models/Class");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const canViewEnrollment = (enrollment, user) => {
  if (user.role === "admin") return true;
  if (String(enrollment.studentId?._id || enrollment.studentId) === String(user.userId)) return true;
  if (String(enrollment.parentId?._id || enrollment.parentId) === String(user.userId)) return true;
  return user.role === "teacher" && String(enrollment.classId?.teacherId?._id || enrollment.classId?.teacherId) === String(user.userId);
};

// GET enrollments
router.get("/", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    let query = Enrollment.find();

    if (req.user.role === "teacher") {
      const myClasses = await Class.find({ teacherId: req.user.userId }).select("_id");
      query = query.find({ classId: { $in: myClasses.map((item) => item._id) } });
    }

    const enrollments = await query
      .populate("studentId", "fullName email role avatar caption")
      .populate("parentId", "fullName email role avatar caption")
      .populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      });

    res.status(200).json(enrollments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET enrollment by id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("studentId", "fullName email role avatar caption")
      .populate("parentId", "fullName email role avatar caption")
      .populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      });

    if (!enrollment) {
      return res.status(404).json({ message: "Không tìm thấy enrollment" });
    }

    if (!canViewEnrollment(enrollment, req.user)) {
      return res.status(403).json({ message: "You do not have permission to view this enrollment" });
    }

    res.status(200).json(enrollment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE enrollment
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { studentId, classId, parentId, status, paymentStatus } = req.body;

    if (!studentId || !classId) {
      return res.status(400).json({ message: "Thiếu studentId hoặc classId" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy student" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "User được chọn không phải student" });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    if (parentId) {
      const parent = await User.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Không tìm thấy parent" });
      }

      if (parent.role !== "parent") {
        return res.status(400).json({ message: "User được chọn không phải parent" });
      }
    }

    const existingEnrollment = await Enrollment.findOne({ studentId, classId });
    if (existingEnrollment) {
      return res.status(400).json({ message: "Student đã đăng ký class này rồi" });
    }

    if (classItem.currentStudents >= classItem.capacity) {
      return res.status(400).json({ message: "Class đã đầy" });
    }

    const newEnrollment = new Enrollment({
      studentId,
      classId,
      parentId: parentId || null,
      status,
      paymentStatus,
    });

    const savedEnrollment = await newEnrollment.save();

    classItem.currentStudents += 1;
    await classItem.save();

    res.status(201).json(savedEnrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE enrollment
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { studentId, classId, parentId, status, paymentStatus } = req.body;

    if (studentId) {
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Không tìm thấy student" });
      }
      if (student.role !== "student") {
        return res.status(400).json({ message: "User được chọn không phải student" });
      }
    }

    if (classId) {
      const classItem = await Class.findById(classId);
      if (!classItem) {
        return res.status(404).json({ message: "Không tìm thấy class" });
      }
    }

    if (parentId) {
      const parent = await User.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Không tìm thấy parent" });
      }
      if (parent.role !== "parent") {
        return res.status(400).json({ message: "User được chọn không phải parent" });
      }
    }

    const updateData = {};
    if (studentId) updateData.studentId = studentId;
    if (classId) updateData.classId = classId;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("studentId", "fullName email role avatar caption")
      .populate("parentId", "fullName email role avatar caption")
      .populate({
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject mode" },
          { path: "teacherId", select: "fullName email role avatar caption" },
        ],
      });

    if (!updatedEnrollment) {
      return res.status(404).json({ message: "Không tìm thấy enrollment" });
    }

    res.status(200).json(updatedEnrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE enrollment
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deletedEnrollment = await Enrollment.findById(req.params.id);

    if (!deletedEnrollment) {
      return res.status(404).json({ message: "Không tìm thấy enrollment" });
    }

    const classItem = await Class.findById(deletedEnrollment.classId);
    if (classItem && classItem.currentStudents > 0) {
      classItem.currentStudents -= 1;
      await classItem.save();
    }

    await Enrollment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Xóa enrollment thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
