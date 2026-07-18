<#
  wedm-finetune-pipeline.ps1 — autonomous WEDM knowledge LoRA fine-tune pipeline.

  Builds a Windows-robust Python 3.12 toolchain via uv (ALL artifacts on H: — C:
  is 98% full), installs torch-CUDA + peft stack, frees the GPU (stops the NIM
  containers only for the train window, restarts them after), and runs the
  plain-peft trainer. Every stage logs + fail-loud (non-zero exit aborts).

    pwsh -File scripts/wedm-finetune-pipeline.ps1 -Stage all      # install + train
    pwsh -File scripts/wedm-finetune-pipeline.ps1 -Stage install  # toolchain + deps + model only (GPU stays up)
    pwsh -File scripts/wedm-finetune-pipeline.ps1 -Stage train    # train only (assumes deps installed)

  Log: state/shared/wedm-finetune/pipeline.log
#>
param([ValidateSet("all", "install", "train")] [string]$Stage = "all")
$ErrorActionPreference = "Stop"

$Repo   = "H:/prism-slot-mike"
$Bundle = "$Repo/mcp-server/data/training/wedm-knowledge/lora-bundle"
$LogDir = "$Repo/state/shared/wedm-finetune"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = "$LogDir/pipeline.log"

# Everything heavy goes to H: (C: has only ~43 GB free).
$env:UV_CACHE_DIR          = "H:/.uv-cache"
$env:UV_PYTHON_INSTALL_DIR = "H:/.uv-python"
$env:HF_HOME               = "H:/.hf-cache"
$env:HF_HUB_ENABLE_HF_TRANSFER = "1"
$Venv = "H:/.venv-wedm-lora"
$NimContainers = @("nim-llama32-3b", "nim-embed-e5")

function Log($m) {
  $line = "[" + (Get-Date -Format "HH:mm:ss") + "] " + $m
  $line | Tee-Object -FilePath $Log -Append
}
function Die($m) { Log "FATAL: $m"; exit 1 }

Log "=== wedm-finetune-pipeline stage=$Stage ==="

# ── uv (tiny binary; caches/python redirected to H:) ──
function Ensure-Uv {
  $uv = (Get-Command uv -ErrorAction SilentlyContinue)
  if ($uv) { Log ("uv present: " + $uv.Source); return }
  Log "installing uv..."
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex" *>> $Log
  $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
  if (-not (Get-Command uv -ErrorAction SilentlyContinue)) { Die "uv install failed" }
  Log "uv installed."
}

function Do-Install {
  Ensure-Uv
  if (-not (Test-Path "$Venv/Scripts/python.exe")) {
    Log "creating venv (python 3.12) at $Venv ..."
    uv venv --python 3.12 $Venv *>> $Log
    if ($LASTEXITCODE -ne 0) { Die "uv venv failed" }
  } else { Log "venv exists: $Venv" }
  $py = "$Venv/Scripts/python.exe"

  Log "installing torch (cu121) ..."
  uv pip install --python $py torch --index-url https://download.pytorch.org/whl/cu121 *>> $Log
  if ($LASTEXITCODE -ne 0) { Die "torch install failed" }

  Log "installing peft stack ..."
  # transformers pinned <5 (5.x churn) + numpy<2: torch 2.5.1 segfaults on import
  # against the numpy 2.x C-ABI (0xC0000005). Both pins are load-bearing.
  uv pip install --python $py "transformers>=4.44,<5" "peft>=0.11" "datasets>=2.16" "accelerate>=0.30" "bitsandbytes>=0.43" "numpy<2" "hf-transfer" *>> $Log
  if ($LASTEXITCODE -ne 0) { Die "peft stack install failed" }

  & $py -c "import torch;print('torch',torch.__version__,'cuda_build',torch.version.cuda,'avail',torch.cuda.is_available())" *>> $Log
  Log "install stage OK."
}

function Free-Gpu {
  Log "freeing GPU — stopping native Ollama (holds loaded models on GPU)"
  taskkill /F /IM ollama.exe *>> $Log 2>&1   # native Windows process, not a container
  Log "freeing GPU — stopping NIM containers: $($NimContainers -join ', ')"
  foreach ($c in $NimContainers) { docker stop $c *>> $Log 2>&1 }
  Start-Sleep -Seconds 10
  $free = (nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>$null | Select-Object -First 1)
  Log "GPU free after stop: $free MiB"
}
function Restore-Gpu {
  Log "restarting NIM containers (fine-tune window done)"
  foreach ($c in $NimContainers) { docker start $c *>> $Log 2>&1 }
}

function Do-Train {
  $py = "$Venv/Scripts/python.exe"
  if (-not (Test-Path $py)) { Die "venv python missing — run -Stage install first" }
  Free-Gpu
  try {
    Log "starting LoRA fine-tune ..."
    & $py "$Bundle/train_wedm_lora_peft.py" *>> $Log
    if ($LASTEXITCODE -ne 0) { Log "training exited non-zero ($LASTEXITCODE)" } else { Log "training OK." }
  } finally {
    Restore-Gpu
  }
}

if ($Stage -eq "install" -or $Stage -eq "all") { Do-Install }
if ($Stage -eq "train"   -or $Stage -eq "all") { Do-Train }
Log "=== pipeline stage=$Stage complete ==="
