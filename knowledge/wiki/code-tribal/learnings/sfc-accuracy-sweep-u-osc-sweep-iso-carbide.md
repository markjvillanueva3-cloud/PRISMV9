# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-ISO-CARBIDE — [MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-ISO-CARBIDE (slot:oscar): add carbide-only per-ISO median to the sweep summary so the accuracy-proof artifact shows the apples-to-apples signal, not just the material-MIXED median. The all-material per-ISO median compares hss/ceramic/cbn rows against a CARBIDE-keyed baseline, so it can read 'aggressive' (P all-mat +6.5%) while carbide alone is conservative (P carbide-only -5.5% SAFE). Both columns now print + prism_carbide_only_median_delta_pct in --json. Validated: prod smoke 6 ISO groups carbide-SAFE/neutral. Serves the operator's 'prove it works 100%' gate. Completes the sweep-reporting honesty trio (per-mode fz + carbide-only ISO + uncapped Vc).

**Commit:** `bb0184f15f7f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T05:05:04-05:00
**Tags:** sfc-accuracy-sweep, u-osc-sweep-iso-carbide, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-ISO-CARBIDE (slot:oscar): add carbide-only per-ISO median to the sweep summary so the accuracy-proof artifact shows the apples-to-apples signal, not just the material-MIXED median. The all-material per-ISO median compares hss/ceramic/cbn rows against a CARBIDE-keyed baseline, so it can read 'aggressive' (P all-mat +6.5%) while carbide alone is conservative (P carbide-only -5.5% SAFE). Both columns now print + prism_carbide_only_median_delta_pct in --json. Validated: prod smoke 6 ISO groups carbide-SAFE/neutral. Serves the operator's 'prove it works 100%' gate. Completes the sweep-reporting honesty trio (per-mode fz + carbide-only ISO + uncapped Vc).

## Body
```
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-ISO-CARBIDE (slot:oscar): add carbide-only per-ISO median to the sweep summary so the accuracy-proof artifact shows the apples-to-apples signal, not just the material-MIXED median. The all-material per-ISO median compares hss/ceramic/cbn rows against a CARBIDE-keyed baseline, so it can read 'aggressive' (P all-mat +6.5%) while carbide alone is conservative (P carbide-only -5.5% SAFE). Both columns now print + prism_carbide_only_median_delta_pct in --json. Validated: prod smoke 6 ISO groups carbide-SAFE/neutral. Serves the operator's 'prove it works 100%' gate. Completes the sweep-reporting honesty trio (per-mode fz + carbide-only ISO + uncapped Vc).
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 19 +++++++++++++++----
- 1 file changed, 15 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bb0184f15f7f`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._