# JM Die Mill — Print→Program ROUNDTRIP Accuracy (Rung B)

_Generated 2026-06-03T20:33:55.981Z · stratified sample · 28 programs regenerated & scored (0 regen failures, 0 parse errors, 7 skipped) · ±35% band · 69721 ms_

> Accuracy = PARAMETER-ENVELOPE AGREEMENT (op-coverage + spindle-RPM + feed within ±band), NOT byte-match. Features are derived from the master program itself (no paired print PDF yet), so a miss reflects PRISM physics/data OR derived-input divergence — the per-category punch list says which. This is the real measured number; it is NOT asserted as 100% unless the data earns it (R12).

## Headline accuracy (REAL measured — NOT asserted 100%)

- **Mean parameter-envelope accuracy: 46.8%**
- Median 44.4% · p25 33.3% · p75 50%
- corpus: scanned 35 · regenerated 28 · regen-fail 0 · parse-err 0 · skipped-no-groundtruth 7 · skipped-too-big 0

## Per-axis agreement (vs JM master mill program)

| axis | in-band % | n compared | notes |
|----|----|----|----|
| op coverage | 100 | 49 | cleanest axis (least tool-coupled) |
| spindle RPM | 16.3 | 49 | coupled to Vc AND tool diameter |
| feed (mm/min) | 3.4 | 29 | coupled to fz, flutes, RPM |

## Systematic bias — geomean(regen / master) per category

_~1.0 = aligned · >1 PRISM faster than the master · <1 PRISM slower. The clearest "which way to tune the data" signal._

| op category | RPM bias (×) | feed bias (×) |
|----|----|----|
| mill_cut | 1.31 (n=28) | 2.11 (n=20) |
| bore | 3.07 (n=5) | — (n=0) |
| drill | 5.96 (n=13) | 5.08 (n=8) |
| tap | 0.38 (n=3) | 0.09 (n=1) |

## Material inference (closes the lathe rung's #1 limitation)

- inferred from filename/comments: **14** · defaulted to 4140/ISO-P: **14**
- histogram: 304 Stainless=2, M2 HSS=4, 6061 Aluminum=2, 4140 Alloy Steel=14, D2 Tool Steel=4, H13 Tool Steel=2

## PRISM planned chip-load surface (fz, mm/tooth — work-order chip-thickness axis)

_Ground-truth fz is not in the G-code (needs tool table); this is what PRISM PLANS per category._

| op category | median fz (mm) | n ops |
|----|----|----|
| mill_cut | 0.08 | 122 |
| drill | 0.1149986 | 32 |
| bore | 0.03 | 5 |
| tap | 0.06 | 3 |

## Data-optimization punch list (most-divergent op categories)

| op category | RPM misses | feed misses | op-coverage misses |
|----|----|----|----|
| mill_cut | 20 | 19 | 0 |
| drill | 13 | 8 | 0 |
| bore | 5 | 0 | 0 |
| tap | 3 | 1 | 0 |

### Known limitations (read before quoting the headline)
- **tool_coupling**: RPM (=Vc·1000/(π·D)) and feed (=fz·flutes·RPM) are COUPLED to tool selection. A miss can reflect PRISM's Vc/fz physics OR a tool-diameter / flute-count divergence from the master (the program states no tool geometry). op_coverage is the cleanest, least-coupled axis.
- **ground_truth_fz**: Ground-truth feed-per-tooth (chip thickness) is NOT extractable from the master G-code (needs the tool table: diameter + flute count, which live in the setup sheet). So fz is reported as PRISM's PLANNED chip-load surface per category, not a vs-master diff.
- **material_default**: Material is inferred from filename + comments via a die-shop keyword dictionary; unmatched parts default to 4140 / ISO-P (conservative middle, NOT the most-aggressive case). Defaulted parts may mis-set Vc and depress the RPM axis. The inferred/defaulted split + material histogram are in this report.
- **feature_inference**: Features (face/pocket/holes/threads/bores) are synthesized from detected op categories + coordinate extents, NOT from a paired engineering drawing. Geometry-exact feature recovery is the next rung (print↔program pairing).
- **okuma_feed_excluded**: Okuma .MIN (OSP) feed words do not follow ISO G94 ipm semantics reliably (observed F1.0-style values scaling to ~1 IPM, implausible for milling), so .MIN programs are EXCLUDED from the feed axis — their RPM + op-coverage are still scored. A dedicated OSP feed parser is the next-rung fix; until then the feed-axis number reflects Haas/Fanuc/Hurco (confirmed G94 ipm) programs only.

_Full data: `state/shared/dashboards/mill-roundtrip-accuracy.json`. Sister lathe rung: `lathe-roundtrip-accuracy.json`._
