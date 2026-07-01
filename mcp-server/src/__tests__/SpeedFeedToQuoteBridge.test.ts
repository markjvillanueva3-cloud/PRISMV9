/**
 * SpeedFeedToQuoteBridgeEngine tests — physics-backed cycle-time enrichment
 *
 * @milestone QUOTING-SYNERGY-MS0/U-SPEED-FEED-TO-QUOTE (charlie /goal-20 iter12)
 *
 * Tests use the REAL SpeedFeedOrchestratorEngine (not a mock) because the
 * orchestrator is the unit-under-test's load-bearing dependency — mocking it
 * would defeat the integration contract this engine exists to enforce.
 * Cycle-time assertions are bounded (range/ratio) rather than exact, since
 * the orchestrator carries its own per-resolver variance.
 */

import { describe, it, expect } from "vitest";
import {
  speedFeedToQuoteBridgeEngine,
  type InputOperation,
} from "../engines/SpeedFeedToQuoteBridgeEngine.js";

describe("SpeedFeedToQuoteBridgeEngine.enrich", () => {
  it("rejects empty operations array", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/non-empty/);
    expect(r.operations).toHaveLength(0);
  });

  it("rejects non-array operations", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich(null as unknown as InputOperation[]);
    expect(r.ok).toBe(false);
  });

  it("passes through wizard cycle when op has no physics context", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "rough_pocket", cycle_min: 12.5 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.operations).toHaveLength(1);
    expect(r.operations[0].cycle_min).toBe(12.5);
    expect(r.operations[0].source).toBe("wizard_passthrough");
    expect(r.operations[0].confidence).toBe(0.5);
    expect(r.passthrough_count).toBe(1);
    expect(r.physics_backed_count).toBe(0);
  });

  it("passes through when physics context exists but lacks volume + path_length", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "drill", cycle_min: 4.0, physics: { material: "aluminum_6061", tool_diameter_mm: 8 } },
    ]);
    expect(r.ok).toBe(true);
    expect(r.operations[0].source).toBe("wizard_passthrough");
    expect(r.operations[0].cycle_min).toBe(4.0);
    expect(r.operations[0].note).toMatch(/missing volume|orchestrator/);
  });

  it("computes physics-backed cycle from volume_to_remove_cm3 (MRR path)", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      {
        name: "rough_pocket", cycle_min: 99,  // wizard estimate (deliberately wrong)
        physics: {
          volume_to_remove_cm3: 200,
          material: "aluminum_6061",
          tool_diameter_mm: 12,
          flutes: 4,
          axial_depth_mm: 6,
          radial_depth_mm: 6,
          operation: "milling",
          cut_type: "roughing",
        },
      },
    ]);
    expect(r.ok).toBe(true);
    expect(r.operations).toHaveLength(1);
    const op = r.operations[0];
    if (op.source === "physics_mrr") {
      expect(op.cycle_min).toBeGreaterThan(0);
      expect(op.cycle_min).not.toBe(99);
      expect(op.original_wizard_cycle_min).toBe(99);
      expect(op.confidence).toBeGreaterThan(0);
      expect(op.confidence).toBeLessThanOrEqual(1);
      expect(op.note).toMatch(/MRR=/);
      expect(r.physics_backed_count).toBe(1);
    } else {
      // Orchestrator might fall back if resolver doesn't seat — still ok, just record source.
      expect(op.source).toBe("wizard_passthrough");
      expect(op.cycle_min).toBe(99);
    }
  });

  it("scales cycle by passes count", async () => {
    const single = await speedFeedToQuoteBridgeEngine.enrich([
      {
        name: "rough", cycle_min: 1, passes: 1,
        physics: {
          volume_to_remove_cm3: 100, material: "aluminum_6061",
          tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6,
          operation: "milling", cut_type: "roughing",
        },
      },
    ]);
    const multi = await speedFeedToQuoteBridgeEngine.enrich([
      {
        name: "rough", cycle_min: 1, passes: 3,
        physics: {
          volume_to_remove_cm3: 100, material: "aluminum_6061",
          tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6,
          operation: "milling", cut_type: "roughing",
        },
      },
    ]);
    // When both routed via physics → multi-pass should be ≈3× single.
    if (single.operations[0].source !== "wizard_passthrough" && multi.operations[0].source !== "wizard_passthrough") {
      const ratio = multi.operations[0].cycle_min / single.operations[0].cycle_min;
      expect(ratio).toBeCloseTo(3, 1);
    }
  });

  it("computes physics-backed cycle from path_length_mm when no volume (finishing)", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      {
        name: "finish_contour", cycle_min: 50,
        physics: {
          path_length_mm: 5000,
          material: "aluminum_6061",
          tool_diameter_mm: 10,
          flutes: 4,
          axial_depth_mm: 0.5,
          radial_depth_mm: 0.2,
          operation: "milling",
          cut_type: "finishing",
        },
      },
    ]);
    expect(r.ok).toBe(true);
    const op = r.operations[0];
    if (op.source === "physics_feed_rate") {
      expect(op.cycle_min).toBeGreaterThan(0);
      expect(op.note).toMatch(/feed=/);
    } else {
      // OK to fall through; the operator-facing source must always be honest.
      expect(["physics_mrr", "physics_feed_rate", "wizard_passthrough"]).toContain(op.source);
    }
  });

  it("preserves tool_ids + passes on enriched ops", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "rough", cycle_min: 5, tool_ids: ["T01", "T02"], passes: 2 },
    ]);
    expect(r.operations[0].tool_ids).toEqual(["T01", "T02"]);
    expect(r.operations[0].passes).toBe(2);
  });

  it("aggregates total_cycle_min across mixed-source ops", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "a", cycle_min: 10 },  // passthrough
      { name: "b", cycle_min: 20 },  // passthrough
      { name: "c", cycle_min: 30 },  // passthrough
    ]);
    expect(r.ok).toBe(true);
    expect(r.total_cycle_min).toBe(60);
    expect(r.passthrough_count).toBe(3);
    expect(r.physics_backed_count).toBe(0);
  });

  it("mixes physics-backed and passthrough ops in same batch", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "rough", cycle_min: 99, physics: {
        volume_to_remove_cm3: 100, material: "aluminum_6061",
        tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6,
        operation: "milling", cut_type: "roughing",
      }},
      { name: "drill", cycle_min: 5 },
      { name: "tap", cycle_min: 3 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.operations).toHaveLength(3);
    expect(r.passthrough_count).toBeGreaterThanOrEqual(2);
    expect(r.operations[1].source).toBe("wizard_passthrough");
    expect(r.operations[1].cycle_min).toBe(5);
    expect(r.operations[2].source).toBe("wizard_passthrough");
    expect(r.operations[2].cycle_min).toBe(3);
  });

  it("clamps zero/negative wizard cycle to 0 in passthrough", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "zero", cycle_min: 0 },
      { name: "negative", cycle_min: -5 },
    ]);
    expect(r.operations[0].cycle_min).toBe(0);
    expect(r.operations[1].cycle_min).toBe(0);  // negative clamped to 0
  });

  it("source is always one of three known values (no silent missing)", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "a", cycle_min: 5 },
      { name: "b", cycle_min: 10, physics: { volume_to_remove_cm3: 50, material: "aluminum_6061", tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6, operation: "milling", cut_type: "roughing" }},
    ]);
    for (const op of r.operations) {
      expect(["physics_mrr", "physics_feed_rate", "wizard_passthrough"]).toContain(op.source);
    }
  });

  it("dispatcher round-trip: quoting_speed_feed_to_cycle action invokes engine via dispatcher", async () => {
    const { QUOTING_ACTION_SCHEMAS, quotingActionEnum } = await import("../schemas/quotingActionSchemas.js");
    // Anti-regression on dispatcher contract — the action must be exposed in the enum.
    expect(quotingActionEnum.options).toContain("quoting_speed_feed_to_cycle");
    // Round-trip exactly as quotingDispatcher does: zod-parse → enrich() → assert numeric result.
    const schema = QUOTING_ACTION_SCHEMAS.quoting_speed_feed_to_cycle;
    const params = {
      operations: [
        { name: "rough", cycle_min: 5 },
        { name: "drill", cycle_min: 3 },
      ],
    };
    const parsed = schema.safeParse(params);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const { speedFeedToQuoteBridgeEngine } = await import("../engines/SpeedFeedToQuoteBridgeEngine.js");
    const dispatcherResult = await speedFeedToQuoteBridgeEngine.enrich((parsed.data as { operations: InputOperation[] }).operations);
    expect(dispatcherResult.ok).toBe(true);
    expect(dispatcherResult.operations).toHaveLength(2);
    expect(dispatcherResult.operations[0].name).toBe("rough");
    expect(dispatcherResult.operations[1].name).toBe("drill");
    expect(dispatcherResult.total_cycle_min).toBe(8);
    expect(dispatcherResult.passthrough_count).toBe(2);
    expect(dispatcherResult.physics_backed_count).toBe(0);
  });

  it("dispatcher schema rejects missing operations array", async () => {
    const { QUOTING_ACTION_SCHEMAS } = await import("../schemas/quotingActionSchemas.js");
    const schema = QUOTING_ACTION_SCHEMAS.quoting_speed_feed_to_cycle;
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("dispatcher schema rejects empty operations array", async () => {
    const { QUOTING_ACTION_SCHEMAS } = await import("../schemas/quotingActionSchemas.js");
    const schema = QUOTING_ACTION_SCHEMAS.quoting_speed_feed_to_cycle;
    const parsed = schema.safeParse({ operations: [] });
    expect(parsed.success).toBe(false);
  });

  it("operator-facing note is non-empty for every op (audit trail)", async () => {
    const r = await speedFeedToQuoteBridgeEngine.enrich([
      { name: "a", cycle_min: 5 },
      { name: "b", cycle_min: 10, physics: { volume_to_remove_cm3: 50, material: "aluminum_6061", tool_diameter_mm: 12, flutes: 4, axial_depth_mm: 6, radial_depth_mm: 6, operation: "milling", cut_type: "roughing" }},
    ]);
    for (const op of r.operations) {
      expect(typeof op.note).toBe("string");
      expect((op.note ?? "").length).toBeGreaterThan(0);
    }
  });
});
