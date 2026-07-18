# JM Die Okuma Lathe Corpus — Profiler Shard 6

Source: shard of `_filelist.txt` where (zero-based line index % 8 == 6). All values treated as **INCH** (JM Die is a G20 inch shop on Okuma OSP). No unit conversion applied.

## Shard 6 — file count

- **2069 `.MIN` programs** (all verified present on disk; 0 missing).
- 105 distinct customer folders under `H:/prism/JM DIE/CNC LATHE/` represented in this shard (ACME, AGRATI, AIR, ALCOA, ALLFAST, AMGLO, ANDERSON, ARCHER, BIRMINGHAM FASTENER, CAMCAR, CSM, EJOT, ELGIN FASTENER, FALL RIVER, FASTENAL, FONTANA, GESIPA, … WRENTHAM, WSR).

## Structural census (counts)

Counts are **files containing** the pattern (a program may use several), grepped over all 2069 shard files.

### Spindle-speed control
| Code | Meaning | Files | % of shard |
|------|---------|-------|------------|
| G96 | Constant surface speed (CSS) | 1902 | 92% |
| G97 | Direct RPM | 1962 | 95% |
| G50 | Max-RPM cap (mandatory under CSS) | 2022 | 98% |

Most programs use **both** G97 (direct RPM for drilling/boring/center-drill) and G96 (CSS for turning/facing/cutoff), switching per operation. G50 cap is present in 98% of files — strong, near-universal safety discipline. **Only 36 files use G96 CSS with NO G50 cap** (1.9% — the genuine safety gap).

### Feed mode
| Code | Meaning | Files |
|------|---------|-------|
| G95 | Feed per rev (IPR) | 210 |
| G94 | Feed per minute (IPM) | 153 |
| Neither word present | Relies on Okuma OSP machine-default feed mode | 1857 |

The dominant pattern is **feed-per-rev (IPR)**: explicit F values throughout the corpus are tiny (.001–.012 in/rev) consistent with IPR, and most programs omit the G94/G95 word entirely, relying on the OSP machine default (feed-per-rev). The G95 word is stated explicitly mainly when a program mixes a feed-per-rev cutoff in with otherwise default operations (e.g. ACME 750-FEEDROLL, AMGLO cutoff). **Relevant to U-CAM-FEEDREV-MODE-DEFAULT: this corpus confirms Okuma OSP default = feed-per-rev (IPR).**

### Canned / area cycles (corrected Okuma OSP interpretation)
Fanuc-style G70/G72/G73/G75 are **absent** (0 files each) — Okuma OSP does not use them. The real Okuma vocabulary:

| Code | Okuma OSP meaning | Files | % |
|------|-------------------|-------|---|
| G85 | LAP area-cycle **define** (rough): `G85 <name> D<doc> U<x-stk> W<z-stk> F<feed>` | 1508 | 73% |
| G81 | turn-profile start marker inside LAP (`<name> G81`) | 1404 | 68% |
| G82 | face/groove-profile start marker inside LAP (`<name> G82`) | 164 | 8% |
| G80 | profile/LAP end | 1509 | 73% |
| G87 | LAP **replay** for finish pass (`G87 <name>`) | 1424 | 69% |
| G71 | **Threading cycle** (`G71 X.. Z.. B<angle> D<doc> H<height> F<lead> M33`) | 62 | 3% |
| G74 | Peck-drill / chip-break cycle (`G74 X Z D<peck> L<retract> F`) | 482 | 23% |
| G76 | Corner chamfer/round move inside a profile (`G76 X.. L..` / `G76 X.. A150 L..`) — NOT thread | 113 | 5% |

Note: **G71 = threading here**, not roughing — this reconciles the census (62 files, matches part-numbers with thread callouts like FONTANA A-0244 `THREAD M16X2`). The Okuma rough+finish pair is **G85…G81/G82…G80** (define) then **G87** (replay), present in ~73% of programs.

### Tooling / coolant / stops / loop
| Feature | Files | Notes |
|---------|-------|-------|
| T-codes (T0n0n0n triple) | 2065 | offset-triple form `T010101` = turret pos 01 + offset 01 |
| M8 coolant on | 2015 | 97% — near-universal, flood on first cut |
| M9 coolant off | 1299 | off at end / before final tool |
| M1/M01 optional stop | 2051 | optional stop between essentially every tool |
| M41 low gear / M42 high gear | 335 / 591 | gear range selected on heavier roughing/drilling |
| Tool-nose radius comp G41/G42 (+G40) | 448 | applied around finish profiles + grooves |
| A-word angle/chamfer move | 1337 | longhand chamfer via `G1 X.. A<angle>` |
| G4 dwell | 338 | bottom-of-hole / endmill dwell |
| `/CALL OBAR` bar-pull subprogram | 1241 | bar-fed production wrapper |
| `/GOTO NBAR` loop-back | 1113 | re-run for next bar piece |
| VWKCC piece-counter loop | 2 | rare explicit work-count loop (ALLFAST) |

**Typical tool count per program: 4–7 tools.** Canonical turret roster observed: T01/T02 = OD rough/finish, T03/T04 = center drill, T05/T06 = drill/spade-drill/endmill, T07/T08/T09 = boring bar (rough/finish), T11 = cutoff/parting. Threading on a dedicated tool (T06 in A-0244). **Parting/cutoff present in the large majority** (T11 "CUTOFF .125" block ending in `G1 X-.04` past center) — JM Die runs bar-fed parts cut off at the end.

## Per-program structural notes (sampled)

~17 programs deep-read end-to-end. Representative sequences:

1. **ACME/750-FEEDROLL-1065** — pure longhand contour (no LAP). `G50 S500` cap, G97→G96, **G95 feed/rev** explicit, F.002–.0025 IPR. Form-roll profile cut as many discrete G1/G2/G3 passes with `L` arc radius. No parting (held part).
2. **ACME/A-11-10591-0-A-CADET** — full op set: OD rough (G85 NTURN G81, D.1 U.01 W.005 F.009) → center drill → drill (insert .968) → OD finish (G87 NTURN) → ID rough bore (G85 NBORE G81) → ID finish (G87 NBORE). CSS+G50 S800 cap. M1 between tools. No parting (chucked).
3. **AGRATI/9075049 REV A** — bar-fed loop wrapper (NBAR/CALL OBAR/GOTO NBAR). OD rough longhand → center drill → drill .525 → 3/8 boring bar → cutoff T11 (G96 S100 / G50 S800). Has a typo `X..520` (double-dot) — survives on OSP but a lint flag.
4. **ALCOA/FP14-31HXS-03** — OD+face rough (G85 NTURN, G76 chamfer X.311 L.027, A175 angle) → OD+face finish (longhand, not G87 — re-cut by hand) → cutoff with back-chamfer (A225). G50 S600. F.005–.009 IPR.
5. **ALLFAST/10-010-086-03-01** — VWKCC piece-counter loop. Heavy **longhand multi-pass OD profiling** (8+ stepover passes hand-coded with I/K arcs) instead of a LAP cycle → verbose. Center drill → letter-N spade drill → finish → boring bar rough(G85 NBORE)/finish(G87 NBORE).
6. **AMGLO/AMG-004** — OD rough longhand → center drill → drill 1.343 → endmill 1.125 (G4 F3 dwell) → **carbide boring bar hand-stepped in many Z passes** (very verbose, ~25 lines of incremental bore) → **multi-peck cutoff** (T11 stepping Z in .09 increments, 11 passes) then final parting T21. Gear M41/M42 toggled.
7. **CSM/72095…6-LOBE** — OD rough (G85 NTURN) + finish (G87) → center drill → **G74 peck-drill** (D.3 L.3) → 6-lobe profiler longhand (very long arc-by-arc lobe form, ~100 lines) + finish profiler → ID bore rough/finish (G85/G87 NBORE) → cutoff.
8. **EJOT/T110240190** — OD rough (G85 NTURN, G3 lead-in radius) → center drill → **G74 peck-drill** → **rough face-groove (G85 NR02 G82, G41 comp)** + finish face-groove (G87 NR02) → cutoff. Clean face-grooving LAP usage.
9. **BIRMINGHAM FASTENER/B470-505E** — OD rough+finish (G85/G87 NTURN, two-step shoulder with A165/A135 chamfers) → **plunge groove .187** (longhand back-and-forth) → center drill → drill .640 → boring bar → cutoff.
10. **ARCHER/A08-D75** — OD rough (G85 NR001 G81) → center drill → drill .718 (M41/M42 gear) → OD finish (G87 NR001) → ID finish bore single-pass. Chucked, no parting.
11. **FALL RIVER/HW-140** — short part: OD rough (longhand, G3 lead-in radius) → center drill → **G74 peck-drill .125** → cutoff. G50 S1200 cap. Clean minimal program.
12. **FASTENAL/A20074** — long shaft (~7.3 in). Multi-pass **longhand OD profiling** (3 rough passes hand-stepped) → finish → center drill → drill .730 → endmill .720 (G4 F4 dwell) → second longhand profile pass → boring bar → cutoff. Very verbose; LAP would compress.
13. **GESIPA/G151-4079-02-A** — OD rough (G85 NTURN, G3 radius lead-in) → finish (G87) → center drill → ball-endmill (G4 F3 dwell). Chucked, no parting.
14. **CHOCTAW/C10T10083-STOP** — OD rough (G85 NTURN, G42 comp, A150 chamfer) → finish (G87) → **face-groove rough/finish (G85 NR001 G82, G3 radius)** → finish (G87 NR001). Stop/locator part.
15. **CAMCAR/1525-27** — OD rough (G85 NTURN, G3 .072 radius lead-in) → finish (G87) → center drill → drill → endmill (G4 dwell) → **ID bore with concave radius form (G85 NBORE, big L.520 arc)** rough/finish → cutoff.
16. **ELGIN FASTENER/CASE3373…** — large dia (3.6 in) OD rough (3 facing wipes then G85 NR001, two-shoulder A135 chamfers) → finish (G87) → ID rough bore (G85 NBORE) → ID finish (G87). M42 high gear, G96 S250. Chucked.
17. **FONTANA/A-0244** — OD rough (G85 NR01) → finish (G87) → **threading G71 X.403 Z-.68 B60 D.003 U.001 H.092 F1 J13 M33 M73** (M16x2 thread, B=60° flank, H=thread height, F1=lead, M33 thread-mode). The canonical Okuma threading example.

## Inefficiency signals observed

1. **Longhand profiling where a LAP cycle fits (552 of 2069 = 27% have NO G85/G87 at all).** Programs like ALLFAST, FASTENAL, AMGLO, CSM 6-lobe, and ACME hand-code dozens of stepover G1/G2/G3 passes (sometimes 25–100 lines) to remove stock that a single `G85 … G81 … G80` define + `G87` finish would express compactly. This bloats program length, is error-prone (see the `X..520` double-dot typo in AGRATI), and locks in a fixed pass count rather than a feed/DOC the control optimizes.
2. **Hand-stepped boring with many discrete Z passes** (AMGLO carbide boring bar: ~25 lines of incremental `G1 Z-.99x / G1 X1.34` instead of a `G85 NBORE` rough cycle). Same stock removal, far more lines, no consistent DOC.
3. **Multi-peck cutoff hand-coded** (AMGLO T11: 11 separate Z-stepped plunge-and-retract moves for a single parting groove) where a single grooving/peck-cutoff cycle would do — and the air-return to X2.56 between every peck adds rapid travel.
4. **Finish pass re-coded by hand instead of `G87` replay** (ALCOA FP14: rough done with G85 NTURN but finish is a separate hand-coded contour rather than `G87 NTURN`). Doubles the profile maintenance burden and risks rough/finish geometry drift.
5. **Conservative / inconsistent feeds & speeds across near-identical parts.** OD rough F ranges .003–.012 IPR and CSS S150–S680 with no obvious material-keyed rule; many cutoffs sit at F.0015 and S100–S150 (very conservative — long cycle time at the most time-consuming op). Center-drill/drill feeds .001–.003 IPR are on the cautious side.
6. **Redundant facing wipes before the LAP cycle** (ELGIN, ARCHER A08-D75, ACME longhand): 2–3 full `G1 X-.04` facing passes at successive Z before the area cycle — partly legitimate face-cleanup, partly air/redundant where the LAP would face anyway.
7. **Rapid retract to a far home (`G0 X20 Z20` or `X50 Z20`) between every tool**, even when the next tool starts near the part. Safe but adds non-cut travel; a tighter clearance plane per family would cut air time.
8. **G96 CSS without a G50 cap in 36 files** — a real safety gap: under CSS a small diameter (e.g. facing/parting to center) commands runaway RPM with no ceiling.
9. **Single-pass boring/turning where the DOC implies it should be multi-pass** (ANDERSON A035371 boring bar single G1 Z-3.09 at F.002 over 3 in; ARCHER ID finish single pass) — fine for finish but occasionally used for stock removal where a roughing cycle would be safer on tool load.

## Optimization opportunities

1. **Auto-convert longhand profile blocks to Okuma G85/G81(G82)/G80 + G87** — the single biggest win. ~27% of the shard (552 programs) hand-codes profiling/boring that a LAP define+replay expresses in a fraction of the lines, with control-managed DOC and a guaranteed rough/finish geometry match. PRISM should detect contiguous monotone G1/G2/G3 stepover passes and emit the equivalent LAP cycle (rough D/U/W/F + `G87` finish).
2. **Replace hand-stepped peck-cutoff / peck-bore with a real peck cycle** and eliminate the full-clearance air return between pecks (retract to a small clearance plane, not X2.56). Cuts both program size and non-cut travel for the slowest operation (parting).
3. **Material-keyed speed/feed library** — derive a feed/CSS rule from the corpus per material+operation (OD rough vs finish vs cutoff vs drill) and flag programs that run materially below the proven envelope (especially the S100–S150 cutoffs and .002–.003 drill feeds). Many programs are demonstrably conservative; a physics-backed (Kienzle/Taylor) bump would shrink cycle time with the corpus as the safe lower bound.
4. **Enforce the G50 cap under G96** — auto-insert/lint the 36 CSS-without-cap programs; under CSS to center this is a spindle-overspeed safety item. Pairs with PRISM `prism_safety` gating.
5. **Always finish via `G87` replay, never re-code the profile** — lint for "rough used G85 but finish is hand-coded" (ALCOA pattern) and rewrite finish as `G87 <name>` to guarantee rough/finish concentricity and halve maintenance.
6. **Clearance-plane tightening** — learn a per-tool-family safe approach instead of the blanket `X20/X50 Z20` home between every tool; reduces air time across the 4–7 tool changes every program makes.
7. **Standardize the bar-fed wrapper** — `/CALL OBAR … /GOTO NBAR` appears in ~60% (1241/1113); codify it as a template so generated programs inherit correct bar-pull + loop-back + final M5/M2, and add the VWKCC piece-counter for run-quantity control (only 2 programs use it today).
8. **Lint coordinate/syntax typos** (e.g. `X..520`) — harmless on OSP but a real risk on regenerated/ported posts; cheap static check.
