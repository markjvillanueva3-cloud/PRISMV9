---
type: "chat-session"
source: "claude-code-cli"
session_id: "cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a"
title: "Independent review of the hardened `findStaleOrphanedNodes` in `H:/prism/scripts"
date: "2026-06-11"
first_ts: "2026-06-11T16:11:14.173Z"
last_ts: "2026-06-11T16:13:27.219Z"
cwd: "H:\\prism-slot-golf"
messages: 34
user_msgs: 15
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-aab797a68a4c4e3dc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Independent review of the hardened `findStaleOrphanedNodes` in `H:/prism/scripts

> **claude-code-cli** | 2026-06-11 | 34 msgs (15 user / 19 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/cc814d81-2f9e-43a6-bd7b-2f1da8a2ff1a/subagents/agent-aab797a68a4c4e3dc.jsonl`

## Transcript

### User | 2026-06-11T16:11:14.173Z

Independent review of the hardened `findStaleOrphanedNodes` in `H:/prism/scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs` (read the WHOLE file + `cd /h/prism && git diff` it). This is process-KILLING logic in a fleet reaper that was disabled after it killed legitimate work. Do not assume reviewer A caught everything.

Weight toward SAFETY + INTEGRATION (FAIL on any real risk):
1. **Over-protection soundness**: the protect regex is intentionally high-recall (patterns like `embed`, `corpus`, `pipeline`, `lora`, `fleet-`, `ollama`, `[\\/]prism[\\/]`). Is over-protection genuinely the safe direction here (vs. the hunter becoming a no-op)? Is there any pattern so broad it would protect a TRULY foreign memory-hog the operator needs reaped? Judge the tradeoff, don't just accept it.
2. **The actual incident class**: confirm the fix addresses DETACHED workers with DEAD parents (nohup/scheduled-task) — these have no claude ancestor and a dead parent, so ONLY the cmdline-allowlist saves them. If a legit detached worker's cmd somehow doesn't match the regex, it still dies. Are the worker-family patterns comprehensive enough (miners, sidecars, embedders, pipelines, vault, blueprint-ocr, reaper itself, watchdogs)?
3. **Wiring readiness**: the sweep (`scripts/fleet-reaper-sweep.mjs` ~line 2230) calls `findStaleOrphanedNodes(procs, livePidSet, now, {ageSec, rssMaxBytes, procByPid, protectedPids})` — it does NOT yet pass `protectCmdRegex`. Confirm the lib DEFAULTS to DEFAULT_PRISM_WORKER_PROTECT_REGEX so the fix is active even before the sweep is updated (i.e. the fix is not dead until wiring lands). Note whether the sweep SHOULD be updated to pass PRISM_REAPER_PROTECT_EXTRA through.
4. **No assertion/behavior weakening**: existing zombie-detection behavior for real foreign zombies must be intact.
5. **ASCII/encoding**: no smart quotes/em-dashes introduced into the code file (PS 5.1 decoding).

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: / P1: lines, then ≤5 
... [+23 chars truncated]

### Assistant | 2026-06-11T16:11:18.434Z

I'll read the full file and the git diff to perform this review.

### Assistant | 2026-06-11T16:11:19.410Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:11:19.936Z

[tool_use: Bash]

### User | 2026-06-11T16:11:23.566Z

[tool_result] (Bash completed with no output)

### User | 2026-06-11T16:11:29.067Z

[tool_result] 406 /h/prism/scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs

### Assistant | 2026-06-11T16:11:31.184Z

[tool_use: Read]

### User | 2026-06-11T16:11:31.922Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\fleet-reaper-mcp-zombie-hunter.mjs' was already read 20s ago in this session and is unchanged (mtime 1781194232070). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-11T16:11:34.675Z

[tool_use: Bash]

### User | 2026-06-11T16:11:38.125Z

[tool_result] /**
 * MCP-zombie hunter for fleet-reaper-sweep.mjs.
 * =============================================
 *
 * Catches the failure mode that 2026-05-23/slot-golf surfaced: 106 PRISM MCP
 * server processes (node.exe running `mcp-server/dist/index.js`), 46 of them
 * with a DEAD parent claude.exe — collectively holding 38.8 GB RSS. claude-code
 * does not reliably reap its spawned MCP server on parent
... [+17808 chars truncated]

### Assistant | 2026-06-11T16:11:40.814Z

Now let me check the sweep caller to verify the wiring question:

### Assistant | 2026-06-11T16:11:42.642Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:11:44.161Z

[tool_use: Bash]

### User | 2026-06-11T16:11:47.875Z

[tool_result] 164:import { findMcpZombies, findStaleOrphanedNodes } from "./lib/fleet-reaper-mcp-zombie-hunter.mjs";
653: * MCP bridge. PRISM_REAPER_PROTECT_EXTRA lets future long-runners register a
659:  const raw = process.env.PRISM_REAPER_PROTECT_EXTRA || "";
2230:      const cands = findStaleOrphanedNodes(procs, livePidSet, now, {

### User | 2026-06-11T16:11:49.324Z

[tool_result] 108:// findStaleOrphanedNodes — second-pass hunter (added 2026-05-26, slot:golf)
148:// Pure-core opts: protectCmdRegex, requireForeignCmd, claudeParentNames.
205:export const DEFAULT_PRISM_WORKER_PROTECT_REGEX =
222:  if (!extra) return DEFAULT_PRISM_WORKER_PROTECT_REGEX;
226:    return DEFAULT_PRISM_WORKER_PROTECT_REGEX; // bad extra -> keep default protection
236:  const re = regex instanceof R
... [+343 chars truncated]

### Assistant | 2026-06-11T16:11:51.887Z

Now get the exact call site in the sweep at line 2230 with surrounding context:

### Assistant | 2026-06-11T16:11:56.260Z

[tool_use: Read]

### Assistant | 2026-06-11T16:11:56.365Z

[tool_use: Read]

### User | 2026-06-11T16:11:57.660Z

[tool_result] 645	 * LONG-RUNNER-PROTECT (2026-06-10, slot:zulu, OBSIDIAN-2ND-BRAIN): the detached
646	 * overnight vault pipeline (overnight-vault-compound.mjs and the multi-hour
647	 * children it execFileSync's: mine-galaxy-transcripts, the memory index/embedding
648	 * sidecars, galaxy-synthesis-refresh) is launched via Start-Process so its parent
649	 * exits immediately -- to the orphan classifier it is i
... [+1554 chars truncated]

### User | 2026-06-11T16:11:57.828Z

[tool_result] 2220	  if (!isStatus && !disabled && !staleNodeDisabled) {
2221	    try {
2222	      const procs = snap.procs || [];
2223	      const livePidSet = new Set(procs.map((p) => p.pid));
2224	      const procByPid = new Map(procs.map((p) => [p.pid, p]));
2225	      const protectedPids = buildProtectedPidSet(procs, process.pid);
2226	      const ageSec = opts.staleNodeAgeSec
2227	        ?? envInt("PRISM
... [+1272 chars truncated]

### Assistant | 2026-06-11T16:12:01.163Z

I now have everything needed for the review. Let me also verify the ASCII encoding and the git diff context:

### Assistant | 2026-06-11T16:12:02.206Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:12:04.016Z

[tool_use: Bash]

### User | 2026-06-11T16:12:10.203Z

[tool_result] 0

### User | 2026-06-11T16:12:17.327Z

[tool_result] NON-ASCII CHARS: NONE

### Assistant | 2026-06-11T16:12:20.404Z

[tool_use: Bash]

### User | 2026-06-11T16:12:26.973Z

[tool_result] stash@{0}: WIP on cad-fusion-live-ms0: d52611a2f1 [MAIN] [OCTOPUS-CONSOLIDATE]/U-OCT-PROBE-FULL-FLEET (slot:mike): SessionStart banner now mirrors octopus-setup.mjs 5-voice CLI verdict
stash@{1}: WIP on cad-fusion-live-ms0: dab810d9c3 [MAIN] [GPU-OFFLOAD-MAXIMIZE-MS0]/U1 (slot:sierra): ship auto-mode + telemetry unification + safe-rollout defaults
stash@{2}: WIP on cad-fusion-live-ms0: 4fac984675 
... [+137 chars truncated]

### Assistant | 2026-06-11T16:12:34.854Z

[tool_use: Bash]

### User | 2026-06-11T16:12:43.032Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-11T16:12:45.791Z

[tool_use: Bash]

### Assistant | 2026-06-11T16:12:48.237Z

[tool_use: Bash]

### User | 2026-06-11T16:12:52.674Z

[tool_result] ?? scripts/lib/fleet-reaper-mcp-zombie-hunter.mjs

### User | 2026-06-11T16:12:57.234Z

[tool_result] 0

### Assistant | 2026-06-11T16:13:27.219Z

That last grep is the key finding. Now I have everything I need.

VERDICT: FAIL

---

BLOCKER: The sweep's `_MCP_PROTECT_REGEX` (lines 662-664 of `fleet-reaper-sweep.mjs`) contains four critical patterns that are ABSENT from `DEFAULT_PRISM_WORKER_PROTECT_REGEX` in the lib:

- `overnight-vault-compound`
- `mine-galaxy-transcripts`
- `build-memory-index-sidecar`
- `build-memory-embeddings-sidecar`
- `galaxy-synthesis-refresh`

These are the exact processes that were killed on 2026-06-10 (vault pipeline, pids 56680 and 18952, documented at sweep line 650-651). The lib's protect regex does NOT cover them by name. The pattern `galaxy-` in the lib would catch `mine-galaxy-transcripts` and `galaxy-synthesis-refresh`, and `vault-` would catch `overnight-vault-compound`. But `build-memory-index-sidecar` and `build-memory-embeddings-sidecar` match `build-memory` which IS covered by the lib pattern `build-memory`. So those two are safe. However the gap between the lib's patterns and the sweep's `_MCP_PROTECT_REGEX` is undocumented and the two lists are maintained independently with no structural enforcement of alignment. This is a maintenance trap: when the sweep adds a new named long-runner pattern to `_MCP_PROTECT_REGEX` (as it did for the vault pipeline), the lib's protection remains unaware unless the author also updates `PRISM_WORKER_PROTECT_PATTERNS`. The file is currently untracked (`??` in git status), meaning it has never been committed and the protect patterns have not been reviewed as a unit against the sweep's list.

BLOCKER: The sweep call at line 2230-2232 does NOT pass `protectCmdRegex`. The lib correctly defaults to `DEFAULT_PRISM_WORKER_PROTECT_REGEX` when `opts.protectCmdRegex` is absent (line 287-289), so the fix IS active without the sweep update. However the sweep also constructs `_MCP_PROTECT_REGEX` incorporating `PRISM_REAPER_PROTECT_EXTRA` (line 659-664) and never passes that combined regex into `findStaleOrphanedNodes`. This means `PRISM_REAPER_PROTECT
... [+2618 chars truncated]
