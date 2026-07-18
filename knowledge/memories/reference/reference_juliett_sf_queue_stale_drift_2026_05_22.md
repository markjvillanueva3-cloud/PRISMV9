---
name: reference-juliett-sf-queue-stale-drift-2026-05-22
description: "The juliett (speed-feed) priority-queue is stale envelope drift, not real work — every SF unit verified is already built+wired. 5 units closed out (envelopes corrected); 6 deferred. Sister finding to reference_kilo_queue_false_positives. Verify deliverable existence before treating a NO-STATUS / not_started speed-feed unit as pending."
aliases: reference_juliett_sf_queue_stale_drift_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.630Z
---


**2026-05-22 juliett `claude-a8894112` /loop.** Work order: "complete all remaining juliett (speed-feed) tasks, high-ROI order, complete and wired." On triage the juliett priority-queue (12 units) turned out to be **overwhelmingly stale envelope drift** — the speed-feed domain is the most heavily-built domain in PRISM (18 SF engines, `SpeedFeedOrchestratorEngine` alone 2,851 LOC, dozens of dispatcher actions, a `prism sf` CLI command).

**Verified done + closed out (envelope status corrected → completed):**
1. **U-WIRE-BACKLOG-SF** (FEATURE-GAP-AUDIT-MS0) — all 18 SF engines wired across calc/cam/data dispatchers; SF-AI L1-L3 ladder (SpeedFeedUltimateAI/AdvancedAI/DeepLearning) all in calcDispatcher via `speedfeed_*_stats`. Was stale `not_started`.
2. **U-CW-01** (MS-CRITWIRE) — false positive; `MachineAwareSpeedFeedEngine` is `// WIRE-EXEMPT` (middleware-tier). See [[reference_u_cw_01_false_positive_2026_05_20]].
3. **U-MCAT12** (MCAT-MS0-RGS) — `machine_aware_constrain` fully wired in calcDispatcher + `machine-aware-constrain-wire.test.ts`.
4. **CLI-MS0/P1-U01** (`prism sf` CLI) — full speed-feed CLI command already built at `mcp-server/src/cli/index.ts:83` (`.command("sf").alias("speed-feed")`, 10 options, `SpeedFeedOrchestratorEngine` 67-point physics). Was stale `not_started`.
5. **EIGC-MS10/P0-U01** (golden-path physics calculator) — = `SpeedFeedOrchestratorEngine`, wired + CLI-exposed.

Also confirmed already built+wired+tested but **mislabeled in the queue**: the queue showed "U-KAR17 … ProvenSpeedFeedAggregatorEngine" but the actual KAR-ROADMAP.json `U-KAR17` is "MaterialRegistry.upsert() integration" — NOT speed-feed. `ProvenSpeedFeedAggregatorEngine` itself is built + wired (`proven_speed_feed_aggregate_lathe/mill`, `proven_speed_feed_query`) + has `proven-speed-feed-aggregate-wire.test.ts`.

**Deferred (genuine verification or genuine build needed — NOT closed):**
- **EIGC-MS8/P0-U01** — "provenance fields for speed/feed, post, print-to-program, ERP" — `sfcProvenanceWireEngine.test.ts` covers the SF piece; full post+P2P+ERP scope unverified.
- **F360-MS4/U-F360-20** — "per-block auto speed/feed into Fusion" — `f360_auto_program` exists; per-block specificity unverified.
- **U-GAP-SF-NC-CALIBRATION** (FEATURE-GAP-AUDIT-MS0, genuine `not_started`) — NC-program speed/feed calibration miner; `SpeedFeedMinerEngine` exists — overlap unverified.
- **U-AITRAIN-SPEEDFEED** — training run, not a build artifact.
- **muS-D30..D33** (ARC-MS9) — not in `data/milestones/`, lives in atomic-roadmap.
- **L8-P2-MS2/P0-U14** — "Cross-Links to SFC & Learning" — NO-STATUS, unverified.

**Lesson (R12 / R13).** A speed-feed priority-queue unit with `status: not_started` or no status field ≠ pending work — the envelope status is frequently stale drift (pre-2026-05-12 history-strip + piecemeal sub-unit ships never tagged `[SCOPE]/U-ID`). Before building/wiring any SF unit: grep the named deliverable (engine file, dispatcher action, CLI command, test) — if it exists, close the unit out instead of rebuilding. Sister finding: [[reference_kilo_queue_false_positives_2026_05_20]]. Doctrine: [[feedback_task_freshness_pre_build]], [[feedback_auto_close_out]].

## iter4 verification (2026-05-22, `claude-a8894112` /loop)

Read all 6 deferred-unit envelopes. Definitive classification — **none is a clean loop-completable juliett speed-feed code unit**:

- **EIGC-MS8/P0-U01** — "provenance fields for speed/feed, **post, print-to-program, ERP**". `SFCProvenanceWireEngine.ts` covers ONLY the speed/feed slice. The unit is a 4-domain provenance framework (post/P2P/ERP slices belong to india/kilo/hotel). Milestone `not_started`. Cross-domain — not a juliett-only unit.
- **F360-MS4/U-F360-20** — "per-block auto speed/feed into Fusion". effort 90, milestone `not_started`, **blocked on U-F360-19** ("print-to-program through Fusion", effort 95, also unbuilt). Fusion-360 integration — delta/F360 domain, blocked dependency.
- **L8-P2-MS2/P0-U14** — "Cross-Links to SFC & Learning" is a **frontend** unit (`web/src/utils/erpCrossLinks.ts`, role R2 Frontend Engineer) in a 15-unit ERP Web UI milestone entirely `not_started`. P0-U14 depends on P0-U11→…→P0-U01 (13 unbuilt siblings). **Misattributed to the juliett queue on the "SFC" keyword** — it is frontend ERP work, not speed-feed.
- **U-GAP-SF-NC-CALIBRATION** — genuine juliett speedfeed unit, `status: not_started`. The miner *engine* (`SpeedFeedMinerEngine.ts`) is built + wired (`calcDispatcher` `speed_feed_mine` + `speed_feed_compare_to_baseline`, shipped 2026-05-21) + tested (`speed-feed-miner-wire.test.ts`). But the unit deliverable is the *calibration mined from 35K+ JM DIE NC programs (.min/.mcx-8/.cyc)* — a multi-hour corpus-mining **data-run**, not a code build. The tool exists; the run has not happened.
- **U-AITRAIN-SPEEDFEED** — AI training run, not a build artifact.
- **muS-D30..D33** (ARC-MS9) — outside `data/milestones/`; lives in atomic-roadmap, not the envelope system.

**Conclusion (R12).** After the iter1-3 close-out pass, the juliett speed-feed queue has **zero remaining clean close-outs and zero loop-completable code units**. The /loop is honestly closed at iter4 — NOT padded to target 20. A future juliett chat should NOT re-pick these 6 as loop work: route `U-GAP-SF-NC-CALIBRATION` + `U-AITRAIN-SPEEDFEED` as deliberate data/training jobs, and re-tag `L8-P2-MS2/P0-U14` + `EIGC-MS8/P0-U01` + `F360-MS4/U-F360-20` to their real domains (frontend / cross-domain / F360).

## Related
[[reference_u_cw_01_false_positive_2026_05_20]] • [[reference_kilo_queue_false_positives_2026_05_20]] • [[reference_u_css_chipload_complete_2026_05_20]] • [[feedback_task_freshness_pre_build]] • [[feedback_auto_close_out]]
