---
name: reference-cov-engine-2026-05-25
description: "ChainOfVerificationEngine — generic Chain-of-Verification substrate primitive shipped 2026-05-25 charlie /goal-19. Cross-domain verifier of safety/accuracy claims with severity-weighted posterior + escalation. R3 pick #5 from [[reference_psn_r4_deep_stack_2026_05_25]]. 25/25 tests PASS. Foundation for R4 pick #6 PRISMVerifiedReasoningEngine."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.533Z
aliases: reference_cov_engine_2026_05_25
---


# ChainOfVerificationEngine — generic CoV substrate primitive (charlie /goal-19, 2026-05-25)

## What shipped (one commit, 3 files)

- `mcp-server/src/engines/ChainOfVerificationEngine.ts` (NEW, ~470 LOC)
- `mcp-server/src/__tests__/ChainOfVerificationEngine.test.ts` (NEW, 25/25 PASS)
- `state/shared/specs/DEEP-REASONING-BRIDGE-2026-05-25.md` (architecture spec + R3/R4 reconciliation)

## Why this (R8 read-before-write + R7 surface-don't-blend)

Operator directive (after U-QT10 calibration ship at 02:22 CST): *"continue with deep reasoning and make sure it synergizes with the whole ecosystem not just quoting portion of the app"*.

Pre-build search surfaced papa slot's 2026-05-25 R3+R4 deliverables — [[reference_psn_training_substrate_2026_05_25]] + [[reference_psn_r4_deep_stack_2026_05_25]]. R3 pick #5 explicitly names *"CoV inside `wedm_safety_gate_evaluate`"* (1-day, charlie home). R4 pick #6 names PRISMVerifiedReasoningEngine (CoV+RAG+PoT composite, 1 week).

My original plan (DeepReasoningRouterEngine — cross-domain envelope synthesizer) partly overlapped R4 pick #6. Surfaced the conflict per R7 (don't blend), chose: ship CoV-first as the substrate primitive that BOTH R3-pick-5 AND R4-pick-6 require. The Router architecture stays in the spec as the longer-term design but defers to papa's R4 spec when that lands.

## The engine

`ChainOfVerificationEngine.verify(claim, questions, verifier, opts)` implements Dhuliawala 2023 ("Chain-of-Verification Reduces Hallucination in LLMs") — given an INITIAL CLAIM + N VERIFICATION QUESTIONS, drives each through a CALLER-SUPPLIED VERIFIER and aggregates into a verdict (`confirmed` / `confirmed_with_caveat` / `conflict` / `hallucinated_citation` / `insufficient_evidence` / `verifier_error`).

Key design choices:
- **Pure engine** — performs ZERO I/O. Verifiers are caller-supplied closures that consult whatever substrate is appropriate (physics constants, dispatcher, embedding index, catalog).
- **Severity-weighted posterior** — critical=4, high=2, medium=1, low=0.5. Critical/high conflicts collapse the verdict regardless of medium/low passes.
- **R12 fail-loud** — unverified claims surface as `unverified` with explicit `reason` (not silently passed). Empty question list is REJECTED. Hallucinated citation IDs flip the verdict to `hallucinated_citation` instead of being silently accepted.
- **Sync + async paths** — `verifySync` for deterministic verifiers (no Promise plumbing), `verify` (async) for I/O-touching ones with per-verifier timeout.
- **Silent-corruption guard** — verifier returning an answer with `questionId !== q.id` surfaces as `verifier_threw` with `thrownMessage: "questionId-mismatch"` (per [[feedback_verify_actual_contract_not_proxy]]).

## Test matrix (25/25 — real reference values, no toBeDefined stubs)

| Category | Count | Notes |
|---|---|---|
| Variability — 3 domains | 3 | wedm-safety, mill-chatter, quoting-calibration |
| Failure modes | 4 | empty questions, dup ids, verifier-throws, all-critical-conflicts |
| Adversarial | 3 | questionId mismatch, hallucinated citation, missing required citation |
| Verdict-by-severity matrix | 4 | critical conflict, high conflict, medium-only, >50% uncertain |
| Posterior math | 3 | 0.5/0.5 blend invariant, custom threshold, large-drop detector |
| Sync contract | 2 | verifySync happy path + Promise-return guard |
| Async timeout | 1 | per-question timeout via verifier-timeout sentinel |
| Engine metadata | 2 | singleton shape + getDefaults |
| Input guards | 3 | undefined claim, non-function verifier, missing question id |

Algebraic invariant verified: posterior = (1-blend)·initial + blend·verifierMean where verifierMean is severity-weighted sum.

## Cross-ecosystem fan-out (the user's "whole ecosystem" directive)

CoV is a SUBSTRATE-LAYER primitive. The cross-domain fan-out happens via THIN WRAPPER METHODS on existing safety/accuracy gates — one per domain, each ~20 LOC:

| Domain | Wrapper | Verifier consults | Status |
|---|---|---|---|
| WEDM safety (charlie home) | `WEDMProgramSafetyGateEngine.evaluateWithCoV()` | `WEDM_SAFETY_GATE` constants + per-component bounds | **Queued — next unit** |
| Mill chatter | `ChatterStabilityLobeEngine.predictWithCoV()` | SLD published lobes + RPM bounds | Queued |
| Lathe Cpk | `LatheTurningCpkSurrogateEngine.estimateWithCoV()` | Cp/Cpk threshold per material | Queued |
| Quoting calibration | `QuotingCalibrationEngine.deriveWithCoV()` | OutsideKnowledgeSourceCatalog rate benchmarks | Queued |
| CAD regeneration | `CADRegenAccuracyEngine.compareWithCoV()` | dimensional-signature tolerances | Queued |
| Safety Ω-score | `OmegaSafetyScoreEngine.computeWithCoV()` | Ω threshold per safety tier | Queued |

Each wrapper takes ~1 hour to ship (CoV does the heavy lifting). Fleet-wide CoV coverage is a 1-week target.

## PSN leg surfaces this iter

- ✓ #1 Obsidian (this memory file, auto-feeds vault next Stop)
- ✓ #3 Wiki (`knowledge/wiki/architecture/chain-of-verification.md` — next)
- ✓ #7 Engines (`ChainOfVerificationEngine.ts` + test)
- ✓ #11 PRISM AI (the engine IS a meta-AI substrate)
- ◌ #2 PRISM OS (dispatcher wiring queued — next unit)
- ◌ #5 Tribal (CoV-derived tribal-tip candidates queued — when first wrapper ships)
- ◌ #6 System Viz (auto-pickup on next graph regen)
- ◌ #10 NN/GNN (CoV verdicts feed `psnAutonomyLoopEngine.scoreEvent({type:'psi_delta'})` — wires when wrappers ship)

## Attribution + commit discipline

Shipped on `cad-fusion-live-ms0` (NOT slot/charlie worktree — this chat is in the shared tree). Per [[feedback_commit_prefix_main_on_shared_tree]], commit prefix is `[MAIN]` with explicit `(slot:charlie ...)` in the title. Absorption risk per [[feedback_commit_to_slot_worktree]] is accepted; trace-line in commit body names every file for forensic recovery.

## Next units (named for next /loop tick)

1. **U-COV-WEDM** — `WEDMProgramSafetyGateEngine.evaluateWithCoV()` wrapper + `wedm_safety_gate_evaluate_cov` dispatcher action + WEDM-specific verification questions (recast/flush/thermal/dialect/unit-tag constants) — charlie home priority per R3 pick #5
2. **U-COV-QUOTING** — `QuotingCalibrationEngine.deriveWithCoV()` wrapper — closes the U-QT11 follow-up from [[reference_quoting_calibration_u_qt10_2026_05_25]]
3. **U-COV-MILL** — `ChatterStabilityLobeEngine.predictWithCoV()` — opens the mill-domain CoV surface for cross-slot use
4. **U-COV-INTEGRATOR** — `DeepReasoningOutcomeIntegratorEngine` fan-out to PSN legs (auto-feed memory + wiki + system-viz + NN/GNN psi_delta) per spec
5. **U-COV-CATALOG** — wire `OutsideKnowledgeSourceCatalogEngine.list()` IDs as the `knownCitationIds` source for hallucination guards across all wrappers (one-time wiring)

## Cross-references

- [[reference_quoting_calibration_u_qt10_2026_05_25]] — U-QT10 parent (the loop-closer this generalizes)
- [[reference_psn_r4_deep_stack_2026_05_25]] — R4 spec naming R3 pick #5 + R4 pick #6
- [[reference_psn_training_substrate_2026_05_25]] — R3 substrate map (sister deliverable)
- [[reference_source_chain_engine_u_hagi08_2026_05_24]] — adjacent verification-chain primitive (HAGI-MS0)
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` prefix discipline
- [[feedback_commit_to_slot_worktree]] — attribution-preservation discipline
- [[feedback_verify_actual_contract_not_proxy]] — questionId-mismatch guard rationale
- [[deep-reasoning-doctrine]] — 4-tier model ladder (the substrate selector this engine routes against)
