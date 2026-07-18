<#
.SYNOPSIS
    Install or update the "PRISM Cost Alarm" Windows scheduled task.

.DESCRIPTION
    COST-CASCADE-MS0 / U-COST-ALARM step-4.
    Runs scripts/cost-alarm-tick.mjs every 15 minutes (cron `*/15 * * * *`)
    so the engine aggregates today's cost-telemetry.jsonl and fires alarms
    when daily/weekly USD or token caps are crossed.

    Default principal is SYSTEM (consistent with PRISM Fleet Reaper after
    U-FR-ADMIN-HUNT 2026-05-18): runs in session 0, no flashing window,
    no logged-on-user requirement. `-AsCurrentUser` opts down to S4U;
    `-Interactive` for legacy on-login-only mode.

    Idempotent: re-running unregisters the existing task and reinstalls.
    Use `-Uninstall` to remove cleanly.

    Phase offset +540s (9 min) keeps this task clear of the other PRISM
    scheduled tasks that fire at the top of the hour (Cleanup Orchestrator
    +60s, Memory Pressure +120s, PRISM Fleet Reaper +210s, Fleet Memory
    Monitor +330s, Fleet Task Health +420s).

.PARAMETER PrismRoot
    Repository root. Defaults to H:\prism.

.PARAMETER IntervalMinutes
    Cron cadence in minutes. Defaults to 15 (cron `*/15 * * * *`).

.PARAMETER StartOffsetSeconds
    Seconds past the first interval boundary before the first run. Default 540.

.PARAMETER RunNow
    Trigger one run immediately after registration; poll for up to 60s.

.PARAMETER Uninstall
    Remove the task instead of installing.

.PARAMETER AsCurrentUser
    Use S4U principal (current user) instead of SYSTEM.

.PARAMETER Interactive
    Legacy on-login-only mode (no -Principal -- runs only when user is logged in).

.PARAMETER DryRun
    Print what would be done without making changes.
#>

[CmdletBinding()]
param(
    [string]$PrismRoot = "H:\prism",
    [int]$IntervalMinutes = 15,
    [int]$StartOffsetSeconds = 540,
    [switch]$RunNow,
    [switch]$Uninstall,
    [switch]$AsCurrentUser,
    [switch]$Interactive,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM Cost Alarm"
$TaskPath = "\"

function Write-Step($Msg) { Write-Host "[cost-alarm-task] $Msg" -ForegroundColor Cyan }
function Write-Warn($Msg) { Write-Host "[cost-alarm-task] $Msg" -ForegroundColor Yellow }
function Write-Err($Msg)  { Write-Host "[cost-alarm-task] $Msg" -ForegroundColor Red }

# Resolve node executable (portable first, then PATH)
$portableNode = Join-Path $PrismRoot ".claude\bin\portable-node.exe"
$nodeExe = if (Test-Path $portableNode) { $portableNode } else {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { $cmd.Source } else { $null }
}
if (-not $nodeExe) {
    Write-Err "node executable not found (looked for $portableNode, then PATH)"
    exit 2
}

$ScriptPath = Join-Path $PrismRoot "scripts\cost-alarm-tick.mjs"
if (-not (Test-Path $ScriptPath)) {
    Write-Err "runner script missing: $ScriptPath"
    exit 2
}

# Uninstall path
if ($Uninstall) {
    $existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
    if ($existing) {
        if ($DryRun) {
            Write-Step "DRYRUN: would Unregister-ScheduledTask '$TaskName'"
        } else {
            Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
            Write-Step "uninstalled: $TaskName"
        }
    } else {
        Write-Warn "no existing task to uninstall ($TaskName)"
    }
    exit 0
}

# Compose action
$Action = New-ScheduledTaskAction `
    -Execute $nodeExe `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory $PrismRoot

# Compose trigger -- repeat every $IntervalMinutes, indefinite
$startTime = (Get-Date).AddSeconds($StartOffsetSeconds)
$Trigger = New-ScheduledTaskTrigger -Once -At $startTime `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$Trigger.Repetition.Duration = ""  # indefinite

# Compose settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Compose principal
$RegisterParams = @{
    TaskName = $TaskName
    TaskPath = $TaskPath
    Action = $Action
    Trigger = $Trigger
    Settings = $Settings
    Description = "PRISM Cost Alarm -- runs CostAlarmEngine.check() every $IntervalMinutes min. COST-CASCADE-MS0/U-COST-ALARM."
    Force = $true
}

if ($Interactive) {
    Write-Step "principal: Interactive (legacy on-login-only -- only fires when user is logged in)"
    # No -Principal: registers under default user context, Interactive logon mode
} elseif ($AsCurrentUser) {
    $userName = "$env:USERDOMAIN\$env:USERNAME"
    Write-Step "principal: S4U $userName (runs whether logged on or not, no UAC)"
    $Principal = New-ScheduledTaskPrincipal -UserId $userName -LogonType S4U -RunLevel Highest
    $RegisterParams.Principal = $Principal
} else {
    Write-Step "principal: SYSTEM (machine account, no UAC, session 0)"
    $Principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $RegisterParams.Principal = $Principal
}

if ($DryRun) {
    Write-Step "DRYRUN: would Register-ScheduledTask '$TaskName' with:"
    Write-Host "  node: $nodeExe"
    Write-Host "  script: $ScriptPath"
    Write-Host "  cadence: every $IntervalMinutes min"
    Write-Host "  first run: $($startTime.ToString('o')) ($StartOffsetSeconds s offset)"
    Write-Host "  principal: $(if ($Interactive){'Interactive'} elseif ($AsCurrentUser){'S4U current user'} else {'SYSTEM'})"
    exit 0
}

try {
    $existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Warn "task already exists -- replacing"
        Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
    }
    $task = Register-ScheduledTask @RegisterParams
    Write-Step "registered: $TaskName"
    Write-Step "next run: $($task.Triggers[0].StartBoundary)"
} catch {
    Write-Err "Register-ScheduledTask failed -- $($_.Exception.Message)"
    exit 3
}

if ($RunNow) {
    Write-Step "RunNow -- triggering one immediate execution"
    Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
    # Poll for completion up to 60s
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        $info = Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskPath
        $task2 = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
        if ($task2.State -ne "Running" -and $info.LastRunTime -gt (Get-Date).AddMinutes(-5)) {
            $rc = $info.LastTaskResult
            $rcHex = "0x{0:X8}" -f $rc
            $exitName = switch ($rc) {
                0 { "clean (no alarms)" }
                1 { "alarms fired" }
                2 { "engine errors" }
                3 { "fatal" }
                default { "rc=$rc" }
            }
            Write-Step "first run complete -- LastTaskResult=$rcHex ($exitName) at $($info.LastRunTime.ToString('o'))"
            break
        }
        Start-Sleep -Milliseconds 500
    }
}

Write-Step "done."
