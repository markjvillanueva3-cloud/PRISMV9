---
title: The 3-of-3 scrutiny gate ran on a broken/missing reviewer agent
type: lesson
created: 2026-06-14
slot: sierra
tags: [agents, scrutiny, subagents, claude-flow, silent-degradation, R12]
related:
  - feedback_scrutiny_3of3_readonly
  - reference_agent_refinement_iter1_2026_06_14
  - feedback_always_update_wiki_on_bug_finding
---

# Lesson: the universal scrutiny gate was dispatching a broken reviewer agent

## What was wrong (found 2026-06-14, slot:sierra)
PRISM's universal 3-of-3 scrutiny gate (`scrutinize-before-stop`, forge7,
forge-audit-v2, scrutinize-mark) dispatches three reviewer subagents:

    Agent({ subagent_type: 'reviewer',      ... })   // arm A
    Agent({ subagent_type: 'reviewer',      ... })   // arm B
    Agent({ subagent_type: 'code-analyzer', ... })   // arm C

- `subagent_type: 'reviewer'` resolved to the ONLY agent named `reviewer` =
  `.claude/agents/core/reviewer.md`, which was a **claude-flow framework import**:
  dead `memory_store` / `mcp__claude-flow__memory_usage` lifecycle hooks and body,
  **no `model:` field** (inherited the caller), and **no `tools:` field** -- so the
  read-only reviewer ran with the FULL tool set including Write/Edit/Bash.
- `subagent_type: 'code-analyzer'` (arm C) had **no agent file at all**. Arm C was
  switched from the Codex CLI to a Claude `code-analyzer` on 2026-05-13
  ([[feedback_scrutiny_3of3_readonly]]) but the agent definition was never created,
  so every arm-C dispatch silently fell back to the generic general-purpose agent.

The gate still "passed" because the scrutiny script supplies a complete task
prompt per arm -- so reviews happened -- but the agent DEFINITIONS were wrong:
a wrong/expensive default model, write access on a reviewer, broken framework
instructions polluting the system prompt, and a missing third lens. The gate
that is supposed to guard every Stop had degraded for ~13 months.

## Why it hid
Agent `.md` files under `.claude/agents/` are **gitignored runtime config** (only
`AGENT_DIGEST.md` is tracked). They never appear in a git diff, so the git-diff-
based scrutiny gate and code review never inspect the agent definitions themselves.
The defect was invisible to every gate that looks at the working-tree diff.

## The fix
- Rewrote `core/reviewer.md` into a proper read-only PRISM reviewer: `tools: Read,
  Grep, Glob, Bash`; PASS/FAIL + P0/P1/P2 + `file:line` ledger contract; PRISM
  safety/test/wiring checks; no claude-flow.
- Created `code-analyzer.md` (arm C analyst) with a genuinely distinct lens:
  silent-breakage / regression / I/O-security / error-budget / coupling / concurrency.
- Same class of fix applied to `core/coder.md` (dispatched by continue-roadmap,
  also a broken claude-flow import).
- All synced to project + both global mirrors (slot-worktree-rooted sessions fall
  back to user-global, which carried stale/missing copies).

## Lessons
1. **A `subagent_type` string is a contract; verify the agent it resolves to.**
   `subagent_type: 'X'` silently resolves to `.claude/agents/**` `name: X`, or
   falls back to general-purpose if none exists. A referenced-but-missing agent
   fails open, not loud.
2. **Gitignored config escapes diff-based gates.** Validate agent/hook/runtime
   config directly (parse + behavior), not via the git-diff scrutiny path.
3. **Imported framework agents (claude-flow / ruv-swarm) are non-functional in
   PRISM** -- they call MCP tools/CLIs that do not exist here. Treat the imported
   set as dead weight; PRISM-native agents are the real fleet.
4. **A reviewer with write tools is a smell.** Review/audit agents must scope
   `tools:` to read-only (Read/Grep/Glob + Bash-for-git).

## Verify
- `grep -rl 'mcp__claude-flow__\|npx ruv-swarm' .claude/agents` -- the imported set.
- `grep -rlE '^name:[[:space:]]*reviewer$' .claude/agents` -- should be core/reviewer.md (now fixed).
- Full detail: memory [[reference_agent_refinement_iter1_2026_06_14]].
