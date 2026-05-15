# PRISM hook broker installer — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1).
#
# Idempotent: builds the image, (re)starts the container, optionally registers a
# scheduled task that re-checks the container every 5 minutes and restarts it if
# it has died. Safe to re-run; only acts on drift.
#
# Usage:
#   pwsh -File scripts/install-prism-hooks-container.ps1
#   pwsh -File scripts/install-prism-hooks-container.ps1 -DryRun
#   pwsh -File scripts/install-prism-hooks-container.ps1 -Uninstall
#   pwsh -File scripts/install-prism-hooks-container.ps1 -SkipBuild   # use cached image
#   pwsh -File scripts/install-prism-hooks-container.ps1 -NoTask      # skip scheduled task
#
# Reversal: pwsh -File scripts/install-prism-hooks-container.ps1 -Uninstall

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [switch]$SkipBuild,
  [switch]$NoTask,
  [string]$RepoRoot = "H:/prism",
  [string]$ImageTag = "prism-hooks-broker:local",
  [string]$ContainerName = "prism-hooks",
  [int]$HostPort = 9876,
  [string]$TaskName = "PRISM Hooks Broker Watchdog"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "▸ $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "  ! $msg" -ForegroundColor Yellow }

function Test-DockerUp {
  try {
    $null = & docker info 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Get-ContainerStatus {
  param([string]$Name)
  $out = & docker ps -a --filter "name=^/$Name$" --format "{{.Status}}" 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($out)) { return "missing" }
  if ($out -match "^Up") { return "running" }
  return "stopped"
}

if ($Uninstall) {
  Write-Step "Uninstall mode — stopping container + removing scheduled task"
  if (Test-DockerUp) {
    if (-not $DryRun) {
      & docker rm -f $ContainerName 2>$null | Out-Null
      & docker image rm $ImageTag 2>$null | Out-Null
    }
    Write-Ok "container + image removed"
  } else {
    Write-Warn2 "Docker is not running — skipping container removal"
  }
  $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    if (-not $DryRun) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }
    Write-Ok "scheduled task removed"
  }
  Write-Host "`nDone (uninstall)."
  exit 0
}

Write-Step "Preflight"
if (-not (Test-Path $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }
$dockerfile = Join-Path $RepoRoot "scripts/docker/prism-hooks-broker.Dockerfile"
$serverMjs  = Join-Path $RepoRoot "scripts/docker/prism-hooks-broker-server.mjs"
if (-not (Test-Path $dockerfile)) { throw "Dockerfile missing: $dockerfile" }
if (-not (Test-Path $serverMjs))  { throw "Broker server.mjs missing: $serverMjs" }

if (-not (Test-DockerUp)) {
  Write-Warn2 "Docker engine is not responding. Recovery sequence:"
  Write-Warn2 "  1. sc query com.docker.service     # if STOPPED → sc start com.docker.service"
  Write-Warn2 "  2. wsl --shutdown"
  Write-Warn2 "  3. Restart Docker Desktop"
  Write-Warn2 "  4. Re-run this installer"
  throw "Docker engine unreachable — cannot proceed"
}
Write-Ok "Docker engine responsive"

if (-not $SkipBuild) {
  Write-Step "Build image $ImageTag"
  if ($DryRun) {
    Write-Ok "[dry-run] docker build -f $dockerfile -t $ImageTag $RepoRoot"
  } else {
    & docker build -f $dockerfile -t $ImageTag $RepoRoot
    if ($LASTEXITCODE -ne 0) { throw "docker build failed (exit $LASTEXITCODE)" }
  }
  Write-Ok "image built"
} else {
  Write-Warn2 "Skipping build (using existing $ImageTag)"
}

Write-Step "Ensure container is running"
$status = Get-ContainerStatus -Name $ContainerName
if ($status -eq "running") {
  Write-Ok "container '$ContainerName' already running"
  if (-not $SkipBuild) {
    Write-Step "Image rebuilt — recycling container"
    if (-not $DryRun) { & docker rm -f $ContainerName | Out-Null }
    $status = "missing"
  }
}
if ($status -ne "running") {
  if ($status -eq "stopped") {
    if (-not $DryRun) { & docker rm -f $ContainerName | Out-Null }
  }
  $hooksMount = (Join-Path $RepoRoot ".claude/hooks").Replace("\","/")
  $runArgs = @(
    "run","-d",
    "--name", $ContainerName,
    "--restart","unless-stopped",
    "-p", "127.0.0.1:${HostPort}:9876",
    "-v", "${hooksMount}:/app/.claude/hooks:ro",
    "-e", "PRISM_HOOKS_DIR=/app/.claude/hooks",
    $ImageTag
  )
  if ($DryRun) {
    Write-Ok "[dry-run] docker $($runArgs -join ' ')"
  } else {
    & docker @runArgs
    if ($LASTEXITCODE -ne 0) { throw "docker run failed (exit $LASTEXITCODE)" }
  }
  Write-Ok "container started"
}

Write-Step "Health probe"
if (-not $DryRun) {
  $healthy = $false
  for ($i = 1; $i -le 12; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$HostPort/healthz" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
      if ($resp.StatusCode -eq 200) { $healthy = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
  }
  if ($healthy) { Write-Ok "broker is healthy on http://127.0.0.1:$HostPort/healthz" }
  else          { Write-Warn2 "Broker did not become healthy in 6s — check 'docker logs $ContainerName'" }
} else {
  Write-Ok "[dry-run] would probe http://127.0.0.1:$HostPort/healthz (12× 500ms)"
}

if (-not $NoTask) {
  Write-Step "Register scheduled-task watchdog"
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Ok "task '$TaskName' already registered — leaving in place"
  } else {
    $action = New-ScheduledTaskAction -Execute "docker" -Argument "start $ContainerName"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $trigger2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
    if ($DryRun) {
      Write-Ok "[dry-run] would register task '$TaskName' at-logon + every 5min"
    } else {
      Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($trigger,$trigger2) -Settings $settings -Force | Out-Null
      Write-Ok "task '$TaskName' registered (at-logon + 5min repeat)"
    }
  }
} else {
  Write-Warn2 "Skipping scheduled-task registration (-NoTask)"
}

Write-Host "`nDone."
Write-Host "  Broker:   http://127.0.0.1:$HostPort/healthz"
Write-Host "  Logs:     docker logs $ContainerName -f"
Write-Host "  Stop:     docker stop $ContainerName"
Write-Host "  Reverse:  pwsh -File scripts/install-prism-hooks-container.ps1 -Uninstall"
