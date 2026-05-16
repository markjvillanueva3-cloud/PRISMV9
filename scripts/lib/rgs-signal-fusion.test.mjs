/**
 * rgs-signal-fusion.test.mjs
 * TDD tests for fuseSignals — 8 required cases, NO weak asserts.
 * Run: "H:/.claude/bin/portable-node" --test scripts/lib/rgs-signal-fusion.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fuseSignals } from "./rgs-signal-fusion.mjs";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

/** A minimal valid unit. matchPipelines always returns >=1, so pipelines is safe. */
const baseUnit = {
  key: "U-TEST-01",
  milestone: "TEST-MS0",
  unitId: "U-TEST-01",
  title: "Build a new engine and skill hook wiring",
  description: "Create an engine with tests and wire dispatcher",
};

/** Readers that always return deterministic minimal values. */
function makeReaders(overrides = {}) {
  return {
    capabilities: async (_text) => ({
      engines: ["TestEngine"],
      mcpTools: ["prism_calc:test_action"],
    }),
    tribal: async (_text, _opts) => [
      { id: "t1", tip: "Use Ti coating for harder materials", score: 0.8, domain: "mill" },
    ],
    skillTriggers: async (_text) => ["/forge-triple"],
    buildState: async (_unit) => ({ shipped: false }),
    outcomes: async (_opts) => ({ shipped: 1, blocked: 0, reverted: 0 }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T1 — reader-injection + contrapositive: outcomes must affect confidence
// ---------------------------------------------------------------------------
describe("T1: outcomes reader affects pipeline confidence by verdict", () => {
  it("same pipeline has strictly higher confidence for build (high shipped) vs integrate (high blocked)", async () => {
    const unit = { ...baseUnit };
    const complexity = { tier: "M", verdict: "build" };

    // For "build" verdict: outcomes returns high shipped count -> confidence should be high
    const buildReaders = makeReaders({
      outcomes: async ({ verdict }) => {
        if (verdict === "build") return { shipped: 9, blocked: 0, reverted: 0 };
        return { shipped: 0, blocked: 9, reverted: 0 };
      },
    });

    // For "integrate" verdict: outcomes returns high blocked count -> confidence should be low
    const integrateReaders = makeReaders({
      outcomes: async ({ verdict }) => {
        if (verdict === "integrate") return { shipped: 0, blocked: 9, reverted: 0 };
        return { shipped: 9, blocked: 0, reverted: 0 };
      },
    });

    const buildPlan = await fuseSignals({ unit, complexity: { tier: "M", verdict: "build" }, readers: buildReaders });
    const integratePlan = await fuseSignals({ unit, complexity: { tier: "M", verdict: "integrate" }, readers: integrateReaders });

    assert.ok(buildPlan !== null, "build plan must not be null");
    assert.ok(integratePlan !== null, "integrate plan must not be null");
    assert.ok(buildPlan.pipelines.length >= 1, "build plan must have >=1 pipelines");
    assert.ok(integratePlan.pipelines.length >= 1, "integrate plan must have >=1 pipelines");

    // Find a common pipeline (they use the same unit so matchPipelines returns same skills)
    const buildSkills = buildPlan.pipelines.map((p) => p.skill);
    const integrateSkills = integratePlan.pipelines.map((p) => p.skill);
    const common = buildSkills.filter((s) => integrateSkills.includes(s));
    assert.ok(common.length >= 1, "must share at least one pipeline skill");

    const firstSkill = common[0];
    const buildConf = buildPlan.pipelines.find((p) => p.skill === firstSkill).confidence;
    const integConf = integratePlan.pipelines.find((p) => p.skill === firstSkill).confidence;

    assert.ok(
      buildConf > integConf,
      `build confidence (${buildConf}) must be strictly > integrate confidence (${integConf}) for skill "${firstSkill}"`,
    );
  });
});

// ---------------------------------------------------------------------------
// T2 — Ollama-down: falls to deterministic with exact bounds
// ---------------------------------------------------------------------------
describe("T2: ollama throws → deterministic fallback with exact bounds", () => {
  it("source=deterministic, confidence in [0,0.6], >=1 pipeline, tribal||skills||mcpTools", async () => {
    const unit = { ...baseUnit };
    const complexity = { tier: "L", verdict: "build" };
    const readers = makeReaders({
      ollama: async () => {
        throw new Error("connection refused");
      },
    });

    const plan = await fuseSignals({ unit, complexity, readers });

    assert.ok(plan !== null, "plan must not be null");
    assert.equal(plan.source, "deterministic");
    assert.ok(plan.confidence >= 0, `confidence must be >= 0, got ${plan.confidence}`);
    assert.ok(plan.confidence <= 0.6, `confidence must be <= 0.6, got ${plan.confidence}`);
    assert.ok(plan.pipelines.length >= 1, "must have >=1 pipelines");
    const hasMinContent = plan.tribal.length >= 1 || plan.skills.length >= 1 || plan.mcpTools.length >= 1;
    assert.ok(hasMinContent, "must have tribal||skills||mcpTools for minimum-plan contract");
  });
});

// ---------------------------------------------------------------------------
// T3 — domain-boost algebraic invariant: lathe entry ranks before mill when unit text says "lathe"
// ---------------------------------------------------------------------------
describe("T3: domain-boost stable sort puts prefDomain entries first", () => {
  it("lathe entry ranks before mill when unit text mentions lathe", async () => {
    const unit = {
      ...baseUnit,
      title: "Lathe turning toolpath optimization",
      description: "Improve lathe program cycle time",
    };
    const complexity = { tier: "S", verdict: "build" };
    const readers = makeReaders({
      tribal: async (_text, _opts) => [
        { id: "m1", tip: "mill tip", score: 0.9, domain: "mill" },
        { id: "l1", tip: "lathe tip", score: 0.7, domain: "lathe" },
      ],
    });

    const plan = await fuseSignals({ unit, complexity, readers });

    assert.ok(plan !== null, "plan must not be null");
    assert.ok(plan.tribal.length >= 2, "must have both tribal entries");

    const latheIdx = plan.tribal.findIndex((t) => t.id === "l1");
    const millIdx = plan.tribal.findIndex((t) => t.id === "m1");

    assert.ok(latheIdx !== -1, "lathe entry must be present");
    assert.ok(millIdx !== -1, "mill entry must be present");
    assert.ok(
      latheIdx < millIdx,
      `lathe entry (idx=${latheIdx}) must rank before mill entry (idx=${millIdx})`,
    );
  });
});

// ---------------------------------------------------------------------------
// T4 — purity: two identical calls produce deepEqual results
// ---------------------------------------------------------------------------
describe("T4: fuseSignals is pure — identical inputs produce identical outputs", () => {
  it("two calls with same deterministic readers return deepEqual plans", async () => {
    const unit = { ...baseUnit };
    const complexity = { tier: "M", verdict: "build" };
    // No ollama — pure deterministic path
    const readers = makeReaders();

    const plan1 = await fuseSignals({ unit, complexity, readers });
    const plan2 = await fuseSignals({ unit, complexity, readers });

    assert.deepEqual(plan1, plan2, "two identical calls must produce deepEqual results");
  });
});

// ---------------------------------------------------------------------------
// T5a — empty title returns null
// ---------------------------------------------------------------------------
describe("T5a: empty title → null", () => {
  it("returns null when unit.title is empty string", async () => {
    const unit = { ...baseUnit, title: "" };
    const complexity = { tier: "M", verdict: "build" };
    const readers = makeReaders();

    const result = await fuseSignals({ unit, complexity, readers });

    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// T5b — NaN score sanitization
// ---------------------------------------------------------------------------
describe("T5b: NaN scores in tribal are sanitized to finite", () => {
  it("tribal entries with NaN score become 0 (finite) in result", async () => {
    const unit = { ...baseUnit };
    const complexity = { tier: "M", verdict: "build" };
    const readers = makeReaders({
      tribal: async () => [
        { id: "nan1", tip: "NaN score entry", score: NaN, domain: "mill" },
        { id: "ok1", tip: "Good entry", score: 0.5, domain: "mill" },
      ],
    });

    const plan = await fuseSignals({ unit, complexity, readers });

    assert.ok(plan !== null, "plan must not be null");
    for (const entry of plan.tribal) {
      assert.ok(
        Number.isFinite(entry.score),
        `tribal entry "${entry.id}" score must be finite, got ${entry.score}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// T5c — missing milestone → confidence === 0
// ---------------------------------------------------------------------------
describe("T5c: missing milestone → confidence === 0", () => {
  it("result.confidence is 0 when unit.milestone is undefined", async () => {
    const unit = { ...baseUnit, milestone: undefined };
    const complexity = { tier: "M", verdict: "build" };
    const readers = makeReaders();

    const plan = await fuseSignals({ unit, complexity, readers });

    assert.ok(plan !== null, "plan must not be null");
    assert.equal(plan.confidence, 0, `confidence must be exactly 0, got ${plan.confidence}`);
  });
});

// ---------------------------------------------------------------------------
// T6 — spanning + ollama success: mill and wedm units both work, ollama accepted
// ---------------------------------------------------------------------------
describe("T6: ollama success path — source=ollama, confidence=0.8, works for mill and wedm", () => {
  it("mill unit: source=ollama, confidence=0.8, >=1 pipelines", async () => {
    const millUnit = {
      key: "U-MILL-01",
      milestone: "MILL-MS0",
      unitId: "U-MILL-01",
      title: "Mill engine skill hook forge-triple wiring",
      description: "Build new mill engine and wire to dispatcher",
    };
    const complexity = { tier: "L", verdict: "build" };
    const readers = makeReaders({
      ollama: async (_prompt) => ({
        success: true,
        response: JSON.stringify({
          toolchain: ["/forge-triple"],
          confidence: 0.8,
          rationale: "mill unit synthesis rationale",
        }),
      }),
    });

    const plan = await fuseSignals({ unit: millUnit, complexity, readers });

    assert.ok(plan !== null, "mill plan must not be null");
    assert.equal(plan.source, "ollama");
    assert.equal(plan.confidence, 0.8);
    assert.ok(plan.pipelines.length >= 1, "mill plan must have >=1 pipelines");
  });

  it("wedm unit: source=ollama, confidence=0.8, >=1 pipelines", async () => {
    const wedmUnit = {
      key: "U-WEDM-01",
      milestone: "WEDM-MS0",
      unitId: "U-WEDM-01",
      title: "WEDM engine and skill hook wiring",
      description: "Build new WEDM engine for wire EDM dispatch",
    };
    const complexity = { tier: "M", verdict: "build" };
    const readers = makeReaders({
      ollama: async (_prompt) => ({
        success: true,
        response: JSON.stringify({
          toolchain: ["/forge-triple"],
          confidence: 0.8,
          rationale: "wedm unit synthesis rationale",
        }),
      }),
    });

    const plan = await fuseSignals({ unit: wedmUnit, complexity, readers });

    assert.ok(plan !== null, "wedm plan must not be null");
    assert.equal(plan.source, "ollama");
    assert.equal(plan.confidence, 0.8);
    assert.ok(plan.pipelines.length >= 1, "wedm plan must have >=1 pipelines");
  });
});
