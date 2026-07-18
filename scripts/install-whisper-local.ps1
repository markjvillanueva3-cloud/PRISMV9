<#
.SYNOPSIS
  install-whisper-local.ps1 — OBSIDIAN-INTELLIGENCE-MS3/F1/U-VOICE-CAPTURE

  Installs a LOCAL whisper.cpp build + a ggml model so the voice-capture
  watcher (scripts/voice-capture-watcher.mjs) can transcribe operator
  voice memos with no cloud service and no API key.

.DESCRIPTION
  Idempotent. Default action: if a whisper binary and model are already
  present it reports and exits 0 (re-run safe). Otherwise it:
    1. Resolves the latest whisper.cpp Windows x64 release via the GitHub
       releases API (no hard-coded version to rot).
    2. Downloads + extracts the prebuilt binary into the install dir.
    3. Downloads the ggml model from the canonical whisper.cpp model host.
  It then prints the PRISM_WHISPER_BIN / PRISM_WHISPER_MODEL values the
  watcher reads.

  Network failures fail LOUD (non-zero exit) — a half-installed Whisper is
  worse than an absent one (the watcher already degrades gracefully when
  Whisper is missing).

.PARAMETER InstallDir
  Where to install. Default: <repo>\.tools\whisper.

.PARAMETER Model
  ggml model name (tiny | base | small | medium | large-v3). Default base.

.PARAMETER DryRun
  Print the planned actions + resolved URLs; download/extract nothing.

.PARAMETER Force
  Reinstall even if a binary/model is already present.

.PARAMETER Uninstall
  Remove the install dir. Reversible counterpart to install.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-whisper-local.ps1 -DryRun
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-whisper-local.ps1
#>
[CmdletBinding()]
param(
  [string] $InstallDir,
  [ValidateSet('tiny', 'base', 'small', 'medium', 'large-v3')]
  [string] $Model = 'base',
  [switch] $DryRun,
  [switch] $Force,
  [switch] $Uninstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $InstallDir) { $InstallDir = Join-Path $RepoRoot '.tools\whisper' }
$ModelDir = Join-Path $InstallDir 'models'
$ModelFile = Join-Path $ModelDir "ggml-$Model.bin"
# Canonical whisper.cpp model host (whisper.cpp's own download-ggml-model
# script resolves models from exactly this location).
$ModelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$Model.bin"
$ReleaseApi = 'https://api.github.com/repos/ggerganov/whisper.cpp/releases/latest'

function Write-Step { param([string] $Msg) Write-Host "[install-whisper] $Msg" }

function Find-WhisperBinary {
  param([string] $Root)
  if (-not (Test-Path $Root)) { return $null }
  foreach ($name in @('whisper-cli.exe', 'main.exe', 'whisper.exe')) {
    $hit = Get-ChildItem -Path $Root -Filter $name -Recurse -File -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($hit) { return $hit.FullName }
  }
  return $null
}

# ---- Uninstall ------------------------------------------------------------
if ($Uninstall) {
  if (Test-Path $InstallDir) {
    if ($DryRun) {
      Write-Step "DRY-RUN: would remove $InstallDir"
    } else {
      Remove-Item -Path $InstallDir -Recurse -Force
      Write-Step "removed $InstallDir"
    }
  } else {
    Write-Step "nothing to uninstall ($InstallDir absent)"
  }
  exit 0
}

# ---- Idempotency check ----------------------------------------------------
$existingBin = Find-WhisperBinary -Root $InstallDir
$haveModel = Test-Path $ModelFile
if ($existingBin -and $haveModel -and -not $Force) {
  Write-Step "already installed — binary: $existingBin"
  Write-Step "already installed — model:  $ModelFile"
  Write-Step "PRISM_WHISPER_BIN=$existingBin"
  Write-Step "PRISM_WHISPER_MODEL=$ModelFile"
  Write-Step 're-run with -Force to reinstall.'
  exit 0
}

# ---- Resolve the latest Windows x64 release asset -------------------------
Write-Step "resolving latest whisper.cpp Windows release via $ReleaseApi"
$assetUrl = $null
try {
  $rel = Invoke-RestMethod -Uri $ReleaseApi -Headers @{ 'User-Agent' = 'prism-install-whisper' }
  $asset = $rel.assets | Where-Object { $_.name -match 'bin-x64.*\.zip$' } | Select-Object -First 1
  if (-not $asset) {
    $asset = $rel.assets | Where-Object { $_.name -match 'win.*x64.*\.zip$' } | Select-Object -First 1
  }
  if ($asset) { $assetUrl = $asset.browser_download_url }
} catch {
  Write-Step "WARN: release API lookup failed: $($_.Exception.Message)"
}

if ($DryRun) {
  Write-Step "DRY-RUN: install dir   = $InstallDir"
  Write-Step "DRY-RUN: binary asset  = $(if ($assetUrl) { $assetUrl } else { '(unresolved — check network / API)' })"
  Write-Step "DRY-RUN: model file    = $ModelFile"
  Write-Step "DRY-RUN: model url     = $ModelUrl"
  Write-Step 'DRY-RUN: no files downloaded.'
  exit 0
}

if (-not $assetUrl) {
  Write-Error 'could not resolve a whisper.cpp Windows release asset — aborting (fail-loud, no partial install).'
  exit 1
}

# ---- Download + extract the binary ----------------------------------------
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$zipPath = Join-Path $InstallDir 'whisper-bin.zip'
Write-Step "downloading binary: $assetUrl"
try {
  Invoke-WebRequest -Uri $assetUrl -OutFile $zipPath -Headers @{ 'User-Agent' = 'prism-install-whisper' }
} catch {
  Write-Error "binary download failed: $($_.Exception.Message)"
  exit 1
}
Write-Step "extracting -> $InstallDir"
try {
  Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
} finally {
  # Always clean the downloaded zip — even if Expand-Archive throws on a
  # corrupt archive (it still fails loud via $ErrorActionPreference).
  Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
}

$bin = Find-WhisperBinary -Root $InstallDir
if (-not $bin) {
  Write-Error 'extraction completed but no whisper binary found in the archive — aborting.'
  exit 1
}

# ---- Download the model ---------------------------------------------------
New-Item -ItemType Directory -Force -Path $ModelDir | Out-Null
if ((Test-Path $ModelFile) -and -not $Force) {
  Write-Step "model already present: $ModelFile"
} else {
  Write-Step "downloading model: $ModelUrl"
  try {
    Invoke-WebRequest -Uri $ModelUrl -OutFile $ModelFile -Headers @{ 'User-Agent' = 'prism-install-whisper' }
  } catch {
    Write-Error "model download failed: $($_.Exception.Message)"
    exit 1
  }
}

Write-Step 'install complete.'
Write-Step "PRISM_WHISPER_BIN=$bin"
Write-Step "PRISM_WHISPER_MODEL=$ModelFile"
Write-Step 'set those two env vars (or pass whisperBin/whisperModel opts) so voice-capture-watcher.mjs finds Whisper.'
exit 0
