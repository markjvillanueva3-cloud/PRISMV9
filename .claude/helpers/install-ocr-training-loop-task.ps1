# install-ocr-training-loop-task.ps1
# U-XRAY-CORPUS-TRAIN-TASK - register a Windows Scheduled Task that runs the CLOSED-LOOP TRAINING
# lane (calibrate ensemble trust -> weak-label the drawing corpus into a tiered trainset + AL queue)
# unattended, reaper-immune. Built because a foreground corpus run kept getting reaped (exit 255)
# under heavy fleet load; the runner is RESUMABLE (processed-cursor.jsonl) so each run advances the
# corpus monotonically. Sister to install-blueprint-ocr-batch-task.ps1 (the raw-OCR-extract lane).
#
# Runs WITHOUT Claude - survives closing the chat windows. The wrapper run-ocr-training-loop-overnight.ps1
# keeps a live PowerShell parent so node is never orphan-reaped, and allocates a hidden console so
# pdf-to-png.py page-count returns fast.
#
# USAGE (run from an ELEVATED PowerShell):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-ocr-training-loop-task.ps1 -At "02:00"
#   add -RunNow to also kick it immediately (test); -Daily for a daily recurring run (default one-shot);
#   -Uninstall to remove the task.

param(
  [string]$At = "02:00",                 # HH:mm local start (today if future, else tomorrow)
  [switch]$Daily,                        # daily recurring (default: one-shot at -At)
  [switch]$Continuous,                   # DO-IT-ALL-UNTIL-COMPLETE: unlimited run-time + 30-min backstop
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM OCR Training Loop"
$Wrapper  = "H:/prism/scripts/run-ocr-training-loop-overnight.ps1"
$Worklist = "H:/prism/state/shared/ocr-training-loop/corpus-worklist-drawing.txt"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[ocr-train] uninstalled task '$TaskName'"
  } else { Write-Host "[ocr-train] task '$TaskName' not present" }
  exit 0
}

if (-not (Test-Path $Wrapper))  { throw "wrapper not found: $Wrapper" }
if (-not (Test-Path $Worklist)) { throw "drawing worklist not found: $Worklist (run: node scripts/build-print-corpus-manifest.mjs --emit-worklist --worklist-bucket drawing)" }

# The action runs the wrapper PowerShell (which keeps node's live parent + allocates a console).
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Wrapper`"" `
  -WorkingDirectory "H:/prism"

# Trigger: -Continuous (do-it-all-until-complete), -Daily recurring, or one-shot at $At.
$now = Get-Date
if ($Continuous) {
  # Start ~2 min from now so the backstop begins IMMEDIATELY (no wait for a 02:00 window), then relaunch
  # every 30 min for a decade (effectively indefinite). The runner drains the WHOLE remaining worklist in
  # one launch (no internal budget), so this repetition is purely a BACKSTOP: a reaper/reboot/crash death
  # auto-resumes from processed-cursor.jsonl within 30 min. MultipleInstances=IgnoreNew (set below) means a
  # relaunch while a run is alive is a no-op -> never two grinders on the same cursor. --until-complete in
  # the wrapper makes a relaunch on an already-drained corpus a cheap fast-exit (no re-calibration).
  $start = $now.AddMinutes(2)
  $trigger = New-ScheduledTaskTrigger -Once -At $start `
    -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 3650)
} else {
  $start = [datetime]::ParseExact($At, "HH:mm", $null)
  $start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
  if ($start -le $now) { $start = $start.AddDays(1) }
  $trigger = if ($Daily) { New-ScheduledTaskTrigger -Daily -At $start } else { New-ScheduledTaskTrigger -Once -At $start }
}

# Run whether-logged-on-or-not, highest privileges, survive battery, allow a long run.
# -Continuous removes the 12h ExecutionTimeLimit (TimeSpan::Zero = no limit) so ONE run can grind the
# full ~7,419-print corpus for days; otherwise keep the 12h cap (one nightly window). IgnoreNew across
# both modes guarantees a backstop/RunNow relaunch never spawns a 2nd concurrent grinder on the cursor.
$execLimit = if ($Continuous) { [TimeSpan]::Zero } else { (New-TimeSpan -Hours 12) }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit $execLimit -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "[ocr-train] registered '$TaskName'"
$mode = if ($Continuous) { ' CONTINUOUS (every 30m backstop, unlimited run-time)' } elseif ($Daily) { ' daily' } else { ' one-shot' }
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$mode"
Write-Host "  worklist : $Worklist (resumable - re-run continues from processed-cursor.jsonl)"
Write-Host "  out      : H:/prism/state/shared/ocr-training-loop/corpus-train/{trainset,active-learning-queue,processed-cursor}.jsonl"
Write-Host "  log      : H:/prism/state/shared/ocr-training-loop-live.log"
Write-Host "  review   : the trainset yield + AL queue (operator-verify the queue before LoRA fine-tune)"

if ($RunNow) {
  Write-Host "[ocr-train] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
