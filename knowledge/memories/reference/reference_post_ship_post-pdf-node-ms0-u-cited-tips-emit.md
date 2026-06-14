---
name: reference_post_ship_post-pdf-node-ms0-u-cited-tips-emit
description: Auto-distilled learnings from shipping POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT (commit e74af0b4f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.652Z
aliases: reference_post_ship_post-pdf-node-ms0-u-cited-tips-emit
---


# POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-PDF-NODE-MS0]/U-CITED-TIPS-EMIT (slot:echo /loop iter13 /yolo): close the iter9-12 curriculum pipeline with per-controller TypeScript cited-tip files. NEW: scripts/lib/cited-tips-emitter.mjs (pure: truncateBody, escapeForTemplate, renderTipEntry, renderTipsFile, bucketByController, rankCandidatesForEmit + TS_HEADER/TS_INTERFACE templates) + 35-test concrete-value test suite + scripts/generate-cited-tips-from-candidates.mjs CLI. EMITTED: 6 controller files + 1 index under mcp-server/src/data/tribal-tips/jm-die-curriculum/ — mazak (38 tips, 66.6K) + siemens (14 tips, 23.2K) + okuma (6 tips, 11.8K) + fanuc (3 tips, 6.7K) + haas (1 tip, 2.4K) + hurco (1 tip, 2.6K). 63/94 candidates curated (31 unspecified deferred — content-classifier coverage gap for future iter). TS-syntax-verified: ts.transpileModule on the 66.6K mazak file returns 0 diagnostics. PIPELINE CLOSED: iter9 page rank → iter10 query CLI → iter11 candidate join → iter12 content classifier → iter13 typed TS emit. Post-processor + classifier engines can now `import { MAZAK_CITED_TIPS } from "@/data/tribal-tips/jm-die-curriculum"` and filter by difficulty/score/page. Each tip = readonly CitedTip with id + sourceId + sourceTitle + citation + page + domain + controller + vendor + difficulty + score + bodyLength + body (truncated to 2000 chars per entry for diff reviewability). Body content includes Mazatrol Matrix macro patterns, Sinumerik 840D programming, Okuma OSP-P200L cycles, Haas M97/M98 subprograms. AUTO-GENERATED files re-emit on candidate JSONL change — no manual curation required. Cumulative test count: 252/252 PASS (35 emitter + 32 content-classifier + 44 candidate + 49 query + 55 ranker + 37 classifier).

**Shipped:** 2026-05-26T18:43:48-05:00 by markjvillanueva3-cloud
**Files:** 13 touched

Full distillation: [[post-pdf-node-ms0-u-cited-tips-emit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._