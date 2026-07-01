---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"dormant-data\" galaxy CLAUDE.md to the LOCKED canoni"
date: "2026-06-13"
first_ts: "2026-06-13T21:51:22.259Z"
last_ts: "2026-06-13T21:54:36.811Z"
cwd: "H:\\PRISM"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a9fdd6f99321f03d3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "dormant-data" galaxy CLAUDE.md to the LOCKED canoni

> **claude-code-cli** | 2026-06-13 | 22 msgs (9 user / 13 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a9fdd6f99321f03d3.jsonl`

## Transcript

### User | 2026-06-13T21:51:22.259Z

You are rewriting the PRISM "dormant-data" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/dormant-data.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/dormant-data/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/dormant-data/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block pr
... [+426 chars truncated]

### Assistant | 2026-06-13T21:51:25.119Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:51:25.462Z

[tool_use: Read]

### Assistant | 2026-06-13T21:51:25.811Z

[tool_use: Read]

### Assistant | 2026-06-13T21:51:25.975Z

[tool_use: Read]

### User | 2026-06-13T21:51:46.740Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:51:46.776Z

[tool_result] 1	# Dormant-Data Galaxy (VICTOR slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> VICTOR - DORMANT DATA EXCAVATION (find untrained/unused/unwired knowledge; STRICT ORDER: 1) H:\PRISM\extracted\ exhaustively, 2) H:\PRISM\extracted_modules\ exhaustively, 3) rest of H:\PRISM codebase folder-by-folder, file-by-file)
5	
6	## What lives here
7	
8	Victor is the **knowledge-recovery infrastr
... [+11707 chars truncated]

### User | 2026-06-13T21:51:46.827Z

[tool_result] 1	## dormant-data — slot:victor
2	
3	### Current state
4	
5	**Size:** ~130 lines / ~6.5 KB  
6	**Quality grade:** GOOD
7	
8	The current CLAUDE.md is one of the stronger galaxy files in the fleet. It was hand-authored by slot:alpha at galaxy birth (2026-05-28), contains real operational doctrine, and has been enriched by subsequent cross-cutting passes (galaxy-enrichment-program, AI-systems-state s
... [+12413 chars truncated]

### Assistant | 2026-06-13T21:51:50.776Z

Now I have all three files. Let me verify the key symbols before writing — check the orphan-inventory script name and the dispatcher actions.

### Assistant | 2026-06-13T21:51:51.576Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:51:52.272Z

[tool_use: Glob]

### User | 2026-06-13T21:52:10.314Z

[tool_result] No files found

### User | 2026-06-13T21:52:18.364Z

[tool_result] H:/prism/scripts/orphan-inventory.mjs
EXISTS

### Assistant | 2026-06-13T21:52:21.311Z

Good — no local `.ts` engines in dormant-data (pure orchestration galaxy). Now verify the dispatcher actions quickly.

### Assistant | 2026-06-13T21:52:22.508Z

[tool_use: Grep]

### Assistant | 2026-06-13T21:52:23.247Z

[tool_use: Bash]

### User | 2026-06-13T21:52:35.119Z

[tool_result] mcp-server\src\tools\dispatchers\devDispatcher.ts:36:[Omitted long matching line]
mcp-server\src\tools\dispatchers\devDispatcher.ts:2088:          case "resource_census": {
mcp-server\src\tools\dispatchers\devDispatcher.ts:2097:          case "resource_census_read": {
mcp-server\src\tools\dispatchers\devDispatcher.ts:2100:            result = cached ?? { error: "No census report found. Run resourc
... [+261 chars truncated]

### User | 2026-06-13T21:52:48.962Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
cam.md
database-expansion.md
fleet-hygiene.md
hermes-zulu.md
mill.md
post-processor.md
quoting.md
speed-feed.md
token-optimization.md
DIR_EXISTS
DIR_CREATED

### Assistant | 2026-06-13T21:52:51.511Z

All three dispatcher actions verified at the exact lines. No local `.ts` engines (pure orchestration galaxy). Now write the draft.

### Assistant | 2026-06-13T21:54:10.402Z

[tool_use: Write]

### User | 2026-06-13T21:54:32.297Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/dormant-data.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:54:36.811Z

galaxy=dormant-data | lines=155 | grade-was=GOOD | key-changes=dropped 3 boilerplate stanzas + fixed wrong script name (audit-orphan-inventory→orphan-inventory) + marked KnowledgeConversionPipelineEngine+xproc actions UNVERIFIED + added create-on-first-use ledger schema + compressed to template §0-§13 order
