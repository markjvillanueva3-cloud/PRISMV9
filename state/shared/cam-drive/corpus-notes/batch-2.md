# JM Die Okuma Lathe Corpus — Profiler Shard 2 Findings

> Profiler shard 2 of 8. Files selected by zero-based line index % 8 == 2 from `_filelist.txt`.
> All values treated as **INCH** (JM Die = inch shop, Okuma OSP, G20). No metric conversion applied.
> Census method: single `grep -ilE` pass per pattern over the NUL-delimited shard file list (`_shard2.nul`).

## Shard 2 — file count

- **2070 .MIN/.min files** in this shard (all verified present on disk; 0 missing).
- Distribution across customers (top dirs): FONTANA 116, ITW 112, OPTIMAS 88, ATF 86, HOLO-KROME (multiple copies) ~160, HPFS 55, AIR 48, OMG 44, VALLEY 43, TCR 42, GRANDEUR 75, SEMS 33, WHITESELL 22, CSM 22, ACME, plus BELVIDERE/NATHANS-USB backup trees.
- **Tools per program**: mean **5.49** distinct T-stations; mode 5–7 (6 tools = 418 programs, 7 = 376, 5 = 374, 8 = 164). Histogram: 1t=29, 2t=122, 3t=206, 4t=259, 5t=374, 6t=418, 7t=376, 8t=164, 9t=86, 10t=27, 11t=3, 13t=1 (over 2065 parseable files).

## Structural census (counts) — files containing ≥1 occurrence

| Signal | Count / 2070 | Note |
|--------|--------------|------|
| **G96 (CSS)** | 1909 | Used for OD/finish turning + cutoff |
| **G97 (direct RPM)** | 1968 | Used for drilling/center-drill/boring/threading; most programs use BOTH G96 and G97 at different stations |
| **G50 (max-rpm cap)** | 2024 | Near-universal — disciplined CSS safety cap (e.g. `G50 S800`) |
| **G94 (feed/min)** | 149 | Rare; only appears in live-tool C/Y-axis milling sub-sections |
| **G95 (feed/rev)** | 204 | Rare as an EXPLICIT code — Okuma OSP default is feed-per-rev (IPR), so F-words are IPR without needing G95 |
| **G85 (rough LAP / bar-turn cycle)** | 1520 | THE primary roughing cycle |
| **G87 (finish LAP cycle)** | 1441 | Re-runs the same named profile defined for G85 |
| **G80 (LAP shape/cycle end)** | 1522 | Pairs with G85/G87 |
| **G81 (LAP turning shape element)** | 1422 | Inside the named shape def |
| **G82 (LAP facing shape element)** | 142 | Face-grooving / facing profiles |
| **G71 (Okuma threading cycle)** | 63 | e.g. `G71 X.. Z.. B60 D.. U.. H.. F1 J8 M33 M73` |
| **G74 (peck drill / grooving cycle)** | 528 | `G74 X0 Z-1.55 D.2 L.2 F.0015` peck deep-hole drilling |
| **G76 (in-shape corner blend / chamfer routine)** | 122 | Used as auto-radius/blend within LAP shapes, e.g. `G76 X.510 L.037` |
| **Fanuc G70/G72/G73/G75/G33** | 0 each | NOT used — Okuma uses its own LAP family, NOT Fanuc cycles |
| **M3 spindle CW** | 2064 | Universal |
| **M5 spindle stop** | 1546 | |
| **M8 coolant on** | 2013 | Near-universal |
| **M9 coolant off** | 1320 | Often only at cutoff; many programs leave coolant on through M2 |
| **Cutoff/parting (comment)** | 855 | Almost always last op, T11 station, G96+G50, low rpm (S100–S220) |
| **Groove (comment)** | 237 | |
| **Thread (comment)** | 55 | |
| **Chamfer-by-angle (A1xx/A2xx)** | 1197 | Strong stylistic signature: `G1 X.. A135` / `A225` instead of explicit chamfer coords |
| **Live-tool C/Y-axis (M110/G138/SB=)** | 147 | Cross-drilling / flats / pockets with driven tooling |
| **Dwell G4** | 312 | Bottom-of-bore / face dwell |
| **Part-catcher (M76/M77/M73)** | 109 | |
| **Bar-feed framing (NBAR / /CALL OBAR / /GOTO)** | ~1146–1253 | ~60% wrap a bar-feed loop subroutine + GOTO restart |

## Per-program structural notes (sampled, read end-to-end)

The canonical Okuma OSP pattern is: each operation is a named block `NATnn (comment)`, retract to safe `G0 X20/X50 Z20`, load tool `Tnnnnnn` (e.g. `T010101`), set spindle mode (G50 cap + G96 CSS, or G97 rpm), then cut, then `M1` optional-stop. The LAP idiom: `G85 N<name> D U W F` defines roughing params, `N<name> G81 ... G80` defines the profile shape ONCE, and a later `G87 N<name>` re-runs the identical profile as the finish pass.

- **ACME/A-11-10591-0-S.MIN** (91 ln): 6 tools — OD rough (G85/NTURN/G81/G80, CSS+G50 S800), center drill (G97), drill .9449 (G97), OD finish (G87 NTURN, CSS), ID rough bore (G85 NBORE), ID finish bore (G87 NBORE). CSS+G50 present. Feeds IPR (F.006–.008 turn, F.002–.003 bore). **Inefficiency:** 3 separate hand-coded facing passes (lines 15–22) at full OD before the LAP cycle = air-heavy redundant facing.
- **AIR/A05652-34-3-A.MIN** (78 ln): 5 tools — OD rough (G85 NR001, G50 S600 + G96 S250), center drill, drill .468, OD finish (G87 NR001), boring bar 3/16. Chamfer via `A135`. Clean. **Inefficiency:** boring bar (NAT09) hand-codes two identical passes instead of a G85/G87 LAP bore.
- **ATF/A2504-4.MIN** (109 ln): bar-feed framed (NBAR/DEF WORK/PS LC/DRAW/CALL OBAR). 7+ stations incl. G74 peck drill, endmill plunge w/ G4 dwell, boring bar w/ arc blends, 1/8 groove tool. **Inefficiency / bug:** NAT06 comment says "DRILL .250" but the T-code is `T050505` (same as NAT05 .843 drill) — **wrong tool-station vs comment**; also no LAP cycle on the back-profile (NAT21 hand-coded).
- **FONTANA/A-0747.MIN** (88 ln): bar-feed loop, 6 tools incl. **threading `G71 X1.01 Z-1.55 B60 D.003 U.001 H.135 F1 J8 M33 M73`** (1-8 UN thread, 60° infeed) and a comb cutoff. CSS+G50 on rough+cutoff.
- **HOLO-KROME/A120716-102.MIN** (100 ln): textbook — OD rough G85 NTURN (G50 S850), OD finish G87 NTURN, center drill, drill .421, ID bore rough G85 NBORE + finish G87 NBORE, cutoff. Uses G42/G41 TNR comp + G40 cancel. G76 blend inside bore. Exemplary.
- **ITW/5605-399-02.MIN** (89 ln): face-grooving via `G85 NTURN ... NTURN G82` (G82 = face shape) rough + `G87 NTURN` finish. G74 peck drill. CSS+G50. Good use of LAP for a face groove.
- **SEMS/BSL-1001713.MIN** (143 ln): OD turn LAP, drill, **live-tooling endmill section** (M110, `M13 SB=2500`, `G138` Y-axis mode, toggles `G1 G94 Y.. F5.` feed-per-MIN then `G95` back to IPR) — this is where the G94/G95 counts come from. Cutoff. Bar loop w/ NSTRT/OCONT/M30.
- **OPTIMAS/FP-111400.MIN** (228 ln): OD rough LAP, center drill, 1/8 peck drill (G74 F.0004), OD finish LAP, then **NAT09 PROFILER = ~140 lines of fully hand-coded point-by-point G1/G3 contour passes** (CAM-posted longhand, not a LAP cycle) + NAT10 finish profiler. Cutoff with part-catcher M76/M77. Biggest longhand-vs-cycle example in the sample.
- **GRANDEUR/G2608B924008A-A.MIN** (104 ln): OD rough G85 NR001 + finish G87, boring bar (hand 2-pass), **NAT08 GROOVE = ~15 hand-coded G0/G1 single plunge moves stepping Z** instead of a G74/G75 grooving cycle. Cutoff. Redundant trailing NAT12/M2 block.
- **HPFS/30-81-S.MIN** (97 ln): face, center drill, drill, G74 peck drill, hand-coded NAT21 profile + NAT08 back-profile, cutoff. No LAP cycle used at all despite a clear turning profile (all longhand). G50+G96 only at cutoff.
- **WHITESELL/W00062075.MIN** (61 ln): OD rough G85 NTURN with **two G76 in-shape blends** (`G76 X.510 L.037` / `G76 Z-.09 A175 L.02`) for a radiused nose + chamfer, G87 finish, cutoff with G3 break-edge. Compact and well-formed.
- **TCR/CC58-80-10235.MIN**: face + single-pass OD turn with G3 corner radius + A-angle chamfer, IPR feeds, CSS+G50.
- **OMG/2208020-SIDE-B.min** (167 ln): NAT01 = long hand-coded multi-pass OD profiler (no LAP), chamfer A315, many G3 blends. Second-side op of a 2-side part.

## Inefficiency signals observed

1. **Hand-coded longhand where a LAP cycle fits.** ~30% of sampled programs (HPFS/30-81, OPTIMAS/FP-111400 NAT09 ~140 lines, OMG/2208020 NAT01, GRANDEUR groove) hand-code roughing/profiling/grooving point-by-point instead of using G85/G87 LAP or G74/G75 grooving cycles. Inflates program length, hides intent, and prevents the control from optimizing the toolpath.
2. **Redundant air-cutting / multiple full-OD facing passes before the cycle.** ACME/A-11-10591 faces the full OD three times (Z.050 → Z.025 → Z.005, each `G1 X-.04`) before LAP roughing — repeated near-air passes on a sawn/bar face.
3. **Tool-station vs comment mismatches (copy-paste programming).** ATF/A2504-4 NAT06 comment "DRILL .250" but loads T05 (the .843 drill) — a latent wrong-tool risk from cloning a prior op block without updating the T-code.
4. **Conservative / inconsistent cutting parameters vs material.** OD roughing feeds cluster at F.005–.009 IPR with DOC `D.07–.10`; boring at F.0015–.003. Cutoff/parting always crawls at S100–S220 / F.001 — safe but slow; many programs never raise rough feed for free-machining/leaded steel.
5. **Boring bars hand-coded as repeated identical single passes** (AIR/A05652, GRANDEUR boring bar) rather than a G85 NBORE / G87 LAP bore — duplicates code and forgoes the cycle's stock-aware stepover.
6. **Coolant left on through program end** (M8 in 2013 files, M9 in only 1320) — ~33% of programs never explicitly turn coolant off before M2/M30.
7. **G97 (fixed rpm) used for OD finishing in some programs** (HOLO-KROME NAT02 `G97 S800`) where CSS (G96) would hold constant surface speed across the diameter for better finish.
8. **Redundant trailing blocks** (GRANDEUR has a dead `NAT12 / M2 / %` after the real end) — leftover template cruft.

## Optimization opportunities

1. **Cycle-ize the longhand.** Detect hand-coded monotonic G1/G3 stepped profiles and grooving combs and re-emit them as Okuma G85/G87 LAP cycles (turn G81 / face G82) and G74/G75 grooving cycles. Largest single program-size + reliability win; PRISM should PREFER LAP cycles when generating Okuma posts.
2. **Eliminate redundant face/air passes.** Reduce multi-pass full-OD facing to one face pass sized to the actual stock-on-face, and start LAP roughing from the true stock boundary (set LAP `U/W` stock from real stock, not a fixed clearance), trimming rapid+air time.
3. **Enforce CSS+G50 discipline on all turning ops** (already ~98% present — make it a hard generation invariant) and switch fixed-rpm OD finish passes to G96 CSS for consistent surface finish; keep G97 only for drilling/tapping/center-drill.
4. **Parameterize feeds/speeds from material + tool** instead of cloned constants — raise rough feed/DOC for free-machining/leaded steels (the dominant JM stock) toward tool-vendor limits; lift cutoff rpm where blade L/t and bar diameter allow.
5. **Add a tool-comment ↔ T-code consistency check** (catch the ATF-style mismatch) and a coolant-off (M9 before M2/M30) lint as generation/audit gates.
6. **Convert repeated boring-bar passes to G85/G87 NBORE LAP** with stock-aware stepover; add lead-in/out + G41/G42 TNR comp where finishing passes currently omit it.
7. **Standardize chamfer/break-edge emission** — the corpus strongly favors `A<angle>` chamfers and `G2/G3 L<radius>` blends; PRISM's Okuma post should emit these idioms (matches shop convention, R11 convention-conformance) rather than discrete coordinate moves.
8. **Template hygiene** — strip dead trailing blocks and unify the NBAR/CALL OBAR/GOTO bar-feed framing into a validated subroutine stub.
