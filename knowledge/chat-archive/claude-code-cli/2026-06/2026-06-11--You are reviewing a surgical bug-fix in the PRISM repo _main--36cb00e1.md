---
type: "chat-session"
source: "claude-code-cli"
session_id: "36cb00e1-ecc1-4886-b128-a112144308fc"
title: "You are reviewing a surgical bug-fix in the PRISM repo (main tree H:/prism). Rea"
date: "2026-06-11"
first_ts: "2026-06-11T18:56:04.879Z"
last_ts: "2026-06-11T18:57:09.168Z"
cwd: "H:\\prism-slot-alpha"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-aff2602c74c31281e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You are reviewing a surgical bug-fix in the PRISM repo (main tree H:/prism). Rea

> **claude-code-cli** | 2026-06-11 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/36cb00e1-ecc1-4886-b128-a112144308fc/subagents/agent-aff2602c74c31281e.jsonl`

## Transcript

### User | 2026-06-11T18:56:04.879Z

You are reviewing a surgical bug-fix in the PRISM repo (main tree H:/prism). Read the WHOLE of each changed file end-to-end, then grade PASS/FAIL with any P0/P1 findings.

CONTEXT — the bug being fixed: the UserPromptSubmit hook `.claude/hooks/skill-auto-trigger.mjs` emitted a MANDATORY "INVOKE /precompact NOW" directive whenever a prompt merely MENTIONED words like "compaction"/"precompact"/"handoff" as a TOPIC (keyword match), even at 18% context. That made chats "push back to compact when they should keep working." Root cause: session-lifecycle skills (precompact/compact/handoff/checkpoint) were in INVOKE_NOW_SKILLS, which gates the mandatory directive purely on keyword score >= 0.75. Fix: lifecycle skills are STATE-gated (owned by the state-aware precompact-auto-trigger.mjs + the Stop event), never keyword-gated.

THE CHANGES (verify each against the live files):
1. H:/prism/.claude/hooks/skill-auto-trigger.mjs
   - Added `export const LIFECYCLE_STATE_GATED_SKILLS = new Set(["precompact","compact","handoff","checkpoint"])` near the top.
   - Removed those 4 names from `INVOKE_NOW_SKILLS` (now also `export`ed).
   - In `handleUserPromptSubmit`, inside the `for (const t of triggers)` scoring loop, added `if (LIFECYCLE_STATE_GATED_SKILLS.has(t.name)) continue;` right after the action-filter line. This skips lifecycle skills from BOTH the invoke-now AND keyword-suggest paths.
2. H:/prism/scripts/extract-skill-triggers.mjs — removed the same 4 lifecycle names from its own INVOKE_NOW_SKILLS (the extractor that stamps action:"invoke" into the jsonl).
3. H:/prism/knowledge/wiki/architecture/_skill-triggers.jsonl — the single `precompact` trigger entry changed action:"invoke" -> action:"suggest".
4. H:/prism/.claude/hooks/__tests__/skill-auto-trigger.test.mjs — NEW 7-case node:test suite (real subprocess oracle + white-box set assertions). All 7 pass.

QUESTIONS TO ANSWER (be specific, cite file:line):
- Does the skip correctly prevent BOTH the mandatory directive AND th
... [+986 chars truncated]

### Assistant | 2026-06-11T18:56:12.757Z

I'll read all the changed files end-to-end before grading.

### Assistant | 2026-06-11T18:56:12.808Z

[tool_use: Read]

### User | 2026-06-11T18:56:14.221Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — pipeline-aware multi-event suggester.
5	 *
6	 * History:
7	 *   - DEV-VELOCITY-AUTOTRIGGER-MS0 (Phase D.2): UserPromptSubmit-only,
8	 *     skill-trigger jsonl matching, suggest-only.
9	 *   - COMMAND-KERNEL-MS0/U-CK16: extended to fire on PostToolUse + Stop
10	 *     in addition to UserPromptSubmit, AND to suggest pipelines (
... [+31954 chars truncated]

### Assistant | 2026-06-11T18:56:19.835Z

Now reading the extractor, the jsonl, and the test file.

### Assistant | 2026-06-11T18:56:20.274Z

[tool_use: Read]

### Assistant | 2026-06-11T18:56:20.785Z

[tool_use: Read]

### User | 2026-06-11T18:56:21.977Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * extract-skill-triggers.mjs — Phase D.3 of DEV-VELOCITY-AUTOTRIGGER-MS0.
4	 *
5	 * Walks every `.claude/commands/*.md` skill manifest (project + global), parses
6	 * the YAML frontmatter, extracts the `triggers:` block, and writes one JSONL
7	 * line per trigger to `knowledge/wiki/architecture/_skill-triggers.jsonl`.
8	 *
9	 * Consumed by: `skill-auto-trigger.mjs` U
... [+17938 chars truncated]

### User | 2026-06-11T18:56:22.525Z

[tool_result] 1	/**
2	 * skill-auto-trigger.test.mjs -- regression oracle for the lifecycle-skill
3	 * state-gate fix (slot:alpha 2026-06-11).
4	 *
5	 * BUG: session-lifecycle skills (precompact/compact/handoff/checkpoint) were in
6	 * INVOKE_NOW_SKILLS, so a prompt that merely *mentioned* "compaction"/"handoff"
7	 * as a TOPIC emitted a MANDATORY "INVOKE /precompact NOW" directive -- the
8	 * "chat pushes back
... [+5281 chars truncated]

### Assistant | 2026-06-11T18:56:29.316Z

Now reading the jsonl entry for precompact to verify the action field change.

### Assistant | 2026-06-11T18:56:30.266Z

[tool_use: Grep]

### User | 2026-06-11T18:56:31.242Z

[tool_result] 245:{"name":"precompact","type":"skill","manifest":"H:/prism/.claude/commands/precompact.md","matcher":{"type":"keyword","value":"precompact|/precompact|before compact|prepare compact|write handoff"},"score":0.85,"action":"suggest"}

### Assistant | 2026-06-11T18:57:09.168Z

I have all four files. Here is my verdict.

---

## VERDICT: PASS

The fix is correct and complete. No P0 or P1 issues found.

---

### Question-by-question findings

**Does the skip correctly prevent BOTH the mandatory directive AND the advisory suggest for lifecycle skills?**

Yes. The `continue` at `skill-auto-trigger.mjs:531` fires before the `scored` array is ever populated for lifecycle names. The skip is inside the `for (const t of triggers)` loop, applied before `scoreMatch` is called and before the skill is pushed to either `scored` (which feeds both `invokeNowHits` and `skillHits`). There is no second path — the `PostToolUse` and `Stop` handlers do not touch the skill-trigger jsonl at all (they only match pipelines), so lifecycle skill names cannot resurface through those event branches either.

**Does the change break any non-lifecycle skill's invoke-now or suggest behavior?**

No. The `LIFECYCLE_STATE_GATED_SKILLS.has(t.name)` check is a targeted early-continue keyed on exactly the four removed names. Every other name falls through to the unchanged `scoreMatch` → `invokeNowHits` / `skillHits` split. The positive-control tests at lines 82-94 confirm this path in the subprocess oracle.

**Is the consumer/extractor now consistent? Is the `forge-audit-v3` divergence new or pre-existing?**

The extractor at `extract-skill-triggers.mjs:98` lists `forge-audit-v3` in its `INVOKE_NOW_SKILLS` but the consumer's set at `skill-auto-trigger.mjs:90-102` does not. This is a pre-existing divergence — it predates this PR and is not introduced by the fix. Effect: `forge-audit-v3` entries in the jsonl carry `action:"invoke"` but the consumer ignores the `action` field for allowlist membership (line 552 makes `INVOKE_NOW_SKILLS.has(s.name)` the sole gate). `forge-audit-v3` therefore behaves as a plain `suggest` in production. This is a latent inconsistency worth a follow-up unit but is not a regression caused by this change.

**Are the 7 tests REAL? Would they fail on a rev
... [+2439 chars truncated]
