---
name: reference-vendor-catalog-misclassification-2026-05-23
description: R12 fail-loud win — vendor-catalog-audit.mjs initial run flagged Sandvik drift on 14 GC_2023-2024 inventory entries; cover-page extraction CORRECTED to Tungaloy (inventory was right). Audit pattern table fixed in iter13. Demonstrates verify-actual-contract doctrine — a misclassifier was about to bulk-rename 14 correctly-labeled entries.
metadata:
  type: reference
---

# Vendor catalog misclassification — Sandvik vs Tungaloy GC_2023-2024 — CORRECTED (2026-05-23, slot:juliett iters 12-13)

## Original suspicion (iter12) → CORRECTED (iter13)

**WRONG initial finding**: tool-catalog-inventory.json TC-001..TC-014 label `GC_2023-2024_*` PDFs as `manufacturer:"tungaloy"`; I reasoned the regional US/Global split + Sandvik GC-grade references in engine code meant inventory was mis-labeled and these were actually Sandvik Coromant catalogs.

**ACTUAL finding (post-verification, iter13)**: Tungaloy was correct all along. Cover-page extraction via `pdftotext -l 5 GC_2023-2024_US_Tooling.pdf` yields verbatim:
- "Tungaloy's Insights → Smart Manufacturing"
- "About Tungaloy Cutting Tool Catalog"
- `tungaloy.com/us`
- Page 1 grade index: "A Grade A001 — B Insert C External Toolholder D Internal Toolholder E Threading Tool F Parting, Grooving G Miniature Machining" (Tungaloy's canonical TOC structure)

Tungaloy DOES publish US-inch + Global-metric editions of their GC catalog (the regional split I attributed to "Sandvik-only" was wrong — both vendors do this).

The audit's pattern table had a buggy rule `/^GC_2023-2024_/i → "sandvik"` which over-fit on filename prefix without verifying publisher. **The bug was in my classifier, not in the inventory.**

## What this confirms (doctrine reinforcement)

[[feedback_verify_actual_contract_not_proxy]] — never act on classification suspicion without opening the source artifact first. The Stop hook + scrutiny gate prevented an actual inventory mutation (the iter12 commit was advisory-only — no inventory write), but had I rushed to "fix" the 14 entries, I would have introduced a real regression naming every Tungaloy catalog as Sandvik.

The audit script's `mustHumanVerify:true` flag + the "Action: verify by opening one PDF" instruction in `critical_findings[0].recommended_action` is what surfaced the real answer — the gate was load-bearing.

## Iter13 corrections shipped (commit pending)

1. **`scripts/vendor-catalog-audit.mjs`** — pattern table fix:
   - REMOVED `/^GC_2023-2024_/i → "sandvik"` (it was wrong)
   - ADDED `/^GC_2023-2024_/i → "tungaloy"` (verified)
   - ADDED `/^master\s+catalog\s+201[5-9].*\bvol/i → "iscar"` (catches Iscar Master Catalog Vol 1/2 series)
   - ADDED `/^(turning|milling|threading)\s+2018\.1/i → "tungaloy"` (catches the 2018.1 product-line PDFs)
   - ADDED `/^tooling\s+systems/i → "big_daishowa"` (catches generic "Tooling Systems.pdf" et al)

2. **`mcp-server/data/tool-catalog-inventory.json`** — pointer fix:
   - `catalog_path: "C:/PRISM/CATALOGS/"` → `"H:/prism/resources/MANUFACTURER_CATALOGS/uploaded/"`
   - Added `catalog_path_corrected_at` + `catalog_path_corrected_by` + `catalog_path_corrected_reason` provenance fields

3. **`state/shared/specs/VENDOR-CATALOG-AUDIT-2026-05-23.{json,md}`** — re-generated:
   - Critical findings: 3 → 1 (only zip-part-gaps remains, operator-blocked)
   - manufacturer_drift_rows: 15 → 14
   - "unknown" PDF count down (better pattern coverage)

## What still drifts (post-correction)

- **21 zip-part gaps**: `MANUFACTURER CATALOGS.zip.{6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 21, 41, 44, 45, 46, 47, 48, 49, 50}` missing — operator must re-upload from source before `copy /b` reassembly works. P1, no fix possible from chat side.
- **7 inventoried PDFs not on disk**: orphan from C:/PRISM/CATALOGS/ pre-move era. Need a follow-on triage pass to either find + restore the files or drop the inventory entries.
- **Remaining "unknown" PDFs**: After pattern fix, residual unknowns need manual attribution (e.g. `YU25_America.pdf`, `catalog_c010b_full.pdf`, `Solid End Mills.pdf`).

## Cross-refs

- Engine cross-ref: `mcp-server/src/engines/UltimateSpeedFeedEngine.ts:GRADE_SPEED_FACTORS` references `GC4325/GC4315/GC4335 // Sandvik` — those ARE Sandvik grades (Sandvik's own GC4325 insert series). Tungaloy uses different grade names (T9215, T6315, AH725, AH8005). So the engine reference to "GC4325" is genuinely Sandvik product, even though the on-disk catalogs labeled `GC_2023-2024_*` are Tungaloy. **No conflict — two different "GC" naming systems coexist.**
- Doctrine: [[feedback_verify_actual_contract_not_proxy]] — load-bearing for this correction.
- Sister: [[reference_sf_psn_peer_sweep_4th_2026_05_23]] (other iter12 session-end memory).
- Audit infrastructure: `scripts/vendor-catalog-audit.mjs` (iter12 ship, iter13 pattern-fix).
