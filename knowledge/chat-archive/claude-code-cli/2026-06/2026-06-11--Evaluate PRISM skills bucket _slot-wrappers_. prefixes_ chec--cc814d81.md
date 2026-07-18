---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Evaluate PRISM skills bucket \"slot-wrappers\". prefixes: checkin-, handoff-, star"
date: "2026-06-11"
first_ts: "2026-06-11T20:25:04.130Z"
last_ts: "2026-06-11T20:30:34.044Z"
cwd: "H:\\prism-slot-golf"
messages: 24
user_msgs: 12
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a93d8be1cd5cafa9d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Evaluate PRISM skills bucket "slot-wrappers". prefixes: checkin-, handoff-, star

> **claude-code-cli** | 2026-06-11 | 24 msgs (12 user / 12 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/workflows/wf_cba6f0c3-d11/agent-a93d8be1cd5cafa9d.jsonl`

## Transcript

### User | 2026-06-11T20:25:04.130Z

Evaluate PRISM skills bucket "slot-wrappers". prefixes: checkin-, handoff-, startup-, precompact- (the 26-NATO per-slot wrappers). These are auto-generated thin wrappers. KEEP all unless one points at a removed slot name. Just count + confirm.

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

- `H:/prism/scripts/high-roi-skill-rank.mjs` — META artifact (cron-ready, exit 0/1/2). Measures: trigger-ledger coverage ratio, `model:`/`effort:` frontmatter coverage, Ollama offload ratio. Telemetry appended to `state/shared/high-roi-skill-history.jsonl
... [+11619 chars truncated]

### Assistant | 2026-06-11T20:25:10.642Z

I'll glob the per-slot wrapper skills from both trees, then check frontmatter and cross-reference against the canonical SLOT_NAMES.

### Assistant | 2026-06-11T20:25:10.869Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:10.896Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:10.925Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:11.033Z

[tool_use: Glob]

### User | 2026-06-11T20:25:23.264Z

[tool_result] No files found

### User | 2026-06-11T20:25:23.371Z

[tool_result] No files found

### User | 2026-06-11T20:25:23.382Z

[tool_result] No files found

### User | 2026-06-11T20:25:24.006Z

[tool_result] No files found

### Assistant | 2026-06-11T20:25:26.789Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:27.215Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:27.716Z

[tool_use: Glob]

### Assistant | 2026-06-11T20:25:27.900Z

[tool_use: Glob]

### User | 2026-06-11T20:25:42.482Z

[tool_result] H:\prism\.claude\commands\checkin-alpha.md
H:\prism\.claude\commands\checkin-bravo.md
H:\prism\.claude\commands\checkin-charlie.md
H:\prism\.claude\commands\checkin-delta.md
H:\prism\.claude\commands\checkin-echo.md
H:\prism\.claude\commands\checkin-foxtrot.md
H:\prism\.claude\commands\checkin-hotel.md
H:\prism\.claude\commands\checkin-india.md
H:\prism\.claude\commands\checkin-juliett.md
H:\prism
... [+726 chars truncated]

### User | 2026-06-11T20:25:42.634Z

[tool_result] H:\prism\.claude\commands\handoff-alpha.md
H:\prism\.claude\commands\handoff-bravo.md
H:\prism\.claude\commands\handoff-charlie.md
H:\prism\.claude\commands\handoff-delta.md
H:\prism\.claude\commands\handoff-echo.md
H:\prism\.claude\commands\handoff-foxtrot.md
H:\prism\.claude\commands\handoff-golf.md
H:\prism\.claude\commands\handoff-hotel.md
H:\prism\.claude\commands\handoff-india.md
H:\prism\.c
... [+726 chars truncated]

### User | 2026-06-11T20:25:43.222Z

[tool_result] H:\prism\.claude\commands\startup-alpha.md
H:\prism\.claude\commands\startup-bravo.md
H:\prism\.claude\commands\startup-charlie.md
H:\prism\.claude\commands\startup-delta.md
H:\prism\.claude\commands\startup-echo.md
H:\prism\.claude\commands\startup-foxtrot.md
H:\prism\.claude\commands\startup-hotel.md
H:\prism\.claude\commands\startup-india.md
H:\prism\.claude\commands\startup-juliett.md
H:\prism
... [+726 chars truncated]

### User | 2026-06-11T20:25:43.288Z

[tool_result] H:\prism\.claude\commands\precompact-alpha.md
H:\prism\.claude\commands\precompact-bravo.md
H:\prism\.claude\commands\precompact-charlie.md
H:\prism\.claude\commands\precompact-delta.md
H:\prism\.claude\commands\precompact-echo.md
H:\prism\.claude\commands\precompact-foxtrot.md
H:\prism\.claude\commands\precompact-golf.md
H:\prism\.claude\commands\precompact-hotel.md
H:\prism\.claude\commands\prec
... [+804 chars truncated]

### Assistant | 2026-06-11T20:25:46.783Z

Good. Now let me verify the canonical SLOT_NAMES and spot-check a few frontmatter headers to confirm the wrappers are well-formed.

### Assistant | 2026-06-11T20:25:49.635Z

[tool_use: Bash]

### Assistant | 2026-06-11T20:25:51.160Z

[tool_use: Bash]

### User | 2026-06-11T20:28:05.914Z

[tool_result] Exit code 255

### User | 2026-06-11T20:30:33.417Z

[tool_result] === checkin-alpha ===
---
description: Force-claim slot ALPHA + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot alpha --force`. Fleet-reaper ownership moved to golf 2026-05-16 — alpha is a standard work slot now.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
composes_with:
  - "/checkin"
  - "/checkin-golf"
  - "/fleet-reaper
... [+4628 chars truncated]

### User | 2026-06-11T20:30:34.044Z

[Request interrupted by user]
