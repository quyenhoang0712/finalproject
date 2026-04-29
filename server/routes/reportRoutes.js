const express = require("express");
const router = express.Router();

const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const Class = require("../models/Class");
const Course = require("../models/Course");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET revenue report by month
router.get("/revenue", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const revenueByMonth = await Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          totalRevenue: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalRevenue: 1,
          totalPayments: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.status(200).json(revenueByMonth);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET payment report by status
router.get("/payments", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          totalCount: 1,
          totalAmount: 1,
        },
      },
    ]);

    res.status(200).json(paymentStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance report by status
router.get("/attendance", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const attendanceStats = await Attendance.aggregate([
      {
        $group: {
          _id: "$status",
          totalCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          totalCount: 1,
        },
      },
    ]);

    res.status(200).json(attendanceStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET students by class
router.get("/students-by-class", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const studentsByClass = await Enrollment.aggregate([
      {
        $group: {
          _id: "$classId",
          totalStudents: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "_id",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      {
        $unwind: {
          path: "$classInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "classInfo.courseId",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      {
        $unwind: {
          path: "$courseInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          classId: "$_id",
          className: "$classInfo.name",
          courseTitle: "$courseInfo.title",
          totalStudents: 1,
        },
      },
      { $sort: { totalStudents: -1 } },
    ]);

    res.status(200).json(studentsByClass);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET overview report
router.get("/overview", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const [revenueByMonth, paymentStats, attendanceStats, studentsByClass] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: {
              year: { $year: "$paidAt" },
              month: { $month: "$paidAt" },
            },
            totalRevenue: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            year: "$_id.year",
            month: "$_id.month",
            totalRevenue: 1,
          },
        },
        { $sort: { year: 1, month: 1 } },
      ]),

      Payment.aggregate([
        {
          $group: {
            _id: "$status",
            totalCount: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            totalCount: 1,
            totalAmount: 1,
          },
        },
      ]),

      Attendance.aggregate([
        {
          $group: {
            _id: "$status",
            totalCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            totalCount: 1,
          },
        },
      ]),

      Enrollment.aggregate([
        {
          $group: {
            _id: "$classId",
            totalStudents: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "classes",
            localField: "_id",
            foreignField: "_id",
            as: "classInfo",
          },
        },
        {
          $unwind: {
            path: "$classInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "classInfo.courseId",
            foreignField: "_id",
            as: "courseInfo",
          },
        },
        {
          $unwind: {
            path: "$courseInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            classId: "$_id",
            className: "$classInfo.name",
            courseTitle: "$courseInfo.title",
            totalStudents: 1,
          },
        },
        { $sort: { totalStudents: -1 } },
      ]),
    ]);

    res.status(200).json({
      revenueByMonth,
      paymentStats,
      attendanceStats,
      studentsByClass,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;