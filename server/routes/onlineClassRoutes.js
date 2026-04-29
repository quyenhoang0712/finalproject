const express = require("express");
const router = express.Router();

const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");
const OnlineClassSession = require("../models/OnlineClassSession");
const Schedule = require("../models/Schedule");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const schedulePopulate = {
  path: "classId",
  populate: [
    { path: "courseId", select: "title subject mode" },
    { path: "teacherId", select: "fullName email role avatar caption" },
  ],
};

const onlinePopulate = [
  { path: "scheduleId", populate: schedulePopulate },
  { path: "classId", populate: [{ path: "courseId", select: "title subject mode" }, { path: "teacherId", select: "fullName email role avatar caption" }] },
  { path: "teacherId", select: "fullName email role avatar caption" },
];

const timeToMinutes = (value = "00:00") => {
  const [hours, minutes] = String(value).split(":").map((part) => Number(part));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isClassTime = (schedule, now = new Date()) => {
  if (!schedule || dateKey(schedule.date) !== dateKey(now)) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(schedule.startTime) - 15;
  const end = timeToMinutes(schedule.endTime) + 60;
  return current >= start && current <= end;
};

const endStaleLiveSession = async (session) => {
  if (!session || session.status !== "live") return session;
  session.status = "ended";
  session.endedAt = new Date();
  session.participants = [];
  session.signals = [];
  await session.save();
  return session;
};

const canAccessSchedule = async (schedule, user) => {
  const classItem = schedule.classId;
  const classId = classItem?._id || schedule.classId;

  if (user.role === "teacher") {
    return String(classItem?.teacherId?._id || classItem?.teacherId) === String(user.userId);
  }

  if (user.role === "student") {
    return Boolean(
      await Enrollment.findOne({
        studentId: user.userId,
        classId,
        status: { $ne: "cancelled" },
      })
    );
  }

  if (user.role === "parent") {
    return Boolean(
      await Enrollment.findOne({
        parentId: user.userId,
        classId,
        status: { $ne: "cancelled" },
      })
    );
  }

  return false;
};

const getSessionView = async (session) => {
  const populated = await OnlineClassSession.findById(session._id).populate(onlinePopulate);
  return populated.toObject();
};

const pruneSession = async (session) => {
  const activeSince = new Date(Date.now() - 45 * 1000);
  session.participants = session.participants.filter((item) => item.lastSeen >= activeSince);
  session.signals = session.signals.filter((item) => item.createdAt >= new Date(Date.now() - 2 * 60 * 1000));
  if (session.messages.length > 200) session.messages = session.messages.slice(-200);
  await session.save();
};

const participantForUser = (session, user, peerId) =>
  session.participants.find(
    (item) =>
      String(item.userId) === String(user.userId) &&
      (!peerId || item.peerId === peerId)
  );

router.get("/", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    let schedules = [];

    if (req.user.role === "teacher") {
      const classes = await Class.find({ teacherId: req.user.userId }).select("_id");
      schedules = await Schedule.find({ classId: { $in: classes.map((item) => item._id) }, status: { $ne: "cancelled" } }).populate(schedulePopulate).sort({ date: 1, startTime: 1 });
    }

    if (req.user.role === "student") {
      const enrollments = await Enrollment.find({ studentId: req.user.userId, status: { $ne: "cancelled" } }).select("classId");
      schedules = await Schedule.find({ classId: { $in: enrollments.map((item) => item.classId) }, status: { $ne: "cancelled" } }).populate(schedulePopulate).sort({ date: 1, startTime: 1 });
    }

    if (req.user.role === "parent") {
      const enrollments = await Enrollment.find({ parentId: req.user.userId, status: { $ne: "cancelled" } }).select("classId studentId").populate("studentId", "fullName email");
      schedules = await Schedule.find({ classId: { $in: enrollments.map((item) => item.classId) }, status: { $ne: "cancelled" } }).populate(schedulePopulate).sort({ date: 1, startTime: 1 });
    }

    const sessions = await OnlineClassSession.find({ scheduleId: { $in: schedules.map((item) => item._id) } });
    const bySchedule = new Map(sessions.map((item) => [String(item.scheduleId), item]));
    const now = new Date();

    await Promise.all(
      schedules.map((schedule) => {
        const session = bySchedule.get(String(schedule._id));
        return session?.status === "live" && !isClassTime(schedule, now)
          ? endStaleLiveSession(session)
          : null;
      })
    );

    res.status(200).json(
      schedules.map((schedule) => {
        const session = bySchedule.get(String(schedule._id));
        const isAvailable = isClassTime(schedule, now);
        const live = session?.status === "live" && isAvailable;
        return {
          schedule,
          session: session || null,
          canOpen: req.user.role === "teacher" && isAvailable,
          canJoin: Boolean(live),
          isClassTime: isAvailable,
        };
      })
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:scheduleId/open", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId).populate(schedulePopulate);
    if (!schedule) return res.status(404).json({ message: "Schedule not found" });
    if (!(await canAccessSchedule(schedule, req.user))) return res.status(403).json({ message: "Only this class teacher can open the online class" });
    if (!isClassTime(schedule)) return res.status(400).json({ message: "You can only open this class near its scheduled time" });

    const teacherId = schedule.classId.teacherId?._id || schedule.classId.teacherId;
    const session = await OnlineClassSession.findOneAndUpdate(
      { scheduleId: schedule._id },
      {
        scheduleId: schedule._id,
        classId: schedule.classId._id,
        teacherId,
        status: "live",
        openedAt: new Date(),
        endedAt: null,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(await getSessionView(session));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/end", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const session = await OnlineClassSession.findById(req.params.sessionId).populate(onlinePopulate);
    if (!session) return res.status(404).json({ message: "Online class not found" });
    if (String(session.teacherId._id || session.teacherId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only this class teacher can end the online class" });
    }

    session.status = "ended";
    session.endedAt = new Date();
    session.participants = [];
    session.signals = [];
    await session.save();

    res.status(200).json(await getSessionView(session));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/join", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const { peerId } = req.body;
    if (!peerId) return res.status(400).json({ message: "Peer id is required" });

    const session = await OnlineClassSession.findById(req.params.sessionId).populate(onlinePopulate);
    if (!session || session.status !== "live") return res.status(404).json({ message: "Online class is not live" });
    if (!isClassTime(session.scheduleId)) {
      await endStaleLiveSession(session);
      return res.status(400).json({ message: "This class is not available right now" });
    }
    if (!(await canAccessSchedule(session.scheduleId, req.user))) return res.status(403).json({ message: "You cannot join this class" });

    const user = await User.findById(req.user.userId).select("fullName role");
    const participants = session.participants.filter((item) => String(item.userId) !== String(req.user.userId) && item.peerId !== peerId);
    participants.push({
      userId: req.user.userId,
      peerId,
      fullName: user?.fullName || "Participant",
      role: req.user.role,
      micAllowed: req.user.role === "teacher",
      handRaised: false,
      joinedAt: new Date(),
      lastSeen: new Date(),
    });
    session.participants = participants;
    await pruneSession(session);

    res.status(200).json(await getSessionView(session));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/heartbeat", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const session = await OnlineClassSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Online class not found" });

    const participant = session.participants.find((item) => String(item.userId) === String(req.user.userId));
    if (participant) participant.lastSeen = new Date();
    await pruneSession(session);

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/leave", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const session = await OnlineClassSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Online class not found" });
    session.participants = session.participants.filter((item) => String(item.userId) !== String(req.user.userId));
    await session.save();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/:sessionId/state", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const session = await OnlineClassSession.findById(req.params.sessionId).populate(onlinePopulate);
    if (!session) return res.status(404).json({ message: "Online class not found" });
    if (!(await canAccessSchedule(session.scheduleId, req.user))) return res.status(403).json({ message: "You cannot access this class" });

    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const peerId = String(req.query.peerId || "");
    await pruneSession(session);
    if (!participantForUser(session, req.user, peerId)) {
      return res.status(403).json({ message: "Join the class before reading realtime state" });
    }

    const view = session.toObject();
    view.messages = view.messages.filter((item) => new Date(item.createdAt) > since);
    view.signals = view.signals.filter((item) => item.toPeerId === peerId && new Date(item.createdAt) > since);
    res.status(200).json(view);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/message", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Message is required" });
    const session = await OnlineClassSession.findById(req.params.sessionId).populate(onlinePopulate);
    if (!session || session.status !== "live") return res.status(404).json({ message: "Online class is not live" });
    if (!(await canAccessSchedule(session.scheduleId, req.user))) return res.status(403).json({ message: "You cannot comment in this class" });

    const user = await User.findById(req.user.userId).select("fullName role");
    session.messages.push({
      senderId: req.user.userId,
      fullName: user?.fullName || "Participant",
      role: req.user.role,
      text,
      createdAt: new Date(),
    });
    await pruneSession(session);
    res.status(201).json(session.messages[session.messages.length - 1]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/signal", authMiddleware, roleMiddleware("teacher", "student", "parent"), async (req, res) => {
  try {
    const { fromPeerId, toPeerId, type, payload } = req.body;
    if (!fromPeerId || !toPeerId || !type || !payload) return res.status(400).json({ message: "Invalid signal" });
    const session = await OnlineClassSession.findById(req.params.sessionId).populate(onlinePopulate);
    if (!session || session.status !== "live") return res.status(404).json({ message: "Online class is not live" });
    if (!(await canAccessSchedule(session.scheduleId, req.user))) return res.status(403).json({ message: "You cannot signal this class" });
    if (!participantForUser(session, req.user, fromPeerId)) {
      return res.status(403).json({ message: "Invalid sender peer" });
    }
    if (!session.participants.some((item) => item.peerId === toPeerId)) {
      return res.status(404).json({ message: "Target peer not found" });
    }

    session.signals.push({ fromPeerId, toPeerId, type, payload, createdAt: new Date() });
    await pruneSession(session);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/speak-request", authMiddleware, roleMiddleware("student", "parent"), async (req, res) => {
  try {
    const session = await OnlineClassSession.findById(req.params.sessionId);
    if (!session || session.status !== "live") return res.status(404).json({ message: "Online class is not live" });
    const participant = session.participants.find((item) => String(item.userId) === String(req.user.userId));
    if (!participant) return res.status(403).json({ message: "Join the class before requesting to speak" });
    participant.handRaised = true;
    participant.lastSeen = new Date();
    await session.save();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:sessionId/mic-permission", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const { userId, allowed } = req.body;
    const session = await OnlineClassSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Online class not found" });
    if (String(session.teacherId) !== String(req.user.userId)) return res.status(403).json({ message: "Only teacher can control microphones" });

    const participant = session.participants.find((item) => String(item.userId) === String(userId));
    if (!participant) return res.status(404).json({ message: "Participant not found" });
    participant.micAllowed = Boolean(allowed);
    participant.handRaised = false;
    participant.lastSeen = new Date();
    await session.save();
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
