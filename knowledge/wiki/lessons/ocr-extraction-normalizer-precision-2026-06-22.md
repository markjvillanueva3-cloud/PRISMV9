---
title: OCR-extraction normalizer + ground-truth precision lessons
slug: ocr-extraction-normalizer-precision-2026-06-22
galaxy: blueprint-vision
slot: xray
created: 2026-06-22
tags: [ocr, blueprint-vision, ground-truth, normalizer, closed-loop, R12, R15]
---

# OCR-extraction normalizer + ground-truth precision lessons

Synthesized from a single xray session (2026-06-22) that shipped mill-program GT, a thread-callout
normalizer (.mjs + .ts), and an `--axis` measurement filter. Per-file scrutiny + R15 live-validation
caught a real bug in **every** build unit; the bug classes below are transferable to any future
OCR-extraction or ground-truth work. Commits: `d197fa6cd5`, `4c0828c118`, `3a2316206c`, `20661dda93`.

## 1. A tool/program value is NOT always a print callout (GT-precision)

The recurring correctness trap: extracting a number that *exists in the program/tool data* but that the
**print never dimensions**. Including it as ground truth (or as an OCR-matchable value) corrupts the
recall metric -- a GT dim the OCR can never match silently lowers recall (the same metric-artifact class
the lathe contour-guard already defends).

- **Mill program GT** (`cnc-program-gt-lib.mjs`): a drilled/reamed/bored/c'bore **hole** diameter IS a
  print callout. EXCLUDED: **tap-drill** diameters (a threaded hole is dimensioned by its THREAD, not the
  .201 tap drill), **end-mill/ball/face/chamfer cutter** diameters (the pocket is dimensioned by geometry,
  not the cutter), and a bare **"SPOT"** = spot DRILL (a center mark) -- only a spot FACE is a callout.
- **Thread callout** (`normalizeThreadCallout`): a **tool-steel grade** ("M2 STEEL", "M42 HSS", "D2 RC60")
  matches the metric `M<n>` pattern but is a MATERIAL, not a thread -- guard against material/grade
  vocabulary (`STEEL|HSS|CARBIDE|AISI|HARDNESS|HARDEN|RC|HRC|TOOL|MATERIAL`). Critical in a tool-and-die
  shop (JM runs M2/A2/D2). NPT nominal pipe size is NOT the thread major diameter -> `major_dia_in: null`.

**Rule:** before adding a value to a ground-truth set OR an OCR-matchable set, ask "does the PRINT carry
this number?" If the print dimensions the feature differently (thread callout, geometry, a center mark),
the value is not GT -- excluding it raises precision AND keeps recall honest.

## 2. Parser bug classes (caught by scrutiny + live-validation)

- **A `\d+-\d+` "size-pitch" pattern collides with mixed-fraction syntax.** The thread-context regex
  `\d+-\d+` misread `1-15/32 DRILL` (a 1.469" drill) as a "1-15" thread series and dropped the diameter.
  Fix: a negative lookahead `(?!\s*\/)` so a fraction's dash is not read as a thread. **Guard any
  dash-joined numeric pattern against fraction syntax.**
- **A geometric derivation fed into a metric must be sanity-bounded.** `extractMillBoreDiameters`
  computed `2*sqrt(I^2+J^2)` from arc centers with no cap; a misparsed `I999999` minted a 1999998" junk
  bore into the recall denominator. Fix: `BORE_MAX_IN`. **Bound any value derived from raw coordinates
  before it becomes a metric.**
- **Ambiguous integer-prefixed designations need a disambiguator.** `10-24 UNC` is a #10 machine screw
  (.190"), NOT a 10-inch thread; disambiguate a bare small integer screw-vs-inch by tpi (>=16 = screw).
  And a bare integer-integer with no series/class ("1-2", "10-32") is a range, not a thread (self-safe,
  R12 -- never fabricate).

## 3. The dual-home normalizer pattern (.mjs canonical + .ts clone)

OCR text-recovery normalizers (surface-finish, thread) live in TWO places: the canonical
`scripts/lib/ollama-vision-extract-lib.mjs` (script OCR path) AND a TS clone in `mcp-server/src/utils/`
(production MCP path via `BlueprintVisionOCREngine`). The MCP/TS bundle cannot cleanly import the .mjs, so
it is a **documented cross-boundary CLONE** -- pin IDENTICAL reference values in both test suites (ASME
B1.1 screw majors, ISO 261 pitch) so the clones cannot silently diverge. Wire additively into
`extractDimension`/`convertDimensions` (a new optional field next to `surface_finish_ra`). Keep TS source
pure-ASCII via `String.fromCharCode` for any Unicode the regex must match. Precedent: `02b56c847f`
(surface-finish), `4c0828c118`+`20661dda93` (thread).

## 4. Measurement-harness hygiene

- **R15 result-validation needs real numbers, not "looks fine".** Running the broadened
  `validate-perfect-parts --axis mill` proved the mill-GT end-to-end (`9102741` recall 0.5 PASS) -- a unit
  test alone would not have. An `--axis` filter lets a bounded GPU run TARGET the subset under test.
- **R15 premise-validation before building saves wasted work.** Two coverage levers (prefer-posted-program,
  CAD-model GT) were REFUTED by a cheap data check (the `.mcx-8` parts have no posted sibling; 68 CAD are
  binary-unreadable `.ipt`/Parasolid) -- the corpus is GT-limited to ~39 posted-program + ~6 STEP parts.
- **Long GPU node runs get fleet-reaper-killed** -- make them resumable (per-print cursor, re-OCR=0).
- **tsc needs `NODE_OPTIONS=--max-old-space-size=12288`** on this repo (the default heap OOMs).

Memories: [[reference_xray_mill_program_gt_2026_06_22]] · [[reference_xray_thread_normalize_2026_06_22]] ·
[[reference_xray_perfect_parts_gt_source_2026_06_22]]. Backlog: [[blueprint-reading-improvement-backlog-2026-06-19]].
