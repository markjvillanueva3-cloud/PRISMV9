# POST-PDF-NODE-MS0 JM Die curriculum pipeline — close-out

**Slot:** echo  ·  **Loop:** iter 20/20 (terminal)  ·  **Date:** 2026-05-26  ·  **Branch:** cad-fusion-live-ms0

Operator directive thread (one /loop run): "extract page by page of notable data that will train the system from the easiest input to complex work" → "extract all your domain pdf, don't skip anything" → `/goal /yolo-mode` (cron every 5min) → continue to iter 20.

## 12 commits shipped (iter9-20)

| iter | commit | unit | tests added |
|-----:|--------|------|------------:|
| 9  | `0b8f0515ef` | U-JM-TRAINING-CURRICULUM | 55 ranker |
| 10 | `a0a3549faa` | U-JM-TRAINING-CURRICULUM-QUERY | 49 query |
| 11 | `2e35693ab6` + `f0b167e7f2` | U-JM-CURRICULUM-TRIBAL-CANDIDATES | 44 candidate |
| 12 | `fbd4ad69a1` | U-JM-CONTENT-CLASSIFIER | 32 content-classifier |
| 13 | `e74af0b4f5` | U-CITED-TIPS-EMIT | 35 emitter |
| 14 | `56dac81a40` | U-CITED-TIPS-README+CLOSEOUT-REFRESH | — |
| 15 | `51d20b3d88` | U-CITED-TIP-FETCHER | 40 fetcher |
| 16 | `73fe2d40b4` | U-CITED-TIP-FETCHER-CLI | — |
| 17 | `238e17c209` | U-CITED-TIPS-VIZ | 12 viz |
| 18 | `3c72b9c6db` | U-CITED-TIPS-VIZ-REGISTER | — |
| 19 | `48d4246853` | U-MEMORY-RECENT-POINTER | — |
| 20 | (this commit) | U-PIPELINE-CLOSE-OUT | — |

**Total: 304/304 tests PASS** across 8 test files.

## Pipeline architecture (final)

```
JM Die TRIBAL+WIKI corpus (80 PDFs, 1.1 GB)
   ↓ scripts/extract-cam-domain-pdfs.sh (idempotent, cache-aware, SKIP_REGEX for other-slot)
67 .txt extracts under state/shared/pdf-extracts/jm-die-tribal-wiki/
   ↓ scripts/generate-training-curriculum.mjs (page split + 6-signal score + R12 fail-loud)
mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl (7565 pages)
   ↓ scripts/generate-curriculum-tribal-candidates.mjs (advanced+complex filter + full-body join)
   ↓ scripts/lib/jm-die-content-classifier.mjs (content fallback: +26 controllers recovered)
mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl (94 candidates)
   ↓ scripts/generate-cited-tips-from-candidates.mjs (per-controller TS emitter)
mcp-server/src/data/tribal-tips/jm-die-curriculum/ (6 TS files: mazak/siemens/okuma/fanuc/haas/hurco + index.ts + README.md)
   ↓ scripts/lib/cited-tip-fetcher.mjs (runtime query layer) + scripts/cited-tip-fetch.mjs (CLI)
   ↓ scripts/generate-cited-tips-viz-features.mjs (system-viz augmentation, registered in regen-viz FAST[])
PSN: ghost.jm_die_cited_tips_corpus roost + 6 pivots + 6 leaves + 11 bridge edges to MasterPostProcessor*
```

## Live numbers

- 67 / 80 PDFs extracted (13 SKIP_REGEX matches for other-slot lathe/cad)
- 8313 pages scanned → 7565 training-grade (748 noise filtered)
- 94 advanced+complex candidates → 63 controller-curated cited tips
- 6 controllers: mazak 38 / siemens 14 / okuma 6 / fanuc 3 / haas 1 / hurco 1
- 31 candidates remain "unspecified" (future content-classifier work)
- TS-syntax-verified: 0 diagnostics on the 66.6K mazak file

## Key findings

**Reviewer-B catch at iter11** (P0-2): 88.6% "easy" was masking 39% truly-unscored low-signal pages. Added `unscored` bucket for score<0.5. Honest distribution: 39 unscored / 50 easy / 9 intermediate / 0.9 advanced / 0.03 complex. R12 fail-loud win.

**iter12 classifier blindspot**: 57/94 candidates had `controller: null` because filename classifier missed Haas Mill Manual (filename = "English - Mill Operator's Manual ... NGC ..."). Content-classifier scanning leading 5 pages recovered 26 (first Siemens/Okuma/Fanuc visibility).

**Multi-chat absorption** at iter11: lib + test + spec landed in delta's `f0b167e7f2` peer commit while my git index was contended. Documented 3rd occurrence — see `[[feedback_commit_to_slot_worktree]]`.

## Re-emit recipe (5 commands)

```bash
bash scripts/extract-cam-domain-pdfs.sh
node scripts/generate-training-curriculum.mjs
node scripts/generate-curriculum-tribal-candidates.mjs
node scripts/generate-cited-tips-from-candidates.mjs
node scripts/generate-cited-tips-viz-features.mjs
```

Or just the system-viz regen (auto-includes the augmentation):
```bash
node scripts/regen-viz.mjs
```

## Consumer wiring

Engine import:
```typescript
import { MAZAK_CITED_TIPS, SIEMENS_CITED_TIPS, type CitedTip } from "@/data/tribal-tips/jm-die-curriculum";
```

Runtime query (any slot):
```bash
node scripts/cited-tip-fetch.mjs --controller=mazak --min-difficulty=advanced --limit=5
node scripts/cited-tip-fetch.mjs --keyword=macro --json
```

Programmatic:
```javascript
import { fetchTips } from "./scripts/lib/cited-tip-fetcher.mjs";
const tips = fetchTips(allTips, { controller: "haas", minScore: 4.5, limit: 10 });
```

## Loop terminal

iter 20/20 reached cleanly. Cron `142b76f4` cancelled at iter20 — pipeline is shipped, no further autonomous work needed in this loop. Operator can re-arm with a fresh `/loop` directive.

Memory pointer: `[[reference_jm_die_curriculum_pipeline_2026_05_26]]` (auto-fed to `knowledge/memories/reference/` on next Stop).
