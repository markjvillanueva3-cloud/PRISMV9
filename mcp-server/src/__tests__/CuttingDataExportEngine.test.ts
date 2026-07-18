/**
 * CuttingDataExportEngine.test.ts — U-OSCAR-CuttingDataExportEngine-TEST
 * ============================================================================
 * REAL reference-value coverage for CuttingDataExportEngine (E1128), which had
 * ZERO test files referencing it. The engine computes physics-backed cutting
 * data (Kienzle force / Taylor tool life / speed-feed kinematics) and exports it
 * into 6 CAM-native formats. It is dispatcher-wired into camDispatcher via the
 * `cutting_data_compute` and `cutting_data_export` actions.
 *
 * WHAT THIS PROVES
 *   1. computeCuttingData() emits the engine's OWN published formulas with the
 *      exact toFixed rounding, pinned to hand-derived literals (an INDEPENDENT
 *      reimplementation of the formulas, not an echo of the engine) so a formula
 *      or constant drift FAILS the suite (R9 — tests verify intent).
 *   2. The wired path through the real camDispatcher round-trips the same numbers
 *      (R15 — round-trip through the dispatcher, not just the singleton).
 *
 * PHYSICS (engine header, verified against source lines 251-274):
 *   Vc  = VC_BASE[iso] × coating_mult × coolant_mult × opScale.vc        (m/min)
 *   fz  = D × CHIP_LOAD_FACTOR[iso] × opScale.fz                         (mm/tooth)
 *   ap  = D × AP_FACTOR[iso] × opScale.ap                                (mm)
 *   ae  = D × AE_FACTOR[iso] × opScale.ae                                (mm)
 *   rpm = 1000 × Vc / (π × D)
 *   Vf  = fz × z × rpm                                                    (mm/min)
 *   Fc  = kc1_1 × ap × fz^(1−mc)                                          (N, Kienzle)
 *   T   = (C / Vc)^(1/n)                                                  (min, Taylor)
 *   P   = Fc × Vc / 60000                                                 (kW)
 *
 * REFERENCE-VALUE PROVENANCE: every expected literal below was computed by an
 * independent re-implementation of the above formulas (constants transcribed
 * from the engine's own VC_BASE / CHIP_LOAD_FACTOR / AP/AE_FACTOR / COATING_MULT
 * / COOLANT_MULT / KIENZLE_DATA / TAYLOR_DATA tables) and the same
 * `+(x).toFixed(n)` rounding the engine applies.
 *
 * R12 BUG #1 — FIXED (U-oscar-CoatingKey): the lookup lowercased the coating key —
 * `(tool.coating ?? "uncoated").toLowerCase()` — but COATING_MULT was keyed with
 * MIXED case (TiN, TiCN, TiAlN, AlTiN, AlCrN, DLC). So every coating EXCEPT
 * `uncoated`/`diamond` (already all-lowercase) missed the lookup and silently fell
 * back to multiplier 1.00 — a TiAlN endmill was calculated at the SAME cutting
 * speed as an uncoated one, dropping the intended +25% Vc premium. FIX: the engine
 * now looks up a lowercased-key map (COATING_MULT_LC) so the lookup is
 * case-insensitive. Coolant was always UNAFFECTED (COOLANT_MULT keys are lowercase).
 * This suite now asserts the CORRECT premium-applied numbers and the §3b block
 * below witnesses the fix explicitly (TiAlN Vc 206.25 > uncoated 165).
 *
 * R12 BUG #2 (unguarded diameter — pinned NOT weakened): the engine performs NO
 * input validation on diameter. D=0 yields rpm=Infinity + Vf=NaN (division by
 * zero, lines 262-263); D<0 yields Fc=NaN (Math.pow of a negative base to a
 * fractional exponent, line 267). Pinned as CURRENT behavior below and flagged.
 *
 * @engine CuttingDataExportEngine
 * @shortcode E1128
 * @dispatcher camDispatcher
 * @actions cutting_data_compute, cutting_data_export
 * @slot oscar
 */

import { describe, it, expect, beforeAll } from "vitest";

import {
  cuttingDataExportEngine,
  CuttingDataExportEngineClass,
  type CuttingTool,
  type MaterialRecord,
} from "../engines/CuttingDataExportEngine.js";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

// ── Shared fixtures ──────────────────────────────────────────────────────────
const TOOL_A: CuttingTool = { id: "T001", diameter_mm: 10, flutes: 4, coating: "TiAlN", material: "carbide" };
const MAT_P: MaterialRecord = { name: "4140 Steel", iso_group: "P", coolant: "flood" };

// ============================================================================
// 1. HAPPY PATH — exact physics reference values (singleton)
// ============================================================================
describe("CuttingDataExportEngine.computeCuttingData — reference physics", () => {
  it("Case A: P / TiAlN / flood / D10 z4 semi_finishing (TiAlN 1.25 premium applied — FIX)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(TOOL_A, MAT_P, "semi_finishing");
    // FIX (U-oscar-CoatingKey): TiAlN now resolves → Vc = 150 × 1.25 × 1.10 × 1.00 = 206.25
    expect(d.Vc_mpm).toBe(206.25);
    // fz = 10 × 0.010 × 1.00 = 0.1
    expect(d.fz_mm).toBe(0.1);
    // ap = 10 × 0.50 = 5 ; ae = 10 × 0.40 = 4
    expect(d.ap_mm).toBe(5);
    expect(d.ae_mm).toBe(4);
    // rpm = 1000×206.25/(π×10) = 6565.1
    expect(d.rpm).toBeCloseTo(6565.1, 1);
    // Vf = 0.1 × 4 × 6565.1 = 2626.0
    expect(d.Vf_mmpm).toBeCloseTo(2626.0, 1);
    // Fc = 1800 × 5 × 0.1^0.75 = 1600.5  (coating-independent)
    expect(d.Fc_N).toBeCloseTo(1600.5, 1);
    // T = (280/206.25)^4 = 3.4  (higher Vc → shorter Taylor life)
    expect(d.tool_life_min).toBeCloseTo(3.4, 1);
    // P = 1600.5 × 206.25 / 60000 = 5.502
    expect(d.power_kW).toBeCloseTo(5.502, 3);
    expect(d.iso_group).toBe("P");
    expect(d.operation).toBe("semi_finishing");
    expect(d.material_name).toBe("4140 Steel");
  });

  it("Case B: N / uncoated / dry / D6 z2 high_speed", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 6, flutes: 2, coating: "uncoated" },
      { name: "6061-T6", iso_group: "N", coolant: "dry" },
      "high_speed",
    );
    // Vc = 400 × 1.00 × 0.90 × 1.40 = 504
    expect(d.Vc_mpm).toBe(504);
    // fz = 6 × 0.015 × 0.40 = 0.036
    expect(d.fz_mm).toBe(0.036);
    // ap = 6 × 1.00 × 0.15 = 0.9 ; ae = 6 × 0.50 × 0.10 = 0.3
    expect(d.ap_mm).toBe(0.9);
    expect(d.ae_mm).toBe(0.3);
    expect(d.rpm).toBeCloseTo(26738.0, 0);
    expect(d.Vf_mmpm).toBeCloseTo(1925.1, 1);
    // Fc = 700 × 0.9 × 0.036^0.77 = 48.7
    expect(d.Fc_N).toBeCloseTo(48.7, 1);
    // T = (600/504)^(1/0.35) = 1.6
    expect(d.tool_life_min).toBeCloseTo(1.6, 1);
    expect(d.power_kW).toBeCloseTo(0.409, 3);
  });

  it("Case C: S / AlTiN / hpc / D8 z4 roughing (AlTiN 1.28 premium applied — FIX)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 8, flutes: 4, coating: "AlTiN" },
      { name: "Inconel 718", iso_group: "S", coolant: "hpc" },
      "roughing",
    );
    // FIX (U-oscar-CoatingKey): AlTiN now resolves → Vc = 50 × 1.28 × 1.20 × 0.85 = 65.28
    expect(d.Vc_mpm).toBe(65.28);
    // fz = 8 × 0.006 × 1.20 = 0.0576
    expect(d.fz_mm).toBe(0.0576);
    // ap = 8 × 0.30 × 1.50 = 3.6 ; ae = 8 × 0.25 × 1.30 = 2.6
    expect(d.ap_mm).toBe(3.6);
    expect(d.ae_mm).toBe(2.6);
    // rpm = 1000×65.28/(π×8) = 2597.4
    expect(d.rpm).toBeCloseTo(2597.4, 1);
    // Vf = 0.0576 × 4 × 2597.4 = 598.4
    expect(d.Vf_mmpm).toBeCloseTo(598.4, 1);
    // Fc = 2800 × 3.6 × 0.0576^0.72 = 1291.1  (coating-independent)
    expect(d.Fc_N).toBeCloseTo(1291.1, 1);
    // T = (80/65.28)^(1/0.20) = 2.8  (higher Vc → shorter Taylor life)
    expect(d.tool_life_min).toBeCloseTo(2.8, 1);
    // P = 1291.1 × 65.28 / 60000 = 1.405
    expect(d.power_kW).toBeCloseTo(1.405, 3);
  });

  it("Case D: K / TiCN / mist / D12 z3 finishing (TiCN 1.15 premium applied — FIX)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 12, flutes: 3, coating: "TiCN" },
      { name: "Gray Iron", iso_group: "K", coolant: "mist" },
      "finishing",
    );
    // FIX (U-oscar-CoatingKey): TiCN now resolves → Vc = 200 × 1.15 × 1.00 × 1.15 = 264.5
    expect(d.Vc_mpm).toBe(264.5);
    // fz = 12 × 0.012 × 0.70 = 0.1008
    expect(d.fz_mm).toBe(0.1008);
    // ap = 12 × 0.60 × 0.30 = 2.16 ; ae = 12 × 0.50 × 0.25 = 1.5
    expect(d.ap_mm).toBe(2.16);
    expect(d.ae_mm).toBe(1.5);
    // rpm = 1000×264.5/(π×12) = 7016.1
    expect(d.rpm).toBeCloseTo(7016.1, 1);
    // Vf = 0.1008 × 3 × 7016.1 = 2121.7
    expect(d.Vf_mmpm).toBeCloseTo(2121.7, 1);
    // Fc = 1100 × 2.16 × 0.1008^0.72 = 455.3  (coating-independent)
    expect(d.Fc_N).toBeCloseTo(455.3, 1);
    // T = (320/264.5)^(1/0.28) = 2.0  (higher Vc → shorter Taylor life)
    expect(d.tool_life_min).toBeCloseTo(2.0, 1);
    // P = 455.3 × 264.5 / 60000 = 2.007
    expect(d.power_kW).toBeCloseTo(2.007, 3);
  });

  it("Case E: M / diamond / cryogenic / D5 z4 semi_finishing", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 5, flutes: 4, coating: "diamond" },
      { name: "316L SS", iso_group: "M", coolant: "cryogenic" },
      "semi_finishing",
    );
    // Vc = 100 × 1.50 × 1.30 × 1.00 = 195
    expect(d.Vc_mpm).toBe(195);
    expect(d.fz_mm).toBe(0.04);
    expect(d.ap_mm).toBe(2);
    expect(d.ae_mm).toBe(1.75);
    expect(d.Fc_N).toBeCloseTo(375.7, 1);
    expect(d.tool_life_min).toBeCloseTo(0.7, 1);
    expect(d.power_kW).toBeCloseTo(1.221, 3);
  });
});

// ============================================================================
// 2. INTENT INVARIANTS — relationships that must hold regardless of literals
// ============================================================================
describe("CuttingDataExportEngine — physics invariants", () => {
  it("rpm and Vf satisfy their own kinematic definitions", () => {
    const d = cuttingDataExportEngine.computeCuttingData(TOOL_A, MAT_P, "semi_finishing");
    // rpm = 1000·Vc/(π·D)  — recompute independently
    expect(d.rpm).toBeCloseTo((1000 * d.Vc_mpm) / (Math.PI * 10), 1);
    // Vf = fz·z·rpm
    expect(d.Vf_mmpm).toBeCloseTo(d.fz_mm * 4 * d.rpm, 1);
    // P = Fc·Vc/60000
    expect(d.power_kW).toBeCloseTo((d.Fc_N * d.Vc_mpm) / 60000, 3);
  });

  it("operation scaling is monotonic in axial depth: roughing > semi > finishing > high_speed", () => {
    const iso = MAT_P;
    const rough = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "roughing").ap_mm;
    const semi = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "semi_finishing").ap_mm;
    const fin = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "finishing").ap_mm;
    const hsc = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "high_speed").ap_mm;
    expect(rough).toBeGreaterThan(semi);
    expect(semi).toBeGreaterThan(fin);
    expect(fin).toBeGreaterThan(hsc);
    // high_speed carries the highest cutting speed
    const vcSemi = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "semi_finishing").Vc_mpm;
    const vcHsc = cuttingDataExportEngine.computeCuttingData(TOOL_A, iso, "high_speed").Vc_mpm;
    expect(vcHsc).toBeGreaterThan(vcSemi);
  });
});

// ============================================================================
// 3. FAILURE MODES / DEFAULTS (>=3)
// ============================================================================
describe("CuttingDataExportEngine — defaults & unknown-key fallbacks", () => {
  it("missing coating defaults to uncoated (mult 1.00): Vc = 150×1.00×1.10 = 165", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4 },            // no coating
      MAT_P,
      "semi_finishing",
    );
    // Vc = 150 × 1.00 × 1.10 × 1.00 = 165
    expect(d.Vc_mpm).toBe(165);
    expect(d.tool_life_min).toBeCloseTo(8.3, 1);   // slower speed → longer Taylor life
  });

  it("unknown coating string falls back to mult 1.00 (not a throw, not NaN)", () => {
    const known = cuttingDataExportEngine.computeCuttingData({ diameter_mm: 10, flutes: 4 }, MAT_P, "semi_finishing");
    const unknown = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4, coating: "unobtanium" },
      MAT_P,
      "semi_finishing",
    );
    // unknown coating ≡ uncoated (both 1.00 multiplier)
    expect(unknown.Vc_mpm).toBe(known.Vc_mpm);
    expect(unknown.Vc_mpm).toBe(165);
  });

  it("unknown coolant string falls back to mult 1.00 (isolated with uncoated tool)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4, coating: "uncoated" },
      { name: "x", iso_group: "P", coolant: "space_vacuum" },
      "semi_finishing",
    );
    // Vc = 150 × 1.00 × 1.00 (unknown coolant) × 1.00 = 150
    expect(d.Vc_mpm).toBe(150);
    // and strictly below the flood-lubricated speed (1.10)
    const flood = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4, coating: "uncoated" }, MAT_P, "semi_finishing",
    );
    expect(d.Vc_mpm).toBeLessThan(flood.Vc_mpm);
  });

  it("missing coolant defaults to flood (mult 1.10, isolated with uncoated tool)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4, coating: "uncoated" },
      { name: "x", iso_group: "P" },              // no coolant
      "semi_finishing",
    );
    expect(d.Vc_mpm).toBe(165);                    // 150 × 1.00 × 1.10 == flood default
  });

  it("missing flutes defaults to 4 (feed reflects z=4)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, coating: "TiAlN" },       // no flutes/flute_count
      MAT_P,
      "semi_finishing",
    );
    // Vf = fz·4·rpm — same as TOOL_A which explicitly sets flutes:4
    const ref = cuttingDataExportEngine.computeCuttingData(TOOL_A, MAT_P, "semi_finishing");
    expect(d.Vf_mmpm).toBeCloseTo(ref.Vf_mmpm, 1);
  });

  it("coolant hyphens normalize to underscores (air-blast → air_blast, 0.95)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 10, flutes: 4, coating: "uncoated" },
      { name: "x", iso_group: "P", coolant: "air-blast" },   // hyphen → air_blast (0.95)
      "semi_finishing",
    );
    // Vc = 150 × 1.00 × 0.95 (air_blast) × 1.00 = 142.5
    expect(d.Vc_mpm).toBe(142.5);
  });
});

// ============================================================================
// 3b. FIX WITNESS (R12) — mixed-case coating premium NOW applied. These tests
//     were the BUG-witness block; flipped to assert the fixed behavior — the
//     case-insensitive COATING_MULT_LC lookup resolves mixed-case coating keys.
// ============================================================================
describe("CuttingDataExportEngine — FIX: mixed-case coating premium now applied", () => {
  const base = { diameter_mm: 10, flutes: 4 } as const;

  it("TiAlN applies its +25% premium over uncoated (FIX — was collapsing to uncoated)", () => {
    const tialn = cuttingDataExportEngine.computeCuttingData({ ...base, coating: "TiAlN" }, MAT_P, "semi_finishing");
    const uncoated = cuttingDataExportEngine.computeCuttingData({ ...base, coating: "uncoated" }, MAT_P, "semi_finishing");
    // FIX: TiAlN now resolves to its 1.25 mult → Vc = 150 × 1.25 × 1.10 = 206.25 > uncoated 165
    expect(tialn.Vc_mpm).toBeGreaterThan(uncoated.Vc_mpm);
    expect(tialn.Vc_mpm).toBe(206.25);
    expect(uncoated.Vc_mpm).toBe(165);
    // premium ratio equals the TiAlN coating multiplier
    expect(tialn.Vc_mpm / uncoated.Vc_mpm).toBeCloseTo(1.25, 5);
  });

  it("all mixed-case coatings (TiN/TiCN/AlTiN/AlCrN/DLC) now raise Vc by their real premium (FIX)", () => {
    const uncoatedVc = cuttingDataExportEngine.computeCuttingData({ ...base, coating: "uncoated" }, MAT_P, "semi_finishing").Vc_mpm;
    // FIX: each = 150 × COATING_MULT × 1.10 (flood) × 1.00 (semi)
    const expected: Record<string, number> = {
      TiN: 181.5, TiCN: 189.75, AlTiN: 211.2, AlCrN: 206.25, DLC: 222.75,
    };
    for (const c of ["TiN", "TiCN", "AlTiN", "AlCrN", "DLC"]) {
      const v = cuttingDataExportEngine.computeCuttingData({ ...base, coating: c }, MAT_P, "semi_finishing").Vc_mpm;
      expect(v).toBeGreaterThan(uncoatedVc);   // FIX — each now raises Vc
      expect(v).toBe(expected[c]);
    }
  });

  it("diamond still applies its 1.50 premium (regression: fix preserves already-lowercase keys)", () => {
    const diamond = cuttingDataExportEngine.computeCuttingData({ ...base, coating: "diamond" }, MAT_P, "semi_finishing");
    const uncoated = cuttingDataExportEngine.computeCuttingData({ ...base, coating: "uncoated" }, MAT_P, "semi_finishing");
    // Vc = 150 × 1.50 × 1.10 = 247.5, strictly above uncoated 165 (unchanged by the fix)
    expect(diamond.Vc_mpm).toBe(247.5);
    expect(diamond.Vc_mpm).toBeGreaterThan(uncoated.Vc_mpm);
  });
});

// ============================================================================
// 4. ADVERSARIAL INPUTS (>=2) — R12: pin current (unguarded) behavior
// ============================================================================
describe("CuttingDataExportEngine — adversarial / unguarded edges", () => {
  it("D=0 → division-by-zero: rpm=Infinity, Vf=NaN, Fc=0 (UNGUARDED, pinned)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: 0, flutes: 4 },
      { name: "x", iso_group: "P" },
      "semi_finishing",
    );
    expect(Number.isFinite(d.rpm)).toBe(false);   // Infinity
    expect(d.rpm).toBe(Infinity);
    expect(Number.isNaN(d.Vf_mmpm)).toBe(true);   // 0 × Infinity
    expect(d.fz_mm).toBe(0);
    expect(d.ap_mm).toBe(0);
    expect(d.Fc_N).toBe(0);                         // kc·0·0^0.75
  });

  it("D<0 → Math.pow(negative, fractional) makes Kienzle force NaN (UNGUARDED, pinned)", () => {
    const d = cuttingDataExportEngine.computeCuttingData(
      { diameter_mm: -5, flutes: 4 },
      { name: "x", iso_group: "P" },
      "semi_finishing",
    );
    // fz = -0.05, ap = -2.5, Fc = 1800·(-2.5)·(-0.05)^0.75 → NaN
    expect(Number.isNaN(d.Fc_N)).toBe(true);
    expect(d.fz_mm).toBeLessThan(0);
  });

  it("invalid iso_group throws (KIENZLE_DATA[iso] undefined → destructure error)", () => {
    expect(() =>
      cuttingDataExportEngine.computeCuttingData(
        { diameter_mm: 10, flutes: 4 },
        { name: "mystery", iso_group: "X" as unknown as MaterialRecord["iso_group"] },
        "semi_finishing",
      ),
    ).toThrow();
  });
});

// ============================================================================
// 5. EXPORT SURFACES (singleton)
// ============================================================================
describe("CuttingDataExportEngine — export formats", () => {
  const fresh = new CuttingDataExportEngineClass();

  it("listSystems returns all 6 CAM targets", () => {
    const sys = fresh.listSystems();
    expect(sys.map((s) => s.system).sort()).toEqual(
      ["csv", "fusion360", "hypermill", "mastercam", "nx", "solidcam"],
    );
  });

  it("exportForSystem(csv) entry_count = tools × materials and embeds computed Vc", () => {
    const r = fresh.exportForSystem([TOOL_A], [MAT_P], "csv", "semi_finishing");
    expect(r.cam_system).toBe("csv");
    expect(r.entry_count).toBe(1);
    expect(r.data).toContain("Vc_mpm");        // header
    expect(r.data).toContain(",206.25,");      // Case A computed Vc in the row (TiAlN premium applied — FIX)
  });

  it("exportAll covers all 6 systems and total_entries = tools × materials", () => {
    const tools = [TOOL_A, { diameter_mm: 6, flutes: 2 }];
    const mats = [MAT_P, { name: "6061", iso_group: "N" as const }, { name: "Iron", iso_group: "K" as const }];
    const all = fresh.exportAll(tools, mats, "semi_finishing");
    expect(all.total_entries).toBe(6);
    expect(Object.keys(all.per_system).sort()).toEqual(
      ["csv", "fusion360", "hypermill", "mastercam", "nx", "solidcam"],
    );
    // each per-system entry_count is also 2×3 = 6
    expect(all.per_system.csv.entry_count).toBe(6);
  });
});

// ============================================================================
// 6. DISPATCHER ROUND-TRIP (R15 — wired path through real camDispatcher)
// ============================================================================
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

async function invoke(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as { content?: Array<{ text?: string }> };
  if (Array.isArray(res.content)) {
    return JSON.parse(res.content[0]?.text ?? "null") as Record<string, unknown>;
  }
  return res as unknown as Record<string, unknown>;
}

describe("CuttingDataExportEngine — camDispatcher round-trip", () => {
  let camHandler: CapturedTool["handler"];

  beforeAll(() => {
    const srv = makeStubServer();
    registerCamDispatcher(srv as unknown as Parameters<typeof registerCamDispatcher>[0]);
    const t = srv.tools.find((x) => x.name === "prism_cam");
    if (!t) throw new Error("prism_cam not registered");
    camHandler = t.handler;
  });

  it("cutting_data_compute round-trips Case A numbers through the wired handler", async () => {
    const r = await invoke(camHandler, "cutting_data_compute", {
      tool: TOOL_A,
      material: MAT_P,
      operation: "semi_finishing",
    });
    expect(r.blocked).toBeUndefined();
    // wired path reproduces the singleton (incl. TiAlN 1.25 premium — FIX): Vc=206.25
    expect(r.Vc_mpm).toBe(206.25);
    expect(r.fz_mm).toBe(0.1);
    expect(r.ap_mm).toBe(5);
    expect(r.ae_mm).toBe(4);
    expect(r.Fc_N as number).toBeCloseTo(1600.5, 1);
    expect(r.tool_life_min as number).toBeCloseTo(3.4, 1);
    expect(r.iso_group).toBe("P");
  });

  it("cutting_data_export list_systems returns 6 systems through the wired handler", async () => {
    const r = await invoke(camHandler, "cutting_data_export", { list_systems: true });
    const systems = r.systems as Array<{ system: string }>;
    expect(Array.isArray(systems)).toBe(true);
    expect(systems.length).toBe(6);
  });

  it("cutting_data_export (csv) round-trips entry_count and embeds computed Vc", async () => {
    const r = await invoke(camHandler, "cutting_data_export", {
      tools: [TOOL_A],
      materials: [MAT_P],
      cam_system: "csv",
      operation: "semi_finishing",
    });
    expect(r.cam_system).toBe("csv");
    expect(r.entry_count).toBe(1);
    expect(String(r.data)).toContain(",206.25,");   // TiAlN premium applied — FIX
  });
});
