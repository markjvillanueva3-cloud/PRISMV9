# PROFILER SHARD 0 — JM Die Okuma OSP Lathe Corpus (.MIN)

> Shard rule: lines where (zero-based index % 8 == 0) from `_filelist.txt` (16,558 total lines).
> Units: **INCH** throughout (Okuma OSP, G20-equivalent default; no explicit G20/G21 in any file — OSP carries units in machine config, not the program). All feeds/dims read as inch and inch-per-rev (IPR).

## Shard 0 — file count
- **2,070 `.MIN` files** (all 2,070 verified on disk; 0 missing).
- **2,068 are genuine Okuma OSP turning programs** (carry `NAT##` op labels + `G0` moves). 2 are non-Okuma/degenerate.
- 100% `.MIN` extension. 320 reference MILL/Mastercam in comments only (cross-process notes), not actual mill code.
- Customer spread (top dirs in shard): FONTANA 116, ITW 111, OPTIMAS 90, ATF 87, HOLO-KROME (3 mirror copies) ~169, HPFS 55, AIR 48, OMG 44, VALLEY 42, TCR 41, GRANDEUR (2 copies) ~76, plus ACME, SEMS, WHITESELL, CSM, AKKO, STALCOP, ELITE, EJOT, ARCHER, ANDERSON, MIDWEST, etc.

## Structural census (counts)
File-level counts (program contains ≥1 occurrence), confirmed two ways (whole-file grep + single-pass awk; totals cross-check):

| Code / feature | Programs | Okuma OSP meaning |
|---|---|---|
| **G96** (CSS) | **1,917 / 2,070 (93%)** | constant surface speed |
| **G97** (direct rpm) | 1,966 (95%) | direct rpm — present in nearly every program (drilling/boring/tapping ops run G97) |
| **G50** (rpm cap) | 2,027 (98%) | max-rpm clamp under G96 |
| **G96 present but NO G50 anywhere** | **38** | missing mandatory CSS cap (safety gap) |
| G99 (feed/rev, IPR) | 1 explicit | OSP default is feed-per-rev; rarely stated explicitly |
| G94 (feed/min) | 145 | feed-per-minute (used on some ops) |
| G95 (feed/rev) | 204 | explicit IPR call-outs |
| G20 / G21 (unit) | 0 / 0 | never declared in-program (OSP config-level) |
| **G85** (LAP **rough** turn/bore) | **1,542 (75%)** | Okuma roughing canned cycle (Fanuc-G71 analog) |
| **G87** (LAP **finish**) | **1,475 (71%)** | Okuma finishing cycle (Fanuc-G70 analog) |
| **G74** (peck drill / groove) | **516 (25%)** | deep-hole peck / grooving |
| **G71** (**THREADING**) | **67 (3%)** | Okuma thread cycle (B angle, D depth, H height, J pitch) — NOT rough-turn |
| **G76** (auto-corner chamfer/radius) | 137 (7%) | corner-round in contour def — NOT threading |
| G70 / G72 / G73 / G75 / G33 / G32 | 0 | Okuma uses G85/G87/G71/G74 instead; absent by convention |
| **Cutoff / part-off (keyword)** | **838 (40%)** | parting op, almost always labeled `NAT11 (CUTOFF ...)` |
| M3 (spindle CW) | 2,059 | dominant; M4 (CCW) only 15 |
| **M8 / M9 (coolant on/off)** | 2,018 / 1,318 | flood coolant near-universal at op start; M9 at part-off |
| M42 | common | high gear range select on heavier roughing |
| M1 | near-universal | optional-stop between every NAT op |

**CRITICAL G-code convention note (inverted vs Fanuc):** On Okuma OSP these JM programs use **G85 = LAP rough, G87 = LAP finish, G71 = thread, G74 = peck-drill, G76 = corner chamfer**. A Fanuc-trained parser that reads G71=rough/G70=finish/G76=thread will mis-classify the entire corpus. The roughing/finishing PAIR is G85→G87 keyed by a shared `NR##`/`NTURN`/`NBORE`/`NR001` shape label whose contour is defined under `G81` (turning/longitudinal) or `G82` (facing/face-groove).

**Tools per program:** avg **5.3**, range 1–12, mode 6 (median band 5–6). Distribution: 1:19, 2:151, 3:226, 4:260, 5:380, 6:439, 7:377, 8:146, 9:52, 10:15, 12:2. Single-spindle bar-fed parts: roughly 3–8 tools is the norm.

**Threading:** only 67 programs (3%) thread (G71). Example `G71 X1.106 Z-.323 B60 D.003 U.001 H.067 F.94488 J16 M33 M73` (FONTANA 05440-4) — B60 = 60° infeed, D.003 first-pass depth, H.067 thread height, J16 = pitch identifier, M33/M73 = thread-sync/chip-control M-codes, run under G97 (correct — threads are direct-rpm, never CSS).

## Per-program structural notes (sampled, end-to-end ~18 programs)

Canonical JM Okuma program skeleton (seen in essentially every file):
```
$NAME.MIN%
M1
NBAR / CLEAR / DEF WORK / PS LC,[-400,0],[400,19] / END / DRAW / /CALL OBAR   (bar-feeder + graphic def)
M1
NAT01 (comment)  -> G0 X20 Z20 (safe index) -> Txxxxxx -> G50 Snnn -> G96/G97 Snnn M3 [M8] -> approach -> cycle -> G0 X20 Z20 -> M1
...repeat per op...
NAT11 (CUTOFF ...) -> ... -> M9 -> M05 -> /GOTO NBAR -> M2 %
```

- **ACME A-11-10583-0** (73 ln): OD rgh (longhand facing passes X-.040 ×3 at descending Z, then `G85 NR001 D.100 U.010 W.005 F.008`/`G81` contour w/ G42 TNR + `G03 ... L.062` lead) → OD fin `G87 NR001` → bore `G85 NBORE D.050 U.005 W.002`/`G81` → bore-fin `G87 NBORE` → `NAT01 T010101 M2`. G50 S800 cap, G96 CSS on OD, G97 on bore. Feeds IPR (F.002–.008).
- **AIR DS-22-REG** (83): OD rgh G85 D.1 U.01 W.005 F.009 (G81, lead-in X.678 A135 chamfer, exit X.8 F.02) → OD fin G87 → carbide bore G85 D.03 + G76 X.557 L.035 corner → bore fin G87 → CUTOFF. Clean CSS+G50, multi-pass LAP. Good exemplar.
- **AIR A5700-06-01-1** (54): OD+face rgh G85 w/ in-contour `G76 X.551 L.032` chamfer → OD fin G87 → `NAT11 (CUTOFF .125)` G96 S100 G50 S800 X-.04 F.0015 then retract X2 M9. Tidy 3-tool part.
- **AGRATI B-DC-75-026-B**: includes `NAT06 (THREAD 3-12)` G97 S250 `G71 X3.005 Z-1.87 B60 D.003 U.001 H.082 F1 J12 M33 M73` — textbook Okuma thread, correctly G97.
- **ITW 29787D1 (BEE297)** (75+): OD rgh longhand contour (no LAP — single chamfer G3 L.037 + straight Z-3.53) → center-drill (G1 Z-.150 F.002) → drill (G1 Z-3.65 F.002, **straight plunge, no G74 peck on a 3.65"-deep hole** ⚠) → bore G85 NBORE/G81 w/ G41 → bore fin G87 → CUTOFF G96 S150 G50 S800 F.0015.
- **OPTIMAS 11BT-45-375-GR8** (75+): OD rgh longhand → center-drill → `G74 X0 Z.1.2 D.15 L.15 F.002` peck drill (note malformed `Z.1.2` token ⚠) → face-groove rgh `G85 NR02 D.02 U.0 W.003`/`G82` → face-groove fin G87 → bore. Good use of G82 facing-contour for the face groove.
- **ATF 1UP42** (94): OD rgh G85 D.06 U.003 W.0 (W.0 = no Z finish stock) → OD fin G87 → center-drill → `G74 ... Z-1.35 D.3 L.3` peck (D.3 peck on ~1.35 hole = aggressive/OK) → bore G85 D.02 U0 W.003. `G0 X.1.26` malformed token ⚠.
- **HPFS 10848** (113): OD rgh G85 D.1 U.01 W.005 → fin G87 → center → `G74 Z-.82 D.15 L.15 F.001` → face-groove rgh `G85 NR001 D.02 ... G82` G41 + `G3 ... L.263` → fin G87. Uses `M0` (program stop) after drill — heavier operator-attention gate than M1.
- **FONTANA 05440-4**: OD rgh/fin G85/G87 (NTURN) → drill → bore → `G71` THREAD B60 D.003 H.067 J16 → final CSS face S150. Full mill-of-ops part, 10+ NAT ops.
- **HOLO-KROME 121L030073 (WAFER-ID)** (68): **entirely longhand**, NO LAP cycle — two near-identical hand-coded ID contours (NAT1 rough w/ G99 G1 F.008, NAT2 fin F.003, both G96 S1500 G50 S1500) → CUTOFF. The two contours differ only by finish stock; a single G85→G87 LAP pair would have replaced ~30 hand lines. Also `G0 X.900 Z-850` (missing decimal, should be Z-.850) ⚠ and `G50 S1500`=`G96 S1500` (cap == target, so cap does nothing).
- **ACME A11-10650-0-CASE**: OD rgh/fin, center-drill, drill (straight, no peck), bore, CUTOFF with multi-segment angled part-off (`G1 ... A225`, `A135` corner break, F.0005 finishing pass) — careful parting with chamfered face.

Cross-cutting observed conventions: `G0 X20 Z20` is the universal safe-index point before/after every tool; `M1` optional-stop after every op (heavy operator-supervision style); coolant `M8` issued mid-approach on the first cutting block; CSS speeds S450–S1500, drilling/boring on G97 S400–S950; OD rough feeds F.005–.009 IPR, finish F.002–.005, bore F.0015–.003, part-off F.0015 (rough) / F.0005 (face break) IPR.

## Inefficiency signals observed
1. **Air-cutting / redundant approach (universal).** Every op rapids out to the far `G0 X20 Z20` index point and back, even between consecutive same-zone ops. With M1 between every op this is operator-driven, but on unattended bar runs it adds seconds × thousands of cycles. Many rough cycles also pre-face with 2–3 longhand `G1 X-.04` skim passes before the LAP cycle (e.g. ACME A-11-10583-0 does three full X-.040 facing passes at Z.050/.025/.005 before G85) — redundant when the LAP cycle's first pass already faces.
2. **Hand-coded longhand where a LAP cycle fits.** ~25% of programs (the ~525 with neither G85 nor G87) carve contours line-by-line (e.g. HOLO-KROME WAFER-ID rough+finish as two duplicated 15-line contours). A G85/G87 pair off one shared `NR##` shape is shorter, safer, and lets the control optimize passes.
3. **Straight-plunge deep drilling (no G74 peck).** Several programs drill deep holes with a single `G1 Z-…` plunge (ITW 29787D1 plunges to Z-3.65; ACME case to Z-2.25) instead of `G74` peck — chip-packing / drill-breakage risk in deep holes, especially at the conservative F.002–.0025 used.
4. **Over-conservative DOC & feed on roughing.** LAP rough DOC commonly D.02–.10 with rough feeds F.005–.009 IPR. For the OD-turn steels typical here (fastener/die work), D.10/F.009 is fine but the many D.02–.06 light passes leave material on the table — no high-feed / heavy-DOC roughing strategy anywhere.
5. **CSS cap mis-set or absent.** 38 programs use G96 with NO G50 cap (uncontrolled rpm ramp as diameter → 0, dangerous at part-off). Others set `G50 S = G96 S` (HOLO-KROME S1500=S1500) so the cap never engages — defeats its purpose.
6. **Malformed numeric tokens** survive in production files: `G0 X.1.26`, `G74 X0 Z.1.2`, `G0 X.900 Z-850` (missing/double decimals). These run on the iron because the operator dry-runs, but they are latent crash/scale bugs and pollute any auto-parse.
7. **Redundant tool re-index.** OD rough and OD finish frequently call the SAME `Txxxxxx` (ATF 1UP42 NAT01 & NAT02 both T010101; ACME both ends T010101) — a second tool station is not used for finishing, so finish quality rides on the roughing edge's wear.
8. **No lead-out / dwell on grooves**; face-groove cycles (G82) finish at the contour end with a rapid `G0` retract — fine, but no spring/dwell pass on finish grooves where size matters.

## Optimization opportunities
1. **Auto-convert longhand contours → G85/G87 LAP pairs.** Biggest structural win: detect the ~525 hand-coded programs and emit a single `NR##` shape under G81/G82 driven by G85 (rough, with D/U/W) + G87 (finish). Shorter, safer, control-optimized, and uniform for the learner.
2. **Insert G74 peck on deep drilling.** Rule: any `G1 Z-d` drilling plunge where d > ~3× tool dia → replace with `G74 X0 Z-d D(peck) L(retract) F` (peck ≈ 1–1.5× dia). Eliminates chip-pack breakage and lets feed increase.
3. **Enforce CSS+G50 discipline.** Every G96 block must carry a meaningful `G50 S(cap)` strictly above the working rpm at min diameter (especially before part-off). Flag the 38 no-cap programs and the cap==target cases. This is a safety gate, not just efficiency.
4. **High-feed / heavy-DOC roughing recipe.** Replace the timid D.02–.06 stepdowns with material-aware DOC (P-steel ~kc1.1=1800) — single heavier LAP rough pass + dedicated finish, raising rough feed toward F.012–.015 IPR where rigidity allows. Pair with a real finish tool (own T station) instead of reusing the rough insert.
5. **Collapse air moves / shared safe-plane.** Keep `G0 X20 Z20` as the master safe index but skip the redundant pre-LAP facing skims and avoid full retract between adjacent same-zone ops on unattended runs — model the M1 gates as optional so PRISM can offer a "lights-out" variant.
6. **Lead-in/out + chamfer standardization.** Many contours already use `A135`/`A175` angle lead and `G76 L.0xx` corner rounds; promote this to a default so every finish pass gets a proper chamfered approach/exit (some longhand parts have abrupt entries). 
7. **Normalize/lint malformed tokens before training.** Pre-process the corpus to repair `X.1.26`, `Z.1.2`, `Z-850` so the learner doesn't internalize bad geometry; surface these back as a JM data-quality report.
8. **Part-off feed/CSS template.** Standardize the strong pattern already present (G96 S100–S150, G50 S800 cap, F.0015 rough → F.0005 face-break, M9 then retract X2) into a reusable cutoff recipe keyed to bar diameter.
