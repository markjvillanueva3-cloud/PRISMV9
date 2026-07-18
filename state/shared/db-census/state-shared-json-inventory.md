# DB Census — Root: `state-shared-json` (H:/prism/state/shared)

Scout: database-census. Date: 2026-06-04. Method: real `find`/`du`/`wc`/`head`/`grep` enumeration (no hand-waved counts).

## Root totals (measured)
- Total size: **9.3 GB** under `H:/prism/state/shared`
- JSON files (recursive): **31,890** · JSONL files: **47,582** · `.db`: **1** (`coordination.db`, 40 KB)
- Top-level (`maxdepth 1`) JSON: **358** · of those **235 carry `"schemaVersion"`** (schema-versioned operational stores)
- Biggest subdirs: `system-viz/` 5.1 G · `sfc-variability-results/` 2.2 G · `print-corpus-tables/` 114 M · `databases/` 109 M · `scan-tracking/` 98 M · `training/` 95 M · `dashboards/` 87 M · `quoting/` 58 M

**KNOWN catalog surfaces** (linked, NOT duplicated here): `state/shared/RESOURCE_CENSUS.json`, `RESOURCE_CENSUS_REGISTRY_2026-03-30.json`, `JM-DIE-PROGRAM-CATALOG.md`, `PRISM_SHARED_INDEX_SURFACES.md`, `state/shared/databases/`, `mcp-server/data/jm-die-database/manifest.json`, `mcp-server/data/vendor-catalog-db/manifest.json`, `database-expansion/CRITICAL-RESOURCE-ROOTS.json`, the 34 galaxy `PATHS.md`.

PATHED = referenced in any galaxy PATHS.md / PRISM_SHARED_INDEX_SURFACES.md / CRITICAL-RESOURCE-ROOTS.json. WIRED = filename consumed by an engine/script under `mcp-server/src` (or `scripts/`).

## A. Largest / highest-value stores

| Path (abs under state/shared) | Type | Size / count | Schema shape (head) | PATHED | WIRED | GPU-gen? | Consolidation note |
|---|---|---|---|---|---|---|---|
| `system-viz/system-graph.json` | graph JSON (canonical fleet graph) | 644 MB | 10-layer node/edge graph; ONE-canonical-writer (regen-viz) | ✅ (4 refs) | ✅ (27 src refs) | no | Core PSN render substrate. Keep. |
| `system-viz/system-graph.previous.json` | rollback copy | 495 MB | prior `system-graph.json` snapshot | ❌ | partial | no | **DUP-PAIR** — single rollback generation; 495 MB cost. Cap to N=1 ok, but verify not double-retained. |
| `tribal-embed-index.json` | embedding index | 508 MB | `{schemaVersion:1.0.0, model:"nomic-embed-text:latest", dim:768, entries:[{id,source,domain,title,path,text,...}]}` | ✅ (2) | ✅ (4) | **YES** (nomic-embed-text Ollama) | Built by `scripts/embed-*`/`build-wiki-embeddings.mjs`. Has 7.4 MB `.bak` + 3.2 MB `.blurbs-cache`. GPU/Blackwell accel target. |
| `system-viz/obsidian-augmentation.json` | augmentation overlay | 297 MB | obsidian-brain → graph node augmentation | partial | ✅ (via merge-augmentations) | no | regen-viz augmentation; streaming-written (c1ba2688a fix). |
| `system-viz/system-graph-normalized.json` | derived graph | 247 MB | normalized form of system-graph | partial | ✅ | no | Derived from system-graph.json — regenerable, not a source-of-truth. |
| `system-viz/system-graph-index.json` | graph index | 193 MB | adjacency/lookup index over system-graph | partial | ✅ | no | Derived. |
| `system-viz/h-drive-census.json` | FS census | 126 MB | H: drive file census (dir+file inventory) | ❌ | ❌ (0 src refs) | no | **UNPATHED+UNWIRED**. Overlaps `RESOURCE_CENSUS.json` + `h-drive-dir-index.json` (21 MB) — consolidation candidate w/ canonical census surfaces. |
| `UNLINKED-MENTIONS.json` | wiki-link candidate index | 96.8 MB | `{schemaVersion:1.0.0, generatedAt, repo, stats:{notesScanned:37489,totalMentions:397282}, candidates:[{hostPath,hostSlug,mentionedSlug}]}` | ❌ | ❌ (0 src refs) | no (string-match, not LLM) | **UNPATHED+UNWIRED** — 96 MB orphan. Consumed only by `/unlinked-mentions` skill, not by any engine. Stale (2026-05-23). Big-blob prune candidate. |
| `system-viz/_node-embeddings.jsonl.partial` | **STALLED embedding pass** | 556 MB / 223,001 lines | `.partial` JSONL of 768-d node embeddings | ❌ | ✅ (build-node-embeddings.mjs writes it) | **YES** (nomic-embed-text) | **STALE PARTIAL — dated 2026-05-22, never promoted.** 556 MB of a half-finished GPU embedding run. Either resume on GPU or reap. See §Highest-value gap. |
| `system-viz/node-adjacency.json` | adjacency | 77 MB | node→neighbor adjacency | ❌ | ❌ (0 src refs by filename) | no | Derived from graph; UNWIRED by name (may be loaded via dir glob). |
| `dashboards/jm-die-lathe-audit-dashboard.json` | dashboard | 59 MB | single lathe-audit dashboard blob | ❌ | ❌ | no | Oversized single-file dashboard (59 MB). Should be paged/streamed, not one JSON. |
| `system-viz/find-cache.json` | search cache | 55 MB | `/system-viz find` cache | ❌ | ❌ (0) | no | Regenerable cache; safe to evict. |
| `system-viz/architecture-graph.json` | fallback graph | 52 MB | architecture-graph (system-graph oversize fallback, b0c1ad418) | partial | ✅ | no | Keep (fallback path). |
| `jm-sim/jm-job-catalog.json` | JM job catalog | 19.3 MB | JM Die simulated job catalog | ❌ | ❌ (0 src refs) | no | **UNPATHED+UNWIRED**. Overlaps `databases/jm-file-inventory` + `mcp-server/data/jm-die-database/manifest.json`. Consolidation candidate. |

## B. `databases/` directory (the named DB surface, 109 MB)

| File | Type | Size | Shape | PATHED | WIRED |
|---|---|---|---|---|---|
| `databases/jm-file-inventory.jsonl` | JM file inventory ledger | 108 MB | append JSONL of JM Die files | ✅ (1) | ✅ (8 src refs) | Core JM corpus index. |
| `databases/jm-customers.jsonl` | customer ledger | 156 KB | JM customers | ✅ | ✅ | |
| `databases/jm-vendors.jsonl` | vendor ledger | 4 KB | JM vendors | ✅ | partial | Overlaps `mcp-server/data/vendor-catalog-db/` (425 vendors). |
| `databases/jm-doc-bridge-registry.json` | doc-bridge registry | 16 KB | schema-versioned | partial | ✅ | |
| `databases/jm-document-ledger-summary.json` | summary | 12 KB | rollup | partial | ✅ | |
| `databases/jm-corpus-summary.json` | summary | 1 KB | counts | partial | ✅ | |

## C. Schema-versioned operational state stores (top-level, representative — 235 total)

| File | Role | WIRED | Note |
|---|---|---|---|
| `BUILD_STATE.json` | built/needs-wiring/pending snapshot | ✅ (14 src refs) | Auto-injected at SessionStart. Canonical. |
| `HOOK_REGISTRY.json` (+ `.previous.json`) | hook registry | ✅ (13) | `.previous.json` = DUP rollback pair. |
| `system-graph` family (above) | fleet graph | ✅ | |
| `ENGINE_WIRING_INDEX.json` | engine→dispatcher wiring | ❌ (0 src refs) | **UNWIRED by filename** — likely report-only. |
| `MACHINE_REGISTRY.json` / `MACHINE_HARDENING.json` | machine registry | ❌ (0) | **UNWIRED by filename** — may be report artifacts. |
| `CAPABILITY_INDEX.json` / `CAPABILITY_INDEX` | capability index | ❌ (0) | **UNWIRED by filename**. |
| `ATOMIC_CLAIMS.json` / `ACTIVE_ROADMAP_CLAIMS.json` / `FILE_LOCKS.json` / `ACTIVE_WORK_REGISTRY.json` | coordination state | mixed | Live multi-chat coordination — keep, ephemeral. |
| `MCAT_MS0_*_2026-04-02.json` (10 files, ~2.7 MB largest) | milestone spec snapshots | mostly ❌ | Apr-02 frozen MCAT milestone docs — archive candidates (point-in-time, stale). |
| `coordination.db` (SQLite) | H8 WAL coordination store | 40 KB | ✅ | Only `.db` in root. |

## D. Large structured corpora / ephemeral ledgers (dir-level)

| Dir | Type | Count / size | PATHED | WIRED | GPU-gen? | Note |
|---|---|---|---|---|---|---|
| `sfc-variability-results/{mill,lathe}` | SFC variability corpus | **47,375 JSONL chunks** (mill 39,422 + lathe 7,953), 2.2 GB | ✅ (1 PATHS) | ❌ (0 src by dir name) | no (physics gen) | `{fp,idx,in:{m,mt,mpk,mrr,...},...}` per-row machining variability. Massive; chunk-checkpointed. UNWIRED by dir name (consumed via chunk glob). |
| `chat-bus/messages` | chat-bus claim/msg ledger | 17,267 JSON | partial | ✅ | no | `{schemaVersion,id,ts,sessionId,kind,path,intent}`. Live multi-chat bus; high churn. |
| `checkpoints` | unit checkpoint ledger | 4,017 JSON | partial | ✅ | no | `{schemaVersion,units:[{scope,unitId,commit}]}`. |
| `print-corpus-tables` | print corpus rows | 114 MB (`rows.jsonl`+`by-customer/`+`checkpoint.json`) | partial | partial | no | Manifest+tables corpus pattern. |
| `scan-tracking` | scan ledgers | 98 MB (`jm-die-scan-ledger.jsonl`, `scenario-results.jsonl`) | partial | partial | no | |
| `training` | PSN training corpus | 95 MB (`psn-leg-{1..11}-*.jsonl` + manifests) | partial | ✅ | partial | PSN-corpus producer; some legs = embedding-fed. |
| `dashboards` | dashboard blobs + ledgers | 87 MB | ❌ | partial | no | `jm-die-lathe-audit-dashboard.json` 59 MB oversized; rest = `.jsonl` measure ledgers. |
| `nn-graph` | GNN checkpoints + embeddings | 11 MB (`graphsage-checkpoint.candidate.json` 2.9 MB, `node-embeddings-768d.jsonl` 7.2 MB) | partial | ✅ | **YES** (768-d) | GNN tier-5 substrate. `node-embeddings-768d.jsonl` is GPU-gen. |
| `loop-state` | /loop ATCS state | 317 JSON | partial | ✅ | no | Ephemeral per-loop. |
| `agent-coordination/{cursors,heartbeats}` | coord cursors/heartbeats | 769 + 594 JSON | partial | ✅ | no | Live ephemeral. |
| `cag-route` | CAG route cache | 2,058 JSON | partial | partial | no | |

## E. Embedding / vector sidecars (all GPU-gen candidates — nomic-embed-text dim=768)

| File | Size | Producer script | WIRED |
|---|---|---|---|
| `system-viz/_node-embeddings.jsonl.partial` | **556 MB (STALE PARTIAL)** | `scripts/build-node-embeddings.mjs` | ✅ |
| `tribal-embed-index.json` | 508 MB | `scripts/build-wiki-embeddings.mjs` / `embed-all-wiki.mjs` | ✅ (4) |
| `memory-embeddings-sidecar.json` | 15 MB | `scripts/build-memory-embeddings-sidecar.mjs` | ❌ (0 src by name) — **UNWIRED** |
| `memory-index-sidecar.json` | 6.7 MB | (paired w/ above; `vaultRoot`, 11,315 records) | ❌ (0) — **UNWIRED** |
| `nn-graph/node-embeddings-768d.jsonl` | 7.2 MB | `scripts/build-node-embeddings.mjs` | ✅ (4) |
| `tribal-graph/course-embed-checkpoint.json` | 3.1 MB | course embed pass | partial |
| `.tribal-embed-index.bak.json` | 7.4 MB | backup | ❌ DUP |

All produced by Ollama `nomic-embed-text` passes → every one is a **Blackwell/GPU-accel target** (96 GB RTX PRO 6000 resident model). Memory sidecars (`memory-embeddings-sidecar` + `memory-index-sidecar`, 22 MB combined, 11,315 records) are UNWIRED by filename — built but no engine consumer found under src.

## F. Duplicate / consolidation pairs (measured)

| Pair | Cost | Action |
|---|---|---|
| `quoting/baseline-records-corpus{,.with-real,.with-synth}.json` | 16.8 + 18.7 + 18.7 = **54 MB**, 3 near-identical | Single corpus + delta; 3 full copies of overlapping records. **Merge to base + synth/real flags.** |
| `system-graph.json` + `.previous.json` | 644 + 495 = 1.14 GB | One rollback gen — verify only N=1 retained. |
| `tribal-embed-index.json` + `.bak.json` + `.blurbs-cache.json` | 508 + 7.4 + 3.2 MB | `.bak` evictable. |
| `h-drive-census.json` + `h-drive-dir-index.json` + canonical `RESOURCE_CENSUS.json` | 126 + 21 MB | 3 overlapping FS census stores — consolidate to canonical RESOURCE_CENSUS. |
| `jm-sim/jm-job-catalog.json` + `databases/jm-file-inventory.jsonl` + `mcp-server/data/jm-die-database/manifest.json` | overlapping JM corpus | Consolidate to jm-die-database manifest. |
| `HOOK_REGISTRY.json.previous.json`, `STOP_HOOK_REGISTRY.previous.json`, `slot-task-queues.bak-pre-lima-*.json` | misc rollback/bak | Evictable. |

## Highest-value gap / consolidation opportunity
**`system-viz/_node-embeddings.jsonl.partial` (556 MB, 223,001 lines, dated 2026-05-22, never promoted).** This is a half-finished GPU node-embedding pass that has sat stale for ~2 weeks: it is WIRED (build-node-embeddings.mjs writes it, GNN tier-5 reads node-embeddings-768d.jsonl downstream) but UNPATHED and orphaned in `.partial` state — neither completed nor reaped. Resuming it on the Blackwell (96 GB resident nomic-embed-text) would (a) finish the GNN tier-5 embedding substrate that NN-GRAPH MS2 is blocked on (reference-pool/AUROC work), and (b) reclaim 556 MB if abandoned. It sits alongside the 508 MB live `tribal-embed-index.json` + 22 MB UNWIRED memory sidecars — all the same nomic-embed-text producer family — making a **single GPU-accelerated embedding-refresh batch the highest-leverage consolidation** in this root: finish the partial, re-embed all four sidecars on GPU, and wire the two orphaned memory sidecars to a retrieval consumer.
