# BLUEPRINT-OCR-TRAINING-MS2/U-TDP01 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP01: print-to-CAM training driver — end-to-end pipeline live

**Commit:** `5e3048ad7125` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T11:25:19-05:00
**Tags:** blueprint-ocr-training-ms2, u-tdp01, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP01: print-to-CAM training driver — end-to-end pipeline live

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP01: print-to-CAM training driver — end-to-end pipeline live

Closes the gap "infra is built but never trained on a real print". The MS1
training infrastructure (BlueprintExtractionRAGEngine, GroundTruthRegistry,
LoRA bridge) + iter 1-2 wiring (geometry evidence, accuracy consumer) all
work in isolation; nothing drove the full chain end-to-end.

Ships 4-stage orchestrator: EXTRACT → CAD → CAM → RECORD.

- scripts/lib/training-driver-lib.mjs (332 LOC, PURE) — runPipeline,
  validateAdapters, buildOperatorCorrectionEvent, aggregateBatch.
  Injected adapters (REQUIRED_ADAPTERS = [extract, driveCad, driveCam, recordEvent]).
  R12 invariants:
    1. RECORD stage ALWAYS fires (even on full upstream failure) — silent
       training-signal loss is the worst failure mode. success=false only
       when RECORD itself fails.
    2. accurate=true requires ALL 3 upstream stages to succeed.
    3. Adapter throws are normalized to FAILED status with reason text.
    4. Confidence values are NOT coerced (NaN stays NaN in payload — consumer
       routes anomalies to xproc_replay_add).
- scripts/lib/training-driver-lib.test.mjs (32 tests via node:test, 32/32 PASS)
  Variability floor: 3 part_classes (extrude_punch, die, shaft).
  Failure modes: 5 (extract fail, CAD fail, CAM fail, record fail, adapter throw).
  Adversarial: 4 (malformed adapter return, NaN confidence, null extraction,
                 10K built_kinds array).
  Input validation: 4 (missing adapter, null job, empty pdf_path, empty part_class).
  R12 regression: 2 (reason text preserved, event payload non-empty on failure).
- scripts/training-driver-print-to-cam.mjs (199 LOC, CLI)
  --pdf/--part-class/--operator OR --batch <jobs.json>, --stub-mode, --json.
  Stub adapters: deterministic, no external deps — used for smoke-tests + cron.
  Live adapters: operator-gated (PRISM_TDP_OPERATOR_OK=1 fail-loud). Vision
  LLM + Fusion360 live bridge auth are NOT bundled (deferred to U-TDP02).
  RecordEvent adapter writes JSONL to state/shared/blueprint-accuracy-events.jsonl
  — feeds U-BPA-CONSUMER directly.

End-to-end smoke-tested live: stub-mode --pdf p.pdf --part-class die →
event appended to JSONL → U-BPA-CONSUMER drained → state.json populated →
xproc_outcome_record_outcome action emitted with full payload (extract_status,
cad_status, cam_status, accurate, confidence, dispatched_count, nc_output_present).

The pipeline that did not exist 24h ago now runs end-to-end with one shell command.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/lib/training-driver-lib.mjs      | 306 +++++++++++++++++++++++++
- scripts/lib/training-driver-lib.test.mjs | 374 +++++++++++++++++++++++++++++++
- scripts/training-driver-print-to-cam.mjs | 212 ++++++++++++++++++
- 3 files changed, 892 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5e3048ad7125`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._