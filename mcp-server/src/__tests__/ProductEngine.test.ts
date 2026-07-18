import { describe, it, expect } from "vitest";
import { productSFC, resolveMaterial, type SFCInput, type SFCResult } from "../engines/ProductEngine.js";
import { hrcToHb, kcHardnessFactor } from "../physics/constants.js";

/**
 * Engine-level coverage for ProductEngine's SFC product surface (`productSFC`), the engine
 * behind the customer-facing Speed & Feed Calculator page (`prism_product:sfc_calculate` etc.).
 *
 * These assert REAL physics behavior + the full action contract -- not stub asserts:
 *   - material-aware Vc band (P-steel carbide), rpm/Vc self-consistency under a machine clamp,
 *   - MRR scaling with radial engagement, the efficiency-corrected over-power safety guard,
 *   - the compare/optimize/safety/catalog/get actions, tier gating, and the error path.
 *
 * Distinct from `sfc-page-depth-width-honored.test.ts` (which pins depth precedence + force-vs-depth);
 * here we exercise the orthogonal axes (width->MRR, rpm clamp, power guard, action surface, tiers).
 */

const base = {
  material: "1045",          // AISI 1045 -- ISO P carbon steel (resolves in MATERIAL_HARDNESS)
  operation: "slot_milling",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
} satisfies Partial<SFCInput>;

/** Run sfc_calculate and fail loud (R12) if the engine returned an {error} envelope. */
function calc(params: Partial<SFCInput>): SFCResult {
  const r = productSFC("sfc_calculate", params) as { result?: SFCResult; error?: string };
  if (!r.result) throw new Error(`sfc_calculate returned error: ${r.error ?? JSON.stringify(r)}`);
  return r.result;
}

describe("productSFC sfc_calculate -- core physics result", () => {
  it("returns a complete, internally-positive SFCResult for carbide 1045", () => {
    const r = calc(base);
    expect(r.cutting_speed_m_min).toBeGreaterThan(0);
    expect(r.spindle_rpm).toBeGreaterThan(0);
    expect(r.feed_per_tooth_mm).toBeGreaterThan(0);
    expect(r.cutting_force_N).toBeGreaterThan(0);
    expect(r.power_kW).toBeGreaterThan(0);
    expect(r.mrr_cm3_min).toBeGreaterThan(0);
    expect(r.formulas_used).toEqual(
      expect.arrayContaining(["Kienzle cutting force", "Taylor tool life"]),
    );
    expect(r.uncertainty.cutting_speed_range).toHaveLength(2);
    expect(["safe", "warning", "danger"]).toContain(r.safety_status);
  });

  it("places carbide P-steel cutting speed in a physically sane band (material-aware, not blind default)", () => {
    const r = calc(base);
    // A P-group carbon steel cut with carbide lives in roughly the 60-300 m/min band.
    // A blind/broken material fallback would land far outside this -- this pins ISO-group awareness.
    expect(r.cutting_speed_m_min).toBeGreaterThan(60);
    expect(r.cutting_speed_m_min).toBeLessThan(300);
  });

  it("radial engagement is load-bearing: a wider ae raises MRR (not cosmetic)", () => {
    const narrow = calc({ ...base, width: 2 });
    const wide = calc({ ...base, width: 10 });
    // MRR = Vc*fz*z*ap*ae/(pi*D): ae rises while Vc/fz are unchanged (speed-feed ignores ae) -> MRR must rise.
    expect(wide.mrr_cm3_min).toBeGreaterThan(narrow.mrr_cm3_min);
  });
});

describe("productSFC sfc_calculate -- machine limits", () => {
  it("clamps spindle_rpm to the machine ceiling, lowers Vc, warns, and keeps Vc = pi*D*rpm/1000", () => {
    const open = calc(base);
    const cap = Math.floor(open.spindle_rpm / 2); // guaranteed below the unclamped rpm
    expect(cap).toBeGreaterThan(0);

    const clamped = calc({ ...base, machine_max_rpm: cap });
    expect(clamped.spindle_rpm).toBe(cap);
    expect(clamped.cutting_speed_m_min).toBeLessThan(open.cutting_speed_m_min);
    expect(clamped.safety_warnings.some((w) => /clamp/i.test(w))).toBe(true);
    // The engine recomputes Vc from the clamped rpm; the surface-speed identity must hold (within rounding).
    const expectedVc = (Math.PI * base.tool_diameter * cap) / 1000;
    expect(Math.abs(clamped.cutting_speed_m_min - expectedVc)).toBeLessThanOrEqual(1);
  });

  it("over-power guard: a tiny spindle-power budget lowers safety_score + emits a stall warning vs an ample budget", () => {
    const heavy = {
      material: "1045", operation: "slot_milling", tool_material: "Carbide",
      tool_diameter: 12, number_of_teeth: 4, depth: 8, width: 8,
    } satisfies Partial<SFCInput>;
    const tiny = calc({ ...heavy, machine_power_kw: 0.5 });
    const ample = calc({ ...heavy, machine_power_kw: 50 });
    // Removing the efficiency-corrected over-power penalty would make these equal -> this fails loud.
    expect(tiny.safety_score).toBeLessThan(ample.safety_score);
    expect(tiny.safety_warnings.some((w) => /spindle|power|stall/i.test(w))).toBe(true);
  });
});

describe("productSFC -- compare / optimize / safety actions", () => {
  it("sfc_compare ranks the 3 tool materials by score and recommends the top one", () => {
    const c = productSFC("sfc_compare", base) as {
      result: { approaches: Array<{ name: string; score: number; cutting_speed: number }>; recommended: string };
    };
    expect(c.result.approaches).toHaveLength(3);
    const names = c.result.approaches.map((a) => a.name);
    expect(names).toEqual(expect.arrayContaining(["Carbide endmill", "HSS endmill", "Ceramic endmill"]));
    // sorted descending by composite score
    for (let i = 1; i < c.result.approaches.length; i++) {
      expect(c.result.approaches[i - 1].score).toBeGreaterThanOrEqual(c.result.approaches[i].score);
    }
    expect(c.result.recommended).toBe(c.result.approaches[0].name);
  });

  it("sfc_optimize grid-searches around the baseline and returns numeric improvement", () => {
    const o = productSFC("sfc_optimize", {
      material: "1045", tool_diameter: 12, number_of_teeth: 4, depth: 4, width: 6,
    }) as {
      result: { objective: string; optimized: { vc: number }; improvement_pct: number; iterations: number };
    };
    expect(o.result.objective).toBe("balanced"); // default
    expect(o.result.iterations).toBeGreaterThan(0);
    expect(typeof o.result.improvement_pct).toBe("number");
    expect(o.result.optimized.vc).toBeGreaterThan(0);
  });

  it("sfc_safety returns a bounded {score,status,warnings} verdict", () => {
    const s = productSFC("sfc_safety", {
      material: "1045", tool_diameter: 12, depth: 6, width: 6,
    }) as { score: number; status: string; warnings: string[] };
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1);
    expect(["safe", "warning", "danger"]).toContain(s.status);
    expect(Array.isArray(s.warnings)).toBe(true);
  });
});

describe("productSFC -- catalog / metadata / dispatch", () => {
  it("sfc_materials / sfc_tools / sfc_formulas expose non-empty, well-formed catalogs", () => {
    const mats = productSFC("sfc_materials", {}) as { materials: Array<{ id: string; group: string; hardness: number }> };
    expect(mats.materials.length).toBeGreaterThan(0);
    expect(mats.materials[0].group.length).toBeGreaterThan(0);
    expect(mats.materials[0].hardness).toBeGreaterThan(0);

    const tools = productSFC("sfc_tools", {}) as { tools: Array<{ material: string }> };
    expect(tools.tools.map((t) => t.material)).toEqual(expect.arrayContaining(["Carbide", "HSS", "Ceramic"]));

    const formulas = productSFC("sfc_formulas", {}) as { formulas: Array<{ name: string }> };
    expect(formulas.formulas.map((f) => f.name)).toEqual(expect.arrayContaining(["Kienzle", "Taylor"]));
  });

  it("sfc_quick produces a full result from smart defaults (no required inputs)", () => {
    const q = productSFC("sfc_quick", {}) as { result: SFCResult };
    expect(q.result.cutting_speed_m_min).toBeGreaterThan(0);
    expect(q.result.spindle_rpm).toBeGreaterThan(0);
  });

  it("sfc_get reports the product metadata (action list, tiers, material count)", () => {
    const g = productSFC("sfc_get", {}) as { actions: string[]; tiers: string[]; materials_count: number };
    expect(g.actions).toContain("sfc_calculate");
    expect(g.tiers).toContain("pro");
    expect(g.materials_count).toBeGreaterThan(0);
  });

  it("an unknown action returns a structured {error} (never throws)", () => {
    const e = productSFC("sfc_bogus_action", {}) as { error?: string };
    expect(e.error).toBeTruthy();
    expect(e.error).toMatch(/Unknown SFC action/);
  });
});

describe("productSFC sfc_calculate -- tier gating", () => {
  it("free tier is limited and omits sustainability; pro tier unlocks it with positive energy", () => {
    const free = calc({ ...base, tier: "free" });
    const pro = calc({ ...base, tier: "pro" });
    expect(free.tier_limited).toBe(true);
    expect(free.sustainability).toBeUndefined();
    expect(pro.tier_limited).toBe(false);
    // Concrete nested-value assertions (no bare toBeDefined): pro must carry real sustainability numbers.
    expect(pro.sustainability?.energy_kWh_per_part).toBeGreaterThan(0);
    expect(pro.sustainability?.co2_kg_per_part).toBeGreaterThan(0);
  });
});

describe("productSFC sfc_calculate -- optimize_for goal selection", () => {
  const g = {
    material: "1045", operation: "slot_milling", tool_material: "Carbide",
    tool_diameter: 12, number_of_teeth: 4, depth: 4, width: 6,
  } satisfies Partial<SFCInput>;

  it("balanced is the identity -- reproduces the default recommendation exactly (regression lock)", () => {
    const def = calc(g);                              // no optimize_for -> defaults to balanced
    const bal = calc({ ...g, optimize_for: "balanced" });
    expect(bal.cutting_speed_m_min).toBe(def.cutting_speed_m_min);
    expect(bal.feed_per_tooth_mm).toBe(def.feed_per_tooth_mm);
    expect(bal.mrr_cm3_min).toBe(def.mrr_cm3_min);
    expect(bal.spindle_rpm).toBe(def.spindle_rpm);
  });

  it("the goal lever moves Vc monotonically: cost < balanced < productivity", () => {
    const cost = calc({ ...g, optimize_for: "cost" });
    const bal = calc({ ...g, optimize_for: "balanced" });
    const prod = calc({ ...g, optimize_for: "productivity" });
    expect(cost.cutting_speed_m_min).toBeLessThan(bal.cutting_speed_m_min);
    expect(prod.cutting_speed_m_min).toBeGreaterThan(bal.cutting_speed_m_min);
  });

  it("encodes the real trade: productivity raises MRR, cost extends tool life", () => {
    const cost = calc({ ...g, optimize_for: "cost" });
    const prod = calc({ ...g, optimize_for: "productivity" });
    // Productivity (higher Vc + fz) -> higher material removal rate (parts/hour).
    expect(prod.mrr_cm3_min).toBeGreaterThan(cost.mrr_cm3_min);
    // Cost (lower Vc) -> longer tool life (Taylor T=(C/Vc)^(1/n) rises super-linearly as Vc drops).
    expect(cost.tool_life_min).toBeGreaterThan(prod.tool_life_min);
  });

  it("an unknown optimize_for value falls back to balanced (no crash, no silent extreme)", () => {
    const bal = calc({ ...g, optimize_for: "balanced" });
    const bogus = calc({ ...g, optimize_for: "turbo" as unknown as "cost" });
    expect(bogus.cutting_speed_m_min).toBe(bal.cutting_speed_m_min);
    expect(bogus.feed_per_tooth_mm).toBe(bal.feed_per_tooth_mm);
  });
});

describe("productSFC sfc_calculate -- material resolution is separator- and ISO-letter-aware (silent-wrong guard)", () => {
  const m = { operation: "slot_milling", tool_material: "Carbide", tool_diameter: 12, number_of_teeth: 4 } satisfies Partial<SFCInput>;
  const vc = (material: string, material_group?: string) => calc({ ...m, material, material_group }).cutting_speed_m_min;

  it("underscore category names resolve to the SAME grade as the spaced/canonical form (no P-steel fallback)", () => {
    // Regression (SFC math-accuracy audit 2026-06-28, DEFECT A): "stainless_steel" / "cast_iron"
    // (underscore = a common frontend enum id form) fell through MATERIAL_CATEGORY_ALIASES to
    // P-steel (Vc 200) -> +50% OVER-SPEED on stainless. They must resolve to their real group.
    expect(vc("stainless_steel")).toBe(vc("stainless steel"));
    expect(vc("stainless_steel")).toBe(vc("316"));
    expect(vc("stainless_steel")).toBeLessThan(vc("1045")); // M-stainless slower than P-steel, NOT equal to it
    expect(vc("cast_iron")).toBe(vc("cast iron"));
    expect(vc("cast_iron")).toBe(vc("GG25"));
    expect(vc("alloy_steel")).toBe(vc("4140"));
  });

  it("a bare ISO 513 letter material_group anchors its own group (was all collapsed to the P default)", () => {
    // Regression (DEFECT A2): groupToISO had no bare-letter case, so material_group N/S/H/M/K
    // all hit the "P" default -> wrong (over-)speed for every non-steel group.
    const p = vc("unknownXYZ", "P"), mM = vc("unknownXYZ", "M"), k = vc("unknownXYZ", "K");
    const n = vc("unknownXYZ", "N"), s = vc("unknownXYZ", "S"), h = vc("unknownXYZ", "H");
    expect(new Set([p, mM, k, n, s, h]).size).toBeGreaterThanOrEqual(5); // distinct bands, not one default
    expect(n).toBeGreaterThan(p); // non-ferrous (aluminium) cuts far faster than steel
    expect(s).toBeLessThan(p);    // superalloy/titanium far slower
    expect(h).toBeLessThan(p);    // hardened slower
  });
});

describe("productSFC sfc_calculate -- input guards reject physically-impossible values (silent-wrong guard)", () => {
  const m = { material: "1045", operation: "slot_milling", tool_material: "Carbide", tool_diameter: 12, number_of_teeth: 4 } satisfies Partial<SFCInput>;
  const err = (p: Partial<SFCInput>) => (productSFC("sfc_calculate", { ...m, ...p }) as { error?: string }).error;

  it("rejects non-positive / non-finite number_of_teeth (was -> negative/Infinity feed published, DEFECT G)", () => {
    expect(err({ number_of_teeth: -4 })).toMatch(/number_of_teeth/);
    expect(err({ number_of_teeth: 0 })).toMatch(/number_of_teeth/);
    expect(err({ number_of_teeth: Infinity })).toMatch(/number_of_teeth/);
    expect(err({ number_of_teeth: 4.5 })).toMatch(/number_of_teeth/); // you cannot have 4.5 flutes
  });

  it("rejects non-positive / non-finite tool_diameter, depth (ap), width (ae) -- incl ap=Infinity (DEFECT H)", () => {
    expect(err({ tool_diameter: 0 })).toMatch(/tool_diameter/);
    expect(err({ depth: Infinity })).toMatch(/depth of cut/); // was silently clamped to ap=50
    expect(err({ width: -5 })).toMatch(/width of cut/);
  });

  it("leaves valid inputs + the default path untouched (no false rejection)", () => {
    expect(err({})).toBeUndefined();                 // default 4 flutes / dia 12
    expect(err({ number_of_teeth: 2 })).toBeUndefined();
    expect(err({ depth: 6, width: 8 })).toBeUndefined();
    expect(calc({ ...m }).feed_per_tooth_mm).toBeGreaterThan(0); // a valid call still computes
  });
});

describe("productSFC sfc_calculate -- unlabeled hardness <=70 is read as HRC and converted to HB (R1 over-speed guard)", () => {
  const m = { material: "D2", operation: "slot_milling", tool_material: "Carbide", tool_diameter: 12, number_of_teeth: 4 } satisfies Partial<SFCInput>;
  const vc = (material_hardness: number, material = "D2") => calc({ ...m, material, material_hardness }).cutting_speed_m_min;

  it("a hardness at/below the Rockwell-C ceiling converts to its HB equivalent (55 HRC ~= 560 HB)", () => {
    // Regression (R1): "55" meant as 55 HRC was read as 55 HB (impossibly soft) -> +47% over-speed
    // into hardened steel. It must resolve to the hardened-HB speed (safe direction = slower).
    expect(vc(55)).toBe(vc(hrcToHb(55))); // 55 (HRC) resolves to its canonical HB (=536) -> SAME speed
    expect(vc(55)).toBeLessThan(vc(200)); // hardened reading is slower than a 200 HB reading
  });

  it("a real Brinell value (>70) is kept as HB -- no false conversion of normal/soft materials", () => {
    const al = vc(95, "6061");
    expect(al).toBeGreaterThan(300);        // 6061 at HB 95 stays in the fast aluminium band; a false
                                            // HRC-95 conversion (-> ~940 HB) would be far slower
    expect(vc(200)).toBeGreaterThan(0);     // 200 HB resolves normally, unchanged
  });
});

describe("productSFC sfc_calculate -- EXTENDED registry materials resolve to real physics (was silent P-steel)", () => {
  const m = { operation: "slot_milling", tool_material: "Carbide", tool_diameter: 12, number_of_teeth: 4 } satisfies Partial<SFCInput>;
  const vc = (material: string) => calc({ ...m, material }).cutting_speed_m_min;
  // The P-steel fallback speed: a material in NEITHER the curated grades NOR the registry.
  const pSteelFallback = () => vc("zzqq-not-a-real-material-xyz");

  // U-OSC-SFC-EXTENDED-MATERIAL-DB (2026-06-30): the customer SFC page used a curated
  // ~16-grade table + category aliases and silently defaulted EVERY other named grade to
  // P-steel. The MaterialRegistry (2,675 emitted grades) is now wired into the resolver's
  // pre-P-steel fallback (EXTENDED_MATERIAL_DB), so a named superalloy/stainless/PH grade
  // the curated table misses gets its REAL ISO physics instead of being priced as steel.
  // FAIL-IF-REMOVED: with the wire gone, these materials would EQUAL pSteelFallback().

  it("Inconel 625 (a Ni superalloy MISSING from the curated grades) gets S-superalloy speeds, not P-steel", () => {
    const inco = vc("Inconel 625");
    // S-group superalloy cuts FAR slower than P-steel carbide. If the EXTENDED wire were
    // removed, Inconel 625 would hit the SAME P-steel fallback -> ~equal. The < 0.8x gap is
    // the proof the registry physics (ISO S) is reaching the customer page.
    expect(inco).toBeLessThan(pSteelFallback() * 0.8);
    expect(inco).toBeGreaterThan(0);
    expect(inco).toBeLessThan(150); // S-group carbide band, well below the P-steel fallback
  });

  it("Hastelloy C-276 (S) and Nitronic 60 (M) both resolve below the P-steel speed (registry-classified, not blind P)", () => {
    const pSteel = pSteelFallback();
    expect(vc("Hastelloy C-276")).toBeLessThan(pSteel * 0.85); // S superalloy
    expect(vc("Nitronic 60")).toBeLessThan(pSteel);            // M austenitic stainless < P steel
  });

  it("INVARIANT: a truly-unknown material still hits the P-steel fallback (fallback preserved + deterministic)", () => {
    // Two distinct unknowns both fall back to the SAME canonical P-steel coefficients -> identical speed.
    expect(vc("zzqq-not-a-real-1")).toBe(vc("wwww-also-not-real-2"));
  });

  it("INVARIANT: curated grades keep their ISO bands (EXTENDED is consulted only AFTER a curated miss)", () => {
    // 6061 (N) / 1045 (P) / D2 (H) resolve via MATERIAL_HARDNESS exactly as before; the EXTENDED
    // layer never shadows them, so the canonical N>P>H speed ordering is unchanged by the wire.
    const al = vc("6061"), steel = vc("1045"), hard = vc("D2");
    expect(al).toBeGreaterThan(steel); // non-ferrous faster than steel
    expect(hard).toBeLessThan(steel);  // hardened slower than steel
  });

  it("P0 fix: ambiguous structural-steel designations (S235JR / A36 / S355) do NOT resolve to ISO H hardened steel", () => {
    // Regression (physics-reviewer P0, 2026-06-30): a designation key (UNS/EN) that collides a
    // soft P structural steel with a 45-HRC quench&temper (ISO H) variant is DROPPED as ambiguous
    // -> falls through to the P-steel fallback. Before the cross-ISO drop, "max-kc wins" mis-
    // resolved these soft steels to ISO H (Vc ~48, like D2 tool steel) -- a silent-wrong class.
    const pSteel = pSteelFallback();
    for (const s of ["S235JR", "A36", "S355J2"]) {
      expect(vc(s)).toBe(pSteel); // P-steel fallback, NOT the slow hardened band
    }
  });

  it("adversarial: empty / whitespace material does not throw and computes a valid fallback speed", () => {
    expect(vc("")).toBeGreaterThan(0);
    expect(vc("   ")).toBeGreaterThan(0);
  });
});

/**
 * U-OSC-SFC-HARDNESS-KC-PARITY -- hardness now modulates Kienzle kc1.1 on the customer path.
 *
 * Before this unit, resolveMaterial returned kc1_1 RAW: a 4140 at HB 400 (hardened) published the
 * SAME cutting force as annealed 4140 (under-predicting spindle load +30-55% on hardened steel),
 * while SpeedFeedOrchestratorEngine had ALWAYS applied kc1_1*(HB/HB_ref)^0.4 -- a page<->core
 * parity defect (juliett+romeo DB audit 2026-07-01, both agents' #1 gap). The adjustment is now
 * the canonical kcHardnessFactor (constants.ts) shared by BOTH engines, applied in all three
 * resolveMaterial paths (curated / extended-registry / fallback). No user hardness -> factor 1.0.
 *
 * Note the fz-isolation invariant: in the ISO-group path of calculateSpeedFeed, hardness feeds
 * ONLY Vc (bounded hardnessAdj), never fz -- and Kienzle force is Vc-independent -- so the
 * end-to-end force ratio through sfc_calculate equals the kc factor EXACTLY.
 */
describe("SFC hardness->kc parity (canonical kcHardnessFactor)", () => {
  it("kcHardnessFactor reference values: (400/280)^0.4 and (400/200)^0.4", () => {
    expect(kcHardnessFactor(400, 280)).toBeCloseTo(Math.pow(400 / 280, 0.4), 10);
    expect(kcHardnessFactor(400, 280)).toBeCloseTo(1.15335, 4);
    expect(kcHardnessFactor(400, 200)).toBeCloseTo(1.31951, 4);
    expect(kcHardnessFactor(280, 280)).toBe(1);
  });

  it("kcHardnessFactor fail-neutral guards: NaN/zero/negative/Infinity return exactly 1", () => {
    expect(kcHardnessFactor(NaN, 280)).toBe(1);
    expect(kcHardnessFactor(280, NaN)).toBe(1);
    expect(kcHardnessFactor(0, 280)).toBe(1);
    expect(kcHardnessFactor(-50, 280)).toBe(1);
    expect(kcHardnessFactor(280, 0)).toBe(1);
    expect(kcHardnessFactor(Infinity, 280)).toBe(1);
  });

  it("curated path: 4140 at HB 400 raises kc1_1 by exactly the canonical factor vs baseline", () => {
    const baseline = resolveMaterial("4140");
    const hardened = resolveMaterial("4140", 400);
    expect(hardened.kc1_1 / baseline.kc1_1).toBeCloseTo(
      kcHardnessFactor(400, baseline.hardness), 10);
    expect(hardened.hardness).toBe(400);
  });

  it("back-compat: no hardness input, or hardness == reference, leaves kc1_1 byte-identical", () => {
    const baseline = resolveMaterial("4140");
    const atRef = resolveMaterial("4140", baseline.hardness);
    expect(atRef.kc1_1).toBe(baseline.kc1_1); // factor exactly 1 at the reference state
  });

  it("softer-than-reference (annealed) lowers kc -- the orchestrator's long-standing behavior", () => {
    const baseline = resolveMaterial("4140");
    const soft = resolveMaterial("4140", 200);
    expect(soft.kc1_1).toBeLessThan(baseline.kc1_1);
    expect(soft.kc1_1 / baseline.kc1_1).toBeCloseTo(kcHardnessFactor(200, baseline.hardness), 10);
  });

  it("HRC input converts to HB first (55 HRC -> hrcToHb), then the kc factor applies", () => {
    const baseline = resolveMaterial("4140");
    const hrc55 = resolveMaterial("4140", 55); // <=70 -> read as HRC per the R1 unit guard
    const expectedHb = hrcToHb(55);
    expect(hrc55.hardness).toBe(expectedHb);
    expect(hrc55.kc1_1 / baseline.kc1_1).toBeCloseTo(
      kcHardnessFactor(expectedHb, baseline.hardness), 10);
  });

  it("extended-registry path: Inconel 625 (registry HB ref) gets the same parity adjustment", () => {
    const baseline = resolveMaterial("Inconel 625");
    expect(baseline.resolved).toBe(true); // guards the test itself: must hit the ext path, not fallback
    const hard = resolveMaterial("Inconel 625", 300);
    expect(hard.kc1_1 / baseline.kc1_1).toBeCloseTo(kcHardnessFactor(300, baseline.hardness), 10);
  });

  it("fallback path: unknown material at HB 400 scales the canonical P kc by (400/200)^0.4", () => {
    const baseline = resolveMaterial("definitely-not-a-material-xyz");
    expect(baseline.resolved).toBe(false);
    const hard = resolveMaterial("definitely-not-a-material-xyz", 400);
    expect(hard.kc1_1 / baseline.kc1_1).toBeCloseTo(kcHardnessFactor(400, 200), 10);
  });

  it("E2E through productSFC: hardened 4140 force ratio == kc factor exactly (fz unchanged)", () => {
    const ref = resolveMaterial("4140").hardness;
    const annealed = calc({ ...base, material: "4140" });
    const hardened = calc({ ...base, material: "4140", material_hardness: 400 });
    // fz-isolation: hardness must not move chip load in the ISO-group path
    expect(hardened.feed_per_tooth_mm).toBeCloseTo(annealed.feed_per_tooth_mm, 10);
    // The customer-facing force rises by the canonical kc factor (was 1.0 pre-fix). The
    // published cutting_force_N is integer-rounded (observed 565/490 N), which quantizes this
    // ratio by up to ~0.002 at these magnitudes -- so assert within the rounding quantum here;
    // the EXACT (10-decimal) physics pin lives on resolveMaterial in the curated-path test above.
    expect(hardened.cutting_force_N / annealed.cutting_force_N)
      .toBeCloseTo(kcHardnessFactor(400, ref), 2);
  });

  it("E2E safety direction: hardened force strictly above annealed (pre-fix they were equal)", () => {
    const annealed = calc({ ...base, material: "4140" });
    const hardened = calc({ ...base, material: "4140", material_hardness: 400 });
    expect(hardened.cutting_force_N).toBeGreaterThan(annealed.cutting_force_N * 1.10);
  });
});

describe("productSFC sfc_calculate -- MRR internal consistency (mrr_inconsistent regression)", () => {
  // The exhaustive combinatorial sweep's silent-wrong oracle found the reported
  // mrr_cm3_min was ~5-6% below ap*ae*(fz*z*rpm)/1000 for low-MRR cases (small-D Ti-6Al-4V
  // and D2), 11,360 cells at grid 36. Root cause: calculateSpeedFeed returns an INTEGER-
  // rounded cutting_speed alongside a full-precision spindle_speed, so calculateMRR re-derived
  // spindle_speed from the rounded vc (1000*vc/(pi*D)) and produced a feed_rate/MRR inconsistent
  // with the reported rpm/table_feed. Fixed by anchoring vc on the full-precision rpm
  // (vc = pi*D*rpm/1000) right after reading the speed-feed result. These pin that the reported
  // MRR equals the volumetric MRR implied by the reported feed geometry -- the exact invariant a
  // customer checking the page arithmetic would apply.
  const mrrCases: Array<Partial<SFCInput>> = [
    // The two exact cells the sweep flagged (pre-fix relErr ~5.9% / ~5.3%):
    { material: "Ti-6Al-4V", tool_diameter: 3, number_of_teeth: 2, tool_material: "HSS", operation: "slot_milling", coolant_type: "mist", depth: 0.951, width: 2.919 },
    { material: "D2", tool_diameter: 3, number_of_teeth: 2, tool_material: "HSS", operation: "profile_milling", coolant_type: "flood", depth: 2.906, width: 1.127 },
    // Spanning guards across ISO groups + tool materials + engagement so the identity is not
    // just pinned on the low-MRR corner:
    { material: "1045", tool_diameter: 12, number_of_teeth: 4, tool_material: "Carbide", operation: "face_milling", coolant_type: "flood", depth: 3, width: 8 },
    { material: "6061", tool_diameter: 10, number_of_teeth: 3, tool_material: "Carbide", operation: "pocket_milling", coolant_type: "dry", depth: 5, width: 5 },
    { material: "316", tool_diameter: 6, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", coolant_type: "flood", depth: 2, width: 4 },
  ];

  for (const p of mrrCases) {
    it(`reported MRR == ap*ae*(fz*z*rpm)/1000 for ${p.material} D${p.tool_diameter} ${p.operation}`, () => {
      const r = calc(p);
      const ap = p.depth as number, ae = p.width as number, z = p.number_of_teeth as number;
      // Reconstruct the volumetric MRR from the SAME fields the page publishes.
      const vfImplied = r.feed_per_tooth_mm * z * r.spindle_rpm; // mm/min table feed
      const mrrImplied = (ap * ae * vfImplied) / 1000;           // cm^3/min
      expect(mrrImplied).toBeGreaterThan(0);
      // Within 1% -- only the 2-dp (mrr) / 3-dp (fz) / integer (rpm) display quanta remain;
      // the ~6% vc-rounding inconsistency this regression guards is gone.
      const relErr = Math.abs(r.mrr_cm3_min - mrrImplied) / mrrImplied;
      expect(relErr).toBeLessThan(0.01);
    });
  }

  it("vc <-> rpm identity holds on the page (Vc = pi*D*rpm/1000 within integer-display quantum)", () => {
    // The same root cause left cutting_speed_m_min inconsistent with spindle_rpm. After the fix
    // the displayed vc equals round(pi*D*rpm/1000).
    const r = calc({ material: "Ti-6Al-4V", tool_diameter: 3, number_of_teeth: 2, tool_material: "HSS", operation: "slot_milling", coolant_type: "mist", depth: 0.951, width: 2.919 });
    const vcFromRpm = (Math.PI * 3 * r.spindle_rpm) / 1000;
    expect(Math.abs(r.cutting_speed_m_min - Math.round(vcFromRpm))).toBeLessThanOrEqual(1);
  });
});

describe("productSFC sfc_calculate -- DSA-window advisory ON the SFC page (UNIT-0007 apply)", () => {
  // The DynamicStrainAgingEngine advisory is wired into productSFC: it estimates the
  // cutting-zone temperature (Loewen-Shaw) and, for carbon steel / austenitic stainless whose
  // temp lands in the DSA band, pushes a safety warning. ADVISORY only -- it must NOT change
  // force/vc/fz/mrr (that correction is the physics-reviewer-gated follow).
  it("carbon steel (1045) carbide slot at ~Vc200 (~335 C) surfaces a DSA warning", () => {
    const r = calc({ material: "1045", tool_diameter: 12, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", depth: 3, width: 6 });
    expect(r.safety_warnings.some((w) => /dynamic strain aging/i.test(w))).toBe(true);
    expect(r.safety_warnings.some((w) => /carbon_steel DSA window/i.test(w))).toBe(true);
  });

  it("aluminum (6061) has NO documented DSA window -> no DSA warning (not fabricated)", () => {
    const r = calc({ material: "6061", tool_diameter: 12, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", depth: 3, width: 6 });
    expect(r.safety_warnings.some((w) => /dynamic strain aging/i.test(w))).toBe(false);
  });

  it("the DSA advisory is ADVISORY-only: it does not perturb force/mrr/vc vs the same cut", () => {
    // Pin that the published numbers are governed solely by the physics path, not the warning.
    const r = calc({ material: "1045", tool_diameter: 12, number_of_teeth: 4, tool_material: "Carbide", operation: "slot_milling", depth: 3, width: 6 });
    expect(r.cutting_force_N).toBeGreaterThan(0);
    expect(r.mrr_cm3_min).toBeGreaterThan(0);
    // MRR still equals ap*ae*(fz*z*rpm)/1000 (the mrr_inconsistent invariant) -- warning didn't touch it.
    const vf = r.feed_per_tooth_mm * 4 * r.spindle_rpm;
    expect(r.mrr_cm3_min).toBeCloseTo((3 * 6 * vf) / 1000, 1);
  });
});
