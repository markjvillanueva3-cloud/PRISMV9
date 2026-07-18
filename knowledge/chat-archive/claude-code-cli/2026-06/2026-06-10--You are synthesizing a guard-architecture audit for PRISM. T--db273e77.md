---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "You are synthesizing a guard-architecture audit for PRISM. The operator asked: \""
date: "2026-06-10"
first_ts: "2026-06-10T14:33:57.202Z"
last_ts: "2026-06-10T14:35:14.531Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-a2d42037d7806a8c0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# You are synthesizing a guard-architecture audit for PRISM. The operator asked: "

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-a2d42037d7806a8c0.jsonl`

## Transcript

### User | 2026-06-10T14:33:57.202Z

You are synthesizing a guard-architecture audit for PRISM. The operator asked: "We have systems to survive compaction and auto-invoke compactions. Are there CONFLICTING guards causing the model to always say we need to compact before pushing further? If our systems are good enough to push through, can we take the guards away safely?"

CRITICAL GROUND TRUTH (measured live this session, use it): host commit memory was genuinely at 98.8% (224/227GB) when the PRISM_PRESSURE_GATE blocked; the cause was a real 12.8GB leak from 11 zombie tsservers; killing them dropped commit to 91.6%. So the pressure gate caught a REAL crash risk, not a false alarm.

Four parallel investigators returned the following (plain text):

=== BLOCK-CLASS GUARDS ===
Now I have enough information. Let me compile the comprehensive list of all blocking hooks:

---

## BLOCKING HOOKS IN PRISM REPO — COMPLETE INVENTORY

**LEGEND:**
- **HARD BLOCK** = settings.json `continueOnError:false` OR returns `decision:"block"` with `continue:false`
- **SOFT BLOCK** = advisory/warning, does not prevent tool execution
- **ESCAPE HATCH** = env knob or attempt counter

---

### **STOP HOOK BLOCKS** (5 hooks)

1. **scrutinize-before-stop.mjs** (H:/prism/.claude/hooks/scrutinize-before-stop.mjs)
   - **Trigger:** Stop event, when session has file changes
   - **Block type:** HARD (decision:"block")
   - **Condition:** Code/file changes detected + no recent 3-of-3 multi-reviewer scrutiny (Codex + Claude reviewer A + Claude reviewer B)
   - **Escape hatch:** MAX_BLOCKS_PER_SESSION=3 (auto-passes after 3 block attempts); PRISM_ALLOW_UNWIRED=1 bypass
   - **Override env:** None (hard coded ceiling)
   - **File:line:** Lines 279-282 (block decision emission)

2. **goal-complete-gate.mjs** (H:/prism/.claude/hooks/goal-complete-gate.mjs)
   - **Trigger:** Stop event, when `/goal` slash command was invoked
   - **Block type:** HARD (decision:"block")
   - **Conditions:** (a) close-out audit report missing/unreadable; (b) aud
... [+40193 chars truncated]

### Assistant | 2026-06-10T14:35:14.531Z

I have enough from the four investigator reports plus the live ground truth. Synthesizing directly.

---

# PRISM Guard-Architecture Audit: "Always Says Compact" Investigation

## 1. GUARD INVENTORY

### TRUE BLOCKS (force-stop or block the next tool call)

| Guard | Event | What it blocks | Trigger | Override knob |
|---|---|---|---|---|
| **commit-pressure-stop-gate.mjs** (PRISM_PRESSURE_GATE) | Stop | Stop completion | Host RAM commit pressure / unpushed commits | `PRISM_PRESSURE_GATE` gate var; bypass logic in-file |
| **precompact-auto-trigger.mjs** | PreToolUse/PostToolUse | Next **tool call** at HARD ctx-token ceiling | ctx tokens ≥ HARD (default 940K) — `precompact-auto-trigger.mjs:394, 422-437` | `PRECOMPACT_HARD_TOKENS`, `PRECOMPACT_CONTEXT_CAP=1000000` |
| **enforce-auto-compact.py** | PostToolUse(Write/Edit) | Tool call at 35+ edits since last /compact | edit-count ≥35 — `enforce-auto-compact.py:88-97` | none (state-file reset by `/compact`) |
| scrutinize-before-stop.mjs | Stop | Stop until 3-of-3 review | uncommitted changes, no scrutiny ledger PASS | `MAX_BLOCKS=3` auto-pass; `PRISM_ALLOW_UNWIRED=1` |
| stop_on_failing_tests.mjs | Stop | Stop on red/missing tests | failing>0 or report missing | `STOP_ON_FAILING_TESTS_OVERRIDE=1` |
| stop_on_unwired_assets.mjs | Stop | Stop on orphan engine | new engine unwired/<10 tests | `PRISM_ALLOW_UNWIRED=1` (currently fleet-wide ON) |
| goal-complete-gate.mjs | Stop | Stop if `/goal` used + stale audit | close-out audit missing/stale/untriaged — `:240-299` | `PRISM_GOAL_GATE_DISABLE=1` |
| main-tree-write-block, file-claim-guard, duplication-hard-block, pretool-memory-size-gate, intake-quarantine-guard | PreToolUse | Edits/writes (lane/dup/size/quarantine) | various | various per-hook |

**Only THREE of these are compaction-related blocks:** the pressure gate (RAM), precompact-auto-trigger (ctx tokens), and enforce-auto-compact (edit count). The rest block on test/scrutiny/wiring/lane grounds and have nothing to 
... [+10931 chars truncated]
