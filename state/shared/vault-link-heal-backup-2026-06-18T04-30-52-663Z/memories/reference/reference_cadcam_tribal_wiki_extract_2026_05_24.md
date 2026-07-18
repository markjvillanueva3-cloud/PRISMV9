---
name: reference-cadcam-tribal-wiki-extract-2026-05-24
description: india iter24 — extract-cadcam-tribal-wiki.mjs converts consolidated cad+cam corpus into per-resource tribal jsonl + wiki indexes for delta+kilo training ingest.
type: reference
source: prism-memory
synced: 2026-06-18T04:19:52.535Z
aliases: reference_cadcam_tribal_wiki_extract_2026_05_24
---


iter24 (slot:india, 2026-05-24) closes the *extraction* leg of the CAD+CAM consolidation goal.

iter23 shipped `scripts/consolidate-cadcam-corpus.mjs` + `cadcam-consolidated-corpus.json` — the routing layer. But the goal_clear ("extract usable data: memories, wiki, tribal knowledge nodes") needed the concrete generators that downstream slots actually ingest. iter24 ships that layer.

**Files added (iter24 — `scripts/extract-cadcam-tribal-wiki.mjs`):**

- `state/shared/cad-tribal-corpus.jsonl` — 21 entries, one per CAD resource. Each line: `{ts, domain, slug, kind, source, source_type, tip, consume:{spec_md, source_file, bridge_engines, enriches_engines, bridge_dispatchers}, audience:"delta", advisory:true, must_human_verify:true}`.
- `state/shared/cam-tribal-corpus.jsonl` — 598 entries, one per CAM resource. Same shape, audience=`"kilo"`.
- `knowledge/wiki/training/cad-corpus-index.md` — operator view: entries grouped by kind, named bridge engines + dispatchers, ingest snippet, audience expectation (delta reads → picks priority kinds → reads each spec → ingests source → trains bridge engines).
- `knowledge/wiki/training/cam-corpus-index.md` — same shape for CAM (598).
- `scripts/extract-cadcam-tribal-wiki.test.mjs` — 16/16 PASS. Covers `resolveBridgeTargets` (PDF + course paths + unknown fallback), `entryToTribal` (audience routing, spec_md prefix, bridge preservation, advisory flag), `groupByKind`, `renderWikiIndex` (truncation at 50, empty handling, consumer routing).

**Bridge resolution** — imports `PDF_KIND_TO_ENGINES`/`PDF_KIND_ENRICHES`/`PDF_KIND_TO_DISPATCHERS` + course equivalents from `scripts/generate-pdf-course-bridge-features.mjs` (iter22). Single source of truth for engine/dispatcher routing — no duplication.

**Audience routing** — `domain:"cad" → audience:"delta"` (CAD slot per [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0); `domain:"cam" → audience:"kilo"` (CAM slot per recent pivot). Dual-classified entries (`both[]`) are written to **both** tribal corpora so neither slot misses dual-relevant resources.

**Wiki entry naming** — `knowledge/wiki/training/` is a new namespace for *training-corpus indexes* (distinct from `knowledge/wiki/architecture/` for system architecture + `knowledge/wiki/code-tribal/` for code lessons). Matches the precedent set by `knowledge/wiki/architecture/courses-index.md`.

**Consumer protocol** (delta + kilo):

1. Read `knowledge/wiki/training/<domain>-corpus-index.md` for the operator-level priority picture.
2. Stream the `state/shared/<domain>-tribal-corpus.jsonl` line-by-line.
3. For each entry: read `consume.spec_md` (the AUTOGEN-SPEC) → ingest `consume.source_file` → wire trained model output back into `consume.bridge_engines` (the engines this resource feeds) + `consume.enriches_engines` (engines that can be IMPROVED with this data).
4. Honor `must_human_verify: true` — PRISM blocks stub engines; consumer asserts data quality at ingest, never silent-accepts.

**Why not bake the actual training data into the jsonl** — keeping pointers instead of payloads keeps the corpus reproducible (regenerate iter24 from iter23 in seconds; payload would baloon to GB). Consumer pulls payload on demand via the named `source_file`.

**Tooling used:** `scripts/consolidate-cadcam-corpus.mjs` (iter23) → `cadcam-consolidated-corpus.json` → `scripts/extract-cadcam-tribal-wiki.mjs` (iter24) → tribal jsonl + wiki MD.

**Related memories:** [[reference-college-course-autogen-specs-2026-05-24]] (parent index that this leverages) · [[reference-pdf-course-bridge-iter20-2026-05-24]] (the iter22 bridge map this imports from) · [[reference-git-fsmonitor-blocks-bulk-add-2026-05-24]] (the bulk-add bypass used in commits).

**Closes:** operator directive — "consolidate all cad AND cam related courses, books, youtube videos to extract usable data: memories, wiki, tribal knowledge nodes that ca be wired into pipelines for deep learning, deep reasoning, NN, gnn, ai systems and claude orchestration | goal clear: extract all data and handoff to delta to use to train cad and Kilo for training cam".
