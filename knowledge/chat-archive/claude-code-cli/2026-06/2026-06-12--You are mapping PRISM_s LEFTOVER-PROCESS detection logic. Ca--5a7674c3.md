---
type: "chat-session"
source: "claude-code-cli"
session_id: "5a7674c3-9175-4a89-9336-19b3e462bb99"
title: "You are mapping PRISM's LEFTOVER-PROCESS detection logic. Canonical tree H:/pris"
date: "2026-06-12"
first_ts: "2026-06-12T02:25:58.680Z"
last_ts: "2026-06-12T02:30:01.341Z"
cwd: "H:\\prism-slot-golf"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-golf/5a7674c3-9175-4a89-9336-19b3e462bb99/subagents/workflows/wf_b1d60711-541/agent-a1df057066fae5b47.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are mapping PRISM's LEFTOVER-PROCESS detection logic. Canonical tree H:/pris

> **claude-code-cli** | 2026-06-12 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/5a7674c3-9175-4a89-9336-19b3e462bb99/subagents/workflows/wf_b1d60711-541/agent-a1df057066fae5b47.jsonl`

## Transcript

### User | 2026-06-12T02:25:58.680Z

You are mapping PRISM's LEFTOVER-PROCESS detection logic. Canonical tree H:/prism.
READ H:/prism/scripts/fleet-reaper-sweep.mjs in full focus on the functions: staleNodeHunt, stuckHunt, findStaleOrphanedNodes (and any helper in H:/prism/scripts/lib/ it imports). Also GREP H:/prism/scripts and H:/prism/scripts/lib for: findStaleOrphaned, staleNode, stuckBash, orphan, ancestry, cmdline allowlist.
ANSWER precisely: (1) Which process types does the periodic sweep currently detect+reap (node? git? grep? bash? cmd? sh? rg?)? (2) Is there a TWO-SNAPSHOT / confirm-after-N-ticks persistence gate (i.e. a process must remain an orphan across multiple sweeps before reap) or is it single-snapshot? (3) Is there a cmdline-allowlist that protects PRISM/fleet workers regardless of age/RSS? (4) Is the orphan test ancestry-based (dead-parent / non-claude-parent)? (5) What is the pure-core (IO-free, unit-testable) function boundary I could extend to add git/grep/bash/cmd leftover detection with a persistence gate?
Report file:line citations and the exact exported function signatures.

### Assistant | 2026-06-12T02:26:03.325Z

I'll systematically read the fleet-reaper sweep script and its library dependencies to answer all five questions precisely.

### Assistant | 2026-06-12T02:26:03.616Z

[tool_use: Read]

### User | 2026-06-12T02:26:08.359Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-961 of 3470 total (76716 tokens, cap 25000). Call Read with offset=962 limit=961 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
2	// but ALL its invocati
... [+52735 chars truncated]

### Assistant | 2026-06-12T02:26:10.307Z

Let me read the key library files in parallel now.

### Assistant | 2026-06-12T02:26:11.285Z

[tool_use: Read]

### Assistant | 2026-06-12T02:26:11.771Z

[tool_use: Read]

### Assistant | 2026-06-12T02:26:12.742Z

[tool_use: Read]

### User | 2026-06-12T02:26:28.230Z

[tool_result] 962	    "try { Add-Type -Namespace PrismFR -Name Mem -MemberDefinition $sig -ErrorAction Stop } catch {}",
963	    `foreach ($id in @(${idLiteral})) {`,
964	    "  try {",
965	    "    $p = Get-Process -Id $id -ErrorAction Stop",
966	    "    $before = [int64]$p.WorkingSet64",
967	    "    [void][PrismFR.Mem]::EmptyWorkingSet($p.Handle)",
968	    "    $p.Refresh()",
969	    "    $after = [int64]$p
... [+41264 chars truncated]

### User | 2026-06-12T02:26:28.231Z

[tool_result] 1	/**
2	 * Stuck-process hunters for fleet-reaper-sweep.mjs.
3	 *
4	 * Catches what the regular reap loop misses by design:
5	 *   (1) bash.exe shells from hook chains that never finished — claude.exe
6	 *       parent stayed alive, so the slot-aware reaper leaves them. Claude
7	 *       hook chains finish in 1–3 s; anything older than ~5 min is wedged.
8	 *       Real-world finding (slot:golf, 20
... [+16436 chars truncated]

### User | 2026-06-12T02:26:29.503Z

[tool_result] 1	/**
2	 * MCP-zombie hunter for fleet-reaper-sweep.mjs.
3	 * =============================================
4	 *
5	 * Catches the failure mode that 2026-05-23/slot-golf surfaced: 106 PRISM MCP
6	 * server processes (node.exe running `mcp-server/dist/index.js`), 46 of them
7	 * with a DEAD parent claude.exe — collectively holding 38.8 GB RSS. claude-code
8	 * does not reliably reap its spawned MCP 
... [+19611 chars truncated]

### Assistant | 2026-06-12T02:26:32.924Z

Now let me check the `process-slot-map.mjs` helper for the snapshotFleet classification to understand what process types are enumerated, and grep for cmdline allowlist patterns.

### Assistant | 2026-06-12T02:26:34.775Z

[tool_use: Grep]

### Assistant | 2026-06-12T02:26:37.476Z

[tool_use: Grep]

### User | 2026-06-12T02:26:39.189Z

[tool_result] 18: * say "this node.exe belongs to slot delta, and delta is crashed → reap it" vs
177:export const TARGET_NAMES = new Set(["node", "git", "bash", "sh"]);
191: * Today these are also absent from TARGET_NAMES, so `classifyProcess` already
194: * (mistaken) addition of pwsh to TARGET_NAMES. The regression test in
206: * Subset of TARGET_NAMES restricted to shells — the leftover-task pattern is a
208
... [+600 chars truncated]

### User | 2026-06-12T02:26:40.309Z

[tool_result] <persisted-output>
Output too large (28.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-golf\5a7674c3-9175-4a89-9336-19b3e462bb99\tool-results\toolu_01Dj5xks33fxuFLcCAdkGS4L.txt

Preview (first 2KB):
H:\prism\scripts\append-closed-loop-india-section.mjs:24:// the galaxy subtree. Excluded: golf (hygiene-by-allowlist), november/zulu
H:\prism\scripts\audit-galaxy-ai-coverage
... [+1790 chars truncated]

### Assistant | 2026-06-12T02:26:43.168Z

Let me read the key section of process-slot-map.mjs that defines TARGET_NAMES and classifyProcess.

### Assistant | 2026-06-12T02:26:43.668Z

[tool_use: Read]

### Assistant | 2026-06-12T02:26:44.382Z

[tool_use: Read]

### User | 2026-06-12T02:27:10.101Z

[tool_result] 170	/** Only trust a PID→session pin refreshed within this window. The registry
171	 *  retains entries for ~8h (session-id-pin.mjs), but a PID recycles far faster
172	 *  on a busy box — a stale pin + PID reuse would mis-attribute a live process.
173	 *  Mirrors stable-session-id.mjs's PIN_FRESH_MS. */
174	const PID_REGISTRY_FRESH_MS = 10 * 60 * 1000;
175	
176	/** Process names this module reason
... [+12537 chars truncated]

### User | 2026-06-12T02:27:10.223Z

[tool_result] 680	 *                          slotsResolved? }
681	 *                       byPid / ancestorsOf / slotPidMap are required;
682	 *                       selfPid defaults to null, now defaults to Date.now().
683	 *                       slotsResolved defaults to true — but `snapshotFleet`
684	 *                       ALWAYS passes it explicitly (false when the chat-slots
685	 *                    
... [+12080 chars truncated]

### Assistant | 2026-06-12T02:27:13.289Z

I have all the information needed. Let me now read the runSweep section where the stuck hunters and stale-node hunters are actually wired in, to get exact line citations.

### Assistant | 2026-06-12T02:27:16.700Z

[tool_use: Grep]

### User | 2026-06-12T02:27:23.632Z

[tool_result] 163:import { runStuckHunters, buildProtectedPidSet } from "./lib/fleet-reaper-stuck-hunters.mjs";
164:import { findMcpZombies, findStaleOrphanedNodes, buildStaleNodeProtectRegex } from "./lib/fleet-reaper-mcp-zombie-hunter.mjs";
2042:  let stuckHunt = {
2046:  const stuckHuntFullyDisabled = process.env.PRISM_FR_HUNT_DISABLE === "1" || (
2047:    process.env.PRISM_FR_HUNT_STUCK_BASH_DISABLE === "1"
... [+2462 chars truncated]

### Assistant | 2026-06-12T02:27:26.587Z

[tool_use: Read]

### User | 2026-06-12T02:27:40.417Z

[tool_result] 2040	  //    a single PRISM_FR_HUNT_DISABLE=1 also masks the whole block. Skipped
2041	  //    in status/dry-run/disabled (consistent with crash-watch gating above).
2042	  let stuckHunt = {
2043	    engaged: false, stuckBashesReaped: 0, fsmonitorReaped: 0,
2044	    staleSlots: 0, freedMb: 0, error: null,
2045	  };
2046	  const stuckHuntFullyDisabled = process.env.PRISM_FR_HUNT_DISABLE === "1" || 
... [+14607 chars truncated]

### Assistant | 2026-06-12T02:27:43.578Z

I now have complete information. Let me produce the structured answer.

### Assistant | 2026-06-12T02:29:14.613Z

[tool_use: StructuredOutput]

### User | 2026-06-12T02:29:21.391Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-12T02:30:01.341Z

Here is the narrative summary of all five answers with file:line citations:

---

**Q1 — Which process types does the periodic sweep detect+reap?**

The sweep has two layers of detection, each covering different types:

**Core slot-aware pass** (`TARGET_NAMES`, `process-slot-map.mjs:177`):
```js
export const TARGET_NAMES = new Set(["node", "git", "bash", "sh"]);
```
Exactly these four families. Everything else — `rg`, `grep`, `cmd`, `pwsh` — returns `class:'not-target'` and is invisible. `classifyProcess()` at line 689 only runs for processes whose normalized name is in that set.

**Additive hunters** (no TARGET_NAMES gate, operate on `snap.procs` directly):
- `findStuckBashes()` (`fleet-reaper-stuck-hunters.mjs:105`) — `bash.exe` / `sh.exe` only
- `findFsmonitorOrphans()` (line 174) — `git.exe` where cmd matches `/fsmonitor[-_]?-?daemon/i` or binary named `git-fsmonitor--daemon.exe`
- `findMcpZombies()` (`fleet-reaper-mcp-zombie-hunter.mjs:355`) — `node.exe` where cmd matches `mcp-server/dist/index.js`
- `findStaleOrphanedNodes()` (line 270) — `node.exe` with low RSS

**Short answer:** node — yes (core + two zombie hunters). git — yes (core + fsmonitor hunter). bash/sh — yes (core + stuck-bash hunter). cmd, rg, grep, pwsh — NO, never.

---

**Q2 — Two-snapshot / confirm-after-N-ticks persistence gate?**

**YES for the core pass, NO for the additive hunters.**

Core pass: `updateLedger()` (`fleet-reaper-sweep.mjs:408`) records `firstSeenAt` on first observation. `shouldReap()` (line 500) gates on `(now - firstSeenAt) >= killAfterMs` where `killAfterMs = effectiveKillAfter × intervalSec` (default `2 × 300s = 10 min`). This is wall-clock based, not a counter, so it is correct across the Monitor + scheduled task + Stop hook running independently. Memory pressure shortcuts it: warn band (≥90%) → 1 tick; critical band (≥88%, `DEFAULT_MEM_CRITICAL_PCT`) → 0 (reap this sweep).

The four additive hunters have no ledger. They detect and pass directly to `reapProcesses()` in 
... [+4367 chars truncated]
