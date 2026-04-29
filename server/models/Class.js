const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    schedule: {
      type: String,
      required: true,
    },

    room: {
      type: String,
      default: "",
    },

    learningMode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "offline",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
      default: 30,
    },

    currentStudents: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);