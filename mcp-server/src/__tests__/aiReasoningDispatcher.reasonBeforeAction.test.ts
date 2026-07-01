/**
 * Round-trip test for the prism_ai `reason_before_action` dispatcher action.
 *
 * Hermetic by construction: it exercises ONLY the engine's DETERMINISTIC paths
 * (low-risk -> PROCEED, kill-switch -> BLOCK) and the schema boundary, so it never
 * reaches the real Ollama consensus panel (the engine is lazy-imported by the
 * dispatcher and cannot be mocked through it). This verifies the WIRING -- the
 * action is in the enum, the schema validates, the case dispatches to the engine,
 * and the result round-trips through slimResponse -- not the consensus internals
 * (those are covered by ReasonBeforeActionEngine.test.ts).
 */

import { describe, it, expect, afterEach } from "vitest";
import { executeAIReasoningAction, ALL_AI_ACTIONS } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { corrigibilityGateEngine } from "../engines/CorrigibilityGateEngine.js";

afterEach(() => {
  corrigibilityGateEngine.acknowledgeKill(); // clear any raised kill switch
});

describe("prism_ai reason_before_action (round-trip)", () => {
  it("registers the action in ALL_AI_ACTIONS (no orphan)", () => {
    expect(ALL_AI_ACTIONS).toContain("reason_before_action");
  });

  it("round-trips a low-risk action to a deterministic PROCEED (no model call)", async () => {
    const res = await executeAIReasoningAction("reason_before_action", {
      intent: "read the config file",
      tool_name: "Read",
      tool_input: { file_path: "src/x.ts" },
    });
    expect(res.success).toBe(true);
    const data = res.data as { verdict: string; path: string; riskTier: string };
    expect(data.verdict).toBe("PROCEED");
    expect(data.path).toBe("deterministic");
    expect(data.riskTier).toBe("low");
  });

  it("honors the corrigibility kill switch through the dispatcher (BLOCK)", async () => {
    corrigibilityGateEngine.raiseKillSwitch();
    const res = await executeAIReasoningAction("reason_before_action", {
      intent: "read a file",
      tool_name: "Read",
      tool_input: { file_path: "x.ts" },
    });
    expect(res.success).toBe(true);
    const data = res.data as { verdict: string; path: string };
    expect(data.verdict).toBe("BLOCK");
    expect(data.path).toBe("session-gate");
  });

  it("rejects an empty intent at the schema boundary (validation error, not a crash)", async () => {
    const res = await executeAIReasoningAction("reason_before_action", { intent: "" });
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("strips unknown top-level params and still round-trips", async () => {
    const res = await executeAIReasoningAction("reason_before_action", {
      intent: "read",
      tool_name: "Read",
      tool_input: { file_path: "x.ts" },
      foo: 123,
    } as Record<string, unknown>);
    expect(res.success).toBe(true);
  });
});
