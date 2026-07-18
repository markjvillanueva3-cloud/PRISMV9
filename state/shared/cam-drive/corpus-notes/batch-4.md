# Shard 4 — JM Die Okuma OSP Lathe (.MIN) Profiling

PROFILER SHARD 4 of 8. Shard selection: lines of `_filelist.txt` where (zero-based index % 8 == 4).
All values treated as **INCH** (JM Die is an inch shop, Okuma OSP, G20). No metric conversion applied.

## Shard 4 — file count

- **2070** files in shard (all verified present on disk; 0 missing).
- Directory spread (top): FONTANA 117, ITW 113, OPTIMAS 88, ATF 87, HOLO-KROME (OMG/NATHANS/HOLO-KROME dirs) ~160 combined, HPFS 55, AIR 49, BELVIDERE/ATF 45, OMG 43, VALLEY 42, TCR 42, GRANDEUR(+update) 75, SEMS 33, HEADER 25, WHITESELL 23, AKKO 23, CSM 21, JM DIE 20, ELITE 18, STALCOP 17, ACME, CLENDENIN, HEADALLOY, IMAGE, PARKER, etc.
- These are short single-setup turned parts (electrodes, casings, tool-holders, back-plugs, cutters) — typical 30–120 lines, 3–7 tools each.

## Structural census (counts)

File-level presence counts (number of programs in which the code/word appears), out of 2070:

| Dimension | Count / 2070 | Note |
|---|---|---|
| **G96 (CSS)** | 1917 | dominant on the roughing/finishing & cutoff tools |
| **G97 (direct RPM)** | 1969 | used for drilling, center-drilling, small-dia & boring ops |
| **G50 (max-RPM cap)** | **2032 (≈98%)** | nearly universal — strong CSS-safety discipline |
| G94 (feed/min) | 129 | rare |
| **G95 (feed/rev IPR)** | 176 explicit | but **mode is implicitly IPR** — F-values are .002–.012 (per-rev), G95 not always stated |
| G70 (Fanuc finish) | **0** | Okuma does NOT use Fanuc G70 |
| G71 (Fanuc rough) | 58 | minority — mostly imported/CAM-posted or non-OSP files |
| G72 / G73 / G75 | 0 / 0 / 0 | absent |
| **G74 (peck drill / groove)** | **511** | the canonical deep-hole peck-drill cycle |
| G76 (thread) | 124 | the only threading cycle present |
| **G85 (Okuma LAP rough — start)** | **1521 (≈73%)** | THE roughing workhorse |
| **G87 (Okuma LAP finish — repeat)** | **1441 (≈70%)** | the matching finish-repeat of the G85 shape |
| **G81 (LAP turn/bore mode word)** | 1426 | shape-mode flag inside NTURN/NBORE blocks |
| G82 (LAP face mode word) | 164 | face-groove / facing shapes |
| G83 / G84 | 0 / 0 | absent |
| **M8 (coolant on)** | 1987 (≈96%) | nearly always on |
| M9 (coolant off) | 1334 | usually only on the cutoff tool / end |
| BAR (NBAR bar-feed block) | 902 | bar-fed parts (`/CALL OBAR`, `/GOTO NBAR`, M2) |
| CALL / OBAR | 1298 / 1297 | bar-feeder subroutine call |
| M2 / M30 | 1890 / 131 | program end |

**Threading:** G76 in 124 programs (~6%). No G33/G34 single-point.
**Parting/cutoff:** "CUTOFF" comment in 574; NAT11 is the standard cutoff tool slot (`G96 Sxxx` + `G50` re-cap + `G1 X-.04` part-off).
**Shape definitions:** NTURN (892), NBORE (491), plus per-part labels (NR001/NR01/NR02/NFACE). Okuma LAP pattern = `G85 <shapename> D.. U.. W.. F..` (rough call) → `<shapename> G81/G82` (shape body, bounded by next `G80`) → later `G87 <shapename>` (finish-pass repeat of same shape).

**Tools per program (from sampled reads):** typically **3–7 distinct tools**. Common slotting convention: T01/T02 = OD rough/finish, T03 = center-drill, T05 = drill, T07/T08 = ID rough/finish bore, T09/T10 = groove rough/finish, T11 = cutoff, T12 = alt OD rough.

## Per-program structural notes (sampled — 16 read end-to-end)

1. **ACME/11-10715-0-A.MIN** — Seq: OD rough (T12, G96 S250 + **G50 S600 cap**, G85 NTURN, F.008–.01 IPR) → center-drill (T03 G97) → drill .828 (T05 G97, single G1 plunge Z-3. F.0025) → OD finish (T01 G97 S800, G87 NTURN) → ID rough bore (T07 G85 NBORE) → ID finish (T09 G87). No part-off (chucked). 6 tools.
2. **AIR/A57-WH-01-04.MIN** — Bar-fed (NBAR/OBAR). Face+OD rough (T01 G97 S600, then G85 NTURN with G3 lead-in chamfer) → finish (T02 G87) → center-drill → **G74 peck-drill .156 (X0 Z-.275 D.15 L.15 F.0015)** → cutoff (T11 **G96 S100 + G50 S800**, M9). Clean, complete part. 5 tools.
3. **ATF/T2790-007-3P1.MIN** — Bar-fed. OD profile w/ G3 chamfer (longhand, no LAP) → center-drill → **G74 peck-drill .250** → **rough face-groove (T09 G85 NR02 / NR02 G82, G41 cutter-comp)** → finish groove (T10 G87) → cutoff w/ chamfer detail. Good groove rough/finish split. 6 tools.
4. **CLENDENIN/A25B1247C508D183R268.MIN** — OD rough G85 NTURN (D.08 U.01 **W0** = no Z-stock for finish) → finish → center/freza drills → **complex hand-coded multi-pass form contour (T09/T10, repeated G3 arc passes stepping Z by .025)** → cutoff. The form is coded longhand as ~12 repeated G3 passes — candidate for a LAP profile cycle. 6 tools.
5. **FONTANA/B-17151-ITEM-1-LB.MIN** — `G140` header. OD rough longhand w/ G3 chamfer (NO LAP) → center-drill → drill .531 (single plunge Z-3. F.002) → ID rough G85 NBORE w/ profile → ID finish G87 → cutoff. 6 tools.
6. **HEADALLOY/CP-582-4R-1-A.min** — Large-dia (X10.35!) heavy part. OD facing rough **G96 S290 + G50 S300 cap, M41 (low gear)**, 3 stepover facing passes hand-coded (G1 X-.04 repeated at Z.1/.075/.05) → **M0 + Polish operator note "(SPRAWDZ CZY ZACZYSCILO FRONT)"** → 2nd OD rough at Z-6.5. Heavy roughing entirely longhand step-passes — no LAP, no high-feed strategy. 1–2 tools.
7. **IMAGE/TH75NAT-CUTTER-510-B.MIN** — `G140`. OD rough **G96 S250 + G50 S600**, 3 face skim passes then G85 NR001 (G42 comp, A92 taper) → OD finish G87 → ID bore single G1 plunge. Ends `NAT01 T010101 M2` (tool-return stub). 3 tools.
8. **JM DIE/CASING-OD2998-ID867-A.MIN** — OD rough G96 S550 + G50 S600, M42 (gear) → 3 skim passes + G85 NR001 → center/drill .847 (G97 + M41/M42 gear shifts) → OD finish G87 → ID rough G85 NBORE → ID finish G87. Well-structured casing. 6 tools.
9. **NATHANS/FONTANA/THP481137 SIDE A.min** — OD rough G85 NTURN + OD finish G87 (clean) **THEN NAT9/NAT10 = CAM-posted longhand multi-pass contour (G96 S1500 + G50 S1500, dozens of G1/G2/G3 hand-points)** → cutoff G96 S400 + G50 S1000. Mixes LAP discipline with raw CAM-post longhand in one program. 5 tools.
10. **NATHANS/ITW/5628-M81258-02 B.MIN (electrode)** — **Fully CAM-posted**: OD rough = ~14 stepped G0/G1/G3 profile passes (G97 S1000, **NO LAP cycle**) → 2nd rough finer (G97 S1250). G97 direct-RPM throughout (no CSS on this profiler). Electrode -.003 OD. 2 tools.
11. **OMG/HOLO-KROME/A210259HK SIDE B.MIN** — **G85 NFACE / NFACE G82** facing cycle (proper) → OD turn G1 → center/drill → **NAT10 "PROFILER .015R" = ~25-pass CAM longhand contour, G97 S150 M4 (reverse spindle), negative-X (back-side)**. Big hand-point block. 4 tools.
12. **OMG/ITW/5628-31128-01.min (electrode)** — Fully CAM-posted OD rough (~18 G0/G1/G3 stepped passes, G97 S850) → finish (G97 S1100). No LAP, no CSS. 2 tools.
13. **PARKER/BACKPLUG-1998-3265.MIN** — Bar-fed. OD rough G85 NTURN (G3 chamfers both ends, F.007 IPR) → finish G87 → cutoff (G96 S100 + G50 S800, w/ chamfer-on-part-off G3). Textbook clean. 3 tools.
14. **TCR/T4520-06-10135.MIN** — Bar-fed. OD G85 NR01 + finish G87 → center → **G74 peck-drill .187** → rough face-groove G85 NR02/G82 (G41) → finish groove G87 → ID bore (2 longhand plunge passes) → cutoff. Full-featured 7-tool part.
15. **WHITESELL/W92034008-B.MIN** — Large (X4.15). OD rough G96 S250 + G50 S600 M42, 3 skim + G85 NR001 (G3 .065 chamfer) → OD finish G87 → ID rough G85 NBORE (G2 profile) → ID finish G87. 4 tools.
16. **ACME/A-... + others** confirm same template.

## Inefficiency signals observed

1. **Redundant facing/skim passes before the LAP cycle.** Many OD-rough ops hand-code 3 facing skim passes (`G0 X.. Z.05 → G1 X-.04`, then Z.025, then Z.005) BEFORE invoking `G85 NTURN`. This is a fixed habit regardless of stock — pure air/redundant cutting when face stock is small. (ACME-11-10715, IMAGE-TH75, CASING, WHITESELL.)
2. **Heavy CAM-posted longhand contours where a LAP cycle fits.** Electrode/profiler files (NATHANS-ITW-M81258, OMG-ITW-31128, OMG-HOLO-KROME-A210259, NATHANS-FONTANA-THP481137) emit dozens of explicit G0/G1/G2/G3 point moves with constant fixed Z-stepover — bulky, hard to edit, slower to verify than a single `G85` LAP shape. Mixed-mode programs prove the shop knows LAP but the CAM post bypasses it.
3. **Excessive rapid retract to a fixed park (X20/X50 Z20) between every op.** Every NAT block round-trips to a far park (`G0 X20 Z20` or `X50 Z20`) on entry AND exit — large air-move distance on small parts, repeated 3–7×/program. Often a double `G0 X20 Z20` on entry (redundant).
4. **Conservative / single-pass drilling.** Many drills are a single straight `G1 Z-3. F.0025` plunge (no peck, no G74) on deep holes (e.g. .828 dia × 3" deep) — chip-evacuation/tool-life risk; only ~25% of programs use the available G74 peck cycle.
5. **G50 cap occasionally too high to bite.** Some caps are set high (G50 S1500) on small-OD parts where CSS would never reach it — cap present but not limiting; conversely a few cutoff ops re-cap to S800 only at the part-off, fine. Inconsistent cap values across same-family parts.
6. **Inconsistent CSS vs direct-RPM choice.** Boring and finishing frequently use G97 direct-RPM (constant ~S450–S800) rather than G96 CSS, so surface speed drops toward the bore/center — suboptimal SFM on tapered/facing geometry where CSS would hold the cutting speed.
7. **Tool-return stubs & dead `NAT01 T010101 M2`** at program end add a tool-change with no cut (housekeeping return-to-tool-1) — minor but a redundant index.
8. **No high-feed / trochoidal roughing anywhere.** All roughing is conventional axial LAP or skim passes; DOC (D.06–.1) and feeds (F.006–.012 IPR) are uniform/conservative regardless of material — the corpus has no aggressive MRR strategy.

## Optimization opportunities

1. **Replace the fixed 3-skim-pass facing prologue with a single stock-aware face cut (or a G85 NFACE/G82 face cycle sized to actual face stock).** Eliminates the largest repeated source of air/redundant cutting; PRISM can compute face stock from the blank vs. part Z0 and emit 1 pass (or skip if stock < tolerance). High ROI, very common pattern.
2. **Re-post CAM longhand profiles into Okuma LAP cycles (G85/G87 with an NTURN/NBORE shape).** Detect the stepped G0/G1/G3 contour blocks and collapse to one shape definition + `G85 ... D U W F` + `G87` finish. Shrinks program size, lets the control optimize the rough pattern, and matches the shop's own hand-coded discipline. Target the electrode/profiler family first.
3. **Optimize/standardize the inter-op retract.** Replace the far fixed park (X20/X50 Z20) with a computed safe clearance just outside the largest current diameter, and delete the duplicate `G0 X20 Z20` entry lines. Cuts air-move time 3–7×/program — pure cycle-time win with zero risk if clearance is solved from geometry.
4. **Promote single-plunge deep drilling to G74 peck cycles with material-aware peck depth (D) and dwell.** PRISM should auto-insert G74 when hole depth/dia exceeds ~3×D or material is gummy — improves chip control & tool life; the shop already uses G74 (511 programs) so it's an in-family upgrade.
5. **Prefer G96 CSS (with the existing G50 cap) for boring/finish/face ops currently on G97.** Holds true SFM across changing diameter on facing/tapers/bores → better finish + tool life; the G50 cap is already present in 98% of files so the safety prerequisite is met. Pair with material+tool SFM lookup to set the right S.
6. **Material/tool-aware feed & DOC tuning + introduce high-feed/heavier roughing where rigidity allows.** Current feeds (F.006–.012 IPR) and DOC (D.06–.1) are uniform and conservative; PRISM can raise MRR per material (the corpus rarely exceeds these) — biggest raw cycle-time lever on roughing-dominated parts (e.g. HEADALLOY X10 facing done as 3 longhand passes).
7. **Normalize the G50 cap to a geometry-derived value** (cap ≈ max safe RPM at the smallest cutting diameter for that op) instead of copy-pasted S600/S1500 — makes CSS actually engage and standardizes across same-family parts.
8. **Detect & strip dead tool-return stubs / redundant indexes** (`NAT01 T010101 M2` tail with no cut) during post-cleanup.
