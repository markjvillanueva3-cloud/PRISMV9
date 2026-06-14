# install-blueprint-ocr-batch-task.ps1
# U-PSGB-XRAY-BATCH (#6) — register a ONE-SHOT Windows Scheduled Task that runs
# the overnight blueprint-vision OCR batch while the chat fleet is down (the
# live-pilot blocker is fleet GPU+CPU saturation; an idle host lets the VL model
# stay GPU-resident). Runs WITHOUT Claude — survives closing the chat windows.
#
# Sister to install-fleet-reaper-task.ps1 (same pattern). One-shot: fires once at
# -At, then the task is left registered (re-run -RunNow or re-install to repeat).
# The batch itself is RESUMABLE (SHA-256 checkpoint) so subsequent nights continue.
#
# USAGE (run from an ELEVATED PowerShell, AFTER closing the other chat windows):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-blueprint-ocr-batch-task.ps1 -At "01:00" -TimeBudgetMin 420
#   add -RunNow to also kick it immediately (test); -Preprocess to binarize scans;
#   -Uninstall to remove the task.

param(
  [string]$At = "01:00",                 # HH:mm local start time (today if future, else tomorrow)
  [int]$TimeBudgetMin = 420,             # stop cleanly after N minutes (default 7h)
  [string]$Worklist = "H:/prism/state/shared/blueprint-ocr-worklist-pilot.txt",
  [int]$MaxPages = 8,
  [string]$PartClass = "unknown",
  [switch]$Preprocess,                   # opt-in opencv binarize+despeckle (default grayscale-only, the safe tier)
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM Blueprint OCR Batch"
$Node    = "H:/Tools/nodejs/node.exe"
$Script  = "H:/prism/scripts/batch-ollama-vision-extract.mjs"
$LogDir  = "H:/prism/state/shared"
$Stamp   = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = "$LogDir/blueprint-ocr-batch-$Stamp.log"
$Summary = "$LogDir/blueprint-ocr-batch-summary-$Stamp.json"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[ocr-batch] uninstalled task '$TaskName'"
  } else { Write-Host "[ocr-batch] task '$TaskName' not present" }
  exit 0
}

if (-not (Test-Path $Node))     { throw "node not found: $Node" }
if (-not (Test-Path $Script))   { throw "batch script not found: $Script" }
if (-not (Test-Path $Worklist)) { throw "worklist not found: $Worklist (run scripts/build-blueprint-ocr-worklist.mjs first)" }

# Build the batch argument list. --grayscale by default (safe tier); --preprocess opt-in.
$renderFlag = if ($Preprocess) { "--preprocess" } else { "--grayscale" }
$argLine = "`"$Script`" --worklist `"$Worklist`" --part-class $PartClass $renderFlag --assume-units in --max-pages $MaxPages --time-budget-min $TimeBudgetMin --summary `"$Summary`""

# The action runs node and tees output to a log (cmd wrapper for redirection).
$cmd = "`"$Node`" $argLine > `"$LogFile`" 2>&1"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c $cmd" -WorkingDirectory "H:/prism"

# Trigger: one-shot at $At (today if still future, else tomorrow).
$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$trigger = New-ScheduledTaskTrigger -Once -At $start

# Run whether-logged-on-or-not, highest privileges, survive battery, allow long run.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 12)
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "[ocr-batch] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local), one-shot"
Write-Host "  budget   : $TimeBudgetMin min   render: $renderFlag   maxPages: $MaxPages"
Write-Host "  worklist : $Worklist"
Write-Host "  log      : $LogFile"
Write-Host "  summary  : $Summary"
Write-Host "  review in the morning: the summary JSON + state/shared/blueprint-accuracy-events.jsonl"

if ($RunNow) {
  Write-Host "[ocr-batch] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
