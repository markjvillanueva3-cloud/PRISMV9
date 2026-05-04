/**
 * aiReasoningDispatcher.crossProcessAI.test.ts — U-XPROC-AI-01 dispatcher tests
 *
 * Round-trip tests for the cross-process AI bridge dispatcher actions:
 *   - cross_process_ai_classify
 *   - cross_process_ai_orchestrate
 *
 * @see src/engines/CrossProcessAIBridge.ts
 * @see src/tools/dispatchers/aiReasoningDispatcher.ts
 */

import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("aiReasoningDispatcher cross-process AI bridge (U-XPROC-AI-01)", () => {
  // ===========================================================================
  // cross_process_ai_classify
  // ===========================================================================

  describe("cross_process_ai_classify", () => {
    it("classifies a milling intent as mill", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {
        intent: "make a pocket on the VMX mill in 4140",
      });
      expect(r.success).toBe(true);
      const data = r.data as { process: string; confidence: number };
      expect(data.process).toBe("mill");
      expect(data.confidence).toBeGreaterThan(0);
    });

    it("classifies a wire-EDM intent as wedm", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {
        intent: "wire EDM a tapered profile in D2 with 4 skim passes",
      });
      expect(r.success).toBe(true);
      const data = r.data as { process: string };
      expect(data.process).toBe("wedm");
    });

    it("classifies a turning intent as lathe", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {
        intent: "turn an external thread on a chuck-mounted shaft",
      });
      expect(r.success).toBe(true);
      const data = r.data as { process: string };
      expect(data.process).toBe("lathe");
    });

    it("respects explicit context.process override", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {
        intent: "ambiguous intent",
        process: "wedm",
      });
      expect(r.success).toBe(true);
      const data = r.data as { process: string; confidence: number };
      expect(data.process).toBe("wedm");
      expect(data.confidence).toBe(1.0);
    });

    it("biases on context.features when intent is ambiguous", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {
        intent: "make a part",
        features: ["groove_external"],
      });
      expect(r.success).toBe(true);
      const data = r.data as { process: string };
      expect(data.process).toBe("lathe");
    });

    it("rejects missing intent at dispatcher boundary", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", {});
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `intent`/);
    });

    it("propagates engine error for empty intent", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_classify", { intent: "" });
      expect(r.success).toBe(false);
      // Empty string fails the dispatcher boundary check (typeof === string OK
      // but empty), then engine throws non-empty.
      expect(String(r.error)).toMatch(/non-empty/);
    });
  });

  // ===========================================================================
  // cross_process_ai_orchestrate (dry_run mode)
  // ===========================================================================

  describe("cross_process_ai_orchestrate — dry_run", () => {
    it("dry-runs mill route from intent without invoking the orchestrator", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        intent: "make a pocket on the VMX mill in 4140",
        dry_run: true,
      });
      expect(r.success).toBe(true);
      const data = r.data as {
        dry_run: boolean;
        routed_to: string;
        classification: { process: string };
      };
      expect(data.dry_run).toBe(true);
      expect(data.classification.process).toBe("mill");
      expect(data.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
    });

    it("dry-runs lathe route with explicit process override", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        intent: "make something",
        process: "lathe",
        dry_run: true,
      });
      expect(r.success).toBe(true);
      const data = r.data as { routed_to: string; classification: { confidence: number } };
      expect(data.routed_to).toBe("LatheMasterOrchestratorFacadeEngine.orchestrate");
      expect(data.classification.confidence).toBe(1.0);
    });

    it("dry-runs wedm route from intent keywords", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        intent: "Mitsubishi MV1200R wire EDM 4-axis taper",
        dry_run: true,
      });
      expect(r.success).toBe(true);
      const data = r.data as { routed_to: string };
      expect(data.routed_to).toBe("WEDMCompleteOrchestrationEngine.generateCompleteProgram");
    });

    it("propagates engine error when missing intent", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        dry_run: true,
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/requires `intent`/);
    });

    it("propagates engine error when dispatching to mill but mill_request is missing", async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        intent: "make a pocket on the VMX mill",
        dry_run: false,
      });
      expect(r.success).toBe(false);
      expect(String(r.error)).toMatch(/mill_request/);
    });
  });

  // ===========================================================================
  // cross_process_ai_orchestrate (live mill route)
  // ===========================================================================

  describe("cross_process_ai_orchestrate — live mill route", () => {
    it("routes a wisdom-query through the mill facade and returns its provenance", { timeout: 30_000 }, async () => {
      const r = await executeAIReasoningAction("cross_process_ai_orchestrate", {
        intent: "wisdom query on milling",
        process: "mill",
        mill_request: {
          request_type: "wisdom",
          query: "how do I rough an aluminum pocket",
          domain: "milling",
        },
      });
      expect(r.success).toBe(true);
      const data = r.data as {
        dry_run: boolean;
        routed_to: string;
        orchestrator_response: { request_type: string; provenance: { request_type: string } };
      };
      expect(data.dry_run).toBe(false);
      expect(data.routed_to).toBe("MillMasterOrchestratorFacadeEngine.orchestrate");
      expect(data.orchestrator_response.request_type).toBe("wisdom");
      expect(data.orchestrator_response.provenance.request_type).toBe("wisdom");
    });
  });
});
