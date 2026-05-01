const DATE_ONLY_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.000)?Z)?$/;

export const dateKey = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const dateOnly = value.match(DATE_ONLY_PATTERN);
    if (dateOnly) return dateOnly[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
