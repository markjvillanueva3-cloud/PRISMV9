# knowledge-conversion Galaxy MEMORY.md

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="knowledge conversion" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:knowledge-conversion]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/knowledge-conversion_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Separation of MIT-OCW dispatchers**: MIT-OCW actions (mcfi_*, mcdl_*) reside in `prism_dev`, not `prism_ai` [reference/reference_lima_mcdl_mcfi_in_prism_dev].
- **Use of tribal knowledge**: Querying operator wisdom before deriving answers from physics, with JM Die Company as a test shop [reference/reference_tribal_knowledge_search].
- **Wiki and tribal knowledge integration**: Compiling all relevant wiki and tribal knowledge into an index for easy access and validation [reference/reference_oscar_sfc_knowledge_index_2026_05_29].
- **Three-lane model**: Direct-wire (A), port-verify (B), and forge-gated (C) lanes for routing knowledge [reference/reference_knowledge_conversion_ms0_2026_05_17].
- **Node-indexed pointers**: Used to route formulas and actions within the system, linking to specific wiki pages [e.g., reference/node_formula_formula_adjusted_ppdispatcher_action_pp_knowledge_cross_domain].
- **Decomposition of monoliths**: Extraction and decomposition of large codebases (e.g., PRISM_WORKHOLDING_DATABASE.js) into smaller, manageable modules [reference/reference_u_monolith_workholding_loader_2026_05_26].

## Indexed memories
- **Domain corpus (live counts):** 37 curated memory file(s) · 355 wiki entr(y/ies) · 59 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 442 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="knowledge-conversion" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_a2_mit_ai_textbooks_registered_2026_06_08.md` · `knowledge/memories/reference/reference_api_ratelimit_wsl_commit_2026_06_08.md` · `knowledge/memories/reference/reference_commit_coord_ms0_2026_05_20.md` · `knowledge/memories/reference/reference_cross_chat_commit_misattribution_2026_05_18.md` · `knowledge/memories/reference/reference_fleet_rate_limit_diagnosis_2026_05_29.md`
- **Sample wiki:** `knowledge/wiki/software-engineering/commit-message-conventions.md` · `knowledge/wiki/reference/reference-cross-chat-commit-misattribution-2026-05-18.md` · `knowledge/wiki/lessons/commit-pressure-find-the-real-committer.md` · `knowledge/wiki/lessons/conflict-fork-rule-reliably-defeats-commit-ownership-guard-hollowing.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/commit-subject-discipline.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-metadata-contract.md` · `knowledge/wiki/code-tribal/learnings/academy-corpus-ms0-u-a2-mit-ai-textbooks-register.md`

## Cross-galaxy bridges
- **mit-curriculum** (`engines/mit-curriculum/`) — raw MIT-OCW course source corpus (producer).
- **pdf-corpus** (`engines/pdf-corpus/`) — raw extracted PDFs (producer, same router schema applies).
- **tribal-knowledge** (`engines/tribal-knowledge/`) — Lane A target; tips land in `TribalKnowledgeEngine` → `prism_knowledge:tribal_search` (consumer).
- **academy** (`engines/academy/`) — consumes converted course leaves (consumer).
- **ai-training (india)** (`engines/ai-training/`) — consumes ported algorithms/formulas for training (consumer).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Extraction of usable CAD data**: Continuation of extracting usable CAD data from JM Die Company's tribal/wiki books [reference/reference_jm_die_tribal_wiki_full_extraction_run_2026_05_26].
- **Deep learning and reasoning training substrate**: Adding deep learning and reasoning capabilities to the PRISM system [reference/reference_psn_training_substrate_2026_05_25].
- **Maintenance cadence for knowledge surfaces**: Establishing a maintenance protocol for PRISM's working knowledge layer, including wiki, tribal, and Obsidian surfaces [feedback/feedback_tribal_obsidian_viz_utilization_protocol].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Convert external knowledge corpora — MIT-OCW courseware + the v8.89 monolith extraction (and future `/pdf-learn` / `/video-learn` / shop-floor sources) — into PRISM-consumable nodes spanning **six node-types**: `knowledge`, `algorithm`, `formula`, `engine`, `skill`, `pipeline`. A **three-lane router** matches autonomy posture to artifact safety: Lane A direct-wire (tribal-tips, autonomous), Lane B port-verify (formulas/algorithms, semi-autonomous), Lane C `/forge`-gated (new engines/skills, human-in-loop). Shipped as KNOWLEDGE-CONVERSION-MS0 (2026-05-17, slot india). Source: `knowledge/wiki/architecture/knowledge-conversion-ms0.md`.

## Key engines & paths
This galaxy's own `engines/knowledge-conversion/` dir holds the doctrine sentinels only (`CLAUDE.md`, `PATHS.md`, `TOOLBELT.md`, this file). The shipped code lives across `scripts/`, `src/algorithms/`, and one cross-cutting engine:
- **Router (Lane C core):** `scripts/lib/course-data-router-lib.mjs` (pure-core, 14 exports, CamelCase-aware dedup, R12 fail-loud, advisoryOnly output) + `scripts/lib/course-data-router-lib.test.mjs` (30 tests) + `scripts/course-data-router.mjs` (CLI). Per `knowledge/wiki/architecture/knowledge-conversion-ms0.md`.
- **Lane A emitters:** `scripts/course-to-tribal-tips.mjs` (course → `KnowledgeTip[]`) + `scripts/monolith-to-tribal-tips.mjs`. Emit into `cad-engine/knowledge_store/`; auto-loaded by `TribalKnowledgeEngine`.
- **Phase-0 audit:** `scripts/audit-monolith-port-state.mjs` (advisory ledger).
- **7 Lane-C ported algorithms (all `mcp-server/src/algorithms/*.ts`, WIRE-EXEMPT):** `OperatorSplittingMethod.ts`, `ODEIntegrator.ts`, `LinearStateSpaceModel.ts`, `FiniteDifferenceMethod.ts`, `FiniteElementMethod1D.ts`, `GradientDescent.ts`, `LagrangianMechanics.ts` + keystone `SafeExpressionEvaluator.ts`. Cited in `reference_course_forge_conversions_2026_05_17.md`.
- **Knowledge Injection Pipeline (KIP):** `mcp-server/src/engines/KnowledgeInjectionPipelineEngine.ts` (+`.test.ts`) + CLI `mcp-server/scripts/knowledge-injection-pipeline.ts`. Closes the Lane-C loop: plan → inject → bind-3-systems → feedback. Per `reference_knowledge_injection_pipeline_2026_05_17.md`.
- **Round-trip test:** `mcp-server/src/__tests__/knowledge-conversion-roundtrip.test.ts`.
- **Dispatcher:** `prism_knowledge` (knowledgeDispatcher) — Lane A round-trips through its `tribal_search` action. Per `mcp-server/data/docs/DISPATCHER_DIGEST.md`. No `course_forge` action exists; algorithm dispatcher wiring (`prism_calc`) is deferred (U-COURSE-FORGE-P1-DISPATCHER), nodes are WIRE-EXEMPT.

## Standing patterns / invariants
- **NEVER inline physics constants** — the formula path is ALWAYS Lane C with physics-reviewer; canonical values live only in `mcp-server/src/physics/constants.ts`. The 7 algorithms landed as `algorithm` (numerical primitives, caller owns physics) precisely to avoid the constants path. Per `knowledge-conversion-ms0.md` §Doctrine pins.
- **NEVER auto-emit engines** — the router emits an ADVISORY ledger only; it never writes source. `advisoryOnly + mustHumanVerify` on every generated ledger.
- **R12 fail-loud** — validators throw on malformed input; unknown asset kinds DISCARD with audit-trail rationale, never silent-drop. Singular Lagrangian → NaN q̈ + flag. Per `reference_course_forge_conversions_2026_05_17.md`.
- **R8 read-before-write** — pure-core + injected readers (RGS-TOOL-MS1 pattern); content cross-ref against existing PRISM before classifying as missing.
- **1 real-data E2E test per pipeline** — hermetic-only hides schema-seam bugs (RGS-TOOL-MS1 lesson). Source: `knowledge-conversion-ms0.md`.

## Known assets
- **Wiki:** `knowledge/wiki/architecture/knowledge-conversion-ms0.md` (canonical, status:shipped) · `knowledge/wiki/architecture/course-forge-conversions.md` · `knowledge/wiki/architecture/course-forge-stubs-emitter.md` · `knowledge/wiki/os/pipelines/knowledge-injection.md`.
- **Specs/ledgers (`state/shared/specs/`):** `KNOWLEDGE-CONVERSION-PLAN.md` (master plan) · `COURSE-DATA-ROUTING-PIPELINE.md` (router design) · `COURSE-DATA-ROUTING-LEDGER.json` (live output: 65 candidates → 126 routed = 31 TRIBAL-SHIPPED / 69 FORGE-QUEUE / 10 DUPLICATE / 16 DISCARD) · `U-KC-C1-FORMULA-PORT-VERIFICATION.md` (12 formulas, 0 ports) · `U-KC-C2-ALGORITHM-VERIFICATION.md` (52 algos, 1 forge-candidate) · `monolith-port-ledger.json`.
- **Memory:** `reference_knowledge_conversion_ms0_2026_05_17.md` (milestone) · `reference_course_forge_conversions_2026_05_17.md` (7 algorithm conversions) · `reference_knowledge_injection_pipeline_2026_05_17.md` (KIP) · `reference_course_forge_stubs_emitter_2026_05_17.md`.
- **Resource roots (PATHS.md §critical-resource-roots):** `H:/PRISM/resources/MIT COURSES` · `H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS` · `H:/PRISM/JM DIE/TRIBAL + WIKI`.

## Cross-galaxy edges
Grounded in `engines/knowledge-conversion/CLAUDE.md` §Cross-galaxy edges + the wiki node-type table:
- **mit-curriculum** (`engines/mit-curriculum/`) — raw MIT-OCW course source corpus (producer).
- **pdf-corpus** (`engines/pdf-corpus/`) — raw extracted PDFs (producer, same router schema applies).
- **tribal-knowledge** (`engines/tribal-knowledge/`) — Lane A target; tips land in `TribalKnowledgeEngine` → `prism_knowledge:tribal_search` (consumer).
- **academy** (`engines/academy/`) — consumes converted course leaves (consumer).
- **ai-training (india)** (`engines/ai-training/`) — consumes ported algorithms/formulas for training (consumer).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Domain anchors (papa 2026-06-09, GALAXY-ENRICH infra lane)
MIT-OCW + monolith -> 6-node forge router. Source corpus is open courseware.
**Internal corpus (primary):** cross-cutting methodology `state/shared/specs/GALAXY-ENRICHMENT-PROGRAM-2026-06-09.md` + this galaxy's engines `mcp-server/src/engines/knowledge-conversion/` + the operator article-set themes (loops / harness / LoRA / CAG / RAG / obsidian-vault).
**Authoritative free external sources (VERIFIED, papa AI/software domain):**
- [MIT OpenCourseWare](https://ocw.mit.edu/)
R12: nameable free authoritative references for an AI/software domain (papa's expertise) -- VERIFIED + integrated live, not owner-gated. Regen: `scripts/integrate-infra-domain-anchors.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
