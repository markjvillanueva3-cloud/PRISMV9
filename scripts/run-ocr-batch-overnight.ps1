# run-ocr-batch-overnight.ps1 — reaper-immune + console-allocated OCR batch launcher.
#
# Run BY the "PRISM Blueprint OCR Batch" scheduled task (U-PSGB-XRAY-CONCURRENT-OCR,
# slot xray, 2026-05-31). Two problems this wrapper solves together:
#   1. REAPER-IMMUNITY: launched from Task Scheduler, node's ancestry leads to the
#      Task Scheduler service (always alive), so golf's fleet-reaper never classifies
#      it as an orphan ("unowned" needs a DEAD parent pid). A bare detached
#      Start-Process from a transient shell IS reaped (~10-min confirm window).
#   2. CONSOLE: a scheduled task launches its action with NO console. node then spawns
#      pdf-to-png.py (page-count) which HANGS to the 120s timeout with no console
#      (verified: 6 consecutive 128s-spaced page-count timeouts under a console-less
#      task). Start-Process -WindowStyle Hidden allocates a (hidden) console for node,
#      so python's page-count returns in <2s — exactly like the working interactive run.
# -Wait keeps THIS PowerShell alive as node's live parent for the whole run (else node
# orphans the instant PS exits → reaped). See reference_xray_ocr_gpu_concurrency_2026_05_31.
$ErrorActionPreference = 'Stop'
$node = 'H:\Tools\nodejs\node.exe'
$nodeArgs = @(
  'H:\prism\scripts\batch-ollama-vision-extract.mjs',
  '--worklist', 'H:\prism\state\shared\blueprint-ocr-worklist-clean.txt',
  # Fixed-parser checkpoint (U-XRAY-OCR-PARSE-TRUNCATION-FIX, 2026-06-06): the prior default
  # checkpoint marked ~285 prints "done" but they were OCR'd with the broken parser (whole-print
  # extraction lost over a truncation/leading-`+`). This separate checkpoint re-processes the full
  # JM corpus with the fixed parser; continues from progress already made (jm-corpus-checkpoint-fixed.jsonl).
  '--checkpoint', 'H:\prism\state\shared\ocr-training-loop\jm-corpus-checkpoint-fixed.jsonl',
  '--grayscale', '--assume-units', 'in',
  '--time-budget-min', '600',
  '--summary', 'H:\prism\state\shared\blueprint-ocr-batch-summary.json'
)
Start-Process -FilePath $node -ArgumentList $nodeArgs -WindowStyle Hidden -Wait `
  -RedirectStandardOutput 'H:\prism\state\shared\blueprint-ocr-batch-live.log' `
  -RedirectStandardError  'H:\prism\state\shared\blueprint-ocr-batch-live.err'
