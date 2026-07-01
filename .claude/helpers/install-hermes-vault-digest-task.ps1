param(
  [string]$TaskName = 'PRISM Hermes Vault Digest',
  [int]$IntervalMinutes = 240,
  [int]$Count = 8,
  [switch]$AsCurrentUser,   # S4U (runs logged-on-or-not; needs elevation to register)
  [switch]$AsSystem,        # SYSTEM principal (needs elevation)
  [switch]$Uninstall,
  [switch]$RunNow
)

# install-hermes-vault-digest-task.ps1 - durable scheduler for the Hermes+Obsidian vault digest.
#
# WHY (slot:zulu 2026-06-23): scripts/hermes-vault-digest.mjs synthesizes the most-recent vault notes
# through Hermes (xAI Grok, via ask-hermes --no-fallback) and writes the digest back into the vault's
# knowledge/hermes-outputs/ lane. Running it on a cadence keeps HERMES utilization warm (each run
# records the ask-hermes telemetry -> reconcile-zulu-ledger gradeHermesUtilization stays UTILIZED,
# never goes >48h stale) AND keeps a fresh synthesized vault brief landing for the fleet -- all at
# $0 Claude tokens (Grok does the synthesis). The operator asked to "get optimal utilization up for
# hermes + hermes/obsidian combos"; this is the sustained-utilization vehicle.
#
# SAFE TO FIRE: --no-fallback means a :8645-down condition fails loud (no write, no Ollama mislabel),
# so a run only ever produces a digest when Hermes is genuinely up. MultipleInstances IgnoreNew
# prevents overlap. No physics, no machine output -> no safety tier.
#
# DEFAULT principal: current interactive user (NO elevation required) - runs while logged on, which
# is when the proxy + fleet are live. Use -AsCurrentUser (S4U) or -AsSystem (both need an elevated
# PowerShell) for logged-off robustness. ASCII-only (PS 5.1 codepage safe).

$ErrorActionPreference = 'Stop'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered: $TaskName"
  } else { Write-Host "Not found (already uninstalled): $TaskName" }
  return
}

$digestScript = 'H:\PRISM\scripts\hermes-vault-digest.mjs'
if (-not (Test-Path $digestScript)) { throw "Not found: $digestScript (run on the PRISM host)." }

$node = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $node = $cand; break }
}
if (-not $node) { $node = (Get-Command node -ErrorAction Stop).Source }

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$digestScript`" --count $Count" -WorkingDirectory 'H:\PRISM'

# -Once + RepetitionInterval = fire every N minutes indefinitely. The digest is idempotent-by-time
# (writes a timestamped file) and cheap; a 4h default keeps Hermes warm without spamming Grok.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit 10m: one Grok synthesis of N notes; cap so a wedged proxy call never lingers.
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 1 -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$desc = "Hermes+Obsidian vault digest: runs scripts/hermes-vault-digest.mjs every $IntervalMinutes min - synthesizes the $Count most-recent vault notes through Hermes (Grok, --no-fallback) into knowledge/hermes-outputs/. Keeps HERMES utilization warm + a fresh vault brief landing, at \$0 Claude tokens. Fails loud (no write) if the :8645 proxy is down. slot:zulu."

# Principal: only attach one for the elevated variants. Default = current interactive user (no
# -Principal => registers in the caller's context, no elevation needed).
$principal = $null
if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
} elseif ($AsCurrentUser) {
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
}

$params = @{ TaskName = $TaskName; Action = $action; Trigger = $trigger; Settings = $settings; Description = $desc; Force = $true }
if ($principal) { $params['Principal'] = $principal }
Register-ScheduledTask @params | Out-Null

$mode = if ($AsSystem) { 'SYSTEM (logged-off-capable, no UAC)' } elseif ($AsCurrentUser) { 'S4U/current-user (logged-off-capable)' } else { 'current interactive user (runs while logged on)' }
Write-Host "Registered: $TaskName (every $IntervalMinutes min, count=$Count, $mode, node=$node)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered now. LastTaskResult=$($info.LastTaskResult) (0=clean, 1=proxy-down/no-write)"
}

Write-Host ""
Write-Host "Knobs:"
Write-Host "  --count N            notes per digest (default 8)"
Write-Host "  --IntervalMinutes N  cadence (default 240 = 4h)"
Write-Host "Verify:    schtasks /Query /TN '$TaskName'"
Write-Host "Dry-run:   & '$node' '$digestScript' --query hermes --count 6 --dry"
Write-Host "Uninstall: & '$PSScriptRoot\install-hermes-vault-digest-task.ps1' -Uninstall"
