---
name: backend-helper-engines
description: Strategic engine + script digest for the backend-helper galaxy (build/TSC assist for every slot, backend infra -- slot papa). Honest, doctrine-grounded index of the build-pipeline / wiring / health engines plus the build/tsc/health/inventory script substrate.
type: reference
galaxy: backend-helper
node_type: memory
---

# backend-helper galaxy -- engine digest

## Overview

The backend-helper galaxy (slot papa) is the **cross-cutting build-assist force multiplier** behind every other slot -- NOT a domain specialist. Per its doctrine (`mcp-server/src/engines/backend-helper/CLAUDE.md`), papa owns the mcp-server TypeScript build workspace, dispatcher-wiring completeness, tsc error triage, Zod schema validation at action boundaries, vitest harness health, Stop-hook gate integrity, refactor/type-narrowing, import-cost + stale-code sweeps, and safe rollback scaffolding. It EXCLUDES domain physics (mill/lathe/wedm/cam), GNN/LoRA training (india), system-viz graph regen (sierra), and the fleet reaper (golf).

STRUCTURAL FACT: engines live FLAT in `mcp-server/src/engines/*.ts` -- there is NO `backend-helper/` engine subdir (only the doctrine dir with CLAUDE/MEMORY/PATHS/TOOLBELT). The honest engine count for this galaxy is SMALL: the six doctrine-verified build engines (`CLAUDE.md` sec 2), plus a tight ring of build/health/wiring assist engines. The galaxy's real center of gravity is its **script substrate** (build/tsc/health/inventory `.mjs`), because the domain IS the build pipeline itself, not a physics domain.

The PATHS.md auto-derive listed 24 name-matched engines, but doctrine (`CLAUDE.md` sec 3) explicitly corrects that: the LoRA-dataset builders, schedule/scheduling engines, `ParquetSchemaEngine`, `PhysicsSidecarBuilderEngine`, `CourseBuilderEngine`, and `ArchiveToPartsCatalogIngesterEngine` in that list belong to OTHER galaxies (india / business / cad / academy). This digest reports the HONEST scope, not the padded name-match.

- **Primary dispatcher:** `prism_dev` (devDispatcher.ts, 260+ actions -- NOT `prism_knowledge`, which the auto-derive wrongly listed; `prism_knowledge` is tribal-capture only).
- **Honest engine count:** 10 galaxy-scoped engines (6 doctrine-verified core + 4 adjacent build/health/wiring assist) plus 1 non-engine helper (`WorkflowIntegrationHelper`).
- **Script substrate:** 154 `.mjs` matching build/tsc/health/doctor/diagnostic/inventory across `scripts/` (most are per-galaxy corpus/index builders NOT owned by papa; the papa-core subset is the build-gate / tsc-routing / wiring-audit / health-probe tools called out below).

## Strategic categories

1. **Build foresight (PSAU-FORESIGHT cluster, U-FORE-*)** -- plan/advise/debrief/simulate/rollback a build BEFORE and AFTER it touches disk. BuildPlanner (DAG of atomic steps), BuildAdvisor (experience-tailored brief), CounterfactualBuildSimulator (in-memory "what if"), RollbackPlanner (tested undo per step), BuildDebrief (post-commit recap).
2. **Build gate + guard chain (ACP-MS2)** -- BuildGuardChainEngine orchestrates the pre-edit -> edit-track -> post-edit (tsc/lint/tests/review) -> trivial-fix -> affected-test state machine. The enforceable form of papa's "exit-0 is not the green gate" rail.
3. **Wiring completeness + duplication guard** -- HookCreationGuardEngine ((event,matcher) hook-dup guard, mirror of DuplicationGuardEngine); the offline `audit-unwired-engines.mjs` backlog source; `prism_dev:auto_wiring_analyze`.
4. **Infra health / transport probes (L2-P3, HMPI*)** -- HealthEngine (liveness/readiness/component scoring), IntegrationHealthEngine (per-integration 0-100 SRE 3-signal verdict), TransportHealthProbeEngine (MCP transport p50/p95 + flap detection).
5. **TSC triage + owner routing** -- `tsc-route-by-owner.mjs` re-derives who owns each remaining tsc error (drove 638 -> 89; the residual are domain-entangled, deferred to owner slots -- papa never fabricates a physics/machine VALUE).
6. **Backend model routing** -- BackendRouterEngine (local Qwen/Ollama vs DeepSeek API hybrid routing by context size + criticality; learns from outcomes).
7. **Pre-build knowledge injection + build-loop drivers** -- `build-brief.mjs` (deep content-level pre-build brief), `zulu-build-loop.mjs` (autonomous next-unit pointer, NEVER builds/commits itself), `hook-health-check.mjs` (hook-fire telemetry analyzer).
8. **Pipeline workflow integration (helper, not engine)** -- WorkflowIntegrationHelper: canonical process-sequence validation + gap analysis shared across the print-to-program pipelines.

## Key engines + scripts (detailed)

### BuildGuardChainEngine
The enforceable spine of papa's build discipline (ACP-MS2). Models the Coding & Build Guard Chain as an explicit state machine: pre-edit safety validation, edit tracking, post-edit validation (tsc -> lint -> affected tests -> review gate), trivial TS auto-fix, and affected-test resolution. Each step yields a typed result and can be skipped/retried/failed. Largest core engine at 647 lines. File: `mcp-server/src/engines/BuildGuardChainEngine.ts`.

### BuildPlannerEngine
Given a roadmap unit ID, produces a topologically-sorted DAG of atomic build steps with prerequisites, token/duration estimates, risk level, and a rollback stub per step. Applies the canonical ordering (schemas -> engines -> dispatchers -> tests -> hooks -> manifest regen -> commit). A planner, NOT an executor -- the `/plan-build` skill presents its output for approval. File: `mcp-server/src/engines/BuildPlannerEngine.ts`.

### CounterfactualBuildSimulatorEngine
The "what if I did this?" simulator for a BuildPlan. Applies planned writes into an in-memory overlay and inspects the hypothetical post-apply state WITHOUT touching disk -- gap-predictor scan, heuristic type-error detection, circular-import walk, affected-test listing, token-footprint estimate, and a pass/fail verdict with confidence. Deliberately does not spawn a real tsc/vitest worker (a worker-backed pass can drop in later without API churn). File: `mcp-server/src/engines/CounterfactualBuildSimulatorEngine.ts`.

### RollbackPlannerEngine
Emits a precise, tested undo command for every planned build step -- git reverts, file restores, schema downgrades, hook re-registrations, registry cleanups, dispatcher action removals, test-file deletes. Dry-runs each rollback through the CounterfactualBuildSimulator before certifying the plan. Pairs with BuildPlanner + the simulator to make papa's "safe rollback scaffolding" concrete. File: `mcp-server/src/engines/RollbackPlannerEngine.ts`.

### BuildAdvisorEngine + BuildDebriefEngine
The pre/post experience-tailored guidance pair (U-FORE-04, PSAU-FORESIGHT). BuildAdvisor composes a per-build brief keyed to developer experience level (new = verbose+rollback+checklist; expert = minimal severity-4+ nudge) and integrates GapPredictor + ChangeImpactRadius reports when provided. BuildDebrief emits a post-commit recap (what changed / why / what could break) and persists to `data/state/BUILD_DEBRIEFS.jsonl` for replay. Files: `mcp-server/src/engines/BuildAdvisorEngine.ts`, `mcp-server/src/engines/BuildDebriefEngine.ts`.

### BackendRouterEngine
Hybrid backend LLM router (LOCAL-LLM-MS0): routes between local Qwen/Ollama and a DeepSeek API by context size (>30K -> Flash 1M context), tag criticality (critical/agentic -> Pro), and step complexity, defaulting to free local Qwen. Learns from routing outcomes over time. Doctrine flags its dispatcher-action surface as not-fully-audited -- verify wiring before citing `prism_dev` actions it exposes. File: `mcp-server/src/engines/BackendRouterEngine.ts`.

### HealthEngine + IntegrationHealthEngine + TransportHealthProbeEngine
The infra health triad. HealthEngine (L2-P3-MS1) does system liveness/readiness/component-status scoring (`health_check`/`health_liveness`/`health_readiness`/`health_components`/`health_history`). IntegrationHealthEngine (HMPI03) is a pure-core per-integration 0-100 score + verdict on the SRE 3-signal rubric (availability + latency + freshness). TransportHealthProbeEngine (HMPI07) is a pure-core MCP-transport probe analyzer (rolling p50/p95, error rate, connection-flap count, verdict). Files: `mcp-server/src/engines/HealthEngine.ts`, `IntegrationHealthEngine.ts`, `TransportHealthProbeEngine.ts`.

### HookCreationGuardEngine
Hook-domain mirror of DuplicationGuardEngine (HOOK-SYNERGY-MS0 / H5). Where the generic guard blocks on (assetType,name) collisions, this adds the two dimensions only hooks have -- the lifecycle `event` (PreToolUse/Stop/...) and the tool-name `matcher` regex -- so "another `^Bash$` PreToolUse hook?" becomes a detectable duplication class. Reads a HookManifest or `state/shared/HOOK_REGISTRY.json`. Supports papa's Stop-hook gate integrity ownership. File: `mcp-server/src/engines/HookCreationGuardEngine.ts`.

### WorkflowIntegrationHelper (helper, not an *Engine)
Unified workflow-template integration shared across pipelines: workflow suggestion per process type, canonical-sequence validation, operation-list gap analysis, quick-reference lookups. Consumed by PrintToProgram (milling), TurningPrintToProgram (lathe), WEDMPrintToProgram, MultiAxisPrintToProgram, PostProcessorGenerator, LatheOrchestration. File: `mcp-server/src/engines/WorkflowIntegrationHelper.ts`.

### tsc-route-by-owner.mjs (script -- papa-core)
Parses a tsc error log (or runs tsc) and routes each error to the domain-owner slot that can safely fix it, turning papa's hand-authored defer punch-list into a repeatable, self-refreshing artifact. Routing is by file basename against an ORDERED rule list (first-match; ordering is load-bearing -- CAM before MILL because "hyperMILL" contains "MILL"). Automated the one-shot hand routing from the tsc baseline campaign (638 -> 89 errors). File: `scripts/tsc-route-by-owner.mjs`.

### audit-unwired-engines.mjs (script -- papa-core, MCP-down fallback)
Deep scan of the canonical engines folder, classifying each engine as WIRED-DIRECT / WIRED-VIA-ROUTE / WIRED-VIA-REGISTRY / WIRED-VIA-ORCH / WIRED-VIA-SINGLETON / WIRED-VIA-HOOK / WIRED-VIA-ENGINE / UNWIRED. Single-hop by design (a dormant root consumed only by another dormant engine stays the actionable UNWIRED signal). The offline backlog source when `prism_dev:auto_wiring_analyze` is unavailable. File: `scripts/audit-unwired-engines.mjs`.

### build-brief.mjs (script -- deep pre-build knowledge injection)
Deepens the shallow injection surfaces (master-index gives ~5 node names; wiki-precheck gives 3 titles) into a CONTENT-level pre-build brief: resolves a unit-id / free-text topic / active slot claim, searches the wiki leaf-index directly, and synthesizes the actual bodies of the most-relevant knowledge into context before a build starts. Build quality is gated by depth. File: `scripts/build-brief.mjs`.

## Full index

| Asset | Kind (engine/script) | Category | One-line |
|---|---|---|---|
| BuildGuardChainEngine | engine | Build gate | ACP-MS2 pre/post-edit build-guard state machine (tsc/lint/tests/review); largest core engine (647 lines). |
| BuildPlannerEngine | engine | Build foresight | Unit-id -> topologically-ordered DAG of atomic build steps with risk + rollback stubs (planner, not executor). |
| CounterfactualBuildSimulatorEngine | engine | Build foresight | In-memory "what if" overlay: gap/type/circular-import scan + pass/fail verdict without touching disk. |
| RollbackPlannerEngine | engine | Build foresight | Tested undo command per build step; dry-run through the counterfactual simulator before certifying. |
| BuildAdvisorEngine | engine | Build foresight | Experience-tailored pre-build brief (new/intermediate/expert) integrating gap + impact reports. |
| BuildDebriefEngine | engine | Build foresight | Post-commit plain-language recap; persists to BUILD_DEBRIEFS.jsonl for replay. |
| BackendRouterEngine | engine | Model routing | Hybrid local-Qwen/DeepSeek router by context size + criticality; learns from outcomes (action surface UNAUDITED). |
| HealthEngine | engine | Infra health | System liveness/readiness/component scoring (health_check/liveness/readiness/components/history). |
| IntegrationHealthEngine | engine | Infra health | Pure-core per-integration 0-100 SRE 3-signal (availability+latency+freshness) score + verdict. |
| TransportHealthProbeEngine | engine | Infra health | Pure-core MCP-transport probe analyzer: rolling p50/p95, error rate, connection-flap count, verdict. |
| HookCreationGuardEngine | engine | Wiring/dup guard | Hook-dup guard on the (event,matcher) signature; hook-domain mirror of DuplicationGuardEngine. |
| WorkflowIntegrationHelper | script/helper (not *Engine) | Pipeline workflow | Canonical process-sequence validation + gap analysis shared across all print-to-program pipelines. |
| tsc-route-by-owner.mjs | script | TSC triage | Routes each tsc error to the owner-slot; self-refreshing defer punch-list (638 -> 89 campaign). |
| audit-unwired-engines.mjs | script | Wiring completeness | Classifies every engine WIRED-*/UNWIRED; offline wiring-backlog source (MCP-down fallback). |
| build-brief.mjs | script | Pre-build injection | Content-level deep pre-build knowledge brief (bodies, not pointers) from wiki leaf-index. |
| build-guard-chain (via prism_dev) | dispatcher action | Build gate | Full pre-commit chain (validate+typecheck+tests) surface for BuildGuardChainEngine. |
| hook-health-check.mjs | script | Infra health | Re-runnable hook-fire telemetry analyzer over `.claude/cache/hook-telemetry.jsonl`. |
| zulu-build-loop.mjs | script | Build-loop driver | Autonomous next-unit pointer for a gated builder chat; NEVER builds/writes/commits itself. |
| docker-service-health-check.mjs | script (name-derived) | Infra health | Docker service health probe (backend infra liveness). |
| qdrant-health.mjs | script (name-derived) | Infra health | Qdrant vector-store health probe. |
| vault-health.mjs | script (name-derived) | Infra health | Obsidian vault health probe. |
| vault-link-doctor.mjs | script (name-derived) | Infra health | Vault wikilink integrity doctor. |
| hermes-doctor.mjs | script (name-derived) | Infra health | Hermes substrate diagnostics doctor. |
| system-viz-health.mjs | script (name-derived) | Infra health | System-viz graph health probe (sierra-adjacent). |
| ollama-docker-health.mjs | script (name-derived) | Infra health | Ollama/Docker offload-stack health probe. |
| fleet-task-health-watch.mjs | script (name-derived) | Infra health | Scheduled-task watchdog-over-watchdogs (golf-adjacent). |
| build-state-snapshot.mjs | script (name-derived) | Build state | Regenerates BUILD_STATE (built/needs-wiring/pending/frontend) snapshot. |
| build-milestone-progress.mjs | script (name-derived) | Build state | Milestone shipped-vs-envelope delta generator. |
| update-prism-inventory.mjs | script (name-derived) | Inventory | Regenerates PRISM-INVENTORY-LATEST live counts. |
| generate-core-inventory.mjs | script (name-derived) | Inventory | Core asset inventory generator. |
| generate-fs-inventory.mjs | script (name-derived) | Inventory | Filesystem inventory generator. |
| generate-fs-deep-inventory.mjs | script (name-derived) | Inventory | Deep filesystem inventory generator. |
| generate-engine-domain-inventory.mjs | script (name-derived) | Inventory | Engine-by-domain inventory generator. |
| orphan-inventory.mjs | script (name-derived) | Wiring/orphan | Orphaned-asset inventory (wiring-gap surface). |
| stub-hunt-inventory.mjs | script (name-derived) | Build quality | Stub/placeholder-return hunt inventory. |
| inventory-freshness.mjs | script (name-derived) | Inventory | Inventory-freshness auditor. |
| build-hook-registry.mjs | script (name-derived) | Wiring | Rebuilds the hook registry index. |
| build-stop-hook-registry.mjs | script (name-derived) | Wiring | Rebuilds the Stop-hook registry index. |
| build-mcp-manifest.mjs | script (name-derived) | Build/manifest | Rebuilds the MCP tool manifest. |
| build-engine-index.mjs | script (name-derived) | Build/index | Rebuilds the engine index. |
| build-audit-registry.mjs | script (name-derived) | Build/audit | Rebuilds the audit registry. |

> Note on the 154-script count: it is the raw `scripts/*.mjs` name-match on build/tsc/health/doctor/diagnostic/inventory. The MAJORITY are per-galaxy corpus/dataset/index builders (`build-cad-*`, `build-blueprint-*`, `build-jm-*`, `build-lathe-*`, `*-lora-*`) owned by OTHER galaxies, NOT papa. The table above lists only the papa-core build-gate / tsc / wiring / health / inventory / build-state subset; the rest are excluded as domain-owned per doctrine (`CLAUDE.md` sec 1 EXCLUDES).
