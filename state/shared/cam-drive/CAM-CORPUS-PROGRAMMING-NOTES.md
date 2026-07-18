# CAM Corpus Programming Notes — How JM Die Historically Programmed Okuma Lathe Parts (and Where to Optimize)

> Synthesis of 8 profiler shards (`corpus-notes/batch-0.md` … `batch-7.md`), each a 1/8 slice of `_filelist.txt` (16,558 lines). **All 8 shards present and read; none missing.**
> **Control:** Okuma OSP (NOT Fanuc). **Units:** INCH throughout — no G20/G21 ever declared in-program (OSP carries units in machine config). **Feed mode:** feed-per-rev (IPR) is the OSP *implicit modal default*; G95 stated explicitly in only ~10% of files, G94 (feed/min) only in live-tool C/Y-axis blocks. Operator ask: *"take notes on how we generated them (they weren't the best) and learn to optimize"* — goals: **time, efficiency, safety, accuracy** per operation.
>
> **CRITICAL DIALECT NOTE (inverted vs Fanuc):** On these Okuma programs **G85 = LAP rough**, **G87 = LAP finish**, **G81 = longitudinal/turn shape-def**, **G82 = face/transverse shape-def**, **G80 = LAP end**, **G71/G72 = THREADING cycle** (B-angle/D-depth/H-height/J-lead/M33-M73), **G74 = peck-drill/groove**, **G76 = corner chamfer/radius INSIDE a LAP shape (never threading)**. A Fanuc-trained parser (G71=rough / G70=finish / G76=thread) mis-classifies the ENTIRE corpus. Fanuc G70/G72(face)/G73/G75/G33 are absent (≈0 each).

---

## 1. Aggregate census (summed across 8 shards)

Total `.MIN` files profiled across shards: **2070 + 2070 + 2070 + 2070 + 2070 + 2070 + 2069 + 2069 = 16,558** (matches `_filelist.txt` line count; all verified on disk, ~0 missing per shard, 1 empty in shard 3). These are short single-setup turned parts (fasteners, dies, electrodes, casings, tool-holders, back-plugs, cutters), 30–230 lines, mostly bar-fed. Top customers fleet-wide: OMG, NATHANS-USB archive, FONTANA (~116/shard), ITW (~112/shard), OPTIMAS (~88/shard), ATF (~87/shard), HOLO-KROME, HPFS, AIR, VALLEY, TCR, GRANDEUR, plus ACME/AGRATI/SEMS/WHITESELL/AKKO/CSM/ELITE/EJOT and a long fastener-die tail (~105 distinct customer folders).

**Spindle-mode mix** (file-level presence; programs typically use BOTH — CSS for diameter-varying turns, direct-rpm for on-center drill/bore/thread):

| Code | Per-shard counts (0→7) | Approx fleet rate |
|---|---|---|
| **G96 (CSS)** | 1917, 1904, 1909, 1907, 1917, 1899, 1902, 1920 | **~92–93%** |
| **G97 (direct rpm)** | 1966, 1974, 1968, 1965, 1969, 1983, 1962, 1965 | **~95%** |
| **G50 (rpm cap)** | 2027, 2022, 2024, 2018, 2032, 2030, 2022, 2011 | **~97–98%** |
| G96 present but **NO G50 cap** (safety gap) | 38, —, —, 42, —, 36, 36, — | **~36–42/shard (~1.9%)** |
| G96+G50 co-present (CSS correctly capped) | —, 1859, —, —, —, —, —, 1873 | **~90%** |
| M41/M42 gear range | —, 577, —, —, —, —, 335/591, 571 | **~28%** (heavier OD/drill) |

**G50-cap compliance: ~97–98% — a genuine, strong shop habit. The non-compliant minority (~36–42 files/shard, ~1.9%) is the single highest-severity safety signal** (uncapped CSS → runaway rpm as diameter → 0 at facing/parting-to-center). Note also a "cap == target" degenerate (HOLO-KROME `G50 S1500`=`G96 S1500`) where the cap never engages, and modal-cap reliance (TCR re-engages G96 in later ops with no fresh G50).

**Feed-mode mix:** G95 explicit 176–217/shard (~9–10%); G94 explicit 129–157/shard (~6–8%, almost all live-tool milling, reverts to G95 after); **neither stated ~91%** → relies on OSP implicit feed-per-rev. F-values .001–.016 IPR throughout confirm IPR base. **Relevant to U-CAM-FEEDREV-MODE-DEFAULT: corpus confirms Okuma OSP default = feed-per-rev; misreading these as feed/min is a gross feed error.**

**Canned-cycle usage frequency** (fleet ≈, file-level presence):

| Cycle | Per-shard | Fleet rate | Meaning |
|---|---|---|---|
| **G85 (LAP rough)** | 1542,1513,1520,1543,1521,1509,1508,1513 | **~73–75%** | workhorse rougher (D=DOC, U=X-stock, W=Z-stock, F) |
| **G87 (LAP finish)** | 1475,1421,1441,1461,1441,1433,1424,1443 | **~69–71%** | replays the SAME named G81/G82 shape at finish stock |
| **G81 (turn shape-def)** | ~1404–1432 | **~68%** | longitudinal profile body |
| **G82 (face shape-def)** | 142–164 | **~8%** | face-groove / facing profile |
| **G80 (LAP end)** | ~1509–1522 | **~73%** | |
| **G74 (peck drill/groove)** | 516,519,528,515,511,503,482,532 | **~23–26%** | `G74 X0 Z-d D<peck> L<retract> F` |
| **G71/G72 (THREADING)** | 67,70,63,61/+1,58,55,62,68 | **~3%** | low-thread shop; B60 60°-UN form, runs under G97 |
| **G76 (corner chamfer/round in shape)** | 137,132,122,114,124,126,113,132 | **~5–7%** | NOT threading |
| **G41/G42 TNR comp (+G40)** | 432, 448 sampled | **~21%** | finish-pass only; **~79% cut on programmed-point geometry, no comp** |
| **A-angle chamfer shorthand** | 1197–1337 | **~59%** | `G1 X.. A135/A225` instead of explicit chamfer coords |
| **G4 dwell** | 312–338 | **~16%** | bottom-of-bore / endmill / groove |

**Cutoff/parting:** keyword-flagged in 574–855/shard (~38–41%), but **in practice ~all bar-fed parts end with a `NAT11 (CUTOFF)` op**; canonical signature `G96 S100–S250 / G50 S600–S800 / G1 X-.04 F.001–.0015 / G0 X2 M9`. **Coolant:** M8 ~96–97%, M9 only ~63% → ~720/shard leave coolant implicitly on (rely on tool-change/M2). **Bar-feed framing** (`NBAR / DEF WORK / CALL OBAR / GOTO NBAR`): ~60–62%. **M1 optional-stop between essentially every tool** (~99%, heavy operator-supervision style). **Live-tool C/Y-axis** (M110/G138/M13 SB=): ~147–154/shard (~7%).

**Tools per program:** fleet mean **~5.2–5.75**, **mode 6** (≈418–439 programs), median 5–6, range 1–13. Mass at **4–7 tools**. **Canonical op-sequence / turret roster:** `T01/T02 = OD rough/finish · T03/T04 = center-drill · T05/T06 = drill/spade/endmill · T07/T08/T09 = ID bore rough/finish + groove · T11 = cutoff · T12 = alt OD rough`. **Universal program skeleton:** `$name% → M1 → NBAR/DEF WORK/CALL OBAR → [per NAT op: G0 X20 Z20 safe-index → Txxxxxx → G50 Sxxx → G96/G97 Sxxx M3 → M8 → cut → G0 X20 Z20 → M1] → NAT11 CUTOFF → M9 → M5 → /GOTO NBAR → M2`.

---

## 2. How JM programmed each op type

- **Facing** — Habitually **2–4 longhand skim passes** (`G0 X.. Z.05 → G1 X-.04`, repeated at Z .075/.050/.025/.005/0) BEFORE the LAP cycle, regardless of actual face stock. Heavy parts (HEADALLOY X10.35) do this entirely longhand with M41 low gear. A proper `G85 NFACE/G82` face cycle exists in the corpus (8% of files) but is under-used; most facing is hand-stepped. Feeds F.004–.005 IPR.
- **OD roughing** — Dominant idiom `G85 N<name> D<doc> U<x-stk> W<z-stk> F<feed>` + `N<name> G81 <profile> G80`. DOC clusters **D.02–.12** (mostly .05–.10), feed **F.005–.016 IPR** (mostly .005–.009), CSS **S150–S680 sfm** (steel), capped by G50 S600/S800. Some rough turns run on **G97 fixed rpm** (95778, AGRATI/A27DSL, A9087329) — wrong for varying diameter. ~27% of files have NO G85 at all and hand-code stepover passes.
- **OD finishing** — `G87 N<name>` re-runs the identical G81 shape at finish stock (zero geometry re-coding) — the clean idiom, ~69–71% of files. Finish feed F.002–.005 IPR. BUT a recurring failure: rough done via G85 yet **finish re-coded by hand** instead of `G87` replay (ELITE, HEADER, TCR, FONTANA, QUALITY-FORM, OPTIMAS, ALCOA) — doubles geometry, risks rough/finish drift. Finishing often reuses the SAME T-station as roughing (ATF 1UP42 / ACME both T010101) → finish quality rides worn rough edge.
- **ID boring** — Best practice present (`G85 NBORE/G81` rough → `G87 NBORE` finish, e.g. JM-DIE CASE, HOLO-KROME A120716). But frequently **hand-coded single/double-pass longhand** (AGRATI/A27DSL, ELITE, FONTANA, AMGLO ~25-line incremental bore, ANDERSON single G1 Z-3.09 over 3"). Bore feed F.0015–.003 IPR; often on G97 (CSS would finish better near center).
- **Drilling / centering** — Center-drill on G97 (S400–S950); drill on G97. **G74 peck used in only ~23–26%**; many deep holes are a single straight `G1 Z-d` plunge (ITW 29787D1 Z-3.65; ACME 6"-deep Z-6. F.003; .828dia×3") — chip-pack / drill-breakage risk. Drill feeds conservative .001–.003 IPR.
- **Grooving** — OD/ID grooves often a single deep plunge + `G4` dwell (AEROTECH ID groove, AIR .125 groove) or hand-stepped Z "nibble" combs (GRANDEUR ~15-line groove). **Face-grooving done well** via `G85 NR/G82 + G41` rough → `G87` finish (ITW 5605, AGRATI A9087329, ATF T2790, EJOT, TCR, CHOCTAW) — a genuine strength.
- **Parting / cutoff** — Near-universal `NAT11` final op: `G96 S100–S250 + G50 S600–S800 + G1 X-.04 F.001–.0015 + G0 X2 M9`, often with an A135/A225 chamfer break (G3 corner) on the part face. **Conservative — S100 cutoff regardless of material/diameter; F.0015 plunge.** AMGLO multi-peck cutoff hand-codes 11 Z-stepped plunges with full air-return between each. Part-catcher M76/M77 in ~5%.
- **Threading** — Rare (~3%, 55–72/shard). `G71/G72 X.. Z.. B60 D.003 U.001 H<height> F<lead> J<TPI> M33 M73` on a dedicated tool (T06), correctly under **G97**. Lead expressed in inch (M16×2 → F.94488 ipr ≈ 2mm/rev — confirms inch base). Textbook examples: FONTANA A-0244, AGRATI M16X2, AIR 3/8-24, ACME 7/8-14.

---

## 3. Inefficiency findings (RANKED, with evidence counts)

1. **Hand-coded longhand where a LAP cycle fits (biggest structural waste).** ~27% of programs (≈552/shard) have NO G85/G87 at all; another large set hand-codes ID bores, grooves, or finish passes line-by-line. Extremes: CSM/SQWAFER460 **2516 lines**, HPFS GAGE248 **1120**, OPTIMAS FP-111400 NAT09 **~140-line profiler**, OMG punch-holder ~9 concentric passes + ~16-pass bore, electrode/profiler family (NATHANS-ITW, OMG-ITW) **14–25 stepped CAM-posted passes, no CSS**. Shard-5 counted **230 no-G85 programs >50 lines**. Inflates length, hides intent, blocks controller DOC optimization, invites typos.
2. **Conservative / non-material-matched feeds, speeds & DOC (biggest cycle-time waste).** Feeds cluster F.005 rough / F.002–.003 profile / F.0015 cutoff and CSS S150–S680 steel **regardless of vendor/material** — same values on aluminum-class and steel-class parts. DOC uniform D.05–.10. **No high-feed / adaptive / heavy-MRR strategy anywhere.** Cutoff at S100 and deep-drill at .002–.003 IPR are the most conservative, on the most-repeated/slowest ops.
3. **CSS (G96) under-used on turning passes (shard-7 emphasis).** Despite ~92% G96 presence, in many programs CSS is confined to the cutoff op while OD/ID roughing+finishing run **fixed-rpm G97** — surface speed collapses toward center on facing, hurting finish + tool life + MRR. CSS+G50 belongs on every facing/profiling pass.
4. **Redundant pre-cycle facing / "scratch" passes.** 2–4 full `G1 X-.04` face skims at descending Z before the LAP cycle, a fixed habit independent of real stock (ACME A-11-10583/10591/10715, AIR A05-LSC/A05-PP, IMAGE TH75, CASING, WHITESELL, ELGIN, ARCHER). Pure air/redundant cut the LAP first pass already covers.
5. **Excessive full-retract air moves.** Universal `G0 X20 Z20` (or X50 Z20) park on entry AND exit of every NAT op → 10–14 long index rapids/part on 5–7-tool work, sometimes doubled on entry; compounds massively over bar-fed volume.
6. **Straight-plunge deep drilling (no G74 peck).** Only ~23–26% peck; deep holes plunged in one `G1 Z-d` (ITW Z-3.65, ACME Z-6., AEROTECH 2") — chip-pack / breakage risk; feeds also timid.
7. **Finish pass re-coded by hand instead of `G87` replay.** Recurring (ALCOA FP14, ELITE, HEADER, TCR, FONTANA, QUALITY-FORM, OPTIMAS) — geometry maintained twice, rough/finish concentricity not guaranteed.
8. **TNR comp (G41/G42) used only ~21%.** ~79% of arc/angle finish forms cut on programmed-point geometry — accuracy of radii/tapers rides on the programmer, not the control.
9. **CSS cap mis-set/absent (~1.9%, ~36–42 files/shard) — highest *severity*.** G96 with no G50, cap==target (no-op), or modal-cap reliance with no fresh G50 on later ops.
10. **Coolant left implicitly on (~33%, ~720 files/shard M8-no-M9).** No per-op coolant scheduling; flood runs through air moves + tool changes.
11. **Data-quality / setup-sheet bugs.** Malformed numeric tokens survive to production (`G0 X.1.26`, `G74 Z.1.2`, `G0 X.900 Z-850`, `X..520` double-dot, missing decimals); tool-station↔comment mismatches (ATF A2504-4 "DRILL .250" loads T05 .843); station collisions (ITW T030303 = center-drill AND endmill); profile-label mismatch (AGRATI M16X2 `G85 NR01` but body `NTURN`); dead trailing template blocks (GRANDEUR `NAT12/M2`); dead tool-return stubs (`NAT01 T010101 M2`).
12. **Grooving/parting as single deep plunge or hand "nibble" combs** (no peck-and-shift; no spring/dwell on finish grooves where size matters).

---

## 4. Per-op-type OPTIMIZATION OPPORTUNITIES (mapped to 4 goals + PRISM CAM-OPTIMIZATION-RULES families)

> Goals tagged: **[T]ime · [E]fficiency · [S]afety · [A]ccuracy**. Always emit INCH / IPR (modal G95 per-rev) / G96+G50 for diameter-varying cuts, G97 for on-center.

- **`facing`** — Collapse the fixed 2–4 skim-pass prologue into ONE stock-aware face cut (or `G85 NFACE/G82` sized to real face stock from blank vs part Z0; skip if stock < tol). Put facing on **G96 CSS + G50 cap** (G97 collapses speed at center). **[T][E][A]** → *ADD a rule to the `facing` family: "detect ≥2 repeated `G1 X-.04` face skims → replace with single stock-derived face pass; force CSS+G50."* — not currently captured.
- **`OD_roughing`** — Convert hand-coded stepover roughing → `G85 D/U/W/F` + `G81` shape; force **G96 CSS** (switch the G97-rough offenders); material-keyed DOC/feed from `prism_calc` (Kienzle/Taylor, P-steel kc1.1=1800) capped by existing G50; introduce high-feed/heavier-MRR option where rigidity allows (current D.05–.10 / F.005–.009 leaves material on the table). **[T][E][A]** → *TIGHTEN `OD_roughing`: add longhand→LAP detection + material-aware DOC/feed uplift + "rough must be CSS" invariant.*
- **`OD_finishing`** — Lint "rough used G85 but finish hand-coded" → rewrite to `G87 N<shape>` replay (guarantees rough/finish concentricity, halves maintenance); give finish its OWN T-station (don't ride the worn rough edge); apply G41/G42 + lead-in/out on every arc/angle form. **[A][E][T]** → *TIGHTEN `OD_finishing`: G87-replay-not-longhand rule + mandatory TNR comp on formed finishes + dedicated finish tool.*
- **`ID_boring`** — Convert single/double-pass longhand bores → `G85 NBORE/G81` rough + `G87` finish with stock-aware stepover; prefer **G96 CSS** over G97 on tapered/facing bore geometry; flag single deep G1 bores (deflection/chatter) for multi-pass. **[S][A][E]** → *TIGHTEN `ID_boring`: longhand→LAP-bore promotion + CSS-preference + deep-single-pass deflection guard.*
- **`drilling_centering`** — Auto-insert `G74` peck when depth/dia > ~3–5×D or gummy material (peck ≈ 1–1.5×dia); raise the timid .001–.003 IPR drill feeds within rigidity; in-family upgrade (G74 already in ~25%). **[S][T]** → *TIGHTEN `drilling_centering`: depth/dia-triggered peck insertion + feed uplift.*
- **`grooving`** — Replace single-plunge + dwell / hand "nibble" combs with peck-and-shift (plunge-and-shift) cycles; add a spring/dwell finish pass where groove size is dimensional; promote the strong face-groove `G85/G82+G41 → G87` idiom as the default. **[S][A]** → *TIGHTEN `grooving`: peck/plunge-shift for deep grooves + finish-size spring pass.*
- **`parting_cutoff`** — Standardize the proven template but make CSS **diameter/material-aware** (lift the blanket S100 within blade L/t chatter + stress-to-yield limits); replace hand multi-peck parting (AMGLO 11-pass) with one peck-groove cycle + tight clearance retract (not full X2.56 air-return each peck); keep the disciplined G50 cap + chamfer break. Highest compounding ROI (853+ cutoff blocks, every bar part). **[T][S]** → *TIGHTEN `parting_cutoff`: material/diameter CSS uplift + single peck-cutoff cycle + tight retract; keep G50.*
- **`threading`** — Already clean (correct G71/G72 under G97, B60, inch lead). Encode the idiom as a template; lint the `G85 NR/NTURN` profile-label mismatch class. **[A]** → *ADD a guard rule to `threading`: profile-label consistency + correct-G97 assertion (minor; family otherwise healthy).*

**Cross-cutting (apply to all families):** (a) enforce **G50 immediately before every G96** (catch the ~36–42/shard uncapped + cap==target + modal-reliance) — a `prism_safety` gate, not just efficiency; (b) tighten inter-op retract from blanket `X20/X50 Z20` to geometry-derived per-tool clearance planes; (c) per-op M9 coolant hygiene; (d) pre-train **normalize/lint malformed tokens & station↔comment/collision bugs** and surface a JM data-quality report so the learner never internalizes bad geometry; (e) **preserve the shop's strong habits as positive training signal** — 97–98% G50 cap, ~92% CSS, ~73%/69% G85/G87, ~60% bar-loop, A-angle/G76 chamfer idiom (R11 convention-conformance: emit these, don't "fix" them).

---

## 5. Matrix-expansion recommendations (8-family CAM-OP-TEMPLATE-MATRIX → Fusion turning op types)

The corpus shows JM doing several distinct turning behaviors that the current 8 families (facing / OD_roughing / OD_finishing / ID_boring / drilling_centering / grooving / parting_cutoff / threading) do not cleanly represent as Fusion turning operation types. Recommended **new/derived matrix rows**:

1. **`profile` (general contour turn, OD or ID)** — The corpus's heavy longhand/CAM-posted multi-arc contours (electrodes, 6-lobe CSM, OMG punch-holder, profiler NAT09/NAT10 blocks, FONTANA B-8740) are a *Fusion "Profile"/"Contour" turning op*, distinct from straight OD_roughing. **EXPAND:** add a `profile` family whose rule is "monotone G1/G2/G3 stepover passes → Okuma `G85 N/G81(G82)/G80 + G87` LAP define+replay." This is the single largest corpus class not first-class in the matrix.
2. **`face_grooving` (G82-direction LAP)** — JM does this well and often (ITW, AGRATI, ATF, EJOT, TCR, CHOCTAW, HPFS), but it is a *different* op from radial `grooving` (G81/longitudinal). Fusion separates "Groove" (OD/ID radial) from "Face Groove." **EXPAND:** split `grooving` → `grooving` (radial) + `face_grooving` (G82) so DOC/comp/lead rules differ correctly.
3. **`chamfer` / `corner-break`** — The `G76 X.. A<angle> L<radius>` corner move and A-angle chamfer shorthand appear in ~59% of files as a first-class feature (lead-in chamfer, break edge on part-off). Fusion turning has a dedicated "Chamfer" op. **EXPAND:** a `chamfer` family that standardizes G76/A-angle emission as the default finish lead-in/out + part-face break.
4. **`single_line_bore` / `boring` (finish-only, no LAP)** — Many ID finishes are an intentional single clean pass to size (ARCHER, HPFS bores), a *Fusion "Bore"/single-line turning* op distinct from multi-pass `ID_boring`. **EXPAND:** a `bore_finish` row (single-pass-to-size with mandatory TNR comp + optional spring pass) so the optimizer doesn't force a LAP where a single finish bore is correct.
5. **`live_tool_milling` (C/Y-axis driven tooling)** — ~7% of files (M110/G138 polar, M13 SB=, G94-then-G95, C-axis arcs, endmill flats/cross-drills). Not turning, but present in the corpus and currently unrepresented. **EXPAND:** a `live_tool` family capturing the G94↔G95 feed-mode switch + SB= rotary spindle + polar/C-axis discipline (and the G4-dwell-on-plunge habit).
6. **`face_drilling / peck` as its own row** — `drilling_centering` lumps center-drill + drill + peck; the corpus's G74 peck (deep-hole, depth/dia-triggered) has distinct parameters (D peck, L retract, dwell) worth a dedicated `peck_drill` sub-family with the depth/dia trigger rule.

Lower priority (corpus-thin, but worth a stub for completeness): **`tap`** — single-point/tapped threading is RARE here (2 TAP keywords in shard 5; all threading is G71/G72 single-point), so a `tap` row is a forward-looking stub, not corpus-driven.

---

## Cross-reference summary
- **INCH** everywhere; emit IPR feeds as **per-rev** (modal G95 is the OSP default — assert this; misreading as feed/min is a 12–60× feed error).
- **G96 + G50** is the load-bearing safety+quality pairing — extend CSS to all facing/profiling/boring (not just cutoff), and make **G50-before-G96 a hard `prism_safety` invariant** to close the ~1.9% uncapped gap.
- **G85→G87 LAP define+replay** is the shop's own best idiom (~73%/69%) — PRISM should PREFER it on generation and auto-promote the ~27% longhand outliers, matching shop convention (R11) rather than forcing Fanuc cycles.
