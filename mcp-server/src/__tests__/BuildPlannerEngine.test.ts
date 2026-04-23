/**
 * BuildPlannerEngine + AtomicStepDecomposerEngine tests — U-FORE-02
 *
 * Coverage:
 *   - Happy path: decompose a canonical unit, plan returns ordered DAG
 *   - ≥3 failure modes: missing id, non-object, non-string unitId
 *   - ≥2 adversarial: whitespace id, empty files arrays
 *   - Variability: ≥3 different unit shapes (engine+schema+test, hook-only,
 *     dispatcher-only) — gives confidence across the step-kind space
 *   - Ordering validity: KIND_ORDER honored, no step precedes its prereqs
 *   - Validation: validateOrdering matches known ordinal
 *   - Dispatcher round-trip: action enum + case present in devDispatcher
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  BuildPlannerEngine,
  buildPlannerEngine,
  KIND_ORDER,
  type BuildPlan,
} from "../engines/BuildPlannerEngine.js";
import {
  AtomicStepDecomposerEngine,
  atomicStepDecomposerEngine,
  DEFAULT_TOKEN_ESTIMATES,
  DEFAULT_RISK,
  type UnitSpec,
} from "../engines/AtomicStepDecomposerEngine.js";

function makeUnit(overrides: Partial<UnitSpec> = {}): UnitSpec {
  return {
    id: "U-TEST-01",
    title: "Test unit",
    description: "Build a test engine with dispatcher wiring",
    files_created: [
      "src/engines/FooEngine.ts",
      "src/schemas/fooActionSchemas.ts",
      "src/__tests__/FooEngine.test.ts",
    ],
    files_modified: ["src/tools/dispatchers/fooDispatcher.ts"],
    ...overrides,
  };
}

// ─── AtomicStepDecomposerEngine ─────────────────────────────────────

describe("AtomicStepDecomposerEngine — happy path", () => {
  it("decomposes a canonical engine+schema+test+dispatcher unit", () => {
    const steps = atomicStepDecomposerEngine.decompose(makeUnit());
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("write_engine");
    expect(kinds).toContain("write_schema");
    expect(kinds).toContain("write_test");
    expect(kinds).toContain("wire_dispatcher");
    expect(kinds).toContain("regenerate_manifest");
    expect(kinds).toContain("commit");
    expect(kinds[kinds.length - 1]).toBe("commit");
  });

  it("each step carries id, tokens, risk, and rollback", () => {
    const steps = atomicStepDecomposerEngine.decompose(makeUnit());
    for (const s of steps) {
      expect(s.id).toMatch(/^[a-z_]+:.+/);
      expect(s.estTokens).toBe(DEFAULT_TOKEN_ESTIMATES[s.kind]);
      expect(s.risk).toBeGreaterThanOrEqual(0);
      expect(s.risk).toBeLessThanOrEqual(1);
      expect(s.rollback).not.toBe("");
    }
  });
});

describe("AtomicStepDecomposerEngine — failure modes + adversarial", () => {
  it("FAIL #1: missing id throws", () => {
    expect(() =>
      atomicStepDecomposerEngine.decompose({ id: "", files_created: [] } as any)
    ).toThrow(/unit\.id required/);
  });

  it("FAIL #2: non-object throws", () => {
    // @ts-expect-error
    expect(() => atomicStepDecomposerEngine.decompose(null)).toThrow(/must be an object/);
  });

  it("FAIL #3: empty files arrays still produce commit-only step list", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-EMPTY",
      files_created: [],
      files_modified: [],
    });
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe("commit");
  });

  it("ADV #1: whitespace-only id throws", () => {
    expect(() =>
      atomicStepDecomposerEngine.decompose({ id: "   ", files_created: [] } as any)
    ).toThrow(/unit\.id required/);
  });

  it("ADV #2: unknown file types do not generate step-kinds (ignored gracefully)", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-ODD-01",
      files_created: ["docs/readme.md", "data/weights.bin", "config/opts.yaml"],
    });
    // Only a commit step — no recognized engine/schema/test/hook patterns
    expect(steps.map((s) => s.kind)).toEqual(["commit"]);
  });
});

// ─── BuildPlannerEngine ─────────────────────────────────────────────

describe("BuildPlannerEngine — happy path + DAG", () => {
  it("plan() returns a topologically-ordered DAG with prereqs", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    expect(plan.steps.length).toBeGreaterThan(3);
    // No step appears before its prereqs.
    const seenIds = new Set<string>();
    for (const s of plan.steps) {
      for (const p of s.prereqs) {
        expect(seenIds.has(p)).toBe(true);
      }
      seenIds.add(s.id);
    }
    // Totals are consistent with per-step estimates
    const sumTokens = plan.steps.reduce((t, s) => t + s.estTokens, 0);
    expect(plan.totalEstTokens).toBe(sumTokens);
  });

  it("KIND_ORDER is honored — no kind appears before an earlier-ranked one", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    const ranks = plan.steps.map((s) => KIND_ORDER.indexOf(s.kind));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
  });

  it("maxRisk reflects the highest-risk step", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    const expected = plan.steps.reduce((m, s) => Math.max(m, s.risk), 0);
    expect(plan.maxRisk).toBe(expected);
    // Dispatcher wiring has the highest default risk
    expect(plan.maxRisk).toBeGreaterThanOrEqual(DEFAULT_RISK.wire_dispatcher);
  });
});

describe("BuildPlannerEngine — variability (≥3 unit shapes)", () => {
  it("Shape 1: engine + schema + test + dispatcher", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    const kinds = new Set(plan.steps.map((s) => s.kind));
    expect(kinds.has("write_engine")).toBe(true);
    expect(kinds.has("wire_dispatcher")).toBe(true);
  });

  it("Shape 2: hook-only unit (no engine)", () => {
    const plan = buildPlannerEngine.planFromUnit({
      id: "U-HOOK-01",
      title: "Hook only",
      files_created: [".claude/hooks/my-guard.mjs"],
      files_modified: ["H:/.claude/settings.json"],
      description: "Register a safety hook",
    });
    const kinds = plan.steps.map((s) => s.kind);
    expect(kinds).toContain("register_hook");
    expect(kinds).not.toContain("write_engine");
    expect(kinds).not.toContain("wire_dispatcher");
  });

  it("Shape 3: schema-modifier unit (reads input, writes new schema)", () => {
    const plan = buildPlannerEngine.planFromUnit({
      id: "U-SCHEMA-01",
      title: "Schema refactor",
      files_created: ["src/schemas/outcomeSchema.ts"],
      files_modified: ["src/schemas/eventSchema.ts"],
      description: "Replace inline types with canonical outcome schema",
    });
    const kinds = plan.steps.map((s) => s.kind);
    expect(kinds).toContain("read_schema");
    expect(kinds).toContain("write_schema");
    // Schema-only work does not trigger engine/dispatcher/manifest steps
    expect(kinds).not.toContain("write_engine");
    expect(kinds).not.toContain("regenerate_manifest");
  });

  it("Shape 4: multi-engine unit produces multiple write_engine steps", () => {
    const plan = buildPlannerEngine.planFromUnit({
      id: "U-MULTI-01",
      title: "Multi engine",
      files_created: [
        "src/engines/AlphaEngine.ts",
        "src/engines/BetaEngine.ts",
      ],
      description: "Two engines at once",
    });
    const writeEngineCount = plan.steps.filter((s) => s.kind === "write_engine").length;
    expect(writeEngineCount).toBe(2);
  });
});

describe("BuildPlannerEngine — failure modes", () => {
  it("FAIL #1: non-string unitId throws", async () => {
    // @ts-expect-error
    await expect(buildPlannerEngine.plan(42)).rejects.toThrow(/non-empty string/);
  });

  it("FAIL #2: empty unitId throws", async () => {
    await expect(buildPlannerEngine.plan("")).rejects.toThrow(/non-empty string/);
  });

  it("FAIL #3: whitespace unitId throws", async () => {
    await expect(buildPlannerEngine.plan("   ")).rejects.toThrow(/non-empty string/);
  });

  it("FAIL #4: planFromUnit(null) throws", () => {
    // @ts-expect-error
    expect(() => buildPlannerEngine.planFromUnit(null)).toThrow(/must be an object/);
  });

  it("missing unit on disk returns stub plan with warning, not throw", async () => {
    const plan = await buildPlannerEngine.plan("U-DOES-NOT-EXIST-123");
    expect(plan.warnings.some((w) => /not found/.test(w))).toBe(true);
    expect(plan.steps.length).toBeGreaterThanOrEqual(1); // at least commit
  });
});

describe("BuildPlannerEngine — validateOrdering", () => {
  it("returns 1.0 for exact kind match", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    const match = buildPlannerEngine.validateOrdering(
      plan,
      plan.steps.map((s) => s.kind)
    );
    expect(match).toBe(1.0);
  });

  it("returns low score for shuffled/incompatible expected order", () => {
    const plan = buildPlannerEngine.planFromUnit(makeUnit());
    const match = buildPlannerEngine.validateOrdering(plan, [
      "commit",
      "write_engine",
      "read_schema",
    ]);
    expect(match).toBeLessThan(1.0);
  });

  it("returns 0 for empty plan or empty expected", () => {
    expect(
      buildPlannerEngine.validateOrdering(
        { unitId: "x", steps: [], totalEstTokens: 0, totalEstDurationSec: 0, maxRisk: 0, warnings: [] } as BuildPlan,
        ["write_engine"]
      )
    ).toBe(0);
  });
});

describe("BuildPlannerEngine — loads real milestone file", () => {
  it("plan('U-FORE-01') finds the unit we just shipped and produces a plan", async () => {
    const plan = await buildPlannerEngine.plan("U-FORE-01");
    // Not a "not found" warning — unit should exist in PSAU-FORESIGHT.json
    expect(plan.warnings.every((w) => !/not found/.test(w))).toBe(true);
    expect(plan.unitId).toBe("U-FORE-01");
  });

  it("plan('U-FORE-02') finds this unit's own spec", async () => {
    const plan = await buildPlannerEngine.plan("U-FORE-02");
    expect(plan.unitId).toBe("U-FORE-02");
    // U-FORE-02 spec lists an engine creation → plan must include write_engine
    expect(plan.steps.some((s) => s.kind === "write_engine")).toBe(true);
  });
});

describe("BuildPlannerEngine — custom milestone dir", () => {
  it("loads units from an injected milestoneDirs override", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bpe-fix-"));
    const milestone = {
      id: "MY-MS",
      units: [
        {
          id: "U-CUSTOM-01",
          title: "Custom unit",
          files_created: ["src/engines/CustomEngine.ts"],
          description: "Make a custom thing",
        },
      ],
    };
    fs.writeFileSync(path.join(tmp, "MY-MS.json"), JSON.stringify(milestone));
    const planner = new BuildPlannerEngine({ milestoneDirs: [tmp] });
    const plan = await planner.plan("U-CUSTOM-01");
    expect(plan.unitId).toBe("U-CUSTOM-01");
    expect(plan.steps.some((s) => s.kind === "write_engine")).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("BuildPlannerEngine — dispatcher round-trip E2E", () => {
  it("devDispatcher action enum includes build_plan + build_plan_from_unit", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"build_plan"');
    expect(disp).toContain('"build_plan_from_unit"');
    expect(disp).toContain('case "build_plan"');
    expect(disp).toContain('case "build_plan_from_unit"');
    expect(disp).toContain("BuildPlannerEngine.js");
  });

  it("lazy-import path resolves to the same singleton", async () => {
    const { buildPlannerEngine: dyn } = await import(
      "../engines/BuildPlannerEngine.js"
    );
    expect(dyn).toBe(buildPlannerEngine);
  });

  it("dispatcher param shape (unit_id) maps cleanly to engine.plan()", async () => {
    const dispatchedInput = { unit_id: "U-FORE-02" };
    const plan = await buildPlannerEngine.plan(String(dispatchedInput.unit_id));
    expect(plan.unitId).toBe("U-FORE-02");
    expect(plan.totalEstTokens).toBeGreaterThan(0);
  });
});

describe("BuildPlannerEngine — singleton", () => {
  it("exports both singletons", () => {
    expect(buildPlannerEngine).toBeInstanceOf(BuildPlannerEngine);
    expect(atomicStepDecomposerEngine).toBeInstanceOf(AtomicStepDecomposerEngine);
  });
});
