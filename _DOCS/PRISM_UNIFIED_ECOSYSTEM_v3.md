# PRISM UNIFIED ECOSYSTEM v3.0
## Complete Integration Map

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED ECOSYSTEM                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │                     DESKTOP APP (CLAUDE)                            │    ║
║  │  • Memory System    • Web Search    • Skills in /mnt/project/       │    ║
║  │  • MCP Tools        • Artifacts     • Session Continuity            │    ║
║  └───────────────────────────────┬─────────────────────────────────────┘    ║
║                                  │                                           ║
║                                  │ triggers                                  ║
║                                  ▼                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │                    PRISM UNIFIED SYSTEM v3.0                        │    ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    ║
║  │  │  42 AGENTS   │  │ RALPH LOOPS  │  │ SWARM PATTERNS│             │    ║
║  │  │ • OPUS (11)  │  │ • Iterate    │  │ • Manufacturing│            │    ║
║  │  │ • SONNET(26) │  │ • Until done │  │ • Extraction   │            │    ║
║  │  │ • HAIKU (7)  │  │ • Max iters  │  │ • Quality      │            │    ║
║  │  └──────────────┘  └──────────────┘  │ • Architecture │            │    ║
║  │                                       │ • Debug        │            │    ║
║  │  ┌────────────────────────────────┐  └──────────────┘              │    ║
║  │  │     EMBEDDED PROTOCOLS         │                                 │    ║
║  │  │ • 10 Commandments              │                                 │    ║
║  │  │ • Anti-Regression              │                                 │    ║
║  │  │ • Life-Safety Mindset          │                                 │    ║
║  │  │ • Maximum Completeness         │                                 │    ║
║  │  │ • Predictive Thinking          │                                 │    ║
║  │  └────────────────────────────────┘                                 │    ║
║  └───────────────────────────────┬─────────────────────────────────────┘    ║
║                                  │                                           ║
║                                  │ calls                                     ║
║                                  ▼                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │                      ANTHROPIC API                                  │    ║
║  │  • claude-opus-4-5-20251101     (Complex reasoning)                 │    ║
║  │  • claude-sonnet-4-20250514     (Balanced tasks)                    │    ║
║  │  • claude-haiku-4-5-20251001    (Fast lookups)                      │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🔗 HOW EVERYTHING CONNECTS

### Layer 1: Skills (Knowledge) → /mnt/project/ & C:\_SKILLS\

```
37 SKILLS (Knowledge/Protocols)
├── Level 0-1: Always-On Mindsets (/mnt/project/)
│   ├── prism-life-safety-mindset
│   ├── prism-maximum-completeness
│   ├── regression_skill_v2
│   ├── prism-predictive-thinking
│   └── prism-skill-orchestrator
│
├── Level 2: Domain Skills (C:\_SKILLS\)
│   ├── SP.1 Core Workflow (8 skills)
│   ├── SP.2 Monolith Navigation (4 skills)
│   ├── SP.3 Materials System (5 skills)
│   └── SP.4-10 Master Skills (7 consolidations)
│
└── Level 3: Reference Skills (lookup only)
    └── 10 comprehensive references (1.04MB)
```

### Layer 2: Agents (Execution) → prism_unified_system_v3.py

```
42 AGENTS (Execution Engines)
├── OPUS Tier (11 agents) - Complex reasoning
│   ├── architect, coordinator
│   ├── materials_scientist, machinist, physics_validator, domain_expert
│   ├── migration_specialist, synthesizer
│   └── debugger, root_cause_analyst, task_decomposer
│
├── SONNET Tier (26 agents) - Balanced tasks
│   ├── extractor, validator, merger, coder, analyst, researcher
│   ├── tool_engineer, cam_specialist, quality_engineer, process_engineer
│   ├── machine_specialist, gcode_expert
│   ├── monolith_navigator, schema_designer, api_designer
│   ├── completeness_auditor, regression_checker
│   ├── test_generator, code_reviewer, optimizer, refactorer
│   ├── security_auditor, documentation_writer
│   ├── thermal_calculator, force_calculator
│   └── estimator
│
└── HAIKU Tier (7 agents) - Fast lookups
    ├── state_manager
    ├── cutting_calculator, surface_calculator
    └── standards_expert, formula_lookup, material_lookup, tool_lookup
```

### Layer 3: Swarm Patterns (Collaboration)

```
PRE-BUILT SWARMS
├── skill_swarm(skill_name, prompt)     → Auto-select agents for skill
├── manufacturing_swarm(material, op)   → 5-expert manufacturing analysis
├── extraction_swarm(source, schema)    → Extract → Validate → Audit
├── code_quality_swarm(code, module)    → Review + Test + Security + Docs
├── architecture_swarm(requirements)    → Design + Schema + API + Tasks
└── debug_swarm(error, code)            → Debug + Root Cause + Physics
```

### Layer 4: Ralph-Style Loops (Iteration)

```
RALPH LOOP
├── Works via API (no Claude Code needed!)
├── Iterates until completion_promise found
├── OR max_iterations reached
├── Maintains context between iterations
└── Perfect for complex, multi-step tasks
```

---

## 🎯 SKILL → AGENT MAPPING

| Skill | Primary Agents | Model Tier |
|-------|---------------|------------|
| **prism-sp-brainstorm** | architect, researcher, domain_expert | OPUS |
| **prism-sp-planning** | coordinator, architect, task_decomposer | OPUS |
| **prism-sp-execution** | coder, extractor, implementer | SONNET |
| **prism-sp-review-spec** | validator, completeness_auditor | SONNET |
| **prism-sp-review-quality** | code_reviewer, security_auditor | SONNET |
| **prism-sp-debugging** | debugger, root_cause_analyst | OPUS |
| **prism-sp-verification** | validator, test_generator | SONNET |
| **prism-sp-handoff** | documentation_writer, synthesizer | SONNET |
| **prism-monolith-extractor** | extractor, monolith_navigator | OPUS |
| **prism-material-physics** | physics_validator, materials_scientist | OPUS |
| **prism-tdd-enhanced** | test_generator, coder | SONNET |
| **prism-root-cause-tracing** | root_cause_analyst, debugger | OPUS |

---

## 🚀 USAGE PATTERNS

### Pattern 1: Desktop App Triggers Swarm

```python
# From Desktop App, I write a task file:
{
  "name": "material_extraction",
  "max_parallel": 5,
  "tasks": [
    {"id": "aluminum", "role": "extractor", "tier": "sonnet", "prompt": "..."},
    {"id": "steel", "role": "extractor", "tier": "sonnet", "prompt": "..."},
    {"id": "validate", "role": "validator", "tier": "sonnet", "prompt": "..."}
  ]
}

# Then run: python prism_unified_system_v3.py task.json
# Results appear in API_RESULTS/
```

### Pattern 2: Pre-Built Swarm

```bash
# Manufacturing analysis with Opus
python prism_unified_system_v3.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Result: 5 experts analyze in parallel (~30s)
```

### Pattern 3: Ralph Loop for Complex Tasks

```bash
# Iterate until complete
python prism_unified_system_v3.py --ralph architect "Design a complete material database module with TypeScript types, Python implementation, validation, and tests. Output COMPLETE when production-ready." 10
```

### Pattern 4: Skill-Triggered Swarm

```python
# In Python
from prism_unified_system_v3 import skill_swarm

# Automatically spawn optimal agents for a skill
skill_swarm("prism-sp-debugging", "Fix the cutting force calculation error", files=["error.log"])
```

---

## 💰 COST OPTIMIZATION

| Tier | Input/1M | Output/1M | Use For |
|------|----------|-----------|---------|
| **OPUS** | $15.00 | $75.00 | Architecture, debugging, complex reasoning |
| **SONNET** | $3.00 | $15.00 | Most tasks (5x cheaper than Opus) |
| **HAIKU** | $0.25 | $1.25 | Fast lookups (60x cheaper than Opus) |

### Strategy:
- **OPUS** for design, planning, debugging (worth the cost)
- **SONNET** for execution, extraction, validation
- **HAIKU** for lookups, formatting, state management

---

## 📁 FILE STRUCTURE

```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
├── _SCRIPTS\
│   ├── prism_unified_system_v3.py    ← MASTER ORCHESTRATOR
│   ├── prism_orchestrator_v2.py      ← Previous version
│   ├── prism_api_worker.py           ← Single agent
│   └── swarm_trigger.py              ← Quick commands
│
├── _SKILLS\                          ← All 37 skill files
│   ├── prism-sp-*.md
│   ├── prism-material-*.md
│   └── ...
│
├── _TASKS\                           ← Task definitions
│   └── *.json
│
├── API_RESULTS\                      ← Agent outputs
│   ├── *_content.txt                 ← Human-readable
│   └── *.json                        ← Full metadata
│
├── CURRENT_STATE.json                ← Session state
└── SESSION_LOGS\                     ← Activity logs
```

---

## ✅ WHAT'S INTEGRATED

| Component | Status | Notes |
|-----------|--------|-------|
| 37 Skills | ✅ | /mnt/project/ + C:\_SKILLS\ |
| 42 Agents | ✅ | All with embedded protocols |
| 10 Commandments | ✅ | In every agent system prompt |
| Protocols | ✅ | Anti-regression, life-safety, etc. |
| Opus 4.5 | ✅ | claude-opus-4-5-20251101 |
| Sonnet 4 | ✅ | claude-sonnet-4-20250514 |
| Haiku 4.5 | ✅ | claude-haiku-4-5-20251001 |
| Ralph Loops | ✅ | Built into API (no Claude Code) |
| Swarm Patterns | ✅ | 6 pre-built patterns |
| State Management | ✅ | CURRENT_STATE.json integration |
| MCP Tools | ✅ | Filesystem, Desktop Commander |

---

## ❌ WHAT'S NOT POSSIBLE

| Component | Reason |
|-----------|--------|
| **Ralph Wiggum Plugin** | Requires Claude Code, conflicts with Desktop App |
| **Claude Code** | Cannot run while Desktop App is open |
| **Claude Flow** | Same limitation - uses Claude Code |

**SOLUTION**: We built Ralph-style loops directly into the API system!

---

## 🎯 RECOMMENDED WORKFLOWS

### For PRISM Extraction Work:
1. **Desktop App**: Plan & coordinate (me)
2. **API Swarm**: Parallel extraction (5 agents)
3. **API Validate**: Check completeness
4. **Desktop App**: Review & integrate

### For Complex Features:
1. **Desktop App**: Brainstorm with prism-sp-brainstorm
2. **API Ralph Loop**: Architect designs (OPUS, 10 iterations)
3. **API Swarm**: Code generation (5 coders)
4. **API Swarm**: Quality check (5 reviewers)
5. **Desktop App**: Final integration

### For Debugging:
1. **Desktop App**: Identify issue
2. **API Debug Swarm**: 3 OPUS experts investigate
3. **Desktop App**: Implement fix
4. **API Test Swarm**: Generate regression tests

---

## 📊 SUMMARY

```
═══════════════════════════════════════════════════════════════════════════════
                         PRISM UNIFIED ECOSYSTEM v3.0
═══════════════════════════════════════════════════════════════════════════════

  SKILLS:        37 active skills (~2.45MB documentation)
  AGENTS:        42 specialized agents (OPUS/SONNET/HAIKU)
  SWARMS:        6 pre-built patterns
  RALPH LOOPS:   API-native iteration (no Claude Code needed)
  PROTOCOLS:     10 Commandments + 4 Always-On Laws embedded
  MODELS:        Opus 4.5, Sonnet 4, Haiku 4.5

  STATUS:        ✅ FULLY INTEGRATED

═══════════════════════════════════════════════════════════════════════════════
```
