---
type: "chat-session"
source: "claude-code-cli"
session_id: "dacc6809-4662-414a-a1eb-df8625f83cf8"
title: "You are auditing PRISM's SKILL layer (slash commands) for VERSION SPRAWL and DUP"
date: "2026-05-17"
first_ts: "2026-05-17T20:52:05.969Z"
last_ts: "2026-05-17T20:58:21.914Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 16
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/dacc6809-4662-414a-a1eb-df8625f83cf8/subagents/agent-a9263c11212d4b12f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# You are auditing PRISM's SKILL layer (slash commands) for VERSION SPRAWL and DUP

> **claude-code-cli** | 2026-05-17 | 38 msgs (16 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dacc6809-4662-414a-a1eb-df8625f83cf8/subagents/agent-a9263c11212d4b12f.jsonl`

## Transcript

### User | 2026-05-17T20:52:05.969Z

You are auditing PRISM's SKILL layer (slash commands) for VERSION SPRAWL and DUPLICATE CAPABILITY — inefficiencies where many near-identical skills coexist, confusing which is canonical and bloating the SessionStart skill-injection list.

CONTEXT: PRISM has ~440 skills in `H:/.claude/commands/*.md` and `H:/prism/.claude/commands/*.md`. Observed sprawl: `forge`, `forge2`, `forge3`, `forge4`, `forge5`, `forge6`, `forge7`, `forge-audit`, `forge-audit-v2`; `rgs`, `rgs2`, `rgs3`, `rgs4`, `rgs5`, `rgs6`; `checkin` + 13 NATO `checkin-<slot>` wrappers; `precompact`/`handoff`/`startup` × 13 slots.

YOUR TASK:
1. List both command directories. Identify every VERSION FAMILY (skills sharing a base name with a numeric/v-suffix, or near-identical purpose).
2. For each family, read enough of the files to determine: which version is canonical/current, which are superseded, whether superseded ones are still referenced anywhere (grep other skills + CLAUDE.md + hooks for invocations). A superseded skill still listed in the SessionStart injection is an inefficiency (operator confusion + token cost).
3. Separately, find DUPLICATE-CAPABILITY skills with DIFFERENT names that do substantially the same thing (e.g. multiple "status" skills, multiple "review" skills, multiple "wiring audit" skills). Report pairs/clusters.
4. Check whether the per-slot wrapper skills (`checkin-*`, `precompact-*`, `handoff-*`, `startup-*`) are generated from a template (look for a generator script) — if so they're fine; if hand-maintained they're a drift risk.
5. Estimate token cost: the SessionStart system reminder injects the full skill list every session. Roughly how many lines/skills could be retired or consolidated?

OUTPUT: ranked findings (highest-leverage first). For each: `finding | evidence | recommended action | verification command`. Be specific — name the exact skill files. Distinguish "retire" (truly dead) from "consolidate" (overlapping but both used). Conclusions, not file dumps.

### Assistant | 2026-05-17T20:52:09.706Z

I'll audit PRISM's skill layer for version sprawl and duplicate capability. Let me start by listing both command directories.

### Assistant | 2026-05-17T20:52:11.829Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:52:12.608Z

[tool_use: Bash]

### User | 2026-05-17T20:52:17.970Z

[tool_result] 387
---H-CLAUDE---
226
---PRISM-PROJECT---
387
---C-USER---

### User | 2026-05-17T20:52:29.731Z

[tool_result] _self-awareness-protocol.md  5.4K
acquire-models.md  2.5K
action-help.md  1.1K
action-search.md  5.9K
activate-local.md  4.6K
addtomatrix.md  3.7K
ai-analyze.md  4.7K
ai-optimize.md  5.1K
ai-reason.md  4.0K
algorithm-inspect.md  5.7K
analysis/
approvals.md  2.4K
audit-duplicates.md  2.9K
audit-task.md  7.3K
auto-commit.md  3.0K
auto-speed-feed-lathe.md  4.3K
auto-speed-feed.md  3.3K
autopilot-camk
... [+8224 chars truncated]

### Assistant | 2026-05-17T20:52:32.325Z

Now let me list the project-level commands directory and check for a wrapper generator script.

### Assistant | 2026-05-17T20:52:33.692Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:52:35.192Z

[tool_use: Bash]

### User | 2026-05-17T20:52:39.437Z

[tool_result] advisor-strategy.md  5.4K
agi-cad-generate.md  5.9K
approvals.md  2.0K
audit-viz-first.md  4.5K
awareness-check.md  1.4K
awareness-snapshot.md  3.0K
batch-optimize.md  3.4K
big-blob-hunt.md  9.2K
biz-health.md  1.2K
build-state.md  2.6K
cad-corpus.md  2.4K
cad-dfm-generate.md  3.0K
cad-dfm.md  1.4K
cad-explain.md  2.6K
cad-extract.md  1.2K
cad-feature-recognize.md  1.5K
cad-from-blueprint.md  5.2K
... [+4683 chars truncated]

### User | 2026-05-17T20:52:47.193Z

[tool_result] H:/prism/scripts/generate-per-slot-wrappers.mjs  6.0K
---
H:/prism/scripts/generate-per-slot-wrappers.mjs  6.0K
---gen-scripts---
H:/prism/scripts/generate-action-engine-edges.mjs  5.6K
H:/prism/scripts/generate-action-wiki.mjs  7.2K
H:/prism/scripts/generate-actions-atomic.mjs  5.3K
H:/prism/scripts/generate-additional-catalog-ts.py  3.3K
H:/prism/scripts/generate-ai-tier-expand.mjs  8.3K
H:/pris
... [+4588 chars truncated]

### Assistant | 2026-05-17T20:52:49.579Z

Good — `generate-per-slot-wrappers.mjs` exists. Let me examine the wrapper generator and the forge/rgs version families.

### Assistant | 2026-05-17T20:52:50.527Z

[tool_use: Read]

### Assistant | 2026-05-17T20:52:52.233Z

[tool_use: Bash]

### User | 2026-05-17T20:52:52.805Z

[tool_result] 1	#!/usr/bin/env node
2	// Generates per-slot wrapper slash commands for precompact / handoff / startup.
3	// Mirrors the established /checkin-<slot> pattern (force-take slot → bind topic → delegate to canonical pipeline).
4	//
5	// Why: every per-chat data-write (precompact handoff, /handoff resume, /startup auto-resume) must
6	// land under the correct slot prefix in HANDOFF-<slot>-<topic>.md so
... [+6157 chars truncated]

### User | 2026-05-17T20:53:00.455Z

[tool_result] === H:/prism/.claude/commands/forge2.md (head 30) ===
---
policy:
  tier: 3
  triggers:
    - "forge2"
---
# /forge2 — Project-Local Mirror

This file mirrors the user-global authoritative skill at `H:/.claude/commands/forge2.md`. The user-global file contains the full 6-phase pipeline (Phase 0 Preflight → Phase 0.5 Intelligence Routing → Phase 1 Smart+Knowledge → Phase 2 Brainstorm → Phase 2B Too
... [+2725 chars truncated]

### Assistant | 2026-05-17T20:53:02.929Z

The wrapper generator is confirmed. Now let me examine the forge and rgs version family headers to determine which is canonical.

### Assistant | 2026-05-17T20:53:04.253Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:53:05.099Z

[tool_use: Bash]

### User | 2026-05-17T20:54:34.262Z

[tool_result] === forge.md (first 12 lines) ===
---
name: forge
description: Forge — Brainstorm → Plan → Iterate Pipeline
---

---
[195 more lines]
=== forge2.md (first 12 lines) ===
---
name: forge2
description: Forge v2 — Full-surface Brainstorm → Plan → Iterate Pipeline (routes through 520 skills, 413 hooks, 770 wiki entries, 189 memories, 4,245 tribal tips, 9 MCP plugins, 6 Ollama models, 40+ AI/ML/reasonin
... [+2095 chars truncated]

### User | 2026-05-17T20:56:35.770Z

[tool_result] === rgs.md (first 12 lines) ===
---
name: rgs
description: RGS — Roadmap Generation System
---

# RGS — Roadmap Generation System
[518 more lines]
=== rgs2.md (first 12 lines) ===
---
name: rgs2
description: RGS v2 — 12-stage Roadmap Generation System with hybrid Claude+Ollama scrutiny + 3-way Codex/Gemini/Opus consensus + full PRISM knowledge layer (770 wiki, 189 memories, 4,245 tribal, 40+ AI/ML
... [+2087 chars truncated]

### Assistant | 2026-05-17T20:56:40.862Z

Task list belongs to a different parent run; ignoring. Now let me check for cross-references to old forge/rgs versions and look at the checkin-* wrappers and other duplicate clusters.

### Assistant | 2026-05-17T20:56:42.988Z

[tool_use: Grep]

### User | 2026-05-17T20:56:43.361Z

[tool_result] H:\.claude\commands\action-search.md:3
H:\.claude\commands\algorithm-inspect.md:3
H:\.claude\commands\audit-duplicates.md:1
H:\.claude\commands\autopilot.md:4
H:\.claude\commands\autopilot-full.md:17
H:\.claude\commands\claim-phase.md:1
H:\.claude\commands\context.md:1
H:\.claude\commands\dedup.md:1
H:\.claude\commands\de-sloppify.md:1
H:\.claude\commands\forge-drift.md:1
H:\.claude\commands\forge
... [+1559 chars truncated]

### Assistant | 2026-05-17T20:56:44.552Z

[tool_use: Grep]

### User | 2026-05-17T20:56:44.896Z

[tool_result] 228:| `/forge-triple` | new engine + skill + hook together (after /dedup) |
321:[Omitted long matching line]
322:[Omitted long matching line]
323:[Omitted long matching line]
324:[Omitted long matching line]
325:[Omitted long matching line]
326:[Omitted long matching line]
327:[Omitted long matching line]
335:[Omitted long matching line]
339:- 2026-05-14 | `system-viz-live-bridge` PostToolUse hook
... [+2123 chars truncated]

### Assistant | 2026-05-17T20:56:46.025Z

[tool_use: Bash]

### User | 2026-05-17T20:56:50.129Z

[tool_result] === checkin-alpha.md ===
---
description: Force-claim slot ALPHA + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot alpha --force`. Fleet-reaper ownership moved to golf 2026-05-16 — alpha is a standard work slot now.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# /checkin-alpha — slot-locked /checkin (standard work slot)
... [+3306 chars truncated]

### Assistant | 2026-05-17T20:56:53.519Z

Now let me check duplicate-capability clusters: status/review/wiring/audit/etc. and the C: side mirror.

### Assistant | 2026-05-17T20:56:57.766Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:56:59.369Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:57:00.810Z

[tool_use: Grep]

### User | 2026-05-17T20:57:01.456Z

[tool_result] === H: skill names containing key duplicate-capability keywords ===
audit-duplicates.md  2.9K
audit-task.md  7.3K
audit-viz-first.md  4.5K
chat-topic.md  4.4K
chat.md  1.0K
checkin-alpha.md  3.0K
checkin-bravo.md  2.5K
checkin-charlie.md  2.5K
checkin-delta.md  2.5K
checkin-echo.md  2.5K
checkin-foxtrot.md  2.5K
checkin-golf.md  6.9K
checkin-hotel.md  2.5K
checkin-india.md  2.5K
checkin-juliett.md
... [+2710 chars truncated]

### Assistant | 2026-05-17T20:57:02.128Z

[tool_use: Grep]

### User | 2026-05-17T20:57:05.143Z

[tool_result] === mirrors between H:/.claude and H:/prism/.claude (same basename) ===
approvals.md
awareness-check.md
build-state.md
cad-corpus.md
cad-dfm.md
cad-extract.md
cad-feature-recognize.md
cad-review.md
cad-tolerance-check.md
cam-strategy.md
capacity-plan.md
chat.md
cmm-parse.md
context-audit.md
cpk-calc.md
de-sloppify.md
dedup.md
envelope-sync.md
erp-sync.md
extract-dark-content.md
forge-audit.md
forg
... [+621 chars truncated]

### User | 2026-05-17T20:57:05.633Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-05-17T20:57:05.902Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### Assistant | 2026-05-17T20:58:21.914Z

I have enough evidence to deliver findings. Key data points already collected:
- Forge family v1-v7 + 14 forge-* topical specialists in H:/ + 2 forge-audit variants
- RGS family v1-v6 + 3 project-local mirrors (rgs2/rgs3/forge2 are pass-through stubs to H:/)
- 13×3 = 39 per-slot wrappers (checkin/precompact/handoff/startup) GENERATED by `scripts/generate-per-slot-wrappers.mjs` (idempotent, content-check) — wait: only 3×13 = 39 are generated; `checkin-<slot>` (13) are HAND-MAINTAINED (different sizes per slot, special golf 6.9K vs others 2.5K, alpha 3.0K with doctrine notes, mike 3.8K)
- 0 references to `/forge2..6` or `/rgs2..5` in CLAUDE.md or hooks; only `/forge7` and `/forge-audit-v2` are referenced; the old versions appear only in skill-internal cross-references
- 2 `.fullcopy-bak-20260512-*` backup files still in skill directory
- 63 same-basename duplicates across H: and H:/prism (mirrors)
- Duplicate-capability clusters: dedup (2 copies), smart×2, scrutinize×2, precompact×2, startup×2, sync-terminals×2, reap-zombies×2; pick-task/pick-unit/pick-dev/pick-build-close; close-out/close-out-audit; envelope-sync/envelope-drift-fix; wiring-audit/wire-unwired/wiring-potential/wiring-batch; chat/chat-topic; rename/rename-chat; status/awareness-check/awareness-snapshot/health/system-health; ollama-* 9-skill stack; checkin-india has handoff and conversation with peer mike on slot worktree-MS0 elsewhere etc.

Now, my findings.

---

# PRISM Skill-Layer Sprawl Audit — Ranked Findings

**Scope:** `H:/.claude/commands/` (387 files) + `H:/prism/.claude/commands/` (226 files). 63 same-name mirrors between the two. Generator script: `H:/prism/scripts/generate-per-slot-wrappers.mjs`.

---

## F1 — Forge v1..v7 sprawl (7 versions, only v7 + forge-audit-v2 canonical) — HIGHEST LEVERAGE

| finding | evidence | recommended action | verification |
|---|---|---|---|
| 6 superseded forge versions (`forge`, `forge2`, `forge3`, `forge4`, `forge5`, `forge6`) totaling ~106 KB are still in 
... [+9240 chars truncated]
