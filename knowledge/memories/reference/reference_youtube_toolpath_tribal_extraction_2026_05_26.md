---
name: youtube-toolpath-tribal-extraction-2026-05-26
description: "Victor's YouTube extractor wired into delta's pipeline (slot:delta /loop iters 6-7 commit 6dd62c→[new]) — 72 CAD/CAM tutorial transcripts harvested across 14 ytsearch3 queries, 136 toolpath-tribal entries extracted via pure-fn regex notability (Ollama-down workaround), embedded into tribal-embed-index 23078→23104 (+136 total across iters)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.076Z
aliases: reference_youtube_toolpath_tribal_extraction_2026_05_26
---


# YouTube toolpath tribal extraction (slot:delta /loop iters 6-7 2026-05-26)

User directive: *"extract wiki and tribal knowledge from as many videos as it takes for you to learn how to use every function in each of the primary cad software | goal clear: generate wiki and tribal knowledge nodes for every single tool path"*.

## Outcome — 72 transcripts → 136 toolpath tribal entries

| Metric | Value |
|---|---|
| Search queries (ytsearch3:...) | 14 across 8 software families + general CAM + Onshape + Rhino |
| Transcripts harvested ($0 via yt-dlp + auto-captions) | 72 JSON artifacts in `state/shared/youtube-extraction/` |
| Successfully processed | 68 (4 are tips-fallback placeholders w/ no full_text) |
| Chunks scanned (200-600 char sentence-grouped) | 224 |
| Tribal entries emitted (notability ≥ 0.4) | **136** |
| Cumulative index growth | 23,078 → 23,104 (this iter alone +26 vs iter 6's +110) |

## Architecture (Ollama-down workaround)

```
yt-dlp + YouTube auto-captions
  ↓ (victor's youtube-free-extract.mjs --transcript-only — bypasses Ollama)
state/shared/youtube-extraction/<videoId>.json
  ↓ (delta's scripts/lib/youtube-transcript-to-tribal-lib.mjs — pure-fn, NO Ollama)
mcp-server/data/tribal/youtube-toolpath-tribal.jsonl
  ↓ (scripts/embed-tribal-jsonl-into-index.mjs — uses Ollama /api/embeddings — alive)
state/shared/tribal-embed-index.json  ← LIVE for tribal-by-domain-inject
```

Critical: Ollama `/api/chat` is currently DOWN (rewriter banner 100% skipped 50/50). Victor's tip-extraction step would have failed there. Delta's pure-fn regex notability scorer bypasses the dead endpoint while `/api/embeddings` (nomic-embed-text on GPU) is healthy for the final embed step.

## Per-iter shipment

| Iter | Commit | Surface |
|---|---|---|
| 6 | `[delta] U-YT-TRANSCRIPT-TO-TRIBAL` | NEW: lib (165 L, 5 exports) + 23-test suite + CLI walker. 49 transcripts → 110 entries. |
| 7 | _(same script, more harvests)_ | 6 new ytsearch3 queries (Mastercam HSM + Fusion swarf + hyperMILL tilt + PowerMill Vortex + Onshape mates + Rhino Grasshopper). 19 new transcripts → +26 entries. |

## Notability scorer (toolpath-specific, replaces lima's CNC-generic)

7 regex families tuned for video tutorials:
- TOOLPATH (highest signal): toolpath/contour/pocket/adaptive/scallop/spiral/helix/ramp/plunge/peck/trochoidal/swarf/projection/morphed/flowline/raster/engraving
- CAM_OP: 2D/3D/3+2/5-axis/4-axis/mill/turn/drill/tap/bore/finish/rough/chamfer/fillet/deburr/engrave
- CUTTING_PARAM: RPM/SFM/SFPM/IPM/IPR/IPT/mm/min/m/min/mm/rev/degree/inch/mm
- FORMULA: `\w+\s*=\s*[\w\d\.\+\-\*\/\s]+`
- SAFETY: warning/caution/never/always/danger/crash/collision/interference/overcut/undercut
- HOWTO (tutorial verbs): select/click/right-click/toggle/enable/set/change/adjust/specify/define/create
- GCODE: G\d{1,3}|M\d{1,3}

## YouTube auto-caption dedupe (key to readability)

YouTube auto-captions emit each line 3x in segments (sliding-window subtitle display). `dedupeYouTubeRepeats(text)` scans 30..5 word windows for adjacent identical phrases and collapses them. Test asserts a 3x-repeated 7-word phrase collapses to 1 copy without affecting non-repeating content.

## Domain breakdown of 136 emitted entries

| Domain | Count | Sources |
|---|---|---|
| cam | 114 | Fusion CAM + Mastercam + hyperMILL + PowerMill + Inventor CAM + SolidWorks CAM + CATIA + NX |
| lathe | 12 | Lars Christensen lathe inserts |
| cad | 5 | SolidWorks part design + Onshape + Rhino |
| general | 4 | General CNC fundamentals (Saunders/Edge channels) |
| mill | 1 | Generic mill |

## Test coverage (23/23 pass)

- 3 failure modes: empty/null/non-string inputs; missing full_text; non-object artifact
- 2 adversarial: alternating partial repeats don't crash; 1MB chunk no ReDoS
- variability ≥3: Fusion CAM + SolidWorks + Mastercam fixtures + 6 domain inferences

## Delta soul fidelity

- `silent-feature-recognition-fallback`: REFUSED — 4 tips-fallback placeholder transcripts surface as `no full_text`, NOT silently treated as empty
- `dropping-pmi-data-on-import`: PRESERVED — per-entry `notability_diag` carries toolpath/camOps/params/formulas/gcode counts
- `inline-iso286-fit-values`: N/A (videos are toolpath tutorials, no ISO 286 deviation values)

## Open follow-up units

- **U-YT-TRANSCRIPT-YIELD-TUNE** — 3.5 chunks/video avg is low (dedupe aggressive). Tune window threshold or chunk smaller. 5x yield possible.
- **U-YT-WIKI-NODE-EMITTER** — directive's "goal_clear" requires WIKI nodes per video. Each video → `knowledge/wiki/code-tribal/youtube-<id>.md` summarizing the toolpaths covered (per victor's pre-baked WIKI_DIR path).
- **U-YT-OLLAMA-TIP-PARSER** — when Ollama /api/chat recovers, re-process all 72 transcripts via victor's full pipeline for LLM-extracted tips (richer than regex).
- **U-YT-BROADEN-CHANNELS** — operator suggests NYC CNC, Edge Precision, Saunders Machine Works, Mastercam official channel, OPEN MIND channel.

## Related

- [[reference_youtube_free_extraction_pipeline_2026_05_26]] — victor's underlying $0 extractor
- [[reference_lima_pypdf_extraction_canonical_2026_05_26]] — sister PDF pipeline (this is the video analog)
- [[reference_online_cad_cam_tips_extraction_rollup_2026_05_26]] — sister PDF /goal session rollup (1,107 entries earlier)
- [[reference_embed_tribal_jsonl_2026_05_26]] — the jsonl embedder both pipelines feed
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF rule (this extends to videos via parallel rationale)
- [[feedback_no_public_h_drive]] — transcripts are H:-internal only
