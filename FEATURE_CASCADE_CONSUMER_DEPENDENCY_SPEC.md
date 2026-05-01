# Feature Cascade — Consumer & Dependency Tracking Specification

**Version**: 1.0  
**Date**: 2026-03-31  
**Maintainer**: Code Review Agent (LOOP 2)  

---

## Overview

This document specifies how the Feature Cascade Protocol tracks:
1. **Consumer relationships**: Which sessions consume features created in prior sessions
2. **Dependency health**: Whether consumer sessions successfully integrated features
3. **Adoption patterns**: Which types of features get reused most
4. **Blockers & gaps**: Why some features go unused

---

## 1. FEATURE_CONSUMER_TRACKER.json — Detailed Specification

**Location**: `.taskmaster/reports/FEATURE_CONSUMER_TRACKER.json`

**Purpose**: Single source of truth for feature adoption across all sessions

**Schema** (JSON):

```json
{
  "tracking_metadata": {
    "created_date": "2026-03-31",
    "last_updated": "2026-03-31T14:22:00Z",
    "tracking_period_start": "2026-02-15",
    "tracking_period_end": "2026-03-31",
    "total_days_tracked": 45,
    "total_sessions_analyzed": 18,
    "schema_version": "1.0"
  },

  "adoption_summary": {
    "total_features_created": 47,
    "total_features_consumed": 22,
    "adoption_rate": 0.468,
    "target_adoption_rate": 0.85,
    "gap": 0.382,
    "adoption_trend": "improving",
    "adoption_velocity_5_sessions": {
      "features_created": 12,
      "features_consumed": 8,
      "velocity_rate": 0.667
    }
  },

  "feature_registry": [
    {
      "feature_id": "ENG-MAT-001",
      "feature_name": "MaterialPhysicsEngine",
      "feature_type": "engine",
      "created_in_session": "0-A-1",
      "created_date": "2026-02-15",
      "created_by_agent": "Claude",

      "metadata": {
        "file_path": "src/engines/materials/MaterialPhysicsEngine.ts",
        "lines_of_code": 1247,
        "test_count": 24,
        "code_coverage": 0.88,
        "dispatcher": "PhysicsDispatcher",
        "associated_action": "material_physics_estimate"
      },

      "consumption": {
        "first_consumed_in_session": "0-B-3",
        "first_consumed_date": "2026-02-22",
        "sessions_consuming": [
          {
            "session_id": "0-B-3",
            "consumption_type": "direct_call",
            "consumed_by_unit": "U-PHYS1",
            "files_affected": ["src/engines/milling/MillPrintToProgramEngine.ts:456"],
            "quality_of_consumption": "excellent",
            "notes": "Full integration with cutting force model"
          },
          {
            "session_id": "0-C-1",
            "consumption_type": "dependency",
            "consumed_by_unit": "U-REG2",
            "files_affected": ["src/registries/MaterialRegistry.ts:89"],
            "quality_of_consumption": "good",
            "notes": "Used for material property lookup"
          },
          {
            "session_id": "0-D-2",
            "consumption_type": "direct_call",
            "consumed_by_unit": "U-PROC1",
            "files_affected": ["src/engines/postprocessing/PostProcessorPipelineEngine.ts:234"],
            "quality_of_consumption": "excellent",
            "notes": "Integrated into speed/feed optimization"
          },
          {
            "session_id": "0-D-4",
            "consumption_type": "via_skill",
            "consumed_by_unit": "U-DA2",
            "files_affected": [".claude/hooks/lib/material-enrich.sh:102"],
            "quality_of_consumption": "good",
            "notes": "Called by /material-lookup skill"
          },
          {
            "session_id": "0-D-6",
            "consumption_type": "dependency",
            "consumed_by_unit": "U-SCI3",
            "files_affected": ["src/engines/quality/QualityPredictionEngine.ts:178"],
            "quality_of_consumption": "excellent",
            "notes": "Surface finish prediction uses material hardness data"
          }
        ],
        "total_consumption_count": 5,
        "unique_sessions_consuming": 5,
        "adoption_date_range": "2026-02-22 to 2026-03-26",
        "adoption_days_to_first_use": 7,
        "adoption_momentum": "strong"
      },

      "downstream_impact": {
        "downstream_engines_affected": [
          "MillPrintToProgramEngine (improved cutting force accuracy +3.2%)",
          "PostProcessorPipelineEngine (added material-aware speed/feed)",
          "QualityPredictionEngine (surface finish now material-dependent)"
        ],
        "downstream_skills_affected": ["/material-lookup"],
        "quality_improvements_measured": [
          {
            "engine": "MillPrintToProgramEngine",
            "metric": "cutting_force_accuracy",
            "before": "±8.2%",
            "after": "±5.1%",
            "improvement_pct": 3.2
          }
        ],
        "estimated_time_savings": "12+ hours (avoided rebuilding material properties)",
        "user_satisfaction": "high"
      },

      "status": {
        "current_state": "production",
        "is_deprecated": false,
        "deprecation_candidate": false,
        "blocker_for_adoption": null,
        "notes": "Well-integrated, high reuse, strong quality improvements"
      }
    },

    {
      "feature_id": "SKILL-BURN-001",
      "feature_name": "/burnish-predict",
      "feature_type": "skill",
      "created_in_session": "0-D-7",
      "created_date": "2026-03-31",
      "created_by_agent": "Claude",

      "metadata": {
        "file_path": "mcp-server/docs/superpowers/skills/burnish-predict.md",
        "triggers_engine": "BurnishingPolishingEngine",
        "example_count": 3,
        "dependencies": ["MaterialRegistry", "ToolRegistry"]
      },

      "consumption": {
        "first_consumed_in_session": null,
        "first_consumed_date": null,
        "sessions_consuming": [],
        "total_consumption_count": 0,
        "unique_sessions_consuming": 0,
        "adoption_date_range": null,
        "adoption_days_to_first_use": null,
        "adoption_momentum": "pending"
      },

      "downstream_opportunities": {
        "target_sessions": ["1-1", "1-2", "1-3"],
        "target_units": [
          "U-POST2 (secondary operations in post-processor)",
          "U-QA3 (quality prediction for surface finish)"
        ],
        "expected_value": "Reduce polishing time estimate by 10-15%",
        "adoption_likelihood": 0.92,
        "reason_high_likelihood": "Directly applicable to Phase 1 secondary ops and quality work"
      },

      "status": {
        "current_state": "ready",
        "is_deprecated": false,
        "deprecation_candidate": false,
        "blocker_for_adoption": null,
        "notes": "New feature, awaiting first use in Phase 1"
      }
    },

    {
      "feature_id": "ENG-LEGACY-001",
      "feature_name": "LegacyWedmPathOptimizer",
      "feature_type": "engine",
      "created_in_session": "0-PRE-4",
      "created_date": "2026-01-15",
      "created_by_agent": "Claude",

      "metadata": {
        "file_path": "src/engines/legacy/LegacyWedmPathOptimizer.ts",
        "lines_of_code": 892,
        "test_count": 8,
        "code_coverage": 0.65,
        "dispatcher": null,
        "associated_action": null
      },

      "consumption": {
        "first_consumed_in_session": null,
        "first_consumed_date": null,
        "sessions_consuming": [],
        "total_consumption_count": 0,
        "unique_sessions_consuming": 0,
        "adoption_date_range": null,
        "adoption_days_to_first_use": null,
        "adoption_momentum": "unused"
      },

      "downstream_opportunities": {
        "target_sessions": null,
        "target_units": null,
        "expected_value": null,
        "adoption_likelihood": 0.15,
        "reason_low_likelihood": "Replaced by EDMProgramAssemblerEngine (newer, better coverage)"
      },

      "status": {
        "current_state": "candidate_for_deprecation",
        "is_deprecated": false,
        "deprecation_candidate": true,
        "blocker_for_adoption": "no_dispatcher_wiring",
        "deprecation_recommendation": "Deprecate in Phase 1-4; replace with EDMProgramAssemblerEngine",
        "notes": "Created in Phase 0-PRE but superseded by EDMProgramAssemblerEngine in Phase 0-A. Consider archiving."
      }
    }
  ],

  "consumption_by_feature_type": {
    "engines": {
      "total_created": 18,
      "total_consumed": 14,
      "adoption_rate": 0.778,
      "examples": [
        { "name": "MaterialPhysicsEngine", "adopted": true, "consumed_count": 5 },
        { "name": "BurnishingPolishingEngine", "adopted": false, "consumed_count": 0 }
      ]
    },
    "hooks": {
      "total_created": 8,
      "total_consumed": 6,
      "adoption_rate": 0.75,
      "examples": [
        { "name": "physics-constant-validator", "adopted": true, "consumed_count": 12 }
      ]
    },
    "skills": {
      "total_created": 12,
      "total_consumed": 2,
      "adoption_rate": 0.167,
      "examples": [
        { "name": "/calc", "adopted": true, "consumed_count": 3 },
        { "name": "/burnish-predict", "adopted": false, "consumed_count": 0 }
      ]
    },
    "actions": {
      "total_created": 9,
      "total_consumed": 0,
      "adoption_rate": 0,
      "blockers": ["awaiting wiring", "not yet in dispatcher schema"]
    }
  },

  "adoption_patterns": {
    "most_reused_features": [
      {
        "rank": 1,
        "feature": "MaterialPhysicsEngine",
        "consumption_count": 5,
        "reuse_score": 0.95,
        "pattern": "direct_engine_call"
      },
      {
        "rank": 2,
        "feature": "ToolRegistry",
        "consumption_count": 8,
        "reuse_score": 0.88,
        "pattern": "dependency_across_registries"
      },
      {
        "rank": 3,
        "feature": "physics-constant-validator hook",
        "consumption_count": 12,
        "reuse_score": 0.92,
        "pattern": "automatic_hook_enforcement"
      }
    ],
    "unused_features": [
      {
        "feature": "LegacyWedmPathOptimizer",
        "reason": "superseded_by_newer_engine",
        "blocker": "no_dispatcher_wiring",
        "action": "deprecate"
      }
    ],
    "slow_adoption_features": [
      {
        "feature": "/burnish-predict",
        "days_since_creation": 1,
        "expected_first_use": "1-2 sessions",
        "risk": "low (awaiting natural workflow)"
      }
    ]
  },

  "consumption_dependencies": {
    "engine_to_engine": [
      {
        "consumer": "PostProcessorPipelineEngine",
        "depends_on": "MaterialPhysicsEngine",
        "dependency_type": "direct_call",
        "health": "operational"
      }
    ],
    "engine_to_registry": [
      {
        "consumer": "QualityPredictionEngine",
        "depends_on": "MaterialRegistry",
        "dependency_type": "lookup",
        "health": "operational"
      }
    ],
    "action_to_engine": [
      {
        "consumer_action": "burnish_force_estimate",
        "engine": "BurnishingPolishingEngine",
        "dispatcher": "ManufacturingDispatcher",
        "health": "wired_not_yet_consumed"
      }
    ]
  },

  "quality_metrics_by_session": [
    {
      "session_id": "0-D-7",
      "date": "2026-03-31",
      "features_created": 4,
      "features_from_prior_sessions_consumed": 8,
      "feature_reuse_ratio": 2.0,
      "quality_of_consumption": "excellent",
      "notes": "Strong adoption of BurnishingPolishingEngine inputs from prior sessions"
    },
    {
      "session_id": "0-D-8",
      "date": "2026-04-05",
      "features_created": 3,
      "features_from_prior_sessions_consumed": 7,
      "feature_reuse_ratio": 2.33,
      "quality_of_consumption": "good",
      "notes": null
    }
  ],

  "blockers_and_gaps": [
    {
      "blocker_id": "GAP-ACTION-001",
      "category": "unwired_actions",
      "description": "9 actions created but not yet wired to any dispatcher schema",
      "affected_features": ["action_xy", "action_yz"],
      "severity": "medium",
      "resolution": "Wire in Phase 1-1",
      "owner": "Codex (frontend wiring)"
    },
    {
      "blocker_id": "GAP-SKILL-001",
      "category": "low_skill_adoption",
      "description": "/burnish-predict and 2 other skills created in 0-D but not yet consumed",
      "affected_features": ["/burnish-predict", "/grind-predict", "/weld-predict"],
      "severity": "low",
      "resolution": "Natural adoption expected in Phase 1 (secondary ops, quality work)",
      "owner": "none (awaiting workflow)"
    }
  ],

  "recommendations": [
    {
      "priority": "high",
      "action": "Wire 9 pending actions in Phase 1-1",
      "rationale": "Actions created but not in dispatcher schema; blocking consumption",
      "estimated_effort": "2-3 hours",
      "expected_impact": "unlock 9 features for Phase 1 consumption"
    },
    {
      "priority": "medium",
      "action": "Deprecate LegacyWedmPathOptimizer by end of Phase 1-4",
      "rationale": "Superseded by EDMProgramAssemblerEngine; unused for 60+ days",
      "estimated_effort": "1 hour (audit + archive)",
      "expected_impact": "reduce tech debt, clarify wiring diagram"
    },
    {
      "priority": "low",
      "action": "Monitor /burnish-predict adoption in Phase 1-2+",
      "rationale": "New skill; expect natural adoption within 2 sessions",
      "estimated_effort": "0 (automatic tracking)",
      "expected_impact": "validate adoption velocity metric"
    }
  ]
}
```

---

## 2. FEATURE_CONSUMPTION_THIS_SESSION.json — Per-Session Detection Output

**Location**: `.taskmaster/reports/FEATURE_CONSUMPTION_THIS_SESSION.json` (generated at post-review time)

**Purpose**: Identify which features from prior sessions are actually used in current session

**Schema**:

```json
{
  "detection_metadata": {
    "session_id": "1-1",
    "detection_timestamp": "2026-04-12T18:30:00Z",
    "prior_session_analyzed": "0-D-8",
    "analysis_method": "import_grep + function_call_detection + skill_invocation_grep"
  },

  "features_consumed_this_session": [
    {
      "feature_name": "BurnishingPolishingEngine",
      "created_in_session": "0-D-7",
      "consumption_type": "direct_call",
      "unit_where_consumed": "U-POST2",
      "files_affected": [
        {
          "file": "src/engines/postprocessing/PostProcessorPipelineEngine.ts",
          "line_range": "234-256",
          "code_excerpt": "const burnishResult = await manufacturingDispatcher.handle({ action: 'burnish_force_estimate', ...})",
          "confidence": 1.0
        }
      ],
      "detection_confidence": 1.0,
      "integration_quality": "excellent",
      "notes": "Full integration into secondary operations logic"
    },
    {
      "feature_name": "/material-lookup",
      "created_in_session": "0-A-2",
      "consumption_type": "skill_invocation",
      "unit_where_consumed": "U-DA1",
      "files_affected": [
        {
          "file": ".claude/hooks/lib/material-enrich.sh",
          "line_range": "42-50",
          "code_excerpt": "/material-lookup titanium --yield",
          "confidence": 0.95
        }
      ],
      "detection_confidence": 0.95,
      "integration_quality": "good",
      "notes": "Called from material enrichment hook"
    }
  ],

  "features_NOT_consumed": [
    {
      "feature_name": "/burnish-predict",
      "created_in_session": "0-D-7",
      "created_days_ago": 11,
      "reason_not_consumed": "out_of_scope_for_this_session",
      "reason_detail": "Session 1-1 focuses on registry wiring; burnishing applies to Phase 1-3+",
      "expected_first_use": "Session 1-3 or 1-4"
    }
  ],

  "adoption_tally": {
    "total_features_from_prior_artifacts": 47,
    "features_consumed_this_session": 2,
    "features_not_consumed": 45,
    "consumption_rate": 0.043,
    "note": "1-1 is registry/wiring session; consumption will increase in 1-3+ when secondary ops implemented"
  }
}
```

---

## 3. Consumption Detection Algorithm — Pseudo-Code

**Triggered**: Post-review hook, before /compact

**Input**:
- Current session ID (e.g., "1-1")
- Prior SESSION_ARTIFACTS.json files (from prior N sessions)
- All changed files in current session (from git diff)

**Algorithm**:

```
for each feature in prior_session_artifacts:
  feature_imported = false
  feature_called = false
  feature_invoked_as_skill = false
  
  for each changed_file in current_session_changes:
    
    // TYPE 1: Direct engine import + call
    if changed_file contains "import { FeatureName }" or "from '.../FeatureName'":
      feature_imported = true
    
    if feature_imported and changed_file contains "new FeatureName()" or "await featureName.execute()":
      feature_called = true
      log_consumption(feature_name, changed_file, line_number, type="direct_call")
    
    // TYPE 2: Dispatcher action call
    if feature.type == "engine" and feature.dispatcher_action exists:
      if changed_file contains `dispatcher.handle({ action: '${feature.dispatcher_action}' })`:
        log_consumption(feature_name, changed_file, line_number, type="dispatcher_action")
    
    // TYPE 3: Skill invocation (via grep for /skill-name in shell/markdown)
    if feature.type == "skill":
      if changed_file contains "/${feature.name}" or "/${feature.name} ":
        log_consumption(feature_name, changed_file, line_number, type="skill_invocation")
    
    // TYPE 4: Hook activation (check if hook name appears in new test/spec)
    if feature.type == "hook":
      if changed_file contains "trigger: '${feature.trigger}'" or `name: '${feature.name}'`:
        log_consumption(feature_name, changed_file, line_number, type="hook_activation")
    
    // TYPE 5: Dependency (registry lookup, constant import)
    if feature.type == "registry":
      if changed_file contains `${feature.name}.lookup()` or `from '.../${feature.name}'`:
        log_consumption(feature_name, changed_file, line_number, type="dependency")
    
    if feature.type == "constant":
      if changed_file contains `${feature.constant_id}` and not_inline_definition:
        log_consumption(feature_name, changed_file, line_number, type="constant_reference")

output FEATURE_CONSUMPTION_THIS_SESSION.json with all detected features
```

---

## 4. Consumer Relationship Schemas

### Direct Engine-to-Engine Consumption

```typescript
interface EngineConsumption {
  consumer_engine: string;        // Engine doing the calling
  consumed_engine: string;        // Engine being called
  dispatcher_action?: string;     // Via which dispatcher action?
  call_sites: Array<{
    file: string;
    line_range: string;
    code_excerpt: string;
  }>;
  integration_type: "direct_import" | "dispatcher_action" | "pipeline_stage";
  data_flow: string;              // Brief description of what data flows
}
```

### Skill-to-Engine Consumption

```typescript
interface SkillConsumption {
  skill_name: string;             // /skill-name
  triggers_engine: string;        // Which engine does it call?
  invocation_sites: Array<{
    session_id: string;
    file: string;
    line_range: string;
    unit: string;
  }>;
  usage_pattern: "direct_call" | "via_hook" | "via_dispatcher";
  adoption_count: number;         // How many sessions have invoked?
}
```

### Registry Dependency Consumption

```typescript
interface RegistryDependency {
  consumer: string;               // Engine/action/skill using registry
  registry_name: string;          // Which registry is accessed?
  lookup_type: "by_id" | "by_property" | "all_entries";
  call_sites: Array<{
    file: string;
    line_range: string;
  }>;
  critical: boolean;              // Does consumer require this registry?
}
```

---

## 5. Adoption Velocity Metrics

**Calculated** at session completion (post-review):

```json
{
  "adoption_velocity_over_5_sessions": {
    "period": "Sessions N-4 to N",
    "features_created": 12,
    "features_consumed_for_first_time": 8,
    "adoption_ratio": 0.667,
    "velocity_trend": "improving|stable|declining",
    "target": 0.85
  },

  "time_to_adoption": {
    "mean_sessions_to_first_use": 2.3,
    "median_sessions_to_first_use": 2,
    "fastest_adoption": {
      "feature": "MaterialPhysicsEngine",
      "sessions_to_first_use": 1,
      "reason": "high_relevance_to_next_session"
    },
    "slowest_adoption": {
      "feature": "/burnish-predict",
      "sessions_to_first_use": null,
      "status": "pending"
    }
  },

  "feature_type_adoption": {
    "engines": { "adoption_rate": 0.778, "velocity": "strong" },
    "hooks": { "adoption_rate": 0.75, "velocity": "strong" },
    "skills": { "adoption_rate": 0.167, "velocity": "weak" },
    "actions": { "adoption_rate": 0, "velocity": "blocked_on_wiring" }
  },

  "quality_of_adoption": {
    "mean_integration_quality": "good",
    "features_integrated_excellently": 8,
    "features_integrated_adequately": 12,
    "features_integrated_poorly": 0,
    "notes": "No poor integrations; strong reuse pattern"
  }
}
```

---

## 6. Blocker Identification & Remediation

### Blocker Categories

| Category | Example | Resolution |
|----------|---------|-----------|
| No Dispatcher Wiring | Action created but not in dispatcher schema | Wire in Phase 1-1 |
| Incomplete Tests | Engine with < 5 tests | Add tests before release |
| No Documentation | Skill created but no examples | Add 3+ examples |
| Physics Validation Pending | Engine with calculations but no review | Run /prism-review |
| Superseded by Newer Feature | Legacy engine + newer replacement exists | Deprecate old one |
| Out of Scope | Feature created but doesn't apply to current phase | Document target session |

### Blocker Resolution Workflow

```
if feature.consumption_count == 0 and feature.created_N_sessions_ago > 3:
  
  if feature.has_dispatcher_wiring == false:
    blocker = "NO_DISPATCHER_WIRING"
    owner = "frontend team"
    resolution = "Wire to dispatcher schema in Phase 1-1"
  
  else if feature.code_coverage < 0.7:
    blocker = "INCOMPLETE_TESTS"
    owner = "test team"
    resolution = "Add tests to reach 85%+ coverage"
  
  else if feature.is_superseded_by != null:
    blocker = "SUPERSEDED"
    owner = "architecture"
    resolution = "Deprecate in Phase 1-4"
  
  else:
    blocker = "UNCLEAR"
    owner = "product lead"
    resolution = "Investigate why feature isn't being adopted; adjust roadmap"
  
  flag feature for review in next session
  assign task to owner
```

---

## 7. Integration with Handoff & Compact

### At Session End (pre-/compact):

1. **detect-feature-consumption.mjs** runs:
   - Analyzes changed files from current session
   - Identifies which features from prior artifacts were consumed
   - Generates FEATURE_CONSUMPTION_THIS_SESSION.json

2. **Merge consumption into tracker**:
   ```bash
   node .taskmaster/scripts/merge-consumption-into-tracker.mjs \
     FEATURE_CONSUMPTION_THIS_SESSION.json \
     FEATURE_CONSUMER_TRACKER.json \
     --output=FEATURE_CONSUMER_TRACKER_UPDATED.json
   ```

3. **Update adoption metrics**:
   - Calculate adoption_velocity over last 5 sessions
   - Flag slow/unused features
   - Update recommendations list

4. **Report in HANDOFF.md NEW_ARTIFACTS section**:
   ```markdown
   ## FEATURES CONSUMED FROM PRIOR SESSIONS
   - MaterialPhysicsEngine (from 0-D-7): integrated into secondary ops
   - /material-lookup skill (from 0-A-2): used in enrichment hook
   
   ## FEATURES NOT YET CONSUMED
   - /burnish-predict (from 0-D-7): awaiting Phase 1-3 secondary ops work
   
   ## FEATURE TRACKER METRICS
   - Overall adoption velocity: 0.667 (target 0.85)
   - Engines adoption: 0.778 (strong)
   - Skills adoption: 0.167 (weak — low phase 1 demand)
   ```

---

## 8. Example Consumer Relationship Visualization

```
Session 0-A-1 Creates MaterialPhysicsEngine
     ↓ (wired to PhysicsDispatcher)
     ↓
Session 0-B-3 Consumes via direct_call in MillPrintToProgramEngine
Session 0-C-1 Consumes via dependency in MaterialRegistry lookup
Session 0-D-2 Consumes via dispatcher action in PostProcessorPipelineEngine
Session 0-D-4 Consumes via /material-lookup skill
Session 0-D-6 Consumes via dependency in QualityPredictionEngine
     ↓
TRACKER: MaterialPhysicsEngine adoption_rate = 5/5 = 100% (excellent)
         time_to_adoption = 1 session (fast)
         integration_quality = excellent (strong data flow)
```

---

## 9. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature adoption rate | 85%+ | FEATURE_CONSUMER_TRACKER.json adoption_rate field |
| Time to first use | 2 sessions max | time_to_adoption.mean_sessions_to_first_use |
| Engines adoption | 80%+ | consumption_by_feature_type.engines.adoption_rate |
| Hooks adoption | 75%+ | consumption_by_feature_type.hooks.adoption_rate |
| Skills adoption | 50%+ (phase-dependent) | consumption_by_feature_type.skills.adoption_rate |
| No stale features | 0 unused after 4 sessions | blockers_and_gaps (unused_features list) |
| Integration quality | "good" or "excellent" avg | quality_metrics_by_session.quality_of_consumption |

---

## 10. FAQ

**Q: What if a feature is created but not used for 5 sessions?**  
A: FEATURE_CONSUMER_TRACKER.json flags it as "candidate_for_deprecation". Owner reviews and either:
- Wires missing dispatcher/action (if blocker)
- Documents target session (if out-of-scope)
- Deprecates (if superseded)

**Q: How do I know if my feature will be adopted?**  
A: Check FEATURE_CONSUMER_TRACKER.json.downstream_opportunities and adoption_likelihood. If > 0.7, expect adoption. If < 0.3, likely to be unused.

**Q: Can a feature be consumed in the same session it was created?**  
A: Technically yes, but unlikely. Feature is usually tested + reviewed at session end, so first real consumption is next session.

**Q: What if a feature is consumed by multiple sessions?**  
A: All sessions are tracked in consumption[].sessions_consuming[]. Adoption count increments for each.

**Q: Should I measure adoption for deprecated features?**  
A: No. Set is_deprecated=true and stop tracking. Archive old SESSION_ARTIFACTS.json files after 3 sessions.

---

END OF CONSUMER & DEPENDENCY SPEC
