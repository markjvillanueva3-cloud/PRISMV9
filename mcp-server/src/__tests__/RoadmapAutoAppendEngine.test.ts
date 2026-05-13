/**
 * RoadmapAutoAppendEngine — engine-direct tests
 * ==============================================
 *
 * Covers U-ALL06 verifies_via: high-synergy verdict → proposal YAML
 * emitted; ≥3 corroborating sources bypass the per-milestone rate
 * limit; cross-cycle dedup. Adversarial: 100 high-synergy in one
 * call → only 2 land unless bypassed; peer-claim race simulated via
 * dedup_guids. Variability: 1/2/5 appends per milestone × single
 * vs multi-source corroboration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RoadmapAutoAppendEngine,
  RATE_LIMIT_SCHEMA_VERSION,
  DEFAULT_PER_MILESTONE_LIMIT,
  DEFAULT_CORROBORATION_BYPASS_THRESHOLD,
  DEFAULT_ID_PREFIX,
  MAX_TITLE_LEN,
  roadmapAutoAppendEngine,
  type AppendInput,
  type AppendProposal,
  type AppendRateLimitState,
} from "../engines/RoadmapAutoAppendEngine.js";
import type { ClassifierVerdict } from "../engines/SynergyClassifierEngine.js";

const T0 = Date.UTC(2026, 4, 13, 12, 0, 0);

function highVerdict(score = 0.75): ClassifierVerdict {
  return {
    label: "high",
    score,
    reason: "score_band",
    contributions: {
      semantic_match: 0,
      novelty_strength: 0,
      ai_priority_score: 0,
      duplication_risk: 0,
      effort_estimate: 0,
      blast_radius: 0,
    },
    rubricSchemaVersion: 1,
    classifiedAt: T0,
  };
}

function makeInput(over: Partial<AppendInput> = {}): AppendInput {
  return {
    verdict: over.verdict ?? highVerdict(),
    guid: over.guid ?? "guid-1",
    source: over.source ?? "arxiv-cs-ai",
    title: over.title ?? "A novel finding worth promoting",
    link: over.link,
    why: over.why,
    corroborations: over.corroborations,
  };
}

// ─── Constructor + state ────────────────────────────────────────────

describe("RoadmapAutoAppendEngine — constructor", () => {
  it("constructs with spec defaults", () => {
    const e = new RoadmapAutoAppendEngine();
    const s = e.getState();
    expect(s.schemaVersion).toBe(RATE_LIMIT_SCHEMA_VERSION);
    expect(s.per_milestone_limit).toBe(DEFAULT_PER_MILESTONE_LIMIT);
    expect(s.corroboration_bypass_threshold).toBe(DEFAULT_CORROBORATION_BYPASS_THRESHOLD);
    expect(s.appended_this_cycle).toEqual({});
  });

  it("getState clones — mutating snapshot doesn't affect engine", () => {
    const e = new RoadmapAutoAppendEngine();
    const s = e.getState();
    s.per_milestone_limit = 99;
    expect(e.getState().per_milestone_limit).toBe(DEFAULT_PER_MILESTONE_LIMIT);
  });

  it("accepts an injected state and clones it on construct", () => {
    const seed: AppendRateLimitState = {
      schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
      per_milestone_limit: 5,
      corroboration_bypass_threshold: 7,
      appended_this_cycle: { "TEST-MS0": 3 },
      dedup_guids: ["already-seen-1"],
    };
    const e = new RoadmapAutoAppendEngine({ state: seed });
    expect(e.getState().per_milestone_limit).toBe(5);
    expect(e.getState().corroboration_bypass_threshold).toBe(7);
    expect(e.getState().appended_this_cycle["TEST-MS0"]).toBe(3);
  });
});

// ─── propose — happy path ───────────────────────────────────────────

describe("RoadmapAutoAppendEngine — propose happy path", () => {
  let e: RoadmapAutoAppendEngine;
  beforeEach(() => {
    e = new RoadmapAutoAppendEngine({ now: () => T0 });
  });

  it("HIGH band ⇒ proposal with U-AUTORES-01 id + canonical YAML", () => {
    const r = e.propose(makeInput({ guid: "g1", title: "Promote me" }));
    expect("yaml" in r).toBe(true);
    const p = r as AppendProposal;
    expect(p.id).toBe("U-AUTORES-01");
    expect(p.yaml.includes("- id: U-AUTORES-01")).toBe(true);
    expect(p.yaml.includes('title: "Promote me"')).toBe(true);
    expect(p.yaml.includes("pillar: auto-learn")).toBe(true);
    expect(p.yaml.includes("status: not_started")).toBe(true);
    expect(p.titleSanitized).toBe("Promote me");
    expect(p.corroborations).toBe(1);
    expect(p.bypassedRateLimit).toBe(false);
  });

  it("ai_priority_score scales linearly with verdict.score (0.65 → 60, 1.0 → 90)", () => {
    const r = e.propose(makeInput({ guid: "g-low-high", verdict: highVerdict(0.65) })) as AppendProposal;
    expect(r.yaml).toMatch(/ai_priority_score: 60/);

    const e2 = new RoadmapAutoAppendEngine({ now: () => T0 });
    const r2 = e2.propose(makeInput({ guid: "g-top-high", verdict: highVerdict(1.0) })) as AppendProposal;
    expect(r2.yaml).toMatch(/ai_priority_score: 90/);
  });

  it("second high-synergy proposal in same cycle → U-AUTORES-02", () => {
    e.propose(makeInput({ guid: "g1" }));
    const r = e.propose(makeInput({ guid: "g2" }));
    expect((r as AppendProposal).id).toBe("U-AUTORES-02");
  });

  it("YAML quoted title escapes embedded quotes + control chars", () => {
    const r = e.propose(makeInput({ guid: "g-evil", title: 'has "quote" and\nnewline' })) as AppendProposal;
    expect(r.yaml.includes('title: "has \\"quote\\" and\\nnewline"')).toBe(true);
  });

  it("title beyond MAX_TITLE_LEN is truncated", () => {
    const huge = "x".repeat(MAX_TITLE_LEN + 50);
    const r = e.propose(makeInput({ guid: "g-huge", title: huge })) as AppendProposal;
    expect(r.titleSanitized.length).toBe(MAX_TITLE_LEN);
  });
});

// ─── propose — rejections ───────────────────────────────────────────

describe("RoadmapAutoAppendEngine — propose rejections", () => {
  let e: RoadmapAutoAppendEngine;
  beforeEach(() => {
    e = new RoadmapAutoAppendEngine({ now: () => T0 });
  });

  it("rejects low-band verdict with reason 'low_synergy_band'", () => {
    const lowVerdict: ClassifierVerdict = { ...highVerdict(), label: "med", score: 0.50 };
    const r = e.propose(makeInput({ guid: "g1", verdict: lowVerdict }));
    expect("reason" in r).toBe(true);
    expect((r as { reason: string }).reason).toBe("low_synergy_band");
  });

  it("rejects missing guid", () => {
    const r = e.propose(makeInput({ guid: "" }));
    expect((r as { reason: string }).reason).toBe("missing_guid");
  });

  it("rejects missing title", () => {
    const r = e.propose(makeInput({ guid: "g1", title: "" }));
    expect((r as { reason: string }).reason).toBe("missing_title");
  });

  it("rejects missing verdict", () => {
    // @ts-expect-error — testing defensive path
    const r = e.propose({ guid: "g1", source: "rss", title: "t" });
    expect((r as { reason: string }).reason).toBe("missing_verdict");
  });

  it("rejects out-of-range verdict score", () => {
    const bad: ClassifierVerdict = { ...highVerdict(), score: 1.5 };
    const r = e.propose(makeInput({ guid: "g1", verdict: bad }));
    expect((r as { reason: string }).reason).toBe("invalid_score");
  });

  it("RATE LIMIT: 3rd proposal in one cycle (no corroboration) ⇒ rate_limited", () => {
    e.propose(makeInput({ guid: "g1" }));
    e.propose(makeInput({ guid: "g2" }));
    const r = e.propose(makeInput({ guid: "g3" }));
    expect((r as { reason: string }).reason).toBe("rate_limited");
  });

  it("CORROBORATION BYPASS: corroborations≥3 lifts rate limit", () => {
    e.propose(makeInput({ guid: "g1" }));
    e.propose(makeInput({ guid: "g2" }));
    const r = e.propose(makeInput({ guid: "g3", corroborations: 3 }));
    expect("yaml" in r).toBe(true);
    expect((r as AppendProposal).bypassedRateLimit).toBe(true);
  });

  it("CROSS-CYCLE DUP guard: guid in dedup_guids list ⇒ cross_cycle_dup", () => {
    const seeded: AppendRateLimitState = {
      schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
      per_milestone_limit: DEFAULT_PER_MILESTONE_LIMIT,
      corroboration_bypass_threshold: DEFAULT_CORROBORATION_BYPASS_THRESHOLD,
      appended_this_cycle: {},
      dedup_guids: ["already-shipped-yesterday"],
    };
    e = new RoadmapAutoAppendEngine({ now: () => T0, state: seeded });
    const r = e.propose(makeInput({ guid: "already-shipped-yesterday" }));
    expect((r as { reason: string }).reason).toBe("cross_cycle_dup");
  });
});

// ─── proposeBatch ───────────────────────────────────────────────────

describe("RoadmapAutoAppendEngine — proposeBatch", () => {
  it("emits up to per_milestone_limit proposals (default 2), rejects the rest", () => {
    const e = new RoadmapAutoAppendEngine({ now: () => T0 });
    const batch = Array.from({ length: 5 }, (_, i) => makeInput({ guid: `g${i}` }));
    const r = e.proposeBatch(batch);
    expect(r.proposals.length).toBe(2);
    expect(r.rejected.length).toBe(3);
    expect(r.rejected.every((x) => x.reason === "rate_limited")).toBe(true);
  });

  it("internal-dup dedup BEFORE rate-limit check", () => {
    const e = new RoadmapAutoAppendEngine({ now: () => T0 });
    const r = e.proposeBatch([
      makeInput({ guid: "g1" }),
      makeInput({ guid: "g1" }), // dup
      makeInput({ guid: "g2" }),
    ]);
    expect(r.proposals.length).toBe(2);
    expect(r.rejected.length).toBe(1);
    expect(r.rejected[0].reason).toBe("internal_dup");
  });

  it("variability: 1/2/5 appends per milestone — corroborations≥3 lifts the cap", () => {
    // Default rate limit = 2. Mark 3 of the 5 as having ≥3 corroborations
    // so they bypass; the other 2 each consume one slot → 5 proposals total.
    const e = new RoadmapAutoAppendEngine({ now: () => T0 });
    const r = e.proposeBatch([
      makeInput({ guid: "g1" }), // counts (slot 1)
      makeInput({ guid: "g2" }), // counts (slot 2)
      makeInput({ guid: "g3", corroborations: 3 }), // bypass — still increments counter
      makeInput({ guid: "g4", corroborations: 5 }), // bypass
      makeInput({ guid: "g5", corroborations: 10 }), // bypass
    ]);
    expect(r.proposals.length).toBe(5);
    expect(r.rejected.length).toBe(0);
    expect(r.proposals.filter((p) => p.bypassedRateLimit).length).toBe(3);
  });

  it("resetCycleCounters clears the counter", () => {
    const e = new RoadmapAutoAppendEngine({ now: () => T0 });
    e.propose(makeInput({ guid: "g1" }));
    e.propose(makeInput({ guid: "g2" }));
    expect(e.getState().appended_this_cycle["BACKEND-DEVTOOLS-RGS6"]).toBe(2);
    e.resetCycleCounters();
    expect(e.getState().appended_this_cycle).toEqual({});
  });

  it("non-array batch input ⇒ empty result, no throw", () => {
    const e = new RoadmapAutoAppendEngine({ now: () => T0 });
    const r = e.proposeBatch(null as unknown as AppendInput[]);
    expect(r.proposals.length).toBe(0);
    expect(r.rejected.length).toBe(0);
  });
});

// ─── State load + validation ────────────────────────────────────────

describe("RoadmapAutoAppendEngine — setState", () => {
  it("setState swaps active state on valid input", () => {
    const e = new RoadmapAutoAppendEngine();
    const r = e.setState({
      schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
      per_milestone_limit: 1,
      corroboration_bypass_threshold: 5,
      appended_this_cycle: {},
    });
    expect(r.ok).toBe(true);
    expect(e.getState().per_milestone_limit).toBe(1);
  });

  it("setState rejects non-object", () => {
    const e = new RoadmapAutoAppendEngine();
    const r = e.setState(null as unknown as AppendRateLimitState);
    expect(r.ok).toBe(false);
  });

  it("setState rejects schemaVersion mismatch", () => {
    const e = new RoadmapAutoAppendEngine();
    const r = e.setState({
      schemaVersion: 999,
      per_milestone_limit: 1,
      corroboration_bypass_threshold: 1,
      appended_this_cycle: {},
    });
    expect(r.ok).toBe(false);
  });

  it("setState ignores __proto__ keys in appended_this_cycle (prototype-pollution guard)", () => {
    const e = new RoadmapAutoAppendEngine();
    const evilCounters = Object.create(null) as Record<string, number>;
    Object.defineProperty(evilCounters, "__proto__", { value: 999, enumerable: true, configurable: true });
    evilCounters["LEGIT-MS0"] = 1;
    const r = e.setState({
      schemaVersion: RATE_LIMIT_SCHEMA_VERSION,
      per_milestone_limit: 2,
      corroboration_bypass_threshold: 3,
      appended_this_cycle: evilCounters,
    });
    expect(r.ok).toBe(true);
    const out = e.getState().appended_this_cycle;
    // The legit key MUST land — the __proto__ key MUST NOT be promoted
    // to a real own-property of the cloned counter object. Using
    // Object.prototype.hasOwnProperty is the correct way to check this
    // (direct `out["__proto__"]` returns the prototype object).
    expect(Object.prototype.hasOwnProperty.call(out, "__proto__")).toBe(false);
    expect(out["LEGIT-MS0"]).toBe(1);
  });
});

// ─── Singleton sanity ───────────────────────────────────────────────

describe("RoadmapAutoAppendEngine — singleton", () => {
  beforeEach(() => {
    roadmapAutoAppendEngine.resetCycleCounters();
  });

  it("singleton exists + spec defaults", () => {
    expect(roadmapAutoAppendEngine.name).toBe("RoadmapAutoAppendEngine");
    expect(roadmapAutoAppendEngine.getState().per_milestone_limit).toBe(DEFAULT_PER_MILESTONE_LIMIT);
  });

  it("DEFAULT_ID_PREFIX matches 'U-AUTORES-'", () => {
    expect(DEFAULT_ID_PREFIX).toBe("U-AUTORES-");
  });

  it("singleton propose round-trip works", () => {
    const r = roadmapAutoAppendEngine.propose(makeInput({ guid: "singleton-test" }));
    expect("yaml" in r).toBe(true);
  });
});
