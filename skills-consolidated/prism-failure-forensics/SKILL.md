---
name: prism-failure-forensics
version: 1.0.0
description: |
  Failure forensics skill for failure pattern analysis, root cause identification,
  and prevention strategies. Uses the FailureForensicsEngine to diagnose machining
  failures from symptoms and recommend corrective actions.

  Modules Covered:
  - FailureForensicsEngine (forensic_analyze, forensic_pattern, forensic_timeline, forensic_prevent)

  Gateway Routes: prism_intelligence → forensic_*
  R10 Revolution: Rev 5 — Failure Forensics
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "failure", "broke", "crashed", "chatter", "vibration", "bad surface", "tool broke", "scrapped"
- User describes a machining failure and wants to understand what went wrong
- User wants to prevent recurring failures

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-failure-forensics")`
2. Gather failure symptoms from user (what happened, when, what material/tool/parameters)
3. Use forensic actions:
   - `prism_intelligence→forensic_analyze` — Full root cause analysis from symptoms
   - `prism_intelligence→forensic_pattern` — Match against known failure patterns
   - `prism_intelligence→forensic_timeline` — Reconstruct failure event timeline
   - `prism_intelligence→forensic_prevent` — Generate prevention strategy for identified failure mode

### What It Returns
- **Format**: Structured JSON with root causes, confidence levels, corrective/preventive actions
- **Success**: Ranked root causes with evidence chains and specific corrective actions
- **Failure**: Insufficient symptoms → asks for additional diagnostic info

### Examples
**Example 1**: "My insert chipped after 5 minutes cutting Inconel"
→ `forensic_analyze(symptoms: ["insert_chipping", "short_life"], material: "Inconel 718", time: 5)` → Root cause: thermal shock from interrupted cut + wrong insert grade; Fix: switch to KC5525 with coolant

**Example 2**: "Recurring chatter on this part every 3rd operation"
→ `forensic_pattern(symptom: "periodic_chatter", frequency: "every_3rd")` → Pattern match: tool wear progression; Prevention: implement wear monitoring at 66% tool life

# FAILURE FORENSICS

## Failure Taxonomy
| Category | Failure Modes | Key Indicators |
|----------|--------------|----------------|
| Tool failure | Chipping, fracture, BUE, flank wear, crater wear | Tool life, cutting forces, surface finish |
| Surface defects | Chatter marks, burns, tearing, smearing | Ra/Rz deviation, visual inspection |
| Dimensional | Out of tolerance, taper, ovality | CMM data, dimensional drift pattern |
| Machine | Spindle vibration, axis backlash, thermal drift | Position errors, vibration spectrum |
| Process | Wrong parameters, wrong tool, wrong sequence | Comparison against recommended values |

## Root Cause Analysis Method
1. **Symptom Collection**: Gather observable evidence
2. **Pattern Matching**: Compare against 50+ known failure patterns
3. **Physics Validation**: Check if proposed cause explains all symptoms
4. **Confidence Scoring**: Rate each root cause by evidence strength
5. **Corrective Actions**: Specific parameter/tool/strategy changes
6. **Prevention Plan**: Monitoring triggers to catch early warning signs

## Evidence Chain
Every root cause comes with an evidence chain linking:
- Observed symptoms → Contributing factors → Root cause → Physics explanation
- Each link has a confidence score (0-1)
- Total chain confidence = product of link confidences
