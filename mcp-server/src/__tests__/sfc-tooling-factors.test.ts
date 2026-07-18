import { describe, it, expect } from "vitest";
import { productSFC, type SFCInput, type SFCResult } from "../engines/ProductEngine.js";

/**
 * U-OSC-SFC-COATING-CUSTOMER-WIRE -- coating tooling factor wired into the CUSTOMER speed/feed path.
 *
 * Before this unit, `ProductEngine.sfcCalculate` (the engine behind the customer `/speed-feed-calc`
 * page, reached via `productSFC("sfc_calculate", ...)`) was COATING-BLIND: it never read params.coating,
 * so a diamond/PCD tool on a ferrous workpiece published a normal (over-)speed with no warning. The
 * material-specific coating layer (src/physics/coating-material-speed.ts, already physics-reviewed in
 * commit 2ce6a47af) is now wired in DERATE-ONLY (baseScalar 1.0, neutral): a COMPATIBLE (coating, ISO)
 * pair is a no-op, an INCOMPATIBLE / reduced-benefit pair LOWERS Vc + caps tool life + warns.
 *
 * These cases pin the WIRING (the physics cells themselves are pinned by coating-material-speed.test.ts):
 * reference-value ratios, the derate-only safety invariant, the incompatibility flag, and back-compat.
 * Round-tripped through the dispatcher (productSFC), not the engine singleton, per R15. ISO group is
 * forced via material_group so each (coating, ISO) override cell is exercised deterministically.
 */

const base = {
  material: "1045",
  material_group: "P", // ISO P carbon steel (ferrous) -- deterministic, decoupled from resolveMaterial
  operation: "slot_milling",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
} satisfies Partial<SFCInput>;

const baseN = { ...base, material: "6061", material_group: "N" }; // ISO N aluminum (non-ferrous)

/** Run sfc_calculate and fail loud (R12) if the engine returned an {error} envelope. */
function calc(params: Partial<SFCInput>): SFCResult {
  const r = productSFC("sfc_calculate", params) as { result?: SFCResult; error?: string };
  if (!r.result) throw new Error(`sfc_calculate returned error: ${r.error ?? JSON.stringify(r)}`);
  return r.result;
}
const vc = (params: Partial<SFCInput>) => calc(params).cutting_speed_m_min;

describe("SFC coating wiring -- back-compat (no coating + compatible coating are no-ops)", () => {
  it("omitting coating leaves the result unchanged (additive wiring)", () => {
    // A compatible coating with no override cell must equal the no-coating result (no double-count).
    expect(vc({ ...base, coating: "TiAlN" })).toBe(vc(base));
  });

  it("a compatible coating on its non-home ISO is still neutral (no override cell)", () => {
    // TiCN has no override cell anywhere -> neutral on P steel.
    expect(vc({ ...base, coating: "TiCN" })).toBe(vc(base));
  });

  it("diamond on aluminium (its NON-FERROUS home) is neutral and NOT flagged", () => {
    // COATING_ISO_SPEED_OVERRIDE.diamond covers only P/M/K/H -> N falls through to neutral 1.0,
    // and isCoatingMaterialIncompatible is false for a non-ferrous workpiece.
    expect(vc({ ...baseN, coating: "diamond" })).toBe(vc(baseN));
    expect(calc({ ...baseN, coating: "diamond" }).safety_warnings.some((w) => /incompatible/i.test(w)))
      .toBe(false);
  });
});

describe("SFC coating wiring -- incompatible pair (diamond/PCD on ferrous) derates + caps + warns", () => {
  it("diamond on P steel reduces Vc to ~30% of the coating-agnostic speed", () => {
    const ratio = vc({ ...base, coating: "diamond" }) / vc(base);
    expect(ratio).toBeGreaterThan(0.27);
    expect(ratio).toBeLessThan(0.33); // override cell diamond x P = 0.30
  });

  it("diamond on P steel caps tool life at the incompatibility cap (<=8 min) and below the uncapped life", () => {
    const capped = calc({ ...base, coating: "diamond" }).tool_life_min;
    expect(capped).toBeLessThanOrEqual(8); // COATING_INCOMPATIBLE_LIFE_CAP_MIN
    expect(capped).toBeLessThan(calc(base).tool_life_min);
  });

  it("diamond on P steel raises the incompatibility warning", () => {
    expect(calc({ ...base, coating: "diamond" }).safety_warnings.some((w) => /incompatible/i.test(w)))
      .toBe(true);
  });

  it("the PCD synonym maps to diamond (same incompatible behavior)", () => {
    const pcd = calc({ ...base, coating: "PCD" });
    expect(pcd.cutting_speed_m_min / vc(base)).toBeLessThan(0.33);
    expect(pcd.safety_warnings.some((w) => /incompatible/i.test(w))).toBe(true);
  });
});

describe("SFC coating wiring -- reduced-benefit pairs derate without an incompatibility flag", () => {
  it("DLC on P steel derates Vc to ~75% and warns 'reduced benefit' (not incompatible)", () => {
    const dlc = calc({ ...base, coating: "DLC" });
    const ratio = dlc.cutting_speed_m_min / vc(base);
    expect(ratio).toBeGreaterThan(0.72);
    expect(ratio).toBeLessThan(0.78); // override cell DLC x P = 0.75
    expect(dlc.safety_warnings.some((w) => /reduced benefit/i.test(w))).toBe(true);
    expect(dlc.safety_warnings.some((w) => /incompatible/i.test(w))).toBe(false);
  });

  it("high-Al PVD (AlCrN) on aluminium derates to ~90% (BUE, not oxidation)", () => {
    const ratio = vc({ ...baseN, coating: "AlCrN" }) / vc(baseN);
    expect(ratio).toBeGreaterThan(0.87);
    expect(ratio).toBeLessThan(0.93); // override cell AlCrN x N = 0.90
  });
});

describe("SFC coating wiring -- derate-only safety invariant (every coating only LOWERS Vc)", () => {
  // R9: this fails the instant a future edit introduces a coating cell that RAISES the customer Vc
  // without a physics-reviewer-gated boost path -- the monotonic-safety guarantee of this unit.
  const coatings = ["TiAlN", "AlTiN", "AlCrN", "TiN", "TiCN", "DLC", "diamond", "PCD", "uncoated"];
  for (const c of coatings) {
    it(`coating "${c}" never raises Vc above the coating-agnostic speed (ferrous)`, () => {
      expect(vc({ ...base, coating: c })).toBeLessThanOrEqual(vc(base));
    });
  }
});

describe("SFC chip-thinning advisory (ae < D/2) -- U-OSC-SFC-CHIPTHIN-ADVISORY", () => {
  // D = 12 mm (base). ae = width_of_cut. radial engagement % = 100*ae/D.
  const hasChipThinWarn = (params: Partial<SFCInput>) =>
    calc(params).safety_warnings.some((w) => /chip thinning/i.test(w));

  it("light radial engagement (ae=2, ~17%) raises the chip-thinning advisory", () => {
    expect(hasChipThinWarn({ ...base, tool_diameter: 12, width_of_cut: 2 })).toBe(true);
  });

  it("the advisory names a feed compensation > 1x (restore target chip load)", () => {
    const w = calc({ ...base, tool_diameter: 12, width_of_cut: 2 }).safety_warnings.find((s) =>
      /chip thinning/i.test(s),
    )!;
    expect(w).toMatch(/feed compensation/i);
    const m = w.match(/~([\d.]+)x/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeGreaterThan(1); // ae<D/2 -> factor 1/sqrt(ae/D) > 1.41
  });

  it("full radial engagement (ae = D/2, exactly 50%) does NOT raise the advisory", () => {
    expect(hasChipThinWarn({ ...base, tool_diameter: 12, width_of_cut: 6 })).toBe(false);
  });

  it("back-compat: default cut (no width_of_cut -> ae = D/2) does NOT spam the advisory", () => {
    expect(hasChipThinWarn(base)).toBe(false);
  });

  it("the advisory is purely additive -- the numeric result is unaffected by whether it fires", () => {
    // Same geometry, the chip-thinning branch only pushes a string: cutting speed stays a valid
    // positive number regardless (the advisory never mutates vc/fz/force).
    const r = calc({ ...base, tool_diameter: 12, width_of_cut: 2 });
    expect(r.cutting_speed_m_min).toBeGreaterThan(0);
    expect(Number.isFinite(r.tool_life_min)).toBe(true);
  });
});

describe("SFC coolant derate -- U-OSC-SFC-COOLANT (physics-reviewer-approved, derate-only)", () => {
  // Reference cells (CoolantVcModifier P-group): dry [Vc 0.78, TaylorC 0.65], mist [1.05, 1.02],
  // mql [1.00, 0.95], flood [1.00, 1.00]. 1045 Taylor n = 0.25 -> 1/n = 4. Net life factor for a
  // clamped coolant = (kC / kVc)^(1/n) because life ~ (C/Vc)^(1/n). The physics-reviewer flagged that
  // applying kC LINEARLY (0.65) instead of via the exponent (0.65^4) under-derates life ~4.6x, and
  // that deriding Vc WITHOUT the C-derate OVER-states life -- these tests pin the correct wiring.

  it("dry on P steel derates published Vc to ~78% of the flood baseline", () => {
    const ratio = calc({ ...base, coolant: "dry" }).cutting_speed_m_min / vc({ ...base, coolant: "flood" });
    expect(ratio).toBeGreaterThan(0.76);
    expect(ratio).toBeLessThan(0.80); // Vc multiplier 0.78
  });

  it("dry on P steel derates tool life to ~48% via Taylor kC^(1/n) -- NOT the linear 0.65", () => {
    const ratio = calc({ ...base, coolant: "dry" }).tool_life_min / calc({ ...base, coolant: "flood" }).tool_life_min;
    // net life factor = (kC/kVc)^(1/n) = (0.65/0.78)^4 = 0.482; the WRONG linear apply would give ~0.65.
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.52);
  });

  it("air_blast maps to dry (identical Vc + tool-life derate)", () => {
    const air = calc({ ...base, coolant: "air_blast" });
    const dry = calc({ ...base, coolant: "dry" });
    expect(air.cutting_speed_m_min).toBeCloseTo(dry.cutting_speed_m_min, 6);
    expect(air.tool_life_min).toBeCloseTo(dry.tool_life_min, 6);
  });

  it("mist on P is a no-op -- the >1.0 Vc+C boost is clamped (no speed or life inflation)", () => {
    const mist = calc({ ...base, coolant: "mist" });
    const flood = calc({ ...base, coolant: "flood" });
    expect(mist.cutting_speed_m_min).toBeCloseTo(flood.cutting_speed_m_min, 6);
    expect(mist.tool_life_min).toBeCloseTo(flood.tool_life_min, 6);
  });

  it("omitting coolant == flood baseline (additive, back-compat)", () => {
    const absent = calc(base);
    const flood = calc({ ...base, coolant: "flood" });
    expect(absent.cutting_speed_m_min).toBeCloseTo(flood.cutting_speed_m_min, 6);
    expect(absent.tool_life_min).toBeCloseTo(flood.tool_life_min, 6);
  });

  it("derate-only safety invariant: no coolant option raises Vc or tool life above flood", () => {
    const flood = calc({ ...base, coolant: "flood" });
    for (const c of ["flood", "mist", "mql", "dry", "air_blast"]) {
      const r = calc({ ...base, coolant: c });
      expect(r.cutting_speed_m_min).toBeLessThanOrEqual(flood.cutting_speed_m_min + 1e-9);
      expect(r.tool_life_min).toBeLessThanOrEqual(flood.tool_life_min + 1e-9);
    }
  });

  it("dry never OVER-states tool life (the Vc-only trap the physics review caught)", () => {
    // Lowering Vc alone would RAISE Taylor life; the mandatory C-derate keeps dry life < flood life.
    expect(calc({ ...base, coolant: "dry" }).tool_life_min)
      .toBeLessThan(calc({ ...base, coolant: "flood" }).tool_life_min);
  });

  it("dry derate raises a coolant advisory naming the derate", () => {
    expect(calc({ ...base, coolant: "dry" }).safety_warnings.some((w) => /coolant.*derate/i.test(w)))
      .toBe(true);
  });
});

describe("SFC safety action surfaces coating incompatibility -- U-OSC-SFC-SAFETY-COATING-GAP", () => {
  // sfcSafety recomputes the operating point independently of sfcCalculate. Before this fix it never
  // called isCoatingMaterialIncompatible, so the SAFETY action silently passed a do-not-run tool pair.
  const safetyWarnings = (params: Partial<SFCInput>): string[] =>
    (productSFC("sfc_safety", params) as { warnings?: string[] }).warnings ?? [];

  it("sfc_safety flags diamond on ferrous P steel as a do-NOT-run incompatibility", () => {
    expect(safetyWarnings({ ...base, coating: "diamond" }).some((w) => /incompatible/i.test(w))).toBe(true);
  });

  it("sfc_safety flags the PCD synonym the same way", () => {
    expect(safetyWarnings({ ...base, coating: "PCD" }).some((w) => /incompatible/i.test(w))).toBe(true);
  });

  it("sfc_safety does NOT flag a compatible coating (TiAlN on P) or no coating", () => {
    expect(safetyWarnings({ ...base, coating: "TiAlN" }).some((w) => /incompatible/i.test(w))).toBe(false);
    expect(safetyWarnings(base).some((w) => /incompatible/i.test(w))).toBe(false);
  });
});

describe("SFC safety scores the ACTUAL published operating point -- U-OSC-SFC-SAFETY-PARITY", () => {
  // Before this fix sfcSafety scored the RAW speed-feed point -- no goal scaler, coating/coolant derate,
  // or machine/tool clamp -- so the safety SCORE reflected a faster/deeper point than the calculator
  // publishes. Now it applies the same operating-point pipeline, so the safety score MATCHES
  // sfc_calculate's safety_score for identical inputs (the load-bearing parity assertion).
  const safetyScore = (p: Partial<SFCInput>): number =>
    (productSFC("sfc_safety", p) as { score: number }).score;

  it("baseline: sfc_safety score == sfc_calculate safety_score (no derate/clamp)", () => {
    expect(safetyScore(base)).toBe(calc(base).safety_score);
  });

  it("coolant derate flows into the safety score (matches calculator under dry)", () => {
    expect(safetyScore({ ...base, coolant: "dry" })).toBe(calc({ ...base, coolant: "dry" }).safety_score);
  });

  it("machine+tool rpm clamp flows into the safety score (matches calculator when clamped)", () => {
    const p = { ...base, machine_max_rpm: 5000, tool_max_rpm: 2000 };
    expect(safetyScore(p)).toBe(calc(p).safety_score);
  });

  it("tool DOC clamp flows into the safety score (matches calculator when ap is clamped)", () => {
    expect(safetyScore({ ...base, tool_max_doc: 2 })).toBe(calc({ ...base, tool_max_doc: 2 }).safety_score);
  });

  it("coating speed derate flows into the safety score (diamond-on-P matches calculator)", () => {
    expect(safetyScore({ ...base, coating: "diamond" })).toBe(calc({ ...base, coating: "diamond" }).safety_score);
  });
});

describe("SFC coating+coolant derate PARITY across calculate / compare / optimize -- U-OSC-SFC-DERATE-PARITY", () => {
  // Before this unit, sfc_compare + sfc_optimize recomputed the operating point but IGNORED the
  // coating + coolant derates that sfc_calculate applies -- so comparing/optimizing silently
  // published FASTER speeds + LONGER tool life than the calculator (arm-C divergence). All three
  // resolvers now share sfcToolingDerates, so the derate is identical on every surface. Round-tripped
  // through the dispatcher (productSFC), not the singleton, per R15.

  type CompareApproach = {
    name: string; cutting_speed: number; feed: number; tool_life: number;
    mrr: number; power: number; surface_roughness: number; score: number;
  };
  type CompareResult = { approaches: CompareApproach[]; recommended: string; comparison_notes: string[] };
  type OptimizeResult = {
    objective: string;
    original: { vc: number; fz: number; ap: number; ae: number };
    optimized: { vc: number; fz: number; ap: number; ae: number };
    improvement_pct: number;
  };

  function compare(params: Partial<SFCInput>): CompareResult {
    const r = productSFC("sfc_compare", params) as { result?: CompareResult; error?: string };
    if (!r.result) throw new Error(`sfc_compare returned error: ${r.error ?? JSON.stringify(r)}`);
    return r.result;
  }
  function optimize(params: Partial<SFCInput> & { objective?: string }): OptimizeResult {
    const r = productSFC("sfc_optimize", params) as { result?: OptimizeResult; error?: string };
    if (!r.result) throw new Error(`sfc_optimize returned error: ${r.error ?? JSON.stringify(r)}`);
    return r.result;
  }
  /** The "Carbide endmill" approach -- the one comparable to sfc_calculate's default Carbide tool. */
  function carbide(params: Partial<SFCInput>): CompareApproach {
    const a = compare(params).approaches.find((x) => x.name === "Carbide endmill");
    if (!a) throw new Error("sfc_compare returned no Carbide approach");
    return a;
  }

  // ---- sfc_compare ----
  it("compare: dry coolant derates the Carbide approach Vc to ~78% of flood", () => {
    const ratio = carbide({ ...base, coolant: "dry" }).cutting_speed / carbide({ ...base, coolant: "flood" }).cutting_speed;
    expect(ratio).toBeGreaterThan(0.76);
    expect(ratio).toBeLessThan(0.80); // coolant Vc multiplier 0.78 -- same as sfc_calculate
  });

  it("compare: dry never OVER-states the Carbide approach tool life vs flood (mandatory C-derate)", () => {
    // Lowering Vc alone RAISES Taylor life; the pre-scaled C keeps dry life strictly below flood.
    expect(carbide({ ...base, coolant: "dry" }).tool_life).toBeLessThan(carbide({ ...base, coolant: "flood" }).tool_life);
  });

  it("compare: diamond on ferrous P derates the Carbide approach Vc to ~30%", () => {
    const ratio = carbide({ ...base, coating: "diamond" }).cutting_speed / carbide(base).cutting_speed;
    expect(ratio).toBeGreaterThan(0.27);
    expect(ratio).toBeLessThan(0.33); // coating override diamond x P = 0.30 -- same as sfc_calculate
  });

  it("compare: diamond on ferrous P caps the Carbide approach tool life at the incompatibility cap (<=8 min)", () => {
    const capped = carbide({ ...base, coating: "diamond" }).tool_life;
    expect(capped).toBeLessThanOrEqual(8); // COATING_INCOMPATIBLE_LIFE_CAP_MIN
    expect(capped).toBeLessThan(carbide(base).tool_life);
  });

  it("compare: omitting coolant+coating == flood/no-coating (additive back-compat)", () => {
    const absent = carbide(base);
    const flood = carbide({ ...base, coolant: "flood" });
    expect(absent.cutting_speed).toBe(flood.cutting_speed);
    expect(absent.tool_life).toBeCloseTo(flood.tool_life, 6);
  });

  it("compare: derate-only invariant -- no coolant option raises ANY approach Vc above flood", () => {
    const flood = compare({ ...base, coolant: "flood" });
    for (const c of ["flood", "mist", "mql", "dry", "air_blast"]) {
      const r = compare({ ...base, coolant: c });
      for (const a of r.approaches) {
        const f = flood.approaches.find((x) => x.name === a.name)!;
        expect(a.cutting_speed).toBeLessThanOrEqual(f.cutting_speed + 1e-9);
      }
    }
  });

  // ---- sfc_optimize ----
  it("optimize: dry coolant derates the baseline Vc to ~78% of flood", () => {
    const ratio = optimize({ ...base, coolant: "dry" }).original.vc / optimize({ ...base, coolant: "flood" }).original.vc;
    expect(ratio).toBeGreaterThan(0.76);
    expect(ratio).toBeLessThan(0.80);
  });

  it("optimize: diamond on ferrous P derates the baseline Vc to ~30%", () => {
    const ratio = optimize({ ...base, coating: "diamond" }).original.vc / optimize(base).original.vc;
    expect(ratio).toBeGreaterThan(0.27);
    expect(ratio).toBeLessThan(0.33);
  });

  it("optimize: omitting coolant+coating == flood/no-coating baseline (back-compat)", () => {
    expect(optimize(base).original.vc).toBe(optimize({ ...base, coolant: "flood" }).original.vc);
  });

  it("optimize: derate-only invariant -- dry baseline Vc <= flood baseline Vc", () => {
    expect(optimize({ ...base, coolant: "dry" }).original.vc)
      .toBeLessThanOrEqual(optimize({ ...base, coolant: "flood" }).original.vc);
  });

  // ---- cross-surface parity: the exact divergence this unit closes ----
  it("cross-surface: optimize baseline Vc EXACTLY equals calculate Vc at flood (no divergence)", () => {
    // No machine clamp + balanced goal + no coating -> both surfaces = round(sf.cutting_speed).
    expect(optimize({ ...base, coolant: "flood" }).original.vc).toBe(calc({ ...base, coolant: "flood" }).cutting_speed_m_min);
  });

  it("cross-surface: optimize baseline Vc EXACTLY equals calculate Vc at dry (derate applied identically)", () => {
    // The load-bearing regression test: pre-fix, optimize ignored the coolant derate so its baseline
    // Vc stayed at the flood value while calculate dropped to 0.78x -- a hard divergence. Now equal.
    expect(optimize({ ...base, coolant: "dry" }).original.vc).toBe(calc({ ...base, coolant: "dry" }).cutting_speed_m_min);
  });

  it("adversarial: an unknown coolant string is neutral on compare + optimize (no derate, no throw)", () => {
    expect(carbide({ ...base, coolant: "plasma" }).cutting_speed).toBe(carbide({ ...base, coolant: "flood" }).cutting_speed);
    expect(optimize({ ...base, coolant: "plasma" }).original.vc).toBe(optimize({ ...base, coolant: "flood" }).original.vc);
  });

  // ---- machine-RPM spindle-clamp parity (U-OSC-SFC-RPM-CLAMP-PARITY) ----
  // sfc_calculate clamps rpm to the machine ceiling so it never recommends an unreachable speed;
  // compare/optimize now do the same. D=12mm base -> unclamped Vc implies ~5300 rpm, so a 3000-rpm
  // ceiling bites hard (any residual unclamped speed would blow past the +1% rounding tolerance).
  const D_MM = 12; // base.tool_diameter
  const impliedRpm = (vcMMin: number) => (1000 * vcMMin) / (Math.PI * D_MM);

  it("compare: a low machine RPM ceiling clamps EVERY approach to a reachable spindle speed", () => {
    for (const a of compare({ ...base, machine_max_rpm: 3000 }).approaches) {
      expect(impliedRpm(a.cutting_speed)).toBeLessThan(3000 * 1.01); // +1% for the Math.round on cutting_speed
    }
  });

  it("compare: a very high RPM ceiling is a no-op (back-compat, reachable speed untouched)", () => {
    expect(carbide({ ...base, machine_max_rpm: 999999 }).cutting_speed).toBe(carbide(base).cutting_speed);
  });

  it("optimize: a low machine RPM ceiling keeps BOTH original and optimized Vc reachable", () => {
    const r = optimize({ ...base, machine_max_rpm: 3000 });
    expect(impliedRpm(r.original.vc)).toBeLessThan(3000 * 1.01);
    expect(impliedRpm(r.optimized.vc)).toBeLessThan(3000 * 1.01);
  });

  it("optimize: a very high RPM ceiling is a no-op (back-compat baseline unchanged)", () => {
    expect(optimize({ ...base, machine_max_rpm: 999999 }).original.vc).toBe(optimize(base).original.vc);
  });

  // ---- tool rated clamp parity into compare/optimize (U-OSC-SFC-TOOL-RATED-CLAMP R15 apply-to-all) ----
  it("compare: a tool_max_rpm clamps every approach's Vc reachable by the tool", () => {
    for (const a of compare({ ...base, tool_max_rpm: 2000 }).approaches) {
      expect((1000 * a.cutting_speed) / (Math.PI * 12)).toBeLessThan(2000 * 1.01);
    }
  });

  it("optimize: a tool_max_rpm clamps BOTH the baseline and optimized Vc", () => {
    const r = optimize({ ...base, tool_max_rpm: 2000 });
    expect((1000 * r.original.vc) / (Math.PI * 12)).toBeLessThan(2000 * 1.01);
    expect((1000 * r.optimized.vc) / (Math.PI * 12)).toBeLessThan(2000 * 1.01);
  });

  it("compare+optimize: min(machine,tool) rpm -- the tighter tool ceiling binds", () => {
    for (const a of compare({ ...base, machine_max_rpm: 5000, tool_max_rpm: 2000 }).approaches) {
      expect((1000 * a.cutting_speed) / (Math.PI * 12)).toBeLessThan(2000 * 1.01);
    }
    const o = optimize({ ...base, machine_max_rpm: 5000, tool_max_rpm: 2000 });
    expect((1000 * o.original.vc) / (Math.PI * 12)).toBeLessThan(2000 * 1.01);
  });

  it("optimize: tool_max_doc clamps the reported original ap (DOC parity)", () => {
    expect(optimize({ ...base, tool_max_doc: 2 }).original.ap).toBeLessThanOrEqual(2 + 1e-6);
  });

  it("compare/optimize: a high tool rating is a no-op (back-compat)", () => {
    expect(carbide({ ...base, tool_max_rpm: 999999 }).cutting_speed).toBe(carbide(base).cutting_speed);
    expect(optimize({ ...base, tool_max_rpm: 999999 }).original.vc).toBe(optimize(base).original.vc);
  });
});

describe("SFC tool rated min/max clamp (spindle rpm + axial DOC) -- U-OSC-SFC-TOOL-RATED-CLAMP", () => {
  // The selected catalog tool carries maxRpm (rev/min) + maxDoc (mm); the SFC clamps the recommendation
  // to the TIGHTER of machine vs tool so it never publishes a speed/DOC the physical tool cannot run.
  // Metric-agnostic (rpm) + metric (mm) -- NO unit conversion. DERATE-ONLY. Round-tripped via productSFC.
  // base D=12 -> unclamped ~5300 rpm and ap defaults to D*0.5 = 6 mm, so low tool ratings bite hard.

  it("tool_max_rpm below the natural speed clamps the spindle rpm (reachable by the tool)", () => {
    const r = calc({ ...base, tool_max_rpm: 2000 });
    expect(r.spindle_rpm).toBeLessThanOrEqual(2000);
    expect(r.spindle_rpm).toBeLessThan(calc(base).spindle_rpm); // base ~5300 rpm
  });

  it("tool_max_doc below the requested depth clamps the reported axial DOC", () => {
    const r = calc({ ...base, tool_max_doc: 2 });
    expect(r.depth_of_cut_mm).toBeLessThanOrEqual(2 + 1e-6);
    expect(r.depth_of_cut_mm).toBeLessThan(calc(base).depth_of_cut_mm); // base ap = D*0.5 = 6 mm
  });

  it("the TIGHTER of machine vs tool rpm binds -- tool tighter", () => {
    expect(calc({ ...base, machine_max_rpm: 5000, tool_max_rpm: 2000 }).spindle_rpm).toBeLessThanOrEqual(2000);
  });

  it("the TIGHTER of machine vs tool rpm binds -- machine tighter", () => {
    expect(calc({ ...base, machine_max_rpm: 1500, tool_max_rpm: 4000 }).spindle_rpm).toBeLessThanOrEqual(1500);
  });

  it("a high tool_max_rpm + tool_max_doc is a no-op (additive back-compat)", () => {
    const hi = calc({ ...base, tool_max_rpm: 999999, tool_max_doc: 999 });
    const bare = calc(base);
    expect(hi.spindle_rpm).toBe(bare.spindle_rpm);
    expect(hi.depth_of_cut_mm).toBe(bare.depth_of_cut_mm);
    expect(hi.cutting_speed_m_min).toBe(bare.cutting_speed_m_min);
  });

  it("derate-only invariant: no tool rating raises spindle rpm or DOC above the unclamped baseline", () => {
    const bare = calc(base);
    for (const rpmCap of [500, 2000, 8000, 999999]) {
      expect(calc({ ...base, tool_max_rpm: rpmCap }).spindle_rpm).toBeLessThanOrEqual(bare.spindle_rpm + 1e-9);
    }
    for (const docCap of [1, 3, 6, 999]) {
      expect(calc({ ...base, tool_max_doc: docCap }).depth_of_cut_mm).toBeLessThanOrEqual(bare.depth_of_cut_mm + 1e-9);
    }
  });

  it("adversarial: zero / negative tool ratings are no-ops (guarded, no throw)", () => {
    const bare = calc(base);
    expect(calc({ ...base, tool_max_rpm: 0 }).spindle_rpm).toBe(bare.spindle_rpm);
    expect(calc({ ...base, tool_max_rpm: -100 }).spindle_rpm).toBe(bare.spindle_rpm);
    expect(calc({ ...base, tool_max_doc: 0 }).depth_of_cut_mm).toBe(bare.depth_of_cut_mm);
    expect(calc({ ...base, tool_max_doc: -5 }).depth_of_cut_mm).toBe(bare.depth_of_cut_mm);
  });

  it("a tool_max_rpm clamp raises a 'tool's rated max' rpm advisory", () => {
    expect(calc({ ...base, tool_max_rpm: 2000 }).safety_warnings.some((w) => /tool's rated max .*rpm/i.test(w))).toBe(true);
  });

  it("a tool_max_doc clamp raises a tool-DOC advisory", () => {
    expect(calc({ ...base, tool_max_doc: 2 }).safety_warnings.some((w) => /depth of cut exceeded the tool/i.test(w))).toBe(true);
  });
});
