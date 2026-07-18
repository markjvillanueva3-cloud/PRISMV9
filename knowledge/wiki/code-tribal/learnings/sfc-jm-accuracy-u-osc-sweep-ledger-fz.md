# SFC-JM-ACCURACY/U-OSC-SWEEP-LEDGER-FZ — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-LEDGER-FZ (slot:oscar): persist feed-per-tooth in the full-sweep ledger (india training-data completeness)

**Commit:** `3bd4ecc4ad87` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:44:02-05:00
**Tags:** sfc-jm-accuracy, u-osc-sweep-ledger-fz, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-LEDGER-FZ (slot:oscar): persist feed-per-tooth in the full-sweep ledger (india training-data completeness)

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-LEDGER-FZ (slot:oscar): persist feed-per-tooth in the full-sweep ledger (india training-data completeness)

The per-cell sweep ledger (the india LoRA/GNN + PRISM_SFC_CALIB_APPLY training input) recorded Vc ONLY --
prism_vc_mpm + per-vendor Vc deltas -- so feed-per-tooth, a primary cutting parameter, was absent from the
training dataset (the fz variance was computed for the summary but never persisted). Now the ledger also
carries fz: prism_fz_mm + gwizard_published_fz_delta_pct + hsmadvisor_published_fz_delta_pct.

Additive (5 edits mirroring the existing Vc fields): axisFz() helper (mirrors axisVc), prismFz from
by.prism.axes.fz_mm, capture ps.fz_variance_pct per published vendor, 3 new row fields. Vc fields + the
576-cell count are byte-unchanged. Live-validated: re-ran prod mode --no-vendor -> 576 rows, fz present
(e.g. steel: prism_fz_mm 0.0561, +40.2% vs G-Wizard published). Per-unit reviewer deferred to the Stop
3-of-3 (token budget; additive script change, live-validated). The +124.7% median fz divergence vs
G-Wizard remains the queued focused accuracy unit. Ledger is gitignored data/state (not committed).
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 16 ++++++++++++++--
- 1 file changed, 14 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3bd4ecc4ad87`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._