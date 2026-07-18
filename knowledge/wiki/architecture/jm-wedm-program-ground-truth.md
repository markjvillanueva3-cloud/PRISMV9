---
title: JM Die WEDM Program Ground Truth — empirical Mitsubishi W31MV-2 .NC extractor
type: architecture
status: shipped
unit: U-MIKE-WEDM-GROUND-TRUTH-EXTRACT
milestone: MIKE-WEDM-CAPABILITY-MS0
slot: mike
date: 2026-05-24
---

# JM Die WEDM Program Ground Truth

Empirical ground-truth extractor for the **3 real Mitsubishi W31MV-2 wire-EDM `.NC` programs** at `H:/PRISM/JM DIE/WIRE EDM/`. Calibration corpus for the 103 existing WEDM engines (per `WEDM_DIGEST.md`).

Source: `scripts/extract-wedm-program-ground-truth.mjs` · Tests: 20/20 PASS · Live output: `state/shared/JM-WEDM-PROGRAM-GROUND-TRUTH-2026-05-24.json`.

## Pivot context

Mike pivoted from lathe (handed to whiskey) to wire EDM on 2026-05-24 per operator directive. The lathe hexalogy is already shipped on `slot/mike` (6 units, 121/121 tests). WEDM substrate (103 engines, 8 playbooks) is already built by charlie + prior chats — mike's lane is the **empirical corpus gap**, not engine duplication.

## The 3 real programs

| Program | Date | Passes | E-codes | Offset comp | Taper |
|---------|------|-------:|---------|-------------|:-----:|
| **ITW SHAKEPROOF 500-30540-24000-04.NC** | 03/07/22 | 4 | E1221..E1224 | G41+G42+G40 | ✗ |
| **NOZE TEST.NC** | 05/24/22 | 5 | E2821..E2824 | none | **✓ 61 UV moves** |
| Wire Program - 5 inch square.NC | — | 0 | none | none | ✗ (demo) |

## Mitsubishi W31MV-2 dialect captured

| Element | What | Example |
|---------|------|---------|
| Program label | `L###` form | `L001` |
| Wire-offset registers | `H1..H175` set, one per pass | `H1 = 0. + H175` |
| Energy code | `E####` 4-digit spark-table row | `E2821 H1 F.16 (PASS=1)` |
| Pass label | `(PASS=N)` comment | `(PASS=3)` |
| Wire-thread | `M20` | `M20 (Thread Wire)` |
| Tank fill | `M78` | `M78 M78 (Fill Tank)` |
| Water on/off | `M80/M81` | `M80 (Water On)` |
| Wire on/off | `M82/M83` | `M82 (Wire On)` |
| Power on/off | `M84/M85` | `M84 (Power On)` |
| Adaptive control | `M90/M91` | `M91 (Adaptive Control Off)` |
| Cut wire | `M22` | `M22 (Cut Wire)` |
| Wire offset | `G40/G41/G42` | `G42 G1 X-.11614 Y.07735` |
| Taper | `UV` coords on G1 line | `G1 X-.11614 Y.0754 U-.04786 V0.` |
| Work zero | `G92 X0 Y0` | |
| Dwell | `G4 X<sec>` | `G4 X5. (Dwell)` |

## API

```js
import {
  parseProgramLabel, parseDateComment, parseHRegisters, parseECodes,
  countPasses, detectWireEDMMcodes, detectOffsetCompensation,
  detectTaperCutting, parseWorkZeroSets, parseMotionStats, parseDwells,
  extractWEDMGroundTruth, buildWEDMGroundTruth
} from "./extract-wedm-program-ground-truth.mjs";

const noze = extractWEDMGroundTruth({
  program: "NOZE TEST",
  path: "H:/PRISM/JM DIE/WIRE EDM/NOZE TEST.NC",
});
// → { label: "L001", date_comment: "05/24/22",
//     h_registers: { H1, H2, H3, H4, H5, H175 },
//     e_codes: [{code:"E2821", h_register:"H1", feed_in_min:0.16, pass_label:"PASS=1"}, ...],
//     pass_count: 5, distinct_e_codes: ["E2821","E2822","E2823","E2824"],
//     wire_edm_mcodes: { M20_thread_wire: true, ... },
//     offset_compensation_used: [], taper_cutting: { has_taper_cutting: true, taper_move_count: 61 },
//     motion_stats: { rapid_g0:0, linear_g1:73, arc_cw_g2:0, arc_ccw_g3:0 }, ... }

const report = buildWEDMGroundTruth(); // all 3 programs
```

## Findings for charlie's existing engines

1. **Two distinct E-code families** in production use:
   - E1221-E1224 (ITW SHAKEPROOF) — arc-heavy program, no taper
   - E2821-E2824 (NOZE TEST) — pure-linear taper program
   These are Mitsubishi spark-table rows — `WEDMCalibrationReportEngine` can compare measured kerf / surface Ra against the published spec for each row, surfacing per-customer drift.
2. **Pass discipline holds:** 4-5 passes in production (rough → trim → finish → skim → super-skim). `WEDMMultiPassStrategyEngine` baseline confirmed.
3. **Taper is part-driven**, not machine — when NOZE re-runs, `WEDMHeadClearanceEngine` + `WEDMFixtureInterferenceEngine` should be checked against the 61 UV moves.
4. **Offset compensation style varies** — ITW uses explicit G41/G42/G40; NOZE uses pre-compensated paths. `WEDMPostProcessGCodeEngine` must preserve original style.
5. **Single-machine fleet** — WEDM-01 Mitsubishi FA10S OSP-W31MV-2 is the only wire EDM at JM Die. The 7-machine re-post pattern from lathe does NOT apply.

## R12 fail-loud

`extractWEDMGroundTruth(meta)` returns `{_error: "file_not_found"}` envelope on missing path — never invents data. Locked by test.

## Cross-refs

- Pivot memo: [[reference_mike_lathe_to_wedm_pivot_2026_05_24]]
- Lathe hexalogy (handed to whiskey): [[jm-die-lathe-capability-engine]] · [[jm-die-lathe-deep-capability-engine]] · [[okuma-osp-profile-engine]] · [[jm-lathe-program-ground-truth]]
- Existing WEDM substrate (charlie's domain): `WEDM_DIGEST.md` (103 engines) · `wedm-constants.ts` (physics)
- PRISM App consumer: `WEDMCalculatorAIEngine — AI-Powered Wire EDM Calculator for PRISM App`
