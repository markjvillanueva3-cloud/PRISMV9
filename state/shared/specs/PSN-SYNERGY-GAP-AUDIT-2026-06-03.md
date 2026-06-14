# PSN Synergy — Gap / Conflict / Inefficiency Audit (2026-06-03)

> **Source:** `psn-synergy-gap-audit` Workflow (run `wf_16fdc278-f24`, 7 agents / 6 audit axes + synthesis, 930K subagent tokens).
> **Substrate:** the now-honest PSN synergy metric (`scripts/psn-synergy-collect.mjs` + `PSNSynergyInspectorEngine`) — MS3 fixed the measurement so these gaps are real, not artifacts. Snapshot: `state/shared/psn-synergy-snapshot.{json,md}`.
> **Slot map:** india carries the critical path (6/9 bridges); golf = doc hygiene; sierra = system-viz roost/digest; quebec = frontend; alpha = knowledge-graph + routing.
> **Doctrine:** lane discipline — each slot ships its own items; this spec is the coordination surface (broadcast to the chat bus). Build the verifiable producer before its consumers (R13 logical order).

---

## 1. BRIDGES TO BUILD (ranked by ROI, dependency-ordered)

| # | Bridge | Owner | Depends on | Build (one-line) |
|---|--------|-------|-----------|------------------|
| 1 | **octopus read-before-ask + `consensus_recall` action** (KEYSTONE) | india | `ConsensusRecallCacheEngine.ts` exists (verified) | Wire `consensus_recall` into `prism_memory`; `MultiModelConsensusEngine.ask()` (`MultiModelConsensusEngine.ts:330`) calls `consensusRecallCache.recall(promptHash)` + short-circuits on hit → flips brain write-only → compounding recall. Every repeat 4-model fan-out is pure waste today. |
| 2 | **algorithms→nn_gnn + algorithms→prism_ai citation bridge** (KEYSTONE) | india | none; `mcp-server/src/algorithms/{NeuralInference,GradientDescent,MultiHeadAttention,ScaledDotProductAttention,ActivationFunctionsAlgorithm}.ts` exist | Add real import/`@see` cites from GraphSAGE trainer + `prismCreativeReasoningEngine`/`aiSystemRouter` to the ML primitives they execute. Collapses 3 of 4 real zero-ref P0 pairs (the "dark algorithms substrate"). |
| 3 | **AISystemRouter recall pre-check** | india (alpha co: obsidian read API) | **#1** | `recall()` pre-check in `AISystemRouterEngine.route()` (regex-only today, lines 71-90) → returns `local-mcp/free` on cache hit. |
| 4 | **engines→tribal outcome-capture tap** | golf | none (model on `stop-obsidian-memory-feed.mjs`) | Wire engine outcome records → `tribal_add`. Largest untapped corpus (~3.6k engines × 33k tribal nodes) at near-zero emission today. |
| 5 | **memory→GNN staleness guard + live rebuild** | india | **#2** | mtime guard in `nn-graph-retrain-lifecycle.mjs`: if `system-graph.json` newer than `node-embeddings-768d.jsonl`, rebuild embedding source first. JSONL ~21h stale vs 302k-node graph. |
| 6 | **vault.mem → GNN Path-3 mapper** | india (alpha: memory-index key shape) | **#5** | Extend `graph-node-embedding-bridge.mjs:255-261` (Path-1 reads `wiki:` only) with `vault.mem.*` → memory-embedding-index keys. Only 1.2% (wiki-joined) nodes feed the GNN today. |
| 7 | **PSN snapshot → `ownerSlot` routing column** ✅ **SHIPPED (alpha)** | alpha | none | `ownerSlot` per leg in `psn-synergy-collect.mjs` keyed off `PSN_LEG_OWNER` (← CHAT-SLOT-DOMAINS.md). Leg-health regression auto-routes to its owner. **Done this session.** |
| 8 | **`ghost.octopus_consensus` system-viz roost** | sierra | **#1** + panel #9 | Emit a consensus-ledger roost in `regen-viz.mjs` from `state/shared/octopus-runs.jsonl` so the octopus leg renders as a 3D surface (387B probe cache today; invisible). |
| 9 | **Web "Brain / Consensus History" panel** | quebec (frontend) + india (dispatcher) | **#1** | Panel calling `prism_memory:consensus_recall` + `memory_search`, rendering `octopus-runs.jsonl` / `CONSENSUS_NEURAL_FEED.jsonl`. Web app surfaces zero PSN/brain data today. |

**Deferred / low-ROI (logged, not dropped):** tribal→nn_gnn reverse-edge feature feed (P1, ba=14 one-way — ships once #6 lands); wiki↔tribal NN nearest-neighbor backfill (23.8k missing edges, large compute — **alpha**, sequence after #7).

---

## 2. CONFLICTS TO RESOLVE (R7 — pick, don't average)

1. **wiki↔tribal coverage: "31.5%" vs "0.8%" — RESOLVED (alpha, 2026-06-03): FALSE CONFLICT.** Verified: `.wiki-tribal-coverage-by-domain.json` embeds `parentCoverage: 0.3151` + `parentAuditAt` = the overall `.wiki-tribal-cross-ref-audit.json` `generatedAt` — i.e. the two files AGREE. 31.5% is **overall** embedding coverage (authoritative — 26,051/38,035 wiki files lack a tribal embedding); 0.8–1.1% are **worst-per-domain** coverages (dev-infra etc.). Same data, different granularity — not a conflict, no correction needed. (The audit *is* stale-dated 2026-05-27, but its number is internally consistent; a separate system-viz graph ghost reporting a low % would be measuring graph-EDGE coverage, a third distinct metric.) The wiki↔tribal NN backfill (Bridge deferred) should size off the **per-domain** figures, not the aggregate.
2. **Galaxy MEMORY.md sync headers: `token-optimization` has UP/DOWN rows; `mill`/`wedm` carry none (STUB).** → pick **token-optimization's populated block** (first MASTER-BRAIN-TEMPLATE-compliant exemplar); backfill into ~32 stub headers. *(golf seeds, per-soul slots refine)*
3. **CHAT-SLOT-DOMAINS.md slot math: "22 assigned / 4 unassigned" but lists FIVE unassigned (ROMEO, UNIFORM, VICTOR, XRAY, YANKEE).** → pick **the enumerated list**; recount 21/5, drop "(4)", reconcile YANKEE vs NOVEMBER vs the 26-NATO model. *(golf)*
4. **master MEMORY.md `## Last synced: 2026-05-26` vs registry rows 05-28/29 + feed 06-01.** → pick **the newer evidence**; bump `## Last synced` on every registry append. *(alpha)*

---

## 3. INEFFICIENCIES TO CUT

1. **GSD_QUICK.md hardcoded header counts stale** (95 disp / 6346 actions vs live 106 / 9959; ~9× off). → generated pointer to `PRISM-INVENTORY-LATEST.md` or auto-stamp in `update-prism-inventory.mjs`. *(golf)*
2. **golf-owns-reaper doctrine triplicated** (CLAUDE.md §FLEET-REAPER + §GOLF SLOT, CHAT-SLOT-DOMAINS.md GOLF row, `feedback_golf_owns_reaper.md`). → CHAT-SLOT-DOMAINS.md = single source; CLAUDE.md §GOLF SLOT → `[[pointer]]`. *(golf)*
3. **memories leg double-counted obsidian_brain's bridges** (`psn-synergy-collect.mjs` reused full-file scan verbatim). ✅ **FIXED (alpha)** — now scans the standing-memory subset separately. **Done this session.**
4. **MASTER-DIGEST.md staleness + card-dir miscount** (all 34 brains modified after its generation; rolls up 34 from a 38-file dir). → re-run `galaxy-rollup.mjs build` + Stop/cron freshness guard; tag the 4 extras `_meta`. *(sierra)*

**Advisory (golf, low priority):** 6 galaxy brains self-flag "older than dir-mtime ⇒ re-pull" with no enforcement → SessionStart galaxy-sync-staleness advisory.

---

## 4. HONEST NON-GAPS (leave them — R12)

1. **6 of 10 PSN zero-ref pairs are genuine isolation** — algorithms↔tribal, algorithms↔prism_os, formulas↔prism_os, tribal↔prism_os, nn_gnn↔prism_os, prism_os↔prism_ai. Pure-math primitives carry no shop-floor lore; the OS layer routes to AI via dispatchers, never direct refs. Building these = fabricated wiring.
2. **obsidian↔memories feed healthy** — `stop-obsidian-memory-feed.mjs`: 3-min throttle, O_EXCL lock, fail-loud `.err`.
3. **Galaxy back-pointer registry complete** — all 34 `engines/*/MEMORY.md` have exactly one `[galaxy:*]` row (empty `comm -3`).
4. **GSD_QUICK lifecycle-hooks list self-flags "aspirational"** — honest disclaimer present, not a conflict.
5. **graph-ai snapshot internally consistent** — `nn_gnn→engines:67`, `prism_ai→nn_gnn:49` match the bridge/ledger files.
6. **MASTER-DIGEST content still real** despite the LF/mirror timestamp touch — staleness is real (Ineff#4) but per-galaxy salience didn't move; ≤5/34 boilerplate dup.

---

## Alpha-shipped this session (PSN-SYNERGY-COLLECT-MS3 + gap-audit)
- `b1bf46b3b1` five-leg out-edge scan (p0 19→10) · `d71daf0ab8` memories-false-positive + per-file-binary (3-of-3 PASS) · `f3de817393` graph-membership-footer + self-class-name exclusion · **this commit:** Bridge#7 ownerSlot column + Ineff#3 memories double-count fix.
- **Conflicts #1, #4 + the wiki↔tribal backfill = alpha backlog (next iterations).**

## Cross-slot pickup (broadcast to chat bus)
- **india:** bridges #1, #2, #3, #5, #6 (critical path — start with #1 + #2 keystones).
- **golf:** bridge #4 + inefficiencies #1, #2 + conflicts #2, #3 + the sync-staleness advisory.
- **sierra:** bridge #8 + inefficiency #4 (digest freshness).
- **quebec:** bridge #9 (web Brain/Consensus panel).
