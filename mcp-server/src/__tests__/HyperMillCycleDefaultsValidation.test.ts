/**
 * HyperMillCycleDefaultsValidation.test.ts
 *
 * Coverage for HM-REV-MS3 / U-HMR17 cycle parameter validation hook.
 * Locks down deviation threshold (>30%, strict), block conditions
 * (negative stepdown/clearance, non-positive feed, RPM cap), case-insensitive
 * key matching, batch processing, and dispatcher round-trip.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-VAL-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  validateCycleDefaults,
  validateCycleDefaultsBatch,
  type ValidateCycleDefaultsInput,
} from "../engines/HyperMillCycleDefaultsValidation.js";

// ── Constants mirrored from engine for boundary tests ────────────────────────
const MAX_MACHINE_RPM = 60_000;
const WARN_DEVIATION_THRESHOLD = 0.30;
const ZERO_DEFAULT_PROBE_THRESHOLD = 0.001;
const FACTORY_STEPDOWN_MM = 1.0;
const FACTORY_FEED_MMREV = 0.1;
const FACTORY_RPM = 10_000;

function input(over: Partial<ValidateCycleDefaultsInput>): ValidateCycleDefaultsInput {
  return {
    cycleCode: over.cycleCode ?? "3D_Roughing",
    proposed: over.proposed ?? {},
    factoryDefaults: over.factoryDefaults ?? {},
  };
}

describe("validateCycleDefaults — happy path + deviation threshold", () => {
  it("proposed exactly matches factory → valid, no warnings, no blocks", () => {
    const r = validateCycleDefaults(input({
      proposed: { feed_mmrev: FACTORY_FEED_MMREV, stepdown_mm: FACTORY_STEPDOWN_MM },
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV, stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.blocks).toEqual([]);
  });

  it("deviation safely under 30% threshold → NO warning", () => {
    // 25% under threshold (avoiding FP precision near 30.0% boundary —
    // 1.0 * 1.30 in IEEE-754 yields 0.30000000000000004 deviation, which trips the strict >)
    const r = validateCycleDefaults(input({
      proposed: { stepdown_mm: 1.25 },
      factoryDefaults: { stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.warnings).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("deviation just past 30% → warning with computed % and exact key", () => {
    const r = validateCycleDefaults(input({
      proposed: { stepdown_mm: 1.31 },
      factoryDefaults: { stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/'stepdown_mm' deviates 31\.0%/);
    expect(r.warnings[0]).toMatch(/proposed=1\.31, factory=1/);
    expect(r.valid).toBe(true);
  });

  it("negative deviation past threshold → warning (Math.abs applied)", () => {
    const r = validateCycleDefaults(input({
      proposed: { stepover_mm: 0.5 },
      factoryDefaults: { stepover_mm: 1.0 },
    }));
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/50\.0%/);
    expect(r.warnings[0]).toMatch(/'stepover_mm'/);
  });
});

describe("validateCycleDefaults — physical impossibility blocks", () => {
  it("negative stepdown → BLOCK with exact value in message", () => {
    const r = validateCycleDefaults(input({
      proposed: { stepdown_mm: -0.5 },
      factoryDefaults: { stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatch(/'stepdown_mm' = -0\.5 is negative/);
  });

  it("zero stepdown → BLOCK (zero stepdown disables material removal)", () => {
    const r = validateCycleDefaults(input({
      proposed: { stepdown_mm: 0 },
      factoryDefaults: { stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/zero stepdown disables material removal/);
  });

  it("zero clearance → NOT blocked (zero check only fires for stepdown keys)", () => {
    const r = validateCycleDefaults(input({
      proposed: { clearance: 0 },
      factoryDefaults: { clearance: 5.0 },
    }));
    expect(r.blocks).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it("negative clearance → BLOCK with named key", () => {
    const r = validateCycleDefaults(input({
      proposed: { clearance: -1.0 },
      factoryDefaults: { clearance: 5.0 },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'clearance' = -1 is negative/);
  });

  it("zero feed_mmrev → BLOCK (must be > 0)", () => {
    const r = validateCycleDefaults(input({
      proposed: { feed_mmrev: 0 },
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'feed_mmrev' = 0/);
    expect(r.blocks[0]).toMatch(/feed rate must be positive/);
  });

  it("negative feed_mmmin → BLOCK", () => {
    const r = validateCycleDefaults(input({
      proposed: { feed_mmmin: -250 },
      factoryDefaults: { feed_mmmin: 500 },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'feed_mmmin' = -250/);
  });

  it("FVORSCHUB (HyperMILL feed param name) at zero → BLOCK", () => {
    const r = validateCycleDefaults(input({
      proposed: { FVORSCHUB: 0 },
      factoryDefaults: { FVORSCHUB: 0.15 },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'FVORSCHUB' = 0/);
  });
});

describe("validateCycleDefaults — RPM cap (MAX_MACHINE_RPM=60_000)", () => {
  it("rpm at exact cap → no RPM-exceeded block (boundary is exclusive on >)", () => {
    const r = validateCycleDefaults(input({
      proposed: { rpm: MAX_MACHINE_RPM },
      factoryDefaults: { rpm: FACTORY_RPM },
    }));
    const rpmBlocks = r.blocks.filter(b => b.includes("RPM exceeds"));
    expect(rpmBlocks).toEqual([]);
  });

  it("rpm just over cap → BLOCK with exact value and limit cited", () => {
    const r = validateCycleDefaults(input({
      proposed: { rpm: MAX_MACHINE_RPM + 1 },
      factoryDefaults: { rpm: FACTORY_RPM },
    }));
    expect(r.valid).toBe(false);
    const rpmBlock = r.blocks.find(b => b.includes("RPM exceeds")) ?? "";
    expect(rpmBlock).toMatch(/'rpm' = 60001/);
    expect(rpmBlock).toMatch(/maximum machine limit of 60000/);
  });

  it("negative rpm (spindle_rpm alias) → BLOCK with negative-spindle message", () => {
    const r = validateCycleDefaults(input({
      proposed: { spindle_rpm: -100 },
      factoryDefaults: { spindle_rpm: 5000 },
    }));
    expect(r.valid).toBe(false);
    const negBlock = r.blocks.find(b => b.includes("spindle speed cannot be negative")) ?? "";
    expect(negBlock).toMatch(/'spindle_rpm' = -100/);
  });

  it("Infinity RPM → BLOCK (boundary case, locks current behavior)", () => {
    const r = validateCycleDefaults(input({
      proposed: { rpm: Number.POSITIVE_INFINITY },
      factoryDefaults: { rpm: FACTORY_RPM },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks.some(b => b.includes("RPM exceeds"))).toBe(true);
  });
});

describe("validateCycleDefaults — case insensitivity + alias coverage", () => {
  it("uppercase FEEDRATE param at zero → BLOCK (case-insensitive match)", () => {
    const r = validateCycleDefaults(input({
      proposed: { FEEDRATE: 0 },
      factoryDefaults: { FEEDRATE: 0.2 },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'FEEDRATE' = 0/);
    expect(r.blocks[0]).toMatch(/feed rate must be positive/);
  });

  it("VERTZUSTEL (HyperMILL stepdown alias) negative → BLOCK", () => {
    const r = validateCycleDefaults(input({
      proposed: { VERTZUSTEL: -2.0 },
      factoryDefaults: { VERTZUSTEL: 1.5 },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks[0]).toMatch(/'VERTZUSTEL' = -2 is negative/);
  });

  it("AUFMASS (HyperMILL allowance) zero → NOT blocked (only stepdown blocks on zero)", () => {
    const r = validateCycleDefaults(input({
      proposed: { AUFMASS: 0 },
      factoryDefaults: { AUFMASS: 0.5 },
    }));
    expect(r.blocks).toEqual([]);
  });
});

describe("validateCycleDefaults — factory default semantics", () => {
  it("zero factory default + proposed > 0.001 → warn 'verify intent'", () => {
    const r = validateCycleDefaults(input({
      proposed: { CNTRES: 0.05 },
      factoryDefaults: { CNTRES: 0 },
    }));
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/factory default is 0, proposed = 0\.05/);
    expect(r.warnings[0]).toMatch(/verify intent/);
  });

  it("zero factory default + proposed below probe threshold → no warn", () => {
    const belowThreshold = ZERO_DEFAULT_PROBE_THRESHOLD / 2;
    const r = validateCycleDefaults(input({
      proposed: { CNTRES: belowThreshold },
      factoryDefaults: { CNTRES: 0 },
    }));
    expect(r.warnings).toEqual([]);
  });

  it("missing factory default → info note explicitly names the key", () => {
    const r = validateCycleDefaults(input({
      proposed: { exotic_param: 42 },
      factoryDefaults: {},
    }));
    expect(r.warnings).toEqual([]);
    expect(r.blocks).toEqual([]);
    const noFactoryNote = r.info.find(i => i.includes("no factory default")) ?? "";
    expect(noFactoryNote).toMatch(/'exotic_param' = 42/);
  });

  it("info summary reports exact checked vs compared counts", () => {
    const r = validateCycleDefaults(input({
      proposed: { a: 1, b: 2, c: 3 },
      factoryDefaults: { a: 1, b: 2 },
    }));
    const summary = r.info.find(i => i.includes("Checked")) ?? "";
    expect(summary).toMatch(/Checked 3 proposed params/);
    expect(summary).toMatch(/2 compared against factory defaults/);
  });
});

describe("validateCycleDefaults — empty + adversarial inputs", () => {
  it("empty proposed → valid, info reports 0 checked, 0 compared", () => {
    const r = validateCycleDefaults(input({
      proposed: {},
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
    }));
    expect(r.valid).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.blocks).toEqual([]);
    const summary = r.info.find(i => i.includes("Checked")) ?? "";
    expect(summary).toMatch(/Checked 0 proposed params; 0 compared/);
  });

  it("cycleCode is included in every block + warning message", () => {
    const r = validateCycleDefaults(input({
      cycleCode: "TestCycle_X",
      proposed: { feed_mmrev: -0.1, stepdown_mm: 5.0 },
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV, stepdown_mm: FACTORY_STEPDOWN_MM },
    }));
    expect(r.blocks.length).toBeGreaterThanOrEqual(1);
    expect(r.warnings.length).toBeGreaterThanOrEqual(1);
    expect(r.blocks.every(b => b.startsWith("[TestCycle_X]"))).toBe(true);
    expect(r.warnings.every(w => w.startsWith("[TestCycle_X]"))).toBe(true);
  });

  it("multiple violations accumulate independently (3 violations → 3 blocks)", () => {
    const r = validateCycleDefaults(input({
      proposed: {
        feed_mmrev: -0.05,
        stepdown_mm: -1.0,
        rpm: 100_000,
      },
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV, stepdown_mm: FACTORY_STEPDOWN_MM, rpm: FACTORY_RPM },
    }));
    expect(r.valid).toBe(false);
    expect(r.blocks).toHaveLength(3);
    expect(r.blocks.some(b => b.includes("feed rate must be positive"))).toBe(true);
    expect(r.blocks.some(b => b.includes("'stepdown_mm' = -1 is negative"))).toBe(true);
    expect(r.blocks.some(b => b.includes("RPM exceeds"))).toBe(true);
  });

  it("NaN feed value silently passes block checks (current engine behavior — locked)", () => {
    // NaN comparisons are always false, so NaN escapes <0 / <=0 / >MAX checks.
    // Locking this behavior — when engine adds NaN guards this expectation flips.
    const r = validateCycleDefaults(input({
      proposed: { feed_mmrev: NaN },
      factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
    }));
    expect(r.blocks.filter(b => b.includes("feed rate"))).toEqual([]);
    expect(r.warnings.filter(w => w.includes("feed_mmrev"))).toEqual([]);
  });
});

describe("validateCycleDefaultsBatch — multi-cycle dispatch", () => {
  it("returns map keyed by cycleCode with independent results", () => {
    const out = validateCycleDefaultsBatch([
      input({
        cycleCode: "Roughing",
        proposed: { feed_mmrev: FACTORY_FEED_MMREV },
        factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
      }),
      input({
        cycleCode: "Finishing",
        proposed: { feed_mmrev: -0.05 },
        factoryDefaults: { feed_mmrev: 0.05 },
      }),
    ]);
    expect(Object.keys(out).sort()).toEqual(["Finishing", "Roughing"]);
    expect(out.Roughing.valid).toBe(true);
    expect(out.Roughing.blocks).toEqual([]);
    expect(out.Finishing.valid).toBe(false);
    expect(out.Finishing.blocks).toHaveLength(1);
    expect(out.Finishing.blocks[0]).toMatch(/feed rate must be positive/);
  });

  it("empty batch → empty result map", () => {
    const out = validateCycleDefaultsBatch([]);
    expect(out).toEqual({});
  });

  it("duplicate cycleCode keys: last write wins (Object key semantics)", () => {
    const out = validateCycleDefaultsBatch([
      input({
        cycleCode: "Same",
        proposed: { feed_mmrev: FACTORY_FEED_MMREV },
        factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
      }),
      input({
        cycleCode: "Same",
        proposed: { feed_mmrev: -0.1 },
        factoryDefaults: { feed_mmrev: FACTORY_FEED_MMREV },
      }),
    ]);
    expect(Object.keys(out)).toEqual(["Same"]);
    expect(out.Same.valid).toBe(false);
    expect(out.Same.blocks[0]).toMatch(/feed rate must be positive/);
  });
});

describe("camDispatcher wiring — cam_hypermill_validate_cycle_defaults", () => {
  // camDispatcher only exposes registerCamDispatcher(server) for MCP server registration —
  // there is no top-level callable. We verify wiring by reading the dispatcher source
  // and asserting both the action enum and the case body wire to this exact engine.
  const DISPATCHER_PATH = "src/tools/dispatchers/camDispatcher.ts";
  const ACTION_NAME = "cam_hypermill_validate_cycle_defaults";
  const ENGINE_IMPORT = "../../engines/HyperMillCycleDefaultsValidation.js";

  it("dispatcher source declares the action in its enum and case body", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const src = await readFile(resolve(process.cwd(), DISPATCHER_PATH), "utf-8");

    // Action must appear at least twice: once in the ACTIONS enum, once in the switch case.
    const occurrences = src.split(`"${ACTION_NAME}"`).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("dispatcher case body lazy-imports the validation engine and calls validateCycleDefaults", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const src = await readFile(resolve(process.cwd(), DISPATCHER_PATH), "utf-8");

    // Find the case-body window (case "cam_hypermill_validate_cycle_defaults": ... break;)
    const caseRegex = new RegExp(
      `case\\s+"${ACTION_NAME}"\\s*:[\\s\\S]*?break;`,
      "m",
    );
    const match = src.match(caseRegex);
    expect(match).not.toBeNull();
    const body = match![0];

    expect(body).toContain(`import("${ENGINE_IMPORT}")`);
    expect(body).toContain("validateCycleDefaults");
    expect(body).toContain("cycleCode");
    expect(body).toContain("proposed");
    expect(body).toContain("factoryDefaults");
  });

  it("dispatcher case body reads BOTH snake_case and camelCase param keys", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const src = await readFile(resolve(process.cwd(), DISPATCHER_PATH), "utf-8");
    const match = src.match(
      new RegExp(`case\\s+"${ACTION_NAME}"\\s*:[\\s\\S]*?break;`, "m"),
    );
    const body = match![0];

    // Each input key must be normalized via `params.snake ?? params.camel ?? default`.
    expect(body).toMatch(/params\.cycle_code\s*\?\?\s*params\.cycleCode/);
    expect(body).toMatch(/params\.factory_defaults\s*\?\?\s*params\.factoryDefaults/);
    // proposed has no camelCase variant — must still default to {} when missing
    expect(body).toMatch(/params\.proposed\s*\?\?\s*\{\}/);
  });
});
