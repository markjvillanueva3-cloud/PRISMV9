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
});
