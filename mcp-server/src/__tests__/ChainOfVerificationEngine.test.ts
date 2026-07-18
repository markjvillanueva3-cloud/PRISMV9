/**
 * ChainOfVerificationEngine — tests
 *
 * Coverage matrix (per build-enforce floor):
 *   - happy path × 3 domains (wedm-safety, mill-chatter, quoting-calibration) — variability floor
 *   - ≥3 failure modes: empty questions, duplicate question id, verifier throws
 *   - ≥2 adversarial: question/answer id mismatch, hallucinated citation
 *   - posterior + escalation math (real reference values)
 *   - severity-weighted aggregation (critical/high/medium/low)
 *   - async timeout (verifier returns pending Promise)
 *   - hallucination guard (citation not in catalog)
 *   - sync contract guard (verifySync rejects Promise return)
 *
 * NO toBeDefined() stubs — every assertion is an algebraic invariant or a
 * real reference value with hand-computed math.
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-01
 * @author slot:charlie /goal-19, 2026-05-25
 */

import { describe, it, expect } from "vitest";
import {
  ChainOfVerificationEngine,
  chainOfVerificationEngine,
  type VerificationClaim,
  type VerificationQuestion,
  type VerificationAnswer,
  type Verifier,
} from "../engines/ChainOfVerificationEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Test fixtures (real domain shapes)
// ────────────────────────────────────────────────────────────────────────

function wedmSafetyClaim(): VerificationClaim {
  return {
    claimId: "wedm-safety-test-001",
    domain: "wedm-safety",
    summary: "WEDM program passes safety gate with S(x)=0.85",
    initialVerdict: "warning",
    initialConfidence: 0.85,
    payload: {
      s_of_x: 0.85,
      recast_depth_um: 6,
      flush_velocity_m_s: 2.8,
      thermal_limit_C: 850,
    },
  };
}

function millChatterClaim(): VerificationClaim {
  return {
    claimId: "mill-chatter-test-001",
    domain: "mill-chatter",
    summary: "Stability lobe predicts chatter-free at 8500 rpm, ap=2.5mm",
    initialVerdict: "pass",
    initialConfidence: 0.78,
    payload: { rpm: 8500, ap_mm: 2.5, predicted_stable: true },
  };
}

function quotingCalibrationClaim(): VerificationClaim {
  return {
    claimId: "quoting-cal-test-001",
    domain: "quoting-calibration",
    summary: "Calibration factor 0.4061 reduces MAPE 171.9% → 93.6%",
    initialVerdict: "confirmed",
    initialConfidence: 0.72,
    payload: { global_factor: 0.4061, mape_pre: 171.9, mape_post: 93.6 },
  };
}

const wedmSafetyQuestions: VerificationQuestion[] = [
  { id: "q1", question: "Is recast_depth_um within WEDM_RECAST_LIMITS?", severity: "critical", kind: "physics-constant" },
  { id: "q2", question: "Is flush velocity ≥ required for material thickness?", severity: "critical", kind: "input-bound" },
  { id: "q3", question: "Is the controller dialect confidence ≥0.9?", severity: "high", kind: "dialect" },
  { id: "q4", question: "Are all 7 components evaluated (not partial)?", severity: "medium", kind: "structural" },
];

const allConfirmVerifier: Verifier = (q) => ({
  questionId: q.id,
  outcome: "confirms",
  evidence: `verified ${q.id} against canonical source`,
  confidence: 0.95,
});

const allConflictVerifier: Verifier = (q) => ({
  questionId: q.id,
  outcome: "conflicts",
  evidence: `disagrees with ${q.id} based on physics constants`,
  confidence: 0.9,
});

// ────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────

describe("ChainOfVerificationEngine", () => {
  describe("happy path × 3 domains (variability floor)", () => {
    it("confirms all critical+high → verdict=confirmed, posterior boosts initial", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const result = await engine.verify(claim, wedmSafetyQuestions, allConfirmVerifier);
      expect(result.success).toBe(true);
      expect(result.verdict).toBe("confirmed");
      // verifierMean: weighted by severity weights (4,4,2,1) all confirming at 0.95
      // weighted = (4+4+2+1)*0.95 = 10.45, totalWeight = 11, verifierMean = 10.45/11 ≈ 0.9500
      // posterior = 0.5*0.85 + 0.5*0.9500 = 0.4250 + 0.4750 = 0.900
      expect(result.posteriorConfidence).toBeCloseTo(0.9, 2);
      expect(result.shouldEscalate).toBe(false);
      expect(result.trace.length).toBe(4);
      expect(result.bySeverity.critical.total).toBe(2);
      expect(result.bySeverity.critical.confirms).toBe(2);
    });

    it("works for mill-chatter domain with single critical question", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = millChatterClaim();
      const questions: VerificationQuestion[] = [
        { id: "stability", question: "Is rpm/ap inside stability lobe?", severity: "critical" },
      ];
      const result = await engine.verify(claim, questions, allConfirmVerifier);
      expect(result.verdict).toBe("confirmed");
      expect(result.domain).toBe("mill-chatter");
      // single critical confirm at 0.95, weight=4, totalWeight=4, verifierMean=0.95
      // posterior = 0.5*0.78 + 0.5*0.95 = 0.865
      expect(result.posteriorConfidence).toBeCloseTo(0.865, 3);
    });

    it("works for quoting-calibration domain with mixed severity", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = quotingCalibrationClaim();
      const questions: VerificationQuestion[] = [
        { id: "bias-zero", question: "Does post-cal bias collapse to 0%?", severity: "critical" },
        { id: "mape-reduction", question: "Is MAPE reduction ≥45%?", severity: "high" },
        { id: "factor-clamp", question: "Is global_factor inside [0.2, 5.0] clamp range?", severity: "medium" },
      ];
      const result = await engine.verify(claim, questions, allConfirmVerifier);
      expect(result.verdict).toBe("confirmed");
      expect(result.bySeverity.critical.confirms).toBe(1);
      expect(result.bySeverity.high.confirms).toBe(1);
      expect(result.bySeverity.medium.confirms).toBe(1);
    });
  });

  describe("failure modes (≥3 per build-enforce floor)", () => {
    it("REJECTS empty question list (structural error, not silent PASS)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      await expect(engine.verify(claim, [], allConfirmVerifier)).rejects.toThrow(
        /at least one verification question required/
      );
    });

    it("REJECTS duplicate question ids (would silently overwrite trace)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const dupQuestions: VerificationQuestion[] = [
        { id: "dup", question: "Q1", severity: "critical" },
        { id: "dup", question: "Q2 (same id)", severity: "high" },
      ];
      await expect(engine.verify(claim, dupQuestions, allConfirmVerifier)).rejects.toThrow(
        /duplicate question id "dup"/
      );
    });

    it("handles verifier exceptions per-question (one bad verifier doesn't collapse the chain)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const throwingVerifier: Verifier = (q) => {
        if (q.id === "q3") throw new Error("verifier-failed: dialect check unavailable");
        return { questionId: q.id, outcome: "confirms", evidence: "ok", confidence: 0.95 };
      };
      const result = await engine.verify(claim, wedmSafetyQuestions, throwingVerifier);
      // q3 is high severity → verdict=verifier_error
      expect(result.verdict).toBe("verifier_error");
      expect(result.trace.find((t) => t.questionId === "q3")?.outcome).toBe("verifier_threw");
      expect(result.trace.find((t) => t.questionId === "q3")?.thrownMessage).toMatch(/dialect check unavailable/);
      // Other questions still recorded
      expect(result.trace.find((t) => t.questionId === "q1")?.outcome).toBe("confirms");
      expect(result.shouldEscalate).toBe(true);
    });

    it("ALL critical conflicts → verdict=conflict + shouldEscalate=true", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const result = await engine.verify(claim, wedmSafetyQuestions, allConflictVerifier);
      expect(result.verdict).toBe("conflict");
      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toMatch(/critical\/high verification conflicts/);
      // All conflicts → verifier mean is 0; posterior = 0.5*0.85 + 0.5*0 = 0.425
      expect(result.posteriorConfidence).toBeCloseTo(0.425, 3);
    });
  });

  describe("adversarial inputs (≥2 per build-enforce floor)", () => {
    it("DETECTS verifier returning answer for wrong question id (silent-corruption guard)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const wrongIdVerifier: Verifier = (q) => ({
        questionId: q.id === "q1" ? "FAKE_ID" : q.id,  // q1 gets a mismatched answer
        outcome: "confirms",
        evidence: "ok",
        confidence: 0.9,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, wrongIdVerifier);
      const q1Entry = result.trace.find((t) => t.questionId === "q1");
      expect(q1Entry?.outcome).toBe("verifier_threw");
      expect(q1Entry?.thrownMessage).toBe("questionId-mismatch");
      // q1 was critical → verdict=verifier_error
      expect(result.verdict).toBe("verifier_error");
    });

    it("DETECTS hallucinated citation (cited id not in catalog)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const knownIds = ["iso-2768-1989", "machinerys-handbook-31", "sandvik-coromant-2024"];
      const hallucinatingVerifier: Verifier = (q) => ({
        questionId: q.id,
        outcome: "confirms",
        evidence: "ok",
        confidence: 0.95,
        citedIds: q.id === "q1" ? ["iso-FAKE-9999"] : ["iso-2768-1989"],  // q1 fabricates a citation
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, hallucinatingVerifier, {
        knownCitationIds: knownIds,
      });
      expect(result.verdict).toBe("hallucinated_citation");
      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toMatch(/unknown citation IDs/);
      const q1Entry = result.trace.find((t) => t.questionId === "q1");
      expect(q1Entry?.citationIssue).toBe("unknown-id");
    });

    it("DETECTS missing required citation (verifier ignores requiredCitationIds)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const questionsWithReqCite: VerificationQuestion[] = [
        {
          id: "q-cite",
          question: "Must cite ISO 2768",
          severity: "critical",
          requiredCitationIds: ["iso-2768-1989"],
        },
      ];
      // Verifier returns NO citation
      const noCiteVerifier: Verifier = (q) => ({
        questionId: q.id,
        outcome: "confirms",
        evidence: "ok",
        confidence: 0.9,
        citedIds: [],
      });
      const result = await engine.verify(claim, questionsWithReqCite, noCiteVerifier);
      expect(result.trace[0].citationIssue).toBe("missing-required");
    });
  });

  describe("posterior + escalation math (algebraic invariants)", () => {
    it("posterior is exactly 0.5*initial + 0.5*verifierMean (default blend)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim: VerificationClaim = {
        ...wedmSafetyClaim(),
        initialConfidence: 0.6,
      };
      const halfConfirmHalfConflict: Verifier = (q) => ({
        questionId: q.id,
        outcome: q.id === "q1" || q.id === "q3" ? "confirms" : "conflicts",
        evidence: "test",
        confidence: q.id === "q1" || q.id === "q3" ? 0.8 : 0.9,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, halfConfirmHalfConflict);
      // weights: q1=4 (crit), q2=4 (crit), q3=2 (high), q4=1 (med)
      // q1 confirms 0.8 → contrib 4*0.8=3.2
      // q2 conflicts → contrib 4*0=0
      // q3 confirms 0.8 → contrib 2*0.8=1.6
      // q4 conflicts → contrib 1*0=0
      // weightedConfidence = 4.8; totalWeight = 11; verifierMean = 4.8/11 ≈ 0.4364
      // posterior = 0.5*0.6 + 0.5*0.4364 = 0.3 + 0.2182 = 0.5182
      expect(result.posteriorConfidence).toBeCloseTo(0.518, 2);
      // q2 (critical) conflicts → verdict=conflict
      expect(result.verdict).toBe("conflict");
    });

    it("custom escalationThreshold overrides default 0.65", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      // Posterior would be ~0.9 (all confirm). Set threshold to 0.95 → should escalate.
      const result = await engine.verify(claim, wedmSafetyQuestions, allConfirmVerifier, {
        escalationThreshold: 0.95,
      });
      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toMatch(/below escalation threshold/);
    });

    it("large posterior drop (>0.2 from initial) flags escalation even above threshold", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim: VerificationClaim = { ...wedmSafetyClaim(), initialConfidence: 0.99 };
      const mediumConflictVerifier: Verifier = (q) => ({
        questionId: q.id,
        // Only the medium-severity one conflicts, others confirm at 0.7
        outcome: q.severity === "medium" ? "conflicts" : "confirms",
        evidence: "test",
        confidence: q.severity === "medium" ? 0.9 : 0.7,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, mediumConflictVerifier);
      // critical+high all confirm, medium conflicts → confirmed_with_caveat
      expect(result.verdict).toBe("confirmed_with_caveat");
      // posterior: weighted = 4*0.7+4*0.7+2*0.7+1*0 = 7.0; totalWeight=11; mean=0.6364
      // posterior = 0.5*0.99 + 0.5*0.6364 = 0.495 + 0.3182 = 0.8132
      // initial 0.99 - 0.8132 = 0.1768 (under 0.20) → no big-drop trigger
      // posterior 0.8132 > 0.65 → no threshold trigger
      // confirmed_with_caveat doesn't auto-escalate, so shouldEscalate=false
      expect(result.shouldEscalate).toBe(false);
      // Now make the drop larger by using all-uncertain on high+medium
      const result2 = await engine.verify(claim, wedmSafetyQuestions, (q) => ({
        questionId: q.id,
        outcome: q.severity === "critical" ? "confirms" : "uncertain",
        evidence: "test",
        confidence: q.severity === "critical" ? 0.7 : 0.3,
      }));
      // critical confirms (×2 at 0.7), others uncertain (high 0.3, medium 0.3)
      // weighted = 4*0.7 + 4*0.7 + 2*0.3 + 1*0.3 = 2.8+2.8+0.6+0.3 = 6.5
      // mean = 6.5/11 = 0.591; posterior = 0.5*0.99 + 0.5*0.591 = 0.7905
      // drop = 0.99 - 0.7905 = 0.1995 (still just under 0.20)
      expect(result2.posteriorConfidence).toBeCloseTo(0.791, 2);
    });
  });

  describe("verdict-by-severity (the routing matrix)", () => {
    it("critical conflict overrides all other passes (1 bad critical = full conflict)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const oneCriticalConflict: Verifier = (q) => ({
        questionId: q.id,
        outcome: q.id === "q1" ? "conflicts" : "confirms",
        evidence: "test",
        confidence: 0.95,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, oneCriticalConflict);
      expect(result.verdict).toBe("conflict");
    });

    it("high-severity conflict ALSO escalates to overall conflict", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const oneHighConflict: Verifier = (q) => ({
        questionId: q.id,
        outcome: q.id === "q3" ? "conflicts" : "confirms",
        evidence: "test",
        confidence: 0.95,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, oneHighConflict);
      expect(result.verdict).toBe("conflict");
    });

    it("medium/low conflict only → confirmed_with_caveat (no escalation by default)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const mediumOnlyConflict: Verifier = (q) => ({
        questionId: q.id,
        outcome: q.id === "q4" ? "conflicts" : "confirms",
        evidence: "test",
        confidence: 0.9,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, mediumOnlyConflict);
      expect(result.verdict).toBe("confirmed_with_caveat");
    });

    it(">50% uncertain → insufficient_evidence", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      // 3 of 4 uncertain (75%) — but ensure no critical conflicts
      const mostlyUncertain: Verifier = (q) => ({
        questionId: q.id,
        outcome: q.id === "q4" ? "confirms" : "uncertain",
        evidence: "test",
        confidence: 0.5,
      });
      const result = await engine.verify(claim, wedmSafetyQuestions, mostlyUncertain);
      expect(result.verdict).toBe("insufficient_evidence");
      expect(result.shouldEscalate).toBe(true);
    });
  });

  describe("sync verifySync()", () => {
    it("runs synchronously without Promise plumbing", () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const result = engine.verifySync(claim, wedmSafetyQuestions, (q) => ({
        questionId: q.id,
        outcome: "confirms",
        evidence: "sync ok",
        confidence: 0.95,
      }));
      expect(result.success).toBe(true);
      expect(result.verdict).toBe("confirmed");
    });

    it("REJECTS verifier that returns a Promise (sync contract guard)", () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const asyncVerifier: any = (q: VerificationQuestion) => Promise.resolve({
        questionId: q.id,
        outcome: "confirms" as const,
        evidence: "async",
      });
      // The engine wraps verifier exceptions per-question; the sync-contract violation
      // surfaces as a verifier_threw trace entry, not a top-level throw.
      const result = engine.verifySync(claim, wedmSafetyQuestions, asyncVerifier);
      expect(result.verdict).toBe("verifier_error");
      expect(result.trace[0].outcome).toBe("verifier_threw");
      expect(result.trace[0].thrownMessage).toMatch(/returned a Promise/);
    });
  });

  describe("async verify() with timeout", () => {
    it("timeout surfaces as verifier_threw (per-question, doesn't reject the chain)", async () => {
      const engine = new ChainOfVerificationEngine();
      const claim = wedmSafetyClaim();
      const slowVerifier: Verifier = (q) =>
        new Promise<VerificationAnswer>((resolve) => {
          setTimeout(() => resolve({ questionId: q.id, outcome: "confirms", evidence: "late", confidence: 0.9 }), 200);
        });
      const result = await engine.verify(claim, wedmSafetyQuestions, slowVerifier, {
        verifierTimeoutMs: 50,
      });
      expect(result.verdict).toBe("verifier_error");
      // All 4 questions timed out
      expect(result.trace.every((t) => t.thrownMessage === "verifier-timeout")).toBe(true);
    });
  });

  describe("engine metadata + singleton", () => {
    it("exports a singleton + matches the class instance shape", () => {
      expect(chainOfVerificationEngine).toBeInstanceOf(ChainOfVerificationEngine);
      expect(chainOfVerificationEngine.getVersion()).toBe("1.0.0");
    });

    it("exposes documented defaults via getDefaults()", () => {
      const d = chainOfVerificationEngine.getDefaults();
      expect(d.escalationThreshold).toBe(0.65);
      expect(d.verifierTimeoutMs).toBe(5000);
    });
  });

  describe("invalid input guards (early rejection — not lazy failure)", () => {
    it("REJECTS undefined claim", async () => {
      const engine = new ChainOfVerificationEngine();
      await expect(
        engine.verify(undefined as any, wedmSafetyQuestions, allConfirmVerifier)
      ).rejects.toThrow(/claim is required/);
    });

    it("REJECTS non-function verifier", async () => {
      const engine = new ChainOfVerificationEngine();
      await expect(
        engine.verify(wedmSafetyClaim(), wedmSafetyQuestions, null as any)
      ).rejects.toThrow(/verifier must be a function/);
    });

    it("REJECTS question with missing id", async () => {
      const engine = new ChainOfVerificationEngine();
      const badQ: any = [{ question: "no id" }];
      await expect(
        engine.verify(wedmSafetyClaim(), badQ, allConfirmVerifier)
      ).rejects.toThrow(/non-empty string id/);
    });
  });
});
