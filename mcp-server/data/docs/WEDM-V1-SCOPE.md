# Wire EDM V1 — Capability Statement

**Version:** 1.0
**Date:** 2026-04-08
**Status:** Launch Gate Passed (172/172 tests, 5/5 smoke cases)

## What V1 Does

Generates a complete, machine-ready Wire EDM NC program from a part description (material, thickness, target surface finish) and geometry (DXF file or pre-parsed contours).

**Output:**
- NC program text (.NC file content, Mitsubishi G-code dialect)
- Printable HTML setup sheet with per-pass parameter table
- Wire break restart procedure keyed to N-block markers
- Per-category confidence score (pulse, feed, offset, E-pack, geometry)
- Cycle time breakdown (cutting, threading, dwell, rapid, auxiliary)
- Slug management data for internal contours
- Flushing strategy recommendation

## Supported Envelope

| Parameter | V1 Range | Notes |
|-----------|----------|-------|
| Materials | D2, A2, O1, H13, S7, 1018, 4140, 304SS, 316SS, 6061, 7075, C110 copper, brass, WC carbide, Ti-6Al-4V, Inconel 718, PCD | 7 material groups, 17+ alloy aliases |
| Thickness | 1 mm - 300 mm | Piecewise model: nearly flat below 50mm, flushing-limited above |
| Surface finish | Ra 0.005 - 3.2 um | E-pack conditions 1-9, mirror to rough-only |
| Taper | 0 - 5 degrees | Empirical skim cascade from NOZE TEST data |
| Wire | Brass 0.20/0.25/0.30, coated 0.20/0.25, moly 0.10/0.15 | Auto-selected from material/thickness |
| Controller | Mitsubishi (calibrated), Fanuc/Sodick/Makino/AgieCharmilles (structural) | Non-Mitsubishi generates valid G-code with operator verification warning |
| Geometry | Simple closed profiles (squares, rounds, pockets) | DXF parser wired but not field-tested on complex shop files |

## What V1 Does NOT Do

These are honest limitations, not marketing hedges:

1. **Taper > 5 degrees** — UV axis interpolation algorithms are not validated. Attempting this returns a structured error with V2 timeline.
2. **Non-Mitsubishi calibration** — Sodick C### codes, Makino HYPER-i, AgieCharmilles ISPG, and Fanuc tech registers are not mapped from real programs. G-code structure is correct but technology parameters may need manual adjustment.
3. **Re-entrant geometry** — Thread forms, complex pockets with tight internal radii. Feed rates are estimated conservatively but not measured against real cut data. Warning is issued.
4. **Real DXF round-trip** — DXF parser exists but has not been validated against real shop DXF files from Box Drive. Contour-based input (pre-parsed geometry) is the proven path.
5. **Alloy-specific recast model** — Recast depth prediction is thickness-based, not alloy-specific. Phase transition temperatures (D2 martensite, Inconel gamma prime dissolution) are not modeled.
6. **Multi-pass optimization** — Pass count is formula-driven (Ra and tolerance targets), not empirically tuned per material/machine combination.
7. **Machine thermal duty cycle** — No check against machine capacity. Long jobs on thin materials may exceed thermal limits.

## Calibration Data Sources

| Source | Role | Status |
|--------|------|--------|
| ITW SHAKEPROOF 500-30540-24000-04.NC | D2 straight die, 4-pass. Anchor for E-pack codes, H-offsets, skim cascade (decreasing). | Calibrated, tested |
| NOZE TEST.NC | SS taper, 5-pass. Anchor for taper cascade (increasing). | Calibrated, tested |
| CHOCTAW DEFENSE E1281 | Condition code 8 reference (ultra precision, cannelure thread form). | Mapped, not field-verified |
| Lemhunter | Cutting speed vs thickness tables. | Within 10-15% match |
| Klocke | Ra prediction model. | Within 20% match |
| DiBitonto | Spark gap / H-offset model. | Within 2.4% match |

## V2 Planned (Q2 2026)

- Sodick, Makino, AgieCharmilles, Fanuc fully calibrated from real programs
- Taper > 5 degrees with UV interpolation
- Alloy-specific recast depth (Carslaw-Jaeger thermal model)
- Cycle time Monte Carlo (95% CI)
- SVG backplot rendering
- AS9102 FAI export
- Machine thermal duty cycle validation
