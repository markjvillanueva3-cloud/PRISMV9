# SFC-JM-ACCURACY/U-OSC-SWEEP-FZ-MODE-SPLIT — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-SPLIT (slot:oscar): emit per-mode fz median in the sweep --json summary (cost_batch/aggressive_rush/prism_optimized) so the aggregate +124.7% is not read as a uniform over-prediction. Live-validated: cost_batch ~46pct (conservative, matches G-Wizard direction) vs aggressive_rush ~200pct (high BY DESIGN). Completes task #17 data side; the text NOTE (2515b7ece8) already mitigates the console summary.

**Commit:** `0127e342737d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T04:24:13-05:00
**Tags:** sfc-jm-accuracy, u-osc-sweep-fz-mode-split, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-SPLIT (slot:oscar): emit per-mode fz median in the sweep --json summary (cost_batch/aggressive_rush/prism_optimized) so the aggregate +124.7% is not read as a uniform over-prediction. Live-validated: cost_batch ~46pct (conservative, matches G-Wizard direction) vs aggressive_rush ~200pct (high BY DESIGN). Completes task #17 data side; the text NOTE (2515b7ece8) already mitigates the console summary.

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-SPLIT (slot:oscar): emit per-mode fz median in the sweep --json summary (cost_batch/aggressive_rush/prism_optimized) so the aggregate +124.7% is not read as a uniform over-prediction. Live-validated: cost_batch ~46pct (conservative, matches G-Wizard direction) vs aggressive_rush ~200pct (high BY DESIGN). Completes task #17 data side; the text NOTE (2515b7ece8) already mitigates the console summary.
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 13 +++++++++++--
- 1 file changed, 11 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0127e342737d`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._