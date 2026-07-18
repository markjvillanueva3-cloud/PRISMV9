---
title: DOMAIN-PIPELINE-MS0/U-DPM0-CELL-EXTRACT — cell→unit extractor
type: architecture
domain: roadmap
created: 2026-05-17
by: claude-4f9091a6 (juliett)
---

# Domain × Stage Cell Extractor

`scripts/extract-domain-pipeline-units.mjs` re-projects
`state/shared/specs/DOMAIN-PIPELINE-MS0-CONFIG.json` (the canonical
18-stage × 13-domain print-to-part pipeline table) into
`mcp-server/data/milestones/DOMAIN-PIPELINE-MS0.json` — one roadmap unit
per `(domain × stage)` cell whose normalized status `!= "built"`.

## Why

The DPM0 config tracks 86 cells (24 built / 34 partial / 28 missing). The
62 not-fully-built cells were a flat status table, not pickup-able work.
This extractor formalizes each as a roadmap unit so the per-slot RGS
queues (`slot-queue.mjs`, `topup-slot-queues.mjs`) route them to the
owning domain slot automatically.

## Contract

- **Unit id:** `U-DPM0-<DOMAIN>-<STAGE>` (e.g. `U-DPM0-MILL-FIXTURE_DESIGN`)
- **Slot routing:** straight from `config.domains[d].slot` — no duplication.
  62 units → alpha 13 · bravo 13 · charlie 12 · delta 2 · echo 5 ·
  foxtrot 1 · hotel 5 · india 1 · kilo 1 · lima 3 · golf 4 · mike 2.
  (juliett/speedfeed = 0; its only stage SPEED_FEED is built.)
- **slot-queue.mjs reader keys** emitted on every unit: `unit_id`, `wave`,
  `cost` (partial→S, missing→M), `spec` (`pending-generator`),
  `depends_on` (`[]`), `summary`.

## Safety properties

- **Idempotent / close-out-safe:** re-run reads the existing milestone and
  preserves `status`/`completed_at`/`completed_by`/`ship_notes` for any
  unit not `not_started`. A re-run never reverts a shipped unit (the
  `register-*-envelopes` stomp class — CLAUDE.md `## Recent regressions`
  2026-05-17).
- **SEED_UNITS single-source:** the extractor's own meta-unit
  `U-DPM0-CELL-EXTRACT` is a `SEED_UNITS` const, emitted `completed`
  DETERMINISTICALLY regardless of prior file state or `--no-merge` — the
  *extractor* is the single source, not the file it writes. A richer
  existing copy forward-merges (newer `completed_at`/`ship_notes` win); a
  `not_started` existing copy cannot revert the completed floor. Other
  operator-added shipped non-cell units still carry-forward from the file
  (lost only under explicit `--no-merge`, which is documented DESTRUCTIVE).
  Fixes the fragile-self-referential-single-source class (Reviewer B P1).
- **R12 fail-loud:** WARN (not silent) on cell-count drift vs the doctrine
  62, unknown status strings, malformed domain keys, missing
  `canonical_stages`. Warnings surface on `milestone.warnings` + stderr.
- **Windows-safe:** atomic write with `copyFileSync`+`unlink` fallback for
  `EPERM` rename; ESM entry-guard via `pathToFileURL(argv[1]).href`.
- **Status case-normalized:** `"BUILT"` / `" Built "` correctly skipped.
- **Advisory + mustHumanVerify:** operators refine engine mappings +
  statuses in the source config and re-run; never hand-edit the output.

## Follow-on (operator)

```
node scripts/extract-domain-pipeline-units.mjs        # (re)emit
node scripts/topup-slot-queues.mjs                    # inject into queues
node scripts/reconcile-roadmap-drift.mjs              # roadmap-index.json
```

## Tests

`scripts/extract-domain-pipeline-units.test.mjs` — 36 `node:test` cases:
pure-core, status-normalization, slot-queue contract, idempotency
round-trip oracle (build → flip-to-completed → re-build → assert
preserved), live-config 62-cell regression oracle. Per-file 2-reviewer
gate: FAIL → fix → PASS/PASS (P0 schema-mismatch + P0 entry-guard + 5×P1
all resolved).

Memory: [[reference_domain_pipeline_cell_extract_2026_05_17]] ·
Sister: [[domain-pipeline-ms0]] (the config this projects).
