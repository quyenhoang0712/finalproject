const express = require("express");
const router = express.Router();

const Enrollment = require("../models/Enrollment");
const User = require("../models/User");
const Class = require("../models/Class");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const isActiveEnrollment = (status) => status !== "cancelled";

const populateEnrollment = (query) =>
  query
    .populate("studentId", "fullName email role avatar caption")
    .populate("parentId", "fullName email role avatar caption")
    .populate({
      path: "classId",
      populate: [
        { path: "courseId", select: "title subject mode" },
        { path: "teacherId", select: "fullName email role avatar caption" },
      ],
    });

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

    const enrollments = await populateEnrollment(query);
    res.status(200).json(enrollments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET enrollment by id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const enrollment = await populateEnrollment(Enrollment.findById(req.params.id));

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
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
      return res.status(400).json({ message: "studentId and classId are required" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "Selected user is not a student" });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (parentId) {
      const parent = await User.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Parent not found" });
      }

      if (parent.role !== "parent") {
        return res.status(400).json({ message: "Selected user is not a parent" });
      }
    }

    const existingEnrollment = await Enrollment.findOne({ studentId, classId });
    if (existingEnrollment) {
      return res.status(400).json({ message: "Student is already enrolled in this class" });
    }

    const nextStatus = status || "pending";
    if (isActiveEnrollment(nextStatus) && classItem.currentStudents >= classItem.capacity) {
      return res.status(400).json({ message: "Class is full" });
    }

    const newEnrollment = new Enrollment({
      studentId,
      classId,
      parentId: parentId || null,
      status,
      paymentStatus,
    });

    const savedEnrollment = await newEnrollment.save();

    if (isActiveEnrollment(nextStatus)) {
      classItem.currentStudents += 1;
      await classItem.save();
    }

    res.status(201).json(savedEnrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE enrollment
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { studentId, classId, parentId, status, paymentStatus } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (studentId) {
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      if (student.role !== "student") {
        return res.status(400).json({ message: "Selected user is not a student" });
      }
    }

    if (parentId) {
      const parent = await User.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Parent not found" });
      }
      if (parent.role !== "parent") {
        return res.status(400).json({ message: "Selected user is not a parent" });
      }
    }

    const nextStudentId = studentId || enrollment.studentId;
    const nextClassId = classId || enrollment.classId;
    const nextStatus = status || enrollment.status;
    const oldClassId = String(enrollment.classId);
    const newClassId = String(nextClassId);
    const wasActive = isActiveEnrollment(enrollment.status);
    const willBeActive = isActiveEnrollment(nextStatus);

    let targetClass = null;
    if (classId || (willBeActive && (!wasActive || oldClassId !== newClassId))) {
      targetClass = await Class.findById(nextClassId);
      if (!targetClass) {
        return res.status(404).json({ message: "Class not found" });
      }
    }

    const existingEnrollment = await Enrollment.findOne({
      _id: { $ne: enrollment._id },
      studentId: nextStudentId,
      classId: nextClassId,
    });
    if (existingEnrollment) {
      return res.status(400).json({ message: "Student is already enrolled in this class" });
    }

    if (willBeActive && (!wasActive || oldClassId !== newClassId)) {
      const classToIncrement = targetClass || await Class.findById(nextClassId);
      if (!classToIncrement) {
        return res.status(404).json({ message: "Class not found" });
      }
      if (classToIncrement.currentStudents >= classToIncrement.capacity) {
        return res.status(400).json({ message: "Class is full" });
      }
    }

    if (studentId) enrollment.studentId = studentId;
    if (classId) enrollment.classId = classId;
    if (parentId !== undefined) enrollment.parentId = parentId || null;
    if (status) enrollment.status = status;
    if (paymentStatus) enrollment.paymentStatus = paymentStatus;

    await enrollment.save();

    if (wasActive && (!willBeActive || oldClassId !== newClassId)) {
      const oldClass = await Class.findById(oldClassId);
      if (oldClass && oldClass.currentStudents > 0) {
        oldClass.currentStudents -= 1;
        await oldClass.save();
      }
    }

    if (willBeActive && (!wasActive || oldClassId !== newClassId)) {
      const classToIncrement = targetClass || await Class.findById(nextClassId);
      if (classToIncrement) {
        classToIncrement.currentStudents += 1;
        await classToIncrement.save();
      }
    }

    const updatedEnrollment = await populateEnrollment(Enrollment.findById(req.params.id));
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
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (isActiveEnrollment(deletedEnrollment.status)) {
      const classItem = await Class.findById(deletedEnrollment.classId);
      if (classItem && classItem.currentStudents > 0) {
        classItem.currentStudents -= 1;
        await classItem.save();
      }
    }

    await Enrollment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Enrollment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
