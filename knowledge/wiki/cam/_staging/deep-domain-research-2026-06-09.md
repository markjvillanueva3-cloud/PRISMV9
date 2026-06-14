---
status: VERIFIED-PARTIAL
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
owner_slot: kilo
staged_by: papa-deepdomain-research
date: 2026-06-09
galaxy: cam
focus: CAM toolpath strategy — adaptive/high-efficiency roughing, rest machining, scallop/stepover, 3+2 vs 5-axis, collision/gouge checking, feed optimization
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/cam/cam-foundations.md; numeric/safety specifics below stay owner-gated for kilo. -->**

This packet is a DEEP-DOMAIN research draft for the CAM (toolpath-strategy) galaxy. It collects high-value cited domain facts, formulas, and best practices for adaptive/HEM roughing, rest machining, scallop-height/stepover finishing geometry, 3+2 vs simultaneous 5-axis, gouge/collision checking, and feed optimization. All free/legal sources (manufacturer public docs, vendor knowledge bases, calculator references, peer-reviewed/abstract pages). Verify before use.

---

## 1. Adaptive / High-Efficiency Roughing (constant tool engagement angle)

- **Constant TEA is the defining mechanism.** Adaptive clearing (a.k.a. Volumill, Dynamic Milling, "constant tool engagement angle" toolpaths) keeps cutter load consistent by maintaining a constant engagement angle with the material, computed internally from the stepover value; it removes large amounts of stock quickly while holding constant load. (Autodesk Community / CNCCookbook HSM guide — see Sources.)
- **The problem it solves = the "tyranny of the corner."** Traditional offset/pocket toolpaths spike engagement at every internal corner and when driving into slots (constantly when slotting), which is where forces peak and tools break; constant-TEA paths take "many small scoops" instead of a sharp 90° turn. (CNCCookbook High Speed Machining guide.)
- **Low radial DOC → high axial DOC → full-flute use.** Limiting radial engagement lets you take much greater axial depths of cut, using the side/whole flute length; the older shallow-axial approach overworks the bottom of the tool and stores heat there, causing premature wear. (CNCCookbook HSM guide.)
- **Quantified MRR gain (CNCCookbook reference case).** A 1/2" endmill in 6061 aluminum at 10% radial engagement and full 1" DOC ran an HSM toolpath at 6747 rpm / 125.8 ipm (1.2 HP); without HSM the same job fell to 4272 rpm / 34.89 ipm (0.3 HP) — about **5× greater MRR** for HSM. (CNCCookbook HSM guide.) *[UNVERIFIED — material/tool-specific; do not generalize as a constant.]*
- **Quantified time gain (Autodesk reference case).** In an Autodesk test, traditional roughing took 8:09 vs adaptive clearing at 2:01 for the same part. (CTE Mag — "Autodesk: Constant cutting forces speed milling.") *[UNVERIFIED — single reference case.]*
- **Representative adaptive parameter set (illustrative, not a default):** Tool dia 8 mm, radial engagement 10%, axial depth 16 mm (2× dia), 16000 rpm, 2500 mm/min. (cnccode.com toolpath encyclopedia / tuofamachining.) *[UNVERIFIED — illustrative only.]*

## 2. Trochoidal Milling / Slots Wider Than the Tool

- **Trochoidal = low RDOC + high ADOC spiral/arc path.** A form of High Efficiency Milling (HEM); the cutter follows circular arcs (trochoids — a point on a rolling circle) while advancing, keeping radial depth low and axial depth high to reduce cutting forces, improve chip evacuation, and extend tool life. (Harvey Performance "Intro to Trochoidal Milling"; Cutwel guide.)
- **Machines slots/grooves wider than the cutter.** Trochoidal motion creates slots wider than the tool diameter via controlled circular cuts, addressing chip-clearance concerns in tight spaces — unlike conventional full-width slotting where the tool is 100% radially engaged. (cncphilosophy.com; cnccode.com encyclopedia.)
- **Wear is spread over the flute, not concentrated at the tip.** The high ADOC distributes wear/heat across a greater length of cutting edge; long non-engagement periods between teeth allow effective cooling, enabling high feed and tool life. (MFG Shop trochoidal guide; Harvey Performance.)
- **Material fit.** Cited as a strong fit for hard milling in the ~mid-40s to 55 HRC range, and effective in aluminum and titanium; promising for hard-to-cut alloys. (cncphilosophy/Iscar quote; NCBI PMC6630620 Ti-6Al-4V trochoidal study.)

## 3. Radial Chip Thinning (the reason HEM feeds are so high)

- **Trigger condition: RDOC < 50% of cutter diameter.** When radial depth of cut is below half the diameter, the cutting edge enters at a shallow angle and the physical chip is thinner than the programmed feed-per-tooth, so feed must be increased to restore proper chip thickness. (Harvey Performance "Combat Chip Thinning"; DAPRA "Radial Chip Thinning"; Machining Doctor.)
- **Radial Chip Thinning Factor (RCTF) formula:**
  `RCTF = 1 / sqrt( 1 - (1 - 2·(Ae/D))² )`
  where `Ae` = radial depth of cut (width of cut), `D` = cutter diameter. Apply: `Fz_adjusted = recommended_chip_load × RCTF`. (Machining Doctor — Chip Thinning Calculators & Formulas.)
- **Axial and radial factors are independent and multiply.** Round inserts / ball-nose tools also exhibit Axial Chip Thinning (ACTF); combine as `CTF = RCTF × ACTF`, then `Fz = recommended_chip_load × CTF`. (Machining Doctor.)
- **Practical feed multipliers (reference rules of thumb):** ~50% stepover → no adjustment; ~25% → ≈ +30% feed; ~10% → ≈ 2× feed; ~5% → ≈ 3–4× feed. (DAPRA / Harvey Performance / Machining Doctor.) *[UNVERIFIED — round-number rules; prefer the exact RCTF formula in code.]*
- **Caution (R12):** feed increase restores chip thickness but must respect tool limits — too-high chip load overloads the edge → fast wear/breakage; too-light (no thinning compensation) → rubbing instead of shearing. (Harvey Performance; DAPRA.)

## 4. Scallop (Cusp) Height & Stepover — Ball-Nose Finishing Geometry

- **Scallop-height formula:** `h = r − sqrt(r² − (p/2)²)` and inverse **stepover** `p = 2·sqrt(2·h·r − h²)`, where `r` = ball-nose radius (= d/2), `p` = stepover, `h` = scallop/cusp height. (Machining Doctor — Ball Nose Surface Finish; CutViewer; CustomPartNet.) *Note two equivalent published stepover forms: `p = 2·sqrt(r² − (r − h)²)` expands to `2·sqrt(2·h·r − h²)`.*
- **Larger tool → smaller scallop at a given stepover** (geometric); smaller stepover → smaller scallop but longer cycle time. (CustomPartNet milling-stepover; CNCCookbook stepover guide.)
- **Diminishing returns ≈ stepover below ~1/8 of diameter** (≈ 12.5% D); going lower adds time without proportional finish gain. (CNCCookbook "How To Choose a Stepover for 3D Profiling.") *[A second source — Machining Doctor — cites ~30% of the ball-nose RADIUS as the productivity/finish sweet spot; reconcile the two framings (%-of-diameter vs %-of-radius) before quoting.]*
- **Cusp → Ra estimate:** machined Ra ≈ 1/4 of cusp height for typical ball-endmill passes — a geometric estimate only; actual Ra is affected by vibration, chip recutting, springback. (Villa Machine / Theoretical Machinist surface-finish calc.) *[UNVERIFIED — rough estimate, not a guarantee.]*
- **Surface-slope dependence.** For 3D contour finishing the *effective* stepover varies with surface angle — steeper surfaces produce larger cusps at the same XY stepover; internal radii produce smaller scallops than external radii for the same tool, so finishing stepover must be adjusted to hold a consistent finish. (CustomPartNet; CNCCookbook.)
- **Effective diameter on shallow cuts.** On a small axial DOC, a ball-nose's *effective* cutting diameter (Deff) is less than nominal, which changes the correct RPM/feed and the actual scallop — compute Deff at the axial DOC before deriving surface speed. (TWC Industrial Calculators; Machining Doctor.)

## 5. Rest Machining (residual-stock / reference-tool toolpaths)

- **Purpose:** targets material a previous (larger) cutter could not reach — corners and small features — by following with a smaller cutter, so the bulk is removed fast by a big tool and only the leftover is reworked. (BobCAD "What Is CAM Software with Rest Machining"; HawkRidge SOLIDWORKS CAM.)
- **Residual-stock detection sources (Fusion CAM):** "From previous operation(s)" (considers all prior ops in the setup), "From bodies" (modeled remaining-stock bodies), or "From setup stock." SOLIDWORKS CAM analog: WIP vs "previous leftover." (Autodesk Fusion CAM help — flat/rest machining; HawkRidge.)
- **Reference-tool geometry must be entered correctly.** In Inventor HSM the workflow inputs the *last cut's* tool size (e.g. 12 mm dia, 0 mm corner radius for a flat end mill) so the remaining-stock volume is computed correctly. (GRAITEC Inventor HSM rest-machining note.)
- **Detection limit + overlap avoid slivers.** Rest machining can be "too exact," leaving thin slivers/poor boundary finish; raising the Detection Limit makes it machine only material greater than (detection_limit + stock_to_leave); BobCAD V32 added "Expand Rest Area" for clean overlap. (BobCAD; Autodesk Fusion help.)
- **Tool-sizing trade-off (R7 — surface, don't average):** a much smaller rest tool → slow MRR; same-size tool → heavy reprogramming; an intermediate tool maximizes MRR but often needs a further still-smaller pass. The CAM must compute the 3D remaining-stock volume each step to avoid cutting air or overloading. (USPTO patent 11176291 "Roughing toolpath sequences"; USPTO 6704611 "rough milling.")

## 6. Climb vs Conventional Milling (chip-thinning direction)

- **Climb (down) = thick-to-thin chip; conventional (up) = thin-to-thick.** Climb starts each tooth at maximum chip thickness (cuts immediately); conventional starts near zero thickness (rubs before it cuts). The cutting-tool industry golden rule is "thick to thin." (Harvey Performance; CNCCookbook; Xometry.)
- **Climb reduces work hardening** in tough/austenitic stainless, titanium, Inconel — because the tooth cuts rather than rubs, keeping heat off the edge; conventional's pre-cut rubbing keeps heat near the edge and can harden the surface. (Harvey Performance; Tormach.)
- **Climb generally gives better finish + lower force at exit** (chips thrown behind the cutter → less re-cutting; the down-force presses the part to the table, reducing chatter). (CNCCookbook; DATRON.)
- **Use conventional when:** machine has backlash/low rigidity, scaled/hard outer layers (castings, forgings, hot-rolled steel), or thin/tall flexible features; also if stepover > 50% D climb can give negative-rake geometry. (CNCCookbook; Harvey Performance; Tormach.)

## 7. 3+2 Positional vs Simultaneous 5-Axis

- **3+2 = lock 2 rotaries, cut 3-axis at a fixed tilt; 5-axis = all 5 interpolate continuously.** 3+2 ("five-sided") tilts the work/tool into a favorable orientation, then cuts in X/Y/Z. (Okuma blog; RapidDirect; ManufacturingTomorrow.)
- **Rigidity ranking:** both let you use shorter, more rigid tools than pure 3-axis; 3+2 generally has *better spindle rigidity than simultaneous 5-axis* and faster cycle times for features reachable at a fixed angle. (LSRPF guide; MFG Shop comparison; BobCAD.)
- **5-axis tool-rigidity/standard-length benefit (quantified, vendor-cited):** tilting the tool axis lets short toolholders machine deep cavities, raising tool rigidity by **>50%** and allowing feed/DOC increases of **20–30%** vs a long-tool 3-axis approach. (RapidDirect / Runsom comparison.) *[UNVERIFIED — vendor figure; treat as directional, not a constant.]*
- **5-axis single-setup time saving (quantified, vendor-cited):** "one clamping, 5 surfaces" can save ~25% of total processing time and eliminate datum-conversion/repositioning errors vs multi-setup work. (RapidDirect / Runsom.) *[UNVERIFIED — vendor figure.]*
- **5-axis needs RTCP/TCPC.** Rotational/Tool-Center-Point Compensation is critical to hold tool orientation correctly during simultaneous motion; 3+2 accuracy instead depends on each reorientation's alignment (small misalignments → blending issues). (BobCAD; Hurco 5-axis blog.)
- **Decision heuristic:** 3+2 for prismatic/five-sided parts (rigidity + fewer setups + simpler programming); simultaneous 5-axis for compound sculptured surfaces (turbine blades, impellers) where the tool must keep an optimal contact angle throughout. (AMP CNC; MoldMaking Technology "Five-Axis Myths.")

## 8. Gouge & Collision Checking (5-axis / multiaxis)

- **Check the whole tool assembly, not just the tip.** Collision control checks tool + holder (and shank/neck) against the part and workholding, and auto-corrects per user limits. (BobCAD multiaxis gouge-check help; GibbsCAM 5-axis.)
- **Tilt-to-avoid vs retract.** A "Tilt Tool" strategy avoids collisions by tilting the tool (neck/shank/holder clearance) instead of retracting, while honoring a minimum swing/tilt angle to avoid pole transition; a common two-stage workflow generates an initial collision-unaware path then re-tilts it within machine limits. (NX Tilt Tool Axis docs; BobCAD Tilt-Tool strategy.)
- **Lead/lag and side-tilt sign conventions.** Lead tilts the tool *forward* in the travel direction (positive); lag tilts *backward* (negative); side tilt: positive = right, negative = left of the cutting direction. Lead/lag lets a ball-nose cut with the *side* of the ball rather than the dead-center tip (tip has zero surface speed). (Hurco 5-axis blog; BobCAD gouge-check; ScienceDirect lead/tilt force study.)
- **"Between positions" gouge check is essential.** Point-based checks miss gouges on flat surfaces where points are only generated at edges; checking the 5-axis sweep move between consecutive positions catches mid-move collisions. (BobCAD "Gouge Check Between Positions.")
- **Extend-tool-to-infinity verification trick.** Extending the last-used tool portion as a cylinder to infinity helps the collision checker detect every collision along the holder/shank. (NX docs.)
- **Final layer = full machine simulation.** Beyond toolpath-time gouge/collision avoidance, kinematic machine simulation (workpiece + tools + all machine components in motion, near-miss tolerance) is the last verification before posting. (GibbsCAM/SURFCAM 5-axis; Mastercam Multiaxis.)

## 9. Cross-Cutting Best Practices for a CAM Toolpath Engine

- **Roughing→finishing pattern:** large tool + adaptive/trochoidal roughing (low RDOC/high ADOC + RCTF feed) → rest machining with progressively smaller reference tools → ball-nose finish at a stepover chosen from a target cusp height. (Synthesis of §1–§5 sources.)
- **Drive scallop from a target, not a fixed %.** Compute stepover from desired `h` via `p = 2·sqrt(2·h·r − h²)`, then sanity-cap at the ~12.5%-D diminishing-returns floor; adjust for surface slope and internal/external radius. (§4 sources.)
- **Always apply chip-thinning compensation when Ae/D < 0.5**, using the exact RCTF formula (not the round-number table), with a hard upper chip-load clamp. (§3 sources.)
- **Prefer 3+2 for prismatic features (rigidity); reserve simultaneous 5-axis for compound surfaces; require RTCP + between-positions gouge check + machine sim before posting any multiaxis path.** (§7–§8 sources.)

---

## Sources

1. CNCCookbook — *High Speed Machining (HSM) [Definitive Guide]* — https://www.cnccookbook.com/high-speed-machining-speeds-and-feeds/
2. CNCCookbook — *How To Choose a Stepover for 3D Profiling* — https://www.cnccookbook.com/cnc-stepover/
3. CNCCookbook — *Climb Milling vs Conventional Milling [Sneaky CNC Tips]* — https://www.cnccookbook.com/climb-milling-versus-conventional-milling/
4. CNCCookbook — *Complete Guide to CAM Toolpaths and Operations for Milling* — https://www.cnccookbook.com/complete-guide-to-cam-toolpaths-and-operations-for-milling/
5. Autodesk Community — *2D Adaptive clearing — can someone explain it?* — https://forums.autodesk.com/t5/fusion-manufacture-forum/2d-adaptive-clearing-can-someone-explain-it/td-p/7260319
6. Autodesk Fusion CAM Help — *Machine remaining stock (flat / rest machining)* — https://help.autodesk.com/cloudhelp/ENU/Fusion-CAM/files/MFG-3D-FLAT-REST-MACHINING.htm
7. Cutting Tool Engineering — *Autodesk: Constant cutting forces speed milling* — https://www.ctemag.com/articles/autodesk-constant-cutting-forces-speed-milling
8. Machining Doctor — *Ball Nose Surface Finish: Calculators & Formulas* — https://www.machiningdoctor.com/calculators/ball-nose-surface-finish/
9. Machining Doctor — *Chip Thinning: Calculators and Formulas (Radial and Axial)* — https://www.machiningdoctor.com/calculators/chip-thinning-calculator/
10. Machining Doctor — *Depth of Cut (Milling)* — https://www.machiningdoctor.com/machinistglossary/depth-of-cut-milling/
11. CustomPartNet — *Milling Step-over Distance* — https://www.custompartnet.com/widgets/milling-stepover
12. CutViewer — *Ball Nose Stepover & Cusp Height Calculator* — https://cutviewer.com/tools/stepover-calculator/
13. TWC Industrial Calculators — *CNC Ball Endmill Calculator — Effective Diameter & Cusp Height* — https://www.twcindustrial.com/cnc-ball-endmill-calculator/
14. Villa Machine Associates — *Ball Endmill Surface Finishing Calculator* — https://www.villamachine.com/ball-endmill-surface-finishing-calculator-how-to/
15. Theoretical Machinist — *Surface Finish Calc* — http://theoreticalmachinist.com/Surface_Finish_Calc.aspx
16. Harvey Performance (In The Loupe) — *How to Combat Chip Thinning* — https://www.harveyperformance.com/in-the-loupe/combat-chip-thinning/
17. Harvey Performance (In The Loupe) — *Intro to Trochoidal Milling* — https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/
18. Harvey Performance (In The Loupe) — *Climb Milling vs. Conventional Milling* — https://www.harveyperformance.com/in-the-loupe/conventional-vs-climb-milling/
19. DAPRA Corporation — *Radial Chip Thinning — How to Max Out Your Milling Tool Feed Rate* — https://www.dapra.com/articles/radial-chip-thinning
20. Cutwel — *Expert Guide to Trochoidal Milling* — https://www.cutwel.co.uk/blog/expert-guide-to-trochoidal-milling
21. MFG Shop — *Trochoidal and Peel Milling: A Machinist's Guide* — https://shop.machinemfg.com/trochoidal-and-peel-milling-a-machinists-guide-to-advanced-techniques/
22. CNC Philosophy — *Trochoidal Milling: A Comprehensive Guide* — https://cncphilosophy.com/trochoidal-milling/
23. NCBI PMC — *Investigation of Tool Wear and Chip Morphology in Dry Trochoidal Milling of Ti-6Al-4V* (PMC6630620) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6630620/
24. cnccode.com — *The Ultimate CNC Toolpath Strategies Encyclopedia* — https://cnccode.com/2026/03/08/the-ultimate-cnc-toolpath-strategies-encyclopedia-pocketing-adaptive-clearing-trochoidal-milling-slotting-and-high-efficiency-machining-explained/
25. BobCAD-CAM — *What Is CAM Software with Rest Machining?* — https://bobcad.com/what-is-cam-software-with-rest-machining/
26. BobCAD-CAM — *Multiaxis Feature Wizard / Gouge Check Advanced Options* — https://bobcad.com/components/webhelp/BobCADCAMV25/en/CAM/Mill/The_Multiaxis_Feature_Wizard/Tabs/Gouge_Check/Advanced_Options.htm
27. BobCAD-CAM — *Tilt Tool — Gouge Check Strategy (V31)* — https://bobcad.com/components/webhelp/BobCADCAMV31/en/Content/Merge/Linked/CAM/Multiaxis_Wizard/Settings/Gouge_Check_Linked/Tilt_Tool_Gouge_Check_Strategy.htm
28. BobCAD-CAM — *3+2 vs Full 5-Axis Machining: Key Differences, Fixtures & Programming* — https://bobcad.com/32-vs-full-5-axis-machining-key-differences-fixtures-programming/
29. HawkRidge Systems — *Explaining Rest Machining in SOLIDWORKS CAM* — https://hawkridgesys.com/blog/explaining-rest-machining-in-solidworks-cam
30. GRAITEC — *Inventor HSM Rest Machining "Not Valid Toolpath" Error Fix* — https://graitec.com/uk/blog/inventor-hsm-rest-machining-not-valid-toolpath-error-fix/
31. USPTO Patent 11,176,291 — *Roughing toolpath sequences generation for CAM* — https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11176291
32. USPTO Patent 6,704,611 — *System and method for rough milling* — https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6704611
33. Okuma — *3+2 vs. 5-Axis: What's the Difference?* — https://www.okuma.com/blog/3-plus-2-versus-5-axis
34. RapidDirect — *Simultaneous 5-Axis vs. 3+2 Axis Machining: A Detailed Comparison* — https://www.rapiddirect.com/blog/32-vs-5-axis-machining/
35. Runsom Precision — *The Difference between Simultaneous 5-Axis and 3+2 Axis Machining* — https://www.runsom.com/blog/5-axis-vs-32-axis-machining/
36. LSRPF (LS Manufacturing) — *Simultaneous 5-Axis vs. 3+2-Axis Machining: A Comprehensive Guide* — https://www.lsrpf.com/blog/simultaneous-5-axis-vs-3-2-axis-machining-a-comprehensive-guide-ls-manufacturing
37. MoldMaking Technology — *Five-Axis Myths* — https://www.moldmakingtechnology.com/articles/five-axis-myths
38. AMP CNC — *3+2 vs 5-Axis Machining: Which Is Right for Your CNC Operation?* — https://www.ampcnc.com/blog/accurate-machine-products-blogs-1/3-2-vs-5-axis-machining-97
39. Hurco — *5-Axis Programming: Understanding tool axis and collision controls* — https://blog.hurco.com/blog/bid/242006/5-Axis-Programming-understanding-tool-axis-and-collision-controls
40. Siemens NX Help — *Tilt Tool Axis enhancements* — http://www2.me.rochester.edu/courses/ME204/nx_help/en_US/tdocExt/content/1/xid505791.xml
41. ScienceDirect — *Investigation of lead and tilt angle effects in 5-axis ball-end milling processes* — https://www.sciencedirect.com/science/article/abs/pii/S0890695509001497
42. Tormach — *Climb Milling vs. Conventional Milling (Sneaky CNC Tricks)* — https://tormach.com/articles/climb-milling-versus-conventional-milling-sneaky-cnc-tricks
43. Xometry — *Climb Milling vs. Conventional Milling: Their Key Differences* — https://www.xometry.com/resources/machining/climb-milling-vs-conventional-milling/
44. DATRON — *Climb Milling vs. Conventional Milling* — https://www.datron.com/resources/blog/climb-milling-vs-conventional-milling/
