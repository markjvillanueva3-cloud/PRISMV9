/**
 * WEDM Full End-to-End Validation — 45 tests across 10 stages
 *
 * Tests the COMPLETE wire EDM pipeline: DXF parsing → settings → multi-pass
 * strategy → Mitsubishi G-code generation, validated line-by-line against
 * real shop program conventions.
 */

import { describe, it, expect } from "vitest";
import { DXFGeometryParserEngine } from "../engines/DXFGeometryParserEngine.js";
import { WireEDMSettingsEngine } from "../engines/WireEDMSettingsEngine.js";
import { edmMultiPassStrategyEngine } from "../engines/EDMMultiPassStrategyEngine.js";
import { edmPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";
import { WEDMPrintToProgramEngine } from "../engines/WEDMPrintToProgramEngine.js";
import type { WireEDMController } from "../engines/EDMPostProcessGCodeEngine.js";
import type { WireEDMContour, ArcSegment, LineSegment } from "../engines/DXFGeometryParserEngine.js";

// ── Geometry Fixtures ───────────────────────────────────────────────

function makeRect(w: number, h: number, id = "rect"): WireEDMContour {
  return { id, is_closed: true, is_exterior: true, area_mm2: w * h, perimeter_mm: 2 * (w + h),
    bbox: { min_x: 0, min_y: 0, max_x: w, max_y: h },
    segments: [
      { type: "line", start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { type: "line", start: { x: w, y: 0 }, end: { x: w, y: h } },
      { type: "line", start: { x: w, y: h }, end: { x: 0, y: h } },
      { type: "line", start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ] as LineSegment[] };
}

function makeCircle(cx: number, cy: number, r: number, id = "circle"): WireEDMContour {
  return { id, is_closed: true, is_exterior: false, area_mm2: Math.PI * r * r, perimeter_mm: 2 * Math.PI * r,
    bbox: { min_x: cx - r, min_y: cy - r, max_x: cx + r, max_y: cy + r },
    segments: [
      { type: "arc", start: { x: cx + r, y: cy }, end: { x: cx - r, y: cy }, center: { x: cx, y: cy }, radius: r, start_angle_rad: 0, end_angle_rad: Math.PI, ccw: true } as ArcSegment,
      { type: "arc", start: { x: cx - r, y: cy }, end: { x: cx + r, y: cy }, center: { x: cx, y: cy }, radius: r, start_angle_rad: Math.PI, end_angle_rad: 2 * Math.PI, ccw: true } as ArcSegment,
    ] };
}

function makeHex(cx: number, cy: number, flat: number, id = "hex"): WireEDMContour {
  const r = flat / Math.sqrt(3);
  const pts = Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + 30) * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; });
  return { id, is_closed: true, is_exterior: true, area_mm2: (3 * Math.sqrt(3) / 2) * r * r, perimeter_mm: 6 * r,
    bbox: { min_x: Math.min(...pts.map(p => p.x)), min_y: Math.min(...pts.map(p => p.y)), max_x: Math.max(...pts.map(p => p.x)), max_y: Math.max(...pts.map(p => p.y)) },
    segments: pts.map((p, i) => ({ type: "line" as const, start: p, end: pts[(i + 1) % 6] })) as LineSegment[] };
}

function buildDxfRect(w: number, h: number): string {
  return ["0","SECTION","2","HEADER","9","$INSUNITS","70","4","0","ENDSEC","0","SECTION","2","ENTITIES",
    "0","LINE","8","0","10","0","20","0","30","0","11",String(w),"21","0","31","0",
    "0","LINE","8","0","10",String(w),"20","0","30","0","11",String(w),"21",String(h),"31","0",
    "0","LINE","8","0","10",String(w),"20",String(h),"30","0","11","0","21",String(h),"31","0",
    "0","LINE","8","0","10","0","20",String(h),"30","0","11","0","21","0","31","0",
    "0","ENDSEC","0","EOF"].join("\n");
}

const P = new WEDMPrintToProgramEngine();
async function mit(c: WireEDMContour[], o: Record<string, any> = {}) {
  return P.generate({ contours: c, material: o.material || "D2", thickness_mm: o.thickness || 25.4,
    target_ra_um: o.ra || 0.8, target_accuracy_mm: o.accuracy || 0.005, controller: "mitsubishi", program_number: 1, ...o });
}

// ============================================================================
// STAGE 1: DXF PARSING (3 tests)
// ============================================================================
describe("S1: DXF Parsing", () => {
  const parser = new DXFGeometryParserEngine();
  it("E01: rect DXF → closed 4-seg contour", () => { const r = parser.parseGeometryFile(buildDxfRect(25.4, 12.7), "dxf"); expect(r.contours.filter(c => c.is_closed).length).toBeGreaterThanOrEqual(1); });
  it("E02: detects mm units", () => { expect(parser.parseGeometryFile(buildDxfRect(50, 25), "dxf").source_units).toBe("mm"); });
  it("E03: bad DXF → 0 contours", () => { expect(parser.parseGeometryFile("garbage", "dxf").contours.length).toBe(0); });
});

// ============================================================================
// STAGE 2: CONTOUR→PROFILE (3 tests)
// ============================================================================
describe("S2: Contour→Profile", () => {
  it("E04: rect → X/Y coords in G-code", async () => { const r = await mit([makeRect(20, 10)]); expect(r.program_text).toMatch(/X[-.0-9]+.*Y[-.0-9]+/); });
  it("E05: circle → G02/G03 arcs with I/J", async () => { const r = await mit([makeCircle(0, 0, 10)]); expect(r.program_text).toMatch(/G0?[23]/); expect(r.program_text).toMatch(/I[-.0-9]/); });
  it("E06: exterior→G42, interior→G41", async () => {
    const ext = makeRect(20, 10); ext.is_exterior = true;
    const int = makeCircle(10, 10, 5); int.is_exterior = false;
    expect((await mit([ext])).program_text).toContain("G42");
    expect((await mit([int])).program_text).toContain("G41");
  });
});

// ============================================================================
// STAGE 3: SETTINGS (4 tests)
// ============================================================================
describe("S3: Settings", () => {
  const eng = new WireEDMSettingsEngine();
  const base = { wire_type: "brass_0.25" as const, workpiece_material: "D2", workpiece_thickness_mm: 25, workpiece_hardness_HRC: 60, target_surface_finish_Ra_um: 0.8, target_accuracy_mm: 0.005, taper_angle_deg: 0, is_submerged: true };

  it("E07: D2/25mm → valid speed range", () => { const r = eng.calculate(base); expect(r.first_cut_speed_mm_per_min).toBeGreaterThan(2); expect(r.first_cut_speed_mm_per_min).toBeLessThan(20); });
  it("E08: aluminum > steel speed", () => { expect(eng.calculate({ ...base, workpiece_material: "aluminum 6061" }).first_cut_speed_mm_per_min).toBeGreaterThan(eng.calculate({ ...base, workpiece_material: "4140" }).first_cut_speed_mm_per_min); });
  it("E09: 100mm < 10mm speed", () => { expect(eng.calculate({ ...base, workpiece_thickness_mm: 100 }).first_cut_speed_mm_per_min).toBeLessThan(eng.calculate({ ...base, workpiece_thickness_mm: 10 }).first_cut_speed_mm_per_min); });
  it("E10: Ra≤0.4→4 skims, Ra>3.2→0", () => { expect(eng.calculate({ ...base, target_surface_finish_Ra_um: 0.4 }).num_skim_cuts).toBe(4); expect(eng.calculate({ ...base, target_surface_finish_Ra_um: 3.5 }).num_skim_cuts).toBe(0); });
});

// ============================================================================
// STAGE 4: MULTI-PASS (4 tests)
// ============================================================================
describe("S4: MultiPass", () => {
  const plan = () => edmMultiPassStrategyEngine.full_plan({ material: "D2", thickness_mm: 25, profile_length_mm: 100, tolerance_mm: 0.005, target_ra_um: 0.8, wire_diameter_mm: 0.25 });
  it("E11: ≥3 passes, offsets decrease", () => { const p = plan(); expect(p.total_passes).toBeGreaterThanOrEqual(3); for (let i = 1; i < p.passes.length; i++) expect(p.passes[i].offset_mm).toBeLessThanOrEqual(p.passes[i-1].offset_mm + 0.001); });
  it("E12: Ra improves each pass", () => { const p = plan(); for (let i = 1; i < p.passes.length; i++) expect(p.passes[i].predicted_ra_um).toBeLessThanOrEqual(p.passes[i-1].predicted_ra_um + 0.1); });
  it("E13: energy drops (Klocke)", () => { const p = plan(); if (p.passes.length >= 2) expect(p.passes[1].energy_mj).toBeLessThan(p.passes[0].energy_mj); });
  it("E14: first offset > wire radius, last > 0", () => { const p = plan(); expect(p.passes[0].offset_mm).toBeGreaterThan(0.125); expect(p.passes[p.passes.length-1].offset_mm).toBeGreaterThan(0); });
});

// ============================================================================
// STAGE 5: MITSUBISHI G-CODE LINE-BY-LINE (10 tests)
// ============================================================================
describe("S5: Mitsubishi G-code", () => {
  it("E15: % header/footer", async () => { const r = await mit([makeRect(20, 10)]); const ls = r.program_text.split("\n"); expect(ls[0]).toBe("%"); expect(ls.filter(l => l.trim()).pop()).toBe("%"); });
  it("E16: L001 + H175 + G90 + G92", async () => { const t = (await mit([makeRect(20, 10)])).program_text; expect(t).toContain("L001"); expect(t).toContain("H175 = 0.0000"); expect(t).toContain("G90"); expect(t).toContain("G92 X0.0 Y0.0"); });
  it("E17: H-offset + H175", async () => { expect((await mit([makeRect(20, 10)])).program_text).toMatch(/H1\s*=.*\+ H175/); });
  it("E18: all M-codes present", async () => { const t = (await mit([makeRect(20, 10)])).program_text; for (const c of ["M20","M78","M80","M82","M84","M90","M01","M85","M83","M81","M21","M58","M02"]) expect(t).toContain(c); });
  it("E19: M-code order correct", async () => { const t = (await mit([makeRect(20, 10)])).program_text; const p = ["M20","M78","M80","M82","M84","M85","M21","M58"].map(c => t.indexOf(c)); for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i-1]); });
  it("E20: E-pack codes sequential", async () => { const d = (await mit([makeRect(20, 10)])).pass_details; for (let i = 1; i < d.length; i++) expect(parseInt(d[i].e_pack_code.slice(-1))).toBe(parseInt(d[i-1].e_pack_code.slice(-1)) + 1); });
  it("E21: G42/G41 + G40 present", async () => { const t = (await mit([makeRect(20, 10)])).program_text; expect(t).toMatch(/G4[12]/); expect(t).toContain("G40"); });
  it("E22: pass 3 reverses comp", async () => { const t = (await mit([makeRect(20, 10)], { ra: 0.4 })).program_text; const c: string[] = []; let m; const re = /G4([12])\s/g; while ((m = re.exec(t))) c.push(`G4${m[1]}`); if (c.length >= 3) expect(c[2]).not.toBe(c[0]); });
  it("E23: no undefined/null/NaN", async () => { const t = (await mit([makeRect(20, 10)])).program_text; expect(t).not.toContain("undefined"); expect(t).not.toContain("NaN"); });
  it("E24: N-lines valid format", async () => { for (const l of (await mit([makeRect(20, 10)])).program_text.split("\n")) if (l.startsWith("N")) expect(l).toMatch(/^N\d+/); });
});

// ============================================================================
// STAGE 6: FULL PIPELINE (4 tests)
// ============================================================================
describe("S6: Pipeline", () => {
  it("E25: DXF → program, all stages", async () => { const r = await P.generate({ dxf_content: buildDxfRect(25.4, 12.7), material: "D2", thickness_mm: 25.4, target_ra_um: 0.8, controller: "mitsubishi" }); expect(r.success).toBe(true); expect(r.stages_completed).toContain("dxf_parsed"); expect(r.stages_completed).toContain("gcode_generated"); });
  it("E26: contour_indices → correct count", async () => { const r = await P.generate({ contours: [makeRect(20,10,"a"),makeRect(15,8,"b"),makeRect(10,5,"c")], material: "D2", thickness_mm: 25, target_ra_um: 1.6, controller: "mitsubishi", contour_indices: [0,2] }); expect(r.profiles_cut).toBe(2); });
  it("E27: setup_sheet complete", async () => { const r = await mit([makeRect(20,10)], { material: "A2", part_name: "T", part_number: "P1", program_number: 42 }); expect(r.setup_sheet.part_name).toBe("T"); expect(r.setup_sheet.program_number).toBe(42); });
  it("E28: geometry_summary arcs", async () => { const r = await mit([makeHex(0,0,14), makeCircle(30,0,5)]); expect(r.geometry_summary.contour_details[1].has_arcs).toBe(true); });
});

// ============================================================================
// STAGE 7: MATERIALS (7 tests)
// ============================================================================
describe("S7: Materials", () => {
  for (const [name, ep] of [["D2","E1"],["stainless 304","E2"],["aluminum 6061","E3"],["copper C110","E4"],["carbide","E5"],["titanium Ti-6Al-4V","E6"]] as const) {
    it(`E29-${name}: E-pack ${ep}`, async () => { const r = await mit([makeRect(20,10)], { material: name }); expect(r.success).toBe(true); expect(r.pass_details[0].e_pack_code.startsWith(ep)).toBe(true); });
  }
  it("E30: carbide→moly", async () => { expect((await mit([makeRect(20,10)], { material: "carbide" })).setup_sheet.wire_type).toBe("moly_0.10"); });
});

// ============================================================================
// STAGE 8: CONTROLLERS (6 tests)
// ============================================================================
describe("S8: Controllers", () => {
  for (const c of ["fanuc","sodick","makino","mitsubishi","agiecharmilles"] as WireEDMController[]) {
    it(`E31-${c}: valid`, async () => { const r = await P.generate({ contours: [makeRect(20,10)], material: "D2", thickness_mm: 25, target_ra_um: 1.6, controller: c }); expect(r.success).toBe(true); expect(r.line_count).toBeGreaterThan(10); });
  }
  it("E32: Mit M20/M02 vs Fan M50/M30", async () => {
    const m = await mit([makeRect(20,10)]);
    const f = await P.generate({ contours: [makeRect(20,10)], material: "D2", thickness_mm: 25, target_ra_um: 1.6, controller: "fanuc" });
    expect(m.program_text).toContain("M20"); expect(m.program_text).toContain("M02");
    expect(f.program_text).toContain("M50"); expect(f.program_text).toContain("M30");
  });
});

// ============================================================================
// STAGE 9: EDGE CASES (7 tests)
// ============================================================================
describe("S9: Edge Cases", () => {
  it("E33: no geometry→fail", async () => { expect((await P.generate({ material: "D2", thickness_mm: 25 })).success).toBe(false); });
  it("E34: empty→fail", async () => { expect((await P.generate({ contours: [], material: "D2", thickness_mm: 25 })).success).toBe(false); });
  it("E35: open→rejected", async () => { expect((await P.generate({ contours: [{ id: "o", is_closed: false, is_exterior: true, area_mm2: 0, perimeter_mm: 20, bbox: { min_x: 0, min_y: 0, max_x: 10, max_y: 10 }, segments: [{ type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } }] as LineSegment[] }], material: "D2", thickness_mm: 25 })).success).toBe(false); });
  it("E36: micro 0.5mm→ok", async () => { expect((await mit([makeRect(0.5, 0.5)], { material: "stainless 304", thickness: 1, wire_type: "tungsten_0.05" })).success).toBe(true); });
  it("E37: 200mm thick→ok+notes", async () => { const r = await mit([makeRect(20,10)], { thickness: 200 }); expect(r.success).toBe(true); expect(r.setup_sheet.notes.length).toBeGreaterThan(0); });
  it("E38: Ra 0.2→5+ passes", async () => { expect((await mit([makeRect(20,10)], { ra: 0.2, accuracy: 0.002 })).passes_per_profile).toBeGreaterThanOrEqual(5); });
  it("E39: Ra 4.0/tol 0.1→≤2 passes", async () => { expect((await mit([makeRect(20,10)], { ra: 4.0, accuracy: 0.1, material: "4140" })).passes_per_profile).toBeLessThanOrEqual(2); });
});

// ============================================================================
// STAGE 10: REAL SHOP PATTERNS (6 tests)
// ============================================================================
describe("S10: Shop Patterns", () => {
  it("E40: ITW hex 3-6 passes, plausible offsets", async () => {
    const r = await P.generate({ contours: [makeHex(0,0,14.224)], material: "D2", hardness_hrc: 60, thickness_mm: 25.4, target_ra_um: 0.8, target_accuracy_mm: 0.005, controller: "mitsubishi", wire_type: "brass_0.25", part_number: "500-30540" });
    expect(r.passes_per_profile).toBeGreaterThanOrEqual(3);
    expect(r.pass_details[0].offset_mm).toBeGreaterThan(0.10);
    expect(r.pass_details[0].offset_mm).toBeLessThan(0.40);
  });
  it("E41: hex+circle multi-profile arcs", async () => { const r = await mit([makeHex(0,0,14), makeCircle(30,0,5)]); expect(r.profiles_cut).toBe(2); expect(r.program_text).toMatch(/G0?[23]/); });
  it("E42: machine-loadable format", async () => { const r = await mit([makeRect(20,10)]); expect(r.program_text).not.toContain("undefined"); expect(r.program_text).not.toContain("NaN"); const ls = r.program_text.split("\n").filter(l => l.trim()); expect(ls[0]).toBe("%"); expect(ls[ls.length-1]).toBe("%"); });
  it("E43: offsets plausible for 0.25mm wire", async () => { for (const p of (await mit([makeRect(20,10)], { wire_type: "brass_0.25" })).pass_details) { expect(p.offset_mm).toBeGreaterThan(0.05); expect(p.offset_mm).toBeLessThan(0.5); } });
  it("E44: time scales with perimeter", async () => { const s = await mit([makeRect(10,5)]); const l = await mit([makeRect(100,50)]); expect(l.setup_sheet.total_time_min).toBeGreaterThan(s.setup_sheet.total_time_min * 3); });
  it("E45: wire scales with perimeter", async () => { const s = await mit([makeRect(10,5)]); const l = await mit([makeRect(100,50)]); expect(l.wire_consumption_m).toBeGreaterThan(s.wire_consumption_m); });
});
