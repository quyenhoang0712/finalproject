import { safeJson } from "../api/client";

export const roleRoutes = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

export const getStoredUser = () => safeJson(localStorage.getItem("user"), null);

export const saveSession = ({ token, user }) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const redirectForRole = (role) => roleRoutes[role] || "/";
