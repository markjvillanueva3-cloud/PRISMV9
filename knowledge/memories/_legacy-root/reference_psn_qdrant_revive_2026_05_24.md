---
source: prism-memory
synced: 2026-06-27T20:30:47.134Z
aliases: reference_psn_qdrant_revive_2026_05_24
---

# reference_psn_qdrant_revive_2026_05_24

**Unit:** U-PSN-QDRANT-REVIVE-2026-05-24
**Date:** 2026-05-24 (probed 2026-05-25T03:09:38Z)
**Slot:** implementation-specialist task (branch: cad-fusion-live-ms0)
**Layer:** Brij "AI Infrastructure Master Tree" — Layer 03 Vector-DB gap

---

## Live diagnostic findings (qdrant-health.mjs --json)

```json
{
  "reachable": true,
  "version": null,
  "collections": ["prism_engines", "prism_formulas", "prism_skills"],
  "collectionStats": {
    "prism_engines":  { "vectorCount": 0, "status": "grey" },
    "prism_formulas": { "vectorCount": 0, "status": "grey" },
    "prism_skills":   { "vectorCount": 0, "status": "grey" }
  },
  "probedAt": "2026-05-25T03:09:38.844Z"
}
```

**Interpretation:**
- Qdrant IS reachable at `http://localhost:6333` — the "offline" session banners were misleading (likely from `ollama-docker-health.mjs` which probes `/` not `/healthz`, and Qdrant's root returns a redirect that curl with `-f` treats as failure).
- Version: `null` — `/healthz` returned something curl parsed but not as `{"version":"..."}` JSON. The container is running but the version endpoint behaviour differs from the expected JSON shape. Qdrant 1.7+ returns plain-text on `/healthz`; version is on `/` root.
- 3 collections exist: `prism_engines`, `prism_formulas`, `prism_skills` — all `status: "grey"` (Qdrant "grey" = collection exists but has 0 indexed vectors; not yet populated).
- **Action needed:** populate the 3 collections via the embedding pipeline, not a container restart.

---

## Recovery steps (for the "offline" banner case)

If Qdrant is genuinely down (ECONNREFUSED on `/healthz`):

```bash
# Step 1: diagnose
node H:/prism/scripts/qdrant-health.mjs

# Step 2: dry-run revival plan
node H:/prism/scripts/qdrant-revive.mjs --dry-run

# Step 3: execute
node H:/prism/scripts/qdrant-revive.mjs
```

The revive script handles all three cases automatically:
- Already running → no-op (returns `action: "already-running"`)
- Container stopped → `docker start qdrant`
- Container absent → `docker run -d --name qdrant -p 6333:6333 -p 6334:6334 -v H:/prism/state/qdrant-data:/qdrant/storage --restart unless-stopped qdrant/qdrant:latest`

---

## Qdrant ↔ PSN integration map

| PSN leg | Expected collection | Current state | Gap |
|---|---|---|---|
| Leg 3 — Wiki | `prism-wiki` | absent | needs embedding ingest from `knowledge/wiki/` |
| Leg 4 — Memories | `prism-memories` | absent | needs embedding ingest from `knowledge/memories/` |
| Leg 5 — Tribal | `prism-tribal` | absent | `tribal-embed-index.json` is JSON-backed fallback; Qdrant copy needs ingest |
| Leg 7 — Engines | `prism_engines` | present, 0 vectors, grey | needs `QdrantMemoryEngine` populate pass |
| Leg 9 — Formulas | `prism_formulas` | present, 0 vectors, grey | needs formula embedding ingest |
| Leg 10 — NN/GNN | `prism-nn-embeddings` | absent | `graph-node-embedding-bridge.mjs` writes 768d JSONL; needs Qdrant ingest |
| Leg 11 — PRISM AI / Skills | `prism_skills` | present, 0 vectors, grey | needs skill-catalog embedding ingest |

**Root cause of hybrid-retrieval block:** collections exist but are empty. `rag_rerank` calls against Qdrant return 0 hits — BM25 tier carries all retrieval load. The dense layer is structurally wired but not populated.

**Next unit after this one:** `U-PSN-QDRANT-POPULATE` — run the embedding ingest pass for `prism_engines`, `prism_formulas`, `prism_skills` collections using `QdrantMemoryEngine` + the 768d node embeddings from `state/shared/nn-graph/node-embeddings-768d.jsonl`.

---

## Deliverables shipped

| File | Purpose |
|---|---|
| `H:/prism/scripts/qdrant-health.mjs` | Diagnose Qdrant state; probes `/healthz` + `/collections` via curl subprocess |
| `H:/prism/scripts/qdrant-revive.mjs` | Operator-runnable revival; handles start/create/poll; `--dry-run` safe |
| `H:/prism/scripts/qdrant-health.test.mjs` | 14/14 tests (node:test) |
| `H:/prism/scripts/qdrant-revive.test.mjs` | 18/18 tests (node:test) |
| `H:/prism/.claude/commands/qdrant-revive.md` | `/qdrant-revive` skill |
| This file | Close-out memo with live findings |

**Test result:** 32/32 PASS (14 health + 18 revive).

---

## Why ollama-docker-health.mjs showed Qdrant as down

`ollama-docker-health.mjs::probeQdrant()` probes `http://127.0.0.1:6333/` (root URL) with `curl -fsS`. Qdrant's root endpoint returns a redirect or HTML page on some versions — curl with `-f` (fail-on-error) treats non-2xx as failure. The new `qdrant-health.mjs` probes `/healthz` which returns 200 on a healthy instance. This explains the chronic "Qdrant OFFLINE" banner even when the container was actually running.

**Fix recommendation:** update `ollama-docker-health.mjs::probeQdrant` to probe `/healthz` instead of `/` (one-line change, out of scope for this unit).

---

## Cross-refs

- Skill: `H:/prism/.claude/commands/qdrant-revive.md`
- Health script: `H:/prism/scripts/qdrant-health.mjs`
- Revival script: `H:/prism/scripts/qdrant-revive.mjs`
- RAG synergy spec: `H:/prism/state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md`
- Broader health probe: `H:/prism/scripts/ollama-docker-health.mjs` (fix: probe `/healthz` not `/`)
- GNN embedding bridge: `H:/prism/scripts/lib/graph-node-embedding-bridge.mjs`
- Wiki: `knowledge/wiki/architecture/` (target for `prism-wiki` collection ingest)
