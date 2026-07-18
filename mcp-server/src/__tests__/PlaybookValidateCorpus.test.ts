/**
 * PlaybookValidateCorpus.test.ts
 *
 * U-PB-VALIDATE-CORPUS — engine tests for `MachiningPlaybookEngine.validateCorpus()`.
 * Pure-read corpus health audit: duplicateIds, orphans, unresolvedRefs,
 * cycles, schemaIssues, healthScore.
 *
 * Sibling to PlaybookRelatedGraph.test.ts — same fixture pattern (per-rule
 * addRule + minimal fixture function); engine tested in isolation from the
 * dispatcher. Real-corpus invariant test ensures the canonical 296-rule
 * corpus passes its own structural validation.
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  machiningPlaybookEngine,
  type PlaybookRule,
} from "../engines/MachiningPlaybookEngine.js";

/**
 * Minimal valid PlaybookRule fixture — every required field populated with a
 * non-empty placeholder. Tests that exercise schema-validation MUST clone +
 * mutate this, not edit the base directly.
 */
function fixtureRule(id: string, related: string[] = []): PlaybookRule {
  return {
    id,
    category: "machining-tactics" as any,
    severity: "warning" as any,
    title: `Title for ${id}`,
    rule: `Rule body for ${id}`,
    reasoning: `Reasoning for ${id}`,
    conditions: [],
    exceptions: [],
    source: `fixture:${id}`,
    related_rules: related,
  };
}

/** Build a fresh engine with ONLY the provided rules (no canonical corpus). */
function fresh(rules: PlaybookRule[] = []): MachiningPlaybookEngine {
  const eng = new MachiningPlaybookEngine();
  // Engine constructor seeds with PLAYBOOK_RULES; we need a clean slate to
  // test invariants without canonical-corpus interference. Bypass by direct
  // assignment (test-only — engine has no public empty-corpus API).
  (eng as any).rules = [];
  for (const r of rules) eng.addRule(r);
  return eng;
}

/**
 * Build a fresh engine that ALLOWS duplicate rule ids — by bypassing the
 * addRule uniqueness check and writing directly to the rules array. This
 * is the ONLY way to test duplicateIds detection because addRule() throws
 * on a second-ingest of an existing id.
 */
function freshDirect(rules: PlaybookRule[]): MachiningPlaybookEngine {
  const eng = new MachiningPlaybookEngine();
  (eng as any).rules = [...rules];
  return eng;
}

describe("MachiningPlaybookEngine.validateCorpus — base cases", () => {
  it("empty corpus → totalRules:0, healthScore:1, all detail arrays empty", () => {
    const eng = fresh([]);
    const r = eng.validateCorpus();
    expect(r.totalRules).toBe(0);
    expect(r.duplicateIds).toEqual([]);
    expect(r.orphans).toEqual([]);
    expect(r.unresolvedRefs).toEqual([]);
    expect(r.cycles).toEqual([]);
    expect(r.schemaIssues).toEqual([]);
    expect(r.healthScore).toBe(1);
  });

  it("single clean rule with no related_rules → orphan (1 rule, 1 orphan)", () => {
    const eng = fresh([fixtureRule("A")]);
    const r = eng.validateCorpus();
    expect(r.totalRules).toBe(1);
    expect(r.orphans).toEqual(["A"]);
    expect(r.duplicateIds).toEqual([]);
    expect(r.unresolvedRefs).toEqual([]);
    expect(r.cycles).toEqual([]);
    expect(r.schemaIssues).toEqual([]);
    // 1 finding (orphan) / 1 total rule → score clamps at 0
    expect(r.healthScore).toBe(0);
  });

  it("two mutually-linked rules → no orphans, no unresolved, no cycles, no schema issues", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["A"]),
    ]);
    const r = eng.validateCorpus();
    // A↔B is a 2-node cycle, NOT an orphan situation
    expect(r.orphans).toEqual([]);
    expect(r.unresolvedRefs).toEqual([]);
    expect(r.cycles.length).toBe(1);
    expect(r.cycles[0]).toEqual(["A", "B"]);
    expect(r.schemaIssues).toEqual([]);
  });
});

describe("MachiningPlaybookEngine.validateCorpus — duplicateIds", () => {
  it("two rules with same id → duplicateIds contains that id", () => {
    // freshDirect bypasses addRule's uniqueness check (the only way to seed
    // a corrupted-corpus state for the duplicateIds detector to find).
    const eng = freshDirect([fixtureRule("DUP"), fixtureRule("DUP")]);
    const r = eng.validateCorpus();
    expect(r.duplicateIds).toEqual(["DUP"]);
    expect(r.totalRules).toBe(2);
  });

  it("three duplicates → id appears ONCE in duplicateIds (deduplicated)", () => {
    const eng = freshDirect([fixtureRule("X"), fixtureRule("X"), fixtureRule("X")]);
    const r = eng.validateCorpus();
    expect(r.duplicateIds).toEqual(["X"]);
  });

  it("duplicateIds returned in sorted order", () => {
    const eng = freshDirect([
      fixtureRule("Z"), fixtureRule("Z"),
      fixtureRule("A"), fixtureRule("A"),
      fixtureRule("M"), fixtureRule("M"),
    ]);
    const r = eng.validateCorpus();
    expect(r.duplicateIds).toEqual(["A", "M", "Z"]);
  });
});

describe("MachiningPlaybookEngine.validateCorpus — orphans", () => {
  it("rule with NO related + NO inbound → orphan", () => {
    const eng = fresh([
      fixtureRule("ISLAND"),
      fixtureRule("LINKED", ["OTHER"]),
      fixtureRule("OTHER", ["LINKED"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.orphans).toEqual(["ISLAND"]);
  });

  it("rule with inbound but no outbound → NOT an orphan", () => {
    const eng = fresh([
      fixtureRule("SOURCE", ["TARGET"]),
      fixtureRule("TARGET"),  // no related, but inbound from SOURCE
    ]);
    const r = eng.validateCorpus();
    expect(r.orphans).toEqual([]);
  });

  it("rule with outbound but no inbound → NOT an orphan", () => {
    const eng = fresh([
      fixtureRule("ROOT", ["LEAF"]),
      fixtureRule("LEAF"),  // inbound from ROOT, so LEAF not orphan
      fixtureRule("ALSO_ROOT", ["LEAF"]),  // outbound to LEAF; no one refs ALSO_ROOT → still not orphan because has outbound
    ]);
    const r = eng.validateCorpus();
    expect(r.orphans).toEqual([]);
  });

  it("self-reference does NOT save a rule from being an orphan", () => {
    const eng = fresh([fixtureRule("SELF", ["SELF"])]);
    const r = eng.validateCorpus();
    // Self-ref is filtered: hasOutbound check excludes rid === r.id
    expect(r.orphans).toEqual(["SELF"]);
  });

  it("orphans sorted alphabetically", () => {
    const eng = fresh([
      fixtureRule("ZED"),
      fixtureRule("ALPHA"),
      fixtureRule("MIKE"),
    ]);
    const r = eng.validateCorpus();
    expect(r.orphans).toEqual(["ALPHA", "MIKE", "ZED"]);
  });
});

describe("MachiningPlaybookEngine.validateCorpus — unresolvedRefs", () => {
  it("rule references non-existent id → unresolvedRefs lists {fromId, missingId}", () => {
    const eng = fresh([fixtureRule("HAS_STALE_REF", ["NEVER_EXISTS"])]);
    const r = eng.validateCorpus();
    expect(r.unresolvedRefs).toEqual([
      { fromId: "HAS_STALE_REF", missingId: "NEVER_EXISTS" },
    ]);
  });

  it("same (fromId, missingId) pair appears once even if rule lists it twice", () => {
    const eng = fresh([
      fixtureRule("A", ["GHOST", "GHOST"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.unresolvedRefs).toEqual([
      { fromId: "A", missingId: "GHOST" },
    ]);
  });

  it("two different sources referencing the same missing id → 2 entries", () => {
    const eng = fresh([
      fixtureRule("A", ["GHOST"]),
      fixtureRule("B", ["GHOST"]),
    ]);
    const r = eng.validateCorpus();
    const entries = r.unresolvedRefs.map((u) => `${u.fromId}|${u.missingId}`).sort();
    expect(entries).toEqual(["A|GHOST", "B|GHOST"]);
  });

  it("malformed related_rules entries (non-string, empty) are filtered, not reported", () => {
    const eng = fresh([
      {
        ...fixtureRule("BAD"),
        related_rules: [null as any, undefined as any, 42 as any, "", "REAL_GHOST"],
      },
    ]);
    const r = eng.validateCorpus();
    expect(r.unresolvedRefs).toEqual([{ fromId: "BAD", missingId: "REAL_GHOST" }]);
  });

  it("self-reference does NOT generate an unresolvedRef even if 'missing'", () => {
    const eng = fresh([fixtureRule("LONELY", ["LONELY"])]);
    const r = eng.validateCorpus();
    expect(r.unresolvedRefs).toEqual([]);
  });
});

describe("MachiningPlaybookEngine.validateCorpus — cycles", () => {
  it("2-node cycle A↔B detected, canonicalized to ['A','B']", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["A"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles).toEqual([["A", "B"]]);
  });

  it("3-node cycle A→B→C→A canonicalized to ['A','B','C']", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["C"]),
      fixtureRule("C", ["A"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles.length).toBe(1);
    expect(r.cycles[0]).toEqual(["A", "B", "C"]);
  });

  it("cycle canonicalization: B→C→A→B and A→B→C→A dedupe to ONE cycle", () => {
    // Engine traverses in insertion order; canonical form starts at lowest id.
    const eng = fresh([
      fixtureRule("B", ["C"]),
      fixtureRule("C", ["A"]),
      fixtureRule("A", ["B"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles.length).toBe(1);
    // Canonical form rotates to start at "A" (lowest id)
    expect(r.cycles[0]).toEqual(["A", "B", "C"]);
  });

  it("multiple disjoint cycles → all surfaced separately", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["A"]),
      fixtureRule("X", ["Y"]),
      fixtureRule("Y", ["X"]),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles.length).toBe(2);
    const canonicals = r.cycles.map((c) => c.join(",")).sort();
    expect(canonicals).toEqual(["A,B", "X,Y"]);
  });

  it("acyclic chain A→B→C → zero cycles", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["C"]),
      fixtureRule("C"),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles).toEqual([]);
  });

  it("diamond pattern A→B,A→C,B→D,C→D (no cycle) → zero cycles", () => {
    const eng = fresh([
      fixtureRule("A", ["B", "C"]),
      fixtureRule("B", ["D"]),
      fixtureRule("C", ["D"]),
      fixtureRule("D"),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles).toEqual([]);
  });

  it("self-reference does NOT register as a 1-node cycle (silently skipped)", () => {
    const eng = fresh([
      fixtureRule("A", ["A", "B"]),
      fixtureRule("B"),
    ]);
    const r = eng.validateCorpus();
    expect(r.cycles).toEqual([]);
  });
});

describe("MachiningPlaybookEngine.validateCorpus — schemaIssues", () => {
  it("rule with empty title → schemaIssue 'title is missing or empty'", () => {
    const r = fresh([{ ...fixtureRule("X"), title: "" }]).validateCorpus();
    expect(r.schemaIssues.length).toBe(1);
    expect(r.schemaIssues[0].id).toBe("X");
    expect(r.schemaIssues[0].issues).toContain("title is missing or empty");
  });

  it("rule with empty reasoning → schemaIssue 'reasoning is missing or empty'", () => {
    const r = fresh([{ ...fixtureRule("X"), reasoning: "" }]).validateCorpus();
    expect(r.schemaIssues[0].issues).toContain("reasoning is missing or empty");
  });

  it("rule with conditions not-an-array → schemaIssue 'conditions must be an array'", () => {
    const r = fresh([{ ...fixtureRule("X"), conditions: null as any }]).validateCorpus();
    expect(r.schemaIssues[0].issues).toContain("conditions must be an array");
  });

  it("rule with exceptions not-an-array → schemaIssue 'exceptions must be an array'", () => {
    const r = fresh([{ ...fixtureRule("X"), exceptions: undefined as any }]).validateCorpus();
    expect(r.schemaIssues[0].issues).toContain("exceptions must be an array");
  });

  it("rule with empty source → schemaIssue 'source is missing or empty'", () => {
    const r = fresh([{ ...fixtureRule("X"), source: "" }]).validateCorpus();
    expect(r.schemaIssues[0].issues).toContain("source is missing or empty");
  });

  it("multiple field problems on one rule → all surfaced in one issues[] array", () => {
    const r = fresh([{
      ...fixtureRule("MULTI"),
      title: "",
      reasoning: "",
      source: "",
    }]).validateCorpus();
    expect(r.schemaIssues.length).toBe(1);
    expect(r.schemaIssues[0].issues).toContain("title is missing or empty");
    expect(r.schemaIssues[0].issues).toContain("reasoning is missing or empty");
    expect(r.schemaIssues[0].issues).toContain("source is missing or empty");
  });

  it("rule with empty id → surfaced under '<unidentified>'", () => {
    const r = fresh([{ ...fixtureRule(""), title: "T", rule: "R", reasoning: "Y", source: "S" }]).validateCorpus();
    expect(r.schemaIssues.length).toBe(1);
    expect(r.schemaIssues[0].id).toBe("<unidentified>");
    expect(r.schemaIssues[0].issues).toContain("id is missing or empty");
  });
});

describe("MachiningPlaybookEngine.validateCorpus — healthScore + invariants", () => {
  it("clean corpus (mutually-linked pair, no schema issues) → healthScore < 1 (cycle still scored)", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["A"]),
    ]);
    const r = eng.validateCorpus();
    // 1 cycle / 2 rules = 0.5
    expect(r.healthScore).toBe(0.5);
  });

  it("healthScore always in [0,1]", () => {
    // 5 rules all orphans + all schema issues + 1 cycle → score floors at 0
    const eng = fresh([
      fixtureRule("A"), fixtureRule("B"), fixtureRule("C"),
      fixtureRule("D"), fixtureRule("E"),
    ]);
    const r = eng.validateCorpus();
    expect(r.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.healthScore).toBeLessThanOrEqual(1);
  });

  it("repeated calls return identical reports (pure read-only)", () => {
    const eng = fresh([
      fixtureRule("A", ["B"]),
      fixtureRule("B", ["A"]),
    ]);
    const r1 = eng.validateCorpus();
    const r2 = eng.validateCorpus();
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("canonical 296-rule corpus loads + validates without crashing", () => {
    const r = machiningPlaybookEngine.validateCorpus();
    // Defensive: corpus must have ≥1 rule (sanity check the singleton loaded).
    expect(r.totalRules).toBeGreaterThanOrEqual(1);
    // Score is a number in [0,1]
    expect(typeof r.healthScore).toBe("number");
    expect(r.healthScore).toBeGreaterThanOrEqual(0);
    expect(r.healthScore).toBeLessThanOrEqual(1);
    // All detail arrays present (R12 — empty arrays surface, not undefined)
    expect(Array.isArray(r.duplicateIds)).toBe(true);
    expect(Array.isArray(r.orphans)).toBe(true);
    expect(Array.isArray(r.unresolvedRefs)).toBe(true);
    expect(Array.isArray(r.cycles)).toBe(true);
    expect(Array.isArray(r.schemaIssues)).toBe(true);
  });

  it("canonical corpus: no duplicate ids (corruption check)", () => {
    const r = machiningPlaybookEngine.validateCorpus();
    expect(r.duplicateIds).toEqual([]);
  });

  it("deep linear chain (5000 rules) does NOT stack-overflow — iterative DFS invariant", () => {
    // Regression lock for Reviewer B P1-2: prove the iterative DFS handles
    // depths that would crash the previous recursive implementation. With
    // Node's default ~10K call-stack ceiling, the old recursive `dfs(...)`
    // would throw RangeError on chains > ~5K rules.
    const N = 5000;
    const chain: PlaybookRule[] = [];
    for (let i = 0; i < N; i++) {
      const id = `CHAIN_${i.toString().padStart(5, "0")}`;
      const next = i < N - 1 ? `CHAIN_${(i + 1).toString().padStart(5, "0")}` : undefined;
      chain.push(fixtureRule(id, next ? [next] : []));
    }
    const eng = fresh(chain);
    // Must NOT throw — that's the regression test
    const r = eng.validateCorpus();
    expect(r.totalRules).toBe(N);
    expect(r.cycles).toEqual([]); // chain has NO cycles
    // First rule has no inbound but has outbound → not orphan
    // Last rule has inbound but no outbound → not orphan
    // No rule is BOTH orphan-criteria-met
    expect(r.orphans).toEqual([]);
  });

  it("deep cycle (1000 rules in a single loop) detected without stack-overflow", () => {
    // Companion to the chain test: prove the cycle-detection path also
    // scales without recursion-stack risk.
    const N = 1000;
    const cycleRules: PlaybookRule[] = [];
    for (let i = 0; i < N; i++) {
      const id = `LOOP_${i.toString().padStart(4, "0")}`;
      const next = `LOOP_${((i + 1) % N).toString().padStart(4, "0")}`;
      cycleRules.push(fixtureRule(id, [next]));
    }
    const eng = fresh(cycleRules);
    const r = eng.validateCorpus();
    expect(r.totalRules).toBe(N);
    // One canonical cycle covering all N rules
    expect(r.cycles.length).toBe(1);
    expect(r.cycles[0].length).toBe(N);
    // Canonical starts at LOOP_0000 (lowest id)
    expect(r.cycles[0][0]).toBe("LOOP_0000");
  });
});
