---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review TWO PRISM PreToolUse guard hooks (GRAPH-AS-LLM-CONTEXT-MS0 U-GAC07 + U-GA"
date: "2026-06-15"
first_ts: "2026-06-15T18:57:33.216Z"
last_ts: "2026-06-15T18:59:14.458Z"
cwd: "H:\\prism-slot-sierra"
messages: 31
user_msgs: 13
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ada23ca498d30363b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review TWO PRISM PreToolUse guard hooks (GRAPH-AS-LLM-CONTEXT-MS0 U-GAC07 + U-GA

> **claude-code-cli** | 2026-06-15 | 31 msgs (13 user / 18 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ada23ca498d30363b.jsonl`

## Transcript

### User | 2026-06-15T18:57:33.216Z

Review TWO PRISM PreToolUse guard hooks (GRAPH-AS-LLM-CONTEXT-MS0 U-GAC07 + U-GAC08). CRITICAL: your cwd is a different worktree; IGNORE it, do NOT run git. Read these EXACT ABSOLUTE paths:
1. H:/prism/.claude/hooks/stale-graph-guard.mjs        (U-GAC07)
2. H:/prism/.claude/hooks/hallucinated-node-id-guard.mjs (U-GAC08)

Both are fail-soft PreToolUse hooks. GAC07: warns (default) / denies (block mode via PRISM_STALE_GRAPH_GUARD=block) a viz-tool call when system-graph.json mtime > threshold (default 6h); statSync only, no content load; self-gates to viz tool names. GAC08: scans a Bash command for canonical node-id tokens; default ADVISORY (regex-only, zero load), block mode (PRISM_NODEID_GUARD_BLOCK=1) validates against the find-cache id-set and exits 2 on confirmed-absent ids; FAILS OPEN when the id-set is unavailable.

These were live-tested (all modes pass). Verify and report P0/P1/P2 (file:line + fix), then end with exactly "VERDICT: PASS" or "VERDICT: FAIL":
- Does each hook emit valid JSON (or the documented exit-2 stderr) on EVERY path: empty stdin, malformed JSON, off/disable, non-matching tool, no-match, warn, block, missing graph/find-cache, future mtime? Any path that throws or writes nothing (which would break the PreToolUse pipeline)?
- GAC07: future-mtime (clock skew) treated as fresh (never block)? missing graph -> advisory not block? the deny JSON shape ({decision:"deny"} + hookSpecificOutput.permissionDecision) correct for a PreToolUse deny?
- GAC08: does block mode FAIL OPEN (never block) when the find-cache is missing/empty/unreadable? Is the default truly zero-load (no find-cache read unless BLOCK)? Does it correctly scope to tool_name==="Bash" only? Does the id-set membership use exact ids (no substring false-match)?
- ReDoS in the ID_RE / VIZ_TOOL regexes (nested quantifiers)?
- Any silent-failure, any path that could hard-block legitimate work by default, any inlined magic constant.
Be specific and decisive.

### Assistant | 2026-06-15T18:57:40.565Z

I'll read both hook files in parallel to analyze them thoroughly.

### Assistant | 2026-06-15T18:57:40.972Z

[tool_use: Read]

### Assistant | 2026-06-15T18:57:41.015Z

[tool_use: Read]

### User | 2026-06-15T18:57:44.174Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * stale-graph-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC07 (slot:sierra)
4	 *
5	 * PreToolUse guard: when a system-viz / graph-context tool is about to run against
6	 * a STALE system-graph.json, warn (default) or deny (opt-in) so an agent does not
7	 * act on a stale map. Complements -- does NOT duplicate -- the existing
8	 * sessionstart-graph-staleness-inject (
... [+3431 chars truncated]

### User | 2026-06-15T18:57:44.176Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * hallucinated-node-id-guard.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC08 (slot:sierra)
4	 *
5	 * PreToolUse guard: catch FICTIONAL graph node-ids an agent emits when its context
6	 * is incomplete, before they drive an action. Detects canonical-prefix node-id
7	 * tokens (eng./disp./core./ghost./formula./skill./wiki./memory_) in a Bash command
8	 * and, in block mode, 
... [+4557 chars truncated]

### Assistant | 2026-06-15T18:57:48.088Z

I have both files. Let me now trace every execution path carefully, including cross-checking the `emitOk` / `emit` patterns, the regex, and the block-mode exit path.

### Assistant | 2026-06-15T18:57:49.668Z

[tool_use: Grep]

### User | 2026-06-15T18:57:49.669Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-06-15T18:57:50.605Z

[tool_use: Grep]

### User | 2026-06-15T18:57:50.606Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-06-15T18:57:54.258Z

[tool_use: Grep]

### Assistant | 2026-06-15T18:57:54.790Z

[tool_use: Grep]

### User | 2026-06-15T18:57:56.076Z

[tool_result] 36:function emitOk(o) { process.stdout.write(JSON.stringify(o || {})); process.exit(0); }
80:if (DISABLE || toolName !== "Bash") emitOk({});
83:if (!cmd) emitOk({});
86:if (ids.length === 0) emitOk({});
94:  emitOk({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: ctx } });
100:  emitOk({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: `node-id guard: id
... [+129 chars truncated]

### User | 2026-06-15T18:57:56.596Z

[tool_result] H:\prism\.claude\hooks\hallucinated-node-id-guard.mjs:17: *     so hard-block is opt-in via PRISM_NODEID_GUARD_BLOCK=1. verifies_via runs in block mode.
H:\prism\.claude\hooks\hallucinated-node-id-guard.mjs:22: * Knobs: PRISM_NODEID_GUARD_DISABLE=1 (off) · PRISM_NODEID_GUARD_BLOCK=1 (hard-deny) ·
H:\prism\.claude\hooks\hallucinated-node-id-guard.mjs:23: *        PRISM_NODEID_GUARD_K (max ids scann
... [+791 chars truncated]

### Assistant | 2026-06-15T18:58:01.300Z

Now let me check how the PreToolUse deny shape is expected by the Claude Code SDK, and verify the `process.exit(2)` path in GAC08 against what the hook pipeline expects.

### Assistant | 2026-06-15T18:58:02.118Z

[tool_use: Glob]

### Assistant | 2026-06-15T18:58:02.854Z

[tool_use: Grep]

### User | 2026-06-15T18:58:03.578Z

[tool_result] H:/prism/.claude/hooks\wedm-tier6-geom-gate.mjs
H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\agi
... [+4740 chars truncated]

### User | 2026-06-15T18:58:08.693Z

[tool_result] H:\prism\.claude\hooks\agi-safety-envelope-guard.mjs:58:  process.exit(2);
H:\prism\.claude\hooks\autonomous-loop-defer.mjs:76: * @returns {{decision:"allow"|"warn"|"ask"|"deny", count:number, threshold:number, message:string}}
H:\prism\.claude\hooks\autonomous-loop-defer.mjs:83:      decision: "deny",
H:\prism\.claude\hooks\autonomous-loop-defer.mjs:117:  return { decision: "allow", count, thresh
... [+9613 chars truncated]

### Assistant | 2026-06-15T18:58:14.269Z

Now I have everything I need. Let me verify two specific concerns: the `process.exit(2)` without stdout JSON in GAC08's block path, and the hook-runner's expectation for that exit code.

### Assistant | 2026-06-15T18:58:15.077Z

[tool_use: Read]

### User | 2026-06-15T18:58:16.406Z

[tool_result] 0	// tier: T4
1	// hook-runner.mjs — parallel hook execution library for U-D3 bundles.
2	// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
3	// enforces per-hook timeout, aggregates results.
4	//
5	// Hook protocol (Claude Code):
6	//   stdin  = JSON {tool_name, tool_input, ...}
7	//   stdout = JSON {decision?, reason?, additionalContext?, hookSpecificOutput?}
8	//      
... [+1648 chars truncated]

### Assistant | 2026-06-15T18:58:16.723Z

[tool_use: Grep]

### User | 2026-06-15T18:58:17.677Z

[tool_result] 18- * Block contract:
19- *   - stdin: standard PreToolUse JSON (`{tool_name, tool_input: {file_path, ...}}`)
20- *   - allowed: exit 0, no stdout
21: *   - blocked: write {"continue":false, "decision":"block", "reason":"..."} to
22- *     stdout, exit 2 (PreToolUse rejects the tool call)
23- *
24- * Allowlist source (priority order):
--
128-// ─── Helpers ─────────────────────────────────────────
... [+184 chars truncated]

### Assistant | 2026-06-15T18:58:23.424Z

I now have all the evidence needed. The hook-runner protocol is clear: exit 2 = block, and the block contract (as shown in `golf-slot-write-allowlist.mjs:131`) requires `{continue:false, decision:"block", reason:"..."}` written to stdout before exit 2. Let me do one final targeted check on the ID_RE regex for ReDoS risk.

### Assistant | 2026-06-15T18:58:24.400Z

[tool_use: Read]

### Assistant | 2026-06-15T18:58:25.011Z

[tool_use: Read]

### User | 2026-06-15T18:58:27.849Z

[tool_result] 30	// matcher can be broad). Excludes everything else so non-viz tools are never touched.
31	const VIZ_TOOL = /viz|system.?graph|master_index|graph_context|graphrag|spatial_resolve|node_card|community_summary/i;
32	const MS_PER_HOUR = 3_600_000;
33	
34	function emit(o) { process.stdout.write(JSON.stringify(o)); }

### User | 2026-06-15T18:58:27.893Z

[tool_result] 29	const BLOCK = process.env.PRISM_NODEID_GUARD_BLOCK === "1";
30	const MAX = Math.max(1, parseInt(process.env.PRISM_NODEID_GUARD_K || "20", 10) || 20);
31	// Canonical prefixes only (same whitelist as the GAC05 canonicalize hook + node-card-prefetch);
32	// EXCLUDES fs/test/git/script noise so prose/paths do not false-positive.
33	const ID_RE = /\b(?:eng|disp|core|ghost|formula|skill|wiki|memory_
... [+99 chars truncated]

### Assistant | 2026-06-15T18:59:14.458Z

I have everything I need. Here is the full analysis.

---

VERDICT: FAIL

summary: GAC08's block-mode deny path exits 2 with only stderr text and no stdout JSON, which silently breaks the PreToolUse pipeline contract (the hook runner and Claude Code both require stdout JSON before exit 2 to recognize a block; a bare exit 2 with no stdout is treated as an opaque crash, not a deny). GAC07 is clean on all paths. One additional P2 issue exists in GAC08: the regex global flag `/g` is stateful and reused across calls within the same module lifetime, which can cause `scanIds` to silently skip matches on repeated invocations depending on how Node.js module caching interacts with the flag's `lastIndex`.

---

findings:

- [P0] `H:/prism/.claude/hooks/hallucinated-node-id-guard.mjs:104-105` -- Block-mode deny emits nothing to stdout before `process.exit(2)`. The hook contract (confirmed at `golf-slot-write-allowlist.mjs:131` and `bundles/lib/hook-runner.mjs:9-12`) requires `{continue:false, decision:"block", reason:"..."}` written to stdout AND exit 2; exit 2 alone (with only `process.stderr.write(...)`) means the bundle/Claude Code sees an empty stdout which hook-runner.mjs line 8 explicitly treats as "empty / non-JSON => no-op success", and then the exit 2 is interpreted as a crash/timeout rather than a structured deny. Result: the entire block-mode protection silently does nothing -- the tool call is permitted. Fix: before `process.exit(2)`, add `process.stdout.write(JSON.stringify({ continue: false, decision: "block", reason: \`unknown node-id(s): ${unknown.join(", ")} -- not in the system graph\` }));` mirroring the pattern at `golf-slot-write-allowlist.mjs:131`.

- [P1] `H:/prism/.claude/hooks/hallucinated-node-id-guard.mjs:33` -- `ID_RE` is declared as a module-level `const` with the `/g` flag. The `/g` flag makes `RegExp.prototype.exec()` stateful via `lastIndex`. `scanIds()` at line 42 calls `ID_RE.exec(text)` in a `while` loop, which works correctly for a single cal
... [+4733 chars truncated]
