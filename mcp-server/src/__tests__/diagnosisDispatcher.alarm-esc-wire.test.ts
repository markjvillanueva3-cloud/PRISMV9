/**
 * diagnosisDispatcher.alarm-esc-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-ALARM-ESCALATION —
 * round-trip wire tests for the 7 new actions wrapping
 * AlarmEscalationEngine through prism_diagnosis.
 *
 * AlarmEscalationEngine is a process-wide singleton with in-memory
 * state (Map of alarms + rules + setTimeout escalation timers).
 * These tests exercise the full state machine: trigger → acknowledge,
 * trigger → resolve, list active/history, and surface stats.
 *
 * Test isolation: each test triggers fresh alarms with unique
 * sources/messages so collisions across tests are avoided. The engine
 * has NO reset() method so we work AROUND the persistent state.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDiagnosisDispatcher } from "../tools/dispatchers/diagnosisDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDiagnosisDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

describe("prism_diagnosis alarm_esc_* wire (OBSIDIAN-PRISM-OS-MS0)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  // ---------------------------------------------------------------------
  // alarm_esc_rules + alarm_esc_stats — pre-conditions verify defaults
  // ---------------------------------------------------------------------

  describe("alarm_esc_rules", () => {
    it("returns the default rule set with all 5 documented rules", async () => {
      const r = await call(handler, "alarm_esc_rules", {});
      expect(r.success).toBe(true);
      expect(r.count).toBeGreaterThanOrEqual(5);
      const ruleIds = r.rules.map((rule: any) => rule.id);
      expect(ruleIds).toContain("SPINDLE_OVERLOAD");
      expect(ruleIds).toContain("TOOL_LIFE_LOW");
      expect(ruleIds).toContain("COOLANT_LOW");
      expect(ruleIds).toContain("MACHINE_CRASH");
      expect(ruleIds).toContain("SAFETY_SCORE_LOW");
    });

    it("includes severity + escalation metadata on each rule", async () => {
      const r = await call(handler, "alarm_esc_rules", {});
      expect(r.success).toBe(true);
      const spindle = r.rules.find((rule: any) => rule.id === "SPINDLE_OVERLOAD");
      expect(spindle.severity).toBe("critical");
      expect(spindle.escalate_to).toBe("emergency");
      expect(spindle.escalation_delay_sec).toBe(30);
      expect(Array.isArray(spindle.notify_channels)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // alarm_esc_trigger → alarm_esc_active → alarm_esc_acknowledge
  // ---------------------------------------------------------------------

  describe("trigger → active → acknowledge flow", () => {
    it("trigger creates an alarm with ALM-NNNNNN id + inherits rule severity", async () => {
      const r = await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW",
        source: "machine:test-iter3-1",
        message: "test trigger creates id",
        details: { coolant_pct: 12 },
      });
      expect(r.success).toBe(true);
      expect(r.alarm.id).toMatch(/^ALM-\d{6}$/);
      expect(r.alarm.severity).toBe("warn");
      expect(r.alarm.state).toBe("active");
      expect(r.alarm.source).toBe("machine:test-iter3-1");
      expect(r.alarm.details.coolant_pct).toBe(12);
      expect(r.alarm.escalation_count).toBe(0);
    });

    it("trigger with unknown rule_id falls back to 'warn' severity", async () => {
      const r = await call(handler, "alarm_esc_trigger", {
        rule_id: "UNKNOWN_RULE_XYZ_iter3",
        source: "machine:test-iter3-2",
        message: "fallback severity test",
      });
      expect(r.success).toBe(true);
      expect(r.alarm.severity).toBe("warn");
    });

    it("acknowledge moves alarm from active → acknowledged", async () => {
      const trig = await call(handler, "alarm_esc_trigger", {
        rule_id: "TOOL_LIFE_LOW",
        source: "machine:test-iter3-3",
        message: "ack flow test",
      });
      expect(trig.success).toBe(true);
      const ack = await call(handler, "alarm_esc_acknowledge", {
        alarm_id: trig.alarm.id,
        user_id: "wire-test-operator",
      });
      expect(ack.success).toBe(true);
      expect(ack.alarm.state).toBe("acknowledged");
      expect(ack.alarm.acknowledged_by).toBe("wire-test-operator");
      expect(typeof ack.alarm.acknowledged_at).toBe("string");
    });

    it("acknowledge of non-existent alarm returns success:false", async () => {
      const r = await call(handler, "alarm_esc_acknowledge", {
        alarm_id: "ALM-999999",
        user_id: "wire-test-operator",
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("alarm_not_found_or_not_active");
    });

    it("double-acknowledge same alarm returns not-active error", async () => {
      const trig = await call(handler, "alarm_esc_trigger", {
        rule_id: "TOOL_LIFE_LOW",
        source: "machine:test-iter3-4",
        message: "double-ack test",
      });
      await call(handler, "alarm_esc_acknowledge", {
        alarm_id: trig.alarm.id,
        user_id: "operator-a",
      });
      const second = await call(handler, "alarm_esc_acknowledge", {
        alarm_id: trig.alarm.id,
        user_id: "operator-b",
      });
      expect(second.success).toBe(false);
      expect(second.error).toBe("alarm_not_found_or_not_active");
    });
  });

  // ---------------------------------------------------------------------
  // alarm_esc_resolve
  // ---------------------------------------------------------------------

  describe("alarm_esc_resolve", () => {
    it("resolves an active alarm", async () => {
      const trig = await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW",
        source: "machine:test-iter3-resolve-1",
        message: "resolve test",
      });
      const r = await call(handler, "alarm_esc_resolve", {
        alarm_id: trig.alarm.id,
      });
      expect(r.success).toBe(true);
      expect(r.alarm.state).toBe("resolved");
      expect(typeof r.alarm.resolved_at).toBe("string");
    });

    it("resolve of non-existent alarm returns success:false", async () => {
      const r = await call(handler, "alarm_esc_resolve", {
        alarm_id: "ALM-000000-does-not-exist",
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("alarm_not_found");
    });
  });

  // ---------------------------------------------------------------------
  // alarm_esc_active — filter by severity / source
  // ---------------------------------------------------------------------

  describe("alarm_esc_active", () => {
    it("returns active alarms sorted by severity (emergency first)", async () => {
      // Trigger one of each severity so the sort is observable
      await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW", // warn
        source: "machine:sort-iter3-warn",
        message: "warn-tier",
      });
      await call(handler, "alarm_esc_trigger", {
        rule_id: "SPINDLE_OVERLOAD", // critical
        source: "machine:sort-iter3-crit",
        message: "critical-tier",
      });
      const r = await call(handler, "alarm_esc_active", {});
      expect(r.success).toBe(true);
      expect(r.count).toBeGreaterThanOrEqual(2);
      // Severity sort: emergency=0, critical=1, warn=2, info=3 — critical < warn
      const sevOrder = { emergency: 0, critical: 1, warn: 2, info: 3 } as const;
      for (let i = 1; i < r.alarms.length; i++) {
        const prev = sevOrder[r.alarms[i - 1].severity as keyof typeof sevOrder] ?? 4;
        const curr = sevOrder[r.alarms[i].severity as keyof typeof sevOrder] ?? 4;
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("filters by severity", async () => {
      await call(handler, "alarm_esc_trigger", {
        rule_id: "SPINDLE_OVERLOAD",
        source: "machine:filter-iter3",
        message: "severity-filter test",
      });
      const r = await call(handler, "alarm_esc_active", { severity: "critical" });
      expect(r.success).toBe(true);
      expect(r.alarms.every((a: any) => a.severity === "critical")).toBe(true);
    });

    it("filters by source substring", async () => {
      await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW",
        source: "machine:unique-iter3-source-substr-xyz",
        message: "source-filter test",
      });
      const r = await call(handler, "alarm_esc_active", { source: "unique-iter3-source-substr" });
      expect(r.success).toBe(true);
      expect(r.alarms.length).toBeGreaterThanOrEqual(1);
      expect(r.alarms.every((a: any) => a.source.includes("unique-iter3-source-substr"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // alarm_esc_history
  // ---------------------------------------------------------------------

  describe("alarm_esc_history", () => {
    it("returns alarms most-recent-first", async () => {
      const t1 = await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW",
        source: "machine:hist-iter3-A",
        message: "history-order test 1",
      });
      await new Promise((r) => setTimeout(r, 10));
      const t2 = await call(handler, "alarm_esc_trigger", {
        rule_id: "COOLANT_LOW",
        source: "machine:hist-iter3-B",
        message: "history-order test 2",
      });
      const r = await call(handler, "alarm_esc_history", { limit: 100 });
      expect(r.success).toBe(true);
      // Latest trigger should appear before earlier one (by created_at)
      const idxA = r.alarms.findIndex((a: any) => a.id === t1.alarm.id);
      const idxB = r.alarms.findIndex((a: any) => a.id === t2.alarm.id);
      expect(idxA).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeLessThan(idxA); // B was created after A → appears first
    });

    it("respects the limit param", async () => {
      const r = await call(handler, "alarm_esc_history", { limit: 2 });
      expect(r.success).toBe(true);
      expect(r.alarms.length).toBeLessThanOrEqual(2);
      expect(r.limit).toBe(2);
    });
  });

  // ---------------------------------------------------------------------
  // alarm_esc_stats
  // ---------------------------------------------------------------------

  describe("alarm_esc_stats", () => {
    it("returns counts by state + severity buckets", async () => {
      const r = await call(handler, "alarm_esc_stats", {});
      expect(r.success).toBe(true);
      const s = r.stats;
      expect(typeof s.total_alarms).toBe("number");
      expect(typeof s.active).toBe("number");
      expect(typeof s.acknowledged).toBe("number");
      expect(typeof s.resolved).toBe("number");
      expect(s.rules).toBeGreaterThanOrEqual(5);
      // Active + acknowledged + resolved + escalated ≤ total (escalated counted as active)
      expect(s.active + s.acknowledged + s.resolved).toBeLessThanOrEqual(s.total_alarms);
      // Severity buckets all present
      for (const sev of ["info", "warn", "critical", "emergency"] as const) {
        expect(typeof s.by_severity[sev]).toBe("number");
        expect(s.by_severity[sev]).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
