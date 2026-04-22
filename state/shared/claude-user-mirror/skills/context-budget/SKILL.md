---
name: context-budget
description: Monitor context window pressure, recommend compaction, track critical fact survival rate.
model: haiku
effort: low
allowed-tools: Read, Grep, Glob
---

# Context Budget Skill

Analyze context window utilization and critical fact survival after compaction events.

## Steps

1. **Read compaction survival list**: Read ~/.claude/projects/C--Windows-System32/memory/compaction-survival.json to load the list of critical facts that must persist.

2. **Check critical fact presence**: For each fact in critical_facts, verify that its value appears somewhere in the current conversation context. Track how many are present vs missing.

3. **Calculate survival rate**: Report the percentage of critical facts that survived. Flag any missing facts with their key and value so they can be re-injected.

4. **Check MEMORY.md size**: Read ~/.claude/projects/C--Windows-System32/memory/MEMORY.md and count its lines. If over 200 lines, recommend running /memory-prune. Report the current line count.

5. **Check compaction telemetry**: Read ~/.prism/telemetry/compactions.jsonl if it exists. Report how many compactions have occurred in this session and their types.

6. **Output a context budget report**:

Context Budget Report
=====================
Critical Facts: X/Y surviving (Z%)
MEMORY.md: N lines (target: <180)
Compactions this session: C
Recent compaction type: type

Missing facts (re-inject these):
- key: value (reason)

Recommendations:
- (actions to take based on findings)

7. **Re-injection hints**: If any critical facts are missing, output them as a compact block:
CONTEXT RECOVERY: project=C:/PRISM/mcp-server | build=npm run build | test=npx vitest run | ...

## Priority Order
- Missing project_path or build_command = CRITICAL (blocks all work)
- Missing scale numbers (engine/dispatcher/action counts) = WARN (causes re-exploration)
- Missing efficiency commands (digest/navigate) = INFO (wastes tokens)
