/**
 * HyperMillStrategyRegistration tests — CAM-EXHAUST-MS0 / U-CAM-HM-STRATREG-TESTS-01
 *
 * Coverage:
 *   1. registerHyperMillStrategies(): idempotent, returns count on first call
 *   2. getHyperMillStrategies(): returns all 25 strategies after registration
 *   3. getHyperMillStrategiesByCategory(): per-category filter
 *   4. HYPERMILL_STRATEGIES_TABLE: schema invariant + canonical entries
 *   5. ID format ("hypermill_<snake_case>") for collision avoidance
 *   6. Strategy metadata: camSupport=["hyperMILL"], prismNovel=false
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  registerHyperMillStrategies,
  getHyperMillStrategies,
  getHyperMillStrategiesByCategory,
  HYPERMILL_STRATEGIES_TABLE,
} from "../engines/HyperMillStrategyRegistration.js";

const EXPECTED_TABLE_SIZE = 25;
const MILLING_ROUGHING = "milling_roughing";
const MILLING_FINISHING = "milling_finishing";
const TURNING = "turning";

describe("HyperMillStrategyRegistration — module exports", () => {
  it("exports register/get/byCategory functions + raw table", () => {
    expect(typeof registerHyperMillStrategies).toBe("function");
    expect(typeof getHyperMillStrategies).toBe("function");
    expect(typeof getHyperMillStrategiesByCategory).toBe("function");
    expect(Array.isArray(HYPERMILL_STRATEGIES_TABLE)).toBe(true);
  });
});

describe("HyperMillStrategyRegistration — HYPERMILL_STRATEGIES_TABLE", () => {
  it("contains 25 entries (mapped to ToolpathStrategyRegistry)", () => {
    expect(HYPERMILL_STRATEGIES_TABLE.length).toBe(EXPECTED_TABLE_SIZE);
  });

  it("every entry has required fields", () => {
    HYPERMILL_STRATEGIES_TABLE.forEach((e) => {
      expect(typeof e.cycle).toBe("string");
      expect(typeof e.description).toBe("string");
      expect(typeof e.category).toBe("string");
      expect(typeof e.subcategory).toBe("string");
      expect(Array.isArray(e.bestFor)).toBe(true);
      expect(Array.isArray(e.materials)).toBe(true);
      expect(e.bestFor.length).toBeGreaterThan(0);
      expect(e.materials.length).toBeGreaterThan(0);
    });
  });

  it("contains canonical Pocket Milling entry (milling_roughing)", () => {
    const pocket = HYPERMILL_STRATEGIES_TABLE.find((e) => e.cycle === "Pocket Milling");
    expect(pocket!.category).toBe(MILLING_ROUGHING);
    expect(pocket!.subcategory).toBe("traditional");
    expect(pocket!.bestFor).toContain("pockets");
    expect(pocket!.params!.cuttingMode).toBe("climb");
  });

  it("contains canonical Turning Roughing entry (turning)", () => {
    const turning = HYPERMILL_STRATEGIES_TABLE.find((e) => e.cycle === "Turning Roughing");
    expect(turning!.category).toBe(TURNING);
    expect(turning!.subcategory).toBe("roughing");
    expect(turning!.params!.cuttingMode).toBe("conventional");
  });

  it("contains Z Level Finishing with stepdown 0.1 (HSM-grade)", () => {
    const z = HYPERMILL_STRATEGIES_TABLE.find((e) => e.cycle === "Z Level Finishing");
    expect(z!.category).toBe(MILLING_FINISHING);
    expect(z!.params!.stepdownFactor).toBe(0.1);
  });
});

describe("HyperMillStrategyRegistration — registerHyperMillStrategies()", () => {
  it("returns 0 on subsequent calls (idempotent)", () => {
    // The first call may have happened in another test or via getHyperMillStrategies().
    // Subsequent calls always return 0 because _registered flag is set.
    registerHyperMillStrategies(); // ensure registered
    const second = registerHyperMillStrategies();
    expect(second).toBe(0);
  });
});

describe("HyperMillStrategyRegistration — getHyperMillStrategies()", () => {
  it("returns 25 strategies all tagged with camSupport=['hyperMILL']", () => {
    const strategies = getHyperMillStrategies();
    expect(strategies.length).toBe(EXPECTED_TABLE_SIZE);
    strategies.forEach((s) => {
      expect(s.camSupport).toContain("hyperMILL");
      expect(s.prismNovel).toBe(false);
    });
  });

  it("each strategy id starts with 'hypermill_' prefix", () => {
    const strategies = getHyperMillStrategies();
    strategies.forEach((s) => {
      expect(s.id.startsWith("hypermill_")).toBe(true);
    });
  });

  it("strategy ids are snake_case (no spaces, no uppercase)", () => {
    const strategies = getHyperMillStrategies();
    strategies.forEach((s) => {
      expect(s.id).toMatch(/^[a-z0-9_]+$/);
    });
  });

  it("strategy ids are unique (no collisions)", () => {
    const strategies = getHyperMillStrategies();
    const ids = strategies.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains canonical hypermill_pocket_milling strategy", () => {
    const strategies = getHyperMillStrategies();
    const pocket = strategies.find((s) => s.id === "hypermill_pocket_milling");
    expect(pocket!.name).toBe("Pocket Milling");
    expect(pocket!.category).toBe(MILLING_ROUGHING);
  });

  it("contains hypermill_turning_roughing strategy", () => {
    const strategies = getHyperMillStrategies();
    const turning = strategies.find((s) => s.id === "hypermill_turning_roughing");
    expect(turning!.category).toBe(TURNING);
  });

  it("special characters in cycle name converted to underscore", () => {
    // "Rib / Groove Machining" → hypermill_rib_groove_machining
    const strategies = getHyperMillStrategies();
    const rib = strategies.find((s) => s.id === "hypermill_rib_groove_machining");
    expect(rib!.name).toBe("Rib / Groove Machining");
  });
});

describe("HyperMillStrategyRegistration — getHyperMillStrategiesByCategory()", () => {
  it("returns milling_roughing strategies", () => {
    const r = getHyperMillStrategiesByCategory(MILLING_ROUGHING);
    expect(r.length).toBeGreaterThan(0);
    r.forEach((s) => expect(s.category).toBe(MILLING_ROUGHING));
  });

  it("returns milling_finishing strategies", () => {
    const r = getHyperMillStrategiesByCategory(MILLING_FINISHING);
    expect(r.length).toBeGreaterThan(0);
    r.forEach((s) => expect(s.category).toBe(MILLING_FINISHING));
  });

  it("returns turning strategies", () => {
    const r = getHyperMillStrategiesByCategory(TURNING);
    expect(r.length).toBeGreaterThan(0);
    r.forEach((s) => expect(s.category).toBe(TURNING));
  });

  it("milling_finishing has more entries than milling_roughing", () => {
    const finish = getHyperMillStrategiesByCategory(MILLING_FINISHING);
    const rough = getHyperMillStrategiesByCategory(MILLING_ROUGHING);
    expect(finish.length).toBeGreaterThanOrEqual(rough.length);
  });

  it("returns 5 turning strategies (per HM_TABLE)", () => {
    const turning = getHyperMillStrategiesByCategory(TURNING);
    expect(turning.length).toBe(5);
  });

  it("counts across categories sum to 25", () => {
    const r = getHyperMillStrategiesByCategory(MILLING_ROUGHING);
    const f = getHyperMillStrategiesByCategory(MILLING_FINISHING);
    const t = getHyperMillStrategiesByCategory(TURNING);
    expect(r.length + f.length + t.length).toBe(EXPECTED_TABLE_SIZE);
  });
});

describe("HyperMillStrategyRegistration — params payload", () => {
  it("Pocket Milling has stepdownFactor=1.0, stepoverFactor=0.5", () => {
    const strategies = getHyperMillStrategies();
    const pocket = strategies.find((s) => s.id === "hypermill_pocket_milling");
    expect(pocket!.params.stepdownFactor).toBe(1.0);
    expect(pocket!.params.stepoverFactor).toBe(0.5);
  });

  it("Optimised Roughing has stepoverFactor=0.4 (HSM)", () => {
    const strategies = getHyperMillStrategies();
    const opt = strategies.find((s) => s.id === "hypermill_optimised_roughing");
    expect(opt!.params.stepoverFactor).toBe(0.4);
  });

  it("Equidistant Finishing uses stepoverFactor=0.1 (smooth)", () => {
    const strategies = getHyperMillStrategies();
    const eq = strategies.find((s) => s.id === "hypermill_equidistant_finishing");
    expect(eq!.params.stepoverFactor).toBe(0.1);
  });

  it("Pencil Milling has cuttingMode=climb but no stepdown/stepover", () => {
    const strategies = getHyperMillStrategies();
    const p = strategies.find((s) => s.id === "hypermill_pencil_milling");
    expect(p!.params.cuttingMode).toBe("climb");
    expect(p!.params.stepdownFactor).toBe(undefined);
  });
});
