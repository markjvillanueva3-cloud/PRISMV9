# SFC-PAGE-CLOSED-LOOP/U-SFC-OVERPOWER-SPINDLE-EFF — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-SPINDLE-EFF (slot:oscar): over-power check compares efficiency-corrected spindle draw (Pc/eta), not raw cutting power

**Commit:** `28b0e4aca186` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:51:20-05:00
**Tags:** sfc-page-closed-loop, u-sfc-overpower-spindle-eff, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-SPINDLE-EFF (slot:oscar): over-power check compares efficiency-corrected spindle draw (Pc/eta), not raw cutting power

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-OVERPOWER-SPINDLE-EFF (slot:oscar): over-power check compares efficiency-corrected spindle draw (Pc/eta), not raw cutting power

The SFC over-power/stall guard (ProductEngine.calculateSafetyScore) compared the
RAW cutting power Pc=Fc*Vc/60000 directly to the rated spindle power -- but the
spindle MOTOR must supply Pc PLUS belt/gear/bearing drivetrain losses, so the real
demand is P_spindle = Pc/eta_drive. Omitting the division made the check ~1/eta
(~15-25%) too LENIENT: a cut at 95% cutting-power actually draws ~112% of spindle
and would stall, yet graded safe. Safety-relevant: it UNDER-protected.

Fix: new canonical SPINDLE_DRIVE_EFFICIENCY=0.85 (constants.ts; HSMAdvisor default,
G-Wizard 0.80-0.90 band, ASM Handbook Vol.16 -- cited inline, NOT inlined in the
engine). calculateSafetyScore computes spindlePower=power/SPINDLE_DRIVE_EFFICIENCY
and compares THAT in all 4 load tiers; warnings now report spindle draw + cutting
power + drive eff. Monotonically SAFE (only tightens; never softens a threshold).
+1 self-calibrating R9 lock: a cut whose cutting power is UNDER the rating but whose
spindle draw (Pc/0.85) EXCEEDS it must now flag (old raw-Pc logic graded it safe).

physics-reviewer validated the design (Pc/eta direction stricter+safe; 0.85
defensible per HSMAdvisor/G-Wizard; all 4 call sites confirmed cutting-power, no
double-count; units kW) -- it ran in an isolated worktree off HEAD so reviewed the
pre-applied surrounding code; the committed diff matches the validated design and
the self-calibrating R9 test proves the correction is active. 27/27 page + 84/84
SFC-path/safety-boundary tests; changed files type-clean.
```

## Files touched (4)
- mcp-server/src/__tests__/sfc-jm-fleet-page-closed-loop.test.ts | 41 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ProductEngine.ts                        | 28 ++++++++++++++++------------
- mcp-server/src/physics/constants.ts                            | 17 +++++++++++++++++
- 3 files changed, 74 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 28b0e4aca186`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._