---
name: wiring-engines
description: Strategic engine + substrate digest for the wiring galaxy (slot romeo) -- engine->dispatcher wiring closure, orphan detection, unwired-asset audit, auto-wire. Honest count; process/script/hook-heavy domain.
type: reference
galaxy: wiring
node_type: memory
---

# wiring galaxy -- engine digest

## Overview

The wiring galaxy (slot romeo) owns **dispatcher-wiring infrastructure** -- systematically
closing the gap between "engine on disk" and "invokable via an MCP dispatcher action." Every
unwired engine is a silent capability loss; this galaxy is the close. Its scope is narrow and
sharp: it WIRES existing engines, it does not build new engines (that belongs to the domain
galaxy) or retrain the GNN model (india/ai-training).

Structurally this is a **process/script/hook domain, NOT an engine-heavy one.** The dedicated
wiring-infrastructure engine set is small (~11 verified engines, all living FLAT in
`mcp-server/src/engines/*.ts`, none under the `wiring/` subdir which is doctrine-only). The
real weight of the galaxy is the **substrate**: ~103 wiring/orphan/dispatcher-coverage scripts
and ~13 wiring/orphan Stop-and-PostToolUse hooks that continuously detect, rank, and guard
against orphan engines.

The canonical loop: `audit-unwired-engines.mjs` scans the flat engines folder and classifies
each engine (WIRED-DIRECT / WIRED-VIA-ROUTE / -REGISTRY / -ORCH / -SINGLETON / -HOOK /
-ENGINE / UNWIRED / WIRE-EXEMPT) -> `romeo-wiring-triage.mjs` ROI-ranks the UNWIRED set into a
pick-list -> a `/wire-unwired` /loop wires one engine end-to-end (import + Zod enum + switch
case + round-trip test) -> `stop_on_unwired_assets` / `stop-auto-wire` guard the result. Live
backlog per the galaxy CLAUDE.md (2026-06-13 regen): 3,789 canonical engines, 3,536
WIRED-DIRECT, **54 UNWIRED**, 113 WIRE-EXEMPT, 39 WIRED-VIA-ORCH.

**Verified against doctrine (R12):** counts and engine identities are grounded in
`mcp-server/src/engines/wiring/{CLAUDE,MEMORY,PATHS}.md` plus a live flat-folder enumeration
and header reads. The doctrine's own sec 2 flags three FABRICATED names that do NOT exist --
`AgentSDKVerifierEngine`, `DispatcherRoutingEngine`, `EngineUtilizationAuditEngine` (the real
name is `EngineUtilizationAuditorEngine` -- "Auditor", not "Audit"). Those are excluded here.

## Strategic categories

1. **Unwired-audit + orphan-detection engines** -- classify every engine as wired/unwired,
   rank orphans, summarize wiring coverage. `EngineUtilizationAuditorEngine`,
   `AssetWiringSummaryEngine`, `WiringPotentialEngine`.
2. **Auto-wire code-gen** -- analyze a TypeScript engine and emit the wiring artifacts
   (index export, dispatcher case, Zod schema, test scaffold), dry-run by default.
   `AutoWiringEngine`.
3. **Dispatcher route-table + map** -- the runtime action catalog consumed to find an engine's
   natural dispatcher home. `DispatcherMapEngine`, `AsyncHookDispatcherEngine` (async hook
   route decoupling off the Stop critical path).
4. **Asset-class wiring engines (algorithm / formula / reasoning / extraction)** -- wire
   non-engine assets (algorithms, formulas, reasoning engines, extracted knowledge) to their
   consumers. `AlgorithmWiringEngine`, `FormulaWiringEngine`, `ReasoningWiringEngine`,
   `ExtractionWiringEngine`, `ExtractedKnowledgeWiringEngine`.
5. **Closed-loop WIRE-suffix family (domain-owned, romeo-adjacent)** -- per-domain
   outcome-capture / provenance / inference-gate wire engines that thread manufacturing
   outcomes back into the learning loop (SFC / PPG / CAM / Quoting / PostProcessor). These are
   domain-owned but share the wiring pattern; catalogued for completeness, not romeo's to
   re-wire.
6. **Substrate: unwired/orphan audit scripts** (~103) -- the punch-list generators and
   coverage scanners; `audit-unwired-engines.mjs` is the canonical scanner and IS romeo's
   backlog source of truth.
7. **Substrate: wiring / orphan Stop + PostToolUse hooks** (~13) -- the guardrail layer that
   blocks or warns on newly-built-but-unwired assets.

## Key engines + scripts (detailed)

### AutoWiringEngine
The auto-wire code-generator. Analyzes a TS engine file and emits the four wiring artifacts an
engine needs to become callable: the `index.ts` export line, the dispatcher case block (lazy
import + method call), a Zod schema template, and a test-file scaffold. DRY RUN by default --
shows what would be generated without writing. Explicitly a software-development automation
engine, not a manufacturing calc. `mcp-server/src/engines/AutoWiringEngine.ts` (497 lines).

### WiringPotentialEngine
Ranks candidate dispatchers an orphan (built-but-unwired) engine should be wired into, fusing
three signals: semantic relevance (regex over the engine name, mirroring
`orphan-inventory.mjs` heuristics), capacity headroom (reads `DISPATCHER_CAPACITY.json`;
dispatchers at >=100% are excluded), and documentation depth (pre-joined wiki/memory entries
from the system-graph). Routes through `masterIndexEngine.query()` rather than reimplementing
graph traversal. `mcp-server/src/engines/WiringPotentialEngine.ts` (597 lines).

### EngineUtilizationAuditorEngine
The utilization auditor (real name has "Auditor"). Detects orphan engines (no dispatcher /
action / consumer), underutilized engines, semantic-duplicate functionality, missing test
coverage, and unwired engines. Its exit gate is <5% orphan engines.
`mcp-server/src/engines/EngineUtilizationAuditorEngine.ts` (344 lines).

### DispatcherMapEngine
The complete dispatcher-action catalog. Scans all dispatchers at runtime and builds a compact
action map so an engine's natural dispatcher home can be found without grepping the ~54
dispatcher files. Backs `prism_session:dispatcher_map_compact`.
`mcp-server/src/engines/DispatcherMapEngine.ts` (165 lines).

### AssetWiringSummaryEngine
The unified wiring dashboard. Aggregates wired-vs-orphan state across the other wiring engines
(Algorithm / Reasoning / Formula / MIT-course / tribal-knowledge) into per-category coverage
metrics (total / wired / orphan / coverage). `mcp-server/src/engines/AssetWiringSummaryEngine.ts`
(346 lines).

### AlgorithmWiringEngine
Wires registered algorithms to consuming engines, identifies orphaned algorithms, and
auto-suggests or auto-wires them. Carries an algorithm catalog with category / complexity /
inputs / outputs / use-cases per algorithm. The largest wiring engine.
`mcp-server/src/engines/AlgorithmWiringEngine.ts` (1047 lines).

### FormulaWiringEngine
Formula-to-engine wiring infrastructure over the formula registry: lists unwired vs wired
formulas, resolves formula consumers, creates wirings, and executes formulas with full tracing.
`mcp-server/src/engines/FormulaWiringEngine.ts` (764 lines).

### ReasoningWiringEngine
Catalogs and wires reasoning/cognition engines to dispatchers by category (decision_making,
diagnostic, causal, multi_path, deep_thinking, etc.), surfacing orphaned reasoning
capabilities. `mcp-server/src/engines/ReasoningWiringEngine.ts` (871 lines).

### AsyncHookDispatcherEngine
Decouples Tier-4 async/background hooks from the synchronous Stop critical path. `enqueue(job)`
appends to `async-hook-queue.jsonl` and spawns a detached runner (returns <2ms); `runJob()`
executes inside the detached child. Read surfaces feed SessionStart hooks + the nightly digest.
`mcp-server/src/engines/AsyncHookDispatcherEngine.ts` (841 lines).

### audit-unwired-engines.mjs (SCRIPT -- canonical backlog source)
The deep scanner of the canonical engines folder; the SINGLE SOURCE OF TRUTH for romeo's
backlog. Classifies each engine into the WIRED-DIRECT / -ROUTE / -REGISTRY / -ORCH / -SINGLETON
/ -HOOK / -ENGINE / UNWIRED / WIRE-EXEMPT taxonomy. WIRED-VIA-ENGINE (added 2026-06-10) is a
single-hop library-layer catch that stops mis-counting library engines as dispatcher-wiring
targets. Regenerates `state/shared/UNWIRED-ENGINE-AUDIT-*.json`; MCP-down safe (no port).
`scripts/audit-unwired-engines.mjs`.

### romeo-wiring-triage.mjs (SCRIPT -- the romeo /loop harness)
Turns the raw unwired audit into an ROI-ranked, actionable pick-list. Reads the freshest audit
JSON, resolves each engine's natural dispatcher home, flags likely WIRE-EXEMPT internal-layer
engines (Adapter/Bridge/Client/Shim/Bootstrap suffixes) and cross-domain engines whose owner
slot should decide, then emits `state/shared/ROMEO-WIRING-QUEUE.md`. Deterministic core;
optional `--ollama` adds a one-line wiring hint per top candidate. `scripts/romeo-wiring-triage.mjs`.

### stop_on_unwired_assets.mjs (HOOK -- T0 orphan block)
Stop hook that BLOCKS session termination when newly-built assets are not wired to their
logical endpoints. Git-diff-scoped (not a full scan): new `*Engine.ts` must be imported by a
dispatcher AND have a matching `src/__tests__/` test with >=10 `it(` cases. Note per doctrine:
currently bypassed fleet-wide by `PRISM_ALLOW_UNWIRED=1` (advisory until lifted).
`.claude/hooks/stop_on_unwired_assets.mjs`.

### stop-auto-wire.mjs (HOOK -- T3 orphan advisory)
Non-blocking Stop hook that checks whether every new asset built this session is wired: new
engines -> referenced by a dispatcher; new hooks -> wired in `settings.json` under the right
event; engine-count change -> schedules a background inventory refresh; new dispatcher action
enum -> verifies a schema exists. Emits warnings, never blocks. `.claude/hooks/stop-auto-wire.mjs`.

## Full index

| Asset | Kind | Category | One-line |
|-------|------|----------|----------|
| AutoWiringEngine | engine | Auto-wire code-gen | Analyzes an engine + emits index/dispatcher/schema/test wiring artifacts (dry-run default). |
| WiringPotentialEngine | engine | Unwired-audit / orphan | Ranks candidate dispatchers for an orphan engine (semantic + capacity + doc-depth). |
| EngineUtilizationAuditorEngine | engine | Unwired-audit / orphan | Audits utilization; detects orphan/underused/duplicate/untested/unwired engines. |
| DispatcherMapEngine | engine | Dispatcher route-table | Runtime action catalog across all dispatchers; backs dispatcher_map_compact. |
| AssetWiringSummaryEngine | engine | Unwired-audit / orphan | Unified wired-vs-orphan coverage dashboard across the asset-wiring engines. |
| AlgorithmWiringEngine | engine | Asset-class wiring | Wires algorithms to consuming engines; catalog + orphan detection (largest, 1047 LOC). |
| FormulaWiringEngine | engine | Asset-class wiring | Formula-to-engine wiring over the formula registry; execute-with-tracing. |
| ReasoningWiringEngine | engine | Asset-class wiring | Catalogs + wires reasoning engines to dispatchers by category. |
| ExtractionWiringEngine | engine | Asset-class wiring | Applies routing decisions -- actually modifies target files to wire in extracted knowledge. |
| ExtractedKnowledgeWiringEngine | engine | Asset-class wiring | Wires PDF-extraction results to tribal/knowledge-graph/search indexes. |
| AsyncHookDispatcherEngine | engine | Dispatcher route-table | Decouples async Tier-4 hooks from the Stop critical path (queue + detached runner). |
| PostProcessorAGIWiringIntegrationEngine | engine | Closed-loop WIRE family (domain) | PP AGI orchestration/wiring layer above the coordination bridge (post-processor-owned). |
| LathePostGeneratorValidatorWiringEngine | engine (name-derived) | Closed-loop WIRE family (domain) | Lathe post-generator/validator wiring (lathe-owned). |
| PPValidatorAGIWiringEngine | engine (name-derived) | Closed-loop WIRE family (domain) | PP validator AGI wiring (post-processor-owned). |
| SFCInferenceGateWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | Speed-feed inference-gate wire (SFC/oscar-owned). |
| SFCOutcomeCaptureWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | Speed-feed outcome-capture wire (SFC-owned). |
| SFCProvenanceWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | Speed-feed provenance wire (SFC-owned). |
| PPGInferenceGateWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | PPG inference-gate wire (post-processor-owned). |
| PPGOutcomeCaptureWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | PPG outcome-capture wire (post-processor-owned). |
| PPGProvenanceWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | PPG provenance wire (post-processor-owned). |
| CAMOutcomeCaptureWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | CAM outcome-capture wire (CAM/kilo-owned). |
| QuotingOutcomeCaptureWireEngine | engine (name-derived) | Closed-loop WIRE family (domain) | Quoting outcome-capture wire (quoting/charlie-owned). |
| audit-unwired-engines.mjs | script | Substrate: audit | Canonical scanner; classifies every engine into the wired/unwired taxonomy (backlog source). |
| romeo-wiring-triage.mjs | script | Substrate: audit | ROI-ranks the unwired audit into ROMEO-WIRING-QUEUE.md; the romeo /loop pick-list. |
| audit-orphan-doctrine.mjs | script | Substrate: audit | Finds heavily-referenced acronyms/systems with no dedicated memory/doctrine file. |
| audit-hook-wiring.mjs | script | Substrate: audit | Audits which hooks are wired in settings.json vs present on disk. |
| audit-page-wiring.mjs | script | Substrate: audit | Audits frontend page -> backend route/dispatcher wiring. |
| audit-dispatcher-engine-methods.mjs | script | Substrate: audit | Audits dispatcher cases against actual engine method signatures (drift). |
| audit-dispatcher-ghost-actions.mjs | script | Substrate: audit | Finds Zod-enum actions with no handling engine (ghost actions). |
| audit-unwired-hooks-2026-05-27.mjs | script (name-derived) | Substrate: audit | Dated audit of unwired hooks. |
| dispatcher-import-liveness.mjs | script | Substrate: audit | Verifies dispatcher engine imports actually resolve/load. |
| dispatcher-registration-coverage.mjs | script | Substrate: audit | Measures dispatcher registration coverage across engines. |
| algorithm-dispatcher-coverage.mjs | script | Substrate: audit | Measures algorithm->dispatcher coverage. |
| harness-wiring-audit.mjs | script (name-derived) | Substrate: audit | Audits test-harness wiring. |
| orphan-inventory.mjs | script | Substrate: audit | Inventories orphan engines with dispatcher heuristics (mirrored by WiringPotentialEngine). |
| refresh-orphan-report.mjs | script (name-derived) | Substrate: audit | Regenerates the orphan report. |
| helper-orphan-rank.mjs | script | Substrate: audit | Ranks orphaned helper scripts. |
| hook-orphan-scan.mjs | script (name-derived) | Substrate: audit | Scans for orphaned hooks. |
| jsonl-orphan-scan.mjs | script (name-derived) | Substrate: audit | Scans for orphaned jsonl state files. |
| unwired-bridge-rank.mjs | script (name-derived) | Substrate: audit | Ranks unwired bridge engines. |
| leverage-ranked-wiring-queue.mjs | script (name-derived) | Substrate: audit | Emits a leverage-ranked wiring queue. |
| papa-pick-next-unwired.mjs | script (name-derived) | Substrate: audit | Papa-slot next-unwired picker. |
| build-lathe-wiring-audit.mjs | script (name-derived) | Substrate: audit | Builds a lathe-domain wiring audit. |
| build-wiring-domain-dict.mjs | script (name-derived) | Substrate: audit | Builds the wiring-domain keyword dictionary. |
| validate-unwired-signal.mjs | script (name-derived) | Substrate: audit | Validates the unwired-engine signal. |
| validate-hook-orphan-signal.mjs | script (name-derived) | Substrate: audit | Validates the hook-orphan signal. |
| mcat-unwired-source-recovery.mjs | script (name-derived) | Substrate: audit | Recovers source for unwired engines (mcat). |
| bridge-auto-wire.mjs | script (name-derived) | Substrate: auto-wire | Auto-wires bridge engines. |
| galaxy-edge-wire.mjs | script (name-derived) | Substrate: auto-wire | Wires cross-galaxy PSN edges. |
| generate-wiring-overlay.mjs | script (name-derived) | Substrate: auto-wire | Generates a wiring overlay for the system-viz graph. |
| generate-dispatcher-digest.mjs | script | Substrate: gen/report | Regenerates DISPATCHER_DIGEST.md. |
| generate-dispatcher-wiki.mjs | script (name-derived) | Substrate: gen/report | Generates per-dispatcher wiki entries. |
| generate-unwired-engine-wiki.mjs | script | Substrate: gen/report | Generates wiki entries for unwired engines. |
| generate-extracted-modules-wire-queue.mjs | script | Substrate: gen/report | Emits a wire queue for extracted modules. |
| generate-extracted-modules-dispatcher-report.mjs | script (name-derived) | Substrate: gen/report | Reports extracted-module dispatcher coverage. |
| build-dispatcher-capacity.mjs | script (name-derived) | Substrate: gen/report | Builds DISPATCHER_CAPACITY.json (headroom, consumed by WiringPotentialEngine). |
| seed-ghost-from-unwired.mjs | script | Substrate: ghost/GNN | Seeds ghost-nodes from the unwired-engine set (system-viz roost). |
| validate-ghost-wires.mjs | script | Substrate: ghost/GNN | Validates ghost-wire predictions. |
| ghost-wire-outcomes-to-refpool.mjs | script | Substrate: ghost/GNN | Feeds ghost-wire outcomes into the GNN reference pool. |
| build-ghostwire-lora-dataset.mjs | script | Substrate: ghost/GNN | Builds a LoRA dataset from ghost-wire data. |
| wired-engines-to-refpool.mjs | script | Substrate: ghost/GNN | Feeds wired-engine positives into the GNN ref-pool. |
| measure-codebase-wired-refpool-auroc.mjs | script | Substrate: ghost/GNN | Measures GNN ref-pool AUROC on codebase wired/unwired holdout. |
| kip-rotate-orphans-to-lora.mjs | script | Substrate: ghost/GNN | Rotates orphan engines into a LoRA training set. |
| wire-galaxies-to-resource-roots.mjs | script | Substrate: galaxy-wire | Wires all galaxies to the 3 critical resource roots. |
| wire-galaxies-to-operational-context.mjs | script (name-derived) | Substrate: galaxy-wire | Wires galaxies to operational-context blocks. |
| wire-vendor-corpus-to-galaxies.mjs | script | Substrate: galaxy-wire | Wires the vendor-catalog corpus into galaxy PATHS. |
| wire-ai-systems-state-to-galaxies.mjs | script | Substrate: galaxy-wire | Wires the AI-systems fleet-state pointer into galaxies. |
| wire-db-stores-to-consumers.mjs | script | Substrate: infra-wire | Wires DB stores to their consumers. |
| wire-hermes-local-backend.mjs | script | Substrate: infra-wire | Wires the Hermes local backend. |
| wire-graph-inject-hooks-to-daemon.mjs | script (name-derived) | Substrate: infra-wire | Wires graph-inject hooks to the daemon. |
| wire-active-chat-priority-hooks.mjs | script (name-derived) | Substrate: infra-wire | Wires active-chat priority hooks. |
| wire-lane-hooks-cd-aware.mjs | script | Substrate: infra-wire | Makes lane-guard hooks CWD-aware in settings. |
| wire-index-daemon-guardian-settings.mjs | script (name-derived) | Substrate: infra-wire | Wires the index-daemon guardian into settings. |
| wire-slot-commit-enforce-bypass.mjs | script | Substrate: infra-wire | Wires the slot-commit-enforce bypass. |
| wire-read-advisories-into-bundle-settings.mjs | script (name-derived) | Substrate: infra-wire | Wires read-advisory hooks into the bundle. |
| wire-grep-glob-bundle-settings.mjs | script (name-derived) | Substrate: infra-wire | Wires grep/glob bundle hooks in settings. |
| wire-ups-domain-bundle.mjs | script (name-derived) | Substrate: infra-wire | Wires the UPS-domain hook bundle. |
| dedupe-settings-hook-wirings.mjs | script | Substrate: infra-wire | De-duplicates repeated hook wirings in settings.json. |
| golf-watchdog-wiring-bridge.mjs | script (name-derived) | Substrate: infra-wire | Bridges golf watchdog into the wiring signal. |
| qcron-fe-be-wiring.mjs | script (name-derived) | Substrate: infra-wire | Cron audit of frontend<->backend wiring. |
| _wire-hook.mjs | script (name-derived) | Substrate: infra-wire | Internal wire-a-hook helper. |
| _wire-stop-regression-bundle.mjs | script (name-derived) | Substrate: infra-wire | Wires the stop-regression hook bundle. |
| tmp-orphan-janitor.mjs | script | Substrate: janitor | Reaps orphaned temp files. |
| _temp-orphan-scan.mjs | script (name-derived) | Substrate: janitor | Scans for temp orphans. |
| _emergency-unwire-yolo-25.mjs | script (name-derived) | Substrate: janitor | Emergency unwire (the PRISM_ALLOW_UNWIRED=1 YOLO-25 cluster). |
| stop_on_unwired_assets.mjs | hook | Substrate: guard hook | T0 Stop block on newly-built-but-unwired engines (currently bypassed by PRISM_ALLOW_UNWIRED). |
| stop-auto-wire.mjs | hook | Substrate: guard hook | T3 non-blocking Stop advisory on unwired new engines/hooks/actions. |
| stop_on_orphan_engine.mjs | hook (name-derived) | Substrate: guard hook | Stop check for orphan engines. |
| stop_on_orphan_children.mjs | hook (name-derived) | Substrate: guard hook | Stop check for orphan child processes. |
| stop_on_skill_unwired.mjs | hook (name-derived) | Substrate: guard hook | Stop check for unwired skills. |
| dispatcher-import-validator.mjs | hook (name-derived) | Substrate: guard hook | Validates dispatcher imports resolve. |
| dispatcher-digest-regen.mjs | hook (name-derived) | Substrate: gen hook | Regenerates DISPATCHER_DIGEST on change. |
| stop-dispatcher-method-drift-advisory.mjs | hook (name-derived) | Substrate: guard hook | Advises on dispatcher-vs-engine method drift. |
| orphan-type-detector.mjs | hook (name-derived) | Substrate: guard hook | Classifies orphan type. |
| bash-orphan-cleaner.mjs | hook (name-derived) | Substrate: janitor hook | Cleans orphaned bash background tasks. |
| stop-bash-orphan-cleaner.mjs | hook (name-derived) | Substrate: janitor hook | Stop-time bash-orphan cleanup. |
| node-orphan-cleaner.mjs | hook (name-derived) | Substrate: janitor hook | Cleans orphaned node processes. |
| tribal-autowire.mjs | hook (name-derived) | Substrate: auto-wire hook | Auto-wires captured tribal tips to consumers. |

_Notes: (1) Engine list is the doctrine-verified wiring-INFRA set + the WIRE-suffix closed-loop
family (the latter is domain-owned, catalogued for completeness, not romeo's to re-wire). The
`Bridge` keyword is DELIBERATELY EXCLUDED -- ~150 `*Bridge*.ts` engines are domain CAM/CAD/ERP
integration bridges, NOT wiring-infrastructure. (2) `CAMKernelDispatcherBridge` matches the
"Dispatcher" keyword but is a CAM-kernel integration bridge, not wiring infra -- excluded.
(3) FABRICATED per doctrine CLAUDE.md sec 2 (do NOT reference): AgentSDKVerifierEngine,
DispatcherRoutingEngine, EngineUtilizationAuditEngine. (4) `outcome-bus-auto-tap.mjs` is cited
in old doctrine but NOT on disk -- excluded (R12). (5) Scripts/hooks marked "(name-derived)"
were enumerated by filename but their headers were not individually read this pass; the ~11
core engines and 5 detailed scripts/hooks WERE header-verified._
