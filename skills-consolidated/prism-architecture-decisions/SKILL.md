---
name: prism-architecture-decisions
description: |
  Architecture Decision Records (ADRs) for PRISM. Document WHY decisions were made,
  not just WHAT was decided. Prevents re-litigation and captures institutional knowledge.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "architecture", "decisions", "decision", "records", "adrs", "document", "were"
- Session lifecycle event — startup, checkpoint, recovery, handoff, or context pressure management.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-architecture-decisions")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_session→[relevant_action] for session operations
   - prism_skill_script→skill_content(id="prism-architecture-decisions") for procedure reference
   - prism_context→todo_update for state tracking

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Session state data, recovery instructions, or checkpoint confirmation
- **Failure**: State corruption → trigger L3 compaction recovery

### Examples
**Example 1**: User asks about architecture
→ Load skill: skill_content("prism-architecture-decisions") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires decisions guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Architecture Decisions
## ADR Process & Key Decisions Record

## ADR Format
```markdown
# ADR-NNN: [Title]
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Context:** What situation prompted this decision?
**Decision:** What did we decide?
**Reasoning:** Why this option over alternatives?
**Consequences:** What are the trade-offs?
**Alternatives considered:** What else was evaluated?
```

## When to Create an ADR
- Choosing between 2+ viable technical approaches
- Adopting a new technology, library, or pattern
- Changing a fundamental architecture pattern
- Making a decision that would be expensive to reverse

## Key PRISM Architecture Decisions

### ADR-001: MCP-First Architecture
**Decision:** All PRISM functionality exposed through MCP dispatchers, not file-based APIs.
**Reasoning:** MCP provides structured routing, validation hooks, telemetry, and anti-regression automatically. File-based operations bypass all safety gates.
**Consequence:** Desktop Commander used only for file I/O when no MCP alternative exists.

### ADR-002: Hybrid Build (tsc --noEmit + esbuild)
**Decision:** Use `tsc --noEmit` for type checking + `esbuild` for bundling instead of standalone `tsc`.
**Reasoning:** Pure `tsc` causes OOM at scale (3.9MB+ codebase). Hybrid approach gives full type safety without memory issues.
**Consequence:** Build script in package.json manages the two-step process.

### ADR-003: Hook-First Safety Architecture
**Decision:** Safety constraints enforced via pre-output blocking hooks, not post-hoc validation.
**Reasoning:** Post-hoc validation can be skipped or forgotten. Hooks fire automatically at zero token cost, providing guaranteed enforcement.
**Consequence:** All safety-critical operations must register hooks at startup.

### ADR-004: Dispatcher Consolidation Over Proliferation
**Decision:** Consolidate related actions into fewer dispatchers (31 target) rather than one-action-per-dispatcher.
**Reasoning:** 95% token reduction from consolidation. Routing is simpler with fewer dispatchers.
**Consequence:** Each dispatcher handles multiple actions via switch/case routing.

### ADR-005: State Persistence via MCP Session
**Decision:** Use `prism_session→state_save/load` for all state, not filesystem.
**Reasoning:** MCP state integrates with checkpoint, compaction recovery, and memory systems.
**Consequence:** State available across sessions, survives compaction.

### ADR-006: Skill System for Knowledge Management
**Decision:** SKILL.md files in skills-consolidated/ for all domain knowledge.
**Reasoning:** Separates knowledge from code, enables independent updates, supports skill-find-for-task discovery.
**Consequence:** Skills must be deployed to /mnt/skills/user/ for runtime access.

## Decision Review Triggers
Re-evaluate a decision when:
- The original context has changed significantly
- New options have become available
- The consequences are worse than expected
- A related decision has been superseded
