# Knowledge-Indexes DB Census — `H:/prism/knowledge/**`

Scout root: `knowledge-indexes`. Method: real enumeration (`find`/`wc`/`du`/`head -c`), no hand-waved counts. Generated 2026-06-04.

**Tree totals:** `knowledge/` = 382 MB. Largest leaves: `wiki/` 305 MB, `memories/` 55 MB, `tribal/` 18 MB, `handoffs/` 17 MB (symlink → `state/shared/handoffs/`).

> NOTE: the task brief's "356 MB tribal-embed-index.json" does **NOT** live in `knowledge/`. It is `state/shared/tribal-embed-index.json` (now **507 MB**, grown). It is cross-referenced below as the un-quantized twin of the in-tree `_embeddings.jsonl` — flagged as the top consolidation gap. Catalog surfaces NOT duplicated: `state/shared/RESOURCE_CENSUS.json`, `state/shared/PRISM_SHARED_INDEX_SURFACES.md`, `state/shared/databases/`, `CRITICAL-RESOURCE-ROOTS.json`, the 34 galaxy `PATHS.md`.

## DB artifacts (vector / index / structured corpus)

| # | Path (abs) | Type | Size / count | Schema shape (head) | PATHED? | WIRED? | GPU-gen? | Consolidation note |
|---|------------|------|--------------|---------------------|---------|--------|----------|--------------------|
| 1 | `knowledge/wiki/architecture/_embeddings.jsonl` | Vector store (JSONL, int8-quantized dim-768) | **106 MB / 43,441 lines** (1 `__meta` + 43,440 vecs) | L1 `{__meta,model:"nomic-embed-text",dim:768,count:43440,generatedAt:2026-06-04T13:02}`; rows `{n:name,t:type,h:hash,s:scale,q:[int8…768]}` | YES (8 PATHS.md: database-expansion, discovery, lathe, academy, business, cam, post-processor, quoting, speed-feed, token-optimization) | YES (`WikiIndexMaintainerEngine.ts`, `build-wiki-embeddings.mjs`, `embed-all-wiki.mjs`, `audit-wiki-coverage.mjs`, `spawned-agent-context-lib.mjs`) | **YES — produced by nomic-embed-text pass** (Ollama/GPU) | **TWIN of #2** — same model/dim/corpus, this one int8-quantized (5× smaller). Keep this, retire #2's float copy. |
| 2 | `state/shared/tribal-embed-index.json` *(out-of-root, cross-ref)* | Vector store (JSON, float dim-768) | **507 MB / 1 array** | `{schemaVersion:1.0.0,model:"nomic-embed-text:latest",dim:768,generatedAt:2026-06-04T07:14,entries:[{id:"wiki:…",source,domain,title,vec[768 float]…}]}` | YES (10+ PATHS.md) | YES (`PSNSynergyInspectorEngine.ts`, `BlueprintCorpusHarvestEngine.ts`, `audit-tribal-coverage.mjs`, `tribal-embed-index.mjs`) | YES — same nomic pass | **507 MB float vs #1's 106 MB int8 for the SAME semantic corpus.** 5× duplicated vector bytes. + stale dupes: `.tribal-embed-index.bak.json` 7.4 MB, `prism-test-6d0595/…` 5.8 MB, `worktrees/rgs6-audit-v2/…` 5.8 MB, `tribal-embed-index.blurbs-cache.json` 3.1 MB. |
| 3 | `knowledge/wiki/architecture/_leaf-index.jsonl` | Leaf catalog (JSONL, no vectors) | **17.7 MB / 54,230 lines** | rows `{name,title,type,desc,path}` (one per wiki leaf + engine + tribal) | YES (database-expansion PATHS.md) | YES (`build-wiki-leaf-index.mjs` + test, `WikiIndexMaintainerEngine.ts`) | No (pure metadata, regex-built) | Co-generated with #1; companion not duplicate. |
| 4 | `knowledge/wiki/index.jsonl` | Wiki entry index (JSONL) | 193 KB / **770 lines** | `{slug,category,summary,sources[],confidence,last_verified,source}` | YES (index in `wiki/index.md`) | YES (`WikiIndexMaintainerEngine`) | No | Canonical 770-entry wiki catalog; pairs with `wiki/index.md` (0.2 MB). |
| 5 | `knowledge/wiki/architecture/_skill-triggers.jsonl` | Skill-trigger index (JSONL) | 90 KB / **518 lines** | `{name,type:"skill",manifest,matcher:{type,value},score…}` | (consumed via hook) | YES (`skill-auto-trigger.mjs` hook, `extract-skill-triggers.mjs`) | No | + sibling `_skill-triggers-pathglob.jsonl` (10 KB). |
| 6 | `knowledge/summaries/routing-decisions.jsonl` | Append-only routing ledger | 191 KB / **276 lines** | `{ts,task,taskClass,primary,fallback[],reachable,reason}` | No | likely (AI-router) | No | Small ops ledger; UNPATHED. |
| 7 | `knowledge/code-index/EXECUTION_CHAIN.json` | Dispatcher→action map | 24 KB | `{summary:{total_actions:382,engine_count:37,dispatcher_count:31},dispatchers:{…}}` | No | partial | No | STALE (382 actions vs live ~thousands). Superseded by `CODE_SYSTEM_INDEX.json`. |
| 8 | `knowledge/data-index/DATA_TAXONOMY.json` | Data-source taxonomy | 4.9 KB | `{generated:2026-02-17,branch,version,data_architecture:{primary_source,…}}` | No | No | No | STALE (Feb-17, refs `C:\PRISM\state\`). Candidate delete/refresh. |
| 9 | `knowledge/sessions/SESSION_KNOWLEDGE_INDEX.json` | Session decision index | 5.9 KB / 8 entries | `{version:1,entry_count:8,last_updated:2026-02-17,entries:[{id,type,phase,milestone,summary}]}` | No | No | No | STALE (Feb-17, 8 entries). Dormant. |
| 10 | `knowledge/wiki/code-tribal/canonical/_DISTILL_LOG.json` | Tribal-distill audit log | 51 KB | `{schemaVersion:1,generatedAt:2026-05-09,threshold:0.8,inputTipsCount:243,outputBlocksCount:181,reductionPct:25.5,…}` | No | YES (`distill-tribal`) | (LLM-distilled) | Audit artifact for code-tribal distillation. |
| 11 | `knowledge/wiki/.hook-cache/*.json` | Hook memo cache | **4,635 files** (~2–4 KB each) | sha-named `{…}` cache blobs | No | YES (wiki hooks) | No | Cache dir; prunable, not a real DB. |
| 12 | `knowledge/roadmap/INTEL-OLLAMA-OBSIDIAN-MS0.json` | Milestone envelope | 128 KB | milestone/unit JSON | No (in `knowledge/`) | No | No | One-off envelope copy. |
| 13 | `knowledge/.obsidian/` | Obsidian vault config + REST-API plugin | 4.0 MB (`main.js` 3.8 MB) | `workspace.json`, plugin `data.json` | n/a | n/a (Obsidian app) | No | App config, not a PRISM DB. |

## Markdown corpora (structured knowledge stores — fed to #1/#2 embedders)

| Corpus | Path | .md count | Embedded in #1? (matching `t:` type) |
|--------|------|-----------|--------------------------------------|
| Wiki (all) | `knowledge/wiki/**` | **38,741** | partial — see coverage note |
| └ architecture | `knowledge/wiki/architecture/` | 35,096 | `architecture` 9,680 |
| └ code-tribal | `knowledge/wiki/code-tribal/` | 3,027 | `code-tribal` 3,028 ✓ |
| └ os | `knowledge/wiki/os/` | 331 | `os` 327 ✓ |
| └ lessons | `knowledge/wiki/lessons/` | 193 | `lessons` 176 |
| Memories (all) | `knowledge/memories/**` | **11,702** | `memory-reference` 10,879 ✓ + feedback/patterns/etc |
| └ reference | `knowledge/memories/reference/` | 10,879 | `memory-reference` 10,879 ✓ (1:1) |
| └ feedback | `knowledge/memories/feedback/` | 233 | `memory-feedback` 234 ✓ |
| └ galaxies | `knowledge/memories/galaxies/` | 149 | (in architecture) |
| Tribal tips | `knowledge/tribal/` | **4,247** | `tribal-tip` 4,247 ✓ (1:1) |
| claude-md + gsd | `knowledge/{claude-md,gsd}/` | 137 | (doctrine, not embedded) |

## Embedding coverage — corrected

`_embeddings.jsonl` carries **43,440 vectors across all 11 PSN legs**, fresh (2026-06-04 13:02): `memory-reference` 10,879 (1:1 with reference .md), `architecture` 9,680, `formula` 7,316, `engine` 4,417, `tribal-tip` 4,247 (1:1), `code-tribal` 3,028 (1:1), `test` 1,242, `hook` 764, `skill` 398, `os` 327, plus memory-feedback/scrutiny/patterns/project/lessons.

The brief's **"31.5% of 38,035 wiki files embedded"** is the **`wiki/architecture` leaf layer only** (`WIKI-COVERAGE-AUDIT.json`): 9,680 `architecture` vectors / 35,096 architecture .md = **27.6%**. The 35,096 architecture .md are mostly auto-generated per-engine/per-test leaves (`tests-index`, `_orphans-rescue`, layer maps) — the high-value memory/tribal/code-tribal layers are at ~100% coverage. So the gap is real but concentrated in the auto-gen architecture leaf tail, not the curated knowledge.

## GPU-gen acceleration opportunities

- **#1 + #2 (nomic-embed-text dim-768):** both regenerated TODAY from full re-embed passes (#2 at 07:14, #1 at 13:02 — two passes, 6h apart, same model). Routing the nomic pass to the Blackwell (RTX PRO 6000, qwen-tier host) or a batched Ollama `/api/embed` GPU run would cut wall-time and, with **incremental hash-gated re-embed** (rows already carry `h:` hash), avoid re-embedding unchanged leaves entirely.
- **Architecture-leaf tail (~25k unembedded):** the only true coverage gap; an Ollama GPU batch closing 27.6%→100% on architecture is the highest-volume embed job available in this root.

## Summary stats
- **DB artifacts in `knowledge/**`:** 12 (excl. Obsidian app config #13) + 5 md-corpus stores.
- **UNPATHED:** #6 routing-decisions, #7 EXECUTION_CHAIN, #8 DATA_TAXONOMY, #9 SESSION_KNOWLEDGE_INDEX, #10 _DISTILL_LOG, #12 envelope = **6 UNPATHED**.
- **UNWIRED:** #8 DATA_TAXONOMY, #9 SESSION_KNOWLEDGE_INDEX = **2 fully UNWIRED** (both STALE Feb-17 dormant); #7 EXECUTION_CHAIN partial/stale.
- **STALE candidates for delete/refresh:** #7, #8, #9 (all Feb-17, superseded by live inventory/CODE_SYSTEM_INDEX).
