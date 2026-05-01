const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Không có token" });
    }

    // Bearer abcdef...
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("email role");

    if (!user) {
      return res.status(401).json({ message: "User khong ton tai hoac da bi xoa" });
    }

    req.user = {
      ...decoded,
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

module.exports = authMiddleware;
