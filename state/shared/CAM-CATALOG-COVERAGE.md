# CAM Catalog Completeness Coverage (slot:kilo — U-CAM-CAT-AUDIT)

_Generated 2026-05-29T20:03:44.842Z · regen `node scripts/cam-catalog-completeness-audit.mjs`._
> ADVISORY + mustHumanVerify. `claimedCoverage` = observed params ÷ the count the catalog authors recorded. `universeCoverage` (if present) = observed ops ÷ the operator-curated `cam-catalog-target-universe.json`. Thin operations (0 params) are the concrete gap-fill punch list. NEVER hallucinate a parameter — an unextractable one stays a gap.

| System | Ops | Params (observed) | Claimed | Claimed cov% | Universe cov% | Thin ops |
|---|---|---|---|---|---|---|
| fusion360 | 27 | 497 | 847 | 59% | n/a | 0 |
| hypermill | 52 | 724 | 476 | 152% | n/a | 0 |
| mastercam | 56 | 510 | 923 | 55% | n/a | 0 |

## fusion360
- Lowest-param operations: turning_profile_finishing(9), turning_face(9), part_alignment(9), spiral(10), ramp(10), turning_groove(10), scallop(11), horizontal(11)

## hypermill
- Lowest-param operations: verification_report(2), live_tool_radial(3), controller_dialect(4), machine_setup(4), coating(4), live_tool_face(4), b_axis_milling(4), macro_library(5)

## mastercam
- Lowest-param operations: Blade Platform(2), Blade Top Cutting(2), Blade Tangent(2), Impeller Hub Finishing(3), Impeller Blade Finishing(3), Impeller Fillet(3), Impeller Edge(3), Blade Swarf(3)

_Gap-fill is grounded: extract missing params from vendor PDFs / OPEN MIND E-Learning / Mastercam X8 docs / the running seats — never invent. Query the catalog via `prism_cam:cam_catalog_operation_params`._
