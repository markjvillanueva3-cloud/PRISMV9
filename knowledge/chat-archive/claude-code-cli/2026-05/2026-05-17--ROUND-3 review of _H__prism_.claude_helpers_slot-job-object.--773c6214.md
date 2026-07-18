---
type: "chat-session"
source: "claude-code-cli"
session_id: "773c6214-15ba-41d4-b247-7d7bde7309db"
title: "ROUND-3 review of `H:\\prism\\.claude\\helpers\\slot-job-object.ps1` — REAPER-PERMFI"
date: "2026-05-17"
first_ts: "2026-05-17T20:30:54.401Z"
last_ts: "2026-05-17T20:32:51.932Z"
cwd: "H:\\PRISM"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-ad1609cab76539208.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# ROUND-3 review of `H:\prism\.claude\helpers\slot-job-object.ps1` — REAPER-PERMFI

> **claude-code-cli** | 2026-05-17 | 20 msgs (7 user / 13 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-ad1609cab76539208.jsonl`

## Transcript

### User | 2026-05-17T20:30:54.401Z

ROUND-3 review of `H:\prism\.claude\helpers\slot-job-object.ps1` — REAPER-PERMFIX-MS1/U-C1, a PowerShell 5.1 Windows Job Object containment helper for PRISM chat slots.

Round 1 FAIL (ancestry-guessing P0s) -> round 2 you PASSed, arm B FAILed with 2 P0s. Round-3 fixes applied since your round-2 PASS:
- `-Assign` now Read-Sidecars + Test-PidAlive's the anchorPid AFTER OpenExisting succeeds; refuses with `state:"orphaned-job"` exit 1 if no LIVE anchor owns the job (was: could assign a pid into a job moments from kernel reaping -> silently kill it).
- SHARP EDGE .NOTES block extended to state kill-on-job-close reaps `-Assign`-ed pids too (not just -LaunchChild); `.PARAMETER ProcessId` + the -Assign `.EXAMPLE` got cautions.
- `-LaunchArgs` changed `[string]` -> `[string[]]` (was a single-string mis-parse footgun); usage updated to `$LaunchArgs.Count -gt 0`.
- Anchor TOCTOU close-out: after CreateConfigured, if `LastCreateAlreadyExisted` AND a DIFFERENT live anchorPid now owns the sidecar -> close handle, stand down exit 1.
- `Test-SlotName` `-match` -> `-cmatch` (PowerShell `-match` is case-insensitive — was admitting `BAD`/`Alpha`, collision risk on case-insensitive NTFS sidecar filenames).

VERIFIED by me since round 2: PowerShell parse OK; 0 non-ASCII bytes; 8 non-blocking smoke cases correct exit codes; slot validation now rejects BAD/Alpha/al_pha/-alpha/alpha- and accepts alpha/wedm-studio; cross-process STATUS against a LIVE job returns `state:"anchored-active"` activeProcesses:1 peakJobMemoryMB:110.6 anchorAlive:true (separate process discovered + queried the anchor's job); kill-on-job-close confirmed reaping the watched process when the anchor is killed; STATUS post-kill returns `no-job (stale sidecar present)`.

Re-verify the WHOLE file. Confirm round-3 fixes are correct and introduced no new P0/P1. Specifically:
1. The new `-Assign` orphaned-job guard — is the logic right (refuse unless sidecar has a live anchorPid)? Does it close the job handle before Emit-Re
... [+510 chars truncated]

### Assistant | 2026-05-17T20:31:02.459Z

I'll perform a thorough round-3 review of the file.

### Assistant | 2026-05-17T20:31:02.850Z

[tool_use: Read]

### User | 2026-05-17T20:31:05.290Z

[tool_result] 1	#Requires -Version 5.1
2	<#
3	.SYNOPSIS
4	    PRISM slot Job Object -- OS-level fork-bomb containment per chat slot.
5	    REAPER-PERMFIX-MS1 / U-C1.
6	
7	.DESCRIPTION
8	    Wraps a chat slot's process tree in a Windows Job Object so the kernel --
9	    not a userspace polling reaper -- enforces three hard limits:
10	
11	      * JOB_OBJECT_LIMIT_ACTIVE_PROCESS  (-ActiveProcessLimit, default 50)

... [+33991 chars truncated]

### Assistant | 2026-05-17T20:31:30.345Z

Now let me verify each of the round-3 fixes in detail.

## 1. The `-Assign` orphaned-job guard (lines 471-479)

The logic at line 472:
```powershell
if (-not ($asc -and $asc.anchorPid -and (Test-PidAlive ([int]$asc.anchorPid)))) {
```

This refuses unless the sidecar exists AND has an `anchorPid` AND that pid is alive. Correct. The handle is closed at line 473 (`[PrismJobObject]::Close($hJob)`) **before** `Emit-Result` at line 474. No leak. Correct.

But let me verify the ordering against the happy path. On the happy path (lines 480-490), the handle is closed in `finally` at line 490. The refuse path closes manually at 473 then `Emit-Result` calls `exit` — so the `finally` at 490 is never reached because the `try` at 480 hasn't started yet. **No double-close.** Correct.

One subtle thing: between line 458 (`OpenExisting` succeeds) and line 472 (sidecar re-read + Test-PidAlive), the anchor could die. That window is unavoidable TOCTOU and the comment at 467-470 acknowledges it honestly — the guard narrows the window, doesn't eliminate it. Acceptable; this is a best-effort guard and the kernel is the real enforcer.

## 2. Anchor TOCTOU re-check (lines 548-558)

```powershell
if ($alreadyExisted) {
    $scRace = Read-Sidecar $Slot
    if ($scRace -and $scRace.anchorPid -and
        ([int]$scRace.anchorPid -ne $PID) -and (Test-PidAlive ([int]$scRace.anchorPid))) {
        [PrismJobObject]::Close($hJob); $hJob = $null
        Emit-Result @{ ... } 1
    }
}
```

`$hJob` is nulled at line 552 **before** `Emit-Result` at 553. `Emit-Result` calls `exit 1` (line 151). When `exit` runs inside a `try`, PowerShell still runs the `finally` block (lines 625-632). The `finally` checks `if ($hJob)` — `$hJob` is `$null`, so the backstop is skipped. **No double-close.** Correct.

## 3. `-LaunchArgs [string[]]` into `Start-Process -ArgumentList` (lines 565-567)

```powershell
$spArgs = @{ FilePath = $LaunchChild; PassThru = $true; NoNewWindow = $true; ErrorAction = "Stop" }
if ($LaunchA
... [+2066 chars truncated]

### Assistant | 2026-05-17T20:31:31.367Z

[tool_use: Read]

### User | 2026-05-17T20:31:33.332Z

[tool_result] 395	if ($Status) {
396	    try {
397	        $sc = Read-Sidecar $Slot
398	        $anchorPid = $(if ($sc -and $sc.anchorPid) { [int]$sc.anchorPid } else { 0 })
399	        $anchorAlive = (($anchorPid -gt 0) -and (Test-PidAlive $anchorPid))
400	
401	        $hJob = [PrismJobObject]::OpenExisting($jobName, [PrismJobObject]::JOB_OBJECT_QUERY)
402	        if ($hJob -eq [IntPtr]::Zero) {
403	          
... [+2005 chars truncated]

### Assistant | 2026-05-17T20:31:45.892Z

Status path: when `$hJob -eq Zero`, `Emit-Result` at 403 calls `exit` while inside the outer `try` (396). PowerShell's `exit` runs `finally` blocks — but there's no `finally` for the outer `try` (the `finally` at 429 belongs to the inner `try` at 409, which was never entered). So no `Close` is attempted on a Zero handle. Correct — and `OpenExisting` returning Zero means there's nothing to close anyway.

Now let me check a potential interaction in the Assign DryRun + the `$h` handle at line 444-446.

The DryRun assign path: `OpenExisting` → if exists, `Close($h)` → `Emit-Result`. The `$h` is closed before emit. Correct, no leak.

Let me verify one thing about the Anchor TOCTOU re-check — whether `Emit-Result` at line 553 being inside the `try` could double-close via the `Marshal`-style cleanup. The interop `CreateConfigured` already returns a fully-set-up handle (its own `finally` freed the `AllocHGlobal` buffer at line 283). The PS-side `$hJob` is the only remaining resource, nulled at 552. The `finally` at 625 checks `if ($hJob)` — null → skipped. Confirmed no double-close.

Let me check one final concern — the `AssignPid` in `-LaunchChild` self-assign (line 564). The anchor process self-assigns. If the anchor is *already* in a job (e.g. PRISM slot worktree hooks, or being launched under another job), `AssignProcessToJobObject` can fail with `ERROR_ACCESS_DENIED` unless the jobs are nestable.

### Assistant | 2026-05-17T20:31:47.852Z

[tool_use: Bash]

### User | 2026-05-17T20:31:51.174Z

[tool_result] 0 matches for 'AssignProcessToJobObject|nested|JOB_OBJECT_LIMIT_SILENT|already.*job|IsProcessInJob'
no matches beyond known

### Assistant | 2026-05-17T20:31:58.777Z

The self-assign at line 564 (`AssignPid($hJob, $PID)`) — if the anchor process is already inside another job object, `AssignProcessToJobObject` fails with `ERROR_ACCESS_DENIED` on pre-Win8 semantics, but **Windows 8+ supports nested jobs**, so a process already in job A can be assigned to job B and the jobs nest. The host is Windows 11 (per env). So this works on the target platform — and even if it threw, `AssignPid` throws `Win32Exception` (lines 295-299), which is caught at line 623, cleaned up by the `finally` at 625-632 (`$hJob` non-null → `Remove-Sidecar` + `Close`), and surfaced loud via `Emit-Result $errObj 1`. **Fail-loud is intact** even in that edge case. Not a defect on Win11.

One more — verify the file parses and has no non-ASCII.

### Assistant | 2026-05-17T20:32:00.201Z

[tool_use: Bash]

### User | 2026-05-17T20:32:02.077Z

[tool_result] line 162: non-ascii
---ascii-check-done---
638

### Assistant | 2026-05-17T20:32:07.526Z

Line 162 has a non-ASCII byte. Let me inspect it — this contradicts the round-3 verification claim of "0 non-ASCII bytes".

### Assistant | 2026-05-17T20:32:08.763Z

[tool_use: Bash]

### User | 2026-05-17T20:32:10.421Z

[tool_result] U+00E2 U+0080 U+0094 


---
line 162 col 31: U+00E2
line 162 col 32: U+0080
line 162 col 33: U+0094

### Assistant | 2026-05-17T20:32:19.416Z

Bytes `E2 80 94` are the UTF-8 encoding of U+2014 (em dash `—`) — in a comment at line 162: `# -cmatch (case-SENSITIVE) — PowerShell's -match...`. There are em dashes in comments at lines 162-163 (the round-3 fix comment block).

This is **not a P0/P1** — it's inside a comment, the file is valid UTF-8, PowerShell 5.1 reads UTF-8 source fine, and the runtime behavior is unaffected. But it **contradicts the stated round-3 verification** ("0 non-ASCII bytes") and PRISM has an encoding-guard hook + the global doctrine of ASCII-only `.ps1`. Worth flagging as **P2** for consistency — the rest of the file uses `--` (double-hyphen) as its dash convention; lines 162-163 broke that convention with em dashes. Let me confirm whether other lines also drifted.

### Assistant | 2026-05-17T20:32:21.006Z

[tool_use: Bash]

### User | 2026-05-17T20:32:22.369Z

[tool_result] line 162: U+00E2 U+0080 U+0094

### Assistant | 2026-05-17T20:32:51.932Z

Only line 162 (a single em dash in the round-3 comment). Self-contained, comment-only, valid UTF-8.

Let me do a final structural pass on the three remaining concerns: the anchor `while` loop liveness, the `Test-PidAlive` correctness in the watch loop, and the stdout contract on every exit path.

**Watch loop (lines 605-607):** `while (Test-PidAlive $childPid) { Start-Sleep -Seconds $PollSeconds }`. `Test-PidAlive` uses `Get-Process -Id` (lines 167-171). One known PID-reuse hazard: if `$childPid` exits and the OS recycles that PID to an unrelated process within a `$PollSeconds` window, the loop keeps blocking on a stranger. This is a pre-existing limitation, not a round-3 regression, and the kernel kill-on-job-close still bounds the blast radius (only job members die). The watched child being a *job member* means the more robust check would be `acct.ActiveProcesses` — but that's a design comment, not a P0/P1, and unchanged from round 2 where it PASSed.

**Stdout contract:** every terminal path emits exactly one `PRISM_JOB_RESULT` (via `Emit-Result`) or, on the anchor happy path, `PRISM_JOB_ANCHOR_UP` then `PRISM_JOB_RESULT` (lines 601, 620). The line-638 unreachable backstop also emits. Confirmed — no path exits without the contract line.

**Fail-loud:** `AssignPid`/`Query*`/`CreateConfigured` all throw `Win32Exception` with the GLE; the PS catch blocks surface `$_` into the `message` field with `ok=$false` exit 1. No silent swallow except `Write-SidecarAtomic`/`Remove-Sidecar`/`Read-Sidecar`, which are explicitly documented as discovery-sugar and never load-bearing. Correct.

---

## Verdict

**GRADE: PASS**

All five round-3 fixes are correctly implemented and introduce no new P0/P1:

1. **`-Assign` orphaned-job guard (lines 471-479)** — CORRECT. Refuses unless `$asc.anchorPid` resolves to a live pid via `Test-PidAlive`. The job handle is closed at line 473 *before* `Emit-Result` at 474 — **no leak**. The refuse path predates the `try` at 480, so the `finally` at 
... [+2734 chars truncated]
