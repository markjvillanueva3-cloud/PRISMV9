---
name: "context-audit"
description: "What's eating your context window? — audit + recommendations"
effort: low
maxTurns: 5
model: haiku
disallowedTools:
  - Write
  - Edit
  - MultiEdit
policy:
  tier: 1
  triggers:
    - events:
      - "UserPromptSubmit"
      keywords:
      - "context audit"
      - "context usage"
  mode: "suggest"
  priority: 50
  timeout_ms: 2000
  token_budget: 400
---

# Context Audit — What's Eating Your Context Window

Audit the current context window to identify token waste and suggest pruning. This is a read-only diagnostic — it doesn't change anything.

## Args: $ARGUMENTS
- Empty: full audit
- `quick`: just the summary numbers

## Step 1: Measure Current Context Load

Check these context contributors:

### A. Memory Index
```bash
wc -l < H:/prism/state/shared/memory/MEMORY.md
```
- Target: <200 lines
- Alert if >180: "Memory bloated — run /memory-prune"

### B. Loaded Files in Session
Count how many unique files have been Read in this session (check session breadcrumbs if available):
```bash
cat H:/prism/.claude/cache/session-breadcrumbs.jsonl 2>/dev/null | wc -l
```

### C. Active Task Count
Check task list for stale or excessive tasks. More than 15 active tasks = context pressure.

### D. Hook Output Overhead
Estimate hook output volume:
- Count hooks in settings.json that produce additionalContext
- Each additionalContext message ≈ 50-200 tokens per tool call
- Estimate: hooks * avg_tool_calls * avg_tokens_per_response

### E. Large File Reads
Check if any files >500 lines were read fully (common waste pattern):
- AGENT_WORKBOARD.md, AGENT_CHAT.md, AGENT_COORDINATION_STATUS.md are common offenders
- These should be read with `limit` parameter

## Step 2: Report

```
Context Audit Report
====================
Memory:       [N]/200 lines [LEAN/OK/HEAVY/BLOATED]
Files read:   [N] unique files this session
Tasks:        [N] active ([N] stale)
Hook output:  ~[N] tokens/call estimated overhead
Large reads:  [N] files read without limit parameter

Top Context Consumers:
  1. [item] — ~[N] tokens
  2. [item] — ~[N] tokens
  3. [item] — ~[N] tokens

Recommendations:
  - [specific action to reduce context pressure]
  - [specific action to reduce context pressure]
```

## Step 3: Suggest Actions
Based on findings, suggest from this menu:
- `/memory-prune` — if memory >180 lines
- `/slim` — if context feels heavy
- `/compact` — if >75 tool calls or session is long
- "Use `limit` parameter on large file reads" — if large reads detected
- "Delete stale tasks" — if >5 stale tasks found
