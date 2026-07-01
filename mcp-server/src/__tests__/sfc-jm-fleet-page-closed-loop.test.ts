/**
 * SFC web-page PATH closed-loop calc-correctness test (JM Die fleet FIRST).
 *
 * Operator directive (2026-06-22): "run full closed-loop testing of the entire
 * SFC app page suite to check that calculations are correct, JM Die fleet
 * machines FIRST."
 *
 * This drives the EXACT engine the web page displays. Verified runtime chain:
 *   web page (sfcApi.calculate) -> POST /api/v1/sfc/calculate (routes/sfc.ts:23)
 *   -> callTool("prism_product","sfc_calculate") -> productSFC (productDispatcher
 *   :36) -> ProductEngine.sfcCalculate (ProductEngine.ts:582) ->
 *   ManufacturingCalculations.calculateSpeedFeed.
 * NOTE: this is a PARALLEL engine to SpeedFeedOrchestratorEngine (which the
 * variability corpus + sfc_nine_axis use, and which the sibling test
 * sfc-jm-fleet-closed-loop.test.ts verifies). The page does NOT show the
 * orchestrator's numbers -- so the page's correctness must be tested on ITS own
 * engine, which is what this file does.
 *
 * For each JM Die machine (spindle constraints) x representative material/op, it
 * asserts the page-displayed result (SFCResult: cutting_speed_m_min / spindle_rpm
 * / feed_per_tooth_mm / table_feed_mm_min / power_kW / tool_life_min /
 * safety_status) is:
 *   (1) computed (finite + positive + bounded),
 *   (2) MACHINE-COMPLIANT -- spindle_rpm within the machine's max rpm, and an
 *       over-spindle-power result must be flagged (safety_status != "safe"),
 *   (3) PHYSICALLY CORRECT -- table_feed = rpm*fz*teeth and
 *       cutting_speed_m_min = pi*D*rpm/1000 (the same identities that validated
 *       the 11.2M-config corpus in SFC-ACCURACY-MS2).
 */
import { describe, it, expect } from "vitest";
import { productSFC } from "../engines/ProductEngine.js";

interface JmMachine { id: string; name: string; maxRpm: number; powerKw: number; }

// JM Die LATHES -- specs VERIFIED from ShopConfigurationEngine.ts (line cited).
const JM_LATHES: JmMachine[] = [
  { id: "LTH-01", name: "Okuma GENOS L300-M", maxRpm: 5000, powerKw: 15 }, // :251
  { id: "LTH-02", name: "Okuma GENOS L200E-M", maxRpm: 5000, powerKw: 11 }, // :262
  { id: "LTH-03", name: "Okuma LNC8", maxRpm: 4000, powerKw: 11 }, // :273
  { id: "LTH-04", name: "Okuma Crown L1060", maxRpm: 3800, powerKw: 11 }, // :284
  { id: "LTH-05", name: "Okuma GENOS L400II-E", maxRpm: 3800, powerKw: 22 }, // :295
  { id: "LTH-06", name: "Okuma LB 3000EX Big Bore", maxRpm: 3800, powerKw: 22 }, // :306
  { id: "LTH-07", name: "Okuma Multus B250II", maxRpm: 5000, powerKw: 22 }, // :317
];
// JM Die VMC MILLS -- representative mfr specs (ShopConfig lacks spindle specs).
const JM_MILLS: JmMachine[] = [
  { id: "VMC-01", name: "Hurco VM30i", maxRpm: 10000, powerKw: 12 },
  { id: "VMC-02", name: "Okuma M460V-5AX", maxRpm: 15000, powerKw: 22 },
  { id: "VMC-03", name: "Haas VF-2", maxRpm: 8100, powerKw: 22.4 },
  { id: "VMC-04", name: "Haas OM-2 (office mill)", maxRpm: 30000, powerKw: 5.6 },
  { id: "VMC-05", name: "Roku-Roku HC 658-II", maxRpm: 40000, powerKw: 11 },
];
const MILL_MATERIALS = [
  { material: "steel", material_hardness: 180 }, // ~1045
  { material: "aluminum", material_hardness: 95 }, // ~6061
  { material: "stainless", material_hardness: 170 }, // ~316
];

const PHYS_UPPER = 1e7;
const TOOL_DIAMETER_MM = 12;
const NUM_TEETH = 4;
const VALID_SAFETY_STATUS = ["safe", "warning", "danger"];

/** Build a page SFCInput for a JM machine + material (milling). */
function pageInput(m: JmMachine, mat: { material: string; material_hardness: number }) {
  return {
    material: mat.material,
    material_hardness: mat.material_hardness,
    tool_material: "Carbide",
    tool_diameter: TOOL_DIAMETER_MM,
    number_of_teeth: NUM_TEETH,
    operation: "milling",
    depth_of_cut: 6,
    width_of_cut: 6,
    machine_power_kw: m.powerKw,
    machine_max_rpm: m.maxRpm,
    tier: "pro",
  };
}

/** Invoke the page path (productSFC sfc_calculate) and return the SFCResult.
 *  Throws (fails the test loud) if the dispatcher returned an error envelope. */
function pageCalc(m: JmMachine, mat: { material: string; material_hardness: number }): Record<string, any> {
  const out = productSFC("sfc_calculate", pageInput(m, mat)) as { result?: any; error?: string };
  if (out.error) throw new Error(`${m.id}/${mat.material}: page calc returned error: ${out.error}`);
  return out.result as Record<string, any>;
}

const CORE_FIELDS = ["cutting_speed_m_min", "spindle_rpm", "feed_per_tooth_mm", "table_feed_mm_min", "power_kW", "tool_life_min"] as const;

function assertComputed(r: Record<string, any>, label: string): void {
  for (const k of CORE_FIELDS) {
    const v = r[k];
    expect(v, `${label}: ${k} must be positive (got ${v})`).toBeGreaterThan(0);
    expect(v, `${label}: ${k} must be finite (got ${v})`).toBeLessThan(PHYS_UPPER);
  }
}

/** Feed identity: table_feed_mm_min == spindle_rpm * feed_per_tooth_mm * teeth. */
function assertFeedIdentity(r: Record<string, any>, label: string): void {
  const expected = r.spindle_rpm * r.feed_per_tooth_mm * NUM_TEETH;
  const tol = 1.0 + 0.06 * Math.max(Math.abs(r.table_feed_mm_min), Math.abs(expected));
  expect(
    Math.abs(r.table_feed_mm_min - expected),
    `${label}: table_feed ${r.table_feed_mm_min} != rpm*fz*teeth ${expected.toFixed(2)} (rpm=${r.spindle_rpm}, fz=${r.feed_per_tooth_mm}, teeth=${NUM_TEETH})`,
  ).toBeLessThanOrEqual(tol);
}

/** vc identity: cutting_speed_m_min == pi * D * spindle_rpm / 1000.
 *  cutting_speed_m_min is integer-rounded (ProductEngine.ts:715), so a slightly
 *  wider band absorbs the rounding of both vc and rpm. */
function assertVcIdentity(r: Record<string, any>, label: string): void {
  const expected = (Math.PI * TOOL_DIAMETER_MM * r.spindle_rpm) / 1000;
  const tol = 3.0 + 0.06 * Math.max(Math.abs(r.cutting_speed_m_min), Math.abs(expected));
  expect(
    Math.abs(r.cutting_speed_m_min - expected),
    `${label}: vc ${r.cutting_speed_m_min} != pi*D*rpm/1000 ${expected.toFixed(2)} (D=${TOOL_DIAMETER_MM}, rpm=${r.spindle_rpm})`,
  ).toBeLessThanOrEqual(tol);
}

/** Machine compliance: rpm within spindle max; over-power must NOT be "safe". */
function assertMachineCompliant(r: Record<string, any>, m: JmMachine, label: string): void {
  expect(
    r.spindle_rpm,
    `${label}: spindle_rpm exceeds ${m.id} max ${m.maxRpm} (page would recommend an impossible rpm)`,
  ).toBeLessThanOrEqual(m.maxRpm * 1.001);
  // safety_status must be one of the three valid grades (real value membership).
  expect(VALID_SAFETY_STATUS, `${label}: invalid safety_status ${r.safety_status}`).toContain(r.safety_status);
  // The page passes machine_power_kw into safety scoring; an over-spindle-power
  // result must NOT be reported as "safe".
  if (r.power_kW > m.powerKw * 1.05) {
    expect(
      r.safety_status,
      `${label}: power ${r.power_kW}kW > ${m.id} spindle ${m.powerKw}kW but safety_status="safe" (silent over-power)`,
    ).not.toBe("safe");
  }
}

describe("SFC web-page PATH closed-loop calc correctness (productSFC; JM machines FIRST)", () => {
  describe("JM lathes (verified specs)", () => {
    for (const m of JM_LATHES) {
      it(`${m.id} ${m.name}: page calc correct + machine-compliant`, () => {
        const r = pageCalc(m, MILL_MATERIALS[0]);
        const label = `${m.id}/${MILL_MATERIALS[0].material}`;
        assertComputed(r, label);
        assertFeedIdentity(r, label);
        assertVcIdentity(r, label);
        assertMachineCompliant(r, m, label);
      });
    }
  });

  describe("JM mills (representative specs; ShopConfig gap noted)", () => {
    for (const m of JM_MILLS) {
      it(`${m.id} ${m.name}: page calc correct + machine-compliant`, () => {
        const r = pageCalc(m, MILL_MATERIALS[0]);
        const label = `${m.id}/${MILL_MATERIALS[0].material}`;
        assertComputed(r, label);
        assertFeedIdentity(r, label);
        assertVcIdentity(r, label);
        assertMachineCompliant(r, m, label);
      });
    }
  });

  describe("material variability (spanning hardness) on Haas VF-2", () => {
    const mill = JM_MILLS[2];
    for (const mat of MILL_MATERIALS) {
      it(`${mill.id} ${mat.material} (HB ${mat.material_hardness}): correct + compliant`, () => {
        const r = pageCalc(mill, mat);
        const label = `${mill.id}/${mat.material}`;
        assertComputed(r, label);
        assertFeedIdentity(r, label);
        assertVcIdentity(r, label);
        assertMachineCompliant(r, mill, label);
      });
    }
  });

  describe("severe over-power escalates to 'danger' (not merely 'warning')", () => {
    it("Haas OM-2 (5.6 kW) heavy cut in steel -> power >150% -> danger", () => {
      const om2 = JM_MILLS[3]; // 5.6 kW office mill
      const out = productSFC("sfc_calculate", {
        material: "steel",
        material_hardness: 200,
        tool_material: "Carbide",
        tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH,
        operation: "milling",
        depth_of_cut: 18, // deep
        width_of_cut: 12, // full slot
        machine_power_kw: om2.powerKw,
        machine_max_rpm: om2.maxRpm,
        tier: "pro",
      }) as { result?: any; error?: string };
      if (out.error) throw new Error(`severe-overpower calc error: ${out.error}`);
      const r = out.result as Record<string, any>;
      // The heavy cut must genuinely exceed 150% of the OM-2 spindle...
      expect(r.power_kW, `heavy cut power ${r.power_kW}kW must exceed 150% of ${om2.powerKw}kW`).toBeGreaterThan(om2.powerKw * 1.5);
      // ...and a >150% over-power must grade "danger", not "warning" or "safe".
      expect(r.safety_status, `severe over-power (${r.power_kW}kW on ${om2.powerKw}kW) must grade danger`).toBe("danger");
    });

    it("over-power check is spindle-EFFICIENCY-corrected (cutting/eta vs rating), not raw cutting power", () => {
      // The spindle MOTOR must supply cutting power / drive-efficiency (~0.85). The
      // check previously compared RAW cutting power Pc to the spindle rating -> ~1/eta
      // too lenient (a cut under the rating in CUTTING terms can still STALL once the
      // ~15% drivetrain loss is counted). Self-calibrating lock: capture a cut's
      // cutting power on an ample machine, then set the rating ABOVE the cutting power
      // but BELOW the spindle draw (Pc/0.85) -- old raw-Pc logic grades "safe", the
      // efficiency-corrected check must now flag it.
      const ample = productSFC("sfc_calculate", {
        material: "1045", tool_material: "Carbide", tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH, operation: "milling", depth_of_cut: 6, width_of_cut: 6,
        machine_power_kw: 50, machine_max_rpm: 40000, tier: "pro",
      }) as { result?: any; error?: string };
      if (ample.error) throw new Error(`ample calc error: ${ample.error}`);
      const pc = ample.result.power_kW as number; // cutting power Pc
      expect(ample.result.safety_status, "ample-power baseline must be safe").toBe("safe");

      // rating 8% above cutting power: Pc < rating (old logic -> safe) but the spindle
      // draw Pc/0.85 = 1.176*Pc EXCEEDS the rating (1.176/1.08 = 1.089 -> >100%).
      const rating = pc * 1.08;
      const tight = productSFC("sfc_calculate", {
        material: "1045", tool_material: "Carbide", tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH, operation: "milling", depth_of_cut: 6, width_of_cut: 6,
        machine_power_kw: rating, machine_max_rpm: 40000, tier: "pro",
      }) as { result?: any; error?: string };
      if (tight.error) throw new Error(`tight calc error: ${tight.error}`);
      // Sanity: raw cutting power is UNDER the rating -- the OLD logic would have passed.
      expect(pc, `cutting ${pc} must be < rating ${rating} (old logic would grade safe)`).toBeLessThan(rating);
      // The efficiency-corrected check must flag it (NOT safe) because Pc/0.85 > rating.
      expect(
        tight.result.safety_status,
        `cutting ${pc.toFixed(2)}kW < rating ${rating.toFixed(2)}kW but spindle draw ${(pc / 0.85).toFixed(2)}kW > rating -> must NOT grade safe`,
      ).not.toBe("safe");
      // ...and the warning must name the efficiency-corrected SPINDLE draw (proves it
      // is the power check, not some unrelated penalty).
      expect(
        (tight.result.safety_warnings as string[]).some((w) => /spindle draw/i.test(w)),
        `a "Spindle draw" warning must appear (got: ${JSON.stringify(tight.result.safety_warnings)})`,
      ).toBe(true);
    });
  });

  // --- MATERIAL-AWARE FIX (ISO-group Vc + chip load + rpm clamp) ---
  // The page used to anchor Vc on a flat tool-material speed scaled by Brinell
  // hardness ONLY (ignoring ISO group) -- so 316 stainless out-ran 1045 steel
  // (physically backwards) -- and a CONSTANT chip load fz=D*0.02 for every
  // material (~3x too high for steel/stainless). These tests pin the fix using
  // the GRADE ids the real SmartMaterialSelector sends (1045/316/6061), driven on
  // a high-rpm/high-power machine so Vc is compared UNCLAMPED. Published coated-
  // carbide milling Vc bands: P-steel ~110-230, M-stainless ~90-160, N-Al ~300-900.
  describe("material-aware speed/feed (ISO-group fix: stainless slower than steel)", () => {
    const ROOMY = { maxRpm: 40000, powerKw: 30 }; // high rpm + power -> no clamp, no over-power masking
    function gradeCalc(grade: string): Record<string, any> {
      const out = productSFC("sfc_calculate", {
        material: grade, tool_material: "Carbide", tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH, operation: "milling", depth_of_cut: 6, width_of_cut: 6,
        machine_power_kw: ROOMY.powerKw, machine_max_rpm: ROOMY.maxRpm, tier: "pro",
      }) as { result?: any; error?: string };
      if (out.error) throw new Error(`${grade}: page calc error: ${out.error}`);
      return out.result as Record<string, any>;
    }

    const steel = gradeCalc("1045");     // ISO P
    const stainless = gradeCalc("316");  // ISO M
    const alu = gradeCalc("6061");       // ISO N

    it("Vc ordering is physical: steel (P) faster than stainless (M), aluminium (N) fastest", () => {
      // THE inversion fix: 316 must NOT out-run 1045 (the old hardness-only bug).
      expect(
        stainless.cutting_speed_m_min,
        `316 stainless Vc ${stainless.cutting_speed_m_min} must be < 1045 steel Vc ${steel.cutting_speed_m_min} (M slower than P)`,
      ).toBeLessThan(steel.cutting_speed_m_min);
      expect(
        alu.cutting_speed_m_min,
        `6061 aluminium Vc ${alu.cutting_speed_m_min} must be > 1045 steel Vc ${steel.cutting_speed_m_min} (N fastest)`,
      ).toBeGreaterThan(steel.cutting_speed_m_min);
    });

    it("each grade's Vc lands in its published carbide milling band", () => {
      expect(steel.cutting_speed_m_min).toBeGreaterThanOrEqual(110);
      expect(steel.cutting_speed_m_min).toBeLessThanOrEqual(230);
      expect(stainless.cutting_speed_m_min).toBeGreaterThanOrEqual(90);
      expect(stainless.cutting_speed_m_min).toBeLessThanOrEqual(160);
      expect(alu.cutting_speed_m_min).toBeGreaterThanOrEqual(300);
      expect(alu.cutting_speed_m_min).toBeLessThanOrEqual(900);
    });

    it("chip load is MATERIAL-AWARE (not a constant) and within carbide ranges", () => {
      // stainless takes a lighter chip than steel; aluminium a heavier one.
      expect(stainless.feed_per_tooth_mm).toBeLessThan(steel.feed_per_tooth_mm);
      expect(alu.feed_per_tooth_mm).toBeGreaterThan(steel.feed_per_tooth_mm);
      // and none is the old material-blind ~0.288 mm/tooth (which over-fed ~3x).
      expect(steel.feed_per_tooth_mm).toBeLessThanOrEqual(0.20);
      expect(stainless.feed_per_tooth_mm).toBeGreaterThanOrEqual(0.04);
      expect(stainless.feed_per_tooth_mm).toBeLessThanOrEqual(0.14);
    });

    it("a category name (\"stainless\") resolves to the SAME ISO-M physics as grade 316 (no silent steel fallback)", () => {
      const cat = gradeCalc("stainless");
      // category alias -> 316 -> M group, so it must be SLOWER than steel too.
      expect(cat.cutting_speed_m_min).toBeLessThan(steel.cutting_speed_m_min);
      // and match the 316 grade result within rounding.
      expect(Math.abs(cat.cutting_speed_m_min - stainless.cutting_speed_m_min)).toBeLessThanOrEqual(2);
    });

    it("an UNKNOWN grade falls back safely to a finite, positive, computed result", () => {
      const unknown = gradeCalc("ZZ-not-a-real-grade-9999");
      expect(unknown.cutting_speed_m_min).toBeGreaterThan(0);
      expect(unknown.cutting_speed_m_min).toBeLessThan(PHYS_UPPER);
      expect(unknown.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(unknown.spindle_rpm).toBeGreaterThan(0);
    });

    it("a non-positive material_hardness is sanitized (no NaN/Infinity Vc)", () => {
      const out = productSFC("sfc_calculate", {
        material: "1045", material_hardness: -50, tool_material: "Carbide",
        tool_diameter: TOOL_DIAMETER_MM, number_of_teeth: NUM_TEETH, operation: "milling",
        depth_of_cut: 6, width_of_cut: 6, machine_power_kw: 30, machine_max_rpm: 40000, tier: "pro",
      }) as { result?: any; error?: string };
      if (out.error) throw new Error(`neg-hardness calc error: ${out.error}`);
      const r = out.result as Record<string, any>;
      // Without the safeHardness guard, Math.pow(200/-50,...) -> NaN -> NaN Vc.
      expect(r.cutting_speed_m_min).toBeGreaterThan(0);
      expect(r.cutting_speed_m_min).toBeLessThan(PHYS_UPPER);
      expect(r.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(r.spindle_rpm).toBeGreaterThan(0);
    });

    it("surface finish Ra uses per-TOOTH fz (Brammertz), not fz*teeth (~16x inflated)", () => {
      // Ra = fz^2/(32*r) * 1000(um) * 2.0(process_factor). For a 12mm tool r=0.8mm.
      // The page used to pass fz*numTeeth (per-rev feed) -> Ra ~100 um ("N10+ very rough"),
      // ~numTeeth^2 (16x) too high for a 4-flute tool. It must now use per-tooth fz.
      const r = gradeCalc("1045"); // 12mm tool -> nose radius 0.8
      const fz = r.feed_per_tooth_mm;
      const expectedRa = (fz * fz) / (32 * 0.8) * 1000 * 2.0; // independent oracle from fz
      expect(r.surface_roughness_Ra_um).toBeCloseTo(expectedRa, 1);
      // and physically sane: a normal milled finish is single-digit um, never ~100.
      expect(r.surface_roughness_Ra_um, `Ra ${r.surface_roughness_Ra_um} um must be < 12.5 (sane)`).toBeLessThan(12.5);
    });

    it("rpm is CLAMPED to the machine ceiling (never recommends an unreachable spindle speed)", () => {
      // 6061 wants ~13000 rpm on a 12mm tool; a 6000-rpm machine MUST clamp + rescale Vc.
      const out = productSFC("sfc_calculate", {
        material: "6061", tool_material: "Carbide", tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH, operation: "milling", depth_of_cut: 4, width_of_cut: 6,
        machine_power_kw: 30, machine_max_rpm: 6000, tier: "pro",
      }) as { result?: any; error?: string };
      if (out.error) throw new Error(`clamp calc error: ${out.error}`);
      const r = out.result as Record<string, any>;
      expect(r.spindle_rpm, `rpm ${r.spindle_rpm} must not exceed machine max 6000`).toBeLessThanOrEqual(6000 * 1.001);
      // Vc must be rescaled to the clamped rpm: Vc = pi*D*rpm/1000.
      const expectedVc = (Math.PI * TOOL_DIAMETER_MM * r.spindle_rpm) / 1000;
      expect(Math.abs(r.cutting_speed_m_min - expectedVc)).toBeLessThanOrEqual(3.0);
    });
  });

  describe("canonical coefficient sourcing (R9 anti-inline-divergence lock)", () => {
    // ProductEngine previously carried an INLINE MATERIAL_HARDNESS table whose
    // Taylor C for 1045 was 250 vs the ISO-3685 canonical 350 -> tool life ~4x
    // too short on the customer-facing page. The kc1_1/mc/C/n are now resolved
    // from src/physics/constants.ts (AISI_CUTTING_COEFFICIENTS -> CANONICAL_*).
    // These locks fail if the coefficients are ever reverted to inline values.
    const ROOMY = { maxRpm: 40000, powerKw: 30 };
    function lifeCalc(grade: string): Record<string, any> {
      const out = productSFC("sfc_calculate", {
        material: grade, tool_material: "Carbide", tool_diameter: TOOL_DIAMETER_MM,
        number_of_teeth: NUM_TEETH, operation: "milling", depth_of_cut: 6, width_of_cut: 6,
        machine_power_kw: ROOMY.powerKw, machine_max_rpm: ROOMY.maxRpm, tier: "pro",
      }) as { result?: any; error?: string };
      if (out.error) throw new Error(`${grade}: page calc error: ${out.error}`);
      return out.result as Record<string, any>;
    }
    // Canonical Taylor for ISO-P steel (constants.ts CANONICAL_TAYLOR.P): C=350, n=0.25.
    const STEEL_C_CANON = 350, STEEL_C_INLINE = 250, STEEL_N = 0.25;
    const taylorLife = (C: number, n: number, vc: number) => Math.pow(C / vc, 1 / n);

    it("1045 tool life tracks canonical Taylor C=350 (ISO-3685), NOT the old inline 250 (~4x short)", () => {
      const r = lifeCalc("1045");
      const vc = r.cutting_speed_m_min;
      const tCanon = taylorLife(STEEL_C_CANON, STEEL_N, vc);   // raw canonical life at the engine's Vc
      const tInline = taylorLife(STEEL_C_INLINE, STEEL_N, vc); // raw inline-bug life at the same Vc
      // The page life must be far closer to canonical than to the inline value
      // (the gap is ~3.8x -- no realistic runout/coating derate bridges it).
      expect(
        Math.abs(r.tool_life_min - tCanon),
        `1045 tool_life ${r.tool_life_min} must track canonical ${tCanon.toFixed(1)} (C=350), not inline ${tInline.toFixed(1)} (C=250) at Vc=${vc.toFixed(0)}`,
      ).toBeLessThan(Math.abs(r.tool_life_min - tInline));
      // Hard floor: inline-250 yields ~2.2 min at Vc~200; canonical clears 4.0
      // even under a heavy derate (sep holds for derate >= ~0.5). Upper sanity 30.
      expect(r.tool_life_min).toBeGreaterThan(4.0);
      expect(r.tool_life_min).toBeLessThan(30);
    });

    it("an unknown grade's fallback uses canonical P-group Taylor (C=350), not the inline 250 default", () => {
      // resolveMaterial's unknown-path previously returned inline C=250; it now
      // resolves the canonical per-ISO P bucket (Taylor C=350).
      const r = lifeCalc("ZZ-not-a-real-grade-9999");
      expect(r.tool_life_min, `unknown-grade tool_life ${r.tool_life_min} must use canonical P (C=350), not inline 250`).toBeGreaterThan(4.0);
      expect(r.tool_life_min).toBeLessThan(30);
    });
  });
});
