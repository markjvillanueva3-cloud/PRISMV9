# SFC-JM-ACCURACY/U-SFC-PHYSCMP-CLAMP-AWARE — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-CLAMP-AWARE (slot:oscar): split clamped vs unclamped aggressive flags + surface the real catches

**Commit:** `8d679ff26eec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:48:13-05:00
**Tags:** sfc-jm-accuracy, u-sfc-physcmp-clamp-aware, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-CLAMP-AWARE (slot:oscar): split clamped vs unclamped aggressive flags + surface the real catches

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-PHYSCMP-CLAMP-AWARE (slot:oscar): split clamped vs unclamped aggressive flags + surface the real catches

Spot-checking the top 'D2 1500sfm 5.7x' catch revealed it is a G96 CSS TARGET
preceded by G50 S1500 (max-rpm clamp) -- the effective surface speed is rpm-capped
far below 1500, so the programmed-CSS ratio overstates severity. Fix: segment
aggressive into aggressiveUnclamped (high-confidence true over-speeds, no G50 cap)
vs aggressiveClamped (upper-bound, needs cut diameter); rank unclamped first so the
actionable set surfaces. LIVE on the precision-fixed corpus: 16,942 aggressive ->
only 42 UNCLAMPED (top ratio ~1.11, i.e. mild) + 16,900 clamped upper-bound. With
the material precision fix, the implausible S=5076 superalloy is GONE (byIso now
P/H/N/M only). Honest conclusion: JM lathe runs overwhelmingly CONSERVATIVE; ~42
mild unclamped over-speeds to review, no gross unclamped errors.
```

## Files touched (2)
- scripts/sfc-jm-physics-compare.mjs | 22 +++++++++++++++++-----
- 1 file changed, 17 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d679ff26eec`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._