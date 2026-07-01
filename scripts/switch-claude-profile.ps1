<#
.SYNOPSIS
  Switch the active Claude Code profile between Opus 4.7 (1M) and Opus 4.5 (200K).

.DESCRIPTION
  Profile dirs live in H:/prism/.claude-profiles/. This script:
    1. Aborts if peer chats are active (unless -Force).
    2. Backs up current live files (timestamped).
    3. Snapshots model-tied state into outgoing profile.
    4. Copies target profile's files into live paths.
    5. Deep-merges target's settings-env.json into ~/.claude/settings.json.
    6. Restores incoming profile's state-snapshot (if present).
    7. Updates the ACTIVE marker + writes LAST_SWITCH.json.

  After switch, restart Claude Code (/exit + relaunch) for env vars to take effect.

.PARAMETER Target
  Profile to activate. Accepts:
    47          → opus47-1m
    45          → opus45-200k
    <full-name> → exact dir name under .claude-profiles/

.PARAMETER Status
  Print active profile + key env vars, then exit.

.PARAMETER Force
  Bypass peer-active abort.

.EXAMPLE
  .\switch-claude-profile.ps1 -Status
  .\switch-claude-profile.ps1 -Target 47
  .\switch-claude-profile.ps1 -Target 45 -Force
#>

[CmdletBinding(DefaultParameterSetName = 'Switch')]
param(
  [Parameter(ParameterSetName = 'Switch', Position = 0)]
  [string]$Target,

  [Parameter(ParameterSetName = 'Status')]
  [switch]$Status,

  [Parameter(ParameterSetName = 'Switch')]
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

# --- paths -------------------------------------------------------------------
$ProfilesDir   = 'H:/prism/.claude-profiles'
$ActiveMarker  = Join-Path $ProfilesDir 'ACTIVE'
$LastSwitchLog = Join-Path $ProfilesDir 'LAST_SWITCH.json'
$BackupRoot    = Join-Path $ProfilesDir '.backups'
$UserSettings  = 'C:/Users/Mark Villanueva/.claude/settings.json'
$HandoffsDir   = 'H:/prism/state/shared/handoffs'

function Read-ActiveProfile {
  if (Test-Path $ActiveMarker) {
    return (Get-Content $ActiveMarker -Raw).Trim()
  }
  return $null
}

function Resolve-ProfileName([string]$arg) {
  if ([string]::IsNullOrWhiteSpace($arg)) { return $null }
  switch ($arg) {
    '47'       { return 'opus47-1m' }
    '45'       { return 'opus45-200k' }
    'opus47'   { return 'opus47-1m' }
    'opus45'   { return 'opus45-200k' }
    default    { return $arg }
  }
}

function Show-Status {
  $active = Read-ActiveProfile
  $disable1m = '?'
  if (Test-Path $UserSettings) {
    try {
      $j = Get-Content $UserSettings -Raw | ConvertFrom-Json
      if ($j.env -and $j.env.CLAUDE_CODE_DISABLE_1M_CONTEXT) {
        $disable1m = $j.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
      }
    } catch { }
  }
  $lastTxt = 'never'
  if (Test-Path $LastSwitchLog) {
    try {
      $ls = Get-Content $LastSwitchLog -Raw | ConvertFrom-Json
      $lastTxt = "$($ls.ts) ($($ls.from) -> $($ls.to))"
    } catch { }
  }
  Write-Host '=== Claude Profile Status ===' -ForegroundColor Cyan
  Write-Host "  Active profile:                $active"
  Write-Host "  Last switch:                   $lastTxt"
  Write-Host "  CLAUDE_CODE_DISABLE_1M_CONTEXT: $disable1m  (0 = 1M enabled / Opus 4.7, 1 = 200K only / Opus 4.5)"
  if (Test-Path $ProfilesDir) {
    $profiles = Get-ChildItem $ProfilesDir -Directory | Where-Object { $_.Name -ne '.backups' } | ForEach-Object { $_.Name }
    Write-Host "  Available profiles:            $($profiles -join ', ')"
  }
}

function Test-PeersActive {
  if (-not (Test-Path $HandoffsDir)) { return @() }
  $cutoff = (Get-Date).ToUniversalTime().AddMinutes(-10)
  $stableSidPath = 'H:/prism/.claude/helpers/stable-session-id.mjs'
  $myStable = $null
  if (Test-Path $stableSidPath) {
    try { $myStable = (& node $stableSidPath 2>$null).Trim() } catch { $myStable = $null }
  }
  $peers = @()
  Get-ChildItem $HandoffsDir -Filter 'HANDOFF-*.md' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.LastWriteTimeUtc -gt $cutoff) {
      $sid = ($_.BaseName -split '-')[1]
      if ($sid -and ($null -eq $myStable -or -not $myStable.EndsWith($sid))) {
        $peers += "claude-$sid (last write $($_.LastWriteTimeUtc.ToString('HH:mm:ssZ')))"
      }
    }
  }
  return $peers
}

function Copy-FileSafe([string]$src, [string]$dest) {
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item -Path $src -Destination $dest -Force
}

function Snapshot-State([string]$outgoingProfileDir, [string[]]$stateFiles) {
  $snapDir = Join-Path $outgoingProfileDir 'state-snapshot'
  if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir -Force | Out-Null }
  $count = 0
  foreach ($sf in $stateFiles) {
    if (Test-Path $sf) {
      $name = Split-Path $sf -Leaf
      Copy-Item -Path $sf -Destination (Join-Path $snapDir $name) -Force
      $count++
    }
  }
  return $count
}

function Restore-State([string]$incomingProfileDir, [string[]]$stateFiles) {
  $snapDir = Join-Path $incomingProfileDir 'state-snapshot'
  if (-not (Test-Path $snapDir)) { return 0 }
  $count = 0
  foreach ($sf in $stateFiles) {
    $name = Split-Path $sf -Leaf
    $snap = Join-Path $snapDir $name
    if (Test-Path $snap) {
      Copy-FileSafe $snap $sf
      $count++
    }
  }
  return $count
}

function Backup-LiveFiles([object[]]$fileEntries, [string]$settingsPath) {
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
  $bdir = Join-Path $BackupRoot $stamp
  New-Item -ItemType Directory -Path $bdir -Force | Out-Null
  foreach ($f in $fileEntries) {
    if (Test-Path $f.dest) {
      $rel = ($f.dest -replace '[:/\\]', '_')
      Copy-Item -Path $f.dest -Destination (Join-Path $bdir $rel) -Force
    }
  }
  if (Test-Path $settingsPath) {
    Copy-Item -Path $settingsPath -Destination (Join-Path $bdir 'settings.json') -Force
  }
  return $bdir
}

function Merge-SettingsEnv([string]$settingsPath, [string]$deltaPath) {
  $node = if ($env:H_NODE) { $env:H_NODE } else { 'node' }
  $script = @"
import { readFileSync, writeFileSync } from 'node:fs';
const sp = process.argv[2];
const dp = process.argv[3];
const s = JSON.parse(readFileSync(sp, 'utf8'));
const d = JSON.parse(readFileSync(dp, 'utf8'));
s.env = s.env || {};
let n = 0;
for (const [k, v] of Object.entries(d.env || {})) { s.env[k] = v; n++; }
const tmp = sp + '.tmp-switch';
writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n', 'utf8');
import('node:fs').then(fs => { fs.renameSync(tmp, sp); console.log('merged ' + n + ' env keys'); });
"@
  $tmpScript = New-TemporaryFile
  Rename-Item -Path $tmpScript.FullName -NewName ($tmpScript.Name + '.mjs')
  $tmpScript = Get-Item ($tmpScript.FullName + '.mjs')
  Set-Content -Path $tmpScript.FullName -Value $script -Encoding UTF8
  try {
    & $node $tmpScript.FullName $settingsPath $deltaPath
    if ($LASTEXITCODE -ne 0) { throw "settings merge failed (exit $LASTEXITCODE)" }
  } finally {
    Remove-Item -Path $tmpScript.FullName -Force -ErrorAction SilentlyContinue
  }
}

# --- main --------------------------------------------------------------------
if ($Status) {
  Show-Status
  exit 0
}

if (-not $Target) {
  Write-Host 'ERROR: -Target required (47, 45, or full profile name). Use -Status to see current state.' -ForegroundColor Red
  exit 1
}

$incoming = Resolve-ProfileName $Target
$outgoing = Read-ActiveProfile
if (-not $outgoing) { $outgoing = '<unknown>' }

$incomingDir = Join-Path $ProfilesDir $incoming
if (-not (Test-Path $incomingDir)) {
  Write-Host "ERROR: profile '$incoming' not found at $incomingDir" -ForegroundColor Red
  exit 1
}

$manifestPath = Join-Path $incomingDir 'manifest.json'
if (-not (Test-Path $manifestPath)) {
  Write-Host "ERROR: manifest.json missing in profile '$incoming'" -ForegroundColor Red
  exit 1
}

if ($incoming -eq $outgoing) {
  Write-Host "Already on profile '$incoming' --no-op." -ForegroundColor Yellow
  Show-Status
  exit 0
}

# Peer guard
$peers = Test-PeersActive
if ($peers.Count -gt 0 -and -not $Force) {
  Write-Host 'ABORT: peer chats appear active (handoff write <10min ago):' -ForegroundColor Red
  $peers | ForEach-Object { Write-Host "  - $_" }
  Write-Host ''
  Write-Host 'Switching env vars now would leave those chats with mismatched config' -ForegroundColor Yellow
  Write-Host 'until they relaunch. Re-run with -Force to override.' -ForegroundColor Yellow
  exit 1
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$envDeltaPath = Join-Path $incomingDir $manifest.settings_env_delta

Write-Host "Switching: $outgoing -> $incoming" -ForegroundColor Cyan

# 1. Backup live files
$bdir = Backup-LiveFiles $manifest.files $UserSettings
Write-Host "  [1/6] backup -> $bdir"

# 2. Snapshot state into outgoing profile
$outgoingDir = Join-Path $ProfilesDir $outgoing
if (Test-Path $outgoingDir) {
  $snappedCount = Snapshot-State $outgoingDir $manifest.state_snapshot_files
  Write-Host "  [2/6] snapshotted $snappedCount state file(s) -> $outgoing/state-snapshot/"
} else {
  Write-Host "  [2/6] no outgoing profile dir --skipping state snapshot"
}

# 3. Copy profile files to live paths
foreach ($f in $manifest.files) {
  $src = Join-Path $incomingDir $f.source
  if (-not (Test-Path $src)) {
    Write-Host "  WARNING: source missing in profile: $($f.source)" -ForegroundColor Yellow
    continue
  }
  Copy-FileSafe $src $f.dest
}
Write-Host "  [3/6] copied $($manifest.files.Count) profile file(s) -> live paths"

# 4. Merge settings env
if (Test-Path $envDeltaPath) {
  Merge-SettingsEnv $UserSettings $envDeltaPath
  Write-Host "  [4/6] merged env delta -> $UserSettings"
} else {
  Write-Host "  [4/6] no settings-env delta --skipping" -ForegroundColor Yellow
}

# 5. Restore incoming snapshot
$restoredCount = Restore-State $incomingDir $manifest.state_snapshot_files
if ($restoredCount -gt 0) {
  Write-Host "  [5/6] restored $restoredCount state file(s) from $incoming/state-snapshot/"
} else {
  Write-Host "  [5/6] no incoming state-snapshot --leaving live state untouched (clean baseline)"
}

# 6. Update markers
Set-Content -Path $ActiveMarker -Value $incoming -NoNewline
$lastJson = @{
  ts   = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  from = $outgoing
  to   = $incoming
  by   = "$env:USERNAME@$env:COMPUTERNAME"
  backup_dir = $bdir
} | ConvertTo-Json
Set-Content -Path $LastSwitchLog -Value $lastJson
Write-Host "  [6/6] active=$incoming, log=$LastSwitchLog"

Write-Host ''
Write-Host '================================================================' -ForegroundColor Magenta
Write-Host '  RESTART CLAUDE CODE for env vars to take effect:' -ForegroundColor Magenta
Write-Host "    1. /exit  (in every active Claude session)" -ForegroundColor Magenta
Write-Host "    2. relaunch --new session reads updated env vars" -ForegroundColor Magenta
Write-Host '================================================================' -ForegroundColor Magenta
Write-Host ''
Show-Status
