import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { safeJson } from "../../api/client";
import "../../styles/notifications.css";

const roleAudience = {
  teacher: "teachers",
  student: "students",
  parent: "parents",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN");
};

const loadAnnouncements = (role) => {
  const audience = roleAudience[role] || role;
  return safeJson(localStorage.getItem("announcements"), [])
    .filter((item) => item?.audience === "all" || item?.audience === audience)
    .map((item) => ({
      id: `announcement-${item.id || item.createdAt || item.title}`,
      label: "Announcement",
      title: item.title || "New announcement",
      message: item.message || "Please check the latest update.",
      time: formatDate(item.createdAt),
    }));
};

export function NotificationBell({ role, items = [], userId = "" }) {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState(() => loadAnnouncements(role));
  const readStorageKey = `notification-read:${role}:${userId || "shared"}`;
  const [readIds, setReadIds] = useState(() => new Set(safeJson(localStorage.getItem(readStorageKey), [])));
  const containerRef = useRef(null);

  useEffect(() => {
    setAnnouncements(loadAnnouncements(role));
  }, [role]);

  useEffect(() => {
    setReadIds(new Set(safeJson(localStorage.getItem(readStorageKey), [])));
  }, [readStorageKey]);

  useEffect(() => {
    const onStorage = (event) => {
      if (!event.key || event.key === "announcements") {
        setAnnouncements(loadAnnouncements(role));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [role]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const allNotifications = useMemo(() => [...announcements, ...items].filter(Boolean), [announcements, items]);
  const notifications = useMemo(
    () => allNotifications.filter((item) => !readIds.has(item.id)).slice(0, 12),
    [allNotifications, readIds]
  );
  const count = notifications.length;
  const badge = count > 9 ? "9+" : String(count);
  const markRead = (ids) => {
    const nextReadIds = new Set([...readIds, ...ids]);
    localStorage.setItem(readStorageKey, JSON.stringify([...nextReadIds]));
    setReadIds(nextReadIds);
  };

  return (
    <div className="topbar-notification-wrap" ref={containerRef}>
      <button
        className={`topbar-announcement-button ${count ? "has-announcements" : ""}`}
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        data-count={badge}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} />
      </button>

      {open && (
        <section className="announcement-popover" role="dialog" aria-label="Notifications">
          <header className="announcement-popover-header">
            <div>
              <strong>Notifications</strong>
              <span>{count ? `${count} updates` : "No updates"}</span>
            </div>
            {count > 0 && (
              <button className="announcement-read-all" type="button" onClick={() => markRead(notifications.map((item) => item.id))}>
                Mark all read
              </button>
            )}
          </header>
          <div className="announcement-popover-list">
            {notifications.length ? (
              notifications.map((item) => (
                <article className="announcement-item" key={item.id}>
                  <div className="announcement-item-top">
                    <span>{[item.label, item.time].filter(Boolean).join(" - ")}</span>
                    <button type="button" onClick={() => markRead([item.id])}>Read</button>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </article>
              ))
            ) : (
              <p className="announcement-empty">No class or schedule notifications yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
