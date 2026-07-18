# Profiler Shard 5 — JM Die Okuma OSP Lathe (.MIN) Census + Deep Read

Profiler shard 5 of 8 (zero-based line index % 8 == 5). All values treated as **INCH** (JM Die is a G20 / Okuma OSP shop). No metric conversion performed.

## Shard 5 — file count

- **2070** programs in shard (all 2070 confirmed present on disk; 0 missing).
- Source: lines `NR%8==6` (1-based) of `_filelist.txt`, CR-stripped.
- Customer/folder distribution (top): OMG 347, NATHANS USB 221 (USB archive of CNC#1#2#3 customer dirs), FONTANA 117, ITW 113, BELVIDERE 93, OPTIMAS 90, ATF 87, HPFS 54, HOLO-KROME 52, AIR 49, VALLEY 44, TCR 42, ELECTRODE 42, GRANDEUR 38+38, SEMS 33, HEADER 25, WHITESELL 23, AKKO 23, then a long tail of fastener/die customers.
- Mean **5.22 distinct tools/program** (min 0, max 11). Mode band 5–7 tools. Distribution: 1t=18, 2t=154, 3t=262, 4t=288, 5t=385, 6t=406, 7t=359, 8t=122, 9t=61, 10t=13, 11t=1.

## Structural census (counts)

Counts = number of programs in the 2070-file shard containing each code (file-level presence, grep over shard paths).

| Signal | Count | % of shard | Notes |
|---|---:|---:|---|
| **G96 (CSS)** | 1899 | 92% | Constant surface speed is the norm |
| **G97 (direct RPM)** | 1983 | 96% | Co-present — used per-op (drilling/boring/cutoff in RPM, OD turning in CSS) |
| **G50 (max-RPM cap)** | 2030 | 98% | Cap is essentially universal — strong, disciplined CSS practice |
| **G94 (feed/min)** | 132 | 6% | Only appears for live-tool / Y-axis milling segments |
| **G95 (feed/rev)** | 190 | 9% | Explicit IPR; most programs rely on machine-default feed/rev (bare F.00x) |
| **G85 (Okuma rough cycle)** | 1509 | 73% | OSP multi-repetitive rough (D=depth, U/W=stock, F) |
| **G87 (Okuma finish cycle)** | 1433 | 69% | Replays the named shape from G85 |
| **G81 (shape-def start)** | 1411 | 68% | Bound to G85/G87 NTURN/NBORE blocks |
| **G82 (shape-def start, alt)** | 163 | 8% | Face/alt profile shape start |
| **G80 (shape-def end)** | 1511 | 73% | Pairs with G85/G87 |
| **G74 (peck drill / groove)** | 503 | 24% | Centerline peck drilling (X0 Z- D L F) |
| **G76 (corner/contour radius in shape)** | 126 | 6% | On OSP turning = corner-R move in shape-def, **not** ISO threading |
| **G73 (pattern)** | 1 | <1% | Effectively unused |
| **G70 / G71 / G72 / G75 (ISO cycles)** | 0 / 55 / 0 / 0 | — | ISO-style cycles NOT used; the 55 "G71" hits are incidental tokens, not roughing cycles |
| **G2/G3 (arc)** | 1403 | 68% | Fillets/radii via direct arcs |
| **G41/G42 (tool-nose-radius comp)** | 432 | 21% | TNR comp used mainly on the finish pass; **~79% rely on programmed-point geometry without comp** |
| **A-angle moves (chamfer/taper)** | 1229 | 59% | Heavy use of `X.. A###` chamfer/angle shorthand |
| **G4 dwell** | 338 | 16% | Dwell on grooves/face plunges |
| **M8 coolant on** | 2016 | 97% | Near-universal flood |
| **M9 coolant off** | 1308 | 63% | M8 present ~1.5× M9 → many programs never explicitly cancel coolant (rely on tool-change/M2) |
| **Bar-feed subprogram (/CALL OBAR, NBAR loop)** | 1261 | 61% | Production bar-fed parts loop on `/GOTO NBAR` |
| **M2 end / M30** | 1925 / 151 | 93% / 7% | M2 dominant program end |
| **TAP/THREAD keyword** | 2 / 46 | — | Single-point/tapped threading is RARE in this shard |

**Parting/cutoff:** ~823 programs carry a part/cutoff keyword; the canonical signature is a final tool `NAT11`-style block: `G96 S100 M3 / G50 S800 / G0 X<od> Z-<length> / G1 X-.04 F.001-.0015 / G0 X2 M9`.

## Per-program structural notes (sampled — ~18 read end-to-end)

Representative dialect template (clean): **`H:/prism/JM DIE/CNC LATHE/AIR/A5700-06-01-5.MIN`**
- Seq: NBAR stock-def (CLEAR/DEF WORK/PS LC/DRAW) → `/CALL OBAR` → **OD+face rough (G85 NTURN G81 shape, G42, G76 corner-R, A175 chamfer, F.009→F.007 ipr)** → **OD finish (G87 NTURN, F.004)** → **cutoff (G96 S100 + G50 S800, F.0015)** → `/GOTO NBAR` loop. CSS + G50 cap present. Feeds feed-per-rev. Textbook 3-tool bar job. **No inefficiency.**

- **ACME/11-10715-0-B.MIN** — Seq: OD rough (G85 NTURN, G50 S600/G96 S250, F.008 ipr) → OD finish (G87) → ID rough boring (G85 NBORE, G97 S550) → ID finish (G87 NBORE). G50 cap present. **Inefficiency:** 3 manual scratch passes (`G0 X1.6 Z.. / G1 X.7`) BEFORE the G85 cycle — redundant air/approach passes the cycle would cover.

- **HEADER/4-0668-02-1-51.MIN** — Seq: face+OD turn (G3 corner-R L.04, F.005) → center drill (G97 S750) → **peck drill G74 X0 Z-1.14 D.15 L.15** → boring (2-pass) → cutoff (G96 S100/G50 S800). Clean G74 use. Minor: drill approach uses separate G0 X nibbles.

- **ELECTRODE/LELAND ELECT/96116.MIN** — Seq: face → G85 rough → **G42 + G76 contour (Z-.295 A171.5 L.023) finish-form** inside shape → G87 finish. CSS G50 S3000 cap (electrode = small dia, high rpm). Good TNR-comp discipline.

- **ITW/PSR559-INT083646-MOD.MIN** — Seq: face+G3 corner → center drill → **G74 peck drill (D.1 L.1)** → G85 NTURN G82 ID profile (G41) → G87 finish → cutoff. 6 tools. Clean OSP. Cutoff at G96 S100/G50 S800.

- **AKKO/UPSET871-ID500.MIN** — Multi-tool ID/upset part w/ **live-tool milling** (M110/M13 SB=1750/G138 Y-axis mode, switches `G1 G94 Y.. F9.` feed/min then back to G95). Drilling ops in G97. Cutoff 1/8 cutter. Shows the G94↔G95 switch for driven tooling.

- **FONTANA/A-0018.MIN** — NBAR/OBAR loop, M216, G50 S1200/G97 S900, face F.004. Standard bar job head.

- **OMG/A6 EXP 2ND PUNCH HOLDER.min** — **Hand-coded longhand roughing.** OD+face rough programmed as ~9 manually-typed concentric stepover passes (`G0 Z.135 / G1 Z.035 / step X`) instead of a G85 cycle; the boring bar (NAT07) is ~16 hand-typed passes. Major inefficiency exemplar (see below).

- **Longhand offenders (no-G85, >50 lines):** **230 programs** in shard. Extreme: `CSM/SQWAFER460.MIN` (2516 lines), `HPFS/PART#11243-GAGE248.MIN` (1120), `NATHANS USB/.../FORGO FASTENERS/1339-5-2300.MIN` (350), `ALLFAST/10-011-103-MARK.MIN` (313), `NATHANS USB/.../ALLFAST/10-010-146-1 SIDE A.MIN` (283), `AIR INDUSTRIES/57-QC-89-1.min` (225).

## Inefficiency signals observed

1. **Hand-coded longhand roughing instead of G85** — 230 of 2070 programs (≈11%) have no G85 cycle yet exceed 50 lines; the worst run hundreds-to-thousands of manually-typed concentric stepover passes (OMG punch holder, CSM SQWAFER460 @2516 lines). Each is bloated, error-prone, and bypasses the controller's optimized DOC management.
2. **Redundant pre-cycle "scratch" passes** — many G85 programs (e.g. ACME/11-10715) still hand-program 2–3 light passes to the same X depth right before the G85 call. Pure air/redundant cutting the cycle already handles.
3. **TNR comp used only ~21% of the time** — finish profiles with arcs/angles are mostly cut on programmed-point geometry without G41/G42. Acceptable on simple chamfers but leaves radius/taper accuracy to the programmer rather than the control → accuracy risk on forms.
4. **Very conservative cutoff CSS (G96 S100)** — the universal parting signature runs ~100 sfm regardless of material/diameter. Safe but slow; many parts could part faster with diameter-aware CSS.
5. **Coolant left on** — M8 appears in 97% but M9 in only 63%; many programs rely on tool-change/M2 to drop coolant rather than M9 per tool.
6. **Drill/bore approach nibbling** — separate `G0 X` micro-positions before plunges (HEADER NAT07, OMG B.BAR) add small air moves; could be single rapid-to-clearance.
7. **Single-pass deep boring/drilling** in some ID ops where a G74 peck or staged G85 would reduce tool deflection/chatter risk.

## Optimization opportunities

1. **Auto-convert longhand → G85/G87 cycles.** Highest-ROI PRISM learning target: detect the hand-typed concentric-pass pattern and emit the equivalent `G85 N<shape> D U W F` + `G81/G82 shape` + `G87` trio. Directly attacks the 230 longhand programs (program size ↓ 5–50×, fewer keystroke errors, controller-managed DOC).
2. **Strip redundant pre-cycle scratch passes** and let the G85 cycle own all roughing — recover air-cut time and program length.
3. **Promote TNR comp (G41/G42 + G40) on every finish profile carrying an arc/angle/radius** so form accuracy is control-managed, not hand-compensated; pairs with the existing A-angle/G76-corner shorthand JM already uses.
4. **Diameter/material-aware cutoff & roughing CSS.** Replace the blanket `G96 S100` cutoff and conservative roughing feeds with PRISM physics-derived sfm/ipr from `prism_calc` (Kienzle/Taylor) capped by the existing G50 value — keep the disciplined G50 cap, raise the cutting speed where material allows.
5. **Standardize the proven bar-job template** (NBAR/DEF WORK → /CALL OBAR → G85 rough → G87 finish → G74 drill if ID → cutoff G96 S100/G50 S800 → /GOTO NBAR) as PRISM's canonical Okuma turning skeleton — it is already the dominant clean pattern (AIR/A5700, ITW/PSR559, HEADER/4-0668).
6. **Enforce M9 + coolant-state hygiene per tool**, and collapse drill/bore approach nibbles into single clearance rapids.
7. **Preserve the shop's strong habits as positive training signal:** 98% G50 cap, 92% CSS, 61% bar-feed subprogram looping, heavy G85/G87 cycle use (~73%/69%) — PRISM should reward, not "fix," these.
