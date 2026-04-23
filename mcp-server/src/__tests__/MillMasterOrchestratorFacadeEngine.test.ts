/**
 * MillMasterOrchestratorFacadeEngine test suite
 * MILL-MASTER/P1-U10-FACADE-EXTEND
 *
 * Validates:
 *  - All 7 original routes still work
 *  - 12 new routes from P1-U10 dispatch correctly
 *  - Provenance fields populated
 *  - Failure modes (unknown type, missing fields)
 *  - Adversarial inputs (NaN, empty, oversize)
 *  - Variability floor: 3+ ISO groups, 3+ machine classes, 3+ kinematics
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  millMasterOrchestratorFacadeEngine,
  type MillOrchRequestType,
} from "../engines/MillMasterOrchestratorFacadeEngine.js";

describe("MillMasterOrchestratorFacadeEngine — P1-U10 Extended", () => {
  describe("Route Registration", () => {
    it("exposes 19 registered request types (7 original + 12 new)", () => {
      const types = millMasterOrchestratorFacadeEngine.getRequestTypes();
      expect(types.length).toBe(19);
    });

    it("all 7 original request types remain", () => {
      const original: MillOrchRequestType[] = [
        "print_to_program", "scientific", "agi", "validate", "quick", "wisdom", "adaptive",
      ];
      const types = millMasterOrchestratorFacadeEngine.getRequestTypes();
      original.forEach(t => expect(types).toContain(t));
    });

    it("all 12 new request types registered", () => {
      const added: MillOrchRequestType[] = [
        "ai_learning", "mill_turn", "five_axis", "multi_axis",
        "tribal_writeback", "pattern_sync", "blueprint_bridge", "model_load",
        "hive_sync", "customer_learn", "outcome_replan", "jmdie_refresh",
      ];
      const types = millMasterOrchestratorFacadeEngine.getRequestTypes();
      added.forEach(t => expect(types).toContain(t));
    });

    it("getSubOrchestrator returns handler for new routes", () => {
      const sub = millMasterOrchestratorFacadeEngine.getSubOrchestrator("ai_learning");
      expect(sub).toBeTruthy();
      expect(sub!.name).toBe("MillingAILearningOrchestratorEngine");
    });
  });

  describe("P1-U10: ai_learning route", () => {
    it("dispatches to AI/learning aggregator successfully", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "ai_learning",
        intent: "select roughing strategy",
      });
      expect(response.success).toBe(true);
      expect(response.request_type).toBe("ai_learning");
    });

    it("provenance records MillingAILearningOrchestratorEngine invocation", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "ai_learning",
        intent: "test",
      });
      expect(response.provenance.engines_invoked).toContain("MillingAILearningOrchestratorEngine");
    });
  });

  describe("P1-U10: mill_turn route", () => {
    const classes = ["integrex", "swiss", "lb_series"];
    it.each(classes)("dispatches for machine_class=%s", async (cls) => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "mill_turn",
        ...({ machine_class: cls } as any),
      });
      expect(response.success).toBe(true);
    });
  });

  describe("P1-U10: five_axis route", () => {
    const kinematics = ["head_head", "head_table", "table_table"];
    it.each(kinematics)("dispatches for kinematics=%s", async (kin) => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "five_axis",
        ...({ kinematics: kin } as any),
      });
      expect(response.success).toBe(true);
    });
  });

  describe("P1-U10: multi_axis route", () => {
    const axes = [4, 5, 6];
    it.each(axes)("dispatches for axis_count=%i", async (n) => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "multi_axis",
        ...({ axis_count: n } as any),
      });
      expect(response.success).toBe(true);
    });
  });

  describe("P1-U10: tribal_writeback route", () => {
    it("writes tip with review flag", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "tribal_writeback",
        query: "Use climb milling on 4140 when hardness > 32 HRC",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.status).toBe("queued_for_review");
      expect(result.review_required).toBe(true);
      expect(result.tip_id).toMatch(/^TIP_\d+/);
    });
  });

  describe("P1-U10: pattern_sync route", () => {
    it("reports patterns synced", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "pattern_sync",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(typeof result.patterns_synced).toBe("number");
      expect(result.patterns_synced).toBeGreaterThan(0);
    });
  });

  describe("P1-U10: blueprint_bridge route", () => {
    it("reports feature extraction details", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "blueprint_bridge",
        features: [{ id: "F1", type: "pocket" }, { id: "F2", type: "hole" }],
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.features_extracted).toBe(2);
      expect(result.ready_for_program).toBe(true);
    });
  });

  describe("P1-U10: model_load route", () => {
    it("returns loaded status with model metadata", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "model_load",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.status).toBe("loaded");
      expect(typeof result.parameter_count).toBe("number");
    });
  });

  describe("P1-U10: hive_sync route", () => {
    it("returns sync details", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "hive_sync",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.memory_graph_updated).toBe(true);
      expect(result.ts).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("P1-U10: customer_learn route", () => {
    it("records customer outcome", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "customer_learn",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.customer).toBe("JM_DIE");
      expect(typeof result.confidence_delta).toBe("number");
    });
  });

  describe("P1-U10: outcome_replan route", () => {
    it("returns new plan with modifications", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "outcome_replan",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.new_plan.strategy).toBeTruthy();
      expect(Array.isArray(result.new_plan.modifications)).toBe(true);
      expect(result.replan_confidence).toBeGreaterThan(0);
    });
  });

  describe("P1-U10: jmdie_refresh route", () => {
    it("reports JM Die fleet metrics", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "jmdie_refresh",
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.customers).toBeGreaterThanOrEqual(100);
      expect(result.programs).toBeGreaterThan(20000);
      expect(result.machines).toBe(21);
    });
  });

  describe("P1-U11 AUTO-TRIBAL: print_to_program defaults include_tribal=true", () => {
    it("print_to_program defaults include_tribal to true", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
      });
      const result = response.result as any;
      expect(result.include_tribal).toBe(true);
      expect(Array.isArray(result.tribal_tips)).toBe(true);
      expect(result.tribal_tips.length).toBeGreaterThan(0);
    });

    it("explicit include_tribal=false respected", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
        ...({ include_tribal: false } as any),
      });
      const result = response.result as any;
      expect(result.include_tribal).toBe(false);
    });

    it("tribal tips vary with ISO material group", async () => {
      const respP = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
        iso_group: "P",
      });
      const respN = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "print_to_program",
        iso_group: "N",
      });
      const tipsP = (respP.result as any).tribal_tips.join(" ");
      const tipsN = (respN.result as any).tribal_tips.join(" ");
      expect(tipsP).toContain("ISO P");
      expect(tipsN).toContain("ISO N");
    });
  });

  describe("Failure Modes", () => {
    it("unknown request_type returns success=false", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "bogus" as any,
      });
      expect(response.success).toBe(false);
      expect(response.warnings[0]).toMatch(/unknown/i);
    });

    it("empty request still returns valid response structure", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "quick",
      });
      expect(response.provenance.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("pattern_sync handles missing dataset gracefully", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "pattern_sync",
      });
      const result = response.result as any;
      expect(result.dataset).toBe("jm_die");
    });
  });

  describe("Adversarial Inputs", () => {
    it("handles empty intent on ai_learning", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "ai_learning",
        intent: "",
      });
      expect(response.request_type).toBe("ai_learning");
    });

    it("handles very long intent on ai_learning", async () => {
      const longIntent = "optimize ".repeat(1000);
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "ai_learning",
        intent: longIntent,
      });
      expect(response.success).toBe(true);
    });

    it("handles unexpected field on facade request", async () => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "jmdie_refresh",
        ...({ garbage: NaN, junk: Infinity } as any),
      });
      expect(response.success).toBe(true);
    });
  });

  describe("ISO Group Variability", () => {
    const groups: Array<"P" | "M" | "N"> = ["P", "M", "N"];
    it.each(groups)("scientific route computes for iso_group=%s", async (iso) => {
      const response = await millMasterOrchestratorFacadeEngine.orchestrate({
        request_type: "scientific",
        iso_group: iso,
        tool: { diameter_mm: 10, flutes: 4 },
        params: { rpm: 8000, feed_mmpm: 1200, doc_mm: 2 },
      });
      expect(response.success).toBe(true);
      const result = response.result as any;
      expect(result.Fc_N).toBeGreaterThan(0);
    });
  });
});
