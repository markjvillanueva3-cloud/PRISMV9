/**
 * LatheNotificationEngine — Multi-Channel Notification System
 *
 * U-LTH61: Alerts, notifications, and escalation management
 * Uses NotificationEngine + AlertEngine + EscalationEngine patterns
 *
 * @module engines/LatheNotificationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = "email" | "sms" | "push" | "in_app" | "webhook";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type NotificationCategory =
  | "production"
  | "quality"
  | "delivery"
  | "inventory"
  | "financial"
  | "system"
  | "maintenance";

export interface Notification {
  notification_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  recipients: string[];
  job_id?: string;
  data?: Record<string, unknown>;
  created_at: string;
  sent_at?: string;
  read_at?: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  retry_count: number;
}

export interface NotificationRule {
  rule_id: string;
  name: string;
  description: string;
  trigger: NotificationTrigger;
  conditions: NotificationCondition[];
  action: NotificationAction;
  enabled: boolean;
  created_at: string;
}

export interface NotificationTrigger {
  event_type: string;
  source: string;
}

export interface NotificationCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

export interface NotificationAction {
  template_id: string;
  channels: NotificationChannel[];
  recipients: string[];
  priority: NotificationPriority;
  escalation?: EscalationConfig;
}

export interface EscalationConfig {
  enabled: boolean;
  timeout_minutes: number;
  escalation_recipients: string[];
  max_escalations: number;
}

export interface NotificationTemplate {
  template_id: string;
  name: string;
  category: NotificationCategory;
  subject_template: string;
  body_template: string;
  variables: string[];
}

export interface UserPreferences {
  user_id: string;
  channels_enabled: NotificationChannel[];
  categories_subscribed: NotificationCategory[];
  quiet_hours: { start: string; end: string } | null;
  digest_mode: boolean;
  digest_frequency: "hourly" | "daily" | "weekly";
}

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  by_channel: Record<NotificationChannel, number>;
  by_category: Record<NotificationCategory, number>;
  by_priority: Record<NotificationPriority, number>;
  avg_delivery_time_sec: number;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    template_id: "TPL-PRODUCTION-DELAY",
    name: "Production Delay Alert",
    category: "production",
    subject_template: "Production Delay: Job {{job_id}}",
    body_template: "Job {{job_id}} for {{customer_name}} is delayed by {{delay_hours}} hours. Current stage: {{stage}}. Action required.",
    variables: ["job_id", "customer_name", "delay_hours", "stage"],
  },
  {
    template_id: "TPL-QUALITY-FAIL",
    name: "Quality Inspection Failed",
    category: "quality",
    subject_template: "Quality Alert: Job {{job_id}} Failed Inspection",
    body_template: "Job {{job_id}} failed inspection. FPY: {{fpy_pct}}%. Non-conformances: {{nc_count}}. Review required.",
    variables: ["job_id", "fpy_pct", "nc_count"],
  },
  {
    template_id: "TPL-DELIVERY-SHIPPED",
    name: "Order Shipped",
    category: "delivery",
    subject_template: "Order Shipped: {{order_id}}",
    body_template: "Order {{order_id}} has been shipped via {{carrier}}. Tracking: {{tracking_number}}. Expected delivery: {{delivery_date}}.",
    variables: ["order_id", "carrier", "tracking_number", "delivery_date"],
  },
  {
    template_id: "TPL-INVENTORY-LOW",
    name: "Low Inventory Alert",
    category: "inventory",
    subject_template: "Low Stock: {{item_name}}",
    body_template: "{{item_name}} is below reorder point. Current: {{current_qty}}, Reorder Point: {{reorder_point}}. Order recommended.",
    variables: ["item_name", "current_qty", "reorder_point"],
  },
  {
    template_id: "TPL-PAYMENT-RECEIVED",
    name: "Payment Received",
    category: "financial",
    subject_template: "Payment Received: Invoice {{invoice_id}}",
    body_template: "Payment of ${{amount}} received for invoice {{invoice_id}} from {{customer_name}}.",
    variables: ["invoice_id", "amount", "customer_name"],
  },
  {
    template_id: "TPL-MACHINE-DOWN",
    name: "Machine Down Alert",
    category: "maintenance",
    subject_template: "Machine Down: {{machine_id}}",
    body_template: "{{machine_name}} ({{machine_id}}) is down. Reason: {{reason}}. Estimated repair time: {{repair_hours}} hours.",
    variables: ["machine_id", "machine_name", "reason", "repair_hours"],
  },
];

// ============================================================================
// ENGINE
// ============================================================================

class LatheNotificationEngine {
  private notifications: Map<string, Notification> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private userPreferences: Map<string, UserPreferences> = new Map();
  private escalations: Map<string, { count: number; last_escalated: string }> = new Map();

  constructor() {
    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.template_id, template);
    }
  }

  // --------------------------------------------------------------------------
  // Notification Management
  // --------------------------------------------------------------------------

  createNotification(params: {
    title: string;
    message: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    recipients: string[];
    job_id?: string;
    data?: Record<string, unknown>;
  }): Notification {
    const notificationId = `NOT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const notification: Notification = {
      notification_id: notificationId,
      title: params.title,
      message: params.message,
      category: params.category,
      priority: params.priority,
      channels: params.channels,
      recipients: params.recipients,
      job_id: params.job_id,
      data: params.data,
      created_at: new Date().toISOString(),
      status: "pending",
      retry_count: 0,
    };

    this.notifications.set(notificationId, notification);
    return notification;
  }

  sendNotification(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== "pending") return null;

    const eligibleRecipients = this.filterRecipientsByPreferences(
      notification.recipients,
      notification.category,
      notification.channels
    );

    if (eligibleRecipients.length === 0) {
      notification.status = "failed";
      this.notifications.set(notificationId, notification);
      return notification;
    }

    notification.recipients = eligibleRecipients;
    notification.sent_at = new Date().toISOString();
    notification.status = "sent";

    this.notifications.set(notificationId, notification);
    return notification;
  }

  markDelivered(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = "delivered";
    this.notifications.set(notificationId, notification);
    return notification;
  }

  markRead(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = "read";
    notification.read_at = new Date().toISOString();
    this.notifications.set(notificationId, notification);
    return notification;
  }

  retryNotification(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status !== "failed") return null;

    notification.retry_count++;
    notification.status = "pending";
    this.notifications.set(notificationId, notification);

    return this.sendNotification(notificationId);
  }

  private filterRecipientsByPreferences(
    recipients: string[],
    category: NotificationCategory,
    channels: NotificationChannel[]
  ): string[] {
    return recipients.filter((userId) => {
      const prefs = this.userPreferences.get(userId);
      if (!prefs) return true;

      if (!prefs.categories_subscribed.includes(category)) return false;

      const hasEnabledChannel = channels.some((ch) => prefs.channels_enabled.includes(ch));
      if (!hasEnabledChannel) return false;

      if (prefs.quiet_hours) {
        const now = new Date();
        const currentHour = now.getHours();
        const startHour = parseInt(prefs.quiet_hours.start.split(":")[0], 10);
        const endHour = parseInt(prefs.quiet_hours.end.split(":")[0], 10);

        if (startHour <= endHour) {
          if (currentHour >= startHour && currentHour < endHour) return false;
        } else {
          if (currentHour >= startHour || currentHour < endHour) return false;
        }
      }

      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Template-Based Notifications
  // --------------------------------------------------------------------------

  sendFromTemplate(
    templateId: string,
    variables: Record<string, string | number>,
    recipients: string[],
    options?: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      job_id?: string;
    }
  ): Notification | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let subject = template.subject_template;
    let body = template.body_template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), String(value));
      body = body.replace(new RegExp(placeholder, "g"), String(value));
    }

    const notification = this.createNotification({
      title: subject,
      message: body,
      category: template.category,
      priority: options?.priority || "normal",
      channels: options?.channels || ["in_app", "email"],
      recipients,
      job_id: options?.job_id,
      data: variables,
    });

    return this.sendNotification(notification.notification_id);
  }

  // --------------------------------------------------------------------------
  // Rules Engine
  // --------------------------------------------------------------------------

  createRule(params: Omit<NotificationRule, "rule_id" | "created_at">): NotificationRule {
    const ruleId = `RUL-${Date.now().toString(36)}`;

    const rule: NotificationRule = {
      ...params,
      rule_id: ruleId,
      created_at: new Date().toISOString(),
    };

    this.rules.set(ruleId, rule);
    return rule;
  }

  processEvent(eventType: string, source: string, data: Record<string, unknown>): Notification[] {
    const triggeredNotifications: Notification[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      if (rule.trigger.event_type !== eventType || rule.trigger.source !== source) continue;

      const conditionsMet = rule.conditions.every((cond) => {
        const fieldValue = data[cond.field];
        switch (cond.operator) {
          case "equals":
            return fieldValue === cond.value;
          case "not_equals":
            return fieldValue !== cond.value;
          case "greater_than":
            return typeof fieldValue === "number" && fieldValue > (cond.value as number);
          case "less_than":
            return typeof fieldValue === "number" && fieldValue < (cond.value as number);
          case "contains":
            return typeof fieldValue === "string" && fieldValue.includes(String(cond.value));
          default:
            return false;
        }
      });

      if (conditionsMet) {
        const notification = this.sendFromTemplate(
          rule.action.template_id,
          data as Record<string, string | number>,
          rule.action.recipients,
          {
            channels: rule.action.channels,
            priority: rule.action.priority,
            job_id: data.job_id as string | undefined,
          }
        );

        if (notification) {
          triggeredNotifications.push(notification);
        }
      }
    }

    return triggeredNotifications;
  }

  enableRule(ruleId: string): NotificationRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    rule.enabled = true;
    this.rules.set(ruleId, rule);
    return rule;
  }

  disableRule(ruleId: string): NotificationRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    rule.enabled = false;
    this.rules.set(ruleId, rule);
    return rule;
  }

  // --------------------------------------------------------------------------
  // Escalation
  // --------------------------------------------------------------------------

  checkEscalations(): Notification[] {
    const escalatedNotifications: Notification[] = [];
    const now = new Date();

    for (const notification of this.notifications.values()) {
      if (notification.status !== "sent" && notification.status !== "delivered") continue;

      const rule = Array.from(this.rules.values()).find((r) =>
        r.action.template_id && notification.data
      );

      if (!rule?.action.escalation?.enabled) continue;

      const escalationKey = notification.notification_id;
      const escalationState = this.escalations.get(escalationKey) || { count: 0, last_escalated: notification.sent_at || "" };

      const sentTime = new Date(escalationState.last_escalated || notification.sent_at || "");
      const minutesSinceSent = (now.getTime() - sentTime.getTime()) / (1000 * 60);

      if (
        minutesSinceSent >= rule.action.escalation.timeout_minutes &&
        escalationState.count < rule.action.escalation.max_escalations
      ) {
        const escalatedNotification = this.createNotification({
          title: `[ESCALATED] ${notification.title}`,
          message: `This notification requires attention: ${notification.message}`,
          category: notification.category,
          priority: "urgent",
          channels: notification.channels,
          recipients: rule.action.escalation.escalation_recipients,
          job_id: notification.job_id,
          data: { ...notification.data, original_notification_id: notification.notification_id },
        });

        this.sendNotification(escalatedNotification.notification_id);
        escalatedNotifications.push(escalatedNotification);

        this.escalations.set(escalationKey, {
          count: escalationState.count + 1,
          last_escalated: now.toISOString(),
        });
      }
    }

    return escalatedNotifications;
  }

  // --------------------------------------------------------------------------
  // User Preferences
  // --------------------------------------------------------------------------

  setUserPreferences(preferences: UserPreferences): UserPreferences {
    this.userPreferences.set(preferences.user_id, preferences);
    return preferences;
  }

  getUserPreferences(userId: string): UserPreferences | null {
    return this.userPreferences.get(userId) || null;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  getNotification(notificationId: string): Notification | null {
    return this.notifications.get(notificationId) || null;
  }

  getNotificationsForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.recipients.includes(userId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getUnreadNotifications(userId: string): Notification[] {
    return this.getNotificationsForUser(userId).filter((n) => n.status !== "read");
  }

  getNotificationsByCategory(category: NotificationCategory): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.category === category);
  }

  getPendingNotifications(): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.status === "pending");
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  getStatistics(): NotificationStats {
    const notifications = Array.from(this.notifications.values());

    const sent = notifications.filter((n) => n.status !== "pending");
    const delivered = notifications.filter((n) => n.status === "delivered" || n.status === "read");
    const read = notifications.filter((n) => n.status === "read");
    const failed = notifications.filter((n) => n.status === "failed");

    const byChannel: Record<NotificationChannel, number> = {
      email: 0, sms: 0, push: 0, in_app: 0, webhook: 0,
    };
    const byCategory: Record<NotificationCategory, number> = {
      production: 0, quality: 0, delivery: 0, inventory: 0, financial: 0, system: 0, maintenance: 0,
    };
    const byPriority: Record<NotificationPriority, number> = {
      low: 0, normal: 0, high: 0, urgent: 0,
    };

    for (const notification of notifications) {
      for (const channel of notification.channels) {
        byChannel[channel]++;
      }
      byCategory[notification.category]++;
      byPriority[notification.priority]++;
    }

    const deliveryTimes = delivered
      .filter((n) => n.sent_at)
      .map((n) => {
        const sentTime = new Date(n.sent_at!).getTime();
        const createdTime = new Date(n.created_at).getTime();
        return (sentTime - createdTime) / 1000;
      });

    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    return {
      total_sent: sent.length,
      total_delivered: delivered.length,
      total_read: read.length,
      total_failed: failed.length,
      by_channel: byChannel,
      by_category: byCategory,
      by_priority: byPriority,
      avg_delivery_time_sec: Math.round(avgDeliveryTime * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------

  getTemplate(templateId: string): NotificationTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  createTemplate(template: NotificationTemplate): NotificationTemplate {
    this.templates.set(template.template_id, template);
    return template;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  clearAll(): void {
    this.notifications.clear();
    this.rules.clear();
    this.userPreferences.clear();
    this.escalations.clear();

    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.template_id, template);
    }
  }
}

export const latheNotificationEngine = new LatheNotificationEngine();
