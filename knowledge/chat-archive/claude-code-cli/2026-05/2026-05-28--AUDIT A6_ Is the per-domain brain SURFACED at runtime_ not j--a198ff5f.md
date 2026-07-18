---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "AUDIT A6: Is the per-domain brain SURFACED at runtime, not just declared? Verify"
date: "2026-05-28"
first_ts: "2026-05-28T20:42:30.143Z"
last_ts: "2026-05-28T20:51:26.581Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 21
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/workflows/wf_ff92b952-169/agent-a1dbed0b98ff2de02.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# AUDIT A6: Is the per-domain brain SURFACED at runtime, not just declared? Verify

> **claude-code-cli** | 2026-05-28 | 47 msgs (21 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/workflows/wf_ff92b952-169/agent-a1dbed0b98ff2de02.jsonl`

## Transcript

### User | 2026-05-28T20:42:30.143Z

AUDIT A6: Is the per-domain brain SURFACED at runtime, not just declared? Verify: (1) does .claude/hooks/slot-context-bundle-inject.mjs load/point-at galaxy MEMORY.md on UserPromptSubmit? (2) does Bibryam cascade auto-load engines/<galaxy>/CLAUDE.md+MEMORY.md on edit under that dir? (3) does tribal-by-domain-inject surface per-domain tips? Read the hooks. Report LIVE vs on-disk-only + wiring-gap fix.

--- SHARED TOPOLOGY (Map phase) ---


Return AUDIT_SCHEMA. Cite specific files in evidence[] + declare a re-runnable verificationChannel (forge-audit-v3 discipline). You MUST call StructuredOutput before finishing.

### Assistant | 2026-05-28T20:42:53.985Z

I'll audit whether the per-domain brain is surfaced at runtime. Let me start by examining the three hooks in question.
[tool_use: Bash]
[tool_use: Glob]
[tool_use: Glob]
[tool_use: Glob]
[tool_use: Glob]

### User | 2026-05-28T20:43:03.569Z

[tool_result] H:/prism/.claude/hooks/slot-context-bundle-inject.mjs  10.9K
H:/prism/.claude/hooks/tribal-by-domain-inject.mjs  15.8K
---SEARCH FOR SLOT-CONTEXT BUNDLE---
pre-edit-galaxy-cascade-inject.mjs  3.9K
pre-write-cross-galaxy-warn.mjs  5.7K
slot-context-bundle-inject.mjs  10.9K
tribal-by-domain-inject.mjs  15.8K
tribal-by-domain-inject.test.mjs  15.1K

### User | 2026-05-28T20:43:10.896Z

[tool_result] .claude\hooks\slot-context-bundle-inject.mjs

### User | 2026-05-28T20:43:11.040Z

[tool_result] .claude\hooks\pre-write-cross-galaxy-warn.mjs
.claude\hooks\pre-edit-galaxy-cascade-inject.mjs

### User | 2026-05-28T20:43:11.161Z

[tool_result] .claude\hooks\slot-context-bundle-inject.mjs

### User | 2026-05-28T20:43:11.223Z

[tool_result] .claude\hooks\extraction-to-tribal.mjs
.claude\hooks\tribal-autowire.mjs
.claude\hooks\tribal-inject-on-edit.mjs
.claude\hooks\tribal-spike.mjs
.claude\hooks\wiki-tribal-coverage-inject.mjs
.claude\hooks\wiki-tribal-coverage-inject.test.mjs
.claude\hooks\tribal-by-domain-inject.test.mjs
.claude\hooks\stop-tribal-distill-suggest.mjs
.claude\hooks\wiki-tribal-coverage-per-domain-inject.mjs
.claude\h
... [+94 chars truncated]

### Assistant | 2026-05-28T20:43:19.260Z

All three hooks exist on disk, plus a `pre-edit-galaxy-cascade-inject.mjs` which is likely the Bibryam cascade. Let me read all the relevant hooks.

### Assistant | 2026-05-28T20:43:19.753Z

[tool_use: Read]

### Assistant | 2026-05-28T20:43:20.663Z

[tool_use: Read]

### Assistant | 2026-05-28T20:43:20.838Z

[tool_use: Read]

### User | 2026-05-28T20:43:22.160Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\slot-context-bundle-inject.mjs' was already read 75s ago in this session and is unchanged (mtime 1779983334307). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### User | 2026-05-28T20:43:23.472Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// U-GALAXY-MS1-F1 (2026-05-27, slot:alpha): PreToolUse:Edit|Write|MultiEdit hook.
4	// When the target file lives under a Domain-Galaxy directory (mcp-server/src/engines/<galaxy>/),
5	// inject the FIRST 30 lines of that galaxy's CLAUDE.md (the §1 Scope + cascade-position
6	// header) as additionalContext so the chat sees galaxy-local doctrine even if the
7	/
... [+3836 chars truncated]

### User | 2026-05-28T20:43:23.535Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\tribal-by-domain-inject.mjs' was already read 75s ago in this session and is unchanged (mtime 1779935858806). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-28T20:43:37.032Z

The read-once-guard says the two `.mjs` files are already in my context, but I actually haven't seen their bodies yet in this session (the guard is tracking the earlier Glob/ls operations' mtime detection). Let me read them with explicit offsets to get the content, and also check the wiring in settings.json.

### Assistant | 2026-05-28T20:43:37.868Z

[tool_use: Read]

### User | 2026-05-28T20:43:40.659Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
4	//
5	// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
6	// from scripts/lib/zebra-context-bundle.mjs and injects a COMPACT summary of
7	// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
8	// / bridge units availabl
... [+11525 chars truncated]

### Assistant | 2026-05-28T20:43:49.740Z

Now I have `slot-context-bundle-inject.mjs`. Key finding so far: it surfaces a galaxy NAME + a POINTER to the CLAUDE.md/MEMORY.md path, plus a best-effort existence check for PATHS.md/TOOLBELT.md/buildout brief — but it does NOT load the galaxy MEMORY.md content. It only points at it. Let me read the tribal-by-domain hook and the library it depends on.

### Assistant | 2026-05-28T20:43:51.302Z

[tool_use: Read]

### Assistant | 2026-05-28T20:43:51.305Z

[tool_use: Read]

### User | 2026-05-28T20:43:54.141Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+16924 chars truncated]

### User | 2026-05-28T20:43:54.557Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zebra orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zebra orchestrator's `planSlotAction` can make
7	// goal-aware decis
... [+49813 chars truncated]

### Assistant | 2026-05-28T20:44:06.295Z

Critical finding confirmed: the `zebra-context-bundle.mjs` library reads brief/vision/roadmap/soul/loop/token surfaces, but it does NOT read the galaxy `MEMORY.md` content. And `slot-context-bundle-inject.mjs` only emits a POINTER to the galaxy CLAUDE.md/MEMORY.md path — it never loads the content.

Now let me verify the wiring in settings.json and confirm the galaxy MEMORY.md files actually exist on disk.

### Assistant | 2026-05-28T20:44:09.128Z

[tool_use: Bash]

### Assistant | 2026-05-28T20:44:12.784Z

[tool_use: Bash]

### User | 2026-05-28T20:49:10.815Z

[tool_result] Command running in background with ID: bbxqqfczt. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\4286f78f-0fcd-4edb-8e94-b8f2cb659fc8\tasks\bbxqqfczt.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-28T20:49:15.828Z

[tool_result] === GALAXY ENGINE DIRS ===
=== CLAUDE.md + MEMORY.md per galaxy ===
mill -> CLAUDE.md:Y MEMORY.md:Y
lathe -> CLAUDE.md:Y MEMORY.md:Y
wedm -> CLAUDE.md:Y MEMORY.md:Y
quoting -> CLAUDE.md:Y MEMORY.md:Y
business -> CLAUDE.md:Y MEMORY.md:Y
cad -> CLAUDE.md:Y MEMORY.md:Y
cam -> CLAUDE.md:Y MEMORY.md:Y

### Assistant | 2026-05-28T20:49:23.418Z

The galaxy MEMORY.md files exist on disk for all 7 mapped galaxies. The first Bash (grep on engines dir glob — the `ls | grep -iE` returned empty because of how the glob piped, but the per-galaxy loop confirmed dirs + files all exist). The wiring-check Bash is running in the background. Let me read its output.

### Assistant | 2026-05-28T20:49:26.163Z

[tool_use: Bash]

### User | 2026-05-28T20:49:30.642Z

[tool_result] === which event each hook is wired under (H:/.claude/settings.json) ===
slot-context-bundle-inject : 1 occurrence(s) in H:/.claude/settings.json
pre-edit-galaxy-cascade-inject : 1 occurrence(s) in H:/.claude/settings.json
tribal-by-domain-inject : 1 occurrence(s) in H:/.claude/settings.json
=== also check C: settings ===
slot-context-bundle-inject : 1 occurrence(s) in C: settings.json
pre-edit-gal
... [+118 chars truncated]

### Assistant | 2026-05-28T20:49:36.445Z

All three are wired (1 occurrence each in both settings files). Now let me confirm WHICH event each is wired under, to verify the cascade hook is on PreToolUse:Edit and the others on UserPromptSubmit. Let me grep with context.

### Assistant | 2026-05-28T20:49:38.360Z

[tool_use: Grep]

### User | 2026-05-28T20:49:40.748Z

[tool_result] 804:    "PreToolUse": [
835:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-edit-galaxy-cascade-inject.mjs",
873:        "matcher": "Edit|Write|MultiEdit",
1028:        "matcher": "Edit|Write|MultiEdit",
1058:        "matcher": "Edit|MultiEdit",
1143:        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
1164:    "UserPromptSubmit": [
1218:            "command"
... [+477 chars truncated]

### Assistant | 2026-05-28T20:49:48.984Z

Wiring confirmed:
- `pre-edit-galaxy-cascade-inject.mjs` is at line 835, under `PreToolUse` (block starts line 804). Need to verify its matcher includes Edit. Let me check the matcher right before line 835.
- `tribal-by-domain-inject.mjs` (line 1218) and `slot-context-bundle-inject.mjs` (line 1284) are both under `UserPromptSubmit` (block starts line 1164). Confirmed LIVE on UserPromptSubmit.

Let me verify the cascade hook's matcher and check the test file to confirm the tribal hook's domain inference is actually keyed on slot domain (the SLOT_GALAXY_MAP vs the DOMAIN_MAP — these are different concerns).

### Assistant | 2026-05-28T20:49:49.807Z

[tool_use: Read]

### Assistant | 2026-05-28T20:49:50.763Z

[tool_use: Read]

### User | 2026-05-28T20:49:51.459Z

[tool_result] 820	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/activate-before-build-precheck.mjs",
821	            "timeout": 2000
822	          }
823	        ]
824	      },
825	      {
826	        "matcher": "^(Edit|Write|MultiEdit|NotebookEdit)$",
827	        "hooks": [
828	          {
829	            "type": "command",
830	            "command": "\"H:/.claude/bin/portable-
... [+637 chars truncated]

### User | 2026-05-28T20:49:53.214Z

[tool_result] 1	#!/usr/bin/env node
2	// wiki-domain-bias.mjs
3	// SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN
4	//
5	// Surgical helper for wiki-precheck-inject.mjs — biases the BM25 score of wiki
6	// candidates toward the *active milestone domain* so a chat working on
7	// SYSTEM-VIZ-BRAIN-MS0 sees system-viz wiki entries ranked higher than
8	// generically-matching ones.
9	//
10	// Domain tokens are de
... [+4909 chars truncated]

### Assistant | 2026-05-28T20:50:09.518Z

All wiring confirmed. I now have a complete picture across all three audit questions. Let me summarize the verification:

**(1) slot-context-bundle-inject.mjs (UserPromptSubmit, line 1284):** LIVE-wired. It resolves the slot → galaxy via `SLOT_GALAXY_MAP` (line 66-92) and emits a galaxy-name + a POINTER string (`mcp-server/src/engines/${galaxy}/CLAUDE.md + ./MEMORY.md apply`) plus best-effort existence checks for PATHS.md/TOOLBELT.md/buildout-brief. It does NOT load/inject galaxy MEMORY.md content — only points at it. The underlying `zebra-context-bundle.mjs` reads brief/vision/roadmap/soul/loop/token, but has NO galaxy-MEMORY.md reader.

**(2) Bibryam cascade — pre-edit-galaxy-cascade-inject.mjs (PreToolUse:Edit|Write|MultiEdit, line 835, continueOnError:true):** LIVE-wired. On edit under `mcp-server/src/engines/<galaxy>/`, it injects the FIRST 30 lines of that galaxy's CLAUDE.md head. But: it injects ONLY CLAUDE.md head, NOT MEMORY.md content (line 86 references the MEMORY.md path in the footer as a pointer only). The actual harness CLAUDE.md cascade is the primary mechanism; this hook is explicitly "insurance."

**(3) tribal-by-domain-inject.mjs (UserPromptSubmit, line 1218):** LIVE-wired. Surfaces per-domain tribal tips keyed on the slot's milestone domain via `getDomainTokens` → `inferTribalDomain` → tribal-rerank with `--domain` doubling. This IS LIVE per-domain tribal surfacing.

The gap: galaxy MEMORY.md (the per-domain Obsidian-style brain) is declared and pointed-at but its CONTENT is never injected at runtime. Let me confirm the cascade hook footer references MEMORY.md as pointer-only and check one galaxy MEMORY.md size to confirm there's real content being left unsurfaced.

### Assistant | 2026-05-28T20:50:13.126Z

[tool_use: Bash]

### User | 2026-05-28T20:50:17.796Z

[tool_result] === galaxy MEMORY.md sizes (content that is declared but never injected) ===
mill/MEMORY.md : 3111 bytes, 47 lines
lathe/MEMORY.md : 3208 bytes, 49 lines
wedm/MEMORY.md : 3281 bytes, 48 lines
quoting/MEMORY.md : 2398 bytes, 39 lines
business/MEMORY.md : 2884 bytes, 53 lines
cad/MEMORY.md : 1105 bytes, 25 lines
cam/MEMORY.md : 918 bytes, 20 lines
=== confirm cascade hook injects CLAUDE.md only, MEM
... [+948 chars truncated]

### Assistant | 2026-05-28T20:50:25.650Z

Confirmed. Every galaxy MEMORY.md has real content (918-3281 bytes, 20-53 lines each) that is declared but never injected at runtime. The cascade hook reads `CLAUDE.md` only (line 41 `readGalaxyHead`), and MEMORY.md appears only as a footer pointer (line 86). The slot-context-bundle hook also only emits a pointer string. I have everything needed for the audit.

Let me complete the task tracking and return the structured finding.

### Assistant | 2026-05-28T20:50:25.801Z

[tool_use: TaskUpdate]

### User | 2026-05-28T20:50:27.298Z

[tool_result] Task not found

### Assistant | 2026-05-28T20:51:14.639Z

[tool_use: StructuredOutput]

### User | 2026-05-28T20:51:16.071Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-28T20:51:26.581Z

AUDIT A6 complete. The per-domain brain is PARTIALLY surfaced at runtime, severity P1:

- **(1) slot-context-bundle-inject.mjs** — LIVE-wired (UserPromptSubmit, settings.json:1284), but only POINTS AT galaxy MEMORY.md (path string + existence flags). The lib it consumes (`zebra-context-bundle.mjs`) has no galaxy-MEMORY.md reader at all.
- **(2) Bibryam cascade (pre-edit-galaxy-cascade-inject.mjs)** — LIVE-wired (PreToolUse:Edit|Write|MultiEdit, settings.json:835), but injects galaxy CLAUDE.md head ONLY (30 lines). MEMORY.md is a footer pointer.
- **(3) tribal-by-domain-inject.mjs** — FULLY LIVE (UserPromptSubmit, settings.json:1218). Genuinely surfaces per-domain tribal tip CONTENT via slot→domain→tribal-rerank.

The net gap: 7 galaxy MEMORY.md files (918-3281 bytes each) exist with real content but their BODY is never injected by any hook — both galaxy-aware hooks emit a path pointer only, and fleet route take-rate is 0.5%, so a pointer is unreliable. Fix is strictly additive: add a `loadGalaxyMemory` reader and inject the head body in both the UserPromptSubmit and PreToolUse:Edit hooks, gated behind one knob. Question (3) needs no change.
