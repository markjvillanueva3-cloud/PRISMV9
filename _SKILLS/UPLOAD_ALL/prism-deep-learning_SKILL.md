---
name: prism-deep-learning
description: |
  Deep learning mindset for continuous improvement.
---

**When a better way is discovered, EVERYTHING must update automatically.**

This is not optional learning - this is MANDATORY SYSTEM EVOLUTION.

## Why?

1. **No isolated improvements** - A fix in one place benefits all places
2. **Compound learning** - Each improvement makes future work better
3. **Consistency** - All resources stay aligned and up-to-date
4. **Safety** - Better patterns propagate to all safety-critical code

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

# RESOURCE UPDATE MAP

| Resource | Location | Update Method |
|----------|----------|---------------|
| Skills (39) | `_SKILLS/*/SKILL.md` | Edit sections |
| Agents (57) | `_SCRIPTS/prism_unified_system_v4.py` | Edit AGENT_ROLES |
| System Prompt | `PRISM_COMPLETE_SYSTEM_v8.md` | Edit protocols |
| State Template | `CURRENT_STATE.json` | Edit structure |
| Materials | `EXTRACTED/materials/*.js` | Edit validation |
| Container | `/mnt/skills/user/` | Upload new version |

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

**Improvements MUST propagate. No learning stays isolated. Lives depend on continuous improvement.**
