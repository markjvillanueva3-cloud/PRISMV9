# Detached CAD smoke-train launcher (slot:delta) -- survives Bash-tool teardown.
$ErrorActionPreference = 'Stop'
$env:PYTHONUNBUFFERED = '1'
$env:HF_HUB_DISABLE_PROGRESS_BARS = '1'
$py  = 'H:\Tools\blackwell-gpu-venv\Scripts\python.exe'
$log = 'H:\prism\state\shared\lora\.cad-smoke-train.log'
$err = 'H:\prism\state\shared\lora\.cad-smoke-train.log.err'
$pyargs = @(
  'scripts/fleet_lora_train.py','--smoke','--no-4bit',
  '--corpus','H:\prism\state\shared\lora\cad-combined-training.jsonl',
  '--base','Qwen/Qwen2.5-Coder-7B-Instruct',
  '--out','H:\prism\state\shared\lora\adapters\cad-drawing-adapter-smoke'
)
$p = Start-Process -FilePath $py -ArgumentList $pyargs -WorkingDirectory 'H:\prism' `
     -RedirectStandardOutput $log -RedirectStandardError $err -PassThru -WindowStyle Hidden
Write-Output ("DETACHED_PID=" + $p.Id)
