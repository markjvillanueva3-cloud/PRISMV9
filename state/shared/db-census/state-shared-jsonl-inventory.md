# DB Census — Root: state-shared-jsonl

Scout pass 2026-06-04. Scope: `H:/prism/state/shared/**/*.jsonl` (append-only ledgers + embedding sidecars). All counts from real `find`/`du`/`wc`/`head`/`date`/`grep`.

## Headline numbers
- **47,582** total `*.jsonl` files under `state/shared/`. **47,378 (99.6%)** are inside one corpus dir — `sfc-variability-results/` (mill 39,421 + lathe 7,952 + dryrun/smoke 11) — sharded SFC physics-gauntlet result chunks, NOT ledgers. Treated as **ONE corpus artifact** below.
- Remaining **~204** are genuine DB artifacts: ~85 root-level single-file ledgers + ~120 subdir ledgers/corpus-tables/training legs (excl. 23 `extracted-pdfs/*.jsonl`).
- This inventory profiles the **~50 highest-value distinct artifacts**; the long tail of small (<5 KB) cron/bypass/history ledgers is wired+bounded and listed in the tail section.

## Known catalog surfaces (linked, not duplicated)
`state/shared/RESOURCE_CENSUS.json` · `state/shared/PRISM_SHARED_INDEX_SURFACES.md` · `state/shared/databases/` · `mcp-server/data/vendor-catalog-db/manifest.json` · `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · the 34 galaxy `PATHS.md`.

---

## A. The corpus (sharded, count-dominating)

| Path | Type | Size / count | Schema shape | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|---|
| `sfc-variability-results/{mill,lathe,...}/chunk-*.jsonl` | sharded result corpus | **2.2 GB** / 47,378 files | `{fp, idx, in:{m,mt,mpk,mrr,rig,...,mat,iso,op,cut,hldr,td,tmat,...}}` — SFC physics scenario rows (machine+material+tool+op → speed/feed) | NO | guard wired (`sfc-variability-guard.jsonl`) | partial (physics-gen, not LLM) | 99.6% of all file count. Bounded by gauntlet runs. **NOT a rotation hazard but a count/IO hazard** — 47K tiny files. Consolidation candidate → single packed store or `databases/`. |

---

## B. Embedding / vector sidecars (GPU-gen)

| Path | Type | Size / lines | Schema shape | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|---|
| `nn-graph/node-embeddings-768d.jsonl` | embedding sidecar | 7.2 MB / 3,790 lines | hdr `{__meta, model:"nomic-embed-text:latest", dim:768, count:3789, source:"graph-node-bridge"}` then `{n:<node-id>, q:[768 int8]}` | YES (ai-training/PATHS.md) | YES (`scripts/generate-gnn-embed-bridge-features.mjs`, GNN tier-5 bridge) | **YES — Ollama `nomic-embed-text`** | Quantized int8 vectors. Regen on graph change; prime GPU-batch target. Feeds NN-GRAPH MS2 retrain. |
| `training/psn-leg-6-graph-features.jsonl` | GNN feature corpus | 76 MB / 283,217 lines | `{node_id, layer, status, subgroup, parent, label, in_degree, out_degree, is_ghost}` | NO | YES (`scripts/build-psn-training-corpus.mjs`) | structural (could feed embed pass) | Largest training leg. Pairs with embedding sidecar above. |
| `training/psn-leg-{1,3,4,5,7,9,11}-*.jsonl` | PSN training corpus legs | 0.03–7.8 MB each | per-leg `{...}` (wiki/memories/tribal/engines/formulas/prism-ai text→pair) | NO | YES (`build-psn-training-corpus.mjs`) | text legs = **embed candidates** | 11-leg PSN training corpus. None PATHED. GPU-gen opportunity: batch-embed the text legs. |
| `training/wiki-canonical-pairs.jsonl` | training pairs | 0.5 MB / 282 lines | wiki Q→A pairs | NO | **UNWIRED** (no consumer found under src/scripts) | text (embed candidate) | Possibly orphaned training output. Verify before relying. |

---

## C. Large structured corpus tables / inventories

| Path | Type | Size / lines | Schema shape | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|---|
| `system-viz/h-drive-files.jsonl` | filesystem inventory | 196 MB | `{path, size, mtime, ext, depth}` | NO | YES (`vizOutputSize.test.ts` + viz) | no | **STALE — last write 2026-05-08.** Full H: drive file scan. Largest single file. Rotation/refresh candidate. |
| `databases/jm-file-inventory.jsonl` | JM Die file inventory | 113 MB | `{path, bucket, customer, material, machine_class, source}` | YES (quoting/PATHS.md) | YES (`DocumentInboxEngine.ts`) | no | Last write 2026-05-27. Canonical JM file index. Lives in `databases/` (good). |
| `scan-tracking/jm-die-scan-ledger.jsonl` | program-scan ledger | 91 MB | `{abs_path, sha_short, size_bytes, mtime_iso, scanned_at, source, machine_family, kind}` | NO | YES (`CrossPartToolingSynergyEngine.ts`) | no | Append-only scan ledger; last write 2026-05-24. UNPATHED. |
| `print-corpus-tables/rows.jsonl` | print-corpus table | 58 MB | `{rowId, sourceSha256, sourcePath, sourceKind, ...}` | NO | YES (`PrintAccuracyProofEngine.ts`) | OCR-gen | Print/blueprint corpus rows. |
| `print-corpus-tables/by-customer/_PART_LIBRARY.jsonl` | print-corpus partition | 58 MB | same as rows.jsonl, customer-partitioned | NO | YES (PrintAccuracy) | OCR-gen | **Near-duplicate size of rows.jsonl** — likely a partition/view, consolidation-verify. |
| `quoting/jm-vendor-ap-ledger.jsonl` | vendor AP ledger | 5.0 MB | `{vendor, type, date, num, description, qty, unit_cost, line_amount, is_credit, category}` | NO | YES (`scripts/index-quoting-data-files.mjs`) | no | JM procurement AP lines. Overlaps `mcp-server/data/vendor-catalog-db/`. |
| `quoting/vendor-directory.jsonl` | vendor directory | 0.22 MB | vendor records | NO | YES (`build-catalog-sfc-manifest.mjs`) | no | Overlaps vendor-catalog-db. |
| `databases/jm-customers.jsonl` | customer table | 0.15 MB | customer records | NO | YES (`CustomerManagementEngine.ts`) | no | In `databases/`. |
| `jm-sim/jm-business-docs.jsonl` | business doc corpus | 9.2 MB | sim business docs | NO | YES (`scripts/jm-sim/build-jm-job-catalog.mjs`) | no | |
| `dashboards/pre-tool-router-table-advise.jsonl` | router-advice ledger | 11 MB | router advice rows | NO | YES (`pre-tool-router-table-advise.mjs` hook) | no | Growing; dashboards/. |

---

## D. Append-only ledgers — GROWING / high-traffic (rotation candidates — NEVER delete)

All confirmed live (last write **2026-06-04** unless noted). These are the unbounded-growth rotation candidates.

| Path | Size | Schema shape | PATHED | WIRED | Note |
|---|---|---|---|---|---|
| `source-monitor-log.jsonl` | **232 MB** | `{sweep_at, source, status, items:[{guid,title,link,published,...}]}` | NO | YES (`scripts/source-monitor-sweep.mjs`) | **LARGEST live ledger.** arXiv/RSS source-monitor sweeps. UNPATHED. **#1 rotation candidate.** |
| `blueprint-training-pairs.jsonl` | 54 MB | `{part_number, part_number_normalized, print_docs:[{doc_id,filename,drawing_score}]}` | NO | YES (`scripts/blueprint-trainset-curate.mjs`) | UNPATHED. Training-pair ledger. |
| `blueprint-extraction-deep-reason-2026-05-24.jsonl` | 26 MB | extraction reasoning rows | NO | YES (`scripts/blueprint-extraction-100pct-proof.mjs`) | Date-stamped (frozen snapshot, not growing). |
| `blueprint-extraction-accuracy-2026-05-24.jsonl` | 17 MB | accuracy event rows | NO | YES (blueprint scripts) | Date-stamped snapshot. |
| `outcome-bus.jsonl` | 17 MB | `{ts, source, session_id, slot, domain, tool, success, hint}` | YES (ai-training/PATHS.md) | YES (`CAMLoRAAdapterTrainerEngine.ts` + `outcome-bus-auto-tap.mjs`) | Fleet outcome bus. PATHED+WIRED. Rotation candidate. |
| `UNIFIED_EDIT_TAP.jsonl` | 12 MB | `{at, tool, file_path, op, agent, session}` | NO | YES (`scripts/unified-observability-drain.mjs`) | Every Edit/Write fleet-wide. **Drained**, so rotation handled by drain. UNPATHED. |
| `zebra-orchestrator-log.jsonl` | 10 MB | `{ts, slot, pid, decision, gate, result*}` | NO | **UNWIRED (DEAD)** | **Superseded by `zulu-orchestrator-log.jsonl` (Zebra→Zulu rename).** Last write 2026-05-29; zulu live 2026-06-04. **Consolidation: archive — dead duplicate.** |
| `blueprint-trainset-clean.jsonl` | 8.6 MB | cleaned trainset rows | NO | YES (blueprint scripts) | |
| `master-index-query-log.jsonl` | 3.7 MB | `{ts, terms[], k, hitsReturned, topScore, source, v}` | NO | YES (`scripts/lib/master-index-query-log.mjs`) | Search-telemetry, growing. UNPATHED. |
| `.janitor-kills.jsonl` | 2.6 MB | janitor kill events | NO | YES (janitor) | Hidden ledger. |
| `ghost-wire-outcomes.jsonl` | 2.5 MB | ghost-wire validation outcomes | NO | YES (`scripts/validate-ghost-wires.mjs`) | |
| `tribal-citation-log.jsonl` | 2.3 MB | `{ts, query, domain, milestone, caller, k, cited:[{id,score,...}]}` | NO | YES (`scripts/generate-knowledge-galaxy.mjs`) | Tribal-cite telemetry, live 2026-06-03. UNPATHED. |
| `session-learning-log.jsonl` | 1.5 MB | learning events | NO | YES (`schemas/unifiedErrorLedger.ts`) | |
| `zulu-orchestrator-log.jsonl` | 0.57 MB | orchestrator decisions (live successor to zebra) | NO | YES (`scripts/zulu-orchestrator-sweep.mjs`) | Live. |
| `dashboards/pre-tool-savings-multi.jsonl` | 6.0 MB | token-savings rows | NO | YES (`audit-token-savings-coverage.mjs`) | |
| `scan-tracking/scenario-results.jsonl` | 11 MB | scenario result rows | NO | (scan-tracking) | |

---

## E. Bounded / small ledgers (wired, low rotation risk)

Confirmed WIRED, all <1 MB, append-bounded by event cadence. Representative (full ~50 in the long tail):
`stop-hook-ledger.jsonl` (stop-hook-aggregator), `episodes.jsonl` (DynamicTimeWarping algo), `AGENT_CHAT.jsonl` (PATHED database-expansion + CostAlarmEngine), `skill-candidates.jsonl` (octopus-record-lib), `coverage-floor-defer.jsonl` (blueprint-coverage-floor-guard hook), `cam-tribal-corpus.jsonl` (AIResourceLearningEngine), `async-hook-queue.jsonl` (AsyncHookDispatcherEngine), `COORDINATION_LEDGER.jsonl` (sessionActionSchemas), `consensus-queue.jsonl` (auto-consensus-critical-edit hook), `psn-training-signal.jsonl` (psn-autonomy-data-ingest), `rtk-archive.jsonl`, `dashboards/rtk-savings-ledger.jsonl` (psn-savings-aggregate), `SUBAGENT_ACTIVITY.jsonl`, `BROADCAST_CHANNEL.jsonl`, `fleet-memory-history.jsonl`, `fleet-task-health-history.jsonl`, `octopus-runs.jsonl`, `psn/cad-action-nodes.jsonl`, plus ~20 `*-cron.jsonl` / `*-bypasses.jsonl` / `*-history.jsonl` audit ledgers.

**0-byte placeholder ledgers (WIRED, awaiting events):** `ERROR_LEDGER.jsonl` (UnifiedErrorLedgerEngine), `AGENT_UTILIZATION_LEDGER.jsonl` (agent-util-log hook), `HOOK_CHANGE_JUSTIFICATIONS.jsonl` (hook-modification-justification hook). Empty but bound to writers — not orphans.

---

## F. UNWIRED / orphan candidates (verify before relying)

| Path | Size | Status |
|---|---|---|
| `zebra-orchestrator-log.jsonl` | 10 MB | **DEAD duplicate** — superseded by zulu. Archive. |
| `training/wiki-canonical-pairs.jsonl` | 0.5 MB | No consumer found under src/scripts. Possibly stale training output. |

(Long-tail small ledgers all resolved to a wired writer/consumer in spot checks; the two above are the only confirmed unwired artifacts of material size.)

---

## Cross-references / consolidation map
- **Vendor stores triple-overlap:** `quoting/jm-vendor-ap-ledger.jsonl` + `quoting/vendor-directory.jsonl` + `quoting/vendor-sources/catalog-vendors.jsonl` overlap the persisted `mcp-server/data/vendor-catalog-db/` (425 vendors) and `databases/jm-vendors.jsonl`. Candidate to fold the AP ledger metadata into vendor-catalog-db.
- **Print-corpus near-dup:** `print-corpus-tables/rows.jsonl` (58 MB) vs `by-customer/_PART_LIBRARY.jsonl` (58 MB) — verify partition-vs-copy.
- **Orchestrator-log dup:** zebra (dead) vs zulu (live).
- **`databases/` is the right home** — only `jm-file-inventory`, `jm-customers`, `jm-vendors` live there; the 232 MB `source-monitor-log`, 91 MB `jm-die-scan-ledger`, 196 MB `system-viz/h-drive-files` are scattered at root/subdirs and UNPATHED.
