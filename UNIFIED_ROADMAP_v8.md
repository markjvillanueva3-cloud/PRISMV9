# PRISM UNIFIED ROADMAP v8.0
## ⚠️ HISTORICAL — Current truth: MASTER_INDEX.md (31 dispatchers, 368 actions, F1-F8 complete)
## Development Infrastructure First — Manufacturing Features Deferred
## Created: 2026-02-08 | 73 Python Modules (35,279L) → Wire, Don't Rewrite

---

# STRATEGIC DIRECTION

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PRINCIPLE: Make the builder better before building more things.                 │
│                                                                                 │
│  73 Python modules (35K lines) already written → WIRE THEM                      │
│  Dev infrastructure improves EVERY future session                               │
│  Manufacturing features deferred to Phase M (later)                             │
│                                                                                 │
│  ROI: 1 hour improving dev capability = 10+ hours saved downstream              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Integration Method

All Python modules integrate via `ScriptExecutor.ts` (existing engine).
No TypeScript porting required. Pattern:
```
prism:prism_skill_script action=script_execute params={ script: "core/MODULE.py", args: {...} }
```

For hot-path modules, create thin TypeScript dispatcher actions that shell out to Python.
For cold-path modules, call directly via script_execute.

---

# CURRENT STATE (Baseline)

| System | Count | Status |
|--------|-------|--------|
| TypeScript Dispatchers | 24 | ✅ Operational |
| Dispatcher Actions | ~304 | ✅ Operational |
| Auto-fire Hooks | 73/112 | ✅ Live |
| Python Core Modules | 73 files, 35,279L | ⚠️ 22 integrated (D1+D2 done), 51 unwired |
| Materials | 2,805 | ✅ |
| Machines | 402 | ✅ |
| Formulas | 515 | ✅ |
| Alarms | 10,033 | ✅ |

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D1: SESSION RESILIENCE — Stop Losing Work ✅ COMPLETE
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🔴 CRITICAL | Effort: LOW (wiring) | Sessions: 1-2
# Pain Point: Sessions die, context compacts, work vanishes
# Status: ✅ COMPLETE — All 6 actions wired in sessionDispatcher, tested, built

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `wip_capturer.py` | 624 | Detects incomplete work, saves WIP state for recovery | Dispatcher action |
| 2 | `wip_saver.py` | 465 | Companion to capturer — serializes WIP to disk | Dispatcher action |
| 3 | `graceful_shutdown.py` | 517 | Clean session termination, saves everything before death | Hook: on-session-end |
| 4 | `state_rollback.py` | 528 | Undo corrupted state changes, restore previous version | Dispatcher action |
| 5 | `clone_factory.py` | 713 | Deep-clone entire state for safe rollback points | Dispatcher action |
| 6 | `recovery_scorer.py` | 556 | Scores how complete a session resume was (0-100%) | Auto-fire on resume |
| 7 | `checkpoint_mgr.py` | 553 | Enhanced checkpoint management beyond current auto_checkpoint | Enhance existing |

**Total: 3,956 lines | 7 modules**

### Wiring Plan
```
sessionDispatcher.ts additions:
  action=wip_capture    → calls wip_capturer.py capture
  action=wip_list       → calls wip_capturer.py list
  action=wip_restore    → calls wip_capturer.py restore <id>
  action=state_rollback → calls state_rollback.py rollback <checkpoint>
  action=state_clone    → calls clone_factory.py clone
  action=resume_score   → calls recovery_scorer.py score

autoHookWrapper.ts additions:
  on-session-end → graceful_shutdown.py (auto-fire)
  on-session-resume → recovery_scorer.py (auto-fire, log score)
```

### Success Criteria
- Zero work loss on context compaction
- Session resume scores ≥ 90%
- State rollback in < 2 seconds

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D2: CONTEXT INTELLIGENCE — Smarter Context Management ✅ COMPLETE
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🔴 CRITICAL | Effort: LOW (wiring) | Sessions: 2-3
# Pain Point: Context fills up, important info gets evicted
# Status: ✅ COMPLETE — 4 dispatcher actions, 4 cadence hooks, compaction survival + rehydration

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `attention_scorer.py` | 445 | Scores content importance (what to keep vs evict) | Auto-fire on pressure |
| 2 | `focus_optimizer.py` | 445 | Allocates attention budget across competing items | Dispatcher action |
| 3 | `context_compressor.py` | 399 | Compress context when hitting limits | Enhance existing |
| 4 | `context_expander.py` | 328 | Restore compressed context on demand | Enhance existing |
| 5 | `compaction_detector.py` | 487 | Predict compaction risk before it happens | Auto-fire cadence |
| 6 | `relevance_filter.py` | 435 | Filter irrelevant content from context | Auto-fire on output |
| 7 | `context_monitor.py` | 350 | Continuous usage monitoring with trend analysis | Auto-fire cadence |
| 8 | `context_pressure.py` | 443 | Enhanced pressure calculation beyond current impl | Enhance existing |
| 9 | `auto_compress.py` | 344 | Automatic compression triggers | Auto-fire at threshold |

**Total: 3,676 lines | 9 modules**

### Wiring Plan
```
contextDispatcher.ts additions:
  action=attention_score   → calls attention_scorer.py score <content>
  action=focus_optimize    → calls focus_optimizer.py optimize
  action=relevance_filter  → calls relevance_filter.py filter <content>
  action=context_monitor   → calls context_monitor.py status

cadenceExecutor.ts enhancements:
  @8 calls → attention_scorer.py (score current context, evict low-value)
  @12 calls → compaction_detector.py (predict risk, preempt)
  @pressure>70% → auto_compress.py (trigger compression)
  @pressure<40% → context_expander.py (restore important data)
```

### Success Criteria
- Context pressure stays below 🟡 zone 80% of session
- Important content survives compaction
- Predictive compaction warning ≥ 3 calls before event

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D3: LEARNING & PATTERN DETECTION — Stop Repeating Mistakes
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟡 HIGH | Effort: LOW (wiring) | Sessions: 3-4
# Pain Point: Same errors recur, no institutional memory across sessions

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `pattern_detector.py` | 484 | Detects recurring error/success patterns | Auto-fire on-error |
| 2 | `learning_store.py` | 423 | Persistent learning database (survives restarts) | Dispatcher action |
| 3 | `error_extractor.py` | 404 | Extracts structured patterns from raw errors | Auto-fire on-error |
| 4 | `lkg_tracker.py` | 494 | Tracks last-known-good state for every subsystem | Auto-fire on-success |
| 5 | `priority_scorer.py` | 377 | Scores task priorities based on history/context | Dispatcher action |
| 6 | `event_logger.py` | 478 | Structured event logging with queryable history | Background service |

**Total: 2,660 lines | 6 modules**

### Wiring Plan
```
guardDispatcher.ts additions:
  action=pattern_scan     → calls pattern_detector.py scan
  action=pattern_history  → calls pattern_detector.py history
  action=learning_query   → calls learning_store.py query <topic>
  action=learning_save    → calls learning_store.py save <data>
  action=lkg_status       → calls lkg_tracker.py status
  action=priority_score   → calls priority_scorer.py score <tasks>

autoHookWrapper.ts enhancements:
  on-error chain: error_extractor.py → pattern_detector.py → learning_store.py
  on-success: lkg_tracker.py update (auto-fire)
```

### Success Criteria
- Known error patterns detected within 1 occurrence
- Learning persists across sessions (file-backed)
- LKG state always available for rollback

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D4: PERFORMANCE & CACHING — Speed Up Everything
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟡 HIGH | Effort: LOW-MED (wiring + config) | Sessions: 4-5
# Pain Point: Repeated calculations waste tokens, slow responses

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `computation_cache.py` | 802 | Cache expensive calculations by input hash | Hook: pre-calc intercept |
| 2 | `diff_based_updates.py` | 908 | Incremental state saves (diff, not full rewrite) | Replace state_save impl |
| 3 | `diff_engine.py` | 630 | Efficient diff computation for any data | Utility for D4-2 |
| 4 | `template_optimizer.py` | 555 | Optimize repeated prompt/template patterns | Auto-fire on prompt |
| 5 | `batch_processor.py` | 457 | Batch operations for efficiency | Dispatcher action |
| 6 | `queue_manager.py` | 546 | Priority queue for async work | Dispatcher action |
| 7 | `efficiency_controller.py` | 387 | Global efficiency metrics and throttling | Background monitor |

**Total: 4,285 lines | 7 modules**

### Wiring Plan
```
calcDispatcher.ts enhancement:
  pre-calculation hook → computation_cache.py check
  If cache HIT → return cached result (skip calculation entirely)
  If cache MISS → compute → computation_cache.py store → return

sessionDispatcher.ts enhancement:
  action=state_save → diff_based_updates.py (write diff, not full state)
  action=state_load → diff_based_updates.py (reconstruct from diffs)

New cadence hooks:
  Every calc → cache check/store (transparent)
  @session_end → batch_processor.py flush pending operations
  @session_start → computation_cache.py warm (preload common calcs)
```

### Success Criteria
- Cache hit rate > 40% on repeated calculations
- State save time reduced 5-10x via diffs
- Batch operations group small writes

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D5: SESSION ORCHESTRATION — Smarter Session Management
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟢 MEDIUM | Effort: MED (wiring + integration) | Sessions: 5-6
# Pain Point: Session resume is fragile, handoffs lose context

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `session_lifecycle.py` | 811 | Complete lifecycle: init→active→save→shutdown | Orchestrator |
| 2 | `resume_detector.py` | 524 | Detects what needs resuming (partial files, pending tasks) | Auto-fire on boot |
| 3 | `resume_validator.py` | 712 | Validates resume completeness (nothing lost) | Auto-fire on boot |
| 4 | `next_session_prep.py` | 508 | Prepares handoff package for next session | Auto-fire on end |
| 5 | `state_reconstructor.py` | 538 | Rebuilds state from fragments after corruption | Emergency recovery |
| 6 | `state_version.py` | 495 | Version tracking for state schema migrations | Background utility |
| 7 | `master_orchestrator_v2.py` | 641 | Coordinates multiple subsystems during complex ops | Orchestrator layer |
| 8 | `checkpoint_mapper.py` | 495 | Maps checkpoints to decisions for audit trail | Background utility |
| 9 | `gsd_sync.py` | 479 | Keeps GSD doc in sync with actual state | Auto-fire after builds |

**Total: 5,203 lines | 9 modules**

### Wiring Plan
```
devDispatcher.ts action=session_boot enhancement:
  1. resume_detector.py → identify what needs resuming
  2. resume_validator.py → validate nothing lost
  3. state_reconstructor.py → fix any corruption
  4. recovery_scorer.py → log resume quality

sessionDispatcher.ts action=session_end enhancement:
  1. wip_capturer.py → save any incomplete work
  2. next_session_prep.py → build handoff package
  3. graceful_shutdown.py → clean termination
  4. checkpoint_mapper.py → map final checkpoint
```

### Success Criteria
- Session resume in < 30 seconds with 100% fidelity
- Next-session handoff package auto-generated
- State corruption auto-detected and auto-repaired

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D6: CODE INTELLIGENCE — Navigate 986K Lines Effortlessly
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟢 MEDIUM | Effort: MED (needs ChromaDB or SQLite index) | Sessions: 6-7
# Pain Point: Finding code in 986K-line monolith is slow and imprecise

| # | Module | Lines | What It Does | Wire Method |
|---|--------|-------|-------------|-------------|
| 1 | `semantic_code_index.py` | 1,502 | Semantic search over entire codebase via embeddings | Dispatcher action |
| 2 | `prompt_builder.py` | 454 | Builds optimal prompts from context + history | Dispatcher action |
| 3 | `skill_preloader.py` | 418 | Preloads relevant skills based on task prediction | Auto-fire on boot |
| 4 | `skill_loader.py` | 488 | Dynamic skill loading during execution | Dispatcher action |
| 5 | `resource_accessor.py` | 647 | Unified access to all PRISM resources | Dispatcher action |

**Total: 3,509 lines | 5 modules**

### Wiring Plan
```
knowledgeDispatcher.ts additions:
  action=code_search_semantic → semantic_code_index.py search <query>
  action=code_dependencies    → semantic_code_index.py deps <file>
  action=code_consumers       → semantic_code_index.py consumers <symbol>
  action=code_similar         → semantic_code_index.py similar <code>

skillScriptDispatcher.ts additions:
  action=skill_preload → skill_preloader.py preload <task_type>
  action=resource_get  → resource_accessor.py get <type> <id>
```

### Dependency
- Requires one-time index build (~30 min for full monolith)
- SQLite fallback if ChromaDB not available

### Success Criteria
- "Find code that does X" returns relevant results in < 2 seconds
- Related code discovered automatically when editing
- Skill preloading reduces manual skill selection by 80%

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D7: APPEND-ONLY STATE — Zero Work Loss Architecture
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟢 MEDIUM | Effort: MED-HIGH (build from spec) | Sessions: 7-8
# Pain Point: State overwrites = data loss. No undo. No history.
# Spec: C:\PRISM\docs\APPEND_ONLY_STATE_PROTOCOL.md (395 lines)

### What Gets Built
```
Append-Only State Engine:
  ├── Event log (every state change = new entry, never overwrite)
  ├── Snapshot system (periodic full-state snapshots for fast restore)
  ├── Diff chain (entry N = diff from entry N-1)
  ├── Compaction (summarize + archive, NEVER discard)
  ├── Time-travel queries (state-at-time-T)
  └── Auto-archive (old entries → cold storage)
```

### Integration with Existing Modules
```
Uses from Phase D1: clone_factory.py (create snapshots)
Uses from Phase D4: diff_engine.py (compute diffs)
Uses from Phase D4: diff_based_updates.py (incremental saves)
Replaces: current state_save overwrite pattern
```

### Deliverables
- `append_only_state.py` — Core engine (~800 lines)
- Migration from CURRENT_STATE.json overwrite → append log
- sessionDispatcher action=state_history (time-travel)
- sessionDispatcher action=state_at (point-in-time restore)

### Success Criteria
- Any point in session history restorable
- State never lost on compaction
- Resume from any checkpoint, not just the last one

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D8: REAL TEST INFRASTRUCTURE — Trust the Build
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🟡 HIGH | Effort: MED (build new) | Sessions: 8-9
# Pain Point: Safety-critical software with ZERO automated tests

### What Gets Built
```
Test Framework:
  ├── Dispatcher smoke tests (all 24 dispatchers respond correctly)
  ├── Action coverage (every action callable without error)
  ├── Hook fire tests (73 live hooks trigger correctly)
  ├── Anti-regression suite (item counts never decrease)
  ├── Build verification (post-build smoke in < 10 seconds)
  └── Integration tests (multi-dispatcher workflows)
```

### Implementation
```
C:\PRISM\mcp-server\tests\
  ├── smoke.test.ts          — Call every dispatcher, expect non-error
  ├── actions.test.ts        — Call every action with minimal valid params
  ├── hooks.test.ts          — Fire each hook, verify execution
  ├── anti-regression.test.ts — Compare counts before/after any change
  ├── integration.test.ts    — End-to-end workflows
  └── test-runner.ts         — Executable test harness (node, not jest)

devDispatcher.ts additions:
  action=test_smoke   → Run smoke tests, return pass/fail summary
  action=test_full    → Run complete suite
  action=test_changed → Run only tests affected by recent changes
```

### Success Criteria
- Every build followed by smoke test (< 10 seconds)
- All 24 dispatchers verified callable
- Anti-regression catches count decreases before deploy

---

# ═══════════════════════════════════════════════════════════════════════
# PHASE D9: REMAINING PYTHON MODULES — Complete the Wiring
# ═══════════════════════════════════════════════════════════════════════
# Priority: 🔵 LATER | Effort: LOW (wiring) | Sessions: 9-10
# These are useful but not urgent

| # | Module | Lines | What It Does | Priority |
|---|--------|-------|-------------|----------|
| 1 | `agent_mcp_proxy.py` | 1,001 | Proxy for agent API calls | LOW — AgentExecutor exists |
| 2 | `manus_context_engineering.py` | 855 | Manus 6 Laws implementation | MED — enhances context |
| 3 | `incremental_file_sync.py` | 844 | Sync files incrementally | LOW — file_sync exists |
| 4 | `state_server.py` | 924 | State as a service | LOW — sessionDispatcher exists |
| 5 | `phase0_hooks.py` | 765 | Phase 0 hook definitions | MED — 39 dead hooks |
| 6 | `file_sync.py` | 426 | Basic file synchronization | LOW |
| 7 | `prism_enhanced_wiring.py` | 278 | Enhanced module wiring helpers | UTIL |
| 8 | `mcp_orchestrator.py` | 276 | MCP-level orchestration | LOW — autopilot exists |
| 9 | `skill_generator_v2.py` | 520 | Generate new skills from specs | MED — skill authoring |
| 10 | `skill_generator.py` | 208 | Original skill generator | LOW — v2 supersedes |

**Plus 15 *_mcp.py wrapper files** (already MCP-shaped, just need registration):
`attention_mcp.py, batch_mcp.py, cache_mcp.py, context_mcp.py, efficiency_mcp.py,
error_mcp.py, formula_mcp.py, gsd_mcp.py, handoff_mcp.py, hook_mcp.py,
prompt_mcp.py, resource_mcp.py, resume_mcp.py, skill_mcp.py, state_mcp.py`

These 15 MCP wrappers (total ~4,800 lines) are pre-shaped for tool registration —
they define tool schemas and handlers. Fastest possible integration.

**Total Phase D9: ~10,000 lines | 25 modules**

---

# ═══════════════════════════════════════════════════════════════════════
# DEFERRED: MANUFACTURING & APP FEATURES (Phase M)
# ═══════════════════════════════════════════════════════════════════════
# These come AFTER dev infrastructure is solid.
# Full specs exist in MCP_ENHANCEMENT_ROADMAP_v2.md (597 lines)

## M1: Monolith Intelligence Extraction (27,000 lines of domain gold)
| Module | Lines | Value |
|--------|-------|-------|
| `rules_engine.js` | 5,500 | Machining rules as executable logic |
| `machining_rules.js` | 4,200 | Best practices as code |
| `best_practices.js` | 3,000 | Domain expertise distilled |
| `troubleshooting.js` | 2,800 | Diagnostic decision trees |
| `operation_sequencer.js` | 3,200 | Optimal operation ordering |
| `tool_selector.js` | 3,500 | Multi-objective tool selection |
| `constraint_engine.js` | 2,400 | Manufacturing constraint solver |
| `validators.js` | 2,200 | Data validation rules |

## M2: Cutting Tools Database
- Parse 100+ manufacturer PDF catalogs → structured data
- 9,500+ tools × 52 parameters (ISO 13399)
- Spec: TOOLS_DATABASE_BRAINSTORM.md (675 lines)

## M3: Tool Holder Schema v2 Upgrade
- 6,331 holders: 65-param → 85-param simulation-grade
- Add collision geometry, speed/feed derating, chatter data
- Spec: TOOL_HOLDER_DATABASE_ROADMAP_v4.md

## M4: Post Processor Framework (Phase 8.1 from Enhancement Roadmap)
- Universal intermediate representation → 12+ controller dialects
- FANUC, SIEMENS, HAAS, MAZAK, OKUMA, HEIDENHAIN, etc.
- 4,000 lines planned, controller skills already exist

## M5: Process Planning Engine (Phase 8.5 — NOVEL AI)
- Feature → operation sequence → machine selection → cost
- Setup minimization, constraint satisfaction
- 3,000 lines planned

## M6: Speed/Feed Calculator Enhancement
- Spec: SPEED_FEED_CALCULATOR_ENHANCEMENT_PLAN.md (984 lines)
- 15 new skills, 10 agents, 24 hooks, 5 scripts
- Depends on: M2 (tools DB), M3 (holders)

## M7: Safety-Critical Expansions (Phase 7 from Enhancement Roadmap)
- Collision detection ML enhancements
- Tool breakage fatigue modeling
- Spindle thermal derating
- Coolant flow optimization

## M8: Business Intelligence (Phase 11)
- Cost estimation engine
- Quoting system with market-aware AI
- Capacity planning / scheduling
- OEE tracking

## M9: Calculation Engines (Phase 10)
- GD&T stack-up analysis
- Surface integrity prediction
- Burr prediction & path optimization
- Thin wall machining (NOVEL adaptive)
- Deep hole drilling optimization
- Gear calculations (full suite)
- Grinding / EDM / Laser-Waterjet parameters

## M10: Novel Fusions (Phase 18 — Differentiators)
- Intelligent troubleshooter (alarm + Bayesian)
- Parametric recipe generator (one-click programs)
- Tribal knowledge capture (operator corrections → rules)
- Continuous learning loop (outcomes → parameters)
- Cross-shop anonymized intelligence
- Automated DFM feedback

## M11: Integration & Connectivity (Phase 13)
- CAD import (SolidWorks, Inventor, Creo, NX, CATIA)
- CAM export (Mastercam, Fusion, GibbsCAM)
- ERP integration (SAP, Oracle, JobBOSS)
- MTConnect / OPC-UA machine communication
- CMM integration, tool presetter

## M12: Reporting & Documentation (Phase 14)
- Setup sheet generator
- AS9102 FAIR / PPAP inspection reports
- Tool life reports
- Audit trail (AS9100 compliance)

---

# ═══════════════════════════════════════════════════════════════════════
# EXECUTION TIMELINE & DEPENDENCY GRAPH
# ═══════════════════════════════════════════════════════════════════════

## Optimized Execution Order

```
SESSION 1-2:  D1 (Session Resilience)     ← FIRST: stop losing work
    │         7 modules, 3,956 lines
    │         wip_capturer, graceful_shutdown, state_rollback, clone_factory,
    │         recovery_scorer, checkpoint_mgr, wip_saver
    │
SESSION 2-3:  D2 (Context Intelligence)   ← SECOND: keep important stuff in context
    │         9 modules, 3,676 lines
    │         attention_scorer, focus_optimizer, context_compressor/expander,
    │         compaction_detector, relevance_filter, context_monitor/pressure, auto_compress
    │
SESSION 3-4:  D3 (Learning & Patterns)    ← THIRD: learn from mistakes
    │         6 modules, 2,660 lines
    │         pattern_detector, learning_store, error_extractor,
    │         lkg_tracker, priority_scorer, event_logger
    │
SESSION 4-5:  D4 (Performance & Caching)  ← FOURTH: speed up repeated work
    │         7 modules, 4,285 lines
    │         computation_cache, diff_based_updates, diff_engine,
    │         template_optimizer, batch_processor, queue_manager, efficiency_controller
    │
SESSION 5-6:  D5 (Session Orchestration)  ← FIFTH: smarter session lifecycle
    │         9 modules, 5,203 lines
    │         session_lifecycle, resume_detector/validator, next_session_prep,
    │         state_reconstructor, state_version, master_orchestrator_v2,
    │         checkpoint_mapper, gsd_sync
    │
SESSION 6-7:  D6 (Code Intelligence)      ← SIXTH: navigate huge codebase
    │         5 modules, 3,509 lines
    │         semantic_code_index, prompt_builder, skill_preloader,
    │         skill_loader, resource_accessor
    │
SESSION 7-8:  D7 (Append-Only State)      ← SEVENTH: lossless state (uses D1+D4)
    │         Build from spec, ~800 lines new
    │         Depends on: clone_factory (D1), diff_engine (D4)
    │
SESSION 8-9:  D8 (Test Infrastructure)    ← EIGHTH: trust the build
    │         Build new, ~1,500 lines
    │         Smoke tests, action coverage, hook tests, anti-regression
    │
SESSION 9-10: D9 (Remaining Modules)      ← NINTH: complete the wiring
    │         25 modules, ~10,000 lines
    │         15 pre-shaped _mcp.py wrappers + 10 utility modules
    │
    ▼
SESSIONS 11+: Phase M (Manufacturing)     ← LATER: domain features
              M1→M2→M3→...→M12
```

## Dependency Graph

```
D1 (Resilience) ───────────────────────────────┐
    │                                           │
D2 (Context) ──── can run parallel with D1 ─────┤
    │                                           │
D3 (Learning) ── depends on D1 (error hooks) ──┤
    │                                           │
D4 (Caching) ─── independent ──────────────────┤
    │                                           │
D5 (Orchestration) ── depends on D1, D2, D3 ───┤
    │                                           │
D6 (Code Intel) ── independent ─────────────────┤
    │                                           │
D7 (Append State) ── depends on D1, D4 ────────┤
    │                                           │
D8 (Tests) ── depends on ALL above (tests them)─┤
    │                                           │
D9 (Remaining) ── independent, fill gaps ───────┤
    │                                           │
    ▼                                           │
Phase M (Manufacturing) ── depends on D1-D9 ────┘
```

## Parallel Opportunities
```
CAN RUN IN PARALLEL:
  D1 + D2 (both session resilience, no dependency)
  D3 + D4 (learning + caching, independent concerns)
  D6 (code intel, fully independent of D3-D5)

MUST BE SEQUENTIAL:
  D5 after D1+D2+D3 (orchestrates what they provide)
  D7 after D1+D4 (uses clone_factory + diff_engine)
  D8 after D1-D7 (tests everything)
```

---

# ═══════════════════════════════════════════════════════════════════════
# METRICS & TRACKING
# ═══════════════════════════════════════════════════════════════════════

## Module Integration Scorecard

| Phase | Modules | Lines | Status | Integrated |
|-------|---------|-------|--------|------------|
| D1: Resilience | 7 | 3,956 | ⬜ NOT STARTED | 0/7 |
| D2: Context | 9 | 3,676 | ⬜ NOT STARTED | 0/9 |
| D3: Learning | 6 | 2,660 | ⬜ NOT STARTED | 0/6 |
| D4: Caching | 7 | 4,285 | ⬜ NOT STARTED | 0/7 |
| D5: Orchestration | 9 | 5,203 | ⬜ NOT STARTED | 0/9 |
| D6: Code Intel | 5 | 3,509 | ⬜ NOT STARTED | 0/5 |
| D7: Append State | NEW | ~800 | ⬜ NOT STARTED | 0/1 |
| D8: Tests | NEW | ~1,500 | ⬜ NOT STARTED | 0/1 |
| D9: Remaining | 25 | ~10,000 | ⬜ NOT STARTED | 0/25 |
| **TOTAL DEV** | **68+2** | **~35,589** | | **0/70** |
| M1-M12 | 88 features | ~158,000 | ⬜ DEFERRED | 0/88 |

## Key Performance Indicators

| KPI | Current | After D-Phases | Target |
|-----|---------|---------------|--------|
| Work lost per session | ~15% | < 2% | 0% |
| Session resume time | 60-120s | < 30s | < 10s |
| Context pressure incidents | 3-5/session | < 1/session | 0 |
| Repeated errors (same type) | 20%+ | < 5% | < 2% |
| Cache hit rate (calcs) | 0% | > 40% | > 60% |
| Python modules integrated | 12/73 (16%) | 68/73 (93%) | 73/73 (100%) |
| Automated test coverage | 0% | > 60% | > 80% |

---

# ═══════════════════════════════════════════════════════════════════════
# QUICK RESUME
# ═══════════════════════════════════════════════════════════════════════

```
UNIFIED ROADMAP v8.0
====================

STRATEGY: Wire 61 unwired Python modules → dev infrastructure first
          Defer all manufacturing features to Phase M

DEV PHASES (D1-D9): 70 items, ~35,589 lines
  D1: Session Resilience    — 7 modules, 3,956L  ✅ COMPLETE
  D2: Context Intelligence  — 9 modules, 3,676L  ✅ COMPLETE
  D3: Learning & Patterns   — 6 modules, 2,660L  ← NEXT
  D4: Performance & Caching — 7 modules, 4,285L
  D5: Session Orchestration  — 9 modules, 5,203L
  D6: Code Intelligence     — 5 modules, 3,509L
  D7: Append-Only State     — Build from spec, ~800L
  D8: Test Infrastructure   — Build new, ~1,500L
  D9: Remaining Modules     — 25 modules, ~10,000L

MFG PHASES (M1-M12): 88 features, ~158,000 lines — DEFERRED
  M1: Monolith Intelligence (27K lines domain knowledge)
  M2: Cutting Tools DB (9,500 tools)
  M3: Tool Holder v2 (85-param)
  M4: Post Processor (12+ controllers)
  M5: Process Planning (NOVEL AI)
  M6: Speed/Feed Enhancement
  M7: Safety Expansions
  M8: Business Intelligence
  M9: Calculation Engines
  M10: Novel Fusions
  M11: Integration
  M12: Reporting

ESTIMATED: 10-12 sessions for D-phases, 65-80 for M-phases
NEXT SESSION: D1 — Wire wip_capturer + graceful_shutdown + state_rollback
```

---

**MAKE THE BUILDER BETTER. THEN BUILD EVERYTHING ELSE.**
