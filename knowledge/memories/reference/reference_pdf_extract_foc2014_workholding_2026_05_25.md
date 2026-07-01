---
name: reference-pdf-extract-foc2014-workholding-2026_05_25
description: india iter29 — 11 workholding/WCS/tap tips extracted from Fundamentals_of_CNC_Machining (Autodesk 2014). Net-new vs iter27 NexGenCAM 2012 edition.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.726Z
aliases: reference_pdf_extract_foc2014_workholding_2026_05_25
---


iter29 (slot:india, 2026-05-25) extracted 11 tribal tips from the Autodesk 2014 edition of "Fundamentals of CNC Machining" — same title as iter27's source but a different book with 4 net-new chapters.

**Source**: `H:/PRISM/resources/RESOURCE PDFS/Fundamentals_of_CNC_Machining.pdf` (15 MB, ©2014 Autodesk, 10 chapters).

**Target chapters** (net-new vs iter27): Ch 7 WCS-on-flip patterns · Ch 10 workholding · Ch 3 tap-type details.

**Output**: `state/shared/extracted-pdfs/fundamentals-cnc-machining-2014-workholding-tips.jsonl` (11 tips) + `knowledge/wiki/training/extracted/fundamentals-cnc-machining-2014-workholding.md` (operator wiki).

**Highest-leverage tips**:
- foc14-005: WCS datums against FIXED jaw + vise stop, never moving jaw (flip-G54 stability)
- foc14-004: Soft-jaw spacer procedural (machine cutout with spacer, REMOVE before clamping part)
- foc14-001: 6000+ lb vise force can deform thin parts (match force to part stiffness)

**New engine wiring surfaces**:
- `engine.WorkholdingDesignEngine` (3 tips)
- `engine.FixtureSelectionEngine` (5 tips)
- `engine.PartDeflectionEngine`, `engine.WorkCoordinateSystemEngine`, `engine.ShopSafetyValidationEngine` (1 tip each — new bridges)

**Commit**: `550347443c` (absorbed into xray slot — 7th peer-absorption this session per [[feedback_commit_to_slot_worktree]]).

**Cross-refs**: [[reference_pdf_extract_fundamentals_cnc_2026_05_25]] (iter27 sister book) · [[feedback_verify_actual_contract_not_proxy]] (doctrine driving page-cited extraction).
