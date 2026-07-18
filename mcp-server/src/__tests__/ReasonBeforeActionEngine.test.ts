/**
 * Tests for ReasonBeforeActionEngine -- the reason-before-action control-plane core.
 *
 * Coverage: the pure risk classifier (all 3 tiers + adversarial), the vote parser,
 * and the engine's plan() routing + the safety invariants a fleet-wide reasoner
 * MUST hold:
 *   - FAIL-OPEN on every fault (throw / infra-down / null consensus / unparseable),
 *   - CORROBORATED-BLOCK (C5): a weak/thinly-voiced BLOCK softens to REVISE,
 *   - $0 / LOCAL-ONLY: all cloud voice flags are false (structural assertion),
 *   - NO-RECURSION: the in-flight sentinel + PRISM_LOCAL_LLM_VIA_MCP=0,
 *   - the corrigibility kill-switch short-circuit (reuse, not replicate),
 *   - the promote-only risk ratchet, and the cloud-voice circuit breaker.
 *
 * The consensus backend is injected (opts.consensusFn) so no test ever spawns a
 * real model -- the suite is hermetic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyActionRisk,
  parseVote,
  reasonBeforeActionEngine,
  ReasonBeforeActionEngine,
  REASON_GATE_INFLIGHT_ENV,
  LOCAL_LLM_VIA_MCP_ENV,
  REVIEW_AGREEMENT_FLOOR,
  rbaPinnedModels,
  RBA_PRIMARY_OLLAMA_MODEL_DEFAULT,
  RBA_SECONDARY_OLLAMA_MODEL_DEFAULT,
  RBA_OLLAMA_MODEL_ENV,
  RBA_OLLAMA_MODEL_2_ENV,
  RBA_VOTE_MAX_TOKENS,
  type RBAPlanInput,
} from "../engines/ReasonBeforeActionEngine.js";
import { corrigibilityGateEngine } from "../engines/CorrigibilityGateEngine.js";
import type { ConsensusInput, ConsensusResult, ModelResponse } from "../engines/MultiModelConsensusEngine.js";

// --- helper: build a valid ConsensusResult without touching real models ---------
function makeResult(opts: {
  ok?: boolean;
  answer?: string | null;
  agreement?: number;
  voters?: string[];
  confidence?: number;
  consensusNull?: boolean;
  successCount?: number;
  responses?: ModelResponse[];
} = {}): ConsensusResult {
  const {
    ok = true,
    answer = "PROCEED",
    agreement = 0.9,
    voters = ["gpt-oss:120b", "qwen2.5-coder:32b"],
    confidence = 0.8,
    consensusNull = false,
    successCount = voters.length,
    responses,
  } = opts;
  const built: ModelResponse[] =
    responses ??
    voters.map((m) => ({ model: m, vendor: "ollama", ok: true, answer: answer ?? "", latencyMs: 1, tokens: null, error: null }));
  return {
    ok,
    mode: "vote",
    responses: built,
    successCount,
    agreementScore: agreement,
    consensus: consensusNull ? null : { answer: answer ?? "", voters, confidence },
    recommendation: agreement >= 0.7 ? "accept" : agreement >= 0.4 ? "review" : "escalate",
    totalLatencyMs: 5,
    factCheck: {},
  };
}

beforeEach(() => {
  ReasonBeforeActionEngine.__resetCircuitBreaker();
});

afterEach(() => {
  delete process.env[REASON_GATE_INFLIGHT_ENV];
  delete process.env[LOCAL_LLM_VIA_MCP_ENV];
  corrigibilityGateEngine.acknowledgeKill(); // clear any raised kill switch
  ReasonBeforeActionEngine.__resetCircuitBreaker();
  vi.restoreAllMocks();
});

// ===========================================================================
// classifyActionRisk -- pure, no I/O
// ===========================================================================
describe("classifyActionRisk", () => {
  it("flags HIGH for a recursive force delete in the command", () => {
    const r = classifyActionRisk({ intent: "clean build", tool_name: "Bash", tool_input: { command: "rm -rf ./build" } });
    expect(r.tier).toBe("high");
    expect(r.reasons.join(" ")).toMatch(/recursive force delete/);
  });

  it("flags HIGH for git force-push", () => {
    expect(classifyActionRisk({ intent: "push", tool_name: "Bash", tool_input: { command: "git push origin main --force" } }).tier).toBe("high");
  });

  it("flags HIGH for destructive SQL", () => {
    expect(classifyActionRisk({ intent: "x", tool_name: "Bash", tool_input: { command: "psql -c 'DROP TABLE users'" } }).tier).toBe("high");
  });

  it("flags HIGH for a credential assignment in content", () => {
    expect(classifyActionRisk({ intent: "write", tool_name: "Write", tool_input: { content: "API_KEY = PLACEHOLDER_NOT_A_REAL_KEY" } }).tier).toBe("high");
  });

  it("flags HIGH for G-code emission (M30 program end)", () => {
    expect(classifyActionRisk({ intent: "post", tool_name: "Bash", tool_input: { command: "echo 'G01 X1 Y2 F100\nM30'" } }).tier).toBe("high");
  });

  it("flags HIGH for --no-verify (bypasses git hooks)", () => {
    expect(classifyActionRisk({ intent: "commit", tool_name: "Bash", tool_input: { command: "git commit --no-verify -m x" } }).tier).toBe("high");
  });

  it("flags MEDIUM for a mutating editor tool", () => {
    const r = classifyActionRisk({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "src/foo.ts" } });
    expect(r.tier).toBe("medium");
    expect(r.reasons.join(" ")).toMatch(/mutating tool/);
  });

  it("flags MEDIUM for a git commit payload on a generic tool", () => {
    expect(classifyActionRisk({ intent: "commit", tool_name: "Bash", tool_input: { command: 'git commit -m "x"' } }).tier).toBe("medium");
  });

  it("flags LOW for read-only tools", () => {
    expect(classifyActionRisk({ intent: "read", tool_name: "Read", tool_input: { file_path: "a.ts" } }).tier).toBe("low");
    expect(classifyActionRisk({ intent: "search", tool_name: "Grep", tool_input: { pattern: "x" } }).tier).toBe("low");
  });

  it("defaults an UNKNOWN tool with no destructive signal to MEDIUM", () => {
    const r = classifyActionRisk({ intent: "do a thing", tool_name: "SomeNovelTool" });
    expect(r.tier).toBe("medium");
    expect(r.reasons.join(" ")).toMatch(/unknown tool/i);
  });

  // --- adversarial ---
  it("handles an empty intent object without throwing", () => {
    const r = classifyActionRisk({ intent: "" } as RBAPlanInput);
    expect(r.tier).toBe("medium");
    expect(r.reasons.join(" ")).toMatch(/\(empty\)/);
  });

  it("handles an undefined input without throwing", () => {
    expect(() => classifyActionRisk(undefined as unknown as RBAPlanInput)).not.toThrow();
    expect(classifyActionRisk(undefined as unknown as RBAPlanInput).tier).toBe("medium");
  });

  it("handles non-string tool_input fields without throwing", () => {
    const r = classifyActionRisk({ intent: "x", tool_name: "Bash", tool_input: { command: 42 as unknown as string, count: 3 } });
    expect(["low", "medium", "high"]).toContain(r.tier);
  });

  it("handles an oversize command without throwing", () => {
    const big = "x".repeat(2_000_000) + " rm -rf /";
    const r = classifyActionRisk({ intent: "x", tool_name: "Bash", tool_input: { command: big } });
    expect(r.tier).toBe("high");
  });
});

// ===========================================================================
// parseVote
// ===========================================================================
describe("parseVote", () => {
  it("parses each verdict token", () => {
    expect(parseVote("PROCEED")).toBe("PROCEED");
    expect(parseVote("revise this")).toBe("REVISE");
    expect(parseVote("BLOCK")).toBe("BLOCK");
  });

  it("gives BLOCK precedence over an embedded PROCEED", () => {
    expect(parseVote("do not proceed, BLOCK it")).toBe("BLOCK");
  });

  it("returns null for an answer with no verdict token", () => {
    expect(parseVote("banana split")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseVote(undefined)).toBeNull();
    expect(parseVote(null)).toBeNull();
    expect(parseVote(123 as unknown as string)).toBeNull();
  });
});

// ===========================================================================
// plan() -- routing + safety invariants
// ===========================================================================
describe("ReasonBeforeActionEngine.plan", () => {
  it("corrigibility kill switch short-circuits to BLOCK with no model call", async () => {
    const spy = vi.fn<[ConsensusInput], Promise<ConsensusResult>>();
    corrigibilityGateEngine.raiseKillSwitch();
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn: spy });
    expect(v.verdict).toBe("BLOCK");
    expect(v.path).toBe("session-gate");
    expect(spy).not.toHaveBeenCalled();
  });

  it("low-risk: deterministic PROCEED with ZERO model calls", async () => {
    const spy = vi.fn<[ConsensusInput], Promise<ConsensusResult>>();
    const v = await reasonBeforeActionEngine.plan({ intent: "read", tool_name: "Read", tool_input: { file_path: "a.ts" } }, { consensusFn: spy });
    expect(v.verdict).toBe("PROCEED");
    expect(v.riskTier).toBe("low");
    expect(v.path).toBe("deterministic");
    expect(v.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("medium-risk: $0 LOCAL-ONLY 2-model vote -> PROCEED (all cloud flags OFF)", async () => {
    let captured: ConsensusInput | null = null;
    const consensusFn = vi.fn(async (i: ConsensusInput) => {
      captured = i;
      return makeResult({ answer: "PROCEED", agreement: 0.9, successCount: 2 });
    });
    const v = await reasonBeforeActionEngine.plan(
      { intent: "tweak a const", tool_name: "Edit", tool_input: { file_path: "src/x.ts" } },
      { consensusFn },
    );
    expect(v.verdict).toBe("PROCEED");
    expect(v.riskTier).toBe("medium");
    expect(v.path).toBe("fast-path");
    // $0 / local-only structural proof -- every cloud voice OFF regardless of input.
    expect(captured!.includeClaude).toBe(false);
    expect(captured!.includeCodex).toBe(false);
    expect(captured!.includeGrok).toBe(false);
    expect(captured!.includeGemini).toBe(false);
    expect(captured!.includeDeepSeek).toBe(false);
    expect(captured!.includeGLM).toBe(false);
    expect(captured!.dualOllama).toBe(true);
    expect(captured!.prismContext).toBe(false);
    expect(captured!.persist).toBe(false);
    expect(captured!.mode).toBe("vote");
    // PINNED fast models -- NOT the heavy consensus default (gpt-oss:120b/qwen-32b) that
    // would make the gate fail-open under the latency cap (the structural no-op bug).
    expect(captured!.ollamaModel).toBe(RBA_PRIMARY_OLLAMA_MODEL_DEFAULT);
    expect(captured!.secondaryOllamaModel).toBe(RBA_SECONDARY_OLLAMA_MODEL_DEFAULT);
    expect(captured!.ollamaModel).not.toMatch(/gpt-oss|120b|:32b/);
    // Tiny output cap so a one-word vote can't spend seconds rambling.
    expect(captured!.ollamaMaxTokens).toBe(RBA_VOTE_MAX_TOKENS);
    expect(RBA_VOTE_MAX_TOKENS).toBeLessThanOrEqual(64);
    expect(v.raw).toBeUndefined(); // PROCEED -> no raw attached (token discipline)
  });

  it("high-risk: 2-voice corroborated vote (NOT a 3-voice panel that blows the serialized budget); a corroborated BLOCK is honored", async () => {
    let captured: ConsensusInput | null = null;
    const consensusFn = vi.fn(async (i: ConsensusInput) => {
      captured = i;
      return makeResult({ answer: "BLOCK", agreement: 0.85, successCount: 2, voters: [RBA_PRIMARY_OLLAMA_MODEL_DEFAULT, RBA_SECONDARY_OLLAMA_MODEL_DEFAULT] });
    });
    const v = await reasonBeforeActionEngine.plan(
      { intent: "force push", tool_name: "Bash", tool_input: { command: "git push --force origin main" } },
      { consensusFn },
    );
    expect(v.verdict).toBe("BLOCK");
    expect(v.riskTier).toBe("high");
    expect(v.path).toBe("full-octopus");
    // High-risk uses the SAME fast 2-voice dual path as medium (voices serialize on one
    // GPU, so a 3rd voice only adds latency); it differs by a longer timeout, not more voices.
    expect(captured!.dualOllama).toBe(true);
    expect(captured!.ollamaModel).toBe(RBA_PRIMARY_OLLAMA_MODEL_DEFAULT);
    expect(captured!.secondaryOllamaModel).toBe(RBA_SECONDARY_OLLAMA_MODEL_DEFAULT);
    expect(captured!.ollamaMaxTokens).toBe(RBA_VOTE_MAX_TOKENS);
    expect(captured!.includeClaude).toBe(false);
    expect(v.raw).toBeDefined(); // BLOCK -> raw attached
  });

  it("rbaPinnedModels: env overrides win; default is NOT a heavy model", () => {
    const def = rbaPinnedModels({} as NodeJS.ProcessEnv);
    expect(def.primary).toBe(RBA_PRIMARY_OLLAMA_MODEL_DEFAULT);
    expect(def.secondary).toBe(RBA_SECONDARY_OLLAMA_MODEL_DEFAULT);
    // The whole bug was a heavy default -> assert the defaults are small/fast (no 120b/32b).
    expect(def.primary).not.toMatch(/gpt-oss|120b|:32b/);
    expect(def.secondary).not.toMatch(/gpt-oss|120b|:32b/);
    // Env override (a host with different fast models pins its own).
    const over = rbaPinnedModels({ [RBA_OLLAMA_MODEL_ENV]: "modelA:7b", [RBA_OLLAMA_MODEL_2_ENV]: "modelB:8b" } as NodeJS.ProcessEnv);
    expect(over.primary).toBe("modelA:7b");
    expect(over.secondary).toBe("modelB:8b");
  });

  // --- C5: corroborated-block guard ---
  it("softens a BLOCK to REVISE when too few voices corroborated", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "BLOCK", agreement: 0.9, successCount: 1, voters: ["gpt-oss:120b"] }));
    const v = await reasonBeforeActionEngine.plan(
      { intent: "force push", tool_name: "Bash", tool_input: { command: "git push --force" } },
      { consensusFn },
    );
    expect(v.verdict).toBe("REVISE");
    expect(v.rationale).toMatch(/insufficient corroboration/);
  });

  it("softens a BLOCK to REVISE when agreement is below the confirm floor", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "BLOCK", agreement: 0.5, successCount: 3 }));
    const v = await reasonBeforeActionEngine.plan(
      { intent: "force push", tool_name: "Bash", tool_input: { command: "git push --force" } },
      { consensusFn },
    );
    expect(v.verdict).toBe("REVISE");
  });

  it("downgrades a PROCEED to REVISE when the panel disagreed", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "PROCEED", agreement: REVIEW_AGREEMENT_FLOOR - 0.1, successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(v.verdict).toBe("REVISE");
  });

  // --- promote-only risk ratchet ---
  it("promotes the tier from a caller hint but never demotes a classified HIGH", async () => {
    // classifier says HIGH (rm -rf); a caller hint of "low" must NOT demote it.
    const consensusFn = vi.fn(async () => makeResult({ answer: "PROCEED", agreement: 0.9, successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan(
      { intent: "x", tool_name: "Bash", tool_input: { command: "rm -rf /tmp/x" }, risk_level: "low" },
      { consensusFn },
    );
    expect(v.riskTier).toBe("high");
  });

  it("promotes a low-classified action to high when the caller hints high", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "PROCEED", agreement: 0.9, successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan(
      { intent: "read", tool_name: "Read", tool_input: { file_path: "a.ts" }, risk_level: "high" },
      { consensusFn },
    );
    expect(v.riskTier).toBe("high");
    expect(consensusFn).toHaveBeenCalled(); // promoted out of the deterministic low path
  });

  // --- FAIL-OPEN invariants (4 distinct fault modes) ---
  it("fails OPEN to PROCEED when the consensus fn throws", async () => {
    const consensusFn = vi.fn(async () => {
      throw new Error("ollama unreachable");
    });
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(v.verdict).toBe("PROCEED");
    expect(v.ok).toBe(false);
    expect(v.path).toBe("fail-open");
    expect(v.rationale).toMatch(/ollama unreachable/);
  });

  it("fails OPEN (NEVER block) when infra is down: successCount 0", async () => {
    const consensusFn = vi.fn(async () => makeResult({ ok: false, successCount: 0, consensusNull: true }));
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(v.verdict).toBe("PROCEED");
    expect(v.ok).toBe(false);
  });

  it("fails OPEN when consensus is null", async () => {
    const consensusFn = vi.fn(async () => makeResult({ consensusNull: true, successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(v.verdict).toBe("PROCEED");
    expect(v.ok).toBe(false);
  });

  it("fails OPEN when the panel answer does not parse to a verdict", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "i am not certain, ask later", agreement: 0.9, successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(v.verdict).toBe("PROCEED");
    expect(v.ok).toBe(false);
  });

  // --- NO-RECURSION sentinel + direct-HTTP forcing ---
  it("sets the in-flight sentinel and forces LOCAL_LLM_VIA_MCP=0 during the consult, restoring after", async () => {
    let inflightDuring = false;
    let viaMcpDuring: string | undefined;
    const consensusFn = vi.fn(async () => {
      inflightDuring = ReasonBeforeActionEngine.isInflight();
      viaMcpDuring = process.env[LOCAL_LLM_VIA_MCP_ENV];
      return makeResult({ answer: "PROCEED", successCount: 2 });
    });
    expect(ReasonBeforeActionEngine.isInflight()).toBe(false);
    await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(inflightDuring).toBe(true);
    expect(viaMcpDuring).toBe("0");
    expect(ReasonBeforeActionEngine.isInflight()).toBe(false);
    expect(process.env[LOCAL_LLM_VIA_MCP_ENV]).toBeUndefined();
  });

  it("preserves an already-set in-flight sentinel (nested call does not clear the outer)", async () => {
    process.env[REASON_GATE_INFLIGHT_ENV] = "1";
    const consensusFn = vi.fn(async () => makeResult({ answer: "PROCEED", successCount: 2 }));
    await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(process.env[REASON_GATE_INFLIGHT_ENV]).toBe("1");
  });

  // --- cloud-voice circuit breaker (C7) ---
  it("trips the circuit breaker + fails OPEN when a non-Ollama voice leaks in", async () => {
    const leaked: ModelResponse[] = [
      { model: "claude", vendor: "anthropic", ok: true, answer: "BLOCK", latencyMs: 1, tokens: 10, error: null },
      { model: "gpt-oss:120b", vendor: "ollama", ok: true, answer: "BLOCK", latencyMs: 1, tokens: null, error: null },
    ];
    const consensusFn = vi.fn(async () => makeResult({ answer: "BLOCK", agreement: 0.9, successCount: 2, responses: leaked }));
    const v1 = await reasonBeforeActionEngine.plan({ intent: "x", tool_name: "Bash", tool_input: { command: "git push --force" } }, { consensusFn });
    expect(v1.verdict).toBe("PROCEED");
    expect(v1.ok).toBe(false);
    expect(v1.rationale).toMatch(/cloud voice/i);
    // self-disabled for the session: a second call short-circuits without consulting.
    const consensusFn2 = vi.fn(async () => makeResult({ answer: "PROCEED", successCount: 2 }));
    const v2 = await reasonBeforeActionEngine.plan({ intent: "x", tool_name: "Edit", tool_input: { file_path: "y.ts" } }, { consensusFn: consensusFn2 });
    expect(v2.ok).toBe(false);
    expect(consensusFn2).not.toHaveBeenCalled();
  });

  it("reports a numeric latency and the voting voices", async () => {
    const consensusFn = vi.fn(async () => makeResult({ answer: "PROCEED", voters: ["a", "b"], successCount: 2 }));
    const v = await reasonBeforeActionEngine.plan({ intent: "edit", tool_name: "Edit", tool_input: { file_path: "x.ts" } }, { consensusFn });
    expect(typeof v.totalLatencyMs).toBe("number");
    expect(v.totalLatencyMs).toBeGreaterThanOrEqual(0);
    expect(v.voices).toEqual(["a", "b"]);
  });
});
