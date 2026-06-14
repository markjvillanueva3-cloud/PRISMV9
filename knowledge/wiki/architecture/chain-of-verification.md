---
title: ChainOfVerificationEngine — generic CoV substrate primitive
status: built
shipped: 2026-05-25
slot: charlie
type: substrate-engine
domain: cross-domain
references:
  - "[[reference_cov_engine_2026_05_25]]"
  - "[[reference_psn_r4_deep_stack_2026_05_25]] (R3 pick #5 source)"
  - "[[reference_quoting_calibration_u_qt10_2026_05_25]] (U-QT10 parent)"
---

# ChainOfVerificationEngine

Generic Chain-of-Verification (CoV) substrate primitive. Implements Dhuliawala et al. 2023 — *"Chain-of-Verification Reduces Hallucination in Large Language Models"* — as a domain-agnostic engine that drives an initial claim through N verification questions and aggregates the answers into a structured verdict.

## API

```ts
import { chainOfVerificationEngine } from "./engines/ChainOfVerificationEngine.js";

const result = await chainOfVerificationEngine.verify(
  claim,         // VerificationClaim { claimId, domain, summary, initialVerdict, initialConfidence, payload }
  questions,     // VerificationQuestion[] — each with id, question, severity, optional requiredCitationIds
  verifier,      // (q) => VerificationAnswer | Promise<VerificationAnswer> — caller-supplied, no I/O in engine
  opts           // { knownCitationIds?, escalationThreshold?, verifierTimeoutMs? }
);

// Or sync (no Promise plumbing) when verifier is guaranteed sync:
const r = chainOfVerificationEngine.verifySync(claim, questions, verifier, opts);
```

## Verdicts

| Verdict | When | Action |
|---|---|---|
| `confirmed` | All critical+high confirm, ≥75% of medium confirm | accept |
| `confirmed_with_caveat` | All critical+high confirm, some medium/low conflict | accept with note |
| `conflict` | Any critical or high question conflicts | reject + escalate |
| `hallucinated_citation` | Cited ID not in `knownCitationIds` catalog | reject (hallucination) |
| `insufficient_evidence` | >50% of questions returned uncertain | review |
| `verifier_error` | ≥1 verifier threw on critical/high | review |

## Severity weights (posterior aggregation)

- critical = 4
- high = 2
- medium = 1
- low = 0.5

Posterior confidence = `(1 - blend) × initialConfidence + blend × verifierMean`, default blend=0.5 (equal weight to gate prior + verification chain).

## Escalation triggers

`shouldEscalate=true` whenever any of:
- verdict in {`conflict`, `hallucinated_citation`, `insufficient_evidence`, `verifier_error`}
- posterior < `escalationThreshold` (default 0.65)
- `initialConfidence - posterior > 0.20` (large-drop detector)

## Hallucination guard

When the caller passes `knownCitationIds[]` (e.g., from `OutsideKnowledgeSourceCatalogEngine.list().map(s => s.id)`), every cited ID a verifier returns must resolve to a known entry. Unknown IDs flip the verdict to `hallucinated_citation` — they do NOT silently pass through (R12 fail-loud).

## Cross-domain fan-out pattern

CoV is a substrate primitive. Each domain wires it via a thin wrapper method on the existing safety/accuracy gate:

```ts
// Example: WEDM safety gate (charlie home — R3 pick #5)
class WEDMProgramSafetyGateEngine {
  async evaluateWithCoV(input: SafetyGateInput, opts?: { knownCitationIds?: string[] }) {
    const base = this.evaluate(input);  // existing
    const claim: VerificationClaim = {
      claimId: `wedm-safety-${Date.now()}`,
      domain: "wedm-safety",
      summary: base.summary,
      initialVerdict: base.verdict,
      initialConfidence: base.s_of_x,
      payload: { ...input, s_of_x: base.s_of_x },
    };
    const questions = buildWEDMVerificationQuestions(input, base);  // ~5 questions
    const verifier = makeWEDMConstantVerifier();  // consults wedm-constants.js
    const cov = await chainOfVerificationEngine.verify(claim, questions, verifier, opts);
    return { gate: base, verification: cov, can_emit: base.can_emit && !cov.shouldEscalate };
  }
}
```

The wrapper is the domain-specific binding; CoV does the heavy lifting.

## Test coverage

25/25 tests PASS — covers happy paths across 3 domains (wedm/mill/quoting), 4 failure modes, 3 adversarial inputs (questionId mismatch, hallucinated citation, missing required citation), verdict-by-severity matrix, posterior math invariants, sync contract, async timeout, engine metadata, input guards.

## Built status

- ✓ Engine
- ✓ Tests (25/25)
- ✓ Memory + wiki + spec
- ◌ Domain wrappers (queued: WEDM safety, quoting calibration, mill chatter, lathe Cpk, CAD regen, safety Ω-score)
- ◌ Dispatcher actions (queued — one `*_with_cov` action per wrapped gate)
- ◌ Outcome integrator (queued — fan results to PSN legs #1, #5, #6, #10)

## See also

- `[[reference_cov_engine_2026_05_25]]` — ship memo (charlie /goal-19, 2026-05-25)
- `[[reference_psn_r4_deep_stack_2026_05_25]]` — R3 pick #5 + R4 pick #6 source
- `[[reference_quoting_calibration_u_qt10_2026_05_25]]` — U-QT10 parent (CoV closes the U-QT11 follow-up)
- `[[deep-reasoning-doctrine]]` — 4-tier model ladder (CoV is the substrate selector this engine routes against)
- `state/shared/specs/DEEP-REASONING-BRIDGE-2026-05-25.md` — architecture spec
