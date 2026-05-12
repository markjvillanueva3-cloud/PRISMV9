/**
 * Live output inspection — generates real programs and prints them to stdout.
 * Run with: npx vitest run src/__tests__/wedm-live-output.test.ts --reporter=verbose
 */
import { describe, it, expect } from "vitest";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMContour, LineSegment } from "../engines/DXFGeometryParserEngine.js";

const engine = new WEDMPrintToProgramEngine();

function hexContour(sideLen: number): WireEDMContour {
  const pts: Array<{x:number;y:number}> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push({ x: sideLen * Math.cos(a), y: sideLen * Math.sin(a) });
  }
  const segs: LineSegment[] = [];
  for (let i = 0; i < 6; i++) {
    segs.push({ type: "line", start: pts[i], end: pts[(i + 1) % 6] });
  }
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return {
    id: "hex", segments: segs, is_closed: true, is_exterior: true,
    area_mm2: (3 * Math.sqrt(3) / 2) * sideLen * sideLen,
    perimeter_mm: 6 * sideLen,
    bbox: { min_x: Math.min(...xs), min_y: Math.min(...ys), max_x: Math.max(...xs), max_y: Math.max(...ys) },
  };
}

describe("LIVE PROGRAM GENERATION — Real Shop Output Inspection", () => {
  it("D2 Tool Steel | 25.4mm | 0.25mm Brass | Mitsubishi (ITW SHAKEPROOF style)", async () => {
    const r = await engine.generate({
      contours: [hexContour(3.5)],
      material: "D2", hardness_hrc: 62, thickness_mm: 25.4,
      target_ra_um: 0.8, target_accuracy_mm: 0.005,
      wire_type: "brass_0.25", controller: "mitsubishi",
      program_number: 1221, units: "imperial", submerged: true,
      part_name: "ITW-HEX-D2",
    });

    console.log("\n=== D2 HEX DIE — MITSUBISHI ===");
    console.log(`Passes: ${r.passes_per_profile} | Ra: ${r.predicted_ra_um.toFixed(3)} um | Acc: ${r.predicted_accuracy_mm.toFixed(4)} mm | Time: ${r.estimated_time_min.toFixed(1)} min | Wire: ${r.wire_consumption_m.toFixed(1)} m | Conf: ${r.confidence_score.overall}%`);
    for (const p of r.pass_details) {
      console.log(`  P${p.pass_number} ${p.e_pack_code} F${p.feed_mm_min.toFixed(3)} H${(p.offset_mm/25.4).toFixed(4)}" Ra${p.predicted_ra_um.toFixed(2)}`);
    }
    console.log("--- Program ---");
    r.program_text.split("\n").forEach(l => console.log(l));

    expect(r.success).toBe(true);
    // Validate against ITW SHAKEPROOF ground truth
    expect(r.passes_per_profile).toBeGreaterThanOrEqual(3);
    expect(r.passes_per_profile).toBeLessThanOrEqual(6);
    const p1OffsetIn = r.pass_details[0].offset_mm / 25.4;
    expect(p1OffsetIn).toBeGreaterThan(0.004);   // real: 0.0085"
    expect(p1OffsetIn).toBeLessThan(0.020);
    expect(r.pass_details[0].e_pack_code).toMatch(/^E1/);  // D2 = tool steel group 1
    expect(r.program_text).toContain("M20");
    expect(r.program_text).toContain("H175");
    expect(r.program_text.split("\n")[0]).toBe("%");
  });

  it("304 Stainless | 50mm | 0.25mm Brass | Mitsubishi (NOZE TEST style)", async () => {
    const r = await engine.generate({
      contours: [hexContour(5.0)],
      material: "304SS", thickness_mm: 50,
      target_ra_um: 0.4, target_accuracy_mm: 0.003,
      wire_type: "brass_0.25", controller: "mitsubishi",
      program_number: 2821, units: "metric", submerged: true,
      part_name: "304SS-50MM",
    });

    console.log("\n=== 304SS — MITSUBISHI 50mm ===");
    console.log(`Passes: ${r.passes_per_profile} | Ra: ${r.predicted_ra_um.toFixed(3)} um | Time: ${r.estimated_time_min.toFixed(1)} min | Conf: ${r.confidence_score.overall}%`);
    for (const p of r.pass_details) {
      console.log(`  P${p.pass_number} ${p.e_pack_code} F${p.feed_mm_min.toFixed(3)} H${p.offset_mm.toFixed(4)} Ra${p.predicted_ra_um.toFixed(2)}`);
    }

    expect(r.success).toBe(true);
    expect(r.passes_per_profile).toBeGreaterThanOrEqual(4);  // tight tolerance needs more passes
    expect(r.pass_details[0].e_pack_code).toMatch(/^E2/);  // SS = group 2
    expect(r.predicted_ra_um).toBeLessThanOrEqual(0.8);
  });

  it("Grade 5 Titanium | 38mm | 0.20mm Brass | Mitsubishi (Aerospace)", async () => {
    const r = await engine.generate({
      contours: [hexContour(4.0)],
      material: "Ti-6Al-4V", thickness_mm: 38,
      target_ra_um: 1.6, target_accuracy_mm: 0.010,
      wire_type: "brass_0.20", controller: "mitsubishi",
      program_number: 5001, units: "metric", submerged: true,
      part_name: "TI64-AEROSPACE",
    });

    console.log("\n=== Ti-6Al-4V — MITSUBISHI 38mm ===");
    console.log(`Passes: ${r.passes_per_profile} | Ra: ${r.predicted_ra_um.toFixed(3)} um | Time: ${r.estimated_time_min.toFixed(1)} min | Conf: ${r.confidence_score.overall}%`);
    for (const p of r.pass_details) {
      console.log(`  P${p.pass_number} ${p.e_pack_code} F${p.feed_mm_min.toFixed(3)} H${p.offset_mm.toFixed(4)} Ra${p.predicted_ra_um.toFixed(2)}`);
    }

    expect(r.success).toBe(true);
    // Titanium: slower feed than steel (reactive, lower conductivity)
    const firstFeed = r.pass_details[0].feed_mm_min;
    const d2BaseFeed = 2.5; // typical D2 rough feed mm/min
    expect(firstFeed).toBeLessThanOrEqual(d2BaseFeed * 0.9);  // Ti slower than D2
  });

  it("Inconel 718 | 20mm | 0.20mm Coated | Mitsubishi (Nickel Superalloy)", async () => {
    const r = await engine.generate({
      contours: [hexContour(4.0)],
      material: "Inconel 718", thickness_mm: 20,
      target_ra_um: 0.8, target_accuracy_mm: 0.005,
      wire_type: "coated_0.20", controller: "mitsubishi",
      program_number: 6001, units: "metric", submerged: true,
      part_name: "IN718-TURBINE",
    });

    console.log("\n=== Inconel 718 — MITSUBISHI 20mm ===");
    console.log(`Passes: ${r.passes_per_profile} | Ra: ${r.predicted_ra_um.toFixed(3)} um | Time: ${r.estimated_time_min.toFixed(1)} min | Conf: ${r.confidence_score.overall}%`);
    for (const p of r.pass_details) {
      console.log(`  P${p.pass_number} ${p.e_pack_code} F${p.feed_mm_min.toFixed(3)} H${p.offset_mm.toFixed(4)} Ra${p.predicted_ra_um.toFixed(2)}`);
    }

    expect(r.success).toBe(true);
  });
});

// ============================================================================
// CONTROLLER DIALECT COVERAGE — all 5 supported controllers
// ============================================================================
describe("CONTROLLER DIALECT COVERAGE — D2 @ 25mm across all controllers", () => {
  const BASE_INPUT = {
    contours: [hexContour(3.5)],
    material: "D2", thickness_mm: 25,
    target_ra_um: 1.6, target_accuracy_mm: 0.010,
    wire_type: "brass_0.25", units: "metric" as const, submerged: true,
    program_number: 9001,
  };

  it("Fanuc — ISO G-code with O-number header", async () => {
    const r = await engine.generate({ ...BASE_INPUT, controller: "fanuc", part_name: "D2-FANUC" });
    console.log("\n=== FANUC ===");
    r.program_text.split("\n").slice(0, 12).forEach(l => console.log(l));
    expect(r.success).toBe(true);
    expect(r.program_text).toMatch(/^O\d+|^%/);
  });

  it("Sodick — K-type technology codes", async () => {
    const r = await engine.generate({ ...BASE_INPUT, controller: "sodick", part_name: "D2-SODICK" });
    console.log("\n=== SODICK ===");
    r.program_text.split("\n").slice(0, 12).forEach(l => console.log(l));
    expect(r.success).toBe(true);
    expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(0);
  });

  it("Makino — U-series HyperCut codes", async () => {
    const r = await engine.generate({ ...BASE_INPUT, controller: "makino", part_name: "D2-MAKINO" });
    console.log("\n=== MAKINO ===");
    r.program_text.split("\n").slice(0, 12).forEach(l => console.log(l));
    expect(r.success).toBe(true);
    expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(0);
  });

  it("AgieCharmilles — ISO with T-codes", async () => {
    const r = await engine.generate({ ...BASE_INPUT, controller: "agiecharmilles", part_name: "D2-AGIE" });
    console.log("\n=== AGIECHARMILLES ===");
    r.program_text.split("\n").slice(0, 12).forEach(l => console.log(l));
    expect(r.success).toBe(true);
    expect(r.pass_details[0].feed_mm_min).toBeGreaterThan(0);
  });

  it("Mitsubishi — E-pack codes (baseline reference)", async () => {
    const r = await engine.generate({ ...BASE_INPUT, controller: "mitsubishi", part_name: "D2-MITSUBISHI" });
    console.log("\n=== MITSUBISHI (reference) ===");
    r.program_text.split("\n").slice(0, 12).forEach(l => console.log(l));
    expect(r.success).toBe(true);
    expect(r.program_text).toContain("H175");   // Mitsubishi global offset register
    expect(r.pass_details[0].e_pack_code).toMatch(/^E1/);
  });
});
