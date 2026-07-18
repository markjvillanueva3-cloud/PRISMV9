---
title: CAD/CAM Resources PDF Index
type: architecture
created: 2026-05-26
author: slot:kilo
status: shipped
---

# CAD/CAM Resources PDF Index

Cross-classified manifest of every PDF under `H:/prism/resources/` keyed by domain + software, so CAD/CAM-domain chats can locate the right software documentation without filesystem exploration.

## Origin

Operator directive 2026-05-26 (slot:kilo): *"ensure we link pdfs for the cad cam software in the resources folder to the cad and cam node domains for easy access"*.

The system-viz graph already had per-PDF L10 ghost roosts (`CAD · pdf-resources-*`, `CAM · pdf-resources-*`), but no centralized JSON manifest existed for chats/dispatchers/hooks to query. This entry centralizes them.

## Surfaces shipped

| Surface | Path | Purpose |
|---|---|---|
| Build script | `scripts/build-cad-cam-resources-pdf-index.mjs` | Walks `resources/`, classifies every PDF by `(domain, software, top)`, writes manifest. Idempotent. |
| Manifest | `mcp-server/data/state/cad-cam-resources-pdf-index.json` | schemaVersion 1.0.0 · 1008 PDFs · `entries[]` + `byDomain` + `bySoftware`. |
| Query CLI | `scripts/query-cad-cam-resources.mjs` | `--domain {cad,cam,training,mfg,catalog,machine}`, `--software <name>`, `--json`, `--stats`. |
| Tests | `scripts/build-cad-cam-resources-pdf-index.test.mjs` (8) + `scripts/query-cad-cam-resources.test.mjs` (6) | 14/14 PASS via `node --test`. |

## Domain enum (matches `tribal-by-domain-inject`)

`cad | cam | mfg | training | machine | catalog`

The `cad`/`cam` values match `tribal-by-domain-inject.mjs`'s slot-domain mapping (per `wiki-domain-bias.mjs`), so the manifest can drop into a future inject hook keyed on slot domain without translation.

## Software enum (sample)

CAD: `solidworks`, `freecad`, `inventor`, `dwg-trueview`, `generic-cad`

CAM: `mastercam`, `hypermill`, `fusion360-cam`, `fusion360-post`, `hsmworks`, `solidcam`, `inventor-hsm`

## Counts (2026-05-26 build, schema v1.1.0 — multi-source)

| Domain | PDFs | Notes |
|---|---|---|
| blueprint | 2975 | JM DIE customer engineering drawings — CAD input side of P2P pipeline |
| training | 835 | MIT OCW + basic training + PRISM academy materials |
| cam | 129 | HYPERMILL + OPEN MIND + MasterCam software docs (incl. 18 from JM DIE) |
| catalog | 38 | manufacturer tool catalogs |
| machine | 16 | post-processor + machine manuals (incl. 7 from JM DIE) |
| cad | 14 | SOLIDWORKS software documentation |
| mfg | 1 | macro-program references |
| **Total** | **4008** | from `H:/prism/resources` (1008) + `H:/PRISM/JM DIE` (3000) |

The schema v1.0.0 → v1.1.0 bump added a `source` field per entry (`resources` | `jm-die`) and a `bySource` aggregate. CAD count is lower than CAM by design — the `Freecad/bin/Lib/site-packages/` bundled-library tree is excluded via `SKIP_DIRS` (matplotlib icons are not CAD documentation).

## Extraction artifacts (2026-05-26)

Beyond the manifest, the next layer extracts text+HTML per PDF for in-app surfacing:

| Surface | Path | Notes |
|---|---|---|
| Extractor | `scripts/extract-cad-cam-pdf-content.mjs` | Uses `pdf-parse` v2 `PDFParse({data:buf}).getText()`. Idempotent — sha8(source/relPath) keyed; --force re-extracts. |
| Tests | `scripts/extract-cad-cam-pdf-content.test.mjs` | 6 tests — sha8 determinism + textToHtml XSS-safe escaping. |
| Per-PDF nodes | `state/shared/cad-cam-pdf-nodes/<domain>/<sha8>.{json,html}` | JSON has full text up to 200KB; HTML always has full text. |
| Progress ledger | `state/shared/cad-cam-pdf-nodes/_progress.json` | Last-run attempted/extracted/skipped/failed counts. |
| Tribal seeds | `state/shared/cad-cam-pdf-tribal-seeds.json` | One pointer-tip per (software) — consumable by `/shop-knowledge`, `tribal-by-domain-inject`. |
| Tribal generator | `scripts/generate-cad-cam-pdf-tribal-seeds.mjs` | Aggregates extracted nodes by software, emits pointer tips (full AI summarization deferred — needs Ollama). |
| Tribal-seed tests | `scripts/generate-cad-cam-pdf-tribal-seeds.test.mjs` | 7 tests — aggregateBySoftware + buildTip pure-fn coverage. |

### First extraction run (cad + cam domains, 2026-05-26 slot:kilo)
- CAD: 14/14 SOLIDWORKS PDFs extracted = 1,567,534 chars / 1,060 pages
- CAM: 129/129 HYPERMILL (113) + MasterCam (19) PDFs = 14,258,584 chars / 9,807 pages
- Total: **143 nodes / 15.8M chars / 10,867 pages** of indexed, queryable text
- 4 tribal pointer-tips generated (one per software: hypermill, mastercam, solidworks, +1 misc)

### Deferred: blueprint domain (2975 PDFs)
JM DIE customer blueprints (engineering drawings) are queued for batch extraction. Each ~1.5s extraction → ~75 min wall-clock. Re-run via:
```bash
node scripts/extract-cad-cam-pdf-content.mjs --domain blueprint
```
Idempotent — skips already-extracted (matches by sha8). Safe to run as detached background task or scheduled hourly until full corpus complete.

## Usage patterns

### From a chat
```bash
node scripts/query-cad-cam-resources.mjs --domain cam --json | jq '.entries[0:5]'
node scripts/query-cad-cam-resources.mjs --software mastercam
node scripts/query-cad-cam-resources.mjs --stats
```

### From an engine/dispatcher
```js
import fs from 'node:fs';
const idx = JSON.parse(fs.readFileSync('H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json', 'utf8'));
const camPdfs = idx.entries.filter((e) => e.domain === 'cam' && e.software === 'mastercam');
```

### As a tribal-by-domain enrichment (future wire)
A hook keyed on slot-domain `cad|cam` could surface the top-K PDFs by recency / relevance via existing `getDomainTokens()` (`wiki-domain-bias.mjs`). Out of scope for MS0; the manifest is the precondition.

## Regen path

```bash
node scripts/build-cad-cam-resources-pdf-index.mjs
```

Idempotent — overwrites the manifest. Safe to run repeatedly (e.g., when new PDFs land in `resources/`).

## Cross-refs

- [[feedback_psn_definition]] — System-viz roosts are PSN leg #6; this manifest binds resource leaves to that leg via L10 ghost classes.
- `state/shared/CAD-CAM-RESOURCES-INDEX-NOTE.md` — pointer (planned for resources/RESOURCES-INDEX.md addendum).
- [[reference_kilo_reorient_2026_05_26]] — kilo's reorient session that surfaced this work order.
- `scripts/build-cad-cam-resources-pdf-index.mjs` — pure-fn classifier; the `classify()` export is reusable across consumers.
