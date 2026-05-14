/**
 * NotificationCenter — In-app notification panel + toast system.
 * Ported from mcp-server/web (no external dependencies).
 */
import { useState, useEffect, useCallback } from "react";

export type NotificationType = "info" | "warn" | "critical" | "emergency" | "success";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  source?: string;
  alarm_id?: string;
}

let notifCounter = 0;

const TYPE_COLORS: Record<NotificationType, string> = {
  info: "#3b82f6",
  warn: "#f59e0b",
  critical: "#ef4444",
  emergency: "#dc2626",
  success: "#22c55e",
};

const TYPE_ICONS: Record<NotificationType, string> = {
  info: "ℹ",
  warn: "⚠",
  critical: "●",
  emergency: "🔴",
  success: "✓",
};

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const color = TYPE_COLORS[notification.type];

  return (
    <div style={{
      background: "#1e293b", borderLeft: `4px solid ${color}`, borderRadius: 6,
      padding: "10px 14px", marginBottom: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-start", gap: 10, minWidth: 280, maxWidth: 380,
    }}>
      <span style={{ color, fontSize: 16, flexShrink: 0 }}>{TYPE_ICONS[notification.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9" }}>{notification.title}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{notification.message}</div>
      </div>
      <button onClick={() => onDismiss(notification.id)}
        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, padding: 0 }}>
        ×
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Notification[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
      {toasts.map(t => <Toast key={t.id} notification={t} onDismiss={onDismiss} />)}
    </div>
  );
}

export function NotificationPanel({
  notifications, onMarkRead, onClearAll, onClose,
}: {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const unreadCount = notifications.filter(n => !n.read).length;
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 360, height: "100vh",
      background: "#0f172a", borderLeft: "1px solid #1e293b", zIndex: 1000,
      display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,0.3)",
    }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 15 }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ marginLeft: 8, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClearAll} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}>Clear all</button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#475569", fontSize: 13 }}>No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} onClick={() => onMarkRead(n.id)} style={{
              padding: "12px 20px", borderBottom: "1px solid #1e293b", cursor: "pointer",
              background: n.read ? "transparent" : "rgba(59,130,246,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: TYPE_COLORS[n.type], fontSize: 12, flexShrink: 0 }}>{TYPE_ICONS[n.type]}</span>
                <span style={{ fontWeight: n.read ? 400 : 600, fontSize: 13, color: "#e2e8f0", flex: 1 }}>{n.title}</span>
                <span style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>{formatTime(n.timestamp)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, paddingLeft: 20 }}>{n.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ position: "relative", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: 4 }}>
      🔔
      {count > 0 && (
        <span style={{ position: "absolute", top: -2, right: -4, background: "#ef4444", color: "#fff", borderRadius: 8, padding: "0 5px", fontSize: 10, fontWeight: 700, lineHeight: "16px" }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function useNotifications(maxNotifications = 100) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, source?: string, alarm_id?: string) => {
      notifCounter++;
      const notif: Notification = {
        id: `notif-${notifCounter}`, type, title, message,
        timestamp: new Date().toISOString(), read: false, source, alarm_id,
      };
      setNotifications(prev => [notif, ...prev].slice(0, maxNotifications));
      setToasts(prev => [...prev, notif]);
    },
    [maxNotifications]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => { setNotifications([]); }, []);
  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, toasts, panelOpen, unreadCount, setPanelOpen, addNotification, dismissToast, markRead, clearAll };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return d.toLocaleDateString();
}
