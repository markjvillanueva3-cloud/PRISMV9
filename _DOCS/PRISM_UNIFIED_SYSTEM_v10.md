# PRISM UNIFIED DEVELOPMENT SYSTEM v10.0
## Master Integration: Skills + Agents + Protocols + Learning
### Updated 2026-01-25

---

# 🔴 SESSION START PROTOCOL

```
1. READ: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
2. CHECK: Is currentTask IN_PROGRESS? → Resume from checkpoint
3. APPLY: 4 Always-On Laws (below)
4. DECIDE: Handle myself OR delegate to API swarm?
5. WORK: Begin task with appropriate skill/agent combination
```

---

# ⚡ THE 4 ALWAYS-ON LAWS

These CANNOT be overridden:

| Law | Question to Ask |
|-----|-----------------|
| **LIFE-SAFETY** | "Would I trust this with my own safety?" |
| **COMPLETENESS** | "Is every field populated? Every case handled?" |
| **ANTI-REGRESSION** | "Is the new version as complete as the old?" |
| **PREDICTIVE** | "What are 3 ways this fails?" |

---

# 🚀 API MULTI-AGENT SYSTEM v4.0

## 56 Specialized Agents

| Tier | Count | Cost/1M Out | Use For |
|------|-------|-------------|---------|
| **OPUS** | 15 | $75 | Complex reasoning, architecture, debugging |
| **SONNET** | 32 | $15 | Balanced tasks, extraction, validation |
| **HAIKU** | 9 | $1.25 | Fast lookups, formatting |

## 8 Agent Categories

**CORE (8):** extractor, validator, merger, coder, analyst, researcher, architect, coordinator

**MANUFACTURING (10):** materials_scientist, machinist, tool_engineer, physics_validator, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, domain_expert

**PRISM (8):** monolith_navigator, migration_specialist, schema_designer, api_designer, completeness_auditor, regression_checker, state_manager, synthesizer

**QUALITY (6):** test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer

**CALCULATORS (4):** cutting_calculator, thermal_calculator, force_calculator, surface_calculator

**LOOKUP (4):** standards_expert, formula_lookup, material_lookup, tool_lookup

**SPECIALIZED (4):** debugger, root_cause_analyst, task_decomposer, estimator

**INTELLIGENCE (12):** context_builder, learning_extractor, verification_chain, uncertainty_quantifier, cross_referencer, knowledge_graph_builder, pattern_matcher, quality_gate, session_continuity, meta_analyst, dependency_analyzer, call_tracer

## Quick Commands

```powershell
# INTELLIGENT MODE (auto-everything) - RECOMMENDED
python prism_unified_system_v4.py --intelligent "Your task here"

# Manufacturing with verification + uncertainty
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop (iterate until done)
python prism_unified_system_v4.py --ralph architect "Design X. COMPLETE when done." 10

# List all 56 agents
python prism_unified_system_v4.py --list
```

## When to Delegate

| DELEGATE TO API | HANDLE MYSELF |
|-----------------|---------------|
| Parallel extraction (5+ items) | Simple lookups |
| Multi-expert analysis | Single file edits |
| Complex iteration (Ralph) | User interaction |
| Verification chains needed | Reading/summarizing |
| Heavy computation | Coordination |

---

# 🎯 37 ACTIVE SKILLS

## Level 0-1: Always-On
```
prism-life-safety-mindset, prism-maximum-completeness, regression_skill_v2,
prism-predictive-thinking, prism-skill-orchestrator
```

## Level 2: Core Workflow (SP.1)
```
prism-sp-brainstorm → prism-sp-planning → prism-sp-execution → 
prism-sp-review-spec → prism-sp-review-quality → prism-sp-verification → prism-sp-handoff

+ prism-sp-debugging (when errors occur)
```

## Level 2: Domain Specialists
- **Monolith (4):** index, extractor, navigator, codebase-packaging
- **Materials (5):** schema, physics, lookup, validator, enhancer
- **Masters (7):** session, quality, code, knowledge, expert, controller-quick-ref, dev-utilities
- **Quality (2):** tdd-enhanced, root-cause-tracing

## Level 3: References (10)
```
api-contracts, error-catalog, manufacturing-tables, wiring-templates,
product-calculators, post-processor-reference, fanuc-programming,
siemens-programming, heidenhain-programming, gcode-reference
```

---

# 🔄 AUTO-SKILL → AGENT MAPPING

| Task Keywords | Skills | Agents | Tier |
|---------------|--------|--------|------|
| brainstorm, design | sp-brainstorm, sp-planning | architect, researcher, context_builder | OPUS |
| extract, parse | monolith-extractor | extractor, dependency_analyzer, regression_checker | SONNET |
| debug, fix, error | sp-debugging, root-cause-tracing | debugger, root_cause_analyst, call_tracer | OPUS |
| material, alloy | material-schema, material-physics | materials_scientist, physics_validator, uncertainty_quantifier | OPUS |
| cutting, machining | expert-master | machinist, tool_engineer, force_calculator | OPUS |
| validate, verify | sp-verification | validator, verification_chain, quality_gate | SONNET |
| test, tdd | tdd-enhanced | test_generator, coder, verification_chain | SONNET |

---

# 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - 100% DB/engine utilization (min 6-8 consumers per database)
2. **FUSE** - Cross-domain concepts (materials + physics + tooling + limits)
3. **VERIFY** - Physics + empirical + historical (minimum 3 sources)
4. **LEARN** - Every interaction → ML pipeline → _LEARNING/
5. **UNCERTAINTY** - Confidence intervals on ALL numerical values
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup before changes
9. **PERFORM** - <2s load, <500ms calculations
10. **USER-OBSESS** - 3-click rule for any action

---

# 🛡️ ENHANCED PROTOCOLS

## Anti-Regression Protocol (MANDATORY)
```
1. INVENTORY old version completely
2. INVENTORY new version completely
3. COMPARE: new < old → BLOCK IMMEDIATELY
4. JUSTIFY every removal in writing
5. VERIFY with regression_checker agent
```

## Verification Chain (4 Levels)
| Level | Type | Agent | Requirement |
|-------|------|-------|-------------|
| 1 | Self-Check | Original agent | Verify own output |
| 2 | Peer Review | Different agent, same domain | Independent validation |
| 3 | Cross-Domain | Physics + empirical sources | Multi-source confirmation |
| 4 | Historical | Known good results | Match proven patterns |

**95% confidence required on safety-critical items.**

## Uncertainty Quantification
```
NEVER output a bare number
ALWAYS: value ± uncertainty (confidence level)
Example: "Cutting force: 1450 ± 120 N (95% CI)"
```

---

# 🛠️ TOOL QUICK REFERENCE

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| List C: dir | `Filesystem:list_directory` |
| Read LARGE file | `Desktop Commander:read_file` (offset/length) |
| **Append to file** | `Desktop Commander:write_file` (mode:"append") |
| Search content | `Desktop Commander:start_search` (searchType:"content") |
| **Run API swarm** | `Desktop Commander:start_process` with python |

**⚠️ NEVER save PRISM work to /home/claude/ - RESETS EVERY SESSION**

---

# 📍 KEY PATHS

```
STATE:       C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
MONOLITH:    C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\ (986,621 lines)
EXTRACTED:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\
SKILLS:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS\ (37 skills)
PROJECT:     /mnt/project/ (always-on skills)
LOGS:        C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
API_SCRIPTS: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SCRIPTS\
API_RESULTS: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\API_RESULTS\
LEARNING:    C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_LEARNING\
KNOWLEDGE:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_KNOWLEDGE\
```

---

# 🛡️ BUFFER ZONES

| Zone | Trigger | Action |
|------|---------|--------|
| 🟢 GREEN | 0-8 tool calls | Work freely |
| 🟡 YELLOW | 9-14 tool calls | Checkpoint soon |
| 🟠 ORANGE | 15-18 tool calls | Checkpoint NOW |
| 🔴 RED | 19+ tool calls | EMERGENCY STOP |

---

# ⚡ LARGE FILE WRITING (>50KB)

```
CHUNK 1: Filesystem:write_file (header + first items)
CHUNK 2: Desktop Commander:write_file mode='append' (more items)
CHUNK 3: Desktop Commander:write_file mode='append' (final + closing)
```
Keep chunks under 25KB.

---

# 🚨 ABSOLUTE REQUIREMENTS

- ✗ NO tasks without checking always-on laws first
- ✗ NO replacement without anti-regression protocol
- ✗ NO module without ALL consumers wired
- ✗ NO calculation with <6 data sources
- ✗ NO session without state file update
- ✗ NO mid-task restarts without user approval
- ✗ NO safety-critical output without verification chain
- ✗ NO numerical output without uncertainty bounds
- ✓ CHECKPOINT after every significant step
- ✓ VERIFY before and after EVERY operation
- ✓ EXTRACT LEARNINGS after task completion
- ✓ DELEGATE to API swarm when parallelism needed

---

# 🧠 INTELLIGENCE FEATURES

| Feature | How It Works |
|---------|--------------|
| **Auto-Skill Detection** | Keywords in prompts → relevant skills + agents |
| **Session Continuity** | CURRENT_STATE.json auto-loaded |
| **Learning Pipeline** | Patterns extracted → _LEARNING/ |
| **Knowledge Graphs** | Concepts connected → _KNOWLEDGE/ |
| **Verification Chains** | 4-level validation for safety |
| **Uncertainty Quantification** | All values have error bounds |
| **Quality Gates** | Block incomplete work |
| **Meta-Analysis** | System improves from performance |
| **Ralph Loops** | Iterate until truly complete |

---

# 📊 SYSTEM SUMMARY

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v10.0                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SKILLS:         37 active (~2.45MB documentation)                           ║
║  AGENTS:         56 specialized (15 OPUS, 32 SONNET, 9 HAIKU)                ║
║  SWARMS:         8 pre-built patterns                                        ║
║  MODELS:         Opus 4.5 ✓ | Sonnet 4 ✓ | Haiku 4.5 ✓                       ║
║                                                                              ║
║  MATERIALS:      1,502 @ 127 parameters (143.5% of target)                   ║
║  MONOLITH:       986,621 lines | 831 modules                                 ║
║                                                                              ║
║  INTELLIGENCE:                                                               ║
║  • 12 intelligence agents for smarter operation                              ║
║  • Auto-skill detection from task keywords                                   ║
║  • Learning pipeline extracts patterns                                       ║
║  • Verification chains ensure safety                                         ║
║  • Ralph loops iterate until complete                                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

# 🎯 QUICK DECISION TREE

```
START
  │
  ├─ Simple lookup/edit? → DO MYSELF
  │
  ├─ Parallel work (5+ items)? → API: --intelligent
  │
  ├─ Manufacturing analysis? → API: --manufacturing
  │
  ├─ Complex iteration needed? → API: --ralph
  │
  ├─ Multi-expert opinions? → API: verified_manufacturing_swarm
  │
  └─ Extraction with safety? → API: deep_extraction_swarm
```
