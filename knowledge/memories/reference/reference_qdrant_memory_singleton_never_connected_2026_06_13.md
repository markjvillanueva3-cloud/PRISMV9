---
name: reference_qdrant_memory_singleton_never_connected_2026_06_13
description: "The fleet-canonical prism_memory:semantic_search / remember surface was hard-dead because QdrantMemoryEngineSingleton never called store.connect(); revived 2026-06-13 (slot:sierra, commit 9c0ab7885f)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.137Z
aliases: reference_qdrant_memory_singleton_never_connected_2026_06_13
---


# QdrantMemoryEngineSingleton never connected its store -> entire MCP vault recall was dead (2026-06-13, slot:sierra)

**Symptom (operator: "hermes couldn't get the nodes properly setup with qdrant"):** every
`prism_memory:semantic_search` / `remember` / `bulk_semantic_search` / the bridge returned
`{"ok":false,"error":"qdrant not connected","_elapsed_ms":"0.1"}` — instant short-circuit — even
though Qdrant was UP + reachable (direct curl to `:6333` fine) and the 5 collections were populated
(prism_memories 17032, prism_wiki 53930, prism_engines 3866, prism_skills 241, prism_formulas 32).

**Root cause:** `QdrantMemoryEngineSingleton.getInstance()` (`mcp-server/src/engines/QdrantMemoryEngineSingleton.ts`)
built the engine + injected the Ollama embedder but **NEVER called `store.connect()`**. `QdrantVectorStoreEngine.isConnected()`
is just `this.client !== null` and the store is stateless until `connect()`. So `isConnected()` was permanently
false. The dispatcher routes `semantic_search`->`singleton.recall()` and `remember`->`singleton.remember()`,
both of which early-return "qdrant not connected". The populated collections were filled OUT-OF-BAND by curl
scripts (`populate-qdrant-memories/wiki.mjs`) + `SemanticAssetIndexEngine` — never via the MCP path.

**Three disjoint payload schemas live in the collections:** System-1 `{node_id}` (memories/wiki sidecars),
System-2 `{name,description,externalId}` (engines/skills/formulas via SemanticAssetIndex), System-3
`{text,kind,metadata}` (what QdrantMemoryEngine writes). `hitToItem` only read `payload.text` so even a
connected recall over the populated collections returned empty content.

**Fix (commit 9c0ab7885f on cad-fusion-live-ms0):**
- `QdrantMemoryEngine`: lazy `ensureConnected()` (gated to the DEFAULT store via `this.autoConnect = deps.store === undefined`
  so injected-store tests are untouched; reads `QDRANT_URL` env, default `http://localhost:6333`; fail-soft) +
  `readCollectionFor(kind)` maps canonical kinds -> the populated plural collections (engine->prism_engines,
  skill->prism_skills, formula->prism_formulas, wiki->prism_wiki, note->prism_memories) for the READ path only
  (writes stay on prism_memory_<kind> so forgetAll can't wipe live data) + payload-tolerant `hitToItem`
  (text || name+description || node_id).
- `QdrantMemoryEngineSingleton`: embed timeout 15s->30s + `keep_alive:"30m"`. A COLD nomic-embed-text load
  exceeded 15s on first call -> aborted -> recall-wide "embed failed" (the SECOND symptom after connect was fixed).
- `qdrant-health.mjs`: report `points_count` (authoritative) not `indexed_vectors_count` (returns 0 below the
  HNSW indexing_threshold even though points exist + are searchable) — the false-empty that made the small
  collections look un-populated and misled the diagnosis.

**Validated live** vs Qdrant+Ollama: all 5 collections return real semantic hits (Kienzle engine 0.73,
speed-feed skill 0.74, vault memory 0.73, wiki/tribal 0.71). 36 tests green.

**Lesson:** a "vector store is connected" abstraction whose `isConnected()` is `client != null` needs an
explicit `connect()` somewhere in the production bootstrap. The singleton was the natural place and it was
missed. Diagnostic tools that read `indexed_vectors_count` lie about small collections — use `points_count`.

Follow-on (NOT done): the WRITE path uses raw string ids (`engine/<key>`) which Qdrant rejects (needs uint64/UUID,
like SemanticAssetIndex.toQdrantId) — so `remember`/the embedders can't populate yet; only READ recall works.
And the codified-auto-enforcement build (replicate Hermes loop + enforce vault recall + Ollama offload) is
planned in `state/shared/specs/HERMES-VAULT-OLLAMA-ENFORCEMENT-PLAN-2026-06-13.md`.
Related: [[reference_qdrant_down_created_leftover_2026_06_08]] · [[feedback_obsidian_brain]] · [[reference_hermes_router_u1_2026_06_04]]
