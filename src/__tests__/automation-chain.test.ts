/**
 * AutomationChainEngine Tests — ACP-MS0A / ACP-MS1
 */
import { describe, it, expect } from "vitest";
import { automationChainEngine } from "../engines/AutomationChainEngine.js";

describe("AutomationChainEngine", () => {

  describe("classify — task classification", () => {
    it("backend: engine/dispatcher work", () => {
      const r = automationChainEngine.classify("fix the typescript error in SpeedFeedOrchestratorEngine");
      expect(r.task_class).toBe("backend");
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.chain_id).toBe("chain-backend");
    });

    it("web: React frontend work", () => {
      const r = automationChainEngine.classify("update the React calculator page component with tailwind styling");
      expect(r.task_class).toBe("web");
    });

    it("cad_python: CAD engine work", () => {
      const r = automationChainEngine.classify("modify the CadQuery sketch to add a parametric hole pattern");
      expect(r.task_class).toBe("cad_python");
    });

    it("roadmap: milestone/session work", () => {
      const r = automationChainEngine.classify("continue the roadmap, pick next milestone to work on");
      expect(r.task_class).toBe("roadmap");
    });

    it("audit: quality/review work", () => {
      const r = automationChainEngine.classify("run a quality audit on the omega score and svi coverage");
      expect(r.task_class).toBe("audit");
    });

    it("speed_feed: physics calculations", () => {
      const r = automationChainEngine.classify("calculate the optimal speed and feed for aluminum with 4 flute endmill, check chip load");
      expect(r.task_class).toBe("speed_feed");
    });

    it("post_process: G-code work", () => {
      const r = automationChainEngine.classify("post process this G-code for a Fanuc controller with per-block speed optimization");
      expect(r.task_class).toBe("post_process");
    });

    it("erp: business/quoting", () => {
      const r = automationChainEngine.classify("generate a quote estimate for 500 parts with shipping cost and lead time");
      expect(r.task_class).toBe("erp");
    });

    it("general: unclassified prompt", () => {
      const r = automationChainEngine.classify("hello how are you today");
      expect(r.task_class).toBe("general");
      expect(r.confidence).toBe(0);
    });

    it("returns context bundles for classified task", () => {
      const r = automationChainEngine.classify("fix the engine import export in typescript");
      expect(r.context_bundles.length).toBeGreaterThan(0);
      expect(r.context_bundles[0]).toHaveProperty("files");
      expect(r.context_bundles[0]).toHaveProperty("token_cost_estimate");
    });

    it("token budget assigned per class", () => {
      const sf = automationChainEngine.classify("calculate speed and feed");
      const backend = automationChainEngine.classify("fix the typescript engine build");
      expect(sf.token_budget).toBeGreaterThan(0);
      expect(backend.token_budget).toBeGreaterThanOrEqual(sf.token_budget);
    });
  });

  describe("getChain — chain resolution", () => {
    it("returns full chain for backend", () => {
      const chain = automationChainEngine.getChain("backend");
      expect(chain.id).toBe("chain-backend");
      expect(chain.tier).toBe("critical");
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.context_bundles.length).toBeGreaterThan(0);
    });

    it("speed_feed chain is critical tier", () => {
      const chain = automationChainEngine.getChain("speed_feed");
      expect(chain.tier).toBe("critical");
      expect(chain.fail_behavior).toBe("fail_closed");
    });

    it("post_process chain has safety verification step", () => {
      const chain = automationChainEngine.getChain("post_process");
      const safetyStep = chain.steps.find(s => s.action === "safety_check");
      expect(safetyStep).toBeDefined();
      expect(safetyStep!.required).toBe(true);
    });

    it("backend chain has typecheck step", () => {
      const chain = automationChainEngine.getChain("backend");
      const tscStep = chain.steps.find(s => s.action === "run_tsc");
      expect(tscStep).toBeDefined();
      expect(tscStep!.required).toBe(true);
    });

    it("general chain has no steps (pass-through)", () => {
      const chain = automationChainEngine.getChain("general");
      expect(chain.steps.length).toBe(0);
    });
  });

  describe("listChains — enumeration", () => {
    it("lists all 9 chains", () => {
      const chains = automationChainEngine.listChains();
      expect(chains.length).toBe(9);
    });

    it("every chain has id, class, tier, budget", () => {
      const chains = automationChainEngine.listChains();
      for (const c of chains) {
        expect(c.id).toBeTruthy();
        expect(c.task_class).toBeTruthy();
        expect(c.tier).toBeTruthy();
        expect(c.token_budget).toBeGreaterThan(0);
      }
    });
  });

  describe("telemetry events", () => {
    it("creates well-formed telemetry event", () => {
      const event = automationChainEngine.createTelemetryEvent(
        "chain-backend", "typecheck", "completed", 150, 2500
      );
      expect(event.chain_id).toBe("chain-backend");
      expect(event.step_id).toBe("typecheck");
      expect(event.status).toBe("completed");
      expect(event.token_cost).toBe(150);
      expect(event.latency_ms).toBe(2500);
      expect(event.timestamp).toBeTruthy();
    });

    it("includes error on failure", () => {
      const event = automationChainEngine.createTelemetryEvent(
        "chain-sf", "compute", "failed", 0, 100, "Engine not found"
      );
      expect(event.error).toBe("Engine not found");
    });
  });
});
