const express = require("express");
const router = express.Router();

const Material = require("../models/Material");
const Class = require("../models/Class");
const Enrollment = require("../models/Enrollment");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const materialPopulate = [
  { path: "courseId", select: "title subject mode" },
  { path: "createdBy", select: "fullName email role avatar caption" },
  {
    path: "classId",
    populate: [
      { path: "courseId", select: "title subject mode" },
      { path: "teacherId", select: "fullName email role avatar caption" },
    ],
  },
];

router.get("/student", authMiddleware, roleMiddleware("student"), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      studentId: req.user.userId,
      status: { $ne: "cancelled" },
    }).select("classId");
    const classIds = enrollments.map((item) => item.classId).filter(Boolean);

    const materials = await Material.find({
      classId: { $in: classIds },
      status: "active",
    })
      .populate(materialPopulate)
      .sort({ createdAt: -1 });

    res.status(200).json(materials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/teacher", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const materials = await Material.find({ createdBy: req.user.userId })
      .populate(materialPopulate)
      .sort({ createdAt: -1 });

    res.status(200).json(materials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const { title, description, classId, fileName, fileType, fileSize, fileData } = req.body;

    if (!title || !classId || !fileName || !fileData) {
      return res.status(400).json({ message: "Title, class, and file are required" });
    }

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (String(classItem.teacherId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "You can only add materials for your own classes" });
    }

    const material = await Material.create({
      title,
      description,
      classId,
      courseId: classItem.courseId,
      createdBy: req.user.userId,
      fileName,
      fileType,
      fileSize: Number(fileSize || 0),
      fileData,
    });

    const populated = await Material.findById(material._id).populate(materialPopulate);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", authMiddleware, roleMiddleware("teacher"), async (req, res) => {
  try {
    const material = await Material.findOneAndDelete({ _id: req.params.id, createdBy: req.user.userId });
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.status(200).json({ message: "Material deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
