# =====================================================================
# PRISM System Health 04 - Pre-launch sanity check
# =====================================================================
# Run BEFORE opening a new Claude chat or starting heavy work.
# Reports commit headroom, kills cheap zombies, suggests next action.
# =====================================================================

Write-Host "=== PRISM Pre-Launch Check ===" -ForegroundColor Cyan

# 1. Memory pressure
node H:/prism/scripts/system-health/03-commit-pressure-check.mjs
$pressureExit = $LASTEXITCODE

# 2. Quick zombie reap (dry-run first to show what would happen)
Write-Host ""
Write-Host "--- Zombie scan ---" -ForegroundColor Cyan
& H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1 -DryRun

if ($pressureExit -ge 1) {
  Write-Host ""
  $reap = Read-Host "Reap zombies now? (yes/no)"
  if ($reap -eq 'yes') {
    & H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1
  }
}

# 3. Active claude session count + warning
$claudeCount = (Get-Process claude -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host ""
if ($claudeCount -ge 4) {
  Write-Host "WARNING: $claudeCount Claude chats active. Recommended cap is 3." -ForegroundColor Yellow
  Write-Host "  Each chat holds 1-3 GB private + spawns a tree of node hooks." -ForegroundColor Yellow
  Write-Host "  Consider closing the oldest before opening another." -ForegroundColor Yellow
} else {
  Write-Host "Claude chats: $claudeCount/3 (ok)" -ForegroundColor Green
}

# 4. Ollama loaded models
Write-Host ""
Write-Host "--- Ollama loaded models ---" -ForegroundColor Cyan
$ollamaPath = (Get-Command ollama -ErrorAction SilentlyContinue).Path
if (-not $ollamaPath) {
  $ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
}
if (Test-Path $ollamaPath) {
  & $ollamaPath ps
} else {
  Write-Host "  (ollama.exe not in PATH, skipping)"
}

Write-Host ""
Write-Host "Pre-launch check complete." -ForegroundColor Green
