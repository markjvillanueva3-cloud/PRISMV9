---
title: PSN ↔ Obsidian ↔ Octopus ↔ system-viz ↔ codex ↔ hermes/zulu Synergy Assessment
date: 2026-05-31
author: slot:bravo (hermes-zulu / octopus lane)
advisory: true
mustHumanVerify: true
status: advisory-assessment
scope: "How to take full advantage of Obsidian-brain + PSN + system-viz + octopus + codex + hermes/zulu/zebra TOGETHER"
related:
  - "[[feedback_psn_definition]]"
  - state/shared/specs/HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md
  - mcp-server/data/milestones/OCTOPUS-NEURAL-MS0.json
  - mcp-server/data/milestones/HERMES-MEMORY-VAULT-MS0.json
  - mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json
---

# PSN ↔ Obsidian ↔ Octopus ↔ system-viz ↔ codex ↔ hermes/zulu Synergy Assessment

**ADVISORY ONLY — mustHumanVerify.** Every "shipped"/"pending" claim below is cited to a file or commit. File-presence ≠ spec-correctness; verify before flipping any roadmap status (per [[feedback_auto_close_out]] + R12 fail-loud).

---

## Executive headline

The six subsystems are individually mature but **integrate at only ~2 of 11 PSN legs** — octopus fans 5 voices out over a thin substrate, the live Obsidian bridge is built-and-wired-but-consumed-by-nothing, and the consensus decision trail is invisible in system-viz. The single highest-leverage move is **U-HOC01: RAG-rerank all 11 PSN legs into the octopus shared-voice context before fan-out** — now unblocked because `PRISMContextInjectorEngine.buildContext()` is a real implementation on the integrator branch (no longer the throwing stub). Three near-zero-cost wires (live-vault into slot-context-bundle, galaxy-brain → Obsidian graph, octopus run-ledger → system-viz roost) then make the brain *navigable, live, and self-observing* rather than read-only and static. Sequence them in dependency order behind a single milestone (**PSN-SYNERGY-MS0, 8 units**) so the consumer surfaces (viz roost, leg-coverage dial, weekly synthesis) are never built atop an unproven ledger.

> **CRITICAL BRANCH-STATE CORRECTION (R12).** This assessment was produced from the `slot/bravo` worktree (`H:/prism-slot-bravo`, HEAD `6bcb65b1`), which is **materially behind**. On `slot/bravo`, `PRISMContextInjectorEngine.ts` is STILL the 38-line throwing stub; `liveBrainContext()`, `slot-context-bundle-inject.mjs`, the 34 galaxy `MEMORY.md` files, the octopus ledger writer, and the Hermes milestones **do not exist on this branch**. They exist on **`cad-fusion-live-ms0`** (the golf integrator branch — injector 167 LOC, 34 galaxy MEMORY.md, `liveBrainContext` present, `scripts/lib/octopus-record-lib.mjs` present). `main` has the de-stubbed injector (262 LOC) but NOT the galaxy/live-brain layer. **Any builder MUST start from `cad-fusion-live-ms0`, or rebase slot/bravo onto it first** — building on `slot/bravo` re-introduces the U-ENGINE-FOSSIL-2 stub and inverts logical order (R13). The opportunity descriptions' "no longer blocked on a stub" premise is true *only on the integrator branch*.

---

## Current-state of the six subsystems

| Subsystem | Built | Wired | Gap |
|---|---|---|---|
| **Obsidian-brain** (PSN leg #1) | YES — vault `H:/prism/knowledge`; Local REST API 4.1.2 on `https://127.0.0.1:27123`; `ObsidianRestBridgeEngine.ts` (read-only fail-soft); feed via `.claude/hooks/stop-obsidian-memory-feed.mjs` | PARTIAL — feed is **ONE-WAY** (C: memories → H: vault); `prism_session:obsidian_status/read/search` wired (`sessionDispatcher.ts`) | **Bidirectional ("vault writes back") UNSHIPPED** — `HERMES-MEMORY-VAULT-MS0` units U-HMEMV04/05/06 mostly not built. `liveBrainContext()` consumed by **nothing**. |
| **PSN (11 legs)** | YES — canonical taxonomy `[[feedback_psn_definition]]` | PARTIAL — `psn-leg-state-inject.mjs` tracks **3 of 11** legs (Memories / System Viz / NN-GNN MVP) | Octopus consults only **2 of 11** legs; no per-leg consultation-coverage metric exists. |
| **system-viz** (PSN leg #6) | YES — `state/shared/system-viz/system-graph.json` (~570MB, ~126k nodes); one canonical writer `scripts/regen-viz.mjs`; ~48 ghost-roost generators | YES — `FAST[]` + `merge-augmentations.mjs` splice dual-registration pattern proven | **Graph stale ~10h**; **no `ghost.octopus_consensus` roost** — the consensus decision trail is invisible. |
| **octopus** (multi-LLM consensus fan-out) | YES — `MultiModelConsensusEngine.ts` (5 voices: claude/codex/grok/gemini/ollama), `consensus_decide` LIVE in `aiReasoningDispatcher.ts`; ledger writer `scripts/lib/octopus-record-lib.mjs` (integrator branch) | PARTIAL — per-voice `buildPrompt()` seam wired; `ConsensusObsidianPersistenceEngine.ts` exists | **Consults 2/11 PSN legs** (U-HOC01 P0). Real 5-voice fan-out over an **enriched shared substrate** not yet done; only stub runs recorded. No standalone "octopus" engine — it IS the consensus fan-out pattern. |
| **codex** | YES — (a) Codex CLI review arm in `.claude/scripts/scrutiny-3way.mjs` (advisory, wiki `[[codex-review-arm]]`); (b) MCP codex tool; (c) `state/shared/CLAUDE-CODEX-*-DIRECTIVE.md` bridges | YES — advisory 3-of-3 scrutiny arm | **Not an explicit adversarial arm inside octopus** — codex's devil's-advocate verdict trail isn't surfaced as a tracked signal (rejected as `isReal:false` — codex is already a voice; promoting it to a forced-dissent arm is a tuning concern, not a structural gap). |
| **hermes/zulu/zebra** (PSN leg #11, AI router/orchestrator) | YES — galaxy `mcp-server/src/engines/hermes-zulu/`; per-slot SOUL layer (U-HERMES02, 26 NATO souls); `zuluAwarenessReader.ts liveBrainContext()` (integrator branch); ZULU-OMNISCIENT slot-context aggregator | PARTIAL — `weekly_synthesis_get` wired (`memoryDispatcher.ts`); 5 parallel-orchestration engines already wired | **Octopus output does not flow back into the Hermes ledger / cluster→promote** (U-HOC02 family); weekly synthesis does not consume consensus history. |

---

## Ranked recommendations (with data flows)

> Scores carried from the verified+scored survivor set. "Owner" = lane that holds the primary surface; cross-lane touches flagged.

### 1 — U-HOC01: RAG-rerank all 11 PSN legs into octopus shared-voice context before fan-out  *(leverage 8.5, effort M)*
- **id:** `hoc01-octopus-reads-11-psn-legs` · **subsystems:** octopus, psn-11-legs, obsidian-brain · **owner:** bravo (cross-lane: alpha/memories, sierra/graph, wiki, india/NN-GNN)
- **Why:** the single highest-value pending octopus unit; makes 5 voices disagree over the *same* brain-grounded substrate instead of their own guesses — agreement signal becomes meaningful.
- **Data flow:** prompt intent → RAG-rerank over PSN substrate (graph BM25 via `master-index-search-lib` + wiki-embed + `memory_search`/Qdrant + `tribal-embed-index.json`) → top-3/leg → **single shared context block** injected into every voice's `MultiModelConsensusEngine.buildPrompt()`.
- **firstStep:** On `cad-fusion-live-ms0`, confirm `PRISMContextInjectorEngine.buildContext()` is the real BM25-over-graph impl, then extend it from graph-only to a leg-fan retriever scoped FIRST to **wiki + memories + tribal + skills** (matches spec line 32 exactly — do NOT over-promise "all 11"; NN/GNN/PRISM-AI/OS have no text-retrieval surface, ~4-5 real retrievers). Respect per-voice `modelBudget`; keep every leg fail-soft.

### 2 — Feed `liveBrainContext()` into `slot-context-bundle-inject`  *(leverage 7.5, effort S→M)*
- **id:** `livebrain-into-slot-context-bundle` · **subsystems:** obsidian-brain, hermes-zulu, psn-11-legs · **owner:** bravo (cross-lane: alpha/Obsidian leg, shared-tree injector)
- **Why:** turns the read-only live bridge (built + wired, consumed by nothing) into fleet-wide context on EVERY prompt across all 26 slots — the canonical PSN aggregator other hooks key off.
- **Data flow:** Obsidian REST :27123 → `ObsidianRestBridgeEngine` → `liveBrainContext()` → injector `additionalContext` `## Live vault context` block → every UserPromptSubmit.
- **firstStep:** Resolve the sync/async + `.ts`→`.mjs` boundary FIRST — `zulu-context-bundle.mjs:loadSlotContext()` is synchronous and cannot import the `.ts` `liveBrainContext()` at runtime. Cleanest path is the already-wired `prism_session:obsidian_read` MCP action, but :3100 MCP is currently DOWN so it must fail-soft to empty. Add hard timeout + cache; gate `PRISM_OBSIDIAN_LIVE=1` (off by default). **Not the claimed ~40 LOC** — budget for an async refactor or MCP-call path.

### 3 — Mirror 34 galaxy `MEMORY.md` index files into the Obsidian graph  *(leverage 6.5, effort M)*
- **id:** `galaxy-memory-into-obsidian-graph` · **subsystems:** obsidian-brain, psn-11-legs, system-viz · **owner:** alpha (cross-lane: sierra/viz bridge is read-only consumer — no sierra change needed)
- **Why:** the 34 galaxy brains are the master-brain's per-domain leaves but are invisible in the vault graph and the viz backlink layer today.
- **Data flow:** `engines/<galaxy>/MEMORY.md` → new `syncGalaxyMemories()` in `obsidian-memory-sync.mjs` → `knowledge/memories/galaxies/<galaxy>/` (NOT a new top-level `knowledge/galaxies/` — that fragments the vault and isn't walked by `system-viz-obsidian-bridge-v2.mjs`) → Obsidian graph + viz backlinks.
- **firstStep:** **Do NOT duplicate the already-shipped per-galaxy slot-memory routing** (commit `63bb5048fe`, U-GALAXY-MEMORY, routes C:/auto-memory slot-tagged files). The true residual gap is narrow: mirror the **34 `engines/<galaxy>/MEMORY.md` INDEX files** (distinct from slot-tagged memories). They have a different header shape — needs a dedicated mirror path, not the `convertToObsidian()` frontmatter pipeline. Land under `memories/galaxies/` to inherit the existing viz backlink pass; gate behind a knob, fail-soft try/catch.

### 4 — Render octopus consensus run-ledger as a system-viz ghost-roost  *(leverage 6, effort M)*
- **id:** `octopus-run-ledger-ghost-roost` · **subsystems:** octopus, system-viz, codex · **owner:** sierra (cross-lane: data source is bravo/octopus) · **dependsOn:** the consensus→persist loop being live
- **Why:** turns an invisible decision ledger into the canonical decision-audit surface alongside the other ~48 roosts; surfaces codex's adversarial verdict trail + consensus-quality drift.
- **Data flow:** `octopus-runs.jsonl` / `wiki/consensus/*.md` → `scripts/generate-octopus-consensus-features.mjs` → `ghost.octopus_consensus` roost (one node/run: `{prompt_hash, voters[], agreement_score, recommendation}`, colored green ≥0.70 / yellow 0.40–0.70 / red <0.40, edges to source-session + per-voice eng nodes) → `regen-viz.mjs FAST[]` **AND** `merge-augmentations.mjs` splice (dual-registration).
- **firstStep:** **Build AFTER octopus actually runs + persists** (R13 — do not build the consumer atop an empty ledger; it would render zero nodes and look "done"). Copy the `scripts/generate-bridge-synergy-features.mjs` ~80-LOC template. Verify the CONSENSUS_COMPLETED_TOPIC → persist subscriber loop is wired first.

### 5 — Feed the octopus run-ledger into `weekly_synthesis_get` / hermes-self-reflect  *(leverage 6, effort S)*
- **id:** `weekly-synthesis-consumes-octopus-ledger` · **subsystems:** hermes-zulu, octopus, obsidian-brain · **owner:** bravo (cross-lane: alpha owns `knowledge/memories/` writes + the OBSIDIAN-INTELLIGENCE-MS3/B4 engine) · **dependsOn:** real ledger (HOC02)
- **Why:** `WeeklySynthesisEngine` is already wired and already writes to the brain — adding consensus history as an input makes octopus's decision history part of long-horizon reflective memory at near-zero marginal cost.
- **Data flow:** `octopus-runs.jsonl` + `wiki/consensus` → `WeeklySynthesisEngine.runWeekly()` (clean pluggable `LoaderFn` DI boundary, ~line 399) → weekly reflection note → `knowledge/memories/`.
- **firstStep:** Compose a SEPARATE loader (do not bolt heterogeneous input inline — the engine is deliberately single-purpose, WIRE-EXEMPT cron lib). **Defer until HOC01+HOC02 ship**, OR re-scope to consume the already-live `state/shared/consensus-queue.jsonl` (68KB live) instead of the stub octopus ledger. Apply the same `MAX_SOURCE_BYTES` truncation discipline.

### 6 — Extend `psn-leg-state-inject` to surface octopus's per-leg consultation coverage  *(leverage 6, effort S)*
- **id:** `psn-leg-state-expand-to-octopus-coverage` · **subsystems:** psn-11-legs, octopus, system-viz · **owner:** bravo writes / golf owns the hook / sierra viz overlay · **dependsOn:** HOC01 corpus loader (the REAL gate) + HOC02 ledger
- **Why:** makes the central integration gap ("octopus consulted 2/11 legs") a live, measurable dial that U-HOC01 visibly moves — instead of a static spec claim.
- **Data flow:** octopus-run ledger `psnExemplars` field → `psn-leg-state-inject` coverage block → UserPromptSubmit advisory (+ optional viz node).
- **firstStep:** Ship the **injected-advisory half only** first (the S-effort win); defer the viz-overlay half (heavier, needs a new dual-registered ghost-roost). **Real blocker is HOC01's corpus loader** — `octopus-with-hermes-rag.mjs` passes `psnCorpora:{}` (wired-but-empty); a coverage dial built today reads null and reports 0/11 forever. `psn-leg-state-inject` currently surfaces only-concerning legs (silent when healthy) — an always-on gauge needs a deliberate `formatLegState` extension, not a drop-in. Golf-owned hook → chat-bus + build in slot worktree first.

### 7 — (Foundation, prerequisite) Verify/land the consensus→persist EventBus subscriber loop  *(leverage 5, supporting)*
- **id:** `octopus-obsidian-persist-subscriber` · **owner:** bravo
- **Why:** scored as `alreadyShipped:true` (`ConsensusObsidianPersistenceEngine` wired into `MultiModelConsensusEngine` + `devDispatcher`), but a verdict flagged **zero EventBus subscribers to CONSENSUS_COMPLETED_TOPIC** — the broadcast→persist loop may not actually fire. This is the hidden prerequisite for #4 and #5. **firstStep:** grep for a live subscriber; if absent, wire it before building the roost or weekly-synthesis consumer.

---

## Proposed milestone

**`PSN-SYNERGY-MS0` — 8 units**, ordered in logical/dependency sequence so no consumer is built atop an unproven dependency (R13):

| # | Unit | Builds-on | Notes |
|---|---|---|---|
| U-PSNS01 | **Branch-sync prerequisite** — rebase the working slot onto `cad-fusion-live-ms0` (de-stubbed injector + live-brain layer present) | — | Non-code gate; prevents re-introducing the U-ENGINE-FOSSIL-2 stub. |
| U-PSNS02 | **Verify/land consensus→persist subscriber** (`octopus-obsidian-persist-subscriber`) | U-PSNS01 | Foundation for the ledger; confirm CONSENSUS_COMPLETED_TOPIC fires persistence. |
| U-PSNS03 | **U-HOC01** — RAG-rerank wiki+memories+tribal+skills into octopus shared context | U-PSNS01 | The core unlock. Scope to 4-5 real retrievers, fail-soft per leg. |
| U-PSNS04 | **liveBrainContext → slot-context-bundle** | U-PSNS01 | Resolve sync/async + MCP-call path; timeout + cache; default-off gate. |
| U-PSNS05 | **Galaxy `MEMORY.md` → Obsidian graph mirror** | U-PSNS01 | Mirror the 34 INDEX files under `memories/galaxies/`; dedicated mirror path. |
| U-PSNS06 | **U-HOC02** — octopus output → Hermes ledger (real runs, not stub) | U-PSNS02, U-PSNS03 | Produces the ledger that #07/#08 consume. |
| U-PSNS07 | **octopus run-ledger → system-viz ghost-roost** | U-PSNS06 | Dual-registered `FAST[]` + splice; build only after real runs exist. |
| U-PSNS08 | **psn-leg-state coverage dial + weekly-synthesis consumer** | U-PSNS03, U-PSNS06 | Advisory-half coverage dial; separate loader into WeeklySynthesisEngine. |

Logical order: branch-sync → persist-loop → HOC01 substrate (the lever) → live-vault + galaxy-graph (parallel, independent) → HOC02 real ledger → viz-roost + coverage/weekly consumers (atop a proven ledger).

---

## Cross-lane coordination notes

- **bravo** owns the octopus/consensus engine + hermes-zulu reader + the HOC pipeline. **Cannot land U-HOC01's retrieval libs, the galaxy mirror, or the golf-owned `psn-leg-state-inject` hook unilaterally.**
- **alpha** owns the Obsidian-brain leg, `ObsidianRestBridgeEngine`, `obsidian-memory-sync.mjs`, and `knowledge/memories/` writes (incl. the OBSIDIAN-INTELLIGENCE-MS3/B4 weekly-synthesis engine). Units #2, #3, #5 touch alpha territory → **chat-bus post first.**
- **sierra** owns system-viz / `regen-viz.mjs` (one canonical writer of the 570MB graph). Units #4, #6-viz-overlay → **chat-bus before touching `regen-viz.mjs FAST[]` or the splice.** Note: `system-viz-obsidian-bridge-v2.mjs` is a read-only consumer that already walks `knowledge/memories/` recursively — the galaxy mirror auto-augments with no sierra code change.
- **golf** owns `psn-leg-state-inject.mjs` (U-PSN-LEG-STATE-INJECT) → coordinate before extending it.
- **india** owns NN/GNN — U-HOC01's "11 legs" framing reaches india's substrate, but NN/GNN has no text-retrieval surface, so scope HOC01 to the 4-5 text legs and flag india only advisorily.
- **Slot-worktree discipline:** build in the slot worktree on the slot branch; `main-tree-write-block` + `git-add-lane-guard` + `worktree-commit-route` arm once bound to `slot/<nato>`. Golf integrates into `cad-fusion-live-ms0`.

---

## ALREADY SHIPPED — do NOT rebuild

- **`PRISMContextInjectorEngine.buildContext()` real impl** — de-stubbed by U-GO-C6 (GRAPH-OCTOPUS-AUTOWIRE-MS0, slot echo, commits `b1b01adf4e`/`bd521d0a90`). Lazy-imports `master-index-search-lib`, BM25 over the graph, fail-soft. **Present on `cad-fusion-live-ms0` (167 LOC) and `main` (262 LOC); ABSENT on `slot/bravo` (still 38-LOC stub).** Build U-HOC01 by *extending* it, not replacing.
- **Per-galaxy slot-memory routing in `obsidian-memory-sync.mjs`** — `resolveMemoryGalaxy()` + `reconcileGalaxies()`, writes `knowledge/memories/galaxies/<galaxy>/` (commit `63bb5048fe`, U-GALAXY-MEMORY, slot alpha). The galaxy-mirror unit must NOT duplicate this — it mirrors the distinct `engines/<galaxy>/MEMORY.md` INDEX files.
- **`ConsensusObsidianPersistenceEngine` + `ObsidianRestBridgeEngine` + `WeeklySynthesisEngine`** — built, tested, wired (`sessionDispatcher.ts` obsidian actions; `memoryDispatcher.ts weekly_synthesis_get`). Extend via their DI boundaries; do not re-author.
- **5 Hermes parallel-orchestration engines** — already wired to a dispatcher (scored `alreadyShipped:true`).
- **`octopus-record-lib.mjs`** (ledger WRITER, commit `d02bf0b697`) — exists on the integrator branch. The *runtime ledger JSONL* does not yet exist with real data (only stub runs) — that's U-HOC02, not a rebuild of the writer.
- **`slot-context-bundle-inject.mjs`** — exists on `cad-fusion-live-ms0` (NOT on `slot/bravo` or `main`). Wire `liveBrainContext()` INTO it; do not recreate the hook.
- **`U-HOC03` (aiSystemRouter octopus-invoke policy)** — scored `isReal:false` + `alreadyShipped:true`; deprioritize.

---

## Uncertainty / fail-loud flags (R12)

1. **Branch divergence is the dominant risk.** This assessment's "shipped" claims split across three branches (`slot/bravo` ≪ `main` < `cad-fusion-live-ms0`). Re-verify on the branch you actually build on.
2. **Octopus has never done a real 5-voice fan-out** — the only recorded run is a stub (`consensus='stub-not-yet-merged'`, `psnExemplars:null`, single voice). Any metric/roost/synthesis built before a real run measures a placeholder.
3. **U-HOC01's true blocker is the corpus loader** (`psnCorpora:{}` wired-but-empty), not just "the stub injector." Without it, downstream coverage dials read null.
4. **MCP :3100 reportedly DOWN + 570MB graph ~10h stale** — keep every retrieval/live-vault path fail-soft so a dead dependency degrades to fewer legs, never throws.
5. **Cited milestone `HERMES-PSN-RAG.json` does not exist** as a file — octopus coordination lives in `state/shared/specs/HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md` + `OCTOPUS-NEURAL-MS0.json` + `GRAPH-OCTOPUS-AUTOWIRE-MS0.json` (minor prompt-citation drift).

---

*Generated by slot:bravo, advisory. Human-verify before acting. See [[feedback_psn_definition]] for the canonical 11-leg taxonomy.*
