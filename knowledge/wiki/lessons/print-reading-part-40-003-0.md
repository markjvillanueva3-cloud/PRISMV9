---
title: Print-reading lesson — part-40-003-0
slug: print-reading-part-40-003-0
kind: lesson
status: shipped
date: 2026-05-21
milestone: PRINT-OCR-100PCT-MS0
unit: U4
generated: true
---

# Print-reading patterns observed in the part-40-003-0 corpus

Generated from the corpus-wide scan (U2 output, 44 prints).

## Stats

| Metric | Value |
|--------|-------|
| Total prints | 44 |
| Avg regions per print | 0.0 |
| Failed extractions | 0 (0.0%) |
| Dominant confidence floor | `low_no_vision` |

## What the corpus tells us

The part-40-003-0 cluster contains 44 prints whose extraction floor distribution is:

- `low_no_vision`: 44 (100.0%)

The dominant floor (`low_no_vision`) means the typical confidence guarantee
for this customer family. Floors below `normal` (`low_no_prior`,
`low_contradiction`, `low_no_vision`) require operator review per CLAUDE.md
R12 fail-loud — never silently accept.

## When extracting these prints

1. Run `prism_cad:blueprint_rag_extract` per page.
2. If `confidenceFloor` returns anything other than `normal`, escalate to
   operator review — do NOT auto-write to `verified_100pct`.
3. For GD&T regions: cross-check against `knowledge/wiki/code-tribal/blueprint-gdt-*.md`
   for known anti-patterns.
4. Ground truth resolution order:
   - JM-DIE inspection table (`groundTruthSource: jm_die_inspection`)
   - Docustrata index (`groundTruthSource: docustrata_index`)
   - Operator-confirmed measurement (`groundTruthSource: operator_confirmed`)

## Related

- [[print-corpus-100pct-coverage]] — top-level coverage report
- [[blueprint-extraction-rag]] — the engine that fills these rows

## See also

- `state/shared/print-corpus-tables/by-customer/part-40-003-0.jsonl` — raw rows
- `mcp-server/src/engines/PrintAccuracyProofEngine.ts` — 100% gate logic
- `mcp-server/data/milestones/PRINT-OCR-100PCT-MS0.json` — milestone envelope
