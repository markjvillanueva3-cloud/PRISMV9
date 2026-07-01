# OSCAR-SFC-9AXIS-MS0/U-OSC-RIGIDITY-VC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-RIGIDITY-VC (slot:oscar): de-inline the machine_rigidity→Vc factor to canonical constants + lock with tests

**Commit:** `7d0affcae6db` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T09:50:46-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-rigidity-vc, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-RIGIDITY-VC (slot:oscar): de-inline the machine_rigidity→Vc factor to canonical constants + lock with tests

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-RIGIDITY-VC (slot:oscar): de-inline the machine_rigidity→Vc factor to canonical constants + lock with tests

Dedup catch: machine_rigidity was NOT inert (the spec's "inert" claim was about the orchestrator's separate machine_rigidity_factor, which only hits MRR) — UltimateSpeedFeedEngine.ts:2629 already scaled Vc *= (low 0.7 / medium 1.0 / high 1.1). But it was HARDCODED inline — an inline-physics-constant violation (oscar soul refuses inline-physics-constants) with zero tests.

- De-inlined to CANONICAL_MACHINE_RIGIDITY_VC_FACTOR + getMachineRigidityVcFactor() in physics/constants.ts. BEHAVIOUR-PRESERVING (same 0.7/1.0/1.1; undefined→medium 1.0 byte-identical to the prior `: 1.0` fallback). Cited (commercial speed-feed rigidity-backoff convention) + fail-safe.
- rigidityVcFactor.test.ts (6): canonical values + ordering + case-insensitive + fail-safe; integration proves low Vc < high Vc (~0.7/1.1) and medium ≡ unspecified baseline (gauntlet-preserving).
- Verified: rigidity 6 + coolant 8 + toolmat 10 + gauntlet 52 + variability 106(+1 todo) = 182 green; tsc clean for ALL touched files (15 pre-existing errors in unrelated files — cad-validation-corpus/CriticalPathScheduling/RANSAC/KienzleForceModel — peer churn, not this unit).
- DEFERRED (physics-reviewer-gated, own unit U-OSC-RIGIDITY-DOC): the rigorous chatter-free-DOC effect — rigidity + holder/spindle stiffness → stability-lobe effective stiffness → critical_depth_mm (stabilityLobeAnalysis currently uses fixed k_est=2e7, ignoring machine_rigidity). Also orchestrator machine_rigidity_factor → DOC (currently MRR-only at :801/:908).
```

## Files touched (4)
- mcp-server/src/__tests__/rigidityVcFactor.test.ts | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts |  8 ++++++--
- mcp-server/src/physics/constants.ts               | 39 +++++++++++++++++++++++++++++++++++++++
- 3 files changed, 122 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7d0affcae6db`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._