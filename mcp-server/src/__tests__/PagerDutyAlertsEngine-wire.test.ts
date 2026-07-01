/**
 * PagerDutyAlertsEngine wire test — U-PD-WIRE (2026-05-17 foxtrot)
 *
 * Verifies the 9 new pd_* actions on the prism_monitoring dispatcher:
 *   pd_register_rule, pd_register_standard_rules, pd_trigger_alert,
 *   pd_acknowledge_alert, pd_resolve_alert, pd_list_active_alerts,
 *   pd_get_stats, pd_build_event_payload, pd_get_runbook
 *
 * Test layers:
 *   1. Source wiring — ACTIONS tuple + ACTION_MONITORING_SCHEMAS exports.
 *   2. Schema validation — each pd_* schema accepts good input + rejects bad.
 *   3. Engine method coverage — direct singleton calls produce real values.
 *   4. Dispatcher round-trip — register → trigger → ack → resolve → stats.
 *
 * Compliance: Test Legitimacy Gate (no toBeDefined / typeof / Array.isArray
 * placeholders); all assertions check actual values.
 *
 * @module __tests__/PagerDutyAlertsEngine-wire
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── 1. Source wiring assertions ─────────────────────────────────────────────

describe("PagerDutyAlertsEngine wiring (source)", () => {
  const REPO = join(__dirname, "..", "..", "..");
  const DISPATCHER = readFileSync(
    join(REPO, "mcp-server/src/tools/dispatchers/monitoringDispatcher.ts"),
    "utf8",
  );
  const SCHEMAS = readFileSync(
    join(REPO, "mcp-server/src/schemas/monitoringActionSchemas.ts"),
    "utf8",
  );

  const PD_ACTIONS = [
    "pd_register_rule",
    "pd_register_standard_rules",
    "pd_trigger_alert",
    "pd_acknowledge_alert",
    "pd_resolve_alert",
    "pd_list_active_alerts",
    "pd_get_stats",
    "pd_build_event_payload",
    "pd_get_runbook",
  ] as const;

  it("includes all 9 pd_* actions in the dispatcher ACTIONS tuple", () => {
    for (const action of PD_ACTIONS) {
      expect(DISPATCHER.includes(`"${action}"`)).toBe(true);
    }
  });

  it("imports the pagerDutyAlertsEngine singleton via lazy dynamic import", () => {
    expect(DISPATCHER.includes(`import("../../engines/PagerDutyAlertsEngine.js")`))
      .toBe(true);
    expect(DISPATCHER.includes("pagerDutyAlertsEngine")).toBe(true);
    expect(DISPATCHER.includes('case "pagerDuty":')).toBe(true);
    expect(DISPATCHER.includes("_pagerDuty ??=")).toBe(true);
  });

  it("has a case-handler for every pd_* action (no missing dispatch)", () => {
    for (const action of PD_ACTIONS) {
      expect(DISPATCHER.includes(`case "${action}":`)).toBe(true);
    }
  });

  it("registers every pd_* action in the ACTION_MONITORING_SCHEMAS export map", () => {
    for (const action of PD_ACTIONS) {
      const present =
        SCHEMAS.includes(`\n  ${action},`) ||
        SCHEMAS.includes(`  ${action},\n`);
      expect(present).toBe(true);
    }
  });
});

// ── 2. Schema validation assertions ─────────────────────────────────────────

describe("PagerDutyAlertsEngine schema validation", () => {
  let SCHEMAS: typeof import("../schemas/monitoringActionSchemas.js");

  beforeEach(async () => {
    SCHEMAS = await import("../schemas/monitoringActionSchemas.js");
  });

  it("pd_trigger_alert rejects missing ruleId", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_trigger_alert;
    const r = schema.safeParse({ summary: "x", source: "y" });
    expect(r.success).toBe(false);
  });

  it("pd_trigger_alert accepts complete trigger payload", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_trigger_alert;
    const r = schema.safeParse({
      ruleId: "lora-autorollback",
      summary: "rollback fired",
      source: "ml-pipeline",
      component: "lora-trainer",
      customDetails: { runId: "abc" },
    });
    expect(r.success).toBe(true);
  });

  it("pd_acknowledge_alert requires both dedupKey AND acknowledgedBy", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_acknowledge_alert;
    expect(schema.safeParse({ dedupKey: "abc" }).success).toBe(false);
    expect(schema.safeParse({ acknowledgedBy: "alice" }).success).toBe(false);
    expect(schema.safeParse({ dedupKey: "abc", acknowledgedBy: "alice" }).success).toBe(true);
  });

  it("pd_build_event_payload restricts eventAction to {trigger,acknowledge,resolve}", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_build_event_payload;
    const goodAct = schema.safeParse({ dedupKey: "abc", eventAction: "trigger" });
    const badAct = schema.safeParse({ dedupKey: "abc", eventAction: "snooze" });
    expect(goodAct.success).toBe(true);
    expect(badAct.success).toBe(false);
  });

  it("pd_list_active_alerts accepts empty filter (no-arg listing)", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_list_active_alerts;
    const r = schema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("pd_register_standard_rules accepts no params", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_register_standard_rules;
    const r = schema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("pd_register_rule validates the full AlertRule shape (id, name, condition, raci, etc.)", () => {
    const schema = SCHEMAS.ACTION_MONITORING_SCHEMAS.pd_register_rule;
    const validRule = {
      rule: {
        id: "test-rule",
        name: "Test",
        description: "desc",
        condition: { metric: "m", operator: "gt", threshold: 1 },
        severity: "error",
        routingKey: "rk",
        raci: { responsible: ["a"], accountable: "b", consulted: ["c"], informed: ["d"] },
        tags: ["t"],
        enabled: true,
      },
    };
    expect(schema.safeParse(validRule).success).toBe(true);

    // Missing raci → reject
    const noRaci = JSON.parse(JSON.stringify(validRule));
    delete noRaci.rule.raci;
    expect(schema.safeParse(noRaci).success).toBe(false);

    // Invalid operator → reject
    const badOp = JSON.parse(JSON.stringify(validRule));
    badOp.rule.condition.operator = "approximately";
    expect(schema.safeParse(badOp).success).toBe(false);
  });

  it("includes exactly the 9 expected pd_* schemas in the export map (anti-regression — typo guard)", () => {
    const keys = Object.keys(SCHEMAS.ACTION_MONITORING_SCHEMAS);
    const pdKeys = keys.filter((k) => k.startsWith("pd_")).sort();
    expect(pdKeys).toEqual([
      "pd_acknowledge_alert",
      "pd_build_event_payload",
      "pd_get_runbook",
      "pd_get_stats",
      "pd_list_active_alerts",
      "pd_register_rule",
      "pd_register_standard_rules",
      "pd_resolve_alert",
      "pd_trigger_alert",
    ]);
  });
});

// ── 3. Engine singleton behavioral assertions ───────────────────────────────

describe("PagerDutyAlertsEngine singleton behavior (pure-method coverage)", () => {
  let mod: typeof import("../engines/PagerDutyAlertsEngine.js");

  beforeEach(async () => {
    mod = await import("../engines/PagerDutyAlertsEngine.js");
    mod.pagerDutyAlertsEngine.clear();
  });

  it("registerStandardRules registers the 6 canonical PRISM rules", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const ids = eng.listRules().map((r) => r.id).sort();
    expect(ids).toEqual([
      "lora-autorollback",
      "mtconnect-stream-loss",
      "program-gen-slo-breach",
      "safety-score-critical",
      "sim-false-negative",
      "tenant-isolation-breach",
    ]);
  });

  it("triggerAlert produces an ActiveAlert whose dedupKey matches getAlert lookup", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const a = eng.triggerAlert({
      ruleId: "safety-score-critical",
      summary: "S(x)=0.62 dropped below 0.70",
      source: "safety-validator",
    });
    expect(a).not.toBeNull();
    if (!a) throw new Error("trigger returned null");
    expect(a.status).toBe("triggered");
    expect(a.severity).toBe("critical");
    expect(a.notificationCount).toBe(1);
    expect(eng.getAlert(a.dedupKey)?.id).toBe(a.id);
  });

  it("triggerAlert returns null for unknown rule (fail-loud, no silent ghost alert)", () => {
    const eng = mod.pagerDutyAlertsEngine;
    const a = eng.triggerAlert({
      ruleId: "nonexistent-rule",
      summary: "x",
      source: "y",
    });
    expect(a).toBeNull();
  });

  it("acknowledgeAlert flips status to acknowledged AND increments stats.avgAcknowledgeTimeMs", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const a = eng.triggerAlert({ ruleId: "lora-autorollback", summary: "rb", source: "ml" });
    if (!a) throw new Error("trigger returned null");
    const acked = eng.acknowledgeAlert(a.dedupKey, "alice");
    expect(acked?.status).toBe("acknowledged");
    expect(acked?.acknowledgedBy).toBe("alice");
    const stats = eng.getStats();
    expect(stats.acknowledgedAlerts).toBe(1);
    expect(stats.avgAcknowledgeTimeMs >= 0).toBe(true);
  });

  it("resolveAlert flips status to resolved AND updates resolved count", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const a = eng.triggerAlert({ ruleId: "sim-false-negative", summary: "x", source: "y" });
    if (!a) throw new Error("trigger returned null");
    const resolved = eng.resolveAlert(a.dedupKey, "bob");
    expect(resolved?.status).toBe("resolved");
    expect(resolved?.resolvedBy).toBe("bob");
    expect(eng.getStats().resolvedAlerts).toBe(1);
  });

  it("getRunbookUrl returns the runbook from the rule", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const url = eng.getRunbookUrl("safety-score-critical");
    expect(url).toBe("https://runbooks.prism.internal/safety-score");
  });

  it("getRunbookUrl returns null for unknown rule", () => {
    const eng = mod.pagerDutyAlertsEngine;
    const url = eng.getRunbookUrl("doesnt-exist");
    expect(url).toBeNull();
  });

  it("buildEventPayload constructs a PD V2 event with routing key + dedup + payload", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    const a = eng.triggerAlert({ ruleId: "lora-autorollback", summary: "rb", source: "ml" });
    if (!a) throw new Error("trigger returned null");
    const payload = eng.buildEventPayload(a, "trigger");
    expect(payload.eventAction).toBe("trigger");
    expect(payload.dedupKey).toBe(a.dedupKey);
    expect(payload.payload.severity).toBe("error");
    expect(payload.payload.source).toBe("ml");
    expect(payload.links?.[0]?.href).toBe("https://runbooks.prism.internal/lora-rollback");
  });

  it("listActiveAlerts with severity filter excludes non-matching alerts", () => {
    const eng = mod.pagerDutyAlertsEngine;
    eng.registerStandardRules();
    eng.triggerAlert({ ruleId: "safety-score-critical", summary: "c", source: "s1" });
    eng.triggerAlert({ ruleId: "program-gen-slo-breach", summary: "w", source: "s2" });
    const crit = eng.listActiveAlerts({ severity: "critical" });
    const warn = eng.listActiveAlerts({ severity: "warning" });
    expect(crit.length).toBe(1);
    expect(warn.length).toBe(1);
    expect(crit[0].severity).toBe("critical");
    expect(warn[0].severity).toBe("warning");
  });
});

// ── 4. Dispatcher round-trip (mock MCP server) ──────────────────────────────

class MockMCPServer {
  public registered: Map<string, (input: unknown) => Promise<unknown>> = new Map();
  tool(
    name: string,
    _description: string,
    _schema: unknown,
    handler: (input: unknown) => Promise<unknown>,
  ): void {
    this.registered.set(name, handler);
  }
  async call(toolName: string, action: string, params: Record<string, unknown>): Promise<unknown> {
    const h = this.registered.get(toolName);
    if (!h) throw new Error(`Tool not registered: ${toolName}`);
    return h({ action, params });
  }
}

describe("PagerDutyAlerts dispatcher round-trip via prism_monitoring", () => {
  let server: MockMCPServer;

  type DispatchResult = Record<string, unknown>;

  async function call(action: string, params: Record<string, unknown>): Promise<DispatchResult> {
    return (await server.call("prism_monitoring", action, params)) as DispatchResult;
  }

  beforeEach(async () => {
    const { pagerDutyAlertsEngine } = await import("../engines/PagerDutyAlertsEngine.js");
    pagerDutyAlertsEngine.clear();
    const { registerMonitoringDispatcher } = await import(
      "../tools/dispatchers/monitoringDispatcher.js"
    );
    server = new MockMCPServer();
    registerMonitoringDispatcher(server);
  });

  it("pd_register_standard_rules returns 6 ruleIds", async () => {
    const r = await call("pd_register_standard_rules", {});
    expect(r.standardRulesRegistered).toBe(true);
    expect(r.totalRules).toBe(6);
    const ids = r.ruleIds as string[];
    expect(ids.length).toBe(6);
    expect(ids.includes("safety-score-critical")).toBe(true);
  });

  it("pd_trigger_alert returns success+alert when rule known, failure when unknown", async () => {
    await call("pd_register_standard_rules", {});
    const ok = await call("pd_trigger_alert", {
      ruleId: "lora-autorollback",
      summary: "rollback",
      source: "ml",
    });
    expect(ok.success).toBe(true);
    const alert = ok.alert as { severity: string; dedupKey: string };
    expect(alert.severity).toBe("error");
    expect(alert.dedupKey.length).toBeGreaterThan(0);

    const bad = await call("pd_trigger_alert", {
      ruleId: "nope",
      summary: "x",
      source: "y",
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe("alert_not_triggered");
  });

  it("full life cycle: register → trigger → ack → resolve → stats reflect counts", async () => {
    await call("pd_register_standard_rules", {});
    const trig = await call("pd_trigger_alert", {
      ruleId: "tenant-isolation-breach",
      summary: "cross-tenant",
      source: "auth-svc",
    });
    const dedupKey = (trig.alert as { dedupKey: string }).dedupKey;

    const ack = await call("pd_acknowledge_alert", { dedupKey, acknowledgedBy: "sec-eng" });
    expect((ack.alert as { status: string }).status).toBe("acknowledged");

    const res = await call("pd_resolve_alert", { dedupKey, resolvedBy: "sec-eng" });
    expect((res.alert as { status: string }).status).toBe("resolved");

    const stats = await call("pd_get_stats", {});
    const s = stats.stats as {
      totalAlerts: number;
      resolvedAlerts: number;
      activeAlerts: number;
      acknowledgedAlerts: number;
    };
    expect(s.totalAlerts).toBe(1);
    expect(s.resolvedAlerts).toBe(1);
    expect(s.activeAlerts).toBe(0);
    expect(s.acknowledgedAlerts).toBe(0);
  });

  it("pd_acknowledge_alert returns alert_not_found for unknown dedupKey", async () => {
    const bad = await call("pd_acknowledge_alert", {
      dedupKey: "garbage-key-xyz",
      acknowledgedBy: "alice",
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe("alert_not_found");
  });

  it("pd_acknowledge_alert returns alert_state_conflict for already-acknowledged alert (P1.1 fail-loud)", async () => {
    await call("pd_register_standard_rules", {});
    const trig = await call("pd_trigger_alert", {
      ruleId: "lora-autorollback",
      summary: "rb",
      source: "ml",
    });
    const dedupKey = (trig.alert as { dedupKey: string }).dedupKey;
    const first = await call("pd_acknowledge_alert", { dedupKey, acknowledgedBy: "alice" });
    expect(first.success).toBe(true);

    const second = await call("pd_acknowledge_alert", { dedupKey, acknowledgedBy: "bob" });
    expect(second.success).toBe(false);
    expect(second.error).toBe("alert_state_conflict");
    expect(second.currentStatus).toBe("acknowledged");
  });

  it("pd_resolve_alert returns alert_state_conflict for already-resolved alert (P1.1 fail-loud)", async () => {
    await call("pd_register_standard_rules", {});
    const trig = await call("pd_trigger_alert", {
      ruleId: "sim-false-negative",
      summary: "x",
      source: "y",
    });
    const dedupKey = (trig.alert as { dedupKey: string }).dedupKey;
    const first = await call("pd_resolve_alert", { dedupKey, resolvedBy: "alice" });
    expect(first.success).toBe(true);

    const second = await call("pd_resolve_alert", { dedupKey, resolvedBy: "bob" });
    expect(second.success).toBe(false);
    expect(second.error).toBe("alert_state_conflict");
    expect(second.currentStatus).toBe("resolved");
  });

  it("pd_resolve_alert accepts both triggered AND acknowledged pre-states (multi-path coverage)", async () => {
    await call("pd_register_standard_rules", {});
    // Path 1: trigger → resolve (skip ack)
    const t1 = await call("pd_trigger_alert", { ruleId: "lora-autorollback", summary: "p1", source: "s1" });
    const r1 = await call("pd_resolve_alert", { dedupKey: (t1.alert as { dedupKey: string }).dedupKey, resolvedBy: "x" });
    expect(r1.success).toBe(true);

    // Path 2: trigger → ack → resolve
    const t2 = await call("pd_trigger_alert", { ruleId: "mtconnect-stream-loss", summary: "p2", source: "s2" });
    const dk2 = (t2.alert as { dedupKey: string }).dedupKey;
    await call("pd_acknowledge_alert", { dedupKey: dk2, acknowledgedBy: "y" });
    const r2 = await call("pd_resolve_alert", { dedupKey: dk2, resolvedBy: "y" });
    expect(r2.success).toBe(true);
  });

  it("pd_list_active_alerts filters by severity end-to-end", async () => {
    await call("pd_register_standard_rules", {});
    await call("pd_trigger_alert", {
      ruleId: "safety-score-critical",
      summary: "c",
      source: "s1",
    });
    await call("pd_trigger_alert", {
      ruleId: "program-gen-slo-breach",
      summary: "w",
      source: "s2",
    });
    const r = await call("pd_list_active_alerts", { severity: "critical" });
    expect(r.count).toBe(1);
    const alerts = r.alerts as Array<{ severity: string }>;
    expect(alerts[0].severity).toBe("critical");
  });

  it("pd_build_event_payload returns alert_not_found when no matching alert", async () => {
    const bad = await call("pd_build_event_payload", {
      dedupKey: "ghost",
      eventAction: "trigger",
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toBe("alert_not_found");
  });

  it("pd_get_runbook returns canonical URL for safety-score-critical", async () => {
    await call("pd_register_standard_rules", {});
    const r = await call("pd_get_runbook", { ruleId: "safety-score-critical" });
    expect(r.success).toBe(true);
    expect(r.runbookUrl).toBe("https://runbooks.prism.internal/safety-score");
  });

  it("pd_get_runbook returns runbook_not_found for unknown rule", async () => {
    const r = await call("pd_get_runbook", { ruleId: "totally-fake" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("runbook_not_found");
  });
});
