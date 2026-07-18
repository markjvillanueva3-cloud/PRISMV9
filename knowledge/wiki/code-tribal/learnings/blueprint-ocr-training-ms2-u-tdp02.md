# BLUEPRINT-OCR-TRAINING-MS2/U-TDP02 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP02: batch print harvester (scans dir, runs driver, idempotent registry)

**Commit:** `8d533c1e100a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T11:39:19-05:00
**Tags:** blueprint-ocr-training-ms2, u-tdp02, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP02: batch print harvester (scans dir, runs driver, idempotent registry)

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP02: batch print harvester (scans dir, runs driver, idempotent registry)

Closes the operational gap left by U-TDP01: the training driver works on one
print at a time, but starting training across a corpus required someone to
script the enumeration + dedup loop. This is that script.

Pipeline: scan dir → infer part_class from filename → list new vs already-
processed (path-id registry) → run U-TDP01 driver per new file → emit JSONL
events → append registry → exit code reflects record-stage health.

- scripts/lib/print-harvester-lib.mjs (PURE, 145 LOC)
  migrateRegistry / derivePathId / inferPartClass / listCandidates /
  registerProcessed / summarizeRegistry. Schema v1. 10 part_class heuristics
  (punch/die/shaft/bushing/bracket/casing/plate/valve/blisk/impeller).
  Windows-case-insensitive path-id normalization (forward-slash + lowercase).
  Max-cap with `capped: true` flag (R12 fail-loud — never silently truncates).

- scripts/lib/print-harvester-lib.test.mjs (25 tests, 25/25 PASS)
  Variability: 3 part_classes exercised + heuristic ordering verification.
  Failure modes: non-array walkResult fails-soft, non-pdf paths skipped with
  error log capped at 10, force=true override, max cap honored, malformed
  job entries skipped without crash, failed jobs still recorded (training
  signal preserved), R12 surfaces errorCount + first 10 errors.
  Adversarial: 10K walk results (capped to 1000), prototype-pollution shaped
  registry key doesn't escape into Object.prototype, case-insensitive
  registry-hit with backslash path.

- scripts/harvest-prints-to-training.mjs (CLI shell, 199 LOC)
  --dir / --default-part-class / --max / --stub-mode / --force / --json / --dry-run.
  Atomic registry writes (.tmp + rename), reads via readJsonIfExists (corrupt
  registry → fresh start). Stub adapters mirror U-TDP01 for testability. Live
  adapters operator-gated (--stub-mode required for autonomous runs).
  Exit codes: 0 success / 2 record stage failure / 3 args or fs error.

End-to-end smoke-tested live:
  Run 1: walked=3 new=3 → 3/3 happy_path, registry persists, events JSONL appended.
  Run 2 (idempotency): walked=3 new=0 skipped=3, totalRuns=2.

The 3-unit chain is now operator-runnable end-to-end:
  harvest-prints-to-training (U-TDP02)
    → training-driver-print-to-cam (U-TDP01)
      → blueprint-accuracy-events.jsonl (canonical bridge)
        → blueprint-accuracy-consumer (U-BPA-CONSUMER)
          → blueprint-accuracy-state.json + xproc action plan
            → operator/cron routes through prism_ai → xproc_* round-trip

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/harvest-prints-to-training.mjs   | 241 +++++++++++++++++++++++++++++++
- scripts/lib/print-harvester-lib.mjs      | 145 +++++++++++++++++++
- scripts/lib/print-harvester-lib.test.mjs | 216 +++++++++++++++++++++++++++
- 3 files changed, 602 insertions(+)

## Lessons surfaced in commit body
- till recorded (training

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8d533c1e100a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._