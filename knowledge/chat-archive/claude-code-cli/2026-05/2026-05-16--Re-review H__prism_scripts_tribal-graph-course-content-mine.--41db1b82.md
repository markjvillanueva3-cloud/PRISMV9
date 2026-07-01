---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Re-review H:\\prism\\scripts\\tribal-graph-course-content-mine.mjs — you previously"
date: "2026-05-16"
first_ts: "2026-05-16T04:41:47.596Z"
last_ts: "2026-05-16T04:42:30.798Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a990c4be907a8c31c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Re-review H:\prism\scripts\tribal-graph-course-content-mine.mjs — you previously

> **claude-code-cli** | 2026-05-16 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a990c4be907a8c31c.jsonl`

## Transcript

### User | 2026-05-16T04:41:47.596Z

Re-review H:\prism\scripts\tribal-graph-course-content-mine.mjs — you previously returned VERDICT: FAIL with 2 P1 + 4 P2 findings. The file was edited. Re-read the WHOLE file fresh from disk and verify each is closed:

1. P1-1 (PowerShell injection — `.replace(/'/g,"''")` insufficient): `extractAllDataJson` now passes the zip path via an environment variable `PRISM_MINE_ZIP_PATH` (spawnSync `env` option) and the PS script reads `$env:PRISM_MINE_ZIP_PATH` — zero interpolation of the path into the script body. Confirm this fully closes the injection vector (any quote/newline/backtick/`$` in a filename is now inert data).

2. P1-2 (findAllZips symlink/junction recursion → stack overflow): findAllZips now uses `lstatSync` (skips `isSymbolicLink()`) + a `realpathSync`-keyed `seenReal` Set cycle-guard. Confirm a junction loop can no longer cause unbounded recursion.

3. P2-1 (`--limit` NaN silently ignored): parseArgs now validates `--limit` is a positive integer or `process.exit(2)`. Confirm.

4. P2-2 (stale checkpoint records survive a lib-version tightening): the checkpoint load now re-filters `cpRecords` against the current `RELEVANCE_FLOOR` (drops records with belowFloor===true or boundedRelevance below floor). Confirm.

5. P2-3 (`--force --limit N` destroys prior records): `--force` now resets only `minedSlugs` (doneSlugs) but KEEPS `cpRecords` as the merge base. Confirm a `--force --limit 5` run no longer discards the other courses' records.

6. P2-4 (orphan advisory graph node when course node absent): the graph-emission loop now skips emitting the candidate node entirely when `!r.nodeId || !existingNodeIds.has(r.nodeId)` (counts orphansSkipped, logs it). Confirm no edgeless node is emitted.

Also confirm no NEW defect introduced — especially: does moving `processed++` below the `doneSlugs.has` skip check correctly make `--limit` count only attempted courses (Arm-B's separate finding), and does the checkpoint re-filter handle a record with `belowFloor` undefined (
... [+93 chars truncated]

### Assistant | 2026-05-16T04:41:54.073Z

I'll re-read the file fresh from disk and verify each finding.

### Assistant | 2026-05-16T04:41:54.074Z

[tool_use: Read]

### User | 2026-05-16T04:41:56.131Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-graph-course-content-mine.mjs
3	// Iter 7 (TRIBAL-GRAPH-MS0): I/O orchestrator that mines each MIT-OCW course
4	// zip's per-resource descriptor layer into a RANKED, ADVISORY review queue of
5	// PRISM-value candidates (technique vocabulary + asset proposals).
6	//
7	// PIPELINE: zip → ALL data.json entries → collectResourceDescriptors →
8	// aggregateCourseCorpus
... [+18945 chars truncated]

### Assistant | 2026-05-16T04:42:30.798Z

I have the full file. Let me verify each finding against the current code.

## Code Quality Re-Review Report

### P1-1 (PowerShell injection) — CLOSED ✓

Lines 139-161. The `ps` script body contains zero interpolation of `zipPath`. The path is read inside PowerShell via `$env:PRISM_MINE_ZIP_PATH` (line 142), and passed to the child via the `env` option on `spawnSync` (line 161: `env: { ...process.env, PRISM_MINE_ZIP_PATH: zipPath }`).

This fully closes the vector. An environment variable value is passed as inert data through the Win32 process-creation environment block — it is never parsed by the PowerShell command tokenizer. A filename containing `'`, `"`, backtick, `$(...)`, `;`, `&`, or a newline cannot break out of or alter the command, because none of those bytes ever appear in the `-Command` string. The only consumer of the value is the `.NET` API `ZipFile::OpenRead`, which treats it as a literal path. Note `spawnSync` is invoked with an explicit args array (no `shell: true`), so the args themselves are also not shell-parsed. Verified closed.

### P1-2 (findAllZips symlink/junction recursion) — CLOSED ✓

Lines 107-128. Two independent guards:
- Line 120-121: `lstatSync(full)` + `if (s.isSymbolicLink()) continue;` — symlinks are never traversed at all. On Win11 this catches symbolic-link directories.
- Lines 109, 111-114: `realpathSync(dir)` resolved at function entry, keyed into a `seenReal` Set; `if (seenReal.has(real)) return;` before recursing.

The `realpathSync` guard is the one that catches **junctions** specifically — `lstatSync` on a Windows directory junction reports `isDirectory()===true` and `isSymbolicLink()===false`, so the `isSymbolicLink` check alone does NOT stop a junction loop. The `realpathSync` cycle-guard does: a junction loop `A→B→A` resolves to a finite set of real paths; the second visit to a real path returns early. Unbounded recursion is no longer possible. Verified closed.

### P2-1 (`--limit` NaN) — CLOSED ✓

Lines 65-72. `parseInt
... [+4447 chars truncated]
