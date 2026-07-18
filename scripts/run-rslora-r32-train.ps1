# PRISM rsLoRA r=32 fleet LoRA training -- reaper-immune wrapper (slot:india 2026-06-15).
# Run as a registered "PRISM rsLoRA R32 Train" scheduled task so the fleet-reaper
# (which reaps long session-orphan python under load -- it killed an in-session run at
# step 54/400) leaves it alone: a scheduled-task process parents to Task Scheduler, not
# a session, so it is never an orphan candidate. --resume picks up from checkpoint-50.
$ErrorActionPreference = "Continue"
Set-Location "H:\prism"
$py  = "H:\Tools\blackwell-gpu-venv\Scripts\python.exe"
$log = "H:\prism\state\shared\lora\_rslora-r32-train.log"
& $py scripts\fleet_lora_train.py --rslora --rank 32 --alpha 32 --max-steps 400 --resume `
    --out state\shared\lora\adapters\fleet-rslora-r32 *>&1 | Out-File -FilePath $log -Encoding utf8 -Append
"rsLoRA-r32 wrapper exit=$LASTEXITCODE at $(Get-Date -Format o)" | Out-File -FilePath $log -Encoding utf8 -Append
