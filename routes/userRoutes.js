const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  avatar: user.avatar || "",
  caption: user.caption || "",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});


// PROFILE - cần đăng nhập
router.get("/profile/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN ONLY
router.get("/admin-only", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  res.status(200).json({
    message: "Chỉ admin mới vào được",
    currentUser: req.user,
  });
});
const canAccessUser = (req, id) => req.user.role === "admin" || String(req.user.userId) === String(id);

// GET all users
router.get("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET user by id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!canAccessUser(req, req.params.id)) {
      return res.status(403).json({ message: "You do not have permission to view this user" });
    }

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create user / register
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    const validRoles = ["student", "teacher", "admin", "parent"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      _id: savedUser._id,
      fullName: savedUser.fullName,
      email: savedUser.email,
      role: savedUser.role,
      avatar: savedUser.avatar || "",
      caption: savedUser.caption || "",
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// LOGIN + JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và password" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Email không tồn tại" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        caption: user.caption || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { fullName, email, password, role, avatar, caption } = req.body;

    if (!canAccessUser(req, req.params.id)) {
      return res.status(403).json({ message: "You do not have permission to update this user" });
    }

    if (req.user.role !== "admin" && role) {
      return res.status(403).json({ message: "Only admin can change roles" });
    }

    const validRoles = ["student", "teacher", "admin", "parent"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (caption !== undefined) updateData.caption = caption;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json(publicUser(updatedUser));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE user
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.status(200).json({ message: "Xóa user thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
