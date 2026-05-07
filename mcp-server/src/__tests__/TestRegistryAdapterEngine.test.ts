import { describe, it, expect } from "vitest";
import {
  TestRegistryAdapterEngine,
  testRegistryAdapterEngine,
} from "../engines/TestRegistryAdapterEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

describe("TestRegistryAdapterEngine — U-INFRA05", () => {
  it("exports class and singleton", () => {
    expect(TestRegistryAdapterEngine).toBeDefined();
    expect(testRegistryAdapterEngine).toBeInstanceOf(TestRegistryAdapterEngine);
  });

  // ── Materials ────────────────────────────────────────────────────

  it("returns Kienzle kc1_1=1800 for ISO P (steel) — matches constants.ts", () => {
    const m = testRegistryAdapterEngine.getMaterialByISO("P");
    // Reference value: Sandvik Coromant General Turning (2024), median steel
    expect(m.kc1_1).toBe(1800);
    expect(m.mc).toBeCloseTo(0.25, 5);
    expect(m.kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1); // Single source of truth
  });

  it("returns correct values for ALL 6 ISO groups (variability floor)", () => {
    const expected: Record<string, number> = { P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200 };
    for (const [group, kc] of Object.entries(expected)) {
      const m = testRegistryAdapterEngine.getMaterialByISO(group as "P");
      expect(m.kc1_1).toBe(kc);
    }
  });

  it("Taylor constants match CANONICAL_TAYLOR for ISO P, M, N", () => {
    for (const g of ["P", "M", "N"] as const) {
      const m = testRegistryAdapterEngine.getMaterialByISO(g);
      expect(m.taylor_C).toBe(CANONICAL_TAYLOR[g].C);
      expect(m.taylor_n).toBe(CANONICAL_TAYLOR[g].n);
    }
  });

  it("returns a real MaterialPhysics record for a named material", () => {
    const list = testRegistryAdapterEngine.listMaterials();
    expect(list.length).toBeGreaterThanOrEqual(6); // At minimum one per ISO group
    // Grab the first and verify required fields are populated
    const first = testRegistryAdapterEngine.getMaterial(list[0]);
    expect(first.kc1_1).toBeGreaterThan(0);
    expect(first.mc).toBeGreaterThan(0);
    expect(first.mc).toBeLessThan(1);
    expect(first.taylor_C).toBeGreaterThan(0);
    expect(first.density_kg_m3).toBeGreaterThan(0);
    expect(first.hardness_HB).toBeGreaterThan(0);
  });

  it("spansISOGroups returns all 6 groups for variability sweeping", () => {
    expect(testRegistryAdapterEngine.spanningISOGroups()).toEqual(["P", "M", "K", "N", "S", "H"]);
  });

  // ── Tools ────────────────────────────────────────────────────────

  it("returns a 12 mm carbide end mill with real geometry", () => {
    const t = testRegistryAdapterEngine.getTool("CARBIDE_END_MILL_12MM_4FL");
    expect(t.diameter_mm).toBe(12.0);
    expect(t.flutes).toBe(4);
    expect(t.material).toBe("carbide");
    expect(t.max_rpm).toBe(12000);
    expect(t.corner_radius_mm).toBeGreaterThan(0);
  });

  it("returns ≥6 tools spanning end mill + drill + insert + ball-end (variability floor)", () => {
    const tools = testRegistryAdapterEngine.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(6);
    const types = new Set(tools.map((t) => t.type));
    expect(types.has("end_mill")).toBe(true);
    expect(types.has("drill")).toBe(true);
    expect(types.has("turning_insert")).toBe(true);
    expect(types.has("ball_mill")).toBe(true);
  });

  it("spanningTools returns ≥4 distinct tool categories", () => {
    const span = testRegistryAdapterEngine.spanningTools();
    expect(span.length).toBeGreaterThanOrEqual(4);
    const types = new Set(span.map((t) => t.type));
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  // ── Machines ─────────────────────────────────────────────────────

  it("returns Okuma Genos L250 with real spindle power 15 kW (manufacturer spec)", () => {
    const m = testRegistryAdapterEngine.getMachine("OKUMA_GENOS_L250");
    expect(m.spindle_power_kW).toBe(15);
    expect(m.spindle_max_rpm).toBe(4200);
    expect(m.controller).toMatch(/OSP/);
    expect(m.type).toBe("lathe");
  });

  it("spanningMachines returns ≥4 machines including mill, lathe, 5-axis, and EDM", () => {
    const span = testRegistryAdapterEngine.spanningMachines();
    const types = new Set(span.map((m) => m.type));
    expect(span.length).toBeGreaterThanOrEqual(4);
    expect(types.has("lathe")).toBe(true);
    expect(types.has("mill")).toBe(true);
    expect(types.has("edm_wire")).toBe(true);
    // 5-axis is a mill with axes>=5
    expect(span.some((m) => m.type === "mill" && m.axes === 5)).toBe(true);
  });

  // ── Formulas ─────────────────────────────────────────────────────

  it("exposes Kienzle + Taylor + Johnson-Cook + Altintas-SLD formula references with citations", () => {
    const kienzle = testRegistryAdapterEngine.getFormulaRef("KIENZLE_FC");
    expect(kienzle.domain).toBe("force");
    expect(kienzle.canonical_source).toMatch(/Sandvik|ISO 3685/);

    const taylor = testRegistryAdapterEngine.getFormulaRef("TAYLOR_TOOL_LIFE");
    expect(taylor.canonical_source).toMatch(/Taylor.*1907/);

    const jc = testRegistryAdapterEngine.getFormulaRef("JOHNSON_COOK_FLOW_STRESS");
    expect(jc.canonical_source).toMatch(/Johnson.*Cook.*1983/);

    const sld = testRegistryAdapterEngine.getFormulaRef("SLD_REGEN_CHATTER");
    expect(sld.canonical_source).toMatch(/Altintas/);
  });

  it("lists ≥5 formula references for generator use", () => {
    const list = testRegistryAdapterEngine.listFormulas();
    expect(list.length).toBeGreaterThanOrEqual(5);
    const domains = new Set(list.map((f) => f.domain));
    // Spanning: at least force, wear, deflection must be represented
    expect(domains.has("force")).toBe(true);
    expect(domains.has("wear")).toBe(true);
    expect(domains.has("deflection")).toBe(true);
  });

  // ── Failure modes ────────────────────────────────────────────────

  it("throws for unknown ISO group (failure mode: bad input)", () => {
    // @ts-expect-error testing runtime guard with invalid group
    expect(() => testRegistryAdapterEngine.getMaterialByISO("Z")).toThrow(/No canonical data/);
  });

  it("throws with a helpful message for unknown material name (failure mode)", () => {
    expect(() => testRegistryAdapterEngine.getMaterial("UNOBTAINIUM-42"))
      .toThrow(/not found/i);
  });

  it("throws for unknown tool id (failure mode)", () => {
    expect(() => testRegistryAdapterEngine.getTool("NO_SUCH_TOOL"))
      .toThrow(/not found/i);
  });

  it("throws for unknown machine id (failure mode)", () => {
    expect(() => testRegistryAdapterEngine.getMachine("UNKNOWN_CNC_XYZ"))
      .toThrow(/not found/i);
  });

  // ── Adversarial ──────────────────────────────────────────────────

  it("handles empty string input without crashing (adversarial: empty)", () => {
    expect(() => testRegistryAdapterEngine.getMaterial("")).toThrow(/not found/i);
    expect(() => testRegistryAdapterEngine.getTool("")).toThrow(/not found/i);
    expect(() => testRegistryAdapterEngine.getMachine("")).toThrow(/not found/i);
  });

  it("curated banks are frozen — attempted mutation does not affect future reads (adversarial: tampering)", () => {
    const t1 = testRegistryAdapterEngine.getTool("CARBIDE_END_MILL_12MM_4FL");
    // Attempt to mutate — in strict mode this throws; in sloppy mode it silently fails
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t1 as any).diameter_mm = 999;
    } catch { /* frozen object rejection is acceptable */ }
    const t2 = testRegistryAdapterEngine.getTool("CARBIDE_END_MILL_12MM_4FL");
    expect(t2.diameter_mm).toBe(12.0);
  });
});
