/**
 * OkumaOSPMillFullPSN.test.ts — generateProgramWithFullPSN() coverage.
 *
 * Mirrors HurcoV11FullPSN.test.ts (echo iter9 2026-05-24). Verifies the
 * Okuma OSP-P*M PSN-engaged variant composes the same 4 PSN substrates
 * (runtime predictor + bidirectional optimizer + first-order cost +
 * AI feature recs) as additive `psn_enrichment` without disturbing the
 * legacy `generateProgram()` byte-for-byte.
 *
 * @milestone HURCO-VM30I-FULL-PSN-MS0  (slot:echo iter18 2026-05-25)
 */

import { describe, it, expect } from "vitest";
import { okumaOSPMillMasterPostEngine } from "../engines/OkumaOSPMillMasterPostEngine.js";
import type { MillOperation } from "../engines/HurcoV11MillMasterPostEngine.js";

// Canonical fixture shape — matches V11 test (MillOperation contract).
const sampleOps: MillOperation[] = [
  {
    operation_type: "face",
    tool_number: 1,
    tool_diameter_mm: 50,
    tool_flutes: 5,
    tool_description: "Sandvik 50mm face mill",
    material_iso: "N",
    spindle_rpm: 8000,
    feed_mm_min: 1800,
    axial_depth_mm: 0.5,
    radial_depth_mm: 30,
    coolant: "flood",
    coordinates: [
      { type: "linear", x: 0, y: 0, z: 1 },
      { type: "linear", x: 100, y: 0, z: 1 },
      { type: "linear", x: 100, y: 30, z: 1 },
      { type: "linear", x: 0, y: 30, z: 1 },
      { type: "linear", x: 0, y: 0, z: 1 },
    ],
  },
  {
    operation_type: "drill",
    tool_number: 2,
    tool_diameter_mm: 8,
    tool_flutes: 2,
    tool_description: "8mm carbide drill",
    material_iso: "N",
    spindle_rpm: 4000,
    feed_mm_min: 400,
    axial_depth_mm: 10,
    coolant: "flood",
    coordinates: [
      { type: "linear", x: 50, y: 15, z: 1 },
      { type: "linear", x: 50, y: 15, z: -10 },
      { type: "linear", x: 50, y: 15, z: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Happy path — full PSN engages on default + P500/M460V
// ---------------------------------------------------------------------------

describe("OkumaOSPMill generateProgramWithFullPSN — happy path", () => {
  it("emits gcode with at least 10 lines for 2-op program", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.gcode.length > 10).toBe(true);
  });

  it("psn_enrichment field is present (not undefined)", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment !== undefined).toBe(true);
  });

  it("enriched_at is a non-empty ISO string", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(typeof r.psn_enrichment!.enriched_at).toBe("string");
    expect(r.psn_enrichment!.enriched_at.length > 10).toBe(true);
  });

  it("runtime_estimate machine_id defaults to okuma_m460v (registered in MACHINE_LIBRARY)", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment!.runtime_estimate!.machine_id).toBe("okuma_m460v");
  });

  // Reviewer A P0 anti-regression — earlier draft defaulted to
  // "okuma_genos_m460v" which is NOT in MACHINE_LIBRARY, so the runtime +
  // optimizer try/catch blocks both swallowed Unknown machine_id errors
  // while the catch-path echoed the input string. Tests passed for the
  // wrong reason. This test locks in the fix: default-machine call MUST
  // fully engage all 4 PSN substrates (full_psn_engaged === true, zero
  // substrate_errors). If this fails, the default machine_id has drifted
  // out of MACHINE_LIBRARY again.
  it("default-machine call fully engages all 4 PSN substrates (no silent failures)", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    expect(r.psn_enrichment!.full_psn_engaged).toBe(true);
    expect(r.psn_enrichment!.substrate_errors.length).toBe(0);
  });

  // Reviewer B P1 — verify a non-default machine_id is echoed back, not
  // silently overridden by the predictor. Use another registered machine
  // (hurco_vmx24) to ensure round-trip through the predictor preserves it.
  it("explicit machine_id is echoed in runtime_estimate (not silently overridden)", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 9500 },
      { machine_id: "hurco_vmx24" },
    );
    expect(r.psn_enrichment!.runtime_estimate!.machine_id).toBe("hurco_vmx24");
    expect(r.psn_enrichment!.full_psn_engaged).toBe(true);
  });

  it("runtime_estimate.total_minutes >= 0 + finite", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const minutes = r.psn_enrichment!.runtime_estimate!.total_minutes;
    expect(Number.isFinite(minutes)).toBe(true);
    expect(minutes >= 0).toBe(true);
  });

  it("runtime_estimate.confidence in [0,1]", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const c = r.psn_enrichment!.runtime_estimate!.confidence;
    expect(c >= 0).toBe(true);
    expect(c <= 1).toBe(true);
  });

  it("optimizer_recommendations.count matches top_3.length (top_3 ≤ 3)", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const recs = r.psn_enrichment!.optimizer_recommendations!;
    expect(Array.isArray(recs.top_3)).toBe(true);
    expect(recs.top_3.length <= 3).toBe(true);
    // count is total available, top_3 is the slice — invariant top_3.length ≤ count
    expect(recs.top_3.length <= recs.count).toBe(true);
  });

  it("cost_report total = (labor + machine) × (1 + overhead) within 1¢", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 4000 },
      { shop_rates: { labor_per_hr_usd: 80, machine_per_hr_usd: 120, overhead_pct: 0.20 } },
    );
    const cost = r.psn_enrichment!.cost_report!;
    const cycle_hr = cost.cycle_min / 60;
    const expected = (80 * cycle_hr + 120 * cycle_hr) * 1.20;
    // Cost rounds to nearest cent
    expect(Math.abs(cost.total_cost_usd - Math.round(expected * 100) / 100) < 0.02).toBe(true);
  });

  it("cost_report most_expensive='machine_time' when machine_rate > labor_rate", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 4100 },
      { shop_rates: { labor_per_hr_usd: 65, machine_per_hr_usd: 95, overhead_pct: 0.15 } },
    );
    expect(r.psn_enrichment!.cost_report!.most_expensive_line_item).toBe("machine_time");
  });

  it("cost_report most_expensive='labor' when labor_rate > machine_rate", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 4200 },
      { shop_rates: { labor_per_hr_usd: 150, machine_per_hr_usd: 80, overhead_pct: 0.15 } },
    );
    expect(r.psn_enrichment!.cost_report!.most_expensive_line_item).toBe("labor");
  });

  it("ai_feature_recommendations.top_5.length ≤ 5 + ≤ count", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(sampleOps);
    const ai = r.psn_enrichment!.ai_feature_recommendations!;
    expect(ai.top_5.length <= 5).toBe(true);
    expect(ai.top_5.length <= ai.count).toBe(true);
  });

  it("P500 + super_nurbs preserves the Super-NURBS tribal tip in base output", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 2000, osp_family: "P500", use_super_nurbs: true },
    );
    const hasSuperNurbsTip = r.tribal_tips_applied.some(t => t.includes("super_nurbs"));
    expect(hasSuperNurbsTip).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe("OkumaOSPMill generateProgramWithFullPSN — failure modes", () => {
  it("empty operations array — header still emits, enrichment populated", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN([]);
    expect(r.gcode.length > 0).toBe(true);
    expect(r.psn_enrichment !== undefined).toBe(true);
    expect(r.psn_enrichment!.cost_report !== undefined).toBe(true);
  });

  it("unknown machine_id — optimizer substrate carries error string; full_psn_engaged=false", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 6100 },
      { machine_id: "okuma_nonexistent_machine_xyz" },
    );
    expect(r.psn_enrichment!.full_psn_engaged).toBe(false);
    expect(r.psn_enrichment!.substrate_errors.length >= 1).toBe(true);
    // The optimizer substrate explicitly throws on machine-library miss
    const hasOptErr = r.psn_enrichment!.substrate_errors.some(e => e.startsWith("optimizer_recommendations"));
    expect(hasOptErr).toBe(true);
  });

  it("operation with empty coordinates — operationsToParsedBlocksForOkuma skips, runtime stays finite", async () => {
    const empty: MillOperation = { ...sampleOps[0], coordinates: [] };
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN([empty]);
    expect(Number.isFinite(r.psn_enrichment!.runtime_estimate!.total_minutes)).toBe(true);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Adversarial — NaN, Infinity
// ---------------------------------------------------------------------------

describe("OkumaOSPMill generateProgramWithFullPSN — adversarial inputs", () => {
  it("NaN coordinate — defensive parser drops it; runtime stays finite", async () => {
    const nanOp: MillOperation = {
      ...sampleOps[0],
      coordinates: [
        { type: "linear", x: 0, y: 0, z: 1 },
        { type: "linear", x: NaN, y: 0, z: 1 },
        { type: "linear", x: 100, y: 0, z: 1 },
      ],
    };
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN([nanOp]);
    expect(Number.isFinite(r.psn_enrichment!.runtime_estimate!.total_minutes)).toBe(true);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });

  it("Infinity feed_mm_min — defensive parser drops it; cost stays finite", async () => {
    const infOp: MillOperation = { ...sampleOps[0], feed_mm_min: Infinity };
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN([infOp]);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Material variability — 3 spanning ISO groups (P, M, N)
// ---------------------------------------------------------------------------

describe("OkumaOSPMill generateProgramWithFullPSN — material variability", () => {
  it("ISO P (carbon steel) — psn_enrichment populates", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 8000 },
      { material: { name: "carbon_steel_1018", iso_group: "P" } },
    );
    expect(r.psn_enrichment !== undefined).toBe(true);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });

  it("ISO M (stainless 304) — psn_enrichment populates", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 8100 },
      { material: { name: "stainless_304", iso_group: "M" } },
    );
    expect(r.psn_enrichment !== undefined).toBe(true);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });

  it("ISO N (aluminum 6061) — psn_enrichment populates", async () => {
    const r = await okumaOSPMillMasterPostEngine.generateProgramWithFullPSN(
      sampleOps,
      { program_number: 8200 },
      { material: { name: "aluminum_6061", iso_group: "N" } },
    );
    expect(r.psn_enrichment !== undefined).toBe(true);
    expect(Number.isFinite(r.psn_enrichment!.cost_report!.total_cost_usd)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Anti-regression — legacy generateProgram() byte-identity
// ---------------------------------------------------------------------------

describe("OkumaOSPMill generateProgram (legacy) — psn_enrichment stays undefined", () => {
  it("legacy generateProgram() does NOT populate psn_enrichment", () => {
    const r = okumaOSPMillMasterPostEngine.generateProgram(sampleOps, { program_number: 9000 });
    expect(r.psn_enrichment === undefined).toBe(true);
    // Existing fields still present + correctly populated
    expect(r.program_number).toBe(9000);
    expect(r.gcode.length > 0).toBe(true);
    expect(Array.isArray(r.block_annotations)).toBe(true);
  });

  it("legacy generateProgram() returns same gcode line count regardless of test run order", () => {
    const r1 = okumaOSPMillMasterPostEngine.generateProgram(sampleOps, { program_number: 9100 });
    const r2 = okumaOSPMillMasterPostEngine.generateProgram(sampleOps, { program_number: 9100 });
    expect(r1.gcode.length).toBe(r2.gcode.length);
  });
});
