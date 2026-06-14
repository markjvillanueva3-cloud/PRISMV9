---
name: reference_fleet_reaper_autonomy_robust_2026_05_16
description: "FLEET-REAPER-MS1/U-FR-AUTONOMY-ROBUST — fixed the enumeration-blinding bug (PS5.1 ConvertTo-Json raw C0 bytes) + hardened the installer to a true-autonomous (S4U/AtStartup/restart) scheduled task. Two reusable gotchas."
aliases: reference_fleet_reaper_autonomy_robust_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.116Z
---


# [[reference_fleet_reaper|FLEET-REAPER]] autonomy + enumeration-robustness hardening

2026-05-16b, slot alpha, claude-fe461853, commit `2cd22c52`. Triggered by a
live operator report: "reaper not staying open / orphans accumulate / xmalloc
fork-storm." Diagnosis found the durable task was *running fine* — the reaper
was **blind**.

## ROOT CAUSE (the load-bearing find)

`process-slot-map.mjs` `windowsEnumerate()` builds a PS script as a JS
**backtick template literal**, runs `Get-CimInstance Win32_Process |
ConvertTo-Json`, then `JSON.parse(text)`. **Windows PowerShell 5.1's
ConvertTo-Json emits raw C0 control bytes inside JSON string literals (it does
NOT `\u`-escape them).** One process whose `CommandLine` holds a control char
(a `node --eval` payload, ~80 KB in, position 81874) → invalid JSON → Node
strict `JSON.parse` throws → the **entire** enumeration degrades to empty
(safe-but-blind state) → reaper sees 0 candidates while 33 orphan node procs
and ~95% commit memory accumulate (the `xmalloc: cannot allocate 8192 bytes`
fork-storm is the *downstream symptom*, not the cause).

**Fix:** in the PS script, `cmd = if ($p.CommandLine) { $p.CommandLine
-replace '[\x00-\x1F]', ' ' } else { $null }` — strip C0 controls BEFORE
ConvertTo-Json. Lossless for the reaper (it only structural-regex-matches
cmdline; controls never meaningful). **Space, not empty** — empty fuses
`while<TAB>true`→`whiletrue`, breaking `/while\s+true/`. Live-verified: sweep
went `0 candidates + "process enumeration failed" caveat` → `2 candidates, no
caveat`.

## Installer hardened to true-autonomous

`install-fleet-reaper-task.ps1` registered with **no `-Principal`** →
`Logon Mode: Interactive only` → the task did NOT run unless the installing
user was interactively logged in (confirmed live: `UserId wompu | LogonType
Interactive | RunLevel Limited`). Now: default **S4U** principal (`-RunLevel
Highest`, whether-logged-on-or-not, no stored password); `-AsSystem`
(strongest, machine account); `-Interactive` (legacy opt-out); second
`-AtStartup` trigger; `-RestartCount 3 -RestartInterval 1m`; `Register-
ScheduledTask` **splatted** so `-Principal` is omitted (NOT passed `$null`,
which throws) in legacy mode. `-Uninstall` / `Disable-ScheduledTask`
reversibility intact. One elevated run = set-and-forget:
`powershell -NoProfile -ExecutionPolicy Bypass -File
H:/prism/.claude/helpers/install-[[reference_fleet_reaper|fleet-reaper]]-task.ps1 -RunNow`.

## Reusable gotchas (cost real turns this session)

1. **Raw control bytes in source you Edit are invisible AND un-Edit-able.**
   The `[\x00-\x1F]` JS regex I wrote landed as literal U+0000/U+001F bytes
   (the Read/Write/Edit input layer strips them — same class as
   [[feedback_read_tool_strips_control_chars]]). Subsequent `Edit` old_string
   matches FAIL (can't byte-match what you can't type); `node -e` rewrites
   were reverted by the encoding-guard hook. Lesson: build control-char
   regexes at runtime via `new RegExp("["+String.fromCharCode(0)+"-"+
   String.fromCharCode(31)+"]")` and verify the invariant with a
   `String.fromCharCode`-built fixture in a temp script — never inline raw
   bytes, never pass them through a shell arg (the shell rejects NUL).
2. **A `node --eval` JS regex inside a PS-script template literal needs
   doubled backslashes.** `'[\\x00-\\x1F]'` in the JS backtick → literal
   `[\x00-\x1F]` reaches .NET regex. Single-backslash `\x00` → JS turns it
   into a real NUL byte; a `\uXXXX` in a *comment* inside that same template
   literal is a fatal JS "Invalid Unicode escape sequence". `node --check`
   catches the latter instantly — run it before the test, not after.

## Doctrine reaffirmed

Alpha owns the reaper ([[feedback_alpha_owns_reaper]]). The durable Windows
Scheduled Task — not an in-session Monitor — is the always-on mechanism; the
Monitor is a supplemental live feed only. Sister: [[reference_fleet_reaper]],
[[reference_fleet_reaper_ms1]], [[feedback_never_delete_only_disable]]
(`-Uninstall` / `Disable-ScheduledTask` are the reversal levers).
