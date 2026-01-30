---
name: prism-deep-learning
description: |
  LEVEL 0 ALWAYS-ON skill that enables automatic discovery and propagation
  of improvements across ALL PRISM resources. When a better way is found,
  the system auto-detects it, analyzes impact, generates update roadmap,
  and validates integration via RalphLoop. No learning stays isolated.
  Key principle: Improvements MUST propagate everywhere.
  Part of SP.1 Core Development Workflow.
---

# PRISM DEEP LEARNING SKILL v1.0
## ⛔ THIS SKILL IS ALWAYS-ON - LEVEL 0 - CONTINUOUS IMPROVEMENT
## When a better way is discovered, EVERYTHING must update automatically

---

# SKILL METADATA

```yaml
id: prism-deep-learning
version: 1.0
level: 0  # ALWAYS-ON - Continuous improvement is mandatory
trigger: learn|improve|better|discover|optimize|realized|figured out
purpose: Auto-detect and propagate improvements across all resources
dependencies: [prism-sp-verification, prism-anti-regression]
agents: [deep_learning_analyst, learning_extractor, meta_analyst, verification_chain]
enforcement: AUTO_TRIGGER  # Activates when learning detected
```

---

# CORE PRINCIPLE

**When a better way is discovered, EVERYTHING must update automatically.**

This is not optional learning - this is MANDATORY SYSTEM EVOLUTION.

## Why?

1. **No isolated improvements** - A fix in one place benefits all places
2. **Compound learning** - Each improvement makes future work better
3. **Consistency** - All resources stay aligned and up-to-date
4. **Safety** - Better patterns propagate to all safety-critical code

---

# LEARNING DETECTION

## Auto-Trigger Keywords

When conversation contains these, LEARNING DETECTED:

```
EXPLICIT TRIGGERS:
├── "better way"
├── "improved method"
├── "discovered"
├── "learned"
├── "realized"
├── "figured out"
├── "optimization"
├── "shortcut"
├── "faster approach"
└── "more efficient"
```

## What Constitutes "Better"?

```
BETTER = Any discovery that:
├── Reduces errors by >10%
├── Reduces time by >15%
├── Reduces tool calls by >20%
├── Increases completeness
├── Increases accuracy
├── Improves safety margins
├── Simplifies workflow
├── Adds missing capability
└── Fixes recurring problem
```

---

# LEARNING CAPTURE FORMAT

When learning detected, capture immediately:

```json
{
  "learning_id": "LEARN-YYYY-MM-DD-NNN",
  "timestamp": "ISO-8601",
  "type": "workflow_optimization | pattern_discovery | error_fix | new_capability",
  "discovery": {
    "what": "Exact technique/method/pattern",
    "why_better": {
      "metric": "time | accuracy | completeness | safety",
      "improvement": "percentage or description",
      "evidence": "specific example"
    }
  },
  "impact": {
    "skills_affected": ["skill-1", "skill-2"],
    "agents_affected": ["agent-1", "agent-2"],
    "scripts_affected": ["script.py"],
    "protocols_affected": ["protocol-name"]
  },
  "status": "DETECTED | ANALYZED | IMPLEMENTING | VALIDATED | INTEGRATED"
}
```

---

# AUTO-UPDATE CHAIN

## Protocol Flow

```
LEARNING DETECTED
      │
      ▼
┌─────────────────────────────────────────┐
│           IMPACT ANALYSIS               │
│  Scan all resources for updates:        │
│  • 39 Skills in _SKILLS/                │
│  • 57 Agents in orchestrator            │
│  • PRISM_COMPLETE_SYSTEM_v8.md          │
│  • State file templates                 │
│  • Manufacturing calculations           │
│  • Validation rules                     │
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
│  1. Read current version                │
│  2. Apply learning                      │
│  3. Validate change                     │
│  4. Write updated version               │
│  5. Log update                          │
└─────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────┐
│         RALPH VALIDATION                │
│  Run RalphLoop audit:                   │
│  • All updates applied correctly        │
│  • No regressions introduced            │
│  • Learning fully propagated            │
│  • Cross-references updated             │
└─────────────────────────────────────────┘
      │
      ▼
LEARNING INTEGRATED ✅
```

---

# RESOURCE UPDATE MAP

| Resource | Location | Update Method |
|----------|----------|---------------|
| Skills (39) | `_SKILLS/*/SKILL.md` | Edit sections |
| Agents (57) | `_SCRIPTS/prism_unified_system_v4.py` | Edit AGENT_ROLES |
| System Prompt | `PRISM_COMPLETE_SYSTEM_v8.md` | Edit protocols |
| State Template | `CURRENT_STATE.json` | Edit structure |
| Materials | `EXTRACTED/materials/*.js` | Edit validation |
| Container | `/mnt/skills/user/` | Upload new version |

---

# LEARNING CATEGORIES

## 1. Workflow Optimization

```
Examples:
• "Reading SKILL.md before starting is faster"
• "Using Desktop Commander for files >50KB avoids truncation"
• "Checkpoint at 10 items prevents context loss"

Update Targets:
• SP workflow skills (brainstorm, planning, execution)
• PRISM_COMPLETE_SYSTEM_v8.md protocols
• Session handoff templates
```

## 2. Pattern Discovery

```
Examples:
• "All Kienzle mc values follow: tangential < feed < radial"
• "ISO group S materials always need special thermal handling"
• "Module extraction failures usually have missing dependencies"

Update Targets:
• prism-validator (add new validation rules)
• prism-material-physics (add patterns)
• prism-monolith-extractor (add patterns)
```

## 3. Error Fix

```
Examples:
• "JSON parse errors from trailing commas - always validate"
• "File write failures from special characters - sanitize paths"
• "Context overflow from reading entire monolith - use offsets"

Update Targets:
• prism-error-catalog (add error)
• prism-sp-debugging (add diagnostic)
• Affected skill SKILL.md files
```

## 4. New Capability

```
Examples:
• "RalphLoop can train on specific domains"
• "Parallel agent execution for faster processing"
• "Cross-domain validation using knowledge graph"

Update Targets:
• prism-skill-orchestrator (add capability)
• AGENT_ROLES in orchestrator
• PRISM_COMPLETE_SYSTEM_v8.md features
```

---

# VALIDATION PROTOCOL

## Post-Update Checks

```
AFTER every learning integration:
1. COUNT: New version has >= items as old version
2. SYNTAX: All files parse without errors
3. CROSS-REF: All references still valid
4. FUNCTION: Core workflows still work
5. REGRESSION: Run RalphLoop audit
```

## RalphLoop Validation Command

```powershell
python prism_unified_system_v4.py --ralph validator "Validate learning LEARN-ID was properly integrated. Check all affected skills updated, no regressions, learning propagated." 5
```

---

# LEARNING LIFECYCLE

```
1. DETECTED    → Learning identified in conversation
2. CAPTURED    → Learning record created with WHAT/WHY/WHERE
3. ANALYZED    → Impact analysis complete, roadmap generated
4. IMPLEMENTING → Updates in progress via microsessions
5. VALIDATED   → RalphLoop confirms all updates correct
6. INTEGRATED  → Learning is now part of PRISM
```

---

# COMMANDS

```powershell
# Check for pending learnings
python prism_unified_system_v4.py --learning-status

# Apply pending learning
python prism_unified_system_v4.py --apply-learning LEARN-ID

# Validate learning integration
python prism_unified_system_v4.py --validate-learning LEARN-ID

# Generate update roadmap from learning
python prism_unified_system_v4.py --learning-roadmap
```

---

# ENFORCEMENT SUMMARY

## HARD RULES

❌ **BLOCKED**: Ignoring detected learning
❌ **BLOCKED**: Applying learning without impact analysis
❌ **BLOCKED**: Completing integration without validation
❌ **BLOCKED**: Leaving affected resources un-updated

## SOFT RULES

⚠️ Capture learning within same session as discovery
⚠️ Prioritize safety-critical updates
⚠️ Document rollback plan before updates
⚠️ Save learning to `_LEARNING/` directory

---

**Improvements MUST propagate. No learning stays isolated. Lives depend on continuous improvement.**
