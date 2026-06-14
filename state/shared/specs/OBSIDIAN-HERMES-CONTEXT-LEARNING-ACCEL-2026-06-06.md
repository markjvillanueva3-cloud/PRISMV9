# Accelerating Obsidian/Hermes Context Learning — Ranked Lever Synthesis (2026-06-06)

> **Goal (operator /goal, slot:papa):** utilize the Obsidian vault / `/system-viz` / PRISM OS + Obsidian brain / PRISM AI + ultracode + `/hermes-workflow` + `/forge-audit-v2` to **find ways to accelerate Obsidian/Hermes context learning**, drawing on bravo's deep-research corpus (the articles on memories, Obsidian, Hermes).
>
> **Method:** a `/hermes-workflow` dynamic Workflow (`wf_e7d322cf-d73`, **11 agents / 1.8M subagent tokens / 5/5 clusters adversarially verified**). 5 research clusters covering 16 core docs of bravo's corpus → **Mine** (full reads → candidate levers) → **Ground** (adversarially refute each vs the live H:/prism repo: shipped? claimed? gap measured?) → **Synthesize** (dedup, dependency-order, rank by impact × novelty × papa-buildability).
>
> **Substrate of truth:** grounded against `PSN-SYNERGY-GAP-AUDIT-2026-06-03.md` (9 already-owner-assigned bridges), `HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md`, PSN-OCTOPUS-FLEET-SYNERGY-MS0, CROSS-SUBSTRATE-SYNERGY-MS0, CHEAP-NODE-ACCESS-MS0, and live metric files — so it surfaces ONLY novel, unclaimed, backend connective-tissue levers.

---

## 0. Bottom line

**The compounding-learning win is connective tissue, not new engines.** Build order for papa: **L5 source-chain propagation → PSN-attribution ledger → compaction-memo emitter → cron-revival harness.** The first two compound (leg-stamped hits make attribution trivial). All four were verified-absent on disk, gap-real, and collision-free against every claimed bridge.

### A. Independent grounding find (papa, this session) — the offline compounding loop is DARK
PRISM's offline knowledge-compounding tasks are **not running** — the single highest-certainty throttle confirmable right now:

| Mechanism | State | Evidence |
|---|---|---|
| `PRISM Hermes Dream-Cycle Synth` (nightly 03:17 — synthesizes the day's memories into higher-order insight) | **MISSING** (task unregistered) | `knowledge/memories/dreams/` holds only `2026-06-04.md` → ~2 nights dark (today 06-06); installer `install-hermes-dream-cycle-task.ps1` on disk; engine `hermes-dream-cycle-synth` L6/built |
| `PRISM Hermes Self-Reflect Weekly` | **MISSING** | installer `install-hermes-self-reflect-task.ps1` on disk; engine `hermes-self-reflect-populater` L6/built |
| `PRISM Hermes-Obsidian Bridge` | **disabled** | fleet-task-health WARN (intentional-disable cause unknown — not touched without operator) |

**Operator action (needs elevation — run via `!`):**
```
! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-hermes-dream-cycle-task.ps1 -RunNow
! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-hermes-self-reflect-task.ps1 -RunNow
```
`-RunNow` fires them immediately → a fresh dream + self-reflect synthesis right away. This is also exactly what lever **#4 (cron-revival harness)** automates durably.

---

## 1. Top papa-buildable levers (ranked, dependency-ordered)

Only NOVEL + papa_buildable + gap_real=yes, deduped across all 5 clusters. Verified-absent on disk this session.

| rank | lever | learning_axis | impact | why-papa-not-a-specialist | minimal-build | effort |
|---|---|---|---|---|---|---|
| **1** | **Source-chain propagation on live retrieval hits (L5)** | retrieval provenance | **HIGH** | `SourceChainEngine` SHIPPED + dispatcher-wired but `grep sourceChain` in inject hooks = **0**. Wiring an existing engine into the hit path = connective tissue. Not india #1/#3 (recall caching), not alpha (NN backfill). | decorate `master_index_query`/`memory_search` hits + render in the precheck-inject hooks. No new engine. | S |
| **2** | **PSN-leg-attribution ledger** (`prism_session:psn_attribution`) | which-leg-consulted per retrieval | **HIGH** | Named "(planned)" in HERMES-PSN-RAG §9.3; `grep psn_attribution` = unrelated CAD only. Measures the 0.8% "did knowledge get used?" blindness. india owns recall *caching*, golf *outcome-capture*; neither logs retrieval-leg. | `scripts/lib/psn-attribution-lib.mjs` (`recordLegConsult` → `state/shared/psn-attribution.jsonl`) + read action. | M |
| **3** | **Compaction→memo emitter** (auto session-reference memo on /compact) | episodic memory capture | **HIGH** | `precompact-handoff.mjs` writes only a handoff. Reuses the wired `stop-obsidian-memory-feed.mjs` ingestion path — zero new dispatcher. No specialist owns the PreCompact memo cadence. | `.claude/hooks/precompact-memo-emit.mjs` → `reference_session_<slot>_<date>.md`. | S |
| **4** | **Cron-revival + run-instrumentation harness** | continuous-learning lifecycle | **HIGH** | MEASURED dead: 5 workflow engines SHIPPED but **0 registered tasks**, cron jsonls frozen May 16-17, `generated/` absent. No specialist owns workflow-cron lifecycle. Revives §A + B1/B3/B4/B5/B6. | `scripts/cron/install-obsidian-workflow-crons.ps1` (×5 idempotent) + `workflow-run-monitor.mjs` → `prism_dev:obsidian_workflow_health` + SessionStart advisory. | M |
| **5** | **Context-utilization telemetry** (injected tokens never referenced) | inject-efficiency calibration | **MED-HIGH** | `scripts/context-utilization-audit.mjs` absent. PRISM has no measurement of injected tokens never referenced downstream. Transcript-walk = papa's measurement lane; no bridge covers it. | walk recent `*.jsonl`, diff inject block vs next assistant turn → `wasted_inject_pct` history. | M |
| **6** | **Memo frontmatter schema + write-time validation gate (A4)** | memo queryability | **MED-HIGH** | `validate-command-frontmatter.mjs` pattern PROVEN but never cloned to the memory namespace — literal R15 all-galaxies gap. Unblocks #9 + #2's usage signal. | `scripts/validate-memo-frontmatter.mjs` + PreToolUse:Write advisory on `memory/*.md`. | S-M |
| **7** | **Incremental backlinks sidecar (B3)** (who-references-this-memo) | navigable memo-link graph | **MED** | `extractLinkedSlugs` exists in `connection-finder.mjs` but NO persistent reverse-index. alpha owns *embedding-space* NN backfill — orthogonal to a cheap exact `[[link]]` reverse index. | `scripts/build-memory-backlinks.mjs` → `state/shared/memory-backlinks.json` + PostToolUse:Write patch + `prism_memory:backlinks`. | M |
| **8** | **relevance×recency×usage retrieval ranking (E3)** | inject ranking quality | **MED** | Zero recency/usage weighting in all 4 precheck-inject hooks. BM25×recency ships standalone; ×usage folds in after #2. No india-router collision (pre-dispatch router ≠ precheck-inject ranker). | `scripts/lib/memo-rank.mjs` imported by `memory-index-precheck-inject.mjs`. | M |
| **9** | **slot-scoped memo subscription filter (E4)** | per-chat relevance | **MED-LOW** | NOVEL, HARD-GATED on #6 (needs `slot` frontmatter). ~20-line downrank once memos carry slot. | filter in `memory-index-precheck-inject.mjs`. | S (post-#6) |
| **10** | **cross-chat logical-dup memo flagging (D2)** (wire LSHDedupEngine) | write-time dedup across 26 chats | **MED-LOW** | `LSHDedupEngine` SHIPPED + wired (`lsh_dedup_*`) but NOT in memo-write path. WIRE existing (R8), flag-not-merge (R12). | Stop/PostToolUse hook → `lsh_dedup_is_duplicate` → `memo-dup-candidates.jsonl`. | M |
| **11** | **co-citation related-memo graph (B4)** | usage-derived memo edges | **LOW** | NOVEL but DOUBLE-GATED on #7 + #2. Defer. | `scripts/build-cocitation-edges.mjs` after #2+#7. | M (defer) |
| — | **workflow-pattern miner → skill candidates (L1)** | skill-library self-growth | **MED** | NOVEL + papa-buildable: no auto-skill *generation* from observed work. Advisory-only, adjacent to skill-forge. | `scripts/workflow-pattern-miner.mjs` → `skill-candidates.jsonl` (reviewer-gated). | M-L |

## 2. #1 BUILD-NOW — Source-chain propagation (L5)

Highest `impact × novelty × papa-buildability`: a built-but-unpropagated asset. `SourceChainEngine` + its 4 dispatcher actions are shipped + tested; the gap is a thin wiring layer no specialist claims. Confirmed this session: `sourceChain` appears ONLY in the engine + `sessionDispatcher.ts` + `TieredMemoryEngine.ts` + tests — **zero** in `master-index-search-lib.mjs`, `memory-index-search-lib.mjs`, or any inject hook.

**papa build (U-SCP01):** a fail-soft `.mjs` mirror of the engine's pure core (TS engine can't be imported by `.mjs` hooks), drift-locked to the canonical engine by a vitest parity test, wired additively into the precheck-inject render path so every injected hit carries `[src: <type>:<node-id>]`. **Live proof:** proportion of injected hits with resolvable provenance 0% → 100%.

> Sequencing: L5 (#1) then PSN-attribution (#2) — once every hit self-describes its source node-id, the attribution ledger's corpus→leg map is trivial. They compound.

## 3. Cross-slot levers (hand to owners)

| lever | owner | gap-audit bridge | reason |
|---|---|---|---|
| Replay-buffer / slot-session-log → GNN node-feed (lift the 1.2%) | **india** | #6 (vault.mem→GNN Path-3, `graph-node-embedding-bridge.mjs:255-261`) | same measured gap india owns; papa building it forks the critical path |
| `node-embeddings-768d.jsonl` staleness guard (~21h stale) | **india** | #5 (memory→GNN staleness guard) | GNN-side staleness is india's claimed bridge |
| SPLADE learned-sparse + dense hybrid retrieval | retrieval-engine lane | (gated on Qdrant 1.10 migration U-HMEMV09) | model change, not connective tissue |
| Self-Instruct tribal corpus expansion (densify 31.5% wiki↔tribal) | **india** + **alpha** | alpha's wiki↔tribal NN backfill | needs AI-generation budget cap → india's lane |
| `stop-rag-index-staleness-check.mjs` **settings registration** (1-line wire) | **bravo** | U-HFR05 | hook shipped+committed (`d02bf0b697`) but `grep -c` in both settings.json = 0 — a registration, not a build |

## 4. Dropped (refuted by the ground phase)

| lever | verdict |
|---|---|
| Hermes cluster/dedup decision stages → RAG | **SHIPPED** — bravo `a8c86fe6d8`/`d02bf0b697`/`837ed75de8`, live in `skill-loop-pipeline.mjs` |
| RAG-index staleness Stop hook | **SHIPPED** — `stop-rag-index-staleness-check.mjs` (`d02bf0b697`); residual = settings registration (§3) |
| MEMORY.md size watchdog | **SHIPPED triad** — `memory-size-watch.mjs` + `stop-memory-size-watchdog.mjs` + `pretool-memory-size-gate.mjs` |
| B2 Connection-Finder | **SHIPPED + CLAIMED (sierra)** — `2245de0258`, output at `state/shared/CONNECTION-FINDER/` |
| B1/B3/B4/B5/B6 workflow *engines* as new builds | **SHIPPED engines, dead trigger** — fixed by #4 cron-revival, not rebuilds |
| Lazy skill-body progressive disclosure | **SPECULATIVE** — gated behind #5 telemetry to size the real delta first |

---
_Source workflow: `wf_e7d322cf-d73` (script persisted under the session workflows dir). This spec is the durable deliverable; papa executes §2 (U-SCP01) and hands §3 to owners via the chat bus._
