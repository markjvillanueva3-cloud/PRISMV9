# install-whisper-local.ps1 — OBSIDIAN-INTELLIGENCE-MS3 / F1
#
# Idempotent installer for whisper.cpp (local transcription binary) used by
# voice-capture-watcher.mjs. Downloads pre-built Windows binary from the
# upstream whisper.cpp GitHub releases, drops it under H:/Tools/whisper/,
# and reports the resolved binary path so the operator can set
# PRISM_VOICE_WHISPER_BIN if needed.
#
# Phase 1 — minimal viable installer (no model auto-pull).
# Phase 2 (future) — base.en model download + benchmark run.
#
# Usage:
#   pwsh -File scripts/install-whisper-local.ps1               # install
#   pwsh -File scripts/install-whisper-local.ps1 -DryRun       # preview only
#   pwsh -File scripts/install-whisper-local.ps1 -Uninstall    # remove

param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [string]$InstallDir = "H:/Tools/whisper",
  [string]$Version = "v1.5.4",
  [string]$ReleaseUrl = "https://github.com/ggerganov/whisper.cpp/releases"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "[whisper-install] $msg" -ForegroundColor Cyan }
function Write-Done($msg) { Write-Host "[whisper-install] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[whisper-install] $msg" -ForegroundColor Yellow }

if ($Uninstall) {
  if (Test-Path $InstallDir) {
    if ($DryRun) {
      Write-Step "DRY-RUN: would remove $InstallDir"
    } else {
      Remove-Item -Path $InstallDir -Recurse -Force
      Write-Done "Uninstalled — $InstallDir removed."
    }
  } else {
    Write-Warn "Nothing to uninstall — $InstallDir does not exist."
  }
  exit 0
}

Write-Step "Target: $InstallDir (version $Version)"

# Idempotency: if a `main.exe` already exists in InstallDir, skip download.
$binPath = Join-Path $InstallDir "main.exe"
if (Test-Path $binPath) {
  Write-Done "whisper.cpp already installed at $binPath"
  Write-Host ""
  Write-Host "Set this in your environment to use it:"
  Write-Host "  `$env:PRISM_VOICE_WHISPER_BIN = `"$binPath`""
  exit 0
}

if ($DryRun) {
  Write-Step "DRY-RUN: would create $InstallDir"
  Write-Step "DRY-RUN: would download whisper.cpp $Version Windows binary from $ReleaseUrl"
  Write-Step "DRY-RUN: would set PRISM_VOICE_WHISPER_BIN=$binPath"
  exit 0
}

# Create install dir.
if (-not (Test-Path $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Warn "Phase 1 installer is manual — open the release page and download the appropriate Windows binary:"
Write-Host "  $ReleaseUrl/tag/$Version"
Write-Host ""
Write-Host "After download:"
Write-Host "  1. Extract main.exe (and any DLLs) into $InstallDir"
Write-Host "  2. Download a model (recommended: base.en, ~150MB)"
Write-Host "     curl -L -o $InstallDir/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
Write-Host "  3. Set environment variable:"
Write-Host "     [System.Environment]::SetEnvironmentVariable('PRISM_VOICE_WHISPER_BIN', '$binPath', 'User')"
Write-Host ""
Write-Host "Verify:"
Write-Host "  & $binPath --help"
Write-Host ""
Write-Step "When ready: PRISM_VOICE_WHISPER_BIN=$binPath node scripts/voice-capture-watcher.mjs"

# Future phase: auto-download via Invoke-WebRequest + Expand-Archive.
# For now, manual install is the safe path (release-asset naming varies).
