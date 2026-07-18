---
name: reference_jm_doc_population_ms0_2026_06_02
description: JM-DOC-POPULATION-MS0 campaign — accountability-ledger-first population of every PRISM app feature with all JM documents; status + proven seed-bridge pattern + soul-safe allowlist design.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.628Z
aliases: reference_jm_doc_population_ms0_2026_06_02
---


# JM-DOC-POPULATION-MS0 (slot:hotel, 2026-06-02)

**Goal (operator):** populate every PRISM app feature with all JM Die documents, **every document accounted for**, then wire/bridge/synergize across backend + AI + Obsidian + Hermes + awareness + memories + wikis for closed-loop app-user testing.

## Accountability-first architecture (the keystone)
"Every document accounted for" needs a verifiable completion criterion, so the campaign is **ledger-first**, not ad-hoc seeding:
- **Ledger** `scripts/build-jm-document-ledger.mjs` → `state/shared/databases/jm-document-ledger-summary.json`. Streams the real **554,999-file** `jm-file-inventory.jsonl` (4 sources × 31 (source,bucket) tuples), routes every file to a disposition (consumed/indexed-only/viewer-only/metadata/unrouted-misc), `invariant_ok:true` (accounted+orphan==total, 0 silent drops, 2,858 explicit unrouted-misc).
- **Gate** `scripts/jm-doc-accountability-gate.mjs` + **registry** `state/shared/databases/jm-doc-bridge-registry.json` (U-JMDOC01/02). Joins ledger↔registry, asserts G1 ledger-integrity / G2 every-tuple-tracked / G3 deferred-has-reason / G4 unrouted-explicit / G5 financial-link-only / G6 coverage. Progress mode GREEN, `--strict` RED until 100%. Each seed bridge flips its tuple to `shipped` + must keep the gate GREEN.

## Proven seed-bridge pattern (replicated 4×)
corpus JSONL → `engine.seedFromX(records)` (allowlist-gated, idempotent dedup-by-path, fail-soft, no async/OCR) → thin dispatcher action (`params.records` test path / stream-filter live path) → vitest (happy/idempotent/dedup/out-of-scope/invalid/financial-guard + dispatcher round-trip) → `verify-*.ts` real-data check (reconciles vs ledger) → flip registry → gate GREEN → pathspec-commit.

## SHIPPED (gate GREEN — 61.444% = 341,013 docs / 20 tuples shipped · 2 deferred · 7 pending; live `state/shared/dashboards/jm-population-status.json`)
- **customer CRM** — CustomerManagementEngine.seedFromJMCorpus (470 customers seeded; 474 observed in corpus; 147,791 crm-link docs).
- **U-JMDOC07** doc-archive 109,534 → DocumentInboxEngine.seedFromJMCorpus + `inbox_seed_jm_corpus`.
- **U-JMDOC08** viewer-only 85,345 → DocumentInboxEngine.seedViewerArchive + `inbox_seed_jm_viewer`.
- **U-JMDOC09** manifest-pointer 111,658 → DocumentInboxEngine.seedManifestPointers + `inbox_seed_jm_manifest`.
- **U-JMDOC10** financial LINK-ONLY 34,452 → DocumentInboxEngine.seedFinancialPointers + `inbox_seed_jm_financial` (financial_guard, archive_class=financial-link; NO AR/AP/GL records minted).
- All 4 inbox seeds share a private `seedArchiveItems` helper (DRY) + 4 disjoint allowlists (DOC 8 / VIEWER 3 / MANIFEST 1 / FINANCIAL 8 tuples). 23 tests (incl. financial-guard soul + dispatcher round-trips). NOTE: `shipped_volume` 341,013 counts ledger rows; distinct-by-path inbox total ≈ 333,942 (`verify-jm-doc-archive-seed.ts`).

## Financial-discipline soul (load-bearing, never soften)
DocuStrata financial docs (sales_orders 21,531 / closed_orders 12,763 / invoices / tax / accounting = 34,452) are **indexed-only / `financial_guard` link-only, NEVER discrete AR/AP records** — OCR runs 40-60% confidence; minting live financial records from low-confidence OCR = silent-financial-clobber. The non-financial allowlists **exclude financial buckets by construction** (a financial doc can never enter the doc/viewer/manifest archives). U-JMDOC10 SHIPPED financial as **link-only inbox pointers** via `DocumentInboxEngine.seedFinancialPointers` + `inbox_seed_jm_financial` (its own FINANCIAL allowlist; `financial_guard:"true"`, `archive_class:"financial-link"`) — gate G5 asserts financial-link-only. Discrete AR/AP/GL ingest from low-confidence OCR is NEVER done.

## PENDING (7 tuples = 210,225 docs) + DEFERRED (2 tuples = 1,036) — cross-lane coordination
All hotel-owned document tuples are SHIPPED; the remainder are cross-lane (coordinate, don't cross):
- **U-JMDOC03** programs — `jm_die_category/program` 140,215 + `part_library/program` 25,976 → **echo+kilo** lanes.
- **U-JMDOC05** parts catalog `part_library/other` 31,023 → PartsLibraryEngine (path-derive customer/part/rev; part.json transient on disk; partsLibraryDispatcher = CAD-shared, coord **delta**). NOTE: ledger originally mis-assigned JobTravelerEngine (work-routing, wrong) — corrected (R7).
- **U-JMDOC04** cad — `jm_die_category/cad` 7,285 + `part_library/cad` 5,709 → coord **delta**.
- **U-JMDOC06** setup `jm_die_category/setup` 16 → coord **foxtrot**.
- **U-JMDOC09 tail** `docustrata_manifest/packing_slip` 1 → coord **charlie**.
- DEFERRED: quotes 1,036 → **charlie** (owns quoting).

## SYNERGY PHASE — flow populated data across PSN legs (operator emphasis)
The 333K seeded inbox docs + 470 customers FLOW into AI/awareness/Obsidian/Hermes/wikis so a closed-loop app-user test sees populated data everywhere. Progress:
- **awareness/dashboard leg** ✅ `U-JMDOC-SYNERGY-STATUS` (commit `4f387f284b`): `scripts/jm-population-status.mjs` → `state/shared/dashboards/jm-population-status.{json,md}` — live coverage snapshot (reads ledger+registry+corpus, cross-checked against the gate).
- **wikis leg** ✅ `U-JMDOC-SYNERGY-WIKI` (commit `242ac43b72`): `knowledge/wiki/architecture/jm-doc-population-ms0.md` + indexed — campaign architecture, 4-seed pattern, financial soul.
- **memories leg** ✅ this file refreshed to live state (was stale 55.24%/12-tuple snapshot).
- REMAINING: wire `jm-population-status` headline into the SessionStart awareness injector (cross-cutting — coord **sierra/alpha**); surface populated inbox into Hermes agent context + prism_business query action.

Plan: `state/shared/JM-DOC-POPULATION-PLAN.md`. Key commits: `9ef423e9cb` (manifest engine), `4f387f284b` (status dashboard), `242ac43b72` (wiki). Related: [[jm-doc-population-ms0]] (wiki), [[feedback_psn_definition]] (synergy legs), [[feedback_reflect_all_changes_post_update]] (no silent drift), [[reference_vendor_catalog_db_2026_05_31]] (charlie corpus).
