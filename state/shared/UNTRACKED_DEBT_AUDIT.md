# UNTRACKED DEBT AUDIT — Phase B

**Generated:** 2026-05-12T21:36:24.692Z  
**Scope:** 6-chat fleet untracked + modified files in `H:/prism`  
**Audit mode:** READ-ONLY — no git mutations, no file moves, no stash  

---

## 1. TOP-LINE SUMMARY

| Metric | Count |
|--------|------:|
| Untracked files (??) | 7322 |
| Records stat'd successfully | 7317 |
| Stat errors (paths likely with quoted whitespace) | 5 |
| MTime clusters (5-min windows) | 1401 |
| **Untracked engines (.ts)** | 606 |
| - **Wired** (≥1 dispatcher imports them) | 260 (42.9%) |
| - **Orphan** (no dispatcher imports them) | 346 (57.1%) |
| Untracked tests | 2158 |
| - Pair with an untracked engine (paired ship) | 368 |
| - Pair with dispatcher-known engine (orphan-test for committed code) | 0 |
| - Truly orphan tests | 1790 |
| Untracked milestones (mcp-server/data/) | 640 |
| Untracked milestones (top-level data/) | 383 |
| - Referenced by roadmap-index (envelope-orphan) | 1001 |
| - Ghost (not in index) | 22 |
| Frontend files (mcp-server/web/src/) | 513 |
| Chat-bus entries parsed | 40 |

### Top-level dir breakdown

| Directory | Files |
|-----------|------:|
| `mcp-server/` | 4805 |
| `data/` | 555 |
| `scripts/` | 435 |
| `state/` | 381 |
| `.claude/` | 220 |
| `knowledge/` | 209 |
| `docs/` | 136 |
| `Docustrata/` | 109 |
| `cad-engine/` | 84 |
| `extracted_modules/` | 19 |
| `.github/` | 5 |
| `0/` | 1 |
| `1/` | 1 |
| `# PRISM MASTER REFERENCE v12.ini/` | 1 |
| `.claudeignore/` | 1 |

### Top 2-level subdir breakdown (top 25)

| Subdir | Files |
|--------|------:|
| `mcp-server/src/` | 2748 |
| `mcp-server/data/` | 1097 |
| `mcp-server/web/` | 536 |
| `data/milestones/` | 387 |
| `state/shared/` | 352 |
| `mcp-server/scripts/` | 270 |
| `knowledge/memories/` | 130 |
| `Docustrata/.index/` | 89 |
| `.claude/hooks/` | 88 |
| `data/docs/` | 69 |
| `cad-engine/src/` | 62 |
| `mcp-server/state/` | 36 |
| `knowledge/claude-md/` | 34 |
| `knowledge/wiki/` | 29 |
| `.claude/scripts/` | 23 |
| `cad-engine/knowledge_store/` | 10 |
| `state/checkpoints/` | 10 |
| `scripts/system-health/` | 5 |
| `.github/workflows/` | 4 |
| `scripts/agents/` | 4 |
| `state/test-results/` | 4 |
| `data/docker-volumes/` | 3 |
| `.claude/helpers/` | 1 |
| `.claude/hookify.block-bash-echo-test.local.md/` | 1 |
| `.claude/hookify.block-bash-ps-aux.local.md/` | 1 |

---

## 2. CLUSTER TABLE — mtime ±5 min windows

Top 30 clusters by file count. Total 1401 clusters.

| # | First mtime | Last mtime | Files | Size | Chat hits | Suspected | Top dirs |
|---|-------------|------------|------:|------|----------:|-----------|----------|
| C1 | 2026-04-04 15:11:16 | 2026-04-04 15:15:36 | 254 | 2.3MB | 0 | - | data(167), mcp-server(85), scripts(2) |
| C2 | 2026-04-16 15:18:36 | 2026-04-16 17:01:34 | 233 | 1.6MB | 0 | - | mcp-server(233) |
| C3 | 2026-04-16 20:06:22 | 2026-04-16 22:34:40 | 216 | 1.7MB | 0 | - | mcp-server(205), scripts(7), .claude(3), start-server.bat(1) |
| C4 | 2026-04-19 22:29:00 | 2026-04-19 22:35:50 | 171 | 2.6MB | 0 | - | mcp-server(171) |
| C5 | 2026-02-20 01:16:06 | 2026-02-20 01:16:06 | 164 | 2.9MB | 0 | - | scripts(130), mcp-server(15), docs(13), MCP_ENHANCEMENT_ROADMAP_v2.md(1), MCP_ROUND2_ROADMAP_v3.md(1) |
| C6 | 2026-04-20 01:01:50 | 2026-04-20 01:02:30 | 131 | 5.5MB | 0 | - | mcp-server(129), .claude(1), scripts(1) |
| C7 | 2026-04-20 03:02:58 | 2026-04-20 03:12:14 | 125 | 0B | 0 | - | mcp-server(114), knowledge(2), mcp-cadquery(1), mcp-dev-tools(1), models(1) |
| C8 | 2026-04-19 22:41:00 | 2026-04-19 22:44:36 | 113 | 1.9MB | 0 | - | mcp-server(113) |
| C9 | 2026-04-15 23:32:50 | 2026-04-15 23:32:52 | 91 | 48.6KB | 0 | - | .claude(91) |
| C10 | 2026-05-08 16:41:54 | 2026-05-08 16:42:12 | 88 | 936.3KB | 0 | - | mcp-server(67), state(21) |
| C11 | 2026-04-12 20:43:16 | 2026-04-12 20:48:48 | 85 | 541.5KB | 0 | - | mcp-server(85) |
| C12 | 2026-04-14 22:50:40 | 2026-04-15 00:14:56 | 77 | 1.7MB | 0 | - | mcp-server(77) |
| C13 | 2026-05-05 13:00:09 | 2026-05-05 13:00:09 | 73 | 136.3KB | 0 | - | knowledge(73) |
| C14 | 2026-03-07 21:35:58 | 2026-03-07 22:16:18 | 72 | 538.9KB | 0 | - | mcp-server(72) |
| C15 | 2026-04-16 17:23:00 | 2026-04-16 18:19:18 | 68 | 524.5KB | 0 | - | mcp-server(68) |
| C16 | 2026-04-15 13:46:44 | 2026-04-15 14:43:54 | 62 | 1.9MB | 0 | - | mcp-server(62) |
| C17 | 2026-03-08 02:32:28 | 2026-03-08 03:57:02 | 52 | 395.4KB | 0 | - | mcp-server(47), scripts(5) |
| C18 | 2026-04-16 01:32:10 | 2026-04-16 02:09:30 | 49 | 630.8KB | 0 | - | mcp-server(49) |
| C19 | 2026-03-07 19:01:42 | 2026-03-07 19:40:12 | 47 | 312.9KB | 0 | - | mcp-server(47) |
| C20 | 2026-04-16 00:40:52 | 2026-04-16 00:49:16 | 47 | 1.5MB | 0 | - | mcp-server(47) |
| C21 | 2026-04-20 02:51:46 | 2026-04-20 02:52:38 | 46 | 0B | 0 | - | data(28), docs(8), extracted_modules(6), deploy(1), deployment(1) |
| C22 | 2026-04-12 20:55:06 | 2026-04-12 21:14:54 | 44 | 580.8KB | 0 | - | mcp-server(44) |
| C23 | 2026-04-17 17:00:14 | 2026-04-17 17:23:06 | 44 | 625.1KB | 0 | - | mcp-server(35), .claude(9) |
| C24 | 2026-03-01 22:13:08 | 2026-03-01 22:30:48 | 42 | 440.8KB | 0 | - | mcp-server(34), cad-engine(8) |
| C25 | 2026-03-07 16:36:02 | 2026-03-07 17:15:58 | 39 | 190.1KB | 0 | - | mcp-server(38), scripts(1) |
| C26 | 2026-04-15 16:42:58 | 2026-04-15 17:43:06 | 38 | 1011.9KB | 0 | - | mcp-server(38) |
| C27 | 2026-04-15 01:28:40 | 2026-04-15 01:57:22 | 37 | 662.4KB | 0 | - | mcp-server(30), cad-engine(7) |
| C28 | 2026-02-26 23:59:24 | 2026-02-27 00:00:46 | 35 | 10.4MB | 0 | - | data(35) |
| C29 | 2026-03-07 19:45:46 | 2026-03-07 20:23:44 | 35 | 146.3KB | 0 | - | mcp-server(35) |
| C30 | 2026-03-08 17:33:12 | 2026-03-08 18:31:04 | 35 | 301.2KB | 0 | - | mcp-server(34), SLASH_COMMANDS.md(1) |

### Cluster details — top 10 with chat-bus correlations

#### Cluster C1 — 254 files (2026-04-04 15:11:16 → 2026-04-04 15:15:36)

- **Total size:** 2.3MB
- **Top dirs:** `data`(167), `mcp-server`(85), `scripts`(2)
- **Top subdirs:** `data/milestones`(167), `mcp-server/data`(83), `mcp-server/scripts`(2), `scripts/gen-engine-exports.mjs`(1), `scripts/reconcile-milestones.mjs`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/scripts/gen-engine-exports.mjs`, `scripts/gen-engine-exports.mjs`, `mcp-server/scripts/reconcile-milestones.mjs`, `scripts/reconcile-milestones.mjs`, `data/milestones/CAMK-MS0.json`

#### Cluster C2 — 233 files (2026-04-16 15:18:36 → 2026-04-16 17:01:34)

- **Total size:** 1.6MB
- **Top dirs:** `mcp-server`(233)
- **Top subdirs:** `mcp-server/src`(210), `mcp-server/data`(16), `mcp-server/scripts`(6), `mcp-server/wedm_retrofit_report.json`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/src/__tests__/LatheSafetyHooks.test.ts`, `mcp-server/src/__tests__/AHPEngine.test.ts`, `mcp-server/src/__tests__/AbrasiveJetMachiningEngine.test.ts`, `mcp-server/src/__tests__/AMSAAReliabilityGrowthEngine.test.ts`, `mcp-server/data/state/WEDM_MIT_OCW_INTEGRATION.json`

#### Cluster C3 — 216 files (2026-04-16 20:06:22 → 2026-04-16 22:34:40)

- **Total size:** 1.7MB
- **Top dirs:** `mcp-server`(205), `scripts`(7), `.claude`(3), `start-server.bat`(1)
- **Top subdirs:** `mcp-server/src`(197), `mcp-server/data`(6), `.claude/hooks`(3), `mcp-server/scripts`(2), `scripts/_prism_paths.py`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/data/state/WEDM_TRANSFER_REGISTRY.json`, `mcp-server/src/engines/LatheCoolantAdvisorEngine.ts`, `mcp-server/src/engines/LatheOpTimeBreakdownEngine.ts`, `mcp-server/src/__tests__/LatheCSSOptimizerEngine.test.ts`, `mcp-server/src/__tests__/HardTurningDecisionEngine.test.ts`

#### Cluster C4 — 171 files (2026-04-19 22:29:00 → 2026-04-19 22:35:50)

- **Total size:** 2.6MB
- **Top dirs:** `mcp-server`(171)
- **Top subdirs:** `mcp-server/data`(169), `mcp-server/web`(1), `mcp-server/scripts`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/web/src/__tests__/WireEdmCalibrationPanel.test.tsx`, `mcp-server/data/milestones/WEDM-CAL-MS4.json`, `mcp-server/scripts/rgs-retrofit-envelopes.mjs`, `mcp-server/data/milestones/ACP-MS0.json`, `mcp-server/data/milestones/ACP-MS1.json`

#### Cluster C5 — 164 files (2026-02-20 01:16:06 → 2026-02-20 01:16:06)

- **Total size:** 2.9MB
- **Top dirs:** `scripts`(130), `mcp-server`(15), `docs`(13), `MCP_ENHANCEMENT_ROADMAP_v2.md`(1), `MCP_ROUND2_ROADMAP_v3.md`(1)
- **Top subdirs:** `mcp-server/scripts`(9), `docs/AUDIT_REPORT_v10.md`(1), `docs/DEVELOPMENT_PROMPT_COMPARISON.md`(1), `docs/DEVELOPMENT_PROMPT_v14.md`(1), `docs/DEVELOPMENT_ROADMAP_v5.md`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `MCP_ENHANCEMENT_ROADMAP_v2.md`, `MCP_ROUND2_ROADMAP_v3.md`, `MERGED_ROADMAP_v6.md`, `PRIORITY_ROADMAP.json`, `PRIORITY_ROADMAP.md`

#### Cluster C6 — 131 files (2026-04-20 01:01:50 → 2026-04-20 01:02:30)

- **Total size:** 5.5MB
- **Top dirs:** `mcp-server`(129), `.claude`(1), `scripts`(1)
- **Top subdirs:** `mcp-server/src`(118), `mcp-server/data`(8), `mcp-server/web`(2), `.claude/hooks`(1), `scripts/sync-awareness-counts.mjs`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `.claude/hooks/inventory-refresh.mjs`, `mcp-server/data/dispatcher-health/`, `mcp-server/data/docs/CODE_SYSTEM_INDEX.json`, `mcp-server/data/hypermill-extracted/`, `mcp-server/data/milestones/CAD-UNIVERSAL-CONTROL-MS0.json`

#### Cluster C7 — 125 files (2026-04-20 03:02:58 → 2026-04-20 03:12:14)

- **Total size:** 0B
- **Top dirs:** `mcp-server`(114), `knowledge`(2), `mcp-cadquery`(1), `mcp-dev-tools`(1), `models`(1)
- **Top subdirs:** `mcp-server/data`(35), `mcp-server/web`(23), `mcp-server/src`(22), `mcp-server/state`(16), `mcp-server/scripts`(3)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `knowledge/code-index/`, `knowledge/data-index/`, `mcp-cadquery/`, `mcp-dev-tools/`, `mcp-server/.github/`

#### Cluster C8 — 113 files (2026-04-19 22:41:00 → 2026-04-19 22:44:36)

- **Total size:** 1.9MB
- **Top dirs:** `mcp-server`(113)
- **Top subdirs:** `mcp-server/data`(110), `mcp-server/scripts`(3)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/scripts/rgs-retrofit-pass2.mjs`, `mcp-server/data/milestones/AGENT-ROADMAP.json`, `mcp-server/data/milestones/ARCH-MS2.json`, `mcp-server/data/milestones/ARCH-MS3.json`, `mcp-server/data/milestones/ARCH-MS4.json`

#### Cluster C9 — 91 files (2026-04-15 23:32:50 → 2026-04-15 23:32:52)

- **Total size:** 48.6KB
- **Top dirs:** `.claude`(91)
- **Top subdirs:** `.claude/hookify.block-bash-echo-test.local.md`(1), `.claude/hookify.block-bash-ps-aux.local.md`(1), `.claude/hookify.block-bash-sleep.local.md`(1), `.claude/hookify.block-bash-which.local.md`(1), `.claude/hookify.block-dangerous-rm.local.md`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `.claude/hookify.block-bash-echo-test.local.md`, `.claude/hookify.block-bash-ps-aux.local.md`, `.claude/hookify.block-bash-sleep.local.md`, `.claude/hookify.block-bash-which.local.md`, `.claude/hookify.block-dangerous-rm.local.md`

#### Cluster C10 — 88 files (2026-05-08 16:41:54 → 2026-05-08 16:42:12)

- **Total size:** 936.3KB
- **Top dirs:** `mcp-server`(67), `state`(21)
- **Top subdirs:** `mcp-server/data`(67), `state/checkpoints`(10), `state/shared`(6), `state/test-results`(4), `state/QA-MS0`(1)
- **Suspected author:** (no agent slot in chat-bus window)
- **Sample files:** `mcp-server/data/state/APPW-MS8/`, `mcp-server/data/state/agent-memory.json`, `mcp-server/data/state/agent-profiles.json`, `mcp-server/data/state/CAMK-MS2/`, `mcp-server/data/state/CAMK-MS3/`

---

## 3. ENGINE WIRING MAP — 606 untracked engines

Method: parsed all 96 dispatcher source files in `mcp-server/src/tools/dispatchers/*Dispatcher.ts` for `engines/<EngineName>` import patterns. An engine is "wired" iff its basename appears as a target import in at least one dispatcher.

| Status | Count | Pct |
|--------|------:|----:|
| **Wired** (dispatcher imports detected) | 260 | 42.9% |
| **Orphan** (no dispatcher imports) | 346 | 57.1% |

> Across the full 96-dispatcher × all-engines space, 5002 dispatcher→engine import references were parsed; 2095 unique engine names are wired in dispatchers. 260 of those wired-in-dispatcher engines exist as untracked files (real wiring debt that would activate the moment we commit).

### Sample 10 — WIRED untracked engines (commit-priority HIGH — they're real system work)

| Engine | Dispatcher refs |
|--------|-----------------|
| `mcp-server/src/engines/AgentMemoryFabricEngine.ts` | `agentDispatcher`, `memoryDispatcher` |
| `mcp-server/src/engines/CAMStrategyRecommenderEngine.ts` | `camFunctionDispatcher`, `camDispatcher` |
| `mcp-server/src/engines/ContextCompactionEngine.ts` | `agentDispatcher`, `contextDispatcher` |
| `mcp-server/src/engines/LearningLoopEngine.ts` | `agentDispatcher`, `orchestrationDispatcher` |
| `mcp-server/src/engines/MillingAGIOrchestrationEngine.ts` | `aiReasoningDispatcher`, `millDispatcher` |
| `mcp-server/src/engines/MillingDeepKnowledgeSynthesisEngine.ts` | `aiReasoningDispatcher`, `millDispatcher` |
| `mcp-server/src/engines/MillingDeepReasoningEngine.ts` | `aiReasoningDispatcher`, `millDispatcher` |
| `mcp-server/src/engines/MillingDigitalTwinEngine.ts` | `aiReasoningDispatcher`, `millDispatcher` |
| `mcp-server/src/engines/AGISafetyContainmentEngine.ts` | `guardDispatcher` |
| `mcp-server/src/engines/AIAutoUtilizationEngine.ts` | `devDispatcher` |

### Sample 10 — ORPHAN untracked engines (no dispatcher imports — drafts or pending wiring)

| Engine |
|--------|
| `mcp-server/src/engines/AS9100TraceabilityEngine.ts` |
| `mcp-server/src/engines/AbstractionHierarchyEngine.ts` |
| `mcp-server/src/engines/AcquisitionRecommendationEngine.ts` |
| `mcp-server/src/engines/ActionableErrorTemplateEngine.ts` |
| `mcp-server/src/engines/AdvancedCNCConfigEngine.ts` |
| `mcp-server/src/engines/AgentAutoUpdateEngine.ts` |
| `mcp-server/src/engines/AgentRegistryEngine.ts` |
| `mcp-server/src/engines/AgentSelfAwarenessEngine.ts` |
| `mcp-server/src/engines/AgentSpecializationProfileEngine.ts` |
| `mcp-server/src/engines/AgentWorkflowEngine.ts` |

### Notable: top 10 dispatchers receiving wired-but-untracked engine imports

| Dispatcher | # untracked-engine refs |
|------------|------------------------:|
| `ppDispatcher` | 117 |
| `aiReasoningDispatcher` | 39 |
| `millDispatcher` | 21 |
| `camDispatcher` | 16 |
| `orchestrationDispatcher` | 11 |
| `cadDispatcher` | 10 |
| `edmDispatcher` | 8 |
| `calcDispatcher` | 7 |
| `devDispatcher` | 6 |
| `agentDispatcher` | 6 |

> Implication: `ppDispatcher` is the dispatcher most affected by an uncommit-engines test failure when running `npm run build`.

---

## 4. TEST COVERAGE MAP

| Category | Count | Pct |
|----------|------:|----:|
| Tests pairing with **untracked engine** (paired ship) | 368 | 17.1% |
| Tests pairing with **dispatcher-known engine** (orphan-test for committed engine) | 0 | 0.0% |
| Tests with **no engine match** (truly orphan tests) | 1790 | 82.9% |

> The 1,797 truly-orphan tests are the largest single category of debt. Likely sources: tests for engines that were renamed or removed, integration / smoke / e2e tests not bound to a single engine, fixture-only files in `__tests__`. Manual sample needed before mass-commit.

### Sample 20 — orphan tests (no matching engine in untracked OR dispatcher imports)

- `mcp-server/src/__tests__/5AXIS-DEEP.test.ts`
- `mcp-server/src/__tests__/AHPEngine.test.ts`
- `mcp-server/src/__tests__/AIMLFormulasEngine.test.ts`
- `mcp-server/src/__tests__/AMSAAReliabilityGrowthEngine.test.ts`
- `mcp-server/src/__tests__/AbrasiveJetMachiningEngine.test.ts`
- `mcp-server/src/__tests__/AccountingHardeningEngine.test.ts`
- `mcp-server/src/__tests__/AccumulatorEngine.test.ts`
- `mcp-server/src/__tests__/ActualCostEngine.test.ts`
- `mcp-server/src/__tests__/AdaptiveFeedControlEngine.test.ts`
- `mcp-server/src/__tests__/AdaptiveRefinementEngine.test.ts`
- `mcp-server/src/__tests__/AdaptiveSpindleControlEngine.test.ts`
- `mcp-server/src/__tests__/AdaptiveToolpathRouterEngine.test.ts`
- `mcp-server/src/__tests__/AdditiveQuoteEngine.test.ts`
- `mcp-server/src/__tests__/AdvancedMillingStrategiesEngine.test.ts`
- `mcp-server/src/__tests__/AlarmIntelligenceEngine.test.ts`
- `mcp-server/src/__tests__/AlgorithmRegistryWiring.test.ts`
- `mcp-server/src/__tests__/AtomicClaimBrokerEngine-U-AWR25.test.ts`
- `mcp-server/src/__tests__/AutoForgeEngine.test.ts`
- `mcp-server/src/__tests__/AutoProgramOrchestratorEngine.test.ts`
- `mcp-server/src/__tests__/AutoSchemaGeneratorEngine.test.ts`

---

## 5. MILESTONE ENVELOPE AUDIT

| Location | Count |
|----------|------:|
| `mcp-server/data/milestones/` | 640 |
| `data/milestones/` (top-level) | 383 |
| **Both locations combined** | 1023 |
| Referenced by `roadmap-index.json` | 1001 |
| Ghost milestones (envelope on disk, NOT in index) | 22 |

> Note: roadmap-index ID extraction is heuristic — uppercased basename minus date/version suffix; `startsWith` match. Coverage may be ±10% off; manual cross-check required.

### Sample — envelopes referenced by roadmap-index (5)
- `mcp-server/data/milestones/ACP-MS0.json` → inferred id `ACP-MS0`
- `mcp-server/data/milestones/ACP-MS0A.json` → inferred id `ACP-MS0A`
- `mcp-server/data/milestones/ACP-MS1.json` → inferred id `ACP-MS1`
- `mcp-server/data/milestones/ACP-MS2.json` → inferred id `ACP-MS2`
- `mcp-server/data/milestones/ACP-MS2B.json` → inferred id `ACP-MS2B`

### Sample — ghost envelopes (5)
- `mcp-server/data/milestones/5AXIS-AI.json` → inferred id `5AXIS-AI`
- `mcp-server/data/milestones/AI-MAX-ROADMAP.json` → inferred id `AI-MAX-ROADMAP`
- `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json` → inferred id `BLUEPRINT-OCR-TRAINING-MS1`
- `mcp-server/data/milestones/CONTROLLER-AI.json` → inferred id `CONTROLLER-AI`
- `mcp-server/data/milestones/HSM-AI.json` → inferred id `HSM-AI`

### Duplicate-location risk

- 379 milestone names appear in BOTH `mcp-server/data/milestones/` AND `data/milestones/` — same envelope, two locations. Examples: `ACP-MS0.json`, `ACP-MS0A.json`, `ACP-MS1.json`

---

## 6. FRONTEND ANALYSIS — mcp-server/web/src

- **Total untracked:** 513
- **BUILD_STATE pending-frontend-merge entries:** 0

Frontend file clusters (193):

| # | mtime range | Files | Top subs |
|---|-------------|------:|----------|
| FE1 | 2026-04-12 20:43:24 → 2026-04-12 20:48:48 | 84 | pages(25), api(21), hooks(17) |
| FE2 | 2026-04-12 20:55:06 → 2026-04-12 21:08:00 | 40 | hooks(13), api(10), components(10) |
| FE3 | 2026-04-20 03:09:02 → 2026-04-20 03:09:03 | 18 | components(13), lib(1), pages(1) |
| FE4 | 2026-03-29 19:21:40 → 2026-03-29 19:28:48 | 17 | pages(10), __tests__(3), hooks(2) |
| FE5 | 2026-03-31 15:25:38 → 2026-03-31 15:29:10 | 7 | api(3), hooks(2), components(1) |
| FE6 | 2026-04-12 20:34:34 → 2026-04-12 20:34:42 | 7 | __tests__(4), pages(2), components(1) |
| FE7 | 2026-04-15 15:45:10 → 2026-04-15 15:53:06 | 7 | pages(7) |
| FE8 | 2026-03-28 05:27:50 → 2026-03-28 05:33:48 | 6 | pages(3), api(2), __tests__(1) |
| FE9 | 2026-04-11 16:13:42 → 2026-04-11 16:17:36 | 5 | features(3), __tests__(2) |
| FE10 | 2026-04-15 01:02:24 → 2026-04-15 01:08:00 | 5 | pages(3), __tests__(2) |

---

## 7. DECISION MATRIX — per cluster

Decisions are heuristic. Confirm chat-bus suspicion via `gh` or per-worktree `git status` before mass-commit. **Per memory rule**: never `git stash`, never delete or move existing files in this multi-chat tree.

Decision codes:

- **COMMIT-MINE** — chat-bus correlates to bravo within window
- **COMMIT-AS-MAINTENANCE** — auto-regenerated state files / agent-findings; safe to commit as maintenance
- **CONTACT-OWNER** — chat-bus suggests a peer; verify before commit
- **MASS-COMMIT-PEER-WIP** — large coherent batch from one peer chat; commit with `--author` preservation after their consent
- **ARCHIVE** — orphan / unreferenced / unknown; review before mass action

| # | Files | Suspected author | Top dirs | Decision | Rationale |
|---|------:|------------------|----------|----------|-----------|
| C1 | 254 | - | data/mcp-server | **MASS-COMMIT-PEER-WIP** | large coherent batch — likely a single peer chat's WIP |
| C2 | 233 | - | mcp-server | **MASS-COMMIT-PEER-WIP** | large coherent batch — likely a single peer chat's WIP |
| C3 | 216 | - | mcp-server/scripts | **MASS-COMMIT-PEER-WIP** | large coherent batch — likely a single peer chat's WIP |
| C4 | 171 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C5 | 164 | - | scripts/mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C6 | 131 | - | mcp-server/.claude | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C7 | 125 | - | mcp-server/knowledge | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C8 | 113 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C9 | 91 | - | .claude | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C10 | 88 | - | mcp-server/state | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C11 | 85 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C12 | 77 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C13 | 73 | - | knowledge | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C14 | 72 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C15 | 68 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C16 | 62 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C17 | 52 | - | mcp-server/scripts | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C18 | 49 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C19 | 47 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C20 | 47 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C21 | 46 | - | data/docs | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C22 | 44 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C23 | 44 | - | mcp-server/.claude | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C24 | 42 | - | mcp-server/cad-engine | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C25 | 39 | - | mcp-server/scripts | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C26 | 38 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C27 | 37 | - | mcp-server/cad-engine | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C28 | 35 | - | data | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C29 | 35 | - | mcp-server | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |
| C30 | 35 | - | mcp-server/SLASH_COMMANDS.md | **CONTACT-OWNER** | ambiguous — verify in chat-bus / worktree before action |

---

## 8. RECOMMENDED COMMIT BATCHES — safest 3-5 first

> All read-only here. Run from `H:/prism` after confirming author intent.

### Batch 1 — 26 files (2026-05-11 20:43:45 → 2026-05-11 20:45:40)

- **Decision:** COMMIT-AS-MAINTENANCE
- **Suggested commit msg:** `[MAINT] commit auto-regenerated state files`
- **Top dirs:** `state`(26)
- **Suspected author:** (no agent attribution)

<details><summary>git add list (26 files)</summary>

```bash
# From H:/prism
git add "state/shared/system-viz/engine-domain-inventory-augmentation.json"
git add "state/shared/system-viz/knowledge-inventory-augmentation.json"
git add "state/shared/system-viz/staleness-overlay-augmentation.json"
git add "state/shared/system-viz/wiring-overlay-augmentation.json"
git add "state/shared/system-viz/galaxy-constituents-augmentation.json"
git add "state/shared/system-viz/knowledge-galaxy-augmentation.json"
git add "state/shared/system-viz/layer-bridges-augmentation.json"
git add "state/shared/system-viz/stagnant-features-augmentation.json"
git add "state/shared/system-viz/engine-graph-augmentation.json"
git add "state/shared/system-viz/hook-bridges-augmentation.json"
git add "state/shared/system-viz/frontend-pages-augmentation.json"
git add "state/shared/system-viz/combo-detector-augmentation.json"
git add "state/shared/system-viz/wiki-entries-augmentation.json"
git add "state/shared/system-viz/formulas-atomic-augmentation.json"
git add "state/shared/system-viz/personas-augmentation.json"
git add "state/shared/system-viz/skills-atomic-augmentation.json"
git add "state/shared/system-viz/schemas-atomic-augmentation.json"
git add "state/shared/system-viz/algorithms-atomic-augmentation.json"
git add "state/shared/system-viz/transport-expand-augmentation.json"
git add "state/shared/system-viz/ai-tier-expand-augmentation.json"
git add "state/shared/system-viz/actions-atomic-augmentation.json"
git add "state/shared/system-viz/hooks-atomic-augmentation.json"
git add "state/shared/system-viz/tests-atomic-augmentation.json"
git add "state/shared/system-viz/scripts-atomic-augmentation.json"
git add "state/shared/system-viz/memories-atomic-augmentation.json"
git add "state/shared/system-viz/registry-entries-augmentation.json"
```

</details>

### Batch 2 — 6 files (2026-05-02 20:39:31 → 2026-05-02 20:45:25)

- **Decision:** COMMIT-AS-MAINTENANCE
- **Suggested commit msg:** `[MAINT] commit auto-regenerated state files`
- **Top dirs:** `state`(6)
- **Suspected author:** (no agent attribution)

<details><summary>git add list (6 files)</summary>

```bash
# From H:/prism
git add "state/shared/DESKTOP-CLAUDE-SYSTEM-PROMPT-PROPOSAL.md"
git add "state/shared/AUDIT-EXECUTIVE-SUMMARY.md"
git add "state/shared/META-VALIDATION-GATE-SPEC.md"
git add "state/shared/NEXT-ACTIONS.md"
git add "state/shared/PRODUCT-FEATURES-TO-SURFACE.md"
git add "state/shared/WORK-ORDER-FINAL.md"
```

</details>

### Batch 3 — 6 files (2026-05-10 15:27:06 → 2026-05-10 15:31:23)

- **Decision:** COMMIT-AS-MAINTENANCE
- **Suggested commit msg:** `[MAINT] commit auto-regenerated state files`
- **Top dirs:** `state`(3), `mcp-server`(3)
- **Suspected author:** (no agent attribution)

<details><summary>git add list (6 files)</summary>

```bash
# From H:/prism
git add "state/shared/system-viz/l11-leaves-augmentation.json"
git add "state/shared/system-viz/fs-deep-inventory-augmentation.json"
git add "mcp-server/data/state/decision-log.json"
git add "mcp-server/data/state/CHECKPOINT_TRACKER.json"
git add "mcp-server/data/state/error-memory.json"
git add "state/shared/.cross-session-last-check.json"
```

</details>

### Batch 4 — 5 files (2026-05-11 02:42:48 → 2026-05-11 02:49:18)

- **Decision:** COMMIT-AS-MAINTENANCE
- **Suggested commit msg:** `[MAINT] commit auto-regenerated state files`
- **Top dirs:** `state`(5)
- **Suspected author:** (no agent attribution)

<details><summary>git add list (5 files)</summary>

```bash
# From H:/prism
git add "state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-OBSIDIAN-COMPOUND-MS1-ATOMIZED-2026-05-10.md"
git add "state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-WIKI-EVOLVE-MS0-ATOMIZED-2026-05-10.md"
git add "state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-LOOP-MIGRATE-MS0-ATOMIZED-2026-05-10.md"
git add "state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-COST-CASCADE-MS0-ATOMIZED-2026-05-10.md"
git add "state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-MACHINE-CONNECTIVITY-MS0-ATOMIZED-2026-05-10.md"
```

</details>

### Batch 5 — 4 files (2026-05-10 06:53:49 → 2026-05-10 06:53:59)

- **Decision:** COMMIT-AS-MAINTENANCE
- **Suggested commit msg:** `[MAINT] commit auto-regenerated state files`
- **Top dirs:** `state`(4)
- **Suspected author:** (no agent attribution)

<details><summary>git add list (4 files)</summary>

```bash
# From H:/prism
git add "state/shared/system-viz/forge-audit-orchestration.json"
git add "state/shared/system-viz/phase0_awareness.json"
git add "state/shared/system-viz/phase2_crossdomain.json"
git add "state/shared/system-viz/audit-overlay.json"
```

</details>

### Bravo-correlated clusters (chat-bus suggests bravo's work — these are MINE)

- 33 files at 2026-05-12 21:04:43 (state, mcp-server, knowledge)
- 5 files at 2026-05-12 19:31:44 (state, mcp-server, knowledge)
- 4 files at 2026-05-12 13:39:58 (state)

Sample git add for bravo cluster #1 (33 files):

<details><summary>git add list</summary>

```bash
git add "state/shared/GIT-TREE-DECISIONS.md"
git add "knowledge/memories/feedback/feedback_roadmap_close_out.md"
git add "mcp-server/data/state/TIER1_CONTEXT_PACK.json"
git add "mcp-server/data/state/gsd_access_log.json"
git add "mcp-server/data/state/settings-baseline-2026-05-12T21-07-33-592Z.json"
git add "state/chat-isolated/"
git add "mcp-server/data/state/CURIOSITY_QUEUE.json"
git add "mcp-server/state/consolidated_patterns.json"
git add "state/shared/chat-slots.lock.released-1778620123360"
git add "state/shared/chat-slots.json"
git add "state/shared/chat-slots.lock.released-1778620136803"
git add "state/shared/MACHINE_REGISTRY.json"
git add "mcp-server/state/memory_consolidation_state.json"
git add "mcp-server/data/state/ROADMAP_CLOSEOUT_BLOCK_LEDGER.json"
git add "mcp-server/.tsbuildinfo"
git add "state/shared/HOOK_REGISTRY.json.previous.json"
git add "state/shared/HS-06-SMART-RECALL-PLAN.md"
git add "mcp-server/data/milestones/CADCAM-DAGI-MS0.json"
git add ".claude/hooks/_envelope.mjs"
git add "state/shared/.untracked-files-list.txt"
git add "mcp-server/data/state/cross-session-asset-registry.json"
git add "state/shared/STOP_AUTO_WIRE.json"
git add "knowledge/handoffs/"
git add "state/HANDOFF.md"
git add "PRISM-INVENTORY-2026-05-12.md"
git add "mcp-server/data/state/linear-sync-state.json"
git add "mcp-server/data/state/supabase-sync-state.json"
git add "state/shared/ACTIVE_ROADMAP_CLAIMS.json"
git add "state/shared/checkpoints/"
git add "state/shared/.hook-janitor-stamp"
# ... + 3 more
```

</details>

---

## 9. WIRED ENGINES — actionable per-dispatcher commit batches

These 260 engines are imported by dispatchers but uncommitted. Each batch can be committed atomically per dispatcher (engine + matching test if present).

| Dispatcher | Untracked-engine count | Sample engines |
|------------|----------------------:|----------------|
| `ppDispatcher` | 117 | `AlgorithmWiringEngine`, `AssetWiringSummaryEngine`, `CrossDisciplinaryDeepLearningEngine` … |
| `aiReasoningDispatcher` | 39 | `AIDecisionExplanationEngine`, `AIDeepKnowledgeIntegrationEngine`, `AIGeneratedCodeApprovalGateEngine` … |
| `millDispatcher` | 21 | `MillProgramLearningEngine`, `MillResourceAwarenessEngine`, `MillingAGIOrchestrationEngine` … |
| `camDispatcher` | 16 | `CAMAnalyzeEngine`, `CAMDeepLearningEngine`, `CAMExportEngine` … |
| `orchestrationDispatcher` | 11 | `IncrementalLearningEngine`, `LearningAdaptationEngine`, `LearningLoopEngine` … |
| `cadDispatcher` | 10 | `FCFSyntaxValidatorEngine`, `FixtureCadIngesterEngine`, `GDTCalloutParserEngine` … |
| `edmDispatcher` | 8 | `WEDMAccessibilityEngine`, `WEDMActiveQueryEngine`, `WEDMAnalogicalReasoningEngine` … |
| `calcDispatcher` | 7 | `BanditParameterOptimizerEngine`, `ChatterNeuralClassifierEngine`, `FaceDriverTorqueEngine` … |
| `devDispatcher` | 6 | `AIAutoUtilizationEngine`, `AICapabilityMaximizerEngine`, `AISystemSynchronizerEngine` … |
| `agentDispatcher` | 6 | `AgentMemoryFabricEngine`, `AgenticLoopEngine`, `CapabilityIndexEngine` … |

---

## APPENDIX A — Methodology

1. **Untracked file list:** `git status --porcelain | grep '^??'` — 7322 entries.
2. **mtime clusters:** Files sorted by mtime, clustered when consecutive mtimes are <300s apart.
3. **Engine wiring (real method):** Grep all dispatcher source files (`mcp-server/src/tools/dispatchers/*.ts`) for the pattern `engines/<EngineName>` (matches both static `import { x } from "engines/X.js"` and dynamic `await import("engines/X.js")`). Engine basename intersected with untracked engine basenames → wired set.
4. **Test pairing:** Test basename (minus `.test/.spec.ts` and `.dispatcher`/`.e2e` suffixes) checked against (a) untracked engine basenames and (b) dispatcher-known engine basenames (proxy for "tracked engines exist").
5. **Milestone in-index:** Inferred milestone-id (uppercased basename minus date/version suffix) compared against `roadmap-index.json` strings recursively (heuristic).
6. **Chat-bus author correlation:** `AGENT_CHAT.md` lines parsed for ISO-8601 timestamps + slot tokens (alpha/bravo/charlie/delta/echo/foxtrot) + `claude-XXXX` IDs. Cluster gets `suspectedAuthor` if a slot is found in chat entries within ±300s of cluster's mtime range.

## APPENDIX B — Inputs

- `state/shared/system-viz/system-graph.json` — 22.3MB, 19965 nodes, 75548 edges, regen 2026-05-12T17:53:57.314Z
- `state/shared/BUILD_STATE.json` — 10 keys
- `state/shared/AGENT_CHAT.md` — 49KB, 40 parsed entries
- `mcp-server/data/roadmap-index.json` — 12 top-level keys
- `mcp-server/src/tools/dispatchers/*.ts` — 96 dispatcher source files, 5002 engine import references

## APPENDIX C — Caveats

- **Stat-error files (5)** were excluded — paths git printed quoted due to special chars (whitespace, quotes). Triage manually with `git status --porcelain | grep '^??' | grep '^"'`.
- **Graph staleness:** 2026-05-12T17:53:57.314Z — engines created after that date show "true orphan" by graph node lookup. Real wiring data here is from grepping live dispatcher source, so it sidesteps that staleness.
- **Author attribution is heuristic.** Chat-bus correlation is suggestive, not authoritative — confirm via per-worktree check before committing peer files.
- **Per memory rules:** never `git stash` in this shared tree, never delete or move files. All decisions in this report respect that.
- **Conflict-fork rule:** if commit-ownership-guard blocks any of these batches, fork to a sibling worktree (`git worktree add`) and retry there rather than fighting for the main tree.
