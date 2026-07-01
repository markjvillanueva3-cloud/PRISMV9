---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Evaluate PRISM skills bucket \"core-system\". dirs/names: core/* (session-state, e"
date: "2026-06-11"
first_ts: "2026-06-11T20:25:04.132Z"
last_ts: "2026-06-11T20:30:34.055Z"
cwd: "H:\\prism-slot-golf"
messages: 24
user_msgs: 12
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ade86b3abc44449d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Evaluate PRISM skills bucket "core-system". dirs/names: core/* (session-state, e

> **claude-code-cli** | 2026-06-11 | 24 msgs (12 user / 12 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-ade86b3abc44449d8.jsonl`

## Transcript

### User | 2026-06-11T20:25:04.132Z

Evaluate PRISM skills bucket "core-system". dirs/names: core/* (session-state, error-learner, decision-log, pre-flight, efficiency-pulse), analysis/* (token-usage), system/* (memory-seed), plus counts, digest, code-index, context-*, hook-stats, hook-profile-set, offload-stats, svi, defaults, schedule (PRISM infra skills).

KEEP/DISABLE RULES (PRISM, golf-slot doctrine):
- NEVER recommend DELETE. "disable" = move to .claude/commands-archive/ OR unwire its auto-trigger, ALWAYS preserved on disk (feedback_never_delete_only_disable).
- KEEP if: valid frontmatter (name+description) AND (it has an auto-trigger OR is a core dev-pipeline skill OR is an active manufacturing-domain skill OR is an auto-generated slot wrapper).
- DISABLE-CANDIDATE if ANY: missing/invalid frontmatter; generic non-PRISM scaffolding (sparc/claude-flow/swarm/github boilerplate); exact duplicate of another skill (same purpose); references engines/dispatchers that no longer exist; zero auto-trigger AND not a core/domain skill AND superseded by a newer skill.
- Container/plugin skills CANNOT be archived (plugin-managed): verdict for them is KEEP-INSTALLED vs UNINSTALL-CANDIDATE (redundant with a PRISM-native skill, or unused/irrelevant to manufacturing+dev).
For each bucket: Glob BOTH C:/Users/wompu/.claude/commands/<prefix>*.md AND H:/prism/.claude/commands/<prefix>*.md, dedupe by basename, read only the frontmatter (first ~12 lines) per file, cross-reference the telemetry digest below. Return counts + a SHORT disableCandidates list (name+one-line reason). Be decisive; do not read full bodies.

--- TELEMETRY + FRAMEWORK DIGEST (apply these signals) ---
I have sufficient data. Here is the digest:

---

**PRISM Skill+Hook Framework — Prior Art Digest (<=400 words)**

**A. Skill-Evaluation / Scoring Framework (scripts + schema)**

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, exit 0/1/2). Measures: trigger-ledger coverage ratio, `model:`/`effort:` frontmatter coverage, Ollama
... [+11699 chars truncated]

### Assistant | 2026-06-11T20:25:11.411Z

I'll evaluate the "core-system" bucket by reading the frontmatter of the relevant skills.

### Assistant | 2026-06-11T20:25:12.401Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:12.867Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:13.274Z

[tool_use: Glob]

### User | 2026-06-11T20:25:27.313Z

[tool_result] No files found

### User | 2026-06-11T20:25:28.018Z

[tool_result] No files found

### User | 2026-06-11T20:25:28.806Z

[tool_result] No files found

### Assistant | 2026-06-11T20:25:31.269Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:31.766Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:32.130Z

[tool_use: Glob]

### User | 2026-06-11T20:25:47.688Z

[tool_result] No files found

### User | 2026-06-11T20:25:48.298Z

[tool_result] No files found

### User | 2026-06-11T20:25:48.493Z

[tool_result] No files found

### Assistant | 2026-06-11T20:25:51.917Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:25:54.364Z

[tool_use: Bash]

### User | 2026-06-11T20:29:37.806Z

[tool_result] analysis/
core/
system/
system-audit.md
system-health.md
---
analysis/
core/
system/
system-audit.md
system-coordinate.md
system-health.md
system-viz-drift.md
system-viz.md

### User | 2026-06-11T20:29:38.415Z

[tool_result] code-index.md
context-audit.md
context-integrity.md
context-map.md
context.md
counts.md
defaults.md
digest-all.md
digest.md
hook-stats.md
schedule.md
svi.md
---H:---
code-index.md
context-audit.md
context-integrity.md
context-map.md
context.md
counts.md
defaults.md
digest-all.md
digest.md
hook-profile-set.md
hook-stats.md
offload-stats.md
schedule.md
svi.md

### Assistant | 2026-06-11T20:29:40.700Z

Now let me read the frontmatter of all skills in these directories.

### Assistant | 2026-06-11T20:29:43.086Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:29:44.049Z

[tool_use: Bash]

### User | 2026-06-11T20:30:34.055Z

[tool_result] The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.

### User | 2026-06-11T20:30:34.055Z

[tool_result] The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.

### User | 2026-06-11T20:30:34.055Z

[Request interrupted by user for tool use]
