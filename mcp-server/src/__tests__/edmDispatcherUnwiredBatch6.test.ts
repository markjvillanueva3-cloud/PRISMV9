/**
 * E2E test for ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH6 — 6 unwired audit /
 * awareness / dxf-closure / degradation / EWC-memory WEDM engines.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { wedmAutonomyAuditEngine } from "../engines/WEDMAutonomyAuditEngine.js";
import { wedmAwarenessAdoptionEngine } from "../engines/WEDMAwarenessAdoptionEngine.js";
import { wedmDXFClosureValidatorEngine } from "../engines/WEDMDXFClosureValidatorEngine.js";
import { wedmDegradationModelEngine } from "../engines/WEDMDegradationModelEngine.js";
import { wedmEWCMemoryEngine } from "../engines/WEDMEWCMemoryEngine.js";

const NEW_ACTIONS = [
  "wedm_autonomy_audit_record",
  "wedm_awareness_register_dispatcher",
  "wedm_dxf_validate",
  "wedm_degradation_update",
  "wedm_degradation_snapshot",
  "wedm_ewc_list_slots",
] as const;
const EXPECTED_ACTION_COUNT = NEW_ACTIONS.length;

describe("U-WIRE-WEDM-BATCH6 — engines verified directly", () => {
  describe("WEDMAutonomyAuditEngine.record", () => {
    const baseEntry = {
      action: "promote" as const,
      user_id: "test-user",
      user_roles: ["operator"],
      remote_ip: null,
      actor: null,
      reason: null,
      level_from: 1,
      level_to: 2,
      outcome: "success" as const,
      error: null,
      counter_signed: false,
    };

    it("returns entry with auto-filled id and ISO-8601 timestamp", () => {
      const entry = wedmAutonomyAuditEngine.record({ ...baseEntry });
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.at).toBe("string");
      // ISO-8601: 2026-05-07T11:23:45.000Z (regex must match)
      expect(entry.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(entry.action).toBe("promote");
      expect(entry.outcome).toBe("success");
    });

    it("two record calls produce distinct ids (monotonic counter)", () => {
      const readEntry = {
        ...baseEntry,
        action: "status_read" as const,
        user_id: null,
        level_from: null,
        level_to: null,
      };
      const a = wedmAutonomyAuditEngine.record({ ...readEntry });
      const b = wedmAutonomyAuditEngine.record({ ...readEntry });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("WEDMAwarenessAdoptionEngine", () => {
    it("registerDispatcher + isWedmAction returns true for registered WEDM action", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "test-disp",
        actions: ["wedm_test_action", "non_wedm_action"],
      });
      expect(wedmAwarenessAdoptionEngine.isWedmAction("test-disp", "wedm_test_action")).toBe(true);
    });

    it("isWedmAction returns false for non-wedm-prefixed action", () => {
      wedmAwarenessAdoptionEngine.registerDispatcher({
        dispatcher: "test-disp-2",
        actions: ["other_action"],
      });
      expect(wedmAwarenessAdoptionEngine.isWedmAction("test-disp-2", "other_action")).toBe(false);
    });
  });

  describe("WEDMDXFClosureValidatorEngine.validate", () => {
    it("validate on a closed square contour reports zero gaps", () => {
      const r = wedmDXFClosureValidatorEngine.validate([
        { id: "s1", type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } } as never,
        { id: "s2", type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } } as never,
        { id: "s3", type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } } as never,
        { id: "s4", type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } } as never,
      ]);
      const r2 = r as { gaps?: unknown[]; closed?: boolean; pass?: boolean };
      const gapCount = (r2.gaps ?? []).length;
      expect(gapCount).toBe(0);
    });

    it("validate on an open path (missing return segment) reports at least one gap", () => {
      const r = wedmDXFClosureValidatorEngine.validate([
        { id: "s1", type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } } as never,
        { id: "s2", type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } } as never,
        { id: "s3", type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } } as never,
        // s4 (closing segment) intentionally omitted
      ]);
      const r2 = r as { gaps?: unknown[] };
      const gapCount = (r2.gaps ?? []).length;
      expect(gapCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("WEDMDegradationModelEngine", () => {
    it("update with positive dt_hours returns a snapshot with health values", () => {
      // Reset to ensure deterministic state
      wedmDegradationModelEngine.reset();
      const snap = wedmDegradationModelEngine.update({
        dt_hours: 1,
        wire_tension_gf: 800,
        wire_feed_mm_s: 5,
        discharge_current_A: 8,
        pulse_on_us: 4,
        pulses: 1000,
        conductivity_uS_cm: 12,
        flow_L_min: 4,
        debris_rate_mg_hr: 50,
        pulse_energy_mJ: 0.5,
      });
      expect(typeof snap).toBe("object");
      expect(snap).not.toBeNull();
    });

    it("snapshot returns object with at least one component health value in [0,1]", () => {
      const snap = wedmDegradationModelEngine.snapshot();
      const components = ["guide_wear", "wire_erosion", "filter_capacity", "filter_clogging", "wire_fatigue"] as const;
      for (const c of components) {
        const comp = wedmDegradationModelEngine.getComponent(c);
        expect(comp.health).toBeGreaterThanOrEqual(0);
        expect(comp.health).toBeLessThanOrEqual(1);
      }
      // snapshot itself should be a non-null object
      expect(typeof snap).toBe("object");
      expect(snap).not.toBeNull();
    });
  });

  describe("WEDMEWCMemoryEngine.listSlots", () => {
    it("returns an array of slot names (string[])", () => {
      const slots = wedmEWCMemoryEngine.listSlots();
      expect(Array.isArray(slots)).toBe(true);
      for (const s of slots) {
        expect(typeof s).toBe("string");
      }
    });

    it("getSlot for non-existent slot returns null (not undefined)", () => {
      const slot = wedmEWCMemoryEngine.getSlot("totally-bogus-slot-xyz-12345");
      expect(slot).toBeNull();
    });
  });
});

describe("U-WIRE-WEDM-BATCH6 — dispatcher wiring verified", () => {
  it("registers all 6 new actions in edmDispatcher source (enum + case)", async () => {
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "edmDispatcher.ts",
    );
    const src = await fsp.readFile(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in EDM_ACTION_SCHEMAS", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof EDM_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(EXPECTED_ACTION_COUNT);
  });

  it("schema rejects wedm_autonomy_audit_record with invalid action enum", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_autonomy_audit_record"]!.safeParse({
      action: "totally-bogus", user_id: "u", outcome: "success",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_awareness_register_dispatcher with empty actions array", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_awareness_register_dispatcher"]!.safeParse({
      dispatcher: "x", actions: [],
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_dxf_validate with empty segments array", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_dxf_validate"]!.safeParse([]);
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_dxf_validate with invalid segment type", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_dxf_validate"]!.safeParse([
      {
        id: "s1", type: "ellipse",
        start: { x: 0, y: 0 }, end: { x: 1, y: 1 },
      },
    ]);
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_degradation_update with non-positive dt_hours", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_degradation_update"]!.safeParse({ dt_hours: 0 });
    expect(r.success).toBe(false);
  });
});
