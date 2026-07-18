/**
 * AI Dispatcher — `consensus_escalate` action
 * ===========================================
 * Tests for INFRA-CONSENSUS-WIRE-MS0 / P0-U03.
 *
 * Exercises the dispatcher round-trip: dispatcher → ConsensusCoordinatorEngine
 * .runWithEscalation → MultiModelConsensusEngine.ask. The engine module is
 * vi-mocked so the external fan-out is scripted — the SUT under test is the
 * dispatcher routing + the coordinator's retry/escalation policy, not the
 * model fan-out itself. (consensus is not a critical-domain SUT.)
 *
 * @module __tests__/AIDispatcherConsensusEscalate
 * @milestone INFRA-CONSENSUS-WIRE-MS0/P0-U03
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConsensusResult } from "../engines/MultiModelConsensusEngine.js";

// Mock the consensus engine so runWithEscalation's fan-out is scripted.
vi.mock("../engines/MultiModelConsensusEngine.js", () => ({
  multiModelConsensusEngine: { ask: vi.fn() },
}));

import { multiModelConsensusEngine } from "../engines/MultiModelConsensusEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { ACTION_AI_REASONING_SCHEMAS, AI_REASONING_ACTIONS } from "../schemas/aiReasoningActionSchemas.js";

const mockedAsk = vi.mocked(multiModelConsensusEngine.ask);

function mkResult(agreementScore: number, successCount: number): ConsensusResult {
  return {
    ok: successCount > 0,
    mode: "compare",
    responses: [
      { model: "claude", vendor: "anthropic", ok: successCount > 0, answer: "ans", latencyMs: 1000, tokens: 40, error: null },
      { model: "gpt-5.5", vendor: "openai", ok: successCount > 1, answer: "ans", latencyMs: 1500, tokens: 50, error: null },
    ],
    successCount,
    agreementScore,
    consensus: successCount > 0 ? { answer: "ans", voters: ["claude"], confidence: agreementScore } : null,
    recommendation: agreementScore >= 0.70 ? "accept" : agreementScore >= 0.40 ? "review" : "escalate",
    totalLatencyMs: 1500,
    factCheck: {},
  };
}

describe("aiReasoningDispatcher — consensus_escalate (P0-U03)", () => {
  beforeEach(() => {
    mockedAsk.mockReset();
  });

  describe("action surface", () => {
    it("consensus_escalate is registered in AI_REASONING_ACTIONS", () => {
      expect(AI_REASONING_ACTIONS.includes("consensus_escalate")).toBe(true);
    });

    it("consensus_escalate has a strict schema that validates prompt + rejects bad inputs", () => {
      const schema = ACTION_AI_REASONING_SCHEMAS.consensus_escalate;
      expect(schema.parse({ prompt: "valid question" })).toEqual({ prompt: "valid question" });
      expect(() => schema.parse({ prompt: "" })).toThrow();
      expect(() => schema.parse({ prompt: "q", maxRetries: 99 })).toThrow();
      expect(() => schema.parse({ prompt: "q", agreementThreshold: 1.5 })).toThrow();
      expect(() => schema.parse({ prompt: "q", bogus: 1 })).toThrow();
    });
  });

  describe("dispatcher round-trip", () => {
    it("first-attempt acceptance: high agreement → kind=accepted, escalated=false, 1 ask call", async () => {
      mockedAsk.mockResolvedValue(mkResult(0.95, 2));
      const res = (await executeAIReasoningAction("consensus_escalate", {
        prompt: "best roughing strategy for Ti-6Al-4V",
        agreementThreshold: 0.70,
      })) as { success: boolean; data: { kind: string; escalated?: boolean; attempts: unknown[] } };
      expect(res.success).toBe(true);
      expect(res.data.kind).toBe("accepted");
      expect(res.data.escalated).toBe(false);
      expect(res.data.attempts).toHaveLength(1);
      expect(mockedAsk).toHaveBeenCalledTimes(1);
    });

    it("escalation path: persistently low agreement → kind=human_review_required, 3 ask calls", async () => {
      mockedAsk.mockResolvedValue(mkResult(0.30, 2));
      const res = (await executeAIReasoningAction("consensus_escalate", {
        prompt: "ambiguous post-processor pick",
        agreementThreshold: 0.70,
        maxRetries: 1,
      })) as { success: boolean; data: { kind: string; attempts: unknown[] } };
      expect(res.success).toBe(true);
      expect(res.data.kind).toBe("human_review_required");
      expect(res.data.attempts).toHaveLength(3);
      expect(mockedAsk).toHaveBeenCalledTimes(3);
    });

    it("escalated attempt bumps Codex effort to xhigh on the 3rd ask call only", async () => {
      mockedAsk.mockResolvedValue(mkResult(0.20, 1));
      await executeAIReasoningAction("consensus_escalate", {
        prompt: "needs escalation",
        agreementThreshold: 0.70,
        maxRetries: 1,
      });
      expect(mockedAsk).toHaveBeenCalledTimes(3);
      expect(mockedAsk.mock.calls[2]?.[0]?.codexEffort).toBe("xhigh");
      expect(mockedAsk.mock.calls[0]?.[0]?.codexEffort).toBe(undefined);
      expect(mockedAsk.mock.calls[1]?.[0]?.codexEffort).toBe(undefined);
    });

    it("retry-then-accept: low then high → kind=accepted, escalated=false, 2 ask calls", async () => {
      mockedAsk
        .mockResolvedValueOnce(mkResult(0.35, 2))
        .mockResolvedValueOnce(mkResult(0.85, 2));
      const res = (await executeAIReasoningAction("consensus_escalate", {
        prompt: "retry succeeds second time",
        agreementThreshold: 0.70,
        maxRetries: 1,
      })) as { success: boolean; data: { kind: string; escalated?: boolean } };
      expect(res.data.kind).toBe("accepted");
      expect(res.data.escalated).toBe(false);
      expect(mockedAsk).toHaveBeenCalledTimes(2);
    });

    it("forwards context + callerEngine to the consensus input", async () => {
      mockedAsk.mockResolvedValue(mkResult(0.95, 2));
      await executeAIReasoningAction("consensus_escalate", {
        prompt: "tagged call",
        context: "the caller context",
        callerEngine: "LatheAGIMasterEngine",
        agreementThreshold: 0.70,
      });
      expect(mockedAsk.mock.calls[0]?.[0]?.context).toBe("the caller context");
      expect(mockedAsk.mock.calls[0]?.[0]?.callerEngine).toBe("LatheAGIMasterEngine");
    });
  });
});
