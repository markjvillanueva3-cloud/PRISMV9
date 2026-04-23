/**
 * AtomicStepDecomposerEngine — dedicated tests (U-FORE-02 helper)
 *
 * Coverage floor satisfied:
 *   - Happy path (3 cases)
 *   - Failure modes (4 cases)
 *   - Adversarial inputs (3 cases)
 *   - Variability across 4 distinct unit shapes
 *   - Canonical defaults (tokens, duration, risk, rollback)
 *
 * The decomposer is also exercised indirectly via BuildPlannerEngine.test.ts;
 * this file exists so the per-file wiring guard detects coverage at the
 * matching filename.
 */

import { describe, it, expect } from "vitest";
import {
  AtomicStepDecomposerEngine,
  atomicStepDecomposerEngine,
  DEFAULT_TOKEN_ESTIMATES,
  DEFAULT_DURATION_SEC,
  DEFAULT_RISK,
  type UnitSpec,
} from "../engines/AtomicStepDecomposerEngine.js";

function baseUnit(overrides: Partial<UnitSpec> = {}): UnitSpec {
  return {
    id: "U-ATOM-01",
    title: "Decomposer smoke",
    description: "Build an engine with dispatcher wiring",
    files_created: [
      "src/engines/FooEngine.ts",
      "src/schemas/fooActionSchemas.ts",
      "src/__tests__/FooEngine.test.ts",
    ],
    files_modified: ["src/tools/dispatchers/fooDispatcher.ts"],
    ...overrides,
  };
}

describe("AtomicStepDecomposerEngine — happy path", () => {
  it("decomposes a canonical engine+schema+test unit", () => {
    const steps = atomicStepDecomposerEngine.decompose(baseUnit());
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("write_engine");
    expect(kinds).toContain("write_schema");
    expect(kinds).toContain("write_test");
    expect(kinds).toContain("wire_dispatcher");
    expect(kinds).toContain("regenerate_manifest");
    // Commit is always last
    expect(kinds[kinds.length - 1]).toBe("commit");
  });

  it("attaches canonical token / duration / risk defaults per step kind", () => {
    const steps = atomicStepDecomposerEngine.decompose(baseUnit());
    for (const s of steps) {
      expect(s.estTokens).toBe(DEFAULT_TOKEN_ESTIMATES[s.kind]);
      expect(s.estDurationSec).toBe(DEFAULT_DURATION_SEC[s.kind]);
      expect(s.risk).toBe(DEFAULT_RISK[s.kind]);
    }
  });

  it("produces unique step IDs", () => {
    const steps = atomicStepDecomposerEngine.decompose(baseUnit());
    const ids = new Set(steps.map((s) => s.id));
    expect(ids.size).toBe(steps.length);
  });

  it("every step has a non-empty rollback stub", () => {
    const steps = atomicStepDecomposerEngine.decompose(baseUnit());
    for (const s of steps) {
      expect(typeof s.rollback).toBe("string");
      expect(s.rollback.length).toBeGreaterThan(0);
    }
  });
});

describe("AtomicStepDecomposerEngine — failure modes", () => {
  it("FAIL #1: null unit throws descriptive error", () => {
    // @ts-expect-error — adversarial
    expect(() => atomicStepDecomposerEngine.decompose(null)).toThrow(
      /must be an object/
    );
  });

  it("FAIL #2: undefined unit throws", () => {
    // @ts-expect-error — adversarial
    expect(() => atomicStepDecomposerEngine.decompose(undefined)).toThrow(
      /must be an object/
    );
  });

  it("FAIL #3: missing id throws", () => {
    expect(() =>
      atomicStepDecomposerEngine.decompose({
        files_created: ["src/engines/Foo.ts"],
      } as any)
    ).toThrow(/unit\.id required/);
  });

  it("FAIL #4: empty id throws", () => {
    expect(() =>
      atomicStepDecomposerEngine.decompose({ id: "", files_created: [] } as any)
    ).toThrow(/unit\.id required/);
  });
});

describe("AtomicStepDecomposerEngine — adversarial inputs", () => {
  it("ADV #1: whitespace-only id throws", () => {
    expect(() =>
      atomicStepDecomposerEngine.decompose({ id: "\t  \n", files_created: [] } as any)
    ).toThrow(/unit\.id required/);
  });

  it("ADV #2: empty files arrays still produce a commit-only step list", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-EMPTY-01",
      files_created: [],
      files_modified: [],
    });
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe("commit");
  });

  it("ADV #3: unknown file extensions ignored — no step kinds inferred", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-ODD-01",
      files_created: ["README.md", "data/blob.bin", "config.yaml"],
    });
    expect(steps.map((s) => s.kind)).toEqual(["commit"]);
  });
});

describe("AtomicStepDecomposerEngine — variability (≥3 unit shapes)", () => {
  it("Shape 1: engine-only unit (standalone, no wiring keywords in description)", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-ENG-01",
      files_created: ["src/engines/SoloEngine.ts"],
      description: "Standalone engine for physics calculations",
    });
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("write_engine");
    expect(kinds).toContain("regenerate_manifest");
    // No "dispatcher/wire/MCP" keywords in description → no wire_dispatcher step
    expect(kinds).not.toContain("wire_dispatcher");
  });

  it("Shape 2: hook-only unit (settings.json modified)", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-HOOK-01",
      files_created: [".claude/hooks/guard.mjs"],
      files_modified: ["H:/.claude/settings.json"],
      description: "Register a safety guard hook",
    });
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("register_hook");
    expect(kinds).not.toContain("write_engine");
  });

  it("Shape 3: input-schema refactor (read + write schema)", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-SCH-01",
      files_created: ["src/schemas/outputSchema.ts"],
      files_modified: ["src/schemas/inputSchema.ts"],
      description: "Split input from output schemas",
    });
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("read_schema");
    expect(kinds).toContain("write_schema");
  });

  it("Shape 4: dispatcher wiring inferred from description keyword", () => {
    const steps = atomicStepDecomposerEngine.decompose({
      id: "U-DSP-01",
      files_created: ["src/engines/NewEngine.ts"],
      description: "Wire the new engine to its dispatcher",
    });
    expect(steps.some((s) => s.kind === "wire_dispatcher")).toBe(true);
  });
});

describe("AtomicStepDecomposerEngine — singleton + defaults", () => {
  it("exports a singleton", () => {
    expect(atomicStepDecomposerEngine).toBeInstanceOf(AtomicStepDecomposerEngine);
    expect(atomicStepDecomposerEngine.name).toBe("AtomicStepDecomposerEngine");
  });

  it("DEFAULT_TOKEN_ESTIMATES has entries for every StepKind in DEFAULT_RISK", () => {
    const tokenKeys = Object.keys(DEFAULT_TOKEN_ESTIMATES).sort();
    const riskKeys = Object.keys(DEFAULT_RISK).sort();
    const durationKeys = Object.keys(DEFAULT_DURATION_SEC).sort();
    expect(tokenKeys).toEqual(riskKeys);
    expect(tokenKeys).toEqual(durationKeys);
  });

  it("risk values are all in [0, 1]", () => {
    for (const r of Object.values(DEFAULT_RISK)) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
