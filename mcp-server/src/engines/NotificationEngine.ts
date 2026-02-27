/**
 * NotificationEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Notification management with multiple channels (in-app, email,
 * webhook, SMS), priority levels, templates, and delivery tracking.
 *
 * Actions: notification_send, notification_list, notification_read,
 *          notification_configure, notification_stats
 */

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = "in_app" | "email" | "webhook" | "sms" | "push";
export type NotificationPriority = "critical" | "high" | "normal" | "low";
export type NotificationStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Notification {
  id: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipient: string;
  subject: string;
  body: string;
  template_id?: string;
  context?: Record<string, unknown>;
  created_at: string;
  sent_at?: string;
  read_at?: string;
  error?: string;
  retry_count: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject_template: string;
  body_template: string;
}

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_read: number;
  by_channel: Record<NotificationChannel, number>;
  by_priority: Record<NotificationPriority, number>;
  delivery_rate_pct: number;
  read_rate_pct: number;
}

export interface SendOptions {
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  template_id?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

let notifIdCounter = 0;

export class NotificationEngine {
  private notifications = new Map<string, Notification>();
  private templates = new Map<string, NotificationTemplate>();

  send(recipient: string, subject: string, body: string, options?: SendOptions): Notification {
    notifIdCounter++;
    const id = `NTF-${String(notifIdCounter).padStart(6, "0")}`;

    let finalSubject = subject;
    let finalBody = body;

    if (options?.template_id) {
      const tpl = this.templates.get(options.template_id);
      if (tpl) {
        finalSubject = this.renderTemplate(tpl.subject_template, options.context || {});
        finalBody = this.renderTemplate(tpl.body_template, options.context || {});
      }
    }

    const notification: Notification = {
      id,
      channel: options?.channel || "in_app",
      priority: options?.priority || "normal",
      status: "sent",
      recipient,
      subject: finalSubject,
      body: finalBody,
      template_id: options?.template_id,
      context: options?.context,
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      retry_count: 0,
    };

    this.notifications.set(id, notification);
    return notification;
  }

  markRead(notificationId: string): boolean {
    const n = this.notifications.get(notificationId);
    if (!n) return false;
    n.status = "read";
    n.read_at = new Date().toISOString();
    return true;
  }

  markDelivered(notificationId: string): boolean {
    const n = this.notifications.get(notificationId);
    if (!n || n.status === "read") return false;
    n.status = "delivered";
    return true;
  }

  list(recipient: string, unreadOnly: boolean = false): Notification[] {
    let result = [...this.notifications.values()].filter(n => n.recipient === recipient);
    if (unreadOnly) result = result.filter(n => n.status !== "read");
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  listTemplates(): NotificationTemplate[] {
    return [...this.templates.values()];
  }

  stats(): NotificationStats {
    const byChannel: Record<NotificationChannel, number> = { in_app: 0, email: 0, webhook: 0, sms: 0, push: 0 };
    const byPriority: Record<NotificationPriority, number> = { critical: 0, high: 0, normal: 0, low: 0 };
    let sent = 0, delivered = 0, failed = 0, read = 0;

    for (const n of this.notifications.values()) {
      byChannel[n.channel]++;
      byPriority[n.priority]++;
      if (n.status === "sent" || n.status === "delivered" || n.status === "read") sent++;
      if (n.status === "delivered" || n.status === "read") delivered++;
      if (n.status === "failed") failed++;
      if (n.status === "read") read++;
    }

    return {
      total_sent: sent,
      total_delivered: delivered,
      total_failed: failed,
      total_read: read,
      by_channel: byChannel,
      by_priority: byPriority,
      delivery_rate_pct: sent > 0 ? Math.round(delivered / sent * 1000) / 10 : 0,
      read_rate_pct: delivered > 0 ? Math.round(read / delivered * 1000) / 10 : 0,
    };
  }

  clear(): void { this.notifications.clear(); this.templates.clear(); notifIdCounter = 0; }

  // ---- PRIVATE ----

  private renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? String(context[key]) : `{{${key}}}`;
    });
  }
}

export const notificationEngine = new NotificationEngine();
