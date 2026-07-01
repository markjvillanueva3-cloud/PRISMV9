---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"hermes-zulu\" galaxy CLAUDE.md to the LOCKED canonic"
date: "2026-06-13"
first_ts: "2026-06-13T21:41:06.804Z"
last_ts: "2026-06-13T21:49:13.609Z"
cwd: "H:\\PRISM"
messages: 31
user_msgs: 13
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a7b95aab92447082e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "hermes-zulu" galaxy CLAUDE.md to the LOCKED canonic

> **claude-code-cli** | 2026-06-13 | 31 msgs (13 user / 18 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a7b95aab92447082e.jsonl`

## Transcript

### User | 2026-06-13T21:41:06.804Z

You are rewriting the PRISM "hermes-zulu" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/hermes-zulu.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/hermes-zulu/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/hermes-zulu/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block prescr
... [+419 chars truncated]

### Assistant | 2026-06-13T21:41:12.251Z

I'll read all three source files in parallel, then grep the dispatcher source to verify symbols before writing.

### Assistant | 2026-06-13T21:41:12.669Z

[tool_use: Read]

### Assistant | 2026-06-13T21:41:13.185Z

[tool_use: Read]

### Assistant | 2026-06-13T21:41:13.380Z

[tool_use: Read]

### User | 2026-06-13T21:41:32.916Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:41:37.887Z

[tool_result] 1	# hermes-zulu — slot:bravo (+ zulu/zebra orchestrator)
2	
3	## Current state
4	
5	**Size:** ~119 lines, ~5.8KB  
6	**Quality grade:** GOOD
7	
8	The current CLAUDE.md is accurate and owner-maintained (bravo corrected stale mill/domain_filter drift on 2026-06-03). No fabricated engine names found — all 9 Hermes/Zulu engines cited in PATHS.md are verified on disk (`HermesParallelFanoutPlannerEngine
... [+13999 chars truncated]

### User | 2026-06-13T21:41:38.008Z

[tool_result] 1	# Hermes-Zulu Galaxy (BRAVO + ZULU slots)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> BRAVO - HERMES/ZULU BUILDING + STUB HUNTING
5	> ZULU - HERMES AGENT CHAT FLEET ORCHESTRATOR
6	
7	Bravo BUILDS hermes-zulu (engines, hooks, dispatchers, soul-files, dream cycle, self-reflect populater, stub-hunter audits). Zulu IS the live orchestrator running on top — cross-slot synthesis, fleet d
... [+10475 chars truncated]

### Assistant | 2026-06-13T21:41:40.908Z

Now let me verify the dispatcher actions and engine files before writing.

### Assistant | 2026-06-13T21:41:41.669Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:41:44.878Z

[tool_use: Grep]

### User | 2026-06-13T21:42:00.071Z

[tool_result] mcp-server\src\tools\dispatchers\contextDispatcher.ts:83:  "slot_brief_write",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:84:  "slot_brief_list",
mcp-server\src\tools\dispatchers\contextDispatcher.ts:1180:          case "slot_brief_write": {
mcp-server\src\tools\dispatchers\contextDispatcher.ts:1190:          case "slot_brief_list": {
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
... [+3252 chars truncated]

### User | 2026-06-13T21:42:16.659Z

[tool_result] No files found

### Assistant | 2026-06-13T21:42:20.035Z

Good — all dispatcher actions are verified. Now verify the engine files (no `.ts` in `engines/hermes-zulu/` per Glob) and check where they actually live:

### Assistant | 2026-06-13T21:42:20.911Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:42:21.264Z

[tool_use: Glob]

### User | 2026-06-13T21:43:26.425Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T21:43:26.425Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T21:43:32.585Z

[tool_use: Grep]

### Assistant | 2026-06-13T21:43:34.130Z

[tool_use: Bash]

### User | 2026-06-13T21:45:19.803Z

[tool_result] Found 33 files
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\schemas\aiReasoningActionSchemas.ts
mcp-server\src\__tests__\HermesParallelFanoutPlannerEngine.test.ts
mcp-server\src\engines\HermesParallelFanoutPlannerEngine.ts
mcp-server\src\__tests__\contextDispatcher.slot-brief.test.ts
mcp-server\src\engines\SlotBriefE
... [+1506 chars truncated]

### User | 2026-06-13T21:45:49.669Z

[tool_result] AWARENESS.md
CLAUDE.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### Assistant | 2026-06-13T21:45:55.233Z

All engines verified — they live in `mcp-server/src/engines/` (flat, not in a `hermes-zulu/` subdir). The hermes-zulu galaxy dir has only doc files. Now I have everything needed. Let me also verify the stub-hunter scripts and the open-tasks ledger path:

### Assistant | 2026-06-13T21:46:00.386Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:46:00.459Z

[tool_use: Bash]

### User | 2026-06-13T21:47:00.716Z

[tool_result] H:/prism/scripts/audit-unwired-engines.mjs
H:/prism/scripts/reconcile-zulu-ledger.mjs
H:/prism/scripts/stub-sweep-full.mjs
H:/prism/state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md

### User | 2026-06-13T21:47:02.096Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-13T21:47:04.574Z

All scripts verified. The drafts dir exists (empty output = exists). Now write the rewritten CLAUDE.md:

### Assistant | 2026-06-13T21:48:36.229Z

[tool_use: Write]

### User | 2026-06-13T21:49:08.452Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/hermes-zulu.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:49:13.609Z

galaxy=hermes-zulu | lines=157 | grade-was=GOOD | key-changes=collapsed 4 boilerplate blocks into §0 pointer + added verified no-named-dispatcher callout + C2 action table (13 actions grep-confirmed in sessionDispatcher.ts/contextDispatcher.ts/memoryDispatcher.ts) + marked 3 xproc_* actions UNVERIFIED + fixed phantom RULES.md reference + dropped duplicate PSN block and cross-cutting methodology stanza
