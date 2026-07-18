# BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-NONDIM-RESCUE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (region-route fused was dims-only)

**Commit:** `e7fd24791bca` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T03:53:07-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-region-nondim-rescue, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (region-route fused was dims-only)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-NONDIM-RESCUE (slot:xray): recover region GD&T/notes on the dense-rescue path (region-route fused was dims-only)

The documented honest limit from the P1.5 region-routing arc: when a dense pages full-page
floor FAILS (0 dims AND 0 gdt), region routing recovered the DIMENSIONS via the crops but
GD&T/notes/profiles/surface_finishes stayed EMPTY -- the hybrid fused took its non-dim fields
from the failed floor. So the hardest pages (dense, where cropping is the whole point) lost
exactly the GD&T the operator flagged delta missing. This recovers them.

- vision-ensemble-fuse.mjs: export NON_DIM_KEY_FNS (the 4 per-field identity keys) so the
  region union de-dupes by the SAME identity the ensemble fuse uses -- one identity, not a fork (R8).
- region-glue-lib.mjs: new pure mergeRegionFused(fullPageFused, perRegionFused) -- recall-first
  union of the non-dim fields across the floor + every per-region fused, de-duped by NON_DIM_KEY_FNS.
  Floor is the FIRST source (wins a key tie); recall-first (null dropped, primitives deduped by
  value, un-keyable objects KEPT -- never drop a read label); does NOT re-corroborate across regions
  (each entry keeps the corroboration/n_models it earned in its own region ensemble fuse).
  buildRegionRoutedFused gains opts.regionFused -> Object.assigns the merged non-dim onto the output;
  byte-identical when absent (back-compat). Also dropped a rot-prone stale line citation in a comment.
- region-classify.mjs: extractWithRegionRouting captures each regions full fused (was dims-only) and
  passes regionFused to buildRegionRoutedFused.

Tests: region-glue-lib 30/30 (8 new: dense-rescue recovery, floor-wins-tie, distinct-kept,
notes/profiles/finishes union, malformed no-throw, recall-first primitive, end-to-end + back-compat)
+ region-classify 17/17 + vision-ensemble-fuse 43/43. Per-file 2-arm scrutiny PASS (0 P0/P1).
A real regression was caught DURING dev (the union initially dropped a string-note stand-in) and
fixed by making mergeRegionFused recall-first -- the test that pins it is in the suite (R12: fixed
the CODE to be recall-first, never weakened the preserved-notes assertion). Completes the GD&T
recall arc with U-XRAY-ENSEMBLE-NONDIM-UNION + U-XRAY-GDT-LABEL-TIER (same session).
```

## Files touched (5)
- scripts/lib/region-glue-lib.mjs      | 61 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/lib/region-glue-lib.test.mjs | 68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vision-ensemble-fuse.mjs |  5 +++++
- scripts/region-classify.mjs          |  6 ++++--
- 4 files changed, 135 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7fd24791bca`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._