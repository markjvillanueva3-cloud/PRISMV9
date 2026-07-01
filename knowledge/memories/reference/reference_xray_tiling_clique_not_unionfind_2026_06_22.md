---
name: reference_xray_tiling_clique_not_unionfind_2026_06_22
description: Cross-tile OCR dimension merge must use greedy CLIQUE partition, not union-find -- connected-components over the NON-transitive tile-overlap relation silently over-merges distinct features (scrutiny-caught P1, xray commit f0a08b7c02)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.278Z
aliases: reference_xray_tiling_clique_not_unionfind_2026_06_22
---


**U-XRAY-TILING-CORE (slot:xray, 2026-06-22, commit `f0a08b7c02`).** The GPU-free pure core of backlog P0.2 "region tiling for dense pages" (`scripts/lib/vision-tiling-lib.mjs`): `computeTileGrid` produces overlapping quadrant tiles + a center tile spanning the seam cross; `mergeTiledDimensions` recombines the per-tile VLM extractions into one de-duplicated dimension set. The image-crop + ensemble-OCR + live-corpus validation is the NEXT unit -- this is the verifiable foundation (R13 logical order).

**Key data fact (R12 -- never assume a structure's contents):** our VLM dims carry a free-text `location_hint`, NOT a numeric bbox (verified against `extractDimension` in `ollama-vision-extract-lib.mjs`). The backlog's assumed `(value,type,bbox)` dedup key does not exist. So the merge is **overlap-topology + (type,value,raw)-keyed and RECALL-FIRST**: a seam dim seen in OVERLAPPING tiles collapses to one (with a `tileAgreement` count); two distinct same-valued features in NON-overlapping tiles are kept; unknown topology / null tileId / unknown tile id never cross-merge and never drop a candidate. A dropped real dim is unrecoverable recall loss; a kept near-duplicate is a precision cost the calibration/AL tier absorbs (backlog P1.6).

**The transferable lesson (scrutiny-caught P1, the dangerous over-merge direction):** the first cut clustered same-key instances with **union-find (connected components)** over the `connected` relation (two instances connect iff their tiles overlap). But **tile-overlap is geometrically NON-TRANSITIVE**: in the default 2x2+center grid the center tile overlaps BOTH diagonal quadrants `r0c0` and `r1c1`, which do NOT overlap each other. A value appearing in all three transitively bridges `r0c0--center--r1c1` into one component -> two DISTINCT corner features silently collapse into one (recall loss). **Fix = GREEDY CLIQUE PARTITION:** an instance joins an existing group only if it is directly `connected` to EVERY member already in the group, else it starts a new group. A single physical label lands in N tiles only when those tiles share a common region, i.e. they are PAIRWISE overlapping (a clique); so two non-overlapping tiles can never co-occupy a group. Greedy clique-cover is order-dependent + not globally optimal, but every order-dependence outcome is in the SAFE under-merge direction (it can only ever SPLIT one feature, never MERGE two distinct ones). Pinned by an adversarial over-merge-guard test.

**General rule:** when grouping items by a "share a region/resource" relation that is SYMMETRIC but NOT TRANSITIVE (overlap, proximity, fuzzy-match within a threshold), union-find / connected-components OVER-MERGES via bridge elements. Use clique-partition (or require direct pairwise membership) when the grouping semantics demand every member be mutually related. Connected-components is correct ONLY when the relation is transitive (or an over-merge is acceptable).

2-arm scrutiny PASS after the fix; 22/22 tests; pure ASCII. Sibling units this session: [[reference_xray_thread_normalize_2026_06_22]] (thread normalizer), [[reference_xray_mill_program_gt_2026_06_22]] (mill-GT). Backlog: [[blueprint-reading-improvement-backlog-2026-06-19]].
