# KIENZLE-LATHE-WIZARD/U-W2F-RUNGA-READ-FIX — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2F-RUNGA-READ-FIX (slot:whiskey): unified dashboard read REAL Rung A data (was null) -- robust flat-or-nested field resolve (R12)

**Commit:** `645f752a0e66` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T04:20:34-05:00
**Tags:** kienzle-lathe-wizard, u-w2f-runga-read-fix, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2F-RUNGA-READ-FIX (slot:whiskey): unified dashboard read REAL Rung A data (was null) -- robust flat-or-nested field resolve (R12)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2F-RUNGA-READ-FIX (slot:whiskey): unified dashboard read REAL Rung A data (was null) -- robust flat-or-nested field resolve (R12)

The unified closed-loop dashboard showed "SFM p50 null, ?% G50-cap, ? overspeed-risk" in --no-run mode because the rung_a reader read FLAT top-level fields (a.sfm_p50 etc.) while the persisted dashboard NESTS them under aggregate.*/safety.*/sampling.* (the harness stdout and the dashboard file have different shapes). A misleading null on real data = R12 violation in the operator's "ONE comprehensive closed-loop test".

Fix: resolve each Rung A field robustly with `??` fallback across both shapes (a.sfm_p50 ?? a.aggregate.sfm_overall.p50, a.g96_cap_compliance_pct ?? a.safety.g96_cap_compliance_pct, a.overspeed_risk ?? a.safety.g96_WITHOUT_cap_OVERSPEED_RISK ?? overspeed_risk_programs.length, analyzed ?? sampling.analyzed ?? aggregate.programs, feed_p50 ?? aggregate.feed_ipr_overall.p50). Computed once (aR) + used in both report.rung_a and the headline.

Verified live (--no-run --skip-b): headline now "Empirical cloud over 34993 JM .MIN (SFM p50 182.2, 98.3% G50-cap, 545 overspeed-risk)" -- the real corpus numbers, was all-null. Additive; no other behavior changed.
```

## Files touched (2)
- scripts/lathe-closed-loop-full.mjs | 31 ++++++++++++++++++++++---------
- 1 file changed, 22 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 645f752a0e66`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._