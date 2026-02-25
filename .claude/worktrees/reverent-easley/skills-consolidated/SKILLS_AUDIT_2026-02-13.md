# PRISM Skills System — Comprehensive Audit Report
## Date: 2026-02-13 | Auditor: Claude (PRISM Development Partner)

---

## Executive Summary

The PRISM skills system has **85 skill directories** on disk, a **SkillRegistry** claiming 113 entries, and **three separate loading mechanisms** that are partially overlapping but not synchronized. The system suffers from three critical problems:

1. **~20 Phantom Skills**: Referenced in code but don't exist on disk — silent failures
2. **~50 Orphan Skills**: Exist on disk but never wired into any loading path — dead weight
3. **Zero Meta-Development Skills**: Nothing helps Claude write better PRISM code

**Impact**: The skill system operates at roughly **35% utilization**. Most skills are never loaded, and the ones that ARE loaded often reference non-existent files. The system creates the *illusion* of skill-powered intelligence while actually running mostly blind.

---

## 1. Architecture Analysis: Three Loading Paths

### Path A: cadenceExecutor.ts → autoSkillHint()
- **Trigger**: Auto-fires based on call count cadence
- **Mechanism**: Uses `SKILL_DOMAIN_MAP` (action→skill[]) + `DOMAIN_CHAIN_DEFINITIONS` (domain→chain)
- **Cache**: In-memory `_skillCache` with 2-minute TTL
- **Budget**: Pressure-adaptive (1-4 skills, 80-400 chars each)
- **Status**: PRIMARY active loading path — but references ~20 phantom skills

### Path B: SkillAutoLoader.ts → autoLoadForTask()
- **Trigger**: Called by cadence system for deeper excerpts
- **Mechanism**: Uses `ACTION_PRIMARY_SKILL` map + `CHAIN_SKILLS` definitions
- **Cache**: Session-scoped `excerptCache` Map
- **Budget**: Pressure-adaptive (15-50 lines primary, 5-20 lines per chain)
- **Status**: SECONDARY path — also references some phantom skills

### Path C: SkillExecutor.ts → full skill loading
- **Trigger**: Explicit `skill_load` action via prism_skill_script dispatcher
- **Mechanism**: Full SkillRegistry with dependency resolution + chain support
- **Cache**: 5-minute TTL with max 50 entries
- **Stats**: **0 loads, 0 unique skills used** — effectively unused
- **Status**: DEAD — beautiful architecture, zero utilization

### Diagnosis
Paths A and B do the actual work but reference different skill sets with different names. Path C is the most sophisticated but is never invoked. The three paths have **no synchronization** — each maintains its own maps and caches independently.

---

## 2. Phantom Skills — Referenced But Non-Existent (~20)

These skills are referenced in `SKILL_DOMAIN_MAP` or chain definitions but **have no directory on disk**. Every reference to these is a silent failure that returns null/undefined:

| Referenced Name | Where Referenced | Probable Intended Skill |
|---|---|---|
| `prism-physics-formulas` | cutting_force, tool_life, stability, deflection, flow_stress, etc. | `prism-physics-unified` |
| `prism-ai-optimization` | multi_optimize | `prism-aiml-unified` |
| `prism-expert-thermodynamics` | thermal | `prism-expert-personas` |
| `prism-material-lookup` | material_get, material_search, material_compare | `prism-materials-core` |
| `prism-physics-reference` | get_thread_specifications | `prism-physics-unified` |
| `prism-expert-quality-control` | get_go_nogo_gauges | `prism-expert-personas` |
| `prism-error-recovery` | alarm_fix + alarm-diagnose chain | ❌ Does not exist anywhere |
| `prism-quality-gates` | safety, completeness, compute, assess + chains | ❌ Does not exist anywhere |
| `prism-ralph-validation` | loop, scrutinize, assess + chains | ❌ Does not exist anywhere |
| `prism-context-pressure` | context_compress, context_pressure, compaction_detect | `prism-context-unified` |
| `prism-context-engineering` | memory_externalize, memory_restore, attention_score, focus_optimize | `prism-context-unified` |
| `prism-session-handoff` | resume_session, handoff_prepare | `prism-sp-handoff` |
| `prism-learning-engines` | error_patterns | ❌ Does not exist anywhere |
| `prism-agent-selector` | agent_execute | ❌ Does not exist anywhere |
| `prism-swarm-coordinator` | agent_execute, agent_parallel, swarm_execute, swarm_consensus | ❌ Does not exist anywhere |
| `prism-batch-orchestrator` | agent_parallel | ❌ Does not exist anywhere |
| `prism-expert-mechanical-engineer` | machine_get, machine_search, machine_capabilities | `prism-expert-personas` |
| `prism-state-manager` | state_save, state_load, state_checkpoint | `prism-session-master` |
| `prism-session-buffer` | state_checkpoint | `prism-session-master` |
| `prism-task-continuity` | resume_session, todo_update, todo_read | ❌ Does not exist anywhere |

**Impact**: 62 out of ~110 action→skill mappings reference at least one phantom skill. This means **more than half** of all auto-hint attempts partially or fully fail.

---

## 3. Orphan Skills — Exist But Never Wired (~50)

These skills have full SKILL.md files on disk but are **never referenced** in any SKILL_DOMAIN_MAP entry, chain definition, or bundle:

### High-Value Orphans (should be wired immediately)
| Skill | Size | Why It Matters |
|---|---|---|
| `prism-physics-unified` | 14.4KB/456L | Consolidates physics formulas — should replace phantom `prism-physics-formulas` |
| `prism-materials-core` | 6.9KB/173L | Core material access — should replace phantom `prism-material-lookup` |
| `prism-context-unified` | 5.5KB/134L | Context management — should replace phantoms `prism-context-pressure` + `prism-context-engineering` |
| `prism-validation-unified` | 8.3KB/188L | Unified validation — should replace phantom `prism-quality-gates` |
| `prism-uncertainty-propagation` | 13.2KB/365L | Critical for manufacturing uncertainty bounds |
| `prism-hook-system` | 18.4KB/517L | Hook authoring patterns — essential for system development |
| `prism-code-quality` | 7.8KB/203L | Code quality patterns |
| `prism-code-safety` | 9.1KB/232L | Safety patterns for code |

### Development Orphans (useful for PRISM development)
| Skill | Size | Content |
|---|---|---|
| `prism-dev-accelerator` | 7.2KB/176L | Development acceleration patterns |
| `prism-dev-guide` | 13.8KB/381L | Development guide |
| `prism-dispatcher-composer` | 10.1KB/262L | How to compose dispatchers |
| `prism-wiring-templates` | 13.2KB/343L | Templates for wiring new features |
| `prism-large-file-writer` | 7.8KB/193L | Large file writing patterns |
| `prism-testing-strategy` | 2.9KB/74L | Testing strategy |
| `prism-codebase-packaging` | 6.2KB/140L | Packaging patterns |

### Domain Orphans (manufacturing knowledge sitting idle)
| Skill | Size | Content |
|---|---|---|
| `prism-post-processor-reference` | 18.4KB/627L | CNC post-processor reference |
| `prism-tool-holder-schema` | 6.2KB/152L | Tool holder specifications |
| `prism-signal-processing` | 18.6KB/665L | Signal processing for monitoring |
| `prism-synergy-calculator` | 8.9KB/220L | Cross-domain synergy calculations |
| `prism-knowledge-graph` | 2.4KB/57L | Knowledge graph patterns |
| `prism-cross-domain-synthesizer` | 7.1KB/166L | Cross-domain synthesis |
| `prism-formula-evolution` | 18.2KB/513L | Formula evolution tracking |

### Stub Orphans (too small to be useful, <3KB)
| Skill | Size | Assessment |
|---|---|---|
| `prism-api-lifecycle` | 2.0KB/43L | Stub — needs expansion or merge |
| `prism-high-reliability` | 2.0KB/70L | Stub — needs expansion or merge |
| `prism-codebase-health` | 2.1KB/48L | Stub — merge into code-quality |
| `prism-session-intelligence` | 2.3KB/53L | Stub — merge into session-master |
| `prism-knowledge-graph` | 2.4KB/57L | Stub — merge into knowledge-base |
| `prism-self-evolution-engine` | 2.5KB/52L | Stub — needs expansion |
| `prism-data-pipeline` | 2.6KB/61L | Stub — needs expansion |
| `prism-observability` | 2.7KB/61L | Stub — merge into performance-patterns |
| `prism-intent-disambiguator` | 3.0KB/52L | Stub — merge into query-intelligence |

---

## 4. Name Mismatch Analysis

The most damaging issue: the code references one name, the disk has another.

| Code References | Disk Has | Fix |
|---|---|---|
| `prism-physics-formulas` | `prism-physics-unified` | Remap in SKILL_DOMAIN_MAP |
| `prism-material-lookup` | `prism-materials-core` | Remap in SKILL_DOMAIN_MAP |
| `prism-context-pressure` | `prism-context-unified` | Remap in SKILL_DOMAIN_MAP |
| `prism-context-engineering` | `prism-context-unified` | Remap in SKILL_DOMAIN_MAP |
| `prism-session-handoff` | `prism-sp-handoff` | Remap in SKILL_DOMAIN_MAP |
| `prism-expert-mechanical-engineer` | `prism-expert-personas` | Remap in SKILL_DOMAIN_MAP |
| `prism-expert-thermodynamics` | `prism-expert-personas` | Remap in SKILL_DOMAIN_MAP |
| `prism-expert-quality-control` | `prism-expert-personas` | Remap in SKILL_DOMAIN_MAP |
| `prism-ai-optimization` | `prism-aiml-unified` | Remap in SKILL_DOMAIN_MAP |
| `prism-state-manager` | `prism-session-master` | Remap in SKILL_DOMAIN_MAP |
| `prism-session-buffer` | `prism-session-master` | Remap in SKILL_DOMAIN_MAP |

---

## 5. Size Distribution Analysis

| Range | Count | Assessment |
|---|---|---|
| <3KB (stubs) | 12 | Too small to provide value — merge or expand |
| 3-10KB (light) | 38 | Reasonable for focused skills |
| 10-25KB (standard) | 23 | Good content density |
| 25-40KB (heavy) | 8 | Reference-grade materials |
| 40KB+ (massive) | 4 | Controller programming refs (FANUC, Siemens, Heidenhain, G-code) |

Total: 1,060KB across 85 skills (avg 12.5KB each).

---

## 6. Critical Gap Analysis — Missing Skills

### Gap A: Meta-Development Skills (HIGHEST IMPACT)
No skills exist that help Claude develop PRISM itself. This is the single biggest gap — every session starts without institutional knowledge of how to:
- Add a new dispatcher/action/engine
- Wire hooks correctly
- Handle common build failures
- Navigate the codebase architecture
- Apply anti-regression patterns during file writes

### Gap B: Error Recovery Skills
Referenced `prism-error-recovery`, `prism-learning-engines`, `prism-task-continuity` don't exist. No skill captures common error patterns and their fixes.

### Gap C: Agent/Swarm Skills
Referenced `prism-agent-selector`, `prism-swarm-coordinator`, `prism-batch-orchestrator` don't exist. The orchestration system has no skill-level guidance.

### Gap D: Quality Gate Skills
Referenced `prism-quality-gates`, `prism-ralph-validation` don't exist. The validation pipeline has no procedural skill backing.

### Gap E: Regression Prevention Skills
While `prism-anti-regression` exists (36KB), it's not wired into the cadence loading for file-write operations where it's most needed.

---

## 7. Recommendations

### Immediate (Session-level fixes)
1. **Fix SKILL_DOMAIN_MAP** — Remap all 11 name mismatches to actual disk names
2. **Create 5 missing critical skills** — error-recovery, quality-gates, task-continuity, agent-coordinator, ralph-validation
3. **Wire 8 high-value orphans** into SKILL_DOMAIN_MAP

### Short-term (1-2 sessions)
4. **Merge 9 stubs** into their parent skills
5. **Create meta-development skills** (detailed below)
6. **Synchronize loading paths** — single source of truth for skill→action mapping

### Medium-term (3-5 sessions)
7. **Deprecate SkillExecutor's dead Path C** or integrate it as the single loading mechanism
8. **Add usage telemetry** — track which skills actually get loaded and provide value
9. **Implement skill versioning** — track when skills were last updated vs when the code they describe changed
