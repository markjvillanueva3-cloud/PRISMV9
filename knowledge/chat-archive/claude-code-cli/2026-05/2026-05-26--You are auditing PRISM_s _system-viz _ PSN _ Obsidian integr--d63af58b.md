---
type: "chat-session"
source: "claude-code-cli"
session_id: "d63af58b-aaae-45fd-bf3d-c0a2aec5aca0"
title: "You are auditing PRISM's /system-viz + PSN + Obsidian integration + wiki/memory "
date: "2026-05-26"
first_ts: "2026-05-26T15:35:57.230Z"
last_ts: "2026-05-26T15:58:12.035Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 21
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-a98b9c2c8af5fda52.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# You are auditing PRISM's /system-viz + PSN + Obsidian integration + wiki/memory 

> **claude-code-cli** | 2026-05-26 | 47 msgs (21 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-a98b9c2c8af5fda52.jsonl`

## Transcript

### User | 2026-05-26T15:35:57.230Z

You are auditing PRISM's /system-viz + PSN + Obsidian integration + wiki/memory generation+injection substrate for slot india. Output a TIGHT findings report to disk + return a ≤200-word summary.

## Scope

Per CLAUDE.md §MASTER INDEX + AWARENESS STACK, §WIKI PROTOCOL, §SESSION CONTINUITY STACK, §Doc reflection rule, §PSN-11-legs.

**/system-viz:**
- `scripts/regen-viz.mjs` (regen pipeline)
- `scripts/lib/merge-augmentations.mjs` (ghost roost splices)
- `state/shared/system-viz/system-graph.json` (the live graph — stat size + age)
- 21 roost overlays, 10-layer 3D layout
- Regen FAST[] generators (per CLAUDE.md — priority-queue, misc-tasks, bridge-synergy, viz-streaming, etc.)
- Regen FAILED status injection (SessionStart banner says "system-viz regen FAILED 2.2h ago")

**PSN (11 legs):**
- Obsidian brain · PRISM OS · Wiki · Memories · Tribal · System Viz · Engines · Algorithms · Formulas · NN/GNN · PRISM AI
- `feedback_psn_definition.md` canonical taxonomy
- `psn-leg-state-inject.mjs` (UserPromptSubmit T2 health)
- PSN-savings aggregator

**Obsidian integration:**
- `stop-obsidian-memory-feed.mjs` (Stop hook auto-feed)
- `H:/.claude/projects/H--prism/memory/*.md` → `H:/knowledge/memories/<type>/`
- C: → H: mirror (`c-to-h-mirror.mjs`)
- Vault: `H:/knowledge/memories/`

**Wiki gen + injection:**
- `knowledge/wiki/` (24,795 .md files per SessionStart)
- `wiki/index.md` (722-entry catalog)
- `WikiIndexMaintainerEngine`
- Wiki link audit: 4,136 broken / 97,673 tokens (4.2%) per SessionStart banner
- 23,802 / 23,992 wiki files lack tribal embedding (per banner)

**Memory gen + injection:**
- `MEMORY.md` index (~24KB ceiling)
- `memory-relevance-inject.mjs`, `tribal-by-domain-inject.mjs`, `master-index-precheck-inject.mjs`
- 495 memory files (per AWARENESS-SNAPSHOT)

## Goal — 7 concrete answers

1. /system-viz regen — read `state/shared/system-viz/regen-status.json` if it exists. Why is regen FAILED 2.2h ago? Last success age?
2. PSN leg-state — read `state/shared/psn/le
... [+1776 chars truncated]

### Assistant | 2026-05-26T15:36:16.631Z

I'll audit the PRISM /system-viz + PSN + Obsidian + wiki/memory substrate systematically.

### Assistant | 2026-05-26T15:36:18.743Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:36:19.124Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:36:20.225Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:36:20.845Z

[tool_use: Bash]

### User | 2026-05-26T15:41:27.559Z

[tool_result] cad-action-nodes.jsonl  86.5K

### User | 2026-05-26T15:41:27.657Z

[tool_result] 01-ai-nn-gnn.md  9.1K
02-lora-substrate.md  13.1K
03-rag-cag-embeddings.md  9.5K
04-deep-learn-deep-reason.md  13.6K

### User | 2026-05-26T15:41:28.059Z

[tool_result] -rw-r--r-- 1 wompu 197611      1122 May 21 16:18 H:/prism/state/shared/.goal-synergy-status.json
-rw-r--r-- 1 wompu 197611    695863 May 20 21:10 H:/prism/state/shared/.knowledge-link-audit.json
-rw-r--r-- 1 wompu 197611 568858317 May 26 00:08 H:/prism/state/shared/system-viz/system-graph.json
/usr/bin/ls: cannot access 'H:/prism/state/shared/system-viz/regen-status.json': No such file or director
... [+98 chars truncated]

### User | 2026-05-26T15:41:29.408Z

[tool_result] agent-findings/
agent-findings-v2/
agent-slices/
agent-slices-v2/
augmentations/
mcp-server/
staging/
.graph-backstop-spawn.json  112B
.last-regen-failure.json  732B
.last-successful-regen.json  237B
.newly-built-fold-debt.json  85B
.node-memory-pointers-cache.json  269B
.regen-viz-full.err  0B
.regen-viz-full.log  9.3K
.test-wiki-mtimes.json  1.1M
.tmp.system-graph.json.26988.1779260898504  405.0
... [+375 chars truncated]

### Assistant | 2026-05-26T15:41:33.608Z

I'll note the graph context and proceed efficiently. Key findings already: `regen-status.json` doesn't exist, but `.last-regen-failure.json` + `.last-successful-regen.json` do; PSN `leg-state.json` doesn't exist either (silent doctrine).

### Assistant | 2026-05-26T15:41:35.187Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:41:36.325Z

[tool_use: Read]

### Assistant | 2026-05-26T15:41:36.621Z

[tool_use: Read]

### Assistant | 2026-05-26T15:41:36.811Z

[tool_use: Read]

### User | 2026-05-26T15:41:47.557Z

[tool_result] 1	{
2	  "schemaVersion": "1.1.0",
3	  "generatedAt": "2026-05-21T21:18:10.724Z",
4	  "substrates": {
5	    "linkAudit": {
6	      "present": true,
7	      "generatedAt": "2026-05-21T02:10:19.782Z",
8	      "stats": {
9	        "linksTotal": 97673,
10	        "linksBroken": 4136,
11	        "filesScanned": 24795,
12	        "brokenRatio": 0.0423
13	      },
14	      "summary": "4,136 broken / 97,67
... [+848 chars truncated]

### User | 2026-05-26T15:41:47.647Z

[tool_result] 1	{
2	  "ts": "2026-05-23T22:00:30.273Z",
3	  "ok": true,
4	  "host": "DESKTOP-N7MI1VB",
5	  "pid": 57012,
6	  "graphMtime": "2026-05-23T21:59:22.116Z",
7	  "graphBytes": 519458359,
8	  "durationMs": 456626,
9	  "pendingCount": 1292,
10	  "sidecarOk": true
11	}

### User | 2026-05-26T15:41:48.008Z

[tool_result] 1	{
2	  "ts": "2026-05-26T15:19:12.041Z",
3	  "ok": false,
4	  "host": "DESKTOP-N7MI1VB",
5	  "pid": 120752,
6	  "durationMs": 473493,
7	  "stage": "merge augmentations",
8	  "exitCode": 134,
9	  "signal": null,
10	  "stderrTail": " 4: 00007FF6CE2DFB86 v8::Function::Experimental_IsNopFunction+2918\r\n 5: 00007FF6CE12B830 v8::internal::StrongRootAllocatorBase::StrongRootAllocatorBase+31552\r\n 6: 0
... [+356 chars truncated]

### User | 2026-05-26T15:44:20.603Z

[tool_result] H:/prism/state/shared/system-viz/.last-regen-failure.json 732 bytes mtime=2026-05-26 10:19:12.420654200 -0500
H:/prism/state/shared/system-viz/.last-successful-regen.json 237 bytes mtime=2026-05-23 17:00:30.809558700 -0500
H:/prism/state/shared/system-viz/system-graph.json 568858317 bytes mtime=2026-05-26 00:08:57.521627300 -0500

### Assistant | 2026-05-26T15:44:24.364Z

Noting nudges (not teaching manual workflow — auditing extant artifacts). Continuing data gathering.

### Assistant | 2026-05-26T15:44:26.133Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:44:28.160Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:44:29.661Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:44:31.066Z

[tool_use: Bash]

### User | 2026-05-26T15:47:21.889Z

[tool_result] H:/prism/knowledge/wiki/index.md 210734 bytes mtime=2026-05-25 22:16:10.063921400 -0500
stat: cannot stat 'H:/prism/.claude/projects/H--prism/memory/MEMORY.md': No such file or directory
C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md 24378 bytes mtime=2026-05-26 09:33:29.552933100 -0500
_index/
_legacy-root/
feedback/
inbox/
mistakes/
patterns/
project/
reference/
scrutiny/
uncategorize
... [+2 chars truncated]

### User | 2026-05-26T15:47:21.960Z

[tool_result] 20693
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-21T02:10:19.782Z",
  "wikiDir": "knowledge/wiki",
  "memDir": "knowledge/memories",
  "broken": [
    {
      "from": "knowledge/memories/_index/MEMORY.md",
      "link": "audit-viz-first-skill",
      "normalized": "audit-viz-first-skill"
    },
    {
      "from": "knowledge/memories/_index/MEMORY.md",
      "link": "OCTOPUS-NEURAL-MS
... [+1605 chars truncated]

### User | 2026-05-26T15:47:54.401Z

[tool_result] /usr/bin/ls: cannot access 'H:/prism/state/shared/obsidian-feed-*.jsonl': No such file or directory
/usr/bin/ls: cannot access 'H:/prism/state/shared/obsidian-feed.jsonl': No such file or directory
INTEL-OLLAMA-OBSIDIAN-MS1-RESUME.md  9.8K
OBSIDIAN-COMPOUND-MS0-STATUS.md  5.5K
obsidian-memory-sync-hook.log  50.9K
obsidian-memory-sync.log  0B

### User | 2026-05-26T15:51:14.070Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-26T15:51:16.884Z

Acknowledged. Continuing gathering.

### Assistant | 2026-05-26T15:51:18.139Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:51:19.411Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:51:20.105Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:51:21.635Z

[tool_use: Bash]

### User | 2026-05-26T15:52:11.952Z

[tool_result] #!/usr/bin/env node
// tier: T4
/**
 * stop-obsidian-memory-feed.mjs — Stop Hook
 * =========================================
 *
 * Dedicated, RELIABLE auto-memory -> Obsidian feed.
 *
 * Spawns `obsidian-memory-sync.mjs --quiet` detached on Stop so every memory
 * file written to C:/Users/<u>/.claude/projects/H--prism/memory/*.md gets
 * mirrored into the H: Obsidian vault (knowledge/memories/<ty
... [+1078 chars truncated]

### User | 2026-05-26T15:52:12.288Z

[tool_result] [2026-05-06T00:58:46.692Z] spawned pid=4344 node=H:\Tools\nodejs\node.exe script=H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs
[2026-05-06T00:59:08.171Z] spawned pid=30272 node=H:\Tools\nodejs\node.exe script=H:/prism-iooms0/mcp-server/scripts/obsidian-memory-sync.mjs
[2026-05-06T00:59:08.436Z] spawned pid=32212 node=H:\Tools\nodejs\node.exe script=H:/prism-iooms0/mcp-server/scripts/
... [+6691 chars truncated]

### User | 2026-05-26T15:52:17.067Z

[tool_result] #!/usr/bin/env node
// tier: T3 (advisory)
/**
 * psn-leg-state-inject.mjs — UserPromptSubmit injector
 *
 * Companion to psn-prompt-checklist-inject.mjs (U-PSN-PROMPT-CHECKLIST-INJECT).
 * The CHECKLIST hook tells the model "consult the substrate"; this hook IS
 * one of the substrates it should consult — a compact per-PSN-leg health
 * digest that surfaces ONLY legs in a concerning state. Silent
... [+1686 chars truncated]

### User | 2026-05-26T15:56:36.271Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-26T15:56:44.835Z

Acknowledged. Continuing.

### Assistant | 2026-05-26T15:56:47.977Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:56:49.138Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:56:51.344Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:56:52.456Z

[tool_use: Bash]

### User | 2026-05-26T15:57:57.316Z

[tool_result] #!/usr/bin/env node
/**
 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
 *
 * Use cases:
 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
 *     wiring-overlay emits fresh phantom edges.
 *   - After 
... [+1266 chars truncated]

### User | 2026-05-26T15:58:09.813Z

[tool_result] 1239
---
title: PRISM Wiki Index
category: meta
last_verified: 2026-05-08
author: hybrid
[1408 more lines]

### User | 2026-05-26T15:58:10.078Z

[tool_result] H:/prism/scripts/memory-compress-v2.mjs 8934 mtime=2026-05-19 22:12:07.263329900 -0500
H:/prism/scripts/audit-memory-dbs.mjs  4.2K
H:/prism/scripts/backfill-memory-aliases.mjs  12.8K
H:/prism/scripts/backfill-memory-aliases.test.mjs  9.7K
H:/prism/scripts/backfill-memory-provenance.mjs  15.2K
H:/prism/scripts/build-memory-index-sidecar.mjs  5.9K
H:/prism/scripts/build-memory-index-sidecar.test.mjs
... [+433 chars truncated]

### User | 2026-05-26T15:58:10.122Z

[tool_result] H:/prism/knowledge/memories/_index/MEMORY.md 62068 mtime=2026-05-25 19:32:21.407874600 -0500
MEMORY.md  60.6K
110
9281

### Assistant | 2026-05-26T15:58:12.035Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
