/**
 * PlaybookRelatedGraph.test.ts — U-PB-RELATED-GRAPH
 *
 * Verifies MachiningPlaybookEngine.relatedGraph() — multi-hop BFS over the
 * PlaybookRule.related_rules cross-reference graph. Extends explainRule()
 * (1-hop) to arbitrary depth with cycle guard + unresolved-ref surfacing +
 * truncation flag per R12 fail-loud (operators must see when a report is
 * incomplete, not silently get a partial answer).
 */
import { describe, it, expect } from "vitest";
import {
  MachiningPlaybookEngine,
  type PlaybookRule,
  type Condition,
} from "../engines/MachiningPlaybookEngine.js";

const fresh = () => new MachiningPlaybookEngine();

const MAT_P: Condition[] = [{ type: "material_iso", groups: ["P"] }];

/** Test fixture: a PlaybookRule with caller-controlled related_rules. */
function graphFixtureRule(
  id: string,
  related: string[] = [],
): PlaybookRule {
  return {
    id,
    category: "tactics",
    severity: "important",
    title: `fixture ${id}`,
    rule: "fixture rule text",
    reasoning: "fixture reasoning text",
    conditions: MAT_P,
    exceptions: [],
    source: "test",
    related_rules: related,
  };
}

describe("MachiningPlaybookEngine.relatedGraph — U-PB-RELATED-GRAPH", () => {
  describe("base cases", () => {
    it("returns null for an id not in the corpus", () => {
      const eng = fresh();
      const r = eng.relatedGraph("NEVER_EXISTS_X");
      expect(r).toBe(null);
    });

    it("returns root-only when maxDepth=0 (no traversal)", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("ROOT_0", ["NEIGHBOR_A"]));
      eng.addRule(graphFixtureRule("NEIGHBOR_A"));
      const r = eng.relatedGraph("ROOT_0", 0);
      expect(r).not.toBe(null);
      expect(r!.rootId).toBe("ROOT_0");
      expect(r!.maxDepth).toBe(0);
      expect(r!.nodes).toHaveLength(1);
      expect(r!.nodes[0].rule.id).toBe("ROOT_0");
      expect(r!.nodes[0].hopDepth).toBe(0);
      expect(r!.edges).toEqual([]);
      expect(r!.unresolvedRefs).toEqual([]);
      expect(r!.cycleEdges).toEqual([]);
      // ROOT_0 has 1 unexplored neighbor → truncated true
      expect(r!.truncated).toBe(true);
    });

    it("returns root-only with truncated=false when root has empty related_rules", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("ISOLATED", []));
      const r = eng.relatedGraph("ISOLATED", 5);
      expect(r).not.toBe(null);
      expect(r!.nodes).toHaveLength(1);
      expect(r!.truncated).toBe(false);
    });

    it("returns root-only with truncated=false when related_rules is undefined", () => {
      const eng = fresh();
      // PlaybookRule treats related_rules as optional; engine guards via
      // Array.isArray. Construct a rule without it.
      const rule: PlaybookRule = {
        id: "NORELATED",
        category: "tactics",
        severity: "tip",
        title: "no related",
        rule: "x",
        reasoning: "x",
        conditions: MAT_P,
        exceptions: [],
        source: "test",
      };
      eng.addRule(rule);
      const r = eng.relatedGraph("NORELATED", 3);
      expect(r).not.toBe(null);
      expect(r!.nodes).toHaveLength(1);
      expect(r!.truncated).toBe(false);
    });
  });

  describe("BFS traversal correctness", () => {
    it("1-hop traversal matches explainRule() shape (depth 1)", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("A1", ["B1", "C1"]));
      eng.addRule(graphFixtureRule("B1"));
      eng.addRule(graphFixtureRule("C1"));
      const r = eng.relatedGraph("A1", 1);
      expect(r!.nodes).toHaveLength(3);
      // BFS order: root first, then neighbors
      expect(r!.nodes[0].rule.id).toBe("A1");
      expect(r!.nodes[0].hopDepth).toBe(0);
      const neighbors = r!.nodes.slice(1).map((n) => n.rule.id).sort();
      expect(neighbors).toEqual(["B1", "C1"]);
      expect(r!.nodes[1].hopDepth).toBe(1);
      expect(r!.nodes[2].hopDepth).toBe(1);
      expect(r!.edges).toHaveLength(2);
      expect(r!.truncated).toBe(false);
    });

    it("2-hop traversal explores root → neighbor → neighbor-of-neighbor", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("L0", ["L1"]));
      eng.addRule(graphFixtureRule("L1", ["L2"]));
      eng.addRule(graphFixtureRule("L2"));
      const r = eng.relatedGraph("L0", 2);
      expect(r!.nodes).toHaveLength(3);
      expect(r!.nodes.map((n) => n.rule.id)).toEqual(["L0", "L1", "L2"]);
      expect(r!.nodes.map((n) => n.hopDepth)).toEqual([0, 1, 2]);
      expect(r!.edges).toHaveLength(2);
      expect(r!.truncated).toBe(false);
    });

    it("respects maxDepth and sets truncated=true when more remains", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("D0", ["D1"]));
      eng.addRule(graphFixtureRule("D1", ["D2"]));
      eng.addRule(graphFixtureRule("D2", ["D3"]));
      eng.addRule(graphFixtureRule("D3"));
      const r = eng.relatedGraph("D0", 1);
      expect(r!.nodes).toHaveLength(2);
      expect(r!.nodes.map((n) => n.rule.id)).toEqual(["D0", "D1"]);
      // D1 → D2 is the unexplored further edge
      expect(r!.truncated).toBe(true);
    });

    it("default maxDepth is 2 when caller omits it", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("DEF0", ["DEF1"]));
      eng.addRule(graphFixtureRule("DEF1", ["DEF2"]));
      eng.addRule(graphFixtureRule("DEF2", ["DEF3"]));
      eng.addRule(graphFixtureRule("DEF3"));
      const r = eng.relatedGraph("DEF0");
      expect(r!.maxDepth).toBe(2);
      expect(r!.nodes).toHaveLength(3);
      expect(r!.truncated).toBe(true);  // DEF2 → DEF3 is unexplored
    });

    it("BFS order: all hop-1 nodes appear before any hop-2 node", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("BFSR", ["BFSA", "BFSB"]));
      eng.addRule(graphFixtureRule("BFSA", ["BFSAA"]));
      eng.addRule(graphFixtureRule("BFSB", ["BFSBB"]));
      eng.addRule(graphFixtureRule("BFSAA"));
      eng.addRule(graphFixtureRule("BFSBB"));
      const r = eng.relatedGraph("BFSR", 2);
      // BFS order: root, then both hop-1, then both hop-2
      const ids = r!.nodes.map((n) => n.rule.id);
      const depths = r!.nodes.map((n) => n.hopDepth);
      expect(ids[0]).toBe("BFSR");
      expect(depths).toEqual([0, 1, 1, 2, 2]);
      // Both hop-1 (BFSA, BFSB) come before hop-2 (BFSAA, BFSBB)
      const firstHop2Idx = depths.indexOf(2);
      const lastHop1Idx = depths.lastIndexOf(1);
      expect(lastHop1Idx).toBeLessThan(firstHop2Idx);
    });
  });

  describe("cycle handling", () => {
    it("detects and surfaces a 2-node cycle without infinite loop", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("C2A", ["C2B"]));
      eng.addRule(graphFixtureRule("C2B", ["C2A"]));
      const r = eng.relatedGraph("C2A", 5);
      expect(r!.nodes).toHaveLength(2);
      expect(r!.edges).toHaveLength(1);  // C2A → C2B is the forward edge
      expect(r!.cycleEdges).toHaveLength(1);  // C2B → C2A is the back-edge
      expect(r!.cycleEdges[0]).toEqual({ fromId: "C2B", toId: "C2A" });
    });

    it("detects a 3-node cycle", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("CY3A", ["CY3B"]));
      eng.addRule(graphFixtureRule("CY3B", ["CY3C"]));
      eng.addRule(graphFixtureRule("CY3C", ["CY3A"]));
      const r = eng.relatedGraph("CY3A", 5);
      expect(r!.nodes).toHaveLength(3);
      expect(r!.cycleEdges).toHaveLength(1);
      expect(r!.cycleEdges[0]).toEqual({ fromId: "CY3C", toId: "CY3A" });
    });

    it("dedupes a repeated cycle-edge from the same source", () => {
      const eng = fresh();
      // Two paths back to root from different intermediaries
      eng.addRule(graphFixtureRule("DD0", ["DD1", "DD2"]));
      eng.addRule(graphFixtureRule("DD1", ["DD0"]));  // cycle DD1 → DD0
      eng.addRule(graphFixtureRule("DD2", ["DD0"]));  // cycle DD2 → DD0
      const r = eng.relatedGraph("DD0", 5);
      // Distinct cycle-edges with distinct sources are NOT deduped
      expect(r!.cycleEdges).toHaveLength(2);
      const cycleSources = r!.cycleEdges.map((e) => e.fromId).sort();
      expect(cycleSources).toEqual(["DD1", "DD2"]);
    });

    it("silently drops self-reference (rule.related_rules contains its own id)", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("SELFREF", ["SELFREF", "OTHER"]));
      eng.addRule(graphFixtureRule("OTHER"));
      const r = eng.relatedGraph("SELFREF", 2);
      // Self-reference is silently dropped (it's a no-op edge, not a cycle)
      expect(r!.cycleEdges).toEqual([]);
      // OTHER is still resolved as a normal neighbor
      expect(r!.nodes).toHaveLength(2);
      expect(r!.nodes.map((n) => n.rule.id).sort()).toEqual(["OTHER", "SELFREF"]);
    });
  });

  describe("R12 fail-loud — unresolved refs", () => {
    it("surfaces unresolved ref ids when related_rules names a missing rule", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("UR_ROOT", ["EXISTS", "MISSING_X"]));
      eng.addRule(graphFixtureRule("EXISTS"));
      const r = eng.relatedGraph("UR_ROOT", 2);
      expect(r!.unresolvedRefs).toEqual(["MISSING_X"]);
      // The edge from UR_ROOT → MISSING_X is still recorded (operator visibility)
      const missingEdge = r!.edges.find((e) => e.toId === "MISSING_X");
      expect(missingEdge).toEqual({ fromId: "UR_ROOT", toId: "MISSING_X" });
      // EXISTS resolves normally
      const nodeIds = r!.nodes.map((n) => n.rule.id).sort();
      expect(nodeIds).toEqual(["EXISTS", "UR_ROOT"]);
    });

    it("dedupes the same unresolved id referenced multiple times", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("DR_A", ["MISSING_Y", "DR_B"]));
      eng.addRule(graphFixtureRule("DR_B", ["MISSING_Y"]));
      const r = eng.relatedGraph("DR_A", 3);
      // MISSING_Y referenced from BOTH DR_A and DR_B — only listed once in unresolvedRefs
      expect(r!.unresolvedRefs).toEqual(["MISSING_Y"]);
      // But the edge from each source is recorded (operator visibility)
      const missingEdges = r!.edges.filter((e) => e.toId === "MISSING_Y");
      expect(missingEdges).toHaveLength(2);
      const sources = missingEdges.map((e) => e.fromId).sort();
      expect(sources).toEqual(["DR_A", "DR_B"]);
    });

    it("filters out non-string and empty-string related_rules entries", () => {
      const eng = fresh();
      // Inject a malformed rule with mixed-type related_rules
      const rule: PlaybookRule = {
        ...graphFixtureRule("MAL", []),
        related_rules: ["VALID", "", null as unknown as string, 42 as unknown as string, "VALID2"],
      };
      eng.addRule(rule);
      eng.addRule(graphFixtureRule("VALID"));
      eng.addRule(graphFixtureRule("VALID2"));
      const r = eng.relatedGraph("MAL", 2);
      // Only the 2 valid strings produced edges; empty + non-string silently filtered
      expect(r!.edges).toHaveLength(2);
      const targets = r!.edges.map((e) => e.toId).sort();
      expect(targets).toEqual(["VALID", "VALID2"]);
      expect(r!.unresolvedRefs).toEqual([]);
    });
  });

  describe("structural invariants + metadata", () => {
    it("rootId echoes the requested id; maxDepth echoes the requested depth", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("ECHO"));
      const r = eng.relatedGraph("ECHO", 7);
      expect(r!.rootId).toBe("ECHO");
      expect(r!.maxDepth).toBe(7);
    });

    it("negative maxDepth is clamped to 0", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("NEG", ["X"]));
      eng.addRule(graphFixtureRule("X"));
      const r = eng.relatedGraph("NEG", -5);
      expect(r!.maxDepth).toBe(0);
      expect(r!.nodes).toHaveLength(1);  // root only
      expect(r!.truncated).toBe(true);   // X is the unexplored neighbor
    });

    it("fractional maxDepth is floored", () => {
      const eng = fresh();
      eng.addRule(graphFixtureRule("F0", ["F1"]));
      eng.addRule(graphFixtureRule("F1", ["F2"]));
      eng.addRule(graphFixtureRule("F2"));
      const r = eng.relatedGraph("F0", 1.9);
      expect(r!.maxDepth).toBe(1);  // 1.9 → 1
      expect(r!.nodes).toHaveLength(2);
      expect(r!.truncated).toBe(true);
    });

    it("no node appears twice (visited-set dedupe across diamond paths)", () => {
      const eng = fresh();
      // Diamond: ROOT → A, B; A → MERGE; B → MERGE
      eng.addRule(graphFixtureRule("DROOT", ["DA", "DB"]));
      eng.addRule(graphFixtureRule("DA", ["MERGE"]));
      eng.addRule(graphFixtureRule("DB", ["MERGE"]));
      eng.addRule(graphFixtureRule("MERGE"));
      const r = eng.relatedGraph("DROOT", 3);
      // MERGE should appear exactly ONCE despite being reachable from both A and B
      const mergeCount = r!.nodes.filter((n) => n.rule.id === "MERGE").length;
      expect(mergeCount).toBe(1);
      // 4 distinct nodes
      expect(r!.nodes).toHaveLength(4);
      // The second-arrival edge from DB → MERGE becomes a cycle-edge (back-edge to visited node)
      expect(r!.cycleEdges).toHaveLength(1);
      expect(r!.cycleEdges[0]).toEqual({ fromId: "DB", toId: "MERGE" });
    });

    it("composes on real corpus rules (does not throw on the canonical store)", () => {
      const eng = fresh();
      // Pick a canonical rule known to have related_rules — SEQ-001 references
      // multiple downstream rules in the playbook corpus.
      const r = eng.relatedGraph("SEQ-001", 2);
      expect(r).not.toBe(null);
      expect(r!.rootId).toBe("SEQ-001");
      expect(r!.nodes[0].rule.id).toBe("SEQ-001");
      // Reviewer B P1-2 — assert ≥2 nodes to catch silent corpus-drift
      // degradation. If SEQ-001 ever loses its related_rules entirely, this
      // test fails fast rather than degrading to a `relatedGraph()` smoke
      // test that passes trivially with just the root.
      expect(r!.nodes.length).toBeGreaterThanOrEqual(2);
      const allHopDepthsValid = r!.nodes.every((n) => n.hopDepth >= 0 && n.hopDepth <= 2);
      expect(allHopDepthsValid).toBe(true);
    });

    it("R12 negative — clean traversal yields EMPTY unresolvedRefs + cycleEdges arrays (not undefined)", () => {
      // Reviewer B P2-1 — pin the negative R12 contract: when no missing refs
      // and no cycles exist, the arrays must be EMPTY (not absent/undefined).
      // Otherwise a future regression where the engine starts returning
      // {unresolvedRefs: undefined} would pass the .toContain() positive
      // assertions silently.
      const eng = fresh();
      eng.addRule(graphFixtureRule("CLEAN0", ["CLEAN1"]));
      eng.addRule(graphFixtureRule("CLEAN1", ["CLEAN2"]));
      eng.addRule(graphFixtureRule("CLEAN2"));
      const r = eng.relatedGraph("CLEAN0", 5);
      expect(r!.unresolvedRefs).toEqual([]);
      expect(r!.cycleEdges).toEqual([]);
      expect(Array.isArray(r!.unresolvedRefs)).toBe(true);
      expect(Array.isArray(r!.cycleEdges)).toBe(true);
      expect(r!.truncated).toBe(false);  // BFS completed exhaustively
    });
  });
});
