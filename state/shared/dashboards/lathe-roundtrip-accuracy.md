# JM Die Lathe — Print→Program ROUNDTRIP Accuracy (Rung B)

_Generated 2026-06-26T20:26:44.744Z · 60 programs generated (0 errors) · 1506 ms · live turningPrintToProgramEngine_

> Parameter-envelope agreement on a JM-representative controlled input grid via the LIVE turningPrintToProgramEngine. NOT a blind print-OCR byte-match: the feature-extraction (read-print) stage is upstream and separately gated. Safety codes PRISM adds (G50 cap, M30, canned cycles) are intentional improvements over the legacy corpus, not divergences.

## Headline

- **Envelope agreement (feed IPR in JM band):** 96.3%  (183/190 ops)
- **Envelope agreement (SFM in JM band):** 100%  (200/200 ops)
- **Safety correctness (all codes present):** 100%  (60/60 programs)
- **Mean generator confidence:** 0.85

## Envelope agreement by operation bucket

| bucket | ops | feed in-band | SFM in-band |
|----|----|----|----|
| drill | 30 | 100% (30/30) | 100% (30/30) |
| finish | 97 | 92.8% (90/97) | 100% (97/97) |
| rough | 63 | 100% (63/63) | 100% (63/63) |
| thread | 10 | —% (0/0) | 100% (10/10) |

## Safety correctness by code (PRISM's intentional improvements over legacy corpus)

- G50 max-RPM cap: **100%** (corpus: 44% had it)
- CSS spindle mode: 100%
- Canned cycles (G70-G76): **100%** (corpus: 32%)
- Thread cycle (G76 when threading): 100%
- Program end (M30/M02): **100%** (corpus: 7.5%)

## Data-optimization punch list (buckets <80% agreement)

_None — every operation bucket reproduces JM master-programmer parameters within the empirical band._

## Live-tooling / C-axis coverage (U-W3)

_Live-tooling ops have NO empirical JM band (the .MIN corpus is single-point turning, not C/Y-axis milling), so they are coverage-verified + live-tool-G-code-checked, NOT band-scored (kept out of the envelope_agreement pool). real_toolpath_archetypes emit M133 live cuts; stub_only_archetypes emit a CAM-recommended placeholder (real toolpath generation is a queued follow-up, not claimed working here)._

- **Archetypes exercised:** 7 (21 programs, 0 errors) over 3 ISO groups
- **Live ops generated:** 24 (15 with real toolpath)
- **Real-toolpath archetypes:** live_whistle_notch, live_od_pocket, live_cross_drill, live_cross_tap
- **Stub-only (queued for real toolpath):** live_keyway, live_flat_mill, live_hex_mill

| archetype | live ops | op types | real toolpath | M05 stop | C index |
|----|----|----|----|----|----|
| live_whistle_notch | 3 | live_whistle_notch | yes | yes | yes |
| live_od_pocket | 3 | live_od_pocket | yes | yes | yes |
| live_cross_drill | 3 | live_cross_drill | yes | yes | yes |
| live_cross_tap | 6 | live_cross_drill, live_cross_tap | yes | yes | yes |
| live_keyway | 3 | live_keyway | STUB | yes | no |
| live_flat_mill | 3 | live_flat_mill | STUB | yes | no |
| live_hex_mill | 3 | live_flat_mill | STUB | yes | no |


_Full data: `state/shared/dashboards/lathe-roundtrip-accuracy.json`. Empirical source: Rung A `lathe-jmdie-param-accuracy.json` (2026-06-26T17:27:54.585Z)._
