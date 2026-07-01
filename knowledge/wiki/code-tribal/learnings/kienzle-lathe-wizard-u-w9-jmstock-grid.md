# KIENZLE-LATHE-WIZARD/U-W9-JMSTOCK-GRID — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W9-JMSTOCK-GRID (slot:whiskey): ground closed-loop Rung-B grid in JM's real tool-steel stock at annealed-P state

**Commit:** `ba5814c76de5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T14:52:21-05:00
**Tags:** kienzle-lathe-wizard, u-w9-jmstock-grid, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W9-JMSTOCK-GRID (slot:whiskey): ground closed-loop Rung-B grid in JM's real tool-steel stock at annealed-P state

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W9-JMSTOCK-GRID (slot:whiskey): ground closed-loop Rung-B grid in JM's real tool-steel stock at annealed-P state

The Rung-B harness grid premise was empirically inverted: it assumed 'free-machining +
medium-carbon steel' (6/10 P-commodity) but JM's actual stock (jm-die-stock-material-catalog.json,
QuickBooks 2014-2026) is tool-steel-DOMINANT (H13 38%, M2 17%, D2 12%, S7 11%) -- H13/M2/D2/S7 were
ABSENT. Regrounded the 10-material grid in JM's real high-volume grades at the ANNEALED turning state
(ISO P; A2 hard-turn=H minority), since the Rung-A cloud (G96-literal SFM p50=200 ft/min) shows JM
turns these annealed not hard. Validated: 60 programs, 0 errors, envelope_sfm 100% / feed 96.3% vs
cloud (the 100% SFM confirms annealed-P over oscar's hardened-H service-state prior).

Also hardens lathe-closed-loop-full.mjs RUNG_B spawn with NODE_OPTIONS=--max-old-space-size=8192
(the harness material loader re-reads+fails every P_STEELS/*.json per program and OOMs default 4GB
past ~60 programs -- a pre-existing loader read-path bug surfaced, flagged for a shared/oscar fix).
Held grid to the proven 60-program scale (swap-not-grow) so no OOM regression.

reference_whiskey_jm_stock_turning_state_2026_06_26
```

## Files touched (3)
- mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts | 42 +++++++++++++++++++++++++++++++-----------
- scripts/lathe-closed-loop-full.mjs                     |  6 +++++-
- 2 files changed, 36 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ba5814c76de5`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._