# PRISM AWARENESS BUNDLE
**Mode:** standard · **Generated:** 2026-05-10T17:09:44.922Z · **Source:** prism-awareness-bundle.mjs

> Treat this bundle as authoritative context. Do NOT re-derive what's stated below — call MCP actions
> shown in the access tables to fetch live data. Edit `H:/PRISM/CLAUDE.md` to update the source brief.


---
## CLAUDE-BRIEF (state/shared/CLAUDE-BRIEF.md)

# CLAUDE-BRIEF — PRISM Continuous Awareness

**Auto-generated:** 2026-05-09T19:10:53.391Z  ·  Regenerated each SessionStart by `generate-claude-brief.mjs`.
If timestamp >24h old, run: `node H:/prism/mcp-server/scripts/generate-claude-brief.mjs`

---

## What PRISM is

Manufacturing-intelligence platform Mark is building. Speed/Feed Calculator (SFC) + Master Post are the two saleable subscription products. CAD/CAM AI consumes both and drives autonomous CAD generation + CAM programming. Six tier-1 CAM bridges (Fusion 360, hyperMILL, Mastercam, Esprit, Inventor HSM, SolidWorks). Three-tier AI hierarchy: Claude (Tier-1 master orchestrator), FullSystemAICoordinator (Tier-2), seven domain specialist AIs (Tier-3). Closed-loop learning from shop floor + ERP. JM Die Company is the test shop. Operator-in-the-loop is unconditional.

## Identity & paths

- **MCP root:** `H:/prism/mcp-server/dist` · **port:** 3100
- **Source of truth:** `H:/prism` (C:\ is legacy/avoid; auto-mirrored from C:\Users\wompu\.claude only for harness settings)
- **Test shop assets:** `H:/prism/JM DIE/` (production NC, NOT canonical) · `H:/prism/Resources/` (custom posts in mid-modification)
- **Worktrees:** `H:/prism` is the main; per-milestone forks in sibling `H:/prism-<scope>/`

## System scale

- Engines: 3173  ·  Dispatchers: 97  ·  Actions: ?  ·  Hooks: 54
- Audit cards: `PRISM-INVENTORY-LATEST.md`, `state/shared/AUDIT-*.md`, `state/shared/DISCOVERY-*.md`
- **Honest coverage** (60 vision sub-elements graded): production 38% · beta 47% · stub 10% · planned 5%

## Process priority

1. **Mill** — production. Kienzle/Taylor/SLD/deflection/thermal/wear/chatter all wired.
2. **Lathe / mill-turn / sub-spindle** — production 98%. Forces, threading, hard-turn, P2P pipeline, AGI knowledge graph all wired. Includes Okuma B250IIW.
3. **Wire EDM** — production 95%. All safety gates, P2P pipeline, AGI orchestration wired.
4. Laser / waterjet / sinker EDM — deferred (scaffolding only).

## CAM integration status (tier-1)

| CAM | Priority | In-host runner | Status |
|-----|----------|----------------|--------|
| hyperMILL | 2 | full Project Manager runtime, 63 engines | **production** (best) |
| Mastercam | 3 | C-Hook generator only | production (no live link) |
| Inventor HSM | 5 | full in-host runner | beta |
| Fusion 360 | 1 | runner present, Python add-in plan-only | beta |
| Esprit | 4 | NOT WIRED (9 declared actions, 0 in dispatcher) | **stub — verdict: aspirational** |
| SolidWorks | 6 | AutomationBridge + CodeGenerator only, no add-in | stub |

Tier-2 (17 CAMs): function indexes exist for SolidCAM/BobCAD/Cimatron/TopSolid/WorkNC/CAMWorks/EdgeCAM/GibbsCAM/SprutCAM/Tebis/Creo/PartMaker/FeatureCAM/AlphaCAM/VISI/CATIA/NX. Most are scaffolding pending the tier-1 deliverables.

## JM machine fleet

**14 active · 1 standby · 0 down · 0 retired** (see `JM-FLEET-INVENTORY.md`).

**Flagship — Okuma Multus B250IIW:** see JM-B250II-DEEP-AUDIT.md
- master_post_okuma_b250 action: WIRED
- All 6 Okuma macro actions (casing/cbore/validate/parse/defaults/convert): WIRED
- OSP-P300SA dialect: ~75% (G50/G96/G97/G72/G70/G76/G83/G87/M38/M39/G112/G12.1/G13.1 ✓; **MISSING $1/$2 channel prefixes, WAITM sync barriers, IGF, V-variable arithmetic**)
- Sub-spindle handoff: PARTIAL — M38/M39 emitted, multi-channel structure absent

Per-machine support scores: Okuma OSP family **4/5** · Hurco VM30i **4.5/5** · Haas VF-2/OM-2 **2.5/5** (no `master_post_haas_*` despite 2 production mills) · Mitsubishi WEDM FA10S **4/5** · Mitsubishi sinker EA12S/D **2/5**.

## Saleable products

| Product | Status | Subscribers |
|---------|--------|-------------|
| **SFC** (Speed/Feed Calculator) | production — only Tier-3 AI with full feedback loop wired (PPGSFCClosedLoop + SFCOutcomeCapture) | billing infrastructure wired (`prism_business:billing_*`) |
| **Master Post** | beta — 74+ controllers covered, but 35-vs-38-stage pipeline number conflicts internal docs; no E2E test asserts per-block adaptive S/F | per-controller subscription wired |

**31 saleable features discovered — only 20% surfaced** (80% under-advertised). Top 5 hidden product features:
1. Print-to-Program pipelines (Mill/Lathe/MultiAxis/Threading/HolePattern/SecondaryOps) — competes with Mastercam Dynamic + iMachining + ESPRIT TNG combined
2. Customer Portal token system + Stripe-style billing — Paperless-Parts class
3. Master Post per-controller (74+ controllers) with dialect translation
4. Generative Process Planning + Sustainability/ESG (energy/carbon/exergy/LCA, 25+ actions)
5. Proof-Carrying G-code Emit + Λ formal-logic proof BLOCKING hook — unique aerospace/medical differentiator

## AI hierarchy

**24 AI nodes** over ~360 engines. Tier-3 specialists: SFC, Post, Mill, Lathe, WEDM, CAD, CAM. Plus 17 vendor LoRA chains.

- **production:** 3 (claude_master, sfc_ai, ai_system_router)
- **beta:** 16 (post, mill, lathe, cad, cam, all vendor AIs)
- **stub:** 1 (ai_intelligence_maximizer)
- **planned:** 4 (grinding/laser/mill_turn LoRA scaffolds)

**Feedback loops wired:** 1 (sfc_ai only). **0 .safetensors / .pt / .gguf adapters anywhere on disk** despite 80 LoRA support engines referencing them — Lathe AI is textbook scaffold-without-loop.

**Tier-2 coordinator is fragmented** — 4 candidates (PRISMUnifiedOrchestrator, AISystemRouter, MetaAIOrchestration, AIIntelligenceMaximizer), no canonical. Claude calls Tier-3 directly with no supervision contract.

## Knowledge bridge matrix (silent-rot detection)

**Ingestion:** 4 active (PDF Learn 7,250 tips · hyperMILL 434 · JM Die 24,545 indexed · cad-engine store) · 1 stale · 2 dead (Video Learn never started; JM Die CAD Corpus engine awaits binary parser).

**Consumers (15 audited):** 5 active · 1 stale · 4 broken · **5 never-wired**.

**Live verification: 0 of 5 test queries cited tribal sources.** Critical findings:
- `ai_milling_deep_reason` returned "0 evidence" against 7,250-tip corpus
- `cam_strategy_recommend` bypasses both `cam_tribal_lookup` AND `cam_rag_retrieve` despite same dispatcher
- `MillingAGIMaster`, `LatheAGIKnowledgeUnification`, `CADDrawingKnowledge` carry "Knowledge"/"AGI" branding but show **0 invocations** of tribal/playbook/RAG engines

## Top 10 honest gaps

1. 1
2. 2
3. 3
4. 4
5. 5
6. 6
7. 7
8. 8
9. 9
10. 10

## Corpus reality (DO NOT treat as canonical)

Programs in `H:/prism/JM DIE/` are **noisy training data, NOT gold-standard**. Custom posts in `H:/prism/Resources/` are **work-in-progress reference, also suspect**. PRISM legitimately may exceed Mark's existing programs — flag improvements with physics evidence, sellable feature.

Convergence policy: `started` → free_to_improve · `in_progress` → review_and_decide · `fine_tuned` → must_match.

## Safety architecture (calibrated, not absolute)

S(x) ≥ 0.70 hard block · Ω ≥ 0.70 release-ready · Evidence ≥ L3 · validate_anti_regression before file replacement. Operator-in-the-loop unconditional — system sign-off does NOT authorize machine execution; operator does. PRISM does NOT claim 100% accuracy. Defense in depth: engines + simulations + hooks + Claude meta-gate + operator.

## Active build context (auto-injected)

## Active branch

**`work/cam-exhaust-ms0`**  ·  41 ahead / 1 behind upstream
 · last unit: **U-CAM-HM-HT-TESTS-01**


## What we just built (last 7 days)

- `56ea32037` (2026-05-02) — [MAIN] PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring-followup: pin hash 01b44110d
- `01b44110d` (2026-05-02) — [MAIN] PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring: RapidRepositionOptEngine pipeline → Hurco + Okuma
- `b53a31b96` (2026-05-02) — [CAM-EXHAUST-MS0]/U-CAM-HM-HT-TESTS-01: HyperMillHeatTreatmentRouter test coverage
- `efab22a7d` (2026-05-02) — [MAIN] PPG-WIRE-MS5/U-PPGW-AdvancedWiring-followup: pin hash 4ca5d71cc
- `4ca5d71cc` (2026-05-02) — [MAIN] PPG-WIRE-MS5/U-PPGW-AdvancedWiring: AutoSpeedFeed pipeline → Okuma + Hurco
- `91885d7c3` (2026-05-02) — [MAIN] PPG-WIRE-MS5/U-PPGW-FleetProfiles: register JM Die fleet + capability schema
- `ceaf35059` (2026-05-01) — [CAM-EXHAUST-MS0]/U-CAM-HM-BLADE-TESTS-01: HyperMillBladeRoughingEngine test coverage
- `f451489e1` (2026-05-01) — [CAM-EXHAUST-MS0]/U-CAM-HM-PROBE-TESTS-01: HyperMillProbingBridge test coverage
- `3d7f40dd7` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill-CallOO88-followup: pin hash 09f155d03
- `09f155d03` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill-CallOO88: 5-axis fixture-offset macro
- `8acd67f4b` (2026-05-01) — [CAM-EXHAUST-MS0]/U-HMR-TESTS-01: HyperMILL bridge test coverage (3 dispatcher-wired engines)
- `07ee61a29` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal-followup: pin commit hash 765c2102b in RESUME_POSTS
- `765c2102b` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal: JM_DIE_PRESET + 14 tribal tips
- `290e8f886` (2026-05-01) — [CAM-EXHAUST-MS0]/U-CAM-MC-PROBE-01: Mastercam probing bridge dispatcher wiring + tests
- `32e04c301` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill-followup: pin commit hash b60ec9260 in RESUME_POSTS
- `9a322d8ef` (2026-05-01) — [CAM-EXHAUST-MS0]/U-CAM-MC-MOLD-01: Mastercam mold cavity/core cycle dispatcher wiring + tests
- `b60ec9260` (2026-05-01) — [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill: OkumaOSPMillMasterPostEngine + sidecar seal
- `e226852d2` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-MC-SI-01: Mastercam surface integrity prediction (Ra/Rz + white-layer + residual stress)
- `78408f74b` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-MC-GRIND-01: Mastercam grinding bridge — 8 grinding kinds + wheel RPM/grit physics
- `4feff0416` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-MC-EDM-01: Mastercam EDM bridge — Wire 2/4-axis + Sinker + Micro routing
- `9c3a98a28` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-FUSION-AI-01: Fusion 360 AI orchestration routing — Fusion CLOSES at 100%
- `9a4044da1` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-FUSION-MILLTURN-01: Fusion 360 mill-turn archetypes + sub-spindle handoff + thread pass scheduler
- `30a01c93d` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-FUSION-MULTIAXIS-01: Fusion 360 5-axis kinematic + indexed plane math
- `fca91ac59` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-FUSION-TOOL-01: Fusion 360 tool library round-trip + validation
- `f52f93bd1` (2026-05-01) — [MAIN] CAM-EXHAUST-MS0/U-CAM-FUSION-PROBE-01: Fusion 360 probing bridge (13 ops, Renishaw/Blum macro vocab)

### New engines added (103)

- OkumaOSPMillMasterPostEngine
- MastercamSurfaceIntegrityBridge
- MastercamGrindingBridge
- MastercamEDMBridge
- Fusion360AIOrchestrationEngine
- Fusion360MillTurnBridgeEngine
- Fusion360MultiAxisEngine
- Fusion360ToolExportEngine
- Fusion360ProbingBridgeEngine
- Fusion360MaterialBridgeEngine
- Fusion360SafetyHooksEngine
- Fusion360StrategyEngine
- Fusion360ControllerCatalogEngine
- Fusion360CycleCatalogEngine
- CAMInHostRegressionDetectorEngine
- CAMInHostNightlyOrchestratorEngine
- CAMInHostResultsBridgeEngine

> Full active-build snapshot: `state/shared/PRISM-BUILD-CONTEXT.md` — regenerated hourly by drift monitor + on staleness.

## Build vision per component (consult before building)

**- [Speed/Feed Calculator (SFC)](#sfc) — 💰 saleable, tier: primary
- [Master Post (per-controller subscription)](#master_post) — 💰 saleable, tier: primary
- [CAD/CAM AI](#cad_cam_ai) — 💰 saleable, tier: secondary
- [AI Hierarchy (3 tiers)](#ai_hierarchy) — 🔧 infra, tier: infrastructure
- [JM Die Machine Fleet (test shop integration)](#jm_fleet) — 🔧 infra, tier: infrastructure
- [Business / ERP layer](#erp_business) — 💰 saleable, tier: secondary
- [Knowledge ingestion + tribal store](#knowledge_ingestion) — 🔧 infra, tier: infrastructure
- [Closed-loop learning](#closed_loop_learning) — 🔧 infra, tier: infrastructure
- [Hooks / safety / quality](#hooks_safety_quality) — 🔧 infra, tier: infrastructure
- [Frontend / web (React + Vite)](#frontend_web) — 💰 saleable, tier: secondary
- [Six**

*Full vision per component in `state/shared/PRISM-BUILD-VISION.md`. Read the relevant section BEFORE writing code for that component.*

## Active work + per-chat lanes

- Branch: `work/cam-exhaust-ms0` · last topic: `U-PPGW-RapidReposition-Wiring-followup` · 3 sessions in last 24h
- 6 concurrent Claude chats — each owns its own `work/<scope>` worktree
- Active claims: see `AGENT_WORKBOARD.md` and chat bus messages from `prism_context:chat_post`
- Multi-chat conflict-fork rule: never fight for shared HEAD — fork to your own worktree

## Wiki + memory pulse (compounding-by-default — see `OBSIDIAN-COMPOUND-MS0`)

**Vault:** `H:/prism/knowledge/` (Karpathy LLM-Wiki + auto-mirrored memory atomic notes).

**Recent wiki activity** (last 5 distinct ops from `wiki/log.md`):
- [2026-05-08] bootstrap | initial seed from digests + memories | by:wiki-bootstrap.mjs
- [2026-05-06] memory_sync | scanned:75 mirrored:0 skipped:75 failed:0 | by:unknown
- [2026-05-05] memory_sync | scanned:75 mirrored:0 skipped:75 failed:0 | by:unknown
- [2026-05-05] memory_sync | scanned:74 mirrored:0 skipped:74 failed:0 | by:unknown
- [2026-05-05] memory_sync | scanned:74 mirrored:1 skipped:73 failed:0 | by:unknown

**Memory vault:** 116 atomic notes total · **5** modified in last 24h.

> Recall pulse: keyword-gated injection via `memory-rag-inject.mjs` + `wiki-precheck-inject.mjs`. Use `[[wiki-links]]` in new memories for free cross-reference. Don't re-derive what the wiki already documents — query `/wiki-query <name>`.

## Drift monitor

`scripts/brief-drift-monitor.mjs` runs hourly via scheduled task, regenerates this brief on material drift (engine count >5%, new dispatcher, AI training event, CAM addin status change, JM fleet status change). Drift events logged to `state/shared/brief-drift-log.jsonl`.

---

**Generation:** 2026-05-09T19:10:53.391Z  ·  Last regenerated 28.6h ago.


---
## CURRENT INVENTORY (head)

# PRISM Complete Asset Inventory
**Generated:** 2026-05-10
**Updated:** 2026-05-10T17:03:33.705Z
**Source:** live scan (45ms) — via scripts/update-prism-inventory.mjs

> This file is auto-generated. Edit `scripts/update-prism-inventory.mjs` to
> change counts or categories. Values labeled **(baseline)** come from
> `mcp-server/data/state/BASELINE_INVENTORY.json` and require manual refresh.

## Summary

| Category | Count | Source |
|----------|-------|--------|
| **Engines** | 3180 | live: `src/engines/*.ts` |
| **Dispatchers** | 97 | live: `src/tools/dispatchers/*.ts` |
| **Actions** | 7341 | live: `z.enum` count across dispatchers |
| **Algorithms** | 53 | live: `src/algorithms/*.ts` |
| **Registries** | 26 | live: `src/registries/*.ts` |
| **Tests** | 3428 | live: `src/__tests__/**/*.test.ts` |
| **Source Hooks** | 54 | live: `src/hooks/**/*.ts` |
| **Claude Hooks** | 457 | live: `.claude/hooks/**/*.mjs` |
| **Scripts** | 521 | live: `scripts/` + `mcp-server/scripts/` |
| **Slash Commands (local)** | 247 | live: `.claude/commands/` |
| **Slash Commands (user)** | 390 | live: `~/.claude/commands/` |
| **Migrations** | 1 | live: `src/migrations/*.ts` |
| **Formulas** | 499 | (baseline) |
| **Registry Entries** | n/a | (baseline) |
| **Toolpath Strategies** | n/a | (baseline) |
| **Post Processors** | n/a | (baseline) |
| **Materials** | n/a | (baseline) |
| **Tools** | n/a | (baseline) |
| **Machines** | n/a | (baseline) |
| **Tribal Tips** | 
[TRUNCATED at 1500 bytes]

---
## MEMORY INDEX (~/.claude/projects/H--PRISM/memory/MEMORY.md)

# PRISM Project Memory
## Last synced: 2026-05-07T22:15:15

## Primary Roadmap
**File:** `C:\Users\wompu\.claude\plans\sleepy-chasing-prism.md`
**Title:** PRISM App — Comprehensive Layered Roadmap (v2 — Execution Protocol)
**NOTE:** This is the ONLY roadmap to follow. Ignore old phase docs (R15, etc.) in `data/docs/roadmap/`.

## Current Position
unknown

## Omega Target
User explicitly wants **Omega = 1.0** for ALL future milestones. Not 0.75 — full 1.0.

## Working Mode
- YOLO mode: autonomous execution, auto-commit after each unit
- Commit format: LAYER-PHASE-UNIT: title — summary
- Security: use execFileNoThrow, never shell injection patterns
- Maximum token efficiency: parallelize independent work, minimize back-and-forth
- **ALWAYS BUILD, NEVER SKIP** — gap analyses must build every identified engine. See feedback_always_build.md. Enforced by Stop hook always-build-guard.mjs + registry state/shared/PENDING_GAP_ENGINES.json.

## Key Counts (frozen in BASELINE_INVENTORY.json)
- 97 dispatchers, 7244 actions, 3163 engine files
- 14 registries, 29,569 entries, 61 skills, 48 scripts, 17 algorithms
- 59 hooks (registry) / 112 hooks (source), 40 cadence functions
- 0 tsc errors, 3383/3383 tests pass, 5.1MB build, Omega = 1

## Architecture
- MCP server: H:\prism\mcp-server\
- Build: npm run build (tsc noEmit + esbuild), heap 16GB
- Build fast: npm run build:fast (esbuild only, skip tsc)
- Tests: npx vitest run
- Web app: mcp-server/web/ (8 pages, thin client)
- State: mcp-server/data/state/ (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)
- State (legacy): state/ (CURRENT_STATE.json, SESSION_MEMORY.json)

## Key Files
- Roadmap: sleepy-chasing-prism.md (the ONLY source of truth)
- Position: state/CURRENT_POSITION.md
- Health: mcp-server/data/state/HEALTH_CHECK_REPORT.json
- Baseline: mcp-server/data/state/BASELINE_INVENTORY.json
- Schema: mcp-server/src/schemas/roadmapSchema.ts

## Indexed memories
- [Conflict-fork rule defeats commit-ownership-guard hollowing](feedback_conflict_fork_rule.md) — fork to sibling worktree after first hollow commit; main-tree retries waste cycles in multi-chat hostile environment.
- [MILESTONE_PROGRESS surface](reference_milestone_progress_surface.md) — `state/shared/MILESTONE_PROGRESS.{md,json}` is the git-grounded delta of envelope claims vs shipped reality; audits should subtract its `shipped` arrays from their gap lists.
- [BUILD_STATE auto-injected memory surface](reference_build_state_surface.md) — `state/shared/BUILD_STATE.{md,json}` answers "built / needs wiring / pending / needs frontend merge" and is auto-injected via `build-state-inject` hook on SessionStart + keyword-gated UserPromptSubmit. Skill: `/build-state`.
- [PRISM System Viz — live 3D system map](reference_system_viz.md) — 10-layer / 334-node / 627-edge interactive map at `state/shared/system-viz/` (slash command `/system-viz`, server :8765). Use for roadmap planning, refactor blast-radius, multi-chat conflict avoidance. Query adapter: `scripts/system-viz-query.mjs`. Authoritative directive: `state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md`.
- [JM Die program save practice](reference_jm_die_program_save_practice.md) — Mazak/Okuma lathe saves `.MIN` w/ `$<INTERNAL>%` line-1 header. Inventor/Fusion/SolidWorks mill saves NO G-code — `.ipt`/`.iam`/`.f3d`/`.SLDPRT` IS the program; G-code goes USB → discard. Treat those CAD as program-equivalent for matching.
- [Docustrata multi-print container PDFs](reference_docustrata_multi_print_pdfs.md) — 96% of Docustrata PDFs are multi-page; single PDFs can hold 5-10 prints buried on pages 2+. Phase 3c page-1-only missed 24,186 docs / 120K pages. Use `phase8-tiered-blueprint-classifier.py` (image heuristic → Tesseract title-block OCR → vision LLM) for full extraction. Validated yield 4.5%/page → ~5,400 new prints expected.

## Recent Commits
```
03586e2fa [XPROC-NEURAL-OPTIMIZE-MS0]/U-NN-ADAPTIVE-ALPHA01-WORKTREE: AdaptiveConformalAlphaEngine + dual-dispatcher wiring (isolated worktree per conflic
[TRUNCATED at 4000 bytes]

---
## CURRENT POSITION (state/CURRENT_POSITION.md)

# CURRENT_POSITION

**Last Updated:** 2026-05-10T17:03:24.436Z
**Session:** anon-982cfe74
**Last Milestone:** XPROC-NEURAL-CONNECT-MS0
**Last Completed Unit:** U-V3-ENVELOPE-FOLD

## This Session
- ✅ XPROC-NEURAL-CONNECT-MS0/U-CN06
- ✅ CAD-FUSION-LIVE-MS0/U-JUNCTIONS-CATCH-FIX
- ✅ CAD-FUSION-LIVE-MS0/U-WIRING-CHECK-FIX
- ✅ CAD-FUSION-LIVE-MS0/U-D2
- ✅ CAD-FUSION-LIVE-MS0/U-PIPELINECONSISTENCY-TEST
- ✅ CAD-FUSION-LIVE-MS0/U-AUDIT-TO-UNITS
- ✅ K2-CLOUD-MS0/U-K1-INVENTORY
- ✅ CAD-FUSION-LIVE-MS0/U-V3-ENVELOPE-FOLD

## Resume
Check `state/shared/checkpoints/MERGED_POSITION.json` for cross-session state.


---
## PRISM AI ACCESS (callable via MCP from any CLI)

| Capability | Dispatcher action | When to use |
|---|---|---|
| Chain-of-thought reasoning | `prism_ai:cot_reason` | step-by-step deliberate reasoning |
| Tree-of-thought reasoning | `prism_ai:cot_reason_tree` | branching alternatives, pick best |
| Cross-domain creative | `prism_ai:creative_solve` | novel synthesis across 15 domains |
| Causal analysis | `prism_ai:causal_analyze` | "what caused X?" — deterministic graph |
| Counterfactual prediction | `prism_ai:counterfactual_predict` | "what if Y happened instead?" |
| AI feature recommend | `prism_intelligence:ai_feature_route` | "which engine should I use for X?" |
| Autonomous orchestration | `prism_intelligence:ai_orchestrate_autonomous` | multi-step plan + execute |
| Belief tracking | `prism_ai:belief_set` / `belief_query` | persistent assumption store |
| Scientific reasoning | `prism_ai:scientific_reason` | physics-first hypothesis testing |
| Lathe AGI | `prism_business:lathe_agi_reason` | turning-specific deep reasoning |
| Mill AGI | `prism_mill:mill_agi_orchestrate` | milling-specific deep reasoning |
| Self-awareness query | `prism_intelligence:ai_feature_discover` | "what can PRISM do for X?" |

## NEURAL / XPROC ACCESS (cross-process learning, added 2026-05)

| Capability | Dispatcher action | Notes |
|---|---|---|
| AGI orchestration | `prism_intelligence:xproc_agi_orchestrate` | classify→route→blend across mill/lathe/wedm |
| Episodic recall | `prism_intelligence:xproc_agi_episodic` | k-NN over past outcomes |
| Pattern aggregation | `prism_intelligence:xproc_agi_aggregate_patterns` | local 1.0× / shared 0.5× weighting |
| Neural routing | `prism_ai:neural_route` | route-by-neural-classifier |
| Neural recommend | `prism_ai:neural_recommend` | embedding-based recommendation |
| Neural synthesize | `prism_ai:neural_synthesize` | generative composition |
| Tool wear NN | `prism_calc:wear_prediction` | physics + neural ensemble |
| Surface integrity NN | `prism_calc:surface_integrity_predict` | residual stress + recast layer |
| Chatter classifier | `prism_calc:chatter_neural_classify` | spindle-vibration → stable/unstable |
| Tribal pattern mine | `prism_business:lathe_agi_kg_query` | knowledge-graph traversal |

## OBSIDIAN 2ND-BRAIN ACCESS (vault sync via MCP)

| Capability | Dispatcher action |
|---|---|
| Pull vault → PRISM | `prism_knowledge:obsidian_sync_pull` |
| Push PRISM → vault | `prism_knowledge:obsidian_sync_push` |
| Vault sync status | `prism_knowledge:obsidian_sync_status` |
| Configure vault path | `prism_knowledge:obsidian_sync_config` |
| Wiki ingest (Karpathy LLM-wiki) | `prism_knowledge:wiki_ingest` |
| Wiki query | `prism_knowledge:wiki_query` |
| Wiki lint | `prism_knowledge:wiki_lint` |
| Wiki morning sweep | `prism_knowledge:wiki_morning` |

## CROSS-SESSION HANDOFF (per-CLI per-chat)

```bash
# WRITE on session-end:
node H:/prism/.claude/helpers/per-agent-handoff.mjs write \
  --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)" \
  --topic "<scope-slug>" \
  --resume "<next-action directive>" \
  --state  "<markdown body>"

# READ on session-start:
node H:/prism/.claude/helpers/per-agent-handoff.mjs read \
  --terminal "$(node H:/prism/.claude/helpers/stable-session-id.mjs)"
```

Storage: `state/shared/handoffs/HANDOFF-<id>-<topic>.md` — one per chat, topic suffix mandatory.

---
_End of PRISM awareness bundle. Mode: standard. Now proceed with the user's request._
