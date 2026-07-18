# HERMES-MEMORY-VAULT — deep research (2026-05-23)

**Author:** claude-ea80ce2f slot bravo
**Source:** Simback's "Hermes Agent Memory Guidebook" (https://x.com/KSimback/status/2058262328496554021) + first-principles audit of Obsidian (2025+) / Qdrant (1.10+) / Hermes Agent ecosystem (2026-04 Atlas release) vs PRISM PSN.
**Status:** advisory only — every promotion is operator-gated; nothing in this research auto-mutates wiki/memory/CLAUDE.md.
**Companion envelope:** `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json` (11 units, U-HMEMV01..11).

---

## 0. Goal restated

> "Add all gaps to unit/task queue. Do deep research on other functionalities of obsidian, qdrant, and most importantly hermes agents | plan for synergizing with PSN and Prism App."

Two clauses. This document covers clause 2 (deep research + PSN/PrismApp synergy plan). Clause 1 is satisfied by `HERMES-MEMORY-VAULT-MS0.json` (11 units already enqueued).

The 11 units derive from a 7×11 gap matrix: 7 functional gaps PRISM has versus Simback's Hermes Memory Guidebook + 4 deeper synergies with Obsidian/Qdrant/Hermes that the Guidebook does not name (Obsidian Bases, Dataview-runtime queries, Qdrant filtered-hybrid + quantization, Hermes-MemoryProvider ABC compliance).

---

## 1. What Simback's Hermes Memory Guidebook actually says (2026-05-23 article)

Three-layer reference architecture for an LLM agent's memory:

| Layer | Hermes today | PRISM today | Verdict |
|-------|-------------|-------------|---------|
| L1 — native | `MEMORY.md` + `USER.md` + `~/.hermes/memory.db` (SQLite) per session | Per-chat handoff + slot-soul + chat-slots.json + 5-namespace knowledge vault | **PRISM exceeds** (multi-namespace, multi-chat, fleet-aware) |
| L2 — MemoryProvider plug-ins | 8 official ABC implementations: ChromaDB, Mem0, Qdrant, pgvector, Pinecone, Weaviate, Mnemosyne, Cognee | PRISM has a master-index over `system-graph.json` + BM25-lite hand-rolled scoring + ONNX rerank | **Hermes wins on plurality**; PRISM wins on tighter audit chain |
| L3 — community plug-ins | yantrikdb (explainable retrieval), GBrain (dream cycles), Hindsight (reflect-on-memory), FlowState-QMD (predictive warmup) | Tribal corpus + wiki + Obsidian feed + system-viz | **Hermes wins on memory-specific techniques**; PRISM wins on cross-domain breadth |

PRISM **exceeds** Hermes on 7 axes the Guidebook explicitly compares (doctrine surface, project-lifetime wiki, system-viz brain, multi-chat fleet, PSN architecture, multi-vendor AI router, closed-loop learning). PRISM **lags** on 7 memory-specific axes the Guidebook treats as frontier:

1. **Tiered consolidation** (Mnemosyne pattern) — auto-promote working → episodic → long-term. PRISM today: manual feedback → reference → wiki.
2. **Explainable retrieval** (yantrikdb pattern) — every hit carries a "why" trace. PRISM today: rank + score, no per-component breakdown.
3. **Temporal recall** (Mnemosyne standout feature) — "what did I believe at time T?". PRISM today: `git show <ref>:<path>` is manual + per-file.
4. **Dream cycle** (GBrain pattern) — overnight synthesis pass. PRISM today: close-out audit detects shipped-but-pending; no contradiction synthesis.
5. **Memory router intercept** (Mem0 pattern) — every LLM dispatch is automatically pre-seeded with relevant memory. PRISM today: UserPromptSubmit only.
6. **Reflect-on-own-memory** (Hindsight pattern) — engine periodically reasons over its own memory store. PRISM today: no scheduled introspection.
7. **Predictive warmup** (FlowState-QMD pattern) — pre-load likely-next memory hits into the index cache. PRISM today: stale-ness check + Qdrant pre-warm, no predictive hit-prefetch.

Closing these is the U-HMEMV01..07 set in the milestone envelope.

---

## 2. Obsidian — capabilities PRISM does NOT yet exploit

PRISM already feeds Obsidian via `stop-obsidian-memory-feed.mjs` (the brain auto-propagates). What it does NOT exploit:

### 2.1 Bases (Obsidian 1.9+, 2025 feature)
Database-style **frontmatter-pivoted views** over a vault. A `.base` file declares which folder + which frontmatter fields to surface, plus filters/group-bys. PRISM wiki+memory already use frontmatter (`name`, `description`, `type`, `tags`, `metadata.type`). Three pivots immediately useful:

- **memory-by-type** — group `knowledge/memories/**` by `metadata.type` (feedback / reference / project / user); operator gets a sortable table of every memory in the vault.
- **wiki-by-domain** — group `knowledge/wiki/**` by folder + `tags`; surfaces which architecture pages exist per PSN leg without leaving Obsidian.
- **shipped-skills-by-slot** — group `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-*.md` by author slot; operator can see "what has slot bravo shipped this week" instantly.

Unit: **U-HMEMV08** — ≤3 `.base` files committed. ~50 LOC of base config. Operator runs Obsidian on the vault and the views are live; no code path runs in PRISM. Pure surface win.

### 2.2 Dataview (community plug-in, 2020+)
Runtime queries written in markdown. Already widely deployed in the Obsidian community. PRISM's frontmatter conventions are query-ready out of the box. Four queries immediately useful:

- shipped-this-week by slot (joins commit log + slot souls)
- deferred close-outs (filters `CLOSE-OUT-DEFERRED.md` rows by age)
- memory-by-promotion-readiness (ranks memory files by reference-count + age — feeds U-HMEMV01)
- wiki-orphans (wiki entries with no `[[backlink]]` from any memory)

Unit: **U-HMEMV11** — ≥4 query snippets + README. ~150 lines of markdown. Operator copy-pastes into their daily-note.

### 2.3 Canvas / Excalidraw — out of scope for this MS
PRISM has system-viz for spatial reasoning; Canvas/Excalidraw would compete, not synergize. Defer.

### 2.4 Smart Connections / Templater / Plugin-API — adjacent
Smart Connections (semantic backlinks) overlaps with master-index hits — defer to a later MS.
Templater (templating) is fine but PRISM auto-memory files already follow a strict template — no leverage.
The Obsidian plug-in API would let us ship a PRISM plug-in that surfaces `prism_session:master_index_query` results inline; valuable but a separate MS.

---

## 3. Qdrant — capabilities PRISM does NOT yet exploit

PRISM has the Qdrant docker-compose already in `INTEL-OLLAMA-OBSIDIAN-MS0/P13-U02` (commit `52f0d51022`). What it does NOT exploit:

### 3.1 HNSW + per-vector filter (Qdrant's flagship trick)
PRISM today: brute-force cosine over `tribal-embed-index.json` (3919 tips) and `wiki/embed-index.json`. Acceptable today; will degrade past ~10K entries. Qdrant collapses search to log(N) **and** allows filtering by payload field (per-leg, per-domain) WITHOUT post-filtering, so recall stays at top-K.

PRISM win: tribal-by-slot-domain inject (`tribal-by-domain-inject.mjs`) currently bumps the matching domain's hits inside brute-force; with Qdrant payload filter the same query becomes `filter: {must:[{key:"domain", match:{value:"lathe"}}]}` and returns ONLY lathe tips in one network round-trip. Cleaner, faster, no post-filter.

### 3.2 Sparse + dense hybrid retrieval
PRISM's BM25-lite + ONNX-rerank pattern is already a manual sparse+dense hybrid. Qdrant's `prefetch` API does it natively with a single query — sparse retrieves K1 candidates, dense reranks down to K2, and you get a fused score back. Replaces the hand-rolled blend in `master-index-search-lib.mjs`.

### 3.3 Scalar + binary quantization
At 384-dim float32, PRISM's embeddings are 1.5KB each. Binary quantization (Qdrant 1.5+) drops them to 48 bytes (32×) with ~1-2% recall loss. For a 100K-entry index that's 150MB → 4.7MB. Lets the entire PSN corpus live in RAM with room to spare.

### 3.4 Snapshots + persistent collections
PRISM today: JSON indexes rebuilt from source every Stop hook. Qdrant collections snapshot + restart-resumable — index lifetime decouples from the Node process lifetime.

Unit: **U-HMEMV09** — Qdrant migration. ~250 LOC + migration script. **MUST preserve the brute-force `reRankerEngine` fallback path** — Qdrant network failure cannot brick the master-index. Wired as the primary backend with brute-force as the R12 fail-soft.

### 3.5 Out-of-scope today
- Multi-vector named collections (Qdrant 1.10) — useful for joint text+image but PRISM has no images in the vault yet.
- Geo filters — irrelevant.
- Recommendation API — overlaps with `aiSystemRouterEngine`.

---

## 4. Hermes Agents — ecosystem details not in the Guidebook

The Guidebook covers L1/L2/L3 conceptually. The Hermes ecosystem has more concrete surfaces worth naming:

### 4.1 MemoryProvider ABC (Hermes 4.2+, 2026-04)
A formal abstract base class with 4 methods: `search(query, k) → hits[]`, `store(key, value, metadata) → void`, `forget(key) → void`, `list(filter) → entries[]`. Any provider that implements the ABC plugs into a Hermes agent's L2 slot. The 8 official providers (ChromaDB, Mem0, Qdrant, pgvector, Pinecone, Weaviate, Mnemosyne, Cognee) all conform.

**Synergy with PRISM:** if PRISM PSN exposes a MemoryProvider-shaped facade, every Hermes-native agent in a customer's stack can use PRISM as their L2 backend without any bridging code. PRISM keeps the audit chain + multi-namespace + system-viz; the Hermes agent gets richer memory than any official provider.

Unit: **U-HMEMV10** — ~200 LOC wrapping `master_index_query` + `memory_store` + `memory_forget` (already exists) + `memory_list`. Contract-only test if no Hermes harness available locally.

### 4.2 agentskills.io community registry
Hermes 4.x ships a CLI that pulls "skill recipes" from `agentskills.io`. Skill = bundle of (system prompt + tool subset + memory provider config). PRISM's skill surface (174 commands in `.claude/commands/`) is conceptually similar. Out of scope for this MS but valuable to know for future Hermes-skill ↔ PRISM-skill bridging.

### 4.3 Hermes Atlas (2026-04 release)
Atlas is Hermes's commercial dashboard for fleet monitoring of agent runs. PRISM's `/system-viz` is the analog. Out of scope — keep `/system-viz` canonical, no Atlas adoption.

### 4.4 What we ALREADY exceed Hermes on (audit trail)
- **Multi-namespace knowledge vault** (5 namespaces: memory / wiki / commands / handoffs / specs). Hermes has 1 (MEMORY.md).
- **Multi-chat fleet** (26 NATO slots, slot souls, terminal-pin, auto-resume across /compact). Hermes is single-session.
- **PSN 11-leg integration**. Hermes has L1+L2+L3 only.
- **Tribal corpus + wiki + system-viz + closed-loop learning** — Hermes has no analog.

The 11-unit milestone closes the 7 gaps + adds 4 synergies — afterward PRISM exceeds Hermes on every axis the Guidebook names.

---

## 5. PSN + PrismApp synergy plan (the connective tissue)

Each milestone unit lands on ≥1 PSN leg. The synergy axes from the envelope:

| Unit | PSN legs touched | Why |
|------|-----------------|-----|
| U-HMEMV01 (tiered consolidation) | L3 wiki, L4 memory | Auto-promote feedback → reference → wiki entry candidate |
| U-HMEMV02 (explainable retrieval) | L3 wiki, L4 memory | Every master-index hit carries a "why" trace operators can audit |
| U-HMEMV03 (temporal recall) | L4 memory | Point-in-time over memory dir + wiki via git log |
| U-HMEMV04 (dream cycle) | L3 wiki, L4 memory, L5 tribal | Synthesizes contradictions across all three corpora |
| U-HMEMV05 (memory router intercept) | L4 memory, L11 PRISM-AI | Every routed LLM dispatch pre-seeded with relevant memory |
| U-HMEMV06 (reflect-on-own-memory) | L6 sysviz, L11 PRISM-AI | `prismCreativeReasoningEngine.reflect(memoryStore)` weekly synthesis |
| U-HMEMV07 (predictive warmup) | L4 memory | Pre-loads next likely hits based on session activity |
| U-HMEMV08 (Obsidian Bases) | L1 Obsidian-brain, L3 wiki, L4 memory | Frontmatter-pivoted DB views over vault |
| U-HMEMV09 (Qdrant migration) | L5 tribal, L10 NN-GNN, L4 memory | Scale beyond 10K entries with filtered hybrid retrieval |
| U-HMEMV10 (Hermes-MemoryProvider compliance) | L4 memory, L11 PRISM-AI | Externalizes PSN as a Hermes L2 plug-in |
| U-HMEMV11 (Dataview queries) | L1 Obsidian-brain, L3 wiki | Operator-callable queries from inside Obsidian |

### PrismApp angle
PrismApp is the eventual customer-facing surface (web/desktop). The relevant synergies:

- **U-HMEMV02 (explainable retrieval)** — explainability is a PrismApp UX win when an operator asks "why did you recommend this speed/feed?". The same explanation lib feeds both master-index hits AND speed/feed reasoning traces.
- **U-HMEMV03 (temporal recall)** — PrismApp will need "what did the shop think about this part 6 months ago?" — same engine as PSN's point-in-time recall.
- **U-HMEMV05 (memory router intercept)** — every PrismApp LLM call should auto-receive relevant memory; the router extension is shared with PSN's PRISM-AI dispatcher.
- **U-HMEMV08 + U-HMEMV11 (Obsidian)** — a customer running PrismApp+Obsidian sees the same Bases/Dataview views as the PRISM development fleet; doctrine continuity.
- **U-HMEMV09 (Qdrant)** — required to scale beyond a single-shop deployment. JM-Die's 76K tribal artifacts + customer-specific memories pushes past brute-force feasibility.

The pipeline `customer_request → PrismApp UI → MCP dispatcher → PSN memory hit (with explanation) → engine recommendation (with trace) → operator-approved action` becomes trustworthy because every retrieval step carries a why-trace and every memory query is automatic.

---

## 6. Safety + advisory posture

All 11 units obey the global PRISM doctrine:

- **Never delete only disable** — every existing path stays live as a fallback (R12).
- **Operator-gated promote** — nothing auto-mutates wiki/memory/CLAUDE.md; every consolidation, every Qdrant migration, every dream-cycle synthesis emits a candidates report under `state/shared/{dream-cycle,memory-promotion-candidates,qdrant-migration}/` for operator review.
- **mustHumanVerify** — the milestone envelope carries `mustHumanVerify:true`; per-unit reports inherit the flag.
- **No public H: drive** — all artifacts internal; nothing ships to a public endpoint.
- **R7 surface conflicts** — Qdrant migration NEVER silently swaps the master-index backend; brute-force remains a default-on fallback path.
- **R12 fail-loud** — Qdrant network failure → log + degrade to brute-force; never silent success on stale data.

---

## 7. Sequencing + scope discipline

```
P0 (must ship to call MS complete): U-HMEMV01, U-HMEMV02
P1 (compounds with P0):              U-HMEMV03, U-HMEMV04, U-HMEMV05, U-HMEMV08, U-HMEMV09
P2 (extensions on top):              U-HMEMV06, U-HMEMV07, U-HMEMV10, U-HMEMV11
```

Dependency chain (from envelope):
```
U-HMEMV01 → U-HMEMV04 (dream cycle uses promotion signal)
U-HMEMV01 → U-HMEMV07 (warmup uses promotion-readiness ranking)
U-HMEMV09 → U-HMEMV07 (warmup pre-loads into Qdrant cache)
U-HMEMV08 → U-HMEMV11 (Dataview queries pivot on Bases-defined frontmatter)
U-HMEMV05 + U-HMEMV09 → U-HMEMV10 (MemoryProvider compliance needs router + Qdrant)
```

Build order: 01 → 02 → 03 → 05 → 08 → 11 → 09 → 04 → 07 → 06 → 10. Each unit ~50-250 LOC + tests. Total milestone envelope LOC: ~1.55K.

---

## 8. Out-of-scope (defer to future MS)

- Smart Connections plug-in integration (overlaps master-index)
- Hermes Atlas dashboard adoption (`/system-viz` stays canonical)
- agentskills.io ↔ PRISM-skills bridge
- Obsidian Canvas/Excalidraw spatial views (system-viz holds this turf)
- Multi-vector Qdrant collections (text+image — no images yet)
- pgvector / Pinecone / Weaviate as additional L2 providers (Qdrant is enough for the next 10×)

---

## 9. Verification + scrutiny

Each unit ships with:
- Pure-core lib + injected-readers pattern (no Node fs in pure tests)
- ≥3-6 spanning tests per unit
- Stop-hook driver where the unit emits advisory
- Wiki entry under `knowledge/wiki/architecture/<unit-slug>.md` (pointer + ≤120 lines)
- Memory file under `knowledge/memories/reference/reference_<unit-slug>_2026-MM-DD.md`
- Per-file scrutiny gate (2 parallel reviewers per file in multi-file commits)
- End-of-task 3-of-3 scrutiny gate (Claude reviewer A + B + code-analyzer C)

---

## 10. References

- Simback's article: https://x.com/KSimback/status/2058262328496554021 (2026-05-23)
- Companion envelope: `mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json`
- Sibling specs:
  - `state/shared/specs/HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md` (HRP set, shipped this session)
  - `state/shared/specs/HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md` (HOC set, shipped this session)
  - `state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` (peer foxtrot, 2026-05-20)
  - `state/shared/specs/HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md` (peer foxtrot, 2026-05-17)
  - `state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md` (peer foxtrot, 2026-05-20)
- INTEL-OLLAMA-OBSIDIAN-MS0/P13-U02 (Qdrant docker-compose, peer kilo, 2026-05-20)
- Memory doctrine: `feedback_psn_definition.md`, `feedback_obsidian_brain.md`, `feedback_auto_memory_feeds_obsidian_stophook.md`

---

## 11. Advisory footer

All 11 units are operator-reviewable + operator-gated. Nothing in this milestone mutates live wiki / memory / CLAUDE.md without operator action. `mustHumanVerify: true` is set on the envelope. Build-order respects PSN-leg load-balancing across slots — no single slot should claim the entire MS.
