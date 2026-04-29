const express = require("express");
const router = express.Router();

const Payment = require("../models/Payment");
const User = require("../models/User");
const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const canAccessPayment = (payment, user) =>
  user.role === "admin" ||
  String(payment.parentId?._id || payment.parentId || "") === String(user.userId) ||
  String(payment.studentId?._id || payment.studentId || "") === String(user.userId);

const populatePayment = (query) =>
  query
    .populate("studentId", "fullName email role avatar caption")
    .populate("parentId", "fullName email role avatar caption")
    .populate({
      path: "classId",
      populate: [
        { path: "courseId", select: "title subject mode" },
        { path: "teacherId", select: "fullName email role avatar caption" },
      ],
    })
    .populate("enrollmentId");

const transferCodeFor = (payment) => {
  const source = String(payment._id).slice(-8).toUpperCase();
  return `ML-${source}`;
};

// GET all payments (admin only)
router.get("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const payments = await populatePayment(Payment.find());

    res.status(200).json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET payment by id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const payment = await populatePayment(Payment.findById(req.params.id));

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy payment" });
    }

    if (!canAccessPayment(payment, req.user)) {
      return res.status(403).json({ message: "You do not have permission to view this payment" });
    }

    res.status(200).json(payment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REQUEST bank transfer details (parent/student can request their own payment)
router.post("/:id/bank-transfer", authMiddleware, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (!canAccessPayment(payment, req.user)) {
      return res.status(403).json({ message: "You do not have permission to view this payment" });
    }

    if (!payment.bankTransferCode) {
      payment.bankTransferCode = transferCodeFor(payment);
    }
    payment.bankTransferRequestedAt = new Date();
    payment.paymentMethod = "bank_transfer";
    await payment.save();

    const updatedPayment = await populatePayment(Payment.findById(payment._id));
    res.status(200).json(updatedPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// CREATE payment
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const {
      studentId,
      parentId,
      classId,
      enrollmentId,
      amount,
      paymentMethod,
      status,
      paidAt,
      note,
    } = req.body;

    if (!studentId || !classId || !enrollmentId || !amount) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy student" });
    }
    if (student.role !== "student") {
      return res.status(400).json({ message: "User được chọn không phải student" });
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

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Không tìm thấy enrollment" });
    }

    if (String(enrollment.studentId) !== String(studentId)) {
      return res.status(400).json({ message: "Enrollment không thuộc student này" });
    }

    if (String(enrollment.classId) !== String(classId)) {
      return res.status(400).json({ message: "Enrollment không thuộc class này" });
    }

    const newPayment = new Payment({
      studentId,
      parentId: parentId || null,
      classId,
      enrollmentId,
      amount,
      paymentMethod,
      status,
      paidAt,
      note,
    });

    const savedPayment = await newPayment.save();

    if (status === "paid") {
      enrollment.paymentStatus = "paid";
      await enrollment.save();
    }

    res.status(201).json(savedPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE payment (admin only)
router.put("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      status,
      paidAt,
      note,
    } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy payment" });
    }

    if (amount !== undefined) payment.amount = amount;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (status) payment.status = status;
    if (paidAt !== undefined) payment.paidAt = paidAt;
    if (note !== undefined) payment.note = note;

    await payment.save();

    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (enrollment) {
      if (payment.status === "paid") {
        enrollment.paymentStatus = "paid";
      } else {
        enrollment.paymentStatus = "unpaid";
      }
      await enrollment.save();
    }

    const updatedPayment = await populatePayment(Payment.findById(req.params.id));

    res.status(200).json(updatedPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE payment (admin only)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy payment" });
    }

    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (enrollment) {
      enrollment.paymentStatus = "unpaid";
      await enrollment.save();
    }

    await Payment.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Xóa payment thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
