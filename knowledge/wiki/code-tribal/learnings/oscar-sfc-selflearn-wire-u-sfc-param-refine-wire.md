# OSCAR-SFC-SELFLEARN-WIRE/U-SFC-PARAM-REFINE-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-PARAM-REFINE-WIRE: wire SFCParameterRefinementEngine -> prism_calc:sfc_parameter_refinement_compute

**Commit:** `ae756dcfc842` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T18:30:22-05:00
**Tags:** oscar-sfc-selflearn-wire, u-sfc-param-refine-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-PARAM-REFINE-WIRE: wire SFCParameterRefinementEngine -> prism_calc:sfc_parameter_refinement_compute

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-SELFLEARN-WIRE]/U-SFC-PARAM-REFINE-WIRE: wire SFCParameterRefinementEngine -> prism_calc:sfc_parameter_refinement_compute

SFC self-improving loop: third dark SFC engine surfaced (after OutcomeFeedbackBridge
e436c2fc3f + Ranker 9aa9ce20f2). SFCParameterRefinementEngine carried a FALSE
// WIRE-EXEMPT marker -- zero real callers, only its own test referenced it.

It reads shop-floor actuals off the OutcomeCaptureBus, computes median+IQR
multiplicative correction factors per machine/material context, hard-clamped to
[0.25,4.0], fail-loud below minSamples. This is the calibration fold-back that lets
SFC recommendations self-correct from real cut outcomes.

Wire (calcDispatcher, cloned the proven sfc_rank_hypotheses dynamic-import-in-case):
- sfc_parameter_refinement_compute -> computeRefinement(input). context-required guard;
  returns {success:true, ...refined} where refined.ok distinguishes evidence-found from
  no_evidence/below_min_samples/bus_error/invalid_context (engine never throws).

SECURITY: forwards ONLY validated tuning fields (context/sinceDays/minSamples/maxFactor/
iqrScale/fullConfidenceSamples). params.bus / params.clock are deliberately NOT threaded
-- the engine honors input.bus/input.clock, so forwarding them would let an MCP caller
swap the singleton's data source/clock. Closed at two layers (explicit field enumeration
+ engine zod strip). Adversarial test proves a forged params.bus is ignored.

applyToRecommendation() intentionally NOT surfaced -- pure in-process helper the
SpeedFeedOrchestrator wires directly (needs the prior result threaded back), not a natural
MCP action.

R12-safe: deterministic median/IQR + safety clamp DATA, never NN inference.

Tests: 9/9 round-trip through registerCalcDispatcher mock-server (happy x2 incl direct-vs-
dispatcher parity + 3 failure modes + 4 adversarial incl injection-hole + safety-clamp +
zod-band-reject). Singleton bus monkeypatched (CADExecutionOutcomeBusEngine.test pattern),
restored in finally -> zero disk pollution. tsc-clean. 2-agent scrutiny PASS/PASS, no P0/P1.

Queue: state/shared/specs/SFC-ORPHAN-WIRE-QUEUE-2026-06-11.md (#2 of 8 done; #1 ranker done).
Coordinate: oscar owns SFC engine/test hardening.
```

## Files touched (3)
- mcp-server/src/__tests__/calcDispatcher.sfc-parameter-refinement-wire.test.ts | 279 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts                            |  37 ++++++++++++++
- 2 files changed, 316 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ae756dcfc842`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-SELFLEARN-WIRE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._