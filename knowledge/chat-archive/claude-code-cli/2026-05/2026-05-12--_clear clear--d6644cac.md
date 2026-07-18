---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6644cac-0439-42b8-8970-372b0beef4f6"
title: "/clear clear"
date: "2026-05-12"
first_ts: "2026-05-12T12:36:52.294Z"
last_ts: "2026-05-12T14:15:06.111Z"
cwd: "H:\\prism"
messages: 245
user_msgs: 123
assistant_msgs: 122
raw_file: "H:/.claude/projects/H--prism/d6644cac-0439-42b8-8970-372b0beef4f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:48"
---

# /clear clear

> **claude-code-cli** | 2026-05-12 | 245 msgs (123 user / 122 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6644cac-0439-42b8-8970-372b0beef4f6.jsonl`

## Transcript

### User | 2026-05-12T12:36:50.636Z

<command-name>/clear</command-name>
            <command-message>clear</command-message>
            <command-args></command-args>

### User | 2026-05-12T12:37:14.764Z

<command-message>checkin</command-message>
<command-name>/checkin</command-name>
<command-args>read and continue state/shared/handoffs/HANDOFF-claude-49a09a3c-charlie-hooks-automa.md</command-args>

### User | 2026-05-12T12:37:14.764Z

# /checkin — Fleet Check-In + Drift / Conflict / Commit Guard

Run this in any chat that's one of the ~6 concurrent PRISM chats. It (a) claims this chat a stable human-readable slot name, (b) makes the per-chat handoff save under that slot, (c) cleans up crashed-slot / stale-claim debris, (d) surfaces anything that would cause a silent overwrite, a roadmap-drift surprise, or a commit collision, and (e) — if you pass `--roadmap` — narrows this chat's work surface to one of the two roadmaps. Auto-fixes the safe stuff; surfaces (with the fix command) the stuff that needs your call.

**Re-run it after every `/compact`** (the slot heartbeat needs refreshing; a compact can also leave a stale index.lock).

## Args: read and continue state/shared/handoffs/HANDOFF-claude-49a09a3c-charlie-hooks-automa.md
- *(empty)* — standard check-in; this chat works the full atomized roadmap.
- `--roadmap devtools` — this chat is on the **backend-development roadmap** (`BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP`; `track:"devtools"` units) — **the prioritized roadmap, do these first**.
- `--roadmap revenue` — this chat is on the **revenue roadmap** (`REVENUE-ROADMAP-v7.6` §R1–§R10; `track:"revenue"` units) — runs *after* / *behind* the devtools roadmap (`roadmap_priority` 1 vs 0); a revenue chat mostly does low-priority revenue background work until the devtools P0 (the dev tooling) has landed.
- When `--roadmap <name>` is given, Step 7's report adds a **"your slice"** line — your lane's ordered run-list, scoped to that roadmap (feed it to `/run-continuous`). Compute it from `state/shared/atomic-roadmap.json` (`roadmap[]` = every unit · `laneAssignments[]` = which units go to chat 1..6 · slot→chat is **alpha=1 · bravo=2 · charlie=3 · delta=4 · echo=5 · foxtrot=6**). `--roadmap devtools` → your lane minus revenue, i.e. units with `roadmap_priority === 0` (the BACKEND-DEVTOOLS-RGS6 P0 dev-tooling tracks — `HOOKS-AUTOMATION-V2`, `SKILLS-UTILIZATION`, `AUTO-LEARNING-LOOP`, `COST-CASCADE`, `TOOL-INVENT
... [+10305 chars truncated]

### Assistant | 2026-05-12T12:37:24.443Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:37:25.334Z

[tool_use: Read]

### User | 2026-05-12T12:37:37.746Z

[tool_result] cad-fusion-live-ms0
[MAIN] [HARNESS]/U-HANG-FORKSTORM-V2: permanent fix for Windows hook fork-storm hang

### User | 2026-05-12T12:37:41.603Z

[tool_result] 1	---
2	session: claude-49a09a3c
3	topic: charlie-hooks-automation-v2
4	written_at: 2026-05-12T12:32:24.050Z
5	machine: MARKV
6	family: Claude
7	session_key: claude-49a09a3c
8	status: active
9	---
10	
11	# HANDOFF: claude-49a09a3c
12	Updated: 2026-05-12T12:32:24.050Z
13	Family: Claude | Machine: MARKV | Session: claude-49a09a3c
14	
15	## STATE
16	(milestone HOOKS-AUTOMATION-V2-MS0 COMPLETE — 10/10
... [+6139 chars truncated]

### Assistant | 2026-05-12T12:37:55.353Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:37:56.556Z

[tool_use: Bash]

### User | 2026-05-12T12:38:10.599Z

[tool_result] {
  "ok": true,
  "reclaimed": []
}

### User | 2026-05-12T12:38:21.662Z

[tool_result]  M .claude/helpers/chat-slots.mjs
 M .claude/hooks/auto-lint-post-edit.mjs
 M .claude/scripts/verify-hook-refs.mjs
 M Docustrata/.index/phase15-deep-rescan-huge-chunked.py
 M Docustrata/.index/phase15-deep-rescan-parallel-memsafe.py
 M PRISM-INVENTORY-LATEST.md
 M knowledge/wiki/architecture/_stats.md
 M knowledge/wiki/index.md
 M mcp-server/data/state/BASELINE_INVENTORY.json
 M mcp-server/data/st
... [+1333 chars truncated]

### Assistant | 2026-05-12T12:38:27.151Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:38:27.818Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:38:28.294Z

[tool_use: Bash]

### User | 2026-05-12T12:38:35.953Z

[tool_result] {
  "ok": true,
  "slot": "bravo",
  "state": {
    "chatId": "claude-d6644cac",
    "host": "MarkV",
    "pid": 6776,
    "claimedAt": "2026-05-12T12:38:34.354Z",
    "lastHeartbeat": "2026-05-12T12:38:34.354Z",
    "branch": "cad-fusion-live-ms0",
    "topic": "hooks-automation-v2",
    "activity": "checkin"
  }
}

### User | 2026-05-12T12:38:48.775Z

[tool_result] Drifted milestones: 16
Top 10 by delta:
  CAM-EXHAUST-MS0              in_progress  -> in_progress   recorded=45  observed=107  total=223
  INTEL-OLLAMA-OBSIDIAN-MS0    not_started  -> in_progress   recorded=0  observed=25  total=92
  PSAU-PPG-SFC                 in_progress  -> complete      recorded=1  observed=16  total=14
  LOCAL-LLM-MS0                in_progress  -> in_progress   recorded=0 
... [+582 chars truncated]

### User | 2026-05-12T12:39:28.704Z

[tool_result] {"ok":true,"chat_entries":200,"agents":184,"families":2,"chat":"H:\\prism\\state\\shared\\AGENT_CHAT.md","workboard":"H:\\prism\\state\\shared\\AGENT_WORKBOARD.md","last_entry":{"id":"chat-1778589428602","timestamp":"2026-05-12T12:37:08.601Z","agent":"Agent","agent_family":"Agent","agent_instance":"Agent@MARKV/pid-22108","machine":"MARKV","session_key":"pid-22108","lane":null,"status":"complete","
... [+3323 chars truncated]

### Assistant | 2026-05-12T12:39:45.982Z

[tool_use: Bash]

### User | 2026-05-12T12:40:15.196Z

[tool_result] {"ok":true,"content":"---\nsession: claude-58e6d5d4\ntopic: html-primary-ms0\nwritten_at: 2026-05-12T03:35:00Z\nmachine: MarkV\nfamily: Claude\nsession_key: claude-58e6d5d4\nstatus: active\nsource: live-chat\n---\n\n# HANDOFF: claude-58e6d5d4\nUpdated: 2026-05-12T03:35:00Z · Family: Claude · Machine: MarkV · slot was charlie→delta · branch: cad-fusion-live-ms0 · MAIN tree\n\n## RESUME\n\n**HTML-PR
... [+13206 chars truncated]

### Assistant | 2026-05-12T12:40:41.487Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:40:42.908Z

[tool_use: Bash]

### User | 2026-05-12T12:40:57.299Z

[tool_result] {"ok":true,"file":"H:\\prism\\state\\shared\\handoffs\\HANDOFF-claude-d6644cac-bravo-hooks-automati.md","instance":"claude-d6644cac"}

### User | 2026-05-12T12:41:10.252Z

[tool_result] | HOOKS-AUTOMATION-V2-MS0 | HOOKS-AUTOMATION-V2 | completed | completed_real | 10/10 (100%) | 2026-05-11 |
| SKILLS-UTILIZATION-MS0 | SKILLS-UTILIZATION | not_started | in_progress_real | 3/8 (38%) | 2026-05-11 |
| SKILLS-UTILIZATION-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
===
state/shared/atomic-roadmap-chat-1.md
state/shared/atomic-roadmap-chat-2.md
stat
... [+147 chars truncated]

### Assistant | 2026-05-12T12:41:27.919Z

[tool_use: Bash]

### User | 2026-05-12T12:41:36.920Z

[tool_result] === chat-1 (alpha) lane head ===
# Chat 1 — Assignment List

> Generated by atomic-roadmap-emit.mjs on 2026-05-11T19:27:58.620Z
> 614 units assigned. Sort: tier ASC → aiPriorityScore DESC → leverage DESC.

## Discipline
- Stay in your lane (this list); do NOT touch units owned by other chats.
- Run `/run-continuous` to step through this list.
- Update system-viz at every claim/build/wire/complete 
... [+9432 chars truncated]

### Assistant | 2026-05-12T12:42:39.012Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:42:42.069Z

[tool_use: Bash]

### User | 2026-05-12T12:42:52.014Z

[tool_result] === scripts on disk? ===
-rwxr-xr-x 1 Mark V 197608 6265 May 11 20:51 scripts/check-spec-html-a11y.mjs*
-rwxr-xr-x 1 Mark V 197608 9840 May 11 20:29 scripts/emit-all-spec-html.ts*
-rwxr-xr-x 1 Mark V 197608 6916 May 11 20:08 scripts/emit-spec-html.ts*

=== are they tracked? ===
scripts/emit-spec-html.ts
(blank = untracked)

=== html twins on disk ===
56
html files
56
hash sidecars

=== existing co
... [+590 chars truncated]

### User | 2026-05-12T12:43:01.299Z

[tool_result] === settings.json locations ===
ls: cannot access 'C:/Users/wompu/.claude/settings.json': No such file or directory
-rw-r--r-- 1 Mark V 197608 35990 May 11 22:38 .claude/settings.json
-rw-r--r-- 1 Mark V 197608 27248 May 11 21:47 C:/Users/Mark Villanueva/.claude/settings.json

=== PreToolUse Bash hooks in H:/prism/.claude/settings.json (matcher contexts) ===
matcher: Bash|Read|Edit|Write|MultiEdit
... [+70 chars truncated]

### Assistant | 2026-05-12T12:43:17.867Z

[tool_use: Bash]

### User | 2026-05-12T12:43:28.382Z

[tool_result] === bash-bundle.mjs head + hook list ===
#!/usr/bin/env node
// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
// Bash matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const BASH_HOOKS = [
  { path: `${HELPER
... [+1367 chars truncated]

### Assistant | 2026-05-12T12:44:09.357Z

[tool_use: Bash]

### Assistant | 2026-05-12T12:44:10.114Z

[tool_use: Bash]

### User | 2026-05-12T12:45:20.176Z

[tool_result] Exit code 255
=== prism-source-hash meta in a twin ===
state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.html:<meta name="prism-source-hash" content="7c392d847b65877f9ac3719424b7351cba738ecf34f53dda72d93a8b074ccb8d">
state/shared/specs/2026-05-09-U-FORGE-AUDIT-OMNISCIENT.html:<meta name="prism-source-hash" content="5a1f45f211280a6a437e82ea09114c72e8d0f0578231c856d675c902778ee0c2">

=== a .html.ha
... [+578 chars truncated]

### User | 2026-05-12T12:45:20.176Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd H:/prism && echo "=== prism-source-ha…) errored</tool_use_error>

### Assistant | 2026-05-12T12:45:30.554Z

[tool_use: Bash]

### User | 2026-05-12T12:45:46.686Z

[tool_result] === hook-runner runBundle (blocking semantics) ===
// hook-runner.mjs — parallel hook execution library for U-D3 bundles.
// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
// enforces per-hook timeout, aggregates results.
//
// Hook protocol (Claude Code):
//   stdin  = JSON {tool_name, tool_input, ...}
//   stdout = JSON {decision?, reason?, additionalContext?, hookSpec
... [+6183 chars truncated]

### Assistant | 2026-05-12T12:46:43.387Z

[tool_use: TaskCreate]

### Assistant | 2026-05-12T12:46:45.121Z

[tool_use: TaskCreate]

### User | 2026-05-12T12:46:45.947Z

[tool_result] Task #1 created successfully: Build html-companion-guard.mjs per-commit hook

### system

... [165 middle messages omitted -- see raw_file] ...

### User | 2026-05-12T13:51:38.316Z

[tool_result] 487:        "matcher": "Edit|Write|MultiEdit",
686:        "matcher": "Edit|Write|MultiEdit",
775:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/unified-edit-tap.mjs",
780:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/system-viz-live-bridge.mjs",
785:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mc
... [+21 chars truncated]

### Assistant | 2026-05-12T13:51:42.854Z

[tool_use: Read]

### User | 2026-05-12T13:51:45.903Z

[tool_result] 770	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/tribal-autowire.mjs",
771	            "timeout": 3000
772	          },
773	          {
774	            "type": "command",
775	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/unified-edit-tap.mjs",
776	            "timeout": 2000
777	          },
778	          {
779	            "type"
... [+959 chars truncated]

### Assistant | 2026-05-12T13:51:52.392Z

[tool_use: Edit]

### User | 2026-05-12T13:52:01.160Z

[tool_result] The file H:\prism\.claude\settings.json has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-12T13:53:53.228Z

[tool_use: Write]

### User | 2026-05-12T13:53:58.072Z

[tool_result] TEST LEGITIMACY GATE — BLOCKED

HookRegistryBuild.test.ts is not valid coverage:
- placeholder test pattern: weak presence-only assertion

Write real assertions against real behavior. Synthetic loops, placeholder assertions, and mocked critical-domain SUTs do not count.

### Assistant | 2026-05-12T13:54:40.412Z

[tool_use: Write]

### User | 2026-05-12T13:54:48.415Z

[tool_result] File created successfully at: H:\prism\mcp-server\src\__tests__\HookRegistryBuild.test.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-12T13:55:01.515Z

[tool_use: Bash]

### User | 2026-05-12T13:55:18.124Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/prism/mcp-server

 ❯ src/__tests__/HookRegistryBuild.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/HookRegistryBuild.test.ts [ src/__tests__/HookRegistryBuild.tes
... [+956 chars truncated]

### Assistant | 2026-05-12T13:56:03.969Z

[tool_use: Bash]

### User | 2026-05-12T13:56:12.904Z

[tool_result] Exit code 1
=== node --check both new files ===
H:\prism\.claude\hooks\hook-registry-regen.mjs:11
 * SessionStart catch up. Always emits `{continue:true}`. Disable with PRISM_HOOK_REGISTRY_REGEN=0.
                                        ^

SyntaxError: Unexpected token '{'
    at checkSyntax (node:internal/main/check_syntax:74:5)

Node.js v22.12.0
build-hook-registry.mjs: OK syntax

=== s
... [+2605 chars truncated]

### Assistant | 2026-05-12T13:56:37.658Z

[tool_use: Edit]

### User | 2026-05-12T13:56:44.350Z

[tool_result] The file H:\prism\.claude\hooks\hook-registry-regen.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-12T13:56:54.911Z

[tool_use: Bash]

### User | 2026-05-12T13:57:06.531Z

[tool_result] syntax OK
---smoke---
{"continue":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"↻ HOOK_REGISTRY.json regen queued (a .claude/hooks change was detected)"}}
{"continue":true}
{"continue":true}
{"continue":true}
---exports---
exports: relevantPaths | relevantPaths({edits:[{file_path:"x"}]}): ["x"]

### Assistant | 2026-05-12T13:57:14.857Z

[tool_use: Bash]

### User | 2026-05-12T13:57:27.207Z

[tool_result]  DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/guide/migration#pool-rework

 RUN  v4.1.5 H:/prism/mcp-server

 ✓ src/__tests__/HookRegistryBuild.test.ts (13 tests) 2015ms
     ✓ a real regen writes a valid HOOK_REGISTRY.json with the expected shape  330ms
     ✓ --check exits 0 
... [+230 chars truncated]

### Assistant | 2026-05-12T13:57:40.634Z

[tool_use: PowerShell]

### User | 2026-05-12T13:58:39.098Z

[tool_result] Exit code 1
[31;1m  ...and 2575 more output files...[0m
[31;1m[0m
[31;1mDone in 11313ms[0m
=== full build: errors mentioning HookRegistry? ===
=== total TS error count ===
1356
=== exit: 1 ===

### Assistant | 2026-05-12T13:58:58.641Z

[tool_use: TaskUpdate]

### User | 2026-05-12T13:59:01.510Z

[tool_result] Updated task #7 activeForm

### Assistant | 2026-05-12T13:59:12.935Z

[tool_use: Bash]

### User | 2026-05-12T13:59:32.455Z

[tool_result] ok 5 files changed, 9071 insertions(+)
--- staged ---
.claude/hooks/hook-registry-regen.mjs
.claude/settings.json
mcp-server/src/__tests__/HookRegistryBuild.test.ts
scripts/build-hook-registry.mjs
state/shared/HOOK_REGISTRY.json
--- committing ---
ok cad-fus
---
65cd4740ee65d4602ec21cc79409467f0f1f0f5f [MAIN] [HOOK-SYNERGY-MS0]/U-H1: HOOK_REGISTRY.json (canonical hook registry) + build-hook-regist
... [+2728 chars truncated]

### Assistant | 2026-05-12T13:59:54.609Z

[tool_use: TaskUpdate]

### Assistant | 2026-05-12T13:59:54.804Z

[tool_use: Read]

### User | 2026-05-12T13:59:55.682Z

[tool_result] Updated task #7 status

### User | 2026-05-12T13:59:57.425Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * verify-hook-refs.mjs — SessionStart guardrail + H1 verify channel.
4	 *
5	 * Audits every hook registration in the Claude Code settings layers
6	 * (H:/.claude/settings.json, H:/PRISM/.claude/settings.json, .local.json)
7	 * for:
8	 *
9	 *   1. BROKEN_PATH       — hook command points to a script that does not exist
10	 *   2. DUPLICATE_TRIPLE  — same (event, matche
... [+18985 chars truncated]

### Assistant | 2026-05-12T14:00:24.453Z

[tool_use: Bash]

### User | 2026-05-12T14:00:38.778Z

[tool_result] === verify-hook-refs.mjs --self-test ===
verify-hook-refs: ✓ self-test passed (9 cases)
(exit 0)
=== --json (real audit, summary) ===
resolved: 221 | missing: 0 | dupTriple: 0 | dupMatcher: 1 | invalidJSON: 0 | indeterminate: 0 | exitClass: 2
(audit exit 0)

=== commit U-H1.0 (the orphaned verify-hook-refs upgrade) ===
ok 1 file changed, 300 insertions(+), 79 deletions(-)
.claude/scripts/verify-ho
... [+202 chars truncated]

### Assistant | 2026-05-12T14:01:37.357Z

[tool_use: Agent]

### Assistant | 2026-05-12T14:01:37.563Z

[tool_use: Bash]

### User | 2026-05-12T14:01:57.556Z

[tool_result] === file-claim-guard.mjs — worktree-aware? (U-H6 scope check) ===
#!/usr/bin/env node
/**
 * file-claim-guard.mjs — PreToolUse hook for Edit | Write | MultiEdit
 *
 * Prevents two concurrent Claude chats from silently editing the same file.
 * Attempts to atomically claim the target file for this session; blocks the tool
 * call only when another LIVE session holds the claim. Expired claims 
... [+1673 chars truncated]

### User | 2026-05-12T14:09:52.096Z

[tool_result] [{"type": "text", "text": "Temp files cleaned. `HOOK_REGISTRY.json` shows `M` but it was already `M` in the initial git status snapshot (it's a generated artifact that the regen-on-edit hook and the cron keep fresh \u2014 the `M` predates my session and is expected churn). The git index lock is held by a concurrent chat (this is the 6-chat fleet), unrelated to this review. The `.mjs` files under r
... [+7346 chars truncated]

### Assistant | 2026-05-12T14:10:20.979Z

[tool_use: TaskUpdate]

### User | 2026-05-12T14:10:21.499Z

[tool_result] Task not found

### Assistant | 2026-05-12T14:10:43.314Z

[tool_use: Bash]

### User | 2026-05-12T14:10:55.092Z

[tool_result]     },
    "blockCount": 0,
    "notes": ""
  }
}

{"ok":true,"agent":"Claude","agent_instance":"Claude@MARKV/pid-26440","chat":"H:\\prism\\state\\shared\\AGENT_CHAT.md","workboard":"H:\\prism\\state\\shared\\AGENT_WORKBOARD.md","entry":{"id":"chat-1778595052322","timestamp":"2026-05-12T14:10:52.321Z","agent":"Claude","agent_family":"Claude","agent_instance":"Claude@MARKV/pid-26440","machine":"MAR
... [+3369 chars truncated]

### Assistant | 2026-05-12T14:11:34.111Z

Done — "do it all" on the hooks lane, picking up `HOOK-SYNERGY-MS0` (the next hooks milestone after `HOOKS-AUTOMATION-V2-MS0`). Two commits this session, on top of last session's `html-companion-guard` (`21060e5ab` + `ea6893bb5`):

**`65cd4740e` — `[MAIN] [HOOK-SYNERGY-MS0]/U-H1`** — canonical hook registry:
- Adopted the orphaned `scripts/build-hook-registry.mjs` (complete 317-line script left untracked by dead chat `claude-ac4ef13f`, gone >14h) and **added bundle-tracing** — it was falsely counting ~40 bundle-wrapped hooks (`bash-bundle`/`edit-bundle`/`read-bundle`/`stop-bundle`/`sessionstart-bundle` inner hooks) as "orphaned"; now it reads each wired `bundles/*.mjs`, extracts its inner hooks, and propagates the bundle's events with a `viaBundle` tag.
- Generated `state/shared/HOOK_REGISTRY.json` (448 hook files, 166 wired, 282 orphaned — the queryable canonical map: id/file/wired/disabled/events[]/description/tier/sizeBytes/lines per hook + counts byEvent/byType/byLayer).
- New `.claude/hooks/hook-registry-regen.mjs` — PostToolUse:Edit|Write|MultiEdit (registered additively in `settings.json`), fire-and-forget detached regen when a `.claude/hooks/**.mjs` or `settings*.json` is edited; 99%-path is `JSON.parse` + a regex test (no spawn); always `{continue:true}`; fails open; `PRISM_HOOK_REGISTRY_REGEN=0` to disable.
- `mcp-server/src/__tests__/HookRegistryBuild.test.ts` — 13 vitest cases (builder `--self-test`/regen/shape/bundle-tracing/`--check` round-trip + the regen hook across Edit/Write/MultiEdit/Bash/disabled/empty/malformed + `relevantPaths`). All pass.

**`d16d1f438` — `[MAIN] [HOOK-SYNERGY-MS0]/U-H1.0`** — `verify-hook-refs.mjs` upgrade:
- Adopted the orphaned upgrade (also `claude-ac4ef13f`, uncommitted +300/-79 over the old 4-check stub). Adds a 5th finding type INDETERMINATE (unexpanded env-var token / exists-but-unreadable → warning not error), env-var expansion (`~`/`$NAME`/`${NAME}`/`$env:NAME`/`%NAME%`) before the on-disk check, relative-path resolu
... [+3179 chars truncated]
