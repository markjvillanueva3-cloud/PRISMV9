---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Read and map the structure of the PRISM `/checkin` slash-command skill and its w"
date: "2026-05-16"
first_ts: "2026-05-16T13:16:34.482Z"
last_ts: "2026-05-16T13:18:03.574Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a2672acc73b7a8aa7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Read and map the structure of the PRISM `/checkin` slash-command skill and its w

> **claude-code-cli** | 2026-05-16 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a2672acc73b7a8aa7.jsonl`

## Transcript

### User | 2026-05-16T13:16:34.482Z

Read and map the structure of the PRISM `/checkin` slash-command skill and its wrappers. This is research only — report findings, do not edit anything.

Files to read in full:
- `H:\prism\.claude\commands\checkin.md` — the main skill (read the WHOLE file end to end)
- `H:\prism\.claude\commands\checkin-bravo.md` — one NATO-slot wrapper
- Glob `H:\prism\.claude\commands\checkin-*.md` and list ALL the checkin-* wrapper skills you find

Context: `/checkin` is a fleet check-in pipeline. It has a "slot-claim phase" (steps 1-7ish, claims a chat slot) and a "dev pipeline phase" (steps 8-14) that fires only when args contain a task directive. I am about to integrate autonomous continuous-work behavior (from the `autopilot-full` and `yolo-mode` skills) INTO this checkin pipeline so a checked-in chat keeps working as long as possible.

Report back, with exact line numbers:
1. The complete section/step outline of checkin.md — every numbered step and §section heading, what each does, in order.
2. Exactly how the "dev pipeline phase (steps 8-14)" is structured — what each step is, what triggers it (which args/keywords), and where the end-of-session pipeline (scrutiny, commit, precompact, handoff) lives.
3. How the §Report is structured (what lines it prints).
4. Whether checkin.md already contains ANY loop / continuous / autonomous / `/loop` / `/run-continuous` / "keep going" language — quote it with line numbers.
5. How the NATO wrappers (checkin-bravo.md etc.) delegate to checkin.md — do they duplicate the body or reference it? List every checkin-* wrapper file.
6. The frontmatter of checkin.md (name, description).
7. Any mention of loop-state.mjs, pipelineStep/pipelineIter/pipelineTarget, or autonomous resumption.

Be precise with line numbers — I need to edit this file surgically.

### Assistant | 2026-05-16T13:16:40.635Z

I'll systematically read and map the checkin skill structure. Let me start by examining the main files.

### Assistant | 2026-05-16T13:16:40.857Z

[tool_use: Read]

### Assistant | 2026-05-16T13:16:40.863Z

[tool_use: Glob]

### User | 2026-05-16T13:16:41.674Z

[tool_result] .claude\commands\checkin-alpha.md
.claude\commands\checkin-bravo.md
.claude\commands\checkin-charlie.md
.claude\commands\checkin-delta.md
.claude\commands\checkin-echo.md
.claude\commands\checkin-foxtrot.md
.claude\commands\checkin-golf.md
.claude\commands\checkin-hotel.md
.claude\commands\checkin-india.md
.claude\commands\checkin-juliett.md
.claude\commands\checkin-kilo.md
.claude\commands\checki
... [+9 chars truncated]

### User | 2026-05-16T13:16:42.352Z

[tool_result] 1	---
2	name: checkin
3	description: One-stop development pipeline entry. Claim a slot in the 10-chat PRISM fleet (alpha..india work + juliett hygiene; golf is also hygiene back-compat) — bind handoff to slot, reap crashed slots, drift/commit-hygiene check, then EMIT THE FULL DEV PIPELINE for whatever task the operator hands over in the args. Pipeline auto-injects prism-awareness + system-viz + Ob
... [+51303 chars truncated]

### Assistant | 2026-05-16T13:16:44.303Z

Now let me read the checkin-bravo.md file to understand the wrapper structure:

### Assistant | 2026-05-16T13:16:44.377Z

[tool_use: Read]

### User | 2026-05-16T13:16:45.869Z

[tool_result] 1	---
2	description: Force-claim slot BRAVO + run the full /checkin pipeline. NATO-phonetic shortcut for `/checkin --preferSlot bravo --force`.
3	allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite, Task, AskUserQuestion
4	---
5	
6	# /checkin-bravo — slot-locked /checkin
7	
8	Force-takes the **bravo** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the han
... [+2217 chars truncated]

### Assistant | 2026-05-16T13:18:03.574Z

Perfect. Now I have all the information I need. Let me compile the comprehensive mapping report.

---

## PRISM `/checkin` Skill Structure — Complete Map

### 1. FRONTMATTER (lines 1–14)

**Name:** `checkin`

**Description:** One-stop development pipeline entry. Claim a slot in the 10-chat PRISM fleet (alpha..india work + juliett hygiene; golf is also hygiene back-compat) — bind handoff to slot, reap crashed slots, drift/commit-hygiene check, then EMIT THE FULL DEV PIPELINE for whatever task the operator hands over in the args. Pipeline auto-injects prism-awareness + system-viz + Obsidian-PRISM-OS + tribal knowledge + AI/neural/deep-reasoning routing + CLAUDE.md rules. Files created get registered to /system-viz galaxy. End-of-session precompact/compact/handoff rules are appended automatically so a typed `/checkin <task>` is the only thing the operator needs.

---

### 2. COMPLETE SECTION/STEP OUTLINE (with exact line numbers)

| Line | Section/Step | What it does |
|------|--------------|-------------|
| 16–30 | **## /checkin — Fleet Check-In + Drift / Conflict / Commit Guard** | Heading + prose explanation of slot claim + drift guard + roadmap narrowing |
| 22–29 | **## Args: $ARGUMENTS** | 7 argument modes: (empty), `--topic`, `--force --confirmRecent --preferSlot`, `--golf`, `--roadmap devtools`, `--roadmap revenue`, slot-claim explanation, roadmap filtering logic |
| 31 | **## Steps — run all of these, then print the §Report** | Header introducing steps 1–7 (slot-claim phase) |
| 33–58 | **### 1. Identify this chat** | Extract STABLE session ID, BRANCH, TOPIC (4-priority resolution: explicit arg → commit scope → CURRENT_POSITION.md → branch fallback) |
| 60–74 | **### 2. Reap crashed slots, then claim/refresh this chat's slot** | `chat-slots.mjs reclaim` + claim logic, `previousOwner` field documentation, fleet_full handling, recency-guard window |
| 76–87 | **### 3. Bind the handoff to the slot** | per-agent-handoff.mjs read/write, --source live-chat requireme
... [+19147 chars truncated]
