---
name: reference_oscar_sfc_material_table_divergence_2026_06_23
description: "FIXED + LIVE-VALIDATED (slot:oscar 2026-06-23, commit 4ad8a0116b; was NOT-yet-fixed vendor-parity-gated): ProductEngine's INLINE MATERIAL_HARDNESS table (ProductEngine.ts:459) diverged from canonical constants.ts -> the SFC page shows wrong force + tool life. LIVE 1045 tool_life=2.2min (inline C=250) vs canonical C=350 -> ~9.4min (~4x too short). Inline 4140 kc=2000 vs canonical 1950; 316 mc=0.21 vs 0.25; 6061 mc=0.30 vs 0.22. Violates soul inline-physics-constants. FIX = source kc1.1/mc/C/n from canonical (CANONICAL_KIENZLE + MATERIAL_DB/AISI table constants.ts:1260) -- but GATED on vendor-parity (which Taylor C is right) + physics-reviewer before publishing a changed customer-facing speed/feed."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.708Z
aliases: reference_oscar_sfc_material_table_divergence_2026_06_23
---



**SFC page material-constants divergence -- FIXED + DEPLOYED + LIVE-VALIDATED (slot:oscar, 2026-06-23, commit `4ad8a0116b`).**

> STATUS FLIP: both gates cleared this session. Vendor-parity RESOLVED -- C=350 confirmed canonical by 3 in-repo sources (`AISI_CUTTING_COEFFICIENTS["1045"]`, `CANONICAL_TAYLOR.P`, `physics/CLAUDE.md`) + Machinery's Handbook 32e / Kennametal. physics-reviewer PASS (no P0/P1; temper-strip regex + module-load TDZ verified). FIX = R8-surgical: `ProductEngine.ts` keeps the `MATERIAL_HARDNESS` shape but COMPOSES kc1_1/mc/C/n at module load via `canonicalCoefficients(grade, iso)` (per-material `AISI_CUTTING_COEFFICIENTS` override -> per-ISO `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR` fallback, mirrors `buildMaterialPhysics`); `resolveMaterial` unknown-path also canonicalized (C=250->350). +2 R9 canonical-bound tool-life locks (fail on a revert to inline 250). 26/26 page + 75/75 SFC-path tests; changed files type-clean. LIVE :3100 round-trip post-restart (1045 12mm 4FL ap6 fz0.15 Vc200): **tool_life_min 2.2 -> 8.3 min** (~4x correction now on the customer-facing API), Ra 1.76, fz 0.15. The "NOT yet fixed" finding below is preserved for history.

## The finding (confirmed with LIVE :3100 numbers, post-deploy)
`ProductEngine` carries its OWN inline `MATERIAL_HARDNESS` table (`ProductEngine.ts:459`) with per-material `kc1_1/mc/C/n`, used by `sfcCalculate` for force (Kienzle) + tool life (Taylor). It DIVERGES from the canonical source of truth `mcp-server/src/physics/constants.ts` (`CANONICAL_KIENZLE` per ISO + `MATERIAL_DB` taylor_C/n + the AISI table at `constants.ts:1260`). CLAUDE.md: "Canonical kc1.1/Taylor/material values live ONLY in src/physics/constants.ts." The inline table both VIOLATES that (soul refuse `inline-physics-constants`) and is numerically wrong.

| material | field | ProductEngine inline | canonical constants.ts | impact |
|---|---|---|---|---|
| 1045 (P) | Taylor C | **250** | 350 | tool_life 2.2 vs ~9.4 min (**~4x too short**) |
| 4140 (P) | kc1.1 | **2000** | 1950 (AISI) / 1800 (KIENZLE[P]) | force +3-11% |
| 4140 | Taylor C / n | **220 / 0.22** | 320 / 0.24 | tool life off |
| 316 (M) | mc | **0.21** | 0.25 | force exponent wrong |
| 316 | Taylor C | **180** | 190-200 | tool life off |
| 6061 (N) | mc / C / n | **0.30 / 800 / 0.30** | 0.22 / 600 / 0.40 | force + life off |

LIVE 1045 (12mm 4FL carbide, ap6 fz0.15, Vc200): `Fc=1855 kc=3238 power=6.18 tool_life=2.2`. kc=3238 is self-consistent (1800*h^-0.25 with avg-chip h=0.0955 for ae=D/2) -- so the FORCE path uses canonical-equal kc1.1 for 1045; but `tool_life=2.2` reflects the inline C=250, confirming the Taylor divergence reaches the customer.

## The fix (NEXT UNIT -- gated, do NOT rush)
`ProductEngine.resolveMaterial` should derive `kc1_1/mc` from `CANONICAL_KIENZLE[iso_group]` and `C/n` from the canonical per-material AISI table (`constants.ts:1260`) / `MATERIAL_DB`, deleting the inline `MATERIAL_HARDNESS` numbers (keep only the material->iso/hardness MAP if needed, sourced canonical). GATES (oscar soul):
- **vendor-parity**: which Taylor C is correct for 1045 carbide milling -- inline 250 (-> 2.2min) or canonical 350 (-> 9.4min)? Compare G-Wizard / HSMAdvisor / published (Machinery's Handbook 1045 carbide tool-life). Do NOT publish a changed customer-facing tool life without this. (~9min for a light 1045 carbide cut is more textbook-plausible than 2.2min, but CONFIRM.)
- **physics-reviewer** on the force/life constant swap.
- Re-run the page tests (they assert identities + bands, not specific force/life, so they pass either way -- ADD reference-value force/life tests bound to canonical after the swap).
- Re-verify live :3100 (tool_life 2.2 -> ~9 for 1045) + rebuild dist + restart :3100 (supervisor respawn: kill the `node dist/index.js` child, PID via `netstat -ano | grep :3100`).

## Session context (4 fixes shipped + LIVE this session)
material-aware Vc/fz/rpm-clamp (`05e08b4702`) + engagement-arc (`247c5856f2`) + surface-finish per-tooth Ra (`76154a3ea6`) -- all DEPLOYED to :3100 (supervisor-respawn restart, verified live: 1045 Vc200/fz0.15/Ra1.76, 316 Vc133, 6061 Vc452-clamped). Siblings: [[reference_oscar_sfc_page_material_aware_fix_2026_06_23]] · [[reference_oscar_sfc_surface_finish_pertooth_2026_06_23]] · [[reference_oscar_engagement_arc_doubled_bug_2026_06_23]]. Deploy mechanism: [[reference_oscar_sfc_surface_finish_pertooth_2026_06_23]] (the :3100 supervisor respawn + nested machine.spindle gate).
