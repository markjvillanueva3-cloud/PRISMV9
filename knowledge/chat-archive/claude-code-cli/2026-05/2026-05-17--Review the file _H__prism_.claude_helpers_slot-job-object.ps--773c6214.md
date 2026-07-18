---
type: "chat-session"
source: "claude-code-cli"
session_id: "773c6214-15ba-41d4-b247-7d7bde7309db"
title: "Review the file `H:\\prism\\.claude\\helpers\\slot-job-object.ps1` end-to-end. This "
date: "2026-05-17"
first_ts: "2026-05-17T20:05:14.652Z"
last_ts: "2026-05-17T20:06:48.762Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a8a4dc36650a0dc0d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review the file `H:\prism\.claude\helpers\slot-job-object.ps1` end-to-end. This 

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a8a4dc36650a0dc0d.jsonl`

## Transcript

### User | 2026-05-17T20:05:14.652Z

Review the file `H:\prism\.claude\helpers\slot-job-object.ps1` end-to-end. This is REAPER-PERMFIX-MS1 / U-C1: a PowerShell 5.1 helper that wraps a PRISM chat slot's process tree in a Windows Job Object for OS-level fork-bomb containment.

SPEC (from state/shared/specs/REAPER-PERMFIX-PLAN.md U-C1):
- New file `.claude/helpers/slot-job-object.ps1`
- Wrap each slot's claude.exe launch in a Windows Job Object with three limits:
  * JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 50 (default, configurable)
  * JOB_OBJECT_LIMIT_JOB_MEMORY = 8GB (default, configurable)
  * JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE (auto-reap when the last handle closes)
- Kernel-enforced containment, no userspace polling.

Verify rigorously, flagging P0 (broken/unsafe) and P1 (significant) issues:
1. Win32 P/Invoke CORRECTNESS — DllImport signatures, struct layouts (JOBOBJECT_BASIC_LIMIT_INFORMATION, IO_COUNTERS, JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOBOBJECT_BASIC_ACCOUNTING_INFORMATION), field types/widths (DWORD->UInt32, SIZE_T/ULONG_PTR->UIntPtr, LARGE_INTEGER->Int64), JOBOBJECTINFOCLASS numbers (BasicAccounting=1, ExtendedLimit=9), LimitFlags constant values (0x8/0x200/0x2000), access-rights constants. Any wrong number = silent kernel misbehavior.
2. The KILL_ON_JOB_CLOSE footgun: the script claims a transient "create+assign+exit" would destroy the job and un-contain the slot, so -Anchor must BLOCK as the persistent handle holder. Is that reasoning CORRECT for Windows Job Object semantics? Does any code path create a kill-on-close job and then exit while a real process is assigned (which would kill that process)? Check -Assign and -DryRun especially.
3. Memory marshalling — AllocHGlobal/StructureToPtr/PtrToStructure/FreeHGlobal pairing, leak-free on the exception path (try/finally), handle leaks (CloseHandle on every job/process handle on every path including exceptions).
4. Mode dispatch — exactly-one-of Anchor/Assign/Status, slot-name validation regex, range checks, exit codes (0 ok / 1 operational / 2
... [+726 chars truncated]

### Assistant | 2026-05-17T20:05:21.137Z

I'll review this file end-to-end.

### Assistant | 2026-05-17T20:05:21.517Z

[tool_use: Read]

### User | 2026-05-17T20:05:22.479Z

[tool_result] 1	#Requires -Version 5.1
2	<#
3	.SYNOPSIS
4	    PRISM slot Job Object — OS-level fork-bomb containment per chat slot.
5	    REAPER-PERMFIX-MS1 / U-C1.
6	
7	.DESCRIPTION
8	    Wraps a chat slot's process tree in a Windows Job Object so the kernel —
9	    not a userspace polling reaper — enforces three hard limits:
10	
11	      * JOB_OBJECT_LIMIT_ACTIVE_PROCESS  (-ActiveProcessLimit, default 50)
12	
... [+25627 chars truncated]

### Assistant | 2026-05-17T20:06:48.762Z

I have the file content. Let me verify the Win32 P/Invoke correctness and analyze each concern rigorously.

## Verification Notes

I verified the Win32 constants and struct layouts against the Windows SDK:

- **LimitFlags**: `ACTIVE_PROCESS=0x8`, `JOB_MEMORY=0x200`, `KILL_ON_JOB_CLOSE=0x2000` — all correct.
- **JOBOBJECTINFOCLASS**: `BasicAccounting=1`, `ExtendedLimit=9` — correct.
- **Struct layouts**: `JOBOBJECT_BASIC_LIMIT_INFORMATION`, `IO_COUNTERS`, `JOBOBJECT_EXTENDED_LIMIT_INFORMATION`, `JOBOBJECT_BASIC_ACCOUNTING_INFORMATION` field types/widths/order — all correct (`DWORD→UInt32`, `SIZE_T/ULONG_PTR→UIntPtr`, `LARGE_INTEGER→Int64`).
- **Access rights**: `JOB_OBJECT_ASSIGN_PROCESS=0x1`, `JOB_OBJECT_QUERY=0x4`, `PROCESS_TERMINATE=0x1`, `PROCESS_SET_QUOTA=0x100` — correct.

The interop layer is sound. The bugs are in the **PowerShell mode-dispatch logic**, not the marshalling.

---

# Code Quality Analysis Report

## Summary
- Overall Quality Score: 6/10
- Files Analyzed: 1 (`H:\prism\.claude\helpers\slot-job-object.ps1`, 520 lines)
- Issues Found: 8 (2 P0, 3 P1, 3 P2)
- Verdict: **FAIL** (two P0 issues)

The Win32 interop is correct. The failure is in the anchor block's lifetime/handle semantics and a self-assign safety hole — both defeat the script's stated purpose.

---

## Critical Issues (P0)

### P0-1 — Anchor `finally` does NOT close the handle on the normal exit path; kill-on-job-close never fires when claude.exe dies
- File: `slot-job-object.ps1:498-515`
- Severity: P0 (defeats the script's entire reason to exist)

The anchor block loop breaks when `claude.exe` exits, then calls **`exit 0`** at line 508 — *inside* the `try` block.

In PowerShell, `exit` inside a `try` whose statement has a `finally`: the `finally` *does* run for an `exit` from within `try`/`catch`... but there is a real, documented hazard here. The deeper problem is the **ordering and the engine-tear-down race**: `exit` begins terminating the runspace. Whether `[PrismJobObject]::Close($
... [+12493 chars truncated]
