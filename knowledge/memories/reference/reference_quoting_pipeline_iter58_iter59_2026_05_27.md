---
name: reference-quoting-pipeline-iter58-iter59-2026-05-27
description: "QUOTING-SYNERGY-MS0 iter58+59 shipped the corpus-source bootstrap + real-revenue overlay. MAPE 2108% → 71.1%. Docustrata data ceiling (R12) — 99% SCAN_GENERIC inbound, not outbound revenue."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.908Z
aliases: reference_quoting_pipeline_iter58_iter59_2026_05_27
---


# Quoting training pipeline — iter58+59 close-out (charlie 2026-05-27)

## What shipped

- **iter58** `7a72cbdc46` — `scripts/quoting-baseline-from-corpus.mjs` (291L, 19/19 tests). Streams iter56's 107.8MB `jm-file-inventory.jsonl` + `jm-customers.jsonl`, aggregates by `(customer, part_id)`, normalizes iter56's vendor-suffixed taxonomy (`mill_hurco`→`mill`, `lathe_okuma`→`lathe`). **Replaces** the prior `quoting-baseline-bootstrap.mjs` which poisoned records with Okuma machine names as customers, single-class collapse, and null materials.
- **iter59** — `scripts/quoting-real-revenue-overlay.mjs` (210L, 12/12 tests). Pure exports: `canonicalKey`, `buildRevenueIndex`, `overlayRevenue`. Two match policies (`strict` | `fuzzy-customer`). Designed to consume curated invoices OR future ERP/accounting feeds via the same contract.

## Live-run numbers

- 554,999 files streamed → **47,905 baseline records** across **473 real customers** (vs prior 50-record Okuma-poisoned baseline)
- Top customers attributable: FONTANA 2062, ALLFAST 1825, FASTENAL 1462, OPTIMAS 1446, AGRATI 1291, OMG 1081, ITW 854, VALLEY+GROUP 835, ATF 825, HOLOKROME 747, GRANDEUR 736 + 462 more
- Distribution: machine_class mill=27,734 / null=18,650 / lathe=1,519 / wedm=2; material `tool_steel_h13`=24,887 / null=15,403 / `tool_steel_d2`=3,492 / `a2`=3,375 / `steel_1018`=669 + 4 more grades
- Stage 1 [[reference_docustrata_pipeline_2026_05_16|docustrata-pipeline]]: 100% match (47,905/47,905), revenue range $77-$274.53
- Stage 2 train-cycle: **MAPE 2108% → 71.1%** (30x improvement), factor **0.5845 NOT clamped** (vs prior 0.2 floor-clamp), 473 per-customer factors derived
- Stage 3 drift-alert: level=info, exit=0 (single-cycle insufficient-history, correct)

## Data ceiling (R12 honest finding — repeat-reads worth pinning)

The Docustrata corpus is **not** what a "Docustrata" name suggests. Sampled 20,001 rows of `H:/PRISM/Docustrata/.index/documents-text-extracted-v3.jsonl`:

| Role | role_confidence | Count | % |
|---|---|---|---|
| SCAN_GENERIC | ≥0.5 | 14,420 | 72% |
| UNKNOWN | <0.5 | 5,367 | 27% |
| NOTE | <0.5 | 211 | 1% |
| SALES_ORDER | ≥0.5 | **2** | 0.01% |

JM Die's Docustrata is a **scan archive of inbound customer engineering prints** (matches iter55 "DocuStrata is INBOUND-only" finding), **not** their outbound billing. The `extract-docustrata-outcomes.mjs` extractor is structurally correct — it returns 0 paired records because the upstream classification produced almost no outbound transaction documents to pair.

`docustrata-invoices.curated.json` (10 hand-curated invoices) uses **fictional part_ids** (`AF-102-05`, `AL-50-S`, `AG-1138-L`, `INTERNAL-FIX-01`, `GB-WIRE-A`) that don't appear in iter56's actual corpus (which uses file-derived ids like `R910`, `A0763-99-12`). The iter59 overlay matched **0 of 10** invoices for that reason.

**Implication:** The trainer-engine + overlay integration is structurally correct + tested. Real outbound revenue → training data requires one of:
1. **AccountingHardeningEngine / ERP connector** (deferred since iter55 punchlist) — the canonical fix
2. **Re-curating `docustrata-invoices.curated.json`** with real iter56 part_ids — interim demo unblock
3. **OCR-ing a different corpus** — JM Die's actual billing PDFs, not their inbound print archive

## How to run end-to-end

```powershell
# Stage 0 — corpus-source baseline (replaces poisoned JM-DIE-ledger bootstrap)
node scripts/quoting-baseline-from-corpus.mjs --out state/shared/quoting/baseline-records-corpus.json --summary --json

# Stage 1 — synth revenue overlay
node scripts/quoting-docustrata-pipeline.mjs --baseline state/shared/quoting/baseline-records-corpus.json --out state/shared/quoting/baseline-records-corpus-with-synth.json --json

# Stage 1.5 (NEW iter59) — real-revenue overlay (currently 0 matches due to data ceiling above)
node scripts/quoting-real-revenue-overlay.mjs --baseline state/shared/quoting/baseline-records-corpus-with-synth.json --invoices state/shared/quoting/docustrata-invoices.curated.json --out state/shared/quoting/baseline-records-corpus-with-real.json --json

# Stage 2 — train cycle
mcp-server/node_modules/.bin/tsx.cmd scripts/quoting-train-cycle.mjs --json --feed-psn --baseline state/shared/quoting/baseline-records-corpus-with-real.json

# Stage 3 — drift alert
node scripts/quoting-train-drift-alert.mjs --json
```

Windows note: the PIPELINE-RUNBOOK says `node mcp-server/node_modules/.bin/tsx` for stage 2 — that's a Unix shell wrapper. On Windows use `.bin/tsx.cmd` directly.

## Orphan inventory (iter53-57 line)

| Engine | Iter | Loc | Dispatcher | Status |
|---|---|---|---|---|
| `DocustrataHistoricalPricingTrainerEngine` | iter53? | engines/ | `quoting_docustrata_train` | ✅ wired (scripts pipeline still uses iter20 synth — separate gap) |
| `JMDieQuoteTrainingPipelineEngine` | earlier | engines/ | quotingDispatcher.ts:156 | ✅ wired |
| `JMDieTrainingCorpusEngine` | earlier | engines/ | mlDispatcher.ts | ✅ wired |
| `JMCustomerVendorDatabaseEngine` | iter57 | engines/ | — | ❌ **orphan** — 210L, 13/13 tests, no dispatcher refs |
| `DocuStrataMaterialPriorEngine` | iter53 | engines/ | — | ❌ **orphan** — 260L, 23/23 tests, no dispatcher refs |

## Heritage data (orphan in `extracted/` + `extracted_modules/`)

- `extracted/business/PRISM_COST_DATABASE.js` 288K — pre-canonicalization cost database, no current engine consumes it
- `extracted/knowledge_bases/PRISM_UNIVERSITY_ALGORITHMS.js` 201K
- `extracted_modules/AI_ML_DETAILED_EXTRACTION.json` 43K
- 6× `materials_*backup_*` folders — sprawl, archive candidates

All are pre-canonicalization monolith extracts from earlier sessions. Triage in a separate sweep (not blocking).

## Next-unit queue

1. **U-QP-WIRE-CUSTOMER-VENDOR-DB-DISPATCHER** — expose `JMCustomerVendorDatabaseEngine` as `prism_quoting:db_*` actions (iter57 orphan)
2. **U-QP-WIRE-MATERIAL-PRIOR-DISPATCHER** — expose `DocuStrataMaterialPriorEngine` as `prism_quoting:material_prior_*` actions (iter53 orphan)
3. **U-QP-CURATE-WITH-REAL-PART-IDS** — re-curate `docustrata-invoices.curated.json` using real iter56 part_ids; will lift overlay from 0% → some-% match
4. **U-QP-UNASSIGNED-RESCUE** — iter56 ingest enhancement to attribute the 24,930 UNASSIGNED records (45% of corpus)
5. **U-QP-ACCOUNTING-WIRE** — the canonical real-revenue source; deferred since iter55. Likely blocked on external ERP access.

## Related

- [[feedback_ai_training_first_before_revenue]] — pre-revenue corpus training discipline
- [[reference_quoting_pipeline_session_2026_05_26]] — iter9-23 calibration substrate
- [[feedback_psn_definition]] — PSN leg #11 (PRISM AI) consumes `active-calibration.json`
- `knowledge/wiki/architecture/quoting-training-pipeline.md` — Karpathy LLM-wiki main entry
- `state/shared/quoting/PIPELINE-RUNBOOK.md` — operator runbook (needs iter58+59 sections added)

## Commits

- iter58 `7a72cbdc46` corpus-source bootstrap
- iter59 (this session, slot/charlie tree) real-revenue overlay
