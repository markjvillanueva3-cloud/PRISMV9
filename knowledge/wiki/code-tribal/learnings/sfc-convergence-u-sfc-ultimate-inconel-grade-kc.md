# SFC-CONVERGENCE/U-SFC-ULTIMATE-INCONEL-GRADE-KC — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ULTIMATE-INCONEL-GRADE-KC (slot:oscar): correct stale Inconel kc1.1 test expectation to grade-specific canonical 3200 (was group-generic 2800)

**Commit:** `396ae501b7b0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T00:10:40-05:00
**Tags:** sfc-convergence, u-sfc-ultimate-inconel-grade-kc, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ULTIMATE-INCONEL-GRADE-KC (slot:oscar): correct stale Inconel kc1.1 test expectation to grade-specific canonical 3200 (was group-generic 2800)

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-ULTIMATE-INCONEL-GRADE-KC (slot:oscar): correct stale Inconel kc1.1 test expectation to grade-specific canonical 3200 (was group-generic 2800)

ultimate-speed-feed.test.ts getMaterialProfile("inconel") asserted kc1.1=2800
(the S-group GENERIC, CANONICAL_KIENZLE.S, which is Ti-6Al-4V-anchored). But the
engine getMaterialProfile canonical-sync loop (UltimateSpeedFeedEngine.ts:633-657)
intentionally maps inconel -> inconel_718 and overrides with the GRADE-SPECIFIC
canonical value AISI_CUTTING_COEFFICIENTS["Inconel 718"].kc1_1 = 3200.

FIX THE TEST, NOT THE ENGINE (physics-reviewer adjudication 2026-06-22):
- 3200 N/mm^2 is the published Inconel-718 kc1.1 (Sandvik/Kennametal HRSA-Ni band
  2650-3300); 2800 is the Ti-6Al-4V end of the S-group. Inconel 718 is a
  precipitation-hardened superalloy, harder to cut than Ti, so its kc MUST be
  higher than the S-group average -- 3200 > 2800 is the correct physics ordering.
- SAFETY: Fc proportional to kc1.1. Forcing the engine down to 2800 is a -12.5%
  UNDER-prediction of cutting force on the catalog's most force-intensive
  material (would under-size spindle/deflection/workholding/chatter margins) --
  the unsafe direction + an oscar safety refuse. The engine's 3200 is the
  safe/conservative value.
- The prior test edit corrected a stale 3000 but over-shot to the group generic
  2800 (the wrong canonical layer) instead of the grade value 3200.

Test-only change -- zero runtime/engine behavior change (engine already returns
3200, the safe value). Strict toBe(3200) assertion (not weakened).

Verify: ultimate-speed-feed.test.ts 76/76 (was 1 RED). physics-reviewer PASS
(3/3 canonical, Inconel-718 3200 in published band, safe direction).
```

## Files touched (2)
- mcp-server/src/__tests__/ultimate-speed-feed.test.ts | 10 +++++++++-
- 1 file changed, 9 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong canonical layer) instead of the grade value 3200.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 396ae501b7b0`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._