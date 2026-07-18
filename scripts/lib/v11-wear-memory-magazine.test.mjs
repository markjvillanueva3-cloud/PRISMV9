/**
 * v11-wear-memory-magazine.test.mjs — concrete-value tests for the
 * cross-program tool-life ledger.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-WEAR-MEMORY-MAGAZINE
 * @slot echo · @iter 28 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WEAR_STATE_SCHEMA_VERSION,
  DEFAULT_REPLACE_THRESHOLD,
  DEFAULT_LIFE_EXPECT_MIN,
  createMagazineState,
  recordCutEvent,
  lifeFraction,
  projectRemainingMinutes,
  flagForReplacement,
  assignSisterRotation,
  summarize,
  renderReplacementAdvisory,
} from "./v11-wear-memory-magazine.mjs";

const seedTools = [
  { toolNumber: 2,  pocket: 2,  lifeExpectMin: 100, totalUsageMin: 50, jobCount: 3, sister_pocket: 22 },
  { toolNumber: 14, pocket: 14, lifeExpectMin: 80,  totalUsageMin: 75, jobCount: 8 },
  { toolNumber: 19, pocket: 19, lifeExpectMin: 60,  totalUsageMin: 58, jobCount: 12 },
  { toolNumber: 8,  pocket: 8,  lifeExpectMin: 40,  totalUsageMin: 10, jobCount: 2 },
];

describe("constants", () => {
  it("WEAR_STATE_SCHEMA_VERSION = 1", () => {
    assert.equal(WEAR_STATE_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_REPLACE_THRESHOLD = 0.85", () => {
    assert.equal(DEFAULT_REPLACE_THRESHOLD, 0.85);
  });
  it("DEFAULT_LIFE_EXPECT_MIN = 60", () => {
    assert.equal(DEFAULT_LIFE_EXPECT_MIN, 60);
  });
});

describe("createMagazineState", () => {
  it("4-tool input → 4 entries", () => {
    const s = createMagazineState({ tools: seedTools });
    assert.equal(Object.keys(s.tools).length, 4);
  });
  it("preserves T14 totalUsageMin=75", () => {
    const s = createMagazineState({ tools: seedTools });
    assert.equal(s.tools.T14.totalUsageMin, 75);
  });
  it("missing lifeExpectMin → DEFAULT_LIFE_EXPECT_MIN", () => {
    const s = createMagazineState({ tools: [{ toolNumber: 5 }] });
    assert.equal(s.tools.T5.lifeExpectMin, 60);
  });
  it("null args → empty state", () => {
    const s = createMagazineState(null);
    assert.equal(Object.keys(s.tools).length, 0);
  });
  it("invalid toolNumber=0 → skipped", () => {
    const s = createMagazineState({ tools: [{ toolNumber: 0 }] });
    assert.equal(Object.keys(s.tools).length, 0);
  });
  it("schemaVersion = 1", () => {
    assert.equal(createMagazineState({ tools: seedTools }).schemaVersion, 1);
  });
});

describe("recordCutEvent: immutable update", () => {
  const state = createMagazineState({ tools: seedTools });

  it("T2 + 10min cut → totalUsageMin=60", () => {
    const next = recordCutEvent(state, { toolNumber: 2, cutMinutes: 10 });
    assert.equal(next.tools.T2.totalUsageMin, 60);
  });
  it("T2 cut → jobCount increments to 4", () => {
    const next = recordCutEvent(state, { toolNumber: 2, cutMinutes: 10 });
    assert.equal(next.tools.T2.jobCount, 4);
  });
  it("T2 cut preserves T14 untouched", () => {
    const next = recordCutEvent(state, { toolNumber: 2, cutMinutes: 10 });
    assert.equal(next.tools.T14.totalUsageMin, 75);
  });
  it("immutability: original state.T2 unchanged after recordCutEvent", () => {
    recordCutEvent(state, { toolNumber: 2, cutMinutes: 10 });
    assert.equal(state.tools.T2.totalUsageMin, 50);
  });
  it("timestamp updates lastUsedAtIso", () => {
    const next = recordCutEvent(state, { toolNumber: 2, cutMinutes: 5, timestampIso: "2026-05-27T10:00:00Z" });
    assert.equal(next.tools.T2.lastUsedAtIso, "2026-05-27T10:00:00Z");
  });
  it("non-existent T99 → state unchanged (T2 stays 50)", () => {
    const next = recordCutEvent(state, { toolNumber: 99, cutMinutes: 5 });
    assert.equal(next.tools.T2.totalUsageMin, 50);
  });
  it("negative cutMinutes → state unchanged (T2 stays 50)", () => {
    const next = recordCutEvent(state, { toolNumber: 2, cutMinutes: -5 });
    assert.equal(next.tools.T2.totalUsageMin, 50);
  });
  it("null event → state returned unchanged (same ref OK)", () => {
    assert.equal(recordCutEvent(state, null), state);
  });
});

describe("lifeFraction", () => {
  const state = createMagazineState({ tools: seedTools });
  it("T2: 50/100 = 0.5", () => {
    assert.equal(lifeFraction(state.tools.T2), 0.5);
  });
  it("T19: 58/60 ≈ 0.9667", () => {
    assert.equal(Math.abs(lifeFraction(state.tools.T19) - (58 / 60)) < 1e-9, true);
  });
  it("null entry → null", () => {
    assert.equal(lifeFraction(null), null);
  });
  it("zero lifeExpectMin → null (avoid div0)", () => {
    assert.equal(lifeFraction({ totalUsageMin: 10, lifeExpectMin: 0 }), null);
  });
});

describe("projectRemainingMinutes", () => {
  const state = createMagazineState({ tools: seedTools });
  it("T2: 100 - 50 = 50min remaining", () => {
    assert.equal(projectRemainingMinutes(state.tools.T2), 50);
  });
  it("T19: 60 - 58 = 2min remaining", () => {
    assert.equal(projectRemainingMinutes(state.tools.T19), 2);
  });
  it("overdue tool → 0 (clamped, not negative)", () => {
    assert.equal(projectRemainingMinutes({ totalUsageMin: 80, lifeExpectMin: 60 }), 0);
  });
});

describe("flagForReplacement", () => {
  const state = createMagazineState({ tools: seedTools });
  it("default threshold 0.85: T19 (0.967) + T14 (0.9375) flagged → 2 tools", () => {
    assert.equal(flagForReplacement(state).length, 2);
  });
  it("default threshold: T19 sorted first (highest life-fraction)", () => {
    assert.equal(flagForReplacement(state)[0].toolNumber, 19);
  });
  it("T19 flag has hasSister=false (no sister registered)", () => {
    assert.equal(flagForReplacement(state)[0].hasSister, false);
  });
  it("T2 has sister=22 → hasSister true (when flagged)", () => {
    const flagged = flagForReplacement(state, { threshold: 0.1 });
    const t2 = flagged.find((f) => f.toolNumber === 2);
    assert.equal(t2.hasSister, true);
  });
  it("threshold 0.99 → no flags (none that high)", () => {
    assert.equal(flagForReplacement(state, { threshold: 0.99 }).length, 0);
  });
  it("threshold 0.0 → all 4 tools flagged", () => {
    assert.equal(flagForReplacement(state, { threshold: 0 }).length, 4);
  });
});

describe("assignSisterRotation", () => {
  const state = createMagazineState({ tools: seedTools });
  it("T19 + sister 39 → state.tools.T19.sister_pocket=39", () => {
    const next = assignSisterRotation(state, 19, 39);
    assert.equal(next.tools.T19.sister_pocket, 39);
  });
  it("immutable: original state.T19.sister_pocket still null", () => {
    assignSisterRotation(state, 19, 39);
    assert.equal(state.tools.T19.sister_pocket, null);
  });
  it("invalid tool# 0 → state unchanged", () => {
    const next = assignSisterRotation(state, 0, 39);
    assert.equal(next.tools.T19.sister_pocket, null);
  });
  it("invalid sister pocket NaN → state unchanged", () => {
    const next = assignSisterRotation(state, 19, NaN);
    assert.equal(next.tools.T19.sister_pocket, null);
  });
});

describe("summarize", () => {
  const state = createMagazineState({ tools: seedTools });
  it("activeTools = 4", () => {
    assert.equal(summarize(state).activeTools, 4);
  });
  it("totalUsageMin = 50+75+58+10 = 193", () => {
    assert.equal(summarize(state).totalUsageMin, 193);
  });
  it("totalJobCount = 3+8+12+2 = 25", () => {
    assert.equal(summarize(state).totalJobCount, 25);
  });
  it("flaggedCount = 2 (T19, T14)", () => {
    assert.equal(summarize(state).flaggedCount, 2);
  });
  it("sisterAssignmentsCount = 1 (T2)", () => {
    assert.equal(summarize(state).sisterAssignmentsCount, 1);
  });
  it("schemaVersion echoed = 1", () => {
    assert.equal(summarize(state).schemaVersion, 1);
  });
});

describe("renderReplacementAdvisory", () => {
  const state = createMagazineState({ tools: seedTools });
  it("includes PRISM WEAR-MEMORY ADVISORY header", () => {
    assert.equal(renderReplacementAdvisory(state).includes("PRISM WEAR-MEMORY ADVISORY"), true);
  });
  it("includes 2 tool(s) at default threshold", () => {
    assert.equal(renderReplacementAdvisory(state).includes("2 tool(s) at or above"), true);
  });
  it("flags T19 with 'NO SISTER' notice", () => {
    assert.equal(renderReplacementAdvisory(state).includes("NO SISTER"), true);
  });
  it("empty state → 'all tools below'", () => {
    const empty = createMagazineState({ tools: [] });
    assert.equal(renderReplacementAdvisory(empty).includes("all tools below"), true);
  });
  it("threshold=0.99 → all-below message", () => {
    assert.equal(renderReplacementAdvisory(state, { threshold: 0.99 }).includes("all tools below"), true);
  });
});
