---
type: "chat-session"
source: "claude-code-cli"
session_id: "aaa87bb3-eea6-4fc4-8793-363322989a8b"
title: "Independent second-pass review of this C# file END-TO-END, weighted on what a co"
date: "2026-06-04"
first_ts: "2026-06-04T18:13:18.313Z"
last_ts: "2026-06-04T18:17:21.349Z"
cwd: "H:\\prism\\mcp-server\\data\\posts\\prism-base\\cimco-bridge\\ui-driver"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/aaa87bb3-eea6-4fc4-8793-363322989a8b/subagents/agent-a8a18ded79cd7bfee.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent second-pass review of this C# file END-TO-END, weighted on what a co

> **claude-code-cli** | 2026-06-04 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver
> Raw: `H:/.claude/projects/H--prism/aaa87bb3-eea6-4fc4-8793-363322989a8b/subagents/agent-a8a18ded79cd7bfee.jsonl`

## Transcript

### User | 2026-06-04T18:13:18.313Z

Independent second-pass review of this C# file END-TO-END, weighted on what a correctness pass is LESS likely to catch: integration, security, safety-rail completeness, convention conformance, and the things that bite in production. File: `H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs`

CONTEXT: `PrismCimcoUI.exe` — net48 C# console (compiled with framework `csc.exe`, C# 5 only) that drives CIMCO Edit 2026 Machine Simulation via MSAA `IAccessible` (oleacc) because CIMCO's Codejock ribbon has an MSAA provider but no UI-Automation one. It is the SPINE-2 live-sim driver. Ops: `map`/`find` (read-only MSAA tree walk -> JSON), `invoke <name>` (gated behind `--allow-actions`, fires `accDoDefaultAction`), `window-info`. With `--launch --nc <file>` it runs `CIMCOEdit.exe /ms <nc>` and kills it at exit unless `--keep`. The precedent it clones is `H:\prism\mcp-server\data\posts\prism-base\winmax-bridge\ui-driver\Program.cs` (read it to compare conventions: arg parsing, JSON-from-end-of-stdout contract, the MotionDeny safety rail, gated-actions pattern). The eventual goal is a FAIL-CLOSED collision-verdict pipeline: a post is only "cleared for live cutting" if a collision check provably ran and reported zero violations — an empty/unconfirmed report must NEVER read as "clean."

Verify with concrete evidence, flag P0/P1/P2, grade PASS/FAIL:
1. **Command/arg injection** — `--nc <file>` is interpolated into `"/ms \"" + nc + "\""` for ProcessStartInfo with UseShellExecute=true. Can a crafted `--nc` value break out (embedded quotes, `&`, `|`)? Is that a real risk given the caller (a node bridge) controls it, or should it be hardened?
2. **Safety-rail completeness vs the goal** — the `invoke` gating (`--allow-actions` + `MotionDeny`). For a SIMULATION driver this drives sim controls, but `invoke` could also hit `Save Simulation Bundle`, `DNC Setup`, `Transmission`-tab controls, etc. Is the MotionDeny list adequate? Should `map`-discovered destructive cont
... [+1543 chars truncated]

### Assistant | 2026-06-04T18:13:44.562Z

I'll review the CIMCO UI driver against its WinMAX precedent and the fail-closed collision-verdict goal. Let me read both files.

### Assistant | 2026-06-04T18:13:45.679Z

[tool_use: Read]

### Assistant | 2026-06-04T18:13:46.881Z

[tool_use: Read]

### User | 2026-06-04T18:13:47.156Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\data\posts\prism-base\cimco-bridge\ui-driver\Program.cs' was already read 16s ago in this session and is unchanged (mtime 1780596548306). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disa
... [+24 chars truncated]

### User | 2026-06-04T18:13:51.116Z

[tool_result] 1	// PrismWinMaxUI — drive the WinMax GUI via Windows UI Automation (UIA). slot:echo, 2026-05-30.
2	//
3	// Ops (JSON line out):
4	//   --op probe            walk the UIA tree of the WinMax window → flat node list + a summary of
5	//                         actionable controls (buttons / menu items / edits / lists). READ-ONLY.
6	//   --op window-info      top-level window name/class/bounds. READ-O
... [+34518 chars truncated]

### Assistant | 2026-06-04T18:13:57.539Z

I have both files in context. Now let me verify the specific claims by examining the CIMCO file's actual content against the questions. Let me check key sections precisely.

### Assistant | 2026-06-04T18:13:58.236Z

[tool_use: Grep]

### User | 2026-06-04T18:14:06.142Z

[tool_result] 12://   --op find <text>         controls whose accName contains <text> (case-insensitive). READ-ONLY.
13://   --op invoke <name>       accDoDefaultAction on the named control. GATED behind --allow-actions.
16:// LAUNCH/ATTACH: with --launch (+--nc <file>) it starts "CIMCOEdit.exe /ms <nc>" and waits for the frame,
17:// then KILLS it at exit unless --keep. Without --launch it ATTACHES to a runnin
... [+2345 chars truncated]

### Assistant | 2026-06-04T18:14:11.248Z

Now let me read the full CIMCO file from the start to get the exact line numbers for the launch/kill/process sections and the full structure (my read-once context covers it, but I need precise line refs for the launch block, finally, and the kill).

### Assistant | 2026-06-04T18:14:12.386Z

[tool_use: Read]

### User | 2026-06-04T18:14:16.285Z

[tool_result] 42	        [STAThread]
43	        private static int Main(string[] args)
44	        {
45	            string op = "map", name = null, nc = null;
46	            int settle = 9, waitSec = 45, depth = 4;
47	            bool launch = false, keep = false, allowActions = false;
48	            for (int i = 0; i < args.Length; i++)
49	            {
50	                switch (args[i])
51	                {
5
... [+7716 chars truncated]

### Assistant | 2026-06-04T18:14:27.440Z

Now let me read the remaining tail (MapJson, dedup, helpers, EXE constant, JSON escaping) for precise verification of the JSON contract and dedup-by-key.

### Assistant | 2026-06-04T18:14:27.536Z

[tool_use: Read]

### User | 2026-06-04T18:14:33.929Z

[tool_result] 176	                case 0x25: return "pagetab"; case 0x3C: return "pagetablist"; case 0x0C: return "menuitem";
177	                case 0x02: return "titlebar"; case 0x03: return "menubar"; case 0x09: return "window";
178	                case 0x14: return "grouping"; case 0x1E: return "statictext"; case 0x15: return "separator";
179	                case 0x0D: return "outline"; case 0x21: return "
... [+4912 chars truncated]

### Assistant | 2026-06-04T18:14:39.520Z

Let me read the file header (lines 1-42) to capture the EXE constant, the namespace/imports, the BarClasses, IID, and the doc-comment contract precisely.

### Assistant | 2026-06-04T18:14:40.073Z

[tool_use: Read]

### User | 2026-06-04T18:14:45.503Z

[tool_result] 1	// PrismCimcoUI - drive CIMCO Edit 2026 Machine Simulation via MSAA / IAccessible (oleacc). slot:echo, 2026-06-04.
2	//
3	// WHY MSAA, not UIA: CIMCO's Codejock XTP ribbon ships an MSAA (IAccessible) provider but NO UI-Automation
4	// provider, so System.Windows.Automation sees an empty 15-21 node tree (0 buttons) while oleacc
5	// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 childr
... [+2361 chars truncated]

### Assistant | 2026-06-04T18:14:55.509Z

I have the complete file. I have everything I need for a thorough independent review. Let me verify two integration points: how the node bridge precedent parses JSON-from-end-of-stdout, and confirm the WinMAX driver does NOT have a `/ms` launch path (it attaches only) so I can fairly compare the launch surface.

The WinMAX driver attaches only (line 15: "never launches it") — so the `--launch`/`--nc`/process-kill surface is **net-new in CIMCO with no precedent to inherit safety from**. That sharpens the injection and process-hygiene findings. Let me check how the node side extracts the JSON to verify the trailing-line contract risk.

### Assistant | 2026-06-04T18:14:56.224Z

[tool_use: Bash]

### Assistant | 2026-06-04T18:14:56.350Z

[tool_use: Glob]

### User | 2026-06-04T18:15:00.124Z

[tool_result] No files found

### User | 2026-06-04T18:15:05.470Z

[tool_result] DESIGN.md
SURFACE-PROBE.json
ui-driver
wcf-client
winmax.actions.json
winmax-courses.json
winmax-lathe-courses.json
---CIMCO DIR---
ui-driver

### Assistant | 2026-06-04T18:15:12.688Z

The node driver (`winmax-driver.mjs`) doesn't exist yet — the orchestrator that will parse this output (`cimco-sim-driver.mjs`) is to be cloned. So the JSON-from-end-of-stdout contract has no live consumer to validate against yet; I assess the contract risk on the C# producer side. Let me check the WinMAX DESIGN.md for the documented stdout contract so I can confirm convention conformance.

### Assistant | 2026-06-04T18:15:13.136Z

[tool_use: Bash]

### User | 2026-06-04T18:15:37.690Z

[tool_result] 8:2. **Dispatches JSON commands** over that channel; composes existing domain engines (no logic re-impl).
10:4. **Action templates** `cad-action-templates/<platform>.actions.json` map a PRISM atomic op → the app's automation fn + args.
14:Mastercam has a NET-Hook DLL; Esprit has VBScript COM. **WinMax has NO documented public automation API.** So we mirror delta's *architecture* (AutomationBridge 
... [+1078 chars truncated]

### Assistant | 2026-06-04T18:17:21.349Z

I have enough to complete the review. The WinMAX precedent confirms the JSON-line-out contract and the attach-only model. I've now verified every claim against the actual source. Here is my independent second-pass review.

---

# Independent Review: `cimco-bridge/ui-driver/Program.cs`

**Verdict: FAIL** (P0 process-hygiene defect + P0 fail-closed/contract gaps that, for a tool gating live cutting, must be closed before ship). Findings below with concrete line refs.

---

## P0 findings

### P0-1 — `finally` kill is PID-blind: it kills EVERY CIMCO instance on the machine, including the operator's manually-opened editor (lines 122-127)

```csharp
finally
{
    if (launchedHere && !keep)
        foreach (var pn in new[] { "CIMCOEdit", "CIMCOSimulation" })
            foreach (var p in Process.GetProcessesByName(pn)) { try { p.Kill(); } catch { } }
}
```

The review prompt asks me to confirm that when `launchedHere == false` it must NOT kill — that guard is present and correct (`if (launchedHere && !keep)`). **But the bug is one level deeper:** even when `launchedHere == true`, the cleanup enumerates `Process.GetProcessesByName(...)` and kills **all** matching processes, not the one this driver started. The code captures the launch via `Process.Start(psi)` (line 72) but **discards the returned `Process` handle** — so it has no PID to scope the kill to.

Real-world failure: an operator has CIMCO Edit open with an unsaved program on monitor 1. The node bridge runs `--launch --nc job.nc`. CIMCO is single-instance (the doc comment on line 17 says so), so `/ms job.nc` is very likely handed to the **already-running** instance via DDE/single-instance handoff rather than spawning a new process — meaning `Process.Start` may return a transient launcher that exits, and `launchedHere` is set `true` regardless. At exit, the `finally` kills the operator's editor and their unsaved work. This is a destructive, data-losing side effect in a shop-floor tool.

Note also the contradiction t
... [+16588 chars truncated]
