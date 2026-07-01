---
artifact: domain-buildout-plan
slot: india
galaxy: ai-training
galaxy_dir: mcp-server/src/engines/ai-training/
kienzle_pages: ["Kienzle System Sync.dc.html"]
backend_dispatchers: [prism_ai, prism_intelligence, prism_outcome, prism_ml]
frontend_owner: quebec
status: draft
generated_by: india-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — india (ai-training)

> Finalized plan to take the ai-training galaxy to **PhD-master depth**, then
> **test → simulate → validate → fine-tune**, then **build the frontend** from the
> Kienzle System Sync Claude-Design page.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub ·
> no-inline-constants · canonical physics from `src/physics/constants.ts`) bind
> every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** GraphSAGE GNN tier-5 wiring-inference · LoRA adapter stacks (~95 engines across
  lathe/mill/cam/wedm/5axis/laser/grinding/blueprint — verified via `*LoRA*Engine.ts` Glob)
  · RAG corpus pipelines (4-substrate RRF via `hybrid-retrieval.mjs`) · deep reasoning engines
  · self-improvement feedback loops · retrain lifecycle orchestration
  (`nn-graph-retrain-lifecycle.mjs`) · calibration/conformal/drift stacks ·
  `OutcomeFeedbackBusEngine` + `MetaLearningOptimizerEngine` (threshold 2,848 outcomes) ·
  `AdaptiveThresholdEngine` · `HookEfficiencyEngine`.
- **Excludes:** G-code emission → echo; toolpath strategy → kilo; blueprint OCR → xray;
  tribal-tip storage → fleet-tribal; CMM/SPC → quality galaxy; PDF extraction → pdf-corpus/lima.
- **Slot worktree:** `H:/prism-slot-india` · branch `slot/india`
- **Galaxy brain:** `mcp-server/src/engines/ai-training/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified — R12)

- **Scaffolding:** PASS — AI-SYNERGY-AUDIT all 5 dims score 1 (discoverability, ownsOrWiresAi,
  vaultSynergy, crossSubstrate, awarenessSurface). INDIA-CONTEXT-LEDGER.md maintained.
- **Verified engines (CLAUDE.md §2 — names confirmed from CLAUDE.md, not invented):**
  - GNN tier: `graphsage-trainer.mjs` · `graphsage-predictor.mjs` · `graphsage-train-pipeline.mjs`
    · `graphsage-checkpoint.mjs` · `graphsage-model.mjs` · `nn-graph-retrain-lifecycle.mjs`
    · `gnn-active-pool-select.mjs` · `graph-node-embedding-bridge.mjs`
  - RAG/CAG: `hybrid-retrieval.mjs` (4-substrate RRF) · `cag-router.mjs`
  - Outcome bus: `OutcomeFeedbackBusEngine.ts` · `MetaLearningOptimizerEngine.ts` ·
    `AdaptiveThresholdEngine.ts` · `HookEfficiencyEngine.ts`
  - LoRA: ~95 `*LoRA*Engine.ts` — Glob FIRST; duplication guard THROWS on any new LoRA engine.
  - Algorithm primitives (wired via tango/prism_algorithm): `ml_attention` · `ml_multihead_attention`
    · `ml_layernorm` · `ml_transformer_block` · `ml_lowrank` · `ml_knn` · `ml_gmm` · `ml_viterbi`
    · `ml_beam_search` · `graph_heterophily_aggregate` (H2GCN — documented model-side GNN lever).
- **AI dispatcher actions: 0 wired (AWARENESS.md verified 2026-06-11).** Dispatchers exist
  (`prism_ai`/`prism_intelligence`/`prism_outcome`/`prism_ml`) with action PREFIXES documented
  in CLAUDE.md §3, but the AWARENESS audit returned 0 attributed dispatcher actions for this galaxy.
  Cited action names in §8 below are UNVERIFIED — grep the dispatcher source before use.
- **6 open orphan wires (INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11):**
  `IntentClassifier` · `PolicyExperienceLedger` · `TransferLearning` · `TemporalReasoning` ·
  `RealTimeAnomalyDetection` · `KnowledgeIngestion` — all WIRE_SAFE_DATA (deterministic
  stats/provenance only; NEVER NN inference through a dispatcher).
- **Knowledge legs (PSN 11-leg):** Strong: Engines (95+ LoRA + GNN + outcome stack), Memories
  (113 curated + 167 node files), Wiki (519 entries attributed), System-viz (cross-substrate edges
  materialized — owned-by-slot + documented-by + embeds), PRISM-AI (4 dispatchers).
  Thin: Tribal (66 matching tips — target 150+), NN/GNN refpool (62-ghost holdout — gate blocked
  on pool growth, NOT calibration), CAG cold-anchor (partial — not all 34 galaxies warm),
  PRISM-OS (no OS-skill surface for scheduled training jobs).
- **Known landmines (R12 — from CLAUDE.md §5 and MEMORY.md):**
  1. **GNN selective-deploy only.** Live (2026-06-06): AUROC 0.808 (PASS), macro-F1 0.439 (FAIL),
     Brier 0.179 (FAIL). τ=0.7 → 32% coverage. Calibration is a MEASURED DEAD END (Murphy
     miscalibration = 0.0197 of 0.179 Brier). Full-coverage unblocked only by refpool growth.
  2. **372K-node OOM trap.** Never load full node-embedding corpus in-memory. Streaming JSONL
     reader only (`graph-io.streamGraphArray`). Self-reexec with `--max-old-space-size` for
     lifecycle process itself (shipped U-NN-HEAP-FIX, commit `8d6a481080`).
  3. **Heterophily collapse on unstratified training.** Always use `positiveTypeMarginal`
     stratification (NN-GRAPH MS1 root cause; `positiveTypeMarginal` + `sampleStratifiedNegativeEdges`
     verified exported at graphsage-trainer.mjs lines 141/204).
  4. **Retired Ollama tags.** `:3b`/`:7b`/`:14b`/`deepseek-r1:14b` gone (Blackwell 2026-06-04).
     Always use `OllamaCapabilityProbeEngine.getBestReasoningModel()` — NEVER hardcode a tag.
  5. **ConsensusModelPerformanceEngine is a stub** — methods throw; do NOT wire until real impl lands.
  6. **xproc fall-through trap.** Inserting a case-with-body into a bare fall-through switch block
     silently reroutes all preceding cases (severed ~120 xproc actions, fixed U-XPROC-FALLTHROUGH-RESTORE
     2026-06-20). Any future cross-wire insertion into `aiReasoningDispatcher.ts` must terminate
     the preceding sub-block with its own `break` first.
  7. **Checkpoint write discipline.** NEVER write directly to `graphsage-checkpoint.json`. Write
     to `.candidate.json`, then `runAssessment`, then promote only if all 3 gates clear.

---

## §3 — Deepening roadmap → PhD master

- **Tribal tips to add:** current ~66 attributed → target 150.
  Sources: (a) 35 india session transcripts already mined via `mine-galaxy-transcripts.mjs`
  (704MB); (b) LoRA paper corpus (LoRA/rsLoRA/DoRA — arxiv links in MEMORY.md §Authoritative
  free-source corpus); (c) conformal prediction literature; (d) GraphSAGE/H2GCN papers.
  Priority topics: stratified neg-sampling for heterophilic graphs · conformal vs refinement-loss
  distinction · LoRA rank vs domain-task complexity · 4-substrate RRF weight tuning per domain ·
  H2GCN ego/neighbour-sep aggregation (the GNN lever for AUROC lift).
  Capture via `prism_knowledge:tribal_capture slot=india`.

- **Wire the 6 open orphans** from `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`:
  `IntentClassifier` · `PolicyExperienceLedger` · `TransferLearning` · `TemporalReasoning` ·
  `RealTimeAnomalyDetection` · `KnowledgeIngestion`. Rule: DATA/stats/provenance actions only —
  never NN inference. Grep dispatcher source first to confirm action namespace before adding.

- **Wiki entries to write/extend:**
  - `knowledge/wiki/architecture/lora-stack-inventory.md` — map all ~95 LoRA engines by domain,
    rank, training split, promotion gate; currently undocumented fleet-wide.
  - `knowledge/wiki/lessons/india-xproc-fallthrough-pattern.md` — the case-insertion trap in
    fall-through switch chains; cross-link [[reference_xproc_fallthrough_severed_2026_06_20]].
  - `knowledge/wiki/architecture/rag-cag-hybrid-retrieval.md` — 4-substrate RRF architecture +
    CAG cold-anchor pattern + hit-rate improvement roadmap (current ~2% → target 15%).
  - Extend `[[architecture/gnn-selective-deploy]]` — add Brier dead-end finding, H2GCN as the
    model-side lift lever (not calibration), and selective coverage math.

- **Memories to write:**
  - `reference_india_lora_domain_map_2026_06_26.md` — per-domain LoRA engine name, rank, last
    retrain date, gate status; prevents creating duplicate LoRA engines.
  - `reference_india_gnn_refpool_growth_plan_2026_06_26.md` — path from 62-ghost holdout to
    ≥200 labeled nodes; names which galaxy slots must emit outcomes.

- **RAG corpus:** `state/shared/tribal-embed-index.json` (33K+ entries post-restore; reads via
  `scripts/lib/load-tribal-index.mjs` cap-safe Buffer path — do NOT use `fs.readFileSync` which
  crosses V8 512MiB string cap at current size). The 4-substrate RRF combines tribal index +
  wiki + memories + outcome bus. Target: CAG hit-rate ≥ 15% (from current ~2–3%).

- **CAG cold-anchor:** GNN gate spec (AUROC/Brier/F1 thresholds) · LoRA promotion criteria per
  domain · `INDIA-CONTEXT-LEDGER.md` summary · `knowledge/memories/patterns/ai-systems-fleet-state.md`
  synthesis — all via `cag-router.mjs COLD_SOURCES`. Stabilize doctrine fingerprints so
  `cag-router.mjs` returns a HIT instead of miss on india-doctrine queries.

- **NN/GNN refpool growth:** target 200+ labeled ghost nodes via:
  (a) every domain slot emitting `prism_outcome:capture_bus_emit` on real dispatches →
  nightly `vault-to-gnn-refpool.mjs --apply` sweeps; (b) active-label worklist
  (`state/shared/nn-graph/active-label-worklist.{json,md}`) curated by `gnn-active-pool-select.mjs`
  (shipped U-GNN-ACTIVE-POOL-SELECT `f512700c56`) to guide operator labeling.
  Current: 62 ghosts. Gate opens for macro-F1 lift at ≥100 labeled examples.

- **LoRA dataset:** failing outcomes (reward < 0.70) from all 34 galaxies → per-domain
  `<galaxy>_lora_train.jsonl`; india consolidates weekly. Target: ≥500 pairs per domain,
  80/20 train/test split. `vault-to-lora-dataset.mjs` already wired (245/247 feedback files
  in the feed per MEMORY.md §Vault->AI feeders).

- **Engineered loop + cron (all as Windows Scheduled Tasks under "PRISM AI Training"):**
  - Nightly 01:00: `nn-graph-retrain-lifecycle.mjs --status` → if refpool grew ≥10 nodes
    since last run → `--force` retrain → `runAssessment` → promote IFF all 3 gates clear.
  - Weekly Sunday 02:00: consolidate all `*_lora_train.jsonl` → LoRA retrain batch per domain.
  - Nightly 03:00: `node scripts/ai-systems-fleet-state.mjs` → refresh AI fleet state memory.
  - Acceptance signals: GNN coverage > 50% (from 32%) · LoRA mean reward lift ≥ +0.05 per
    domain on hold-out · CAG warm-traffic hit-rate ≥ 15%.

- **Ollama offload:** LoRA dataset curation + tribal synthesis → `qwen2.5-coder:32b`;
  GNN architecture decisions (H2GCN lever, stratification strategy) → `gpt-oss:120b`;
  quick outcome classification → `gpt-oss:20b`. Never hardcode: use `OllamaCapabilityProbeEngine`.

---

## §4 — Test plan (real assertions — R9)

- **Unit (reference-value / algebraic-invariant — never `toBeDefined()`):**
  - `graphsage-trainer.mjs`: Welford variance for 10× identical reward ≤ 0.01;
    `positiveTypeMarginal` export non-zero on 100-node test graph; negative/positive ratio ≥ 3.
  - `MetaLearningOptimizerEngine.test.ts`: below 2,848 outcomes → `{optimized:false}`;
    at 2,849 → returns delta bounded algebraically to [−0.5, +0.5]. Invariant: adaptation
    is monotone in reward — higher mean reward → smaller magnitude correction.
  - `OutcomeFeedbackBusEngine.test.ts`: two concurrent appends both persist (no clobber);
    `domain` field non-empty enforced; `reward` ∈ [0, 1] enforced at write-time.
  - `hybrid-retrieval.mjs`: RRF fusion weight sum = 1.0; empty substrate → empty result
    (no crash); 4-substrate exercise in spanning config.
  - `AdaptiveThresholdEngine.test.ts`: threshold monotonically decreases as observed rate
    falls below baseline (direction invariant — wrong direction is a safety defect).

- **Integration (round-trip through the dispatcher — Zod schema + lazy import exercised):**
  - `prism_outcome:capture_bus_emit` → `outcome_stats` round-trip: emitted record appears
    in stats count within the same session (no async loss). Assert `total ≥ 1` after emit.
  - `prism_ml:lora_gate` with reward < 0.70: returns `{promote: false, reason: <string>}` —
    never silently promotes. Reason field mandatory (R12: no silent suppression).
  - `prism_ai` xproc action (e.g. `xproc_outcome_stats` — grep dispatcher to confirm action name
    before writing test): assert response contains `tier` and `elapsed_ms` fields.
  - **Wiring test for each of the 6 orphan engines:** once wired, each must round-trip through
    its dispatcher action returning a non-error response on valid input.

- **E2E (JM Die live data):**
  - `nn-graph-retrain-lifecycle.mjs --status` → exit 0, JSON with `currentAUROC`,
    `refPoolSize`, `selectiveDeploy.enabled` fields (no crash on 372K-node graph).
  - Outcome bus E2E: emit `{domain:'mill', reward:0.92}` → `vault-to-gnn-refpool.mjs --dry-run`
    → emitted node appears as candidate.

- **Coverage floor:**
  - Happy path: valid emit → bus append → stats retrieval round-trip.
  - Failure modes (≥3): (a) `reward > 1.0` → validation error, no append;
    (b) unknown domain string → `{error:'domain_unknown'}`;
    (c) refpool < minimum → GNN returns `DEFERRED/insufficient-reference-pool` (not crash).
  - Adversarial (≥2): (a) `reward: NaN` → structured error, bus NOT appended;
    (b) OOM simulation on embedding load (`--max-old-space-size=256`) → self-reexec OR fail-loud,
    never silent OOM.
  - Spanning configs (≥3): mill domain outcome · lathe domain outcome · wedm domain outcome.

- **Target test files:**
  `graphsage-trainer.test.mjs` · `MetaLearningOptimizerEngine.test.ts` ·
  `OutcomeFeedbackBusEngine.test.ts` · `hybrid-retrieval.test.mjs` ·
  `AdaptiveThresholdEngine.test.ts` · `prism_outcome.integration.test.ts` (new — dispatcher
  round-trip) · `prism_ml.lora_gate.test.ts` (new).

- **Runner:** `cd mcp-server && rtk npx vitest run -t "MetaLearning|OutcomeFeedback|LoRA|GNN|hybrid|Adaptive"`

---

## §5 — Simulation plan

- **Scenarios:**
  1. **GNN retrain dry-run** — `nn-graph-retrain-lifecycle.mjs --force --dry-run` on 100-node
     synthetic graph (no 372K load). Assert: 3 gate fields present in assessment JSON,
     checkpoint candidate written (NOT promoted), decision logged with reason.
  2. **LoRA reward Monte-Carlo** — inject 500 synthetic outcomes (Gaussian µ=0.75, σ=0.15) →
     `MetaLearningOptimizerEngine` → assert adaptation delta |δ| ≥ 0.001 (sensitivity) and
     |δ| ≤ 0.5 (bounded). Cross-check: zero-variance batch (all reward=0.75) → |δ| < 0.001.
  3. **4-substrate RRF fusion** — query `hybrid-retrieval.mjs` with "Kienzle force lathe" →
     assert ≥1 hit from each substrate: tribal, wiki, memory, outcome bus.
  4. **Adversarial: empty refpool** — `runAssessment` with poolSize=0 → returns
     `DEFERRED/insufficient-reference-pool`, NOT AUROC 0.0 (a crash or 0.0 would be a landmine).
  5. **Adversarial: heterophily collapse** — train on unstratified 100-node graph → assert
     macro-F1 < 0.15 (collapse detectable); then stratified run → macro-F1 ≥ 0.30
     (stratification lifts; confirms the `positiveTypeMarginal` lever is functional).

- **Pass criteria (numeric):**
  - GNN dry-run: exit 0, all 3 gate fields present, `.candidate.json` written.
  - LoRA Monte-Carlo: |δ| ∈ [0.001, 0.5] on 500-outcome batch.
  - RRF: ≥4 results, ≥1 per substrate.
  - Selective-deploy emitted-set: Brier ≤ 0.05 at τ=0.7 (validated 2026-06-06: 0.041).
  - Heterophily: unstratified macro-F1 < 0.15; stratified macro-F1 ≥ 0.30.

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:**
  - `node scripts/nn-eval-refresh.mjs --json` → report AUROC/macro-F1/Brier against gates.
    Current baseline to beat/maintain: AUROC 0.808, selective Brier 0.041, coverage 32%.
  - 34-galaxy outcome sweep: each galaxy emits 1 test outcome via `prism_outcome:capture_bus_emit`
    → confirm all 34 appear in `state/shared/outcome-bus.jsonl` within 60s.
  - CAG hit-rate: 50 diverse domain queries via `galaxy-reasoning-bridge.mjs ai-training` →
    measure warm-traffic hit vs baseline ~2%; target ≥15%.
  - LoRA hold-out: per-domain LoRA retrain on a 100-pair augmented set → measure reward lift
    on 20-pair hold-out; target ≥ +0.05 before promoting.

- **Acceptance gates (numeric):**
  - GNN selective-deploy: AUROC ≥ 0.78 (already 0.808); emitted-set Brier ≤ 0.05.
  - LoRA promotion: mean reward lift ≥ +0.05 on hold-out before promoting any adapter.
  - Outcome bus: 34/34 domains emitting without append clobber in 24h production window.
  - CAG hit-rate: ≥15% warm-traffic after doctrine-fingerprint stabilization.
  - 6 orphan wires: each returns a valid (non-error) response on a dispatcher round-trip test.

- **Safety gate:** india produces AI models; the physics S(x) gate lives in the domain slot that
  consumes those models (mill/lathe/wedm). india's own gate: `runAssessment` must pass before
  any candidate checkpoint is promoted; a non-promoted candidate MUST NOT reach any consumer.

- **Parity probe:** `AILearningDashboardPage.tsx` displayed AUROC/macro-F1/refPoolSize must
  match `nn-eval-refresh.mjs --json` output within ±0.001. Outcome bus display count must match
  `wc -l state/shared/outcome-bus.jsonl` within ±1.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** every domain dispatcher action emits `prism_outcome:capture_bus_emit` on
  completion → `OutcomeFeedbackBusEngine` (O_APPEND) → nightly `vault-to-gnn-refpool.mjs --apply`
  grows the labeled ghost node set. `state/shared/outcome-bus.jsonl` is append-only; the shared
  `scripts/lib/redact-secrets.mjs` masks all snippets before any external ledger write.

- **LoRA:** failing outcomes (reward < 0.70) → per-domain `<galaxy>_lora_train.jsonl` via
  `vault-to-lora-dataset.mjs` (245/247 feedback files already wired) → weekly consolidated batch
  retrain → promote IFF hold-out lift ≥ +0.05. Never promote on a single-seed AUROC claim
  (`feedback_multiseed_before_auroc_claim.md`).

- **RAG/CAG:** new tribal tips + wiki entries → nightly re-embed into tribal index via
  streaming Buffer reader → `cag-router.mjs` cold-anchor refresh → doctrine-fingerprint
  stabilization → CAG hit-rate growth toward 15% target.

- **NN/GNN:** refpool growth (+10 labeled nodes/week from cross-domain outcomes) → trigger
  nightly lifecycle check → `--force` retrain if ≥10 new → promote IFF AUROC ≥ 0.78 AND
  macro-F1 ≥ 0.55 AND Brier ≤ 0.15 (all 3 gates). Full-coverage lift = H2GCN
  (`graph_heterophily_aggregate` primitive, wired via `prism_algorithm`) + refpool growth, NOT
  calibration (calibration dead-end verified: `scripts/nn-graph-calibration-analysis.mjs`).

- **Trigger + cadence:** nightly GNN check 01:00 · weekly LoRA batch Sunday 02:00 · nightly
  fleet-state refresh 03:00 — all Windows Scheduled Tasks, SYSTEM principal, `--force` only
  when growth threshold met (not unconditional — prevent runaway GPU burn).

---

## §8 — Frontend build (Kienzle System Sync → AILearningDashboardPage.tsx)

- **Assigned Kienzle page:** `mcp-server/web/design-imports/kienzle-app-build/Kienzle System Sync.dc.html`
  Design intent (verified from the source): a **data-flow propagation visualizer** with
  `jm-data.js` as the hub (SOURCE OF TRUTH), surrounded by ~19 screen nodes (SFC, Tool Crib,
  Post Processor, Quote, Job Cost, Shop Floor, etc.) connected by animated edges. Right panel
  shows scenario selector ("CHANGE ONE THING →") + propagation list ("PROPAGATES TO · N screens")
  + correlation guarantee. The `⊹ SYNC` icon in the nav marks this as the data-sync/dependency
  view. Header badge: "IN SYNC" (green pulse).

- **Reuse mapping (Codex Page Protection):**
  `mcp-server/web/src/pages/AILearningDashboardPage.tsx` — EXTEND, do NOT replace.
  The existing page covers per-machine RL learning state and outcome feedback. The Kienzle
  System Sync design adds a **data-flow dependency graph panel** showing which PRISM screens
  are affected when a training signal changes (e.g. "D2 kc1.1 recalibrated → 5 screens
  recompute"). This is distinct enough to add as a new tab/panel within AILearningDashboardPage.
  Also audit `FleetLearningDashboardPage.tsx` before extending — check for overlap on fleet
  state display.

- **New panel to add: "System Sync" tab within AILearningDashboardPage.tsx:**
  - Header: "System Sync" · last-sync timestamp · "IN SYNC" badge (green pulse) using
    `var(--status-emerald)`.
  - Center: SVG data-flow graph with `jm-data.js` as hub (orange `#FF5A2B` circle) and
    ~19 screen nodes positioned around it. Edges animate with `stroke-dashoffset` when a scenario
    is active (animated orange edges = touched; static dim edges = not touched).
  - Right panel: scenario selector list (≥3 scenarios — e.g. "GNN retrain cycle", "LoRA adapter
    promoted", "Outcome bus flush") + propagation list (which screens recompute on that signal).
  - Correlation guarantee card (emerald border): "Because all consumers read the same outcome bus,
    a training signal update propagates consistently — screens cannot disagree."

- **Backend wiring (UNVERIFIED action names — grep dispatcher source before implementation):**
  - AI fleet state: dispatcher action under `prism_ai` prefix `neural_fleet_state_*` (grep
    `aiReasoningDispatcher.ts` for actual action name).
  - Outcome stats: `prism_outcome:outcome_stats` (grep `outcomeDispatcher.ts`).
  - LoRA gate status: `prism_ml:lora_gate` (grep `mlDispatcher.ts`).
  - Web API client: `mcp-server/web/src/api/aiSystemsApi.ts` (create if absent; extend if present).
  - Express route: `GET /api/v1/ai/system-sync` → aiReasoningDispatcher. Verify route exists in
    `src/routes/`; dead wire is a P0 (per `## Recent regressions` doctrine on dead-wire class).

- **Design language:** iOS fleet tokens from `web/src/index.css` (never inline hex/px).
  `var(--status-emerald)` healthy legs · `var(--status-amber)` degraded · `var(--status-red)` dead.
  GNN metric values in `var(--font-mono)` (JetBrains Mono). Mobile-first, 44pt tap targets.
  Wrap in `<MobileSafeArea>`. Graph SVG: `viewBox="0 0 760 680"` (matches design), `preserveAspectRatio`.
  Scenario nodes: `border-radius: 8px`, touch target ≥ 44pt via padding. Animated edges via CSS
  `@keyframes kzdash { to { stroke-dashoffset: -16; } }` (from design source).

- **Build/verify loop:** edit → Playwright → screenshots at 1360×852 (desktop) +
  390×844 (iPhone 14) + 412×915 (Pixel 7) → compare to `.dc.html` visual intent → iterate.

- **Acceptance:** System Sync tab renders; live outcome bus count matches backend; graph edges
  animate on scenario selection; parity probe passes (§6); all 3 viewport screenshots pass.

---

## §9 — Dependencies & sequencing

- **Blocked by:** operator-supplied ghost labels (refpool growth payoff; code is ready);
  34-domain outcome emit coverage (cross-slot dependency — each slot must wire `capture_bus_emit`);
  quebec for AILearningDashboardPage.tsx tab integration.
- **Blocks:** all 34 domain slots' LoRA retrain + GNN tier-5 classification; quebec frontend
  (System Sync tab needs live `/api/v1/ai/system-sync` endpoint).
- **Logical order (R13):** close 6 orphan wires → verify outcome bus 34/34 domains →
  grow refpool → verify dispatcher actions (grep before citing) → retrain GNN → validate gates →
  deepen tribal/wiki → frontend System Sync tab last (never build UI atop unproven backend).

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: 6 orphan engines wired (DATA/stats only); 34 domain slots emit `capture_bus_emit`;
  GNN retrain lifecycle cron live; LoRA weekly batch cron live; `GET /api/v1/ai/system-sync`
  route exists and round-trips.
- [ ] TEST: all target test files green; happy + ≥3 failure + ≥2 adversarial + ≥3 spanning
  configs; dispatcher integration round-trips green; per-file 2-arm scrutiny on every code file.
  `rtk npx vitest run -t "MetaLearning|OutcomeFeedback|LoRA|GNN|hybrid|Adaptive"` → all pass.
- [ ] VALIDATE: AUROC ≥ 0.808 maintained; selective Brier ≤ 0.05; CAG hit-rate ≥ 15%;
  outcome bus 34/34 domains; LoRA mean reward lift ≥ +0.05 on promoted adapters; parity ±0.001.
- [ ] APPLY: deepening cron live (3 scheduled tasks); AILearningDashboardPage.tsx System Sync
  tab rendering live data; 3-viewport screenshots match design; 3-of-3 Stop gate PASS.
