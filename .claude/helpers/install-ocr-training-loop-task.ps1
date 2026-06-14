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

# Trigger: daily recurring, or one-shot at $At (today if still future, else tomorrow).
$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$trigger = if ($Daily) { New-ScheduledTaskTrigger -Daily -At $start } else { New-ScheduledTaskTrigger -Once -At $start }

# Run whether-logged-on-or-not, highest privileges, survive battery, allow a long run.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 12)
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "[ocr-train] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($Daily) {' daily'} else {' one-shot'})"
Write-Host "  worklist : $Worklist (resumable - re-run continues from processed-cursor.jsonl)"
Write-Host "  out      : H:/prism/state/shared/ocr-training-loop/corpus-train/{trainset,active-learning-queue,processed-cursor}.jsonl"
Write-Host "  log      : H:/prism/state/shared/ocr-training-loop-live.log"
Write-Host "  review   : the trainset yield + AL queue (operator-verify the queue before LoRA fine-tune)"

if ($RunNow) {
  Write-Host "[ocr-train] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
