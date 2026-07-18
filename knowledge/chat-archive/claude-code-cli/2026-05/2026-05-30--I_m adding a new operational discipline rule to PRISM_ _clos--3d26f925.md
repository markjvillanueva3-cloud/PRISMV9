---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "I'm adding a new operational discipline rule to PRISM: \"close your tool calls / "
date: "2026-05-30"
first_ts: "2026-05-30T04:02:10.033Z"
last_ts: "2026-05-30T04:04:31.086Z"
cwd: "H:\\prism-slot-golf"
messages: 27
user_msgs: 12
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-abd7922fedcdd5108.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# I'm adding a new operational discipline rule to PRISM: "close your tool calls / 

> **claude-code-cli** | 2026-05-30 | 27 msgs (12 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-abd7922fedcdd5108.jsonl`

## Transcript

### User | 2026-05-30T04:02:10.033Z

I'm adding a new operational discipline rule to PRISM: "close your tool calls / background tasks when done — never leave orphaned background processes at session Stop." I need to add it as (a) a CLAUDE.md rule, (b) a galaxy-wide memory in the fleet-hygiene galaxy, (c) a standing-doctrine feedback memory. Report the exact patterns + file paths (read-only, no edits):

1. **CLAUDE.md rules structure.** Read `C:/Users/wompu/.claude/CLAUDE.md` — find the "CLAUDE.md RULES 5–13" section (R5 through R13). Report: the exact format of a rule entry (e.g. "R13 — title. body → PRISM: [[memory]]"), where a new R14 would go, and the section's line-count discipline note. Also check `H:/prism/CLAUDE.md` for where hygiene/enforcement rules live (e.g. §GOLF SLOT, §FLEET-REAPER, §ENFORCEMENT GATES). Which CLAUDE.md is the right home for a "close your background tasks" discipline rule?

2. **Galaxy memory structure (fleet-hygiene = golf's galaxy).** Read `H:/prism/mcp-server/src/engines/fleet-hygiene/MEMORY.md` and `CLAUDE.md`. Report its structure — how standing doctrine / gotchas / rules are recorded there, and how I'd add a "close background tasks" entry. Also note the master-brain link pattern (the `[galaxy:fleet-hygiene]` back-pointer row in the global MEMORY.md).

3. **Feedback memory format.** Show the canonical frontmatter + body for a `feedback_*.md` standing-doctrine memory (type: feedback, with **Why:** and **How to apply:** lines). Find 2-3 examples in `C:/Users/wompu/.claude/projects/H--prism/memory/feedback_*.md` (e.g. feedback_never_delete_only_disable, feedback_always_close_out). Report the exact structure + how it's indexed in MEMORY.md.

4. **Is there an existing "always close out" rule** I'd be duplicating or should link to? Check `feedback_always_close_out.md` — does it cover background-task/process cleanup, or only roadmap/doc close-out? I want to avoid duplication (R8/dedup) and link/extend rather than create a near-dup.

Report concrete file paths + the exact inse
... [+26 chars truncated]

### Assistant | 2026-05-30T04:02:20.259Z

I'll help you map out the exact patterns for adding this operational discipline rule to PRISM. Let me systematically read the relevant files.

### Assistant | 2026-05-30T04:02:20.477Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:20.679Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:20.880Z

[tool_use: Glob]

### Assistant | 2026-05-30T04:02:21.008Z

[tool_use: Glob]

### User | 2026-05-30T04:02:46.304Z

[tool_result] H:/prism/mcp-server/src/engines/fleet-hygiene\CLAUDE.md
H:/prism/mcp-server/src/engines/fleet-hygiene\PATHS.md
H:/prism/mcp-server/src/engines/fleet-hygiene\TOOLBELT.md
H:/prism/mcp-server/src/engines/fleet-hygiene\MEMORY.md

### User | 2026-05-30T04:02:46.410Z

[tool_result] C:\Users\wompu\.claude\projects\H--prism\memory\feedback_d2_smoke.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_d2_bom_smoke.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_golf_owns_reaper.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_ai_training_first_before_revenue.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_alpha_owns_reaper.md
C:\Users\w
... [+8730 chars truncated]

### User | 2026-05-30T04:02:49.261Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-252 of 459 total (38664 tokens, cap 25000). Call Read with offset=253 limit=252 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDA
... [+45863 chars truncated]

### User | 2026-05-30T04:02:53.840Z

[tool_result] 1	# PRISM Global CLAUDE.md — Operational Playbook v2.5
2	
3	> **Edit `C:\Users\<your-user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook (`.claude/hooks/mirror-c-to-h.mjs`, INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01, **wired into both settings.json 2026-05-15**) auto-replicates C: → H: on every Edit/Write/MultiEdit/NotebookEdit. One-way only; SHA-256 byte-equal skip; 2s throttle; excludes cache/l
... [+20977 chars truncated]

### Assistant | 2026-05-30T04:02:55.912Z

I'm in plan mode. Let me gather the remaining files to give you a complete pattern report. I'll read the key files directly.

### Assistant | 2026-05-30T04:02:56.570Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:56.588Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:57.597Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:58.131Z

[tool_use: Read]

### Assistant | 2026-05-30T04:02:58.165Z

[tool_use: Read]

### User | 2026-05-30T04:03:33.012Z

[tool_result] 1	# GOLF Galaxy Memory — Fleet Hygiene + Reaper + MCP Server
2	
3	Cross-session memory for the **golf** slot (position 7 of 26 NATO, `alpha..zulu`). Golf is a full work slot that ALSO owns fleet-reaper duty (ownership moved alpha→golf 2026-05-16, [[feedback_golf_owns_reaper]]). Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.
4	
5
... [+11309 chars truncated]

### User | 2026-05-30T04:03:33.180Z

[tool_result] 1	# Fleet Hygiene Galaxy (GOLF slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> GOLF — DESIGNATED FLEET REAPER (MUST KEEP RUNNING AT ALL TIMES; periodic check of zombie/orphan node, bash, git, read, grep, search tasks & processes), MCP server updates/upgrades/fixes, general work.
5	
6	This card is the per-domain operating doctrine. The full asset map, regression classes, and live-st
... [+5072 chars truncated]

### User | 2026-05-30T04:03:35.758Z

[tool_result] <system-reminder>This memory is 5 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: feedback-auto-close-out
3	description: "Standing rule (2026-05-13) — always audit + close out shipped-but-pending units when working on roadmaps.
... [+6726 chars truncated]

### User | 2026-05-30T04:03:35.763Z

[tool_result] <system-reminder>This memory is 5 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: feedback_always_close_out
3	description: "Standing rule (2026-05-12) — never defer to follow-up; close out EVERY task of a unit before stopping, 
... [+1936 chars truncated]

### User | 2026-05-30T04:03:35.823Z

[tool_result] <system-reminder>This memory is 5 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: feedback_roadmap_close_out
3	description: Standing rule (2026-05-12, user) — every completed milestone/unit MUST be closed out in ALL roadmap sur
... [+3489 chars truncated]

### Assistant | 2026-05-30T04:03:38.103Z

Now let me read the rest of the project CLAUDE.md to find the ENFORCEMENT GATES section:

### Assistant | 2026-05-30T04:03:38.555Z

[tool_use: Read]

### Assistant | 2026-05-30T04:03:39.683Z

[tool_use: Grep]

### User | 2026-05-30T04:03:47.092Z

[tool_result] 253	- `duplication-hard-block.mjs` → **HARD BLOCK** on exact duplicates
254	- `ai-feature-recommend.mjs` → recommends relevant engines
255	- `build-create-detector.mjs` → detects create intent
256	
257	**Bug-finding → wiki gate (2026-05-17, lima 77971357 — commit `bb198d9285`):** `.claude/hooks/stop-bug-finding-wiki-gate.mjs` (T3 Stop advisory, wired Stop[0].hooks[19] in both `C:\Users\<u>\.claude
... [+30814 chars truncated]

### User | 2026-05-30T04:03:48.325Z

[tool_result] 120-If you need a number, **read the file**. Do not rely on counts baked into this document — they rot within days.
121-
122:## PER-FILE SCRUTINY GATE (multi-file builds — every file, before the next)
123-[Omitted long context line]
124-
--
144-The end-of-task 3-of-3 gate below still runs at Stop — this per-file gate just prevents compound errors from ever reaching it.
145-
146:## SCRUTINY GATE (U
... [+1969 chars truncated]

### Assistant | 2026-05-30T04:04:31.086Z

Perfect. I have all the data I need. Let me compile the comprehensive pattern report.

## COMPREHENSIVE OPERATIONAL DISCIPLINE RULE MAPPING

You're adding **"close your tool calls / background tasks when done — never leave orphaned background processes at session Stop"** to PRISM's fleet hygiene doctrine. Here's the exact pattern architecture:

---

### 1. CLAUDE.md RULES STRUCTURE (R5–R13)

**File locations:**
- **Global canonical home:** `C:/Users/wompu/.claude/CLAUDE.md` (lines 40–52)
- **Project override home:** `H:/prism/CLAUDE.md` (exists, lines 211+, but duplicates will collapse per line 8)

**Exact format of a rule entry (R5–R13 section, line 40-52):**

```
- **RN — Title.** Body paragraph (1–2 sentences max) → PRISM: [[memory_pointer]] / `dispatcher:action` / script path.
```

**Example (R13, actual):**
```
- **R13 — Comprehensive route, in logical order (FLEET-WIDE, all slots/galaxies).** At every build crossroads take the MOST comprehensive route — never the shortcut, stub, partial, or "good enough"; the thorough option is the *default*, a lesser one needs explicit operator scope-down (`[SCOPED]`). And sequence multi-unit work in LOGICAL (dependency) order: build the verifiable core before the integration/inline, each unit on a *proven* foundation, never a consumer atop an unproven dependency. → PRISM: [[feedback_build_comprehensive_route]] + [[feedback_build_in_logical_order]]; pairs with `comprehensive-build-enforce` hook + R12.
```

**Where R14 would go:**
- **Line 52** (after R13, before the `---` separator on line 53)
- Keep the section ≤20 lines total (per the note on line 42: "past ~200 lines total, CLAUDE.md compliance collapses")

**Section discipline note (line 42):**
> "Keep this section ≤20 lines: past ~200 lines total, CLAUDE.md compliance collapses (the article's own finding)."

**Right home for "close background tasks":**
- **NOT `C:/Users/wompu/.claude/CLAUDE.md`** — that's global/personal defaults
- **YES: `H:/prism/CLAUDE.md`** — this is
... [+9471 chars truncated]
