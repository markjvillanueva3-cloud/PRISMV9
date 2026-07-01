---
status: VERIFIED-PARTIAL
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
owner_slot: whiskey
staged_by: papa-deepdomain-research
date: 2026-06-09
galaxy: lathe
focus: turning physics — CSS, feed, surface finish, threading, parting/grooving, boring-bar deflection
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/lathe/lathe-foundations.md; numeric/safety specifics below stay owner-gated for whiskey. -->**

# Lathe Deep-Domain Research Packet (UNVERIFIED)

Domain: CNC turning physics for the `lathe` galaxy (owner: whiskey). Scope per task: constant surface speed (G96/G50), feed IPR↔IPM, insert nose-radius surface finish, G76 multi-pass threading, parting/grooving, boring-bar deflection. All sources are free/legal (manufacturer public references, OER pressbooks, Wikipedia, established machining references). Replace any source whiskey cannot independently confirm.

---

## 1. Constant Surface Speed (G96) and the G50 RPM cap

- **G96 reinterprets the S word as a surface speed, not RPM.** With G96 active, the programmed `S` value is a surface speed (SFM imperial / m/min metric); the control varies spindle RPM as a function of the live cutting diameter to hold cutting speed constant. `G97` cancels CSS and returns the `S` word to fixed RPM. (CNCCookbook, "G96 G-Code: Constant Surface Speed", https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/; Masso docs "G96", https://docs.masso.com.au/supported-g-codes/g96-turn-on-constant-surface-speed-css)

- **CSS RPM formula (imperial):** `RPM = (12 × SFM) / (π × D)`, where D = live diameter in inches. Metric form: `RPM = (1000 × Vc) / (π × D)` with Vc in m/min and D in mm. Worked metric check from the source: Vc constant, D=25.4 mm → 1146 RPM, D=50.8 mm → 573 RPM (halving diameter doubles RPM). (Masso docs "G96", https://docs.masso.com.au/supported-g-codes/g96-turn-on-constant-surface-speed-css)

- **G50 clamps maximum spindle RPM in CSS.** As the tool approaches part center the CSS-required RPM rises without bound (RPM→∞ as D→0 when facing), so G50 sets the ceiling for both machine safety and workholding limits — the chuck's rated holding RPM is frequently lower than the spindle's max RPM. (Machining Doctor, "G96/G97 Gcode", https://www.machiningdoctor.com/gcodes/g96-g97/; cnccode.com "G50 G-Code Explained", https://cnccode.com/2025/07/25/g50-g-code-explained-spindle-speed-limits-and-position-setting-in-cnc-turning/)

- **Threshold diameter where the cap engages:** `D_threshold = (12 × SFM) / (π × RPM_cap)` (imperial) or `(1000 × Vc) / (π × RPM_cap)` (metric). Below this diameter the spindle pins at the G50 limit; above it RPM follows the CSS formula. Worked example: `G50 S550` + `G96 S1000` → D_threshold = (12×1000)/(π×550) ≈ 6.945 in; any diameter under 6.945 runs at 550 RPM. (CNCCookbook, https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/ — worked example; cross-check with formula)

- **Best practice — spin up in G97 first, then invoke G96 for the cut.** Start the spindle in G97 at the RPM corresponding to the start-of-cut SFM/diameter, switch to G96 for the cut, and return to G97 at the end-diameter RPM before rapiding away. This avoids the large inertial RPM step (and spindle/chuck shock) that occurs if G96 is invoked at home position. CSS is unnecessary for fixed-diameter operations (drills, fixed-diameter tools). (CNCCookbook, https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/)

## 2. Feed rate: IPR ↔ IPM and the SFM→RPM→IPM→MRR chain

- **On lathes, feed is natively per-revolution (IPR / mm-per-rev), not per-minute** — because the workpiece rotates, feed is expressed as distance per spindle revolution. (Wikipedia, "Speeds and feeds", https://en.wikipedia.org/wiki/Speeds_and_feeds)

- **IPR↔IPM conversion:** `IPM = IPR × RPM`. Worked: 0.010 IPR × 1000 RPM = 10 IPM. Inverse: `IPR = IPM / RPM`. (ToolNotes "Find IPM given IPR and RPM", http://toolnotes.com/calculators/find-ipm-given-ipr-and-rpm/; Carbide Depot "Turning Formula Calculator", https://www.carbidedepot.com/formulas-turning.htm)

- **RPM from cutting speed and cut diameter (imperial):** `RPM = (SFM × 3.82) / D_cut`, equivalently `RPM = (12 × SFM)/(π × D)`. The 3.82 ≈ 12/π constant. (Carbide Depot, https://www.carbidedepot.com/formulas-turning.htm; Mitsubishi Materials "Formula for Turning", https://www.mmc-carbide.com/us/technical_information/formula/tec_turning_formula)

- **Material Removal Rate (turning):** `MRR = cutting speed × depth of cut × feed-per-rev`. Imperial convenience form: `MRR (in³/min) = DOC × feed/rev × SFM × 12`. Metric: `MRR (cm³/min) = DOC(mm) × feed(mm/rev) × Vc(m/min)`. Note feed must be per-revolution, NOT per-minute, in this form. (Carbide Depot, https://www.carbidedepot.com/formulas-turning.htm; Machining Doctor "Metal Removal Rate", https://www.machiningdoctor.com/calculators/metal-removal-rate/)

## 3. Insert nose radius → theoretical surface finish

- **Theoretical (geometry-only) surface roughness:** `Ra ≈ f² / (32 × r)` where f = feed/rev and r = nose radius (consistent length units). The cusp height left between successive feed marks scales with feed² and inversely with nose radius. (minaprem.com "Derive Formula for Surface Roughness in Turning with a Rounded Tool", http://www.minaprem.com/machining/principle/quality/derive-formula-for-surface-roughness-in-turning-with-a-rounded-tool/; FIRGELLI "Surface Finish Calculator — Theoretical Ra", https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra)

- **Metric variant of the same relation:** `Ra (µm) ≈ 46 × f² / r` with f in mm/rev and r in mm. (FIRGELLI, https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra) — WHISKEY VERIFY: confirm the 46 constant is internally consistent with f²/(32r) under unit conversion before relying on it.

- **Worked example (imperial):** f = 0.005 in/rev, r = 0.031 in → Ra = 0.005²/(32×0.031) = 0.0000252 in ≈ 25.2 µin; peak-to-valley Rmax ≈ 4×Ra. (FIRGELLI, https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra)

- **Two levers, and a real-world derating factor:** Finish improves by reducing feed or increasing nose radius — halving feed quarters theoretical Ra; doubling nose radius halves it. The formula is best-case (assumes zero vibration, sharp tool); real finish is commonly 1.5–3× worse, so target a theoretical Ra ~half of the print spec (e.g. compute for 32 µin when the print calls for 63 µin). (ToolGrit "Surface Finish (Ra) Calculator", https://www.toolgrit.com/tools/surface-finish-calculator; FIRGELLI, https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra)

## 4. Threading (G76 multi-pass, 60° form)

- **60° thread depth (profile height):** `Thread depth ≈ 0.6134 × Pitch` (metric and Unified inch threads; accounts for truncated crest/root vs the 0.75×P sharp-V single depth). (Practical Machinist "Thread depth using 60 degree", https://www.practicalmachinist.com/forum/threads/thread-depth-using-60-degree.398302/; Open Oregon Pressbooks "Unit 6: Lathe Threading", https://openoregon.pressbooks.pub/manufacturingprocesses45/chapter/unit-6-lathe-threading/) — WHISKEY VERIFY against Machinery's Handbook for the canonical 0.61343/0.57364 (major-side vs minor-side) constants.

- **External minor diameter:** `Minor Dia = Major Dia − 2 × Thread depth`. (cncmakers.com "Thread diameter calculation formula", https://cncmakers.com/cnc/Tech_Support/Thread_diameter_calculation_formula.html)

- **G76 constant-volume infeed — depth of the Nth pass:** the cycle takes a first-pass depth and computes the rest as `depth(N) = TotalDepth / √N`, so each pass removes a progressively smaller depth (constant chip area) to level tool load as flank width grows. Haas form: first cut D, cumulative depth at pass N = `D × √N`. Worked (total depth 1.534 mm): 1.534, 1.084, 0.885, 0.767, … (Haas "G76 Threading Cycle", https://www.haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=G76.html; GcodeTutor "G76 Screw Thread Cycle", https://gcodetutor.com/cnc-machine-training/g76-thread-cycle.html)

- **Flank (angled) infeed reduces chatter on 60° threads.** A threading address of A58–A60 produces ≈29–30° flank infeed (one-side cutting) vs straight radial plunge; Haas recommends A59 to reduce chatter on a 60° included thread (A defaults to 0 = radial if omitted). (Haas "G76 Threading Cycle", https://www.haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=G76.html; Practical Machinist "g76 for dummies", https://www.practicalmachinist.com/forum/threads/g76-for-dummies.188082/)

- **Use G97 (fixed RPM) for threading, NOT G96.** The lead must stay synchronized to spindle revolution; CSS RPM variation breaks pitch synchronization. (CNCCookbook G96 page, https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/ — lists threading among G97 operations) — WHISKEY VERIFY: cross-check that the target control inhibits CSS during threaded cycles.

## 5. Parting-off and grooving

- **Reduce feed near center.** Sandvik guidance: substantially reduce feed (up to ~75%) as the cut approaches ~0.080 in (2 mm) from center, because CSS RPM maxes out and cutting speed collapses toward zero at center, forcing the insert to push rather than shear. (Production Machining "5 Process Security Tips for Parting Off", https://www.productionmachining.com/articles/five-process-security-tips-when-parting-off; Sandvik Coromant "Parting off", https://www.sandvik.coromant.com/en-us/knowledge/parting-and-grooving/parting-off)

- **Do not feed all the way to dead center; cap RPM with G50.** Stopping just before centerline (or using a sub-spindle twist-off) avoids the slow-speed BUE/rubbing zone and centrifugal-throw risk; turn off coolant once RPM is maxed/decreasing. (Production Machining, https://www.productionmachining.com/articles/five-process-security-tips-when-parting-off)

- **Chip must be narrower than the groove.** In the confined parting slot there is little room to break chips; a chipformer geometry that folds the chip lengthwise into a tight "clock-spring" narrower than the slot is required, or the groove jams → tool breakage. High-pressure through-tool coolant (commonly cited ≥50–80 bar by material) aids evacuation, cooling, and finish. (Sandvik Coromant "Parting off", https://www.sandvik.coromant.com/en-us/knowledge/parting-and-grooving/parting-off; Cutting Tool Engineering "Time to part", https://www.ctemag.com/articles/time-part)

- **Narrowest practical insert, short overhang, on-center height.** Narrow insert (typ. 1.5–3 mm) minimizes cutting force, deflection, and material waste (critical for costly Inconel/Ti); the blade is a thin cantilever, so keep overhang ≈ part radius + ~2 mm clearance and align the tip to spindle centerline (below-center increases edge force and can shear the insert). (Sandvik Coromant "Parting off", https://www.sandvik.coromant.com/en-us/knowledge/parting-and-grooving/parting-off; Practical Machinist "Parting Off — Part 1", https://www.practicalmachinist.com/cutting-tools/parting-off-part-1-basic-principles-and-challenges/)

- **Grooving vs parting:** grooving does not cut to center, so the center-speed-collapse problem is avoided; emphasis shifts to groove shape, dimensional accuracy, and finish. G75 (Fanuc-style) peck-grooving cycle automates depth control with retract-to-break, but avoid full/deep retracts that re-enter on a hard ridge. (cnccode.com "CNC Grooving & Parting Cycles G75/G74", https://cnccode.com/2025/10/10/cnc-grooving-parting-cycles-g75-g74-and-advanced-lathe-grooving-explained/)

## 6. Boring-bar deflection and L/D limits

- **Cantilever deflection scales with overhang cubed:** `δ = F·L³ / (3·E·I)`, with moment of inertia `I = π·D⁴/64`. Doubling overhang L → 8× deflection; doubling bar diameter D → 16× rigidity. Overhang (cubed) is the dominant lever; diameter (4th power) is the strongest stiffener. (Cutting Tool Engineering "Boring: Calculating deflection", https://www.ctemag.com/articles/boring-calculating-deflection; Kennametal "Boring Bar Deflection Calculator", https://www.kennametal.com/us/en/resources/engineering-calculators/turning-calculators/boring-bar-deflection.html)

- **Stable L/D (overhang ÷ bar diameter) by shank material — conservative builder limits (Haas):** steel ≈ 3:1, solid carbide ≈ 5:1. (Haas "Lathe Chatter — Troubleshooting TG0092", https://www.haascnc.com/service/troubleshooting-and-how-to/troubleshooting/lathe-chatter---troubleshooting.html)

- **Broader L/D spectrum from tooling references:** steel ~4:1, heavy-metal (tungsten) ~6:1, solid carbide ~8:1 (carbide ≈ 3× Young's modulus of steel), anti-vibration/dampened bars ~10–14:1. Treat the lower (Haas) numbers as safe defaults and the higher numbers as expert/rigid-holder maxima. (JMI "Boring Bar Selection: L/D Ratio 4,6,8,10", https://www.jonesmarketinginc.com/news/boring-bar-selection-choosing-the-correct-length-to-diameter-ratio-4-6-8-10; Cutting Tool Engineering "Strictly Boring", https://ctemag.com/articles/strictly-boring/) — WHISKEY VERIFY: the 3:1–5:1 (Haas) vs 4:1–8:1 (tooling vendors) spread is a real conflict; pick the conservative number as the engine default and surface the optimistic one as an experienced-operator override (R7).

- **Setup caveats that gate the L/D limits:** the limits assume a rigid holder (reamed-bore + compression-slot beats 3/4-setscrew QCTP holders) and a clamp length of ≈3–4 bar diameters; over-long overhang plus light cuts (<~0.060 in) on long bars worsens chatter because chip load drops below the threshold that damps the bar's natural frequency. (Octane Workholding "Boring Tips and Tricks", https://www.octaneworkholding.com/pages/boring-tips-and-tricks; Industrial Monitor Direct "Eliminating Boring Bar Chatter", https://industrialmonitordirect.com/blogs/knowledgebase/eliminating-boring-bar-chatter-in-cnc-lathe-deep-bore-operations)

---

## Sources

1. CNCCookbook — "G96 G-Code: Constant Surface Speed CNC Programming" — https://www.cnccookbook.com/g96-g-code-constant-surface-speed-cnc/
2. Masso Documentation — "G96 — Turn on Constant Surface Speed (CSS)" — https://docs.masso.com.au/supported-g-codes/g96-turn-on-constant-surface-speed-css
3. Machining Doctor — "G96 / G97 Gcode: Programming Examples & Theory" — https://www.machiningdoctor.com/gcodes/g96-g97/
4. cnccode.com — "G50 G-Code Explained: Spindle Speed Limits and Position Setting in CNC Turning" — https://cnccode.com/2025/07/25/g50-g-code-explained-spindle-speed-limits-and-position-setting-in-cnc-turning/
5. Wikipedia — "Speeds and feeds" — https://en.wikipedia.org/wiki/Speeds_and_feeds
6. ToolNotes — "Find IPM given IPR and RPM" — http://toolnotes.com/calculators/find-ipm-given-ipr-and-rpm/
7. Carbide Depot — "Turning Formula Calculator" (SFM/RPM/IPR/IPM/MRR) — https://www.carbidedepot.com/formulas-turning.htm
8. Mitsubishi Materials USA — "Formula for Turning — Technical Info/Cutting Formula" — https://www.mmc-carbide.com/us/technical_information/formula/tec_turning_formula
9. Machining Doctor — "Metal Removal Rate: Calculator, Formulas & Theory" — https://www.machiningdoctor.com/calculators/metal-removal-rate/
10. minaprem.com — "Derive Formula for Surface Roughness in Turning with a Rounded Tool" — http://www.minaprem.com/machining/principle/quality/derive-formula-for-surface-roughness-in-turning-with-a-rounded-tool/
11. FIRGELLI Engineering — "Free Surface Finish Calculator — Theoretical Ra" — https://www.firgelliauto.com/blogs/engineering-calculators/surface-finish-calculator-theoretical-ra
12. ToolGrit — "Surface Finish (Ra) Calculator" — https://www.toolgrit.com/tools/surface-finish-calculator
13. Haas Automation — "G76 Threading Cycle, Multiple Pass (Group 00)" — https://www.haascnc.com/service/codes-settings.type=gcode.machine=lathe.value=G76.html
14. GcodeTutor — "G76 Screw Thread Cycle" — https://gcodetutor.com/cnc-machine-training/g76-thread-cycle.html
15. Practical Machinist — "Thread depth using 60 degree" — https://www.practicalmachinist.com/forum/threads/thread-depth-using-60-degree.398302/
16. Practical Machinist — "g76 for dummies" — https://www.practicalmachinist.com/forum/threads/g76-for-dummies.188082/
17. Open Oregon Pressbooks (Manufacturing Processes 4-5) — "Unit 6: Lathe Threading" — https://openoregon.pressbooks.pub/manufacturingprocesses45/chapter/unit-6-lathe-threading/
18. cncmakers.com — "Thread diameter calculation formula" — https://cncmakers.com/cnc/Tech_Support/Thread_diameter_calculation_formula.html
19. Sandvik Coromant — "Parting off" — https://www.sandvik.coromant.com/en-us/knowledge/parting-and-grooving/parting-off
20. Production Machining — "5 Process Security Tips for Parting Off" — https://www.productionmachining.com/articles/five-process-security-tips-when-parting-off
21. Cutting Tool Engineering — "Time to part" — https://www.ctemag.com/articles/time-part
22. cnccode.com — "CNC Grooving & Parting Cycles: G75, G74, and Advanced Lathe Grooving Explained" — https://cnccode.com/2025/10/10/cnc-grooving-parting-cycles-g75-g74-and-advanced-lathe-grooving-explained/
23. Practical Machinist — "Parting Off — Part 1: Basic Principles and Challenges" — https://www.practicalmachinist.com/cutting-tools/parting-off-part-1-basic-principles-and-challenges/
24. Cutting Tool Engineering — "Boring: Calculating deflection" — https://www.ctemag.com/articles/boring-calculating-deflection
25. Kennametal — "Boring Bar Deflection Calculator" — https://www.kennametal.com/us/en/resources/engineering-calculators/turning-calculators/boring-bar-deflection.html
26. Haas Automation — "Lathe Chatter — Troubleshooting (TG0092)" — https://www.haascnc.com/service/troubleshooting-and-how-to/troubleshooting/lathe-chatter---troubleshooting.html
27. Jones Marketing Inc (JMI) — "Boring Bar Selection: Choosing The Correct Length To Diameter Ratio: 4, 6, 8, 10" — https://www.jonesmarketinginc.com/news/boring-bar-selection-choosing-the-correct-length-to-diameter-ratio-4-6-8-10
28. Cutting Tool Engineering — "Strictly Boring" — https://ctemag.com/articles/strictly-boring/
29. Octane Workholding — "Boring Tips and Tricks" — https://www.octaneworkholding.com/pages/boring-tips-and-tricks
30. Industrial Monitor Direct — "Eliminating Boring Bar Chatter in CNC Lathe Deep Bore Operations" — https://industrialmonitordirect.com/blogs/knowledgebase/eliminating-boring-bar-chatter-in-cnc-lathe-deep-bore-operations
