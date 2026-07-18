# SIERRA SYSTEM-VIZ + OBSIDIAN-BRAIN ASSESSMENT — 2026-05-29

> Owner: **sierra** (system-viz galaxy). Source: 7-dimension adversarial recon (wiring-gaps · dormant-underutilized · obsidian-brain-gaps · bridge-synergy · high-roi-features · viz-graph-health · integration-pipeline). Every claim below is **confirmed or partial** — refuted findings are quarantined in §5 so the next session does not chase them.
> Live anchors verified at write time against `state/shared/BUILD_STATE.json` + `state/shared/system-viz/architecture-graph.json` (schemaVersion 2.1.0): **3,734 engines · 3,616 wired · 118 unwired (97% coverage) · 191–192 milestone drift · 2 pending FE merges · 50,114 graph nodes / 154,528 edges · vault: 11,316 memories + 38,277 wiki + 16,881 broken wikilinks (44%) · 79 worktrees (27 KEEP).**

---

> **⚠ SIERRA QC CORRECTION (post-synthesis, 2026-05-29 — authoritative over §1/§2-row1/§3.1/§4):** The synthesis over-simplified the #1 move. Registering the 7 generators is **NOT a ~10-line `FAST[]` edit** — that naive framing was diagnosed and DISPROVED earlier this session ([[reference_sierra_regen_fast_registration_gap_2026_05_29]]). Verified reality: the FAST[] runner *spawns* each script, but these generators (a) have no runner / write to `staging/` or an `augmentations/` subdir, NOT VIZ_DIR root, and (b) are NOT in `merge-augmentations.mjs`'s `loadOptional` list. So each of the 7 needs **a runner writing to VIZ_DIR root + a NEW bespoke merge `loadOptional`+splice block** (key conventions differ: hotel/quoting use `newNodes/newEdges`; svi-component/vendor-catalog use `nodes/edges`; svi-component nodes also lack the `ghost/status/parent` roost fields → shape-normalize). The 2 already shipped (quoting + hotel) prove this: quoting's splice pre-existed; **hotel only needed a `staging/`→root path-fix** (its runner was already in FAST[]). **Also: `generate-business-frontend-features.mjs` is a PHANTOM** — it does not exist and is referenced nowhere; `ghost.business_frontend` is already emitted by `generate-hotel-domain-features.mjs`. There is no "missing 8th"; it is exactly **9 total = 2 done + 7 remaining** (U-VIZ-FAST-REGISTER-9). **Bug found+fixed during this QC:** `run-hotel-domain-features.mjs` was DUPLICATED in `FAST[]` (ran hotel twice/regen) — de-duplicated. Everything else in this report stands.

---

## 1. Executive summary

System-viz is **structurally complete and trustworthy at the headline level** but **leaky at the edges**. The graph reaches Ψ≈1.0 reachability (50,114 nodes, 99% of them L10 filesystem leaves), the coverage math is honest (97% wired), and the canonical writer (`regen-viz.mjs`) is the one true source. The brain (Obsidian memory + wiki) is **mechanically healthy** — the C:→H: sync mirrors all ~1,093 memory files into the galaxy-routed vault, so the "930 orphans / PSN leg-1 broken" alarms are **false** (refuted). But three real lesions persist: (a) **sierra's own regen pipeline is dropping 7 working domain generators** — they exist on disk, produce graph nodes, and are simply not registered in `FAST[]`, so 7 domains (galaxy, hermes-zebra-ops, milling-tribal, psn-health, sfc-variability, svi-component, vendor-catalog) are **invisible in the viz**; (b) the **wiki hyperlink graph is 44% broken** (16,881 of 38,277) and 68% of wiki files have **no tribal embedding**; (c) **93 dead-pixel nodes** carry zero edges, violating the dead-pixel guard sierra owns.

**The single biggest opportunity** is the one sierra is uniquely positioned to ship today, in one commit, at near-zero risk: **register the 7 orphaned `FAST[]` generators** (`U-VIZ-FAST-REGISTER` follow-on). This is a ~10-line edit to `scripts/regen-viz.mjs` that lights up 7 entire domains in the system map, unblocks the NN-GRAPH reference-pool starvation (poolSize=0 is partly because regen hasn't surfaced these domains), and is the prerequisite for every downstream "find the gap" query the rest of the fleet runs. Everything else (118-engine wiring, GNN tier-5, brain integration) depends on the viz being complete first — and only sierra owns the writer.

---

## 2. TOP 20 opportunities (verified, deduplicated, ROI-ranked)

ROI = impact/effort. Deduplicated across all 7 dimensions (the 118-unwired finding appeared in 5 dimensions; the Speed/Monolith/Creo/Wet/Embedding domain gaps appeared in 3–4 each — collapsed to one row each). `owner-slot` follows the canonical galaxy↔slot map.

| # | Title | kind | impact | effort | owner-slot | Concrete next action |
|---|-------|------|--------|--------|-----------|----------------------|
| 1 | **Register 7 orphaned `FAST[]` generators** (+1 missing to build) | wiring-gap | high | low | **sierra** | Edit `scripts/regen-viz.mjs` `FAST[]` (after the `generate-quoting-pipeline-features` line) to add `generate-galaxy-features`, `generate-hermes-zebra-ops-features`, `generate-milling-tribal-tip-bridge-features`, `generate-psn-health-features`, `generate-sfc-variability-features`, `generate-svi-component-features`, `generate-vendor-catalog-features`. Verify each emits `newNodes/newEdges` keys consumable by `merge-augmentations.mjs loadOptional()`. Then `node scripts/regen-viz.mjs --fast`. Defer/stub `generate-business-frontend-features.mjs` (MISSING on disk). |
| 2 | **Wire Speed domain (5 engines → `prism_sp`/`disp.spdispatcher`)** | wiring-gap | high | low | oscar | Single batch: `SpeedFeedBaselineComparatorEngine`, `SpeedFeedChatterStabilityAdapterEngine`, `SpeedFeedDownstreamSubscriberEngine`, `SpeedFeedExhaustiveCombinationEngine`, `SpeedFeedPSNDecisionPriorEngine` → `disp.spdispatcher` (exists). Brings Speed 74%→100%. `node scripts/wire-batch-engines.mjs --domain Speed --dispatcher disp.spdispatcher`. |
| 3 | **Wire `UnifiedProgramParserEngine` (62KB, largest single orphan)** | high-roi-feature | high | low | echo | Wire to `prism_post` (or new `prism_post_unified_parser` library service). Unlocks format-agnostic program handling across 60+ wired post engines. Check `PostProcessorVerificationOrchestratorEngine` as first consumer. |
| 4 | **Wire Creo domain (3 engines, 25%→100%)** | wiring-gap | high | low | delta | `CreoAddinRibbonEngine`, `CreoIntegrationTestSuiteEngine`, `CreoToolkitBridgeEngine` → `prism_cad` (+ new `prism_cad_creo` sub-dispatcher modeled on the 11-action Fusion360 dispatcher). Lowest-coverage CAD domain; enterprise unlock. |
| 5 | **Wire Monolith catalog registries (5 engines, 71%→100%)** | bridge-potential | high | medium | foxtrot | `MonolithFixtureDatabaseEngine`, `MonolithHyperMillFixtureDatabaseEngine`, `MonolithSurfaceFinishDatabaseEngine`, `MonolithToolTypesDatabaseEngine`, `MonolithWorkholdingDatabaseEngine`. Split by type: lookup→`prism_data`, safety-relevant→`prism_safety`. Run reverse-dep trace first (`/system-viz-query blast-radius MonolithToolTypesDatabaseEngine`). These feed stage-8 FIXTURE_DESIGN + stage-22 WORKHOLDING. |
| 6 | **Run `/envelope-sync` to reconcile 191–192 drifted milestones** | brain-gap | high | low | **sierra**/golf | `node scripts/build-milestone-progress.mjs` then flip clear cases (e.g. `CLI-MS0` 22/22 shipped but claimed `not_started`; `SCIMATH-MS0..MS7`). Gate ambiguous flips behind `/close-out-audit`. Restores roadmap trust for the whole fleet. |
| 7 | **Wire Embedding-safety + vector-store (4 engines)** | high-roi-feature | high | medium | india/golf | `EmbeddingGuardEngine`, `EmbeddingFilterEngine`, `LocalEmbeddingEngine`, `QdrantVectorStoreEngine` → new `prism_ai_safety` (`embedding_guard_check`, `embedding_filter_redact`, `vector_store_lookup`). Pre-dispatch hook routes AI-orchestrator output through the gate. Also unblocks NN-1 768-d vector load (`knowledge/wiki/architecture/_embeddings.jsonl`). |
| 8 | **Wire Infra/DevOps resilience cluster (8 engines)** | wiring-gap | high | medium | golf | `BackupRestoreDrillEngine`, `DisasterRecoveryEngine`, `ChaosDrillSchedulerEngine`, `TenantOnboardingRunbookEngine`, `TriLevelKillSwitchEngine`, `SBOMReviewEngine`, `LokiLogSinkEngine`, `HzpDashAuditEngine` → new `prism_infra_resilience`. Wire in dep order: kill-switch → backup/DR → tenant-onboarding → observability. |
| 9 | **Repair top 20% of 16,881 broken wikilinks (~3,376 rename/typo)** | viz-health | medium | high | **sierra** | `node scripts/wiki-hyperlink-audit.mjs --output WIKI-COVERAGE-AUDIT.json` to categorize (rename/delete/typo/drift), then automated find-replace on the rename/typo class. Establish monthly 1%-sample re-validation SLA. |
| 10 | **Wire CAD/multi-format bridges (NX + Onshape + Rhino, 4 engines)** | integration-gap | medium | medium | delta | `NXOpenAssemblyDrawingEngine` (40KB), `OnshapeAPIBridgeEngine`, `OnshapeLiveCollabAdapter`, `RhinoCommonBridgeEngine` → new `prism_cad_multiformat`. Onshape 0%, Rhino 50%. Expose as pluggable CAD-source strategy. |
| 11 | **Wire Wet (WEDM) run-control trio (3 engines, 80%→100%)** | wiring-gap | high | medium | mike | `WetRunStateMachineEngine`→`disp.diagnosisdispatcher`, `WetRunChangeFreezeEngine`→`disp.feasibilitydispatcher` (pre-run gate), `WetRunRetentionPolicyEngine`→data-persistence dispatcher. Unblocks stage-16 MACHINE_RUN state transitions. |
| 12 | **Triage the 22 `UNKNOWN`-dispatcher orphans into 4–5 families** | brain-gap | medium | medium | tango→romeo | Read lines 1-50 of each (`PRISMIntelligenceLayer`, `OpusCapabilityEngine`, `ToolDatabaseDeepLearningEngine` 53KB, `FormalVerificationEngine`, `ModelAttributionEngine`, `SemanticAssetIndexEngine`…). Group: embedding→`prism_ai_safety`; formal/codegen→`prism_code:safety_gate`; ML/reasoning→`prism_ai`/`prism_intelligence`. Create `U-DISPATCHER-INFERENCE-REVIEW`. |
| 13 | **Wire AI-client bridges (5 ext-LLM engines)** | brain-gap | medium | medium | india | `CodexClientEngine`, `GeminiClientEngine`, `GrokClientEngine`, `GrokCLIClientEngine`, `DeepSeekClientEngine` → new `prism_ai_clients`. Grok domain is 0% wired. Gives the 3-tier AI bridge multi-model resilience (currently Claude-only). |
| 14 | **Wire Test/Validation cluster (4–5 QA engines)** | dormant-node | medium | low | golf | `MastercamHeadlessIntegrationTestEngine`→`prism_cam`+`prism_test` (dual), `PactContractTestEngine`, `MeasurementSystemAnalysisEngine`, `RegressionBaselineEngine`, `CreoIntegrationTestSuiteEngine`→`prism_test_integration`. Completes regression-gate automation. |
| 15 | **Activate precision-engine cluster (22 sub-µm actions, wired-but-never-called)** | dormant-node | high | medium | november/oscar | Wire `acc_thermal_error`→`post_inject_motion`; `acc_volumetric`→`cad_machine_capability_get`. 67 CAM-strategy files call ZERO `diamond_turning_*` actions today. Unit `U-PRECISION-ENGINE-ACTIVATION`. Code is done — pure cross-wiring. |
| 16 | **Stratify the 26 wiring units by mfg↔AI flow direction** | wiring-gap | medium | low | tango | Add a `flow` column to `ROADMAP-CONSOLIDATED.md` wiring table (A: mfg-internal / B: mfg→AI / C: AI→mfg) + `Priority` (HIGH if it unblocks a deep-integration bridge, e.g. SFC→CAM needs the 5 Speed engines reachable first). Guides romeo's queue. |
| 17 | **Adopt the leverage-ranked wiring queue as a tracked 2-week sprint** | bridge-potential | high | low | golf/zebra | `LEVERAGE-WIRING-QUEUE.md` (regenerated 2026-05-29) ranks all 118 but no slot tracks progress. Create `WIRING-SPRINT-MS0`: 5 parallel slots claim MiscDomains/Other/Monolith/Hyper/Wet, mark ✓ as wired. ~2 weeks → 99% coverage. |
| 18 | **Resolve 2 pending FE merges (cqask + mcp-cadquery)** | integration-gap | high | medium | quebec | Decide port-to-App-Router vs iframe-sandbox. `fe.cqask` (Next 13 → React 18 align), `fe.cadquery` (Vite/React19/Three.js → CAD viewer page). Gate on Tier-1-3 wiring <10% gap. Unblocks autonomous-CAD product tier. |
| 19 | **Sweep 93 dead-pixel nodes (zero in + zero out edges)** | dormant-node | high | medium | **sierra** | `node scripts/system-viz-dead-pixel-detector.mjs` to enumerate (`core.migrations`, `core.hooks_cl`, `core.scripts`, `core.skills`, `kn.wikiidx`, `fs.box`…). Classify ghost/fs-leaf/core; wire core nodes to ≥1 edge; filter stale leaves; add fail-loud reject at merge (Karpathy R12). |
| 20 | **Adopt the 11 ALGO-SYNERGY primitives into CAD/CAM/blueprint brains** | high-roi-feature | high | low | kilo/delta/xray | Reuse, not build: kilo adds `ml_viterbi` (toolpath N-best decode); delta adds `spatial_ransac_fit`+`ml_pca` (robust edge extraction); xray adds `ml_knn` (confidence-similarity lookup). All invokable via `prism_algorithm` (wired by tango 2026-05-29). |

---

## 3. The 5 highest-leverage moves sierra is uniquely positioned to make

These require ownership of the **regen-viz writer, the architecture-graph, and the dead-pixel/SVI doctrine** — no other slot can or should make them.

### 3.1 Register the 7 orphaned `FAST[]` generators *(the #1 move — ship first)*
**Why only sierra:** `scripts/regen-viz.mjs` is the single canonical graph writer; it is high-contention peer-claimed real estate that only the system-viz owner edits.
**Step:** In `scripts/regen-viz.mjs`, locate the `FAST = [ … ]` array (currently ~39 `generate-*` entries) and the comment `U-VIZ-FAST-REGISTER (sierra 2026-05-29)`. Append the 7 confirmed-on-disk orphans:
```
generate-galaxy-features
generate-hermes-zebra-ops-features
generate-milling-tribal-tip-bridge-features
generate-psn-health-features
generate-sfc-variability-features
generate-svi-component-features
generate-vendor-catalog-features
```
For each, open the generator and confirm its output key matches what `merge-augmentations.mjs loadOptional()` consumes (`newNodes`/`newEdges` vs `nodes`/`edges`) — this is the one runtime risk. Then `node scripts/regen-viz.mjs --fast` and diff node-count delta per domain. `generate-business-frontend-features.mjs` is MISSING — create from template or log a deferral; do not silently skip.

### 3.2 Build the **Obsidian-brain semantic layer (L7)** into the graph
**Why only sierra:** The graph schema and layer assignment are sierra-owned. Today `meta.vault.memories=11,316` and `wiki=38,277` are counted but exist as **L11 fs-leaves with zero cross-layer edges to L5 engines** — the brain is in the graph as files, not as a queryable knowledge layer.
**Step:** Add an L7 `obsidian-brain` node group (subgroups: memories, wiki-entries, tribal-tips). Emit edges from L5 engines to their `reference_<engine>.md` memory (e.g. `reference_system_viz.md → SystemVizEngine`). Add a roost generator `generate-obsidian-brain-features.mjs` and register it in `FAST[]`. Surface `/system-viz find obsidian-brain-gaps` (currently returns 0 results — the command literally doesn't resolve). This makes "which engines lack memory backing" a graph query instead of a grep.

### 3.3 Sweep the 93 dead-pixel nodes + install a fail-loud merge guard
**Why only sierra:** The dead-pixel guard ("every node carries ≥1 edge") is a system-viz doctrine sierra enforces.
**Step:** `node scripts/system-viz-dead-pixel-detector.mjs` → emit `DEAD-PIXEL-AUDIT-2026-05-29.md`. For each of the 93: ghost/archived → confirm intentional; fs-leaf (L10/L11) → filter if stale; core-infra (`core.migrations`, `core.scripts`, `kn.wikiidx`) → wire to parent. Then patch `merge-augmentations.mjs` to **reject** isolated nodes at commit time (R12 fail-loud), so dead pixels can never re-accumulate silently.

### 3.4 Publish the **architecture-only filtered view** (collapse the 49,593 L10 leaves)
**Why only sierra:** The viz renderer and default-view policy are sierra-owned. 98.96% of nodes are filesystem leaves; the true architecture (personas/dispatchers/engines/registries, ~521 nodes in L0–L9) is buried under a 96:1 file-node ratio, making the map useless for strategic decisions.
**Step:** Add an "architecture" overlay that collapses L10 into parent L9 roosts and renders only L0–L9 (~500–1000 nodes). Keep the full graph for forensics behind a "detailed" toggle in `graph.html` (~200–300 LOC). Make `architecture` the default `/system-viz` view.

### 3.5 Close the **india→sierra reciprocal PSN edge** + instrument regen cost
**Why only sierra:** sierra produces the graph india trains on; only sierra can consume india's learned outputs back into node-ranking. Today the edge is one-way (sierra→india), and sierra's graph-regen (the dominant 30–50s / large-file cost path) is unmetered.
**Step (edge):** In sierra's node-stratification, ingest india's `graph_heterophily_aggregate` / NN-GRAPH confidence to **re-rank unwired-engine discovery priority** (surface highest-confidence gaps first). **Step (cost):** Segment `regen-viz` into phases (discovery-emit, index-merge, layout, serialize), tag each with token + wall-clock cost so alpha's token-optimization oracle can gate sierra's replan cadence. This makes sierra cost-conscious instead of on-demand and closes the feedback loop sierra→india→sierra.

---

## 4. Dormant high-value capabilities to revive

| Capability | State | Activation step |
|-----------|-------|-----------------|
| **NN-GRAPH GNN tier-5** | DORMANT by **data**, not code. Checkpoint trained 2026-05-16 (30 epochs, 20,460 nodes), AUROC 0.0961 vs 0.78 gate, `NN-EVAL.json deferred:true poolSize:0`. Auto-promotion already wired. | **Run a regen pass that surfaces ≥2 high-confidence reference ghosts** — moves #1 and #3.2 above directly grow the pool. Then `node scripts/lib/nn-graph-eval.mjs --checkpoint state/shared/nn-graph/graphsage-checkpoint.json`. For the deeper fix, at a <90% commit window run `node scripts/lib/graphsage-train-pipeline.mjs --embedding-source knowledge/wiki/architecture/_embeddings.jsonl` (NN-1 768-d swap, vectors already exist). **Blocker:** `graphsage-train-pipeline.mjs` imports `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` from `graphsage-trainer.mjs` but those exports are absent (`U-NN-TRAINER-EXPORT-RESTORE`) — restore exports first. |
| **7 un-rendered roosts** (galaxy, hermes-zebra-ops, milling-tribal-tip, psn-health, sfc-variability, svi-component, vendor-catalog) | All on disk, ORPHANED from `FAST[]`. | **Move #3.1** — register in `FAST[]`. Zero new code (except the 8th, `business-frontend`, which is MISSING). |
| **5 claude-flow HARVEST tools** | Documented as "real leverage" but unused in any pipeline. `node-embeddings-768d.jsonl` (6.9MB) exists. | (1) Add `embeddings_rabitq_search` as first-pass filter in `master_index_query` when `NN-GRAPH.poolSize≥2` (32× compression → 100M-node graph in 3.2GB vs 50GB OOM); activate `PRISM_HARVEST_RABITQ_ENABLE=1`. (2) Wire `agentdb_graph-pathfinder` (spectral-sparsify) as leverage-rank tie-breaker. (3) `aidefence_scan/has_pii` into email/webhook intake (zero PII gate today). (4) `managed_agent_create` for multi-hour bakes surviving /compact. (5) `hooks_route` Tier-1 (Agent Booster, 0ms/$0) for var-to-const / add-types refactors. |
| **Master-index → memory vault** | `master_index_query` queries graph+wiki but NOT the 1,093-file memory vault; users fall back to grep. BM25 sidecar built (`U-MEMORY-INDEX-SIDECAR`, 2026-05-20) but wiring into the dispatcher unverified. | Add a `memory_index_search` action to `prism_session:master_index_query` that queries the sidecar; compose `[system_viz, wiki, memory]` merged by rank. (partial — confirm sidecar→dispatcher wire exists.) |
| **DEA-MS0 roadmap (616 units)** | Designed 2026-05-22 (slot:november), PSN-SYNERGY pattern proven (9 engines/1 session), but no active slot-binding. | Claim in slot:november. Phase 0 = the top-3 wiring domains (Other 22 + Speed 5 + Monolith 5 = 32 engines). Template: `U-MULTI-WIRE`. |
| **Precision-engine cluster (22 actions)** | Wired into dispatcher boilerplate but **never called engine-to-engine**. | Move #15 — `acc_thermal_error`→`post_inject_motion`, `acc_volumetric`→`cad_machine_capability_get`. |
| **TIER-B dormant daemons** | B1 Ollama daemon dead, B2 prompt-rewriter 100% skip, B3 NN/GNN AUROC ungraded, B4 system-viz regen exit-134 (V8 OOM), B6 loop-state CLI flag mismatch, B7 MEMORY-ARCHIVE never query-surfaced. (**B5 audit-mcp-route-takerate.mjs EXISTS** — that sub-claim is refuted.) | Per-item revive: restart/justify Ollama; debug prompt-rewriter skip; reschedule AUROC eval; the regen OOM is mitigated by `regen-viz-merge-guard.mjs` — confirm it's armed; align loop-state CLI flag; surface MEMORY-ARCHIVE via a `/query` action. |

---

## 5. Refuted / low-value — DO NOT pursue

The next session must not re-open these. Each was adversarially checked against live data and failed.

| Claim | Verdict | Refutation |
|-------|---------|-----------|
| **"77 unwired engines in the Other domain"** | refuted | `BUILD_STATE` shows Other at **22** unwired, not 77. The 77 conflated two different counting taxonomies (BUILD_STATE's 22 vs an AWARENESS-SNAPSHOT 520/643 figure). Use 118 total / 22 Other. |
| **"930 orphan memory files (85%) never indexed / PSN leg-1 broken"** | refuted | C: has ~1,093 `*.md`; `obsidian-memory-sync.mjs` copies **ALL** except `MEMORY.md` into H: galaxy-routed dirs (H: vault = 11,378 files). No orphaning — the claim confused the C: flat namespace with the H: type/galaxy-routed namespace. The brain auto-feed works (throttled 3min). |
| **"MEMORY-RECENT.md is orphaned / 11 MEMORY.md links missing"** | refuted | `H:/prism/state/shared/MEMORY-RECENT.md` exists (20.8KB, 91 lines) and is intentionally there (compressed recent-work index per U-MWO02), NOT meant to live in C: memory/. Correct architecture, not a gap. |
| **"No memory-file lifecycle governance — 930 orphans prove it"** | refuted | The 930-orphan premise is false (above), so the proof collapses. (The underlying *concern* about archival SLA is unproven, not disproven — leave it as a low-priority open question, not a task.) |
| **"980 ghost nodes / 9,314 orphan nodes in architecture-graph"** | refuted | Current `architecture-graph.json` (50,114 nodes) carries **no** `status='ghost'` or orphan classification — those counts came from a 2026-05-23 `system-viz-query` run with different (L9-excluded) filtering. Use the live graph, not the stale AWARENESS-SNAPSHOT numbers. (Note: the **93 zero-edge dead-pixels** in §3.3 ARE real and separately confirmed — do not conflate.) |
| **"259 milestones drifted (claimed vs derived)"** | refuted (as stated) | The *259* figure and the claimed/derived field shape don't exist in current `MILESTONE_PROGRESS.json`. The real, confirmed drift count is **191–192** (move #6). Pursue 192, ignore 259. |
| **"Speed/Feed: 8 engines wired to prism_calc + 6 SFC→CAM bridges pending"** | refuted | No `SpeedFeedOrchestrator`/`SfcCamBridgeEngine` found; `Sfc` domain shows 4 engines 100% wired. The **5 unwired Speed engines** (move #2) are the real item — different domain, different action. |
| **"Feature-gap audit (forge-audit-v2) tracked but not consolidated"** | refuted | No `FEATURE-GAP-AUDIT-*.md` artifact exists; only a ghost-node reference + scattered wiki entries. Nothing to consolidate. Low value — skip. |
| **"NN-graph retrain artifacts (AI-NN-WIRING-OPPORTUNITY-MAP / NN-EVAL) don't exist"** | refuted-of-a-refutation | One dimension's verifier couldn't find these and refuted them; sierra **directly confirmed** `NN-EVAL.json` (`deferred:true, poolSize:0, trainedAt 2026-05-16`) at write time. The NN-GRAPH tier-5 revival in §4 is **real** — that dimension's refutation was a false negative (it searched the wrong paths). |

**Partial (real but scoped narrower than stated):** broken-wikilink *specific 15 targets* (system-level 16,881 is confirmed; per-file list unverified) · per-domain tribal % (1.1/5.3/9.6 — overall 68% confirmed, per-domain unverified) · worktree count "51" (actual **79**, but the churn phenomenon is real) · master-index→memory wiring (sidecar exists; dispatcher wire unconfirmed).

---

## 6. Coverage gaps — what this assessment could NOT reach

1. **Merged 548MB `system-graph.json`** — never parsed (OOM exit-134 risk). Per-engine leverage, full reverse-dependency graphs, and exact ghost/orphan degree-distributions are domain-granular only (from `architecture-graph.json` 51MB + `LEVERAGE-WIRING-QUEUE`). Use `/system-viz-query blast-radius <id>` per-node instead of a full parse.
2. **NN-GRAPH node-wise embedding coverage** — cannot confirm which of 372k nodes have 768-d vectors in `_embeddings.jsonl` without a full traversal. `poolSize=0` confirms regen hasn't surfaced the reference ghosts; the pool cannot grow without a regen pass (moves #3.1/#3.2).
3. **3-tier AI bridge ghost-vs-built status** — `AI-NN-WIRING-OPPORTUNITY-MAP.md` itself notes it did not verify which bridges are ghost vs built.
4. **`needs_wiring=118` vs a "667" domain-scan figure** — schema/counting difference unresolved. 118 is the canonical BUILD_STATE number; the 667 appears in one dimension's node-script output and could not be reproduced from any artifact.
5. **2 frontend merge conflict states** — `cqask` + `mcp-cadquery` codebases exist but merge-conflict / React-version-reconciliation state not audited.
6. **79 worktrees** — only the status histogram (27 KEEP / 26 MERGE / 1 PRUNE / 25 INVESTIGATE / 11 DRAINED / 15 PARKED, base `origin/cad-fusion-live-ms0`) is known; the 25 INVESTIGATE branches' commit-readiness was not individually audited.
7. **Runtime telemetry** — no per-action invocation/call-rate log exists. Dormancy of `master_index_query`, precision actions, and HARVEST tools is inferred from graph degree + dispatcher routing, not measured consumption.
8. **MCP availability variance** — `prism_memory:semantic_search` was DOWN in at least one 2026-05-29 session (galaxy brains fell back to keyword pull). Cross-galaxy semantic recall reliability could not be measured; recommend a per-galaxy `<galaxy>-memory-cache.json` fallback (low effort, high resilience).
9. **8 orphaned generators' output-key lineage** — not traced end-to-end to `merge-augmentations.mjs`; this is the one runtime risk in move #3.1 and must be verified per-generator before merge.

---

*Deliverable: `state/shared/specs/SIERRA-SYSTEM-VIZ-BRAIN-ASSESSMENT-2026-05-29.md`. Companion next actions: §3.1 (FAST[] register) is the immediate sierra ship; §2 rows 2–5 are one-batch wiring wins for oscar/echo/delta/foxtrot; §6.9 is the gating verification for §3.1.*
