---
title: CAM Knowledge Index — wiring for AI CAD system + Claude test/train
type: architecture
created: 2026-05-26
author: slot:kilo
status: shipped
---

# CAM Knowledge Index

Unified discovery layer for every CAM-relevant knowledge node in PRISM — wiki entries, tribal tips, memory references, extracted PDF nodes, and per-software extraction batches — so consumers (AI CAD engines, tribal-by-domain-inject, Claude test/train sessions) get all CAM knowledge in one queryable manifest instead of re-deriving the catalog each call.

## Origin

Operator directive 2026-05-26 (slot:kilo): *"ensure wiki and tribal knowledge nodes relevant for cam are wired into the ai cad system and claude usage for testing and training the system"*.

## Surfaces

| Surface | Path | Purpose |
|---|---|---|
| Builder | `scripts/build-cam-knowledge-index.mjs` | Walks 7 source directories, applies CAM keyword classifier + content sampling, emits unified index. Idempotent. |
| Tests | `scripts/build-cam-knowledge-index.test.mjs` | 8 tests covering keyword match (filename + content + both), case-insensitivity, punctuation normalization, dedup, empty-input handling. |
| Index | `state/shared/training/cam-knowledge-index.json` | schemaVersion 1.0.0 · 360 CAM-relevant nodes from 1591 scanned · per-source breakdown · per-node `matchSource`/`matchedKeywords` metadata. |

## CAM keyword set

The classifier matches against a tuned 40-keyword set covering:
- **Software**: mastercam, hypermill, fusion 360, fusion360, solidcam, powermill, esprit, nx cam, inventor hsm, hsmworks, bobcad, gibbscam, catia cam, opens mind, siemens nx
- **Concepts**: cam strategy, cam toolpath, toolpath, post processor, g-code, m-code, rapid traverse, feed rate, spindle speed, cutter compensation, pocketing, profile milling, adaptive clear, dynamic motion, high speed machining, hsm, trochoidal
- **Operations**: drilling cycle, tapping cycle, boring cycle, reaming cycle

Excluded: broad terms like "cut" that produce noise across mill/lathe/wedm.

Input normalization: lowercase + dash/underscore/slash/dot → space, so `fusion-360-post.md` matches the multi-word `fusion 360` keyword.

## Counts (2026-05-26 first build)

| Source | Total scanned | CAM-relevant |
|---|---|---|
| wiki/architecture/tribal | 73 | 60 |
| wiki/code-tribal | 734 | ~28 |
| wiki/architecture (depth=1) | ~110 | ~14 |
| memory/reference (9291) | sampled | ~200 |
| memory/feedback | varies | ~20 |
| cam-pdf-nodes/cam | 132 | 132 |
| extracted-knowledge | varies | ~6 |
| **Total** | **1591** | **360** |

(Exact per-source counts in the JSON index `sources[].camRelevantCount`.)

## Consumer wires (planned + active)

### 1. AI CAD system (aiSystemRouterEngine)
`aiSystemRouterEngine.route(task)` decides routing for CAD/CAM tasks. To surface CAM knowledge:
```js
const idx = JSON.parse(fs.readFileSync('H:/prism-slot-kilo/state/shared/training/cam-knowledge-index.json', 'utf8'));
const camNodes = idx.sources.flatMap((s) => s.nodes);
// Use camNodes for context retrieval when task involves CAM strategy/toolpath/post selection.
```

### 2. tribal-by-domain-inject (UserPromptSubmit hook)
When slot domain ∈ {cam, kilo}, the existing `tribal-by-domain-inject.mjs` already surfaces top-K tribal hits. To enrich with this index, the hook can additionally:
```js
const idx = require('cam-knowledge-index.json');
const top = idx.sources
  .flatMap((s) => s.nodes)
  .filter((n) => /toolpath|strategy|post/.test(promptText))
  .slice(0, 5);
// Inject as additionalContext
```
(Hook modification deferred — separate U-CAM-KNOWLEDGE-INJECT-WIRE unit; out of scope this commit.)

### 3. Claude session-bootstrap (slot:cam | slot:kilo)
For Claude sessions working on CAM tests/training (e.g. CAM-AI-TRAINING-MS0 successor, course-19 hypermill-nx-solidcam wiki backfill), include the index in the first turn's context bundle:
```
Read: state/shared/training/cam-knowledge-index.json
Filter: sources[].nodes where matchedKeywords includes <relevant CAM software>
Use: as research pack for test fixtures / training tuples / wiki citations.
```

### 4. CAM training pipeline (CAM-AI-TRAINING-MS0 successor)
Trainers iterate `sources[].nodes[].path` to load CAM-tagged context for LoRA tuple emission, prompt-pattern generation, citation harvesting. Combined with `fleet-training-corpus-inventory.json` (shipped this session), trainers have both the raw corpora AND the CAM-filtered subset.

## Regen path

```bash
node scripts/build-cam-knowledge-index.mjs
```

Idempotent. Run after:
- New CAM-software PDF batches land in `cad-cam-pdf-nodes/cam`
- New wiki entries get added under `wiki/architecture/tribal` or `wiki/code-tribal`
- New CAM-tagged memory references land in `memories/reference`

## Cross-refs

- [[cad-cam-resources-pdf-index]] — the source PDF corpus + extraction layer this index references
- [[reference_cad_cam_pdf_extraction_2026_05_26]] — prior session memo
- [[feedback_psn_definition]] — wiki + tribal are PSN legs #3 and #5; this index unifies cross-leg CAM access
- `state/shared/training/fleet-training-corpus-inventory.json` — sister manifest covering all training-relevant corpora (this CAM index is a focused slice)
- `tribal-by-domain-inject.mjs` — existing UserPromptSubmit hook for slot-domain-aware tribal injection
