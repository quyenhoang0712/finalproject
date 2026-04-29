const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "present",
    },

    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ scheduleId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);