# run-cad-gen-loop-overnight.ps1 - reaper-immune, $0 CAD-generation overnight drainer.
#
# Sister to run-ocr-training-loop-overnight.ps1 (same reaper-immunity pattern). Drains the delta
# cad-gen worklist via cad-gen-overnight-loop.mjs (Ollama qwen2.5-coder:32b -> validated CadQuery ->
# staged STEP). Built BECAUSE a bare `run_in_background` node drain kept getting REAPED (exit 255):
# its ancestry leads to a transient shell, so golf's fleet-reaper classifies it as an orphan and kills
# it (an "unowned" orphan needs a DEAD parent pid). Launched from Task Scheduler, node's ancestry leads
# to the Task Scheduler service (always alive) -> never reaped. -Wait keeps THIS PowerShell alive as
# node's live parent for the whole run (else node orphans the instant PS exits -> reaped).
#
# Resumable: re-run continues from processed-cursor.jsonl (hash-keyed; re-gen=0 on resume). The loop's
# --until-complete fast-exits when the worklist is drained, so the repetition idles cheaply once done.
# keep_alive keeps qwen GPU-resident across the batch (fewer cold-reload timeouts under fleet GPU load).
$ErrorActionPreference = 'Stop'
$node = 'H:\Tools\nodejs\node.exe'
$env:PRISM_OLLAMA_GEN_KEEP_ALIVE = '15m'
$nodeArgs = @(
  'H:\prism\scripts\cad-gen-overnight-loop.mjs',
  '--until-complete'
)
Start-Process -FilePath $node -ArgumentList $nodeArgs -WindowStyle Hidden -Wait `
  -RedirectStandardOutput 'H:\prism\state\shared\cad-gen-loop\overnight-live.log' `
  -RedirectStandardError  'H:\prism\state\shared\cad-gen-loop\overnight-live.err'

# R15 WIRE: after the gen drain, re-validate the staged STEPs (trunk-side cadquery re-import test
# signal) -> validation-report.json. Same hidden+wait shape; failure here never blocks the gen drain.
Start-Process -FilePath $node -ArgumentList @('H:\prism\scripts\cad-gen-validate.mjs', '--json') -WindowStyle Hidden -Wait `
  -RedirectStandardOutput 'H:\prism\state\shared\cad-gen-loop\validate-live.log' `
  -RedirectStandardError  'H:\prism\state\shared\cad-gen-loop\validate-live.err'
