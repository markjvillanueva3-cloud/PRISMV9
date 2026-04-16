# Claude/Codex MCP Full Utilization Directive

## Status

Active until the user explicitly replaces this directive.

## Purpose

This is the single canonical reference for how both Claude and Codex access and utilize the full
power of the PRISM MCP server. If either agent is unsure how to accomplish a task in PRISM, this
file is the first place to look.

PRISM MCP server: **79 dispatchers, 3,898+ actions, 1,302 active engines, 35 helper scripts**.

---

## 1. MCP Dev Surface -- Actions Both Agents MUST Use

The `prism_dev` dispatcher exposes 35 actions. Use these instead of ad-hoc shell commands.

**Invocation pattern (MCP):**
```
Tool: prism_dev
Args: { action: "<action_name>", params: { ... } }
```

### Session Lifecycle

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `session_boot` | Initialize session context, recover state, reap stale claims, register instance | Every `/startup` or session reconnect |
| `build` | Run TypeScript build (`tsc --noEmit` or full `npm run build`) | After any engine, dispatcher, or schema edit |
| `server_info` | Get server metadata (registered tools, dispatcher files) | Diagnostics, verification after registration changes |

### Testing

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `test_smoke` | Run smoke tests across all dispatchers | After any code change -- catches registration failures |
| `test_results` | Get test pass/fail from last smoke run or a specific run ID | After `test_smoke` completes -- check results without re-running |

### SVI (System Variability Index)

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `svi_compute` | Recompute SVI from live filesystem scan + drift detection | After adding engines, dispatchers, schemas, or tests |
| `svi_read` | Read current SVI snapshot (auto-refreshes if stale) | During `/startup`, before audits, after major work slices |
| `svi_summary` | Get SVI as a single-line string | Quick status checks, coordination posts |

### Quality Scoring

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `quality_score` | Score engine quality across W (wiring), T (test), P (physics) dimensions | After engine creation, during reviews |
| `quality_score_read` | Read cached quality scores without recomputing | Status checks, session start |
| `quality_score_summary` | Get quality score as a single-line string | Quick checks, coordination posts |

### Quality Dashboard

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `quality_dashboard` | Compute full quality snapshot (Q, Psi, accuracy, gaps) | Every `/compact` and `/startup` -- the single source of truth |
| `quality_dashboard_read` | Read cached dashboard without recomputing | Between compacts, status checks |
| `quality_dashboard_summary` | Get dashboard as a single-line string | Quick checks, coordination messages |

### Auto-Wiring

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `auto_wiring_scan` | Find all unwired engines (missing dispatcher, schema, test, index) | Before dispatcher work, during audits |
| `auto_wiring_analyze` | Analyze a specific engine file for wiring gaps + generate fix artifacts | When creating or reviewing a specific engine |

### Gap Scanning

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `schema_gap_scan` | Find engines without Zod schemas | Before schema work, during quality sweeps |
| `test_gap_scan` | Find engines without test files | Before test work, during quality sweeps |
| `engine_overlap_scan` | Find duplicate/overlapping engines by name similarity | Before creating any new engine -- prevents duplicates |

### Formula Validation

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `formula_accuracy` | Validate physics formulas against reference datasets | After physics edits, Kienzle/Taylor changes |
| `formula_accuracy_read` | Read cached accuracy results | During reviews |
| `formula_accuracy_summary` | Get accuracy as a single-line string | Quick checks |

### Self-Improvement

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `self_improvement_scan` | Detect improvement patterns from session state + error logs | During audits, session start |
| `self_improvement_read` | Read cached improvement patterns | Before planning work |
| `self_improvement_summary` | Get patterns as a single-line string | Quick checks |

### Auto-Fix Pipeline

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `auto_fix_generate` | Generate auto-fix candidates from detected issues | During quality sweeps |
| `auto_fix_read` | Read cached fix candidates | Review what was found |
| `auto_fix_summary` | Get fix pipeline as a single-line string | Quick checks |
| `auto_fix_approve` | Approve a specific fix candidate (`params: { fix_id: "..." }`) | After reviewing a fix |
| `auto_fix_promote` | Promote an approved fix to production (`params: { fix_id: "..." }`) | When fix is validated and approved |

### ERP & Overlap

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `erp_persistence_health` | Check BusinessStore persistence mode (memory vs PostgreSQL) | After DB changes, ERP work |
| `engine_overlap_scan` | Find duplicate engines (optionally check a specific candidate name) | Before engine creation (`params: { candidate_name: "..." }`) |

### Code Operations

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `code_search` | Search codebase via regex (`params: { pattern, scope, max_results }`) | Instead of raw Grep/Glob when MCP context is preferred |
| `code_template` | Generate code from named template (`params: { template: "..." }`) | Engine/dispatcher creation scaffolding |
| `file_read` | Read a file relative to MCP_ROOT (`params: { path, start_line, max_lines }`) | When MCP-relative paths are more convenient |
| `file_write` | Write file content (`params: { path, content }`) | When MCP-relative paths are more convenient |

---

## 2. Knowledge Sources -- What to Consult

These are the primary data sources accessible through the MCP server. Use dispatchers instead of
reading raw files when possible.

### Materials (2,957+ entries)
- **Access**: `prism_calc` dispatcher, `material_get` / `material_search` / `material_lookup` actions
- **Engine**: `MaterialRegistry` in `src/registries/`
- **Data**: ISO P/M/K/N/S/H groups with Kienzle kc1.1, hardness, density, thermal properties
- **Canonical constants**: `src/physics/constants.ts` -- NEVER inline, always import

### Tools (95,608 entries)
- **Access**: `prism_calc` dispatcher, `tool_lookup` / `tool_search` actions
- **Engine**: `ToolRegistry` in `src/registries/`
- **Data**: Geometry (diameter, flute count, helix angle, corner radius), coatings, substrates

### Machines (910 entries)
- **Access**: `prism_machine_setup` dispatcher, `machine_lookup` / `machine_search` actions
- **Engine**: `MachineRegistry` in `src/registries/`
- **Data**: Kinematics, spindle power/torque curves, travel limits, controller type
- **Torque curves**: `src/data/machine-torque-curves.ts` (canonical spindle performance data)

### Tribal Knowledge (3,700+ tips)
- **Engine**: `TribalKnowledgeEngine` in `src/engines/`
- **GAP**: No dispatcher wiring yet -- tips are accessible only via direct engine import
- **Data**: 20 CAM systems, operator tips, process rules, proven solutions
- **Captured tips**: `mcp-server/state/tribal_captured_tips.json`

### Machine Handbooks (15 handbooks)
- **Engine**: `MachineHandbookRegistryEngine` in `src/engines/`
- **GAP**: No HTTP routes yet -- handbooks not accessible via REST API
- **Data**: `mcp-server/data/machine-handbooks/` -- per-machine operational intelligence

### Formulas (499 registered)
- **Access**: `prism_calc` dispatcher, `formula_lookup` / `formula_validate` actions
- **Engine**: `FormulaRegistry` in `src/registries/`
- **Data**: Kienzle, Taylor, chip thinning, surface finish, deflection, thermal models

### Algorithms (208 total across all trees)
- **Location**: `src/algorithms/` (51 in active MCP tree)
- **Cross-tree**: 157 additional algorithms in worktree/branch artifacts
- **Key algorithms**: Kienzle force, SLD generation, Monte Carlo UQ, Bayesian optimization, RK4 ODE

### Toolpath Strategies (762 strategies)
- **Access**: `prism_cam` dispatcher
- **Engine**: `ToolpathStrategyRegistry` in `src/registries/`
- **Data**: 18 CAM systems (Fusion 360, hyperMILL, Mastercam, etc.)

### Video Learning (77 transcripts)
- **Access**: `prism_document_learning` dispatcher, `video_search` / `video_learn` actions
- **Engine**: `VideoLearningEngine` in `src/engines/`
- **Data**: `mcp-server/data/video-learned/transcripts/`

### Cross-Tree Engine Inventory
- **File**: `H:/prism/audits/cross_tree_reference_inventory.json`
- **Totals**: 2,351 engines, 208 algorithms, 79 dispatchers across all trees
- **Rule**: ALWAYS check this before creating new engines or concluding an audit

---

## 3. Automatic Behaviors -- What Fires Without Asking

### Claude Session Hooks

**On SessionStart:**
| Hook | Effect |
|------|--------|
| `position-sync.mjs` | Refreshes `CURRENT_POSITION.md` from roadmap state |
| `svi-refresh.mjs` | Refreshes `SVI.json` + `SVI-compact.md` |
| `agent-coordination.mjs` | Polls for messages from other agents |
| `sync-memory.mjs` | Syncs `MEMORY.md` with latest shared memory entries |
| `session-breadcrumb.mjs` | Records session start breadcrumb for recovery |
| `session-start-compact.mjs` | Checks if auto-compaction is needed |

**On PreCompact:**
| Hook | Effect |
|------|--------|
| `position-sync.mjs` | Updates position before context loss |
| `svi-refresh.mjs` | Updates SVI before context loss |
| `coordination-sync.mjs` | Syncs to `AGENT_CHAT` + `WORKBOARD` + `ROADMAP_COLLABORATION_STATE` |
| `per-agent-handoff.mjs` | Writes per-agent handoff for recovery |
| `compaction-survival.mjs` | Captures critical facts that must survive compaction |
| `session-summary.mjs` | Writes session summary to shared state |

**On PostToolUse:**
| Hook | Effect |
|------|--------|
| `posttooluse-compressor.mjs` | Compresses verbose tool outputs to save context |
| `read-tracker.mjs` | Tracks file reads to avoid redundant re-reads |
| `stop-guard.mjs` | Detects infinite loops and stalled patterns |
| `loop-detector.mjs` | Catches repetitive command patterns |

### Codex Should Mirror

Run these equivalent commands at session start and before major transitions:

```bash
# Session start
node H:/prism/.claude/helpers/position-sync.mjs
node H:/prism/.claude/helpers/svi-refresh.mjs
node H:/prism/.claude/helpers/sync-memory.mjs
node H:/prism/.claude/helpers/agent-coordination.mjs post \
  --agent Codex --status ready \
  --current "starting session" --next "checking task queue"

# Before major transition / compaction
node H:/prism/.claude/helpers/position-sync.mjs
node H:/prism/.claude/helpers/svi-refresh.mjs
node H:/prism/.claude/helpers/coordination-sync.mjs
node H:/prism/.claude/helpers/roadmap-sync.mjs sync \
  --agent Codex --status active \
  --current "current work" --next "planned next"
```

### Helper Scripts Reference (35 scripts)

| Script | Purpose | Used By |
|--------|---------|---------|
| `agent-coordination-daemon.mjs` | Background coordination watcher | Both (start once) |
| `agent-coordination.mjs` | Post/read coordination messages | Both |
| `agent-identity.mjs` | Detect agent family + instance | Both (auto) |
| `auto-route.mjs` | Route queries to optimal handler | Claude hooks |
| `cache-writer.mjs` | Write hook/query cache entries | Claude hooks |
| `compact-restore.mjs` | Restore state after compaction | Claude hooks |
| `compaction-survival.mjs` | Capture facts that survive compaction | Claude PreCompact |
| `coordination-sync.mjs` | Sync all coordination surfaces | Both PreCompact |
| `error-recovery.mjs` | Recover from errors gracefully | Claude hooks |
| `hook-cache.mjs` | Cache hook results for reuse | Claude hooks |
| `idle-reminder.mjs` | Remind agent when idle too long | Claude hooks |
| `learning-service.mjs` | Process learning events | Both |
| `loop-detector.mjs` | Detect repetitive patterns | Claude hooks |
| `metrics-db.mjs` | Record metrics to persistent store | Both |
| `per-agent-handoff.mjs` | Write per-agent handoff state | Both PreCompact |
| `position-sync.mjs` | Refresh CURRENT_POSITION.md | Both SessionStart |
| `posttooluse-compressor.mjs` | Compress verbose tool output | Claude PostToolUse |
| `pre-compact.mjs` | Pre-compaction orchestration | Claude PreCompact |
| `read-optimizer.mjs` | Optimize file read patterns | Claude hooks |
| `read-tracker.mjs` | Track files already read | Claude hooks |
| `roadmap-sync.mjs` | Sync roadmap collaboration state | Both |
| `rps-arbitration.mjs` | Rock-paper-scissors conflict resolution | Both (rare) |
| `search-optimizer.mjs` | Optimize search patterns | Claude hooks |
| `session-breadcrumb.mjs` | Record session start for recovery | Claude SessionStart |
| `session-start-compact.mjs` | Check if auto-compaction needed | Claude SessionStart |
| `session-summary.mjs` | Write session summary | Claude PreCompact |
| `smart-recovery.mjs` | Smart state recovery | Claude hooks |
| `stop-guard.mjs` | Detect stalled/looping behavior | Claude PostToolUse |
| `subagent-context.mjs` | Inject context into subagents | Claude SubagentStart |
| `subagent-results.mjs` | Collect subagent results | Claude SubagentEnd |
| `svi-refresh.mjs` | Refresh SVI.json + SVI-compact.md | Both SessionStart |
| `sync-memory.mjs` | Sync MEMORY.md with shared state | Both SessionStart |
| `task-context-injector.mjs` | Inject task context into prompts | Claude hooks |
| `task-queue.mjs` | Task queue operations (next, claim, complete, heartbeat) | Both |
| `web-cache.mjs` | Cache web/API responses | Claude hooks |

---

## 4. Shared Coordination -- Read/Write Pattern

### Always Read Before Work

Read these surfaces in this order before starting any meaningful work:

1. **`AGENT_CHAT.md`** -- What has the other agent done recently?
2. **`AGENT_WORKBOARD.md`** -- What is the other agent currently working on?
3. **`TASK_QUEUE.md`** -- What tasks are available, blocked, or claimed?
4. **`ROADMAP_COLLABORATION_STATE.md`** -- What is the gate status? Who owns what?

### Always Write After Work

After completing a meaningful slice of work:

1. **Post to AGENT_CHAT** -- what you did, what is next
   ```bash
   node H:/prism/.claude/helpers/agent-coordination.mjs post \
     --message "done: wired FooEngine to calcDispatcher | next: test_gap_scan | status: ready"
   ```

2. **Complete task** (if working from queue)
   ```bash
   node H:/prism/.claude/helpers/task-queue.mjs complete --task TASK-ID
   ```

3. **Sync roadmap** (if gate-affecting work)
   ```bash
   node H:/prism/.claude/helpers/roadmap-sync.mjs sync \
     --agent [Claude|Codex] --status active \
     --current "completed X" --next "starting Y"
   ```

### Coordination Surface Locations

| Surface | JSON (machine) | MD (human) |
|---------|----------------|------------|
| Agent Chat | `AGENT_CHAT.jsonl` | `AGENT_CHAT.md` |
| Workboard | `AGENT_WORKBOARD.json` | `AGENT_WORKBOARD.md` |
| Coordination Status | `AGENT_COORDINATION_STATUS.json` | `AGENT_COORDINATION_STATUS.md` |
| Task Queue | `TASK_QUEUE.json` | `TASK_QUEUE.md` |
| Roadmap Collaboration | `ROADMAP_COLLABORATION_STATE.json` | `ROADMAP_COLLABORATION_STATE.md` |
| File Locks | `FILE_LOCKS.json` | -- |
| SVI Watch | `SVI-watch-status.json` | `SVI-watch-status.md` |
| SVI Snapshot | `SVI.json` | `SVI-compact.md` |

All surfaces are in `H:/prism/state/shared/`.

---

## 5. Task Queue Protocol

### Check and Claim

```bash
# Check next available task for your agent family
node H:/prism/.claude/helpers/task-queue.mjs next --agent-family [Claude|Codex]

# Claim a task
node H:/prism/.claude/helpers/task-queue.mjs claim --task [TASK-ID] --agent-family [Claude|Codex]

# Start working on a claimed task
node H:/prism/.claude/helpers/task-queue.mjs start --task [TASK-ID]
```

### During Work

```bash
# Heartbeat (send periodically during long work)
node H:/prism/.claude/helpers/task-queue.mjs heartbeat --task [TASK-ID]

# Release if you cannot continue
node H:/prism/.claude/helpers/task-queue.mjs release --task [TASK-ID]
```

### Complete or Hand Off

```bash
# Complete a task
node H:/prism/.claude/helpers/task-queue.mjs complete --task [TASK-ID] --agent-family [Claude|Codex]

# Reap stale claims (on startup)
node H:/prism/.claude/helpers/task-queue.mjs reap
```

### Ownership Rules

- **Claude** owns backend-first tasks (engines, dispatchers, physics, registries, algorithms)
- **Codex** owns frontend-first tasks (pages, components, routes, styling, UX)
- **`any`** tasks may be claimed by either family
- Never claim another family's task to work around a blocked queue

### Compaction Rule

Before compaction, always:
1. Refresh heartbeat for any claimed task
2. Include the task ID in handoff/resume notes

---

## 6. Cross-Tree Reference Rule

Before any audit, engine creation, or system-wide conclusion, ALWAYS check:

```
H:/prism/audits/cross_tree_reference_inventory.json
```

### Totals (as of 2026-03-29)

| Category | Active MCP | Other Trees | Total |
|----------|-----------|-------------|-------|
| Engines | 1,302 | 1,049 | 2,351 |
| Algorithms | 51 | 157 | 208 |
| Dispatchers | 79 | 0 | 79 |

### Why This Matters

- **1,049 engines exist outside the active MCP tree** in worktrees, branches, and archives
- Creating a "new" engine without checking the inventory risks duplicating existing work
- Audit conclusions about "missing" capabilities may be wrong if the capability exists in another tree
- Always search the inventory by keyword before concluding something does not exist

### Practical Rule

```
BEFORE creating any engine:
1. Run: prism_dev { action: "engine_overlap_scan", params: { candidate_name: "ProposedEngine" } }
2. Search cross-tree inventory for similar names
3. Only create if both return clean
```

---

## 7. Index Surfaces -- Token-Efficient Navigation

Both agents should prefer these indexed surfaces BEFORE using Grep, Glob, or broad filesystem
searches. They provide the same information at a fraction of the token cost.

### Priority Order

1. **MASTER_INDEX_COMPACT.md** (~735 tokens) -- full system map for broad orientation
2. **ENGINE_DIGEST.md** -- all 1,302 engines with 1-line descriptions
3. **DISPATCHER_DIGEST.md** -- all 79 dispatchers with action counts
4. **DIRECTORY_DIGEST.md** -- 215 directories with purposes and domain routing
5. **CODE_SYSTEM_INDEX.json** -- 1,814 shortcodes, resolve with `/code-index E0001`
6. **PATH_INDEX.md** -- path-oriented lookup for locating files
7. **ROADMAP_SECTION_INDEX.md** -- roadmap section navigation

All index surfaces are in `H:/prism/mcp-server/data/docs/`.

### Navigation Commands

| Command | Effect | Token Cost |
|---------|--------|------------|
| `/navigate <topic>` | Zero-IO file routing to relevant source | ~50 tokens |
| `/code-index <shortcode>` | Resolve E0001 to file path | ~20 tokens |
| `/digest-all` | Load complete system map | ~1,100 tokens |
| `prism_dev:code_search` | Search codebase via MCP | Variable |

---

## 8. Dispatcher Landscape -- 79 Dispatchers by Domain

### Manufacturing Core

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| calcDispatcher | `prism_calc` | 1,130+ | Materials, tools, speed/feed, physics |
| camDispatcher | `prism_cam` | ~50 | CAM integration, toolpath strategies |
| toolpathDispatcher | `prism_toolpath` | ~30 | Toolpath simulation, optimization |
| turningDispatcher | `prism_turning` | ~25 | Turning-specific operations |
| grindingDispatcher | `prism_grinding` | ~20 | Grinding operations |
| edmDispatcher | `prism_edm` | ~20 | EDM operations |
| fiveAxisDispatcher | `prism_five_axis` | ~15 | 5-axis operations |
| threadDispatcher | `prism_thread` | ~15 | Threading operations |
| secondaryOpsDispatcher | `prism_secondary_ops` | ~20 | Heat treat, plating, anodize |

### Machine & Setup

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| machineSetupDispatcher | `prism_machine_setup` | ~40 | Machine lookup, setup sheets |
| machineLiveDispatcher | `prism_machine_live` | ~40 | Live machine monitoring |
| cncOpsDispatcher | `prism_cnc_ops` | ~25 | CNC operation management |

### Business & ERP

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| businessDispatcher | `prism_business` | ~42 | Quoting, costing, scheduling, ERP |
| integrationDispatcher | `prism_integration` | ~42 | External system integrations |
| operatingSystemDispatcher | `prism_operating_system` | ~30 | Shell bootstrap, job desk, scheduling |

### Intelligence & Knowledge

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| intelligenceDispatcher | `prism_intelligence` | ~50 | Core intelligence operations |
| knowledgeDispatcher | `prism_knowledge` | ~20 | Knowledge base access |
| knowledgeExtDispatcher | `prism_knowledge_ext` | ~40 | Extended knowledge operations |
| diagnosisDispatcher | `prism_diagnosis` | ~38 | Alarm diagnosis, troubleshooting |
| documentLearningDispatcher | `prism_document_learning` | ~15 | Video learning, document processing |

### Quality & Safety

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| safetyDispatcher | `prism_safety` | ~20 | Safety validation, limit checks |
| qualityDispatcher | `prism_quality` | ~15 | Quality management |
| validationDispatcher | `prism_validate` | ~15 | Input/output validation |
| guardDispatcher | `prism_guard` | ~10 | Safety guard checks |

### Development

| Dispatcher | Tool Name | Actions | Domain |
|-----------|-----------|---------|--------|
| devDispatcher | `prism_dev` | 35 | Build, test, SVI, quality, auto-wiring |
| spDispatcher | `prism_sp` | ~10 | Shop practice management |
| hookDispatcher | `prism_hook` | ~10 | Hook management |
| generatorDispatcher | `prism_generator` | ~10 | Code generation |

### Additional Dispatchers

There are 79 total dispatchers. The remaining ~30 cover specialized domains:
- `adaptiveControlDispatcher`, `atcsDispatcher`, `authDispatcher`, `autoPilotDispatcher`
- `automationDispatcher`, `autonomousDispatcher`, `bridgeDispatcher`, `cadDispatcher`
- `cadDrawingKnowledgeDispatcher`, `complianceDispatcher`, `contextDispatcher`
- `cplDispatcher`, `dataDispatcher`, `exportDispatcher`, `feasibilityDispatcher`
- `fluidThermalDispatcher`, `formingCastingDispatcher`, `gsdDispatcher`
- `holePatternDispatcher`, `industryDispatcher`, `l2EngineDispatcher`
- `machiningKnowledgeBaseDispatcher`, `manusDispatcher`, `materialProcessingDispatcher`
- `mechanicalDesignDispatcher`, `memoryDispatcher`, `monitoringDispatcher`
- `multiAxisProgramDispatcher`, `multiOpDispatcher`, `nlHookDispatcher`
- `omegaDispatcher`, `orchestrationDispatcher`, `partsLibraryDispatcher`
- `pfpDispatcher`, `processControlDispatcher`, `productDispatcher`
- `provenPipelineDispatcher`, `ralphDispatcher`, `realtimeDispatcher`
- `schedulingDispatcher`, `scientificMathDispatcher`, `sessionDispatcher`
- `skillScriptDispatcher`, `telemetryDispatcher`, `tenantDispatcher`
- `threadingPipelineDispatcher`, `turningProgramDispatcher`
- `vibrationPhysicsDispatcher`, `weldingJoiningDispatcher`

Full details: `H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md`

---

## 9. Gaps To Close (Both Agents)

These are the critical gaps that prevent full MCP utilization. Both agents should treat these as
standing work items.

### GAP-1: MASTER_INDEX.json Not Generated Automatically

**Problem**: `MasterIndexGenerator` engine exists but is never called on build. The
`MASTER_INDEX.json` is manually generated and goes stale.

**Impact**: Agents cannot get a machine-readable live system inventory.

**Fix**: Add a post-build hook or `prism_dev` action that calls `MasterIndexGenerator.generate()`
and writes `data/docs/MASTER_INDEX.json`. Wire it to the `build` action as a post-step.

### GAP-2: TribalKnowledgeEngine Has No Dispatcher

**Problem**: 3,700+ tribal tips exist in the engine but there is no dispatcher action to query them.

**Impact**: Tips are only accessible via direct engine import -- not through MCP tool calls.

**Fix**: Add `tribal_knowledge_search`, `tribal_knowledge_get`, `tribal_knowledge_capture` actions
to an appropriate dispatcher (`shopPracticeDispatcher` or `knowledgeDispatcher`).

### GAP-3: MachineHandbookRegistry Has No HTTP Routes

**Problem**: 15 machine handbooks with operational intelligence exist in the registry engine but
are not exposed through any Express route.

**Impact**: Handbooks are inaccessible via REST API -- only usable through direct import.

**Fix**: Create routes in `src/routes/` and wire the `MachineHandbookRegistryEngine` to serve
handbook data. Also wire to a dispatcher for MCP access.

### GAP-4: Unwired Engines Ledger Is Empty

**Problem**: `state/unwired-engines-ledger.json` exists as a tracking file but contains no data.

**Impact**: No visibility into the estimated 1,100+ engines that are built but not wired to any
dispatcher, making it impossible to know what capabilities are latent.

**Fix**: Run `prism_dev:auto_wiring_scan` and persist results to the ledger. Add a hook or cron
that refreshes it after engine edits.

### GAP-5: Unregistered Dispatchers

**Problem**: 7+ dispatcher files exist on disk in `src/tools/dispatchers/` but are not imported
and registered in `src/tools/dispatchers/index.ts` or `src/index.ts`.

**Impact**: These dispatchers exist but are invisible to the MCP server at runtime.

**Fix**: Audit `index.ts` against the filesystem, add missing `import` + `register` calls.
Run `test_smoke` after to verify registration.

### GAP-6: Cross-Tree Engine Deduplication

**Problem**: 2,351 engines exist across all trees, but no automated deduplication check runs
during engine creation.

**Impact**: Duplicate engines get created in different branches/worktrees without awareness.

**Fix**: The `engine_overlap_scan` action exists but is not called automatically. Add it as a
pre-creation gate in the engine creation workflow (e.g., in `forge-engines` skill).

### GAP-7: Quality Dashboard Not Auto-Computed

**Problem**: The quality dashboard must be manually triggered via `quality_dashboard` action.

**Impact**: Quality metrics go stale between manual checks.

**Fix**: Add a post-build hook that runs `quality_dashboard` after successful builds. Persist
results so `quality_dashboard_read` always has recent data.

---

## 10. Preferred Workflow -- How Both Agents Should Operate

### Session Start (Both Agents)

```
1. Read this directive
2. Read HANDOFF.md for resume context
3. Run: prism_dev:session_boot
4. Run: prism_dev:svi_read
5. Run: prism_dev:quality_dashboard_read
6. Read coordination surfaces (AGENT_CHAT, WORKBOARD, TASK_QUEUE)
7. Claim next task from queue
8. Begin work
```

### Before Any Engine Creation

```
1. Search ENGINE_DIGEST.md for existing engines
2. Run: prism_dev:engine_overlap_scan { candidate_name: "ProposedName" }
3. Check cross_tree_reference_inventory.json
4. Only create if all three return clean
```

### After Any Code Change

```
1. Run: prism_dev:build
2. Run: prism_dev:test_smoke (or targeted vitest)
3. Run: prism_dev:svi_compute (if structural change)
4. Run: prism_dev:quality_score { engine_name: "..." } (if engine change)
```

### Before Compaction

```
1. Run: prism_dev:quality_dashboard
2. Post coordination update via agent-coordination.mjs
3. Heartbeat any claimed tasks
4. Write handoff with resume instructions
```

### During Audits

```
1. Run: prism_dev:auto_wiring_scan
2. Run: prism_dev:schema_gap_scan
3. Run: prism_dev:test_gap_scan
4. Run: prism_dev:self_improvement_scan
5. Run: prism_dev:formula_accuracy (if physics-related)
6. Check cross_tree_reference_inventory.json for completeness
```

---

## 11. Related Directives

This directive complements but does not replace:

| Directive | Purpose |
|-----------|---------|
| `CLAUDE-CODEX-COORDINATION-DIRECTIVE.md` | Agent coordination rules and chat protocol |
| `CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md` | Task queue ownership and sequencing rules |
| `CLAUDE-CODEX-SVI-DIRECTIVE.md` | SVI and Psi standing metric rules |
| `CLAUDE-CODEX-SPAWNED-AGENT-DIRECTIVE.md` | Spawned agent context inheritance |
| `CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md` | Roadmap sync and convergence fields |
| `CLAUDE-CODEX-SEARCH-TOKEN-DIRECTIVE.md` | Index-first search and token economy |
| `CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md` | Finish-first roadmap sequencing |
| `CLAUDE-CODEX-COMMAND-BRIDGE.md` | Slash-command mirroring and hook pipelines |
| `CLAUDE-CODEX-MCP-DEVELOPMENT-DIRECTIVE.md` | MCP server development capabilities |

All directives are in `H:/prism/state/shared/`.

---

## 12. Quick Reference Card

```
SESSION START:   prism_dev:session_boot -> svi_read -> quality_dashboard_read
AFTER EDIT:      prism_dev:build -> test_smoke -> svi_compute
QUALITY CHECK:   prism_dev:quality_dashboard -> auto_wiring_scan -> test_gap_scan
BEFORE CREATE:   prism_dev:engine_overlap_scan + cross_tree_inventory check
BEFORE COMPACT:  prism_dev:quality_dashboard + coordination post + task heartbeat
COORDINATION:    agent-coordination.mjs post -> task-queue.mjs [next|claim|complete]
SVI:             prism_dev:svi_read (quick) | svi_compute (full refresh)
FORMULAS:        prism_dev:formula_accuracy (compute) | formula_accuracy_read (cached)
AUTO-FIX:        prism_dev:auto_fix_generate -> auto_fix_approve -> auto_fix_promote
NAVIGATION:      /navigate <topic> | /code-index <shortcode> | /digest-all
```
