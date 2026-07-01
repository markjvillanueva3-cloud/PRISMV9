---
name: prism-prompt-engineering
version: "1.0"
level: 0
category: always-on
law: 9
description: |
  Level 0 ALWAYS-ON meta-skill that enforces prompt engineering quality on ALL interactions.
  Wraps every agent call, skill load, and API interaction with quality gates.
  Use when: ALWAYS - this fires automatically on every operation via SYS-PROMPT hooks.
  Provides: 7-step protocol, PQS scoring (F-PROMPT-001), tier-specific templates, 
  token efficiency (F-PROMPT-002), iteration prediction (F-PROMPT-003).
  Key principle: Every prompt is optimized for clarity, completeness, and safety.
  Threshold: PQS >= 0.85 required to proceed.
---

# PRISM-PROMPT-ENGINEERING
## Law 9: Meta-Skill for Optimized Prompts
### Version 1.0 | Level 0 Always-On | ~25KB

---

# SECTION 1: OVERVIEW

## 1.1 Purpose

This skill **wraps ALL PRISM interactions** with prompt engineering quality gates. Every agent call, skill load, and API interaction must pass PQS >= 0.85.

**Why Law 9 Exists:**
- Agent effectiveness depends on prompt quality
- Poor prompts waste tokens and produce poor results
- Consistency across 64 agents requires standardization
- Safety requires prompt injection protection
- Manufacturing context requires precision

**This Skill Provides:**
- 7-step prompt crafting protocol
- Prompt Quality Score (F-PROMPT-001)
- Token Efficiency metrics (F-PROMPT-002)
- Iteration prediction (F-PROMPT-003)
- Tier-specific templates (OPUS/SONNET/HAIKU)
- 5 SYS-PROMPT hooks (Priority 0)

## 1.2 The Prompt Engineering Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       PROMPT ENGINEERING PHILOSOPHY (Law 9)                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRINCIPLE 1: CLARITY OVER CLEVERNESS                                                   │
│  ─────────────────────────────────────                                                  │
│  Clear, explicit prompts outperform clever tricks. Say exactly what you need.           │
│  Ambiguity is the enemy of reliability.                                                 │
│                                                                                         │
│  PRINCIPLE 2: CONTEXT IS CRITICAL                                                       │
│  ─────────────────────────────────                                                      │
│  Every prompt needs: Role + Context + Task + Format. Missing any = degraded results.    │
│  Manufacturing context (PRISM) requires domain-specific framing.                        │
│                                                                                         │
│  PRINCIPLE 3: STRUCTURE ENABLES PARSING                                                 │
│  ─────────────────────────────────────                                                  │
│  Use XML tags, JSON schemas, clear delimiters. Structured output is reliable output.    │
│  Code blocks for code, sections for documents.                                          │
│                                                                                         │
│  PRINCIPLE 4: SAFETY IS NON-NEGOTIABLE                                                  │
│  ─────────────────────────────────────                                                  │
│  Every prompt must resist injection attacks. Never trust user input without validation. │
│  Manufacturing prompts affect physical machines = safety critical.                      │
│                                                                                         │
│  PRINCIPLE 5: EFFICIENCY MATTERS                                                        │
│  ─────────────────────────────────────                                                  │
│  Tokens cost money and context. HAIKU tasks don't need OPUS-level prompts.              │
│  Match prompt complexity to task tier.                                                  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 System Hooks (Priority 0 - Fire First)

| Hook | Fire Point | Effect | Enforcement |
|------|------------|--------|-------------|
| **SYS-PROMPT-001** | agent:preExecute | Optimizes all 64 agent prompts | MANDATORY |
| **SYS-PROMPT-002** | skill:preLoad | Injects PE context into skill loading | MANDATORY |
| **SYS-PROMPT-003** | api:preCall | Validates external API prompts | MANDATORY |
| **SYS-PROMPT-004** | conversation:turn | Maintains context across turns | MANDATORY |
| **SYS-PROMPT-005** | output:preGenerate | Enforces output format compliance | MANDATORY |

**Priority 0** = These hooks fire BEFORE all other hooks (including Law 1-8 hooks).

## 1.4 When This Skill Activates

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    ⚠️ AUTO-ACTIVATION RULES - LEVEL 0 ALWAYS-ON                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  This skill AUTOMATICALLY ACTIVATES on:                                                 │
│                                                                                         │
│  1. ANY agent invocation (64 agents × every call)                                       │
│  2. ANY skill loading (100 skills)                                                      │
│  3. ANY API call to external services                                                   │
│  4. ANY user conversation turn                                                          │
│  5. ANY output generation                                                               │
│                                                                                         │
│  You do NOT need to manually invoke this skill.                                         │
│  The SYS-PROMPT hooks fire automatically.                                               │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# SECTION 2: THE 7-STEP PROTOCOL

## 2.1 Overview

Every prompt crafted in PRISM follows this 7-step protocol:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           7-STEP PROMPT ENGINEERING PROTOCOL                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STEP 1: ANALYZE                                                                        │
│  ─────────────────                                                                      │
│  • Identify key elements (inputs, outputs, constraints)                                 │
│  • Define desired outcomes with success criteria                                        │
│  • List domain context (manufacturing, materials, machines)                             │
│                                                                                         │
│  STEP 2: CRAFT                                                                          │
│  ─────────────────                                                                      │
│  • Select framework based on task type:                                                 │
│    - Direct: Simple, single-step tasks                                                  │
│    - CRAFT: Complex multi-part tasks                                                    │
│    - RISEN: Role-heavy expert tasks                                                     │
│    - CoT: Reasoning-heavy tasks                                                         │
│  • Build prompt structure with chosen framework                                         │
│                                                                                         │
│  STEP 3: CALIBRATE                                                                      │
│  ─────────────────                                                                      │
│  • Balance specificity vs flexibility                                                   │
│  • Too specific = brittle, too vague = unreliable                                       │
│  • Match precision level to task criticality                                            │
│                                                                                         │
│  STEP 4: CONTEXTUALIZE                                                                  │
│  ─────────────────                                                                      │
│  • Add role definition (who is responding)                                              │
│  • Add domain context (PRISM manufacturing)                                             │
│  • Specify output format (JSON, code, prose)                                            │
│                                                                                         │
│  STEP 5: AMBIGUITY                                                                      │
│  ─────────────────                                                                      │
│  • Identify ambiguous terms                                                             │
│  • Resolve OR explicitly state assumptions                                              │
│  • Define edge case handling                                                            │
│                                                                                         │
│  STEP 6: FORMAT                                                                         │
│  ─────────────────                                                                      │
│  • Structure for parsing (XML tags, delimiters)                                         │
│  • Code block ready (if applicable)                                                     │
│  • Clear section separation                                                             │
│                                                                                         │
│  STEP 7: EXPLAIN                                                                        │
│  ─────────────────                                                                      │
│  • Document reasoning for prompt choices                                                │
│  • Enable future iteration and improvement                                              │
│  • Log for PE calibration feedback                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Framework Selection Guide

| Task Type | Framework | When to Use |
|-----------|-----------|-------------|
| **Direct** | Simple instruction | Single-step, clear outcome |
| **CRAFT** | Context, Role, Action, Format, Tone | Multi-part complex tasks |
| **RISEN** | Role, Instructions, Steps, End-goal, Narrowing | Expert persona tasks |
| **CoT** | Chain of Thought | Reasoning, analysis, math |

---

# SECTION 3: PROMPT QUALITY SCORE (F-PROMPT-001)

## 3.1 Formula

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           F-PROMPT-001: PROMPT QUALITY SCORE                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PQS = (G1 + G2 + G3 + G4 + G5 + G6) / 6                                               │
│                                                                                         │
│  Where:                                                                                 │
│    G1 = Clarity Gate (0-1)        Is the prompt unambiguous?                           │
│    G2 = Completeness Gate (0-1)   Are all requirements specified?                      │
│    G3 = Format Gate (0-1)         Is output format clearly defined?                    │
│    G4 = Constraints Gate (0-1)    Are boundaries and limits stated?                    │
│    G5 = Safety Gate (0-1)         Is injection protection in place?                    │
│    G6 = Context Gate (0-1)        Is domain context provided?                          │
│                                                                                         │
│  THRESHOLDS:                                                                            │
│  ─────────────                                                                          │
│  PQS >= 0.85:  OPTIMAL     - Proceed with execution                                    │
│  PQS 0.50-0.84: WARNING    - Proceed with logging, may need iteration                  │
│  PQS < 0.50:   BLOCKED     - Must improve prompt before proceeding                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Gate Scoring Rubrics

### G1: Clarity Gate
| Score | Criteria |
|-------|----------|
| 1.0 | No ambiguous terms, single interpretation possible |
| 0.75 | Minor ambiguity, likely understood correctly |
| 0.50 | Some terms could be misinterpreted |
| 0.25 | Multiple interpretations possible |
| 0.0 | Prompt is unclear or contradictory |

### G2: Completeness Gate
| Score | Criteria |
|-------|----------|
| 1.0 | All inputs, outputs, steps defined |
| 0.75 | Most requirements specified, minor gaps |
| 0.50 | Key requirements present, some missing |
| 0.25 | Major requirements missing |
| 0.0 | Insufficient specification to execute |

### G3: Format Gate
| Score | Criteria |
|-------|----------|
| 1.0 | Exact output format specified with example |
| 0.75 | Format specified, no example |
| 0.50 | General format guidance only |
| 0.25 | Vague format hints |
| 0.0 | No format specification |

### G4: Constraints Gate
| Score | Criteria |
|-------|----------|
| 1.0 | All boundaries, limits, and exclusions stated |
| 0.75 | Key constraints present |
| 0.50 | Some constraints, gaps in coverage |
| 0.25 | Minimal constraint specification |
| 0.0 | No constraints (anything goes) |

### G5: Safety Gate
| Score | Criteria |
|-------|----------|
| 1.0 | Injection protection, input validation, sandboxing |
| 0.75 | Basic safety measures in place |
| 0.50 | Some safety consideration |
| 0.25 | Minimal safety |
| 0.0 | No safety measures (vulnerable) |

### G6: Context Gate
| Score | Criteria |
|-------|----------|
| 1.0 | Full PRISM context: domain, role, background |
| 0.75 | Good context, minor gaps |
| 0.50 | Partial context |
| 0.25 | Minimal context |
| 0.0 | No context provided |

---

# SECTION 4: TOKEN EFFICIENCY (F-PROMPT-002)

## 4.1 Formula

```
TE = Output_Quality / Tokens_Used

Where:
  Output_Quality = Task completion × correctness (0-1)
  Tokens_Used = Input tokens + Output tokens
```

## 4.2 Tier Efficiency Targets

| Tier | Target TE | Max Tokens | Use Case |
|------|-----------|------------|----------|
| OPUS | 0.60+ | Unlimited | Complex reasoning, quality-critical |
| SONNET | 0.75+ | 4K input, 2K output | Standard tasks, balanced |
| HAIKU | 0.90+ | 1K input, 500 output | Simple tasks, speed-critical |

---

# SECTION 5: TIER-SPECIFIC TEMPLATES

## 5.1 OPUS Template (Full CoT)

```xml
<opus_prompt>
  <system_context>
    You are an expert [ROLE] working on PRISM Manufacturing Intelligence.
    Manufacturing context: CNC machining, CAD/CAM, materials science.
    Safety: Your outputs may affect physical machines. Accuracy is critical.
  </system_context>
  
  <task>
    [DETAILED TASK DESCRIPTION]
  </task>
  
  <requirements>
    - [REQUIREMENT 1]
    - [REQUIREMENT 2]
    - [REQUIREMENT N]
  </requirements>
  
  <constraints>
    - [CONSTRAINT 1]
    - [CONSTRAINT N]
  </constraints>
  
  <thinking_process>
    Before responding, think through:
    1. What are the key inputs?
    2. What could go wrong?
    3. What is the best approach?
    4. How do I validate the result?
  </thinking_process>
  
  <output_format>
    [EXACT FORMAT SPECIFICATION]
  </output_format>
  
  <quality_gates>
    - Verify physical plausibility
    - Check unit consistency
    - Validate against known ranges
  </quality_gates>
</opus_prompt>
```

## 5.2 SONNET Template (Efficient Focus)

```xml
<sonnet_prompt>
  <role>[ROLE] for PRISM Manufacturing</role>
  
  <task>[CLEAR TASK]</task>
  
  <inputs>
    [INPUT DATA]
  </inputs>
  
  <output>
    Format: [FORMAT]
    Include: [REQUIRED FIELDS]
  </output>
  
  <validation>
    [KEY CHECKS]
  </validation>
</sonnet_prompt>
```

## 5.3 HAIKU Template (Minimal)

```xml
<haiku_prompt>
  <task>[SINGLE TASK]</task>
  <input>[DATA]</input>
  <output>[FORMAT]</output>
</haiku_prompt>
```

---

# SECTION 6: SAFETY AND INJECTION PROTECTION

## 6.1 Injection Defense Patterns

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           INJECTION PROTECTION PATTERNS                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PATTERN 1: INPUT SANITIZATION                                                          │
│  ─────────────────────────────                                                          │
│  • Strip control characters                                                             │
│  • Escape special delimiters                                                            │
│  • Validate against expected patterns                                                   │
│                                                                                         │
│  PATTERN 2: CONTEXT ISOLATION                                                           │
│  ─────────────────────────────                                                          │
│  • Wrap user input in explicit tags                                                     │
│  • Never let user input break prompt structure                                          │
│  • Use unique delimiters unlikely in normal text                                        │
│                                                                                         │
│  PATTERN 3: PERMISSION BOUNDARIES                                                       │
│  ─────────────────────────────                                                          │
│  • Explicitly state what agent CAN do                                                   │
│  • Explicitly state what agent CANNOT do                                                │
│  • Default deny for unspecified actions                                                 │
│                                                                                         │
│  PATTERN 4: OUTPUT VALIDATION                                                           │
│  ─────────────────────────────                                                          │
│  • Verify output matches expected format                                                │
│  • Reject outputs that contain unexpected structures                                    │
│  • Log anomalies for review                                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Manufacturing-Specific Safety

```
PRISM SAFETY REQUIREMENTS FOR PROMPTS:
────────────────────────────────────────
□ Never generate G-code without validation gates
□ Never recommend speeds/feeds without material confirmation
□ Never bypass safety checks "for testing"
□ Always include uncertainty ranges on calculated values
□ Always reference the 8 Laws in manufacturing outputs
```

---

# SECTION 7: INTEGRATION

## 7.1 Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PE INTEGRATION WITH SP.1 WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  BRAINSTORM (prism-sp-brainstorm)                                                       │
│  └── PE: Craft analysis prompts with CoT framework                                      │
│                                                                                         │
│  PLANNING (prism-sp-planning)                                                           │
│  └── PE: Structure task decomposition prompts                                           │
│                                                                                         │
│  EXECUTION (prism-sp-execution)                                                         │
│  └── PE: Optimize agent prompts per tier                                                │
│                                                                                         │
│  REVIEW-SPEC (prism-sp-review-spec)                                                     │
│  └── PE: Validation prompts with clear criteria                                         │
│                                                                                         │
│  REVIEW-QUALITY (prism-sp-review-quality)                                               │
│  └── PE: Quality check prompts with 10 Commandments                                     │
│                                                                                         │
│  DEBUGGING (prism-sp-debugging)                                                         │
│  └── PE: Diagnostic prompts with structured output                                      │
│                                                                                         │
│  VERIFICATION (prism-sp-verification)                                                   │
│  └── PE: Evidence gathering prompts                                                     │
│                                                                                         │
│  HANDOFF (prism-sp-handoff)                                                             │
│  └── PE: Context transfer prompts                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Cross-References

| Skill | Integration Point |
|-------|-------------------|
| prism-hook-system | 5 SYS-PROMPT hooks at Priority 0 |
| prism-combination-engine | PE constraint in F-PSI-001 |
| prism-skill-orchestrator | PE meta-skill at Level 0 |
| All 64 agents | Tier-specific templates applied |
| All SP.1 skills | PE integrated at each stage |

---

# SECTION 8: QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                     PRISM-PROMPT-ENGINEERING QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  LAW 9: PROMPT ENGINEERING | PQS >= 0.85 | LEVEL 0 ALWAYS-ON                           │
│                                                                                         │
│  7-STEP PROTOCOL:                                                                       │
│  1. ANALYZE   → Elements, outcomes, constraints                                         │
│  2. CRAFT     → Framework selection (Direct/CRAFT/RISEN/CoT)                           │
│  3. CALIBRATE → Specificity vs flexibility balance                                      │
│  4. CONTEXTUALIZE → Role + context + format                                            │
│  5. AMBIGUITY → Resolve or state assumptions                                           │
│  6. FORMAT    → Structure for parsing                                                   │
│  7. EXPLAIN   → Document reasoning                                                      │
│                                                                                         │
│  PQS FORMULA (F-PROMPT-001):                                                           │
│  PQS = (Clarity + Completeness + Format + Constraints + Safety + Context) / 6          │
│                                                                                         │
│  THRESHOLDS:                                                                            │
│  >= 0.85: OPTIMAL (proceed)                                                            │
│  0.50-0.84: WARNING (proceed with logging)                                             │
│  < 0.50: BLOCKED (must improve)                                                        │
│                                                                                         │
│  HOOKS (Priority 0):                                                                    │
│  SYS-PROMPT-001: agent:preExecute                                                      │
│  SYS-PROMPT-002: skill:preLoad                                                         │
│  SYS-PROMPT-003: api:preCall                                                           │
│  SYS-PROMPT-004: conversation:turn                                                     │
│  SYS-PROMPT-005: output:preGenerate                                                    │
│                                                                                         │
│  TIER TEMPLATES:                                                                        │
│  OPUS   → Full CoT, comprehensive context                                              │
│  SONNET → Efficient, focused context                                                   │
│  HAIKU  → Minimal, single task                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# DOCUMENT END

**Skill:** prism-prompt-engineering
**Version:** 1.0
**Level:** 0 (Always-On)
**Law:** 9
**Total Sections:** 8
**Created:** 2026-01-29
**Status:** COMPLETE

**Key Features:**
- 7-step prompt crafting protocol
- Prompt Quality Score (F-PROMPT-001) with 6 gates
- Token Efficiency formula (F-PROMPT-002)
- 5 SYS-PROMPT hooks at Priority 0
- Tier-specific templates (OPUS/SONNET/HAIKU)
- Injection protection patterns
- Manufacturing safety integration

**Principle:** Every prompt is optimized for clarity, completeness, and safety.
**Threshold:** PQS >= 0.85 required to proceed.

---
