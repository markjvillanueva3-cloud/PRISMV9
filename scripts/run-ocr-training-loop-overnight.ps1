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
# Keep the 2 VLMs GPU-resident through the whole run (inherited by the node child + every Ollama call
# via ollama-vision-extract-lib's keep_alive). Without this each ensemble call relied on Ollama's 5min
# idle default, so a multi-page rasterize gap or fleet GPU contention evicted the models -> cold reload
# -> the ~4x calibration slowdown + "1 model survived" timeouts observed 2026-06-16. 15m >> any gap;
# the VLMs are lean (~7-10GB each) so two resident still leave ~76GB for the fleet's gpt-oss:120b.
$env:PRISM_OLLAMA_VISION_KEEP_ALIVE = '15m'
$nodeArgs = @(
  'H:\prism\scripts\blueprint-ocr-training-loop.mjs',
  # calibration re-establishes the trust function each run - the tiers depend on it. 24 synthetic-GT
  # prints (~48 corroboration samples) lifts the calibration out of the <50-sample "under-powered"
  # band (was 8), sharpening the gold/silver/bronze cut. Amortized over the long weak-label window
  # below it is negligible overhead. The drawing worklist is built by build-print-corpus-manifest.mjs
  # (7794 prints, business excluded). Only the 2 live-reliable VLMs (the other 3 families fail dense dims).
  '--calibrate-count', '24',
  '--difficulties', 'easy,hard',
  '--models', 'qwen3-vl:8b-instruct,qwen2.5vl:7b',
  '--worklist', 'H:\prism\state\shared\ocr-training-loop\corpus-worklist-drawing.txt',
  '--out-dir', $outDir,
  # Enabled 2026-06-18 (operator "enable and continue"): pre-VLM page classifier skips CONFIDENT
  # non-drawings (paperwork) before the 2-model ensemble -- the JM corpus is heavy with scanned office
  # docs that yield 0 trainable dims, so the VLMs were burning time on them. Data-loss-safe: skips ONLY
  # a confident not-a-drawing (0.70 conf floor); any uncertain page still goes through the ensemble.
  # A print is cursored 'skipped-all-paperwork' only when EVERY page is confident paperwork
  # (re-runnable without this flag on the skipped set if it is ever found too aggressive).
  '--page-classify',
  # Enabled 2026-06-22 (U-XRAY-TRAINLOOP-FORCE-UNITS): force the global unit on PHASE-2 per-page OCR.
  # 96% of the JM corpus is multi-page, and pages 2+ LOSE the title block (which carries the units) ->
  # the VLM guesses the unit and emits WRONG-SCALE weak labels (a .94in dim read as 0.94mm). JM Die
  # convention is INCH (units-first doctrine: "JM Die convention is INCH"), and this worklist is JM
  # drawings, so `in` is the correct global unit for the corpus. CAVEAT: a rare metric print would be
  # forced to inch on ALL pages (its title-block page would otherwise self-detect mm) -- the trainset is
  # weak-labels (calibration + AL-queue absorb outliers), so the net is strongly positive on this
  # inch-dominant corpus. The principled units-first fix (detect page-1 units, propagate to pages 2+ per
  # PRINT, handling inch AND metric) is the safer follow-up; drop these two args to revert.
  '--force-units', 'in',
  # Enabled 2026-06-17 (operator "make upgrades... bolster print reading"): format:"json" grammar-
  # constrained decode on EVERY ensemble VLM call. Structurally prevents the qwen2.5vl runaway-JSON
  # dropout (~30-37% of outputs hit num_predict mid-structure -> malformed blob -> whole-print
  # parse-fail -> "1 model survived" calibration exclusions). Threaded loop -> runEnsembleOverImage ->
  # ocrImageWithModelAsync -> buildOllamaRequestBody (opts.format). Default-OFF in the runner; drop
  # this flag to revert to unconstrained decode (byte-identical legacy request body).
  '--format-json',
  # DO-IT-ALL-UNTIL-COMPLETE (operator 2026-06-19 "change from nightly to do it all until its complete").
  # The WEAK-LABEL loop has NO internal time budget - one launch already drains the ENTIRE remaining
  # worklist. The only thing that ever stopped it at ~700/night was the task's 12h ExecutionTimeLimit +
  # a daily-only trigger; the -Continuous installer now sets ExecutionTimeLimit=unlimited + a 30-min
  # backstop repetition (IgnoreNew), so ONE run grinds the full ~7,419-print corpus to completion (days,
  # not nights) and a reaper/reboot death auto-resumes from processed-cursor.jsonl within 30 min.
  # --until-complete makes a relaunch on an ALREADY-DRAINED corpus fast-exit 0 BEFORE calibration, so the
  # continuous backstop idles cheaply (no wasted GPU re-calibration) once the corpus is done.
  '--until-complete',
  # Per-ensemble-call cap (NOT a total-run budget). 18000s is effectively no per-call limit; the real
  # per-VLM-call timeout is curl --max-time 600s (U-XRAY-PERCALL-TIMEOUT-CAP). Hardcoded - the task runs
  # Windows PowerShell 5.1 (no ternary); override by editing this value, not an env expression.
  '--max-time-sec', '18000'
)
Start-Process -FilePath $node -ArgumentList $nodeArgs -WindowStyle Hidden -Wait `
  -RedirectStandardOutput 'H:\prism\state\shared\ocr-training-loop-live.log' `
  -RedirectStandardError  'H:\prism\state\shared\ocr-training-loop-live.err'
