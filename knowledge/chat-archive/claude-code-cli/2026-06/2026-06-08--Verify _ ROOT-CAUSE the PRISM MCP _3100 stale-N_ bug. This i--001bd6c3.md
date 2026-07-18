---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Verify + ROOT-CAUSE the PRISM MCP :3100 stale-N: bug. This is the #1 \"not workin"
date: "2026-06-08"
first_ts: "2026-06-08T15:15:13.996Z"
last_ts: "2026-06-08T15:23:12.029Z"
cwd: "H:\\prism"
messages: 84
user_msgs: 31
assistant_msgs: 53
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_3c7ad9ae-849/agent-ad0cf71ba7ed8f663.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Verify + ROOT-CAUSE the PRISM MCP :3100 stale-N: bug. This is the #1 "not workin

> **claude-code-cli** | 2026-06-08 | 84 msgs (31 user / 53 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_3c7ad9ae-849/agent-ad0cf71ba7ed8f663.jsonl`

## Transcript

### User | 2026-06-08T15:15:13.996Z

Verify + ROOT-CAUSE the PRISM MCP :3100 stale-N: bug. This is the #1 "not working properly" issue. Checks: (1) Confirm the daemon is up (curl -s -m4 -o nul -w "%{http_code}" http://127.0.0.1:3100/mcp expect 405). (2) ROOT-CAUSE why self_awareness_search returns N:\PRISM when source hardcodes H:/prism — read mcp-server/src/tools/dispatchers/sessionDispatcher.ts around line 2008 (case self_awareness_search), trace what path it scans, and check whether it reads from a persisted index, process.cwd(), an env var, or the dist/ bundle. (3) Check the dist/ bundle build date vs the N: era — is the running daemon serving a STALE dist built when repo was on N:? grep the dist bundle for "N:" literal. (4) Determine: does the fix require a daemon RESTART (operator-gated), a REBUILD (npm run build), or a code edit? Report the precise root cause + fix with evidence. 
LIVE GROUND TRUTH (verified this session via Get-NetTCPConnection + curl + file reads — do NOT re-assume, but DO independently re-verify with your own commands; never trust a claim you didn't run):
- Hermes desktop app: NOT running. :9120 (Web UI) NOT listening. No hermes/electron process found.
- Obsidian app: NOT running. :27123 (Local REST API plugin) NOT listening.
- Qdrant vector store: DOWN. :6333 NOT listening. (prism_memory:semantic_search returns "qdrant not connected".)
- PRISM MCP server: UP. :3100 listening (PID 27836, node.exe from H:/Tools/nodejs, started 2026-06-08 08:18). HTTP 405 to GET (correct for MCP-over-HTTP). 91 tools. BUT prism_session:self_awareness_search returns ENOENT 'N:\PRISM\src\tools\dispatchers' — a STALE N: drive path. Operator confirmed "n is now h" (drive remap: old N: -> now H:). Source PRISMSelfAwarenessEngine.ts:162 hardcodes PRISM_ROOT="H:/prism" (correct). So either the dist/ bundle was built when on N:, or a runtime path resolves from cwd/env captured at launch.
- Ollama: UP. :11434 listening (PID 34692).
- Hermes config.yaml: model.default=qwen2.5-coder:32b, provider=openai, b
... [+2271 chars truncated]

### Assistant | 2026-06-08T15:15:39.509Z

I'll verify the PRISM MCP :3100 stale-N: bug empirically. Let me start with independent ground-truth checks running in parallel.

### Assistant | 2026-06-08T15:15:40.988Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:15:43.926Z

[tool_use: Bash]

### User | 2026-06-08T15:15:49.075Z

[tool_result] HTTP_CODE=405

### User | 2026-06-08T15:16:06.379Z

[tool_result] Exit code 1
At line:1 char:291
+ ... ilentlyContinue | Select-Object -First 1).OwningProcess; if () { Get- ...
+                                                                  ~
Missing condition in if statement after 'if ('.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : IfStatementMissingCondition

### Assistant | 2026-06-08T15:16:12.919Z

Check (1) PASSED: HTTP 405 on GET to :3100/mcp (correct for MCP-over-HTTP). Let me re-run the process check with corrected PowerShell syntax.

### Assistant | 2026-06-08T15:16:12.922Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:16:13.775Z

[tool_use: Read]

### User | 2026-06-08T15:16:22.703Z

[tool_result] Exit code 1
At line:1 char:115
+ ...  -ErrorAction SilentlyContinue | Select-Object -First 1; if () {  = . ...
+                                                                  ~
Missing condition in if statement after 'if ('.
At line:1 char:160
+ ... t -First 1; if () {  = .OwningProcess; Write-Output ('PID=' + ); Get- ...
+                                                                  
... [+212 chars truncated]

### User | 2026-06-08T15:16:27.044Z

[tool_result] 1960	              hydrateResult = ledger.hydrateFromJSONL(lines);
1961	            }
1962	            const conflicts = ledger.detectConflicts(windowMs);
1963	            return ok({ success: true, conflicts, count: ledger.count(), hydrate: hydrateResult, ledger_path: ledgerPath, window_ms: windowMs });
1964	          }
1965	
1966	          case "coordination_recent": {
1967	            const { C
... [+6094 chars truncated]

### Assistant | 2026-06-08T15:16:32.888Z

Important finding: the `self_awareness_search` case at line 2008 routes to `AgentSelfAwarenessEngine`, NOT `PRISMSelfAwarenessEngine`. The prompt referenced `PRISMSelfAwarenessEngine.ts:162` hardcoding `H:/prism`, but the actual code path for `self_awareness_search` uses `AgentSelfAwarenessEngine`. Let me trace the real engine that produces the `N:\PRISM\src\tools\dispatchers` path.

### Assistant | 2026-06-08T15:16:35.095Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:16:37.195Z

[tool_use: Bash]

### User | 2026-06-08T15:16:39.491Z

[tool_result] Exit code 1
At line:1 char:165
+ ... rst 1; if ( -ne ) {  = .OwningProcess; Write-Output ('PID=' + ); Get- ...
+                                                                  ~
You must provide a value expression following the '+' operator.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ExpectedValueExpression

### User | 2026-06-08T15:16:50.329Z

[tool_result] FullName      : H:\prism\mcp-server\src\engines\AgentSelfAwarenessEngine.ts
Length        : 10729
LastWriteTime : 4/14/2026 6:14:00 PM




Name               Length  LastWriteTime        
----               ------  -------------        
__tests__                  6/8/2026 1:19:30 AM  
validation                 6/8/2026 1:19:30 AM  
utils                      6/8/2026 1:19:21 AM  
type
... [+2643 chars truncated]

### Assistant | 2026-06-08T15:16:57.830Z

Key data points emerging:
- `dist/index.js` is the bundle: **8.46 MB, built 2026-06-06 02:01:41** (NOT N: era — recent).
- `dist/` subdirectories show files compiled **2026-06-08 01:18-01:19** (today, even more recent — there are loose `.js` files too, not just the bundle).
- The daemon (per ground truth) started 2026-06-08 08:18 — AFTER both builds.

Let me get the PID via netstat (avoiding the PowerShell quoting issue), check whether the running daemon loads the bundle or loose files, and grep for the literal `N:` in the dist bundle and the engine source.

### Assistant | 2026-06-08T15:16:58.738Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:17:01.261Z

[tool_use: Grep]

### User | 2026-06-08T15:17:09.193Z

[tool_result]   TCP    127.0.0.1:3100         0.0.0.0:0              LISTENING       27836

### User | 2026-06-08T15:17:12.318Z

[tool_result] No matches found

### Assistant | 2026-06-08T15:17:25.990Z

PID 27836 confirmed (matches ground truth). The dist `index.js` bundle has **NO `N:` literal**. So the stale path is NOT baked into the bundle string. This points to a **runtime path resolution** (cwd / env / `import.meta.url` captured at launch). Let me trace the actual engine that emits `N:\PRISM\src\tools\dispatchers` — that path looks like a directory scan target. Let me read the engine source and find where it builds that path.

### Assistant | 2026-06-08T15:17:25.991Z

[tool_use: Read]

### User | 2026-06-08T15:17:26.909Z

[tool_result] 1	/**
2	 * AgentSelfAwarenessEngine — Unified PRISM Self-Awareness
3	 *
4	 * AGENT ROADMAP: U-AGT03 (MS1)
5	 *
6	 * Combines CapabilityIndexEngine and EngineDigestEngine to provide
7	 * complete self-awareness of PRISM's capabilities. This is the
8	 * foundation for the internal AI agent's knowledge of itself.
9	 *
10	 * Features:
11	 * - Unified view of dispatchers + engines
12	 * - Cross-referen
... [+11749 chars truncated]

### Assistant | 2026-06-08T15:17:33.492Z

`AgentSelfAwarenessEngine` delegates to `capabilityIndexEngine.search()` and `engineDigestEngine.search()`. Neither contains a hardcoded path. The `N:\PRISM\src\tools\dispatchers` path is almost certainly built by one of those two engines scanning the dispatchers directory. The path `N:\PRISM\src\tools\dispatchers` (note: `src`, not `mcp-server/src`, with backslashes) is the smoking gun. Let me find where that directory scan path is constructed.

### Assistant | 2026-06-08T15:17:35.052Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:17:36.623Z

[tool_use: Grep]

### User | 2026-06-08T15:17:40.602Z

[tool_result] No matches found

### User | 2026-06-08T15:17:41.092Z

[tool_result] 84:      join(process.cwd(), "src", "tools", "dispatchers");
111:      const filePath = join(this.dispatcherDir, file);
311:      .join(" ");

### Assistant | 2026-06-08T15:17:51.574Z

Found the root cause. Line 84 of `CapabilityIndexEngine.ts`:

```
join(process.cwd(), "src", "tools", "dispatchers")
```

This uses `process.cwd()` — the daemon's working directory at launch — NOT a hardcoded path and NOT the bundle. Let me read the full context (lines 75-120) to confirm, and check the daemon's actual cwd via the process environment.

### Assistant | 2026-06-08T15:17:51.574Z

[tool_use: Read]

### User | 2026-06-08T15:17:52.837Z

[tool_result] 70	
71	/**
72	 * CapabilityIndexEngine — Live self-awareness of PRISM capabilities
73	 */
74	export class CapabilityIndexEngine {
75	  private index: CapabilityIndex | null = null;
76	  private dispatcherDir: string;
77	  private lastRefresh: Date | null = null;
78	  private refreshIntervalMs = 5 * 60 * 1000; // 5 minutes
79	
80	  constructor(dispatcherDir?: string) {
81	    // Default to relative
... [+1672 chars truncated]

### Assistant | 2026-06-08T15:17:53.145Z

[tool_use: Bash]

### User | 2026-06-08T15:17:57.841Z

[tool_result] Exit code 1
At line:1 char:95
+ ... -Filter 'ProcessId=27836' -ErrorAction SilentlyContinue; if () { Writ ...
+                                                                  ~
Missing condition in if statement after 'if ('.
At line:1 char:130
+ ... ion SilentlyContinue; if () { Write-Output ('CommandLine: ' + .Comman ...
+                                                                  ~
... [+2076 chars truncated]

### Assistant | 2026-06-08T15:18:05.990Z

Root cause confirmed at the source level. The `$` variables in my PowerShell are being eaten by the Bash tool's shell interpolation. Let me use a PowerShell script file approach or the PowerShell tool directly to get the daemon's working directory — that's the final piece of evidence I need.

### Assistant | 2026-06-08T15:18:06.753Z

[tool_use: PowerShell]

### User | 2026-06-08T15:18:09.940Z

[tool_result] CommandLine : H:\Tools\nodejs\node.exe H:/prism/mcp-server/dist/index.js
ExePath     : H:\Tools\nodejs\node.exe
Created     : 06/08/2026 08:18:05
CurrentListenerPID : 27836

### Assistant | 2026-06-08T15:18:27.258Z

Critical evidence. The daemon command line is `node H:/prism/mcp-server/dist/index.js`. The entry point path is `H:/prism/...` (correct, H:). But the runtime path bug uses `process.cwd()` + `"src/tools/dispatchers"` — note it's `src`, NOT `dist`. So the engine, even in the bundle, scans the **TypeScript source dir relative to cwd**.

Now I need the daemon's actual **working directory** (cwd), which is what `process.cwd()` returns — that determines whether the scan resolves to `N:\...\src\tools\dispatchers` or `H:\...\src\tools\dispatchers`. The command line shows the script path as `H:/prism/...` but the launcher could have set cwd to `N:\PRISM` (the old drive, now remapped). Let me get the working directory directly, and live-reproduce the error via the MCP endpoint.

### Assistant | 2026-06-08T15:18:40.811Z

[tool_use: PowerShell]

### User | 2026-06-08T15:18:41.847Z

[tool_result] ProcName: node  Path: H:\Tools\nodejs\node.exe
--- Does N: drive exist now? ---

[32;1mName[0m[32;1m Root[0m
[32;1m----[0m [32;1m----[0m
A    A:\
B    B:\
C    C:\
D    D:\
E    E:\
F    F:\
G    G:\
H    H:\
I    I:\
J    J:\
K    K:\
L    L:\
M    M:\
O    O:\
P    P:\
Temp C:\Users\wompu\AppData\Local\Temp\

--- src/tools/dispatchers existence check ---
H:/prism/m
... [+135 chars truncated]

### system

... [4 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-08T15:19:14.661Z

[tool_use: PowerShell]

### User | 2026-06-08T15:19:16.634Z

[tool_result] STATUS 200
{"result":{"content":[{"type":"text","text":"{\"error\":\"Missing 'query' parameter\"}"}]},"jsonrpc":"2.0","id":2}

### Assistant | 2026-06-08T15:19:27.223Z

Still "Missing 'query' parameter" even though I'm passing `query`. This suggests the running daemon's dispatcher code for `self_awareness_search` differs from the source I read (line 2010 reads `params.query`). This is itself evidence the dist bundle may be older than the source for this case. But more importantly — the dispatcher signature normalizes params. The arguments may need to be at the `params` level not `arguments`. Let me check how the MCP server unwraps tool-call arguments, and test the action that the ground truth said reproduces the N: error. The ground truth used `prism_session:self_awareness_search`. Let me verify the exact tool name and try the `q` key alone, plus get the daemon cwd definitively.

### Assistant | 2026-06-08T15:19:30.099Z

[tool_use: PowerShell]

### User | 2026-06-08T15:19:48.770Z

[tool_result] [32;1mName[0m
[32;1m----[0m
install-mcp-monitor-task.ps1
install-mcp-priority-guardian-task.ps1
install-mcp-server-task.ps1
install-mcp-server-watchdog-task.ps1
zulu-launch.ps1

--- search for cwd-setting launchers ---

[32;1mFullName[0m
[32;1m--------[0m
H:\prism\.claude\hooks\mcp-daemon-autostart.mjs
H:\prism\mcp-server\START_MCP_SERVER.bat
H:\prism\prism-test-6d0595\script
... [+138 chars truncated]

### Assistant | 2026-06-08T15:19:55.709Z

The launcher is likely `install-mcp-server-task.ps1` (scheduled task) or `mcp-server-supervisor.mjs`. Since the daemon started at 08:18 today, the scheduled task probably launched it. The scheduled task definition stores a `WorkingDirectory` — which is the captured cwd. If that task was registered when the repo was on `N:\PRISM`, the `WorkingDirectory` field would still say `N:\PRISM`, and when the task runs, Windows sets cwd to a path that no longer exists → Node falls back. Let me read the scheduled task's WorkingDirectory and the supervisor's cwd handling.

### Assistant | 2026-06-08T15:20:05.275Z

[tool_use: PowerShell]

### User | 2026-06-08T15:20:07.807Z

[tool_result] === Scheduled tasks matching MCP / PRISM server ===
TASK: PRISM MCP Connectivity Monitor  STATE: Disabled
   Execute: H:\prism\scripts\monitor-mcp-and-reaper.bat
   Args   : 
   WorkDir: H:\prism
TASK: PRISM MCP Server  STATE: Disabled
   Execute: H:\Tools\nodejs\node.exe
   Args   : "H:\PRISM\scripts\mcp-server-supervisor.mjs"
   WorkDir: 
TASK: PRISM MCP Server Watchdog  STATE: Disabled
... [+107 chars truncated]

### Assistant | 2026-06-08T15:20:29.589Z

All three MCP scheduled tasks are **Disabled** and have empty/`H:\prism` WorkingDirectory. So the running daemon (PID 27836, cmdline `node H:/prism/mcp-server/dist/index.js`) was NOT launched by these tasks. It was launched some other way — the cmdline points straight at `dist/index.js`, not the supervisor. That's the `mcp-daemon-autostart.mjs` hook or a manual/launcher start. The cwd is what matters. Let me get the daemon's true cwd definitively using a handle-based method, and check the autostart hook's cwd.

### Assistant | 2026-06-08T15:20:33.404Z

[tool_use: PowerShell]

### User | 2026-06-08T15:20:35.538Z

[tool_result] DAEMON CWD (PID 27836): N:\PRISM\

### Assistant | 2026-06-08T15:20:46.402Z

**ROOT CAUSE DEFINITIVELY PROVEN.** The daemon's working directory is `N:\PRISM\` — a drive that no longer exists.

The chain is now complete and evidence-backed:
1. `CapabilityIndexEngine` constructor (line 84) builds `join(process.cwd(), "src", "tools", "dispatchers")`.
2. The daemon (PID 27836) has `process.cwd()` = `N:\PRISM\` (PEB read confirms).
3. `join("N:\PRISM\", "src", "tools", "dispatchers")` = `N:\PRISM\src\tools\dispatchers` — the exact ENOENT path.
4. N: drive doesn't exist → `ENOENT`.

This is a **runtime cwd bug**, NOT a stale bundle. The bundle (built 2026-06-06) has no `N:` literal. The cwd was inherited from the launching process. Let me confirm what launched it with cwd=N: and verify the fallback dir would also work, then check the autostart hook.

### Assistant | 2026-06-08T15:20:48.636Z

[tool_use: PowerShell]

### User | 2026-06-08T15:20:51.608Z

[tool_result] PID 27836 ParentProcessId: 27684
Parent Name: node.exe
Parent Cmd : H:\Tools\nodejs\node.exe H:/prism/scripts/mcp-server-supervisor.mjs
[31;1mInvalidOperation: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   8 | [0m   $parentCwd = [36;1m[Peb][0m::GetCwd([int]$p.ParentProcessId)[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m                ~~~~~[0m
[31;1m[36;1m[3
... [+105 chars truncated]

### Assistant | 2026-06-08T15:21:03.203Z

The parent is `mcp-server-supervisor.mjs` (PID 27684). The supervisor spawns the daemon and the supervisor itself was started with cwd `N:\PRISM`. Let me confirm the supervisor's cwd and read how it spawns the child (does it pass `cwd` explicitly or inherit?).

### Assistant | 2026-06-08T15:21:05.119Z

[tool_use: PowerShell]

### User | 2026-06-08T15:21:07.182Z

[tool_result] SUPERVISOR CWD (PID 27684): N:\PRISM\

### Assistant | 2026-06-08T15:21:14.469Z

Supervisor cwd is also `N:\PRISM\`. The supervisor inherited cwd `N:\PRISM` from whatever started IT (a terminal/launcher that was opened when the repo lived on N:, or a stale shortcut). The daemon inherits the supervisor's cwd. Let me confirm the daemon inherits cwd (i.e., the spawn doesn't override `cwd`), and verify the fix path. Let me read the supervisor spawn code and check whether any other dispatcher actions use `process.cwd()` (blast radius).

### Assistant | 2026-06-08T15:21:15.048Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:21:15.759Z

[tool_use: Grep]

### User | 2026-06-08T15:21:19.354Z

[tool_result] 13: *   - Spawn `node H:/prism/mcp-server/dist/index.js` with TRANSPORT=http
15: *   - On child exit: exponential backoff respawn (5s → 60s cap). Reset
17: *   - SIGTERM / SIGINT: stop respawn loop, propagate to child, wait 5s for
23: *   --dry-run    Probe + log only, never spawn. Returns 0 if server up, 1 if down.
24: *   --once       Spawn once, exit when child exits. No respawn loop.
39:import
... [+2035 chars truncated]

### User | 2026-06-08T15:21:20.685Z

[tool_result] Found 40 files limit: 40
mcp-server\src\engines\JMDieDocIndexEngine.ts
mcp-server\src\engines\IncrementalLearningEngine.ts
mcp-server\src\engines\ConnectionFinderEngine.ts
mcp-server\src\engines\post-processor\CimcoVerificationBridgeEngine.ts
mcp-server\src\engines\MachineHandbookRegistryEngine.ts
mcp-server\src\engines\MillProgramCorpusEngine.ts
mcp-server\src\engines\QuotingActiveFactorLoaderEng
... [+1770 chars truncated]

### Assistant | 2026-06-08T15:21:27.918Z

Critical finding on blast radius: **40+ engines use `process.cwd()`** — so this `N:\PRISM` cwd bug is NOT isolated to `self_awareness_search`. Every `process.cwd()`-relative path resolution in the daemon resolves against the dead `N:\` drive. `self_awareness_search` is just the most visible symptom. Let me confirm the supervisor spawn does NOT set `cwd` (so it inherits N:), by reading the spawn options block.

### Assistant | 2026-06-08T15:21:27.918Z

[tool_use: Read]

### User | 2026-06-08T15:21:30.871Z

[tool_result] 192	function spawnChild() {
193	  if (stopping) return;
194	  log("info", "Spawning MCP server", { entry: SERVER_ENTRY, host: SERVER_HOST, port: SERVER_PORT });
195	  const startedAt = Date.now();
196	  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
197	  // killed every ~14 min (exit code 0xFFFFFFFF = Windows abnormal kill) at
198	  // RSS 720MB / heap 624/664MB — past N
... [+1631 chars truncated]

### Assistant | 2026-06-08T15:21:41.854Z

Confirmed. The `spawn()` call at line 210 has **NO `cwd` option** — so the child inherits the supervisor's cwd (`N:\PRISM`). And the `env` spreads `...process.env` which carries no path correction. This is the complete root-cause chain.

Now the fix-class determination. The bug is: (a) the supervisor was launched with cwd `N:\PRISM`, AND (b) the spawn doesn't pin cwd, AND (c) the engine uses `process.cwd()` for path resolution. Let me verify two things to nail down the recommended fix: whether `SERVER_ENTRY` is `H:` (so a restart from the right cwd fixes it immediately) and whether the supervisor has any `process.chdir`. Then I have everything.

### Assistant | 2026-06-08T15:21:41.856Z

[tool_use: Grep]

### Assistant | 2026-06-08T15:21:42.844Z

[tool_use: Grep]

### User | 2026-06-08T15:21:45.510Z

[tool_result] No matches found

### User | 2026-06-08T15:21:46.308Z

[tool_result] No matches found

### Assistant | 2026-06-08T15:21:58.756Z

The supervisor has no `process.chdir()` and `index.ts` doesn't reset cwd. So neither the supervisor nor the daemon corrects the inherited `N:\PRISM` cwd. The fix decision is now fully determined by evidence. Let me do one final confirmation — that the supervisor (27684) also has no parent that would re-launch it with N: cwd on restart (i.e., is the bad cwd "sticky" across restarts?), and verify the canonical fix path resolves.

### Assistant | 2026-06-08T15:22:01.314Z

[tool_use: PowerShell]

### User | 2026-06-08T15:22:05.169Z

[tool_result] Supervisor 27684 ParentPID: 38212
Grandparent GONE (supervisor was detached / launcher exited) — N: cwd is orphaned-inherited
--- Confirm the CORRECT scan dir exists (proves a cwd-corrected restart fixes it) ---
H:/prism/mcp-server + src/tools/dispatchers : True
If cwd=H:/prism      -> H:/prism/src/tools/dispatchers exists: True
If cwd=H:/prism/mcp-server -> .../src/tools/dispatchers exists: 
... [+4 chars truncated]

### Assistant | 2026-06-08T15:22:11.834Z

I have everything needed. One subtle but important nuance surfaced: there are **two** `src/tools/dispatchers` dirs — `H:/prism/src/tools/dispatchers` AND `H:/prism/mcp-server/src/tools/dispatchers` both exist. The engine joins `cwd + "src/tools/dispatchers"`, so the daemon's cwd must be either `H:/prism` or `H:/prism/mcp-server` for the scan to resolve. With cwd=`N:\PRISM`, neither resolves. Let me verify the supervisor's correct intended cwd by checking the autostart hook and the daemon-supervisor for any cwd intent, to give the precise remediation.

### Assistant | 2026-06-08T15:22:13.053Z

[tool_use: Grep]

### User | 2026-06-08T15:22:16.209Z

[tool_result] 8: * instead of each spawning their own stdio process.
13:import { spawn } from "child_process";
16:const DAEMON_HELPER = "H:/prism/.claude/helpers/mcp-server-daemon.mjs";
53:    const child = spawn(process.execPath, [DAEMON_HELPER, "start"], {

### Assistant | 2026-06-08T15:22:19.543Z

I have a complete, evidence-backed root cause and fix determination. Let me close out the stale in-progress task and deliver the report.

### Assistant | 2026-06-08T15:22:19.840Z

[tool_use: TaskUpdate]

### User | 2026-06-08T15:22:23.548Z

[tool_result] Updated task #1 status

### Assistant | 2026-06-08T15:23:12.029Z

PRISM MCP :3100 STALE-N: BUG — VERIFICATION + ROOT-CAUSE REPORT
Verdict: ROOT CAUSE CONFIRMED. It is a RUNTIME CWD bug, NOT a stale dist bundle. Fix = operator-gated DAEMON RESTART with a corrected working directory (plus a recommended one-line code hardening to make it permanent). No rebuild needed; no source edit strictly required to unblock.

=== CHECK 1 — Daemon up? PASS ===
Command: `curl -s -m4 -o nul -w "%{http_code}" http://127.0.0.1:3100/mcp`
Output: `HTTP_CODE=405` (correct for MCP-over-HTTP GET).
Listener: `netstat -ano | findstr ":3100"` → `TCP 127.0.0.1:3100 ... LISTENING 27836`.
Process: `Get-CimInstance Win32_Process -Filter 'ProcessId=27836'` → CommandLine `H:\Tools\nodejs\node.exe H:/prism/mcp-server/dist/index.js`, Created `06/08/2026 08:18:05`. Matches ground truth exactly.

=== CHECK 2 — ROOT CAUSE of N:\PRISM path: RUNTIME process.cwd(), not a hardcoded source path ===
The prompt's lead ("PRISMSelfAwarenessEngine.ts:162 hardcodes H:/prism") is a RED HERRING for this action. The `self_awareness_search` case (sessionDispatcher.ts:2008-2025) does NOT touch PRISMSelfAwarenessEngine. It calls `agentSelfAwarenessEngine.search()` → which fans out to `capabilityIndexEngine.search()` + `engineDigestEngine.search()`.

The offending path is built in `H:/prism/mcp-server/src/engines/CapabilityIndexEngine.ts:80-85`:
```
constructor(dispatcherDir?: string) {
  this.dispatcherDir =
    dispatcherDir ||
    join(process.cwd(), "src", "tools", "dispatchers");   // line 84
}
```
`buildIndex()` then `readdir(this.dispatcherDir)` (line 101). So the scan target = `<process.cwd()>/src/tools/dispatchers`. It scans the TypeScript SOURCE dir relative to cwd — NOT a persisted index, NOT an env var, NOT the dist bundle, NOT a hardcoded literal.

I read the daemon's TRUE working directory directly from its PEB (NtQueryInformationProcess → RTL_USER_PROCESS_PARAMETERS.CurrentDirectory, P/Invoke):
- DAEMON CWD (PID 27836): `N:\PRISM\`
- SUPERVISOR CWD (PID 27684, parent): `N:
... [+5943 chars truncated]
