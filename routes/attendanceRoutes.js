const express = require("express");
const router = express.Router();

const Attendance = require("../models/Attendance");
const Schedule = require("../models/Schedule");
const Enrollment = require("../models/Enrollment");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const dateKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isTodaySchedule = (schedule) => dateKey(schedule?.date) === dateKey(new Date());

const canTeacherAccessSchedule = (schedule, user) => {
  if (user.role !== "teacher") return true;
  return String(schedule.classId.teacherId?._id || schedule.classId.teacherId) === String(user.userId);
};

const populatedAttendance = (id) =>
  Attendance.findById(id)
    .populate("studentId", "fullName email role avatar caption")
    .populate({
      path: "scheduleId",
      populate: {
        path: "classId",
        populate: [
          { path: "courseId", select: "title subject" },
          { path: "teacherId", select: "fullName email" },
        ],
      },
    });

// GET all attendances
router.get("/", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    let attendances = await Attendance.find()
      .populate("studentId", "fullName email role avatar caption")
      .populate({
        path: "scheduleId",
        populate: {
          path: "classId",
          populate: [
            { path: "courseId", select: "title subject" },
            { path: "teacherId", select: "fullName email" },
          ],
        },
      });
    if (req.user.role === "teacher") {
      attendances = attendances.filter((item) => item.scheduleId && canTeacherAccessSchedule(item.scheduleId, req.user));
    }

    res.status(200).json(attendances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET roster and attendance records by schedule
router.get("/schedule/:scheduleId/roster", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId).populate({
      path: "classId",
      populate: [
        { path: "courseId", select: "title subject" },
        { path: "teacherId", select: "fullName email role avatar caption" },
      ],
    });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (!canTeacherAccessSchedule(schedule, req.user)) {
      return res.status(403).json({ message: "You cannot manage attendance for this class" });
    }

    const [enrollments, attendances] = await Promise.all([
      Enrollment.find({
        classId: schedule.classId._id,
        status: { $in: ["pending", "approved"] },
      }).populate("studentId", "fullName email role avatar caption"),
      Attendance.find({ scheduleId: schedule._id }).populate("studentId", "fullName email role avatar caption"),
    ]);

    res.status(200).json({
      schedule,
      canEdit: req.user.role === "admin" || isTodaySchedule(schedule),
      students: enrollments.map((item) => item.studentId).filter(Boolean),
      attendances,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPSERT attendance by schedule and student
router.put("/schedule/:scheduleId/student/:studentId", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const { status, note } = req.body;
    if (status && !["present", "late", "absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status" });
    }

    const schedule = await Schedule.findById(req.params.scheduleId).populate("classId");
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (!canTeacherAccessSchedule(schedule, req.user)) {
      return res.status(403).json({ message: "You cannot update attendance for this class" });
    }

    if (req.user.role === "teacher" && !isTodaySchedule(schedule)) {
      return res.status(403).json({ message: "Teacher can only edit attendance on the scheduled day" });
    }

    const enrollment = await Enrollment.findOne({
      studentId: req.params.studentId,
      classId: schedule.classId._id,
      status: { $in: ["pending", "approved"] },
    });

    if (!enrollment) {
      return res.status(400).json({ message: "Student is not enrolled in this class" });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { scheduleId: schedule._id, studentId: req.params.studentId },
      {
        status: status || "present",
        note: String(note || "").trim(),
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(await populatedAttendance(attendance._id));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET attendance by id
router.get("/:id", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate("studentId", "fullName email role avatar caption")
      .populate({
        path: "scheduleId",
        populate: {
          path: "classId",
          populate: [
            { path: "courseId", select: "title subject" },
            { path: "teacherId", select: "fullName email" },
          ],
        },
      });

    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy attendance" });
    }

    if (!canTeacherAccessSchedule(attendance.scheduleId, req.user)) {
      return res.status(403).json({ message: "You cannot view attendance for this class" });
    }

    res.status(200).json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE attendance
router.post("/", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const { scheduleId, studentId, status, note } = req.body;

    if (!scheduleId || !studentId) {
      return res.status(400).json({ message: "Thiếu scheduleId hoặc studentId" });
    }

    const schedule = await Schedule.findById(scheduleId).populate("classId");
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy schedule" });
    }

    if (status && !["present", "late", "absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy student" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "User được chọn không phải student" });
    }

    const enrollment = await Enrollment.findOne({
      studentId,
      classId: schedule.classId._id,
      status: { $in: ["pending", "approved"] },
    });

    if (!enrollment) {
      return res.status(400).json({
        message: "Student chưa đăng ký class này, không thể điểm danh",
      });
    }

    const existingAttendance = await Attendance.findOne({ scheduleId, studentId });
    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance cho student này ở buổi học này đã tồn tại",
      });
    }

    if (req.user.role === "teacher") {
      const classTeacherId = String(schedule.classId.teacherId);
      if (String(req.user.userId) !== classTeacherId) {
        return res.status(403).json({
          message: "Bạn không có quyền điểm danh cho lớp này",
        });
      }
      if (!isTodaySchedule(schedule)) {
        return res.status(403).json({ message: "Teacher can only edit attendance on the scheduled day" });
      }
    }

    const newAttendance = new Attendance({
      scheduleId,
      studentId,
      status,
      note,
    });

    const savedAttendance = await newAttendance.save();

    res.status(201).json(savedAttendance);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE attendance
router.put("/:id", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate({
      path: "scheduleId",
      populate: {
        path: "classId",
      },
    });

    if (!attendance) {
      return res.status(404).json({ message: "Không tìm thấy attendance" });
    }

    if (req.user.role === "teacher") {
      const classTeacherId = String(attendance.scheduleId.classId.teacherId);
      if (String(req.user.userId) !== classTeacherId) {
        return res.status(403).json({
          message: "Bạn không có quyền cập nhật attendance của lớp này",
        });
      }
      if (!isTodaySchedule(attendance.scheduleId)) {
        return res.status(403).json({ message: "Teacher can only edit attendance on the scheduled day" });
      }
    }

    const { status, note } = req.body;

    if (status && !["present", "late", "absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid attendance status" });
    }

    if (status) attendance.status = status;
    if (note !== undefined) attendance.note = note;

    await attendance.save();

    const updatedAttendance = await Attendance.findById(req.params.id)
      .populate("studentId", "fullName email role avatar caption")
      .populate({
        path: "scheduleId",
        populate: {
          path: "classId",
          populate: [
            { path: "courseId", select: "title subject" },
            { path: "teacherId", select: "fullName email" },
          ],
        },
      });

    res.status(200).json(updatedAttendance);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE attendance
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deletedAttendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!deletedAttendance) {
      return res.status(404).json({ message: "Không tìm thấy attendance" });
    }

    res.status(200).json({ message: "Xóa attendance thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance by schedule
router.get("/schedule/:scheduleId", authMiddleware, roleMiddleware("admin", "teacher"), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId).populate("classId");
    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy schedule" });
    }

    if (req.user.role === "teacher") {
      const classTeacherId = String(schedule.classId.teacherId);
      if (String(req.user.userId) !== classTeacherId) {
        return res.status(403).json({
          message: "Bạn không có quyền xem attendance của lớp này",
        });
      }
    }

    const attendances = await Attendance.find({ scheduleId: req.params.scheduleId })
      .populate("studentId", "fullName email role avatar caption");

    res.status(200).json(attendances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
