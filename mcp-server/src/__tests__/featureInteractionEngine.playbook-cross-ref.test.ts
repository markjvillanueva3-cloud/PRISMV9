/**
 * PB-MS0/P3-U01 — Cross-reference precedence edges with playbook anti-patterns.
 *
 * Verifies the EXTRACTED pure matcher (`matchAntiPatternsToEdge`) and the
 * `applyAntiPatternsToEdges` mutator both elevate edges deterministically
 * against injected anti-pattern fixtures — independent of whether the live
 * `MachiningPlaybookEngine` returns any rules at test time. This closes the
 * "test passes regardless of implementation" pathology that the old try/catch
 * fail-soft path created.
 */

import { describe, it, expect } from "vitest";
import {
  featureInteractionEngine,
  matchAntiPatternsToEdge,
  PRECEDENCE_SEVERITY_RANK,
  type AntiPatternRule,
  type MfgFeature,
  type PrecedenceGraph,
} from "../engines/FeatureInteractionEngine.js";

const ANTI_PATTERNS: AntiPatternRule[] = [
  {
    id: "AP-FIN-BEFORE-ROUGH",
    severity: "critical",
    title: "Never finish before rough",
    rule: "Do not run a finish_surface pass before the rough_surface stage completes — workpiece deflection from heavy roughing will scrap the finish.",
    reasoning: "Cutting forces during roughing deform the part by an order of magnitude more than finishing.",
  },
  {
    id: "AP-POCKET-HOLE-PRECEDENCE",
    severity: "important",
    title: "Pocket walls before drilling intersecting holes",
    rule: "Machine the pocket containment before drilling a hole into the pocket floor.",
    reasoning: "If the hole is drilled first, the pocket cut breaks through the hole edge and leaves a burr.",
  },
  {
    id: "AP-THREAD-ONLY",
    severity: "tip",
    title: "Thread tap chamfer",
    rule: "Chamfer the thread starting face — improves tap engagement.",
    reasoning: "Lead-in chamfer reduces thread-cross damage on entry.",
  },
];

const NESTED_FEATURES: MfgFeature[] = [
  {
    id: "F_POCKET",
    type: "POCKET",
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 10 } },
  },
  {
    id: "F_HOLE",
    type: "HOLE",
    parentFeatureId: "F_POCKET",
    bounds: { min: { x: 40, y: 40, z: 0 }, max: { x: 60, y: 60, z: 10 } },
  },
  {
    id: "F_THREAD",
    type: "THREAD",
    parentFeatureId: "F_HOLE",
    bounds: { min: { x: 42, y: 42, z: 0 }, max: { x: 58, y: 58, z: 10 } },
  },
];

const VALID_SEVERITIES = new Set(Object.keys(PRECEDENCE_SEVERITY_RANK));

describe("matchAntiPatternsToEdge — pure matcher (PB-MS0/P3-U01)", () => {
  it("returns null when no anti-pattern mentions BOTH endpoint types", () => {
    expect(matchAntiPatternsToEdge("face", "groove", ANTI_PATTERNS)).toBeNull();
  });

  it("returns null on empty anti-pattern list", () => {
    expect(matchAntiPatternsToEdge("pocket", "hole", [])).toBeNull();
  });

  it("returns null when either endpoint type is empty (defensive)", () => {
    expect(matchAntiPatternsToEdge("", "hole", ANTI_PATTERNS)).toBeNull();
    expect(matchAntiPatternsToEdge("hole", "", ANTI_PATTERNS)).toBeNull();
  });

  it("matches an anti-pattern that mentions both endpoint types — returns its id + severity", () => {
    const result = matchAntiPatternsToEdge("pocket", "hole", ANTI_PATTERNS);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("important");
    expect(result!.ruleIds).toEqual(["AP-POCKET-HOLE-PRECEDENCE"]);
  });

  it("does NOT match a rule that mentions only one endpoint (false-positive guard)", () => {
    // AP-THREAD-ONLY mentions 'thread' but not 'pocket'
    expect(matchAntiPatternsToEdge("thread", "pocket", ANTI_PATTERNS)).toBeNull();
  });

  it("elevates to the HIGHEST severity when multiple rules match", () => {
    const fixtures: AntiPatternRule[] = [
      ...ANTI_PATTERNS,
      {
        id: "AP-POCKET-HOLE-CRITICAL",
        severity: "critical",
        title: "Pocket-hole order critical override",
        rule: "Never reverse pocket vs hole order — risk of scrapping the hole into the pocket wall.",
        reasoning: "Coordinated chip evacuation requires pocket-first ordering.",
      },
    ];
    const result = matchAntiPatternsToEdge("pocket", "hole", fixtures);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.ruleIds).toEqual(["AP-POCKET-HOLE-PRECEDENCE", "AP-POCKET-HOLE-CRITICAL"]);
  });

  it("ranks severities monotonically (single source of truth)", () => {
    expect(PRECEDENCE_SEVERITY_RANK.critical).toBeGreaterThan(PRECEDENCE_SEVERITY_RANK.important);
    expect(PRECEDENCE_SEVERITY_RANK.important).toBeGreaterThan(PRECEDENCE_SEVERITY_RANK.recommended);
    expect(PRECEDENCE_SEVERITY_RANK.recommended).toBeGreaterThan(PRECEDENCE_SEVERITY_RANK.tip);
    expect(PRECEDENCE_SEVERITY_RANK.tip).toBeGreaterThan(PRECEDENCE_SEVERITY_RANK.normal);
  });

  it("deduplicates rule IDs when the same anti-pattern is supplied twice", () => {
    const dup = [...ANTI_PATTERNS, ANTI_PATTERNS[1]];
    const result = matchAntiPatternsToEdge("pocket", "hole", dup);
    expect(result).not.toBeNull();
    expect(result!.ruleIds).toEqual(["AP-POCKET-HOLE-PRECEDENCE"]);
  });

  it("returns null when ONLY an unknown-severity rule matches (no real elevation occurred)", () => {
    // Elevation-is-meaningful contract: a rule whose severity is not in the
    // rank table cannot legitimately elevate any edge. The matcher MUST skip
    // such rules — returning {severity:'normal', ruleIds:[...]} would falsely
    // claim "elevation" while leaving severity at the baseline.
    const unknown: AntiPatternRule[] = [{
      id: "AP-UNKNOWN-SEV",
      severity: "spurious-future-value",
      title: "Spurious",
      rule: "rule mentions pocket and hole",
      reasoning: "test fixture",
    }];
    expect(matchAntiPatternsToEdge("pocket", "hole", unknown)).toBeNull();
  });

  it("ignores unknown-severity rules in a mixed list but still elevates known matches", () => {
    const mixed: AntiPatternRule[] = [
      { id: "AP-BAD", severity: "spurious-future-value", title: "x", rule: "pocket hole", reasoning: "" },
      ANTI_PATTERNS[1], // AP-POCKET-HOLE-PRECEDENCE (severity=important)
    ];
    const result = matchAntiPatternsToEdge("pocket", "hole", mixed);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("important");
    expect(result!.ruleIds).toEqual(["AP-POCKET-HOLE-PRECEDENCE"]);
  });

  it("contract: caller must lowercase feature types — mixed-case input produces no match", () => {
    expect(matchAntiPatternsToEdge("POCKET", "HOLE", ANTI_PATTERNS)).toBeNull();
  });
});

describe("FeatureInteractionEngine.applyAntiPatternsToEdges — injected anti-patterns (PB-MS0/P3-U01)", () => {
  function makeGraphPocketHoleThread(): PrecedenceGraph {
    return featureInteractionEngine.buildPrecedenceGraph(NESTED_FEATURES);
  }

  it("elevates the pocket→hole edge to 'important' with the matching rule ID", () => {
    const graph = makeGraphPocketHoleThread();
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);

    const pocketHoleEdges = graph.edges.filter(e => e.from === "F_POCKET" && e.to === "F_HOLE");
    expect(pocketHoleEdges.length).toBeGreaterThanOrEqual(1);
    for (const e of pocketHoleEdges) {
      expect(e.severity).toBe("important");
      expect(e.antiPatternRuleIds).toEqual(["AP-POCKET-HOLE-PRECEDENCE"]);
    }
  });

  it("leaves the hole→thread edge unelevated — no fixture matches both endpoints", () => {
    const graph = makeGraphPocketHoleThread();
    // Clear any real-playbook elevation first so we test ONLY our fixture's effect
    for (const e of graph.edges) { delete e.severity; delete e.antiPatternRuleIds; }
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);

    const holeThreadEdges = graph.edges.filter(e => e.from === "F_HOLE" && e.to === "F_THREAD");
    for (const e of holeThreadEdges) {
      expect(e.severity).toBe(undefined);
      expect(e.antiPatternRuleIds).toBe(undefined);
    }
  });

  it("empty anti-pattern list leaves every edge untouched", () => {
    const graph = makeGraphPocketHoleThread();
    for (const e of graph.edges) { delete e.severity; delete e.antiPatternRuleIds; }
    featureInteractionEngine.applyAntiPatternsToEdges(graph, []);
    for (const e of graph.edges) {
      expect(e.severity).toBe(undefined);
      expect(e.antiPatternRuleIds).toBe(undefined);
    }
  });

  it("preserves edge count + endpoint shape (additive — never deletes or rewires)", () => {
    const graph = makeGraphPocketHoleThread();
    const beforeShape = graph.edges.map(e => `${e.from}->${e.to}:${e.constraint}`).sort();
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);
    const afterShape = graph.edges.map(e => `${e.from}->${e.to}:${e.constraint}`).sort();
    expect(afterShape).toEqual(beforeShape);
  });

  it("metadata invariant — severity and antiPatternRuleIds are present together or both absent", () => {
    const graph = makeGraphPocketHoleThread();
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);
    for (const e of graph.edges) {
      const hasSev = e.severity !== undefined;
      const hasIds = e.antiPatternRuleIds !== undefined;
      expect(hasSev).toBe(hasIds);
      if (hasIds) {
        expect(e.antiPatternRuleIds!.length).toBeGreaterThanOrEqual(1);
        expect(VALID_SEVERITIES.has(e.severity!)).toBe(true);
      }
    }
  });

  it("running applyAntiPatternsToEdges twice is idempotent (same elevation)", () => {
    const graph = makeGraphPocketHoleThread();
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);
    const snapshot = graph.edges.map(e => ({ from: e.from, to: e.to, severity: e.severity, ids: e.antiPatternRuleIds?.slice() }));
    featureInteractionEngine.applyAntiPatternsToEdges(graph, ANTI_PATTERNS);
    const snapshot2 = graph.edges.map(e => ({ from: e.from, to: e.to, severity: e.severity, ids: e.antiPatternRuleIds?.slice() }));
    expect(snapshot2).toEqual(snapshot);
  });

  it("manual override fixtures elevate the targeted edge with the new severity + rule ID", () => {
    const graph = makeGraphPocketHoleThread();
    for (const e of graph.edges) { delete e.severity; delete e.antiPatternRuleIds; }
    const overrideFixtures: AntiPatternRule[] = [{
      id: "AP-OVERRIDE",
      severity: "critical",
      title: "Override",
      rule: "any pocket and hole interaction is critical for test purposes",
      reasoning: "test",
    }];
    featureInteractionEngine.applyAntiPatternsToEdges(graph, overrideFixtures);
    const pocketHoleEdges = graph.edges.filter(e => e.from === "F_POCKET" && e.to === "F_HOLE");
    expect(pocketHoleEdges.length).toBeGreaterThanOrEqual(1);
    for (const e of pocketHoleEdges) {
      expect(e.severity).toBe("critical");
      expect(e.antiPatternRuleIds).toEqual(["AP-OVERRIDE"]);
    }
  });
});

describe("FeatureInteractionEngine integration — buildPrecedenceGraph + minimizeSetups co-callable (PB-MS0/P3-U01)", () => {
  it("buildPrecedenceGraph returns 3 nodes + ≥2 edges for nested pocket→hole→thread", () => {
    const graph = featureInteractionEngine.buildPrecedenceGraph(NESTED_FEATURES);
    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.has("F_POCKET")).toBe(true);
    expect(graph.nodes.has("F_HOLE")).toBe(true);
    expect(graph.nodes.has("F_THREAD")).toBe(true);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("empty feature list yields zero-node zero-edge graph (fail-soft)", () => {
    const graph = featureInteractionEngine.buildPrecedenceGraph([]);
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.length).toBe(0);
    expect(graph.adjacencyList.size).toBe(0);
  });

  it("minimizeSetups returns a setup plan with the full feature count (no shared-state regression)", () => {
    featureInteractionEngine.buildPrecedenceGraph(NESTED_FEATURES);
    const plan = featureInteractionEngine.minimizeSetups(NESTED_FEATURES);
    expect(plan.featureCount).toBe(3);
    expect(plan.totalSetups).toBeGreaterThanOrEqual(1);
  });
});
