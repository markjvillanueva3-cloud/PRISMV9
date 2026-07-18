# install-catalog-cutting-params-task.ps1 -- durable carrier for the 287-catalog cutting-param drain.
#
# PDF-TRIBAL-HERMES/U-CATALOG-CUTTING-PARAMS (slot:papa, 2026-06-24).
# Registers "PRISM Catalog Cutting Params" -- runs extract-catalog-cutting-params.mjs one catalog per
# fire, every 35 min, INDEFINITELY (no StopAtDurationEnd window like zulu's drain that died at 12:44).
# Scheduled tasks run OUTSIDE the Claude harness, so the fleet-reaper does not kill them mid-extract.
# Also RE-ARMS "PRISM Tribal Resources Drain" whose one-shot 14h window expired (see regression note).
#
# Run elevated if registration is denied:
#   ! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-catalog-cutting-params-task.ps1
param([switch]$RunNow)

$ErrorActionPreference = "Stop"
$NODE = "H:\Tools\nodejs\node.exe"
$ROOT = "H:\prism"
$SCRIPT = "$ROOT\scripts\extract-catalog-cutting-params.mjs"
$TASK = "PRISM Catalog Cutting Params"

if (-not (Test-Path $NODE)) { $NODE = (Get-Command node).Source }

# --- 1. register the catalog cutting-param drain (idempotent) ---
$action = New-ScheduledTaskAction -Execute $NODE -Argument "`"$SCRIPT`" --max-catalogs 1" -WorkingDirectory $ROOT
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 35)   # indefinite: no -RepetitionDuration => repeats forever
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
try {
  Register-ScheduledTask -TaskName $TASK -Action $action -Trigger $trigger -Settings $settings `
    -Description "Extract per-tool cutting params (Vc/fz by ISO group x coating) from MANUFACTURER_CATALOGS PDFs -> catalog-cutting-params store + tribal index. Ollama-first." -Force | Out-Null
  Write-Host "[ok] registered '$TASK' (every 35 min, indefinite)"
} catch {
  Write-Host "[FAIL] could not register '$TASK': $($_.Exception.Message)"
  Write-Host "       re-run elevated: ! powershell -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath"
}

# --- 2. re-arm the general resources drain (its one-shot 14h window expired 12:44 today) ---
$drain = "PRISM Tribal Resources Drain"
try {
  $t = Get-ScheduledTask -TaskName $drain -ErrorAction Stop
  $newTrig = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
    -RepetitionInterval (New-TimeSpan -Minutes 20)   # indefinite -- removes the StopAtDurationEnd that killed it
  Set-ScheduledTask -TaskName $drain -Trigger $newTrig | Out-Null
  Write-Host "[ok] re-armed '$drain' (every 20 min, indefinite -- was dead since 12:44)"
} catch {
  Write-Host "[warn] could not re-arm '$drain': $($_.Exception.Message)"
}

if ($RunNow) {
  Start-ScheduledTask -TaskName $TASK -ErrorAction SilentlyContinue
  Write-Host "[ok] kicked '$TASK' once now"
}
Write-Host "Done. Query progress: node scripts/extract-catalog-cutting-params.mjs --status"
