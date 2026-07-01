---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"system-viz\" galaxy CLAUDE.md to the LOCKED canonica"
date: "2026-06-13"
first_ts: "2026-06-13T21:49:45.652Z"
last_ts: "2026-06-13T21:54:33.432Z"
cwd: "H:\\PRISM"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ae402c9b97d89a5c8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "system-viz" galaxy CLAUDE.md to the LOCKED canonica

> **claude-code-cli** | 2026-06-13 | 35 msgs (14 user / 21 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ae402c9b97d89a5c8.jsonl`

## Transcript

### User | 2026-06-13T21:49:45.652Z

You are rewriting the PRISM "system-viz" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/system-viz.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/system-viz/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/system-viz/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block prescribes
... [+412 chars truncated]

### Assistant | 2026-06-13T21:49:48.687Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:49:48.746Z

[tool_use: Read]

### User | 2026-06-13T21:49:52.093Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T21:49:56.099Z

Now reading the assessment and current file in parallel.

### Assistant | 2026-06-13T21:49:56.549Z

[tool_use: Read]

### Assistant | 2026-06-13T21:49:57.089Z

[tool_use: Read]

### User | 2026-06-13T21:50:03.394Z

[tool_result] 1	# system-viz — slot:sierra
2	
3	## Current state
4	
5	**File:** `H:/prism/mcp-server/src/engines/system-viz/CLAUDE.md`
6	**Size:** ~7,800 bytes / 130 lines
7	**Quality grade: GOOD**
8	
9	The file is substantively correct and domain-specific. It was scaffolded by alpha then completed + corrected by sierra (2026-05-29). Key facts are verified on disk. The structure is solid: anti-patterns, operati
... [+15809 chars truncated]

### User | 2026-06-13T21:50:04.031Z

[tool_result] 1	# System-Viz Galaxy (slot: SIERRA)
2	
3	Operational scope per `H:/prism/state/shared/CHAT-SLOT-DOMAINS.md`:
4	> SIERRA — System-viz upgrades, integration & utilization.
5	
6	System-viz is PRISM's **3D visual map + canonical query/search surface AND its task/roadmap tracking surface**. The merged graph at `state/shared/system-viz/system-graph.json` (370-575 MB, ~244K nodes) renders every remainin
... [+16099 chars truncated]

### Assistant | 2026-06-13T21:50:08.588Z

Now I have all three sources. Let me verify key symbols before writing — confirm engine files exist and dispatcher actions are real.

### Assistant | 2026-06-13T21:50:09.358Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:50:09.750Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:50:10.538Z

[tool_use: Glob]

### User | 2026-06-13T21:50:25.070Z

[tool_result] No files found

### User | 2026-06-13T21:50:27.001Z

[tool_result] No files found

### User | 2026-06-13T21:50:27.025Z

[tool_result] No files found

### Assistant | 2026-06-13T21:50:32.475Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:50:34.123Z

[tool_use: Bash]

### User | 2026-06-13T21:50:42.441Z

[tool_result] AWARENESS.md
CLAUDE.md
GSD.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md
H:/prism/scripts/merge-augmentations.mjs
H:/prism/scripts/regen-viz.mjs
H:/prism/scripts/system-viz-query.mjs
H:/prism/mcp-server/src/engines/GraphImportanceEngine.ts
H:/prism/mcp-server/src/engines/GraphTheoryEngine.ts
H:/prism/mcp-server/src/engines/MasterIndexEngine.ts
H:/prism/mcp-server/src/engines/VizAutoAugmentationEngine.
... [+2 chars truncated]

### User | 2026-06-13T21:50:48.155Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:89:  "obsidian_viz_regenerate", "obsidian_viz_status", "obsidian_viz_recall_top",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:1660:          case "obsidian_viz_regenerate": {
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:1692:          case "obsidian_viz_status": {
H:/prism/mcp-server/src/tools
... [+936 chars truncated]

### Assistant | 2026-06-13T21:50:50.897Z

Good — all symbols verified. Now checking a few more paths from the ADD section before writing.

### Assistant | 2026-06-13T21:50:55.135Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:50:57.825Z

[tool_use: Bash]

### User | 2026-06-13T21:51:08.654Z

[tool_result] Exit code 2
H:/prism/scripts/generate-system-viz.mjs
H:/prism/scripts/lib/graph-node-embedding-bridge.mjs
H:/prism/scripts/lib/regen-viz-merge-guard.mjs
H:/prism/scripts/lib/system-graph-write-lock.mjs
H:/prism/scripts/lib/system-viz-graph.mjs
H:/prism/scripts/seed-ghost-from-unwired.mjs

### User | 2026-06-13T21:51:21.704Z

[tool_result] 173:  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats",
344:          case "tribal_capture": {
H:/prism/.claude/hooks/audit-viz-first-inject.mjs
H:/prism/.claude/hooks/pre-bash-graph-inject.mjs
H:/prism/.claude/hooks/pre-grep-graph-inject.mjs
H:/prism/.claude/hooks/pre-read-graph-inject.mjs
H:/prism/.claude/hooks/pre-write-graph-inject.mjs
H:/prism/.claude/hooks/sessionstart-gra
... [+80 chars truncated]

### Assistant | 2026-06-13T21:51:26.528Z

Good. Key findings from verification:
- `node-card-offsets.json` and `RankedHybridGraphSearchEngine.ts` / `HybridIndexEngine.ts` — NOT found (exit 2 means those specific ls targets failed)
- `system-viz-graph.mjs`, `regen-viz-merge-guard.mjs`, `system-graph-write-lock.mjs`, `graph-node-embedding-bridge.mjs`, `generate-system-viz.mjs`, `seed-ghost-from-unwired.mjs` — VERIFIED
- All 7 dispatcher actions — VERIFIED
- `tribal_capture` — VERIFIED in knowledgeDispatcher.ts:344
- All 7 hooks — VERIFIED
- `.last-successful-regen.json` — not found (path may differ)

### Assistant | 2026-06-13T21:51:29.718Z

[tool_use: Bash]

### User | 2026-06-13T21:52:04.113Z

[tool_result] H:/prism/mcp-server/src/engines/HybridIndexEngine.ts
H:/prism/mcp-server/src/engines/RankedHybridGraphSearchEngine.ts
H:/prism/state/shared/system-viz/.cross-substrate-edge-baseline.json
H:/prism/state/shared/system-viz/.graph-backstop-spawn.json
H:/prism/state/shared/system-viz/.last-index-build.json
H:/prism/state/shared/system-viz/.last-regen-failure.json
H:/prism/state/shared/system-viz/.last-
... [+2407 chars truncated]

### Assistant | 2026-06-13T21:52:09.092Z

All symbols verified. Now I have everything I need:

- `HybridIndexEngine.ts` + `RankedHybridGraphSearchEngine.ts` — VERIFIED
- `.last-successful-regen.json` at `state/shared/system-viz/` — VERIFIED  
- `node-card` subcommand — VERIFIED in system-viz-query.mjs:106
- `build-order` subcommand — VERIFIED in error string line 38
- node-cards.jsonl / node-card-offsets.json — NOT found (gitignored, as noted in CLAUDE.md — mark appropriately)

Now writing the draft.

### Assistant | 2026-06-13T21:52:09.912Z

[tool_use: Bash]

### User | 2026-06-13T21:52:28.249Z

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

### Assistant | 2026-06-13T21:52:30.407Z

Good — drafts dir exists. Writing the rewritten file now.

### Assistant | 2026-06-13T21:54:04.819Z

[tool_use: Write]

### User | 2026-06-13T21:54:28.846Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/system-viz.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:54:33.432Z

galaxy=system-viz | lines=155 | grade-was=GOOD | key-changes=dropped 4 boilerplate blocks (~35 lines), added verified subcommand table + three-graph consumer map + node-card cheap-read + regression class table + dual-reg verify ritual, marked xproc_* UNVERIFIED, fixed 548MB→370-575MB drift
