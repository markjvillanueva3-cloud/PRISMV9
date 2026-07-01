<#
.SYNOPSIS
  Resilient, self-resuming Ollama model pull. Survives connection drops and
  session end; loops `ollama pull <model>` until the model appears in
  `ollama list`, with backoff. Built for the gpt-oss:120b (65GB) pull that kept
  dying mid-stream (alpha U-BW-RESEARCH-REFINE: "curl keeps dropping, exit 255").

.WHY
  `ollama pull` is resumable at the blob level (a partial blob on disk is reused
  on the next attempt), but the *client* connection is fragile over a multi-hour
  65GB transfer - and the ollama SERVER aborts a pull when its requesting client
  disconnects. A raw `curl`/one-shot `ollama pull` therefore stalls whenever the
  link blips. This wrapper turns that into a finite-retry loop: each attempt
  resumes from the partial, so progress only ever moves forward.

.NOTES
  Launch DETACHED so it outlives the chat session that started it:
    Start-Process pwsh -WindowStyle Hidden -ArgumentList '-NoProfile','-File',
      'H:/prism/scripts/ollama-resilient-pull.ps1','-Models','gpt-oss:120b,gpt-oss:20b'
  Idempotent: if the model is already installed it exits 0 immediately, so a
  scheduled re-launch is harmless. Log: state/shared/ollama-resilient-pull.log
  FLEET / BLACKWELL-MODEL-UPGRADE - slot:golf 2026-06-04.
#>
[CmdletBinding()]
param(
  # Comma-separated model tags, pulled in order (e.g. "gpt-oss:120b,gpt-oss:20b").
  [string]$Models = "gpt-oss:120b",
  # Max attempts PER model before giving up on that one (a 65GB pull at a few
  # MB/s over a flaky link can need many resumes). 0 disables the cap.
  [int]$MaxTries = 400,
  # Seconds to wait between a failed/partial attempt and the next resume.
  [int]$SleepSec = 15,
  # Hard wall-clock ceiling (minutes) for the WHOLE run, across all models. This
  # bounds even the MaxTries=0 ("disable per-model attempt cap") mode so a wrong
  # tag or a permanently-down server can NEVER spin this detached process forever
  # (the scrutiny-caught failure mode). 0 disables it too - but the default 12h is
  # generous for an 80GB two-model pull while still guaranteeing termination.
  [int]$MaxWallClockMin = 720,
  # Explicit ollama.exe path; auto-detected from the usual install dirs if blank.
  [string]$OllamaExe = ""
)

$ErrorActionPreference = 'Continue'
$logDir = "H:/prism/state/shared"
$log    = Join-Path $logDir "ollama-resilient-pull.log"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }

function Write-Log([string]$msg) {
  $line = "$([DateTime]::Now.ToString('o')) $msg"
  $line | Out-File -FilePath $log -Append -Encoding utf8
  Write-Output $line
}

# Resolve the ollama executable (param wins; else probe known install dirs).
if (-not $OllamaExe -or -not (Test-Path $OllamaExe)) {
  $cmd = Get-Command ollama -ErrorAction SilentlyContinue
  if ($cmd) { $OllamaExe = $cmd.Source }
  else {
    foreach ($p in @("$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
                     "$env:ProgramFiles\Ollama\ollama.exe",
                     "C:\Users\wompu\AppData\Local\Programs\Ollama\ollama.exe")) {
      if (Test-Path $p) { $OllamaExe = $p; break }
    }
  }
}
if (-not $OllamaExe -or -not (Test-Path $OllamaExe)) {
  Write-Log "FATAL: ollama.exe not found (pass -OllamaExe)"; exit 2
}

function Test-Installed([string]$model) {
  # `ollama list` prints the tag in the NAME column (first whitespace-delimited
  # field) ONLY when the model is fully installed + manifested; a partial-only
  # blob never appears, so this is the authoritative "done" signal. Match the
  # NAME column EXACTLY (not a substring) - an unanchored match would let a prefix
  # tag like `llama3` false-positive on `llama3.1` and exit the loop early.
  try {
    $names = & $OllamaExe list 2>$null | Select-Object -Skip 1 |
      ForEach-Object { ($_ -split '\s+', 2)[0] }
    return ($names -contains $model)
  } catch { return $false }
}

$modelList = $Models.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
Write-Log "START resilient pull - exe=$OllamaExe models=[$($modelList -join ', ')] maxTries=$MaxTries sleep=${SleepSec}s"

$failed = @()
# Wall-clock deadline bounds the ENTIRE run (scrutiny P1 fix): without it,
# -MaxTries 0 would be an unbounded `while($true)` that spins forever on a wrong
# tag or a permanently-down server. 0 disables it too, but only if the operator
# ALSO disables MaxTries - the default (400 tries / 12h) is doubly bounded.
$deadline = if ($MaxWallClockMin -gt 0) { (Get-Date).AddMinutes($MaxWallClockMin) } else { [DateTime]::MaxValue }
Write-Log "wall-clock deadline: $($deadline.ToString('o')) (MaxWallClockMin=$MaxWallClockMin; 0=disabled)"
foreach ($model in $modelList) {
  if (Test-Installed $model) { Write-Log "SKIP $model - already installed"; continue }
  $ok = $false
  $try = 0
  while ($true) {
    if ((Get-Date) -ge $deadline) { Write-Log "DEADLINE reached ($MaxWallClockMin min) - aborting $model at attempt $try"; break }
    $try++
    if ($MaxTries -gt 0 -and $try -gt $MaxTries) { Write-Log "GIVEUP $model after $MaxTries tries"; break }
    Write-Log "PULL $model - attempt $try"
    & $OllamaExe pull $model *>> $log
    if (Test-Installed $model) { Write-Log "DONE $model installed (attempt $try)"; $ok = $true; break }
    Write-Log "RETRY $model - attempt $try did not complete; resuming in ${SleepSec}s"
    Start-Sleep -Seconds $SleepSec
  }
  if (-not $ok) { $failed += $model }
}

if ($failed.Count -gt 0) { Write-Log "EXIT 1 - unfinished: $($failed -join ', ')"; exit 1 }
Write-Log "EXIT 0 - all models installed: $($modelList -join ', ')"; exit 0
