# install-cam-tool-library-cron.ps1 -- register the nightly CAM tool-library regen+place cron.
#
# WHY (slot:romeo, 2026-06-19): the operator asked for "harnesses, loops and crons". This registers
# a Windows scheduled task that runs scripts/cam-tool-library-cron.mjs nightly so every CAD/CAM seat
# always carries freshly regenerated + validated per-brand tool libraries (Fusion / hyperMILL /
# Mastercam). Deterministic (no Claude tokens), user-level (no elevation), idempotent (re-run safe).
#
# Run:    powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-cam-tool-library-cron.ps1 [-RunNow]
# Remove: Unregister-ScheduledTask -TaskName 'PRISM CAM Tool Library Regen' -Confirm:$false

param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
$TaskName = 'PRISM CAM Tool Library Regen'
$Node     = 'H:\Tools\nodejs\node.exe'
$Script   = 'H:\prism\scripts\cam-tool-library-cron.mjs'
$WorkDir  = 'H:\prism'

if (-not (Test-Path $Node))   { $Node = (Get-Command node).Source }   # fallback to PATH node
if (-not (Test-Path $Script)) { throw "cron script not found: $Script" }

# --experimental-sqlite is required for the hyperMILL .hmt binary build during placement.
$Action  = New-ScheduledTaskAction -Execute $Node -Argument "--experimental-sqlite `"$Script`"" -WorkingDirectory $WorkDir
# 03:17 local -- off-peak, deliberately NOT on the :00 mark.
$Trigger = New-ScheduledTaskTrigger -Daily -At 3:17AM
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$Principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal `
  -Description 'Nightly: regenerate + validate + place the per-brand CAM tool libraries into the Fusion/hyperMILL/Mastercam seats. Source: scripts/cam-tool-library-cron.mjs (slot:romeo).' `
  -Force | Out-Null

Write-Output "Registered scheduled task '$TaskName' (daily 03:17)."
Write-Output "  exec: $Node --experimental-sqlite $Script"

if ($RunNow) {
  Write-Output 'Running once now...'
  Start-ScheduledTask -TaskName $TaskName
}
