const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Course = require("../models/Course");
const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");
const Schedule = require("../models/Schedule");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET dashboard summary (admin only)
router.get("/summary", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalClasses,
      totalEnrollments,
      totalSchedules,
      totalAttendances,
      totalPayments,
      paidPayments,
      pendingPayments,
      failedPayments,
      paidRevenueResult,
      studentCount,
      teacherCount,
      parentCount,
      adminCount,
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Class.countDocuments(),
      Enrollment.countDocuments(),
      Schedule.countDocuments(),
      Attendance.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({ status: "paid" }),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "failed" }),
      Payment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "parent" }),
      User.countDocuments({ role: "admin" }),
    ]);

    const totalRevenue = paidRevenueResult.length > 0 ? paidRevenueResult[0].totalRevenue : 0;

    res.status(200).json({
      totalUsers,
      totalCourses,
      totalClasses,
      totalEnrollments,
      totalSchedules,
      totalAttendances,
      totalPayments,
      totalRevenue,
      usersByRole: {
        admin: adminCount,
        teacher: teacherCount,
        student: studentCount,
        parent: parentCount,
      },
      paymentsByStatus: {
        paid: paidPayments,
        pending: pendingPayments,
        failed: failedPayments,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;