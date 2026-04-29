const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    next();
  };
};

module.exports = roleMiddleware;