---
name: reference-domain-pipeline-cell-extract-2026-05-17
description: "U-DPM0-CELL-EXTRACT — extractor projecting DOMAIN-PIPELINE-MS0-CONFIG.json into 62 roadmap units; idempotent close-out-safe, slot-queue reader contract"
aliases: reference_domain_pipeline_cell_extract_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.090Z
---


2026-05-17 juliett (claude-4f9091a6), commit `[MAIN] [DOMAIN-PIPELINE-MS0]/U-DPM0-CELL-EXTRACT`.

`scripts/extract-domain-pipeline-units.mjs` re-projects
`state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json` → `mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json`,
one unit per (domain × stage) where status != built. **62 units**, slot
routing from config: alpha 13 · bravo 13 · charlie 12 · delta 2 · echo 5
· foxtrot 1 · hotel 5 · india 1 · kilo 1 · lima 3 · golf 4 · mike 2.
juliett/speedfeed = 0 (its SPEED_FEED stage is built).

**Key lessons (from the 2-reviewer per-file gate, FAIL→fix→PASS):**
- A new milestone JSON in `mcp-server/data/milestones/` MUST emit the
  `slot-queue.mjs` reader contract keys (`unit_id`, `wave`, `cost`,
  `spec`, `depends_on`, `summary`) or `--pick`/`--list` silently return
  garbage. The richer DPM0 keys (domain/slot/stage/...) are additive.
- An extractor that writes the FULL units array every run STOMPS shipped
  status (same class as the 2026-05-17 `register-*-envelopes` non-atomic
  writer regression). Fix: read existing file, preserve
  status/completed_at/completed_by/ship_notes for any unit not
  `not_started`. Ship the round-trip oracle test (build → flip-completed
  → re-build → assert preserved) — hermetic unit tests don't catch it.
- ESM entry-guard `import.meta.url === \`file://${argv1}\`` is WRONG on
  Windows (file:// vs file:///, `\\`→`/`). Use
  `pathToFileURL(process.argv[1]).href`.
- Operator-edited status strings need case-normalization
  (`"BUILT"` ≠ `"built"`) or phantom units appear.

Advisory + mustHumanVerify. Re-run after operators refine the config.
Follow-on: `topup-slot-queues.mjs` + `reconcile-roadmap-drift.mjs`.

Wiki: [[domain-pipeline-cell-extract]]. Sister: [[domain-pipeline-ms0]].
