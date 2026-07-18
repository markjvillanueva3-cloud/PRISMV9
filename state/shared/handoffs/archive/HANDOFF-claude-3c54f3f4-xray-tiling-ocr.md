---
session: claude-3c54f3f4
topic: xray-tiling-ocr
slot: xray
written_at: 2026-06-22T16:14:12.654Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-3c54f3f4
status: active
---

# HANDOFF: claude-3c54f3f4
Updated: 2026-06-22T16:14:12.654Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-3c54f3f4

## STATE
Tiling pipeline: scripts/lib/vision-tiling-lib.mjs (24 tests) + crop-image-tiles.py + scripts/vision-tiling-extract.mjs (14 tests) + validate-perfect-parts.mjs --tile; forceUnits threaded through ollama-vision-extract-lib.mjs + vision-ensemble-fuse.mjs (ADDITIVE, production unaffected). Memories: reference_xray_tiling_clique_not_unionfind_2026_06_22, reference_xray_tiling_extract_e2e_bugs_2026_06_22.

## RESUME
Continue xray closed-loop OCR. SHIPPED this session (5 units, all live-validated + 2-arm scrutiny PASS): 0440ed4f04 chamfer/csk normalizer; f0a08b7c02 tiling pure-core (clique-not-union-find merge); d012c5e0a5 tiling integration end-to-end (live +recall vs full-page); 761c045224 tiling force-units (tiles lose title block); d94fc110ae tiling wired into validate-perfect-parts --tile (recall vs CNC-program GT). P0.2 region tiling COMPLETE end-to-end. KEY FINDING: tiling lift is PART-DEPENDENT -- helps DENSE mill prints (11-12 vs 8 dims), equal on SPARSE lathe parts (both 0.4286 on 05850). NEXT by ROI: (1) SELECTIVE tiling -- only tile dense pages; (2) corpus-scale tile-vs-baseline mean-recall (long resumable GPU run); (3) backlog P1.4 GD&T structured prompting / P1.5 layout-aware routing. tsc --max-old-space-size=12288. Reliable VLM = qwen3-vl:8b-instruct.

## CONTEXT

