---
status: VERIFIED-PARTIAL
owner_slot: foxtrot
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: mill
domain: milling — Kienzle force, chip thinning, HSM/trochoidal, chatter stability, tool deflection
---

<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/mill/mill-foundations.md; numeric/safety specifics below stay owner-gated for foxtrot. -->

# Mill Galaxy — Deep-Domain Research Packet (UNVERIFIED)

Draft cited domain facts for the milling galaxy (foxtrot). Each claim carries an inline citation: source + where stated. Owner must re-verify against the cited source (and ideally a primary text such as the original Kienzle/Altintas papers) before promoting any value into PRISM engines, constants, or physics tables.

---

## 1. Kienzle Specific Cutting Force (the Fc backbone)

- **Core Kienzle–Victor model:** main cutting force scales as a power law in uncut chip thickness — `Fc = kc1.1 · b · h^(1−mc)`, where `b` = chip width, `h` = uncut chip thickness, `kc1.1` = specific cutting force at the normalized point `b = h = 1 mm`, and `mc` = chip-thickness exponent. Width scales linearly; thickness scales by the power law. [Wikipedia/secondary summary via WebSearch; cf. "Specific Cutting Force (KC & KC1)", Machining Doctor, https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/]
- **Definition of kc1.1:** the cutting force (in the cutting direction) required to remove a chip of cross-section 1 mm × 1 mm (1 mm thick) at 0° rake — hence the name. Reported in N/mm² (MPa). [Machining Doctor, "Specific Cutting Force (KC & KC1)", https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/]
- **mc exponent range:** the chip-thickness exponent `mc` (also written `Zc`) typically falls between **0.2 and 0.3**, material-dependent; it is the slope of `kc = f(h)` on a log-log plot. At `h = 1 mm` the exponent has no effect (`h^0 = 1`). As chip thickness drops below 1 mm, a higher `mc` raises the `kc/kc1.1` ratio — i.e. small chips cost disproportionately more force per area. [Machining Doctor, "Specific Cutting Force (KC & KC1)", https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/]
- **Milling uses MEAN chip thickness:** because chip thickness varies continuously through the arc of engagement in milling, the cutting force is evaluated at a *mean* uncut chip thickness `hm` (not the instantaneous or feed value). [Secondary summary via WebSearch of Kienzle-in-milling derivations; cross-check against primary before use]
- **Component extension:** the same power-law form extends to feed and passive (radial) forces: `Ff = kf1.1 · h^(1−mf)` and `Fp = kp1.1 · h^(1−mp)`, each with its own coefficient and exponent. [Secondary summary via WebSearch]
- **NOTE for foxtrot:** PRISM CLAUDE.md already pins canonical kc1.1 per ISO group in `mcp-server/src/physics/constants.ts` (P=1800, M=2100, K=1100, N=700, S=2800, H=3200). Do NOT inline new values — verify these external mc=0.2–0.3 figures are consistent with the per-ISO `mc` already stored, and reconcile any drift there, not in docs.

## 2. Cutting Power & Material Removal Rate (MRR)

- **MRR formula (milling):** `MRR = ap · ae · vf`, where `ap` = axial depth of cut, `ae` = radial width of cut, `vf` = table feed (mm/min). To get cm³/min from mm inputs, divide by 1000. [CADEM, "Material removal rate formula for milling, turning", https://cadem.com/material-removal-rate/ ; engineersedge calculator]
- **Net cutting power:** `Pc (kW) = (Q · kc) / 60` with `Q` in cm³/min and `kc` in N/mm² (MPa). Equivalent all-mm form: `Pc = (ap · ae · vf · Kc) / (60 × 10⁶ · η)`, where `η` = machine/drive efficiency coefficient. [Mitsubishi Materials, "Cutting Power for Face Milling", https://www.mmc-carbide.com/us/technical_information/formula/tec_milling_power_formula]
- **Worked example (tool steel, kc=1800):** ap=2 mm, ae=80 mm, vf=280 mm/min, η=0.8 → `Pc = (2·80·280·1800)/(60×10⁶·0.8) = 1.68 kW`. [Mitsubishi Materials face-milling power formula, https://www.mitsubishicarbide.net/contents/mhg/enuk/html/product/technical_information/information/formula4.html]
- **Accuracy caveat:** this indirect (kc-based) power estimate is the most common method but carries roughly **±15%** error; real draw rises further with worn tools — **a dull tool increases cutting force by ~25–50%** — plus material hardness scatter and workholding flex (10–20% calc-vs-actual variance is normal). [Machining Doctor, "Machining Power Calculator and Formulas", https://www.machiningdoctor.com/calculators/machining-power/]
- **Sizing rule:** if the computed Pc exceeds spindle motor rating, the cut stalls — destroying the tool and risking spindle bearings; always size the heaviest cut against available kW. [Machining Doctor, machining-power calculator, https://www.machiningdoctor.com/calculators/machining-power/]

## 3. Radial Chip Thinning (the low-engagement correction)

- **When it applies:** chip thinning occurs when radial engagement `ae` is **below 50% of cutter diameter** — below that, peak chip thickness is less than the programmed feed per tooth `fz`; in practice it matters most below ~30% engagement. At ≥50% (and at 100%) actual chip thickness ≈ `fz`. [Sandvik Coromant, "Entering angle and chip thickness in milling", https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness ; Machining Doctor chip-thinning calculator]
- **Radial Chip Thinning Factor (RCTF):** `RCTF = 1 / √(1 − (1 − (2·ae/D))²)`, applied as `fz_compensated = RCTF · chipload`. At **10% radial engagement, RCTF ≈ 1.67** (feed up ~67%). [DAPRA Corporation, "Radial Chip Thinning – How to Max Out Your Milling Tool Feed Rate", https://www.dapra.com/articles/radial-chip-thinning ; Machining Doctor chip-thinning calculator, https://www.machiningdoctor.com/calculators/chip-thinning-calculator/]
- **Worked example:** a 12 mm end mill at 1.2 mm radial cut (10% engagement) → RCTF ≈ 1.67, so a 1000 mm/min programmed feed must rise to ~1670 mm/min to hold effective chip thickness. [Secondary summary via WebSearch of Machining Doctor / DAPRA methodology — verify the exact RCTF arithmetic before publishing]
- **Failure mode if uncompensated:** too-thin chips fail to carry heat (the chip is the primary heat sink); the edge **rubs instead of shears**, spiking heat and slashing tool life. [Harvey Performance / In The Loupe, "Tool Deflection & Its Remedies" and chip-thinning discussion, https://www.harveyperformance.com/in-the-loupe/ ; Machining Doctor chip-thinning calculator]
- **Axial component (round/ballnose tools):** an Axial Chip Thinning Factor (ACTF) multiplies on top of RCTF — `CTF = RCTF · ACTF`; "axial" because for a round-form cutter the effective thinning is a function of axial depth. [Machining Doctor, chip-thinning calculator, https://www.machiningdoctor.com/calculators/chip-thinning-calculator/]

## 4. Entering / Lead Angle and Chip Thickness

- **Entering angle (KAPR) effect:** lowering the entering angle reduces chip thickness `hex` for a given `fz` (spreads engagement over a longer edge), enabling higher feed at equal load. Approximate feed-modification factors: **90° → ×1.0, 45° → ×1.4, 10° → ×5.8**. [Sandvik Coromant, "Entering angle and chip thickness in milling", https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness]
- **Force-direction trade:** 90° entering angle → mostly radial force (good for thin walls); 45° → balanced radial/axial (general purpose); ~10° → dominantly axial force toward the spindle (stabilizes long/slender setups). [Sandvik Coromant, "Entering angle and chip thickness in milling", https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness]
- **Round-insert range:** round inserts and peripheral milling allow feed increases of roughly **1.16× to 2.3×** depending on engagement ratio (the round-form chip-thinning analog). [Sandvik Coromant, "Entering angle and chip thickness in milling", https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness]

## 5. Tool Deflection — the L/D cantilever law

- **Cantilever model:** an end mill is a cantilever fixed at the holder, loaded at the tip. Tip deflection `δ = P·L³/(3·E·I)`, with second moment of area for a round bar `I = π·d⁴/64`. Net scaling: **`δ ∝ L³ / d⁴`**. [Harvey Performance / In The Loupe, "Tool Deflection & Its Remedies", https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/]
- **Length is cubed, diameter is fourth-power:** halving stickout length cuts deflection ~8× (and can allow ~4× more DOC by the deflection limit); **doubling diameter makes the tool 16× more rigid** (deflection 1/16). Stiffness `k = 3·E·I / L³`. [Harvey Performance / In The Loupe, "Tool Deflection & Its Remedies", https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/ ; CNCCookbook, "Who is Afraid of Tool Deflection?", https://www.cnccookbook.com/afraid-tool-deflection/]
- **Use CORE diameter, not nominal, for fluted length:** flute valleys remove material, so deflection of a long-flute tool must be computed on the **core diameter** over the fluted portion (transition to neck diameter for reached/necked tools). Using nominal cutter diameter under-predicts deflection. [Harvey Performance / In The Loupe, "Tool Deflection & Its Remedies", https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/]
- **Material lever:** Young's modulus `E` is the third rigidity variable — switching HSS → carbide is reported as roughly a **3× rigidity** gain for the same geometry (carbide E ≈ 3× HSS). [CNCCookbook, "Who is Afraid of Tool Deflection?", https://www.cnccookbook.com/afraid-tool-deflection/]
- **Dynamic side-effect:** longer stickout lowers system natural frequency (more effective mass, less stiffness), shifting/worsening chatter behavior — deflection and chatter both punish high L/D. [Secondary summary via WebSearch of tool-length / natural-frequency studies — verify against a primary modal-analysis source]

## 6. Chatter & Stability Lobe Diagrams (Altintas–Budak)

- **Zero-Order Analytical (ZOA) method:** Altintas & Budak's analytical milling-stability method approximates the periodic directional cutting-force coefficients by the zeroth-order Fourier term, yielding a closed-form stability boundary (the stability lobe diagram, SLD). Seminal paper: **Altintas Y, Budak E (1995), "Analytical prediction of stability lobes in milling," Annals of CIRP 44(1):357–362.** [MIT-hosted course PDF, "Chatter Stability of Machining Operations" (Altintas), https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf]
- **Critical (limiting) axial depth:** `a_lim = −(2π·ΛR)/(N·Kt) · (1 + κ²)`, where `ΛR`,`ΛI` are real/imag parts of the characteristic eigenvalue, `κ = ΛI/ΛR`, `N` = number of teeth, `Kt` = tangential cutting-force coefficient. Spindle speed per lobe follows from the phase/tooth-passing relation. [MIT-hosted Altintas course PDF, "Chatter Stability of Machining Operations", https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf ; cross-ref MTRC reprint, https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf]
- **Regenerative mechanism:** chatter arises from the phase shift `ε = π − 2ψ` (with `ψ = tan⁻¹ κ`) between the present vibration wave and the wave left on the previous tooth pass; the characteristic equation has a non-trivial solution only when its determinant is zero (defining the stability boundary). [MIT-hosted Altintas course PDF, https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf]
- **What the SLD buys:** the diagram plots maximum stable axial depth vs spindle speed; the "lobe" pockets at high speed let you run a *deeper* stable cut at the right RPM — MRR in HSM is principally limited by this stability boundary, not by spindle power. [MIT-hosted Altintas course PDF, https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf]
- **Low-immersion caveat:** the basic ZOA single-frequency model loses accuracy at low radial immersion (e.g. HEM/trochoidal); a multi-frequency extension (Merdol/Budak) or time-domain methods (semi-discretization, full-discretization) are needed for those regimes. [Altintas/Stépán/Merdol/Dombóvári, "Chatter stability of milling in frequency and discrete time domain," CIRP JMST, https://www.mm.bme.hu/~dombovari/Downloads/2008_CIRPJMST_AltintasStepanMerdolDombo.pdf]
- **Input requirement:** building an SLD requires the tool-tip frequency response function (FRF) — natural frequency, modal stiffness, damping — typically from tap testing; this is the single biggest data dependency for any PRISM chatter predictor. [Secondary summary via WebSearch of SLD construction guides — verify FRF/modal inputs against a primary modal-testing reference]

## 7. High-Efficiency / Trochoidal Milling (HEM) Strategy

- **HEM doctrine:** low RDOC + high ADOC (opposite of conventional high-RDOC/low-ADOC). Spreading the cut over a long flute length distributes wear/heat across more cutting edge instead of concentrating it. [Harvey Performance / In The Loupe, "Introduction to High Efficiency Milling", https://www.harveyperformance.com/in-the-loupe/intro-high-efficiency-milling/]
- **Typical parameter band:** RDOC commonly **5–15% of cutter diameter**; ADOC often **1–2× diameter** (up to full flute length). HEM holds a *constant tool engagement angle* and a *constant max chip thickness* via chip-thinning feed compensation, enabling aggressive MRR at moderate edge load. [Harvey Performance / In The Loupe, "Introduction to High Efficiency Milling", https://www.harveyperformance.com/in-the-loupe/intro-high-efficiency-milling/ ; "Intro to Trochoidal Milling", https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/]
- **Trochoidal = HEM for slots wider than the tool:** a spiral/circular toolpath cuts a slot wider than the cutter diameter at low RDOC + high ADOC, replacing the full-width plunge-slot (which is the worst-case 100%-engagement full-rubbing case). [Harvey Performance / In The Loupe, "Intro to Trochoidal Milling", https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/]
- **Small-diameter limit:** trochoidal milling is generally not advised below **0.031" (≈0.79 mm)** cutting diameter, and is risky/challenging below **0.062" (≈1.57 mm)**. [Harvey Performance / In The Loupe, "Intro to Trochoidal Milling", https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/]
- **Hard requirement:** HEM/trochoidal needs a machine + CAM stack capable of high speeds and continuously varying feed rates (to apply chip-thinning compensation through every arc) — otherwise the low-engagement passes rub and fail the tool. [Harvey Performance / In The Loupe, "Introduction to High Efficiency Milling", https://www.harveyperformance.com/in-the-loupe/intro-high-efficiency-milling/]

## 8. Climb vs Conventional Milling

- **RCTF formula is direction-independent:** the radial chip-thinning factor depends only on `ae/D` geometry, not rotation direction — climb and conventional use the same RCTF. The difference is *where* the chip is thick vs thin. [DAPRA Corporation, "Radial Chip Thinning", https://www.dapra.com/articles/radial-chip-thinning ; secondary engineering context via WebSearch]
- **Climb (down) milling:** tooth ENTERS at maximum chip thickness and exits at zero — it starts by shearing a substantial chip (less entry rubbing/work-hardening), generally giving better finish and tool life on rigid machines; preferred for low-engagement HSM toolpaths. [Secondary engineering context via WebSearch — verify against a primary text such as Machinery's Handbook before publishing as doctrine]
- **Conventional (up) milling:** tooth ENTERS at zero thickness and builds to maximum at exit — it begins by rubbing before the chip forms, so it is more prone to the heat/wear penalties that chip thinning aggravates; reserved for backlash-prone/older machines or scaled/cast surfaces. [Secondary engineering context via WebSearch — verify against Machinery's Handbook]

---

## Sources

1. Machining Doctor — "Specific Cutting Force (KC & KC1)" — https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/
2. Machining Doctor — "Machining Power Calculator and Formulas" — https://www.machiningdoctor.com/calculators/machining-power/
3. Machining Doctor — "Chip Thinning: Calculators and Formulas (Radial and Axial)" — https://www.machiningdoctor.com/calculators/chip-thinning-calculator/
4. Mitsubishi Materials (USA) — "Cutting Power for Face Milling — Technical Info / Cutting Formula" — https://www.mmc-carbide.com/us/technical_information/formula/tec_milling_power_formula
5. Mitsubishi Materials Corporation — "Formulae for Cutting Power" — https://www.mitsubishicarbide.net/contents/mhg/enuk/html/product/technical_information/information/formula4.html
6. CADEM Technologies — "Material removal rate formula for milling, turning" — https://cadem.com/material-removal-rate/
7. Sandvik Coromant — "Entering angle and chip thickness in milling" — https://www.sandvik.coromant.com/en-us/knowledge/milling/entering-angle-and-chip-thickness
8. DAPRA Corporation — "Radial Chip Thinning – How to Max Out Your Milling Tool Feed Rate" — https://www.dapra.com/articles/radial-chip-thinning
9. Harvey Performance Company / In The Loupe — "Tool Deflection & Its Remedies" — https://www.harveyperformance.com/in-the-loupe/tool-deflection-remedies/
10. Harvey Performance Company / In The Loupe — "Introduction to High Efficiency Milling" — https://www.harveyperformance.com/in-the-loupe/intro-high-efficiency-milling/
11. Harvey Performance Company / In The Loupe — "Intro to Trochoidal Milling" — https://www.harveyperformance.com/in-the-loupe/introduction-trochoidal-milling/
12. CNCCookbook — "Who is Afraid of Tool Deflection? [4 Evils + The Cures]" — https://www.cnccookbook.com/afraid-tool-deflection/
13. Y. Altintas — "Chatter Stability of Machining Operations" (MIT CBA course-hosted PDF; ZOA method + a_lim derivation) — https://academy.cba.mit.edu/classes/computer_machining/chatter.pdf
14. Altintas, Stépán, Merdol, Dombóvári — "Chatter stability of milling in frequency and discrete time domain," CIRP JMST 2008 — https://www.mm.bme.hu/~dombovari/Downloads/2008_CIRPJMST_AltintasStepanMerdolDombo.pdf
15. MTRC (Univ. of Tennessee) reprint — "Chatter Stability of Machining Operations" — https://mtrc.utk.edu/wp-content/uploads/sites/45/2020/08/manu_142_11_110801.pdf

> Primary references to verify against (free, reputable): Altintas Y, Budak E (1995) "Analytical prediction of stability lobes in milling," Annals of CIRP 44(1):357–362 (cited in source 13); Machinery's Handbook (milling speeds/feeds, climb vs conventional). Manufacturer guides (Sandvik, Mitsubishi, Harvey/Helical, DAPRA) are public and free but vendor-tuned — treat their constants as illustrative, not canonical, against PRISM `physics/constants.ts`.
