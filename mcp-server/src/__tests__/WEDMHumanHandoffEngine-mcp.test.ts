/**
 * U-P2PFS16b: WEDMHumanHandoffEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_handoff_escalate, wedm_handoff_acknowledge,
 * wedm_handoff_list_pending, wedm_handoff_get, wedm_handoff_history
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMHumanHandoffEngine,
  type HandoffRequest,
  type HandoffPacket,
  type Severity,
  type Urgency,
} from "../engines/WEDMHumanHandoffEngine.js";

describe("WEDMHumanHandoffEngine MCP Wiring (U-P2PFS16b)", () => {
  let engine: WEDMHumanHandoffEngine;

  beforeEach(() => {
    engine = new WEDMHumanHandoffEngine();
  });

  describe("escalate()", () => {
    it("returns HandoffPacket structure", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Wire broke at Z=45mm",
      });

      expect(packet).toHaveProperty("id");
      expect(packet).toHaveProperty("at");
      expect(packet).toHaveProperty("type");
      expect(packet).toHaveProperty("severity");
      expect(packet).toHaveProperty("urgency");
      expect(packet).toHaveProperty("summary");
      expect(packet).toHaveProperty("suggestedAction");
      expect(packet).toHaveProperty("context");
      expect(packet).toHaveProperty("snapshot");
      expect(packet).toHaveProperty("acknowledged");
    });

    it("generates unique IDs", () => {
      const p1 = engine.escalate({ type: "wire_break", summary: "Break 1" });
      const p2 = engine.escalate({ type: "wire_break", summary: "Break 2" });

      expect(p1.id).not.toBe(p2.id);
    });

    it("sets acknowledged to false on creation", () => {
      const packet = engine.escalate({
        type: "short_circuit",
        summary: "Short detected",
      });

      expect(packet.acknowledged).toBe(false);
    });

    it("requires type field", () => {
      expect(() =>
        engine.escalate({ type: "", summary: "Test" } as HandoffRequest)
      ).toThrow(/type/);
    });

    it("requires summary field", () => {
      expect(() =>
        engine.escalate({ type: "wire_break", summary: "" } as HandoffRequest)
      ).toThrow(/summary/);
    });

    it("infers default severity from exception type", () => {
      const wireBreak = engine.escalate({ type: "wire_break", summary: "Test" });
      const axisOverrun = engine.escalate({ type: "axis_overrun", summary: "Test" });
      const tankLow = engine.escalate({ type: "tank_low", summary: "Test" });

      expect(wireBreak.severity).toBe("medium");
      expect(axisOverrun.severity).toBe("critical");
      expect(tankLow.severity).toBe("high");
    });

    it("infers default urgency from exception type", () => {
      const wireBreak = engine.escalate({ type: "wire_break", summary: "Test" });
      const tankLow = engine.escalate({ type: "tank_low", summary: "Test" });

      expect(wireBreak.urgency).toBe("high");
      expect(tankLow.urgency).toBe("immediate");
    });

    it("allows severity override", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        severity: "critical",
      });

      expect(packet.severity).toBe("critical");
    });

    it("allows urgency override", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        urgency: "low",
      });

      expect(packet.urgency).toBe("low");
    });

    it("generates suggested action from exception type", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Wire severed",
      });

      expect(packet.suggestedAction).toContain("wire");
    });

    it("allows suggested action override", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        suggestedAction: "Custom action here",
      });

      expect(packet.suggestedAction).toBe("Custom action here");
    });

    it("preserves context data", () => {
      const packet = engine.escalate({
        type: "short_circuit",
        summary: "Short at gap",
        context: { gap_V: 15, current_A: 8, position_mm: 120.5 },
      });

      expect(packet.context.gap_V).toBe(15);
      expect(packet.context.current_A).toBe(8);
    });

    it("preserves machine snapshot", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Break",
        snapshot: {
          position: { x: 100, y: 50, z: 25 },
          gap_V: 60,
          wire_tension_g: 1200,
          tank_pct: 85,
        },
      });

      expect(packet.snapshot.position?.x).toBe(100);
      expect(packet.snapshot.gap_V).toBe(60);
      expect(packet.snapshot.tank_pct).toBe(85);
    });

    it("allows timestamp override", () => {
      const ts = "2026-04-18T12:00:00.000Z";
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        timestamp: ts,
      });

      expect(packet.at).toBe(ts);
    });

    it("includes recovery plan when provided", () => {
      const plan = {
        type: "wire_break",
        directive: "human_escalate",
        occurrence: 4,
        rationale: "Exceeded retry limit",
        terminal: true,
      };
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Fourth wire break",
        plan: plan as any,
      });

      expect(packet.plan?.directive).toBe("human_escalate");
      expect(packet.plan?.occurrence).toBe(4);
    });
  });

  describe("acknowledge()", () => {
    it("marks packet as acknowledged", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      const acked = engine.acknowledge(packet.id, "operator_john");

      expect(acked).not.toBeNull();
      expect(acked?.acknowledged).toBe(true);
      expect(acked?.acknowledgedBy).toBe("operator_john");
    });

    it("sets acknowledgedAt timestamp", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      const acked = engine.acknowledge(packet.id, "jane");

      expect(acked?.acknowledgedAt).toBeDefined();
      expect(new Date(acked!.acknowledgedAt!).getTime()).toBeGreaterThan(0);
    });

    it("removes packet from pending queue", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      engine.acknowledge(packet.id, "operator");

      const pending = engine.listPending();
      const found = pending.find((p) => p.id === packet.id);
      expect(found).toBeUndefined();
    });

    it("returns null for non-existent ID", () => {
      const result = engine.acknowledge("non_existent_id", "operator");
      expect(result).toBeNull();
    });

    it("allows custom acknowledgement timestamp", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      const ts = "2026-04-18T14:30:00.000Z";
      const acked = engine.acknowledge(packet.id, "op", ts);

      expect(acked?.acknowledgedAt).toBe(ts);
    });
  });

  describe("listPending()", () => {
    it("returns empty array initially", () => {
      expect(engine.listPending()).toHaveLength(0);
    });

    it("returns all pending packets", () => {
      engine.escalate({ type: "wire_break", summary: "Break 1" });
      engine.escalate({ type: "short_circuit", summary: "Short 1" });

      const pending = engine.listPending();
      expect(pending).toHaveLength(2);
    });

    it("returns newest first", () => {
      engine.escalate({ type: "wire_break", summary: "First", timestamp: "2026-04-18T10:00:00Z" });
      engine.escalate({ type: "wire_break", summary: "Second", timestamp: "2026-04-18T11:00:00Z" });

      const pending = engine.listPending();
      expect(pending[0].summary).toBe("Second");
    });

    it("excludes acknowledged packets", () => {
      const p1 = engine.escalate({ type: "wire_break", summary: "Break 1" });
      engine.escalate({ type: "wire_break", summary: "Break 2" });
      engine.acknowledge(p1.id, "op");

      const pending = engine.listPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].summary).toBe("Break 2");
    });

    it("returns copies not references", () => {
      engine.escalate({ type: "wire_break", summary: "Test" });
      const list1 = engine.listPending();
      const list2 = engine.listPending();

      expect(list1[0]).not.toBe(list2[0]);
      expect(list1[0]).toEqual(list2[0]);
    });
  });

  describe("getPending()", () => {
    it("returns packet by ID", () => {
      const created = engine.escalate({ type: "wire_break", summary: "Test" });
      const retrieved = engine.getPending(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it("returns null for non-existent ID", () => {
      const result = engine.getPending("definitely_not_a_real_id");
      expect(result).toBeNull();
    });

    it("returns null for acknowledged packet", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      engine.acknowledge(packet.id, "op");

      const result = engine.getPending(packet.id);
      expect(result).toBeNull();
    });
  });

  describe("getHistory()", () => {
    it("returns empty array initially", () => {
      expect(engine.getHistory()).toHaveLength(0);
    });

    it("includes all escalated packets", () => {
      engine.escalate({ type: "wire_break", summary: "Break 1" });
      engine.escalate({ type: "short_circuit", summary: "Short 1" });

      const history = engine.getHistory();
      expect(history).toHaveLength(2);
    });

    it("includes acknowledged packets", () => {
      const packet = engine.escalate({ type: "wire_break", summary: "Test" });
      engine.acknowledge(packet.id, "op");

      const history = engine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].acknowledged).toBe(true);
    });

    it("preserves insertion order", () => {
      engine.escalate({ type: "wire_break", summary: "First" });
      engine.escalate({ type: "wire_break", summary: "Second" });

      const history = engine.getHistory();
      expect(history[0].summary).toBe("First");
      expect(history[1].summary).toBe("Second");
    });
  });

  describe("reset()", () => {
    it("clears pending queue", () => {
      engine.escalate({ type: "wire_break", summary: "Test" });
      engine.reset();

      expect(engine.listPending()).toHaveLength(0);
    });

    it("clears history", () => {
      engine.escalate({ type: "wire_break", summary: "Test" });
      engine.reset();

      expect(engine.getHistory()).toHaveLength(0);
    });

    it("resets ID counter", () => {
      engine.escalate({ type: "wire_break", summary: "Test" });
      engine.reset();
      const newPacket = engine.escalate({ type: "wire_break", summary: "After reset" });

      // ID format is HO-{timestamp}-{counter}, counter resets to 1
      expect(newPacket.id).toMatch(/^HO-[a-z0-9]+-1$/);
    });
  });

  describe("severity classification", () => {
    const testCases: Array<{ type: string; expected: Severity }> = [
      { type: "wire_break", expected: "medium" },
      { type: "short_circuit", expected: "medium" },
      { type: "open_circuit", expected: "medium" },
      { type: "tank_low", expected: "high" },
      { type: "resistivity_high", expected: "low" },
      { type: "resistivity_low", expected: "medium" },
      { type: "servo_fault", expected: "medium" },
      { type: "axis_overrun", expected: "critical" },
      { type: "wire_tension_out", expected: "medium" },
      { type: "filter_clogged", expected: "low" },
    ];

    it.each(testCases)("$type has severity $expected", ({ type, expected }) => {
      const packet = engine.escalate({ type, summary: `Test ${type}` });
      expect(packet.severity).toBe(expected);
    });
  });

  describe("urgency classification", () => {
    const testCases: Array<{ type: string; expected: Urgency }> = [
      { type: "wire_break", expected: "high" },
      { type: "short_circuit", expected: "high" },
      { type: "open_circuit", expected: "medium" },
      { type: "tank_low", expected: "immediate" },
      { type: "axis_overrun", expected: "immediate" },
      { type: "filter_clogged", expected: "low" },
    ];

    it.each(testCases)("$type has urgency $expected", ({ type, expected }) => {
      const packet = engine.escalate({ type, summary: `Test ${type}` });
      expect(packet.urgency).toBe(expected);
    });
  });

  describe("edge cases", () => {
    it("handles unknown exception type gracefully", () => {
      const packet = engine.escalate({
        type: "custom_envelope_violation",
        summary: "Custom violation",
      });

      expect(packet.type).toBe("custom_envelope_violation");
      expect(packet.severity).toBeDefined();
    });

    it("handles empty context object", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        context: {},
      });

      expect(packet.context).toEqual({});
    });

    it("handles empty snapshot object", () => {
      const packet = engine.escalate({
        type: "wire_break",
        summary: "Test",
        snapshot: {},
      });

      expect(packet.snapshot).toEqual({});
    });
  });
});
