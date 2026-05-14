import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, notifyGetInApp, notifyMarkRead } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type InAppNotificationType = 'alert' | 'info' | 'success' | 'warn' | 'critical' | 'emergency';

type InAppNotification = {
  id: string;
  type: InAppNotificationType;
  subject: string;
  body: string;
  created_at: string;
  read: boolean;
};

const TYPE_TONE: Record<InAppNotificationType, string> = {
  alert: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  info: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  warn: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  emergency: 'border-red-500/30 bg-red-500/12 text-red-100',
};

const TYPE_LABEL: Record<InAppNotificationType, string> = {
  alert: 'Alert',
  info: 'Info',
  success: 'Success',
  warn: 'Warning',
  critical: 'Critical',
  emergency: 'Emergency',
};

function readIssueMessage(issue: unknown) {
  if (issue instanceof ApiError) {
    return issue.message;
  }

  if (issue instanceof Error) {
    return issue.message;
  }

  return 'Notification feed unavailable.';
}

function formatRelativeStamp(iso: string) {
  const stamp = new Date(iso);
  if (Number.isNaN(stamp.getTime())) {
    return 'Unknown time';
  }

  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - stamp.getTime()) / 60000));

  if (diffMinutes < 1) {
    return 'Now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return stamp.toLocaleDateString();
}

export function NotificationBell() {
  const auth = useAuth();
  const employeeId = auth.employee?.id ?? null;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!auth.isAuthenticated) {
        if (!cancelled) {
          setNotifications([]);
          setIssueMessage(null);
          setStatus('idle');
        }
        return;
      }

      if (!employeeId) {
        if (!cancelled) {
          setNotifications([]);
          setIssueMessage('Employee record missing for notification feed.');
          setStatus('error');
        }
        return;
      }

      if (!cancelled) {
        setStatus('loading');
        setIssueMessage(null);
      }

      try {
        const response = await notifyGetInApp(employeeId);
        if (cancelled) {
          return;
        }

        const nextNotifications = Array.isArray(response.result)
          ? (response.result as InAppNotification[])
          : [];

        setNotifications(nextNotifications);
        setIssueMessage(null);
        setStatus('ready');
      } catch (issue) {
        if (!cancelled) {
          setNotifications([]);
          setIssueMessage(readIssueMessage(issue));
          setStatus('error');
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, employeeId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && event.target instanceof Node && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  async function markSingleRead(notificationId: string) {
    if (!employeeId) {
      return;
    }

    setMarkingIds((current) => [...current, notificationId]);
    try {
      await notifyMarkRead(employeeId, notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      );
    } finally {
      setMarkingIds((current) => current.filter((id) => id !== notificationId));
    }
  }

  async function markAllRead() {
    if (!employeeId) {
      return;
    }

    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) {
      return;
    }

    setMarkingIds((current) => [...current, ...unreadIds]);
    try {
      await Promise.all(unreadIds.map((notificationId) => notifyMarkRead(employeeId, notificationId)));
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
    } finally {
      setMarkingIds((current) => current.filter((id) => !unreadIds.includes(id)));
    }
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-label={`Notifications (${unreadCount} unread)`}
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-base text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
      >
        <span aria-hidden="true">🔔</span>
        <span className="sr-only">Notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-[0_8px_24px_rgba(244,63,94,0.32)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/10 bg-[#071017]/96 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Inbox posture
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                Notifications
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {status === 'loading'
                  ? 'Refreshing the mounted in-app feed.'
                  : issueMessage
                    ? 'The live notification surface is unavailable.'
                    : unreadCount > 0
                      ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                      : 'No unread notifications right now.'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void markAllRead();
                }}
                disabled={unreadCount === 0 || markingIds.length > 0}
                className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/28 hover:bg-cyan-300/14 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.03] disabled:text-slate-500"
              >
                Mark All Read
              </button>
              <button
                type="button"
                aria-label="Close panel"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto p-3">
            {status === 'loading' ? (
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                Loading notifications…
              </div>
            ) : null}

            {status === 'error' ? (
              <div className="rounded-[20px] border border-rose-400/18 bg-rose-500/8 px-4 py-4">
                <div className="text-sm font-semibold text-rose-100">Notifications unavailable</div>
                <div className="mt-2 text-sm text-rose-100/80">{issueMessage}</div>
              </div>
            ) : null}

            {status === 'ready' && notifications.length === 0 ? (
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                No notifications in the mounted feed.
              </div>
            ) : null}

            {status === 'ready' && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const isMarking = markingIds.includes(notification.id);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      aria-label={notification.subject}
                      disabled={notification.read || isMarking}
                      onClick={() => {
                        void markSingleRead(notification.id);
                      }}
                      className={`block w-full rounded-[20px] border px-4 py-3 text-left transition ${
                        notification.read
                          ? 'border-white/8 bg-white/[0.02] text-slate-400'
                          : 'border-cyan-300/14 bg-cyan-300/[0.06] text-slate-100 hover:border-cyan-300/24 hover:bg-cyan-300/[0.1]'
                      } ${notification.read || isMarking ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${TYPE_TONE[notification.type] ?? TYPE_TONE.info}`}
                            >
                              {TYPE_LABEL[notification.type] ?? 'Info'}
                            </span>
                            {!notification.read ? (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
                                Unread
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-inherit">
                            {notification.subject}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-slate-300/85">
                            {notification.body}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {isMarking ? 'Saving' : formatRelativeStamp(notification.created_at)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
