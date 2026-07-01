# harden-prism-tasks.ps1 -- make every PRISM* scheduled task "always active no matter what".
#
# WHY (golf, 2026-05-31): an audit found 13 reaper/monitor/janitor tasks ran logon=Interactive
# (they DIE at user logoff/lock), 19 had no restart-on-failure, and 2 wouldn't start on battery.
# This script re-applies the always-active hardening to ALL PRISM* tasks. It is IDEMPOTENT +
# self-healing -- run by the "PRISM Task Hardener" daily task so any drift (an installer script
# re-registering a task with weak defaults, a manual disable) is auto-corrected within 24h.
#
# Hardening applied per task:
#   - Principal Interactive -> S4U (run whether the user is logged on or not; S4U keeps the
#     user's H: drive + node, unlike SYSTEM which may not see a mapped/user volume).
#   - RestartCount=3 / RestartInterval=1min (a single failure auto-retries).
#   - DisallowStartIfOnBatteries=false + StopIfGoingOnBatteries=false (run on battery).
#   - StartWhenAvailable=true (catch up a missed run).
#   - RunOnlyIfNetworkAvailable=false + RunOnlyIfIdle=false (no network/idle gating).
#   - Enabled=true (re-enables anything that got disabled).
# SYSTEM / existing-S4U tasks keep their principal (already logon-independent).
#
# Manual run: powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/harden-prism-tasks.ps1
$ErrorActionPreference = 'Continue'
$tasks = Get-ScheduledTask -TaskName "PRISM*" -ErrorAction SilentlyContinue
$n = 0; $s4u = 0; $disabledBroken = 0; $deliberateKept = 0; $fails = @()

# DELIBERATELY-DISABLED LEDGER (U-SIERRA-UTIL-GOVERNOR, 2026-06-25): without this, the
# "Enabled = -not scriptMissing" rule below blindly RESURRECTS completed one-shot migrations
# and any task an operator deliberately retired (valid script, intentionally dark). The ledger
# at state/shared/fleet/deliberately-disabled-tasks.json is the single source of "keep dark
# even though the script exists". Fail-OPEN on parse error: an unreadable ledger degrades to
# "no task is deliberate" (a completed migration re-running is harmless noise, NOT a fleet
# outage) -- but log LOUD so the drift is visible. (Fail-CLOSED would disable the whole fleet,
# far worse.)
$ledgerPath = 'H:/prism/state/shared/fleet/deliberately-disabled-tasks.json'
$deliberate = @{}
if (Test-Path -LiteralPath $ledgerPath) {
  try {
    $lj = Get-Content -LiteralPath $ledgerPath -Raw -ErrorAction Stop | ConvertFrom-Json
    foreach ($e in $lj.tasks) { if ($e.name) { $deliberate[$e.name] = $true } }
  } catch { Write-Output "  WARN deliberately-disabled ledger parse FAILED ($($_.Exception.Message)) -- proceeding with EMPTY ledger (migrations may re-enable)" }
}

# CRASH-CRITICAL GUARD (U-CRON-LEDGER-GUARD, scrutiny arm-C P1): the ledger must NEVER keep a
# safety-net task dark. This mirrors CRASH_CRITICAL_TASKS + MUST_EXIST_TASKS in
# scripts/fleet-task-health-watch.mjs (source of truth = the install-*-task.ps1 scripts; keep in
# sync). If a future editor ledgers one of these, we IGNORE the ledger entry and force it ENABLED
# -- the reaper / memory-monitor / MCP-server / self-heal net must always run, no matter what.
$crashCritical = @(
  'PRISM Fleet Reaper','PRISM Fleet Memory Monitor','PRISM Cleanup Orchestrator',
  'PRISM Node Orphan Cleaner','PRISM WSL Memory Guard','PRISM Zombie Reaper v2',
  'PRISM Zulu Orchestrator','PRISM MCP Server','PRISM MCP Server Watchdog','PRISM Fleet Task Health'
)

# Extract the primary script file a task runs (first .mjs/.js/.ps1 in exec+args), or $null.
#
# The char-class EXCLUDES quotes AND whitespace ([^"'\s]) -- NOT just double-quote. When a task's
# command line contains a FULL-PATH interpreter before the script -- in EITHER of these common
# shapes:
#     unquoted: H:\Tools\nodejs\node.exe  H:\prism\scripts\foo.mjs
#     quoted:   powershell -Command "& 'C:\...\node.exe' 'H:\...\foo.mjs'"
# a permissive char-class lets the non-greedy match SPAN from the FIRST drive-letter (the
# interpreter) across the space/quote boundary into the script's suffix, concatenating the two
# into one garbage path (e.g. `H:\Tools\nodejs\node.exe H:\prism\scripts\foo.mjs` as a single
# token). That string fails Test-Path, so the caller (Enabled = -not scriptMissing, below) wrongly
# concludes the script is MISSING and DISABLES a perfectly healthy task on every 6h hardener run.
# This silently false-disabled crash-critical PRISM Zombie Reaper v2 (quoted shape) AND
# Hermes-Obsidian Bridge / Ollama Night Batch / Slot Worktree Migration Status (unquoted shape)
# -- golf, 2026-06-15; ledger fleet-task-reenable-ledger.jsonl showed ~8 false re-enables of
# Zombie Reaper v2 in 2 days, and the G10 guard only heals crash-critical tasks so the others
# stayed wrongly Disabled. Excluding BOTH whitespace and quotes makes the match stop at the same
# boundaries the shell uses to split args, so the interpreter (`.exe`, never a script suffix) is
# skipped and the real script path is isolated. PRISM script paths never contain a space or quote
# (they live under H:\prism\... / H:\PRISM\... / %TEMP%\), so excluding those chars is safe.
function Get-TaskScript($task) {
  foreach ($a in $task.Actions) {
    $m = [regex]::Match("$($a.Execute) $($a.Arguments)", '([A-Za-z]:\\[^"''\s]+?\.(?:mjs|js|ps1))')
    if ($m.Success) { return $m.Groups[1].Value }
  }
  return $null
}
foreach ($t in $tasks) {
  if ($t.TaskName -eq 'PRISM Task Hardener') { continue }   # never reharden self mid-run
  try {
    $script = Get-TaskScript $t
    $scriptMissing = ($null -ne $script) -and (-not (Test-Path -LiteralPath $script))
    $s = $t.Settings
    $s.DisallowStartIfOnBatteries = $false
    $s.StopIfGoingOnBatteries     = $false
    $s.StartWhenAvailable         = $true
    $s.RunOnlyIfNetworkAvailable  = $false
    $s.RunOnlyIfIdle              = $false
    $s.RestartCount               = 3
    $s.RestartInterval            = 'PT1M'
    # Self-healing BOTH ways: a task whose script file is MISSING is auto-DISABLED (stops the
    # endless exit-1 fail-spam) until the script reappears (e.g. the owning slot merges it);
    # valid tasks are (re-)enabled -- UNLESS the deliberately-disabled ledger says keep it dark
    # (completed one-shot migrations / operator-retired tasks). Set Enabled LAST so it wins.
    $isDeliberate                 = $deliberate.ContainsKey($t.TaskName)
    if ($isDeliberate -and ($crashCritical -contains $t.TaskName)) {
      Write-Output "  WARN ledger names CRASH-CRITICAL task '$($t.TaskName)' -- IGNORING ledger entry, forcing ENABLED (safety net must run)"
      $isDeliberate = $false
    }
    $s.Enabled                    = (-not $scriptMissing) -and (-not $isDeliberate)
    Set-ScheduledTask -TaskName $t.TaskName -Settings $s -ErrorAction Stop | Out-Null
    if ($isDeliberate) {
      $deliberateKept++
      Write-Output "  KEPT-DARK (deliberate ledger): $($t.TaskName)"
    } elseif ($scriptMissing) {
      $disabledBroken++
      Write-Output "  DISABLED (script missing): $($t.TaskName) -> $script"
    } else {
      $n++
      if ($t.Principal.LogonType -eq 'Interactive') {
        $rl = if ($t.Principal.RunLevel) { $t.Principal.RunLevel } else { 'Limited' }
        Set-ScheduledTask -TaskName $t.TaskName -Principal (New-ScheduledTaskPrincipal -UserId $t.Principal.UserId -LogonType S4U -RunLevel $rl) -ErrorAction Stop | Out-Null
        $s4u++
      }
    }
  } catch { $fails += ("{0}: {1}" -f $t.TaskName, $_.Exception.Message) }
}
Write-Output ("[harden-prism-tasks] {0} hardened={1} s4u-converted={2} disabled-broken={3} deliberate-kept-dark={4} fails={5}" -f (Get-Date -Format o), $n, $s4u, $disabledBroken, $deliberateKept, $fails.Count)
foreach ($f in $fails) { Write-Output "  FAIL $f" }
