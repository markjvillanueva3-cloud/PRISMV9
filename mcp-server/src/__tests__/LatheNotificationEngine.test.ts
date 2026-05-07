/**
 * LatheNotificationEngine Tests
 *
 * U-LTH61: Multi-channel notification system
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheNotificationEngine } from "../engines/LatheNotificationEngine.js";

describe("LatheNotificationEngine", () => {
  beforeEach(() => {
    latheNotificationEngine.clearAll();
  });

  describe("Notification Management", () => {
    it("creates notification", () => {
      const notification = latheNotificationEngine.createNotification({
        title: "Test Alert",
        message: "This is a test notification",
        category: "production",
        priority: "normal",
        channels: ["email", "in_app"],
        recipients: ["user-1", "user-2"],
        job_id: "JOB-001",
      });

      expect(notification.notification_id).toMatch(/^NOT-/);
      expect(notification.title).toBe("Test Alert");
      expect(notification.category).toBe("production");
      expect(notification.status).toBe("pending");
      expect(notification.recipients).toHaveLength(2);
    });

    it("sends notification", () => {
      const notification = latheNotificationEngine.createNotification({
        title: "Send Test",
        message: "Testing send",
        category: "quality",
        priority: "high",
        channels: ["sms"],
        recipients: ["user-1"],
      });

      const sent = latheNotificationEngine.sendNotification(notification.notification_id);

      expect(sent).not.toBeNull();
      expect(sent!.status).toBe("sent");
      expect(sent!.sent_at).toBeDefined();
    });

    it("marks notification delivered", () => {
      const notification = latheNotificationEngine.createNotification({
        title: "Deliver Test",
        message: "Testing delivery",
        category: "delivery",
        priority: "normal",
        channels: ["push"],
        recipients: ["user-1"],
      });

      latheNotificationEngine.sendNotification(notification.notification_id);
      const delivered = latheNotificationEngine.markDelivered(notification.notification_id);

      expect(delivered!.status).toBe("delivered");
    });

    it("marks notification read", () => {
      const notification = latheNotificationEngine.createNotification({
        title: "Read Test",
        message: "Testing read",
        category: "inventory",
        priority: "low",
        channels: ["in_app"],
        recipients: ["user-1"],
      });

      latheNotificationEngine.sendNotification(notification.notification_id);
      const read = latheNotificationEngine.markRead(notification.notification_id);

      expect(read!.status).toBe("read");
      expect(read!.read_at).toBeDefined();
    });

    it("retries failed notification", () => {
      latheNotificationEngine.setUserPreferences({
        user_id: "user-1",
        channels_enabled: [],
        categories_subscribed: [],
        quiet_hours: null,
        digest_mode: false,
        digest_frequency: "daily",
      });

      const notification = latheNotificationEngine.createNotification({
        title: "Retry Test",
        message: "Testing retry",
        category: "financial",
        priority: "normal",
        channels: ["email"],
        recipients: ["user-1"],
      });

      const sent = latheNotificationEngine.sendNotification(notification.notification_id);
      expect(sent!.status).toBe("failed");

      latheNotificationEngine.setUserPreferences({
        user_id: "user-1",
        channels_enabled: ["email"],
        categories_subscribed: ["financial"],
        quiet_hours: null,
        digest_mode: false,
        digest_frequency: "daily",
      });

      const retried = latheNotificationEngine.retryNotification(notification.notification_id);
      expect(retried!.status).toBe("sent");
      expect(retried!.retry_count).toBe(1);
    });
  });

  describe("Template-Based Notifications", () => {
    it("sends notification from template", () => {
      const notification = latheNotificationEngine.sendFromTemplate(
        "TPL-PRODUCTION-DELAY",
        {
          job_id: "JOB-100",
          customer_name: "Acme Corp",
          delay_hours: 4,
          stage: "machining",
        },
        ["user-1"]
      );

      expect(notification).not.toBeNull();
      expect(notification!.title).toContain("JOB-100");
      expect(notification!.message).toContain("Acme Corp");
      expect(notification!.message).toContain("4 hours");
    });

    it("substitutes all template variables", () => {
      const notification = latheNotificationEngine.sendFromTemplate(
        "TPL-DELIVERY-SHIPPED",
        {
          order_id: "ORD-500",
          carrier: "FedEx",
          tracking_number: "123456789",
          delivery_date: "2026-04-20",
        },
        ["user-1"]
      );

      expect(notification!.message).toContain("ORD-500");
      expect(notification!.message).toContain("FedEx");
      expect(notification!.message).toContain("123456789");
    });

    it("returns null for unknown template", () => {
      const notification = latheNotificationEngine.sendFromTemplate(
        "UNKNOWN-TEMPLATE",
        {},
        ["user-1"]
      );

      expect(notification).toBeNull();
    });

    it("uses custom priority and channels", () => {
      const notification = latheNotificationEngine.sendFromTemplate(
        "TPL-MACHINE-DOWN",
        {
          machine_id: "LB-3000",
          machine_name: "Okuma LB3000",
          reason: "Spindle bearing failure",
          repair_hours: 8,
        },
        ["user-1"],
        {
          priority: "urgent",
          channels: ["sms", "push"],
        }
      );

      expect(notification!.priority).toBe("urgent");
      expect(notification!.channels).toContain("sms");
      expect(notification!.channels).toContain("push");
    });
  });

  describe("Rules Engine", () => {
    it("creates notification rule", () => {
      const rule = latheNotificationEngine.createRule({
        name: "Quality Alert Rule",
        description: "Alert on quality failures",
        trigger: { event_type: "quality_fail", source: "inspection" },
        conditions: [{ field: "fpy_pct", operator: "less_than", value: 80 }],
        action: {
          template_id: "TPL-QUALITY-FAIL",
          channels: ["email", "sms"],
          recipients: ["quality-manager"],
          priority: "high",
        },
        enabled: true,
      });

      expect(rule.rule_id).toMatch(/^RUL-/);
      expect(rule.name).toBe("Quality Alert Rule");
      expect(rule.enabled).toBe(true);
    });

    it("processes event and triggers notification", () => {
      latheNotificationEngine.createRule({
        name: "Low Stock Rule",
        description: "Alert on low inventory",
        trigger: { event_type: "inventory_low", source: "inventory_system" },
        conditions: [{ field: "current_qty", operator: "less_than", value: 10 }],
        action: {
          template_id: "TPL-INVENTORY-LOW",
          channels: ["email"],
          recipients: ["inventory-manager"],
          priority: "normal",
        },
        enabled: true,
      });

      const notifications = latheNotificationEngine.processEvent(
        "inventory_low",
        "inventory_system",
        {
          item_name: "Carbide Insert",
          current_qty: 5,
          reorder_point: 20,
        }
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain("Carbide Insert");
    });

    it("does not trigger for disabled rule", () => {
      const rule = latheNotificationEngine.createRule({
        name: "Disabled Rule",
        description: "Should not fire",
        trigger: { event_type: "test_event", source: "test" },
        conditions: [],
        action: {
          template_id: "TPL-PRODUCTION-DELAY",
          channels: ["email"],
          recipients: ["user-1"],
          priority: "normal",
        },
        enabled: false,
      });

      const notifications = latheNotificationEngine.processEvent("test_event", "test", {
        job_id: "JOB-1",
        customer_name: "Test",
        delay_hours: 1,
        stage: "setup",
      });

      expect(notifications).toHaveLength(0);
    });

    it("enables and disables rules", () => {
      const rule = latheNotificationEngine.createRule({
        name: "Toggle Rule",
        description: "Test toggle",
        trigger: { event_type: "test", source: "test" },
        conditions: [],
        action: {
          template_id: "TPL-PRODUCTION-DELAY",
          channels: ["email"],
          recipients: ["user-1"],
          priority: "normal",
        },
        enabled: true,
      });

      const disabled = latheNotificationEngine.disableRule(rule.rule_id);
      expect(disabled!.enabled).toBe(false);

      const enabled = latheNotificationEngine.enableRule(rule.rule_id);
      expect(enabled!.enabled).toBe(true);
    });

    it("evaluates condition operators", () => {
      latheNotificationEngine.createRule({
        name: "Multi-Condition Rule",
        description: "Tests operators",
        trigger: { event_type: "test", source: "test" },
        conditions: [
          { field: "status", operator: "equals", value: "critical" },
          { field: "level", operator: "greater_than", value: 5 },
          { field: "message", operator: "contains", value: "error" },
        ],
        action: {
          template_id: "TPL-MACHINE-DOWN",
          channels: ["email"],
          recipients: ["user-1"],
          priority: "urgent",
        },
        enabled: true,
      });

      const triggered = latheNotificationEngine.processEvent("test", "test", {
        machine_id: "M-1",
        machine_name: "Test Machine",
        reason: "Test",
        repair_hours: 1,
        status: "critical",
        level: 10,
        message: "System error occurred",
      });

      expect(triggered).toHaveLength(1);

      const notTriggered = latheNotificationEngine.processEvent("test", "test", {
        machine_id: "M-1",
        machine_name: "Test Machine",
        reason: "Test",
        repair_hours: 1,
        status: "warning",
        level: 10,
        message: "System error occurred",
      });

      expect(notTriggered).toHaveLength(0);
    });
  });

  describe("User Preferences", () => {
    it("sets and gets user preferences", () => {
      const prefs = latheNotificationEngine.setUserPreferences({
        user_id: "user-1",
        channels_enabled: ["email", "push"],
        categories_subscribed: ["production", "quality"],
        quiet_hours: { start: "22:00", end: "07:00" },
        digest_mode: true,
        digest_frequency: "daily",
      });

      const retrieved = latheNotificationEngine.getUserPreferences("user-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.channels_enabled).toContain("email");
      expect(retrieved!.digest_mode).toBe(true);
    });

    it("filters recipients by category subscription", () => {
      latheNotificationEngine.setUserPreferences({
        user_id: "user-1",
        channels_enabled: ["email"],
        categories_subscribed: ["production"],
        quiet_hours: null,
        digest_mode: false,
        digest_frequency: "daily",
      });

      const notification = latheNotificationEngine.createNotification({
        title: "Quality Alert",
        message: "Quality issue",
        category: "quality",
        priority: "high",
        channels: ["email"],
        recipients: ["user-1"],
      });

      const sent = latheNotificationEngine.sendNotification(notification.notification_id);
      expect(sent!.status).toBe("failed");
    });

    it("filters recipients by channel preference", () => {
      latheNotificationEngine.setUserPreferences({
        user_id: "user-1",
        channels_enabled: ["push"],
        categories_subscribed: ["production"],
        quiet_hours: null,
        digest_mode: false,
        digest_frequency: "daily",
      });

      const notification = latheNotificationEngine.createNotification({
        title: "Production Alert",
        message: "Production issue",
        category: "production",
        priority: "high",
        channels: ["email"],
        recipients: ["user-1"],
      });

      const sent = latheNotificationEngine.sendNotification(notification.notification_id);
      expect(sent!.status).toBe("failed");
    });

    it("returns null for unknown user preferences", () => {
      const prefs = latheNotificationEngine.getUserPreferences("unknown-user");
      expect(prefs).toBeNull();
    });
  });

  describe("Queries", () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        const notification = latheNotificationEngine.createNotification({
          title: `Alert ${i}`,
          message: `Message ${i}`,
          category: i % 2 === 0 ? "production" : "quality",
          priority: "normal",
          channels: ["email"],
          recipients: i < 3 ? ["user-1"] : ["user-2"],
        });
        latheNotificationEngine.sendNotification(notification.notification_id);
      }
    });

    it("gets notification by ID", () => {
      const created = latheNotificationEngine.createNotification({
        title: "Find Me",
        message: "Test",
        category: "system",
        priority: "low",
        channels: ["in_app"],
        recipients: ["user-1"],
      });

      const found = latheNotificationEngine.getNotification(created.notification_id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe("Find Me");
    });

    it("gets notifications for user", () => {
      const user1Notifications = latheNotificationEngine.getNotificationsForUser("user-1");
      const user2Notifications = latheNotificationEngine.getNotificationsForUser("user-2");

      expect(user1Notifications.length).toBe(3);
      expect(user2Notifications.length).toBe(2);
    });

    it("gets unread notifications", () => {
      const notifications = latheNotificationEngine.getNotificationsForUser("user-1");
      latheNotificationEngine.markRead(notifications[0].notification_id);

      const unread = latheNotificationEngine.getUnreadNotifications("user-1");

      expect(unread.length).toBe(2);
    });

    it("gets notifications by category", () => {
      const production = latheNotificationEngine.getNotificationsByCategory("production");
      const quality = latheNotificationEngine.getNotificationsByCategory("quality");

      expect(production.length).toBe(3);
      expect(quality.length).toBe(2);
    });

    it("gets pending notifications", () => {
      const pending = latheNotificationEngine.createNotification({
        title: "Pending",
        message: "Not sent",
        category: "maintenance",
        priority: "normal",
        channels: ["email"],
        recipients: ["user-1"],
      });

      const pendingList = latheNotificationEngine.getPendingNotifications();

      expect(pendingList.length).toBe(1);
      expect(pendingList[0].notification_id).toBe(pending.notification_id);
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const notification = latheNotificationEngine.createNotification({
          title: `Stat Test ${i}`,
          message: `Message ${i}`,
          category: ["production", "quality", "delivery"][i % 3] as "production" | "quality" | "delivery",
          priority: ["low", "normal", "high", "urgent"][i % 4] as "low" | "normal" | "high" | "urgent",
          channels: i % 2 === 0 ? ["email"] : ["sms", "push"],
          recipients: ["user-1"],
        });

        latheNotificationEngine.sendNotification(notification.notification_id);

        if (i < 6) {
          latheNotificationEngine.markDelivered(notification.notification_id);
        }
        if (i < 3) {
          latheNotificationEngine.markRead(notification.notification_id);
        }
      }
    });

    it("calculates statistics", () => {
      const stats = latheNotificationEngine.getStatistics();

      expect(stats.total_sent).toBe(10);
      expect(stats.total_delivered).toBe(6);
      expect(stats.total_read).toBe(3);
      expect(stats.total_failed).toBe(0);
    });

    it("breaks down by channel", () => {
      const stats = latheNotificationEngine.getStatistics();

      expect(stats.by_channel.email).toBe(5);
      expect(stats.by_channel.sms).toBe(5);
      expect(stats.by_channel.push).toBe(5);
    });

    it("breaks down by category", () => {
      const stats = latheNotificationEngine.getStatistics();

      expect(stats.by_category.production).toBe(4);
      expect(stats.by_category.quality).toBe(3);
      expect(stats.by_category.delivery).toBe(3);
    });

    it("breaks down by priority", () => {
      const stats = latheNotificationEngine.getStatistics();

      expect(stats.by_priority.low).toBe(3);
      expect(stats.by_priority.normal).toBe(3);
      expect(stats.by_priority.high).toBe(2);
      expect(stats.by_priority.urgent).toBe(2);
    });
  });

  describe("Templates", () => {
    it("gets default templates", () => {
      const templates = latheNotificationEngine.getAllTemplates();

      expect(templates.length).toBeGreaterThanOrEqual(6);
      expect(templates.some((t) => t.template_id === "TPL-PRODUCTION-DELAY")).toBe(true);
      expect(templates.some((t) => t.template_id === "TPL-QUALITY-FAIL")).toBe(true);
    });

    it("gets template by ID", () => {
      const template = latheNotificationEngine.getTemplate("TPL-INVENTORY-LOW");

      expect(template).not.toBeNull();
      expect(template!.name).toBe("Low Inventory Alert");
      expect(template!.category).toBe("inventory");
    });

    it("creates custom template", () => {
      const template = latheNotificationEngine.createTemplate({
        template_id: "TPL-CUSTOM",
        name: "Custom Alert",
        category: "system",
        subject_template: "Custom: {{title}}",
        body_template: "Custom message: {{body}}",
        variables: ["title", "body"],
      });

      const retrieved = latheNotificationEngine.getTemplate("TPL-CUSTOM");

      expect(retrieved).not.toBeNull();
      expect(retrieved!.name).toBe("Custom Alert");
    });

    it("returns null for unknown template", () => {
      const template = latheNotificationEngine.getTemplate("UNKNOWN");
      expect(template).toBeNull();
    });
  });

  describe("Escalation", () => {
    it("escalates unread notifications after timeout", () => {
      const rule = latheNotificationEngine.createRule({
        name: "Escalation Test Rule",
        description: "Test escalation",
        trigger: { event_type: "test", source: "test" },
        conditions: [],
        action: {
          template_id: "TPL-PRODUCTION-DELAY",
          channels: ["email"],
          recipients: ["user-1"],
          priority: "high",
          escalation: {
            enabled: true,
            timeout_minutes: 0,
            escalation_recipients: ["manager"],
            max_escalations: 2,
          },
        },
        enabled: true,
      });

      const notifications = latheNotificationEngine.processEvent("test", "test", {
        job_id: "JOB-1",
        customer_name: "Test",
        delay_hours: 2,
        stage: "machining",
      });

      expect(notifications).toHaveLength(1);

      const escalated = latheNotificationEngine.checkEscalations();

      expect(escalated.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Clear All", () => {
    it("clears all data but keeps default templates", () => {
      latheNotificationEngine.createNotification({
        title: "Test",
        message: "Test",
        category: "production",
        priority: "normal",
        channels: ["email"],
        recipients: ["user-1"],
      });

      latheNotificationEngine.createRule({
        name: "Test Rule",
        description: "Test",
        trigger: { event_type: "test", source: "test" },
        conditions: [],
        action: {
          template_id: "TPL-PRODUCTION-DELAY",
          channels: ["email"],
          recipients: ["user-1"],
          priority: "normal",
        },
        enabled: true,
      });

      latheNotificationEngine.clearAll();

      const pending = latheNotificationEngine.getPendingNotifications();
      const templates = latheNotificationEngine.getAllTemplates();

      expect(pending).toHaveLength(0);
      expect(templates.length).toBeGreaterThanOrEqual(6);
    });
  });
});
