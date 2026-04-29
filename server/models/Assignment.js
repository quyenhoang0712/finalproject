const mongoose = require("mongoose");
const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    maxScore: {
      type: Number,
      default: 100,
      min: 0,
    },

    fileName: {
      type: String,
      default: "",
      trim: true,
    },

    fileType: {
      type: String,
      default: "",
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    fileData: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
