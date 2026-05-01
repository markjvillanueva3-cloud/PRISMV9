# PRISM CONDENSED PROTOCOL v6.0
## Quick Reference (Updated 2026-01-25)
### NOW WITH: 56 API Agents + Auto-Skill Detection + Learning Pipeline

---

## 🔴 EVERY SESSION - DO THIS FIRST

```
1. READ: C:\\PRISM\CURRENT_STATE.json
2. CHECK: Is currentTask IN_PROGRESS? → Resume from checkpoint, don't restart
3. LOAD: Always-on mindsets are automatic (Level 0-1 in /mnt/project/)
4. READ: Phase-appropriate skill from C:\_SKILLS\prism-*
5. DECIDE: Handle myself OR delegate to API swarm?
6. WORK: Then begin task
```

---

## 🚀 API MULTI-AGENT SYSTEM v4.0 (NEW!)

### When to Delegate to API Swarm:
- Parallel extraction needed (5+ items simultaneously)
- Multiple expert opinions required (manufacturing analysis)
- Complex iteration (Ralph loops until completion)
- Heavy computation (100+ materials)
- Manufacturing analysis with verification + uncertainty

### Quick Commands:
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

### Script Location:
```
C:\\PRISM\_SCRIPTS\prism_unified_system_v4.py
```

---

## 🛠️ TOOL QUICK REFERENCE

| Task | Tool |
|------|------|
| Read C: file | `Filesystem:read_file` |
| Write C: file | `Filesystem:write_file` |
| List C: dir | `Filesystem:list_directory` |
| Read LARGE file | `Desktop Commander:read_file` (offset/length) |
| **Append to file** | `Desktop Commander:write_file` (mode:"append") |
| Search content | `Desktop Commander:start_search` (searchType:"content") |
| Read skill | `view("/mnt/skills/user/prism-[name]/SKILL.md")` |
| **Run API swarm** | `Desktop Commander:start_process` with python command |

**⚠️ NEVER save PRISM work to /home/claude/ - RESETS EVERY SESSION**

---

## 📍 KEY PATHS

```
STATE:       C:\\PRISM\CURRENT_STATE.json
MONOLITH:    C:\..\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\*.html (986,621 lines)
EXTRACTED:   C:\\PRISM\EXTRACTED\
SKILLS:      C:\\PRISM\_SKILLS\ (37 skills)
PROJECT:     /mnt/project/ (always-on skills)
LOGS:        C:\\PRISM\SESSION_LOGS\
API_SCRIPTS: C:\\PRISM\_SCRIPTS\
API_RESULTS: C:\\PRISM\API_RESULTS\
LEARNING:    C:\\PRISM\_LEARNING\
KNOWLEDGE:   C:\\PRISM\_KNOWLEDGE\
```

---

## ⚡ THE 4 ALWAYS-ON LAWS

```
1. LIFE-SAFETY: "Would I trust this with my own safety?"
2. COMPLETENESS: "Is every field populated? Every case handled?"
3. ANTI-REGRESSION: "Is the new version as complete as the old?"
4. PREDICTIVE: "What are 3 ways this fails?"
```

---

## 🤖 56 API AGENTS BY CATEGORY

### Model Tiers:
- **OPUS** (15 agents): Complex reasoning, architecture, debugging - $75/1M out
- **SONNET** (32 agents): Balanced tasks, extraction, validation - $15/1M out
- **HAIKU** (9 agents): Fast lookups, formatting - $1.25/1M out

### Categories:

**CORE (8):** extractor, validator, merger, coder, analyst, researcher, architect, coordinator

**MANUFACTURING (10):** materials_scientist, machinist, tool_engineer, physics_validator, cam_specialist, quality_engineer, process_engineer, machine_specialist, gcode_expert, domain_expert

**PRISM (8):** monolith_navigator, migration_specialist, schema_designer, api_designer, completeness_auditor, regression_checker, state_manager, synthesizer

**QUALITY (6):** test_generator, code_reviewer, optimizer, refactorer, security_auditor, documentation_writer

**CALCULATORS (4):** cutting_calculator, thermal_calculator, force_calculator, surface_calculator

**LOOKUP (4):** standards_expert, formula_lookup, material_lookup, tool_lookup

**SPECIALIZED (4):** debugger, root_cause_analyst, task_decomposer, estimator

**INTELLIGENCE (12 - NEW!):** context_builder, learning_extractor, verification_chain, uncertainty_quantifier, cross_referencer, knowledge_graph_builder, pattern_matcher, quality_gate, session_continuity, meta_analyst, dependency_analyzer, call_tracer

---

## 🎯 37 ACTIVE SKILLS

### Level 0-1: Always-On (/mnt/project/)
```
prism-life-safety-mindset, prism-maximum-completeness, regression_skill_v2,
prism-predictive-thinking, prism-skill-orchestrator
```

### Level 2: Core Workflow (SP.1) - 8 Skills
```
prism-sp-brainstorm, prism-sp-planning, prism-sp-execution,
prism-sp-review-spec, prism-sp-review-quality, prism-sp-debugging,
prism-sp-verification, prism-sp-handoff
```

### Level 2: Domain Specialists
- **Monolith (4):** prism-monolith-index, prism-monolith-extractor, prism-monolith-navigator, prism-codebase-packaging
- **Materials (5):** prism-material-schema, prism-material-physics, prism-material-lookup, prism-material-validator, prism-material-enhancer
- **Masters (7):** prism-session-master, prism-quality-master, prism-code-master, prism-knowledge-master, prism-expert-master, prism-controller-quick-ref, prism-dev-utilities
- **Quality (2):** prism-tdd-enhanced, prism-root-cause-tracing

### Level 3: Comprehensive References (10)
```
prism-api-contracts, prism-error-catalog, prism-manufacturing-tables,
prism-wiring-templates, prism-product-calculators, prism-post-processor-reference,
prism-fanuc-programming, prism-siemens-programming, prism-heidenhain-programming,
prism-gcode-reference
```

---

## 🔄 SKILL → AGENT AUTO-MAPPING

Keywords in your prompt automatically trigger skills AND spawn matching agents:

| Task Keywords | Skills Triggered | Agents Spawned |
|---------------|------------------|----------------|
| brainstorm, design, architect | prism-sp-brainstorm, prism-sp-planning | architect, researcher, domain_expert, context_builder |
| extract, parse, pull | prism-monolith-extractor | extractor, monolith_navigator, dependency_analyzer, regression_checker |
| debug, fix, error, bug | prism-sp-debugging, prism-root-cause-tracing | debugger, root_cause_analyst, call_tracer, physics_validator |
| material, alloy, steel, aluminum | prism-material-schema, prism-material-physics | materials_scientist, physics_validator, uncertainty_quantifier |
| cutting, machining, milling | prism-expert-master | machinist, tool_engineer, force_calculator, quality_engineer |
| validate, verify, check | prism-sp-verification | validator, verification_chain, quality_gate, cross_referencer |
| test, tdd, unittest | prism-tdd-enhanced | test_generator, coder, verification_chain |
| session, state, resume | prism-session-master | session_continuity, state_manager, context_builder |

---

## 📋 THE 10 COMMANDMENTS

1. **USE EVERYWHERE** - 100% DB/engine utilization
2. **FUSE** - Cross-domain concepts
3. **VERIFY** - Physics + empirical + historical (min 3 sources)
4. **LEARN** - Every interaction → ML pipeline → _LEARNING/
5. **UNCERTAINTY** - Confidence intervals on ALL numerical values
6. **EXPLAIN** - XAI for all recommendations
7. **GRACEFUL** - Fallbacks for every failure mode
8. **PROTECT** - Validate, sanitize, backup
9. **PERFORM** - <2s load, <500ms calc
10. **USER-OBSESS** - 3-click rule

---

## 🛡️ BUFFER ZONES

| Zone | Trigger | Action |
|------|---------|--------|
| 🟢 GREEN | 0-8 tool calls | Work freely |
| 🟡 YELLOW | 9-14 tool calls | Checkpoint soon |
| 🟠 ORANGE | 15-18 tool calls | Checkpoint NOW |
| 🔴 RED | 19+ tool calls | EMERGENCY STOP |

---

## ⚡ LARGE FILE WRITING (>50KB)

Single writes truncate. Use chunked approach:
```
CHUNK 1: Filesystem:write_file (header + first items)
CHUNK 2: Desktop Commander:write_file mode='append' (more items)
CHUNK 3: Desktop Commander:write_file mode='append' (final + closing)
```
Keep chunks under 25KB.

---

## 🚨 ABSOLUTE REQUIREMENTS

- ✗ NO tasks without checking always-on laws first
- ✗ NO replacement without anti-regression protocol
- ✗ NO module without ALL consumers wired
- ✗ NO calculation with <6 data sources
- ✗ NO session without state file update
- ✗ NO mid-task restarts without user approval
- ✗ NO safety-critical output without verification chain (4 levels)
- ✗ NO numerical output without uncertainty bounds
- ✓ CHECKPOINT after every significant step
- ✓ VERIFY before and after EVERY operation
- ✓ EXTRACT LEARNINGS after task completion
- ✓ DELEGATE to API swarm when parallelism needed

---

## 🧠 INTELLIGENCE AGENTS (Make Claude Smarter)

| Agent | Purpose |
|-------|---------|
| **context_builder** | Loads CURRENT_STATE.json + past learnings BEFORE tasks |
| **learning_extractor** | Extracts reusable patterns AFTER every task |
| **pattern_matcher** | Finds similar past work to avoid repeating mistakes |
| **knowledge_graph_builder** | Connects concepts (Material→Tool→Operation) |
| **session_continuity** | Perfect handoffs between sessions |
| **verification_chain** | 4-level validation (self→peer→cross-domain→historical) |
| **uncertainty_quantifier** | Error bounds on ALL numbers |
| **cross_referencer** | Validates against 3+ independent sources |
| **quality_gate** | BLOCKS incomplete work |
| **meta_analyst** | Improves agents from performance data |
| **dependency_analyzer** | Maps code/data relationships for safe extraction |
| **call_tracer** | Traces execution paths to find root causes |

---

## 📊 SYSTEM SUMMARY

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v4.0                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SKILLS:         37 active (~2.45MB documentation)                           ║
║  AGENTS:         56 specialized (15 OPUS, 32 SONNET, 9 HAIKU)                ║
║  SWARMS:         8 pre-built patterns                                        ║
║  MODELS:         Opus 4.5 ✓ | Sonnet 4 ✓ | Haiku 4.5 ✓                       ║
║                                                                              ║
║  NEW FEATURES:                                                               ║
║  • Auto-Skill Detection (keywords → skills → agents)                         ║
║  • Session Continuity (CURRENT_STATE.json auto-load)                         ║
║  • Learning Pipeline (_LEARNING/ storage)                                    ║
║  • Knowledge Graphs (_KNOWLEDGE/ connections)                                ║
║  • Verification Chains (4-level validation)                                  ║
║  • Uncertainty Quantification (all values have bounds)                       ║
║  • Quality Gates (block incomplete work)                                     ║
║  • Meta-Analysis (system self-improvement)                                   ║
║  • Ralph Loops (iterate until truly complete)                                ║
║                                                                              ║
║  MATERIALS DB:   1,502 materials @ 127 parameters each                       ║
║  MONOLITH:       986,621 lines | 831 modules                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
