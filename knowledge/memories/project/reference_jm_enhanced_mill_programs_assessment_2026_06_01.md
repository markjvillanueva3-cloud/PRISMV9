---
name: reference_jm_enhanced_mill_programs_assessment_2026_06_01
description: "Workflow verdict — the \"enhanced JM mill programs\" are NOT proper enhanced mill code; 95% mislabeled lathe + P0 units landmine. Do not trust them; generate fresh instead."
type: project
source: prism-memory
synced: 2026-06-27T20:30:46.628Z
aliases: reference_jm_enhanced_mill_programs_assessment_2026_06_01
---


# "Enhanced JM Mill Programs" — assessment VERDICT (workflow wc7dfjak5, 2026-06-01, slot foxtrot)

**Source:** 9-agent workflow `assess-jm-enhanced-mill-programs` (175 tool-uses, ~902K subagent tokens). Full report: `state/shared/specs/JM-ENHANCED-MILL-PROGRAMS-ASSESSMENT-2026-06-01.md`.

**VERDICT: NO — we did NOT generate proper *enhanced mill* programs.** Broken on two independent axes:

1. **`mcp-server/data/programs/` (presented as "enhanced mill", 2,888 files) is a verbatim relabeled archive ingest — zero enhancement.**
   - **2,734 / 2,888 (94.7%) are mislabeled OKUMA LATHE programs** (deterministic: **0/2,734 have G43**; 2,693 have G50 lathe spindle-clamp; 1,384 have NTURN). Belong to whiskey (lathe), not foxtrot.
   - Only **149 are genuine mill** (138 Haas `.NC` + 11 Hurco `.hnc`) — and those are **md5-identical unmodified CAM posts** (proper *only* because they're untouched copies).
2. **The real "enhancement" layer is `H:/PRISM/JM DIE/CNC LATHE/**/PRISM_UPGRADED/<machine>/*.nc` (114,646 files) — and is LATHE, not mill, with a P0 units landmine.**

**P0 — units landmine (114,646 files):** header declares METRIC (`feedrate 178.75 mm/min`, `depthOfCut 1.5 mm`, `RPM 1375`) bolted onto an **unchanged INCH OSP body** (`G97 S700`, `F.005` ipr, `D.1`/`D.15` inch) with **ZERO G20/G21**. Header values never written into motion blocks → cosmetic, non-functional, and the exact 25.4× mislabel class CLAUDE.md §SAFETY warns about. Other P0s: `okuma/#10874 HAMMER.MIN:88 G0 Z1.1 Z-1.145` (dup Z, crash risk); 0-byte/binary/no-M30 fragments.

**Purchased→used tool map (`state/shared/quoting/jm-tool-purchases.json`, $4.91M/7,150 lines/49 vendors):** type-level map is MEDIUM confidence on the 149 genuine mill programs only; **diameter-exact 1:1 is NOT constructible** (purchase data is aggregate rollups, OCR-unreliable `costSamplesRaw`). **88% of spend ($4.34M) is carbide BLANKS** (die raw stock, never a tool call) → corroborates: JM is a **header-die/turning shop, not a job-mill shop**. Engraving bits + sub-1/32" micro ball-mills are used-but-not-purchased (CAM-library defaults, untraceable).

## How to apply
- **Do NOT treat `data/programs/` as an enhanced-mill deliverable or feed it to a mill validator** — it's wrong-domain + unenhanced.
- The closed-loop template/generation core (T2/T4/T5/T5.5/T6, this session) is the RIGHT path: **generate fresh physics-optimized mill programs**, don't trust the "enhanced" copies.
- **Cross-lane routing (own+route, don't drop):** whiskey (lathe) owns the 114K `PRISM_UPGRADED` units-fix + the 2,734 okuma reclassification; charlie/hotel for a full per-line QuickBooks tooling export (lifts tool-map LOW→HIGH). foxtrot's lane = rec #3 (a real mill-enhancement pipeline that *transforms* + before/after diff, gated by post-lint + units-guard) + rec #4 (fragment/binary/units-inconsistency quarantine gate).

Relates: [[feedback_check_units_first]] · [[reference_mill_course_plotting_substrate_2026_05_31]] · [[feedback_always_fill_gaps]] · [[feedback_always_capture_lessons]]
