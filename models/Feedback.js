const mongoose = require("mongoose");

const answerValues = ["yes", "sometimes", "no"];

const feedbackSchema = new mongoose.Schema(
  {
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["student", "parent"],
      required: true,
    },
    punctuality: {
      type: String,
      enum: answerValues,
      required: true,
    },
    teachingClarity: {
      type: String,
      enum: answerValues,
      required: true,
    },
    contentFit: {
      type: String,
      enum: answerValues,
      required: true,
    },
    supportiveness: {
      type: String,
      enum: answerValues,
      required: true,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ classId: 1, authorId: 1, authorRole: 1 });
feedbackSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
