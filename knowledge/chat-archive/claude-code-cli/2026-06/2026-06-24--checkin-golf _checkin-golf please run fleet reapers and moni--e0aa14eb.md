---
type: "chat-session"
source: "claude-code-cli"
session_id: "e0aa14eb-96ac-4068-9e34-949b091a0374"
title: "checkin-golf /checkin-golf please run fleet reapers and monitors and monitor pc "
date: "2026-06-24"
first_ts: "2026-06-24T13:13:37.849Z"
last_ts: "2026-06-24T17:36:18.015Z"
cwd: "H:\\prism"
messages: 223
user_msgs: 92
assistant_msgs: 131
raw_file: "H:/.claude/projects/H--prism/e0aa14eb-96ac-4068-9e34-949b091a0374.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:53"
---

# checkin-golf /checkin-golf please run fleet reapers and monitors and monitor pc 

> **claude-code-cli** | 2026-06-24 | 223 msgs (92 user / 131 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e0aa14eb-96ac-4068-9e34-949b091a0374.jsonl`

## Transcript

### User | 2026-06-24T13:15:01.163Z

<command-message>checkin-golf</command-message>
<command-name>/checkin-golf</command-name>
<command-args>please run fleet reapers and monitors  and monitor pc health periodically. memory is currently at 100% which is unusual</command-args>

### User | 2026-06-24T13:15:01.163Z

# /checkin-golf — slot-locked /checkin + fleet-reaper owner

Force-takes the **golf** slot (evicting any prior owner with `--force true --confirmRecent true`), binds the handoff to `golf-work`, **always runs the fleet-reaper** (golf owns it for the 13-chat fleet as of 2026-05-16 — see [[feedback_golf_owns_reaper]]), then runs the standard `/checkin` pipeline.

> **Doctrine shift 2026-05-16:** fleet-reaper ownership moved from **alpha → golf** to unify all fleet-hygiene under one slot (golf already hosts fleet-memory-monitor). The `golf-slot-reaper-guardian.mjs` SessionStart + UserPromptSubmit hook is the silent backstop; this skill makes the doctrine non-skippable on every explicit `/checkin-golf`. The prior `/checkin-alpha` fleet-reaper section has been removed. See [[feedback_alpha_owns_reaper]] (SUPERSEDED).

**Operator directive carry-over (2026-05-16, earlier in the day):** this skill claims golf as a **normal work slot**, NOT the legacy hygiene chat. It does NOT pass the `--golf` flag to `chat-slots.claim` (that flag was the historic hygiene-mode marker; the slot itself is just a string key).

## ⚠️ Pre-flight: disable or bypass the legacy allowlist hook

The `golf-slot-write-allowlist.mjs` PreToolUse hook still fires for any chat whose chat-slots state has `slot==="golf"` — it doesn't care which skill claimed the slot. It will block writes outside the legacy hygiene allowlist (named ledger/dashboard paths only).

Before doing real work in golf, choose ONE:

```bash
# Option A — session-scoped bypass (preferred for a single chat)
export PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1
# (bypass writes are logged to state/shared/golf-bypass.jsonl)

# Option B — disable the hook globally (edit C:/Users/wompu/.claude/settings.json only;
# the c-to-h-mirror hook auto-replicates to H:/.claude/settings.json on Edit/Write tool events,
# OR cp manually after a node-driven splice).
# Locate the PreToolUse entry referencing golf-slot-write-allowlist.mjs and rem
... [+4946 chars truncated]

### Assistant | 2026-06-24T13:15:47.856Z

I'll treat the work order as primary: **memory at 100% is the urgent signal**. Let me bind the golf slot (minimal preamble), run the reaper, and diagnose the RAM in parallel.

### Assistant | 2026-06-24T13:15:49.185Z

[tool_use: Bash]

### User | 2026-06-24T13:15:58.081Z

[tool_result] {
  "ok": true,
  "slot": "golf",
  "state": {
    "chatId": "claude-e0aa14eb",
    "host": "DESKTOP-N7MI1VB",
    "pid": 45068,
    "claimedAt": "2026-06-24T13:15:03.731Z",
    "lastHeartbeat": "2026-06-24T13:15:56.978Z",
    "branch": "slot/golf",
    "topic": "golf-work",
    "activity": "checkin",
    "terminalWindowId": "tw-wt-06b21247-aaa4-4385-a864-f48967c61832",
    "pipelineStep": null,
 
... [+81 chars truncated]

### Assistant | 2026-06-24T13:16:04.849Z

Golf slot claimed (`alreadyOwned: true`, branch `slot/golf`). Now the two diagnostics in parallel — reaper sweep + actual RAM breakdown:

### Assistant | 2026-06-24T13:16:06.327Z

[tool_use: Bash]

### Assistant | 2026-06-24T13:16:13.858Z

[tool_use: PowerShell]

### User | 2026-06-24T13:16:19.778Z

[tool_result]     "prewarmError": null,
    "hintWritten": false,
    "hintError": null,
    "reason": "GPU free 15957MB < 24576MB floor",
    "skipped": "GPU free 15957MB < 24576MB floor",
    "error": null
  },
  "mcpZombieHunt": {
    "engaged": true,
    "reaped": 0,
    "freedMb": 0,
    "candidates": 0,
    "byReason": {
      "dead-parent": 0,
      "non-claude-parent": 0,
      "no-parent-info": 0
    }
... [+830 chars truncated]

### User | 2026-06-24T13:16:21.417Z

[tool_result] === PHYSICAL RAM ===
Total: 127.1 GB | Used: 28.3 GB | Free: 98.8 GB | Used%: 22.3
InstalledPhysical: 127.1 GB
=== COMMIT (page file) ===
CommitLimit: 288.4 GB | CommitFree: 41.5 GB
=== TOP 20 BY WORKING SET ===

 WS_MB    Id ProcessName
 -----    -- -----------
897.00 28356 llama-server
861.00 46100 node
860.00 58860 node
856.00 20620 node
855.00 46292 node
853.00 61168 node
848.00
... [+472 chars truncated]

### Assistant | 2026-06-24T13:16:53.565Z

**Critical finding — physical RAM is NOT at 100%.** My snapshot shows **22.3% used (28.3 GB of 127 GB, 98.8 GB free)**. The reaper found **zero orphans** (clean). Two things stand out as the likely source of the "100%" reading: **GPU VRAM** (reaper reports only ~16 GB free → ~83% used, `llama-server` resident) and **commit charge** (~86%). Let me confirm which gauge the operator actually saw before chasing a phantom:

### Assistant | 2026-06-24T13:16:56.387Z

[tool_use: PowerShell]

### User | 2026-06-24T13:16:57.763Z

[tool_result] === GPU (nvidia-smi) ===
NVIDIA RTX PRO 6000 Blackwell Workstation Edition, 97887 MiB, 80737 MiB, 15915 MiB, 2 %, 0 %
=== GPU processes ===
2940, C:\Windows\System32\dwm.exe, [N/A]
15744, C:\Program Files\WindowsApps\Microsoft.WindowsTerminal_1.24.11321.0_x64__8wekyb3d8bbwe\WindowsTerminal.exe, [N/A]
14508, C:\Windows\explorer.exe, [N/A]
16412, C:\Windows\SystemApps\Microsoft.Windows.StartMe
... [+2168 chars truncated]

### Assistant | 2026-06-24T13:17:00.243Z

[tool_use: Bash]

### User | 2026-06-24T13:17:14.918Z

[tool_result] === ollama loaded models ===
nomic-embed-text:latest | size: 0.3 GB | vram: 0.3 GB
qwen2.5-coder:1.5b | size: 5.1 GB | vram: 5.1 GB
qwen2.5-coder:32b | size: 54.7 GB | vram: 54.7 GB
=== node processes with parent (orphan check) ===
  · hold pid 15832   git.exe       4M    185s  unowned            owner=—  confirming (57s/600s — ~544s left)
    keep pid 51376   node.exe      3M    279s  protected  
... [+2976 chars truncated]

### Assistant | 2026-06-24T13:18:39.245Z

Now I have the real picture. Let me reconcile and verify the one anomaly — **5 `llama-server` processes but Ollama only tracks 3 models** (2 may be orphaned, holding VRAM) — plus confirm the durable reaper task exists:

### Assistant | 2026-06-24T13:18:44.559Z

[tool_use: PowerShell]

### Assistant | 2026-06-24T13:18:44.599Z

[tool_use: TaskList]

### User | 2026-06-24T13:18:47.077Z

[tool_result] === llama-server processes + parents (orphan check) ===
pid 18620 | ppid 13240 DEAD-PARENT | WS 1MB | age 3511s
pid 18280 | ppid 26224 DEAD-PARENT | WS 1MB | age 2101s
pid 50196 | ppid 57948 ALIVE(ollama) | WS 21MB | age 573s
pid 62368 | ppid 57948 ALIVE(ollama) | WS 25MB | age 566s
pid 28356 | ppid 57948 ALIVE(ollama) | WS 5278MB | age 563s
=== ollama parent tree ===
ollama pid 57948 ppid 
... [+308 chars truncated]

### User | 2026-06-24T13:18:47.930Z

[tool_result] No tasks found

### Assistant | 2026-06-24T13:19:12.096Z

Now it's clear. **Two of the five `llama-server` processes are confirmed orphans** (dead parents, ~35–58 min old, 1 MB WS) — leftovers from a prior Ollama instance that the live Ollama (pid 57948, with its own 3 fresh llama-servers) can't unload. These are the classic ancestry-confirmed orphans golf's GPU-coordinator mandate covers, and they're the likely source of untracked VRAM. The durable **"PRISM Fleet Reaper" task is armed** (Status: Ready). Reaping the 2 orphans now, with VRAM measured before/after to prove the effect:

### Assistant | 2026-06-24T13:19:17.321Z

[tool_use: PowerShell]

### User | 2026-06-24T13:19:22.221Z

[tool_result] VRAM before: used 80743 MiB / free 15909 MiB
[31;1mWriteError: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   3 | [0m foreach ([36;1m$pid[0m in 18620,18280) {[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m          ~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mCannot overwrite variable PID because it is read-only or constant.
... [+134 chars truncated]

### Assistant | 2026-06-24T13:19:29.228Z

`$pid` is a read-only automatic variable in PowerShell — the loop errored before killing. Retrying with a safe variable name:

### Assistant | 2026-06-24T13:19:32.980Z

[tool_use: PowerShell]

### User | 2026-06-24T13:19:43.949Z

[tool_result] VRAM before: used 80744 MiB / free 15908 MiB
reaped orphan llama-server pid 18620 (dead-parent)
reaped orphan llama-server pid 18280 (dead-parent)
VRAM after:  used 62288 MiB / free 34364 MiB
VRAM freed:  18456 MiB
remaining llama-server count: 4
Shell cwd was reset to H:\prism

### Assistant | 2026-06-24T13:20:29.675Z

**Root cause found and fixed — and the operator's instinct was right.** The 2 orphaned `llama-server` processes were pinning **~18 GB of GPU VRAM** the live Ollama couldn't reclaim. Reaping them dropped GPU VRAM from **80.7 GB → 62.3 GB used** (free: 15.9 GB → **34.4 GB**), which also clears the reaper's GPU-coordinator floor (was blocked at `<24576MB free`, now 34 GB free).

Now setting up the **periodic PC-health monitor** the operator asked for — a session-recurring check that re-snapshots RAM/GPU and reaps any new dead-parent `llama-server` orphans (the exact leak that just occurred, which the standard reaper doesn't cover):

### Assistant | 2026-06-24T13:20:35.972Z

[tool_use: CronCreate]

### User | 2026-06-24T13:20:37.535Z

[tool_result] Scheduled recurring job 3809e2f0 (14,44 * * * *). Session-only (not written to disk, dies when Claude exits). Auto-expires after 7 days. Use CronDelete to cancel sooner.

### Assistant | 2026-06-24T13:21:06.274Z

Done. Here's the picture, with the headline correction first.

## The "100% memory" was GPU VRAM, not system RAM — and it was an orphan leak

**System RAM was never near 100%** — it's at **23% (97 GB free of 127 GB)**, stable across reads. The gauge reading ~full was **GPU VRAM at 82.5%** (80.7 GB of 97.9 GB). Your instinct that it was "unusual" was correct — the cause was a real leak, not normal resident-model usage:

- **2 orphaned `llama-server` processes** (dead parent PIDs, 35 & 58 min old) left behind by a prior Ollama instance. The live Ollama (pid 57948) had already spawned its own 3 fresh llama-servers for its 3 tracked models, so it couldn't reclaim the orphans' VRAM.
- **Reaped both → freed 18.1 GB of VRAM.** GPU went 80.7 GB → **62.3 GB used**, free 15.9 GB → **34.4 GB**. That 62 GB now matches the 3 legitimately-resident models (qwen2.5-coder:32b 54.7 GB + 1.5b 5.1 GB + nomic-embed 0.3 GB).
- Side benefit: the fleet-reaper's GPU coordinator was **blocked** (`free 15957MB < 24576MB floor`) — it can prewarm/route again now that 34 GB is free.

## Reapers & monitors — status

| Item | State |
|---|---|
| `golf` slot | Claimed (`claude-e0aa14eb`, branch `slot/golf`) |
| Fleet-reaper sweep (this run) | **0 node/bash/MCP orphans** — node side is clean (40 node procs, all ancestry-confirmed to live chats) |
| Durable **"PRISM Fleet Reaper"** task | ✅ Armed, Status **Ready**, 5-min cadence (runs independent of this chat) |
| Periodic PC-health monitor | ✅ Created cron `3809e2f0` — every 30 min (:14/:44), session-only, auto-expires in 7 days. Checks RAM%, GPU VRAM, and **reaps dead-parent `llama-server` orphans** each fire |

## Two notes

1. **Gap flagged:** the standard fleet-reaper sweep reaps node/bash/MCP orphans but **not** orphaned `llama-server` processes — which is exactly what leaked your VRAM. The cron I set covers it operationally for this session; a permanent fix would be teaching `fleet-reaper-sweep.mjs` to reap dead-parent `llama-server` by ancest
... [+476 chars truncated]

### User | 2026-06-24T13:21:11.313Z

Stop hook feedback:
["H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs]: No stderr output

### User | 2026-06-24T13:29:40.539Z

build it, is it possible to run multiple instances of claude desktop app by doing installs on different ssds or do we absolutely need a different windows instance running at the same time? can we utilize wsl to run multiple instances of claude desktop app?

### Assistant | 2026-06-24T13:31:54.379Z

Before I answer, the Stop-gate note (`wt-tab-focus.test.mjs` stale report) is a peer chat's edit in the shared tree — I made no file changes this session, so it's not mine to chase; I'll handle the gate at Stop.

This is a factual question about the **Claude Desktop app** (not the API), and I shouldn't answer it from memory — especially since the app is installed *on this very machine*. Let me ground the answer in hard evidence first: inspect the local install + its single-instance mechanism, then fan out web verification of the parts I can't see locally.

### Assistant | 2026-06-24T13:32:00.117Z

[tool_use: PowerShell]

### User | 2026-06-24T13:32:04.279Z

[tool_result] === Claude Desktop package identity ===

Name              : Claude
PackageFullName   : Claude_1.15200.0.0_x64__pzs8sxrjxfjjc
PackageFamilyName : Claude_pzs8sxrjxfjjc
InstallLocation   : C:\Program Files\WindowsApps\Claude_1.15200.0.0_x64__pzs8sxrjxfjjc
Version           : 1.15200.0.0
Architecture      : X64
SignatureKind     : Developer


=== Per-user data dir (proves state is per-user
... [+1428 chars truncated]

### Assistant | 2026-06-24T13:34:18.219Z

I've got the hard local facts now. Here's what the machine itself confirms, then I'll verify the post-cutoff/web pieces rigorously before giving you the final matrix.

**What's confirmed on this box (direct evidence):**
- Claude Desktop is an **MSIX/AppX package** (`Claude_pzs8sxrjxfjjc`, installed under OS-managed `C:\Program Files\WindowsApps\...`, `SignatureKind=Developer` = sideloaded). The install path is **chosen by Windows, not you** — you can't point it at a different SSD, and the same package identity can't be installed twice for one user account.
- State is **per-Windows-user**: `%APPDATA%\Claude` = **11.7 GB** (worth a hygiene look separately — that's large).
- One running instance = a **tree of ~23 `claude.exe` Electron processes** (main + GPU + renderers), all from the single 7:16 launch.
- **WSL2 is present** (Ubuntu + docker-desktop, both stopped).

**The immediate implications** (firm): "different SSD" won't give you a second instance (MSIX identity + the app's single-instance lock collapse it); and **WSL can't run it** — WSL executes *Linux* binaries, the app is a Windows MSIX, and there's no Linux build to run under WSLg. You do **not** need a whole separate physical PC, though — a second Windows *user session*, a VM/Windows Sandbox, or a namespace-isolating sandbox (Sandboxie-Plus) are the real routes.

Per ultracode I'm running a verification + decision-matrix workflow to confirm the post-January facts (Linux-app status in June 2026, Sandboxie's current MSIX support, WSLg specifics) and adversarially check each claim before I commit to it:

### Assistant | 2026-06-24T13:34:49.719Z

[tool_use: Workflow]

### User | 2026-06-24T13:34:50.029Z

[tool_result] [fanout-gate] Workflow spawn flagged (model=inherit, tier=3, ~8 agents, cost=24).
  - cost: projected spawn cost 24 >= cap 12 (tier x prompt-KB / concurrency)
FALLBACK LADDER (R5): route mine/read/summarize/classify arms to Ollama (free) or model:'sonnet'; reserve opus for judgment/synthesis. Serialize bursts -- spawn sequentially or in one parallel() barrier, not back-to-back messages.
Override: 
... [+135 chars truncated]

### Assistant | 2026-06-24T13:35:07.247Z

Good — the fanout gate is right to push back; 10 agents is overkill for a research question, and per the R5/R7 fallback ladder I'll respect the guard rather than force-override. I'll do the web verification directly with parallel searches (I already hold the decisive local evidence) and synthesize myself:

### Assistant | 2026-06-24T13:35:07.719Z

[tool_use: WebSearch]

### system

... [143 middle messages omitted -- see raw_file] ...

### User | 2026-06-24T14:51:33.957Z

[tool_result] Cancelled job 3809e2f0.

### Assistant | 2026-06-24T14:51:48.309Z

Done. **Cron `3809e2f0` retired** — no more periodic health-check turns from me, so that source of hook flashes is gone. PC health is still watched independently by the durable **Fleet Reaper** (every 5 min) and **Fleet Memory Monitor** tasks, which run in session 0 (no windows) — so you lose nothing on monitoring, just the flashing.

Net state on your popup problem:
- **Persistent scheduled-task windows** → fixed (S4U).
- **My 30-min monitoring cron** → stopped (was adding flashes).
- **Per-turn hook flashes** → harness-level git-bash limitation, no supported fix; janitor closes leftovers. Only Anthropic can truly eliminate these.

Standing offer (say the word): I'll **draft the Anthropic feature request** (windowsHide on Windows hook-shell spawns, with the exact `claude.exe → Git\bin\bash.exe -c -l` evidence) for you to paste into `/feedback`. That's the one path to killing the remaining flashes for good. Otherwise I'm done here.

### User | 2026-06-24T14:51:53.918Z

Stop hook feedback:
["H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs]: No stderr output

### User | 2026-06-24T16:24:01.706Z

fix whatever is causing themcp server to drop again

### Assistant | 2026-06-24T16:25:55.155Z

MCP server is down again (`:3100` timeout) — and this is squarely golf's domain (MCP lifecycle). You want the recurring *cause* fixed, not just a bounce. Bash/PowerShell still work (MCP-independent), so let me diagnose the actual root cause before restarting — pileup vs OOM/commit-exhaustion vs hung daemon vs supervisor failure all have different fixes:

### Assistant | 2026-06-24T16:25:58.002Z

[tool_use: Bash]

### User | 2026-06-24T16:26:05.135Z

[tool_result] === singleton-service-guard diagnose (read-only) ===
[singleton-guard] ⚠ degraded
  ✗ mcp: up but 3 daemons — reap 2 non-serving duplicate(s), keep 54160
=== curl :3100 (refused vs timeout vs slow) ===
HTTP/1.1 200 OK
X-Powered-By: Express
Accept-Ranges: bytes
Cache-Control: public, max-age=0
=== supervisor log tail ===
(no supervisor log)

### Assistant | 2026-06-24T16:26:05.292Z

[tool_use: PowerShell]

### User | 2026-06-24T16:26:09.227Z

[tool_result] === :3100 listeners ===
LISTEN pid 54160 node
=== MCP daemon node procs (pileup check) ===
count: 3
  pid 54160 ppid 3588 age=11538s
  pid 60596 ppid 11520 age=9898s
  pid 11452 ppid 11520 age=9847s
=== commit charge (>96% = spawn failures, documented MCP-launch cause) + RAM ===
commit: 134 / 290.4 GB (46.1%)
RAM: 38.4% used | free 78.2 GB
=== MCP supervisor + watchdog tasks ===
[Disabl
... [+206 chars truncated]

### Assistant | 2026-06-24T16:27:02.863Z

The server is actually **up** (curl → `HTTP/1.1 200 OK`, pid 54160 serving) — the "timeout" was a transient under-load probe failure. But the real problem is clear: a **daemon pileup — 3 MCP daemons** (54160 serving, plus 60596 + 11452 as ~2.7h-old non-serving duplicates). Commit/RAM are healthy (46%/38%), so this isn't OOM. The supervisor's last result `2147946720` = `0x80070420` = ERROR_SERVICE_ALREADY_RUNNING (it correctly backs off). So duplicates are accumulating from chat auto-reconnects spawning without reaping first.

Reaping the pileup now (the guard's own prescribed safe action) + reading the prior-art on why this recurs, so I fix the *cause* not just the symptom:

### Assistant | 2026-06-24T16:27:05.233Z

[tool_use: Bash]

### Assistant | 2026-06-24T16:27:05.722Z

[tool_use: Read]

### Assistant | 2026-06-24T16:27:06.468Z

[tool_use: Read]

### User | 2026-06-24T16:27:19.130Z

[tool_result] === singleton-service-guard --fix (reap 2 non-serving dupes, keep serving 54160) ===
[singleton-guard] ⚠ degraded
  ✗ mcp: up but 3 daemons — reap 2 non-serving duplicate(s), keep 54160  → reaped 60596,11452
=== re-verify singleton state ===
[singleton-guard] ✓ all singletons healthy
  ✓ mcp: up, single daemon
=== :3100 still serving? ===
HTTP/1.1 200 OK
X-Powered-By: Express

### User | 2026-06-24T16:27:23.036Z

[tool_result] 1	---
2	name: mcp-supervisor-persistence-fix-2026-05-31
3	description: "Permanent fix for MCP :3100 going unsupervised — the PRISM MCP Server supervisor task was fire-once (Boot/Logon) and died LastResult=2 on 05/29, so nothing relaunched the supervisor. golf added a 3-min repeating trigger + patched the installer."
4	type: reference
5	source: prism-memory
6	synced: 2026-06-24T16:25:33.971Z
7	alia
... [+2855 chars truncated]

### User | 2026-06-24T16:27:23.052Z

[tool_result] 1	---
2	name: reference_mcp_fleet_scale_fix_2026_05_29
3	description: Fleet 26-chat MCP-disconnect + slash-command-starvation root cause + the fix set applied (prism_safe drop, probe fix, command sync, tsserver cap) vs deferred (rebuild/watchdog/limiter/narrowing → golf)
4	type: reference
5	source: prism-memory
6	synced: 2026-06-24T16:25:33.963Z
7	aliases: reference_mcp_fleet_scale_fix_2026_05_29

... [+2504 chars truncated]

### Assistant | 2026-06-24T16:28:24.032Z

Pileup reaped — **clean singleton, `:3100` still serving (200 OK)**. The prior-art makes the recurring cause crystal clear, and it's important I'm honest about whose domain it is:

**The true root cause is a server-core memory leak** — `mcp-server/src/index.ts:973-983` has a per-request `server.connect(transport)` closure leak (~10MB/min) that OOM-crashes the daemon every few hours → ~40-50s cold-boot → chats see "disconnected," and racing reconnects leave the pileup I just reaped. The structural fix is `U-MCP-FACTORY-REFACTOR` (per-session McpServer factory) — that's **server-core, papa/backend domain, risky, an explicitly deferred milestone** (MCP-CAPACITY-MS0). I'm not going to casually rewrite the server core as golf.

But there's a **golf-domain durable mitigation** the fleet-scale memory flagged as deferred-to-golf: a **preemptive RSS watchdog** that SIGTERMs the daemon *before* it OOM-crashes → clean fast respawn instead of a hard crash + pileup. Let me check if the leak is active right now and whether that watchdog exists or is the gap:

### Assistant | 2026-06-24T16:28:30.179Z

[tool_use: PowerShell]

### User | 2026-06-24T16:28:32.543Z

[tool_result] === serving daemon 54160: is the leak active? (baseline ~770MB; ~10MB/min leak) ===
WS 845 MB | age 195 min
=== supervisor (PT3M repeat present? = 05-31 persistence fix intact) ===
trigger MSFT_TaskBootTrigger rep=
trigger MSFT_TaskLogonTrigger rep=
trigger MSFT_TaskTimeTrigger rep=PT3M
action: node.exe "H:\PRISM\scripts\mcp-server-supervisor.mjs"
=== watchdog cadence + what it runs ===
re
... [+105 chars truncated]

### Assistant | 2026-06-24T16:28:35.918Z

[tool_use: Bash]

### User | 2026-06-24T16:28:40.790Z

[tool_result] === is there a preemptive RSS watchdog for the MCP daemon? (golf-deferred item) ===
=== the watchdog script — reactive /health only, or RSS-preemptive? ===
watchdog file: scripts/mcp-server-watchdog.mjs*
=== supervisor script: does it cap/SIGTERM on RSS? ===
17: *   - SIGTERM / SIGINT: stop respawn loop, propagate to child, wait 5s for
35: * SIGTERM/exit. Re-run the scheduled-task installer's -Uni
... [+280 chars truncated]

### Assistant | 2026-06-24T16:29:48.957Z

Key correction (R12): the live daemon (54160) is at **845 MB after 3.25 hours** — that's *healthy*, **not** the ~10MB/min leak the 05-31 memory described (which would be ~2 GB by now). So the recurring drop is **not** an active OOM-crash right now. The supervision triad is fully armed (supervisor `PT3M` + watchdog `PT5M`, both intact). 

So the actual recurring driver is the **daemon pileup** (racing reconnects spawning duplicates that never get reaped between guard runs) plus transient under-load probe timeouts that *look* like drops. The question that decides the fix: does the already-running 5-min watchdog reap pileup, or only health-probe? Reading it:

### Assistant | 2026-06-24T16:29:49.060Z

[tool_use: Read]

### User | 2026-06-24T16:29:50.485Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+20683 chars truncated]

### Assistant | 2026-06-24T16:31:27.375Z

Now I understand the gap precisely. The watchdog (PT5M) handles **wedge** (kill+respawn on 2 failed /health probes), **RSS-preempt** (orderly restart at 18 GB — Blackwell-tuned), and **boot-guard** — but it is **completely blind to daemon pileup**: as long as *one* daemon answers `/health`, it's satisfied and never reaps the duplicates. And nothing runs the singleton guard on a schedule — it's on-demand only. **That's the recurring cause**: racing reconnects spawn duplicates, and they accumulate unreaped between manual guard runs until a port-race causes the "drop."

The fix is squarely golf's lane and low-risk: schedule the already-proven guard so the singleton is **continuously** enforced. Registering it (S4U/hidden, per my earlier window fix — no popup):

### Assistant | 2026-06-24T16:31:34.216Z

[tool_use: PowerShell]

### User | 2026-06-24T16:31:42.516Z

[tool_result] Exit code 1
[31;1mRegister-ScheduledTask: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m  11 | [0m   [36;1mRegister-ScheduledTask -TaskName $tn -Action $action -Trigger $trig[0m …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | 
... [+2458 chars truncated]

### Assistant | 2026-06-24T16:32:32.005Z

Two glitches: PowerShell rejected the `[TimeSpan]::MaxValue` repetition duration (so the task wasn't actually created — `Get-ScheduledTask` confirms it's absent, no partial state), and I used Unix `tail` in PowerShell. Retrying with the canonical indefinite-repetition pattern (`.Repetition.Interval = 'PT10M'`) and proper error handling:

### Assistant | 2026-06-24T16:32:38.283Z

[tool_use: PowerShell]

### User | 2026-06-24T16:32:48.177Z

[tool_result] [31;1mInvalidOperation: [0m
[31;1m[36;1mLine |[0m
[31;1m[36;1m[36;1m   6 | [0m [36;1m$trigger.Repetition.Interval = 'PT10M'[0m   # repeat every 10 min, indef …[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m     | [31;1m ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
[31;1m[36;1m[36;1m[0m[36;1m[0m[36;1m[31;1m[31;1m[36;1m     | [31;1mThe property 'Interval' cannot be found on
... [+298 chars truncated]

### Assistant | 2026-06-24T16:33:13.739Z

Task registered but my `.Repetition.Interval` assignment failed silently — so it's currently a **one-shot** (`interval=` empty), which won't periodically reap. The task ran clean once (lastResult=0, singleton healthy). Fixing the trigger to actually repeat every 10 min via the CIM repetition pattern (the cross-version-reliable method):

### Assistant | 2026-06-24T16:33:16.996Z

[tool_use: PowerShell]

### User | 2026-06-24T16:33:19.303Z

[tool_result] trigger updated
FINAL: state=Ready logon=S4U repeat-interval=PT10M hidden=True
nextRun=06/24/2026 11:43:43
Shell cwd was reset to H:\prism

### Assistant | 2026-06-24T16:33:44.945Z

**Fixed durably.** The MCP Singleton Guard task is now `Ready`, `S4U`/hidden (no popup), repeating **every 10 min** (`PT10M`), running the proven `singleton-service-guard.mjs --fix`. That closes the gap permanently. Recording the diagnosis so it's not re-derived:

### Assistant | 2026-06-24T16:34:08.166Z

[tool_use: Write]

### User | 2026-06-24T16:34:15.222Z

[tool_result] File created successfully at: C:\Users\wompu\.claude\projects\H--prism\memory\reference_mcp_daemon_pileup_periodic_guard_2026_06_24.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T16:34:37.595Z

Done — MCP server is fixed at both layers:

**Immediate:** pileup reaped (3 daemons → 1), `:3100` serving (200 OK). The "drop" was the pileup + a transient under-load probe timeout — **not** a crash; the serving daemon was healthy (845 MB / 3.25 h).

**Durable (the recurring cause):** nothing periodically reaped duplicate daemons — the PT5M watchdog is pileup-blind (it's satisfied if *one* daemon answers `/health`). I registered **`PRISM MCP Singleton Guard`** (S4U/hidden, every 10 min, runs the proven `--fix`). Your supervision is now a complete triad:
- **Supervisor** (PT3M) — ensures a daemon *exists*
- **Watchdog** (PT5M) — `/health` wedge-kill + RSS-preempt (18 GB) + boot-guard
- **Singleton Guard** (PT10M, new) — reaps duplicate daemons so pileup can't accumulate

**Honest caveat (not mine to fix):** the *theoretical* deepest cause is a server-core closure leak at `mcp-server/src/index.ts:973-983` → `U-MCP-FACTORY-REFACTOR` (per-session factory), a deferred backend/papa milestone. It was **not** active today (daemon healthy), and if RSS ever climbs the watchdog's 18 GB preempt catches it — but only papa's refactor eliminates it at the source. I flagged it; I won't rewrite the server core as golf.

**One follow-up I didn't do** (to avoid a repo-scrutiny cycle on a long session): an `install-mcp-singleton-guard-task.ps1` so the task is recreated on a re-provision/other PC. The live task persists across reboots already; the installer is only for clean re-provisioning. Want me to add it? Otherwise the MCP drop is handled.

### User | 2026-06-24T16:34:42.986Z

Stop hook feedback:
["H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/stop-regression-bundle.mjs]: No stderr output

### User | 2026-06-24T17:36:18.015Z

<command-name>/login</command-name>
            <command-message>login</command-message>
            <command-args></command-args>

### User | 2026-06-24T17:36:18.015Z

<local-command-stdout>Login successful</local-command-stdout>
