# CROSS-SUBSTRATE-SYNERGY-BOUNDED — the honest decomposition of an unbounded goal

> **Milestone:** CROSS-SUBSTRATE-SYNERGY-MS0 · **Owner this pass:** slot:sierra (system-viz) · **Date:** 2026-06-03
> **Origin:** `/goal` — "leverage the RTX PRO 6000 Blackwell to maximize synergy across /system-viz + Obsidian + Hermes + PRISM-AI; map paths to every node and connect them to all logical combinations… synchronize the entire codebase to the atomic level."
> **Method:** `brainstorm-path-forward` 5-lens + synthesis workflow (run `wf_19e6d7e8-77b`, 2026-06-03).

## Why this ledger exists (R12 — reject the infinite framing)

The literal goal — "all-pairs cross-substrate closure + all 34 galaxies doc-synced to the atomic level" — is **non-terminating and unfalsifiable**:
- Transitive closure over the ~548MB system graph is O(V³); a dense N×N edge set is unreadable, un-versionable, OOMs the fleet, and rots on the next `regen-viz`.
- The fleet mutates the substrates (memories, wiki, engines, slots) faster than any one session can document them.

Claiming "done" against that framing would be a lie. So the bounded, falsifiable deliverable is: **a typed, ADD-only cross-substrate edge SPINE + one proven cross-edge type materialized the canonical (single-writer) way, plus this ledger handing the tail to the fleet.**

## What SHIPPED this session (verifiable)

| Unit | Artifact | Verify |
|------|----------|--------|
| **U-XSUB-EDGE-SCHEMA** | `scripts/lib/cross-substrate-edge-schema.mjs` — typed whitelist (`documented-by`, `owned-by-slot`, `embeds`, `consensus-of`) + `{source,confidence,addedBy,addedAt}` provenance + ADD-only `assertAddOnly()` (rejects deletions/untyped). | `node --test scripts/lib/cross-substrate-edge-schema.test.mjs` → **18/18** |
| **U-XSUB-CLOSURE-AUGMENTATION** | `scripts/generate-cross-substrate-edges.mjs` → `state/shared/system-viz/cross-substrate-edges-augmentation.json` — **48 `owned-by-slot` edges** (7 operator-canonical @conf 1.0 + 41 domain-group inference @conf 0.85), every edge schema-validated, both endpoints confirmed-existing (galaxy/domain node `eng.*` → slot node `ghost.chat_slot.*`). | `node scripts/generate-cross-substrate-edges.mjs --dry`; batch revalidate → allValid:true, 0 dupes |
| **U-XSUB-MERGE-WIRE** | `scripts/merge-augmentations.mjs` — added `loadOptional("cross-substrate-edges-augmentation.json")` + an ADD-only, deduped (from\|to\|type) splice block mirroring the `knowledgeGal` block; stamps `G.meta.crossSubstrateEdges`. | `node --check scripts/merge-augmentations.mjs` → SYNTAX OK. **Edges fold live on the next `regen-viz`** (NOT executed this session — see deferred). |
| **U-XSUB-DOCUMENTED-BY** (2026-06-03 follow-on) | Extended the generator with a 2nd typed edge pass — `documented-by` (graph-node → wiki/memory note = the system-viz↔Obsidian/Wiki synergy edge). Node-id namespaces CONFIRMED: `memory_<kind>.<slug>` (memories-atomic fold) + `wiki.<section>.<slug>` (wiki-entries fold). Two deterministic conventions: **B** galaxy → `memory_patterns.<galaxy>_synthesis` (1:1, all galaxies), **C** galaxy → resolvable `[[backlink]]` in its own MEMORY.md. **38 documented-by edges** (38 galaxy-synthesis@1.0 + 0 backlink — backlink wired, yields grow with wiki/memory node coverage). + intent-verifying test (`generate-cross-substrate-edges.test.mjs`, **6/6**, asserts NO-DANGLING + both conventions + owned-by-slot no-regression). 2-reviewer per-file scrutiny **PASS** (0 P0/P1). | `node scripts/generate-cross-substrate-edges.mjs` → `{owned-by-slot:82, documented-by:38}`, 120/120 unique; `node --test scripts/generate-cross-substrate-edges.test.mjs` → 6/6. Folds on next `regen-viz`. |

**Why `owned-by-slot` and not the brainstorm's `documented-by` (R7 — surface, don't blend):** both endpoints of `owned-by-slot` provably exist as graph nodes *today* (galaxy/domain node + slot node), so every edge is immediately traversable. `documented-by` needs knowledge-note nodes whose ids are not yet confirmed — deferred below.

## DEFERRED — the tail, with owners

### Sierra (system-viz) follow-ups
1. **Execute `regen-viz` to fold the 48 edges live.** GATED: `merge-augmentations.mjs` needs ~24GB heap on the ~548MB graph and can SIGKILL under host memory pressure (see [[reference_u_regen_viz_merge_faillod_2026_05_17]]) — do NOT run with multiple heavy peers online. Command: `node scripts/regen-viz.mjs --full`. Verify after: `G.meta.crossSubstrateEdges.added === 48` + edge count strictly increased.
2. **Register `generate-cross-substrate-edges.mjs` in `regen-viz.mjs FAST[]`** so the augmentation is re-produced each regen and never goes stale (the registration-gap class, [[reference_sierra_regen_fast_registration_gap_2026_05_29]]).
3. ~~**`documented-by` edges**~~ — **✅ SHIPPED 2026-06-03 (U-XSUB-DOCUMENTED-BY).** Namespaces confirmed (`memory_<kind>.<slug>` + `wiki.<section>.<slug>`, both folded live). 38 edges via galaxy→synthesis-memory (conv B, all galaxies). Convention C (galaxy MEMORY.md `[[backlinks]]`) is wired but yields 0 against today's curated 103-wiki+121-memory confirmed-node subset — it compounds (ADD-only) as those augmentations grow their per-note node coverage. **Next documented-by lift:** broaden the confirmed knowledge-note set (e.g. fold more `wiki-entries`/`memories-atomic` nodes, or add a `obsidian-vault` slug index) so convention C resolves; the resolver already handles bare + `section/slug` backlink forms.
4. **Galaxy-roost nodes for the 27 meta/infra galaxies** (system-viz, ai-training, academy, discovery, frontend-app, database-expansion, post-processor, speed-feed, quoting, blueprint-vision, fleet-hygiene, wiring, bug-hunting, backend-helper, dormant-data, compliance-safety, shop-floor, knowledge-conversion, corpus-aggregation, mit-curriculum, pdf-corpus(-mill), tribal-knowledge, cad-fusion-live, token-optimization, hermes-zulu, agent-orchestration). These galaxies have no `eng.<name>` domain-group node, so `owned-by-slot` was skipped. Emit `newNodes` galaxy-roosts first, then their `owned-by-slot` edges.
5. **U-XSUB-BLACKWELL-OFFLOAD** (token-optimization, parallel-safe). Route the system-viz model calls to local `qwen2.5-coder:32b` via the `home_blackwell` profile (already wired in `ModelRoutingEngine`, commit `d673f2866f`). Confirmed call sites: `scripts/generate-system-viz.mjs`, `scripts/build-node-embeddings.mjs`. Verify safety_critical still routes cloud (per `4199918e49`) + `ollama-offload-stats` delta + identical graph hash.

### Fleet hand-off
6. **`embeds` edges** (graph node → its embedding/index entry) — **india** (owns AI-training/embeddings) + sierra. 384-d ONNX + HNSW already exist; emit the node↔embedding edge so retrieval is graph-traversable.
7. **`consensus-of` edges** (decision node → octopus consensus ledger entry) — **bravo** (hermes) + **india**. GATED: the octopus needs ≥2 *distinct* models to add signal (N identical 32B answers add latency, not signal) — DEFER until a 2nd model is wired.
8. **Per-galaxy doc-sync** ("all docs/skills/hooks/souls/wikis/memories for all 34 galaxies reflect a finished build") — decompose to **one `/loop` unit per slot, one substrate-pair per galaxy**, NOT 34 concurrent (fleet-RAM). Each soul-owning slot runs `/galaxy-buildout-<slot>` + reflects its own substrate. Ownership table below.

### DEFERRED with reason (do NOT build)
- **GNN-edge consumption as ground truth** — tier-5 NN/GNN is AUROC ~0.5 DEGENERATE (constant-vote collapse, [[nn-graded-schema-read-fix]]). Cross-edges from it would poison ≥3 substrates. Any future GNN-sourced edge MUST carry `confidence ≤ 0.3` and never feed routing or S(x).
- **Dense N×N materialization** — un-versionable, OOMs the fleet, rots on regen. Reachability is a **query-time** operation (BFS today; personalized PageRank via HARVEST `agentdb_graph-pathfinder` if the operator activates it — see decisions).
- **Closure-as-dedup** ("prune redundant edges") — that is a deletion; `stop_on_content_deletion` / `leave-a-copy-behind-guard` correctly block it. Overlays are ADD-only.

## Operator-only decisions (Mark's call)

1. **Activate HARVEST `agentdb_graph-pathfinder`** (claude-flow) for query-time personalized-PageRank cross-substrate path ranking in `/connection-finder` + `/system-viz find`? (vs PRISM-native BFS.)
2. **Blackwell RSS ceiling** — what GB cap before fail-loud for local heavy graph compute on the 96GB card? (`fleet-memory-monitor` watches RSS; 96GB tempts unbounded.)
3. **india GNN ref-pool re-eval** — spend a slot on `U-NN-REFPOOL-REEVAL` now that this spine can produce real cross-edges as training signal (inverts the degenerate dependency)?
4. **Doc-sync concurrency** — 34 per-galaxy `/loop` units serialized, or N-at-a-time (fleet-RAM tradeoff)?

## Galaxy → owning-slot ownership map (source: MEMORY.md galaxy index)

The generator parses this live from the canonical MEMORY.md galaxy index (`[galaxy:X] … (slot:Y`). 34 galaxies; 7 currently have a confirmed `eng.<name>` domain node (`owned-by-slot` emitted at conf 1.0), the rest need galaxy-roost nodes (deferred #4). Authoritative per-galaxy detail: `mcp-server/src/engines/<galaxy>/MEMORY.md` `slot:` tag + `state/shared/system-viz/cross-substrate-edges-augmentation.json` `stats.skippedDetail`.

---
_Compounding map (re-runnable, not one-shot): regenerate the edge artifact with `node scripts/generate-cross-substrate-edges.mjs`. Schema is the contract for every future cross-substrate edge type._
