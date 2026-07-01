---
artifact: domain-buildout-plan
slot: sierra
galaxy: system-viz
galaxy_dir: mcp-server/src/engines/system-viz/
kienzle_pages:
  - Kienzle System Sync.dc.html
  - Kienzle Backend Wiring Map.dc.html
backend_dispatchers:
  - prism_session (master_index_query, master_index_node_status, master_index_utilization_dashboard, master_index_ranked_hybrid)
  - prism_knowledge (obsidian_viz_regenerate, obsidian_viz_status, obsidian_viz_recall_top, tribal_capture)
frontend_owner: quebec
status: draft
generated_by: sierra-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — SIERRA (system-viz)

> Finalized plan to take the system-viz galaxy to **PhD-master depth**, then **test → simulate →
> validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants · canonical
> physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope

- **Owns:** the merged system graph (`state/shared/system-viz/system-graph.json`, 370–575 MB), all
  graph regeneration scripts (`scripts/regen-viz.mjs`, `scripts/merge-augmentations.mjs`, the FAST[]
  generator suite), ghost-roost generators (dual-registered: FAST[] + splice), the master-index /
  awareness / pre-*-graph hook fleet, and the node-card cheap-read surface (`scripts/lib/node-card-offset-lib.mjs`,
  CHEAP-NODE-ACCESS-MS0). Also owns cross-substrate typed-edge schema
  (`scripts/lib/cross-substrate-edge-schema.mjs`) and the dual-registration auditor
  (`scripts/lib/viz-dual-registration-audit.mjs`).
- **Excludes:** india owns GNN model weights + retrain lifecycle (sierra owns graph + ref-pool feed
  only); golf owns fleet-reaper + orphan logic (golf queries sierra's graph, does not write it);
  tango (discovery) runs ON the graph — does not write it; no machining physics constants apply
  (infra/graph galaxy).
- **Slot worktree:** `H:/prism-slot-sierra` · branch `slot/sierra`
- **Galaxy brain:** `mcp-server/src/engines/system-viz/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD}.md`

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — 13-artifact buildout gate completed 2026-05-29 by sierra (claude-109ba448):
  SOUL + CLAUDE.md + MEMORY.md + PATHS.md + TOOLBELT.md + GSD.md + ≥10 memories + ≥5 tribal +
  `/viz-audit-sierra` skill + symmetric PSN edges + master-index back-pointer. AI-synergy audit:
  `aiEngineCount=0` (consumer galaxy — no dedicated AI engines); PSN leg #10 satisfied via shared
  galaxy-reasoning-bridge (`scripts/lib/galaxy-reasoning-bridge.mjs`).
- **Engines / dispatcher actions (verified from CLAUDE.md §2–3):**
  - 8 engine files: `MasterIndexEngine.ts`, `VizAutoAugmentationEngine.ts`,
    `GraphImportanceEngine.ts`, `RankedHybridGraphSearchEngine.ts`, `HybridIndexEngine.ts`,
    `GraphAlgorithmsEngine.ts`, `SpectralGraphEngine.ts`, `GraphTheoryEngine.ts`.
  - `prism_session` surface: 4 verified actions — `master_index_query`, `master_index_node_status`,
    `master_index_utilization_dashboard`, `master_index_ranked_hybrid`.
  - `prism_knowledge` surface: 4 verified actions — `obsidian_viz_regenerate`,
    `obsidian_viz_status`, `obsidian_viz_recall_top`, `tribal_capture`.
  - **Gap (R12):** `xproc_outcome_publish`, `xproc_kg_project_features`,
    `xproc_calibration_monitor_record` have 0 dispatcher hits — aspirational, unverified; do NOT
    cite as live wiring.
  - 4 of 8 engines absent from `ENGINE_DIGEST.md` (MasterIndexEngine, VizAutoAugmentationEngine,
    GraphImportanceEngine, HybridIndexEngine) — digest regen needed.
- **Knowledge legs (PSN 11-leg):**
  - Healthy: Engines (8 verified) · System-viz (graph = leg #6, the substrate) · Wiki (697 entries
    matching heuristic) · Memories (44 curated + 575 auto-gen node files) · Tribal (100 tips) ·
    PRISM-AI (reasoning bridge + CAG/RAG hybrid ON by default per U-FLOR-HYBRID-DEFAULT).
  - Thin: NN/GNN (sierra produces ref-pool, but GNN AUROC 0.808 only at selective-deploy; full-set
    F1 0.439 < gate) · Algorithms (H2GCN HeterophilyAwareAggregator wired via tango, but only 1
    algorithm primitive documented) · PRISM-OS (0 dedicated shop-floor actions; infra galaxy).
  - Gap: `xproc_outcome_publish` closed-loop arm UNVERIFIED (0 hits) — closed-loop leg is open.
- **Known landmines (R12):**
  1. **OOM class (preserved rail):** raw `JSON.parse`/`JSON.stringify` on the merged graph =
     exit 134 / V8 string-cap. Use `scripts/lib/{graph-io,system-viz-graph}.mjs` only. The merge
     path itself is RESOLVED (streaming I/O via `readGraphStreaming` + `writeGraphStreamingAtomic`),
     but any NEW graph code that raw-parses will OOM.
  2. **Dual-registration silent-discard:** generator in FAST[] but no merge-augmentations splice =
     ghost data silently dropped every regen. 3 echo POST-PDF roosts were silently dropped for
     months; fixed 2026-06-22. Auditor now wired as regen preflight.
  3. **Regen-verified-done gate:** "regen printed done" is not verified. Confirmed only when
     `.last-successful-regen.json` shows `pendingCount=0` AND `sidecarOk=true` AND `ts` newer than
     `.last-regen-failure.json`.
  4. **Dispatcher-id SSOT:** node ids in the graph use `disp.<file-derived>` prefix, NOT
     `dispatcher.<mcp-tool>`. Minting edges with wrong prefix = dead pixels (verified 2026-06-13).
  5. **Worktree CWD trap:** sierra CWD is `H:/prism-slot-sierra`; viz assets live in `H:/prism`.
     All scripts must use absolute `H:/prism/...` paths.
  6. **Sidecar 384 MB cap + Windows commit-reservation:** raising `PRISM_HOOK_HEAP_MB` to load
     the full 267 MB master-index sidecar re-creates the MCP-FLEET-CAPACITY commit-storm outage on
     Windows. Safe path = sidecar sharding (load only the needed shard per query), not heap bump.

## §3 — Deepening roadmap → PhD master

> "PhD master" = an engineered loop, not a one-shot. All fill-work is bounded by the loop below.

- **Tribal tips to add:** current ~100 matching heuristic; target 150. Sources: CLAUDE.md docstrings,
  regen-viz FAST[] generator comments, merge-augmentations failure log postmortems, node-card offset
  index build lessons, the 2026-06-22 dual-registration audit postmortem. Capture via
  `prism_knowledge:tribal_capture slot=sierra` (NEVER direct markdown — auto-overwritten on regen).
  Priority topics: "streaming graph I/O patterns", "FAST[] + splice dual-registration checklist",
  "node-card offset seek correctness", "ghost-roost classification confidence bands".

- **Wiki entries to write/cross-link (missing leaves):**
  - `knowledge/wiki/architecture/system-viz-dual-registration-audit.md` — the 2026-06-22 auditor
    ship: foldRoostAug class-name resolver, the 3 silently-dropped echo roosts, the +117 nodes fix.
  - `knowledge/wiki/architecture/system-viz-sidecar-sharding.md` — the 384 MB cap solution
    pattern (Windows commit-reservation context, shard-per-query design).
  - `knowledge/wiki/architecture/system-viz-cross-substrate-edges.md` — typed ADD-only edge spine:
    owned-by-slot / documented-by / embeds; current 120 edges, 34 galaxy-roost nodes.
  - `knowledge/wiki/lessons/graph-oom-prevention.md` — consolidate the V8 string-cap / exit 134
    class with remediation rules for future code authors.
  - Update existing `knowledge/wiki/architecture/system-viz-knowledge-index.md` with the 2026-06-22
    dual-reg auditor + 2026-06-15 vault-RAG-wire + 2026-06-08 obsidian vault audit findings.

- **Memories to write:**
  - `reference_sierra_dual_reg_auditor_2026_06_22.md` — foldRoostAug + 3-roost fix + auditor as
    regen preflight (canonical lesson for the FAST[]+splice invariant).
  - `reference_sierra_obsidian_vault_ops_2026_06_08.md` — vault audit verdict OPERATIONAL-WITH-GAPS,
    node-access map, remaining B/C gap ladder items.
  - `reference_sierra_cross_substrate_edges_2026_06_03.md` — 120 ADD-only typed edges, oracle
    fix (confirmed against offset oracle not rotating augmentation).

- **RAG corpus:** primary corpus is PRISM-internal (no external machining PDFs apply). Embed targets:
  this galaxy's CLAUDE.md + MEMORY.md + GSD.md + PATHS.md + TOOLBELT.md + all `scripts/lib/graph-*.mjs`
  + `scripts/lib/node-card-*.mjs` source comments + the 100 tribal tips. Route summarize/embed to
  `gpt-oss:20b` (regen diff / ghost classification) and `qwen2.5-coder:32b` (engine/lib code) per
  the Ollama-first ladder. Do NOT embed the 548 MB graph directly.

- **CAG cold-anchor:** cache this galaxy's CLAUDE.md §5 (domain gotchas / safety rails) + §7 (graph
  pipeline + query contract) as a cold CAG anchor via `scripts/lib/cag-router.mjs`. These are the
  highest-frequency reference blocks (OOM rules + regen stage order) that every sierra task re-reads.

- **NN/GNN features:** sierra produces `state/shared/system-viz/_node-embeddings.jsonl` (~555 MB) for
  india's GNN tier-5. Current gap: GNN full-set macro-F1 0.439 < 0.55 gate. Next unit =
  `U-NN-REFPOOL-REEVAL` — grow the high-confidence `ghost.unwired-engine` reference pool beyond the
  current ~62 ghosts (the binding blocker per the 2026-06-11 status in CLAUDE.md). Sierra's action:
  classify more ghost-roost candidates as confirmed-unwired to grow the pool; india retrains.

- **LoRA dataset:** this galaxy produces `system_viz_lora_train.jsonl` / `system_viz_lora_test.jsonl`
  from the `scripts/vault-to-lora-dataset.mjs` pipeline (Obsidian synthesis brain feeds LoRA). Emit
  target: 200 instruction-tune pairs (query-graph / find-node / interpret-roost / fix-dual-reg /
  explain-regen-stage-order scenarios). India trains. Promote IFF perplexity gate met.

- **Engineered loop + cron:**
  - **Nightly (22:00):** `mine-galaxy-transcripts.mjs system-viz` (Ollama `gpt-oss:20b`) →
    synthesis → append to `system-viz_synthesis.md` → trigger tribal-capture for new tips → update
    wiki leaves for changed sections.
  - **Weekly (Sunday 03:00):** `scripts/audit-viz-dual-registration.mjs --strict` → if any
    silentDiscards > 0, write advisory memory + open a slot-task claim.
  - **Weekly (Sunday 03:30):** `scripts/audit-ai-synergy.mjs system-viz` → if `discoverability`
    score < 0.80, emit a remediation task to the slot-task queue.
  - **Acceptance signal:** tribal count ≥ 150 + wiki leaves all have last-updated within 14 days +
    dual-reg audit silentDiscards = 0 + AI-synergy discoverability ≥ 0.80.

- **Ollama offload:** route regen-diff summarization → `gpt-oss:20b`; engine/lib code explain/lint →
  `qwen2.5-coder:32b`; graph-theory / GNN architecture questions → `gpt-oss:120b`. Use
  `node scripts/lib/galaxy-reasoning-bridge.mjs system-viz "<question>"` as the entry point.

## §4 — Test plan (real assertions — R9)

- **Unit (reference-value / algebraic-invariant):**
  - `GraphAlgorithmsEngine` — assert DAG topo-sort on a 5-node acyclic graph returns canonical order;
    assert SCC on a 4-node cycle returns one component; assert max-flow on a known 3-node network
    returns the hand-calculated value. No `toBeDefined()`.
  - `SpectralGraphEngine` — assert Fiedler vector on a 6-node path graph has the expected sign
    pattern (algebraic invariant: alternating signs for a path); assert Laplacian eigenvalue λ₁=0.
  - `GraphImportanceEngine` — assert personalized PageRank on a 5-node star returns hub score >
    leaf score (algebraic: hub ≥ leaf × (n-1)); assert blast-radius BFS depth matches hand-counted.
  - `RankedHybridGraphSearchEngine` — assert RRF fusion of two ranked lists with known scores
    produces the correct fused rank (k=60 formula: score = Σ 1/(k + rank_i); verified by hand for
    3-item lists).
  - `HybridIndexEngine` — assert BM25 on a 3-document corpus returns higher score for exact-term
    match vs. partial match.
  - `MasterIndexEngine` — assert `master_index_query` returns ≥1 hit for a known engine name; assert
    `master_index_node_status` returns `{id, status}` with non-null status for a seed node.

- **Integration (round-trip through dispatcher):**
  - `prism_session:master_index_query` → assert Zod schema validates; assert action enum accepted;
    assert lazy import resolves `MasterIndexEngine` without timeout.
  - `prism_session:master_index_ranked_hybrid` → assert RRF scores returned; assert result count ≥ 1
    for a known query against a test sidecar fixture.
  - `prism_knowledge:tribal_capture` → assert write succeeds; assert the tribal file is NOT a direct
    markdown write (must route through dispatcher).

- **E2E:** run `system-viz-query.mjs find MasterIndex` against the live graph → assert ≥1 hit;
  run `node-card eng.master-index` → assert card ≤ 250 tokens; run `regen-viz.mjs` on a mini test
  graph fixture → assert `.last-successful-regen.json` `pendingCount=0` post-regen.

- **Coverage floor (per template):**
  - Happy path: valid query → ranked results, valid node-id → card ≤ 250 tokens.
  - Failure mode 1 — empty query string: assert graceful empty-result, not throw.
  - Failure mode 2 — unknown node id: assert structured `{error:'NOT_FOUND'}`, not throw.
  - Failure mode 3 — graph file absent (sidecar missing): assert fallback to `find-cache.json`, not
    OOM.
  - Adversarial 1 — NaN/Infinity in score field: assert RRF fusion clamps to 0, does not propagate.
  - Adversarial 2 — 100K-node fixture (oversize): assert streaming load completes without heap OOM
    (use `readGraphStreaming`, assert success).
  - Spanning config 1 — query against `system-graph.json` (merged, 370–575 MB) via streaming path.
  - Spanning config 2 — query against `find-cache.json` (55 MB fallback sidecar).
  - Spanning config 3 — node-card seek path (offset index present) vs. cold path (index absent,
    fallback to sidecar scan).

- **Target test files:** `mcp-server/src/__tests__/GraphAlgorithmsEngine.test.ts` (new/extend),
  `mcp-server/src/__tests__/SpectralGraphEngine.test.ts` (new), `mcp-server/src/__tests__/
  MasterIndexEngine.test.ts` (new), `mcp-server/src/__tests__/RankedHybridGraphSearchEngine.test.ts`
  (new), `mcp-server/src/__tests__/system-viz-dispatcher.test.ts` (integration, new).

- **Runner:** `rtk npx vitest run -t "system.viz|MasterIndex|GraphImportance|VizAugment|RankedHybrid
  |GraphAlgorithms|SpectralGraph"` (CI gate green, no `.skip`).

## §5 — Simulation plan

- **What to simulate:** graph-query dry-run replays and blast-radius propagation simulations —
  not machining physics, but graph topology simulation against the live `system-graph.json`.

- **Tools:** `system-viz-query.mjs blast-radius <id>` (PageRank propagation);
  `system-viz-query.mjs roadmap-candidates` (pending-unit roost drill-down);
  `scripts/lib/viz-dual-registration-audit.mjs --json` (static generator audit);
  `prism_session:master_index_ranked_hybrid` (live RRF fusion smoke test).

- **Scenarios:**
  1. **Blast-radius propagation on MasterIndexEngine:** run `blast-radius eng.master-index` →
     assert N > 10 downstream consumers (this engine feeds all 26 slots — a healthy graph must show
     broad fan-out). Pass if hit count ≥ 10 and depth ≥ 2.
  2. **Ghost-roost drill-down (pending units):** run `roadmap-candidates` → assert ≥ 1 ghost roost
     returned; assert each roost has a `confidence` field ≥ 0.5. Pass if count ≥ 1.
  3. **RRF fusion consistency:** query the same term via `master_index_query` (BM25-only) and
     `master_index_ranked_hybrid` (BM25+dense RRF) → assert ranked_hybrid top-1 confidence ≥
     master_index top-1 confidence (RRF should not degrade the best single-signal result).
  4. **Dual-registration audit preflight (adversarial):** inject a synthetic generator with FAST[]
     entry but no splice block into the auditor's static scan → assert auditor flags it as
     `silentDiscards` class (P1) and does NOT require a live regen run.
  5. **Regen correctness on mini-fixture:** run `regen-viz.mjs` against a 50-node test fixture →
     assert `.last-successful-regen.json` written with `pendingCount=0` AND `sidecarOk=true` AND `ts`
     strictly newer than any pre-existing `.last-regen-failure.json`.

- **Pass criteria:** all 5 scenarios green; blast-radius depth ≥ 2; RRF top-1 ≥ BM25 top-1 (no
  regression); auditor catches the synthetic P1 silentDiscard; mini-regen produces a verified stamp.

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:**
  - Run `node H:/prism/scripts/system-viz-query.mjs headline` → report: node count, edge count,
    ghost-roost count, `sidecarOk` status. Accept if node count ≥ 100,000 (fleet-scale graph) and
    ghost-roost count ≥ 10.
  - Run `node-card eng.master-index` → assert response ≤ 250 tokens (CHEAP-NODE-ACCESS-MS0 gate).
    Reference: CLAUDE.md §7 documents "~200 tokens / ~98.7% cut" as the design target.
  - Run `master_index_query query="mill engine"` → assert ≥ 3 hits, top-1 confidence ≥ 0.6.
  - Run dual-registration audit on the live FAST[] + merge-augmentations → assert `silentDiscards=0`
    and `crashRisks=0`. (Current live state per MEMORY.md 2026-06-22: silentDiscards 0, crashRisks 0.)

- **Acceptance gates:**
  - Node-card token cost: ≤ 250 tokens (measured via `scripts/lib/node-card-schema.mjs` card-size
    assertion).
  - Dual-registration: `silentDiscards=0`, `crashRisks=0` after every regen preflight.
  - Master-index query latency: top-K results returned in ≤ 5 s on the live graph (measured via
    `system-viz-query.mjs find <term>` wall-clock; no raw JSON.parse in the hot path).
  - RRF hybrid: top-1 confidence ≥ 0.6 for a known-good query against the live graph.
  - Regen stamp: `.last-successful-regen.json` present with `pendingCount=0`, `sidecarOk=true`,
    `ts` > `.last-regen-failure.json ts` (or failure file absent).

- **Safety gate:** `prism_safety:validate_physics` does NOT apply (no physics constants; infra
  galaxy). The equivalent safety gate is the regen-merge-fail-loud guard (`regen-viz-merge-guard`):
  any merge failure must abort regen and NOT silently continue with a stale graph.

- **Parity probe:** the `master_index_query` dispatcher action result must agree with the
  `system-viz-query.mjs find` CLI result for the same query: top-3 node ids must overlap ≥ 2 of 3.

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** write graph-query results (hit rate, latency, confidence, RRF fusion scores)
  to `mcp-server/data/state/system-viz-query-outcomes.jsonl` (APPEND-only, schemaVersion field,
  one record per validation run). This is the closed-loop ledger for this galaxy.

- **LoRA:** failing queries (confidence < 0.4 or 0 hits on a query expected to find something) →
  emit an instruction-tune pair to `system_viz_lora_train.jsonl` (query → correct node-id +
  retrieval rationale). India retrains on fleet-combined LoRA dataset. Promote IFF:
  - Perplexity reduction ≥ 5% on `system_viz_lora_test.jsonl`
  - No regression on existing test suite (vitest green)

- **RAG/CAG:** after each validated tribal tip or wiki-leaf update, re-embed the galaxy reasoning
  bridge corpus (`scripts/lib/galaxy-reasoning-bridge.mjs` source docs) via the Ollama nomic-embed
  arm. Refresh the CAG cold-anchor (CLAUDE.md §5 + §7 blocks) when those sections change (any
  CLAUDE.md Edit triggers a re-anchor via the cron).

- **NN/GNN:** sierra's contribution is growing the `ghost.unwired-engine` reference pool. After each
  regen, run `scripts/seed-ghost-from-unwired.mjs` to emit newly-classified ghost nodes. India's
  self-retrain lifecycle fires weekly (`U-NN-RETRAIN-LIFECYCLE`) and promotes IFF AUROC ≥ 0.78 /
  macro-F1 ≥ 0.55 / Brier ≤ 0.15 (gates unchanged per CLAUDE.md §NN-GRAPH).

- **Trigger + cadence:** validation outcomes ledger checked nightly by the mining cron. LoRA pair
  emission fires when validation run produces ≥ 5 new failing-query records. GNN ref-pool grows on
  every regen (automatic via `seed-ghost-from-unwired.mjs`). India's retrain fires weekly.

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle pages:**
  - `Kienzle System Sync.dc.html` — data-flow graph showing jm-data.js as hub; 4 "change one thing"
    scenarios (SIG cavity feeds, D2 kc1.1 recalibrate, add 13th machine, new customer); animated
    SVG edges; right panel showing affected screens + correlation guarantee.
  - `Kienzle Backend Wiring Map.dc.html` — backend dispatcher + route wiring map showing which
    prism_* actions back each screen; the sierra-owned data this page consumes is the master-index
    node graph (which engines/dispatchers are wired vs. ghost).

- **Target React page(s):**
  - **New page (genuinely new functionality):** `mcp-server/web/src/pages/SystemSyncPage.tsx` — no
    existing page matches; `IndexGateway.tsx` is an auth gateway; WireEdm* pages are EDM-domain.
    The System Sync concept (change-propagation graph + scenario picker) is net-new.
  - **Reuse:** pull shared layout shell from the existing `ShellGatewayPage` nav structure; reuse
    the `<MobileSafeArea>` wrapper, `<ResponsiveTable>` for the affected-screens list on narrow
    viewports, and the `prism-chip` / `prism-spectrum-fill` CSS classes from `CalculatorPage.tsx`.

- **Backend wiring (sierra owns this; quebec owns the React layer):**
  - `prism_session:master_index_query` — powers the scenario node-list (which engines/screens exist
    and are wired). The SVG hub-and-spoke graph is driven by live node data, not hardcoded.
  - `prism_session:master_index_utilization_dashboard` — powers the "SCREENS CORRELATED" counter in
    the header (live count of correlated/wired nodes vs. ghost nodes).
  - `prism_session:master_index_ranked_hybrid` — powers the "affected screens" right-panel: given a
    selected scenario (e.g. "D2 kc1.1 recalibrated"), run a hybrid search for nodes downstream of
    the changed data key; return ranked affected screens.
  - `prism_knowledge:obsidian_viz_status` — powers the "IN SYNC" / out-of-sync status badge in the
    header (real-time regen health from `.last-successful-regen.json`).
  - Express route (`:3100`): `POST /api/v1/system/sync/scenario` → `master_index_ranked_hybrid` with
    the scenario's changed data key as the query; returns affected node list. Confirm route exists or
    wire it in `mcp-server/src/routes/systemRoutes.ts`.
  - API client: `mcp-server/web/src/api/systemApi.ts` (new thin wrapper around the fetch bridge).

- **Design language (iOS fleet + Calculator Studio accent):**
  - Dark base `#070809` / `#0A0B0D` (matches the `.dc.html` exactly — already PRISM-canonical).
  - Orange accent `#FF5A2B` / `#FF7A4D` for the hub node + "touched" edges (matches `.dc.html`; maps
    to `var(--accent-orange)` token from `DESIGN.md` — never inline the hex).
  - Emerald `#36D399` for the "IN SYNC" badge (maps to `var(--status-emerald)`).
  - JetBrains Mono for all counters / status text / node labels.
  - Animated SVG edges: CSS `stroke-dashoffset` animation (already in `.dc.html` as `kzdash`) —
    implement in React with `<svg>` + `<line>` elements driven by state; honor
    `prefers-reduced-motion` (pause the animation, show static dashed lines).
  - Tap targets ≥ 44pt: scenario picker cards (`padding: 11px 13px`) need `min-height: 44px` on
    mobile; right-panel list items need `min-height: 44px` touch target.
  - `<MobileSafeArea>` wraps the full page; bottom-tab nav (not hamburger) on mobile.

- **Build/verify loop:**
  1. Edit `SystemSyncPage.tsx` + `systemApi.ts` + `systemRoutes.ts`.
  2. `/run` → Playwright MCP screenshot at:
     - Desktop 1440×900 (main SVG graph panel + right panel side-by-side).
     - iPhone 14 390×844 (SVG graph stacks above scenario list; affected panel is a bottom sheet).
     - Pixel 7 412×915 (Android Material 3 nav rail variant).
  3. Compare to `.dc.html` intent: hub node visible, edges animate on scenario select, affected
     screen list updates, "IN SYNC" badge reflects live regen status.
  4. Iterate on gaps; re-screenshot until 3-viewport match.

- **Acceptance:** page renders at `:3100`; live `master_index_ranked_hybrid` data round-trips for all
  4 built-in scenarios; "IN SYNC" badge reflects real `obsidian_viz_status`; parity with backend
  (§6 parity probe passes); 3-viewport screenshots match `.dc.html` design intent.

## §9 — Dependencies & sequencing

- **Blocked by:**
  - India for LoRA retrain (india trains on the `system_viz_lora_train.jsonl` sierra produces).
  - India for GNN retrain (ref-pool growth from sierra's `seed-ghost-from-unwired.mjs` is a
    prerequisite for india's AUROC gate).
  - Quebec for React implementation of `SystemSyncPage.tsx` (sierra owns backend; quebec owns UI).
  - Express route `POST /api/v1/system/sync/scenario` must be wired before the frontend can call it
    (sierra wires the route in the same commit as `SystemSyncPage.tsx` backend hook).

- **Blocks:**
  - Tango (discovery) depends on a correct, up-to-date `system-graph.json` for ghost-node discovery.
  - All 26 slots depend on `master_index_query` latency being ≤ 5 s (fleet-wide search substrate).
  - Golf depends on the graph for orphan/utilization classification.
  - India GNN tier-5 depends on sierra's ref-pool + `_node-embeddings.jsonl` freshness.

- **Logical order (R13):**
  1. Fix open landmines (dual-reg 3 remaining advisories, ENGINE_DIGEST entries for 4 missing engines).
  2. Write/update wiki leaves + memories (§3) — knowledge substrate before test writing.
  3. Write and green the unit + integration tests (§4) — proven core before simulation.
  4. Run simulation scenarios (§5) — graph topology validated before live-data.
  5. Run live-data validation (§6) — gates met before closing the fine-tune loop.
  6. Instrument outcome ledger + emit LoRA pairs (§7) — retrain loop armed after validation.
  7. Build `SystemSyncPage.tsx` + `systemRoutes.ts` + `systemApi.ts` (§8) — frontend last;
     never atop an unproven backend.

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: all 4 missing engines added to `ENGINE_DIGEST.md`; `SystemSyncPage.tsx` route wired in
  `App.tsx` + `systemRoutes.ts`; `systemApi.ts` client wired to dispatcher; tribal captures routed
  through `prism_knowledge:tribal_capture` (no direct markdown); dual-reg audit wired as regen
  preflight (already landed 2026-06-22 — verify still wired after any regen script edits).
- [ ] TEST: all 5 test files green (GraphAlgorithmsEngine, SpectralGraphEngine, MasterIndexEngine,
  RankedHybridGraphSearchEngine, system-viz-dispatcher integration); happy + ≥3 failure + ≥2
  adversarial + ≥3 spanning configs; no `.skip`; CI gate green.
- [ ] VALIDATE: live-data numbers reported (node count ≥ 100K; node-card ≤ 250 tokens; top-1
  confidence ≥ 0.6; regen stamp verified; dual-reg audit silentDiscards=0).
- [ ] APPLY: deepening cron live (nightly mining + weekly dual-reg audit + weekly AI-synergy audit);
  LoRA outcome ledger armed; `SystemSyncPage.tsx` rendering live data at `:3100`; 3-viewport
  screenshots match design; parity probe passing.
- [ ] Per-file 2-arm scrutiny on every new code file + 3-of-3 Stop gate on the session.
