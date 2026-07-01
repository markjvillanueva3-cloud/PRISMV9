---
name: reference_delta_template_store_format_2026_05_31
description: The CAD feature-template store (state/shared/cad-feature-template-store.jsonl) is a SINGLE pretty-printed JSON object {schema, templates:{id→template}}, NOT line-delimited JSONL despite the .jsonl extension. 8 templates, healthy. A naive line-by-line reader silently sees 0 templates — an R12 footgun. Read it with readFileSync+JSON.parse(whole).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.551Z
aliases: reference_delta_template_store_format_2026_05_31
---


# CAD template-store format — single JSON object, NOT jsonl (slot:delta, 2026-05-31)

## Triage result (the flagged "902 lines vs 8 templates" anomaly)
`state/shared/cad-feature-template-store.jsonl` is **HEALTHY** — a single valid pretty-printed JSON object
`{"schema":"1.0.0","templates":{id→template}}`, ~21KB, **8 templates**: tpl:C2D_SKETCH_BASE,
C3D_EXTRUDE_{BOSS,FILLET,CHAMFER,HOLE,SHELL,CIRC_PATTERN}, C3D_REVOLVE (RECT_PATTERN correctly EXCLUDED —
the bridge dup-defect). NO corruption, NO bloat. The "902 lines" is just the line count of ONE pretty-printed
JSON object; the "892 parse errors" my first audit reported were MY bug — I split on `\n` and JSON.parse'd each
indented fragment line, assuming jsonl.

## The footgun (R12 — record it, it bit me and will bite the next reader)
The file is NAMED `.jsonl` but is single-object JSON. **Read it with `JSON.parse(readFileSync(path))` — NEVER
line-by-line.** A naive jsonl reader (`split("\n").map(JSON.parse)`) silently fails on 99% of lines → sees 0
templates → the compounding template keystone appears EMPTY with no error. cad-fusion-template-lib's own
reader is correct (whole-file). The risk is an EXTERNAL consumer: a future round-trip orchestrator, india's
template-retrieval GNN, or a cross-slot tool that assumes the extension. Recommended follow-up unit (NOT done
this session — churns the working keystone): rename `.jsonl`→`.json` + update `TEMPLATE_STORE_REL` + migrate
the file, OR add a loud format guard. Low priority (lib works); logged so the rename is a clean separate unit.

## Meta-lesson (compounds with [[reference_delta_geom_diff_and_channel_lesson_2026_05_31]])
This session's discipline win: I nearly shipped a "template keystone CORRUPTED!" finding. The
measure-before-claim probe (whole-file parse → 8 templates) refuted my own audit before it became a false
alarm in a commit/memo. Triage that finds NOTHING is a valid, honest R12 outcome — don't manufacture a fix for
a non-problem. Pairs with the geom-diff units U-CADTP-GEOM-DIFF (a0060e7119) + U-CADTP-CONVERGENCE-HARNESS
(a2b780e225) shipped the same session.
