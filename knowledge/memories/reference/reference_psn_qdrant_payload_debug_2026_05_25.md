---
name: reference-psn-qdrant-payload-debug-2026-05-25
description: 2026-05-25 sierra iter 19 — closes iter-18 follow-up U-PSN-QDRANT-PAYLOAD-DEBUG. Probe revealed pre-iter-17 Qdrant engine vectors use {externalId, name, sourceFile, kind} payload shape while my iter-17 populate writes {node_id}. Fix: pickQdrantPayloadId() priority chain handles both. Vector hits in /hybrid now surface as 'engine:EmbeddingGuardEngine' instead of FNV-1a hashes. 50/50 tests.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-27T20:30:47.134Z
aliases: reference_psn_qdrant_payload_debug_2026_05_25
---


## Root cause

`prism_engines` collection holds two payload shapes from two different ingest passes:

| ingest pass | count | payload shape |
|---|---|---|
| iter-17 (my `populate-qdrant.mjs`) | 1,669 | `{node_id: "node-slug-x"}` |
| pre-iter-17 (some earlier agent/script) | 2,197 | `{kind, name, description, tags, sourceFile, externalId}` — e.g. `name:"BayesianInferenceEngine"`, `externalId:"engine:BayesianInferenceEngine"` |

`/points/search` returns whichever payload was written. My iter-18 `defaultQdrantSearch` only checked `payload.node_id` → fell back to `String(point.id)` (the FNV-1a hash) for every pre-iter-17 hit. Diagnosis: direct probe at `.cache/probe-qdrant-payload.mjs` (16 LOC, throwaway).

## Fix

New export `pickQdrantPayloadId(point)` with a priority chain:
1. `payload.externalId` — most canonical (e.g. `engine:Foo`)
2. `payload.node_id` — iter-17 populate shape
3. `payload.name` — bare class name
4. `payload.sourceFile` — file fallback
5. `String(point.id)` — final hash fallback

`defaultQdrantSearch` delegates to `pickQdrantPayloadId`. 6 new tests cover both shapes + null safety + all 4 chain branches.

## Live verification

Same query as iter-18, now with semantic ids:

```
$ node scripts/prism-hybrid.mjs --query "qdrant populate vector embedding" --top-k 8
   3. [0.0164] engine:EmbeddingGuardEngine     (vector@1)   ← was 859955256
   6. [0.0161] engine:LocalEmbeddingEngine     (vector@2)   ← was 89130010
```

The vector substrate is now picking semantically-perfect engines (EmbeddingGuard + LocalEmbedding for an embedding-related query). Hybrid retrieval output is now operator-readable.

## Test count

50/50 (was 44/44 in iter 18; +6 new):
- `pickQdrantPayloadId: prefers externalId`
- `pickQdrantPayloadId: falls back to node_id (iter-17 populate shape)`
- `pickQdrantPayloadId: falls back to name then sourceFile`
- `pickQdrantPayloadId: final fallback to numeric point id as string`
- `pickQdrantPayloadId: handles null/undefined safely`
- `defaultQdrantSearch: pre-iter-17 engine shape (externalId + name)`

## R12 disclosures

- Throwaway probe script `.cache/probe-qdrant-payload.mjs` left in working tree (not committed; .cache/ is operator workspace).
- The 2-shape situation in `prism_engines` is operationally fine because both shapes route to the same canonical engine via the resolver, but future ingest passes should standardize on `externalId` (more canonical than `node_id`).
- iter-18's CLI output sample in `reference_psn_hybrid_retrieval_wire_2026_05_25.md` is now slightly stale — vector ids in that memo are pre-fix; the lib + tests are the source of truth.

## Closes

`PSN-ENHANCE-MS0::U-PSN-QDRANT-PAYLOAD-DEBUG-2026-05-25` — closes iter-18 R12 follow-up. Hybrid retrieval output is now operator-readable end-to-end across all 4 substrates.

## Cross-refs

- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the lib + CLI this fix lives in)
- [[reference_psn_qdrant_populate_2026_05_25]] — iter 17 (the populate pass that surfaced the shape mismatch)
