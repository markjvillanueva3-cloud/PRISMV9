# PHASE H1: EXECUTION PLAN (v3 — GROUND-TRUTH AUDIT)
## Based on actual file inspection, not assumptions
## Status: READY TO EXECUTE

---

## GROUND-TRUTH FINDINGS

### What's ACTUALLY being written (fresh):
| File | Fresh? | Content Quality | Lines |
|------|--------|----------------|-------|
| RECENT_ACTIONS.json | ✅ 12min | Good — seq, ts, tool, action, params, success, duration, result_preview | 127 |
| SESSION_JOURNAL.jsonl | ✅ 13min | Basic — ts, call, tool, action, params_hint (no outcome!) | 139 |
| ERROR_LOG.jsonl | ✅ 42min | Good — id, ts, error_message, tool_name, action, error_type, domain, params | 118 |
| RECOVERY_MANIFEST.json | ⚠️ 44min | Stale phase ("R1-MS6-prep"), stale next_action | 36 |

### What's DEAD (not written this session):
| File | Last Written | Status |
|------|-------------|--------|
| DECISION_LOG.jsonl | 18 days ago | **EMPTY — 0 lines. Never been used.** |
| LEARNING_LOG.jsonl | 2hrs ago | 3 lines — minimal use |
| checkpoint_index.json | 17 days ago | Points to Feb 2 checkpoints |
| lkg_state.json | 10 days ago | Stale |
| MemGraph memory/ | 15 days ago | **cold/hot/warm directories = 0KB** |

### What's ACTUALLY being captured at boot (devDispatcher session_boot):
1. CURRENT_STATE.json → quick_resume, session, phase
2. ACTION_TRACKER.md → completed/pending counts, next items
3. PRIORITY_ROADMAP.md → total items, next
4. warm_start data → registry status, recent errors, top failures  
5. RECENT_ACTIONS.json → last 5 actions
6. RECOVERY_MANIFEST.json → position, task, files
7. HANDOFF_PACKAGE.json → cross-session resume
8. COMPACTION_SURVIVAL.json → survival data

### Critical Discovery: MemGraph memory files are EMPTY
The MemGraph engine has 412 nodes in-memory but the disk persistence (cold/hot/warm) is **0 bytes**. This means MemGraph data is LOST on every restart. captureDispatch() works in-session but nothing survives.

### Critical Discovery: autoCheckpoint writes to CURRENT_STATE.json, NOT checkpoint files
The cadence autoCheckpoint at call 10 updates CURRENT_STATE.json with a checkpoint ID and zone. It does NOT write to the checkpoints/ directory. The checkpoint files in checkpoints/ are from Jan 30-Feb 2 (manual, old system).

### Critical Discovery: DECISION_LOG.jsonl has NEVER been written to
prism_guard:decision_log action exists but has literally never been called in production. 0 lines.

---

## REVISED EXECUTION PLAN

### MS1: FIX WHAT'S BROKEN + WIRE READS (Sonnet, ~40min)
**Role:** Systems Integration Engineer
**Effort:** 75 (medium-high — careful wiring, no new architecture)

**H1-1: Fix MemGraph persistence** [CRITICAL — data loss on every restart]
- MemGraph has nodes in-memory but memory/ files are 0KB
- Investigate: is saveCheckpoint() being called? Is WAL flushing?
- Fix: ensure MemGraph writes to disk on shutdown and periodically
- Verify: restart server, check memory/ files have data
- **Without this, all MemGraph-dependent features are session-only**

**H1-2: Fix RECOVERY_MANIFEST freshness**
- Currently 44min stale with wrong phase ("R1-MS6-prep")
- autoRecoveryManifest fires at call 5 intervals but isn't capturing accurate data
- Fix: update manifest writer to read ACTION_TRACKER.md for real phase
- Fix: include last 5 RECENT_ACTIONS entries in manifest

**H1-3: Wire boot to read RECENT_ACTIONS properly**
- session_boot already reads RECENT_ACTIONS but buries it in result
- Promote to top-level in boot response:
  ```
  recent_activity: [last 5 actions with outcomes]
  ```
- Move warm_start, handoff, roadmap reads to on-demand (not boot)

**H1-4: Slim boot response to ≤400 tokens**
- Current boot response includes everything → ~800 tokens
- Priority 1: RECOVERY_MANIFEST (position + next_action) → 100 tokens
- Priority 2: RECENT_ACTIONS (last 5) → 150 tokens  
- Priority 3: ACTION_TRACKER pending items → 100 tokens
- Priority 4: PFP top failures (if any) → 50 tokens
- Everything else: remove from boot, available via dedicated queries

**H1-5: Auto-HOT_RESUME from RECENT_ACTIONS**
- Every 5th call (aligned with todo cadence in autoHookWrapper line 1119):
  - Read RECENT_ACTIONS.json
  - Read RECOVERY_MANIFEST.json
  - Generate HOT_RESUME.md: position + last 10 actions + errors
- Replace current manual HOT_RESUME writes

### Validation:
- [ ] MemGraph persists to disk, survives restart
- [ ] RECOVERY_MANIFEST has correct phase within 5 calls
- [ ] Boot response ≤400 tokens with actionable content
- [ ] HOT_RESUME auto-generates every 5th call

---

### MS2: PARAM NORMALIZATION (Sonnet, ~20min)
**Role:** API Contract Engineer
**Effort:** 65 (focused, well-scoped)

**H1-6: Add snake_case aliases to KNOWN_RENAMES**
- In guardDispatcher.ts, add to existing KNOWN_RENAMES:
  ```typescript
  // Safety/Calc snake_case → camelCase
  "tool_diameter": "toolDiameter",
  "feed_per_tooth": "feedPerTooth",
  "axial_depth": "axialDepth", 
  "radial_depth": "radialDepth",
  "cutting_speed": "cuttingSpeed",
  "spindle_speed": "spindleSpeed",
  "num_flutes": "numberOfFlutes",
  "tool_material": "toolMaterial",
  "stick_out": "stickout",
  "feed_rate": "feedRate",
  "feed_per_rev": "feedPerRev",
  "point_angle": "pointAngle",
  "thread_type": "threadType",
  "tap_drill": "tapDrill",
  ```

**H1-7: Wire auto-normalization into safety/calc dispatchers**
- Before handler call: iterate params, remap any matching KNOWN_RENAMES
- This is a 10-line utility function applied in 3 dispatchers
- Log remapped params to ERROR_LOG.jsonl as type="param_remap" (reuse existing)

### Validation:
- [ ] check_chip_load_limits works with snake_case params
- [ ] check_spindle_power works with snake_case params
- [ ] Remaps logged to ERROR_LOG

---

### MS3: BOOT SMOKE TESTS + BUILD VERIFY (Sonnet, ~20min)
**Role:** Quality Assurance Engineer  
**Effort:** 60 (straightforward implementation)

**H1-8: smokeTest.ts — engine-level canary tests**
- Import engines directly (not through dispatchers):
  ```typescript
  import { SpeedFeedEngine } from "../engines/SpeedFeedEngine.js";
  import { materialRegistry } from "../registries/MaterialRegistry.js";
  // etc.
  ```
- 5 tests, each try/catch, ≤2 sec timeout:
  1. SpeedFeedEngine.calculate() → Vc > 0
  2. ThreadEngine.calculateTapDrill() → drillSize > 0
  3. ToolpathEngine.selectStrategy() → strategy.id exists
  4. materialRegistry.get("AS-4140-ANNEALED") → params count ≥ 100
  5. KnowledgeQueryEngine.getStats() → total > 25000
- Return: {passed, failed, total_ms, failures[]}

**H1-9: Wire into index.ts startup**
- After `server.connect(transport)`:
  ```typescript
  runSmokeTests().then(r => log.info(`[SMOKE] ${r.passed}/${r.passed+r.failed} (${r.total_ms}ms)`));
  ```
- Write result to RECENT_ACTIONS as entry type="smoke_test"
- Never blocks startup

**H1-10: verify-build.ps1**
- Post-build checks:
  - dist/index.js exists, 3.5-4.5MB
  - Contains: pfpBlocked, unifiedSearch, slimCadence, getCadenceVerbosity, smokeTest
  - Does NOT contain: formulaRegistry.search( (known bug pattern)
- Run after every build: `node_modules/.bin/esbuild ... && powershell scripts/verify-build.ps1`

### Validation:
- [ ] Startup log shows `[SMOKE] 5/5 passed`
- [ ] Build script runs verify-build.ps1 automatically
- [ ] Failed smoke test logs which subsystem is broken

---

### MS4: CROSS-SESSION LEARNING (Sonnet impl + Opus review, ~30min)
**Role:** Intelligence Architect (Opus design) + Systems Engineer (Sonnet impl)
**Effort:** 80 (schema changes, multiple touchpoints)

**H1-11: Add outcome to MemGraph.captureDispatch()**
- Current captureDispatch() signature captures tool, action, params, session
- Add: outcome ("success"|"error"), duration_ms, error_message?, key_finding
- key_finding = first 80 chars of result text OR error message
- This makes every MemGraph node a complete observation record

**H1-12: Activate decision_log writes**  
- DECISION_LOG.jsonl exists but has 0 entries — the write path is dead
- Find prism_guard:decision_log handler → verify it actually writes
- Wire auto-decision capture into:
  - toolpath:strategy_select → log chosen + alternatives array
  - calc:speed_feed → log material + params + S(x) result
  - session:state_save → log what state was saved
- Schema: {ts, session, decision_type, chosen, alternatives[], context, outcome?}

**H1-13: Error→Fix tracking in LEARNING_LOG**
- LEARNING_LOG exists with 3 entries — underutilized
- Add entry type "error_fix_pair":
  ```json
  {
    "type": "error_fix",
    "error_signature": "Cannot read 'toLowerCase' of undefined",
    "dispatcher": "prism_knowledge", 
    "action": "search",
    "fix": "String(m.controller||'').toLowerCase()",
    "file": "knowledgeQueryEngine.ts:537",
    "session": "U0-D"
  }
  ```
- On boot: search LEARNING_LOG for recent fixes → inject as "known fixes"

**H1-14: Boot learning injection**
- After MS1 boot slim:
  - Add: last 3 LEARNING_LOG entries matching current context → ≤100 tokens
  - Add: MemGraph decision nodes for current phase (if persistence fixed) → ≤100 tokens
- Total boot learning budget: ≤200 tokens additional

### Validation:
- [ ] MemGraph nodes have outcome + duration fields
- [ ] DECISION_LOG.jsonl grows with strategy_select calls
- [ ] LEARNING_LOG has error_fix entries
- [ ] Boot includes learned context

---

### MS5: COMPACTION DEFENSE (Sonnet, ~20min)
**Role:** Reliability Engineer
**Effort:** 65 (fix existing, not build new)

**H1-15: Fix autoCheckpoint to write real checkpoints**
- Current autoCheckpoint (cadenceExecutor.ts:136) only updates CURRENT_STATE.json
- It does NOT write to checkpoints/ directory (those are from old Python system)
- Fix: write a proper checkpoint file: {position, task, recent_actions, pending_todos, decisions}
- Location: C:\PRISM\state\checkpoints\CP-{timestamp}.json

**H1-16: Milestone-triggered checkpoints**  
- Add checkpoint trigger points:
  - Build success (gsd_sync fires)
  - Phase gate passed (workflow_complete)
  - After every 10th call (keep existing cadence)
- Checkpoint = slimmed RECOVERY_MANIFEST + last 10 RECENT_ACTIONS

**H1-17: Compaction recovery reads checkpoint**
- In autoHookWrapper.ts compaction detection (line ~1748):
  - Read latest checkpoint from checkpoints/ directory
  - Read last 5 RECENT_ACTIONS
  - Generate recovery context: ≤300 tokens
  - Replaces reading HOT_RESUME.md + COMPACTION_SURVIVAL.json
- HOT_RESUME.md becomes auto-generated FROM checkpoint (not recovery source)

### Validation:
- [ ] checkpoints/ has files newer than today
- [ ] autoCheckpoint writes to checkpoints/ directory
- [ ] Compaction recovery reads latest checkpoint
- [ ] Recovery completes in ≤2 calls (measured)

---

## EXECUTION SEQUENCE + MODEL/ROLE ASSIGNMENTS

```
┌─────────────────────────────────────────────────────────────┐
│ MS1: Fix & Wire (Sonnet, Systems Engineer, effort=75)       │
│  H1-1: MemGraph persistence fix [CRITICAL]                  │
│  H1-2: RECOVERY_MANIFEST freshness                          │
│  H1-3: Boot reads RECENT_ACTIONS properly                   │
│  H1-4: Slim boot to ≤400 tokens                            │
│  H1-5: Auto-HOT_RESUME                                      │
├──────────────────────┬──────────────────────────────────────┤
│ MS2: Params (Sonnet) │ MS3: Smoke Tests (Sonnet)            │
│ effort=65            │ effort=60                             │
│ H1-6: KNOWN_RENAMES  │ H1-8: smokeTest.ts                   │
│ H1-7: auto-normalize │ H1-9: startup wire                   │
│                      │ H1-10: verify-build.ps1              │
├──────────────────────┴──────────────────────────────────────┤
│ MS4: Learning (Opus review + Sonnet impl, effort=80)        │
│  H1-11: MemGraph outcome fields                             │
│  H1-12: Activate decision_log                                │
│  H1-13: Error→fix in LEARNING_LOG                           │
│  H1-14: Boot learning injection                              │
├─────────────────────────────────────────────────────────────┤
│ MS5: Compaction (Sonnet, Reliability, effort=65)            │
│  H1-15: Fix autoCheckpoint                                   │
│  H1-16: Milestone triggers                                   │
│  H1-17: Recovery reads checkpoint                            │
└─────────────────────────────────────────────────────────────┘
```

## FILES MODIFIED (no new engines, no new JSONL)

| File | Changes | MS |
|------|---------|-----|
| MemoryGraphEngine.ts | Fix persistence, add outcome to captureDispatch | MS1, MS4 |
| devDispatcher.ts | Slim boot, add learning injection | MS1, MS4 |
| autoHookWrapper.ts | Auto-HOT_RESUME, recovery reads checkpoint | MS1, MS5 |
| cadenceExecutor.ts | Fix autoCheckpoint to write files | MS5 |
| guardDispatcher.ts | Add snake_case KNOWN_RENAMES | MS2 |
| safetyDispatcher.ts | Wire param normalization | MS2 |
| calcDispatcher.ts | Wire param normalization | MS2 |
| threadDispatcher.ts | Wire param normalization | MS2 |

**New files:** 2 only
| File | Purpose | MS |
|------|---------|-----|
| src/utils/smokeTest.ts | Boot-time canary tests | MS3 |
| scripts/verify-build.ps1 | Post-build verification | MS3 |

## UTILIZATION + INDEXING CHECKLIST

Every data path must have both a WRITE and a READ:

| Data | Write By | Read By | Indexed Via |
|------|----------|---------|-------------|
| RECENT_ACTIONS | autoHookWrapper (every call) | session_boot, auto-HOT_RESUME, recovery | prism_session:memory_recall |
| MemGraph nodes | captureDispatch (every call) | session_boot, find_similar | prism_memory:find_similar |
| ERROR_LOG | autoD3ErrorChain | PFP pre-filter, boot warnings | prism_guard:failure_library |
| LEARNING_LOG | D3 learning + error_fix writes | boot injection, fix queries | prism_guard:learning_query |
| DECISION_LOG | strategy_select, speed_feed auto-log | boot context, trace_decision | prism_guard:decision_log |
| Checkpoints | autoCheckpoint + milestone events | compaction recovery | prism_session:state_load |
| RECOVERY_MANIFEST | cadence every 5 calls | boot, auto-HOT_RESUME | prism_gsd:quick_resume |
| Smoke test results | startup | RECENT_ACTIONS entry | prism_telemetry |
| HOT_RESUME.md | auto-generated from above | compaction recovery (fallback) | DC read_file |
| Param remaps | auto-normalize on dispatch | ERROR_LOG as type=param_remap | prism_guard:error_capture |

**Zero dead-end writes. Every system both produces AND consumes.**
