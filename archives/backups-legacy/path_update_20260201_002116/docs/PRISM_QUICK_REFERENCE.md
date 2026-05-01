# 🚀 PRISM UNIFIED SYSTEM - QUICK REFERENCE CARD

## ⚡ ONE-LINERS

```powershell
# List all 42 agents
python prism_unified_system_v3.py --list-agents

# Manufacturing analysis (5 OPUS experts, ~$0.50)
python prism_unified_system_v3.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop - iterate until done (OPUS)
python prism_unified_system_v3.py --ralph architect "Design X. Output COMPLETE when done." 10

# Run custom task file
python prism_unified_system_v3.py my_tasks.json
```

---

## 🎯 MODEL TIERS

| Tier | Model | Cost/1M out | Use For |
|------|-------|-------------|---------|
| **OPUS** | claude-opus-4-5-20251101 | $75 | Design, debug, complex reasoning |
| **SONNET** | claude-sonnet-4-20250514 | $15 | Most tasks |
| **HAIKU** | claude-haiku-4-5-20251001 | $1.25 | Fast lookups |

---

## 🔥 42 AGENTS BY TIER

### OPUS (11) - Complex Reasoning
```
architect, coordinator, materials_scientist, machinist, physics_validator,
domain_expert, migration_specialist, synthesizer, debugger, root_cause_analyst,
task_decomposer
```

### SONNET (26) - Balanced
```
extractor, validator, merger, coder, analyst, researcher, tool_engineer,
cam_specialist, quality_engineer, process_engineer, machine_specialist,
gcode_expert, monolith_navigator, schema_designer, api_designer,
completeness_auditor, regression_checker, test_generator, code_reviewer,
optimizer, refactorer, security_auditor, documentation_writer,
thermal_calculator, force_calculator, estimator
```

### HAIKU (7) - Fast Lookups
```
state_manager, cutting_calculator, surface_calculator, standards_expert,
formula_lookup, material_lookup, tool_lookup
```

---

## 🌀 PRE-BUILT SWARMS

| Swarm | Agents | Use Case |
|-------|--------|----------|
| `manufacturing_swarm(material, op)` | 5 experts | Full machining analysis |
| `extraction_swarm(source, schema)` | 3 agents | Extract→Validate→Audit |
| `code_quality_swarm(code, name)` | 5 agents | Review+Test+Security+Docs |
| `architecture_swarm(requirements)` | 4 agents | Design+Schema+API+Tasks |
| `debug_swarm(error, code)` | 3 OPUS | Debug+RootCause+Physics |
| `skill_swarm(skill, prompt)` | Auto | Match skill to agents |

---

## 📁 PATHS

```
SCRIPT:   C:\PRISM REBUILD..\_SCRIPTS\prism_unified_system_v3.py
RESULTS:  C:\PRISM REBUILD...\API_RESULTS\
TASKS:    C:\PRISM REBUILD...\_TASKS\
SKILLS:   C:\PRISM REBUILD...\_SKILLS\
```

---

## 📝 TASK FILE FORMAT

```json
{
  "name": "my_task",
  "max_parallel": 5,
  "tasks": [
    {
      "id": "task-1",
      "role": "extractor",
      "tier": "opus",
      "prompt": "Extract all materials from...",
      "context": "Optional context",
      "files": ["path/to/file.txt"]
    }
  ]
}
```

---

## 🔄 RALPH LOOP

```bash
python prism_unified_system_v3.py --ralph <role> "<prompt>" [max_iterations]

# Example: 10 iterations with architect
python prism_unified_system_v3.py --ralph architect "Build complete module. COMPLETE when done." 10
```

**Tip**: Include "Output COMPLETE when finished" in your prompt.

---

## ✅ EVERYTHING INTEGRATED

- ✅ 37 Skills mapped to agents
- ✅ 42 Agents with embedded protocols
- ✅ 10 Commandments in every agent
- ✅ Anti-Regression built-in
- ✅ Opus 4.5 available
- ✅ Ralph loops (no Claude Code needed)
- ✅ 6 pre-built swarm patterns
