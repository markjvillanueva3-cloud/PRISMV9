import { describe, it, expect } from "vitest";
import {
  PactContractTestEngine,
  type Contract,
  type Interaction,
  type PactMatcher,
} from "../engines/PactContractTestEngine.js";

/**
 * Golden fixture: a realistic contract between the lathe wet-run UI
 * consumer and the orchestrator provider. Matchers come from the actual
 * shape emitted by WetRunPilotOrchestratorEngine.
 */
function goldenOrchestratorContract(): Contract {
  const run: Interaction = {
    id: "orchestrator:successful-wetrun",
    description: "orchestrator emits a complete run record with 8-stage trace",
    providerState: "program cleared by PilotExitGate",
    required: ["run_id", "status", "stages", "mou_version"],
    expected: {
      run_id: { kind: "regex", pattern: "^run-[0-9a-f]{8}$" },
      status: { kind: "enum", values: ["passed", "failed", "blocked"] },
      "stages.0.name": { kind: "type", type: "string" },
      "stages.0.duration_ms": { kind: "range", min: 0, integer: true },
      mou_version: { kind: "enum", values: ["v1", "v2"] },
      scrap_cost_usd: { kind: "range", min: 0, max: 20000 },
      "alerts": { kind: "type", type: "array" },
      "operator.id": { kind: "regex", pattern: "^op-[a-z0-9]+$" },
      "trace_id": { kind: "optional", inner: { kind: "type", type: "string" } },
    },
  };
  return PactContractTestEngine.defineContract({
    consumer: "lathe-ui:wet-run-panel",
    provider: "WetRunPilotOrchestratorEngine",
    version: "1.0.0",
    interactions: [run],
    now: 1_700_000_000_000,
  });
}

describe("PactContractTestEngine — defineContract", () => {
  it("builds a contract with deterministic fields", () => {
    const c = goldenOrchestratorContract();
    expect(c.consumer).toBe("lathe-ui:wet-run-panel");
    expect(c.provider).toBe("WetRunPilotOrchestratorEngine");
    expect(c.version).toBe("1.0.0");
    expect(c.createdAt).toBe(1_700_000_000_000);
    expect(c.interactions.length).toBe(1);
  });

  it("rejects empty interaction list", () => {
    expect(() =>
      PactContractTestEngine.defineContract({
        consumer: "c",
        provider: "p",
        version: "1",
        interactions: [],
      }),
    ).toThrow(/at least one interaction/);
  });

  it("rejects duplicate interaction ids", () => {
    const ix: Interaction = {
      id: "dup",
      description: "",
      required: [],
      expected: {},
    };
    expect(() =>
      PactContractTestEngine.defineContract({
        consumer: "c",
        provider: "p",
        version: "1",
        interactions: [ix, ix],
      }),
    ).toThrow(/duplicate interaction id: dup/);
  });

  it("rejects missing mandatory string fields", () => {
    expect(() =>
      PactContractTestEngine.defineContract({
        consumer: "",
        provider: "p",
        version: "1",
        interactions: [{ id: "x", description: "", required: [], expected: {} }],
      }),
    ).toThrow(/consumer required/);
  });
});

describe("PactContractTestEngine — verifyInteraction happy path", () => {
  it("passes a conforming payload with all matchers green", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-0a1b2c3d",
        status: "passed",
        stages: [{ name: "cutforce", duration_ms: 42 }],
        mou_version: "v2",
        scrap_cost_usd: 8000,
        alerts: [],
        operator: { id: "op-alice" },
        trace_id: "abc-123",
      },
    );
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
    expect(result.matchersRun).toBe(9);
    expect(result.requiredChecked).toBe(4);
  });

  it("accepts an absent optional field without failure", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-deadbeef",
        status: "failed",
        stages: [{ name: "parseG", duration_ms: 7 }],
        mou_version: "v1",
        scrap_cost_usd: 0,
        alerts: ["operator-override-used"],
        operator: { id: "op-bob" },
        // trace_id absent — optional matcher must not fail
      },
    );
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

describe("PactContractTestEngine — verifyInteraction failure modes", () => {
  it("flags a missing required field", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        // run_id missing
        status: "passed",
        stages: [{ name: "x", duration_ms: 1 }],
        mou_version: "v2",
        scrap_cost_usd: 1,
        alerts: [],
        operator: { id: "op-c" },
      },
    );
    expect(result.passed).toBe(false);
    const missing = result.failures.find((f) => f.path === "run_id");
    expect(missing?.reason).toBe("required-missing");
  });

  it("flags an enum violation with not-in-enum reason", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-00000001",
        status: "unknown", // not in enum
        stages: [{ name: "x", duration_ms: 1 }],
        mou_version: "v2",
        scrap_cost_usd: 1,
        alerts: [],
        operator: { id: "op-d" },
      },
    );
    const statusFail = result.failures.find((f) => f.path === "status");
    expect(statusFail?.reason).toBe("not-in-enum");
    expect(result.passed).toBe(false);
  });

  it("flags a range violation above the ceiling", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-00000002",
        status: "passed",
        stages: [{ name: "x", duration_ms: 1 }],
        mou_version: "v2",
        scrap_cost_usd: 25_000, // over 20k ceiling
        alerts: [],
        operator: { id: "op-e" },
      },
    );
    const f = result.failures.find((f) => f.path === "scrap_cost_usd");
    expect(f?.reason).toBe("above-max:20000");
  });

  it("flags an integer-only violation", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-00000003",
        status: "passed",
        stages: [{ name: "x", duration_ms: 3.14 }], // integer required
        mou_version: "v2",
        scrap_cost_usd: 1,
        alerts: [],
        operator: { id: "op-f" },
      },
    );
    const f = result.failures.find((f) => f.path === "stages.0.duration_ms");
    expect(f?.reason).toBe("not-integer");
  });

  it("flags a regex mismatch", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "RUN-UPPERCASE", // regex demands lowercase hex
        status: "passed",
        stages: [{ name: "x", duration_ms: 1 }],
        mou_version: "v2",
        scrap_cost_usd: 1,
        alerts: [],
        operator: { id: "op-g" },
      },
    );
    const f = result.failures.find((f) => f.path === "run_id");
    expect(f?.reason).toBe("regex-mismatch");
  });

  it("flags type-mismatch on array-expected field", () => {
    const c = goldenOrchestratorContract();
    const result = PactContractTestEngine.verifyInteraction(
      c,
      "orchestrator:successful-wetrun",
      {
        run_id: "run-00000004",
        status: "passed",
        stages: [{ name: "x", duration_ms: 1 }],
        mou_version: "v2",
        scrap_cost_usd: 1,
        alerts: "none", // should be array
        operator: { id: "op-h" },
      },
    );
    const f = result.failures.find((f) => f.path === "alerts");
    expect(f?.reason).toBe("type-mismatch:string");
  });

  it("throws when interaction id is unknown", () => {
    const c = goldenOrchestratorContract();
    expect(() =>
      PactContractTestEngine.verifyInteraction(c, "orchestrator:nope", {}),
    ).toThrow(/interaction not found/);
  });
});

describe("PactContractTestEngine — match helper primitives", () => {
  const cases: Array<[string, PactMatcher, unknown, boolean]> = [
    ["exact-equal", { kind: "exact", value: 42 }, 42, true],
    ["exact-not-equal", { kind: "exact", value: 42 }, 41, false],
    ["type-number-accepts-int", { kind: "type", type: "number" }, 7, true],
    ["contains-hit", { kind: "contains", needle: "a" }, ["a", "b"], true],
    ["contains-miss", { kind: "contains", needle: "c" }, ["a", "b"], false],
    [
      "range-open-lower",
      { kind: "range", max: 10 },
      -50,
      true,
    ],
    [
      "range-closed-exact-upper",
      { kind: "range", min: 0, max: 10 },
      10,
      true,
    ],
    ["enum-miss", { kind: "enum", values: ["a", "b"] }, "c", false],
  ];
  for (const [name, matcher, value, expected] of cases) {
    it(`match ${name}`, () => {
      const r = PactContractTestEngine.match(matcher, value, true);
      expect(r.ok).toBe(expected);
    });
  }
});

describe("PactContractTestEngine — backward-compat check", () => {
  const base = goldenOrchestratorContract();

  function overrideInteraction(
    patch: Partial<Interaction>,
  ): Contract {
    const merged: Interaction = { ...base.interactions[0], ...patch };
    return PactContractTestEngine.defineContract({
      consumer: base.consumer,
      provider: base.provider,
      version: "1.1.0",
      interactions: [merged],
      now: 1_700_000_001_000,
    });
  }

  it("detects no breaking changes when contract is identical", () => {
    const newC = overrideInteraction({});
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(true);
    expect(diff.breakingChanges).toHaveLength(0);
  });

  it("flags a range being narrowed as breaking", () => {
    const newC = overrideInteraction({
      expected: {
        ...base.interactions[0].expected,
        scrap_cost_usd: { kind: "range", min: 0, max: 10_000 }, // tightened from 20k
      },
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(false);
    expect(diff.breakingChanges[0].kind).toBe("matcher_tightened");
    expect(diff.breakingChanges[0].path).toContain("scrap_cost_usd");
  });

  it("flags an enum being narrowed as breaking", () => {
    const newC = overrideInteraction({
      expected: {
        ...base.interactions[0].expected,
        status: { kind: "enum", values: ["passed"] }, // dropped failed & blocked
      },
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(false);
    const broken = diff.breakingChanges.find((b) => b.path.endsWith("status"));
    expect(broken?.kind).toBe("enum_narrowed");
  });

  it("flags a new required field as breaking", () => {
    const newC = overrideInteraction({
      required: [...base.interactions[0].required, "trace_id"],
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(false);
    expect(diff.breakingChanges.some((b) => b.kind === "required_field_added")).toBe(
      true,
    );
  });

  it("treats enum widening and required→optional as additive", () => {
    const newC = overrideInteraction({
      required: base.interactions[0].required.filter((r) => r !== "mou_version"),
      expected: {
        ...base.interactions[0].expected,
        status: {
          kind: "enum",
          values: ["passed", "failed", "blocked", "canceled"], // wider
        },
      },
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(true);
    expect(diff.additions.length).toBeGreaterThan(0);
  });

  it("flags matcher kind change as breaking", () => {
    const newC = overrideInteraction({
      expected: {
        ...base.interactions[0].expected,
        run_id: { kind: "type", type: "string" }, // was regex
      },
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    const b = diff.breakingChanges.find((b) => b.path.endsWith("run_id"));
    expect(b?.kind).toBe("matcher_type_changed");
    expect(b?.detail).toBe("regex→type");
  });

  it("records a brand-new matcher path as an addition", () => {
    const newC = overrideInteraction({
      expected: {
        ...base.interactions[0].expected,
        machine_id: { kind: "type", type: "string" },
      },
    });
    const diff = PactContractTestEngine.checkBackwardCompat(base, newC);
    expect(diff.backwardCompatible).toBe(true);
    expect(diff.additions.some((a) => a.includes("machine_id"))).toBe(true);
  });
});
