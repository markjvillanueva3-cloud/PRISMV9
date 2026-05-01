# Feature Cascade Protocol v1.0

**Purpose**: Enable Session N+1+ to automatically discover and leverage new engines, hooks, actions, skills, registries, and tribal knowledge created in prior sessions.

**Problem It Solves**:
- Session N builds a new engine/hook/action/skill
- Session N+1 doesn't know it exists (knowledge sources frozen at roadmap generation)
- 890+ hours of potential tool reuse waste
- Test counts in exit gates are static snapshots
- Capability conversions (PCCA/EIGC) don't propagate to dependent milestones
- SVI/Psi metrics computed but never used in exit gates

---

## 1. SESSION_ARTIFACTS.json — What Each Session Produces

**Location**: `.taskmaster/reports/SESSION_ARTIFACTS.json` (created at session end)

**Schema**:
```json
{
  "session_id": "0-D-7",
  "timestamp": "2026-03-31T14:22:00.000Z",
  "agent": "Claude",
  "machine": "DESKTOP-N7MI1VB",
  "roadmap_position": "Phase 0-D, Unit 7 of 9",
  "units_completed": [
    { "id": "U-PROC1", "title": "Registry Wire-Up: Material Physics Properties" }
  ],
  "artifacts": {
    "engines": [
      {
        "name": "BurnishingPolishingEngine",
        "file": "src/engines/finishing/BurnishingPolishingEngine.ts",
        "lines": 847,
        "purpose": "Predictive burnishing/polishing force & surface finish",
        "inputs": ["material_yield_mpa", "spindle_rpm", "tool_geometry"],
        "outputs": ["surface_roughness_ra_nm", "force_newtons", "burnishing_depth_mm"],
        "ready_for": ["PostProcessorPipelineEngine", "QualityPredictionEngine"],
        "tests": 12,
        "coverage": 0.92
      }
    ],
    "hooks": [
      {
        "name": "physics-constant-validator",
        "file": ".claude/hooks/lib/physics-constant-validator.sh",
        "triggered_on": ["pre-edit", "post-tool-use"],
        "purpose": "Ensures all inline constants match canonical src/physics/constants.ts",
        "blocks_if": "mismatch detected",
        "auto_fix": true
      }
    ],
    "actions": [
      {
        "name": "burnish_force_estimate",
        "engine": "BurnishingPolishingEngine",
        "dispatcher": "ManufacturingDispatcher",
        "input_schema": "schemas/BurnishForceInput.ts",
        "output_schema": "schemas/BurnishForceOutput.ts",
        "ready_for_wiring": true,
        "test_count": 12
      }
    ],
    "skills": [
      {
        "name": "/burnish-predict",
        "file": "mcp-server/docs/superpowers/skills/burnish-predict.md",
        "purpose": "Quick burnishing force/finish prediction without full pipeline",
        "triggers_engine": "BurnishingPolishingEngine",
        "dependencies": ["MaterialRegistry", "ToolRegistry"],
        "examples_count": 3
      }
    ],
    "registries": [
      {
        "name": "BurnishToolRegistry",
        "file": "src/registries/BurnishToolRegistry.ts",
        "entries": 342,
        "schema": "BurnishTool",
        "purpose": "Indexed burnishing & polishing tool geometry database"
      }
    ],
    "tribal_knowledge": [
      {
        "tip_id": "TK-1847",
        "category": "burnishing",
        "content": "Ball burnishing @ 60-80% of Fy yields best Ra for cast surfaces",
        "source": "Makino HC500 manual + Pentax shop floor notes",
        "confidence": 0.87
      }
    ],
    "constants": [
      {
        "constant_id": "BURNISH_WORK_HARDENING_FACTOR",
        "value": 1.15,
        "unit": "dimensionless",
        "source": "Klocke et al. 2009, equation 3.2",
        "formula_id": "F-KIN-0047"
      }
    ]
  },
  "quality_metrics": {
    "wiring_completeness": 1.0,
    "test_coverage": 0.92,
    "physics_validation": "passed",
    "code_review_status": "approved",
    "all_linting_passed": true
  },
  "dependencies": [
    { "depends_on_engine": "ToolRegistry", "wired": true },
    { "depends_on_registry": "MaterialRegistry", "wired": true }
  ],
  "downstream_opportunities": [
    "QualityPredictionEngine: can now use burnishing output for surface finish prediction",
    "PostProcessorPipelineEngine: add burnishing as secondary operation",
    "TribalKnowledgeEngine: 47+ existing burnishing tips now have physics grounding"
  ]
}
```

---

## 2. FEATURE_AVAILABILITY_TIMELINE.md — Cumulative Discovery Index

**Location**: `.taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md` (append-only log)

**Format** (markdown table, append to bottom):
```markdown
# Feature Availability Timeline

Auto-populated at session completion. One entry per session per feature type.

| Session | Date | Feature Type | Name | Status | Test Count | Coverage | Consumer Ready |
|---------|------|--------------|------|--------|-----------|----------|----------------|
| 0-A-1 | 2026-02-15 | Engine | MaterialPhysicsEngine | wired | 24 | 0.88 | yes |
| 0-A-2 | 2026-02-18 | Registry | ToolRegistry | verified | n/a | n/a | yes |
| 0-D-7 | 2026-03-31 | Engine | BurnishingPolishingEngine | wired | 12 | 0.92 | yes |
| 0-D-7 | 2026-03-31 | Hook | physics-constant-validator | active | n/a | n/a | yes |
| 0-D-7 | 2026-03-31 | Tribal Tip | TK-1847 | added | n/a | n/a | yes |
| 0-D-7 | 2026-03-31 | Constant | BURNISH_WORK_HARDENING_FACTOR | canonical | n/a | n/a | yes |
```

**Append Trigger**: Post-compact hook automatically runs:
```bash
node .taskmaster/scripts/append-feature-timeline.mjs \
  SESSION_ARTIFACTS.json \
  FEATURE_AVAILABILITY_TIMELINE.md
```

---

## 3. SMART_CONFIG_REFRESH — Mechanism for Session Startup

**File**: `.taskmaster/config/smart-config.json`

**Schema**:
```json
{
  "session_startup": {
    "load_available_features": true,
    "sources": [
      ".taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md",
      "state/shared/ROADMAP_COLLABORATION_STATE.md",
      "HANDOFF.md"
    ],
    "inject_into": ["SMART_CONFIG section of session context", "skill recommendations"],
    "auto_update_knowledge_sources": true
  },
  "knowledge_refresh": {
    "enabled": true,
    "refresh_interval_sessions": 1,
    "sources_to_check": [
      "FEATURE_AVAILABILITY_TIMELINE.md (new rows since last session)",
      "SVI.json (updated Psi metrics)",
      "ROADMAP_COLLABORATION_STATE.json (completion status)",
      "TASK_QUEUE.md (new actions available)"
    ]
  },
  "capability_detection": {
    "enabled": true,
    "check_for": [
      "new_engines_wired_in_last_session",
      "new_hooks_activated",
      "new_tribal_knowledge_available",
      "new_registries_indexed",
      "capability_conversions_pending"
    ],
    "emit_to": "KNOWLEDGE_INJECTION_SUMMARY.md"
  },
  "validation": {
    "verify_physics_constants_canonical": true,
    "verify_all_engines_in_index": true,
    "verify_skill_dependencies_resolved": true
  }
}
```

**Startup Script**: `.taskmaster/scripts/smart-config-refresh.sh`
```bash
#!/bin/bash
# Run at session start (called by session-initialization hook)

set -e

# 1. Read FEATURE_AVAILABILITY_TIMELINE, extract last N rows
tail -50 .taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md > /tmp/recent_features.md

# 2. Read SVI.json, extract latest Psi/capability scores
jq '.metrics.psi_latest' state/shared/SVI.json > /tmp/psi_latest.json

# 3. Generate KNOWLEDGE_INJECTION_SUMMARY.md
node .taskmaster/scripts/generate-knowledge-injection.mjs \
  /tmp/recent_features.md \
  /tmp/psi_latest.json \
  > .taskmaster/reports/KNOWLEDGE_INJECTION_SUMMARY.md

# 4. Validate physics constants
node .taskmaster/scripts/validate-physics-constants.mjs \
  src/physics/constants.ts \
  --report=.taskmaster/reports/CONSTANTS_VALIDATION.json

# 5. Verify all engines are indexed
node .taskmaster/scripts/verify-engine-index.mjs \
  --report=.taskmaster/reports/ENGINE_INDEX_VERIFICATION.json

echo "Smart config refresh complete."
echo "Review: .taskmaster/reports/KNOWLEDGE_INJECTION_SUMMARY.md"
```

---

## 4. HANDOFF.md Enhancement — New Sections

**Current HANDOFF.md** (state/HANDOFF.md) extended with:

```markdown
# HANDOFF: 2026-03-31T14:22:00.000Z — Claude@DESKTOP-N7MI1VB

## STATE
Session 0-D-7 completed

## NEW_ARTIFACTS (← NEW SECTION)

### Engines Created
- BurnishingPolishingEngine (847 lines, 12 tests, 0.92 coverage)
  Ready for: PostProcessorPipelineEngine, QualityPredictionEngine
  
### Hooks Activated
- physics-constant-validator (validates all inline constants)
  Triggered on: pre-edit, post-tool-use
  Auto-fixes: true

### Actions Wired
- burnish_force_estimate → ManufacturingDispatcher

### Tribal Knowledge Added
- TK-1847: Ball burnishing @ 60-80% Fy for cast surfaces (confidence: 0.87)

### Constants Canonicalized
- BURNISH_WORK_HARDENING_FACTOR = 1.15 (Klocke et al. 2009, F-KIN-0047)

### Quality Metrics
- Physics validation: passed
- Test coverage: 0.92
- All linting: passed
- Code review: approved

## RESUME

Session 0-D-8: Start Unit 8 "Grinding Path Registry Wire-Up"

**Pre-work checklist**:
- [ ] Run smart-config-refresh.sh (load new BurnishingPolishingEngine)
- [ ] Review KNOWLEDGE_INJECTION_SUMMARY.md
- [ ] Confirm ENGINE_INDEX_VERIFICATION.json shows 0 errors
- [ ] Check if TK-1847 applies to grinding surfaces

**Tools available since last session**:
- /burnish-predict skill
- BurnishingPolishingEngine in ManufacturingDispatcher
- 342 entries in BurnishToolRegistry

## CONTEXT
[standard context sections...]
```

---

## 5. Consumer Verification — Track Tool Usage Across Sessions

**File**: `.taskmaster/reports/FEATURE_CONSUMER_TRACKER.json`

**Schema**:
```json
{
  "tracking_period": "2026-02-15 to 2026-03-31 (45 days)",
  "feature_adoption": [
    {
      "feature": "MaterialPhysicsEngine",
      "created_in_session": "0-A-1",
      "first_consumed_in_session": "0-B-3",
      "sessions_consuming": ["0-B-3", "0-C-1", "0-D-2", "0-D-4", "0-D-6"],
      "consumption_count": 5,
      "downstream_improvements": [
        "0-D-2: Cutting force accuracy +3.2% vs pre-engine baseline"
      ]
    },
    {
      "feature": "BurnishingPolishingEngine",
      "created_in_session": "0-D-7",
      "first_consumed_in_session": null,
      "sessions_consuming": [],
      "consumption_count": 0,
      "status": "awaiting first use",
      "blocker": null
    },
    {
      "feature": "TK-1847 (burnishing tip)",
      "created_in_session": "0-D-7",
      "first_consumed_in_session": null,
      "adoption_target_sessions": ["1-1", "1-2", "1-3"],
      "target_engines": ["TribalKnowledgeEngine", "QualityPredictionEngine"],
      "likelihood_of_adoption": 0.92
    }
  ],
  "unused_features": [
    {
      "feature": "LegacyWedmPathOptimizer",
      "created_session": "0-PRE-4",
      "reasons_unused": ["replaced_by_newer_engine", "incomplete_wiring"],
      "recommendation": "deprecate or complete wiring in Phase 1"
    }
  ],
  "adoption_velocity": {
    "features_created_last_5_sessions": 12,
    "features_first_consumed_last_5_sessions": 8,
    "adoption_rate": 0.67,
    "goal": 0.85
  }
}
```

**Consumption Hook**: Post-review script detects when a session uses a prior-session feature:
```bash
# Detect if session code imports from new engines/skills/actions
node .taskmaster/scripts/detect-feature-consumption.mjs \
  --session=1-1 \
  --since=session_0_D_7 \
  --output=.taskmaster/reports/FEATURE_CONSUMER_TRACKER.json
```

---

## 6. Integration Points — Where Protocol Hooks Into System

### A. Session Initialization (session-start hook)
```bash
# Called when session starts
smart-config-refresh.sh  # Load new features from prior sessions
generate-knowledge-injection.mjs  # Create KNOWLEDGE_INJECTION_SUMMARY.md
```

### B. Post-Compact (post-compact hook)
```bash
# Called by /compact at session end
append-feature-timeline.mjs SESSION_ARTIFACTS.json FEATURE_AVAILABILITY_TIMELINE.md
validate-physics-constants.mjs src/physics/constants.ts
verify-engine-index.mjs
detect-feature-consumption.mjs --session=$SESSION_ID --since=$PREV_SESSION
```

### C. Pre-Review Gate (review-gate.sh)
```bash
# Already exists; extend to:
# 1. Verify all new engines imported required canonical constants
# 2. Check if new engines are wired to dispatchers
# 3. Confirm new actions added to dispatcher schemas
```

### D. SMART_CONFIG Injection (session context)
```markdown
## SMART_CONFIG: Features Available Since Last Session

**New Engines** (wired, production-ready):
- BurnishingPolishingEngine (0-D-7): Predictive burnishing force & surface finish
  Inputs: material_yield_mpa, spindle_rpm, tool_geometry
  Outputs: surface_roughness_ra_nm, force_newtons, burnishing_depth_mm
  Ready for: PostProcessorPipelineEngine, QualityPredictionEngine
  Tests: 12/12 passing, coverage 0.92

**New Hooks** (active, auto-enforcing):
- physics-constant-validator: Prevents inline constants, enforces canonical src/physics/constants.ts

**New Tribal Knowledge** (high confidence):
- TK-1847: Ball burnishing @ 60-80% Fy yields best Ra for cast surfaces (confidence 0.87)

**Available Skills**:
- /burnish-predict: Quick burnishing force/finish prediction
- (Full list in KNOWLEDGE_INJECTION_SUMMARY.md)

## Action: Review features above and cite them in your unit descriptions
```

---

## 7. Implementation Steps (2-3 Sessions)

### Session 1: Core Infrastructure
1. Create `.taskmaster/reports/SESSION_ARTIFACTS.json` template
2. Create `.taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md` (empty, ready for appends)
3. Write `.taskmaster/scripts/append-feature-timeline.mjs`
4. Write `.taskmaster/scripts/generate-knowledge-injection.mjs`
5. Write `.taskmaster/scripts/validate-physics-constants.mjs`
6. Write `.taskmaster/scripts/verify-engine-index.mjs`
7. Update HANDOFF.md template with NEW_ARTIFACTS section
8. Add post-compact hook: call append-feature-timeline + validation scripts

### Session 2: Smart Config Refresh
1. Create `.taskmaster/config/smart-config.json`
2. Write `.taskmaster/scripts/smart-config-refresh.sh`
3. Create session-start hook to call smart-config-refresh.sh
4. Write `.taskmaster/scripts/detect-feature-consumption.mjs`
5. Create FEATURE_CONSUMER_TRACKER.json template
6. Update session context template to auto-inject KNOWLEDGE_INJECTION_SUMMARY.md

### Session 3: Validation & Integration
1. Extend pre-review gate (review-gate.sh) with physics-constant checks
2. Add engine-index verification to review gate
3. Create wiring-completeness checker
4. Document protocol in BUILDING_TOOLKIT section (already exists)
5. Test full cycle: Session N creates artifact → Session N+1 discovers it

---

## 8. Example: Feature Cascade in Action

### Session 0-D-7 (Creation)
1. Engineer builds BurnishingPolishingEngine
2. Tests pass (12/12), coverage 0.92
3. Wired to ManufacturingDispatcher action `burnish_force_estimate`
4. Review passed, merged
5. At compact: SESSION_ARTIFACTS.json written, NEW_ARTIFACTS added to HANDOFF.md
6. Post-compact hook runs: FEATURE_AVAILABILITY_TIMELINE.md appended

### Session 0-D-8 (Discovery)
1. Session starts, smart-config-refresh.sh runs
2. KNOWLEDGE_INJECTION_SUMMARY.md generated:
   ```
   ## New Features Since Session 0-D-7
   
   **Engines**: BurnishingPolishingEngine ready for PostProcessorPipelineEngine
   **Skills**: /burnish-predict available
   **Tribal Knowledge**: TK-1847 (burnishing @ 60-80% Fy)
   ```
3. Engineer reads injection summary, sees BurnishingPolishingEngine
4. In unit U-POST2 (post-processor wiring), they add:
   ```typescript
   // Call BurnishingPolishingEngine to estimate burnishing forces
   const burnishResult = await manufacturingDispatcher.handle({
     action: 'burnish_force_estimate',
     params: { material_yield: 450, spindle_rpm: 1200, tool_geometry }
   });
   ```
5. Post-review: detect-feature-consumption.mjs records: "BurnishingPolishingEngine first consumed in 0-D-8"
6. FEATURE_CONSUMER_TRACKER.json updated for next session

### Session 1-1 (Knowledge Reuse)
1. Feature consumer tracker shows BurnishingPolishingEngine was consumed in 0-D-8
2. QualityPredictionEngine now references burnishing output for surface finish
3. TK-1847 linked in TribalKnowledgeEngine playbooks
4. Timeline shows: feature created → consumed → reused in 3 sessions = 100% adoption

---

## 9. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Features created per session | 3-5 | Count in SESSION_ARTIFACTS.json |
| Features first consumed within 2 sessions | 80%+ | FEATURE_CONSUMER_TRACKER.json |
| Adoption velocity (features used / features created) | 0.85+ | adoption_velocity.adoption_rate |
| Physics constants violations caught by hook | 100% | review-gate.sh enforcement |
| Test coverage of new engines | 90%+ | SESSION_ARTIFACTS.json coverage field |
| Wiring completeness at review time | 1.0 | ENGINE_INDEX_VERIFICATION.json errors=0 |

---

## 10. Rollout Timeline

**Session 0-D-8 (Phase 0-D, final)**: Implement core infrastructure (scripts + hooks)  
**Session 1-1 (Phase 1, start)**: Activate smart config refresh, measure first cascade  
**Session 1-2**: Verify adoption tracking, optimize KNOWLEDGE_INJECTION_SUMMARY.md format  
**Session 1-3+**: Full production use, tuning based on real session feedback  

---

## Files to Create/Modify

| File | Type | Action | Creator |
|------|------|--------|---------|
| `.taskmaster/reports/SESSION_ARTIFACTS.json` | schema | create | Session 0-D-8 |
| `.taskmaster/reports/FEATURE_AVAILABILITY_TIMELINE.md` | log | create | Session 0-D-8 |
| `.taskmaster/scripts/append-feature-timeline.mjs` | script | create | Session 0-D-8 |
| `.taskmaster/scripts/generate-knowledge-injection.mjs` | script | create | Session 0-D-8 |
| `.taskmaster/scripts/validate-physics-constants.mjs` | script | create | Session 0-D-8 |
| `.taskmaster/scripts/verify-engine-index.mjs` | script | create | Session 0-D-8 |
| `.taskmaster/config/smart-config.json` | config | create | Session 1-1 |
| `.taskmaster/scripts/smart-config-refresh.sh` | script | create | Session 1-1 |
| `.taskmaster/scripts/detect-feature-consumption.mjs` | script | create | Session 1-1 |
| `.taskmaster/reports/FEATURE_CONSUMER_TRACKER.json` | tracker | create | Session 1-1 |
| `state/HANDOFF.md` | template | extend | Session 0-D-8 |
| `.claude/hooks/lib/session-start.sh` | hook | extend | Session 1-1 |
| `.claude/hooks/lib/post-compact.sh` | hook | extend | Session 1-1 |

---

## Design Rationale

1. **No new engines**: All tracking is metadata (markdown, JSON, bash scripts). Zero runtime overhead.
2. **Append-only logs**: FEATURE_AVAILABILITY_TIMELINE.md never rewrites, only appends. Audit trail preserved.
3. **Hook integration**: Uses existing hook system (session-start, post-compact, pre-review).
4. **Simple schemas**: JSON matches existing patterns (constants, engines, tests, coverage).
5. **Redundant validation**: Physics constants checked at hook time AND at review gate (belt + suspenders).
6. **Adoption tracking**: FEATURE_CONSUMER_TRACKER.json is optional but high-value for identifying stale features.
7. **Knowledge injection**: KNOWLEDGE_INJECTION_SUMMARY.md auto-generated at session start, injected into session context.

---

## FAQ

**Q: What if a session creates 10 engines? Won't SESSION_ARTIFACTS.json blow up?**  
A: SESSION_ARTIFACTS.json is per-session, ~2-5 KB. Archive old sessions in `.taskmaster/reports/archive/` after 3 sessions.

**Q: How do I know if my new engine will be used?**  
A: Check ROADMAP_COLLABORATION_STATE.md and follow-up sessions' initial reports. FEATURE_CONSUMER_TRACKER.json gives adoption velocity.

**Q: Can I modify SESSION_ARTIFACTS.json after the session?**  
A: No. It's immutable (created at /compact time). If errors found, add notes to HANDOFF.md CONTEXT section.

**Q: Do I have to use the /burnish-predict skill if I see it in KNOWLEDGE_INJECTION_SUMMARY.md?**  
A: No, but if your unit could benefit (post-processor, quality engine, tool wear), cite it in your prompt to Claude/Codex.

**Q: When does FEATURE_CONSUMER_TRACKER.json update?**  
A: At session end, post-review, before /compact. Commit it to state/shared/.

**Q: What if a feature is created but never consumed (like LegacyWedmPathOptimizer)?**  
A: FEATURE_CONSUMER_TRACKER.json flags it as unused. At Phase 1 end, revisit: deprecate or wire it.

---

END OF FEATURE_CASCADE_PROTOCOL.md
