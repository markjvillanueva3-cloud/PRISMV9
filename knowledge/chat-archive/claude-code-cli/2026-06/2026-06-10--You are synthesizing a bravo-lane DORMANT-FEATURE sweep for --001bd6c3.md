---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are synthesizing a bravo-lane DORMANT-FEATURE sweep for the PRISM platform ("
date: "2026-06-10"
first_ts: "2026-06-10T14:35:09.850Z"
last_ts: "2026-06-10T14:36:25.015Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_4d625bda-f67/agent-a26d0cf194d131c8c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are synthesizing a bravo-lane DORMANT-FEATURE sweep for the PRISM platform (

> **claude-code-cli** | 2026-06-10 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_4d625bda-f67/agent-a26d0cf194d131c8c.jsonl`

## Transcript

### User | 2026-06-10T14:35:09.850Z

You are synthesizing a bravo-lane DORMANT-FEATURE sweep for the PRISM platform (lane: orchestration/octopus/hooks/consensus/chat-bus/hermes/zulu/dream-cycle/self-reflect/moonshot).
Below are 3 finder reports. Produce ONE de-duplicated, RANKED punch-list of genuinely-activatable dormant features. For each item: name+path, dormancy-class, in-bravo-lane (yes/no), effort (S/M/L), risk (low/med/high), value, and a concrete 1-step activation.
Group into: (A) CLEAN BOUNDED -- mechanical, low-risk, ready to activate next fire; (B) MEATIER -- needs a real build (e.g. a producer); (C) CROSS-LANE / BLOCKED -- note the blocker, NOT bravo to build.
Rank each group by value/effort (best ROI first). Exclude anything HEALTHY. End with: "TOP NEXT UNIT: <the single highest-ROI clean-bounded item + why>".
Be rigorous and honest (R12) -- if a finder over-claimed a gap, say so. Do not invent items not in the reports.

=== FINDER 1: HOOKS ===
Perfect. Now let me compile the final analysis. Let me verify which ones are in the bravo-lane domain filter and create the table.

Based on my thorough exploration of H:/prism/.claude/hooks, here's the dormancy analysis for bravo-lane hooks:

| Hook | Wired? | Tested? | Import-Safe? | Dormancy-Class | 1-line Activation |
|------|--------|---------|--------------|-----------------|-------------------|
| self-awareness-enforce.mjs | NO | NO | UNSAFE | UNWIRED | Runs at top-level; add to H:/.claude/settings.json SessionStart hooks |
| ai-system-router-inject.mjs | YES | NO | UNSAFE | WIRED-UNTESTED | Executes logic at module load; needs test suite |
| duplication-guard-stop.mjs | YES | NO | SAFE | WIRED-UNTESTED | Has proper flow control; add duplication-guard-stop.test.mjs |
| alpha-token-domain-awareness-inject.mjs | YES | NO | SAFE | WIRED-UNTESTED | Calls main().catch() guard is present; create test harness |
| lathe-gcode-lint-guard.mjs | YES | NO | SAFE | WIRED-UNTESTED | Calls main().then() pattern; add lathe-gcode-lint-guard.test.mjs |
| plugi
... [+6857 chars truncated]

### Assistant | 2026-06-10T14:36:25.015Z

I'll synthesize the three finder reports into a ranked punch-list. Let me apply R12 rigor — verifying claims where the reports contradict each other or over-state.

Looking at the reports, there's a key tension I need to resolve honestly: Finder 1 (Hooks) and Finder 3 (Producers) make different claims, and Finder 3 itself flags that several "gaps" depend on un-run greps. Let me produce the synthesis.

---

# BRAVO-LANE DORMANT-FEATURE SWEEP — Ranked Punch-List

**Synthesis scope:** orchestration / octopus / hooks / consensus / chat-bus / hermes / zulu / dream-cycle / self-reflect / moonshot.

**R12 honesty notes up front (over-claims found in finders):**
- Finder 1 labels 6 hooks "WIRED-UNTESTED" as if that is a dormancy class needing activation. **That is not dormancy** — a wired hook that fires is HEALTHY; "lacks a test file" is a coverage gap, not a dormant feature. Most of Finder 1's list is excluded below for this reason. Only the genuinely **UNWIRED** hook (`self-awareness-enforce.mjs`) and the genuine **import-unsafe** defects survive as real items.
- Finder 1's bravo-lane attribution is weak: `lathe-gcode-lint-guard`, `whiskey-lathe-context-inject`, `alpha-token-domain-awareness-inject` are **lathe/token galaxies, NOT bravo-lane** (orchestration/consensus). Excluded as out-of-lane.
- Finder 3 self-admits several items hinge on greps it never ran ("depends on grep results", "if exist"). Those are demoted to **CROSS-LANE / UNVERIFIED** rather than activatable, per R12 — I will not promote a gap whose existence the finder couldn't confirm.
- Finder 3's two clearest, mutually-corroborating findings are the **dream-queue producer gap** and the **orchestrator-directives producer gap** — both have a confirmed live consumer hook and a confirmed-missing producer. These are the real meat.

---

## (A) CLEAN BOUNDED — mechanical, low-risk, ready next fire

Ranked best ROI first.

### A1. `_skill-triggers.jsonl` orphaned-scanner wiring
- **Path:** `mcp-server/data/state
... [+7181 chars truncated]
