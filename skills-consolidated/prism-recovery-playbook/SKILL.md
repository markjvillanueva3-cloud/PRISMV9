---
name: prism-recovery-playbook
description: |
  When calculations fail, dispatchers error, or workflows break mid-stream.
  Decision trees for diagnosis, recovery, and fallback strategies.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "recovery", "playbook", "calculations", "fail", "dispatchers", "error", "workflows"
- User asks about machining parameters, process physics, or material behavior related to this topic.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-recovery-playbook")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_skill_script→skill_content(id="prism-recovery-playbook") to load reference data
   - prism_calc→[relevant_action] for calculations using this knowledge
   - prism_data→material_get/tool_get for parameter lookups

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Relevant physics models, parameter ranges, and decision criteria for the machining scenario
- **Failure**: Skill not found → verify skill ID in SKILL_INDEX.json

### Examples
**Example 1**: User asks "What recovery parameters for 316 stainless?"
→ Load skill: skill_content("prism-recovery-playbook") → Extract relevant recovery data → Cross-ref with prism_data→material_get("316SS") → Provide physics-based recommendation

**Example 2**: User needs to troubleshoot playbook issues on Inconel 718
→ Load skill → Identify root cause criteria → Apply diagnostic flowchart → Recommend parameter adjustments with safety validation

# PRISM Recovery Playbook
## When Things Go Wrong

## Error Classification & Response

### Level 1: Dispatcher Returns Error
| Error Type | Likely Cause | Recovery |
|-----------|-------------|----------|
| "Material not found" | Typo, wrong name format | Try alternate names, search with partial match |
| "Missing parameter" | Incomplete input data | Check which param, provide default or ask user |
| "Out of range" | Physics violation | Check units, verify input bounds, recalculate |
| "Action not found" | Wrong action name | Check MASTER_INDEX.md for correct action |
| Empty/null result | No matching data | Broaden search, try related dispatcher |
| Timeout | Complex calculation, large dataset | Retry with simpler params, break into parts |

### Level 2: Calculation Returns Unreasonable Values
**Sanity Check Bounds:**
```
Cutting speed: 1-2000 m/min (most metals 30-500)
Feed/tooth: 0.01-2.0 mm (most 0.05-0.3)
Cutting force: 10-50,000 N (most 100-5,000)
Power: 0.1-200 kW (most 1-30)
Temperature: 50-1200 °C (most 200-800)
Surface finish: 0.1-50 μm Ra (most 0.4-6.3)
Tool life: 1-500 min (most 15-120)
```

**If result outside bounds:**
1. Check input units (mm vs inches, m/min vs SFM)
2. Check material properties (kc1.1 correct? hardness right?)
3. Check tool geometry (diameter, flutes, helix)
4. Recalculate step-by-step to find where error enters
5. If still wrong: flag to user with uncertainty note

### Level 3: Multi-Step Workflow Fails Mid-Stream
```
Step 1: ✅ material_get succeeded
Step 2: ✅ tool_recommend succeeded  
Step 3: ❌ speed_feed failed ("missing kc1_1")
Step 4: ⏸️ not started
Step 5: ⏸️ not started
```

**Recovery protocol:**
1. DON'T restart from Step 1 — keep completed results
2. Diagnose Step 3 failure (material missing Kienzle data)
3. Attempt fix: `prism_data→material_search` for similar material with kc1_1
4. If fixable: resume from Step 3 with corrected input
5. If not fixable: provide partial results + explain what's missing

### Level 4: Context Pressure / Compaction
```
Pressure > 60%: Approaching limit
├── Save critical state: prism_session→state_save
├── Compress context: prism_context→context_compress  
├── Continue with reduced verbosity
Pressure > 80%: Danger zone
├── Mandatory checkpoint: prism_session→auto_checkpoint
├── Switch to microsession if possible
├── Preserve: todo list, current task, key findings
└── Sacrifice: verbose explanations, alternative analyses
```

### Level 5: Session Recovery (After Compaction)
```
1. prism_session→state_load() → get last known state
2. prism_context→todo_read() → get pending tasks
3. Read /mnt/transcripts/ latest file → conversation history
4. prism_context→memory_restore() → recover externalized memory
5. Resume from last checkpoint, don't re-do completed work
```

## Common Anti-Patterns (Don't Do These)

| Anti-Pattern | Why Bad | Do Instead |
|-------------|---------|------------|
| Retry same call with same params | Same error every time | Diagnose first, fix input |
| Ignore error, continue anyway | Downstream results wrong | Stop, diagnose, recover |
| Start entire workflow over | Wastes completed work | Resume from failure point |
| Load 5 skills "just in case" | Burns context budget | Load only what's needed |
| Ask user to repeat everything | Frustrating, inefficient | Use state_load + transcripts |
