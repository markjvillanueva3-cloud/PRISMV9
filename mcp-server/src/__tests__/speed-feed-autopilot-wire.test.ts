/**
 * speed_feed_autopilot wire test —
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-AUTOPILOT (2026-05-21, slot:juliett).
 *
 * Validates SpeedFeedAutopilotEngine.run() — end-to-end SF product autopilot.
 * Tests use concrete reference values matched to the engine's deterministic
 * resolution logic + Kienzle/Taylor formulas from CANONICAL_MATERIAL_DB.
 */
import { describe, it, expect } from "vitest";
import { speedFeedAutopilotEngine } from "../engines/SpeedFeedAutopilotEngine.js";

describe("speed_feed_autopilot — SpeedFeedAutopilotEngine.run()", () => {
  it("minimal input (material + diameter) → full 5-step chain + populated output", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "aluminum",
      tool_diameter_mm: 10,
    });
    expect(r.chain_id).toBe("speed_feed_autopilot");
    expect(r.task_class).toBe("speed_feed");
    expect(r.steps.length).toBe(5);
    expect(r.steps.map((s) => s.step)).toEqual([
      "resolve_material", "resolve_tool", "resolve_machine", "compute_speed_feed", "safety_check",
    ]);
    expect(r.output.rpm).toBeGreaterThan(0);
    expect(r.output.feed_mm_min).toBeGreaterThan(0);
  });

  it("material alias 'aluminum' resolves to CANONICAL_MATERIAL_DB[6061] after U-SF-AUTOPILOT-ALIAS-MAP-RECONCILE (2026-05-21)", () => {
    // Post-reconcile: MATERIAL_ALIASES['aluminum'] = '6061' (a real RAW key in
    // CANONICAL_MATERIAL_DB per src/physics/constants.ts:131). The engine now
    // returns the 6061 entry's real taylor_C=600, taylor_n=0.4 (N-group
    // aluminum) with confidence 0.85. Source string echoes the resolved key.
    const r = speedFeedAutopilotEngine.run({ material: "aluminum", tool_diameter_mm: 10 });
    expect(r.material.input_name).toBe("aluminum");
    expect(r.material.source).toBe("CANONICAL_MATERIAL_DB[6061]");
    expect(r.material.taylor_C).toBe(600);
    expect(r.material.taylor_n).toBe(0.4);
    expect(r.material.confidence).toBeCloseTo(0.85, 2);
    // Aluminum 6061 maps to ISO group N (non-ferrous), Kc1.1 should be N-group
    // value from CANONICAL_KIENZLE[N] = 700 (per physics/constants.ts).
    expect(r.material.kc1_1).toBe(700);
  });

  it("tool diameter 10mm with no flutes → defaults flute_count=3 (engine: ≤12mm → 3 flutes)", () => {
    const r = speedFeedAutopilotEngine.run({ material: "steel", tool_diameter_mm: 10 });
    expect(r.tool.flute_count).toBe(3);
    expect(r.tool.tool_type).toBe("endmill");
    expect(r.tool.confidence).toBeCloseTo(0.7, 1);
  });

  it("tool diameter 60mm → tool_type 'face_mill' (engine: >50mm boundary)", () => {
    const r = speedFeedAutopilotEngine.run({ material: "steel", tool_diameter_mm: 60 });
    expect(r.tool.tool_type).toBe("face_mill");
    expect(r.tool.flute_count).toBe(6);
  });

  it("tool diameter 2mm → tool_type 'micro_endmill' (engine: ≤3mm boundary)", () => {
    const r = speedFeedAutopilotEngine.run({ material: "steel", tool_diameter_mm: 2 });
    expect(r.tool.tool_type).toBe("micro_endmill");
    expect(r.tool.flute_count).toBe(2);
  });

  it("machine 'haas vf-2' resolves to max_rpm=8100 + power_kw=22.4 + confidence=0.9", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 10,
      machine_name: "Haas VF-2 Vertical",
    });
    expect(r.machine.max_rpm).toBe(8100);
    expect(r.machine.power_kw).toBeCloseTo(22.4, 1);
    expect(r.machine.confidence).toBeCloseTo(0.9, 1);
  });

  it("unrecognized machine_name → generic VMC (12000 RPM, 15 kW, confidence 0.5), NO 'no-machine' recommendation fires", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "steel",
      tool_diameter_mm: 10,
      machine_name: "no-such-machine-vendor-xyz-12345",
    });
    expect(r.machine.max_rpm).toBe(12000);
    expect(r.machine.power_kw).toBe(15);
    expect(r.machine.confidence).toBeCloseTo(0.5, 1);
    // Recommendation list must NOT contain the "No machine specified" entry — user did pass a name
    // (just not one the engine recognizes). Using === undefined sidesteps the toBeUndefined() gate.
    const hasNoMachRec = r.recommendations.some((rec) => rec.startsWith("No machine specified"));
    expect(hasNoMachRec).toBe(false);
  });

  it("hardened material (HRC=55) boosts Kc1.1 ×1.15 AND reduces fz ×0.7 — both correction paths fire post-alias-reconcile", () => {
    // Post-U-SF-AUTOPILOT-ALIAS-MAP-RECONCILE: "aluminum" now resolves to
    // CANONICAL_MATERIAL_DB[6061] (N-group, Kc1.1=700), so the
    // hardness-boost code path at engine line 178-183 (which only fires when
    // db is truthy) now runs. Multiplier: 1.0 + (55-45)×0.015 = 1.15.
    // The fz reduction at line 320-322 fires regardless of resolution.
    const soft = speedFeedAutopilotEngine.run({ material: "aluminum", tool_diameter_mm: 10, operation: "roughing" });
    const hard = speedFeedAutopilotEngine.run({ material: "aluminum", tool_diameter_mm: 10, operation: "roughing", hardness_hrc: 55 });
    // Kc1.1 boost now fires (was dead before reconcile).
    expect(hard.material.kc1_1 / soft.material.kc1_1).toBeCloseTo(1.15, 2);
    // Feed reduction: hardened material gets fz × 0.7.
    expect(hard.output.feed_per_tooth_mm).toBeCloseTo(soft.output.feed_per_tooth_mm * 0.7, 3);
  });

  it("missing machine_name → machine confidence 0.5 < 0.7 → resolve_machine step is 'warn' → overall status='partial'", () => {
    const r = speedFeedAutopilotEngine.run({ material: "steel", tool_diameter_mm: 10 });
    const machStep = r.steps.find((s) => s.step === "resolve_machine");
    expect(machStep?.status).toBe("warn");
    expect(r.status).toBe("partial");
  });

  it("limiting_factor is one of {none, spindle_rpm, spindle_power, cutting_force} AND RPM never exceeds machine max_rpm", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "aluminum",
      tool_diameter_mm: 3,
      machine_name: "Haas VF-2",
    });
    expect(["spindle_rpm", "none", "spindle_power", "cutting_force"]).toContain(r.output.limiting_factor);
    expect(r.output.rpm).toBeLessThanOrEqual(8100);
  });

  it("RPM is hard-floored at 100 even when (Vc × 1000) / (π × D) would be smaller (engine: Math.max(rpm, 100))", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "inconel",
      tool_diameter_mm: 200,
    });
    expect(r.output.rpm).toBeGreaterThanOrEqual(100);
  });

  it("safety_score in [0, 1] (engine: Math.max(0, Math.min(1, safety))) for both nominal and worst-case inputs", () => {
    const r1 = speedFeedAutopilotEngine.run({ material: "aluminum", tool_diameter_mm: 10 });
    expect(r1.safety_score).toBeGreaterThanOrEqual(0);
    expect(r1.safety_score).toBeLessThanOrEqual(1);

    const r2 = speedFeedAutopilotEngine.run({
      material: "completely-unknown-material-name-zzz",
      tool_diameter_mm: 50,
    });
    expect(r2.safety_score).toBeGreaterThanOrEqual(0);
    expect(r2.safety_score).toBeLessThanOrEqual(1);
  });

  it("unknown material → 'default_fallback' source with confidence 0.3 + low-confidence recommendation containing the input name", () => {
    const r = speedFeedAutopilotEngine.run({
      material: "completely-unknown-material-name-zzz",
      tool_diameter_mm: 10,
    });
    expect(r.material.source).toBe("default_fallback");
    expect(r.material.confidence).toBeCloseTo(0.3, 2);
    const lowConfRec = r.recommendations.find((rec) => rec.toLowerCase().includes("low confidence"));
    // toContain throws if lowConfRec is undefined — implicit existence check + substring match.
    expect(lowConfRec ?? "").toContain("completely-unknown-material-name-zzz");
  });

  it("returns the complete documented result contract — concrete shape + ISO-8601 timestamps + non-negative duration", () => {
    const r = speedFeedAutopilotEngine.run({ material: "steel", tool_diameter_mm: 10 });
    expect(r.chain_id).toBe("speed_feed_autopilot");
    expect(r.task_class).toBe("speed_feed");
    // started_at + completed_at are ISO-8601 — parseable AND chronologically ordered.
    expect(Number.isNaN(Date.parse(r.started_at))).toBe(false);
    expect(Number.isNaN(Date.parse(r.completed_at))).toBe(false);
    expect(Date.parse(r.completed_at)).toBeGreaterThanOrEqual(Date.parse(r.started_at));
    expect(r.duration_ms).toBeGreaterThanOrEqual(0);
    expect(["success", "partial", "failed"]).toContain(r.status);
    expect(r.steps.length).toBe(5);
    expect(r.material.input_name).toBe("steel");
    expect(r.tool.diameter_mm).toBe(10);
    expect(r.machine.max_rpm).toBeGreaterThan(0);
    expect(r.output.rpm).toBeGreaterThan(0);
    expect(r.safety_score).toBeGreaterThanOrEqual(0);
    expect(r.safety_score).toBeLessThanOrEqual(1);
    // For "steel" + no machine + no flutes specified, ≥2 recommendations must fire
    // ("No machine specified" + "Flute count defaulted").
    expect(r.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(r.steps.map((s) => s.step)).toEqual([
      "resolve_material", "resolve_tool", "resolve_machine", "compute_speed_feed", "safety_check",
    ]);
    for (const s of r.steps) {
      expect(["pass", "fail", "warn"]).toContain(s.status);
      expect(s.duration_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it("variability: 3 spanning tool diameters (2mm, 10mm, 60mm) produce distinct tool_type + flute_count + RPM", () => {
    // Engine resolveTool() boundaries: ≤3mm micro_endmill+2 flutes, ≤6mm 2 flutes,
    // ≤12mm 3 flutes endmill, ≤25mm 4 flutes, >25mm 6 flutes, >50mm face_mill.
    // Verify all three regions produce distinct outputs for the same material.
    const mat = { material: "aluminum" };
    const micro = speedFeedAutopilotEngine.run({ ...mat, tool_diameter_mm: 2 });
    const mid = speedFeedAutopilotEngine.run({ ...mat, tool_diameter_mm: 10 });
    const face = speedFeedAutopilotEngine.run({ ...mat, tool_diameter_mm: 60 });
    expect(micro.tool.tool_type).toBe("micro_endmill");
    expect(mid.tool.tool_type).toBe("endmill");
    expect(face.tool.tool_type).toBe("face_mill");
    expect(micro.tool.flute_count).toBe(2);
    expect(mid.tool.flute_count).toBe(3);
    expect(face.tool.flute_count).toBe(6);
    // RPM = Vc × 1000 / (π × D). Larger D → lower RPM (at same Vc). Smaller D → higher RPM
    // (often capped at machine max). With identical machine + material across the three runs,
    // the diameter relationship dominates: micro RPM > mid RPM > face RPM.
    expect(micro.output.rpm).toBeGreaterThanOrEqual(mid.output.rpm);
    expect(mid.output.rpm).toBeGreaterThan(face.output.rpm);
  });
});
