---
name: token-optimization-engines
description: Strategic engine digest for the token-optimization galaxy -- token economy, RTK proxy, Ollama offload, CAG prompt-cache, context compression, and PSN savings telemetry. Engines live FLAT in mcp-server/src/engines/ (galaxy subdir is doctrine-only); this galaxy is heavily script/hook-based.
type: reference
galaxy: token-optimization
node_type: memory
---

# token-optimization galaxy -- engine digest

## Overview

The token-optimization galaxy (slot:alpha) owns PRISM's token-economy stack: making every Claude API token count and offloading whatever does not need Claude-class reasoning to $0 local inference. Its mandate spans token-zone state (GREEN/YELLOW/RED/CRITICAL), per-task budget enforcement, fleet-wide spend telemetry, diff-cost estimation, hook-level cost profiling, CAG prompt-cache routing, Ollama offload policy, and context compression/compaction.

STRUCTURAL FACT (verified): the galaxy subdir `mcp-server/src/engines/token-optimization/` holds **zero `.ts` files** -- it is doctrine-only (CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md). All engines live FLAT in `mcp-server/src/engines/*.ts`. The galaxy CLAUDE.md canonically names **10 dedicated token-economy engines**; beyond those, the galaxy substrate is dominated by shared context-management, cache, and Ollama-integration engines plus a large script/hook layer.

Token-economy levers this galaxy operates:
- **RTK proxy** -- `rtk`-prefixed bash strips redundant output (60-90pct savings on git/tsc/gh/npm; ~99pct on vitest). Script/CLI layer, not an engine.
- **Ollama offload** -- route code-explain/summarize/classify/lint/compress to local qwen2.5-coder:32b / gpt-oss:120b / :1.5b. Live offload ratio ~8.9pct vs >=30pct target (headline open thread -- blocker: OFFLOADABLE_PATTERNS scope too narrow, per CLAUDE.md sec 9).
- **CAG (cache-augmented generation)** -- cold-cache anchoring + per-slot soul cache blocks so a stable prefix hits the prompt cache instead of re-billing.
- **PSN savings telemetry** -- 6 detectors aggregate cumulative savings into `state/shared/dashboards/psn-savings-aggregate.json`.

NOTE (R12 honest boundary): the flat `*Optimization*` engine namespace is enormous (~130 name-matches on the keyword regex) but the overwhelming majority are DOMAIN-owned physics/toolpath/program optimizers (mill/cam/lathe/wedm/speed-feed) -- e.g. `GCodeOptimizationEngine`, `LatheProgramOptimizerEngine`, `BayesianOptimizationEngine`, `ChatterStabilityLobe`-adjacent optimizers, LoRA optimizers. Those are NOT token-optimization; they are excluded here. The genuinely token/context/CAG/Ollama-owned set is far smaller and is what this digest covers.

## Strategic categories

1. **token-telemetry-and-budget** -- measure + allocate + enforce token spend (zone state, per-task budget, per-session ledger, fleet economy, accounting).
2. **ollama-offload** -- decide what leaves Claude and route it to local models (offload classifier, hook bridge, client, integration/health, capability probe, context floor).
3. **cag-cache** -- short-circuit re-work via prompt-cache anchoring and response/consensus/output caches.
4. **context-compression-and-management** -- decide which context items survive, how many tokens each gets, and how dense each is (compaction / budget / compression / digest / window-pressure).
5. **read-and-toolcall-efficiency** -- advise the cheapest read strategy, tighten grep params, batch tool calls, inline hot skills.
6. **cost-and-diff-estimation** -- estimate diff cost before inlining, profile hook ROI, bridge cost<->efficiency.
7. **cad-token-vocabulary** -- treat CAD ops as discrete tokens (cross-galaxy bridge to delta/echo; neural-CAD adjacency).

## Key engines (detailed)

### TokenAwarenessEngine.ts
Read-only MCP facade over the per-turn sidecar written by `.claude/hooks/token-awareness-sidecar.mjs`; wraps the pure `scripts/lib/token-awareness-*.mjs` libs so `prism_context:token_awareness_*` actions can query token/quota/context-pressure without re-implementing the 4-source merge. Owns the canonical zone thresholds (GREEN <70pct / YELLOW 70-85pct / RED 85-95pct / CRITICAL >95pct) -- never inline these.
Path: `mcp-server/src/engines/TokenAwarenessEngine.ts`. Notable: decorates state with `stale + ageMs` (staleness is a freshness signal, NEVER bumps a measured zone).

### TokenEconomyEngine.ts
MXU-MS2 fleet-wide economy engine: per-task budget computation, actual-vs-budgeted spending tracking, waste-pattern detection, compression-strategy recommendation, and token-cost-vs-capability ROI. Pulls pressure estimation from `ContextChainEngine` and task classification from `AutomationChainEngine`.
Path: `mcp-server/src/engines/TokenEconomyEngine.ts`. Notable exports: `TaskClass` import; powers `prism_context:token_economy_*` actions.

### TokenBudgetAllocatorEngine.ts
Distributes a total token budget across task phases to maximize productivity while reserving tokens for critical ops (commits, tests, handoffs) so a session never runs dry at a checkpoint.
Path: `mcp-server/src/engines/TokenBudgetAllocatorEngine.ts`. Notable exports: `Phase`, `BudgetAllocation`; backs `prism_context:token_budget_allocate` / `token_budget_can_afford`.

### TokenEconomyTrackerEngine.ts
Per-session and cumulative spend tracker with operation categorization (build/test/search/edit/read), waste detection (redundant reads, unnecessary exploration), savings attribution (RTK / hooks / offloading), and budget forecasting.
Path: `mcp-server/src/engines/TokenEconomyTrackerEngine.ts`. Notable exports: `TokenSpend`.

### TokenAccountingEngine.ts
Centralized cost accounting: per-tool cost baselines, actual costs, and efficiency scores; powers `/token-budget` and `/hook-stats`. Meta-engine -- no direct savings, it enables optimization by exposing where tokens go.
Path: `mcp-server/src/engines/TokenAccountingEngine.ts`. Notable exports: `ToolCost`, `AccountingReport`.

### SessionTokenLedgerEngine.ts
Real-time ledger of every tool call's estimated input/output cost with running totals + burn-rate analysis; identifies the most expensive operations and predicts context exhaustion.
Path: `mcp-server/src/engines/SessionTokenLedgerEngine.ts`. Notable exports: `LedgerEntry`, `LedgerSummary`; backs `prism_dev:token_ledger_*`.

### DiffTokenEstimatorEngine.ts
Estimates the token cost of a git diff before it is inlined vs summarized, so large diffs do not silently blow the budget. Caps the full-content read to avoid the ENOBUFS/108MB-dirty-tree failure that once returned a false "0 files / skip" estimate.
Path: `mcp-server/src/engines/DiffTokenEstimatorEngine.ts`. Notable: `CHARS_PER_TOKEN = 4`; backs `prism_context:diff_token_*`.

### HookEfficiencyEngine.ts
Tracks how many tokens hooks saved by blocking / warning / rewriting tool calls, giving the 700+ hook fleet an ROI metric. Meta-engine.
Path: `mcp-server/src/engines/HookEfficiencyEngine.ts`. Notable exports: `HookSave`, `HookStats`.

### OllamaTaskOffloaderEngine.ts
The offload classifier: decides which tasks are OFFLOADABLE (explanations, summaries, search-synthesis, file-analysis, format conversion, doc-gen) vs KEEP-ON-CLAUDE (code-gen/edit, complex reasoning, multi-file refactor). This engine's `OFFLOADABLE_PATTERNS` breadth is the direct lever on the 8.9pct-vs-30pct offload-ratio gap.
Path: `mcp-server/src/engines/OllamaTaskOffloaderEngine.ts`.

### OllamaHookBridgeEngine.ts
Lets short-lived Claude Code hooks call local Ollama for suggestions with zero API tokens: 500ms default timeout, graceful fallback when Ollama is down, per-hook-type model selection, stateless (no pooling). Powers grep-index-first / mcp-route-suggest / ai-feature-recommend hook nudges. Token savings: 100pct (free local inference).
Path: `mcp-server/src/engines/OllamaHookBridgeEngine.ts`.

### OllamaCapabilityProbeEngine.ts
BLACKWELL-AI-MS0 keystone: the single RUNTIME AUTHORITY for "what can this host actually run right now." Does the live system/network I/O that the pure `ModelRoutingEngine` scorer delegates -- returns a `CapabilitySnapshot` + catalog filter so route() can only pick a model that is present AND fits free VRAM (closes the "route to an uninstalled model" gap).
Path: `mcp-server/src/engines/OllamaCapabilityProbeEngine.ts`.

### ContextCompressionEngine.ts
AI-MAX U-AIMAX07: three-tier density compression (Tier 0 FULL / Tier 1 SUMMARY / deeper) of surviving context items with compact indices + on-demand expansion. Complements its siblings: `ContextCompactionEngine` decides WHICH items survive, `ContextBudgetEngine` decides HOW MANY tokens each category gets, this decides HOW DENSE each survivor is.
Path: `mcp-server/src/engines/ContextCompressionEngine.ts`.

### PromptCompressionEngine.ts
Compresses sub-agent (Agent tool) prompts while preserving semantics -- strips filler, redundant instructions, verbose formatting. 20-50pct reduction in Agent prompt tokens.
Path: `mcp-server/src/engines/PromptCompressionEngine.ts`. Notable exports: `CompressionResult`.

### ConsensusRecallCacheEngine.ts
CAG short-circuit for the octopus/multi-model consensus loop: if an identical prompt already has a persisted consensus artifact in the wiki second-brain, return it instead of re-fanning out (each consensus call costs ~$0.30 + 30-60sec). INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-RECALL-CACHE.
Path: `mcp-server/src/engines/ConsensusRecallCacheEngine.ts`.

### CADTokenRepresentationEngine.ts
Treats CAD operations as discrete transformer tokens (256-token vocab, 20 categories) for neural CAD generation -- cross-galaxy bridge to delta/echo. Named in galaxy doctrine as this galaxy's CAD-token-efficiency asset.
Path: `mcp-server/src/engines/CADTokenRepresentationEngine.ts`. Vocab: `src/data/cad-token-vocabulary.json`. Notable: extends `BaseEngine`.

### CostEfficiencyBridgeEngine.ts
Single aggregator bridging print -> CAD -> CNC program -> cost/quote/ERP (16 upstream entries, 8 downstream consumers); pure router, no new physics; R12 fail-loud on missing material price. Named in galaxy doctrine as the cost<->$ bridge to hotel. (Note: authored by echo; it is a cross-galaxy bridge that the token-optimization doctrine claims as its cost<->efficiency edge.)
Path: `mcp-server/src/engines/CostEfficiencyBridgeEngine.ts`.

## Non-engine substrate

This galaxy is heavily script/hook-based -- the leverage lives outside the `.ts` engine layer:

**Scripts** (`scripts/*.mjs`, ~80 matched on ollama|cag|token|offload|rtk; many are paired `.test.mjs`):
- `ollama-offload.mjs` / `ollama-offload-dashboard.mjs` -- offload execution + telemetry (`--json` / `--window=48h` / `--reset`).
- `ollama-docker-health.mjs` -- 1-line Ollama+Docker+Qdrant+Postgres probe via curl (verifies `/api/chat` works, not just `/api/tags` up).
- `ask-ollama.mjs` -- OLLAMA-EXPAND CLI (modes: viz/rerank/summarize/explain/triage/ask; warm qwen2.5-coder:32b + keep_alive).
- `ollama-prism-bridge.mjs` / `ollama-l3-agent.mjs` -- L2/L3 read-only local agent loops.
- `cag-cache-stats.mjs` / `cag-stats-aggregator.mjs` / `cag-cold-anchor-coverage.mjs` / `cag-galaxy-warm-sweep.mjs` -- CAG cache telemetry + cold-anchor coverage + per-galaxy warm sweep.
- `token-awareness-snapshot.mjs` -- regenerates `TOKEN-OPTIMIZATION-AWARENESS.md` (11-leg PSN audit + live metrics).
- `token-budget-telemetry-dashboard.mjs` / `token-savings-rank.mjs` / `measure-fleet-token-savings.mjs` / `audit-token-savings-coverage.mjs` -- budget + savings telemetry + ranking + coverage audit.
- `rtk-archive-dashboard.mjs` -- RTK savings analytics surface.
- `ollama-compress-output.mjs` / `ollama-file-digest.mjs` / `ollama-commit-msg.mjs` / `ollama-codegen.mjs` / `summarize-all-scripts-via-ollama.mjs` -- concrete local-inference offload workers.

**Hooks** (`.claude/hooks/*.mjs`, verified in galaxy doctrine):
- `token-awareness-inject.mjs` / `token-awareness-sidecar.mjs` / `token-awareness-stop-advisory.mjs` / `token-budget-gate.mjs` -- zone injection + per-turn sidecar + budget gate.
- `cag-router-inject.mjs` / `cag-cold-cache-anchor.mjs` (~4KB summary anchor) / `cag-soul-cache-block.mjs` -- CAG prompt-cache anchoring.
- `ollama-task-offloader.mjs` / `ollama-pipeline-injector.mjs` / `ollama-prewarm-on-pipeline.mjs` / `ollama-route-pretooluse.mjs` / `posttool-ollama-offload-nudge.mjs` -- offload routing + prewarm.
- `mcp-route-suggest.mjs` -- route-before-reimplement nudge (take-rate 0.8pct; adoption open thread).
- `prompt-rewriter-ollama.mjs` / `cad-token-vocabulary-guard.mjs` / `claudemd-ollama-enforcer.mjs` / `stop-token-savings-summary.mjs` / `alpha-token-domain-awareness-inject.mjs`.

**State/telemetry:** `mcp-server/data/state/ollama-offload-stats.json` (schemaVersion 2.0.0; `offloaded`/`keptOnClaude` are TOP-LEVEL, not under `totals`) - `state/shared/dashboards/psn-savings-aggregate.json` (6 detectors) - `state/shared/cag-route/route-<sid>-*.json`.

**Dispatchers:** `prism_context` (token_economy_* / token_budget_* / diff_token_* / token_awareness_*) - `prism_dev` (token_ledger_* / cost_route / read_optimize_* / output_truncate_*) - `prism_session` (master_index_query / dispatcher_map_compact / cag_route).

## Full engine index

Header-read unless marked (name-derived). Domain-owned physics/toolpath/program/LoRA optimizers are EXCLUDED (mill/cam/lathe/wedm/speed-feed own those).

| Engine | Category | One-line |
|--------|----------|----------|
| TokenAwarenessEngine.ts | token-telemetry-and-budget | MCP facade over per-turn sidecar; owns GREEN/YELLOW/RED/CRITICAL zones |
| TokenEconomyEngine.ts | token-telemetry-and-budget | MXU-MS2 fleet economy: budget/spend/waste/compression/ROI |
| TokenBudgetAllocatorEngine.ts | token-telemetry-and-budget | Distributes budget across phases, reserves for critical ops |
| TokenEconomyTrackerEngine.ts | token-telemetry-and-budget | Per-session + cumulative spend tracker with savings attribution |
| TokenAccountingEngine.ts | cost-and-diff-estimation | Centralized per-tool cost baselines + efficiency scores |
| SessionTokenLedgerEngine.ts | token-telemetry-and-budget | Real-time ledger + burn-rate + exhaustion prediction |
| DiffTokenEstimatorEngine.ts | cost-and-diff-estimation | Estimates diff token cost before inline vs summarize |
| HookEfficiencyEngine.ts | cost-and-diff-estimation | Tracks tokens saved by hook block/warn/rewrite (hook ROI) |
| CADTokenRepresentationEngine.ts | cad-token-vocabulary | CAD ops as discrete transformer tokens (delta/echo bridge) |
| CostEfficiencyBridgeEngine.ts | cost-and-diff-estimation | print->CAD->CNC->cost/quote router; cost<->efficiency edge |
| OllamaTaskOffloaderEngine.ts | ollama-offload | Classifier: offloadable vs keep-on-Claude; owns OFFLOADABLE_PATTERNS |
| OllamaHookBridgeEngine.ts | ollama-offload | Hooks call local Ollama, 500ms timeout, 100pct token savings |
| OllamaClientEngine.ts | ollama-offload | Thin HTTP client around the ollama npm pkg (chat/gen/embed) |
| OllamaIntegrationEngine.ts | ollama-offload | Health/roster/model-selection brain + warmUp() over the client |
| OllamaCapabilityProbeEngine.ts | ollama-offload | BLACKWELL keystone: live "what fits VRAM now" runtime authority |
| OllamaContextFloorEngine.ts | ollama-offload | Prepends CLAUDE-BRIEF as system prompt to local calls (cached) |
| OllamaEmbedderEngine.ts | ollama-offload | Local embedding generation via Ollama (name-derived) |
| OllamaHookBridgeEngine.ts (bridge) | ollama-offload | see above |
| OllamaCAMIntegrationEngine.ts | ollama-offload | CAM-specific local-LLM integration (name-derived; cam-adjacent) |
| ContextCompressionEngine.ts | context-compression-and-management | AI-MAX: 3-tier density compression of surviving items |
| ContextCompactionEngine.ts | context-compression-and-management | Decides WHICH items survive; auto-compact on threshold |
| ContextBudgetEngine.ts | context-compression-and-management | Decides HOW MANY tokens each category gets |
| ContextWindowPressureEngine.ts | context-compression-and-management | Predicts when compaction is needed (proactive) |
| ContextDigestEngine.ts | context-compression-and-management | Ultra-compact file/dir/symbol-tree digests |
| ContextBudgetForecastEngine.ts | context-compression-and-management | Forecasts budget burn (name-derived) |
| ContextBlockPackerEngine.ts | context-compression-and-management | Packs context blocks to fit budget (name-derived) |
| ContextPriorityEngine.ts | context-compression-and-management | Prioritizes context items for retention (name-derived) |
| ContextRetentionEngine.ts | context-compression-and-management | Cross-session context retention (name-derived) |
| PromptCompressionEngine.ts | context-compression-and-management | Compresses sub-agent prompts, 20-50pct reduction |
| ReadOptimizerEngine.ts | read-and-toolcall-efficiency | Advises full/offset/grep/digest/skip read strategy |
| GrepOptimizerEngine.ts | read-and-toolcall-efficiency | Tightens Grep params to avoid broad token-wasting searches |
| ToolCallBatchOptimizerEngine.ts | read-and-toolcall-efficiency | Finds parallelization/redundancy in tool-call sequences |
| SkillInliningOptimizerEngine.ts | read-and-toolcall-efficiency | Thompson-samples which skills to inline vs look up |
| ConsensusRecallCacheEngine.ts | cag-cache | Short-circuits consensus fan-out via persisted wiki artifact |
| ResponseCacheEngine.ts | cag-cache | Caches tool responses by tool+params hash; 200-5000 tok/hit |
| OutputCacheEngine.ts | cag-cache | Reusable text blocks: ~15 tok reference vs ~500 regenerate |
| ActionSchemaCacheEngine.ts | cag-cache | Caches dispatcher action param schemas (skip 500-line reads) |
| PRISMContextInjectorEngine.ts | context-compression-and-management | Injects PRISM context bundle per turn (name-derived) |

NOTE (name-derived rows): `OllamaEmbedderEngine`, `OllamaCAMIntegrationEngine`, `ContextBudgetForecastEngine`, `ContextBlockPackerEngine`, `ContextPriorityEngine`, `ContextRetentionEngine`, `PRISMContextInjectorEngine` were classified by name/doctrine, not header-read. Numerous `Context*Engine` variants (ContextChainEngine, ContextCheckpointEngine, ContextSnapshotEngine, ContextEvalEngine, ContextIntegrityEngine, ContextInventoryEngine, ContextPreloaderEngine, ContextWindowMapEngine, DualChannelContextEngine, GraphContextLensEngine, ErrorContextEngine, DailyContextWorkflowEngine, ContextChainEngine) exist in the flat tree and are context-management-adjacent but are session/orchestration infrastructure rather than token-economy-owned; they are noted here but not claimed. `CostSavingsTrackerEngine` (dollar/shop ROI, VAL-MS0) and `OptimizationTierEngine` (G-code user-intent consent gate) matched the keyword regex but are quoting/manufacturing-owned and are EXCLUDED.

## Honest count

- **Dedicated token-economy engines (doctrine-named, header-verified):** 10 -- Token{Awareness,BudgetAllocator,Economy,EconomyTracker,Accounting} + SessionTokenLedger + DiffTokenEstimator + HookEfficiency + CADTokenRepresentation + CostEfficiencyBridge.
- **Galaxy-substrate engines claimed here (dedicated + Ollama-offload + CAG-cache + context-compression + read/toolcall-efficiency, header-read or doctrine/name-derived):** ~38 in the index table.
- **Excluded:** ~90+ `*Optimization*` engines that are domain physics/toolpath/program/LoRA optimizers (mill/cam/lathe/wedm/speed-feed), plus session/orchestration `Context*` infra.
- This galaxy is deliberately LIGHT on dedicated engines and HEAVY on scripts/hooks (~80 ollama|cag|token|offload|rtk scripts + ~18 token/CAG/Ollama hooks). The real token-savings machinery lives in the non-engine substrate, per galaxy doctrine.
