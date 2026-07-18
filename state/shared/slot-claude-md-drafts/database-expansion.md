# database-expansion Galaxy — slot:juliett
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = database-expansion-domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** every PRISM persistence surface — Qdrant vector store, AgentDB V3, SQLite WAL coordination store, JSON state sidecars (`mcp-server/data/state/*.json`), JSONL ledgers, milestone envelopes, `roadmap-index.json`, `BUILD_STATE`, `MILESTONE_PROGRESS`, DocuStrata + JM-file database ingestion, schema versioning, migration safety, cross-writer atomicity.

**EXCLUDES:** system-graph.json generation → sierra (system-viz owns regen-viz as single writer); business logic consuming these stores → charlie (quoting), echo (post PDFs), hotel (ERP/accounting); embedding model training → india (ai-training); tribal tip authoring → tribal-knowledge galaxy.

**Slot:** juliett · Worktree: `H:/prism-slot-juliett` · Branch: `slot/juliett`

---

## §2 — Verified engines

No local `.ts` engines under `mcp-server/src/engines/database-expansion/` — code lives in parent engine dirs. Key engines this galaxy USES and maintains:

| Role | Engine file (verified) |
|------|------------------------|
| Qdrant collections (memory/wiki/tribal/code) | `mcp-server/src/engines/QdrantMemoryEngine.ts` |
| Qdrant singleton wrapper | `mcp-server/src/engines/QdrantMemoryEngineSingleton.ts` |
| Unified 14-collection vector search | `mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts` |
| Qdrant capacity planning | `mcp-server/src/engines/QdrantCapacityPlannerEngine.ts` |
| Qdrant surface analytics | `mcp-server/src/engines/QdrantSurfaceEngine.ts` |
| Raw vector store backend | `mcp-server/src/engines/QdrantVectorStoreEngine.ts` |
| Atomic JSON write library | `scripts/lib/atomic-json.mjs` |

---

## §3 — Dispatcher quick-ref

**Primary dispatcher: `prism_memory`** (memory graph + semantic recall + Qdrant surface)

| Action | Use |
|--------|-----|
| `semantic_search` | Master-brain PULL (topK=20) — run before any Grep on domain knowledge |
| `vector_search_unified` | Search all 14 MemoryKind Qdrant collections in one call |
| `qdrant_vector_search` | Raw read from a single Qdrant collection |
| `qdrant_vector_upsert` | Write embeddings — always run `get_health` first |
| `get_health` | Store health check — run before ANY Qdrant write or migration |
| `run_integrity` | Full integrity check — run after ANY migration lands |
| `brain_recall` | Obsidian vault brain recall for a slot/galaxy |

**Secondary: `prism_data`**

| Action | Use |
|--------|-----|
| `database_list` | Enumerate registered databases (SourceCatalogDB, vendor-catalog, etc.) |
| `database_search` | Search across registered databases — never full-read large stores |

**`prism_context:memory_externalize`** — disk round-trip for session memory (confirmed in `contextDispatcher.ts`).

**MCP-down fallback:** `Grep "H:/prism/C:/Users/wompu/.claude/projects/H--prism/memory/*.md"` for memory; `node H:/prism/scripts/system-viz-query.mjs find <term>` for graph nodes.

---

## §4 — Canonical constants + data paths

**NEVER inline constants** — import from `mcp-server/src/physics/constants.ts`. For schema floors, use `omega-thresholds.json` (never hardcode threshold values).

**Store inventory:**

| Store | Engine | Path | schemaVersion | Single writer |
|-------|--------|------|---------------|---------------|
| Qdrant collections | QdrantMemoryEngine | `:6333` (local Docker) | per-collection | juliett |
| SQLite WAL coord store | CoordinationStoreEngine (// UNVERIFIED name) | `mcp-server/data/state/coordination.sqlite` | WAL mode | hook-synergy |
| AgentDB V3 | AgentMemoryFabricEngine (// UNVERIFIED) | `mcp-server/data/state/` | ADR-006/ADR-009 | india/juliett |
| JM-die database | `build-jm-die-database.mjs` | `mcp-server/data/jm-die-database/` | 1.0.0 | juliett |
| State JSON sidecars | per-engine | `mcp-server/data/state/*.json` | schemaVersion field | per engine |

**Large-file size guards — NEVER full-Read these:**

| File | Size | Never do | Do instead |
|------|------|----------|------------|
| `state/shared/system-viz/system-graph.json` | 548.9 MB | `Read()` | `node scripts/system-viz-query.mjs node-card <id>` |
| `MILESTONE_PROGRESS.json` | ~2.1 MB | `Read()` | `node -e "const j=require(...); console.log(j.schemaVersion)"` |
| `state/shared/databases/jm-file-inventory.jsonl` | 108 MB / 555K rows | `Read()` | `head -n 1` then filtered read |
| `state/shared/scan-tracking/jm-die-scan-ledger.jsonl` | 87 MB / 302K rows | `Read()` | `head -n 1` only |
| `state/shared/system-viz/h-drive-files.jsonl` | 187 MB / 1.28M rows | `Read()` | `head -n 1` only |

---

## §5 — Domain gotchas / safety rails

1. **N-writer race.** Designate ONE canonical writer per shared path. `roadmap-index.json` is the canonical 5-writer race study — every new writer on a shared path must audit atomicity first via `atomicWriteJson` + `.cron-locks/*.lock`.
2. **Schema-read blindness.** Never deserialize a state JSON without probing `schemaVersion` first (`if ('totals' in j)` guard). A META tool reading the wrong schema silently returns 0/0/0 (the `ollama-offload-stats.json` v2 regression).
3. **JSONL truncation under SIGKILL.** A subprocess killed mid-write leaves a partially written JSONL. Always snapshot pre/post record count; abort pipeline on shrink.
4. **Stale cron-lock blocking writes.** A zero-byte `.cron-locks/*.lock` from a crashed peer holds the path indefinitely. Do NOT delete blindly — let golf's reaper sweep by age (>3s threshold).
5. **MCP multi-instance port bind.** Leaked `node dist/index.js` instances cause `:3100` bind contention; `prism_memory:*` will silently fail. Check `netstat -ano | findstr 3100` before assuming Qdrant is down.
6. **`PRISM_ROOT` / `import.meta.url` resolution.** Do NOT rely on `cwd` conventions for PRISM_ROOT inside hooks/scripts — resolve from `import.meta.url` (the `mcp-cwd-convention-conflict` regression class).
7. **tmp-orphan hazard.** `atomicWriteJson` leaves `<path>.<pid>.tmp` if the rename never lands. Do NOT bulk-delete. Sweep by age + dead-PID: `node scripts/tmp-orphan-janitor.mjs --apply` (dry-run default; 19.24 GB reclaimed 2026-05-29).
8. **R8 — migration, not parallel store.** Most "new database needs" are an existing collection with the wrong schema applied. The answer is migration, not a new parallel store.

---

## §6 — What NOT to do (domain refuses)

- **NEVER** create a parallel store when a migration of the existing one answers the need (R8 + the juliett soul mandate).
- **NEVER** bump `schemaVersion` in any JSON file without shipping a paired `mcp-server/src/migrations/<scope>-v<N>.sql` or `stateMigrations.ts` entry in the same commit.
- **NEVER** delete or truncate a JSONL ledger because it is large — rotate or archive; ledgers are telemetry.
- **NEVER** full-Read `system-graph.json` (548.9 MB), `MILESTONE_PROGRESS.json` (~2.1 MB), or the 3 large JSONL inventories (87–187 MB) — always use the query layer or `head -n 1`.
- **NEVER** re-OCR the DocuStrata corpus (257,992 files already extracted by `docustrata-pipeline.py` into `.index/*.jsonl` + `jm-die-database/`). Search `manifest.json` + `.index/` only.
- **NEVER** write to a peer-claimed path without first acquiring the advisory lock AND using `atomicWriteJson`.
- **NEVER** report "Qdrant is down" without first running `prism_memory:get_health` AND verifying no zombie `node dist/index.js` is eating `:3100`.
- **NEVER** add a non-atomic write to any path already owned by another writer without a distributed-lock wrapper.

---

## §7 — Domain workflow / pipeline contract

**DocuStrata ingest pipeline** (juliett-owned, operator directive 2026-05-29):
1. Source: `H:/PRISM/Docustrata/` (257,992 files, pre-extracted)
2. Index: `.index/*.jsonl` + `manifest.json` (never re-run OCR)
3. Consolidate: `scripts/build-jm-die-database.mjs` → `mcp-server/data/jm-die-database/`
4. Outputs: `tables/documents.jsonl` (111,745 docs) · `tables/files.jsonl` (38,251 CAD/CAM/g-code) · 76,205 blueprint→program joins

**Store health protocol (run in order):**
```bash
# Before ANY migration or schema bump:
node -e "const j=require('<path>.json'); console.log(j.schemaVersion, Object.keys(j).slice(0,8))"
# Before ANY Qdrant write:
prism_memory:get_health
# After ANY migration lands:
prism_memory:run_integrity
# After ANY regen of system-graph.json:
# verify size did NOT shrink (abort pipeline on shrink)
```

**Migration discipline:**
- Three migrations on disk (verified): `mcp-server/src/migrations/golf-ledger-v1.sql` · `golf-ledger-v2.sql` · `stateMigrations.ts`
- Protocol: every `schemaVersion` bump lands with a paired migration in the same commit; N-1 back-compat for at least one minor version.

---

## §8 — Tribal + corpus pointers

**Wiki entries (query before re-deriving):**
- `[[architecture/database-expansion-atomic-write-discipline]]`
- `[[architecture/database-expansion-schema-versioning]]`
- `[[architecture/knowledge-vault-schema]]`
- `[[architecture/ledger-store]]`
- `[[lessons/discovery-meta-tool-schema-blindness]]`

**JM Die corpus — juliett-owned stores:**

| Corpus | Path | Access rule |
|--------|------|-------------|
| DocuStrata (pre-extracted) | `H:/PRISM/Docustrata/.index/*.jsonl` | `manifest.json` + `.index/` only — no re-OCR |
| JM-die-database | `mcp-server/data/jm-die-database/` | `manifest.json` first |
| JM file inventory | `state/shared/databases/jm-file-inventory.jsonl` | `head -n 1` then filtered |
| JM scan ledger | `state/shared/scan-tracking/jm-die-scan-ledger.jsonl` | `head -n 1` only |
| JM part library | `state/shared/databases/jm-part-library.jsonl` | `prism_data:database_search` |
| Vendor catalog DB | `mcp-server/data/vendor-catalog-db/manifest.json` | `prism_data:database_list` |

**Tribal capture:** `prism_knowledge:tribal_capture slot=juliett domain=database-expansion` — never write `knowledge/tribal/*.md` directly (auto-overwritten).

**Synthesis brain:** `mcp-server/src/engines/database-expansion/MEMORY.md`

---

## §9 — Cross-galaxy edges (PSN)

| Direction | Galaxy (slot) | Bridge |
|-----------|---------------|--------|
| juliett → sierra | system-viz audits schema of `system-graph.json` | `prism_memory:get_health` |
| juliett ← india | india consumes Qdrant + AgentDB embeddings | `prism_memory:qdrant_vector_search` |
| juliett ← tango | tango's duplication guard reads juliett-owned registries | `prism_data:database_search` |
| juliett ← alpha | alpha audits read-cost of juliett stores | `prism_memory:get_health` |
| juliett ↔ golf | golf reaper sweeps `.cron-locks/*.lock` + `*.tmp` orphans | fleet-reaper hook |
| juliett → charlie | charlie (quoting) consumes `jm-die-database` | `prism_data:database_search` |
| juliett → hotel | hotel (business/ERP) consumes `reports/*.json` | `prism_data:database_list` |

---

## §10 — Closed-loop integration (india)

```
xproc_outcome_publish { slot: 'juliett', domain: 'database-expansion' }  // UNVERIFIED action name
tribal_capture slot=juliett domain=database-expansion
```
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "database|qdrant|memory|migration|atomic|ledger"
# Schema migration smoke test:
node -e "const j=require('./data/state/ollama-offload-stats.json'); console.log(j.schemaVersion)"
# Atomic-write lib self-test (pure node, no port needed):
node scripts/lib/atomic-json.mjs --self-test 2>/dev/null || echo "no self-test flag; import and verify"
# Tmp-orphan dry-run audit:
node scripts/tmp-orphan-janitor.mjs
```

---

## §12 — Known bugs / open threads

- **`mcp-cwd-convention-conflict`** — `PRISM_ROOT` resolution via `cwd` vs `import.meta.url` mismatch inside hooks/scripts; unresolved as of 2026-06-08. Workaround: always resolve from `import.meta.url`.
- **`roadmap-index.json` 5-writer race** — canonical study case; no distributed-lock retrofit landed yet. Any new writer on this path MUST add `atomicWriteJson` + advisory lock before shipping.
- Open threads ledger: `mcp-server/src/engines/database-expansion/MEMORY.md §Known failure modes`

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs database-expansion "<question>"
```

Ollama routing for this domain:
- Summarize a schema migration or JSONL sample → `qwen2.5-coder:32b`
- Explain an HNSW/RaBitQ index or AgentDB ADR → `gpt-oss:20b`
- Deep store-architecture reasoning or migration-safety analysis → `gpt-oss:120b`
- Embed text for Qdrant upsert → `nomic-embed-text` (via `prism_memory:embed_text` // UNVERIFIED action)
