---
name: prism-deep-learning
version: "2.0"
level: 0
category: always-on
description: |
  Automatic discovery and propagation of improvements across ALL PRISM resources.
  LEVEL 0 ALWAYS-ON: Fires on learning detection, cannot be disabled.
  Use when: Better methods discovered, patterns learned, errors fixed.
  Provides: Impact analysis, update roadmap, RalphLoop validation.
  Key principle: Improvements MUST propagate everywhere.
dependencies:
  - prism-sp-verification
  - prism-anti-regression
  - prism-formula-evolution
consumers:
  - ALL skills (learning propagates everywhere)
hooks:
  - learning:extract (Priority 170)
  - learning:match
  - learning:apply
  - learning:deepAnalysis
  - learning:propagate
safety_critical: true
---

# PRISM DEEP LEARNING SKILL v2.0
## ⛔ LEVEL 0 ALWAYS-ON - CONTINUOUS IMPROVEMENT IS MANDATORY
## When a better way is discovered, EVERYTHING must update automatically

---

## SECTION 1: CORE PRINCIPLE

**When a better way is discovered, EVERYTHING must update automatically.**

This is not optional learning - this is MANDATORY SYSTEM EVOLUTION.

### Why?
1. **No isolated improvements** - A fix in one place benefits all places
2. **Compound learning** - Each improvement makes future work better
3. **Consistency** - All resources stay aligned and up-to-date
4. **Safety** - Better patterns propagate to all safety-critical code

### Safety Considerations
⚠️ **LIFE-SAFETY**: Learnings may affect manufacturing calculations.
- Physics formula improvements require validation before propagation
- Safety-critical learnings need OPUS-tier verification
- Never propagate unvalidated changes to S(x) > 0.7 resources
- Rollback plan REQUIRED before any safety-affecting update

---

## SECTION 2: LEARNING DETECTION

### Auto-Trigger Keywords
When conversation contains these, LEARNING DETECTED:

```
EXPLICIT TRIGGERS:
├── "better way"          ├── "discovered"
├── "improved method"     ├── "learned"
├── "optimization"        ├── "realized"
├── "shortcut"            ├── "figured out"
├── "faster approach"     ├── "more efficient"
└── "pattern found"       └── "works better"
```

### What Constitutes "Better"?
```
BETTER = Any discovery that:
├── Reduces errors by >10%
├── Reduces time by >15%
├── Reduces tool calls by >20%
├── Increases completeness
├── Increases accuracy
├── Improves safety margins (S(x) increase)
├── Simplifies workflow
├── Adds missing capability
└── Fixes recurring problem
```

---

## SECTION 3: LEARNING CAPTURE FORMAT

```json
{
  "learning_id": "LEARN-2026-01-29-001",
  "timestamp": "2026-01-29T20:30:00Z",
  "type": "workflow_optimization | pattern_discovery | error_fix | new_capability",
  "discovery": {
    "what": "Exact technique/method/pattern discovered",
    "why_better": {
      "metric": "time | accuracy | completeness | safety",
      "improvement": "25% faster | 15% more accurate",
      "evidence": "specific example demonstrating improvement"
    },
    "confidence": 0.85
  },
  "impact": {
    "skills_affected": ["prism-material-physics", "prism-speed-feed-engine"],
    "agents_affected": ["physics_validator", "materials_scientist"],
    "scripts_affected": ["validate_formulas.py"],
    "formulas_affected": ["F-PHYS-001"],
    "safety_critical": true
  },
  "status": "DETECTED | ANALYZED | IMPLEMENTING | VALIDATED | INTEGRATED"
}
```

---

## SECTION 4: AUTO-UPDATE CHAIN

### Protocol Flow
```
LEARNING DETECTED
      │
      ▼
┌─────────────────────────────────────────┐
│           IMPACT ANALYSIS               │
│  Scan all resources for updates:        │
│  • 99 Skills in skills-consolidated/    │
│  • 64 Agents in orchestrator            │
│  • 22 Formulas in FORMULA_REGISTRY      │
│  • State file templates                 │
│  • Manufacturing calculations           │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│        SAFETY CLASSIFICATION            │
│  If safety_critical = true:             │
│  • Require OPUS verification            │
│  • Create rollback plan                 │
│  • Dual validation required             │
│  • S(x) check on all affected resources │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│        ROADMAP GENERATION               │
│  Create microsession plan:              │
│  • Group by priority (CRITICAL→LOW)     │
│  • Chunk into 15-25 items per MS        │
│  • Add validation checkpoints           │
│  • Include rollback triggers            │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│          EXECUTE UPDATES                │
│  For each affected resource:            │
│  1. Read current version (ANTI-REGRESS) │
│  2. Apply learning                      │
│  3. Validate change (syntax + logic)    │
│  4. Compare sizes (regression check)    │
│  5. Write updated version               │
│  6. Log update with evidence            │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│         RALPH VALIDATION                │
│  Run RalphLoop audit (3 iterations):    │
│  • All updates applied correctly        │
│  • No regressions introduced            │
│  • Learning fully propagated            │
│  • Cross-references updated             │
│  • Safety scores unchanged or improved  │
└─────────────────────────────────────────┘
      │
      ▼
LEARNING INTEGRATED ✅
```

---

## SECTION 5: LEARNING CATEGORIES

### 1. Workflow Optimization
```python
example = {
    "what": "Reading SKILL.md before starting is 40% faster",
    "evidence": "Reduced tool calls from 25 to 15",
    "update_targets": [
        "prism-sp-brainstorm",
        "prism-sp-execution", 
        "prism-session-master"
    ]
}
```

### 2. Pattern Discovery
```python
example = {
    "what": "Kienzle mc values follow: tangential < feed < radial always",
    "evidence": "Validated across 450 steel materials",
    "update_targets": [
        "prism-material-validator",
        "prism-material-physics"
    ]
}
```

### 3. Error Fix
```python
example = {
    "what": "JSON parse errors from trailing commas",
    "evidence": "3 failures in last 10 sessions",
    "update_targets": [
        "prism-error-catalog",
        "prism-sp-debugging"
    ]
}
```

### 4. New Capability
```python
example = {
    "what": "Parallel agent execution enables 3x faster swarms",
    "evidence": "Benchmark: 180s → 60s for extraction",
    "update_targets": [
        "prism-swarm-coordinator",
        "prism-skill-orchestrator"
    ]
}
```

---

## SECTION 6: IMPLEMENTATION

### Learning Capture Function
```python
def capture_learning(conversation, learning_type):
    """
    Capture learning from conversation context.
    
    Args:
        conversation: Current conversation context
        learning_type: workflow_optimization | pattern_discovery | error_fix | new_capability
        
    Returns:
        Learning record for propagation
    """
    # Detect learning keywords
    keywords = detect_learning_keywords(conversation)
    if not keywords:
        return None
    
    # Extract the improvement
    improvement = extract_improvement(conversation, keywords)
    
    # Classify safety impact
    safety_critical = assess_safety_impact(improvement)
    
    # Generate impact analysis
    affected_resources = analyze_impact(improvement)
    
    # Create learning record
    learning = {
        "learning_id": generate_learning_id(),
        "timestamp": datetime.now().isoformat(),
        "type": learning_type,
        "discovery": improvement,
        "impact": affected_resources,
        "safety_critical": safety_critical,
        "status": "DETECTED"
    }
    
    # Log to learning database
    save_learning(learning)
    
    # Fire hook
    execute_hooks("learning:extract", learning)
    
    return learning
```

### Propagation Function
```python
def propagate_learning(learning_id):
    """
    Propagate validated learning to all affected resources.
    
    Args:
        learning_id: ID of learning to propagate
        
    Returns:
        Propagation report with update status for each resource
    """
    learning = load_learning(learning_id)
    
    # Safety check
    if learning["safety_critical"]:
        verification = verify_with_opus("learning_propagation", learning)
        if not verification["approved"]:
            return {"status": "BLOCKED", "reason": verification["reason"]}
    
    # Create rollback snapshot
    rollback_id = create_rollback_snapshot(learning["impact"])
    
    results = []
    try:
        for skill in learning["impact"]["skills_affected"]:
            result = update_skill(skill, learning)
            results.append({"resource": skill, "status": result})
            
            # Validate after each update
            if not validate_resource(skill):
                raise PropagationError(f"Validation failed for {skill}")
        
        # Mark learning as integrated
        learning["status"] = "INTEGRATED"
        save_learning(learning)
        
        # Fire completion hook
        execute_hooks("learning:propagate", learning)
        
        return {"status": "SUCCESS", "updates": results, "rollback_id": rollback_id}
        
    except Exception as e:
        # Rollback all changes
        execute_rollback(rollback_id)
        return {"status": "FAILED", "error": str(e), "rolled_back": True}
```

---

## SECTION 7: ERROR HANDLING

| Error | Cause | Recovery |
|-------|-------|----------|
| DETECTION_FAILED | Cannot identify learning | Log raw data, manual review |
| IMPACT_ANALYSIS_ERROR | Cannot determine affected resources | Use conservative estimate, flag for review |
| PROPAGATION_FAILED | Update failed mid-propagation | Automatic rollback, alert user |
| VALIDATION_FAILED | Updated resource invalid | Rollback specific resource, retry |
| SAFETY_VIOLATION | Learning affects S(x) without approval | HARD BLOCK, require OPUS verification |

### Error Recovery Flow
```python
def handle_propagation_error(error, learning, rollback_id):
    """Handle errors during learning propagation."""
    
    if error.type == "SAFETY_VIOLATION":
        # Critical - full stop
        execute_rollback(rollback_id)
        alert_user("Safety violation during learning propagation")
        return {"status": "BLOCKED", "requires": "OPUS verification"}
    
    elif error.type == "VALIDATION_FAILED":
        # Partial rollback possible
        execute_partial_rollback(rollback_id, error.resource)
        return {"status": "PARTIAL", "failed_resource": error.resource}
    
    else:
        # Full rollback
        execute_rollback(rollback_id)
        log_error(error)
        return {"status": "ROLLED_BACK", "error": str(error)}
```

---

## SECTION 8: EXAMPLES

### Example 1: Workflow Optimization Learning
```python
# Detected: "Using chunked file writes prevents truncation"
learning = capture_learning(conversation, "workflow_optimization")

# Result:
{
    "learning_id": "LEARN-2026-01-29-001",
    "discovery": {
        "what": "Chunked file writes (25KB max) prevent truncation",
        "why_better": {
            "metric": "reliability",
            "improvement": "100% success vs 70% for large files",
            "evidence": "5 failed writes recovered with chunking"
        }
    },
    "impact": {
        "skills_affected": ["prism-sp-execution", "prism-code-master"],
        "scripts_affected": ["large_file_writer.py"]
    }
}

# Propagation updates both skills with new chunking guidance
propagate_learning("LEARN-2026-01-29-001")
```

### Example 2: Safety-Critical Pattern Learning
```python
# Detected: "Hardened steel requires 30% feed reduction"
learning = capture_learning(conversation, "pattern_discovery")

# Safety check triggers
learning["safety_critical"] = True  # Affects cutting parameters

# Requires OPUS verification before propagation
verification = verify_with_opus("learning_propagation", learning)
# OPUS validates the 30% reduction is correct for HRC 55-65

# Then propagates to:
# - prism-material-physics (add pattern)
# - prism-speed-feed-engine (add rule)
# - COEFFICIENT_DATABASE.json (add coefficient)
```

---

## SECTION 9: HOOKS INTEGRATION

```python
# Hooks that fire during learning lifecycle
LEARNING_HOOKS = {
    "learning:extract": {
        "priority": 170,
        "handler": capture_and_analyze_learning,
        "description": "Captures learning from conversation"
    },
    "learning:match": {
        "priority": 175,
        "handler": match_to_existing_patterns,
        "description": "Matches learning to existing knowledge"
    },
    "learning:apply": {
        "priority": 180,
        "handler": apply_learning_to_resource,
        "description": "Applies learning to single resource"
    },
    "learning:deepAnalysis": {
        "priority": 185,
        "handler": deep_impact_analysis,
        "description": "Comprehensive impact analysis"
    },
    "learning:propagate": {
        "priority": 190,
        "handler": propagate_to_all_resources,
        "description": "Propagates learning system-wide"
    }
}
```

---

## SECTION 10: QUICK REFERENCE

### Commands
```powershell
# Check for pending learnings
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --learning-status

# Apply pending learning
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --apply-learning LEARN-ID

# Validate learning integration
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --validate-learning LEARN-ID

# RalphLoop validation (3 iterations)
py -3 C:\PRISM\scripts\prism_unified_system_v6.py --ralph validator "Validate LEARN-ID" 3
```

### Learning Lifecycle
```
DETECTED → CAPTURED → ANALYZED → IMPLEMENTING → VALIDATED → INTEGRATED
```

### Enforcement Summary
| Rule | Type | Description |
|------|------|-------------|
| No isolated learning | HARD | Every learning must propagate |
| Impact analysis required | HARD | Cannot skip impact analysis |
| Validation required | HARD | Must validate before integration |
| Safety review | HARD | OPUS verification for S(x) resources |
| Rollback plan | SOFT | Should have rollback before updates |

---

**Improvements MUST propagate. No learning stays isolated. Lives depend on continuous improvement.**

**Version:** 2.0 | **Date:** 2026-01-29 | **Level:** 0 (Always-On)
**Enhanced:** YAML frontmatter, implementation code, error handling, examples, hooks
