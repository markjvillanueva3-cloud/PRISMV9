/**
 * CrossDomainOrchestratorEngine Tests — ORCH-MULTIDOMAIN-MS11
 *
 * Cross-domain job planning: feature→domain routing, segment grouping,
 * handoff cost, operator pin override, unresolved features, edge cases.
 *
 * @milestone ORCH-MULTIDOMAIN-MS11
 */

import { describe, it, expect } from "vitest";
import {
  crossDomainOrchestratorEngine,
  FEATURE_DOMAIN_MAP,
  type OrchestrationInput,
  type FeatureRef,
} from "../engines/CrossDomainOrchestratorEngine.js";
import { INTELLIGENCE_CORE_ACTIONS as intelligenceActions } from "../tools/dispatchers/intelligenceDispatcher.js";

// ============================================================================
// FIXTURES
// ============================================================================

const SHAFT_WITH_FLATS: FeatureRef[] = [
  { id: "F1", type: "face" },
  { id: "F2", type: "od_turn" },
  { id: "F3", type: "thread_external" },
  { id: "F4", type: "flat" },        // mill
  { id: "F5", type: "slot" },        // mill
];

const DIE_PLATE: FeatureRef[] = [
  { id: "F1", type: "pocket" },      // mill
  { id: "F2", type: "drill" },       // mill
  { id: "F3", type: "edm_contour" }, // wedm
  { id: "F4", type: "edm_corner" },  // wedm
];

const TOOL_INSERT: FeatureRef[] = [
  { id: "F1", type: "cylindrical_grind" }, // grinder
  { id: "F2", type: "edm_punch" },         // wedm
];

// ============================================================================
// HAPPY PATH
// ============================================================================

describe("CrossDomainOrchestratorEngine", () => {
  describe("Happy Path — Multi-Domain Jobs", () => {
    it("shaft with milled flats: lathe segment → mill segment", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: SHAFT_WITH_FLATS,
      });
      expect(plan.total_segments).toBe(2);
      expect(plan.segments[0].domain).toBe("lathe");
      expect(plan.segments[1].domain).toBe("mill");
      expect(plan.segments[0].features.map(f => f.id)).toEqual(["F1", "F2", "F3"]);
      expect(plan.segments[1].features.map(f => f.id)).toEqual(["F4", "F5"]);
      expect(plan.segments[0].handoff_from_prior_sec).toBe(0); // first
      expect(plan.segments[1].handoff_from_prior_sec).toBeGreaterThan(0);
      expect(plan.unresolved_features).toHaveLength(0);
      expect(plan.total_domains).toBe(2);
    });

    it("die plate: mill → wedm with 2 segments", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: DIE_PLATE,
      });
      expect(plan.total_segments).toBe(2);
      expect(plan.segments[0].domain).toBe("mill");
      expect(plan.segments[1].domain).toBe("wedm");
      // mill → wedm handoff cost
      expect(plan.segments[1].handoff_from_prior_sec).toBe(1200);
    });

    it("tool insert: grinder → wedm with slow handoff", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: TOOL_INSERT,
      });
      expect(plan.segments).toHaveLength(2);
      expect(plan.segments[0].domain).toBe("grinder");
      expect(plan.segments[1].domain).toBe("wedm");
      // No explicit grinder:wedm cost → default 900
      expect(plan.segments[1].handoff_from_prior_sec).toBe(900);
    });

    it("single-domain job: lathe-only shaft → 1 segment, 0 handoff cost", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: SHAFT_WITH_FLATS.slice(0, 3), // just face + od_turn + thread
      });
      expect(plan.total_segments).toBe(1);
      expect(plan.total_handoff_cost_sec).toBe(0);
      expect(plan.segments[0].domain).toBe("lathe");
    });
  });

  describe("Domain Resolution", () => {
    it("operator pin overrides catalog default", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "face", domain_pin: "mill_turn" },
          { id: "F2", type: "od_turn" },
        ],
      });
      expect(plan.segments[0].domain).toBe("mill_turn");
    });

    it("preferred_domains[] biases ambiguous features", () => {
      // 'chamfer_od' → ["lathe","mill_turn","mill"] — preferring 'mill' picks mill
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [{ id: "F1", type: "chamfer_od" }],
        preferred_domains: ["mill"],
      });
      expect(plan.segments[0].domain).toBe("mill");
    });

    it("preferred_domains[] respects first-hit order", () => {
      // 'drill' → ["mill","lathe","mill_turn","five_axis"]; preferring ["mill_turn","mill"] picks mill_turn first hit
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [{ id: "F1", type: "drill" }],
        preferred_domains: ["mill_turn", "mill"],
      });
      expect(plan.segments[0].domain).toBe("mill_turn");
    });

    it("unknown feature type → unresolved", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "face" },
          { id: "F2", type: "totally_made_up_feature" },
        ],
      });
      expect(plan.unresolved_features).toHaveLength(1);
      expect(plan.unresolved_features[0].feature_id).toBe("F2");
      expect(plan.unresolved_features[0].reason).toMatch(/Unknown feature type/);
      // F1 still produces a 1-feature segment
      expect(plan.segments).toHaveLength(1);
      expect(plan.segments[0].features.map(f => f.id)).toEqual(["F1"]);
    });

    it("all-unknown features → placeholder segment + warning", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "X1", type: "bogus1" },
          { id: "X2", type: "bogus2" },
        ],
      });
      expect(plan.unresolved_features).toHaveLength(2);
      expect(plan.segments).toHaveLength(1);
      expect(plan.segments[0].features[0].id).toBe("PLACEHOLDER");
      expect(plan.warnings.some(w => /Placeholder segment/.test(w))).toBe(true);
    });
  });

  describe("Handoff Cost", () => {
    it("same-machine pair (mill ↔ mill_turn) is cheap", () => {
      expect(crossDomainOrchestratorEngine.handoffCost("mill", "mill_turn")).toBe(60);
    });

    it("lathe ↔ mill is medium (re-chuck)", () => {
      expect(crossDomainOrchestratorEngine.handoffCost("lathe", "mill")).toBe(600);
      expect(crossDomainOrchestratorEngine.handoffCost("mill", "lathe")).toBe(600);
    });

    it("EDM handoffs are expensive", () => {
      expect(crossDomainOrchestratorEngine.handoffCost("mill", "wedm")).toBe(1200);
      expect(crossDomainOrchestratorEngine.handoffCost("lathe", "wedm")).toBe(1500);
    });

    it("grinder handoffs are most expensive (inspection gate)", () => {
      expect(crossDomainOrchestratorEngine.handoffCost("mill", "grinder")).toBe(1800);
      expect(crossDomainOrchestratorEngine.handoffCost("grinder", "lathe")).toBe(1800);
    });

    it("same-domain (A → A) is 0", () => {
      expect(crossDomainOrchestratorEngine.handoffCost("mill", "mill")).toBe(0);
    });

    it("unknown domain pair falls back to default 900", () => {
      // five_axis → laser is not in HANDOFF_COST_SEC explicitly
      const c = crossDomainOrchestratorEngine.handoffCost("five_axis", "laser");
      expect(c).toBe(900);
    });
  });

  describe("Estimates", () => {
    it("feature_time_estimates_sec is summed per segment", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "face" },
          { id: "F2", type: "od_turn" },
        ],
        feature_time_estimates_sec: { F1: 45, F2: 120 },
      });
      expect(plan.segments[0].estimated_time_sec).toBe(165);
    });

    it("missing estimates default to 30s per feature", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "face" },
          { id: "F2", type: "od_turn" },
          { id: "F3", type: "thread_external" },
        ],
      });
      expect(plan.segments[0].estimated_time_sec).toBe(90);
    });

    it("total_handoff_cost_sec sums correctly across segments", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "od_turn" },   // lathe
          { id: "F2", type: "pocket" },    // mill (handoff 600)
          { id: "F3", type: "edm_contour" }, // wedm (handoff 1200)
        ],
      });
      expect(plan.total_handoff_cost_sec).toBe(600 + 1200);
      expect(plan.total_segments).toBe(3);
    });

    it(">3 domains triggers a consolidation warning", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [
          { id: "F1", type: "od_turn" },
          { id: "F2", type: "pocket" },
          { id: "F3", type: "edm_contour" },
          { id: "F4", type: "cylindrical_grind" },
        ],
      });
      expect(plan.total_domains).toBe(4);
      expect(plan.warnings.some(w => /spans \d+ domains/.test(w))).toBe(true);
    });
  });

  describe("Summary", () => {
    it("summarize() returns compact view", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: SHAFT_WITH_FLATS,
      });
      const s = crossDomainOrchestratorEngine.summarize(plan);
      expect(s.segments).toBe(2);
      expect(s.domains).toBe(2);
      expect(s.unresolved).toBe(0);
      expect(s.total_time_min).toBeGreaterThan(0);
    });
  });

  describe("Schema + Map Integrity", () => {
    it("getFeatureDomainMap returns a clone (caller mutation-safe)", () => {
      const map = crossDomainOrchestratorEngine.getFeatureDomainMap();
      map.face = ["wedm"]; // try to poison
      const fresh = crossDomainOrchestratorEngine.getFeatureDomainMap();
      expect(fresh.face).toEqual(FEATURE_DOMAIN_MAP.face);
      expect(fresh.face).not.toEqual(["wedm"]);
    });

    it("every key in FEATURE_DOMAIN_MAP has ≥1 domain candidate", () => {
      for (const [feat, domains] of Object.entries(FEATURE_DOMAIN_MAP)) {
        expect(domains.length).toBeGreaterThanOrEqual(1);
        expect(feat.length).toBeGreaterThan(0);
      }
    });

    it("lathe and mill features are disjoint at the canonical level", () => {
      // Pure-lathe features (od_turn, thread_external) should NOT appear in mill-only.
      // Pure-mill features (pocket, slot) should NOT route to lathe.
      expect(FEATURE_DOMAIN_MAP.od_turn).not.toContain("mill");
      expect(FEATURE_DOMAIN_MAP.pocket).not.toContain("lathe");
    });
  });

  describe("Invariants", () => {
    it("plan_id and job_id are non-empty strings", () => {
      const plan = crossDomainOrchestratorEngine.planJob({ features: [{ id: "F1", type: "face" }] });
      expect(plan.plan_id.length).toBeGreaterThan(0);
      expect(plan.job_id.length).toBeGreaterThan(0);
    });

    it("explicit job_id is propagated", () => {
      const plan = crossDomainOrchestratorEngine.planJob({
        features: [{ id: "F1", type: "face" }],
        job_id: "job-cross-domain-2026-05-23",
      });
      expect(plan.job_id).toBe("job-cross-domain-2026-05-23");
    });

    it("total_segments matches segments.length", () => {
      const plan = crossDomainOrchestratorEngine.planJob({ features: SHAFT_WITH_FLATS });
      expect(plan.total_segments).toBe(plan.segments.length);
    });

    it("estimated_total_time_sec = sum of (segTime + handoff)", () => {
      const plan = crossDomainOrchestratorEngine.planJob({ features: DIE_PLATE });
      const computed = plan.segments.reduce(
        (s, seg) => s + seg.estimated_time_sec + seg.handoff_from_prior_sec,
        0,
      );
      expect(plan.estimated_total_time_sec).toBe(computed);
    });

    it("setup_id increments per segment (OP10, OP20, ...)", () => {
      const plan = crossDomainOrchestratorEngine.planJob({ features: DIE_PLATE });
      expect(plan.segments[0].setup_id).toBe("OP10");
      expect(plan.segments[1].setup_id).toBe("OP20");
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS array contains orch_multidomain_plan", () => {
      expect(intelligenceActions).toContain("orch_multidomain_plan");
    });

    it("ACTIONS array contains orch_multidomain_summarize", () => {
      expect(intelligenceActions).toContain("orch_multidomain_summarize");
    });

    it("ACTIONS array contains orch_multidomain_feature_map", () => {
      expect(intelligenceActions).toContain("orch_multidomain_feature_map");
    });
  });
});
