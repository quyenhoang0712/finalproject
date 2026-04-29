export const API_BASE_URL = "http://localhost:5000";

export const safeJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    return fallback;
  }
};

export const api = async (path, options = {}) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = safeJson(text, {});

  if (!response.ok) {
    throw new Error(data.message || text || "Request failed");
  }

  return data;
};

export const postJson = (path, body) =>
  api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
