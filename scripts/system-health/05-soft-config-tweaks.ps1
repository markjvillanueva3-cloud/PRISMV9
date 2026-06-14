# =====================================================================
# PRISM System Health 05 - Soft config tweaks (no admin, no reboot)
# =====================================================================
# Tunes ollama + tsserver behaviour to the host's ACTUAL GPU class so it
# lowers idle commit pressure WITHOUT downgrading a large-VRAM card to
# 16GB-era caps. (Before 2026-06-04 this script hardcoded KEEP_ALIVE=30s /
# NUM_PARALLEL=1 / MAX_LOADED=2 — correct for a small card, but a silent
# regression on the RTX PRO 6000 Blackwell 96GB box: running it clobbered
# the Blackwell tuning back to 4080/work-era values. BLACKWELL-GPU-SWAP slot:golf.)
#
# GPU class is auto-detected from nvidia-smi total VRAM:
#   >=48GB  -> blackwell  (RTX PRO 6000 Blackwell 96GB class): pin, 4-parallel, 6 resident
#   >=14GB  -> home       (RTX 4080-class 16GB): 10m keep, 2-parallel, 2 resident
#   <14GB   -> work       (small GPU / laptop): 30s keep, 1-parallel, 2 resident
#
# Env changes are USER-scope and take effect on next ollama (re)start.
# Ollama restart is OPT-IN (-RestartOllama) so this never evicts the fleet's
# warm models by surprise. These take effect on next process restart anyway.
# =====================================================================
param(
  [switch]$RestartOllama
)

Write-Host "=== PRISM Soft Config Tweaks (GPU-class aware) ===" -ForegroundColor Cyan

# --- Detect GPU total VRAM (MB) via nvidia-smi (fail-soft to conservative work tier) ---
$vramMb = 0
try {
  $raw = (& nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null | Select-Object -First 1)
  if ($raw) { $vramMb = [int]($raw.ToString().Trim()) }
} catch { $vramMb = 0 }

if ($vramMb -ge 49152) {
  # Blackwell 96GB class — keep models warm + serve the 26-slot fleet.
  # keepAlive was '-1' (pin forever) until 2026-06-08 — but a pinned model's HOST
  # private bytes count against the COMMIT limit (RAM+pagefile), not just VRAM. With
  # maxLoaded=6 large models (e.g. qwen2.5-coder:32b=37GB + gpt-oss=13GB + …) pinned
  # forever, commit hit 96-98% on the 127GB/227GB-commit box → the PRESSURE GATE
  # blocked session-end (crash-cascade risk) every turn. '30m' keeps the ACTIVE model
  # warm (fast) while letting idle models evict and release commit — the warm-fast
  # benefit is preserved; the unbounded-pin commit leak is closed. (golf, R7 override
  # of U-FR-OLLAMA-KEEP-ALIVE-1H with reasoning — see reference_ollama_keepalive_commit_leak_2026_06_08.)
  $tier = 'blackwell'; $keepAlive = '30m'; $numParallel = '4'; $maxLoaded = '4'
} elseif ($vramMb -ge 14336) {
  # RTX 4080-class 16GB — moderate keep-alive, conservative parallelism.
  $tier = 'home'; $keepAlive = '10m'; $numParallel = '2'; $maxLoaded = '2'
} else {
  # Small GPU / laptop / nvidia-smi missing — evict fast to free VRAM+RAM.
  $tier = 'work'; $keepAlive = '30s'; $numParallel = '1'; $maxLoaded = '2'
}

Write-Host ("GPU VRAM detected: {0} MB -> tier '{1}'" -f $vramMb, $tier) -ForegroundColor Yellow
if ($vramMb -eq 0) { Write-Host "  (nvidia-smi unavailable — defaulted to conservative 'work' tier)" -ForegroundColor DarkYellow }

# 1. Ollama keep-alive (tier-scaled). Large cards pin/keep longer; small cards evict fast to free GPU+RAM.
Write-Host ""
Write-Host "[1] OLLAMA_KEEP_ALIVE=$keepAlive" -ForegroundColor Green
[Environment]::SetEnvironmentVariable('OLLAMA_KEEP_ALIVE', $keepAlive, 'User')

# 2. Ollama parallelism (tier-scaled). Big cards serve the 26-slot fleet concurrently; small cards avoid duplicate model loads.
Write-Host "[2] OLLAMA_NUM_PARALLEL=$numParallel" -ForegroundColor Green
[Environment]::SetEnvironmentVariable('OLLAMA_NUM_PARALLEL', $numParallel, 'User')

# 3. Ollama max resident models (tier-scaled). 96GB holds 7b+14b+32b+embed co-resident; 16GB caps at 2.
Write-Host "[3] OLLAMA_MAX_LOADED_MODELS=$maxLoaded" -ForegroundColor Green
[Environment]::SetEnvironmentVariable('OLLAMA_MAX_LOADED_MODELS', $maxLoaded, 'User')

# 3b. Flash attention is an always-on throughput win on any modern card.
Write-Host "[3b] OLLAMA_FLASH_ATTENTION=1" -ForegroundColor Green
[Environment]::SetEnvironmentVariable('OLLAMA_FLASH_ATTENTION', '1', 'User')

# 3c. Full-precision KV cache only where VRAM affords it (Blackwell 96GB); small cards keep q8_0.
if ($tier -eq 'blackwell') {
  Write-Host "[3c] OLLAMA_KV_CACHE_TYPE=f16 (96GB affords full-precision KV cache)" -ForegroundColor Green
  [Environment]::SetEnvironmentVariable('OLLAMA_KV_CACHE_TYPE', 'f16', 'User')
}

# 4. Pressure-gate enabled by default (already wired in settings.json Stop hook)
Write-Host "[4] PRISM_PRESSURE_GATE=1 (Stop hook reads this)" -ForegroundColor Green
[Environment]::SetEnvironmentVariable('PRISM_PRESSURE_GATE', '1', 'User')

# 5. VS Code / Cursor recommendation (manual - print instructions)
Write-Host ""
Write-Host "=== Manual VS Code / Cursor settings ===" -ForegroundColor Yellow
Write-Host "Add to settings.json (Ctrl+,):"
Write-Host '  "typescript.tsserver.maxTsServerMemory": 4096,'
Write-Host '  "typescript.tsserver.experimental.enableProjectDiagnostics": false'
Write-Host "First caps tsserver at 4 GB (was unlimited - we saw it hit 3 GB)."
Write-Host "Second disables whole-project type-check (run tsc separately when needed)."
Write-Host ""

# 6. Restart ollama to pick up new env — OPT-IN only (avoid evicting the fleet's warm models).
if ($RestartOllama) {
  Write-Host "=== Restarting ollama to apply env (-RestartOllama) ===" -ForegroundColor Cyan
  $ollamaProcs = Get-Process ollama -ErrorAction SilentlyContinue
  if ($ollamaProcs) {
    Write-Host "  Stopping $($ollamaProcs.Count) ollama process(es)..."
    $ollamaProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Ollama will respawn on next call (or via the PRISM Ollama Serve task)."
  }
} else {
  Write-Host "Skipped ollama restart (default). New env applies on next ollama (re)start." -ForegroundColor DarkYellow
  Write-Host "  Pass -RestartOllama to force it now (WARNING: evicts warm models the fleet is using)." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Done. New env vars (User scope):" -ForegroundColor Green
'OLLAMA_KEEP_ALIVE', 'OLLAMA_NUM_PARALLEL', 'OLLAMA_MAX_LOADED_MODELS', 'OLLAMA_FLASH_ATTENTION', 'OLLAMA_KV_CACHE_TYPE', 'PRISM_PRESSURE_GATE' | ForEach-Object {
  $val = [Environment]::GetEnvironmentVariable($_, 'User')
  Write-Host "  $_ = $val"
}

Write-Host ""
Write-Host "Note: open a new shell/terminal for env changes to take effect there." -ForegroundColor Yellow
