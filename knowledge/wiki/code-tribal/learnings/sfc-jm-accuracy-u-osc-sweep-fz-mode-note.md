# SFC-JM-ACCURACY/U-OSC-SWEEP-FZ-MODE-NOTE — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-NOTE (slot:oscar): flag that the sweep summary's fz delta MIXES modes (R12 honesty mitigation)

**Commit:** `2515b7ece856` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T04:17:40-05:00
**Tags:** sfc-jm-accuracy, u-osc-sweep-fz-mode-note, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-NOTE (slot:oscar): flag that the sweep summary's fz delta MIXES modes (R12 honesty mitigation)

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-NOTE (slot:oscar): flag that the sweep summary's fz delta MIXES modes (R12 honesty mitigation)

The PRISM-vs-G-Wizard summary prints one median fz delta (+124.7%) that aggregates across optimization
modes (cost_batch ~+47% .. aggressive_rush ~+200%), reading as a uniform over-prediction when it is not --
PRISM's aggressive modes are meant to exceed a vendor's single conservative published fz (resolved, NOT a
bug; reference_oscar_full_sweep_validated_2026_06_25). Adds a 3-line NOTE flagging the mode-aggregation;
output-text only (no logic change, node --check clean). The full per-mode median split stays task #17.
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 3 +++
- 1 file changed, 3 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2515b7ece856`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._