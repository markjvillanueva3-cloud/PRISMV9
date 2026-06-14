# harden-prism-tasks.ps1 — make every PRISM* scheduled task "always active no matter what".
#
# WHY (golf, 2026-05-31): an audit found 13 reaper/monitor/janitor tasks ran logon=Interactive
# (they DIE at user logoff/lock), 19 had no restart-on-failure, and 2 wouldn't start on battery.
# This script re-applies the always-active hardening to ALL PRISM* tasks. It is IDEMPOTENT +
# self-healing — run by the "PRISM Task Hardener" daily task so any drift (an installer script
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
$n = 0; $s4u = 0; $disabledBroken = 0; $fails = @()

# Extract the primary script file a task runs (first .mjs/.js/.ps1 in exec+args), or $null.
function Get-TaskScript($task) {
  foreach ($a in $task.Actions) {
    $m = [regex]::Match("$($a.Execute) $($a.Arguments)", '([A-Za-z]:\\[^"]+?\.(?:mjs|js|ps1))')
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
    # valid tasks are (re-)enabled. Set Enabled LAST so it wins.
    $s.Enabled                    = -not $scriptMissing
    Set-ScheduledTask -TaskName $t.TaskName -Settings $s -ErrorAction Stop | Out-Null
    if ($scriptMissing) {
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
Write-Output ("[harden-prism-tasks] {0} hardened={1} s4u-converted={2} disabled-broken={3} fails={4}" -f (Get-Date -Format o), $n, $s4u, $disabledBroken, $fails.Count)
foreach ($f in $fails) { Write-Output "  FAIL $f" }
