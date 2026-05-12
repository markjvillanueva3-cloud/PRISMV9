/**
 * MoaLayer2Engine — U-OCN02 test suite (OCTOPUS-NEURAL-MS0).
 *
 * Mixture-of-Agents Layer-2 aggregator. Tests the 6 cases the atomized spec
 * calls out plus invariants for the Self-MoA dilution flag and collusion check.
 *
 *   1. happy           — 3 proposers all PASS → verdict=pass, dissent=[], majority_vote
 *   2. single proposer — degenerate: only 1 live proposer → verdict mirrored, low confidence
 *   3. high entropy    — 1 pass / 1 fail / 1 conditional → verdict=conditional (lean conservative)
 *   4. all-fail        — all proposers ok=false (transport failures) → fallback=all_fail, verdict=fail
 *   5. senior offline  — aggregatorCall returns ok:false → falls back to majority_vote
 *   6. oversized       — proposer rationales > maxProposerChars → truncated=true, prompt bounded
 *
 * Plus invariants:
 *   - senior-aggregator happy path overrides majority and surfaces VERDICT: line
 *   - Self-MoA dilution warning fires when unanimity + low entropy + ≥3 proposers
 *   - collusion check (2+ identical rationale strings) fires in rationale
 *   - dispatcher round-trip through prism_ai:moa_aggregate
 *
 * @module __tests__/MoaLayer2Engine.test
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN02
 */

import { describe, it, expect } from "vitest";
import { MoaLayer2Engine, type ProposerOutput, type AggregatorCall } from "../engines/MoaLayer2Engine.js";

function p(proposer: string, verdict: "pass" | "conditional" | "fail", notes: string, confidence = 0.7): ProposerOutput {
  return { proposer, ok: true, verdict, notes, confidence };
}
function dead(proposer: string, error: string): ProposerOutput {
  return { proposer, ok: false, verdict: "fail", notes: "", error };
}

describe("MoaLayer2Engine — U-OCN02 aggregator", () => {
  // 1. happy
  it("happy: 3 proposers all PASS → verdict=pass, dissent=[], fallback=majority_vote", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        p("codex",   "pass", "All assertions trace to published Kienzle values."),
        p("claude-a","pass", "Test coverage hits all 3 failure modes."),
        p("claude-b","pass", "Wiring through prism_calc verified by mock McpServer."),
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe("pass");
    expect(r.dissent).toEqual([]);
    expect(r.fallback).toBe("majority_vote");
    expect(r.entropy).toBe(0); // unanimous
    expect(r.aggregatedBy).toBe("majority-vote");
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.confidence).toBeLessThanOrEqual(0.85); // majority-vote cap
  });

  // 2. single proposer (degenerate)
  it("single proposer: 1 live + 2 dead → verdict mirrors live, low-confidence penalty, fallback=single_proposer", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        p("codex", "pass", "Kienzle constants match.", 0.9),
        dead("claude-a", "API timeout"),
        dead("claude-b", "rate limited"),
      ],
    });
    expect(r.verdict).toBe("pass");
    expect(r.fallback).toBe("single_proposer");
    // 0.9 × 0.7 single-source penalty = 0.63
    expect(r.confidence).toBeCloseTo(0.63, 2);
    expect(r.entropy).toBe(0);
    expect(r.rationale).toContain("Only one live proposer");
    expect(r.rationale).toContain("codex");
  });

  // 3. disagreement (high entropy)
  it("high entropy: 1 pass / 1 fail / 1 conditional → verdict=conditional (lean conservative), entropy=log2(3)", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass",        "Looks fine."),
        p("claude-a", "fail",        "Missing test for the 429 path."),
        p("claude-b", "conditional", "Fix the parseError check then re-verify."),
      ],
    });
    // Three-way tie → conservative → conditional.
    expect(r.verdict).toBe("conditional");
    expect(r.fallback).toBe("majority_vote");
    expect(r.entropy).toBeCloseTo(Math.log2(3), 5);
    expect(r.dissent.length).toBe(2); // pass + fail dissent from conditional
    expect(r.dissent.map((d) => d.proposer).sort()).toEqual(["claude-a", "codex"]);
  });

  // 4. all-fail
  it("all-fail: every proposer ok=false → fallback=all_fail, verdict=fail, confidence=0", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        dead("codex",    "Codex daemon unreachable"),
        dead("claude-a", "API 503"),
        dead("claude-b", "API 503"),
      ],
    });
    expect(r.verdict).toBe("fail");
    expect(r.confidence).toBe(0);
    expect(r.fallback).toBe("all_fail");
    expect(r.rationale).toContain("All 3 proposer(s) failed transport");
    expect(r.rationale).toContain("Codex daemon unreachable");
    expect(r.rationale).toContain("API 503");
  });

  // 5. senior model offline → falls back to majority_vote
  it("senior offline: aggregatorCall returns ok:false → falls back to majority_vote", async () => {
    const eng = new MoaLayer2Engine();
    const aggregatorCall: AggregatorCall = async () => ({ ok: false, answer: "", error: "aggregator timeout" });
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass", "OK."),
        p("claude-a", "pass", "OK."),
        p("claude-b", "fail", "One assertion is stub-shaped."),
      ],
      aggregatorCall,
      seniorAggregator: "claude-opus-4.7",
    });
    expect(r.fallback).toBe("majority_vote");
    expect(r.verdict).toBe("pass"); // 2/3 voted pass
    expect(r.dissent.length).toBe(1);
    expect(r.dissent[0].proposer).toBe("claude-b");
    // aggregatedBy reflects the configured senior, even when it didn't actually
    // succeed — so the ledger can attribute the attempt:
    expect(r.aggregatedBy).toBe("claude-opus-4.7");
  });

  // 6. oversized aggregation
  it("oversized: per-proposer rationale > maxProposerChars → truncated=true, marker visible in rationale", async () => {
    const eng = new MoaLayer2Engine();
    const longNotes = "Reason: " + "x".repeat(5_000);
    const r = await eng.aggregate({
      proposers: [
        { proposer: "codex",    ok: true, verdict: "pass", notes: longNotes, confidence: 0.7 },
        { proposer: "claude-a", ok: true, verdict: "pass", notes: longNotes, confidence: 0.7 },
        p("claude-b", "pass", "short ok."),
      ],
      maxProposerChars: 200,
    });
    expect(r.truncated).toBe(true);
    // Truncated marker present somewhere in the synthesized rationale:
    expect(r.rationale).toMatch(/truncated; \d+ more chars/);
    // Total rationale is bounded — not 15K chars of x's:
    expect(r.rationale.length).toBeLessThan(5_000);
  });

  // ─── invariant: senior-aggregator happy path ─────────────────────────────────
  it("aggregator happy: callable returns 'VERDICT: pass' + rationale → uses aggregator fallback path", async () => {
    const eng = new MoaLayer2Engine();
    const aggregatorCall: AggregatorCall = async (_prompt) => ({
      ok: true,
      answer: "VERDICT: pass\n\nAll three proposers converge on a pass with consistent reasoning. The 429-path test (claude-b) closes the last gap codex flagged in its first round.",
      error: null,
    });
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass", "Tests look real.", 0.8),
        p("claude-a", "pass", "Wiring complete.", 0.8),
        p("claude-b", "pass", "429 path covered.", 0.85),
      ],
      aggregatorCall,
      seniorAggregator: "claude-opus-4.7",
    });
    expect(r.fallback).toBe("aggregator");
    expect(r.verdict).toBe("pass");
    // Aggregator-bonus + agreement-bonus + low dilution penalty → higher confidence than majority cap.
    expect(r.confidence).toBeGreaterThan(0.85);
    expect(r.rationale).toContain("converge on a pass");
    expect(r.rationale).not.toMatch(/^VERDICT:/m); // VERDICT line stripped from rationale
  });

  it("aggregator happy: 2-of-3 agree → verdict matches aggregator; dissent surfaces the disagreeing proposer", async () => {
    const eng = new MoaLayer2Engine();
    const aggregatorCall: AggregatorCall = async () => ({
      ok: true,
      answer: "VERDICT: conditional\n\ncodex and claude-a both pass but claude-b's concern about prompt-injection sanitization deserves a follow-up unit. Verdict: conditional pending that follow-up.",
      error: null,
    });
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass",        "Looks good.", 0.7),
        p("claude-a", "pass",        "Looks good.", 0.7),
        p("claude-b", "conditional", "Missing prompt-injection guardrail.", 0.8),
      ],
      aggregatorCall,
    });
    expect(r.fallback).toBe("aggregator");
    expect(r.verdict).toBe("conditional");
    expect(r.dissent.length).toBe(2);
    expect(r.dissent.map((d) => d.proposer).sort()).toEqual(["claude-a", "codex"]);
  });

  // ─── invariant: Self-MoA dilution warning ───────────────────────────────────
  it("Self-MoA dilution: 3 unanimous PASS with low entropy + no aggregator → warning surfaces", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass", "Tests pass.", 0.9),
        p("claude-a", "pass", "Tests pass too.", 0.9),
        p("claude-b", "pass", "Same conclusion.", 0.9),
      ],
    });
    expect(r.verdict).toBe("pass");
    expect(r.rationale).toContain("Self-MoA dilution warning");
    expect(r.entropy).toBe(0);
  });

  // ─── invariant: collusion check ──────────────────────────────────────────────
  it("collusion check: 2+ proposers with identical rationale → note in synthesized rationale", async () => {
    const identical = "Engine returns physics constants from the canonical module. Tests assert dimensional consistency. Approved.";
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        { proposer: "codex",    ok: true, verdict: "pass", notes: identical, confidence: 0.7 },
        { proposer: "claude-a", ok: true, verdict: "pass", notes: identical, confidence: 0.7 },
        p("claude-b", "pass", "I checked the constants too.", 0.7),
      ],
    });
    expect(r.rationale).toContain("Collusion-check");
    expect(r.rationale).toMatch(/identical rationale text/i);
  });

  // ─── validation invariants ──────────────────────────────────────────────────
  it("validate: rejects empty proposers array", async () => {
    const eng = new MoaLayer2Engine();
    await expect(eng.aggregate({ proposers: [] })).rejects.toThrow(/non-empty array/);
  });

  it("validate: rejects out-of-range confidence", async () => {
    const eng = new MoaLayer2Engine();
    await expect(
      eng.aggregate({ proposers: [{ proposer: "codex", ok: true, verdict: "pass", notes: "x", confidence: 1.5 }] }),
    ).rejects.toThrow(/confidence must be in/);
  });

  it("validate: rejects invalid verdict when ok=true", async () => {
    const eng = new MoaLayer2Engine();
    await expect(
      eng.aggregate({ proposers: [{ proposer: "codex", ok: true, verdict: "yes" as never, notes: "x" }] }),
    ).rejects.toThrow(/verdict must be one of/);
  });

  // ─── aggregator throws (network error) → engine doesn't propagate ───────────
  it("aggregator throws: engine swallows + falls back to majority_vote", async () => {
    const eng = new MoaLayer2Engine();
    const aggregatorCall: AggregatorCall = async () => { throw new Error("connection reset"); };
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass", "ok."),
        p("claude-a", "fail", "no."),
        p("claude-b", "fail", "no."),
      ],
      aggregatorCall,
    });
    expect(r.fallback).toBe("majority_vote");
    expect(r.verdict).toBe("fail");
    expect(r.dissent.length).toBe(1);
  });

  // ─── tie-break: 1 pass + 1 fail (no conditional) → conservative conditional ─
  it("tie-break: 2 proposers split pass/fail → verdict=conditional (conservative)", async () => {
    const eng = new MoaLayer2Engine();
    const r = await eng.aggregate({
      proposers: [
        p("codex",    "pass", "Yes."),
        p("claude-a", "fail", "No."),
      ],
    });
    expect(r.verdict).toBe("conditional");
    expect(r.dissent.length).toBe(2); // both differ from "conditional"
  });
});

// ─── dispatcher round-trip ─────────────────────────────────────────────────
describe("prism_ai:moa_aggregate — dispatcher round-trip (U-OCN02 wiring)", () => {
  it("dispatches through executeAIReasoningAction with majority-vote (no aggregator) → success:true", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const out = await executeAIReasoningAction("moa_aggregate" as never, {
      proposers: [
        { proposer: "codex",    ok: true, verdict: "pass", notes: "Looks good", confidence: 0.8 },
        { proposer: "claude-a", ok: true, verdict: "pass", notes: "Same",      confidence: 0.7 },
        { proposer: "claude-b", ok: true, verdict: "fail", notes: "Dissent",   confidence: 0.6 },
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { verdict: string; fallback: string; dissent: unknown[] };
    expect(data.verdict).toBe("pass");
    expect(data.fallback).toBe("majority_vote");
    expect(data.dissent.length).toBe(1);
  });

  it("dispatcher: all-fail proposers → success:true with verdict=fail, fallback=all_fail", async () => {
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const out = await executeAIReasoningAction("moa_aggregate" as never, {
      proposers: [
        { proposer: "codex",    ok: false, verdict: "fail", notes: "", error: "timeout" },
        { proposer: "claude-a", ok: false, verdict: "fail", notes: "", error: "503" },
        { proposer: "claude-b", ok: false, verdict: "fail", notes: "", error: "503" },
      ],
    });
    expect(out.success).toBe(true);
    const data = out.data as { verdict: string; fallback: string };
    expect(data.verdict).toBe("fail");
    expect(data.fallback).toBe("all_fail");
  });
});
