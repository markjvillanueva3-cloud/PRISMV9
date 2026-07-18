# CAMX-MS22/U-EDM-SINKER — [MAIN-FORCE] [CAMX-MS22]/U-EDM-SINKER (slot:india): implement real assembleSinkerEDM (die-sink burn-schedule) -- greens CAMX-MS22 60/60

**Commit:** `d83ae4bf19ec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:12:15-05:00
**Tags:** camx-ms22, u-edm-sinker, auto-distilled

## Subject
[MAIN-FORCE] [CAMX-MS22]/U-EDM-SINKER (slot:india): implement real assembleSinkerEDM (die-sink burn-schedule) -- greens CAMX-MS22 60/60

## Body
```
[MAIN-FORCE] [CAMX-MS22]/U-EDM-SINKER (slot:india): implement real assembleSinkerEDM (die-sink burn-schedule) -- greens CAMX-MS22 60/60

Closes the last CAMX-MS22 failure (EDMProgramAssemblerEngine.assembleSinkerEDM).
The engine's docstring already declared "sinker/micro EDM use dedicated
assemblers" -- this adds the real one (NOT a wire-path delegate, which would emit
a semantically-wrong contour-cut program for a die-sink job).

- SinkerEDMInput + SinkerBurnSetting interfaces (electrode plunge + rough->finish
  burn schedule).
- assembleSinkerEDM(input): real die-sink program -- electrode plunges in Z; a
  rough->semi_finish->finish BURN SCHEDULE progressively tightens the cavity by
  DECREASING peak current (20->8->3A) + pulse on-time, shrinking spark-gap overcut
  (0.25->0.10->0.04mm) + orbit radius. Default graphite-in-steel recipe (operator-
  tunable, NOT a canonical constant). Reuses ProgramBlock + DIALECT_CODES +
  buildInvalidResult (same contract as assemble()); sinker-specific footer (no
  wire-cut M-code). Real cycle-time estimate (plunge depth / servo feed + orbit).
  Input validation (program_number 1-9999, depth>0) + deep-cavity (>50mm) warning.

- 9 real-assertion tests in EDMProgramAssemblerEngine.test.ts (the CAMX-MS22 check
  is only typeof===function; these pin INTENT, R9): 3-burn default, plunge-to-depth,
  MONOTONIC current decrease rough->finish + finest Ra on finish burn, sinker footer
  has program-end + NO wire-cut, custom schedule, invalid-input rejection (x3),
  deep-cavity warning, dialect (sodick) codes, determinism.

Verify: rtk npx vitest run src/__tests__/EDMProgramAssemblerEngine.test.ts (47/47)
        CAMX-MS22-TestDrivenPipelineValidation.test.ts (60/60, was 57/60).
NOTE: a whole-project tsc shows 19 errors in PEER-committed CAD/CAM files
(cad-validation-corpus.ts ToleranceCallout.kind x16, PowerMillAIOrchestration,
ReinforcementLearningCAMFeedback) -- NOT touched by this change; my files are
tsc-clean. Flagged for delta/kilo (lane discipline -- not fixing peer code).
```

## Files touched (3)
- mcp-server/src/__tests__/EDMProgramAssemblerEngine.test.ts |  92 +++++++++++++++++++++++++++++
- mcp-server/src/engines/EDMProgramAssemblerEngine.ts        | 169 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 261 insertions(+)

## Lessons surfaced in commit body
- wrong contour-cut program for a die-sink job).
- NOTE: a whole-project tsc shows 19 errors in PEER-committed CAD/CAM files

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d83ae4bf19ec`
- Milestone envelope: `mcp-server/data/milestones/CAMX-MS22.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._