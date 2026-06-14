---
name: reference-whiskey-lathe-corpus-state-2026-05-27-iter42
description: Snapshot of whiskey lathe corpus state at iter42 (2026-05-27). 42 consecutive Stop→ship→Stop iters under /goal /yolo-mode (cron 4d08d27a). Next-session pickup playbook with thin-bucket targets.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.047Z
aliases: reference_whiskey_lathe_corpus_state_2026_05_27_iter42
---


# Whiskey lathe corpus state — 2026-05-27 (iter42)

## Cumulative state

- **432 videos / ~119 lathe-relevant** in `mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json`
- **34 topic phrase patterns** in `scripts/extract-lathe-videos-tribal.mjs` (G70-G76, G96/G97/G50, insert geometry C/W/D/S/T/V/R, boring bars, live tooling, sub-spindle, facing/parting/chamfer, workholding/chucks, tailstock, sequencing, speed-feed, chip control, chatter, thin-wall, stainless/hardened/aluminum, tips-and-tricks, first-part-discipline, controllers Fanuc/Haas/Okuma/Mazak)
- **14 vendors / 87+ grades** in `lathe-tribal-master-index-2026-05-26.json` (tier-A indexed)
- **25/25/12/13/19 breadth** in `lathe-vendor-expansion-2026-05-26.json` (tier-A + tier-B + machine + holder + workholding + media)

## Last 3 iters

- iter40 (2026-05-27): `2ofXznnpuaQ` — live-tooling C-axis Haas DS (428 segs, DNMG/RCMT, KCU25)
- iter41 (2026-05-27): `1Fgj7m4MTbw` + `UOCNSv0Kyd8` — finishing-pass surface-finish (1464 segs/80367 chars)
- iter42 (2026-05-27): `NcP-HTBncv4` — GibbsCAM mill-turn multi-task (112 segs/5039 chars)

## Thin buckets remaining (next-iter targets)

Priority by under-coverage:
1. **JM-machine manual coverage** (default-next per `[[feedback_jm_machine_manual_coverage_doctrine]]`) — Okuma LB/LU operator manuals + alarm books + parts books
2. **G76 threading deep-dive** — only ~4/118 corpus mentions, despite ALCOA baseline showing 4/11 programs thread
3. **Sub-spindle pickoff** — under-covered in current corpus
4. **Hardened-steel turning** — CBN inserts, edge prep, light DOC
5. **Aluminum high-speed turning** — KCU25 territory, polish + chip evacuation
6. **Bar-feeder + automatic loading** — production-mode skills

## Ship pattern verbatim (next iter)

```bash
cd "H:/prism" && rtk node scripts/youtube-free-extract.mjs "ytsearch2:<topic>" --transcript-only
cd "H:/prism-slot-whiskey" && rtk node scripts/extract-lathe-videos-tribal.mjs --src "H:/prism/state/shared/youtube-extraction"
rtk git -C "H:/prism-slot-whiskey" add knowledge/wiki/lessons/video-extract-<id>.md mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json
rtk git -C "H:/prism-slot-whiskey" commit -m "[slot/whiskey] [WHISKEY-ACADEMY-LATHE-BRIDGE-MS0]/U-LATHE-VIDEO-<TOPIC> iter<N>: ..."
```

## Pending P0/P1 units (unchanged since iter7)

- U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE (P0) — T-number → ANSI insert mapping
- U-LATHE-G76-THREAD-VALIDATOR (P0)
- U-LATHE-AB-VERSION-LOCATOR (P0) — find "upgraded" B versions in JM archive
- U-LATHE-WIZARD-VENDOR-LOOKUP (P0) — wire wizard_query_records into LatheCAMIntelligenceEngine.selectInsert
- U-LATHE-TRIBAL-QUERY-DISPATCHER (P0) — prism_lathe:query_vendor_tribal MCP action
- U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (P0) — engine-backed training-loop stages
- U-LATHE-VENDOR-EXPANSION-DEEP-CURATE (P1)
- U-LATHE-MACHINE-VENDOR-MODELS (P1)
- U-LATHE-VENDOR-PDF-DOWNLOAD (P1)
- U-LATHE-H-CLASS-CBN-EXPANSION (P1)
- U-LATHE-LOOP-STAGE-IMPL-6-TO-11 (P1)
- U-LATHE-VENDOR-GRAPH-NODE (P2)
- U-LATHE-MEDIA-INGEST-PIPELINE (P2)

## Related

- [[feedback_yolo_mode_nonterminal_goal_pattern]] — the doctrine governing this loop
- [[feedback_jm_machine_manual_coverage_doctrine]] — standing rule, default-next after PDFs
- [[lathe-baseline-ALCOA-2026-05-26]] — first quality measurement; surfaced U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE
- [[reference_whiskey_academy_lathe_bridge_2026_05_26]] — iter1 seed
