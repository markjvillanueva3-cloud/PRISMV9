/**
 * WEDM SVI Hooks Tests — Phase 0.10 of WEDM AGI Roadmap
 */

import { describe, it, expect } from "vitest";
import { wedmSVIHooks } from "../../hooks/WEDMSVIHooks.js";
import type { HookContext } from "../../engines/HookExecutor.js";

function createContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    target: { action: "", data: {} },
    session: { userId: "test-user" },
    ...overrides,
  } as HookContext;
}

describe("WEDM SVI Hooks", () => {
  it("exports 2 SVI hooks", () => {
    expect(wedmSVIHooks).toHaveLength(2);
  });

  describe("wedm-svi-inject", () => {
    const injectHook = wedmSVIHooks.find((h) => h.id === "wedm-svi-inject")!;

    it("exists and has session-start phase", () => {
      expect(injectHook).toBeDefined();
      expect(injectHook.phase).toBe("session-start");
      expect(injectHook.mode).toBe("logging");
    });

    it("returns Psi contribution without blocking", () => {
      const ctx = createContext();
      const result = injectHook.handler(ctx);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain("Ψ");
    });
  });

  describe("wedm-svi-milestone-gate", () => {
    const gateHook = wedmSVIHooks.find((h) => h.id === "wedm-svi-milestone-gate")!;

    it("exists and is a blocking hook", () => {
      expect(gateHook).toBeDefined();
      expect(gateHook.mode).toBe("blocking");
    });

    it("blocks milestone with zero Psi delta", () => {
      const ctx = createContext({
        target: { action: "wedm_milestone_complete", data: { psiDelta: 0 } },
      });
      const result = gateHook.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("blocks milestone with negative Psi delta", () => {
      const ctx = createContext({
        target: { action: "wedm_milestone_complete", data: { psiDelta: -0.01 } },
      });
      const result = gateHook.handler(ctx);
      expect(result.blocked).toBe(true);
    });

    it("accepts milestone with significant Psi delta", () => {
      const ctx = createContext({
        target: { action: "wedm_milestone_complete", data: { psiDelta: 0.02 } },
      });
      const result = gateHook.handler(ctx);
      expect(result.blocked).toBe(false);
    });

    it("skips non-milestone actions", () => {
      const ctx = createContext({
        target: { action: "wedm_predict_mrr", data: {} },
      });
      const result = gateHook.handler(ctx);
      expect(result.blocked).toBe(false);
    });
  });
});
