---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Write ONE hook file that adds runtime orchestration advisories for Hermes/Zebra "
date: "2026-05-25"
first_ts: "2026-05-25T01:46:58.216Z"
last_ts: "2026-05-25T01:59:55.504Z"
cwd: "H:\\prism"
messages: 41
user_msgs: 16
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a98cb4708d7498b19.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Write ONE hook file that adds runtime orchestration advisories for Hermes/Zebra 

> **claude-code-cli** | 2026-05-25 | 41 msgs (16 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a98cb4708d7498b19.jsonl`

## Transcript

### User | 2026-05-25T01:46:58.216Z

Write ONE hook file that adds runtime orchestration advisories for Hermes/Zebra (the slot personality + orchestration layer). The audit found Hermes lives only in 22 wiki entries with no runtime hook — sister to the existing `zebra-advisory-inject.mjs` hook.

STEP 1 — Read the existing sibling hooks (read-only, ≤4 tool calls):
1. Read `H:/prism/.claude/hooks/zebra-advisory-inject.mjs` to understand the pattern.
2. Read `H:/prism/.claude/hooks/slot-soul-inject.mjs` (if it exists) to understand how slot souls get surfaced.
3. Grep for "hermes" in `H:/prism/knowledge/wiki/architecture/` to find what Hermes is supposed to do.
4. Read the top hit (e.g. a wiki entry on Hermes orchestration) to understand the intent.

STEP 2 — Write ONE file:

**File**: `H:/prism-slot-golf/.claude/hooks/hermes-orchestration-advisory-inject.mjs`

A UserPromptSubmit hook that injects orchestration guidance when the prompt contains keywords like "orchestrate", "coordinate", "synergize", "agent batch", "parallel", "delegate", "pipeline", "swarm".

Pattern (mimic zebra-advisory-inject.mjs structure):

```javascript
#!/usr/bin/env node
/**
 * hermes-orchestration-advisory-inject.mjs
 *
 * Sister hook to zebra-advisory-inject.mjs. Surfaces Hermes orchestration
 * guidance on UserPromptSubmit when the prompt contains orchestration/
 * coordination keywords. Hermes is the slot-personality + orchestration
 * layer (see knowledge/wiki/architecture/hermes-*.md). Until this hook,
 * Hermes was wiki-only with no runtime surface — operators had to remember
 * the patterns. Now the patterns auto-inject when relevant.
 *
 * Closes the Hermes/Zebra runtime-hook gap surfaced by the 2026-05-24 golf
 * cross-board synergy audit.
 *
 * Knob: PRISM_HERMES_ADVISORY_INJECT_DISABLE=1
 *
 * Karpathy R12 fail-loud: hook fails closed (no inject) on any read/parse
 * error rather than blocking the prompt.
 */

import { readFileSync } from "node:fs";

const DISABLE = process.env.PRISM_HERMES_ADVISORY_INJECT_DISABLE === 
... [+3393 chars truncated]

### Assistant | 2026-05-25T01:47:16.758Z

I'll read the sibling hooks and Hermes wiki entries first, then write the hook file.

### Assistant | 2026-05-25T01:47:17.171Z

[tool_use: Read]

### Assistant | 2026-05-25T01:47:17.432Z

[tool_use: Glob]

### User | 2026-05-25T01:47:35.335Z

[tool_result] .claude\hooks\slot-soul-inject.mjs

### User | 2026-05-25T01:47:36.054Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA06 — advisory inject hook.
4	//
5	// UserPromptSubmit hook. Reads THIS chat's transcript via CHO02
6	// readChatPressure, calls CHO01 decideClearOrCompact, emits an
7	// additionalContext advisory line when the decision is non-noop.
8	//
9	// This is the ADVISORY surface — distinct from the token-awareness-inject
10	// hook (
... [+5931 chars truncated]

### Assistant | 2026-05-25T01:47:41.876Z

[tool_use: Grep]

### User | 2026-05-25T01:47:53.828Z

[tool_result] Found 10 files limit: 10
knowledge\wiki\architecture\engines\psn-synergy-inspector-engine.md
knowledge\wiki\architecture\_orphans-rescue.md
knowledge\wiki\architecture\specs\spec-hermes-psn-rag-synergy-research-2026-05-23.md
knowledge\wiki\architecture\specs\spec-hermes-octopus-coordination-research-2026-05-23.md
knowledge\wiki\architecture\specs\spec-zebra-omniscient-ms0-plan.md
knowledge\wiki\ar
... [+366 chars truncated]

### Assistant | 2026-05-25T01:47:56.737Z

[tool_use: Read]

### User | 2026-05-25T01:48:02.894Z

[tool_result] 1	---
2	title: Design spec — **Slot:** november/foxtrot (claude-5852a0b9)
3	type: architecture
4	node_id: ghost.spec.hermes-adoption-pattern-matrix-2026-05-20
5	parent_layer: L8
6	kind: design-spec
7	spec_file: state/shared/specs/HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20.md
8	status: ghost
9	generated_by: scripts/generate-misc-l8-wiki.mjs
10	last_verified: 2026-05-22
11	tags: [architecture, system
... [+1917 chars truncated]

### Assistant | 2026-05-25T01:48:06.407Z

Now I have enough context. Let me read the hermes-zebra-integration wiki entry to understand the intent, then write the hook.

### Assistant | 2026-05-25T01:48:07.018Z

[tool_use: Grep]

### User | 2026-05-25T01:48:28.600Z

[tool_result] Found 5 files limit: 5
knowledge\wiki\architecture\specs\spec-zebra-omniscient-ms0-plan.md
knowledge\wiki\architecture\specs\spec-zebra-hermes-gap-audit-2026-05-20.md
knowledge\wiki\architecture\specs\spec-hermes-obsidian-os-research-2026-05-20.md
knowledge\wiki\architecture\specs\spec-zebra-orchestrator-design.md
knowledge\wiki\architecture\specs\spec-hermes-adoption-pattern-matrix-2026-05-20.md

### Assistant | 2026-05-25T01:48:32.184Z

The graph hit confirms the key context: "HERMES-MS0 — Zebra as the designated Hermes orchestrator." I have enough to write the hook. Let me check the target directory exists first, then write the file.

### Assistant | 2026-05-25T01:48:32.932Z

[tool_use: Bash]

### User | 2026-05-25T01:50:04.797Z

[tool_result] Exit code 255

### Assistant | 2026-05-25T01:50:07.654Z

The slot-golf worktree doesn't exist yet. Let me check for the worktree and find the right path.

### Assistant | 2026-05-25T01:50:08.245Z

[tool_use: Bash]

### User | 2026-05-25T01:52:44.927Z

[tool_result] H:/PRISM d0b2621bec [cad-fusion-live-ms0]
H:/PRISM/.claude/worktrees/agent-a01e7b81d0946a97b 4bdfcc902e [worktree-agent-a01e7b81d0946a97b]
H:/PRISM/.claude/worktrees/agent-a0310b5d699214970 4bdfcc902e [worktree-agent-a0310b5d699214970]
H:/PRISM/.claude/worktrees/agent-a149a784779f1da9f 4bdfcc902e [worktree-agent-a149a784779f1da9f]
H:/PRISM/.claude/worktrees/agent-a37d7460d5d653f84 4bdfcc902e [work
... [+4545 chars truncated]

### Assistant | 2026-05-25T01:52:49.047Z

`H:/prism-slot-golf` exists at `slot/golf`. Now check whether a `.claude/hooks/` directory exists there.

### Assistant | 2026-05-25T01:52:49.997Z

[tool_use: Bash]

### User | 2026-05-25T01:53:57.338Z

[tool_result] Exit code 255

### Assistant | 2026-05-25T01:54:03.114Z

The golf worktree doesn't have a `.claude/hooks/` dir yet. The task says to write the file at `H:/prism-slot-golf/.claude/hooks/hermes-orchestration-advisory-inject.mjs`. I'll create the directory structure and write the file directly.

### Assistant | 2026-05-25T01:54:04.047Z

[tool_use: Bash]

### User | 2026-05-25T01:55:22.976Z

[tool_result] Exit code 255

### Assistant | 2026-05-25T01:55:26.012Z

[tool_use: Bash]

### User | 2026-05-25T01:57:02.483Z

[tool_result] Exit code 255

### Assistant | 2026-05-25T01:57:05.183Z

[tool_use: Bash]

### User | 2026-05-25T01:58:02.420Z

[tool_result] Exit code 255

### Assistant | 2026-05-25T01:58:07.676Z

The bash commands are all failing. Let me check what's actually in the golf worktree root directly.

### Assistant | 2026-05-25T01:58:08.056Z

[tool_use: Glob]

### User | 2026-05-25T01:58:16.602Z

[tool_result] No files found

### Assistant | 2026-05-25T01:58:19.809Z

The `.claude/hooks` directory doesn't exist in the golf worktree. The Write tool can create intermediate directories implicitly. Let me write the file directly — the Write tool will create the path.

### Assistant | 2026-05-25T01:58:48.170Z

[tool_use: Write]

### User | 2026-05-25T01:59:16.091Z

[tool_result] File created successfully at: H:/prism-slot-golf/.claude/hooks/hermes-orchestration-advisory-inject.mjs (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T01:59:19.603Z

File written. The pre-write guard flagged an existing `orchestrator-advisory-inject` node — let me check if that's a genuine duplicate before declaring done.

### Assistant | 2026-05-25T01:59:20.415Z

[tool_use: Grep]

### User | 2026-05-25T01:59:33.082Z

[tool_result] Found 2 files
.claude\hooks\__tests__\orchestrator-advisory-inject.test.mjs
.claude\hooks\orchestrator-advisory-inject.mjs

### Assistant | 2026-05-25T01:59:36.145Z

There is an existing `orchestrator-advisory-inject.mjs` in the main hooks directory. Let me read it to determine whether this is a genuine duplicate or a different surface.

### Assistant | 2026-05-25T01:59:36.146Z

[tool_use: Read]

### User | 2026-05-25T01:59:55.504Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * orchestrator-advisory-inject.mjs — UserPromptSubmit hook that injects
5	 * golf-orchestrator advisories into THIS chat's prompt context when the
6	 * orchestrator has a fresh per-slot directive targeted at this chat's slot.
7	 *
8	 * The advisory injection channel is the OPT-IN, FAIL-SOFT path for the
9	 * chat-orchestrator's REACHING actions. The UI 
... [+12423 chars truncated]
