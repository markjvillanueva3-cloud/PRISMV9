---
name: reference_blackwell_db_gen_embed_pool_2026_06_04
description: "BLACKWELL-DB-GEN-MS0 embed-pool completion + cited-tips array-shape fix + tribal-index lock + H: DB census catalog (slot juliett 2026-06-04, commit a4648b64ba)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.029Z
aliases: reference_blackwell_db_gen_embed_pool_2026_06_04
---


Slot juliett, 2026-06-04, commit `a4648b64ba` (branch cad-fusion-live-ms0). Operator /goal: use the new RTX PRO 6000 Blackwell (96GB) to make DB generation efficient + categorize/path every H: database for fleet search.

**GPU verified real:** `NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97887 MiB, driver 596.59, compute 12.0` (documented host was a 4080 SUPER — always verify the hardware claim). Ollama runs on it (qwen3-vl + qwen2.5-coder:32b resident). nomic-embed-text (137M) is ~94% GPU-idle one-at-a-time → the lever is concurrency/batching, NOT "move to GPU" (already there).

**Embed-pool completion (BLACKWELL-DB-GEN-MS0):** wired `embed-engines-into-tribal-index.mjs` + `embed-cited-tips-into-tribal-index.mjs` to the shared `scripts/lib/embed-pool.mjs` (PRISM_EMBED_CONCURRENCY, default 1 = byte-identical serial). The wiki concept embedder already had it (~15× @ conc16, vectors byte-identical). Chunked-checkpoint preserves the engines 3-consecutive-infra-failure circuit breaker (pure exported `foldEngineResults`).

**cited-tips R12 SHAPE BUG (the real find):** the prior writer treated `idx.entries` as an OBJECT (`idx.entries[key]=`) but the live `state/shared/tribal-embed-index.json` is an ARRAY (507MB, ~33K entries, what `.claude/scripts/tribal-rerank.mjs` reads via `for (const e of idx.entries)`). String keys on an array are DROPPED by JSON.stringify → every cited tip silently vanished (verified 0 `tip:` entries despite the script "running"). Fixed: push CANONICAL array entries (id/source/domain/title/path/text/hash/embedding), map catalog→VALID_DOMAINS {mill,lathe,wedm,cad,cam,backend-dev,general} (milling→mill, post→general), drop 2 PHANTOM catalogs (wedm/lathe files don't exist on disk — only `milling-pdf-cited-tips.ts` + `post-pdf-cited-tips.ts`). PROVEN on live GPU: 0→10 tips land, idempotent (hash skip), conc=8.

**Multi-writer lock:** wired the canonical `scripts/lib/tribal-index-lock.mjs` (`withTribalIndexLock`, BRAIN-UPGRADE rank 12) into BOTH embedders — its header NAMES them as unguarded RMW writers. Pattern: slow embed OUTSIDE the lock, re-read-fresh+splice+atomic-write INSIDE, batch preserved + exit-4 on peer contention. **staleMs=600_000** (default 30s would stale-steal mid-write: the 507MB synchronous JSON.stringify+writeFileSync measured ~250s on the H: drive → lost update). 53/53 tests. NOTE the per-checkpoint full-507MB rewrite is heavy — engines CHECKPOINT_EVERY bumped 25→200 to bound it.

**H: DB census** → `state/shared/db-census/`: `H-DRIVE-DB-CATALOG.md` (index-of-indexes, LINKS existing surfaces not duplicates) + `DB-GAP-LIST.md` + 10 scout inventories. The existing canonical DB registry is `data/databases/DB_MANIFEST.json` (v2.0.0, 27 DBs, already correctly referenced by all 34 PATHS.md). See [[feedback_verify_workflow_gaplists_before_acting]] for the A2 false-claim caught here. Open high-value GPU jobs (VERIFY each first): D1 stalled `system-viz/_node-embeddings.jsonl.partial` (556MB), D2 architecture-leaf embed tail (27.6%→100%), C4 embedding-sidecar consolidation (~1.2GB, 6 stores).
