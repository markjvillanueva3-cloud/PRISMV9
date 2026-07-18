---
name: prism-token-budget
description: Compute working token budget, allocate across 4 categories (task/skills/state/buffer), and execute threshold actions at each pressure level
---
# Token Budget Allocation

## When To Use
- Session start: computing how much context to allocate to skills, state, task work
- Before loading a large resource: "Do I have room for this 8KB skill?"
- When prism_context_pressure reports YELLOW or above
- When deciding between loading full skill content vs summary
- NOT for: pressure zone definitions and checkpoint rules (use prism-context-pressure)
- NOT for: cache eviction strategies (use prism-cache-selection)

## How To Use
**STEP 1: COMPUTE WORKING BUDGET**
```
Working_Budget = Context_Window - System_Prompt - Response_Reserve(15%)

Example (200K context window):
  System prompt: ~30K tokens (GSD + skills + state)
  Response reserve: 30K tokens (15% of 200K)
  Working budget: 200K - 30K - 30K = 140K tokens available
```

**STEP 2: ALLOCATE ACROSS 4 CATEGORIES**
  40% — Current task context (56K): active code, file contents, tool results
  30% — Active skills/knowledge (42K): loaded skill content, registry data
  20% — State and history (28K): CURRENT_POSITION, tracker, session notes
  10% — Tool results buffer (14K): reserved for incoming tool call outputs

  These are STARTING allocations. During session, categories flex:
  If task needs more, borrow from skills (unload non-essential skills first)
  If skills category is full, summarize large skills before loading new ones
  State category is fixed — never borrow from state (lose position = lose session)
  Buffer must stay >= 5% — if buffer hits 0%, tool results get truncated

**STEP 3: BEFORE LOADING A RESOURCE, SIZE CHECK**
  1. Call prism_context→context_size to get current usage
  2. Estimate resource size (file size in bytes / 4 = approximate tokens)
  3. Check: current_usage + resource_tokens < category_limit?
  4. If YES → load normally
  5. If NO → one of: compress existing context, unload a skill, summarize the resource, defer

**STEP 4: THRESHOLD ACTIONS (execute automatically at each level)**
  GREEN (0-60%): No action needed. Load freely within category limits.
  YELLOW (60-75%): Stop loading new skills. Complete current task unit. Checkpoint.
  ORANGE (75-85%): Compress loaded skills to summaries. Cap responses at 8KB.
    Execute: prism_context→context_compress on lowest-priority loaded content.
  RED (85-92%): Emergency checkpoint. Prepare handoff. Cap responses at 5KB.
  CRITICAL (>92%): Force session end. Save everything. No new operations.

**RESOURCE SIZE ESTIMATES (for quick decisions):**
  Atomic skill (v2.0): ~1-1.3K tokens (3-5KB files)
  Monolithic skill: 3-10K tokens (10-40KB files) — too large, use atomic
  CURRENT_POSITION.md: ~100 tokens
  ROADMAP_TRACKER (last 5): ~500 tokens
  Material record (full): ~200 tokens
  Tool call result (typical): ~100-500 tokens

## What It Returns
- Working budget in tokens for the current context window
- Category allocation: task(40%), skills(30%), state(20%), buffer(10%)
- Go/no-go for loading a specific resource based on current usage
- Threshold action to execute when pressure reaches a given level
- Flex recommendation: which category to borrow from when one overflows

## Examples
- Input: "Session start. Need to load 5 atomic skills (5KB each) + position file + tracker"
  Budget: 140K working. Skills category: 42K tokens.
  5 atomic skills: 5 * 1.2K = 6K tokens. Position + tracker: ~600 tokens.
  Total: 6.6K of 42K skills budget → 16% used. GREEN. Load all freely.

- Input: "At 68% pressure. Want to load prism-safety-framework (26.2KB = ~6.5K tokens)"
  Current: YELLOW threshold (60-75%). Skills category likely near limit.
  6.5K tokens is a monolithic skill — should have been split.
  Decision: DON'T load the 26.2KB monolith. Check if atomic splits exist.
  If no splits: summarize to 2K tokens before loading. Or defer until lower pressure.

- Edge case: "Task work consumed 80K tokens (file content + tool results). Skills at 35K."
  Task: 80K/56K = 143% of allocation — massively over budget.
  Skills: 35K/42K = 83% — healthy.
  Total: 115K + 28K state + 14K buffer = 157K of 140K = 112% → RED zone.
  Action: emergency compress. Unload 2 lowest-priority skills (save ~2.5K tokens each).
  Summarize task context (remove old tool results, keep only current file).
  If still over: force checkpoint and session end.
SOURCE: Split from prism-efficiency-controller (11.6KB) + prism-performance-patterns (30.6KB)
RELATED: prism-context-pressure, prism-cache-selection, prism-batch-execution
