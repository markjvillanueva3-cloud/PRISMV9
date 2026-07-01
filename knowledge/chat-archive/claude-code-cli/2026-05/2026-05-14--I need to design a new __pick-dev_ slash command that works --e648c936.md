---
type: "chat-session"
source: "claude-code-cli"
session_id: "e648c936-3dfa-4a7c-aedb-4efebd2980b0"
title: "I need to design a new `/pick-dev` slash command that works like `/pick-unit` an"
date: "2026-05-14"
first_ts: "2026-05-14T14:09:48.706Z"
last_ts: "2026-05-14T14:14:35.112Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 22
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-afafe1fe3f2baca74.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# I need to design a new `/pick-dev` slash command that works like `/pick-unit` an

> **claude-code-cli** | 2026-05-14 | 52 msgs (22 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-afafe1fe3f2baca74.jsonl`

## Transcript

### User | 2026-05-14T14:09:48.706Z

I need to design a new `/pick-dev` slash command that works like `/pick-unit` and `/pick-task` but is permanently locked to the backend-devtools roadmap (and will automatically include a new `COMMAND-KERNEL-MS0` milestone once it's added to the roadmap). Search breadth: very thorough.

Explore and report:
1. Read `H:/prism/scripts/pick-unit.mjs` IN FULL — exactly how it: loads `state/shared/atomic-roadmap.json`, filters by `roadmap_priority` / `track`, drops already-shipped units (via MILESTONE_PROGRESS.json), ranks (tier/milestone/unit_id sort), resolves the chat's slot→lane, and what its `--priority devtools|revenue|any`, `--slot`, `--tier`, `--limit`, `--json` flags do. Quote the key code.
2. Read `H:/prism/.claude/commands/pick-unit.md`, `pick-task.md`, `pick-build-close.md`, `checkin.md` — confirm the command-file conventions (frontmatter, the "research pack" block, how pick-unit.md delegates to the script).
3. Check for any EXISTING `/pick-dev`, `pick-dev.mjs`, `pick-devtools`, or similar — run a duplication check (Glob `.claude/commands/`, Grep for "pick-dev"). Report whether anything already exists.
4. Determine the CLEANEST way to add `/pick-dev`: (a) a pure command .md that invokes `pick-unit.mjs --priority devtools` with no new script, (b) a thin wrapper script `scripts/pick-dev.mjs` that calls pick-unit.mjs, or (c) a flag added to pick-unit.mjs. Recommend one with reasoning. Note exactly what "+ whatever you're building" requires — i.e. does a newly-injected milestone automatically appear in pick-unit's output once it's in atomic-roadmap.json?

Report as structured markdown with exact file paths and line cites. Your final message is the only thing returned to me — make it complete and self-contained.

### Assistant | 2026-05-14T14:09:52.527Z

I'll conduct a thorough exploration of the pick-unit system and design approach for your `/pick-dev` command. Let me start by examining the key files.

### Assistant | 2026-05-14T14:09:52.736Z

[tool_use: Read]

### Assistant | 2026-05-14T14:09:53.011Z

[tool_use: Read]

### Assistant | 2026-05-14T14:09:53.167Z

[tool_use: Read]

### Assistant | 2026-05-14T14:09:53.379Z

[tool_use: Read]

### Assistant | 2026-05-14T14:09:53.752Z

[tool_use: Read]

### User | 2026-05-14T14:09:59.283Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-14T14:10:01.832Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * pick-unit.mjs — Deterministic "next unit" picker from the two master roadmaps.
4	 *
5	 * User directive (2026-05-13): "when I say pick a unit, units are picked
6	 * from those 2 road maps with development tools taking first priority."
7	 *
8	 * The two master roadmaps are encoded in state/shared/atomic-roadmap.json via
9	 *   roadmap_priority === 0  →  BACKEND-DEVT
... [+12393 chars truncated]

### User | 2026-05-14T14:10:02.497Z

[tool_result] 1	---
2	description: Deterministic next-unit picker from the two master roadmaps (devtools first, then revenue). Subtracts already-shipped units, sorts by priority + tier, returns top-N with spec paths. Use when the user says "pick a unit" or "pick the next thing to ship."
3	allowed-tools: Bash, Read
4	---
5	
6	# /pick-unit — Always pick from the right roadmap, in the right order
7	
8	User standin
... [+7985 chars truncated]

### User | 2026-05-14T14:10:02.909Z

[tool_result] 1	---
2	name: pick-build-close
3	description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
4	trigger:
5	  autoSuggest:
6	    keywords: ["pick b
... [+5957 chars truncated]

### User | 2026-05-14T14:10:03.259Z

[tool_result] 1	---
2	name: checkin
3	description: Check this chat into the 7-slot PRISM fleet (claim alpha/bravo/charlie/delta/echo/foxtrot work slots OR golf hygiene slot), bind the handoff filename to the slot, reap crashed slots + stale file-claims, and verify there's no envelope/code drift, no peer-owned files staged, no stale index.lock, no diverge-from-origin. Run once at the start of any chat that's par
... [+17537 chars truncated]

### Assistant | 2026-05-14T14:10:05.356Z

Let me search for any existing `/pick-dev` related commands or scripts.

### Assistant | 2026-05-14T14:10:05.779Z

[tool_use: Glob]

### Assistant | 2026-05-14T14:10:06.035Z

[tool_use: Glob]

### Assistant | 2026-05-14T14:10:06.461Z

[tool_use: Grep]

### Assistant | 2026-05-14T14:10:06.837Z

[tool_use: Bash]

### User | 2026-05-14T14:10:09.532Z

[tool_result] No files found

### User | 2026-05-14T14:10:27.174Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T14:10:27.579Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T14:10:35.493Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-14T14:10:38.920Z

Let me refine my search approach with more specific patterns.

### Assistant | 2026-05-14T14:10:39.133Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:10:39.375Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:10:39.793Z

[tool_use: Bash]

### User | 2026-05-14T14:11:00.174Z

[tool_result] pick-unit.mjs

### User | 2026-05-14T14:11:03.625Z

[tool_result] pick-build-close.md
pick-unit.md

### User | 2026-05-14T14:13:09.479Z

[tool_result] Command running in background with ID: b52pw63sm. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\00303402-8d56-410b-b5a4-2d45e0e2edf6\tasks\b52pw63sm.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T14:13:11.196Z

Now let me check the atomic-roadmap for backend-devtools and COMMAND-KERNEL references:

### Assistant | 2026-05-14T14:13:11.575Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:13:11.880Z

[tool_use: Read]

### User | 2026-05-14T14:13:13.693Z

[tool_result] File content (856248 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-14T14:13:17.010Z

[tool_result] <persisted-output>
Output too large (1.5MB). Full output saved to: C:\Users\Mark Villanueva\.claude\projects\H--prism\e648c936-3dfa-4a7c-aedb-4efebd2980b0\tool-results\b09m0thau.txt

Preview (first 2KB):
{"schemaVersion":"1.1.0","passId":"pass-1778527678545-s4lk48","generatedAt":"2026-05-13T15:19:17.337Z","total":3755,"filteredShipped":0,"envelopeDrifts":[{"milestone":"CADCAM-DEEPAGI-ML-METHODOLOG
... [+1828 chars truncated]

### Assistant | 2026-05-14T14:13:18.588Z

Let me use a more targeted approach to examine the roadmap structure:

### Assistant | 2026-05-14T14:13:19.783Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:13:20.627Z

[tool_use: Bash]

### User | 2026-05-14T14:13:26.036Z

[tool_result] Total units: 3755
Lane assignments: 6
Devtools (priority 0): 3097
Unique tracks: [
  'ACP',                'AGENT',              'AI-CAD',
  'AI-CORE',            'AI-LATHE',           'AI-MAX',
  'AI-WIRE',            'APP',                'APPW',
  'ARCH',               'AUTO-LEARNING-LOOP', 'BENCH',
  'BP',                 'CAD-CAM-AGI',        'CAD-CAM-DEEPAGI',
  'CAD-COMPLETE',       'CAD-GR
... [+1637 chars truncated]

### User | 2026-05-14T14:13:29.765Z

[tool_result] COMMAND/KERNEL units found: 0

### Assistant | 2026-05-14T14:13:31.753Z

Good! Now let me examine the MILESTONE_PROGRESS file and check how the script handles the --priority flag logic:

### Assistant | 2026-05-14T14:13:32.190Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:13:33.787Z

[tool_use: Bash]

### User | 2026-05-14T14:13:36.974Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-14T14:13:12.073Z",
  "window": "60.days",
  "totals": {
    "milestones": 670,
    "units": 4906,
    "shipped": 1264,
    "pending": 3642,
    "drift": 173
  },
  "milestones": [
    {
      "id": "CADCAM-DEEPAGI-ML-METHODOLOGY-ANNEX",
      "title": "Machine Learning Methodology Annex — Applies to MS0, MS1, MS4, MS7",
      "track": "",
   
... [+867 chars truncated]

### User | 2026-05-14T14:13:45.163Z

[tool_result] Sample devtools units:
 - CAD-INFRA-MS0 U-CINF12 | priority: 0 tier: 0 track: CAD-INFRA
 - CAD-INFRA-MS0 U-CINF01 | priority: 0 tier: 0 track: CAD-INFRA
 - CAD-INFRA-MS0 U-CINF04 | priority: 0 tier: 0 track: CAD-INFRA

### Assistant | 2026-05-14T14:13:46.540Z

Perfect! Now let me verify the command invocation mechanism in the .claude/commands directory:

### Assistant | 2026-05-14T14:13:46.763Z

[tool_use: Bash]

### Assistant | 2026-05-14T14:13:47.270Z

[tool_use: Read]

### User | 2026-05-14T14:13:49.333Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\.claude\commands'

### User | 2026-05-14T14:13:52.095Z

[tool_result] ---
description: Deterministic next-unit picker from the two master roadmaps (devtools first, then revenue). Subtracts already-shipped units, sorts by priority + tier, returns top-N with spec paths. Use when the user says "pick a unit" or "pick the next thing to ship."
allowed-tools: Bash, Read
---

# /pick-unit — Always pick from the right roadmap, in the right order

User standing rule (2026-05-
... [+1643 chars truncated]

### Assistant | 2026-05-14T14:13:53.514Z

Now let me look at how the command bridge works by checking one more working command file:

### Assistant | 2026-05-14T14:13:53.886Z

[tool_use: Read]

### User | 2026-05-14T14:13:58.848Z

[tool_result] 1	---
2	name: pick-build-close
3	description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
4	trigger:
5	  autoSuggest:
6	    keywords: ["pick b
... [+1799 chars truncated]

### Assistant | 2026-05-14T14:14:35.112Z

Excellent. Now I have all the information I need. Let me compile a comprehensive report.

---

## EXPLORATION REPORT: `/pick-dev` Command Design

### 1. PICK-UNIT.MJS DEEP DIVE

**File:** `H:/prism/scripts/pick-unit.mjs` (281 lines)

**Core Architecture:**

The script loads and filters units through this deterministic pipeline:

```javascript
// Lines 35-52: Initialize paths and argument parsing
const ROOT = "H:/prism";
const ROADMAP_PATH = path.join(ROOT, "state/shared/atomic-roadmap.json");
const PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");

const args = process.argv.slice(2);
const slot = argVal("--slot", "alpha");
const chat = SLOT_TO_CHAT[slot] ?? Number(slot) ?? 1;
const priorityFilter = argVal("--priority", "devtools").toLowerCase();  // ← DEFAULT: "devtools"
const tierFilter = args.includes("--tier") ? Number(argVal("--tier", "")) : null;
const limit = Math.max(1, Number(argVal("--limit", "5")) || 5);
const wantJson = args.includes("--json");
```

**Priority Filter Logic (Lines 127-130):**
```javascript
if (priorityFilter === "devtools") pool = pool.filter((u) => u.roadmap_priority === 0);
else if (priorityFilter === "revenue") pool = pool.filter((u) => u.roadmap_priority === 1);
else if (priorityFilter === "cleanup") pool = pool.filter((u) => u.roadmap_priority === 2);
// "any" → keep all
```

**Flag Behavior:**
- `--priority devtools` (default) — filters to `roadmap_priority === 0` only
- `--priority revenue` — filters to `roadmap_priority === 1` only
- `--priority cleanup` — filters to `roadmap_priority === 2` only
- `--priority any` — keeps all three priorities merged, sorts devtools first

**Lane Resolution (Lines 104-121):**
The script maps slots to chats:
```javascript
const SLOT_TO_CHAT = { alpha: 1, bravo: 2, charlie: 3, delta: 4, echo: 5, foxtrot: 6, golf: 7 };
```

Then either:
- Uses cleanup-query logic (full roadmap pool, no lane filtering) if `--pr
... [+9064 chars truncated]
