---
name: reference-jm-die-curriculum-pipeline-2026-05-26
description: "JM Die curriculum→tribal-tip pipeline (POST-PDF-NODE-MS0 iter9-17, slot echo) — page-by-page training-data extraction + per-controller TS cited-tip files + runtime fetcher + system-viz augmentation. 304 tests, 9 commits, 6 controllers, 63 curated tips."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.166Z
aliases: reference_jm_die_curriculum_pipeline_2026_05_26
---


# JM Die curriculum pipeline (iter9-17, slot echo, 2026-05-26)

Operator directive thread (3 pivots in one /loop run):
1. "extract page by page of notable data that will train the system from the easiest input to complex work"
2. "extract all your domain pdf, don't skip anything. we need it all!"
3. /goal /yolo-mode (every 5min cron) — continue autonomously to iter 20/20

## 9-commit pipeline

| iter | commit | deliverable | tests added |
|-----:|--------|-------------|------------:|
| 9  | `0b8f0515ef` | page-rank curriculum (3136 → 7565 pages) | 55 ranker |
| 10 | `a0a3549faa` | query CLI + 67-PDF cache-aware extraction | 49 query |
| 11 | `2e35693ab6` + `f0b167e7f2` (peer-absorbed) | full-body candidate joiner (94 advanced+complex) | 44 candidate |
| 12 | `fbd4ad69a1` | content-classifier fallback (+26 controllers) | 32 content-classifier |
| 13 | `e74af0b4f5` | typed TS cited-tip files (6 controllers, 63 tips) | 35 emitter |
| 14 | `56dac81a40` | consumer README + close-out refresh | (doc only) |
| 15 | `51d20b3d88` | runtime cited-tip fetcher | 40 fetcher |
| 16 | `73fe2d40b4` | CLI wrapper for fetcher | (CLI orchestration) |
| 17 | `238e17c209` | system-viz augmentation (PSN visibility) | 12 viz |

## Pure-function modules

- `scripts/lib/training-difficulty-ranker.mjs` — 6-signal page scorer (G/M-codes, units, 5-axis, macro, advanced, easy-term penalty + position bias). Buckets: unscored<0.5, easy<1.5, intermediate<3.5, advanced<6.0, complex≥6.0.
- `scripts/lib/training-curriculum-query.mjs` — JSONL parse + filter/topN/bottomN.
- `scripts/lib/curriculum-tribal-candidate.mjs` — JSONL→full-body candidate joiner (FNV-1a id, 280→full body upgrade).
- `scripts/lib/jm-die-content-classifier.mjs` — filename + content fallback (11 controller markers × patterns, 9 vendor markers). 46% reduction in unspecified.
- `scripts/lib/cited-tips-emitter.mjs` — TS template renderer with backtick/${} escaping.
- `scripts/lib/cited-tip-fetcher.mjs` — runtime query layer with controller/difficulty/score/keyword filters.

## CLIs

- `scripts/extract-cam-domain-pdfs.sh` — batch pdftotext extractor (idempotent, cache-aware).
- `scripts/generate-training-curriculum.mjs` — JSONL emitter with R12 reconciliation.
- `scripts/training-curriculum-query.mjs` — operator query CLI.
- `scripts/generate-curriculum-tribal-candidates.mjs` — candidate emitter.
- `scripts/generate-cited-tips-from-candidates.mjs` — per-controller TS emitter.
- `scripts/cited-tip-fetch.mjs` — runtime fetcher CLI.
- `scripts/generate-cited-tips-viz-features.mjs` — system-viz augmentation generator (registered in regen-viz.mjs FAST[]).

## Live numbers (iter17 end)

- 67 PDFs extracted (of 80 corpus, 13 SKIP_REGEX other-slot)
- 8313 pages scanned → 7565 training-grade pages (748 noise filtered)
- 94 advanced+complex candidates → 63 controller-curated cited tips
- 6 controller files: mazak 38 / siemens 14 / okuma 6 / fanuc 3 / haas 1 / hurco 1
- TS-syntax-verified (0 diagnostics on 66.6K mazak file)
- 304/304 cumulative tests PASS

## Important findings

**iter11 P0-2** (reviewer-B catch): 88.6% "easy" was masking 39% truly-unscored low-signal pages. Fixed by adding `unscored` bucket for score<0.5. Honest distribution: 39 unscored / 50 easy / 9 intermediate / 0.9 advanced / 0.03 complex.

**iter12 blindspot**: 57/94 candidates had `controller: null` because filename classifier missed Haas Mill Manual (filename = "English - Mill Operator's Manual ... NGC ..." with no "Haas" keyword). Content-classifier scanning leading 5 pages recovered 26 (first Siemens/Okuma/Fanuc visibility).

**Multi-chat absorption** (iter11): lib + test + spec landed in delta's `f0b167e7f2` peer commit while my git index was contended (3rd documented occurrence — see [[feedback_commit_to_slot_worktree]]). Deliverable intact, attribution split.

## Consumer wiring

```typescript
import { MAZAK_CITED_TIPS, type CitedTip } from "@/data/tribal-tips/jm-die-curriculum";
import { fetchTips } from "scripts/lib/cited-tip-fetcher.mjs";

const tips = fetchTips(MAZAK_CITED_TIPS, { minDifficulty: "advanced", limit: 5 });
```

Or via CLI:
```bash
node scripts/cited-tip-fetch.mjs --controller=mazak --min-difficulty=advanced --limit=5
node scripts/cited-tip-fetch.mjs --keyword=macro --limit=10 --json
```

## Re-emit pipeline

```bash
bash scripts/extract-cam-domain-pdfs.sh                       # 1. cache-aware extraction
node scripts/generate-training-curriculum.mjs                 # 2. page rank
node scripts/generate-curriculum-tribal-candidates.mjs        # 3. full-body candidates
node scripts/generate-cited-tips-from-candidates.mjs          # 4. emit TS files
node scripts/generate-cited-tips-viz-features.mjs             # 5. viz augmentation
```

## Cross-slot coordination

Sibling slots (foxtrot/lima/whiskey/mike) ran parallel pipelines on their own domain corpora 2026-05-26. JSONL schema is unified — `{filename, pageNum, difficulty, score, signals, body}` — so any slot's emit is consumable by any slot's downstream.

See `[[feedback_use_lima_pypdf_page_extractor]]` for the canonical pypdf extractor (76x deeper than pdf-parse, used by lima for academy corpus).
