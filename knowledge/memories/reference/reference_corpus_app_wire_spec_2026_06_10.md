---
name: reference_corpus_app_wire_spec_2026_06_10
description: Spec for wiring the JM+Docustrata corpus-index substrate into PRISM app features (quoting/ERP/machines/tooling). The query contract is SHIPPED; per-galaxy engine wiring is the next phase.
type: reference
slot: sierra
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:46.531Z
aliases: reference_corpus_app_wire_spec_2026_06_10
---


# Corpus -> app-feature wiring spec (U-CORPUS-APP-WIRE, 2026-06-10)

Operator directive 2026-06-10: *"when you link the jm and docustrata data, wire them into the
prism app features like quoting, business erp, machines, tooling, etc."*

## SHIPPED this session (the substrate + contract — proven foundation)
- **Substrate:** `state/shared/corpus-index/corpus-index.json` (12.5 KB aggregates) — gen by
  `scripts/build-corpus-vault-index.mjs` (commit `42473d3fb7`). Docustrata 111,745 docs / 7 types;
  JM DIE 317,138 files / 38 folders (119,255 `.nc`, 85,346 `.pdf`). Vault notes:
  `knowledge/h-drive-atlas/{docustrata,jm-die}-corpus-index.md`.
- **Query contract:** `scripts/lib/corpus-index-query.mjs` (commit on slot/sierra) — the API app
  features import: `loadCorpusIndex()`, `corpusSummary()`, `findJmFolder(q)`, `jmByExtension(ext)`,
  `docustrataByType(t)`, `docustrataByFolder(f)`, `corpusPointers()`. 8 tests, live-validated.

## NEXT PHASE — per-galaxy engine wiring (R13 logical order; build on the proven contract)
Each owning slot wires the contract into its galaxy's real consumer engine (verify the exact
engine/dispatcher name on disk first — do NOT fabricate; grep the galaxy):
- **quoting (charlie, `engines/quoting/`):** when a quote is built for a customer, call
  `findJmFolder('<customer>')` + `docustrataByType(...)` to surface prior prints/programs/quotes
  for that part → reuse-not-requote. Integration point: the quote-intake / print-lookup path.
- **business/ERP (hotel, `engines/business/`):** `corpusSummary()` + `docustrataByFolder('DocuRead Scans')`
  for a document-inventory / records surface (how many scanned docs, what's on file per customer).
- **machines:** `findJmFolder('OKUMA'|'HAAS'|'WIRE EDM'|'HURCO'|'ROKU-ROKU')` → per-machine NC-program
  inventory (the JM top folders ARE machine-keyed). Feeds machine-setup / program-pick surfaces.
- **tooling:** `jmByExtension('.nc'|'.min'|'.mcx-8'|'.stp')` → program-format inventory; ties to
  post-processor (echo) + CAM (kilo) which own those dialects.

Each wiring = R15: import + call THROUGH the consumer's dispatcher, a round-trip test, live-validate
with a real customer/machine, and a vault/wiki note. Cross-galaxy — sierra is a primary backend
builder (no galaxy gate blocks) but coordinate with charlie/hotel/kilo/echo who own those engines.

## BLOCKER (honest, R12)
The cyrilXBT article `x.com/cyrilXBT/status/2064883165169140169` the operator asked to "apply"
returned **HTTP 402 (paywall)** and the handle is **not web-indexed** — I could NOT read its
specific method. Applied the VERIFIED prior cyrilXBT/humza low-token vault doctrine already in
PRISM memory ([[reference_cyrilxbt_obsidian_article_delta_2026-05-07]],
[[feedback_obsidian_low_token_2nd_brain_protocol]], [[reference_humza_khalid_obsidian_article_2026_06_08]]):
pointer-not-copy, findable-by-type, compounding. **Reconcile the specific article's deltas when its
text is available** (operator paste, or an authenticated fetch tool).

Related: [[reference_sierra_open_threads_context_map_2026_06_10]] · [[critical-resource-roots]] · [[reference_catalog_index_stale_manifest_2026_06_08]]
