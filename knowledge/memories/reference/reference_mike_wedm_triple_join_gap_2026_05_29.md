---
name: reference_mike_wedm_triple_join_gap_2026_05_29
description: WEDM print+program+sketch training triples EXIST as 3 corpora but do NOT join by part-number/filename stem — closed-loop print→program training needs a reconciliation layer first
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.214Z
aliases: reference_mike_wedm_triple_join_gap_2026_05_29
---


# WEDM print+program+sketch triple — corpora exist but DON'T join by stem (slot:mike, 2026-05-29)

Operator directive: "we have prints galore and programs to match along with sketches (Mastercam) — use all three for closed-loop training." **Measured the actual join-ability. The three corpora exist, but they are NOT programmatically joinable by the obvious key (part-number filename stem).**

## The three corpora (located)
- **Prints: 85,346 PDFs** across `H:/PRISM/JM DIE/`, **85,009 concentrated in one folder: `JM DIE/Prism JM Die/`** (the master print library). 19 jpg + 6 png besides.
- **Programs: ~22 WEDM NC files** in `JM DIE/WIRE EDM/` (19 `.min` Mitsubishi + 3 `.nc`), customer-foldered (ATF, Anderson MFG-STABIO, …).
- **Sketches: 3970 Mastercam `.mcx`/`.mcx-8`** (binary) in `JM DIE/WIRE EDM/` — 98% of that tree.

## The join GAP (the real blocker for closed-loop print→program training)
- **0 PDFs inside `WIRE EDM/`** — prints and programs do NOT co-locate by folder.
- **Cross-tree stem test: 0/4** — WEDM part numbers `3024402`, `2766022`, `3024313`, `874-557` have NO matching `.pdf` anywhere in JM DIE, and NO stem-matched `.mcx` in WIRE EDM.
- So `print(stem).pdf ↔ program(stem).min ↔ sketch(stem).mcx` does NOT hold. The 85k prints in `Prism JM Die` use a different naming/numbering than the WEDM program part numbers.

## Implication
A matched print→program→sketch WEDM corpus is NOT free-for-the-taking. It needs a **reconciliation layer** that the pipeline does not have yet:
1. OCR each print's title block (lima's pypdf extractor + an OCR pass) → extract the real part number / customer.
2. Fuzzy-match that against WEDM program names + `.mcx` names (+ customer folder).
3. Emit the joined triple as the training row (print=input, program=output, sketch=geometry intermediate).
OR the operator points to a job-folder organization where triples ARE pre-grouped (e.g. inside `Prism JM Die` or `FUSION CAD AND CAM FILES`) that filename-stem matching misses.

## Status of the broader ask (2026-05-29 session)
- WEDM AI = extensively built (~30 engines, 20 wired actions); gaps = ~12 untested core LoRA engines.
- ✅ india self-improving-loop bridge SHIPPED (`U-INDIA-LOOP-BRIDGE`): WEDM outcomes → india's `OutcomeLedgerRecord` loop. See [[reference_mike_wedm_archive_composition_data_gap_2026_05_29]] for the .MIN/.MCX data-volume gap (sister finding). The feedback arc of the closed loop is wired; the FORWARD print→program training data is gated by this triple-join gap.
