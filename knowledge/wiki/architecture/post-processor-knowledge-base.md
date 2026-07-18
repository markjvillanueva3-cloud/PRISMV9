---
title: Post-Processor Domain Knowledge Base (canonical compile)
type: architecture
domain: post-processor
slot: echo
maintainer: echo
created: 2026-05-29
tags: [post-processor, knowledge-base, tribal, dialect, gcode, masterpost, jm-die, echo, auto-invoke]
---

# Post-Processor Domain Knowledge Base

**The single canonical entry point for slot:echo's domain** — CAM-toolpath → controller-specific G-code emission. Compiles the post-processor wiki map + the domain's distilled **tribal knowledge** (the part previously living only in the tribal DB / operator heads) into one queryable, version-controlled doc. Auto-surfaced by `echo-post-domain-inject.mjs` (UserPromptSubmit) + `tribal-by-domain-inject` + `wiki-precheck-inject` on post-processor keywords.

> Why this doc exists: post-processor wiki↔tribal coverage was measured at 9.6% (169/187 entries un-embedded). The tribal DB (`tribal_capture`) requires MCP; embedding requires Ollama — both are intermittently down. Capturing the knowledge as **text here** makes it infra-independent, diffable, and auto-invokable regardless of the live tribal/embedding pipeline.

## Current State (2026-06-11) — live galaxy status

> Auto-mined cross-session synthesis (all 35 echo sessions, categorized: to-do / started-unfinished / dormant-unwired / shipped / operator-directives / articles-fed / recurring-bugs): `state/shared/galaxy-transcript-mining/post-processor/_SYNTHESIS.md` + vault memo `reference_post-processor_transcript_synthesis.md` (BM25 + dense embedded → recallable by india/zulu/RAG). ROI-ordered open tasks: `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`.

- **`prism_pp` dispatcher is LIVE** (2026-06-10, commit `ab0c5d5193`): **654** top-level actions across 14 categories, registered after being 100% dark on a stale `// NOT ON THIS BRANCH` guard (the comment claimed "50 actions"). All 150 lazy engines present; ~94% of actions resolve to real engine methods. Echo's primary execution surface alongside `camDispatcher`'s ~155 post cases.
- **`pp_controller_translate` fixed** (`d671f0f1af`): was wired to the wrong engine (`PostProcessorTransformerEngine`, a neural tokenizer with no translate method) and always returned `{error}`; re-routed to `GCodeTranspilerEngine.transpile` with a fail-loud 6-dialect guard (5/5 round-trip tests: siemens MCALL, okuma G15 H0, heidenhain comments).
- **`MasterPostFineTuningEngine`** true-Welford variance fix (`bb0cd23d4a`, 44→46/46): the old "Welford" measured deviation from the bounded EMA delta (spurious ~131 variance for consistent data); replaced with real online Welford + decoupled stability axis.
- **Dormant work** — the `slot/echo` git branch holds **12 unintegrated commits** NOT on the integration tree: `PostEmitSafetyGateEngine`, `PostFeatureAuditEngine`, `PostLibraryEngine`, HURCO-POST-PIPELINE-BRIDGE iters 9-16. Operator go-ahead needed to reconcile (don't blind reset/merge). See `[[feedback_echo_commit_to_slot_branch]]`.
- **Stub triage** — the "37 stub" prism_pp actions over-counted fallback *text*; echo-domain actions all resolve (`verify`/`analyzeFile`/`process`/`getBestStrategy`/`getStats`/`applyFormula`/`calculate` exist). Cross-domain stubs (`pp_physics_*`→bravo, `pp_neural_*`→india, `pp_kinematics_*`→machine-setup) need real domain logic = owning-galaxy work, not echo's to inline (soul refuse).
- **Tooling lesson** — under fleet contention the default `gpt-oss:120b` synth model is unloadable; force `--synth-model gpt-oss:20b` on `mine-galaxy-transcripts.mjs` and `--model qwen2.5-coder:32b` on `galaxy-synthesis-refresh.mjs` (they otherwise defer/fail silently while reporting exit 0). See `[[feedback_galaxy_synthesis_refresh_force_warm_model]]`.

## Wiki map (all post-processor entries)

| Entry | What |
|-------|------|
| [[architecture/post-processor-galaxy]] | galaxy doctrine — engine tiers, scope, related galaxies |
| [[architecture/post-processor-controller-dialect-matrix]] | the dialect gotchas + 14-controller coverage + JM production controllers |
| [[architecture/post-processor-pipeline]] | the 7-phase / 38-stage emit pipeline (P0 defaults → P6 output) |
| `architecture/post-processor-writing-corpus` | post-writing corpus + variability matrix |
| `architecture/post-processor-fleet-baselines-2026-05-25` | prove-out baselines (50/50 structural) |
| `architecture/tests/post/post-processor-{ai,engines,feed-optimizer,knowledge,new-stages,pipeline,strategy-validation}` | per-engine test docs |
| `architecture/monolith-modules/engines-post-processor/post-processor-{100-percent,engine-v2}` | monolith module docs |

Galaxy doctrine (load first): `mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`.

## Engine surface (tiered)

- **Tier-1 MasterPost (saleable):** `MasterPostProcessorEngine` (7-engine fanout) · `MasterPostProcessorUnifiedAGIEngine` (14 controllers / 19 CAM / 25+ ops, `UnifiedPostResult`) · `PostProcessorPipelineEngine` (7-phase/38-stage) · `MasterPostFineTuningEngine` (per-vendor LoRA-class) · `HurcoV11MillMasterPostEngine` (JM lead Hurco WinMAX).
- **G-code core (12):** `GCodeSafetyAnalyzerEngine` (central safety gate) · Template/Snippet · IntelligencePipeline · Validation/Verification · Transpiler · Energy/Optimization/BidirectionalOptimizer · Runtime/Time predictors · UnderstandingTransformer (NL→GC) · ReverseCAD (GC→CAD).
- **Controller-specialist (8 stub-wired — leverage class):** `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}` · `LathePostProcessorAI` (73K) · `LathePostGeneratorActiveLearning` · `JMDiePostProcessorLearning`.

## Tribal knowledge (compiled — the domain's hard-won lessons)

These are the operator/shop-floor + prove-out lessons that make or break an emitted program. Each is encoded as a lint rule in `scripts/post-nc-dialect-lint.mjs` where marked ✔.

1. **Coolant follows spindle-at-speed (mill).** ✔ M8 (flood) must come *after* M3/M4 — flood on a non-rotating tool means a wet floor before the tool engages. On a **lathe** (G96/G97 CSS, G50 clamp) M8-before-M3 is *conventional and safe* — do not flag it as an error. (Lint R1 is turning-aware.)
2. **M50/M51 are NOT coolant.** On many controllers they are auxiliary (chip conveyor, parts catcher, work light, aux axis). Only M7 (mist) / M8 (flood) are universal coolant-on. Treating M50/M51 as coolant produces false alarms. (Lint R1 lesson, 2026-05-29.)
3. **Comment delimiters are dialect-specific.** ✔ Okuma OSP uses `[ ]`; Fanuc / Haas / Hurco / Mazak use `( )`. A leaked `[prose]` comment in a Fanuc post (or `(...)` in Okuma) is a dialect-purity defect. BUT a Fanuc macro `[#1+#2]` is NOT a comment — never flag arithmetic/`#` brackets. (Lint R6/R7, macro-safe.)
4. **Feed mode must be established before the first feed move.** ✔ G93 inverse-time vs G94 ipm vs G95 ipr — a `G1/G2/G3 F…` before any G93/G94/G95 leaves feed units ambiguous → wildly wrong feed. (Lint R5.)
5. **Retract before a tool change while a cut is open.** ✔ An M6 with an open cut (a G1/G2/G3 since the last G28/G53/G0-Z retract) risks rapid-through-stock. A tool change at program start, or right after a retract, is safe — do not flag it. (Lint R4.)
6. **Modal tapping is dialect-specific.** ✔ Siemens uses `MCALL`/`CYCLE84`; Fanuc/Haas use `G84`. Cross-dialect leakage = silent wrong canned cycle. (Lint R8.)
7. **Modal-state must survive subprograms (M98/M99).** A modal G/M (WCS, plane, feed mode) that leaks across an M98 subprogram call = silent wrong plane/WCS. Verify modal continuity through sub calls.
8. **Byte-equivalence vs the golden NC archive.** A re-emitted program should be byte-equivalent (modulo intended changes) to its golden archive copy; ad-hoc string-concatenation of G-code breaks this and bypasses the pipeline's physics (P1) + safety+tribal (P5) gates. Never string-concat NC — route through `PostProcessorPipelineEngine`.
9. **Stub-wired ≠ wired.** The 8 controller-specialist engines have a single dispatcher case each with a `"method not callable"` fallback — they are *dark in practice*. Treat them as a build backlog (MS-MASTERPOST), not as shipped capability.
10. **MS-MASTERPOST is legally gated (U-LEGAL-13).** Controller dialect codes are re-derived only from *public* manuals; do not lift proprietary post internals. Nothing from H:/prism is published publicly.

## Dialect quick-reference (JM production, 4 of 14)

| Controller | Comment | Tap | High-end features used at JM |
|-----------|---------|-----|------------------------------|
| **Haas Classic** | `()` | G84 | iMachining var-feed, G187 P1/P2/P3 smooth, M8/M88/M89 |
| **Hurco WinMAX (MAX5)** | `()` | G84 | UltiMotion G64, G05.3 P10/P20/P35, M98 sub, M140 Z-retract |
| **Okuma OSP-P300** | `[]` | (CYCLE) | Super-NURBS G131, TCP G169/G170, CAS collision-avoid, HSM G132 |
| **Fanuc 31i** | `()` | G84 | AICC II G05.1 Q1, Nano smooth G5.1 Q3, HSM G05 P10000 |

## Quality gates (validate before a program ships)

- **Static dialect lint (no engine/build/MCP):** `node scripts/post-nc-dialect-lint.mjs <file> --dialect <name>` · skill `/post-nc-lint` · auto-runs on NC edits via `post-nc-dialect-guard.mjs`. 8 rules above.
- **Pipeline emit:** `PostProcessorPipelineEngine` (P1 physics + P5 safety+tribal are non-negotiable).
- **Central safety gate:** `GCodeSafetyAnalyzerEngine` (rapid limits, coolant order, retract heights).
- **Engine-runtime cross-dialect check:** `scripts/find-cross-dialect-leaks.mjs` (needs built engine).
- **Scored reward (non-circular):** `node scripts/post-gen-reward.mjs <file> --dialect <name> [--golden <ref.nc>] [--json]` — the single number that gates/ranks emitted NC. Composes up to 4 orthogonal signals: dialect-lint (reuses `lintNc`, 0.45/0.25 wt) + structure-completeness (units/spindle/retract/program-end/tool-or-CSS — *presence*, not order; order is lint's job) (0.35/0.15) + alarm-association (data-driven from the 2,588-alarm DB, HIGH/CRITICAL) + golden line-set Jaccard (0.5 wt when `--golden` given). **The alarm component is EXCLUDED (weight renormalized onto the others) for any controller family without *non-universal* code-bearing alarms** — in the shipped DB that is every family except SIEMENS (only G25/G26 carry real signal); HURCO + FANUC have none, so alarm never dead-weights the HurcoV11 reward, and universal codes (M06/G41/G43/G99…) are never penalized (alarm text names them as context, not faults). **Completeness-gated** (`reward *= struct.score` when struct < 0.6) so an empty/trivial program can't score high by merely *lacking* problems. Exit 0 (reward ≥ 0.6) / 3 (below) / 2 (bad invocation). Lib API: `import { scorePost } from scripts/post-gen-reward.mjs`. This is the closed-loop reward fn for HurcoV11 fine-tuning — run it on `master_post_hurco_v11` output (`hurcoV11MillMasterPostEngine.generateProgram`) to get a measurable baseline, then on each fine-tune iteration to confirm the number moves the right way.

## Databases consumed (machines / controllers / alarms)
Post-gen routes by **machine** → emits by **controller** dialect → should validate vs **alarms**. juliett (database-expansion) owns these stores — bidirectional bridge in `database-expansion/MEMORY.md`; full pathways in `PATHS.md §Machine/Controller/Alarm databases`.
- **Machines (824):** `src/registries/MachineRegistry.ts` (824 / ~30 mfrs, byController index) + MachineConfig/Handbook/Option/Rate DB engines + `ShopConfigurationEngine` (21 JM target fleet). `master_post_by_machine` routes by `machine_model` → engine (coverage audit found only ~6 wired).
- **Controllers (~30):** `src/data/controller-knowledge.json` + `okuma-dialect-knowledge.ts` + `CONTROLLER_PROFILES` (14 in UnifiedAGIEngine). The emission-dialect source.
- **Alarms (2,588 / 13 controllers):** `src/data/controller-alarm-database.json`. **CORRECTED 2026-06-24 (slot:echo):** alarm cross-reference IS wired — `PostProcessorPipelineEngine` Stage **5.1b** (`5.1b_alarm_check`, line ~3153, PP-MOAT-MS3 U05) checks emitted blocks against controller alarms via `AlarmRegistry` (data: `MASTER_ALARM_DATABASE.json`). Residual refinement (not "absent"): confirm Stage-5.1b coverage spans the full 2,588-entry `controller-alarm-database.json`, not just AlarmRegistry's master set.
- **Tools (41,495 / 32 catalogs):** `src/data/*-tools-extracted.json` (osg 11550, iscar 5449, guhring 3421, accupro 3015…) via `ToolCatalogEngine`/`CAMToolLibraryEngine`/`FusionToolLibraryEngine` — T#/geometry for tool-length + cutter comp.
- **Holders (1,889 / 5):** `src/data/*holder*-extracted.json` (big-daishowa 1208, haimer 489…) via `ToolHolderCatalogEngine`/`HolderOperationMatchEngine` — gauge length / collision for retract+clearance.
- **Fixtures / workholding:** `Monolith{Fixture,Workholding,HyperMillFixture}DatabaseEngine` + `StockWorkholdingCatalogEngine` + ~12 `Fixture*`/`LatheWorkholdingEngine` — WCS origin / clearance / safe-Z.
- **Tool paths (kilo CAM):** `AdaptiveToolpathRouter`/`MultiaxisToolpath`/`FiveAxisToolpath*`/`PPToolpathStrategyEncoder` engines → `ToolpathBlock` → pipeline P2; emitted corpus = 160,582 NC programs.

## Full-system dependency map — generating a post for THE CUSTOMER
Everything PRISM must pull from the whole system to emit a correct *customer* post. ✅ wired into galaxy · ⚠ partial/unwired (build backlog).
1. **Customer context** ⚠ — `CustomerKnowledgeEngine`/`JMCustomerVendorDatabaseEngine` (identity→machine fleet) + `PostLibraryConfiguratorEngine` (per-customer post config/prefs — the customer-post product surface). GAP: customer-prefs → emit pipeline not proven wired.
2. **Machine routing** ⚠ — `MachineRegistry` 824 → `master_post_by_machine` (only ~6 wired; **4 P0 gaps**: Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route — see `POST-GEN-COVERAGE-AUDIT`).
3. **Controller dialect** ✅ — `controller-knowledge.json` (~30) + `CONTROLLER_PROFILES` (14) + `okuma-dialect-knowledge.ts`.
4. **Alarms** ✅ — pipeline P5 Stage 5.1b (`5.1b_alarm_check`) cross-references emitted blocks vs controller alarms via `AlarmRegistry` (PP-MOAT-MS3 U05). Residual ⚠: confirm full `controller-alarm-database.json` (2,588) coverage vs the AlarmRegistry master set.
5. **Job geometry** ✅(cross-domain) — CAD (delta) → features → toolpaths (kilo CAM, 19 systems) → `ToolpathBlock` → P2.
6. **Tools / holders / fixtures** ✅ — 41,495 tools / 1,889 holders / Monolith fixture DBs → T#/cutter-comp/gauge-length/WCS/clearance.
7. **Materials + feed/speed** ⚠ — 2,544 materials + Kienzle ISO constants + oscar `CAMSpeedFeedBridgeEngine`; GAP: material→feed/speed→pipeline P1 auto-pull (vs caller-supplied).
8. **Physics + safety pipeline** ✅ — `PostProcessorPipelineEngine` P1(Kienzle/Taylor/Tlusty)→P2(force/thermal/wear)→P4(CI95)→P5(safety+tribal)→P6; `GCodeSafetyAnalyzerEngine`; `cam_post_emit_safety_gate`.
9. **Output config** ⚠ — units (inch/mm) + dialect (comment/decimal/feed-mode) + program naming; per-customer in `PostLibraryConfiguratorEngine` (verify wired).
10. **Learning / quality** ✅ — india NN/GNN/LoRA closed-loop + `MasterPostFineTuningEngine` (per-vendor calibration) + tribal + outcome-bus.

**Net to be a complete customer-post generator:** close the 4 P0 machine routes + wire (a) customer-prefs→pipeline, (b) alarm-aware P5, (c) material→feed/speed auto-pull. **Engines for all 10 legs EXIST — the residual gaps are wiring/routing, not absence.**

## Auto-invoke (how this surfaces)

- `echo-post-domain-inject.mjs` (UserPromptSubmit T2) — fires on post-processor keywords, points here + emits the digest. Disable `PRISM_ECHO_POST_DOMAIN_INJECT_DISABLE=1`.
- `tribal-by-domain-inject` — surfaces top-3 tribal hits for slot domain.
- `wiki-precheck-inject` — surfaces top wiki entries on keyword match.

## See also
- [[architecture/post-processor-galaxy]] · [[architecture/post-processor-controller-dialect-matrix]] · [[architecture/post-processor-pipeline]]
- Memory: [[reference_echo_nc_dialect_lint]] · [[reference_controller_dialect_matrix]] · [[reference_post_dispatcher_surface]]
- Galaxy: `mcp-server/src/engines/post-processor/MEMORY.md`

_Authored by slot:echo (claude-223d9a61), 2026-05-29 — /goal "compile all relevant wiki and tribal knowledge for your domain: wired, validated, auto-invoked."_
