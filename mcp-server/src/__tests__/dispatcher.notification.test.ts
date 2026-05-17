/**
 * dispatcher.notification.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-NE (NotificationEngine).
 *
 * Drives 6 read actions through real `prism_dev`. Write methods
 * (send/markRead/markDelivered/registerTemplate/setPreferences/clear)
 * DEFERRED — LLM-callable send() would let one chat fake notifications
 * to other employees.
 *
 * Tests pre-seed via engine-direct send/registerTemplate/setPreferences
 * so dispatcher reads find populated state. Test fixtures use unique
 * Date.now()-suffixed recipients to avoid collision with peer chats.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { notificationEngine } from "../engines/NotificationEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

const TEST_RECIPIENT = "test-recipient-" + Date.now();
const TEST_EMPLOYEE = "test-employee-" + Date.now();
const TEST_TEMPLATE_ID = "test-template-" + Date.now();

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  // Seed via deferred writes — test isolation.
  notificationEngine.registerTemplate({
    id: TEST_TEMPLATE_ID,
    name: "Test template",
    channel: "in_app",
    subject_template: "Hello {name}",
    body_template: "Body for {name}",
  });

  // Send 3 notifications spanning 2 priorities + 2 channels
  notificationEngine.send(TEST_RECIPIENT, "Alert subject 1", "Alert body 1", {
    channel: "in_app",
    priority: "high",
  });
  notificationEngine.send(TEST_RECIPIENT, "Email subject", "Email body", {
    channel: "email",
    priority: "normal",
  });
  notificationEngine.send(TEST_RECIPIENT, "Critical alert", "Critical body", {
    channel: "in_app",
    priority: "critical",
  });

  // Send to a different employee for in-app/unread-count tests
  notificationEngine.send(TEST_EMPLOYEE, "Test in-app msg", "Test in-app body", {
    channel: "in_app",
    priority: "normal",
  });

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterAll(() => {
  // Best-effort: engine has no per-recipient delete; the global clear()
  // would wipe production state too, so we leave test fixtures.
  // Test ids are timestamp-suffixed so no collision risk on subsequent runs.
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — Zod schemas", () => {
  it("ne_list requires non-empty recipient", () => {
    expect(ACTION_DEV_SCHEMAS["ne_list"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ne_list"].safeParse({ recipient: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ne_list"].safeParse({ recipient: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ne_list"].safeParse({ recipient: "x", unread_only: true }).success).toBe(true);
  });

  it("ne_get_preferences / ne_get_in_app_notifications / ne_get_unread_count require employee_id", () => {
    for (const a of ["ne_get_preferences", "ne_get_in_app_notifications", "ne_get_unread_count"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ employee_id: "" }).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ employee_id: "emp-1" }).success).toBe(true);
    }
  });

  it("ne_list_templates / ne_stats accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["ne_list_templates"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ne_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — prism_dev :: ne_list", () => {
  it("seeded recipient → 3 notifications (count parity + correct recipient echo)", async () => {
    const r = await invokeHandler(devHandler, "ne_list", { recipient: TEST_RECIPIENT });
    expect((r as { recipient?: string }).recipient).toBe(TEST_RECIPIENT);
    expect((r as { count?: number }).count).toBe(3);
    const notifications = ((r as { notifications?: Array<{ subject: string; priority: string }> }).notifications) ?? [];
    expect(notifications.length).toBe(3);
    const subjects = notifications.map(n => n.subject).sort();
    expect(subjects).toEqual(["Alert subject 1", "Critical alert", "Email subject"]);
  });

  it("VARIABILITY — 3 distinct priorities (critical / high / normal) all present", async () => {
    const r = await invokeHandler(devHandler, "ne_list", { recipient: TEST_RECIPIENT });
    const notifications = ((r as { notifications: Array<{ priority: string }> }).notifications) ?? [];
    const priorities = new Set(notifications.map(n => n.priority));
    expect(priorities.has("critical")).toBe(true);
    expect(priorities.has("high")).toBe(true);
    expect(priorities.has("normal")).toBe(true);
  });

  it("unknown recipient → count:0", async () => {
    const r = await invokeHandler(devHandler, "ne_list", { recipient: "no-such-recipient-" + Date.now() });
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });

  it("ROUTING PROOF — wire subject set equals engine-direct list()", async () => {
    const r = await invokeHandler(devHandler, "ne_list", { recipient: TEST_RECIPIENT });
    const wireSubjects = (((r as { notifications?: Array<{ subject: string }> }).notifications) ?? []).map(n => n.subject).sort();
    const directSubjects = notificationEngine.list(TEST_RECIPIENT).map(n => n.subject).slice().sort();
    expect(wireSubjects).toEqual(directSubjects);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — prism_dev :: ne_list_templates", () => {
  it("contains seeded TEST_TEMPLATE_ID", async () => {
    const r = await invokeHandler(devHandler, "ne_list_templates", {});
    const templates = ((r as { templates?: Array<{ id: string; name: string; channel: string }> }).templates) ?? [];
    const found = templates.find(t => t.id === TEST_TEMPLATE_ID);
    if (!found) throw new Error(`seeded template ${TEST_TEMPLATE_ID} not present in list`);
    expect(found.name).toBe("Test template");
    expect(found.channel).toBe("in_app");
    expect((r as { count?: number }).count).toBe(templates.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — prism_dev :: ne_stats", () => {
  it("stats.total_sent ≥ 4 (we seeded 4) + delivery/read pct in [0,100]", async () => {
    const r = await invokeHandler(devHandler, "ne_stats", {});
    const s = (r as { stats: { total_sent: number; total_delivered: number; total_failed: number; total_read: number; delivery_rate_pct: number; read_rate_pct: number; by_channel: Record<string, number>; by_priority: Record<string, number> } }).stats;
    expect(s.total_sent).toBeGreaterThanOrEqual(4);
    expect(s.delivery_rate_pct).toBeGreaterThanOrEqual(0);
    expect(s.delivery_rate_pct).toBeLessThanOrEqual(100);
    expect(s.read_rate_pct).toBeGreaterThanOrEqual(0);
    expect(s.read_rate_pct).toBeLessThanOrEqual(100);
    // Our 4 sends span at least 2 distinct channels
    const channels = Object.keys(s.by_channel ?? {}).filter(k => (s.by_channel[k] ?? 0) > 0);
    expect(channels.length).toBeGreaterThanOrEqual(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — prism_dev :: ne_get_preferences", () => {
  it("returns NotificationPreferences object even for unseen employee (defaults)", async () => {
    const employee_id = "unseen-employee-" + Date.now();
    const r = await invokeHandler(devHandler, "ne_get_preferences", { employee_id });
    expect((r as { employee_id?: string }).employee_id).toBe(employee_id);
    const prefs = (r as { preferences: Record<string, unknown> }).preferences;
    expect(typeof prefs).toBe("object");
    expect(prefs === null).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — prism_dev :: ne_get_in_app_notifications + ne_get_unread_count", () => {
  it("in_app_notifications returns only the in_app channel notifications for employee", async () => {
    const r = await invokeHandler(devHandler, "ne_get_in_app_notifications", { employee_id: TEST_EMPLOYEE });
    const notifications = ((r as { notifications?: Array<{ channel: string }> }).notifications) ?? [];
    for (const n of notifications) {
      expect(n.channel).toBe("in_app");
    }
    expect((r as { count?: number }).count).toBe(notifications.length);
  });

  it("unread_count for seeded employee ≥ 1 (we sent 1 in_app notif)", async () => {
    const r = await invokeHandler(devHandler, "ne_get_unread_count", { employee_id: TEST_EMPLOYEE });
    const c = (r as { unread_count?: number }).unread_count ?? 0;
    expect(c).toBeGreaterThanOrEqual(1);
  });

  it("ROUTING PROOF — wire unread_count number-equals engine-direct getUnreadCount()", async () => {
    const r = await invokeHandler(devHandler, "ne_get_unread_count", { employee_id: TEST_EMPLOYEE });
    const wire = (r as { unread_count?: number }).unread_count;
    const direct = notificationEngine.getUnreadCount(TEST_EMPLOYEE);
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-NE — error envelope", () => {
  it("ne_list without recipient → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ne_list", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ne_get_unread_count with empty employee_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ne_get_unread_count", { employee_id: "" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ne_get_preferences without employee_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ne_get_preferences", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
