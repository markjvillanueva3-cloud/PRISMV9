# SFC-JM-ACCURACY/U-SFC-PHYSCMP-MATSTATE — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-MATSTATE (slot:oscar): report P<->H material-STATE sensitivity (annealed vs hardened) -- the honest band range

**Commit:** `38a099807eb1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T10:14:39-05:00
**Tags:** sfc-jm-accuracy, u-sfc-physcmp-matstate, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-MATSTATE (slot:oscar): report P<->H material-STATE sensitivity (annealed vs hardened) -- the honest band range

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-MATSTATE (slot:oscar): report P<->H material-STATE sensitivity (annealed vs hardened) -- the honest band range

JM's material is tool steel (H grades, 93.7% of purchases) BUT die tool steel is
rough-TURNED ANNEALED (soft, P-like machinability) and only hardened later for
grinding/hard-turning -- and programs don't record hardness state. So a single
default is falsely precise. physics-compare now reports BOTH byBand (unknown->H,
hardened) and byBandSoftBound (unknown->P, annealed). LIVE 509,381 lathe CSS ops:
soft/annealed reading = 88% conservative + 3% aggressive (the operative case for
lathe roughing); hardened reading = 45% cons + 30% in-band + 24% aggressive. Of
all aggressive flags only 169 are UNCLAMPED (rest G50-capped). HONEST CONCLUSION:
JM lathe runs conservative-to-in-band for annealed tool steel; ~169 unclamped
over-speeds max; true band needs per-op hardness state (recommend capturing it).
The soul refuses publishing-a-speed-feed-without-uncertainty -- this surfaces it.
```

## Files touched (2)
- scripts/sfc-jm-physics-compare.mjs | 22 ++++++++++++++++++----
- 1 file changed, 18 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 38a099807eb1`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._