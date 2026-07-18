# BLUEPRINT-VISION-OCR/U-XRAY-TILING-CORE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-CORE (slot:xray): pure tile-grid geometry + recall-first cross-tile dimension merge (P0.2 dense-page region tiling core)

**Commit:** `f0a08b7c022d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:12:09-05:00
**Tags:** blueprint-vision-ocr, u-xray-tiling-core, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-CORE (slot:xray): pure tile-grid geometry + recall-first cross-tile dimension merge (P0.2 dense-page region tiling core)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-CORE (slot:xray): pure tile-grid geometry + recall-first cross-tile dimension merge (P0.2 dense-page region tiling core)

The GPU-free pure core of backlog P0.2 "region tiling for dense pages" (the highest-leverage OPEN
recall lever -- "a dim that was clear but missed in a busy corner"). The image-crop + ensemble-OCR
integration + live-corpus validation is the next unit; this is the verifiable foundation it sits on
(R13 logical order: build the proven core before the integration).

scripts/lib/vision-tiling-lib.mjs (pure, no image I/O, no GPU):
- computeTileGrid(w,h,opts) -> overlapping NxM quadrant tiles + a center tile spanning the seam cross.
  1x1 = full-page passthrough; overlapFrac clamped [0,0.49]; rows/cols clamped >=1; tiles in-bounds;
  center only when rows>1 AND cols>1; throws fail-loud on non-finite page size (R12).
- tilesOverlap(a,b) -> positive-area rect intersection (strict; edge-touch is NOT overlap).
- mergeTiledDimensions(perTile,{tiles}) -> recombine per-tile VLM extractions into one de-duped set.

R12 -- verified the VLM dims carry a free-text location_hint, NOT a numeric bbox (the backlog's assumed
(value,type,bbox) key does not exist). So the merge is overlap-topology + (type,value,raw)-keyed and
RECALL-FIRST: a seam dim seen in OVERLAPPING tiles collapses to one (tileAgreement count); two distinct
same-valued features in NON-overlapping tiles are kept; unknown topology / null tileId / unknown tile id
never cross-merge and never drop a candidate (a dropped real dim is unrecoverable recall loss).

Scrutiny (2-arm, both PASS after fix) caught a real P1 in the first cut: union-find over the
geometrically NON-TRANSITIVE tilesOverlap relation let the center tile transitively bridge two distinct
corner features (r0c0--center--r1c1, where r0c0 and r1c1 do not overlap) into one -- a silent over-merge.
Fixed by GREEDY CLIQUE PARTITION (an instance joins a group only if directly connected to EVERY member);
a single physical label lands in N tiles only when they pairwise overlap (a clique), so two
non-overlapping tiles can never co-occupy a group; worst case is a safe under-merge. Pinned by an
adversarial over-merge-guard test.

22/22 tests: grid geometry (happy + 1x1 + clamps + fail-loud) + overlap + merge (seam-collapse,
distinct-feature-keep, intra-tile dup, type/value-tolerance separation, raw-callout merge, passthrough,
no-topology conservative, over-merge guard, 3-clique seam, unknown-tile-id, NaN-value). Pure ASCII.
```

## Files touched (3)
- scripts/lib/vision-tiling-lib.mjs      | 224 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/vision-tiling-lib.test.mjs | 261 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 485 insertions(+)

## Lessons surfaced in commit body
- TILING-CORE (slot:xray): pure tile-grid geometry + recall-first cross-tile dimension merge (P0.2 dense-page region tiling core)
- tiling for dense pages" (the highest-leverage OPEN
- tiling-lib.mjs (pure, no image I/O, no GPU):
- TileGrid(w,h,opts) -> overlapping NxM quadrant tiles + a center tile spanning the seam cross.
- tiles in-bounds;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f0a08b7c022d`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._