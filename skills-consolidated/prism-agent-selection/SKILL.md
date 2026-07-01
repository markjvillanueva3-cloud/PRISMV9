---
name: prism-agent-selection
description: Agent and model tier selection — formula for matching tasks to Opus/Sonnet/Haiku agents based on capability, cost, and task complexity
---
# Agent & Model Selection

## When To Use
- Deciding which Claude model tier to assign for a task (Opus vs Sonnet vs Haiku)
- Configuring swarm execution with mixed-tier agents
- Allocating Claude Code subagents in phase milestones
- "Which agent should handle this?" / "Is this an Opus or Sonnet task?"
- When phase doc ENV says "Code 70% + MCP 30%" and you need to pick which tasks go where
- NOT for: deciding which skills to load (use prism-skill-activation)
- NOT for: swarm execution mechanics (use prism_orchestrate dispatcher)

## How To Use
**SELECTION FORMULA** — score each candidate agent against the task:
```
AGENT_SCORE(agent, task) =
  capability_match × 0.35 +  // Does agent specialize in this task type?
  cost_efficiency × 0.25 +   // Cost vs value of using this tier?
  availability × 0.20 +      // Is agent available (not rate-limited, not in use)?
  past_performance × 0.20    // Historical success rate on similar tasks?
SELECT: highest-scoring agent(s) for the task
CONSTRAINT: total cost must stay within session budget
```

**TIER 1: OPUS (17 agents) — Complex reasoning, $75/1M tokens**
  Use for: architecture decisions, safety-critical analysis, multi-step reasoning, novel problems
  Key agents: architect (system design), coordinator (multi-agent orchestration), materials_scientist (exotic material analysis), safety_auditor (safety-critical review), synthesizer (combining multi-source results)
  Decision rule: if task involves SAFETY, ARCHITECTURE, or NOVEL PROBLEMS → Opus
  In Claude Code: Opus subagents for design reviews, safety validation, complex refactoring

**TIER 2: SONNET (32 agents) — Balanced tasks, $15/1M tokens**
  Use for: code implementation, data extraction, validation, standard calculations, testing
  Key agents: extractor (content extraction), validator (data validation), merger (combining data), formatter (output formatting), tester (test generation), implementer (code writing)
  Decision rule: if task is WELL-DEFINED with CLEAR INPUTS/OUTPUTS → Sonnet
  In Claude Code: Sonnet subagents for bulk implementation, file operations, test writing

**TIER 3: HAIKU (8 agents) — Fast lookups, $1.25/1M tokens**
  Use for: state management, simple calculations, data lookups, status checks
  Key agents: state_manager (state file ops), cutting_calculator (quick calcs), lookup_agent (database queries), status_checker (health checks)
  Decision rule: if task is SIMPLE LOOKUP or CALCULATION with NO AMBIGUITY → Haiku
  In Claude Code: Haiku subagents for file reads, status checks, simple transforms

**QUICK DECISION TREE:**
  Safety-critical? → Opus (always)
  Architecture/design? → Opus
  Novel problem, unclear approach? → Opus
  Standard implementation with clear spec? → Sonnet
  Bulk file operations? → Sonnet
  Data extraction/transformation? → Sonnet
  Simple lookup/calculation? → Haiku
  State file read/write? → Haiku

**SWARM COMPOSITION** (for prism_orchestrate→swarm_execute):
  Small task (3-5 agents): 1 Opus coordinator + 2-4 Sonnet workers
  Medium task (8-12 agents): 1 Opus coordinator + 1 Opus specialist + 6-10 Sonnet workers
  Large task (20+ agents): 2 Opus (coordinator + safety) + 15 Sonnet + 5 Haiku

**CLAUDE CODE ALLOCATION** (for milestone Execution fields):
  CC steps: bulk implementation, file creation, test suites, deterministic transforms → Sonnet
  MCP steps: safety calculations, design decisions, orchestration, validation gates → Opus
  Parallel CC: independent file operations that don't share state → multiple Sonnet subagents

## What It Returns
- Selected agent tier for the task with rationale
- For swarms: agent composition with tier distribution
- For Claude Code: CC/MCP allocation recommendation per milestone step
- Cost estimate: agents × token count × tier rate
- The selection feeds into ENV headers and Execution fields in phase docs

## Examples
- Input: "Need to validate that S(x) >= 0.70 for a new titanium cutting parameter set"
  Selection: OPUS — safety-critical analysis, no margin for error
  Agent: safety_auditor. Score: capability=1.0, cost=0.5 (expensive but required), past_performance=0.95
  Rationale: safety validation is NEVER delegated to cheaper tiers

- Input: "Extract all function signatures from 5 TypeScript files and create test stubs"
  Selection: SONNET — well-defined task, clear inputs/outputs, bulk operation
  Agent: extractor + tester. Could run as 2 parallel CC subagents.
  Cost: ~$0.15 vs $0.75 for Opus — 5x cheaper for equivalent quality on structured tasks

- Edge case: "Need to look up the spindle max RPM for a Haas VF-2"
  Selection: HAIKU — simple database lookup, single value, no reasoning needed
  Agent: lookup_agent. Cost: ~$0.01.
  If the lookup fails or returns unexpected data → escalate to Sonnet for investigation.
SOURCE: Split from prism-process-optimizer (25.2KB)
RELATED: prism-skill-activation
