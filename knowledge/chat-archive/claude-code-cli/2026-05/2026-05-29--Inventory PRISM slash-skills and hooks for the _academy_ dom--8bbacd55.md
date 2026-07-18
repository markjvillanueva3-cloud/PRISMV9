---
type: "chat-session"
source: "claude-code-cli"
session_id: "8bbacd55-9fad-41a3-8bfb-5479837d2bca"
title: "Inventory PRISM slash-skills and hooks for the \"academy\" domain (courses/curricu"
date: "2026-05-29"
first_ts: "2026-05-29T02:38:41.678Z"
last_ts: "2026-05-29T02:42:23.103Z"
cwd: "H:\\prism-slot-lima"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-a1ef8aebf3cb90d19.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# Inventory PRISM slash-skills and hooks for the "academy" domain (courses/curricu

> **claude-code-cli** | 2026-05-29 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism-slot-lima/8bbacd55-9fad-41a3-8bfb-5479837d2bca/subagents/agent-a1ef8aebf3cb90d19.jsonl`

## Transcript

### User | 2026-05-29T02:38:41.678Z

Inventory PRISM slash-skills and hooks for the "academy" domain (courses/curriculum/lessons/MIT-OCW/instructor/learning/video-learn/pdf-learn). Read-only.

Tasks:
1. Glob both skill dirs: H:/.claude/commands/*.md AND H:/prism/.claude/commands/*.md . Filter to academy-relevant: names or descriptions matching ["academy","course","curriculum","lesson","mit-ocw","learn","video-learn","pdf-learn","instructor","certification","wiki-ingest","learn-everything","learn-corpus"]. For each: skill name + 1-line purpose. Note any *-lima.md custom skill (likely none yet).
2. Glob H:/prism/.claude/hooks/*.mjs filtered to keywords ["academy","course","curriculum","lesson","mit-ocw","learn","lima","slot-context-bundle","tribal-by-domain"]. For each match: hook filename + event (PreToolUse/UserPromptSubmit/Stop/SessionStart — infer from filename or a 1-line grep of the file) + 1-line purpose. Note whether any lima-specific hook exists.
3. Check whether `tribal-by-domain-inject.mjs` and `slot-context-bundle-inject.mjs` are wired in H:/.claude/settings.json (grep the settings file for those names) and whether slot-context-bundle-inject maps lima→academy (grep its SLOT_GALAXY_MAP).

Return a COMPACT digest (≤40 lines):
## Academy skills (N)
- /skill-name | purpose
## Academy/lima hooks (N)
- hook.mjs | event | purpose
## Wiring
- tribal-by-domain-inject wired: ✓/✗ ; slot-context-bundle-inject wired: ✓/✗ ; lima→academy in SLOT_GALAXY_MAP: ✓/✗
## Gaps
- (e.g. "no *-lima custom skill exists yet")
No full file dumps.

### Assistant | 2026-05-29T02:39:06.107Z

I'll inventory the academy-domain skills, hooks, and wiring. Let me run the file discovery in parallel.

### Assistant | 2026-05-29T02:39:06.591Z

[tool_use: Glob]

### Assistant | 2026-05-29T02:39:07.064Z

[tool_use: Glob]

### Assistant | 2026-05-29T02:39:07.601Z

[tool_use: Glob]

### User | 2026-05-29T02:39:12.609Z

[tool_result] H:\.claude\commands\template.md
H:\.claude\commands\wedm-ai-advisor.md
H:\.claude\commands\wedm-batch.md
H:\.claude\commands\wedm-compare.md
H:\.claude\commands\wedm-controller.md
H:\.claude\commands\wedm-cost.md
H:\.claude\commands\wedm-feasibility.md
H:\.claude\commands\wedm-hook-disable.md
H:\.claude\commands\wedm-troubleshoot.md
H:\.claude\commands\lathe-ai.md
H:\.claude\commands\wedm-cite.md

... [+3363 chars truncated]

### User | 2026-05-29T02:39:17.950Z

[tool_result] H:\prism\.claude\commands\ingest.md
H:\prism\.claude\commands\vendor.md
H:\prism\.claude\commands\prints.md
H:\prism\.claude\commands\tooling.md
H:\prism\.claude\commands\process-docs.md
H:\prism\.claude\commands\material-stock.md
H:\prism\.claude\commands\my-shop.md
H:\prism\.claude\commands\erp-health.md
H:\prism\.claude\commands\self-improve.md
H:\prism\.claude\commands\advisor-strategy.md
H:\p
... [+3860 chars truncated]

### User | 2026-05-29T02:39:19.616Z

[tool_result] H:\prism\.claude\hooks\agent-boundary-guard.mjs
H:\prism\.claude\hooks\agent-pid-tracker.mjs
H:\prism\.claude\hooks\agent-registry-load.mjs
H:\prism\.claude\hooks\agent-rules-inject.mjs
H:\prism\.claude\hooks\agent-util-log.mjs
H:\prism\.claude\hooks\agent-vs-direct.mjs
H:\prism\.claude\hooks\agent-worktree-stale-unlock.mjs
H:\prism\.claude\hooks\aggressive-killer-stop.mjs
H:\prism\.claude\hooks\a
... [+4754 chars truncated]

### Assistant | 2026-05-29T02:39:28.554Z

The Glob results are truncated. Let me narrow to academy-relevant patterns with targeted greps and content searches.

### Assistant | 2026-05-29T02:39:30.400Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:39:31.668Z

[tool_use: Bash]

### User | 2026-05-29T02:40:08.070Z

[tool_result] error-learn-review.md  4.0K
forge-learn.md  16.9K
grinder-learn.md  1.3K
lathe-learn.md  1.8K
learn-batch.md  2.3K
learn-corpus.md  5.9K
learn-everything.md  4.0K
learn-pipeline.md  6.8K
learn.md  1.4K
learn.md  1.5K
mill-learn.md  2.2K
pdf-learn.md  27.1K
pdf-learn.md  3.8K
sinker-learn.md  686B
video-learn.md  19.8K
video-learn.md  3.3K
wedm-learn.md  4.0K
welder-learn.md  1.3K
wiki-harvest.md  
... [+25 chars truncated]

### User | 2026-05-29T02:40:20.039Z

[tool_result] basename: missing operand
Try 'basename --help' for more information.

### Assistant | 2026-05-29T02:40:24.086Z

Let me fix the hook glob and grep the relevant skill descriptions plus the wiring.

### Assistant | 2026-05-29T02:40:25.526Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:40:26.821Z

[tool_use: Bash]

### User | 2026-05-29T02:40:57.338Z

[tool_result] auto-learn-budget-guard.mjs
error-learner-hook.mjs
error-pattern-learner.mjs
meta-learning-inject.mjs
meta-learning-trigger.mjs
session-learning-feedback.mjs
slot-context-bundle-inject.mjs
tool-pattern-learner.mjs
tribal-by-domain-inject.mjs
tribal-by-domain-inject.test.mjs

### User | 2026-05-29T02:41:06.375Z

[tool_result] H:/.claude/commands/aps-setup.md
H:/.claude/commands/bid-to-win.md
H:/.claude/commands/forge-app-wire.md
H:/.claude/commands/forge-audit-v3.md
H:/.claude/commands/forge-learn.md
H:/.claude/commands/formula-browse.md
H:/.claude/commands/lathe-studio.md
H:/.claude/commands/pdf-learn.md
H:/.claude/commands/prism-review.md
H:/.claude/commands/quality-gate-lathe.md
H:/.claude/commands/quality-gate.md
H
... [+622 chars truncated]

### Assistant | 2026-05-29T02:41:10.393Z

I found a custom lima skill already. Let me read the key custom skills and the wiring files in parallel.

### Assistant | 2026-05-29T02:41:13.246Z

[tool_use: Bash]

### Assistant | 2026-05-29T02:41:15.052Z

[tool_use: Bash]

### User | 2026-05-29T02:41:43.265Z

[tool_result] /galaxy-buildout-lima | Per-slot galaxy buildout for lima (galaxy:academy). Loads state/shared/per-slot-galaxy-buildout/lima.md and executes the
/smart-lima | Per-slot smart router — recommends optimal Claude model (Haiku/Sonnet/Opus) for the next task in slot:lima's domain, p
/college-extract | Execute a per-course AUTOGEN-SPEC from state/shared/college-course-specs/ — drives live extraction (Pla
... [+633 chars truncated]

### User | 2026-05-29T02:41:51.025Z

[tool_result] === settings.json wiring ===
1
1
=== SLOT_GALAXY_MAP lima ===
55:// unmapped slots (de-facto echo/lima/bravo affinities surface as comments,
66:const SLOT_GALAXY_MAP = {
73:  lima: "academy",           // PRISM ACADEMY COURSES
101:  const galaxy = ctx.slot ? SLOT_GALAXY_MAP[ctx.slot] : null;
126:      } catch { /* no brief — slot in SLOT_GALAXY_MAP but no dispatch yet */ }

### Assistant | 2026-05-29T02:41:55.574Z

Both wiring checks confirmed. Let me get events for the academy/learn hooks and check for any academy-named skill in prism dir I may have missed.

### Assistant | 2026-05-29T02:41:58.882Z

[tool_use: Bash]

### User | 2026-05-29T02:42:05.297Z

[tool_result] tribal-by-domain-inject.mjs | UserPromptSubmit
slot-context-bundle-inject.mjs | UserPromptSubmit
meta-learning-inject.mjs | UserPromptSubmit
session-learning-feedback.mjs | Stop
--- galaxy-buildout-lima skill mentions academy dispatcher? ---
H:/prism/.claude/commands/galaxy-buildout-lima.md:0
H:/prism/.claude/commands/smart-lima.md:1

### Assistant | 2026-05-29T02:42:23.103Z

All checks complete. Here is the compact digest.

## Academy skills (10)
- /pdf-learn | Document→PRISM-components pipeline (PDF/manual/catalog/paper). Feeds courses/wiki/tribal.
- /video-learn | Video tutorial→PRISM-components pipeline (YouTube/training).
- /learn-pipeline | Operator front-end: detect src → extract → dedup → tribal → wiki canonical ingest.
- /learn-everything | Exhaustive knowledge-acquisition pipeline.
- /learn-corpus | Query training-template corpus + matchers (lathe/mill/wedm/electrode-audit).
- /learn | Generic learn entry (1.4-1.5K stub; both dirs).
- /college-extract | Drive per-course AUTOGEN-SPEC live extraction (Playwright/WebFetch) from college-course-specs/.
- /wiki-ingest | 5-stage Ollama→Claude source→wiki ingest.
- /wiki-harvest | Refresh wiki/patterns + code-tribal + lessons bridges.
- /galaxy-buildout-lima | **CUSTOM lima skill** — per-slot galaxy buildout for galaxy:academy (loads per-slot-galaxy-buildout/lima.md).

(Also: /smart-lima — custom lima model-router, refs prism_operating_system; not academy-domain itself.)

## Academy/lima hooks (4)
- tribal-by-domain-inject.mjs | UserPromptSubmit | inject top-3 tribal hits by slot domain (lima→academy).
- slot-context-bundle-inject.mjs | UserPromptSubmit | inject per-slot galaxy context; SLOT_GALAXY_MAP routes lima→academy.
- meta-learning-inject.mjs | UserPromptSubmit | meta-learning recommendation inject (generic, not academy-specific).
- session-learning-feedback.mjs | Stop | record session learning feedback (generic).
- (No academy/course/curriculum/mit-ocw/lesson-named hook exists; no lima-specific hook beyond the SLOT_GALAXY_MAP entry.)

## Wiring
- tribal-by-domain-inject wired: ✓ ; slot-context-bundle-inject wired: ✓ ; lima→academy in SLOT_GALAXY_MAP: ✓ (`slot-context-bundle-inject.mjs:73` — `lima: "academy", // PRISM ACADEMY COURSES`)

## Gaps
- A custom lima skill DOES exist (`/galaxy-buildout-lima`, also `/smart-lima`) — contrary to the "likely none yet" hint.
- No academy/co
... [+913 chars truncated]
