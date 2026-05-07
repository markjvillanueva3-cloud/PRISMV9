/**
 * WEDM Engine Registry Sync Tests
 * P2P-FULLSTACK-MS0/U-P2PFS05: Verify registry actions match runtime class methods
 */
import { describe, it, expect } from "vitest";
import { WEDM_ENGINE_REGISTRY } from "../data/wedm-engine-registry.js";
import { wireEDMAIPrintToProgramEngine } from "../engines/WireEDMAIPrintToProgramEngine.js";

describe("wedm-engine-registry sync", () => {
  describe("WireEDMAIPrintToProgramEngine", () => {
    it("registry entry exists", () => {
      const entry = WEDM_ENGINE_REGISTRY.find(e => e.name === "WireEDMAIPrintToProgramEngine");
      expect(entry).toBeDefined();
    });

    it("registry actions match runtime methods", () => {
      const entry = WEDM_ENGINE_REGISTRY.find(e => e.name === "WireEDMAIPrintToProgramEngine");
      expect(entry).toBeDefined();

      const runtimeMethods = [
        "generate",
        "quickPredictMRR",
        "quickPredictRa",
        "explainCausalEffect",
        "getCounterfactuals",
      ];

      for (const action of entry!.actions) {
        expect(runtimeMethods).toContain(action);
        expect(typeof (wireEDMAIPrintToProgramEngine as any)[action]).toBe("function");
      }
    });

    it("no stale actions in registry", () => {
      const entry = WEDM_ENGINE_REGISTRY.find(e => e.name === "WireEDMAIPrintToProgramEngine");
      expect(entry).toBeDefined();

      const staleActions = ["recognizeFeatures", "interpretTolerances"];
      for (const stale of staleActions) {
        expect(entry!.actions).not.toContain(stale);
      }
    });

    it("registry has correct capabilities", () => {
      const entry = WEDM_ENGINE_REGISTRY.find(e => e.name === "WireEDMAIPrintToProgramEngine");
      expect(entry).toBeDefined();

      expect(entry!.capabilities).toContain("cam");
      expect(entry!.capabilities).toContain("ai");
      expect(entry!.capabilities).toContain("reasoning");
    });
  });
});
