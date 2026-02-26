# PRISM API MULTI-AGENT INTEGRATION GUIDE v1.0
## How Desktop App Claude and API Agents Work Together

---

## OVERVIEW

The PRISM development system now operates on TWO layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 1: DESKTOP APP (ME)                       │
│                                                                     │
│  • Direct user interaction                                          │
│  • Reading/analyzing files                                          │
│  • Simple edits and lookups                                         │
│  • Coordination and integration                                     │
│  • Decision: Do it myself OR delegate?                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ triggers when needed
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: API SWARM SYSTEM                       │
│                                                                     │
│  • 56 specialized agents                                            │
│  • Parallel execution                                               │
│  • Multi-expert analysis                                            │
│  • Ralph-style iteration                                            │
│  • Learning extraction                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WHEN TO DELEGATE TO API

### ✅ USE API SWARM WHEN:
- **Parallel work needed** - 5+ items to extract/validate simultaneously
- **Multiple experts required** - Manufacturing analysis needs 5+ viewpoints
- **Complex iteration** - Keep working until truly complete (Ralph loops)
- **Heavy computation** - 100+ materials, large data processing
- **Verification chains** - Need 4-level safety validation
- **Uncertainty quantification** - All values need error bounds

### ❌ HANDLE MYSELF WHEN:
- **Simple lookups** - Quick file reads
- **Single file edits** - One file, clear changes
- **User interaction** - Questions, clarifications
- **Reading/summarizing** - Already in context
- **Coordination** - Planning what to do next

---

## HOW TO TRIGGER API SWARMS

### Method 1: Quick Commands (Recommended)

```powershell
# From Desktop Commander
& 'C:\Users\Admin.DIGITALSTORM-PC\AppData\Local\Programs\Python\Python312\python.exe' 'C:\\PRISM\_SCRIPTS\prism_unified_system_v4.py' --intelligent "Your task here"
```

### Method 2: Task File

1. Write task JSON to `_TASKS/`:
```json
{
  "name": "my_extraction",
  "max_parallel": 5,
  "tasks": [
    {"id": "task1", "role": "extractor", "prompt": "Extract X"},
    {"id": "task2", "role": "validator", "prompt": "Validate Y"}
  ]
}
```

2. Execute:
```powershell
python prism_unified_system_v4.py my_extraction.json
```

3. Read results from `API_RESULTS/`

---

## API COMMANDS REFERENCE

### --intelligent (Auto-Everything)
```powershell
python prism_unified_system_v4.py --intelligent "Extract all aluminum alloys from the materials database and validate their cutting parameters"
```
- Auto-detects relevant skills from keywords
- Loads session context from CURRENT_STATE.json
- Selects optimal agents
- Extracts learnings after completion

### --manufacturing (Expert Analysis)
```powershell
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"
```
- Spawns 8 expert agents (OPUS tier)
- Includes uncertainty quantification
- 4-level verification chain
- Synthesized recommendations

### --ralph (Iterate Until Done)
```powershell
python prism_unified_system_v4.py --ralph architect "Design a complete material lookup module. Output COMPLETE when production-ready." 10
```
- Iterates until "COMPLETE" found in output
- Or max iterations reached
- Maintains context between iterations
- Extracts learnings from each iteration

### --list (Show All Agents)
```powershell
python prism_unified_system_v4.py --list
```

---

## 56 AGENTS QUICK REFERENCE

### By Model Tier:

**OPUS ($75/1M out) - Use for complex reasoning:**
```
architect, coordinator, materials_scientist, machinist, physics_validator,
domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst,
task_decomposer, learning_extractor, verification_chain, uncertainty_quantifier,
knowledge_graph_builder, meta_analyst, call_tracer
```

**SONNET ($15/1M out) - Use for most tasks:**
```
extractor, validator, merger, coder, analyst, researcher, tool_engineer,
cam_specialist, quality_engineer, process_engineer, machine_specialist,
gcode_expert, monolith_navigator, schema_designer, api_designer,
completeness_auditor, regression_checker, test_generator, code_reviewer,
optimizer, refactorer, security_auditor, documentation_writer,
thermal_calculator, force_calculator, estimator, context_builder,
cross_referencer, pattern_matcher, quality_gate, session_continuity,
dependency_analyzer
```

**HAIKU ($1.25/1M out) - Use for fast lookups:**
```
state_manager, cutting_calculator, surface_calculator, standards_expert,
formula_lookup, material_lookup, tool_lookup
```

---

## SWARM PATTERNS

### intelligent_swarm(prompt)
**Best for:** Most tasks when you want auto-everything
**Agents:** Auto-selected based on keywords
**Features:** Context loading, learning extraction, auto-skill detection

### verified_manufacturing_swarm(material, operation)
**Best for:** Full machining analysis with expert consensus
**Agents (8):** materials_scientist, machinist, tool_engineer, force_calculator, physics_validator, cross_referencer, uncertainty_quantifier, synthesizer
**Features:** Uncertainty bounds, 4-level verification

### deep_extraction_swarm(source, files)
**Best for:** Safe extraction with verification
**Agents (8):** context_builder, pattern_matcher, extractor, validator, completeness_auditor, regression_checker, quality_gate, learning_extractor
**Features:** Context loading, pattern matching, regression prevention

### code_quality_swarm(code, module_name)
**Best for:** Comprehensive code review
**Agents (5):** code_reviewer, test_generator, security_auditor, optimizer, documentation_writer

### architecture_swarm(requirements)
**Best for:** System design
**Agents (4):** architect, schema_designer, api_designer, task_decomposer

### debug_with_tracing_swarm(error, code)
**Best for:** Complex debugging
**Agents (6):** call_tracer, root_cause_analyst, debugger, physics_validator, dependency_analyzer, synthesizer

---

## INTEGRATION WITH SKILLS

### Auto-Skill Detection:
Keywords in prompts automatically trigger relevant skills AND agents:

| Keywords | Skills | Agents |
|----------|--------|--------|
| brainstorm, design | prism-sp-brainstorm | architect, researcher |
| extract, parse | prism-monolith-extractor | extractor, dependency_analyzer |
| debug, fix, error | prism-sp-debugging | debugger, call_tracer |
| material, alloy | prism-material-schema | materials_scientist, physics_validator |
| cutting, machining | prism-expert-master | machinist, tool_engineer |
| validate, verify | prism-sp-verification | validator, quality_gate |

---

## READING RESULTS

Results are saved to `API_RESULTS/`:

### JSON File (full metadata):
```json
{
  "session_id": "session-1234567890",
  "timestamp": "2026-01-25T12:00:00Z",
  "detected_skills": ["prism-material-physics"],
  "task_count": 5,
  "results": [...]
}
```

### Content File (human-readable):
```
======================================================================
Task: material-analysis
Agent: Materials Scientist (materials_scientist)
Model: claude-opus-4-5-20251101
Status: success
======================================================================

[Agent output here]
```

---

## COST ESTIMATION

| Swarm | Typical Tokens | Est. Cost |
|-------|---------------|-----------|
| intelligent_swarm (3 agents) | ~2K in / 6K out | $0.10 |
| manufacturing_swarm (8 agents) | ~6K in / 24K out | $0.50 |
| ralph_loop (10 iterations) | ~20K in / 50K out | $1.00 |
| deep_extraction (8 agents) | ~4K in / 16K out | $0.30 |

---

## LEARNING PIPELINE

Every task automatically:
1. **Extracts patterns** → `_LEARNING/learning_*.json`
2. **Builds knowledge graph** → `_KNOWLEDGE/`
3. **Updates session state** → `CURRENT_STATE.json`

Future tasks can:
1. **Load past learnings** via context_builder
2. **Find similar work** via pattern_matcher
3. **Avoid past mistakes** via extracted anti-patterns

---

## TROUBLESHOOTING

### "API key not found"
Check API_KEY in prism_unified_system_v4.py

### "Agent role not found"
Run `--list` to see available agents

### "Task timed out"
Increase timeout_ms or break into smaller tasks

### "Results seem incomplete"
Use verification_chain agent or add quality_gate

---

## SUMMARY

```
┌────────────────────────────────────────────────────────────────────┐
│                PRISM API INTEGRATION v4.0                          │
├────────────────────────────────────────────────────────────────────┤
│  AGENTS:     56 (15 OPUS + 32 SONNET + 9 HAIKU)                    │
│  SWARMS:     8 pre-built patterns                                  │
│  FEATURES:   Auto-skills, Learning, Verification, Uncertainty      │
│  SCRIPT:     prism_unified_system_v4.py                            │
│  RESULTS:    API_RESULTS/                                          │
│  LEARNING:   _LEARNING/                                            │
│  KNOWLEDGE:  _KNOWLEDGE/                                           │
├────────────────────────────────────────────────────────────────────┤
│  USE FOR: Parallel work, multi-expert analysis, complex iteration  │
│  AVOID FOR: Simple lookups, single edits, user interaction         │
└────────────────────────────────────────────────────────────────────┘
```
