# run-ocr-training-loop-overnight.ps1 - reaper-immune + console-allocated CLOSED-LOOP TRAINING launcher.
#
# Sister to run-ocr-batch-overnight.ps1 (the raw-OCR-extract lane). This runs the TRAINING lane:
# blueprint-ocr-training-loop.mjs calibrates the ensemble trust function on synthetic-GT prints, then
# weak-labels the real drawing corpus into a tiered (gold/silver/bronze/reject) trainset + an
# active-learning queue. Built BECAUSE a foreground corpus run kept getting reaped (exit 255) under
# heavy fleet load - the runner is RESUMABLE (per-print processed-cursor.jsonl, re-OCR=0 on resume),
# so a reaper kill just costs the in-flight print; a scheduled task survives the kill entirely.
#
# Two problems this wrapper solves together (identical to the raw-OCR launcher - proven 2026-05-31):
#   1. REAPER-IMMUNITY: launched from Task Scheduler, node's ancestry leads to the Task Scheduler
#      service (always alive), so golf's fleet-reaper never classifies it as an orphan ("unowned"
#      needs a DEAD parent pid). A bare detached Start-Process from a transient shell IS reaped.
#   2. CONSOLE: a scheduled-task action has NO console; node then spawns pdf-to-png.py (page-count)
#      which HANGS to the 120s timeout with no console. Start-Process -WindowStyle Hidden allocates a
#      (hidden) console so python's page-count returns in <2s. -Wait keeps THIS PowerShell alive as
#      node's live parent for the whole run (else node orphans the instant PS exits -> reaped).
#
# Resumable: re-run continues from processed-cursor.jsonl (NO --fresh). The wrapper does NOT pass
# --fresh, so successive nights advance the corpus monotonically until done.
$ErrorActionPreference = 'Stop'
$node = 'H:\Tools\nodejs\node.exe'
$outDir = 'H:\prism\state\shared\ocr-training-loop\corpus-train'
$nodeArgs = @(
  'H:\prism\scripts\blueprint-ocr-training-loop.mjs',
  # calibration (8 synthetic-GT prints) re-establishes the trust function each run - cheap + the
  # tiers depend on it. The drawing worklist is built by build-print-corpus-manifest.mjs (7794 prints,
  # business excluded). Only the 2 live-reliable VLMs (the other 3 families fail dense dims).
  '--calibrate-count', '8',
  '--difficulties', 'easy,hard',
  '--models', 'qwen3-vl:8b-instruct,qwen2.5vl:7b',
  '--worklist', 'H:\prism\state\shared\ocr-training-loop\corpus-worklist-drawing.txt',
  '--out-dir', $outDir,
  '--max-time-sec', '120'
)
Start-Process -FilePath $node -ArgumentList $nodeArgs -WindowStyle Hidden -Wait `
  -RedirectStandardOutput 'H:\prism\state\shared\ocr-training-loop-live.log' `
  -RedirectStandardError  'H:\prism\state\shared\ocr-training-loop-live.err'
