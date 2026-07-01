# ECHO Galaxy Memory — Post-Processors (G-code emission · controller dialects · MasterPost · JM .cps fleet)

Cross-session working brain for the echo slot. Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central MEMORY.md size discipline.

> Upgraded 2026-05-28 from the 2026-05-27 "STUB / awaiting migration" index → MASTER-BRAIN-TEMPLATE-compliant working brain.

## Master-brain link
> Clone of `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha owns the template; echo fine-tunes for post-processor — does NOT re-derive brain wiring).
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="post-processor controller dialect masterpost" topK=20`
- **DOWN (push to master):** write `<type>_echo_<topic>.md` → `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` `## Indexed memories` carries `[galaxy:post-processor] …` back-pointer (registered 2026-05-28, STEP 5d)
- **Last master-sync:** 2026-06-10  (bump on every PULL reconcile; older than galaxy-dir mtime => re-pull before work)
- **R12 note (2026-05-28):** qdrant was DOWN at galaxy birth -> live semantic PULL degraded; High-ROI seeded from master MEMORY.md index + domain knowledge. CONN-5 (recall round-trip) deferred to next session after Stop-feed lands.

## CURRENT STATE (2026-06-24, slot 48cc713a) -- most up-to-date context
> Single-read open-tasks surface: `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md` (stable, ROI-ordered).

### 2026-06-24 (slot 48cc713a) -- U-PP-MISSING-ENGINE-TESTS + a real safety fix
- **515 new companion tests across 10 previously-untested post engines** (5 commits on cad-fusion-live-ms0, [MAIN-FORCE]): GCodeSafetyAnalyzer(29) CapabilityMatrix(24) GCodeTranspiler(53) MasterPostProcessor(62) PostProcessorVerification(40) PostProcessorEngine(61) PostValidationHardening(30) PostSelection(80) PostVerificationSafety(64) PostValidationSuite(72). ~36 post engines still untested. Fan-out via Agent tool `model:'sonnet'` batches of 4 (the Workflow fanout-gate blocks >=4 inherit-model agents).
- **SAFETY FIX U-PP-BACKPLOT-G0NORM (`8f47872237`):** `PostValidationSuiteEngine.parseGCode` `replace(/^G0*/,'G')` collapsed `G0`->`G`, so `is_rapid` was ALWAYS false -> backplot **gouge + rapid-into-material detection were structurally DEAD**. Fixed (parse motion by numeric value). [[reference_echo_backplot_g0norm_dead_safety_2026_06_24]]. NEEDS a 3-of-3 next session.
- **AlarmDB-P5 doc-drift CORRECTED** (KB + galaxy CLAUDE.md §7/§12): Stage 5.1b DOES cross-reference alarms via `AlarmRegistry`; residual = full-2,588 coverage, not absence.
- **CIMCO launcher:** `CIMCOEdit - H` shortcut -> `H:/CIMCO 2026/CIMCOEdit/CIMCOEdit.exe` (licensed). [[reference_cimco_edit_h_launcher_2026_06_24]].
- **OPEN:** full-suite `VITEST_REPORT` refresh blocked by fleet memory OOM (756-file parallel run exit 255; single + 10-file runs pass green) -- retry serial / lower-load next session.

- **`prism_pp` dispatcher is now LIVE** (commit ab0c5d5193) -- 654 top-level actions across 14 categories were 100% DARK on a stale `// NOT ON THIS BRANCH` guard (the comment said "50 actions"). Re-registered after verifying all 150 lazy engines present + 4-way validation (bundle/runtime-roundtrip/0-new-tsc/static). ~94% of actions resolve to real engine methods. This is echo's primary execution surface alongside `prism_cam` post actions.
- **prism_pp stub investigation CLOSED:** the "37 stub" awk over-counted fallback TEXT. Verified per-method: echo-domain actions all RESOLVE (verify/analyzeFile/process/getBestStrategy/getStats/applyFormula/calculate exist). The ONE genuine echo break -- `pp_controller_translate` was wired to the wrong engine (PostProcessorTransformerEngine, a neural tokenizer) -> FIXED to GCodeTranspilerEngine.transpile (commit d671f0f1af, 5/5 tests). Cross-domain stubs (pp_physics_*->bravo, pp_neural_*->india, pp_kinematics_*->machine-setup) need real domain logic = NOT echo's to inline (soul refuse). See ledger A2/A3.
- **MasterPostFineTuningEngine** variance bug fixed (commit bb0cd23d4a): the "Welford" update measured deviation from the bounded EMA delta (spurious ~131 variance for consistent data); replaced with true Welford + decoupled stability axis. 44->46/46 tests.
- **DORMANT WORK on slot/echo branch:** the `slot/echo` git branch holds 12 UNINTEGRATED commits NOT on the integration tree -- PostEmitSafetyGateEngine, PostFeatureAuditEngine, PostLibraryEngine, HURCO-POST-PIPELINE-BRIDGE iters 9-16. SHAs + safe reconciliation in [[feedback_echo_commit_to_slot_branch]]. Operator go-ahead needed (don't blind reset/merge).
- **GIT LANE RULE (operator 2026-06-10):** echo stages+commits to its own `slot/echo` branch, not the shared integration tree. See galaxy CLAUDE.md "## GIT LANE DISCIPLINE".
- **Transcript mining (in progress):** `node scripts/mine-galaxy-transcripts.mjs --galaxy post-processor` (35 sessions / 704MB via Ollama) -> `state/shared/galaxy-transcript-mining/post-processor/_SYNTHESIS.md` + vault `reference_post-processor_transcript_synthesis.md` (auto-embeds -> GNN ref-pool + LoRA dataset = the india/zulu AI-systems population).


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/post-processor_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Domain Memory Writing**: During DISCOVER phases, durable domain memories should be written as they are discovered, not just at close-out [feedback/feedback_domain_discovery_memories].
- **Galaxy File Management**: Galaxy files (`CLAUDE.md`, `MEMORY.md`) may reside on the shared tree `cad-fusion-live-ms0` and should be recovered rather than rebuilt [feedback/feedback_foxtrot_galaxy_recover_not_rebuild].
- **Meta-Learning Trigger Retirement**: Meta-learning triggers (`meta-learning-trigger.mjs` and `error-recovery-memory.mjs`) were intentionally retired and moved to `/learn-batch` agent dispatch; they should not be re-enabled [feedback/feedback_meta_learning_trigger_intentional_retirement_2026_06_01].
- **Semantic Search Fallback**: When `qdrant` is down, `prism_memory:semantic_search` fails and falls back to memory-relevance using a Write-hook index and master MEMORY.md [reference/reference_bravo_qdrant_down_fallback].
- **Galaxy Buildout**: Multiple galaxies (e.g., hermes-zulu, quoting, ai-training, academy, quebec) have completed buildouts with specific artifacts and sentinels shipped to their respective slots [reference/reference_bravo_galaxy_buildout_2026_05_28], [reference/reference_charlie_quoting_galaxy_2026_05_28], [reference/reference_india_ai_training_galaxy_2026_05_28], [reference/reference_lima_academy_galaxy_2026_05_28], [reference/reference_quebec_frontend_galaxy_2026_05_28].
- **Memory Deduplication**: Cross-galaxy memory deduplication to ensure near-duplicate domain facts are consolidated into a canonical version with pointers [reference/reference_galaxy_context_federation_xdedup_2026_05_31].

## Indexed memories
- **Domain corpus (live counts):** 152 curated memory file(s) · 734 wiki entr(y/ies) · 78 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 237 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="post-processor" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_post_development.md` · `knowledge/memories/_legacy-root/feedback_reflect_all_changes_post_update.md` · `knowledge/memories/_legacy-root/project_okuma_controller_limits.md` · `knowledge/memories/_legacy-root/reference_post_ship_autocompact-autonomous-ms0-u-aam01.md` · `knowledge/memories/_legacy-root/reference_post_ship_backend-devtools-hva-u-hva-rewire-iter19-fix.md`
- **Sample wiki:** `knowledge/wiki/training/extracted/autodesk-2014-gcode-language.md` · `knowledge/wiki/os/commands/lathe-master-post.md` · `knowledge/wiki/os/commands/post-diff.md` · `knowledge/wiki/os/commands/post-generate.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/machining-tactics-gcode-safety-and-macros.md` · `knowledge/wiki/code-tribal/post-processor-cross-controller-corpus.md` · `knowledge/wiki/code-tribal/learnings/ai-training-first-ms0-u-aitrain-post-cnc-controller-dl-step1-2.md`

## Cross-galaxy bridges
- `engines/cam/` (kilo) — CONSUMES kilo's toolpaths; bridge = ToolpathBlock → NC emit.
- `engines/speed-feed/` (oscar) — INJECTS oscar's feed/speed per block.
- `engines/lathe/` (whiskey) — shares lathe-post surface.
- `engines/wedm/` (mike) — shares WEDM-post dialect surface (echo emits, mike physics).
- `engines/ai-training/` (india) — PUBLISHES post outcomes to india's closed loop.
- `engines/token-optimization/` (alpha) — alpha audits echo's NC template redundancy (edge declared both sides ✓).
- `engines/academy/` (lima) — GCode safety + dialect cheat-sheets feed operator-training leaves.
- `engines/database-expansion/` (juliett) — juliett DB-indexes echo's data corpus (160,582 NC + 13,790 .cps + 52 Mastercam posts + 14 controller/dialect DATA files); pathways in `PATHS.md §Domain data corpus` + [[reference_echo_post_data_corpus_paths]] (edge declared both sides ✓ — juliett MEMORY.md cross-galaxy bridge).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **MCP HTTP Server OOM**: The MCP HTTP server at :3100 is frequently OOM-killed due to accumulated retained references from peer chats; a heap size bump or alternative memory management strategy may be needed [reference/reference_mcp_oom_heap_bump_2026_05_23].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Available algorithm primitives (papa 2026-06-09, per [[feedback_wire_algos_into_galaxies]])

Invokable via `prism_algorithm` for post-processor NC-emission work (PSN leg #8 → this brain). Post is a TEXT / dialect-transform terminal, so the full signal suite (savgol/viterbi/ransac) belongs to the cutting galaxies (mill/lathe/wedm), NOT here — only the alignment + retrieval primitives genuinely fit (R12: don't claim signal-physics applicability a text terminal doesn't have). Mapped from the ALGO-SYNERGY batch ([[reference_tango_algo_synergy_batch_2026_05_29]] · wiki [[architecture/algo-synergy-ml-batch]]):
- `ml_dtw` (DynamicTimeWarping) — elastic alignment of an emitted NC block-stream vs the golden-NC archive for STRUCTURE-equivalence diffing (byte-equivalence is a separate exact gate; dtw catches reordered-but-equivalent block sequences + cycle-time-signature drift the byte gate misses).
- `ml_knn` / `ml_gmm` — cluster / retrieve controller-dialect feature regimes for nearest-neighbour dialect mapping (which vendor canned-cycle / modal-template best matches an unseen toolpath) — the cheap math substrate under `CrossCAMPost` / `PostProcessorTransformer` transfer.
- `signal_savgol` (the one signal primitive that applies) — `GCodeRuntimePredictor` may smooth a predicted feed-rate profile before integrating runtime, so a single spurious block doesn't skew the cycle-time estimate.

## High-ROI memories (PULL target — master hits as pointers, ≤140 chars/line)
- [[feedback_always_close_out]] — finish every task (doc-sync tail, tests, follow-ups) before reporting done
- [[feedback_parallel_scrutiny_per_file]] — 2 reviewers per file in multi-file builds before the next file
- [[feedback_commit_to_slot_worktree]] — echo commits in H:/prism-slot-echo OR [MAIN]-prefix on shared tree
- [[feedback_no_public_h_drive]] — nothing from H:/prism may be published publicly (MasterPost ships as product, not source)
- [[reference_lintstaged_noop_config_eats_commits]] — doc-only commits may be dropped; `--no-verify` for pure-doc
- [[feedback_never_delete_only_disable]] — disable, don't delete (applies to superseded posts + dispatcher cases)

## Indexed memories — domain pointers (echo's own per-file memories, 2026-05-28)
- [[reference_echo_jm_cps_fleet]] — 12 JM .cps posts + 4 production controllers (Haas/Hurco/Okuma/Fanuc)
- [[reference_echo_masterpost_engine_surface]] — 3 MasterPost engines + 14-controller AGI surface
- [[reference_echo_stub_wired_dark_engines]] — 8 stub-wired engines (the leverage target)
- [[reference_echo_post_dispatcher_surface]] — camDispatcher ~155 + productDispatcher 24 ppg
- [[reference_echo_controller_dialect_matrix]] — Haas/Hurco/Okuma/Fanuc dialect feature deltas
- [[reference_echo_legal_gate_masterpost]] — MS-MASTERPOST blocked on U-LEGAL-13 (public-manual re-derive)
- [[reference_echo_post_state_specs]] — 5 post-proc state specs (capability/variability/prove-out/roadmap/misc)
- [[reference_echo_hurco_winmax_priority]] — MasterPost MVP controller priority Hurco→Haas→Fanuc→Siemens→Mazatrol→Okuma
- [[feedback_echo_no_inline_post_constants]] — dialect/feed/speed codes route through DB + speed-feed, never inline
- [[feedback_echo_masterpost_pipeline_route]] — emit through PostProcessorPipelineEngine 7-phase, not string concat
- [[feedback_echo_cps_byte_equivalence]] — prove byte-equivalence vs golden NC archive before shipping post change
- [[feedback_echo_stub_wired_is_dark]] — `engine.method?.()` with "method not callable" fallback is dark, not wired

## Initial state (2026-05-28 baseline — from POST-PROCESSOR-CONSOLIDATION-2026-05-25)
- **3 active MS envelopes** = 49 pending units: MS-MASTERPOST 44/44 (gated U-LEGAL-13) · WEDM-P2P-PRODUCTION-MS0 6/24 · P2P-FULLSTACK-MS0 1/1.
- **22 named open units** leverage-ranked (top: U-BRIDGE-MASTERPOST-CAM, U-REV-MP-01 unified API, U-MASTERPOST-FENCE).
- **8 stub-wired dark engines** = canonical leverage class (wire real method surface → unblock JM wire-EDM revenue).
- **~14 AGI-tier engines fully dark** (MasterPostProcessor{AGIOrchestration,Genius,UnifiedAGI}, PostProcessorTransformer, CrossCAMPost…) = MS-MASTERPOST ghost-roost anchor.
- **12 JM .cps** analyzed; 4 controllers in production; wire-EDM post missing.
- Engine-supports-but-JM-posts-lack: TCP/RTCP (only M460V-5AX), tribal-tip citation in NC, CAS collision-avoid, NURBS, polar interp, per-op CI95, thermal-comp closed loop, multi-channel sync.
- Recent echo work: HURCO-POST-PIPELINE-BRIDGE-MS0 iter12–16 (tier-aware Ω floor 0→120/200, dialect-aware stub closing cross-dialect leaks, PostEmitSafetyGate wire, JM mill fleet → Enhanced).

## Backend-wire status -- VERIFIED (bravo cross-galaxy, 2026-06-11)
> bravo (galaxy_access:all-galaxies) re-audited echo's dispatcher reachability across ALL dispatchers
> incl `prism_pp` (ppDispatcher, 654 actions -- the surface a naive cam/aiReasoning-only grep MISSES).
> **TRUE-DARK post engines (0 dispatcher refs anywhere, excl collision WEDMPost*/HurcoV11*) = 0.** Echo's
> backend is already wired -- the "8 stub-wired / 40 dark" framing below is mostly a shallow-grep artifact
> (always include ppDispatcher when auditing post-processor reachability). The genuine remaining gaps are
> collision-locked (WEDMPost*/HurcoV11*), legal-gated (MS-MASTERPOST), or cross-domain (soul-refuse), NOT
> simple orphan-wires.
> **ONE real gap closed: `PPGOutcomeCaptureWireEngine` (false // WIRE-EXEMPT, ZERO real callers) -> wired
> `prism_pp:pp_outcome_emit` (commit `0777fda9d2`).** It publishes post-emit recommendations to the
> cross-galaxy OutcomeCaptureBus (domain:"post_processor") -- this CLOSES the post->india self-learning EMIT
> side (the "PUBLISHES post outcomes to india's closed loop" bridge was PHANTOM until now). R12-safe DATA only.
> ACTION FOR ECHO: call `pp_outcome_emit` (or `recordEmission`) from PostProcessorPipelineEngine's emit path
> so every real post auto-publishes (the dispatcher action makes it REACHABLE; an in-pipeline auto-call makes
> it AUTOMATIC -- echo's hot-path, echo's call). Memory: [[reference_india_ai_orphan_wire_2026_06_11]].

## Standing focus (echo-canonical)
1. **Wire the dark surface** — 8 stub-wired + ~14 AGI-tier engines have code but no live dispatcher. Wiring (real method calls) = highest-leverage post-proc work. (NOTE 2026-06-11: re-verify "dark" against `prism_pp`/ppDispatcher BEFORE wiring -- the backend is more wired than a cam-only grep suggests; true-dark count is 0 for non-collision engines.)
2. **Controller-dialect fidelity** — emitted NC must match the real dialect; mismatch is the #1 prove-out failure.
3. **MasterPost product readiness** — single canonical emit per CAM, 8-dim scorecard, provenance chain, byte-equiv CI vs golden. Gated U-LEGAL-13.
4. **JM .cps fleet upgrade** — inject engine-supported features (TCP/CAS/NURBS/polar/thermal-comp/CI95) per-machine + per-controller.

## Known failure modes (domain-specific R12 lessons)
- **Stub-wired ≠ wired.** A single `engine.method?.()` case with a `"method not callable"` string fallback is dark-in-practice. Verify the method executes.
- **Dialect gotchas** (the canonical traps): feed-rate mode mismatch (G93 inverse-time vs G94 ipm vs G95 ipr) · coolant ordering (M8 before M3-at-speed = wet floor before tool engages) · Okuma OSP comment-bracket `[]` vs Fanuc parenthesis `()` · Siemens `MCALL` vs Fanuc `G84` modal-tap · decimal-point convention drift (some Fanuc reject `0.5`, require `.5` or vice-versa) · modal-state preservation across subprogram (M98/M99) calls · missing safe retract between operations.
- **Byte-drift on copy.** Hand-copying a post block instead of re-emitting drifts from golden NC. Always re-emit + diff.
- **Legal gate is real.** Re-deriving dialect codes from copyrighted manuals trips U-LEGAL-13. Public manuals only.
- **Multi-chat post contention.** 16 in-flight handoffs cross post-proc files. Claim via chat-bus before editing HurcoV11*/WEDMPost*.
- **Worktree staleness.** slot/echo worktree was months behind main; galaxy/brain infra lives on main (H:/prism). Build shared-discovery artifacts on main, not the stale branch.

## Cross-galaxy bridges (echo touches)
- `engines/cam/` (kilo) — CONSUMES kilo's toolpaths; bridge = ToolpathBlock → NC emit.
- `engines/speed-feed/` (oscar) — INJECTS oscar's feed/speed per block.
- `engines/lathe/` (whiskey) — shares lathe-post surface.
- `engines/wedm/` (mike) — shares WEDM-post dialect surface (echo emits, mike physics).
- `engines/ai-training/` (india) — PUBLISHES post outcomes to india's closed loop.
- `engines/token-optimization/` (alpha) — alpha audits echo's NC template redundancy (edge declared both sides ✓).
- `engines/academy/` (lima) — GCode safety + dialect cheat-sheets feed operator-training leaves.
- `engines/database-expansion/` (juliett) — juliett DB-indexes echo's data corpus (160,582 NC + 13,790 .cps + 52 Mastercam posts + 14 controller/dialect DATA files); pathways in `PATHS.md §Domain data corpus` + [[reference_echo_post_data_corpus_paths]] (edge declared both sides ✓ — juliett MEMORY.md cross-galaxy bridge).

## Design note — per-vendor sub-cascade (future, deferred)
Post is unique: each VENDOR (fanuc/okuma/siemens/heidenhain/hurco/haas/mazak/mitsubishi) is a quasi-sub-galaxy. A 2nd-level memory partition (`knowledge/memories/post-processor/<vendor>/` + a `universal/` for G93/G94/G95, coolant ordering, safe retracts) is worth doing — but only AFTER the galaxy-level migration (`U-GALAXY-MS1-C1`) proves out. Don't ship premature deep-tree.

— Established 2026-05-28 by slot:echo claude-223d9a61.

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for post-processor (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (16 sources: T1=0/T2=9/T3=7). Top primary:
- [*G187 Setting the Smoothness Level (Group 00)* — Haas Automation official codes & settings (G187 P/E syntax, Setting 191, Setting 85 interaction):](https://www.haascnc.com/service/codes-settings.type=gcode.machine=mill.value=G187.html)
- [*Haas Setting 191 Default Smoothness* — Helman CNC (ROUGH/MEDIUM/FINISH default, parameter list):](https://www.helmancnc.com/haas-setting-191-default-smoothness-haas-mill/)
- [*Drilling With High-Speed Peck (G73)* — Haas Automation technical document (Setting 22 retract amount):](https://www.haascnc.com/content/dam/haascnc/ecommerce-assets/linedrawings/holemaking/modular_drill_heads/Tech_Doc_Drilling_With_High-Speed_Peck_sr_02-0060_to_02-0077.pdf)
Deep cited domain research (UNVERIFIED -- echo verifies vs source before any live engine/doctrine use): `knowledge/wiki/post-processor/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED-PARTIAL promotion (papa-workflow 2026-06-09): institutional/standards-lineage + method/structure facts WebFetch-confirmed -> `knowledge/wiki/post-processor/post-processor-foundations.md` (ISO 6983/RS-274 lineage, G54-G59.3 work offsets, G81-G89/G98/G99 canned-cycle structure, Fanuc G05.1 Q1 Alpha-I look-ahead method). Owner-gate split: ALL numeric cutting constants (kc1.1/Taylor/speeds-feeds) + controller numerics (Haas Setting 22/85/191, Fanuc params 5210/1422, look-ahead block count) + unconfirmed Siemens-CYCLE8x dialect stay UNVERIFIED in _staging for echo (PRISM sources physics numbers ONLY from src/physics/constants.ts).

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `post-processor` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It owns 6 name-attributed AI engine(s) incl. 1 reasoning/neural bridge(s) and exposes 46 AI dispatcher action(s).

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs post-processor "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`post-processor_synthesis.md`).
- **RAG / CAG** -- the fleet's retrieval-augmented + cache-augmented recall (deep-learning retrieval, not keyword grep) covers this galaxy's wiki + tribal entries as they are authored.
- **Embeddings** -- the fleet's 384/768d neural embedding index covers this galaxy's notes as they are embedded, feeding semantic recall + the GNN node-feature bridge.

_Auto-maintained by `scripts/inject-galaxy-ai-capabilities.mjs` (AI-SYNERGY-AUDIT-MS0). Live posture: `state/shared/specs/AI-SYNERGY-AUDIT.md`; per-galaxy detail: this dir's `AWARENESS.md`._
<!-- AI-CAPABILITIES:END -->

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
