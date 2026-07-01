# SYSTEM-VIZ HIGH-ROI AUDIT — 2026-05-20

**Auditor:** claude-2220271d (slot sierra, /startup-sierra /goal /loop iter-1)
**Scope:** Rank new + still-open high-ROI uses for `/system-viz` given the **2026-05-20 graph reality** (250,497 nodes / 786,400 edges / 7,412 ghosts / 110 MB master-index sidecar). Delta over the 2026-05-11 backlog and the 2026-05-16 audit — surface what those didn't see because the graph has grown 12× since (20K → 250K nodes after L12 FS expansion + atomic generators).
**Verification:** `node H:/prism/scripts/system-viz-health.mjs` + direct graph inspection this session.
**Advisory only — never auto-applied.** Per-file scrutiny + 3-of-3 gate apply when units land.

---

## TL;DR — top 10 ranked by ROI (value × inverse-effort)

| # | Finding | Symptom (verified this session) | Lift | Effort | Status |
|---|--------|---------------------------------|------|--------|--------|
| **G1** | **Node-`type` backfill** | 211,975 / 250,497 nodes (**84.6%**) have NO `type` field | Every downstream classifier wakes up (master-index BM25 type-weight, viewer coloring, blast-radius type-filter, NN-GRAPH features) | **S** | NEW (post-L12) |
| **G2** | **Master-index query telemetry** | 0 telemetry on what terms get queried; pre-search fires every UserPromptSubmit but no signal on hit-quality | Identifies missing wiki entries + lets us auto-tune BM25 + ranks "doc debt" by demand | **S** | NEW |
| **G3** | **Ghost-wire validation feedback loop** | 7,412 ghost-edges incl. 630 NN-GRAPH `proposed_wiring`; **none validated against subsequent commits** | Closes NN-GRAPH MS0 feedback (operator can retrain against real labels); surfaces ghost rot | **M** | NEW |
| **G4** | **Dead-pixel sweep** (Tier-D4 from 2026-05-11, still parked) | Wiki/dispatcher nodes whose Tier-1 engine is unwired = orphan docs; current count UNKNOWN | Cleanup direction; finds rot before it spreads | **S** | PARKED 2026-05-11 |
| **G5** | **Tribal-density heatmap** (Tier-D1, still parked) | ~3K tribal tips reference engines; per-engine tip count never surfaced on the graph | Shows where shop-floor learning is dense vs thin → feeds curiosity/closed-loop priorities | **S** | PARKED 2026-05-11 |
| **G6** | **Per-slot heat map** (fleet view) | 26 slots in `SLOT_NAMES`, none have a "which graph region am I touching" overlay; fleet-overlap invisible | Operator sees fleet workload distribution; avoids dup pickups before /pick-unit | **M** | NEW (post fleet expansion to 26) |
| **G7** | **Master-index sidecar incremental rebuild** | 110 MB `system-graph-index.json` rebuilt full-pass; mtime-cache exists in lib but sidecar build is monolithic | Sub-second incremental reindex on small graph deltas | **M** | NEW (sidecar shipped post-2026-05-16) |
| **G8** | **Post-commit incremental graph update** | `system-viz-add-node.mjs` exists but no post-commit hook routes new commits' files into it | Sub-minute lag fleet-wide between ship + visible-in-viz; today's lag is whatever cron schedules regen | **M** | NEW |
| **G9** | **`actEng` action→engine edges** (C2 from 2026-05-11, still blocked) | 6,233 `dispatcher_router` + 1,305 `engine` nodes; **0 `actEng` edges** because `--full` regen never finishes on 90%+-commit host | Closes in-viewer action-surface overlay; impact analysis becomes "action X → which engines" | **M-H** | BLOCKED on memory-pressure mitigation |
| **G10** | **NN-GRAPH model gate** (MS2 deferred) | U2 lifecycle auto-promotes IFF AUROC ≥ 0.78; currently 0.096 (heterophily anti-correlation) | GNN tier-5 wiring-inference wakes; UNKNOWN ghosts auto-classified | **H** | BLOCKED on operator out-of-session retrain |

**Bottom-of-stack: diminishing returns** kick in below G10 — schema-evolution layer (D3), `Lvault` full-vault layer (D2 from 2026-05-11), drift-flash (C4 from 2026-05-11, no milestone nodes in graph). Park until operator demand signal.

---

## What shipped since the 2026-05-16 audit (verified this session)

- **L12 FS coverage** expanded to 140,889 `fs.*` nodes (was: ~no FS leaves before MS0). System-graph grew 20K → 250K.
- **Atomic ghost roosts**: 7,412 ghost nodes across categories — `ghost.unwired-engine` (630 NN-GRAPH ref pool), `ghost.priority_queue`, `ghost.misc_tasks` (318), `ghost.bridge_synergy` (16+10), `ghost.feature_gap_audit` (64), `ghost.domain_pipelines`.
- **Master-index sidecar** (`system-graph-index.json`, 110 MB) built by `scripts/build-graph-index.mjs`; consumed by `master-index-search-lib.mjs` with mtime cache + size cap + 80 MB ceiling (U-VIZ-FIND-CACHE 2026-05-18 fix).
- **NN-GRAPH MS0/MS1/MS2** — GraphSAGE tier-5 wiring-inference cascade shipped; deploy gate blocked at AUROC=0.096 (model-side, not code-side); auto-promotion lifecycle ready.
- **Domain-pipeline overlay**, **priority-queue overlay**, **bridge-synergy / feature-gap-audit ghost roosts** — all surface PRISM remaining work in the graph.
- **U-VIZ-SPLIT-OUT-FILE** — `generate-system-viz.mjs` now writes `architecture-graph.json`; `merge-augmentations.mjs` writes `system-graph.json`. Two distinct artifacts, master-index reads system-graph first with arch-graph fallback.

**Net:** the **`/system-viz` surface generation pipeline is mature.** Today's ROI lives in the **reasoning/feedback/consumer layer** — using what's already in the graph rather than adding more node kinds. G1-G8 are all consumer-layer wins.

---

## G1 — Node-`type` backfill (TOP PRIORITY)

**Symptom (verified):** Inspect `system-graph.json` — 211,975 of 250,497 nodes (84.6%) have NO `type` field. Distribution of untyped by id-prefix:

```
fs       140,889   <-- all FS leaves untyped (file/dir distinction lost)
datacat   21,949
vault     20,241
formula    6,344
extract    2,215
schema     1,978
ppg        1,311
core       1,033
reg          998
git          888
...
```

**Root cause:** L12 FS expansion + atomic generators emit nodes with id-prefix + label but DON'T set the canonical `type` field (downstream consumers infer from id-prefix in ad-hoc string compares — 18+ sites grep'd). Every classifier degrades to `?`.

**Upgrade:** Single generator pass `scripts/lib/system-viz-type-backfill.mjs` that exports a pure `inferType(node)` from id-prefix:

```js
// prefix → canonical type
const PREFIX_TO_TYPE = {
  fs: "filesystem_leaf",
  wiki: "wiki_entry",
  datacat: "data_catalog_entry",
  vault: "vault_entry",
  disp: "dispatcher_router",
  ghost: "ghost",        // sub-kind already on node
  formula: "formula",
  eng: "engine",
  test: "test",
  extract: "extraction_record",
  schema: "schema_entry",
  ppg: "post_processor_generator",
  core: "core_module",
  reg: "registry_entry",
  git: "git_object",
  ms: "milestone",
  unit: "roadmap_unit",
  // ... 30+ prefixes from id-prefix histogram
};
```

Wire into `merge-augmentations.mjs` post-process pass (or a new repair stage in `regen-viz.mjs` between dedup and parent-edges). Pure function, hermetic-testable, fail-loud on unknown prefix (R12 — surface novel prefixes instead of silently typing them `?`).

**Lift:** 84% → < 5% untyped (only truly novel prefixes remain). Master-index BM25 type-weight wakes up. Viewer per-type coloring works on FS layer. Blast-radius type-filter functional. NN-GRAPH input features richer (a node's type is a free 1-hot dim).

**Effort:** S — one pure lib + one regen-viz wire-up + ~20-case `node:test` (per-prefix mapping + fail-loud on unknown).

**Verify:** post-build, re-run the type-count probe; untyped drops from 211,975 to ≤ 12,000.

---

## G2 — Master-index query telemetry

**Symptom:** Every `UserPromptSubmit` (26-chat fleet, ~hundreds/day) fires `master-index-precheck-inject.mjs` AND per-subagent `subagent-start-context.mjs`. Both go through `master-index-search-lib.mjs`. **Zero telemetry exists** on what terms get queried, hit-rate, hit-quality. We're flying blind on the #1 hot path.

**Upgrade:** Lightweight `appendFileSync` to `state/shared/master-index-query-log.jsonl` (one line per query: `{ts, terms, k, hitsReturned, topScore, source}`). Add `scripts/master-index-query-stats.mjs` that emits a weekly aggregate:
- top-50 most-queried terms
- top-50 terms with **0 hits** (= missing wiki entries — these are the highest-ROI doc-debt candidates)
- top-50 terms with hits but **low top-score** (= ranking-tuning candidates)

**Lift:** Identifies missing wiki entries by **demand**, not gut-feel. Auto-feeds the curiosity queue. Compounds the value of every wiki entry written.

**Effort:** S — 5 lines in search-lib + one stats script + a Stop-hook reader.

**Verify:** after 100 prompts, the JSONL has ≥ 100 entries; stats script returns top-K.

---

## G3 — Ghost-wire validation feedback loop

**Symptom:** 7,412 ghost-edges currently in graph including 630 NN-GRAPH `proposed_wiring` annotations (high-conf 0.80-0.85 from `seed-ghost-from-unwired.mjs`). **None have ever been validated** against subsequent commits — we don't know if a prediction came true.

**Upgrade:** `scripts/validate-ghost-wires.mjs`:
1. For each ghost-edge `(engine → proposed_dispatcher, conf)` annotated at sha `s`, scan `git log --all --since=s --diff-filter=AM -- <dispatcher file>` for new action-enum + lazy-import additions referencing the engine.
2. Tag each ghost: `confirmed | refuted | pending` + `daysOpen`.
3. Append outcome to `state/shared/ghost-wire-outcomes.jsonl` — the **labeled dataset** for NN-GRAPH retrain.
4. Surface in `/system-viz` as a new overlay (`G` key): confirmed=green, refuted=red, pending=amber.

**Lift:**
- Closes NN-GRAPH MS0 feedback loop (operator has real labels to retrain against → addresses the AUROC=0.096 gate from G10).
- Surfaces "ghost rot" — predictions that have been pending >30d are likely false positives.
- Compounds value of every future ghost-edge prediction (we can compute precision/recall by domain).

**Effort:** M — file-walk + git log + jsonl writer + overlay client-side; ~250 LOC.

---

## G4 — Dead-pixel sweep (revive D4 from 2026-05-11)

**Symptom:** Wiki entries / dispatcher pages whose tier-1 engine is unwired. Surfaced at 2026-05-11 audit as Tier-D4, parked. Current count: unmeasured.

**Upgrade:** `system-viz-query.mjs dead-pixels` verb. Joins:
- L4 wiki pages → engine they document (by name match)
- L5 engine `wired` boolean (from BUILD_STATE)
- L3 dispatcher pages where action exists but engine import absent

Emits a punch list ranked by leverage-score.

**Lift:** Names the orphan-doc problem. Feeds cleanup or wiring queue.

**Effort:** S — one query verb + a printout; ~150 LOC.

---

## G5 — Tribal-density heatmap (revive D1 from 2026-05-11)

**Symptom:** Tribal store has ~3K tips referencing engines. Per-engine tip count is invisible on the graph.

**Upgrade:** Generator `scripts/generate-tribal-density-augmentation.mjs`:
1. Read tribal corpus (`state/shared/tribal-*.json`).
2. For each engine node, count tips that name-reference it.
3. Emit augmentation file `tribal-density-augmentation.json` consumed by `merge-augmentations.mjs`.
4. New `T` key overlay: dim engines with 0 tips, color-graduate the rest.

**Lift:** Shop knowledge density visible. Identifies under-tipped engines (= closed-loop learning gaps).

**Effort:** S.

---

## G6 — Per-slot fleet heat map

**Symptom:** 26-slot fleet has no "which slot is touching which graph region" view. Fleet-overlap is invisible until a peer-claim block fires.

**Upgrade:** Generator joins:
- `git log --author=<slot-stable-id> --since=<7d> --name-only` per slot
- file paths → fs.* nodes
- emits `slot-touch-augmentation.json` (slot → {touched_nodes, last_touch_sha})

Viewer adds slot-selector dropdown; selecting one highlights its region; selecting two shows overlap (peer-claim hazard zone).

**Lift:** Operator can see "alpha + bravo are both inside `mcp-server/src/cam/`" before picking a unit there.

**Effort:** M (git log per slot is the heaviest step; cache by day).

---

## G7 — Master-index sidecar incremental rebuild

**Symptom:** `build-graph-index.mjs` rebuilds the 110 MB sidecar full-pass on every regen. The mtime cache in `master-index-search-lib.mjs` correctly skips reload when sidecar unchanged, but the **build** itself is monolithic — small graph deltas trigger a full rebuild.

**Upgrade:** Track per-node fingerprints (`sha1(id + labels + edges)`); only re-index nodes whose fingerprint changed since last index. Persist `system-graph-index.fingerprints.json` alongside the main sidecar.

**Lift:** Incremental reindex sub-second for typical regen-viz deltas (most regens touch < 1% of nodes).

**Effort:** M.

---

## G8 — Post-commit incremental graph update

**Symptom:** `scripts/system-viz-add-node.mjs` exists and can add a single node atomically. No post-commit hook routes "files this commit added" into it. Lag between commit and visible-in-graph = whatever the cron regen interval is.

**Upgrade:** `.git/hooks/post-commit` block (companion to the existing U-PSC04 slot-task-claim release block):
1. `git diff --name-only HEAD~1 HEAD` → new files
2. For each file matching an interesting pattern (`mcp-server/src/engines/*Engine.ts`, `scripts/*.mjs`, dispatchers, hooks), call `node scripts/system-viz-add-node.mjs --file <path>` in the background.
3. Drop in `.cron-locks/.system-viz-add-node.lock` to serialize with the cron-driven regen.

**Lift:** Sub-minute lag fleet-wide between ship and visible-in-viz. Closes a freshness gap that no other layer covers.

**Effort:** M — hook + integration test + lock coordination with U-VIZ-F11-CROSS-LOCK pattern.

---

## G9 — `actEng` action→engine edges (revive C2 from 2026-05-11, BLOCKED)

**Status:** Currently 0 actEng edges in `system-graph.json` despite 6,233 dispatcher_router + 1,305 engine nodes. The `generate-action-engine-edges.mjs` generator needs a `--full` regen-viz pass; the pass currently dies under memory pressure on this host (>90% commit on 67 GB host this session).

**Path to unblock:** Either (a) refactor `generate-action-engine-edges.mjs` to stream-process (avoid loading full graph in memory — `master-index-search-lib.mjs` size cap proved this is possible), or (b) run on an idle host (multi-PC pattern from feedback_no_public_h_drive memo).

**Lift:** Enormous — the in-viewer action-surface overlay is the C2 unblock. Impact analysis upgrades from "action X is in dispatcher Y" to "action X → engine Z → its peers."

**Effort:** M-H.

---

## G10 — NN-GRAPH model gate (MS2 deferred-deploy)

**Status:** U2 lifecycle ships and auto-promotes IFF AUROC ≥ 0.78. Live AUROC = 0.096 (heterophily anti-correlation under uniform negatives). NN-1 (768-d feature swap) shipped — code-side gate clears. Next lever: **operator out-of-session retrain** with `--node-type-field layer --neg-p-hard 0.7` on the live 372K-node graph.

**Note:** G1 (type backfill) **directly accelerates G10**. Once 84% of nodes have a `type` field, the stratified negative-sampling distribution becomes meaningful (today it stratifies over `layer` only because `type` is mostly absent).

**Lift:** GNN tier-5 wiring-inference cascade wakes. UNKNOWN ghosts get auto-classified instead of falling through 4-tier cascade to LLM.

**Effort:** H — operator out-of-session run.

---

## Diminishing returns starts here

These were considered and rejected (or are open-but-low-value):

- **`Lvault` full-vault layer (D2 from 2026-05-11)** — ~14k vault nodes already in graph as `vault.*`; no new value to atomize the wikilinks now that B2 vault-graph augmentation ships.
- **Schema-evolution graph (D3)** — 1,978 schema nodes already present; consumer-edge generation never demanded.
- **Drift-flash (C4)** — milestone-envelope drift already surfaced via `/awareness-snapshot`; flashing nodes doesn't add over the existing text surface.
- **Web viewer pagination (P5 from 2026-05-16)** — remains an open question pending a Playwright measurement; ROI hinges on whether anyone uses the web viewer at scale (they don't appear to; brain viewer is the dominant surface).

---

## Suggested loop sequencing (auto-pickup order)

```
/loop  iter-2  G1 node-type backfill                # highest leverage, smallest effort
/loop  iter-3  G2 master-index query telemetry      # zero-cost data collection starts immediately
/loop  iter-4  G4 dead-pixel sweep                  # S effort, immediate cleanup payoff
/loop  iter-5  G5 tribal-density heatmap            # S effort, closed-loop learning signal
/loop  iter-6  G3 ghost-wire validation             # M effort, closes NN-GRAPH feedback
/loop  iter-7  G8 post-commit incremental update    # M effort, freshness gap
/loop  iter-8  G6 per-slot heat map                 # M effort, fleet-overlap visibility
/loop  iter-9  G7 sidecar incremental rebuild       # M effort, perf compound
                                                     # G9 BLOCKED until memory pressure subsides
                                                     # G10 BLOCKED on operator retrain
```

**Diminishing returns:** by iter-7 the remaining items are M-effort/medium-lift each — at that point the loop should evaluate whether the ROI per iter has dropped below the per-loop overhead and end voluntarily.

---

*Source of truth for the graph: `state/shared/system-viz/system-graph.json` (regen via `scripts/regen-viz.mjs`). Sidecar: `system-graph-index.json` (built via `scripts/build-graph-index.mjs`, read via `scripts/lib/master-index-search-lib.mjs`). Directive: `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`. This audit complements (does not replace) `SYSTEM-VIZ-UPGRADES-AUDIT-2026-05-16.md` + `SYSTEM-VIZ-HIGH-VALUE-FEATURES-2026-05-11.md`.*
