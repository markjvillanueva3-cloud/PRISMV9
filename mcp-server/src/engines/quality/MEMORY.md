# quality Galaxy MEMORY.md

> **Canonical owner: alpha (secondary)** — claimed 2026-06-08 after the fleet-synergy audit flagged quality as the only unowned cross-galaxy gate. Alpha's primary domain is token-optimization (see `state/shared/CHAT-SLOT-DOMAINS.md`); quality is a secondary ownership until/unless the operator assigns a dedicated quality specialist. CLAUDE.md §5/6/7 authored from real engine behavior 2026-06-08.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="quality" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:quality]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/quality_synthesis.md` (qwen2.5-coder:32b-synthesized from 24 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- The SFC/lathe domain has established 8 quality gates, emphasizing the need for thorough quality checks before introducing new tools or processes [reference/reference_oscar_sfc_quality_gate_ecosystem_2026_05_29].
- First-article inspection is linked with SPC cadence to ensure consistency and reliability in production processes [reference/node_tribal_quality_first_article_inspection_and_spc_cadence].
- The ChainOfVerificationEngine is introduced as a generic substrate primitive for verifying safety and accuracy claims across domains, indicating a move towards more robust verification methods [reference/reference_cov_engine_2026_05_25].
- Statistical methods such as SPC (Statistical Process Control), process capability, DOE (Design of Experiments), regression, Monte Carlo simulations, and quality gates are frequently referenced across multiple nodes [reference/node_tribal_math_statistical_methods_spc_doe_capability], [reference/reference_oscar_sfc_quality_gate_ecosystem_2026_05_29], [reference/node_formula_mit_2_003_spring_2005_quality_gates].
- Quality gates are a common theme, appearing in various MIT courses and contexts, indicating their importance for quality control [reference/node_formula_mit_2_003_spring_2005_quality_gates], [reference/node_formula_mit_2_008_cp_cpk_capability_math].
- Formulas and adjusted actions related to quality are consistently referenced, suggesting a structured approach to maintaining and improving quality metrics [reference/node_formula_formula_adjusted_qualitydispatcher_action_cpk_predict], [reference/node_formula_formula_adjusted_businessdispatcher_action_quality_spc_chart].

## Indexed memories
- **Domain corpus (live counts):** 13 curated memory file(s) · 321 wiki entr(y/ies) · 16 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 124 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="quality" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/_legacy-root/feedback_ppg_quality.md` · `knowledge/memories/reference/reference_hotel_cpk_role_floors.md` · `knowledge/memories/reference/reference_lathe_program_quality_rubric_2026_05_27.md` · `knowledge/memories/reference/reference_oscar_sfc_quality_gate_ecosystem_2026_05_29.md` · `knowledge/memories/reference/reference_pdf_extract_solidworks_tolerance_2026_05_25.md`
- **Sample wiki:** `knowledge/wiki/training/extracted/solidworks-eng-graphics-tolerance.md` · `knowledge/wiki/os/commands/cad-tolerance-check.md` · `knowledge/wiki/os/commands/cad-tolerance.md` · `knowledge/wiki/os/commands/cpk-calc.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/blueprint-dim-gdt-positional.md` · `knowledge/wiki/code-tribal/blueprint-dim-gdt-profile.md` · `knowledge/wiki/code-tribal/blueprint-dim-gdt-runout.md`

## Cross-galaxy bridges
- **mill (foxtrot)** `engines/mill/` — consumes predicted Cpk / surface finish pre-cut.
- **lathe (whiskey)** `engines/lathe/` — consumes surface-finish Cpk pre-cut; `LatheQualityGateEngine` + `TurningInspectionPlanEngine`.
- **wedm (mike)** `engines/wedm/` — `WEDMOffsetSPCEngine` + EDM surface integrity → SPC.
- **business / ERP (hotel)** `engines/business/` — `ERPQualityEngine` ingests SPC → customer/job records.
- **compliance-safety** `engines/compliance-safety/` — Cpk gates + S(x) gates co-evaluate (S(x) wins on veto).
- **shop-floor** `engines/shop-floor/` — live SPC streaming (this galaxy is the offline/capability side).

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- The PRISM-Master CPS posts must be full-featured, highlighting the need to improve the completeness of generated content [feedback/feedback_ppg_quality].
- The JMDieLatheCapabilityEngine and per-machine capability sidecar are introduced but require further development for assessing fleet synergy and capability rollup [reference/reference_mike_lathe_capability_engine_2026_05_24].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## Primary domain
Quality / SPC / metrology: process capability (Cp/Cpk/Cpm/Ppk), statistical process control (X-bar R, individuals/MR, EWMA, multivariate, Western Electric / Nelson rules), capability prediction (pre-cut Cpk gates), gauge R&R / MSA, CMM import + measurement analysis, GD&T tolerance stack-up, surface-finish targets, and inspection-plan + FAI generation. Per `./CLAUDE.md` §1, it EXCLUDES real-time shop-floor SPC streaming (that lives in the shop-floor galaxy). The galaxy is the post-cut measurement + pre-cut capability-prediction surface every cutting domain (mill/lathe/wedm) and the ERP pass through.

## Key engines & paths
Engines live flat in `mcp-server/src/engines/` (no `quality/` subdir); names verified against `data/docs/ENGINE_DIGEST.md` + on-disk. Atlas: [`./PATHS.md`](PATHS.md) (30 name-matched engines).
- **Capability/Cpk** — `QualityFormulasEngine.ts` (Cp/Cpk, Cpm Taguchi, non-normal Cpk via Clements, CI for Cpk, gage R&R, sampling plans) · `SPCProcessCapabilityEngine.ts` · `ProcessCapabilityPredictionEngine.ts` (pre-production Cp/Cpk) · `CpkPredictionGateEngine.ts` (per-candidate-strategy Cpk gate) · `TurningCpkSurrogateEngine.ts`.
- **SPC charts/rules** — `SPCChartingEngine.ts` · `NelsonSPCRulesEngine.ts` (Western Electric / Nelson pattern detection) · `MultivariateSPCEngine.ts` (Hotelling T² / MEWMA) · `EWMAEngine.ts` · `SPCPreControlEngine.ts` · `SPCFeedbackLoopEngine.ts` · `WEDMOffsetSPCEngine.ts`.
- **Metrology/MSA/CMM** — `MeasurementSystemAnalysisEngine.ts` (gage R&R via ANOVA crossed) · `GageRRMSAEngine.ts` · `CMMImportEngine.ts` · `CMMHistoryEngine.ts` · `CMMPathPlanningEngine.ts` · `GDTStackupEngine.ts` (tolerance stack-up).
- **FAI/inspection** — `FirstArticleInspectionPipelineEngine.ts` · `InspectionReportEngine.ts` (FAI/in-process/final/incoming, ISO 9001 §8.6 CofC) · `TurningInspectionPlanEngine.ts` · `WetRunSampleInspectionPlanEngine.ts`.
- **Aggregate/feeds** — `LeanSixSigmaEngine.ts` · `QualityDashboardEngine.ts` · `QualityManagementEngine.ts` · `QualityScoreEngine.ts` · `QualityPredictionEngine.ts` · `MachineQualityScoreEngine.ts` · `ERPQualityEngine.ts` (SPC → customer/job records).
- **CAM bridges** — `HyperMillSPCBridge.ts` · `MastercamSPCBridge.ts` · `HyperMillFAIBridge.ts` · `MastercamFAIBridge.ts`.
- **Dispatcher** — `prism_quality` (`src/tools/dispatchers/qualityDispatcher.ts`, 45 actions per `DISPATCHER_DIGEST.md` — "SPC, Cpk prediction, CMM…"). Verified actions: `cpk_predict`, `spc_calculate`, `spc_process_capability_analyze`, `ewma_analyze`, `multivariate_spc_analyze`, `western_electric_rules_check`, `gage_rr_msa_calculate`, `gauge_rr`, `measurement_analyze`, `cmm_plan`, `gdt_validate`, `tolerance_stack`, `fai_run`/`fai_evaluate_characteristic`/`fai_generate_forms`/`fai_disposition`, `quality_formulas_calculate`, `finish_target_advise`, `roundness_cylindricity_sampling_plan`, `data_quality_validate`, `psn_synergy_inspect`.

## Standing patterns / invariants
- **NEVER inline Cpk/SPC threshold magic numbers — IMPORT them.** Academy promotion Cpk floors (operator ≥1.0, setup ≥1.33, programmer ≥1.67) live in `EmployeeMachineDomainAcademyEngine`; per `reference_hotel_cpk_role_floors.md` import these floors, never inline (commit c96228f5ed). (The `cpk-thresholds.ts` / `spc-constants.ts` paths in `./CLAUDE.md` §2 were marked "verify" and do NOT exist on disk — do not cite them.)
- **NEVER inline physics/safety constants** — import from `mcp-server/src/physics/constants.ts` (root CLAUDE.md §SAFETY; confirmed present).
- **Quality gates co-evaluate with the S(x) safety gate but never soften it.** Per `engines/compliance-safety/MEMORY.md`: `softening-safety-thresholds` is in every cutting-slot soul's refuse_list — Cpk gates may add criteria but must never weaken a safety threshold without tier-downgrade authorization. S(x) hard-blocks G-code output below `GATE_THRESHOLD` (`OmegaSafetyScoreEngine.ts`, threshold in code).
- **Engine tests go in `mcp-server/src/__tests__/`** (per `feedback_engine_tests_in_tests_dir.md` — `stop_on_unwired_assets` scans only that dir). Domain test filter: `npx vitest run -t "Quality|SPC|Cpk|CMM"` (`./CLAUDE.md` §4).

## Known assets
- **Wiki** — `knowledge/wiki/architecture/dispatcher-quality.md` · `knowledge/wiki/architecture/domain-quality.md` · `knowledge/wiki/code-tribal/quality-first-article-inspection-and-spc-cadence.md` · `knowledge/wiki/code-tribal/math-statistical-methods-spc-doe-capability.md` · `knowledge/wiki/code-tribal/math-metrology-measurement-uncertainty.md`.
- **Memory** — `reference_hotel_cpk_role_floors.md` (academy Cpk floors, import-not-inline) · `reference_oscar_sfc_quality_gate_ecosystem_2026_05_29.md` (SFC quality-gate ecosystem) · `reference_tango_algo_synergy_batch_2026_05_29.md` (metrology algorithm primitives).
- **Algorithm primitive (wired by tango, ALGO-SYNERGY 2026-05-29)** — `spatial_ransac_fit` (RANSACHyperplane) via `prism_algorithm`: robust line/plane/hyperplane fit that REJECTS outlier points + TLS-refits on inliers. Use for flatness/straightness/parallelism from CMM probe clouds where one bad touch wrecks ordinary least-squares; reports rejected outlier indices + RMS orthogonal residual (the form-error metric). Detail: `reference_tango_algo_synergy_batch_2026_05_29` · wiki [[architecture/algo-synergy-ml-batch]].
- **DB intake (juliett-owned, see `./PATHS.md`)** — `ToleranceDB` (ISO 286, 260 entries) · `FormulaDB` (499) via `prism_data:database_search`.
- **JM Die ground truth** — `JM DIE/SETUPS` · `Docustrata/JMD Orders Closed` (domain-relevant roots per `./PATHS.md`; do NOT re-OCR Docustrata).

## Cross-galaxy edges
Per `./CLAUDE.md` §Related galaxies (symmetric PSN edges):
- **mill (foxtrot)** `engines/mill/` — consumes predicted Cpk / surface finish pre-cut.
- **lathe (whiskey)** `engines/lathe/` — consumes surface-finish Cpk pre-cut; `LatheQualityGateEngine` + `TurningInspectionPlanEngine`.
- **wedm (mike)** `engines/wedm/` — `WEDMOffsetSPCEngine` + EDM surface integrity → SPC.
- **business / ERP (hotel)** `engines/business/` — `ERPQualityEngine` ingests SPC → customer/job records.
- **compliance-safety** `engines/compliance-safety/` — Cpk gates + S(x) gates co-evaluate (S(x) wins on veto).
- **shop-floor** `engines/shop-floor/` — live SPC streaming (this galaxy is the offline/capability side).

## Cross-refs
[`./CLAUDE.md`](CLAUDE.md) · [`./PATHS.md`](PATHS.md) · [`./TOOLBELT.md`](TOOLBELT.md) · parent: [`../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](../../../../state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for quality (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (15 sources: T1=5/T2=0/T3=10). Top primary:
- [NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.1 Univariate Control Charts:](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST/SEMATECH e-Handbook, §6.3.1.1 / §6.3.2.1 Shewhart X-bar and R and S Control Charts:](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc311.htm)
- [NIST/SEMATECH e-Handbook, §6.1.6 Process Capability Indices (Cp/Cpk/Cpm/Cpu/Cpl + reject-rate table):](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm)
Deep cited domain research (UNVERIFIED -- (quality-owner) verifies vs source before any live engine/doctrine use): `knowledge/wiki/quality/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.
VERIFIED-PARTIAL promotion (papa-workflow 2026-06-09): institutional/method facts WebFetch-confirmed against NIST/SEMATECH e-Handbook (§6.3.1 3-sigma/0.001-prob limits + common/special-cause; §6.1.6 Cp/Cpk/Cpu/Cpl/Cpm formulas + reject-rate table) + Wikipedia (Western Electric 4 zone-rules, Nelson 8 rules) live at `knowledge/wiki/quality/quality-foundations.md`. Owner-gate split: numeric control-chart constants (A2/d2/D3/D4), Gage R&R %GRR/ndc thresholds, and ISO 14253-1 guard-band specifics stay UNVERIFIED in the _staging packet for quality-owner.

<!-- AI-CAPABILITIES:BEGIN (auto: scripts/inject-galaxy-ai-capabilities.mjs) -->
## AI capabilities

The `quality` galaxy is wired into PRISM's fleet AI substrate (PSN leg #10 NN/GNN + the Obsidian brain). It has no domain-prefixed AI engine of its own; it reasons via the live-validated generic reasoning bridge.

- **Deep-reasoning** -- reason over THIS galaxy's own context (CLAUDE + synthesis + posture) via the local-Ollama reasoning bridge:
  `node scripts/lib/galaxy-reasoning-bridge.mjs quality "<question>"`
- **NN / GNN** -- the GraphSAGE tier-5 wiring-inference cascade classifies this galaxy's ghost nodes; typed cross-substrate edges (owned-by-slot, documented-by) connect it to the system-viz graph.
- **LoRA** -- this galaxy is fed into the vault->LoRA training dataset (`quality_synthesis.md`).
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
