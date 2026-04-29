const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    peerId: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["student", "teacher", "parent"],
      required: true,
    },
    micAllowed: {
      type: Boolean,
      default: false,
    },
    handRaised: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["student", "teacher", "parent"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const signalSchema = new mongoose.Schema(
  {
    fromPeerId: {
      type: String,
      required: true,
    },
    toPeerId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["offer", "answer", "candidate"],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const onlineClassSessionSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["waiting", "live", "ended"],
      default: "waiting",
    },
    openedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    signals: {
      type: [signalSchema],
      default: [],
    },
  },
  { timestamps: true }
);

onlineClassSessionSchema.index({ scheduleId: 1 }, { unique: true });

module.exports = mongoose.model("OnlineClassSession", onlineClassSessionSchema);
