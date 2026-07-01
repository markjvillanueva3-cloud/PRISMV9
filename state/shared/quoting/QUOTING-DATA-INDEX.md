# QUOTING-DATA-INDEX — quoting data files wired to the galaxy (auto-generated)

> Fast-search atlas of every quoting data file (corpora/ledgers/state/databases/calibration/LoRA). Built by `scripts/index-quoting-data-files.mjs`; surfaced on-demand by `charlie-quoting-knowledge-inject.mjs`. Generated 2026-05-30.

**46 data files indexed** (calibration:3, corpus:5, data:16, index:8, cost-basis:3, drift:1, vendor-directory:3, database:2, state:2, lora-dataset:3).

## calibration
- **active-calibration.json** — quoting calibration file (json, 76KB · keys: ok,generated_at,source_report_signature,global,customer,record_count)  `state/shared/quoting/active-calibration.json`
- **quoting-calibration-active.json** — active multiplicative correction factors (per-customer+global) — read at quote-time by QuotingActiveFactorLoaderEngine (json, 1KB · 0 records · keys: ok,generated_at,source_report_signature,global,per_customer,notes)  `state/shared/calibration/quoting-calibration-active.json`
- **WORLD_SIM_CALIBRATION.json** — quoting calibration file (json, 8KB · 50 records · keys: schemaVersion,algorithm,arms,calibration,history)  `mcp-server/data/state/WORLD_SIM_CALIBRATION.json`

## corpus
- **baseline-records-corpus-with-real.json** — quoting corpus file (json, 18242KB · keys: generated_iso,source,note,baseline_source,invoices_source,match_policy)  `state/shared/quoting/baseline-records-corpus-with-real.json`
- **baseline-records-corpus-with-synth.json** — iter56 training baseline — 47,905 (customer,part_id) revenue records (synth+real overlay); the quote-vs-actual training source (json, 18242KB · keys: generated_iso,source,note,record_count,inventory_files_consumed,inventory_files_skipped)  `state/shared/quoting/baseline-records-corpus-with-synth.json`
- **baseline-records-corpus.json** — quoting corpus file (json, 16434KB · keys: generated_iso,source,note,record_count,inventory_files_consumed,inventory_files_skipped)  `state/shared/quoting/baseline-records-corpus.json`
- **baseline-records-with-synth.json** — quoting corpus file (json, 23KB · 69 records · keys: generated_iso,source,note,record_count,records,docustrata_pipeline_report)  `state/shared/quoting/baseline-records-with-synth.json`
- **baseline-records.json** — quoting corpus file (json, 32KB · 100 records · keys: generated_iso,source,note,record_count,records)  `state/shared/quoting/baseline-records.json`

## cost-basis
- **jm-vendor-ap-ledger.jsonl** — JM accounts-payable ledger — 20,736 real vendor bill line-items (2014-2026), categorized; the cost-basis half of the data ceiling (should_cost + secondary-ops priors) (jsonl, 4870KB · ~20440 records · keys: vendor,type,date,num,description,qty)  `state/shared/quoting/jm-vendor-ap-ledger.jsonl`
- **jm-vendor-cost-index.json** — vendor cost rollup — per-category unit-cost priors (outside-process/material/tooling/overhead) + top-vendor spend; consumed by should_cost + quoting_secondary_ops_price + DocustrataAccountingBridgeEngine (json, 39KB · keys: schemaVersion,totals,categories,vendors)  `state/shared/quoting/jm-vendor-cost-index.json`
- **JM-VENDOR-COST-INDEX.md** — quoting cost-basis file (md, 4KB)  `state/shared/quoting/JM-VENDOR-COST-INDEX.md`

## data
- **BOOTSTRAP-REMEDIATION-2026-05-26.md** — quoting data file (md, 5KB · keys: mill,600,1800,customer,count,3600)  `state/shared/quoting/BOOTSTRAP-REMEDIATION-2026-05-26.md`
- **catalog-vendors.jsonl** — quoting data file (jsonl, 13KB · ~37 records · keys: name,website,vendor_type,categories,reach,regions)  `state/shared/quoting/vendor-sources/catalog-vendors.jsonl`
- **docustrata-extracted-diag.jsonl** — quoting data file (jsonl, 0KB · ~133 records)  `state/shared/quoting/docustrata-extracted-diag.jsonl`
- **docustrata-extracted.jsonl** — quoting data file (jsonl, 0KB · ~133 records)  `state/shared/quoting/docustrata-extracted.jsonl`
- **docustrata-invoices.curated.json** — quoting data file (json, 2KB · 10 records · keys: schema_version,generated_iso,source,note,invoices)  `state/shared/quoting/docustrata-invoices.curated.json`
- **docustrata-revenues.sample.json** — quoting data file (json, 2KB · 7 records · keys: schema_version,generated_iso,source,note,records)  `state/shared/quoting/docustrata-revenues.sample.json`
- **FIRST-LIVE-CHAIN-EVIDENCE-2026-05-26.md** — quoting data file (md, 4KB · keys: ok,stage,reason,synth_count,validation_warnings,bridge_report)  `state/shared/quoting/FIRST-LIVE-CHAIN-EVIDENCE-2026-05-26.md`
- **FIRST-TRAINING-CYCLE-EVIDENCE.md** — quoting data file (md, 3KB · keys: ok,total_predicted,mape_pct,safe_to_activate,active_factor_written,active_factor_path)  `state/shared/quoting/FIRST-TRAINING-CYCLE-EVIDENCE.md`
- **imts-exhibitors.jsonl** — quoting data file (jsonl, 23KB · ~93 records · keys: name,website,vendor_type,categories,reach,regions)  `state/shared/quoting/vendor-sources/imts-exhibitors.jsonl`
- **jm-die-layout-audit.json** — quoting data file (json, 5KB · 21 records · keys: name,classification,childDirs,childFiles,dominantType,sampleChildDirs)  `state/shared/quoting/jm-die-layout-audit.json`
- **jm-die-layout-audit.md** — quoting data file (md, 4KB)  `state/shared/quoting/jm-die-layout-audit.md`
- **MACHINE-SHOP-NETWORK.md** — quoting data file (md, 3KB)  `state/shared/quoting/MACHINE-SHOP-NETWORK.md`
- **PIPELINE-RUNBOOK.md** — quoting data file (md, 10KB)  `state/shared/quoting/PIPELINE-RUNBOOK.md`
- **REAL-CUSTOMER-CHAIN-EVIDENCE-2026-05-26.md** — quoting data file (md, 6KB · keys: mill,600,1800,3600,min,max)  `state/shared/quoting/REAL-CUSTOMER-CHAIN-EVIDENCE-2026-05-26.md`
- **thomasnet-shops.jsonl** — quoting data file (jsonl, 13KB · ~43 records · keys: name,website,vendor_type,categories,reach,regions)  `state/shared/quoting/vendor-sources/thomasnet-shops.jsonl`
- **train-cycle-history.jsonl** — quoting data file (jsonl, 0KB · ~1 records · keys: ts_iso,ok,reason,total_predicted,mape_pct,safe_to_activate)  `state/shared/quoting/train-cycle-history.jsonl`

## database — owned by **juliett** galaxy (charlie consumes; wire DB changes through juliett)
- **jm-customers.jsonl** — JM Die customer database (473 customers) — customer-name filter + per-customer factor key (jsonl, 152KB · ~460 records · keys: customer_key,aliases,files_total,files_by_bucket,materials_seen,machine_classes_seen)  `state/shared/databases/jm-customers.jsonl`
- **jm-vendors.jsonl** — JM Die vendor database (12 vendors) (jsonl, 3KB · ~15 records · keys: vendor_key,aliases,doc_count,line_item_count,total_spend_usd,grades_supplied)  `state/shared/databases/jm-vendors.jsonl`

## drift
- **latest-drift-alert.json** — canonical drift surface — pre-flight this before any baseline regen (freshness gate) (json, 1KB · keys: schema_version,ts_iso,alert,summary)  `state/shared/quoting/latest-drift-alert.json`

## index
- **catalog-sfc-extraction-manifest.json** — quoting index file (json, 63KB · 91 records · keys: schemaVersion,owner,ingestion_target,schema,records,stats)  `state/shared/quoting/catalog-sfc-extraction-manifest.json`
- **CATALOG-SFC-EXTRACTION-MANIFEST.md** — quoting index file (md, 6KB · keys: high,medium,low)  `state/shared/quoting/CATALOG-SFC-EXTRACTION-MANIFEST.md`
- **machine-shop-network-manifest.json** — quoting index file (json, 3KB · 6 records · keys: schemaVersion,engine,marketplaces,onboarding,populationStrategy,stats)  `state/shared/quoting/machine-shop-network-manifest.json`
- **QUOTING-AWARENESS.md** — live domain awareness digest (engine/hook/algo/frontend counts + drift + next unit) (md, 3KB)  `state/shared/quoting/QUOTING-AWARENESS.md`
- **quoting-data-index.json** — quoting index file (json, 19KB · 44 records · keys: schemaVersion,generatedAt,root,counts,entries)  `state/shared/quoting/quoting-data-index.json`
- **QUOTING-DATA-INDEX.md** — quoting index file (md, 10KB)  `state/shared/quoting/QUOTING-DATA-INDEX.md`
- **quoting-knowledge-index.json** — compiled wiki+tribal+memory retrieval index (113 curated entries) — feeds the knowledge auto-invoke hook (json, 49KB · 113 records · keys: schemaVersion,generatedAt,root,counts,entries)  `state/shared/quoting/quoting-knowledge-index.json`
- **QUOTING-KNOWLEDGE.md** — quoting index file (md, 32KB)  `state/shared/quoting/QUOTING-KNOWLEDGE.md`

## lora-dataset
- **quoting_lora_test.jsonl** — LoRA test split (jsonl, 4KB · ~5 records · keys: id,instruction,input,output,metadata)  `mcp-server/data/quoting-lora-smoke-out/quoting_lora_test.jsonl`
- **quoting_lora_train.jsonl** — LoRA instruction-tuning train split (charlie produces; india trains) (jsonl, 22KB · ~26 records · keys: id,instruction,input,output,metadata)  `mcp-server/data/quoting-lora-smoke-out/quoting_lora_train.jsonl`
- **quoting_lora_val.jsonl** — LoRA val split (jsonl, 7KB · ~8 records · keys: id,instruction,input,output,metadata)  `mcp-server/data/quoting-lora-smoke-out/quoting_lora_val.jsonl`

## state
- **cost-alarm-config.json** — CostAlarmEngine thresholds (json, 2KB · 2 records · keys: schemaVersion,description,thresholds,coolDownMinutes,channels,rotation)  `mcp-server/data/state/cost-alarm-config.json`
- **cost-telemetry.jsonl** — cost-alarm telemetry stream (jsonl, 0KB · ~1 records · keys: schemaVersion,ts,tentacle,taskClass,inputTokens,outputTokens)  `mcp-server/data/state/cost-telemetry.jsonl`

## vendor-directory
- **vendor-directory-index.json** — vendor-directory rollup — counts by source/category/pricing-access; regen: node scripts/build-vendor-directory.mjs (json, 1KB · keys: schemaVersion,generatedAt,stats)  `state/shared/quoting/vendor-directory-index.json`
- **vendor-directory.jsonl** — VDN vendor/distributor directory (VENDOR-NETWORK-MS0) — 204 vendors: 174 JM-AP-seeded + curated supplier catalog, JOIN-keyed for hotel ERP master + DistributorSearchEngine; website/category/pricing-access/region per vendor (jsonl, 169KB · ~436 records · keys: vendor_id,name,source,vendor_type,reach,verified)  `state/shared/quoting/vendor-directory.jsonl`
- **VENDOR-DIRECTORY.md** — quoting vendor-directory file (md, 19KB)  `state/shared/quoting/VENDOR-DIRECTORY.md`

_indexer v1.0.0 · root H:/prism_