---
type: "chat-session"
source: "claude-code-cli"
session_id: "773c6214-15ba-41d4-b247-7d7bde7309db"
title: "ROUND-3 independent (arm B) review of `H:\\prism\\.claude\\helpers\\slot-job-object."
date: "2026-05-17"
first_ts: "2026-05-17T20:31:10.671Z"
last_ts: "2026-05-17T20:38:26.683Z"
cwd: "H:\\PRISM"
messages: 44
user_msgs: 15
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a81cad64b9f813ed6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# ROUND-3 independent (arm B) review of `H:\prism\.claude\helpers\slot-job-object.

> **claude-code-cli** | 2026-05-17 | 44 msgs (15 user / 29 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/773c6214-15ba-41d4-b247-7d7bde7309db/subagents/agent-a81cad64b9f813ed6.jsonl`

## Transcript

### User | 2026-05-17T20:31:10.671Z

ROUND-3 independent (arm B) review of `H:\prism\.claude\helpers\slot-job-object.ps1` — REAPER-PERMFIX-MS1/U-C1, a PowerShell 5.1 Windows Job Object containment helper for PRISM chat slots (active-process cap, job-memory cap, kill-on-job-close).

You FAILed this in round 2 with two P0s + P1-3/P1-4. All four were fixed:
- P0 (Assign into orphaned job): `-Assign` now, after `OpenExisting` succeeds, `Read-Sidecar`s and `Test-PidAlive`s the `anchorPid`; if no LIVE anchor owns the job it closes the handle and refuses with `state:"orphaned-job"` exit 1. (Verify: the close-before-refuse, the logic.)
- P0 (SHARP EDGE doc gap): the `.NOTES` SHARP EDGE block now says kill-on-job-close reaps EVERY job member — launched child tree AND any `-Assign`-ed pid; `.PARAMETER ProcessId` and the `-Assign` `.EXAMPLE` carry explicit cautions.
- P1-3 (`-LaunchArgs` single-string footgun): now `[string[]]$LaunchArgs = @()`, passed as an array to `Start-Process -ArgumentList`; the `IsNullOrWhiteSpace` check became `$LaunchArgs.Count -gt 0`.
- P1-4 (conflict-guard TOCTOU): after `CreateConfigured`, when `LastCreateAlreadyExisted` is true the anchor re-reads the sidecar and stands down (close handle, exit 1) if a DIFFERENT live `anchorPid` owns it; the conflict-guard comment was softened to "(best-effort)".
- ALSO fixed (found by post-fix smoke test): `Test-SlotName` used `-match` (case-INsensitive in PowerShell) -> now `-cmatch` (case-sensitive), so `BAD`/`Alpha` are now correctly rejected (they would have collided case-folded sidecar filenames on NTFS).

VERIFIED since round 2: parse OK; 0 non-ASCII bytes; 8 non-blocking smoke cases pass; slot validation rejects BAD/Alpha/al_pha/-alpha/alpha-, accepts alpha/wedm-studio; cross-process STATUS against a LIVE anchor job returns `anchored-active` with correct activeProcesses/peakMemory/anchorAlive (a separate process discovered the anchor's named job via OpenJobObject); kill-on-job-close confirmed reaping the watched process on anchor-kill; STATUS
... [+1126 chars truncated]

### Assistant | 2026-05-17T20:31:18.414Z

I'll re-verify the file end-to-end against the round-2 P0/P1 findings and check for new defects.

### Assistant | 2026-05-17T20:31:18.570Z

[tool_use: Read]

### User | 2026-05-17T20:31:19.611Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\slot-job-object.ps1' was already read 15s ago in this session and is unchanged (mtime 1779049389655). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T20:31:22.754Z

The guard says I've already read it but it's not in my context. Let me read it with explicit parameters.

### Assistant | 2026-05-17T20:31:23.410Z

[tool_use: Read]

### User | 2026-05-17T20:31:27.331Z

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

### Assistant | 2026-05-17T20:31:31.061Z

I have the full file. Let me verify each round-2 P0/P1 fix and check for new defects with focused analysis.

### Assistant | 2026-05-17T20:31:33.211Z

[tool_use: Bash]

### User | 2026-05-17T20:31:38.988Z

[tool_result] .claude/helpers/slot-job-object.ps1: Unicode text, UTF-8 text
---bytes---
31945
---non-ascii scan---
/usr/bin/grep: -P supports only unibyte and UTF-8 locales
non-ascii-exit=0

### Assistant | 2026-05-17T20:31:42.754Z

The em-dashes in comments (lines 27, 32, 113, etc.) are non-ASCII. The round-2/round-3 report claims "0 non-ASCII bytes" was verified. Let me check precisely.

### Assistant | 2026-05-17T20:31:44.240Z

[tool_use: Bash]

### User | 2026-05-17T20:33:33.965Z

[tool_result]       0 [main] locale (16648) child_copy: cygheap read copy failed, 0x0..0x80000B830, done 0, windows pid 16648, Win32 error 299
match-count=

### Assistant | 2026-05-17T20:33:37.383Z

The Cygwin grep can't handle the locale. Let me use Node for a definitive byte scan.

### Assistant | 2026-05-17T20:33:39.602Z

[tool_use: Bash]

### User | 2026-05-17T20:34:51.324Z

[tool_result] non-ascii byte count: 3
162:     # -cmatch (case-SENSITIVE) — PowerShell's -match ignores case, which would

### Assistant | 2026-05-17T20:34:57.351Z

There IS a non-ASCII byte: line 162 has an em-dash (`—`, 3 UTF-8 bytes) in the comment added by the round-3 fix for `-cmatch`. The round-3 report claims "VERIFIED ... 0 non-ASCII bytes" — that claim is false. This is a P1 finding (the fix itself introduced a regression against a verified property). Let me verify the rest.

### Assistant | 2026-05-17T20:35:00.020Z

[tool_use: Bash]

### User | 2026-05-17T20:35:01.122Z

[tool_result] Exit code 1
At line:1 char:164
+ ... sm\.claude\helpers\slot-job-object.ps1',[ref]$null,[ref]$errs=$null); ...
+                                                                  ~
Missing ')' in method call.
At line:1 char:170
+ ... ude\helpers\slot-job-object.ps1',[ref]$null,[ref]$errs=$null); if($er ...
+                                                                 ~
Unexpected token '
... [+182 chars truncated]

### Assistant | 2026-05-17T20:35:05.724Z

My one-liner had a syntax error. Let me fix the parse check.

### Assistant | 2026-05-17T20:35:07.441Z

[tool_use: Bash]

### User | 2026-05-17T20:35:09.736Z

[tool_result] PARSE OK

### Assistant | 2026-05-17T20:35:13.535Z

Parse is clean. Now let me run the smoke tests for slot validation and usage guards.

### Assistant | 2026-05-17T20:35:15.782Z

[tool_use: Bash]

### User | 2026-05-17T20:35:22.427Z

[tool_result]       0 [main] bash (22692) child_copy: cygheap read copy failed, 0x0..0x800008F00, done 0, windows pid 22692, Win32 error 299
      0 [main] bash 2057276 dofork: child -1 - forked process 22692 died unexpectedly, retry 0, exit code 0xC0000142, errno 11
/etc/profile: fork: retry: Resource temporarily unavailable
=== Slot='alpha' ===
PRISM_JOB_RESULT {"dryRun":false,"tool":"slot-job-object","state"
... [+2353 chars truncated]

### Assistant | 2026-05-17T20:35:26.976Z

Slot validation now correctly rejects `BAD`/`Alpha` (the `-cmatch` fix works). Now let me test the `-Assign` orphaned-job guard and `-LaunchArgs` array handling.

### Assistant | 2026-05-17T20:35:31.035Z

[tool_use: Bash]

### User | 2026-05-17T20:35:33.655Z

[tool_result] === DryRun Anchor with empty LaunchArgs ===
PRISM_JOB_RESULT {"containment":"launch-child:pwsh","tool":"slot-job-object","interopOk":true,"limits":{"jobMemoryGB":8,"activeProcessLimit":50,"killOnJobClose":true},"ok":true,"jobName":"prism-slot-zzztest","probeActiveProcesses":0,"mode":"anchor","schemaVersion":"1.1.0","slot":"zzztest","message":"dry-run ok -- interop verified; would create \u0027pris
... [+828 chars truncated]

### Assistant | 2026-05-17T20:35:37.815Z

All non-blocking modes work. Now let me do a live end-to-end test: launch a real anchor, verify cross-process STATUS, then test kill-on-job-close. This exercises the `-Assign` orphaned-job guard against a real orphaned job — the critical P0 scenario.

### Assistant | 2026-05-17T20:35:41.397Z

[tool_use: Bash]

### User | 2026-05-17T20:36:51.884Z

[tool_result] === Launch anchor in background (watches a sleep child) ===
launched, waiting 6s for anchor up...
=== STATUS from a separate process ===
PRISM_JOB_RESULT {"peakJobMemoryMB":414.8,"jobName":"prism-slot-zzzlive","activeProcesses":2,"anchorAlive":true,"schemaVersion":"1.1.0","assignedClaudePid":28684,"exists":true,"dryRun":false,"tool":"slot-job-object","message":"slot \u0027zzzlive\u0027 job=anchore
... [+161 chars truncated]

### Assistant | 2026-05-17T20:36:56.596Z

Live anchor working: STATUS reports `anchored-active`, 2 active processes, anchorAlive true, anchorPid 22348, claudePid 28684. Now the critical test — kill the anchor, then verify the `-Assign` orphaned-job guard refuses against the now-orphaned job (the round-2 P0 scenario), and verify kill-on-job-close reaped the child.

### Assistant | 2026-05-17T20:37:00.145Z

[tool_use: Bash]

### User | 2026-05-17T20:37:07.958Z

[tool_result] === Kill anchor pid 22348 ===
anchor killed
=== Is watched child 28684 still alive? (should be DEAD via kill-on-job-close) ===
child reaped OK
=== STATUS post-kill (should be no-job, stale sidecar) ===
PRISM_JOB_RESULT {"dryRun":false,"tool":"slot-job-object","state":"no-job","exists":false,"slot":"zzzlive","ok":true,"jobName":"prism-slot-zzzlive","mode":"status","message":"no live job object fo
... [+114 chars truncated]

### Assistant | 2026-05-17T20:37:13.958Z

Kill-on-job-close confirmed. Now the orphaned-job P0 test: when an anchor dies but the job lingers (because something else holds a handle), `-Assign` must refuse. The job collected here too fast to catch that window naturally — but I need to verify the guard's *logic* directly. The key question for arm B: does the orphaned-job guard's `Read-Sidecar` → `Test-PidAlive` sequence have a TOCTOU window, and does it leak the handle? Let me also clean up the test sidecar.

### Assistant | 2026-05-17T20:37:15.240Z

[tool_use: Bash]

### User | 2026-05-17T20:37:17.834Z

[tool_result] test sidecars cleaned
(empty)

### Assistant | 2026-05-17T20:37:29.229Z

Now let me do the careful static analysis of the four arm-B weighted concerns. I have the full file. Let me trace each path precisely.

**1. `-Assign` orphaned-job guard TOCTOU (lines 458-479):**
- L458-459: `OpenExisting` → `$hJob` (handle held)
- L471: `Read-Sidecar` → `$asc`
- L472: `Test-PidAlive([int]$asc.anchorPid)` — if anchor NOT alive → L473 `Close($hJob)` → L474 `Emit-Result ... exit 1`
- L480-490: if alive → `try { AssignPid } finally { Close($hJob) }`

The residual TOCTOU window: anchor passes `Test-PidAlive` at L472, then dies between L472 and `AssignPid` at L481. If the anchor was the last handle holder, the job is collected, and `AssignPid` would fail (job handle invalid) — caught by the `catch` at L488, `Close` in `finally` L490. Safe. If the anchor dies but the job survives momentarily, the assigned pid still gets reaped — but this is the *inherent* nature of kill-on-job-close and is now documented in the SHARP EDGE. The window is acceptable and there's no handle leak on any path.

**2. `-Anchor` TOCTOU re-check (lines 548-558) — `Emit-Result` inside `try` after `$hJob=$null`:** Let me verify the `finally` interaction precisely.

### Assistant | 2026-05-17T20:37:29.907Z

[tool_use: Read]

### User | 2026-05-17T20:37:31.631Z

[tool_result] 539	    $hJob = $null
540	    $errObj = $null
541	    try {
542	        $hJob = [PrismJobObject]::CreateConfigured($jobName, [uint32]$ActiveProcessLimit, [uint64]$jobMemByte, $true)
543	        $alreadyExisted = [PrismJobObject]::LastCreateAlreadyExisted
544	
545	        # TOCTOU close-out: another anchor may have won CreateJobObject between
546	        # the conflict-guard read above and here. If
... [+5491 chars truncated]

### Assistant | 2026-05-17T20:37:47.831Z

I have what I need for full static verification. Let me trace the TOCTOU re-check `finally` interaction precisely.

**Concern 2 — `-Anchor` TOCTOU re-check `Emit-Result` inside `try` (lines 552-556):**

`Emit-Result` calls `exit $ExitCode` (line 151). In PowerShell, `exit` inside a `try` block **does** run the associated `finally` block before the process terminates. So when L556 `Emit-Result` is reached:
- L552 already ran `Close($hJob); $hJob=$null`
- `Emit-Result` writes `PRISM_JOB_RESULT`, then calls `exit 1`
- The `finally` at L625 runs: `if ($hJob)` → `$hJob` is `$null` → skipped. Correct, no double-close.
- `exit 1` proceeds.

**Is there a double-emit of `PRISM_JOB_RESULT`?** The TOCTOU `Emit-Result` at L553-556 emits once and exits. The `finally` does not call `Emit-Result`. The post-`try` `Emit-Result $errObj 1` at L634 is unreachable because `exit` already terminated. No double-emit. **PASS.**

One subtle point worth noting: the happy-path `exit 0` at L622 is also inside the `try`, and its `finally` runs with `$hJob=$null` → skipped. Correct. The `catch` at L623 sets `$errObj` but does NOT exit — control flows through `finally` (L628 cleanup runs since `$hJob` non-null on exception) then to L634 `Emit-Result $errObj 1`. Correct, single emit on exception path.

**Concern 3 — `[string[]]$LaunchArgs` binding edges:** Verified live above — empty default `@()` (L566 `$LaunchArgs.Count -gt 0` is false → `ArgumentList` key not added, `Start-Process` runs with no args), and populated array both work. A dash-leading element like `-NoProfile` is passed as an array element to `-ArgumentList`, not parsed as a parameter to `Start-Process` itself — PowerShell array binding to `-ArgumentList` is positional-safe. **PASS.**

**Concern 4 — destructive-safety:** SHARP EDGE block (L104-109) now explicitly names both pid-entry paths (launched child tree AND `-Assign`-ed pid). `.PARAMETER ProcessId` (L69-72) carries the caution. The `-Assign` `.EXAMPLE` (L91-94) carries it. The
... [+266 chars truncated]

### Assistant | 2026-05-17T20:37:53.141Z

[tool_use: Bash]

### User | 2026-05-17T20:37:56.662Z

[tool_result] === STATUS with malformed sidecar (no anchorPid) ===
PRISM_JOB_RESULT {"dryRun":false,"tool":"slot-job-object","state":"no-job","exists":false,"slot":"zzzmalf","ok":true,"jobName":"prism-slot-zzzmalf","mode":"status","message":"no live job object for slot \u0027zzzmalf\u0027 (stale sidecar present)","schemaVersion":"1.1.0","anchorAlive":false,"anchorPid":0}

=== Assign against malformed sidecar (j
... [+562 chars truncated]

### Assistant | 2026-05-17T20:38:26.683Z

All edge cases pass cleanly. Malformed sidecar (no `anchorPid`) → `anchorPid:0`, `anchorAlive:false`, no crash. Multi-mode usage guard works.

I have everything needed for the verdict. Let me record the final analysis.

---

## ARM B — ROUND-3 INDEPENDENT REVIEW VERDICT

**File:** `H:\prism\.claude\helpers\slot-job-object.ps1` (REAPER-PERMFIX-MS1/U-C1)

### Round-2 P0/P1 — all genuinely resolved

| Round-2 finding | Status | Evidence |
|---|---|---|
| **P0** Assign into orphaned job (silent kill) | **RESOLVED** | L471-479: after `OpenExisting` succeeds, `Read-Sidecar` + `Test-PidAlive(anchorPid)`; if no live anchor → `Close($hJob)` (L473) **before** `Emit-Result ... state:"orphaned-job" exit 1` (L474-478). Close-before-refuse confirmed; no handle leak. |
| **P0** SHARP EDGE doc gap | **RESOLVED** | `.NOTES` L104-109 now names both reap paths (`-LaunchChild` tree AND `-Assign`-ed pid); `.PARAMETER ProcessId` L69-72 + `-Assign` `.EXAMPLE` L91-94 carry explicit cautions. |
| **P1-3** `-LaunchArgs` single-string footgun | **RESOLVED** | L121 `[string[]]$LaunchArgs = @()`; L566 `$LaunchArgs.Count -gt 0` gate; passed as array to `-ArgumentList`. Verified live: empty default + populated array + dash-leading element all bind correctly. |
| **P1-4** conflict-guard TOCTOU | **RESOLVED** | L548-558: post-`CreateConfigured`, `LastCreateAlreadyExisted` true → re-read sidecar; different live `anchorPid` → `Close($hJob); $hJob=$null` then stand down exit 1. Comment softened to "(best-effort)" L528. |
| **ALSO** `Test-SlotName` case-insensitive `-match` | **RESOLVED** | L164 `-cmatch`; verified live — `BAD`/`Alpha`/`al_pha`/`-alpha`/`alpha-`/`""` rejected, `alpha`/`wedm-studio`/`a` accepted. |

### Arm-B weighted concerns — all clear
1. **`-Assign` orphaned-job guard TOCTOU** — residual window (anchor dies between `Test-PidAlive` L472 and `AssignPid` L481) exists but is *acceptable and inherent*: if the job is collected, `AssignPid` throws → `catch` L488 → `Close` in `finally` L490
... [+2893 chars truncated]
