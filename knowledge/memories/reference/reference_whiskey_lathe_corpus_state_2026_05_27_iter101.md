---
name: reference-whiskey-lathe-corpus-state-2026-05-27-iter101
description: Whiskey lathe corpus snapshot at iter101 (2026-05-27). 101 consecutive Stop→ship→Stop iters this session under /goal /yolo-mode (cron 4d08d27a, */5 * * * *). Closes session at tool-batch ceiling. Successor-of [[reference_whiskey_lathe_corpus_state_2026_05_27_iter42]].
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.258Z
aliases: reference_whiskey_lathe_corpus_state_2026_05_27_iter101
---


# Whiskey lathe corpus state — 2026-05-27 (iter101)

## Session arc

- iter40 → iter101 this session (61 new iters)
- Each iter = one ytsearch → extractor → slot-worktree commit
- Closed at iter101 due to tool-batch ceiling (144/60min hit)

## Cumulative coverage this session

### 5 JM-fleet controllers
- iter49 Okuma OSP-P300L
- iter50 Mazak Mazatrol (2354 segs/104591 chars — biggest single corpus contribution)
- iter51 Haas NGC ST-series
- iter52 Fanuc 0i-TD/TC
- iter54 Doosan DN Solutions Puma

### 5 of 6 PRISM CAM bridges
- iter77 Mastercam Lathe
- iter78 turning synchronization (Esprit-adjacent)
- iter79 Fusion 360 Lathe + Mill/Turn (2152 segs/120917 chars)
- iter80 hyperMILL MAXX HP-Turning (2148 segs/102205 chars)
- iter81 Inventor HSM Turning
- (SolidWorks CAM yielded thin subtitle coverage)

### 6 ISO material groups
- iter46 H (hard-turn CBN)
- iter47 N (aluminum + insert grade)
- iter72 M (304/316 stainless)
- iter73 S (Inconel + titanium aerospace)
- iter74 K (cast iron — thin)
- ISO-P (steel) covered ambiently across all programming videos

### G7x canned-cycle family
- iter44 G76 threading deep-dive
- iter66 G75 grooving
- iter55 Y-axis thread mill (extension)
- iter64 NPT/tapered threads
- G70/G71/G72/G73 covered ambiently from prior session

### Workholding
- iter45 sub-spindle pickoff
- iter56 collet chuck (Haas A2-6 dead-length)
- iter62 tailstock + between-centers
- iter83 thin-wall + soft jaws

### Advanced niches
- iter40 live-tool C-axis Haas DS
- iter53 Y-axis live-tool Haas
- iter68 polygon turning Swiss-style
- iter69 Citizen M-series Swiss programming
- iter90 5-axis turn-mill presentation
- iter95 CNC gear hobbing
- iter96 rotary broach (Polygon Solutions + DB Customs)

### Pro topics
- iter60 boring-bar chatter mitigation (700 segs/37906 chars)
- iter61 Renishaw probing accuracy
- iter63 tool length offsets + wear-comp
- iter71 G41/G42 TNR compensation
- iter82 thermal growth + thermal-expansion scrap
- iter88 boring-bar centering quick-tip
- iter91 Haas HP coolant
- iter92 Haas MQL + Unist MQL

### Vendor + media (operator-named)
- iter84 carbide turning inserts deep tutorial
- iter85 pro-tips finish-turn + thread-turn
- iter86 Titans of CNC manual programming (1820 segs/102861 chars)
- iter87 Iscar tip-talk parameters
- iter89 long-form carbide tooling
- iter93 affordable inserts + VCGT real-world
- iter97 Modern Machine Shop tours
- iter98 CTE Episode 53 Switching to CBN

### Industry 4.0
- iter99 MTConnect (1652 segs/88565 chars Purdue tutorial)
- iter101 GD&T total/circular runout

### Production discipline
- iter48 bar-feeder Haas NGC + production all-day
- iter57 parting + Kennametal/Sumitomo comparison
- iter58 edge-break + shot-peen deburr
- iter59 chip-control + aluminum chip-breakers
- iter94 cycle-time reduction secrets + Okuma 80% case
- iter100 First Article Inspection (FAI)

### Material-specific niche
- iter72 304/316 austenitic-stainless work-hardening
- iter73 Inconel/Ti aerospace
- iter74 cast-iron ISO-K

## Outstanding pending units (unchanged since iter7)

P0 (build-side, blocks wizard real-use):
- U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE — T-number → ANSI insert mapping
- U-LATHE-G76-THREAD-VALIDATOR
- U-LATHE-AB-VERSION-LOCATOR — find "upgraded" B versions in JM archive
- U-LATHE-WIZARD-VENDOR-LOOKUP — wire wizard_query_records into LatheCAMIntelligenceEngine.selectInsert
- U-LATHE-TRIBAL-QUERY-DISPATCHER — prism_lathe:query_vendor_tribal MCP action
- U-LATHE-LOOP-STAGE-IMPL-1-TO-5 — engine-backed training-loop stages

P1:
- U-LATHE-VENDOR-EXPANSION-DEEP-CURATE (11 tier-B brands)
- U-LATHE-MACHINE-VENDOR-MODELS
- U-LATHE-VENDOR-PDF-DOWNLOAD
- U-LATHE-H-CLASS-CBN-EXPANSION (Sumitomo BNX + Mitsubishi MB8000 + Sandvik CB7015)
- U-LATHE-LOOP-STAGE-IMPL-6-TO-11

P2:
- U-LATHE-VENDOR-GRAPH-NODE
- U-LATHE-MEDIA-INGEST-PIPELINE
- U-NN-TRAINER-EXPORT-RESTORE (positiveTypeMarginal + sampleStratifiedNegativeEdges)

## Suggested next-session targets

Remaining thin areas (corpus has ~220 lathe-relevant videos now):
- Spindle synchronization C-axis (deep-dive beyond iter40/iter53)
- Mill-turn B-axis programming
- Lathe ATC tool magazine vs turret
- Box-tool/Form-tool Swiss-style
- Macro programming on lathe (Fanuc / Haas / Okuma)
- Probing cycles (Renishaw OMP/OMI G-code specifics)

Default-next per [[feedback_jm_machine_manual_coverage_doctrine]]: JM-Die fleet operator manuals (Okuma LB-3000 series specifically, alarm books, parts books).

## Ship pattern (verbatim for next session)

```bash
cd "H:/prism" && rtk node scripts/youtube-free-extract.mjs "ytsearch2:<topic>" --transcript-only
cd "H:/prism-slot-whiskey" && rtk node scripts/extract-lathe-videos-tribal.mjs --src "H:/prism/state/shared/youtube-extraction"
rtk git -C "H:/prism-slot-whiskey" add knowledge/wiki/lessons/video-extract-<id>.md mcp-server/data/ingestion_cache/lathe-videos-tribal-2026-05-26.json
rtk git -C "H:/prism-slot-whiskey" commit -m "[slot/whiskey] [WHISKEY-ACADEMY-LATHE-BRIDGE-MS0]/U-LATHE-VIDEO-<TOPIC> iter<N>: ..."
```

## Doctrine governing this loop

[[feedback_yolo_mode_nonterminal_goal_pattern]] — /yolo-mode is non-terminal by design. Stop hook perpetually blocks. Operator intervention is the only natural termination.

## Related

- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter42]] — predecessor (covered iter1-iter42)
- [[feedback_jm_machine_manual_coverage_doctrine]] — default-next after PDFs
- [[lathe-baseline-ALCOA-2026-05-26]] — first quality measurement
- [[reference_whiskey_academy_lathe_bridge_2026_05_26]] — iter1 seed
