# Feature Cascade Protocol — Implementation Checklist

## Overview
This checklist maps the Feature Cascade Protocol design (FEATURE_CASCADE_PROTOCOL.md) to concrete implementation tasks with success criteria, file paths, and session ownership.

**Protocol Author**: AI Code Review Agent (LOOP 2 — Deep Scrutiny)  
**Design Date**: 2026-03-31  
**Rollout Starts**: Session 0-D-8  
**Full Production**: Session 1-2  

---

## Phase 1: Core Infrastructure (Session 0-D-8)

### Task 1: SESSION_ARTIFACTS.json Schema & Template
- [ ] Create `.taskmaster/reports/SESSION_ARTIFACTS.json` (empty template)
- [ ] Schema matches FEATURE_CASCADE_PROTOCOL.md Section 1
- [ ] Includes fields: session_id, timestamp, agent, machine, roadmap_position, units_completed, artifacts (engines/hooks/actions/skills/registries/tribal_knowledge/constants), quality_metrics, dependencies, downstream_opportunities
- [ ] Validation: jq schema must parse without errors
- [ ] Success: File exists, example structure valid

**File**: `H:\prism\.taskmaster\reports\SESSION_ARTIFACTS.json`

```json
{
  "session_id": "",
  "timestamp": "",
  "agent": "",
  "machine": "",
  "roadmap_position": "",
  "units_completed": [],
  "artifacts": {
    "engines": [],
    "hooks": [],
    "actions": [],
    "skills": [],
    "registries": [],
    "tribal_knowledge": [],
    "constants": []
  },
  "quality_metrics": {
    "wiring_completeness": 0,
    "test_coverage": 0,
    "physics_validation": "",
    "code_review_status": "",
    "all_linting_passed": false
  },
  "dependencies": [],
  "downstream_opportunities": []
}
```

---

### Task 2: FEATURE_AVAILABILITY_TIMELINE.md Creation
- [ ] Create `.taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md`
- [ ] Initialize with markdown table header:
  ```
  | Session | Date | Feature Type | Name | Status | Test Count | Coverage | Consumer Ready |
  |---------|------|--------------|------|--------|-----------|----------|----------------|
  ```
- [ ] Add 5-10 example rows from existing sessions (0-A-1, 0-B-3, etc.) to establish baseline
- [ ] Success: File is append-only, no rewrites, rows parseable by Node.js

**File**: `H:\prism\.taskmaster\reports\FEATURE_AVAILABILITY_TIMELINE.md`

---

### Task 3: Append Script — append-feature-timeline.mjs
- [ ] Create `.taskmaster/scripts/append-feature-timeline.mjs`
- [ ] Input: SESSION_ARTIFACTS.json (current session)
- [ ] Output: Append one row per artifact to FEATURE_AVAILABILITY_TIMELINE.md
- [ ] Logic:
  - For each engine in artifacts.engines: append row with [session_id, timestamp, "Engine", name, "wired", test_count, coverage, "yes"]
  - For each hook: append row with [session_id, timestamp, "Hook", name, "active", n/a, n/a, "yes"]
  - For each action: append row with [session_id, timestamp, "Action", name, "wired", test_count, coverage, "yes"]
  - For each skill: append row with [session_id, timestamp, "Skill", name, "ready", n/a, n/a, "yes"]
  - For each registry: append row with [session_id, timestamp, "Registry", name, "indexed", n/a, n/a, "yes"]
  - For each tribal knowledge item: append row with [session_id, timestamp, "Tribal Tip", tip_id, "added", n/a, n/a, "yes"]
  - For each constant: append row with [session_id, timestamp, "Constant", constant_id, "canonical", n/a, n/a, "yes"]
- [ ] Error handling: Validate JSON before reading, log to `.taskmaster/logs/append-feature-timeline.log`
- [ ] Success: Script runs without error, timeline appended with correct data

**File**: `H:\prism\.taskmaster\scripts\append-feature-timeline.mjs`

---

### Task 4: Physics Constant Validator — validate-physics-constants.mjs
- [ ] Create `.taskmaster/scripts/validate-physics-constants.mjs`
- [ ] Input: src/physics/constants.ts (canonical source of truth)
- [ ] Output: `.taskmaster/reports/CONSTANTS_VALIDATION.json` with structure:
  ```json
  {
    "validation_timestamp": "",
    "canonical_file": "src/physics/constants.ts",
    "total_constants": 0,
    "validated": 0,
    "violations": [
      { "constant_id": "", "violation": "inline_usage_found", "location": ["file:line"] }
    ],
    "status": "passed|failed"
  }
  ```
- [ ] Logic:
  - Parse src/physics/constants.ts, extract all `const CONST_NAME = value` definitions
  - Grep entire codebase (excluding constants.ts itself) for inline constant usage (magic numbers matching canonical values)
  - Flag violations with file:line locations
- [ ] Success: Report created, violations = 0 or < 5, status = "passed"

**File**: `H:\prism\.taskmaster\scripts\validate-physics-constants.mjs`

---

### Task 5: Engine Index Verification — verify-engine-index.mjs
- [ ] Create `.taskmaster/scripts/verify-engine-index.mjs`
- [ ] Input: All engine files in src/engines/
- [ ] Output: `.taskmaster/reports/ENGINE_INDEX_VERIFICATION.json`
  ```json
  {
    "verification_timestamp": "",
    "total_engines": 0,
    "in_index": 0,
    "orphaned_engines": [],
    "phantom_dispatchers": [],
    "wiring_gaps": [
      { "engine_name": "", "expected_dispatcher": "", "actually_wired_to": "" }
    ],
    "status": "passed|failed",
    "error_count": 0
  }
  ```
- [ ] Logic:
  - Crawl src/engines/, count .ts files (= total_engines)
  - Check ENGINE_DIGEST.md and MASTER_INDEX_COMPACT.md for each engine (= in_index)
  - List any engine files not in either index (= orphaned_engines)
  - For each engine, verify it's wired to at least one dispatcher (check src/dispatchers/)
  - List any wiring gaps
- [ ] Success: error_count = 0, orphaned_engines = [], wiring_gaps = []

**File**: `H:\prism\.taskmaster\scripts\verify-engine-index.mjs`

---

### Task 6: HANDOFF.md Template Extension
- [ ] Update `state/HANDOFF.md` template with NEW_ARTIFACTS section
- [ ] Add after ## STATE:
  ```markdown
  ## NEW_ARTIFACTS
  
  ### Engines Created
  - [list with line count, test count, coverage]
  
  ### Hooks Activated
  - [list]
  
  ### Actions Wired
  - [list]
  
  ### Tribal Knowledge Added
  - [list with confidence scores]
  
  ### Constants Canonicalized
  - [list with formula_id references]
  
  ### Quality Metrics
  - Physics validation: passed|failed
  - Test coverage: [%]
  - All linting: passed|failed
  - Code review: approved|changes_requested
  ```
- [ ] Add pre-work checklist items:
  ```markdown
  **Pre-work checklist**:
  - [ ] Run smart-config-refresh.sh (load new features)
  - [ ] Review KNOWLEDGE_INJECTION_SUMMARY.md
  - [ ] Confirm ENGINE_INDEX_VERIFICATION.json shows 0 errors
  ```
- [ ] Success: Template updated, example filled out correctly

**File**: `H:\prism\state\HANDOFF.md` (template section)

---

### Task 7: Post-Compact Hook Extension
- [ ] Extend `.claude/hooks/lib/post-compact.sh` to call:
  ```bash
  # After existing compact logic:
  node .taskmaster/scripts/append-feature-timeline.mjs
  node .taskmaster/scripts/validate-physics-constants.mjs \
    src/physics/constants.ts \
    --report=.taskmaster/reports/CONSTANTS_VALIDATION.json
  node .taskmaster/scripts/verify-engine-index.mjs \
    --report=.taskmaster/reports/ENGINE_INDEX_VERIFICATION.json
  
  # Log results
  echo "[post-compact] Feature cascade infrastructure updated" >> .claude/hooks/logs/post-compact.log
  ```
- [ ] Success: Hook executes without error, log entries appear

**File**: `.claude/hooks/lib/post-compact.sh`

---

## Phase 2: Smart Config Refresh (Session 1-1)

### Task 8: smart-config.json Creation
- [ ] Create `.taskmaster/config/smart-config.json`
- [ ] Schema matches FEATURE_CASCADE_PROTOCOL.md Section 3
- [ ] Default settings: load_available_features=true, refresh_interval_sessions=1, all validators enabled
- [ ] Success: File parses, jq query succeeds

**File**: `H:\prism\.taskmaster\config\smart-config.json`

---

### Task 9: Generation Script — generate-knowledge-injection.mjs
- [ ] Create `.taskmaster/scripts/generate-knowledge-injection.mjs`
- [ ] Input: FEATURE_AVAILABILITY_TIMELINE.md (last 50 rows), SVI.json (latest metrics)
- [ ] Output: `.taskmaster/reports/KNOWLEDGE_INJECTION_SUMMARY.md`
  ```markdown
  # Knowledge Injection Summary
  
  **Generated**: [timestamp]
  **Since Last Session**: [session_id]
  
  ## New Engines (Production-Ready)
  - Name (session): description
    Tests: X/X passing, coverage Y%
    Ready for: [list of pipelines/engines that can consume]
  
  ## New Hooks (Active)
  - Name: trigger conditions
    Auto-fixes: [yes/no]
  
  ## New Skills
  - /skill-name: description
  
  ## New Tribal Knowledge
  - TK-ID: content (confidence: X%)
  
  ## New Constants
  - CONST_ID = value (formula_id: F-XX-XXX)
  
  ## Capability Improvements
  - [Psi/metric improvements from SVI.json]
  
  ## Recommended Action
  Review above features and use in your unit as appropriate.
  Cross-reference in your session prompts.
  ```
- [ ] Success: File generated, markdown renders correctly, all features listed

**File**: `H:\prism\.taskmaster\scripts\generate-knowledge-injection.mjs`

---

### Task 10: Smart Config Refresh Shell Script
- [ ] Create `.taskmaster/scripts/smart-config-refresh.sh`
- [ ] Logic:
  - Read `.taskmaster/config/smart-config.json` (load_available_features = true?)
  - If yes, call generate-knowledge-injection.mjs
  - Verify ENGINE_INDEX_VERIFICATION.json (should be from prior session's post-compact)
  - Verify CONSTANTS_VALIDATION.json
  - Log results to `.claude/hooks/logs/smart-config-refresh.log`
- [ ] Success: Script runs < 2 seconds, all files updated

**File**: `H:\prism\.taskmaster\scripts\smart-config-refresh.sh`

---

### Task 11: Session-Start Hook Extension
- [ ] Create/extend `.claude/hooks/lib/session-start.sh` to call:
  ```bash
  # At session initialization:
  bash .taskmaster/scripts/smart-config-refresh.sh
  
  # Inject into session context:
  echo "## SMART_CONFIG: Available Features"
  cat .taskmaster/reports/KNOWLEDGE_INJECTION_SUMMARY.md
  ```
- [ ] Hook runs automatically when session starts
- [ ] Success: KNOWLEDGE_INJECTION_SUMMARY.md injected into every new session context

**File**: `.claude/hooks/lib/session-start.sh`

---

### Task 12: Consumption Detection — detect-feature-consumption.mjs
- [ ] Create `.taskmaster/scripts/detect-feature-consumption.mjs`
- [ ] Input: 
  - Current session ID (e.g., "1-1")
  - Prior session ID to compare against (e.g., "0-D-8")
  - Session code changes (from git diff)
- [ ] Output: `.taskmaster/reports/FEATURE_CONSUMPTION_THIS_SESSION.json`
  ```json
  {
    "session_id": "1-1",
    "detection_timestamp": "",
    "features_consumed": [
      {
        "feature_name": "BurnishingPolishingEngine",
        "created_in_session": "0-D-7",
        "consumption_type": "import|function_call|via_skill",
        "files_affected": ["file:line"],
        "unit_where_used": "U-POST2"
      }
    ],
    "adoption_count": 0
  }
  ```
- [ ] Logic:
  - Read SESSION_ARTIFACTS.json from prior session
  - Search current session code for imports/calls to engines/skills/actions listed in prior artifacts
  - Report matches with file:line locations
- [ ] Success: File generated, adoption_count matches actual usage

**File**: `H:\prism\.taskmaster\scripts\detect-feature-consumption.mjs`

---

### Task 13: FEATURE_CONSUMER_TRACKER.json Creation
- [ ] Create `.taskmaster/reports/FEATURE_CONSUMER_TRACKER.json`
- [ ] Schema matches FEATURE_CASCADE_PROTOCOL.md Section 5
- [ ] Populate with all known features from Sessions 0-A through 0-D (bootstrap from prior session artifacts)
- [ ] For each feature:
  - consumption_count = 0 initially
  - sessions_consuming = [] initially
  - first_consumed_in_session = null until detection run finds usage
- [ ] Success: File created, all pre-0D-8 features listed

**File**: `H:\prism\.taskmaster\reports\FEATURE_CONSUMER_TRACKER.json`

---

### Task 14: Post-Review Integration
- [ ] Update post-review hook to call:
  ```bash
  node .taskmaster/scripts/detect-feature-consumption.mjs \
    --session=${CURRENT_SESSION} \
    --since=${PREV_SESSION} \
    --output=.taskmaster/reports/FEATURE_CONSUMPTION_THIS_SESSION.json
  ```
- [ ] Merge FEATURE_CONSUMPTION_THIS_SESSION.json into FEATURE_CONSUMER_TRACKER.json:
  - For each feature in consumption report, increment consumption_count
  - Add current session to sessions_consuming array
  - Update first_consumed_in_session if null
- [ ] Success: Tracker updated, adoption velocity calculated

**File**: `.claude/hooks/lib/post-review.sh` (extend)

---

## Phase 3: Validation & Gate Integration (Session 1-2)

### Task 15: Pre-Review Gate Extension
- [ ] Extend `review-gate.sh` with physics-constant checks:
  ```bash
  # Check 1: Verify all new constants are in src/physics/constants.ts
  node .taskmaster/scripts/validate-physics-constants.mjs \
    src/physics/constants.ts \
    --fail-on-violations
  
  # Check 2: Verify all new engines are in ENGINE_DIGEST.md
  node .taskmaster/scripts/verify-engine-index.mjs \
    --fail-on-orphans
  ```
- [ ] Gate fails if violations or orphans detected
- [ ] Gate passes if checks succeed
- [ ] Success: Review can't proceed without valid constants/wiring

**File**: `.claude/hooks/lib/review-gate.sh`

---

### Task 16: Wiring Completeness Validator
- [ ] Create `.taskmaster/scripts/validate-wiring-completeness.mjs`
- [ ] Input: New engines from SESSION_ARTIFACTS.json
- [ ] Output: `.taskmaster/reports/WIRING_COMPLETENESS_CHECK.json`
  ```json
  {
    "validation_timestamp": "",
    "engines_checked": 0,
    "fully_wired": 0,
    "issues": [
      {
        "engine_name": "",
        "issue": "not_in_dispatcher|no_action_schema|orphaned",
        "severity": "critical|high|medium"
      }
    ],
    "overall_status": "complete|incomplete"
  }
  ```
- [ ] Logic:
  - For each new engine: verify it has corresponding dispatcher action
  - Verify action has input_schema and output_schema
  - Verify action is listed in dispatcher schema file
- [ ] Success: overall_status = "complete"

**File**: `H:\prism\.taskmaster\scripts\validate-wiring-completeness.mjs`

---

### Task 17: Test Coverage Checker
- [ ] Create `.taskmaster/scripts/check-artifact-test-coverage.mjs`
- [ ] Input: SESSION_ARTIFACTS.json
- [ ] Output: Report to stdout with pass/fail per artifact
  ```
  Engine BurnishingPolishingEngine: 12/12 tests passing, coverage 0.92 ✓
  Engine ForgeWeldingEngine: 8/12 tests passing ✗ (needs 12 passing)
  Hook physics-constant-validator: no explicit tests (n/a)
  Skill /burnish-predict: 3 examples verified ✓
  ```
- [ ] Success: All engines with tests pass, coverage >= 0.90

**File**: `H:\prism\.taskmaster\scripts\check-artifact-test-coverage.mjs`

---

### Task 18: Protocol Documentation Update
- [ ] Update BUILDING_TOOLKIT section in CAMX-RESTRUCTURED-ROADMAP-v24.md with:
  ```
  ### When SESSION COMPLETES (every session):
    /compact (triggers post-compact hook automatically)
      → append-feature-timeline.mjs appends new features to FEATURE_AVAILABILITY_TIMELINE.md
      → validate-physics-constants.mjs creates CONSTANTS_VALIDATION.json
      → verify-engine-index.mjs creates ENGINE_INDEX_VERIFICATION.json
    
    Result: NEW_ARTIFACTS section in HANDOFF.md auto-filled
    
  ### When NEW SESSION STARTS (before any work):
    session-start hook automatically runs smart-config-refresh.sh
      → generate-knowledge-injection.mjs creates KNOWLEDGE_INJECTION_SUMMARY.md
      → Injects into session context: "## SMART_CONFIG: Available Features"
    
    Action: Review KNOWLEDGE_INJECTION_SUMMARY.md, cite new features in your unit prompts
  ```
- [ ] Success: Documentation updated, protocol visible to next session

**File**: `H:\prism\CAMX-RESTRUCTURED-ROADMAP-v24.md` (BUILDING TOOLKIT section)

---

## Phase 4: Full Production Integration (Session 1-3+)

### Task 19: Circular Dependency Detector (Optional, Post-Production)
- [ ] Create `.taskmaster/scripts/detect-circular-dependencies.mjs`
- [ ] Input: ENGINE_DIGEST.md, dependency graph
- [ ] Output: Alert if engine A depends on B and B depends on A
- [ ] Success: No circular dependencies detected

---

### Task 20: Stale Feature Deprecation (Optional, Post-Production)
- [ ] Extend FEATURE_CONSUMER_TRACKER.json with deprecation logic:
  - If feature unused after 5 sessions, flag for review
  - If feature superseded by newer feature, mark obsolete
- [ ] Success: Quarterly cleanup of unused features

---

## Success Criteria — Full Cascade Operational

| Criterion | Target | Measure By |
|-----------|--------|-----------|
| SESSION_ARTIFACTS.json generated at every /compact | 100% | Handoff audit: 10/10 sessions |
| FEATURE_AVAILABILITY_TIMELINE.md contains >= 20 features | yes | Line count >= 30 |
| KNOWLEDGE_INJECTION_SUMMARY.md auto-generated at session start | 100% | Present in session context, 5/5 sessions |
| New features first consumed within 2 sessions | 80%+ | FEATURE_CONSUMER_TRACKER.json adoption_rate |
| Zero physics constant violations in review gate | 100% | review-gate.sh passes, CONSTANTS_VALIDATION errors = 0 |
| Zero orphaned engines post-review | 100% | ENGINE_INDEX_VERIFICATION.json orphaned_engines = [] |
| Feature cascade reduces rediscovery time by 50%+ | yes | Session N unit descriptions cite Session N-2 features |

---

## Rollout Checklist

### Session 0-D-8 (Phase 1)
- [ ] Tasks 1-7 complete
- [ ] Post-compact hook extended
- [ ] First SESSION_ARTIFACTS.json generated
- [ ] First row appended to FEATURE_AVAILABILITY_TIMELINE.md
- [ ] HANDOFF.md NEW_ARTIFACTS section populated

### Session 1-1 (Phase 2 Start)
- [ ] Receive smart-config-refresh output at session start
- [ ] Review KNOWLEDGE_INJECTION_SUMMARY.md
- [ ] Tasks 8-14 complete
- [ ] FEATURE_CONSUMER_TRACKER.json bootstrapped
- [ ] First consumption detection run

### Session 1-2 (Phase 2 Complete)
- [ ] Tasks 15-18 complete
- [ ] Pre-review gate enforces physics constants + wiring
- [ ] Wiring completeness validated
- [ ] Test coverage verified
- [ ] Full cascade tested end-to-end

### Session 1-3+ (Phase 3+)
- [ ] Protocol operating in steady state
- [ ] Adoption rate tracked
- [ ] Quarterly feature deprecation review (Task 20, optional)

---

## File Tree Summary

```
.taskmaster/
├── config/
│   └── smart-config.json                    [Task 8]
├── reports/
│   ├── SESSION_ARTIFACTS.json               [Task 1]
│   ├── FEATURE_AVAILABILITY_TIMELINE.md     [Task 2]
│   ├── CONSTANTS_VALIDATION.json            [created by Task 4]
│   ├── ENGINE_INDEX_VERIFICATION.json       [created by Task 5]
│   ├── KNOWLEDGE_INJECTION_SUMMARY.md       [created by Task 9]
│   ├── FEATURE_CONSUMER_TRACKER.json        [Task 13]
│   ├── FEATURE_CONSUMPTION_THIS_SESSION.json [created by Task 12]
│   ├── WIRING_COMPLETENESS_CHECK.json       [created by Task 16]
│   └── archive/
│       └── [old SESSION_ARTIFACTS archives]
└── scripts/
    ├── append-feature-timeline.mjs          [Task 3]
    ├── validate-physics-constants.mjs       [Task 4]
    ├── verify-engine-index.mjs              [Task 5]
    ├── generate-knowledge-injection.mjs     [Task 9]
    ├── smart-config-refresh.sh              [Task 10]
    ├── detect-feature-consumption.mjs       [Task 12]
    ├── validate-wiring-completeness.mjs     [Task 16]
    └── check-artifact-test-coverage.mjs     [Task 17]

.claude/hooks/lib/
├── post-compact.sh                          [extended Task 7]
├── session-start.sh                         [created Task 11]
├── post-review.sh                           [extended Task 14]
└── review-gate.sh                           [extended Task 15]

state/
└── HANDOFF.md                               [extended Task 6]

CAMX-RESTRUCTURED-ROADMAP-v24.md            [updated Task 18]
```

---

## Effort Estimate

| Phase | Tasks | Effort | Session | Status |
|-------|-------|--------|---------|--------|
| 1: Core | 1-7 | 3-4 hours | 0-D-8 | planning |
| 2: Smart Config | 8-14 | 4-5 hours | 1-1 | planning |
| 3: Validation | 15-18 | 2-3 hours | 1-2 | planning |
| 4: Production | 19-20 | optional | 1-3+ | planning |
| **TOTAL** | **20** | **9-12 hours** | **Across 3 sessions** | **Ready to execute** |

---

END OF IMPLEMENTATION CHECKLIST
