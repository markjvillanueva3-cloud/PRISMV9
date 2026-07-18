# run-cad-closed-loop-night.ps1 - delta's all-modality CLOSED-LOOP TRAINING night chain (2026-07-02).
#
# Operator work order (slot:delta): "run closed loop training for ALL cad files, prints, cnc programs
# in the h drive ... run engineered loops, harnesses and crons to run autonomously tonight."
#
# This wrapper CHAINS the existing resumable CPU/Fusion lanes back-to-back so there is no idle gap
# between stages (the GPU lanes - PRISM CAD Gen Loop 23:04 x 30m/11h, PRISM OCR Training Loop 30m,
# PRISM Ollama Night Batch, NN-Graph Retrain - keep their own schedules; nothing here touches the GPU,
# so both tracks run concurrently all night). Reaper-immune for the same reason as its siblings
# run-cad-gen-loop-overnight.ps1 / run-ocr-training-loop-overnight.ps1: launched from Task Scheduler,
# node's ancestry leads to the Task Scheduler service, and Start-Process -Wait keeps THIS PowerShell
# alive as each node child's live parent (a bare detached node IS reaped, exit 255 - proven 2026-05-31).
#
# STAGES (1/2/3 resumable per-item; 4/6 fast idempotent full rebuilds; 5 is a monolithic corpus walk -
# a mid-walk kill loses that night's pass, next night redoes it):
#   1. fusion-kernel-drain  - cad-fusion-live-roundtrip.mjs --corpus-kernel --from-worklist: drains the
#                             kernel-needed worklist (curved/freeform parts) through the LIVE Fusion
#                             kernel on :18362 -> kernel-gt.jsonl (per-part durable append, resume
#                             default-on). GATED on a health probe at stage START - if Fusion is not up
#                             the stage is skipped loudly. The gate does NOT cover a mid-drain Fusion
#                             crash: remaining entries then append fast connection-failure rows, which
#                             the resume filter retries next night (ledger bloat, not data loss); the
#                             per-stage timeout below bounds the worst case.
#   2. part-decipher        - cad-part-decipher.mjs --resume: deterministic ($0) mfg decipher of every
#                             new kernel-GT row -> part-decipher.jsonl.
#   3. decipher-hermes      - cad-part-decipher-hermes.mjs: parallel-Hermes pass over the ambiguous
#                             residual. Dark-lane-safe (no-op with laneDown:true if the proxy is down).
#   4. kernel-dimprior      - refresh the kernel-GT dim-prior LoRA dataset from the grown ledger.
#   5. cnc-ground-truth     - cnc-ground-truth-build.mjs: presence-only GT over the JM DIE CNC corpus
#                             (154,347 programs enumerated 2026-07-02) -> ocr-ground-truth-cnc/.
#   6. decipher-lora        - build-cad-decipher-lora.mjs --write: convert the grown decipher ledgers
#                             into the LoRA training feed (verified-only rows; never trains a guess).
#
# Logs: state/shared/cad-closed-loop-night/logs/<stage>.{log,err}; per-stage exit codes appended to
# night-summary.jsonl (one line per stage per night, plus chain-start/chain-complete sentinels - a
# night with chain-start but no chain-complete means the 9h cap or a reboot killed the chain mid-stage).
$ErrorActionPreference = 'Continue'
$node   = 'H:\Tools\nodejs\node.exe'
$repo   = 'H:\prism'
$outDir = 'H:\prism\state\shared\cad-closed-loop-night'
$logDir = Join-Path $outDir 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$summary = Join-Path $outDir 'night-summary.jsonl'
if (-not (Test-Path $node)) {
  Add-Content -Path $summary -Value (@{ stage = 'chain-start'; exit = 'launch-failed';
    error = "node not found: $node"; startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress)
  throw "node not found: $node"
}
Add-Content -Path $summary -Value (@{ stage = 'chain-start'; exit = 0;
  startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress)

function Invoke-Stage {
  # Per-stage TimeoutMin bounds a hung child (e.g. Fusion socket that accepts but never answers) so
  # one wedged stage cannot eat the whole 9h window and starve the Fusion-independent stages behind it.
  param([string]$Name, [string[]]$NodeArgs, [int]$TimeoutMin = 60)
  $t0 = Get-Date
  $p = Start-Process -FilePath $node -ArgumentList $NodeArgs -WorkingDirectory $repo `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDir "$Name.log") `
    -RedirectStandardError  (Join-Path $logDir "$Name.err")
  $exit = 'launch-failed'
  if ($p) {
    # PS 5.1 quirk: without -Wait, ExitCode reads null unless the process handle is cached BEFORE exit
    # (observed live 2026-07-02: all stages logged exit:null). Touching .Handle enables ExitCode.
    $null = $p.Handle
    if ($p.WaitForExit($TimeoutMin * 60 * 1000)) { $exit = $p.ExitCode }
    else { try { $p.Kill() } catch {}; $exit = 'timeout' }
  }
  $row = @{ stage = $Name; exit = $exit; startedAt = $t0.ToUniversalTime().ToString('o');
            elapsedSec = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1) } | ConvertTo-Json -Compress
  Add-Content -Path $summary -Value $row
}

# Stage 0: corpus-harvest triage ($0, NO Fusion) - re-walks the STEP roots (JM DIE, resources/CAD
# FILES, BOX), content-dedups, and REGENERATES kernel-needed-worklist.json + the point-cloud dim-prior
# datasets. This is what makes the loop compound over a GROWING corpus: new CAD files dropped on H:
# are triaged here, then drained through the live kernel in stage 1 (tonight or the next Fusion-up
# night). Resumable via corpus-harvest-rows.jsonl content hashes.
Invoke-Stage 'corpus-harvest' @('H:\prism\scripts\cad-fusion-live-roundtrip.mjs',
  '--corpus-harvest', '--resume') -TimeoutMin 45

# Stage 1: Fusion kernel drain - only when the live add-in answers on delta's designated port :18362
# (OPERATOR-AUTHORITATIVE port assignment; :18360 is NOT delta's window). The gate probes the SAME
# port the harness will use: PRISM_FUSION_DELTA_PORT overrides --port inside the harness, so honoring
# it here keeps gate and drain coupled.
$fusionPort = if ($env:PRISM_FUSION_DELTA_PORT) { $env:PRISM_FUSION_DELTA_PORT } else { '18362' }
$fusionUp = $false
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$fusionPort/health" -TimeoutSec 5 -UseBasicParsing
  if ($r.StatusCode -eq 200) { $fusionUp = $true }
} catch {}
if ($fusionUp) {
  Invoke-Stage 'fusion-kernel-drain' @(
    'H:\prism\scripts\cad-fusion-live-roundtrip.mjs',
    '--corpus-kernel', '999999', '--from-worklist', '--port', $fusionPort, '--json') -TimeoutMin 210
} else {
  Add-Content -Path $summary -Value (@{ stage = 'fusion-kernel-drain'; exit = -1; elapsedSec = 0;
    skipped = "fusion :$fusionPort down";
    startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress)
}

# Stage 2: deterministic mfg decipher of every kernel-GT row (resume advances monotonically)
Invoke-Stage 'part-decipher' @('H:\prism\scripts\cad-part-decipher.mjs', '--resume', '--out', '--json') -TimeoutMin 30

# Stage 3: parallel-Hermes residual (dark-lane-safe; same args as the PRISM CAD Decipher Hermes task)
Invoke-Stage 'decipher-hermes' @('H:\prism\scripts\cad-part-decipher-hermes.mjs',
  '--in', 'state/shared/cad-fusion-live/part-decipher.jsonl', '--out', '--resume') -TimeoutMin 60

# Stage 4: refresh the kernel-GT dim-prior dataset from the grown ledger
Invoke-Stage 'kernel-dimprior' @('H:\prism\scripts\cad-fusion-live-roundtrip.mjs', '--kernel-dimprior') -TimeoutMin 15

# Stage 5: CNC-derived presence-only ground truth over the full JM DIE program corpus (monolithic
# walk, ~153k programs; NOT resumable - a timeout kill here loses the pass, next night redoes it)
Invoke-Stage 'cnc-ground-truth' @('H:\prism\scripts\cnc-ground-truth-build.mjs', '--json') -TimeoutMin 150

# Stage 6: decipher ledgers -> LoRA training feed (verified rows only)
Invoke-Stage 'decipher-lora' @('H:\prism\scripts\build-cad-decipher-lora.mjs', '--write', '--json') -TimeoutMin 15

# Stage 7: vec2d DXF extraction lane (resumable per-file, deterministic $0, walks manifest-vec2d;
#          9280 dxf readable / 247 dwg fail-loud; units-first, mm-anomaly + parse-failure surfaced)
Invoke-Stage 'vec2d-training' @('H:\prism\scripts\vec2d-to-training.mjs', '--resume', '--out', '--json') -TimeoutMin 90

# Stage 8: vec2d LoRA dataset producer (ledger -> {instruction,input,output} pairs ->
#          state/shared/lora/cad-vec2d-training-dataset.jsonl)
Invoke-Stage 'vec2d-dataset' @('H:\prism\scripts\build-cad-vec2d-dataset.mjs', '--out', '--json') -TimeoutMin 15

# Stage 9: SELF-HEAL the staged text-gen corpus (U-CAD-REGEN-STALE-GENS). The "PRISM CAD Gen Loop" task
#          appends new gens but its per-spec cursor NEVER regenerates a staged spec, so parts made by an
#          older/buggier emitter stay frozen (live 2026-07-05: 16 metric cylinders with a 25.4x-too-small
#          radius). This pass regenerates in place every staged gen whose STEP fails its own curved-dim
#          check AND which the CURRENT deterministic emitter can reproduce -> the loop's missing self-heal.
#          $0 CPU cadquery (no Fusion, no GPU), idempotent (already-correct gens skip). Bounds itself.
Invoke-Stage 'cadgen-heal' @('H:\prism\scripts\cad-regen-stale-gens.mjs', '--write') -TimeoutMin 60

# Stage 10: rebuild the cad-text-gen LoRA feed from the HEALED corpus so training consumes the fixed
#           geometry/code, not the stale artifacts (U-CAD-LORA-PARAMETRIC). Idempotent full rebuild.
Invoke-Stage 'cadgen-lora' @('H:\prism\scripts\build-cadgen-lora-dataset.mjs', '--write') -TimeoutMin 15

Add-Content -Path $summary -Value (@{ stage = 'chain-complete'; exit = 0;
  startedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress)
