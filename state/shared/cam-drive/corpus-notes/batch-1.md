# Profiler Shard 1 — JM Die Okuma CNC Lathe (.MIN) Corpus Analysis

> Source: `H:/prism-slot-kilo/state/shared/cam-drive/corpus-notes/_filelist.txt`, lines where (0-based index % 8 == 1).
> Control: **Okuma OSP** (NOT Fanuc). All values are **INCH** (G140 inch mode; no G20/G21, no G21 metric anywhere).
> Files are ASCII/CRLF. The canned-cycle G-codes here are **Okuma OSP dialect**, which differs sharply from the Fanuc codes named in the task prompt — see the dialect note in §Structural census.

## Shard 1 — file count
- **2070 programs** in this shard (all 2070 confirmed to exist on disk).
- Customer folders sampled: 95778 (bare), ACME, AEROTECH, AGRATI, AIR (+ many more downstream).

## Structural census (counts)

### Spindle / speed mode
| Pattern | Programs | % of 2070 | Meaning |
|---|---|---|---|
| G96 (CSS) | 1904 (1885 with `G96 S`) | ~92% | constant surface speed, used per-operation |
| G97 (direct RPM) | 1974 | ~95% | direct rpm, dominant for drill/bore/thread |
| **G50 (max-RPM cap)** | **2022** (2022 with `G50 S`) | **~98%** | max-rpm clamp — near-universal discipline |
| G96 **and** G50 cap co-present | 1859 | ~90% | **CSS is correctly paired with a G50 cap** in the overwhelming majority |
| M41 / M42 (gear range) | 577 | ~28% | low/high gear select on bigger OD work |

> **Both G96 and G97 appear in ~92%+ of programs** because JM mixes modes *within one program*: roughing/finishing OD turns run **G96 CSS** (with a `G50 Sxxx` cap), while center-drill / drill / bore / thread ops switch to **G97 direct rpm**. This is correct turning practice — CSS for diameter-varying cuts, fixed rpm for on-center drilling and threading.

### Feed mode
| Pattern | Programs | Note |
|---|---|---|
| G95 (feed/rev, IPR) explicit | 201 (~10%) | |
| G94 (feed/min, IPM) explicit | 149 (~7%) | almost always **live-tooling** ops (endmill/face-mill); reverts to G95 after |
| neither stated | ~majority | **machine default is feed-per-rev (IPR)** — feed values like `F.005`, `F.003`, `F.0015` are inch/rev. The shop relies on the OSP default G95; G94 is only declared transiently for rotary live-tool moves, then `G95` restores. |

### Cycles — Okuma OSP dialect (the important correction)
| Code seen | Programs | Okuma meaning (NOT Fanuc) |
|---|---|---|
| **G85 `N… D… U… W… F…`** | **1513 (~73%)** | **LAP roughing cycle** — D=DOC, U=X stock left, W=Z stock left, F=feed/rev; `N…` names the finish-profile block |
| **G81** | 1413 (~68%) | LAP **longitudinal** profile-definition block start (paired with the G85 above) |
| **G82** | (subset) | LAP **face** profile-definition (face grooving / facing profile) |
| **G80** | 1512 (~73%) | LAP cycle **end** |
| **G87 `N…`** | 1421 (~69%) | LAP **finish** pass replaying the named profile (Okuma's "G70"-equivalent) |
| **G71 `X… Z… B60 D… U… H… F… J… M33 M73`** | 70 | **Okuma THREADING cycle** (B=thread flank angle 60°, D=pass depth, U=spring allowance, H=thread height, J=TPI/lead, M73=thread) — this is **threading, NOT Fanuc rough-turning** |
| **G74 `X… Z… D… L… F…`** | 519 (~25%) | peck **drilling**/grooving (D=peck depth, L=retract) |
| **G76 `X/Z… A… L…`** | 132 | chamfer/corner modifier *inside* a LAP profile block (lead-in chamfer / corner round) — NOT Fanuc threading |
| G42 / G40 | 229 / 510 | tool-nose-radius comp on/off (mostly inside LAP profiles + finish bores) |
| G140 | 281 | explicit **inch** programming mode header |
| Fanuc G70/G72/G73/G75, G33 | **0** | absent — confirms the corpus is pure Okuma OSP dialect |

### Threading / parting / coolant / structure
| Pattern | Programs | Note |
|---|---|---|
| Threading (G71-thread or THREAD comment) | 72 | thread done as a discrete tool op (T0606) with G71 cycle |
| Parting/groove comment (CUTOFF/GROOVE/PART OFF) | 784 (~38%) | almost every barfed part ends in a **NAT11 CUTOFF** op |
| `NBAR / DEF WORK / CALL OBAR` (Okuma bar-feed + graphic part def) | 1283 (~62%) | barfeed/sub-call framing; ends `/GOTO NBAR` loop for next part |
| M8 coolant ON | 1994 (~96%) | |
| M9 coolant OFF | 1313 (~63%) | many programs leave M9 only at final M2/M9, not per-op |
| M3 spindle FWD | 2064 (~99.7%) | |
| Named-op sequence headers (NAT01, NAT03…) | 2068 (~99.9%) | **the structural backbone of every program** |

### Tool count per program
- Raw T-code occurrences/program: **mean 5.75, median 6, mode 7** (n=2070).
- Distinct turret positions/program ≈ **3–6 tools typical** (mean ~5 on a sampled subset). T-codes are 6-digit Okuma form `T0n0n0n` (turret / geometry-offset / wear-offset).

## Per-program structural notes (sampled, 17 read end-to-end)

All feeds below are **inch** (IPR unless the op is live-tooling G94).

1. **95778-UPSET-STOP.MIN** — Seq: OD+face rough (G97 longhand, no LAP) → center-drill → drill .728 (longhand) → endmill → back-bore 3/8 → exit (no cutoff; chucked part). G50 S800 cap present; rough uses **G97 not G96** (S650). Hand-coded turn (single `G1 X1.56` pass), no LAP. Feeds .003–.006 IPR.
2. **AGRATI/9097756.MIN** — Barfed. Seq: OD+face rough (longhand G1) → center-drill → **drill .75 via G74 peck** → carbide bore → **CUTOFF (G96 S100 + G50 S800)**. Rough is longhand single-pass; finish absent on OD.
3. **AGRATI/A909544X2.MIN** — Barfed. Seq: rough+ **G76 chamfer inside LAP** → G85 LAP turn (NTURN G81) → face finish (G96 S250 + G87 LAP finish) → cutoff. Good CSS/G50 discipline on finish + cutoff. G42/G40 comp used.
4. **ACME/THREAD 7-8 -14-ID.MIN** — G140 inch. Seq: OD rough (**3 redundant facing passes** `G1 X-.04` at Z .050/.025/.005 before LAP) → G85 LAP → center-drill → drill → OD finish (G87) → ID rough bore (longhand, **2 redundant passes**) → **THREAD 7/8-14 via G71 B60 H.070 J14 M73** → cutoff. Mixed G96 (turning) / G97 (drill, bore, thread).
5. **ACME/A-11-10583-0-A-2ND DIE.MIN** — Seq: OD rough G85 LAP → center-drill → drill .937 (6" deep longhand) → OD finish G87 → ID rough bore G85 LAP (NR02) → ID finish G87. No cutoff (chucked die). G50 S600 cap + G96 S250 rough.
6. **ACME/A33-3568-00-OD2500.MIN** — same family: OD rough LAP → drill → OD finish → ID rough LAP → ID finish. Clean LAP rough/finish pairing both OD and ID. G96/G50 on turns, G97 on drill/bore.
7. **AGRATI/A27DSL-1250.MIN** — Barfed. Seq: OD+face rough (**G97 S600, not CSS**) LAP → center-drill → drill 1.220 → OD finish G87 → **ID rough bore HAND-CODED single pass (no LAP)** → cutoff with lead-in chamfer. Inefficiency: ID bore should be a LAP.
8. **AGRATI/A9087329.MIN** — Barfed. Seq: tool-holder OD (longhand) → center-drill → drill .209 (G74 peck) → **RGH FACE GROOVE via G85+G82 LAP (G41 comp)** → FIN face groove (G87) → back-bore → cutoff. Nice face-groove rough/finish pair.
9. **AEROTECH/THREAD ID-1 3-4 -12.MIN** — Barfed. Seq: OD+face rough LAP → center-drill → drill 1.220 → OD finish → ID rough bore G85 LAP (multi-step profile) → ID finish G87 → **ID groove .062 (longhand plunge + G4 dwell)** → **THREAD 1¾-12 via G71 B60 H.085 J12** → cutoff. Full feature set in one part.
10. **AGRATI/THREAD M16X2.MIN** — Barfed, **two-station** (NAT01/02 front, NAT21/22 second pickup). Rough LAP, finish G87, **thread M16X2 via G71 B60 H.110 F.94488 J12** (lead expressed in inch! .94488"/rev ≈ 2 mm/rev → confirms inch base). Cutoff. Note: `G85 NR01` but block named `NTURN` — a naming mismatch (latent bug risk).
11. **AGRATI/A9098960.MIN** — Barfed. Seq: OD (longhand chamfer via G3) → center-drill → drill .348 (G74 peck) → rough face groove (G85+G82, G41) → fin face groove (G87) → back-bore (longhand 2-pass) → cutoff. 
12. **AIR/A05-LSC-11-B.MIN** — G140 inch. Seq: OD rough (**3 redundant facing passes**) G85 LAP → OD finish G87 → ID rough bore LAP (stepped profile) → **GROOVE .125 longhand + G4 dwell** → ID finish G87 → **THREAD 2¼-20 via G71 B60 H.053 J20** → cutoff. 
13. **AIR/A57-QC-68-B.MIN** — Short chucked part. Seq: OD+face rough (G97→G96 mid-op) → ID rough bore G85 LAP with **G76 lead chamfers inside profile** → ID finish G87. No drill, no cutoff.
14. **AIR/A0763-64-04-SLEEVE.MIN** — Barfed sleeve. Seq: OD rough LAP → center-drill → drill .610 → OD finish G87 → ID rough bore G85 LAP (G2 lead-in radius) → ID finish G87 → cutoff. Clean rough/finish discipline both surfaces.
15. **AIR/A5700-06-01-1-GENOS.MIN** — **GENOS machine variant** (`NSTRT … /CALL OBAR … /CALL OCONT … M30`). Seq: OD rough G85 LAP w/ G42+G76 chamfer → OD finish G87 → cutoff. G50 S800 program-top cap + per-op G50 S600.
16. **AGRATI/A9099957.MIN** — Barfed short part: OD longhand → center-drill → drill .375 (G74 peck) → back-turn longhand (2-pass) → cutoff. Very simple, all longhand (no LAP) — over-simple for the OD profile.
17. **AIR/A05-PP-88-01-2150.MIN** — **Most complex / live-tooling**: OD rough (**4 redundant facing passes**) longhand → cutoff-to-length → second-side OD rough G85 LAP → OD finish G87 → **LIVE ENDMILL .625 (M13 live spindle, SB=1100, M147 C-axis, G94 G1 feed/min F5., G95 restore)** → ID back-bore (longhand) → final cutoff. Uses parametric Z expressions `Z-2.4+.000`. Shows the shop's full live-tool + C-axis capability.

## Inefficiency signals observed

1. **Redundant facing/clearing passes before roughing.** Multiple programs (ACME/THREAD-7-8, AIR/A05-LSC-11-B, AIR/A05-PP-88: **3–4 passes**) repeat `G1 X-.04` at decreasing Z (.075/.050/.025/.005/0) to clear the face/end of bar stock as separate full passes before the LAP cycle. This is slow stock-clearing that a single profiled roughing pass (or a proper face cycle with stepped DOC) would absorb. Pure air-cut / chip-thinning waste.
2. **Hand-coded longhand where a LAP cycle fits.** ID bores and back-turns are frequently single- or double-pass longhand (`G1 Z-…` then a tiny X step and repeat) instead of `G85…G81/G80` LAP roughing — e.g. AGRATI/A27DSL-1250 NAT07, AGRATI/A9099957, AIR/A05-PP-88 ID bore. Single-pass deep bores risk deflection/chatter and leave inconsistent stock for finish; multi-pass LAP would be safer and more uniform. ~27% of programs have *no* G85 at all.
3. **Roughing on G97 (fixed rpm) instead of G96 CSS.** Several rough turns (95778, AGRATI/A27DSL-1250, AGRATI/A9087329) run the OD rough at fixed rpm. On a tapering/varying-diameter rough this gives non-constant SFM → uneven tool load and surface, and leaves SFM on the table at the small diameters.
4. **Big, full-rapid retracts to X20 Z20 between every op.** Every NAT op opens/closes with `G0 X20 Z20` (a far home). With 5–7 tools/program that is a lot of long rapid travel; many ops could retract to a nearer safe plane. Air-positioning time.
5. **Conservative drilling without pecking on deep holes.** Deep drills (e.g. ACME 6.0" deep `G1 Z-6. F.003` single plunge, AEROTECH 2.0") are straight-plunge `G1` with no G74 peck, while shallow holes elsewhere *do* peck. Deep no-peck drilling risks chip packing; feeds are also conservative (.002–.003 IPR).
6. **Coolant left on across whole program / no per-op M9.** Many programs only issue M9 at final M2 (M8 stays on through air moves and tool changes), and 63% lack mid-program M9.
7. **Grooving/parting relief done as a single deep plunge + G4 dwell** (AEROTECH ID groove, AIR/A05-LSC GROOVE .125) — single full-width plunge to depth rather than peck/plunge-and-shift; on wider/deeper grooves this risks chip evacuation and chatter.
8. **Latent naming bug** (data-quality): AGRATI/THREAD-M16X2 calls `G85 NR01` but defines the profile block as `NTURN G81` — mismatched profile label. A real OSP run could fault or replay the wrong profile; flagged for the learning set as a *negative* example.

## Optimization opportunities

1. **Replace redundant multi-pass face clears with a single profiled rough.** Teach PRISM to detect the 3–4× `G1 X-.04` clearing pattern and collapse it into one stepped facing cycle / properly stocked LAP entry. Biggest, most consistent cycle-time win in the corpus.
2. **Convert single/double-pass longhand bores & turns into LAP (G85/G81/G80 + G87 finish) with computed DOC and uniform stock.** Standardize a "rough-LAP + finish-LAP" pair on every OD/ID profile ≥ ~0.5" long. Improves safety (controlled DOC), surface consistency, and lets the optimizer pick DOC from material + tool.
3. **Default OD roughing to G96 CSS with a material-correct SFM and a G50 cap** (the shop already caps ~98% of the time — just extend CSS to the rough turns currently on G97). Then physics-optimize the SFM/feed per ISO material group instead of the shop's flat `S250 / F.006–.009` defaults, which look conservative for the diameters/materials.
4. **High-feed / adaptive roughing + peck-drill defaults.** Introduce HFM roughing strategy for the LAP rough passes and auto-insert G74 pecking on holes deeper than ~4–5×D; raise the very conservative .002–.003 IPR drill feeds where rigidity allows.
5. **Tighten rapid retract planes + coolant scheduling.** Replace the universal `G0 X20 Z20` between every op with a nearest-safe-plane retract, and add per-op M9/M8 so coolant isn't on during long air moves — straightforward air-time + flood savings the optimizer can apply automatically.
6. **Add lead-in/out chamfers & TNR comp consistently.** Many finish passes lack the `G76` lead chamfer / `G42…G40` comp that the better programs use; standardizing lead-in/out and corner radii improves part finish and tool entry. Use the mismatched-profile-label bug as a guard/validation rule.
