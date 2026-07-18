# INT Track — Full System Integration & Synchronization
# RGS Pipeline v10 — Generated 2026-04-06

## BRIEF ANALYSIS (Stage 1)
**Domain:** Infrastructure / System Integration
**Complexity:** XL (33 units, ~11 sessions)
**Machine Types:** N/A (dev infrastructure)
**Dependencies:** ACP-MS0→MS7 COMPLETE, MXU-MS0A→MS10 COMPLETE
**Source Audit:** FULL_SYSTEM_AUDIT_2026-04-06.md (7-agent + 6 MCP scanner)

## CODEBASE AUDIT (Stage 2)
**Existing assets that MUST NOT be rebuilt:**
- AutomationChainEngine (ACP-MS0A) — 9-class task classifier ✓
- BuildGuardChainEngine (ACP-MS2) — pre-edit safety, test resolution ✓
- ChainFailureRecoveryEngine (ACP-MS2B) — retry, degradation ✓
- ContextChainEngine (ACP-MS3) — bundle loading, pressure, compaction ✓
- SpeedFeedAutopilotEngine (ACP-MS4) — material→tool→machine→S/F ✓
- PostProcessorAutopilotEngine (ACP-MS5) — 20 dialects, print-to-program ✓
- QuoteAutopilotEngine (ACP-MS6) — DFM→cost→qty breaks ✓
- UtilizationContractEngine (MXU-MS0A) — engine capability mapping ✓
- CapabilityCensusEngine (MXU-MS0) — live file system census ✓
- CodingCopilotEngine (MXU-MS1) — reuse suggestion, dedup ✓
- TokenEconomyEngine (MXU-MS2) — budget, waste, compression ✓
- PersistentMemoryEngine (MXU-MS3) — cross-session learning ✓
- CapabilityPathEngine (MXU-MS4) — learning paths ✓
- WorkflowOrchestrationEngine (MXU-MS5) — multi-agent coordination ✓
- ProductPillarEngine (MXU-MS6) — 8 product pillars ✓
- DiscoverabilityEngine (MXU-MS7) — search, browse, recommend ✓
- CapabilityEffectivenessEngine (MXU-MS9+10) — validation, telemetry ✓

**57 dispatcher actions already exist in devDispatcher — WIRE to hooks/skills, don't rebuild.**

## KNOWLEDGE SOURCE MAPPING (Stage 3)
```
ENGINES (17 new + existing):
  All 17 ACP+MXU engines listed above
  enforce-smart-test-after-edit.py (71 lines) — hook to replace
  enforce-review-gate.py (60 lines) — hook to augment
  enforce-post-compact-continue.py — compaction hook
  
EXISTING HOOKS: portable-user-settings.json (400 lines, 40 hooks)
EXISTING SKILLS: skills-consolidated/ (260 dirs, 258 with SKILL.md)
EXISTING HELPERS: .claude/helpers/ (105 scripts: 64 .mjs, 39 .sh, 2 .ps1)

DOCUMENTS TO UPDATE:
  CLAUDE.md — project instructions (140 lines, counts stale)
  ENGINE_DIGEST.md — mcp-server/data/docs/ (1,307 entries, missing ~170)
  DISPATCHER_DIGEST.md — mcp-server/data/docs/ (stale by 6 days)
  MASTER_INDEX_COMPACT.md — mcp-server/data/docs/
  MEMORY.md — .claude/projects/H--prism/memory/ (46 lines)
  CURRENT_POSITION.md — state/ (engine count wrong)
  AUTOMATION_CENSUS.json — data/state/ (partially updated)
  
REFERENCE:
  FULL_SYSTEM_AUDIT_2026-04-06.md — the source of truth for all gaps
  portable-user-settings.json — hook configuration
  src/engines/index.ts — barrel exports (440 orphaned)
```

## SCOPE ESTIMATION (Stage 4)
- **Complexity:** XL
- **Total Units:** 36
- **Sessions:** 12 (3 units per session, /compact after each)
- **4-LOOP overhead:** ~15 min per unit
- **Estimated total execution:** 12 sessions × ~45 min = ~9 hours

## ENFORCEMENT HOOKS ACTIVE (Stage 8 — documented early)
```
PRE-LEVEL:
  - enforce-knowledge-consult.py (PreToolUse Write|Edit)
  - enforce-context-retention.py (PreToolUse Write|Edit)
  - enforce-duplicate-check.py (PreToolUse Write|Edit)
POST-LEVEL:
  - enforce-smart-test-after-edit.py (PostToolUse Write|Edit)
  - enforce-unit-counter.py (PostToolUse Write|Edit)
  - enforce-stub-detector.py (PostToolUse Write|Edit)
COMPACT-LEVEL:
  - enforce-review-gate.py (PreCompact)
  - enforce-wiring-completeness.py (PreCompact)
  - enforce-precompact-audit.py (PreCompact)
POST-COMPACT:
  - auto-resume-injector.mjs (PostCompact)
  - SESSION_ARTIFACTS.json auto-written
```

---

## PHASE 1: Document & Index Sync (Critical Path)

### SESSION INT-S1: Digest Regeneration + CLAUDE.md Update (U-INT01..U-INT03)

```
SMART CONFIG: Role=System integrator + Documentation specialist
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE:
  - ENGINE_DIGEST.md (data/docs/ — 1,307 entries, missing ~170)
  - DISPATCHER_DIGEST.md (data/docs/ — 6 days stale)
  - CLAUDE.md (H:/prism/ — 140 lines, counts wrong)
  - MASTER_INDEX_COMPACT.md (data/docs/)
  - CapabilityCensusEngine.ts (live scanner)
INTENT: Every system document accurately reflects 1,477 engines, 81 dispatchers,
  3,745 actions. New sessions immediately discover ACP+MXU engines via digests.
SKILLS: /digest-all, /counts, /navigate
MCP ACTIONS: prism_dev:resource_census, prism_dev:capability_census_report
```

**U-INT01: Regenerate ENGINE_DIGEST.md**
  → Scan all 1,477 engine files, add 1-line description per engine
  → Include domain classification and wiring status
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [mcp-server/data/docs/ENGINE_DIGEST.md]
  ABORT_CRITERIA:
    1. Digest has fewer entries than actual engine files
    2. Any engine file missing from digest
    3. Descriptions are generic/placeholder
  ROLLBACK: Restore ENGINE_DIGEST.md from prior version
  EXIT: Digest entry count == `ls src/engines/*.ts | wc -l`

**U-INT02: Regenerate DISPATCHER_DIGEST.md + update action counts**
  → Scan all 81 dispatchers, count actions per dispatcher
  → Include 57 new ACP+MXU actions under devDispatcher
  → Depends on: none
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [mcp-server/data/docs/DISPATCHER_DIGEST.md]
  ABORT_CRITERIA:
    1. Total action count < 3,700
    2. devDispatcher action count doesn't include ACP+MXU
    3. Any active dispatcher missing from digest
  ROLLBACK: Restore DISPATCHER_DIGEST.md from prior version
  EXIT: Digest action totals match `grep -c` on all dispatchers

**U-INT03: Update CLAUDE.md + MASTER_INDEX_COMPACT.md + CURRENT_POSITION.md**
  → Fix engine count (1,304 → 1,477)
  → Fix dispatcher count, action count
  → Add ACP track (7 engines) and MXU track (10 engines) to "What's Built"
  → Add "Automation Chains" and "Product Pillars" sections
  → Update MASTER_INDEX with new counts
  → Update CURRENT_POSITION with accurate engine/action numbers
  → Depends on: U-INT01, U-INT02
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [H:/prism/CLAUDE.md, data/docs/MASTER_INDEX_COMPACT.md, state/CURRENT_POSITION.md]
  ABORT_CRITERIA:
    1. Any count in CLAUDE.md doesn't match live system
    2. ACP/MXU not mentioned in What's Built
    3. CURRENT_POSITION engine count still wrong
  ROLLBACK: Restore all three files from prior versions
  EXIT: `grep "1,477" CLAUDE.md` returns match; position file accurate

```
FORGE-TRIPLE for INT-S1:
  PROTECTIVE HOOK: enforce-digest-freshness.mjs → block if ENGINE_DIGEST older than 7 days
  MCP ACTION: prism_dev:capability_census_report → live census snapshot
  SKILL: /census → run CapabilityCensusEngine.runLiveReport()

EXIT GATE: ✓ All 3 digests regenerated | ✓ CLAUDE.md counts match live
  | ✓ CURRENT_POSITION accurate | omega_floor >= 0.85 | SVI delta: +0%

FEATURE CASCADE:
  NEW_HOOKS: [enforce-digest-freshness.mjs → blocks stale digests]
  NEW_ACTIONS: [none — census already wired]
  NEW_SKILLS: [/census → live capability report]
  AVAILABLE_TO: [INT-S2, INT-S3, all future sessions]
```

/compact checkpoint

---

### SESSION INT-S2: Index.ts Export Fix + Memory Sync (U-INT04..U-INT06)

```
SMART CONFIG: Role=System architect + State manager
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  - src/engines/index.ts (4,909 lines, 1,037 exports, 440 orphaned)
  - MEMORY.md (46 lines, missing ACP+MXU)
  - AUTOMATION_CENSUS.json (partially updated)
  - roadmap-index.json (v8.3.0, 439 milestones)
INTENT: All 1,477 engines importable. Memory reflects completed work.
  Roadmap index accurate. Census gap map current.
SKILLS: /status, /svi, /memory-prune
MCP ACTIONS: prism_dev:capability_census_save, prism_session:memory_save
```

**U-INT04: Fix index.ts — export all 440 orphaned engines**
  → Scan src/engines/*.ts for exports not in index.ts
  → Add missing re-exports in alphabetical order
  → Update header comment with accurate count
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [src/engines/index.ts]
  ABORT_CRITERIA:
    1. Any engine file not re-exported
    2. Build fails after changes (npx tsc --noEmit)
    3. Header count doesn't match actual exports
  ROLLBACK: Restore index.ts from prior version
  EXIT: `grep -c "export" src/engines/index.ts` matches engine file count

**U-INT05: Update MEMORY.md with ACP+MXU completion**
  → Add entries: ACP track complete (7 engines, 200 tests, 22 actions)
  → Add entries: MXU track complete (10 engines, 165 tests, 35 actions)
  → Record key decisions: product pillars, token economy, persistent memory
  → Keep under 200 lines
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [C:/Users/Mark Villanueva/.claude/projects/H--prism/memory/MEMORY.md]
  ABORT_CRITERIA:
    1. MEMORY.md exceeds 200 lines
    2. ACP/MXU completion not recorded
    3. Duplicate entries created
  ROLLBACK: Restore MEMORY.md backup
  EXIT: ACP+MXU entries present, line count < 200

**U-INT06: Refresh AUTOMATION_CENSUS.json + roadmap-index.json**
  → Run CapabilityCensusEngine.saveCensus() for live snapshot
  → Mark ACP-MS0→MS7 complete in roadmap-index
  → Mark MXU-MS0A→MS10 complete in roadmap-index
  → Register INT track in roadmap-index
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_MODIFIED: [data/state/AUTOMATION_CENSUS.json, data/roadmap-index.json]
  ABORT_CRITERIA:
    1. Census doesn't match live engine count
    2. ACP milestones still marked not_started
    3. Roadmap version not incremented
  ROLLBACK: Restore both files
  EXIT: Census matches live; ACP+MXU milestones marked complete

```
FORGE-TRIPLE for INT-S2:
  PROTECTIVE HOOK: enforce-index-completeness.mjs → warn if index.ts exports < engine count
  MCP ACTION: prism_dev:capability_census_save → persist census to disk
  SKILL: /discover → search capabilities via DiscoverabilityEngine

EXIT GATE: ✓ index.ts exports all engines | ✓ MEMORY.md updated
  | ✓ Census matches live | ✓ Roadmap index accurate
  | omega_floor >= 0.85 | SVI delta: +1%

FEATURE CASCADE:
  NEW_HOOKS: [enforce-index-completeness.mjs → export coverage]
  NEW_ACTIONS: [none — census_save already wired]
  NEW_SKILLS: [/discover → capability search]
  AVAILABLE_TO: [INT-S3+, all sessions]
```

/compact checkpoint

---

## PHASE 2: Hook Integration (Auto-Fire)

### SESSION INT-S3: Core Auto-Fire Hooks (U-INT07..U-INT09)

```
SMART CONFIG: Role=Hook engineer + Automation specialist
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  - portable-user-settings.json (400 lines, 40 Python hooks)
  - BuildGuardChainEngine.ts — trackEdit(), resolveAffectedTests()
  - ContextChainEngine.ts — planCompaction(), estimatePressure()
  - TokenEconomyEngine.ts — getBudget(), recordSpending(), detectWaste()
  - enforce-smart-test-after-edit.py (existing hook to replace)
INTENT: Every code edit auto-triggers build guard analysis. Every compaction
  auto-preserves critical facts. Token spending tracked per tool call.
SKILLS: /hook-status, /hook-browse
MCP ACTIONS: prism_dev:build_guard_chain, prism_dev:context_pressure
```

**U-INT07: Wire BuildGuardChainEngine into PostToolUse Write|Edit**
  → Create build-guard-hook.mjs that calls BuildGuardChainEngine.trackEdit()
  → After 3 edits: suggest affected tests
  → After 5 edits: require tests
  → After 12 edits: block until review
  → Replace/augment enforce-smart-test-after-edit.py
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/build-guard-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on Write|Edit
    2. Build guard doesn't track edit count
    3. Affected tests not resolved
  ROLLBACK: Remove hook from settings, delete .mjs file
  EXIT: Hook fires on edit; after 5 edits, test reminder appears

**U-INT08: Wire ContextChainEngine into PreCompact hook**
  → Create context-chain-hook.mjs
  → Call ContextChainEngine.planCompaction() with current pressure
  → Output critical_facts to HANDOFF.md via additionalContext
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/context-chain-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on PreCompact
    2. Critical facts not included in compaction context
    3. Pressure level not logged
  ROLLBACK: Remove hook entry, delete .mjs file
  EXIT: PreCompact includes context chain output

**U-INT09: Wire TokenEconomyEngine into PostToolUse tracking**
  → Create token-economy-hook.mjs
  → Track token spending category per tool call (Read, Write, Bash, Agent, etc.)
  → Detect waste patterns in real-time
  → Log to session state file
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/token-economy-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on PostToolUse
    2. Spending not categorized by tool type
    3. Session state file not written
  ROLLBACK: Remove hook entry, delete .mjs file
  EXIT: Token spending tracked; waste alerts fire for broad searches

```
FORGE-TRIPLE for INT-S3:
  PROTECTIVE HOOK: build-guard-hook.mjs → enforces test/review cadence
  MCP ACTION: prism_dev:build_guard_chain → full chain execution
  SKILL: /hook-status updated to show new hooks

EXIT GATE: ✓ 3 new hooks auto-fire | ✓ Build guard tracks edits
  | ✓ Context chain guides compaction | ✓ Token spending tracked
  | omega_floor >= 0.85 | SVI delta: +1%

FEATURE CASCADE:
  NEW_HOOKS: [build-guard-hook.mjs, context-chain-hook.mjs, token-economy-hook.mjs]
  NEW_ACTIONS: [none — already wired]
  NEW_SKILLS: [none]
  AVAILABLE_TO: [INT-S4+, every future session benefits automatically]
```

/compact checkpoint

---

### SESSION INT-S4: Intelligence Hooks (U-INT10..U-INT12)

```
SMART CONFIG: Role=Hook engineer + AI/ML specialist
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  - AutomationChainEngine.ts — classify(), 9 task classes, context bundles
  - CodingCopilotEngine.ts — checkDuplication(), suggestReuse()
  - ChainFailureRecoveryEngine.ts — recover(), classifyFailure()
  - portable-user-settings.json (now with 3 new hooks from INT-S3)
INTENT: Every prompt auto-classified for optimal context. New engine creation
  triggers dedup check. Tool failures get structured recovery.
SKILLS: /smart, /copilot-suggest (new)
MCP ACTIONS: prism_dev:build_guard_classify, prism_dev:copilot_suggest
```

**U-INT10: Wire AutomationChainEngine into UserPromptSubmit**
  → Create prompt-classifier-hook.mjs
  → Classify each prompt into 9 task classes
  → Inject context bundles for detected class via additionalContext
  → Log classification for telemetry
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/prompt-classifier-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on UserPromptSubmit
    2. Classification not injected into context
    3. Task class not logged
  ROLLBACK: Remove hook entry, delete .mjs file
  EXIT: Every prompt shows task class in context

**U-INT11: Wire CodingCopilot dedup into PreToolUse Write (engine files)**
  → Create copilot-dedup-hook.mjs
  → Fire only when creating NEW files in src/engines/
  → Call CodingCopilotEngine.checkDuplication()
  → Warn if overlap > 60% with existing engine
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/copilot-dedup-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on new engine file creation
    2. Dedup check doesn't run against existing engines
    3. No warning shown for high overlap
  ROLLBACK: Remove hook entry, delete .mjs file
  EXIT: Creating a new engine triggers dedup check

**U-INT12: Wire ChainFailureRecovery into PostToolUseFailure**
  → Create chain-recovery-hook.mjs
  → Classify failures as transient/recoverable/permanent
  → Compute recovery plan (retry/skip/abort)
  → Inject guidance via additionalContext
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [.claude/hooks/lib/chain-recovery-hook.mjs]
  FILES_MODIFIED: [.claude/hooks/portable-user-settings.json]
  ABORT_CRITERIA:
    1. Hook doesn't fire on PostToolUseFailure
    2. Failure not classified
    3. Recovery plan not injected
  ROLLBACK: Remove hook entry, delete .mjs file
  EXIT: Tool failures get structured recovery guidance

```
FORGE-TRIPLE for INT-S4:
  PROTECTIVE HOOK: copilot-dedup-hook.mjs → prevents duplicate engines
  MCP ACTION: prism_dev:copilot_suggest → full copilot suggestion
  SKILL: /smart updated to show task classification

EXIT GATE: ✓ 3 more hooks auto-fire (6 total new) | ✓ Prompts classified
  | ✓ Engine dedup active | ✓ Failure recovery active
  | omega_floor >= 0.85 | SVI delta: +1%

FEATURE CASCADE:
  NEW_HOOKS: [prompt-classifier-hook.mjs, copilot-dedup-hook.mjs, chain-recovery-hook.mjs]
  NEW_ACTIONS: [none — already wired]
  NEW_SKILLS: [none]
  AVAILABLE_TO: [INT-S5+, every future session]
```

/compact checkpoint

---

## PHASE 3: Slash Command Surface

### SESSION INT-S5: New Slash Commands Batch 1 (U-INT13..U-INT15)

```
SMART CONFIG: Role=Skill author + UX designer
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  - skills-consolidated/ SKILL.md format (any existing skill for template)
  - DiscoverabilityEngine.ts — search(), whatCanIDo(), browse()
  - CapabilityCensusEngine.ts — runLiveReport()
  - ProductPillarEngine.ts — getSummary(), listPillars()
INTENT: Users can type /discover, /census, /pillar and get rich output.
SKILLS: /commands (list all), /skill-modernize
MCP ACTIONS: prism_dev:discover_search, prism_dev:capability_census_report, prism_dev:pillar_summary
```

**U-INT13: Create /discover skill**
  → SKILL.md calling DiscoverabilityEngine.search() or .whatCanIDo()
  → /discover "speed feed" → ranked capability list with entry points
  → /discover (no args) → list all domains with counts
  → /discover --browse physics → list physics capabilities
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [skills-consolidated/prism-discover/SKILL.md]
  ABORT_CRITERIA:
    1. /discover doesn't invoke DiscoverabilityEngine
    2. Results don't include entry points (skill/action names)
    3. Empty results for known domains
  ROLLBACK: Delete skill directory
  EXIT: /discover "cutting force" returns Kienzle + related capabilities

**U-INT14: Create /census skill**
  → SKILL.md calling CapabilityCensusEngine.runLiveReport()
  → Shows: utilization %, dark engine count, wiring gaps, domain breakdown
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [skills-consolidated/prism-census/SKILL.md]
  ABORT_CRITERIA:
    1. /census doesn't show utilization percentage
    2. Dark engine count missing
    3. Domain breakdown not shown
  ROLLBACK: Delete skill directory
  EXIT: /census shows live utilization report

**U-INT15: Create /pillar skill**
  → SKILL.md calling ProductPillarEngine.getSummary() and .listPillars()
  → /pillar → 8 pillars with completeness scores
  → /pillar calculator → detailed pillar view with engines, entry points
  → /pillar --gate free → show free-tier accessible pillars
  → 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  FILES_CREATED: [skills-consolidated/prism-pillar/SKILL.md]
  ABORT_CRITERIA:
    1. /pillar doesn't list 8 pillars
    2. Completeness scores missing
    3. Feature gates not shown
  ROLLBACK: Delete skill directory
  EXIT: /pillar shows 8 pillars with status and tier info

```
FORGE-TRIPLE for INT-S5:
  PROTECTIVE HOOK: enforce-skill-references.mjs → warn if skill references non-existent action
  MCP ACTION: prism_dev:discover_search + capability_census_report + pillar_summary
  SKILL: /discover, /census, /pillar

EXIT GATE: ✓ 3 new slash commands work | ✓ Each returns real data
  | omega_floor >= 0.85 | SVI delta: +0.5%

FEATURE CASCADE:
  NEW_HOOKS: [enforce-skill-references.mjs]
  NEW_ACTIONS: [none — already wired]
  NEW_SKILLS: [/discover, /census, /pillar]
  AVAILABLE_TO: [INT-S6+, all sessions]
```

/compact checkpoint

---

### SESSION INT-S6: New Slash Commands Batch 2 (U-INT16..U-INT18)

```
SMART CONFIG: Role=Skill author + UX designer
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=35%
KNOWLEDGE:
  - TokenEconomyEngine.ts — getBudget(), detectWaste(), generateReport()
  - CapabilityPathEngine.ts — suggestNext(), getProgress()
  - WorkflowOrchestrationEngine.ts — listWorkflows(), planExecution()
INTENT: Users can check token budgets, learning paths, and orchestrate workflows.
SKILLS: /commands
MCP ACTIONS: prism_dev:token_budget, prism_dev:capability_path_suggest, prism_dev:workflow_list
```

**U-INT16: Create /token-economy skill**
  → Budget, waste detection, compression suggestions, ROI
  FILES_CREATED: [skills-consolidated/prism-token-economy/SKILL.md]
  ABORT_CRITERIA: [skill doesn't call TokenEconomyEngine, no budget shown, no waste patterns]
  EXIT: /token-economy shows budget allocation + waste patterns

**U-INT17: Create /learn-path skill**
  → Learning paths, progress tracking, next step suggestions
  FILES_CREATED: [skills-consolidated/prism-learn-path/SKILL.md]
  ABORT_CRITERIA: [paths not listed, progress not tracked, no next suggestion]
  EXIT: /learn-path shows 4 paths with progress and next module

**U-INT18: Create /workflow skill**
  → List built-in workflows, plan execution, create custom workflows
  FILES_CREATED: [skills-consolidated/prism-workflow/SKILL.md]
  ABORT_CRITERIA: [workflows not listed, plan not shown, no custom creation]
  EXIT: /workflow lists 3 built-in workflows with execution plans

```
FORGE-TRIPLE for INT-S6:
  PROTECTIVE HOOK: none (skill-only session)
  MCP ACTION: prism_dev:token_budget + capability_path_suggest + workflow_list
  SKILL: /token-economy, /learn-path, /workflow

EXIT GATE: ✓ 3 more slash commands (6 total new) | ✓ Each returns real data
  | omega_floor >= 0.85 | SVI delta: +0.5%
```

/compact checkpoint

---

## PHASE 4: Existing Command Updates

### SESSION INT-S7: Update Startup + Compact + Forge (U-INT19..U-INT21)

```
SMART CONFIG: Role=System integrator + Command specialist
  MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
KNOWLEDGE:
  - skills-consolidated/prism-startup/SKILL.md (current startup macro)
  - skills-consolidated/prism-precompact/SKILL.md
  - skills-consolidated/prism-forge-engines/SKILL.md
  - ProductPillarEngine, CapabilityCensusEngine, ContextChainEngine, CodingCopilotEngine
INTENT: Existing daily-use commands leverage new engines automatically.
  Startup shows census. Compact uses context chain. Forge uses copilot.
SKILLS: /startup, /precompact, /forge-engines
MCP ACTIONS: prism_dev:pillar_summary, prism_dev:capability_census_report, prism_dev:copilot_suggest
```

**U-INT19: Update /startup skill**
  → Add Step 4F: call prism_dev:pillar_summary → show pillar readiness line
  → Add Step 4G: call prism_dev:capability_census_report → show utilization %
  → Add task classification hint from AutomationChainEngine
  FILES_MODIFIED: [skills-consolidated/prism-startup/SKILL.md]
  ABORT_CRITERIA: [startup doesn't show pillars, utilization missing, no task hint]
  EXIT: /startup output includes "Pillars: X ready, Y partial" and "Utilization: Z%"

**U-INT20: Update /precompact to use ContextChainEngine**
  → Call prism_dev:context_compact_plan with current pressure estimate
  → Include critical_facts in handoff output
  → Show pressure level and recommended action
  FILES_MODIFIED: [skills-consolidated/prism-precompact/SKILL.md]
  ABORT_CRITERIA: [precompact doesn't call context chain, facts not in handoff, no pressure shown]
  EXIT: Precompact output includes context chain guidance

**U-INT21: Update /forge-engines to use CodingCopilot**
  → Before creating, call prism_dev:copilot_suggest with task description
  → Show reuse suggestions and dedup check results
  → Use prism_dev:copilot_template for scaffold generation
  FILES_MODIFIED: [skills-consolidated/prism-forge-engines/SKILL.md]
  ABORT_CRITERIA: [forge doesn't check dedup, no reuse suggestions, no template used]
  EXIT: Forge shows "Checking for duplicates..." and reuse suggestions before creating

```
FORGE-TRIPLE for INT-S7:
  PROTECTIVE HOOK: none (update-only session)
  MCP ACTION: prism_dev:pillar_summary, prism_dev:context_compact_plan, prism_dev:copilot_suggest
  SKILL: /startup (updated), /precompact (updated), /forge-engines (updated)

EXIT GATE: ✓ 3 commands updated | ✓ Each leverages new engines
  | omega_floor >= 0.85 | SVI delta: +0.5%
```

/compact checkpoint

---

## PHASE 5: Dark Engine Triage + Stub Dispatchers

### SESSION INT-S8: Classify Dark Engines Batch 1 (U-INT22..U-INT24)

```
SMART CONFIG: Role=System architect + Triage specialist
  MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=40%
KNOWLEDGE:
  - UtilizationContractEngine.ts — classifyDomain(), isInternal()
  - CapabilityCensusEngine.ts — runLiveReport() for dark engine list
  - FULL_SYSTEM_AUDIT_2026-04-06.md — 223 dark engines identified
INTENT: Every dark engine classified as wire/internal/deprecate.
  50+ highest-value engines newly wired to dispatchers.
SKILLS: /census, /engine-browse
MCP ACTIONS: prism_dev:capability_census_report, prism_dev:auto_wiring_scan
```

**U-INT22: Classify first 100 dark engines**
  → For each: check if internal utility → mark. Has domain value? → wire. Dead? → deprecate.
  FILES_CREATED: [data/state/DARK_ENGINE_TRIAGE.json]
  ABORT_CRITERIA: [<80 engines classified, no wire/internal/deprecate labels, no priority ranking]
  EXIT: 100 engines classified with action recommendation

**U-INT23: Wire top 25 highest-value dark engines to dispatchers**
  → Prioritize: physics, post_processor, business, quality domains
  → Add lazy imports + case statements to appropriate dispatchers
  FILES_MODIFIED: [appropriate dispatcher files]
  ABORT_CRITERIA: [<20 engines wired, build fails, action names collide]
  EXIT: 25 new dispatcher actions, build passes

**U-INT24: Fix 10 highest-impact stub dispatchers (of 19)**
  → Wire at least 2 actions per stub using existing engines
  → Focus on: safetyDispatcher, dataDispatcher, diagnosisDispatcher, memoryDispatcher
  FILES_MODIFIED: [10 stub dispatcher files]
  ABORT_CRITERIA: [<8 stubs fixed, actions don't call real engines, build fails]
  EXIT: 10 former-stub dispatchers have live actions

```
EXIT GATE: ✓ 100 dark engines classified | ✓ 25 newly wired
  | ✓ 10 stub dispatchers fixed | omega_floor >= 0.85 | SVI delta: +2%
```

/compact checkpoint

---

### SESSION INT-S9: Dark Engine Triage Batch 2 (U-INT25..U-INT27)

```
SMART CONFIG: Role=System architect | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=40%
```

**U-INT25: Classify remaining 123 dark engines**
  FILES_MODIFIED: [data/state/DARK_ENGINE_TRIAGE.json]
  EXIT: All 223 dark engines classified

**U-INT26: Wire next 25 highest-value dark engines**
  FILES_MODIFIED: [appropriate dispatcher files]
  EXIT: 50 total dark engines newly wired

**U-INT27: Fix remaining 9 stub dispatchers + generate DARK_ENGINE_REPORT.json**
  FILES_MODIFIED: [9 stub dispatcher files, data/state/DARK_ENGINE_REPORT.json]
  EXIT: 0 stub dispatchers remaining; full triage report saved

```
EXIT GATE: ✓ All 223 classified | ✓ 50+ wired | ✓ 0 stubs
  | omega_floor >= 0.85 | SVI delta: +2%
```

/compact checkpoint

---

## PHASE 6: Skill Audit + Feature Activation

### SESSION INT-S10: Skill Audit (U-INT28..U-INT30)

```
SMART CONFIG: Role=Quality auditor | MODEL=opus | EFFORT=HIGH | CONTEXT_BUDGET=35%
KNOWLEDGE:
  - skills-consolidated/ (260 skills, 91 use MCP actions, 169 docs-only)
  - 5 duplicate skill families identified in audit
  - 10 stale/broken skills identified
INTENT: Every skill references live engines/actions. Duplicates merged. Stale removed.
SKILLS: /commands, /skill-modernize
MCP ACTIONS: prism_dev:discover_search (cross-reference capabilities)
```

**U-INT28: Scan 260 skills for stale engine/action references**
  FILES_CREATED: [data/state/SKILL_AUDIT_REPORT.json]
  EXIT: Stale reference report with fix recommendations

**U-INT29: Fix top 20 broken skills + merge 5 duplicate families**
  FILES_MODIFIED: [20 SKILL.md files, 5 duplicate directories consolidated]
  EXIT: 20 skills fixed, 5 duplicate families reduced to 1 each

**U-INT30: Map skills to ProductPillarEngine pillars**
  FILES_CREATED: [data/state/SKILL_PILLAR_MAP.json]
  EXIT: Every active skill mapped to a product pillar

```
EXIT GATE: ✓ 260 skills audited | ✓ 20 fixed | ✓ 5 families merged
  | ✓ All skills mapped to pillars | omega_floor >= 0.85
```

/compact checkpoint

---

### SESSION INT-S11: Feature Activation + CronJobs (U-INT31..U-INT33)

```
SMART CONFIG: Role=Platform engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=30%
KNOWLEDGE:
  - CronCreate tool — schedule recurring tasks
  - prism_session:context_boot — full context hydration
  - Playwright plugin — web app testing
  - RemoteTrigger — persistent agents
INTENT: Activate underused Claude Code features. Recurring health checks.
  Context boot replaces manual startup file reads.
SKILLS: /activate-features, /cron-manage
MCP ACTIONS: CronCreate, prism_session:context_boot
```

**U-INT31: Set up CronCreate recurring tasks**
  → Health check every 2 hours: SVI refresh, stale claim reap
  → Digest freshness check daily: regenerate if >7 days old
  → Token economy report at session end
  EXIT: 3 cron jobs active

**U-INT32: Wire prism_session:context_boot into /startup**
  → Replace manual file reads with single MCP call
  → context_boot loads: position, handoff, SVI, coordination state
  FILES_MODIFIED: [skills-consolidated/prism-startup/SKILL.md]
  EXIT: /startup uses context_boot for hydration

**U-INT33: Set up Playwright web app test + build gate**
  → Configure Playwright for web app at mcp-server/web/
  → Add build:web script if missing
  → Run `npm run build:web` to produce dist/
  FILES_MODIFIED: [mcp-server/package.json, web/package.json]
  EXIT: Web app builds, Playwright can navigate pages

```
EXIT GATE: ✓ 3 cron jobs | ✓ context_boot in startup | ✓ Web app builds
  | omega_floor >= 0.85 | SVI delta: +1%
```

/compact checkpoint

---

## PHASE 7: E2E Validation

### SESSION INT-S12: End-to-End Validation (U-INT34..U-INT36)

```
SMART CONFIG: Role=QA engineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=40%
```

**U-INT34: Run CapabilityEffectivenessEngine validation suite**
  → Execute all validation tests via dispatcher actions
  → Verify output fields match expectations
  EXIT: Pass rate >= 80% across all pillars

**U-INT35: Run CapabilityCensusEngine live report + verify improvements**
  → Verify utilization % increased from 56% baseline
  → Verify dark engine count decreased from 223
  → Verify stub dispatcher count = 0
  EXIT: Utilization > 70%, dark < 175, stubs = 0

**U-INT36: Final integration verification**
  → Run full test suite (rtk vitest run)
  → Verify build (npx tsc --noEmit)
  → Run /startup and verify new lines appear
  → Run /discover, /census, /pillar and verify output
  → Verify 6 new hooks fire on appropriate events
  EXIT: Build PASS, tests PASS, all commands work, all hooks fire

```
EXIT GATE (FULL TRACK):
  ✓ ENGINE_DIGEST has entries for ALL engines
  ✓ DISPATCHER_DIGEST action counts match live
  ✓ CLAUDE.md counts match live system
  ✓ index.ts exports all engines
  ✓ 6 new hooks auto-fire
  ✓ 6 new slash commands work
  ✓ 3 existing commands updated
  ✓ MEMORY.md reflects completion
  ✓ 223 dark engines classified, 50+ wired
  ✓ 19 stub dispatchers fixed to 0
  ✓ 260 skills audited
  ✓ CronCreate active
  ✓ Web app builds
  ✓ E2E validation >= 80%
  ✓ Build: PASS | Tests: PASS
  | omega_floor >= 0.85 | SVI delta: +8% total
```

---

## DEPENDENCY GRAPH (Stage 9)

```
U-INT01 ──→ U-INT03 (digest before CLAUDE.md)
U-INT02 ──→ U-INT03
U-INT03 ──→ U-INT04 (docs before index fix)
U-INT04..06 ──→ U-INT07..12 (index fix before hooks)
U-INT07..12 ──→ U-INT13..18 (hooks before skills)
U-INT13..18 ──→ U-INT19..21 (new skills before updating existing)
U-INT19..21 ──→ U-INT22..27 (commands before dark triage)
U-INT22..27 ──→ U-INT28..30 (triage before skill audit)
U-INT28..33 ──→ U-INT34..36 (all integration before validation)
```

No circular dependencies. Compaction points don't split dependent units. All unit names use U-INT{NN} format.

---

## POST-GENERATION NOTE

This roadmap was generated through the RGS 10-stage pipeline. The 3-loop post-generation scrutiny (Stage 10, Loop 1-3) should be run separately as it requires spawning 10+ review agents in parallel — a significant context investment. Run `/scrutinize INT-FULL-ROADMAP.md` when ready.
