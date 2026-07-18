---
title: WEDM Foundations — spark-erosion mechanism, dielectric, wire, multi-pass skim, taper method
galaxy: wedm
owner_slot: mike
status: VERIFIED-PARTIAL
verified_by: "papa-workflow (claude-b5de5424, 2026-06-09); deepened by papa-workflow (claude-b5de5424, 2026-06-09) — gov-report + peer-reviewed categories added; 2nd deepening pass by papa-workflow (2026-06-10) — flushing-taxonomy / debris-short-circuit / wire-tension / MRR-TWR-polarity sections added from 5 not-previously-cited peer-reviewed open-access reviews"
verification_method: "method/standards/qualitative facts WebFetch-confirmed against cited sources. Original pass: vendor (Xometry, Modern Machine Shop, MoldMaking Technology) + MDPI/PMC peer-reviewed. 1st deepening pass (2026-06-09) broadened into UNTAPPED categories: U.S. GOVERNMENT REPORTS (NIST EDM-Charpy publications, DOE/Sandia SAND2022-6018) + additional PEER-REVIEWED open-access reviews (PMC6356492 ceramics-EDM, PMC7464327 powder-mixed-EDM), plus free-courseware pointers (NPTEL IIT, MIT OCW 2.008). 2nd deepening pass (2026-06-10, §10-§13) added 5 NOT-previously-cited peer-reviewed open-access reviews: PMC6909068 (powder-mixed-EDM flushing taxonomy), PMC6384716 (ultrasonic-vibration EDM debris/short-circuit mechanism), Frontiers fmech 2024.1322605 (comprehensive WEDM review — wire tension/vibration), PMC8839225 (die-sinking EDM performance-measure definitions), PMC6470516 (stainless-steel EDM polarity/pulse tradeoffs). ALL numeric cutting constants (discharge energy, plasma/crater temperature ranges, MRR, recast thickness, Ra values, ANOVA percentages, conductivity thresholds, spark-gap/offset dimensions) left owner-gated because PRISM sources physics numbers ONLY from mcp-server/src/physics/constants.ts, never from the web"
tags: [wedm, edm, spark-erosion, dielectric, deionized-water, wire-electrode, zinc-coated-brass, multi-pass-skim, taper-cutting, surface-finish, recast-layer, plasma-channel, pulse-on-off, assisting-electrode, conductivity-threshold, nist, doe-sandia, flushing-method, debris-short-circuit, wire-tension, polarity, tool-wear-rate, ultrasonic-vibration, white-layer, heat-affected-zone]
---

# WEDM Foundations

The domain-knowledge spine for the **wedm** galaxy: the qualitative process mechanism, materials, and method framing for wire electrical-discharge machining. Promoted from the deep-domain research packet (`knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md`) after papa WebFetch-confirmed the **method / standards / qualitative** claims against their cited sources.

**SAFETY-CRITICAL GALAXY — promotion boundary.** Only process *method* descriptions, formula *structure/geometry*, vendor/standards *pointers*, and qualitative domain facts are promoted here. **Every numeric cutting constant** (discharge-energy figures, MRR magnitudes, recast-layer thicknesses, Ra values, ANOVA contribution percentages, spark-gap / offset / kerf dimensions, temperatures) stays **UNVERIFIED and owner-gated** in `_staging/` for mike — PRISM sources physics numbers ONLY from `mcp-server/src/physics/constants.ts` (and the JM Die FA-S extracted tables), never from the web. See **## Owner-gate (NOT promoted)** below.

## 1. The process mechanism (non-contact spark erosion)

**CONFIRMED** against [Xometry — Wire EDM Machining](https://www.xometry.com/resources/machining/wire-edm-machining/):
- Wire EDM "uses a thin electrically charged wire to cut conductive materials through controlled electrical discharges." The wire **does not contact the workpiece** — material is eroded by "electrical sparks between a wire electrode and the workpiece, eroding material without physical contact."
- Because there is no mechanical contact, there is **no tool-pressure cutting force** deflecting the part — a defining advantage over chip-forming processes (mill/lathe). Material is removed by melting/vaporization at the spark site, not by chip formation.

**Design implication for wedm:** the physics surface is electrical (discharge energy, pulse-on/pulse-off, gap voltage, dielectric flushing), NOT mechanical (Kienzle / Taylor / specific-cutting-energy do not apply). This matches the galaxy `CLAUDE.md` §2 hard rule.

## 2. The dielectric (deionized water + its three roles)

**CONFIRMED** against [Xometry — Wire EDM Machining](https://www.xometry.com/resources/machining/wire-edm-machining/):
- "**Deionized water** serves as the dielectric fluid, filtered to maintain performance."
- The dielectric performs three roles: **insulation** ("dielectric fluid providing insulation and cooling"), **cooling** ("cools the cutting zone"), and **debris flushing** ("clears debris"). It insulates the gap until breakdown, cools to limit recast, and flushes eroded debris to prevent secondary discharges / short-circuits.

**Note (gated):** resistivity/conductivity *magnitudes* for the working dielectric vs. ultrapure water are numeric and remain owner-gated below.

## 3. The wire electrode (brass / zinc-coated brass)

**CONFIRMED** against the peer-reviewed MDPI Micromachines study [Enhancing Wire-EDM Performance with Zinc-Coated Brass Wire Electrode and Ultrasonic Vibration (PMC10140967)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10140967/):
- Plain brass wire is a **CuZn37-type alloy** — copper ~62-64%, zinc the remainder (i.e. the ~60-65% Cu / ~35-40% Zn family).
- **Zinc-coated brass wire improves WEDM performance**: it "produce[s] smoother surfaces and reduce[s] wire breakage during WEDM operations," with "better electrical conductivity and corrosion resistance compared to brass electrode materials."

**Owner-gate caveat (left in `_staging`):** the *mechanism* the packet attributes to the coating — that zinc beyond ~40% forms a brittle **gamma phase** that cannot be drawn (hence zinc is applied as a coating over a brass/copper core rather than alloyed throughout), and that faster zinc vaporization aids flushing — was **NOT confirmed by this source** (PMC10140967 attributes the benefit to conductivity/corrosion resistance and does not discuss the gamma-phase draw limit). That metallurgical mechanism stays UNVERIFIED for mike to re-source. Coating thicknesses and diffusion-zone percentages are numeric and also gated.

## 4. Multi-pass strategy (rough cut + skim/trim passes)

**CONFIRMED** against [Modern Machine Shop — Buying a Wire EDM, Part 3: Speed, Accuracy and Finish](https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish):
- The standard strategy is **one roughing pass followed by one or more skim (trim) passes**: "The first pass is generally a roughing pass designed to cut as quickly as possible, while accuracy and surface finish are less of a concern."
- "Each subsequent skim cut travels at progressively faster speeds, takes less and less material while steadily improving dimensional accuracy." Finer finishes require more skim passes (the article notes "as many as six or seven skim cuts" for the finest finishes — *that count is method framing; specific Ra targets are gated below*).
- During finish passes the parameters change qualitatively: "the tension on the wire is increased, the current is reduced, and the voltage gap narrowed."

**Design implication:** model wedm cuts as a pass-sequence (1 rough → N skim) where each skim raises wire tension, lowers current, and narrows the gap. This matches `EDMMultiPassStrategyEngine`.

## 5. Taper cutting (differential guide motion + angular error)

**CONFIRMED** against [MoldMaking Technology — Taper Angles and Wire EDM](https://www.moldmakingtechnology.com/articles/taper-angles-and-wire-edm) and [Modern Machine Shop — More Accurate Taper Cutting with Wire EDM](https://www.mmsonline.com/articles/more-accurate-taper-cutting-with-wire-edm):
- A taper/cone is programmed with **the upper end on the U/V axes and the lower end on the X/Y axes**: "he or she programs one end (top side) for U- and V-axis movement and the other end (bottom side) for X- and Y-axis movement."
- **Angular error arises from differential traverse speed**: "The U and V axes will be travelling at a much slower speed to machine the upper (or smaller) radius than the X and Y axes will be travelling to machine the lower (or larger) radius," so the slower-moving end over-erodes ("an overburn where the part shape is tighter or narrower").
- **Compensation is empirical, from a test cut in the operator's own material**: "The appropriate compensation values are based on a simple test cut that the customer must do using his or her material and cutting parameters. The cutting results are measured and the resulting data is plugged into a formula that then provides the [compensation] value for each cutting pass." Modern controls "offset the wire or change the taper angle" to compensate.

**Design implication:** taper compensation values are NOT constants — they are derived per-material/per-machine from a test cut. Any wedm taper engine must take a calibration input, not hardcode an angular-error figure.

## 6. The single-spark discharge cycle (plasma channel, four phases) — peer-reviewed theory

**CONFIRMED** against the open-access peer-reviewed review [Recent Advances and Perceptive Insights into Powder-Mixed Dielectric Fluid of EDM (PMC7464327)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7464327/):
- The discharge begins when **the power supply generates a voltage between the two electrodes** (wire and workpiece) across the dielectric-filled gap.
- As the electrode approaches the workpiece and the gap voltage reaches a critical threshold, **dielectric breakdown occurs in the fluid, forming a plasma channel and a small spark** — ionization creates a conductive path through the otherwise-insulating medium.
- Each spark melts and vaporizes material at the electrode–workpiece interface; **when the pulse ends the plasma channel collapses and the dielectric flushes the eroded debris** out of the gap.
- **Pulse-on vs pulse-off timing is load-bearing for stability (qualitatively):** during *pulse-on* the discharge actively removes material; during *pulse-off* the dielectric **deionizes, cools the gap, and clears debris**, so the next discharge can initiate cleanly and unwanted continuous arcing / short-circuits are avoided.

This is corroborated by the ceramics-EDM review [Electro-Discharge Machining of Ceramics — A Review (PMC6356492)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6356492/): "discharge occurs, which allows the establishment of a plasma channel through which current flows"; once energy input stops the plasma collapses, the gas bubble deflates, and the dielectric flushes removed particles away.

**Design implication:** model a wedm cut as **thousands of independent discharge cycles per second**, each gated by pulse-on (erode) / pulse-off (re-ionize + flush). The pulse-on/pulse-off *ratio* is the primary control axis (matching the ACU E-code pass families) — but every spark-energy / temperature / frequency *magnitude* is a numeric constant and stays owner-gated below.

## 7. Conductivity threshold + assisting-electrode method (why EDM is hardness-independent) — peer-reviewed theory

**CONFIRMED** against [Electro-Discharge Machining of Ceramics — A Review (PMC6356492)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6356492/):
- The defining EDM advantage is restated rigorously: **material removal is thermal (melt/vaporize), so the process "does not depend on the hardness and brittleness of the material."** This is why EDM machines extremely hard tool steels, carbides, and conductive ceramics that would destroy a conventional cutter — the work resistance the galaxy models is *electrical*, not mechanical.
- **EDM requires a minimum electrical conductivity** in the workpiece. Naturally-conductive ceramics (e.g. TiN, TiB2, SiC) can be EDM'd directly; **electrically non-conductive ceramics (Al2O3, ZrO2, Si3N4) cannot sustain discharges directly.**
- **The Assisting-Electrode Method** makes non-conductors machinable: a conductive layer is deposited on the workpiece surface so discharges can repeat — the method works by "stable repetition of this sequence of removing the formed layer and deposition of a secondary layer." (The exact conductivity *threshold figure* is numeric and stays owner-gated below.)

**Design implication for wedm:** a feasibility/triage engine should gate on **"is the workpiece electrically conductive enough to EDM?"** before any cut planning — a non-conductive ceramic is out-of-process (or needs an assisting-electrode setup), regardless of geometry. Hardness is NOT a feasibility blocker; conductivity is.

## 8. Recast layer + heat-affected surface integrity (NIST + DOE government reports)

**CONFIRMED** against the U.S. government report [NIST — Effect of Electrical Discharge Machining (EDM) on Miniaturized Charpy Test Results](https://www.nist.gov/publications/effect-electrical-discharge-machining-edm-miniaturized-charpy-test-results) (and its companion [Effect of EDM on Charpy Test Results from Miniaturized Steel Specimens](https://www.nist.gov/publications/effect-electrical-discharge-machining-edm-charpy-test-results-miniaturized-steel)):
- NIST defines EDM as a process where "a desired shape is obtained through electrical discharges between an electrode and a workpiece, separated by a dielectric fluid" — the same non-contact thermal mechanism, stated by a standards/measurement authority.
- **EDM produces a recast layer** on the workpiece surface which, in carbon steels, is **typically harder and more brittle than the base metal and may be characterized by microcracks.** The magnitude of EDM-induced hardening **varies with the steel's carbon content** (the specific hardness percentages and the recast-thickness figure are numeric and stay owner-gated below).
- Honest scope note (R12): in NIST's *own* Charpy specimens the study "[did] not indicate a detrimental effect of EDM on the impact toughness of the materials investigated" and no microcracks were actually observed in the tested specimens — i.e. the recast layer's *potential* embrittlement is real and material-dependent, not a guaranteed failure mode. A wedm quality engine should treat recast embrittlement as a **risk to characterize per-material**, not a fixed penalty.

**CONFIRMED** against the U.S. Department of Energy / Sandia National Laboratories report [SAND2022-6018 — Electrical-Discharge-Machining (OSTI 1871371)](https://www.osti.gov/servlets/purl/1871371/):
- During wire EDM, **the surface of the brass wire volatilizes**, leaving a **recast contamination layer on both the cut component surface AND adjacent surfaces** in the cutting zone — connecting the wire metallurgy (§3) directly to the surface-integrity story.
- **The EDM recast layer consists of a Cu-Zn residue** transferred from the brass wire — a concrete, government-confirmed composition for the recast contamination.
- **Recast layers are historically removed two ways:** (a) **mechanical** methods (milling or grinding the affected layer away), or (b) **finer / lower-voltage EDM finishing cuts** that avoid triggering brass volatilization — which is the surface-integrity rationale behind the §4 skim-pass strategy (each finer skim leaves less recast).
- Removal **gets harder as feature complexity increases and feature size decreases** — small/intricate geometry constrains both mechanical and EDM finishing access (a DFM signal: very fine internal features carry residual recast that is impractical to clean up).

**Design implication:** the §4 multi-pass skim strategy is not only a dimensional-accuracy story — it is also a **recast/HAZ minimization** strategy. A wedm surface-integrity engine should (1) flag recast as a Cu-Zn contamination + embrittlement risk, (2) treat finish skim passes as recast-reduction, and (3) warn when fine internal features make recast removal impractical.

## 9. Free-courseware + textbook pointers (untapped category — pointers only)

These are real, free, legal college-courseware / textbook sources for the WEDM *method/theory* (the §6–§8 mechanism above is the kind of content they cover). Listed as **pointers** because the live course pages are JS-rendered / access-gated and did not return confirmable body text via WebFetch (so no specific claim is promoted from them — R12):
- **NPTEL (Govt. of India / IITs) — Advanced Machining Processes** ([IIT Kanpur archive course 112104028](https://archive.nptel.ac.in/courses/112/104/112104028/); IIT Guwahati NOC course `noc22_me119`, Prof. Manas Das) — free IIT courseware whose EDM/W-EDM module covers principle, applications, and process modelling; standard reference textbooks it cites include V. K. Jain, *Advanced Machining Processes*; G. F. Benedict, *Nontraditional Manufacturing Processes*; J. A. McGeough, *Advanced Methods of Machining*; H. El-Hofy, *Advanced Machining Processes*.
- **MIT OpenCourseWare — 2.008 Design and Manufacturing II** ([course page](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/)) — free MIT courseware on manufacturing-process physics (the OCW manufacturing courses do not carry a standalone WEDM lecture-note PDF, so cited as a process-physics courseware pointer only).

mike: these are the next sources to mine for *additional* gated/numeric content against the JM Die FA-S tables — they are legal and free, just not WebFetch-renderable as plain text from here.

## 10. Dielectric flushing — the named-method taxonomy + debris-evacuation mechanism (peer-reviewed, 2nd-pass deepening)

**CONFIRMED** against the open-access systematic review [A systematic review on powder mixed electrical discharge machining (PMC6909068)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6909068/):
- **Why flushing is mandatory:** "the presence of debris in the inter-electrode gap reduces process efficiency" and debris "might initiate arcing which deteriorates dimensional accuracy" and "surface integrity." Flushing is therefore not a convenience — it gates whether the next discharge initiates as a clean spark vs. a degrading arc.
- **The six named flushing techniques** (a method taxonomy, no numbers): **side flushing · suction through the electrode · pressure through the electrode · jet flushing · vacuum flushing · injection flushing.**
- **Servo-controlled reciprocation / vibrating electrode:** the latest technology uses "servo-controlled cyclic reciprocation or vibrating tool electrode which will create a **hydraulic pumping action** that helps chip removal from the inter-electrode gap" — i.e. mechanical motion replaces an external pressure/suction loop.

**Design implication for wedm:** a flushing/feasibility engine should carry flushing *mode* as a first-class categorical input (one of the six methods, or vibration-assisted reciprocation), because the same discharge parameters behave differently under good vs. starved flushing. This is the method substrate behind the §6 pulse-off "deionize + clear debris" phase.

## 11. Debris in the spark gap — the short-circuit / abnormal-discharge failure mode (peer-reviewed)

**CONFIRMED** against the open-access overview [Ultrasonic Vibration Assisted Electro-Discharge Machining (EDM) — An Overview (PMC6384716)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6384716/):
- When eroded debris accumulates in the machining gap it **"decreases the resistance in this gap,"** which **"becomes the reason behind the occurrences of abnormal discharges in the short circuit."** The downstream effect is concrete: "significant increase in tool wear become obvious and MRR becomes slower."
- **Quick debris cleansing is load-bearing for process performance:** "quick cleansing of debris from the sparking gap contributes to the enhancement of efficiency and this phenomena plays a crucial role on the process performance."
- **How vibration assists (qualitatively):** vibration creates a "high frequency altering pressure change of the dielectric into the spark gap" and "aids in perfect dielectric circulation, thus, removing the accumulated debris particles from the working gap."

**Design implication:** model gap state as a stability variable, not just an energy setting — a wedm controller/quality engine should treat *short-circuit / abnormal-discharge rate* as a symptom of flushing starvation (too much debris → resistance drop → arcing), distinct from an under-energy condition. This is the mechanistic "why" behind a wedm machine's auto-retract / spark-out behavior.

## 12. Wire tension, wire vibration, and the dielectric's recast role (peer-reviewed WEDM review)

**CONFIRMED** against the open-access [Frontiers in Mechanical Engineering — Comprehensive review on wire electrical discharge machining: a non-traditional material removal process](https://www.frontiersin.org/journals/mechanical-engineering/articles/10.3389/fmech.2024.1322605/full):
- **The discharge initiates by impurity migration in the field:** "When a DC voltage applies across them, a strong electric field is created in the space. The impurities in the dielectric fluid are drawn to this electric field and concentrate where it is highest" — i.e. dielectric contamination is part of *how* breakdown localizes, which is another reason the dielectric must be filtered (§2).
- **Wire-tension physics (qualitative):** "If the WT [wire tension] is sufficiently high, the wire remains straight; otherwise the wire drags." Straightness directly governs accuracy — this is the mechanism behind the §4 finish-pass rule "the tension on the wire is increased."
- **Vibration-assisted flushing (the up/down draw):** "Clean dielectric is drawn into the gap as the tool or workpiece goes either upward or downward, and the debris is driven out of the cutting gap when those movements occur."
- **The dielectric shapes the recast layer:** "The hardness and chemical make-up of the specimen are affected by the recast layer because various dielectric materials cool at different speeds and have distinct chemical composition" — connecting the §8 recast/surface-integrity story to the *choice* of dielectric, not just to pulse energy.

**Design implication:** wire tension is a *first-class accuracy input* (straight wire vs. dragging wire), and dielectric identity is a *recast-property input* — both belong in a wedm process model alongside pulse parameters, not as fixed assumptions.

## 13. Conceptual definitions of MRR / tool-wear / polarity + pulse-on/off tradeoffs (peer-reviewed reviews)

**CONFIRMED** against [Reviewing Performance Measures of the Die-Sinking Electrical Discharge Machining Process (PMC8839225)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8839225/) and [Advanced Electric Discharge Machining of Stainless Steels: Assessment of the State of the Art, Gaps and Future Prospect (PMC6470516)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6470516/) — these are *conceptual* definitions (the structure of the quantities), not numeric values:
- **MRR is defined structurally** as "the weight difference between the workpiece before and after machining divided by the machining time," and it "depends fundamentally on the crater size and frequency of crater production, i.e., the discharge energy and frequency of discharges." (This is the *form* of the relation — every magnitude stays owner-gated.)
- **Tool/electrode-wear rate (TWR)** is structurally "the amount of material lost from the electrode during the machining process," computed as the electrode weight difference over machining time.
- **Polarity is a deliberate tradeoff axis:** "Positive electrode tool polarity is generally used in EDM operations because electrode tool wear will be lower," whereas "the negative electrode tool polarity is a better choice if a high MRR is more important than precision." Polarity is therefore a *strategy choice* (accuracy vs. throughput), not a fixed setting.
- **Pulse-on vs pulse-off, restated by an independent source:** "The amount of energy generated during the pulse on-time has a direct effect on the MRR," while "the pulse off-time is the time in which no discharge is applied. Proper selection of the pulse off-time provides stable machining." This independently corroborates the §6 pulse-on (erode) / pulse-off (re-ionize + stabilize) framing from a stainless-steel-EDM review.
- **Dielectric's three named functions, independently restated:** "The dielectric fluid provides insulation against premature discharging, reduces the temperature in and around the machined area and cleans away the separated debris" — a third independent confirmation of the §2 insulation/cooling/flushing triad.
- **Surface-integrity quality components** the literature tracks: "the SR [surface roughness], extent of the heat affected zone (HAZ), recast layer thickness and micro-crack density," plus "white layer formation in EDM process" — the qualitative quality-vector a wedm surface-integrity engine should expose (each *magnitude* gated).

**Design implication:** a wedm planning/quality engine should expose **polarity** as an explicit accuracy-vs-throughput knob and carry the {SR, HAZ extent, recast thickness, micro-crack density, white-layer} quality vector as named fields — sourcing every *number* from `constants.ts` / FA-S tables, never the web.

## Owner-gate (NOT promoted — stays UNVERIFIED in `_staging` for mike)

The following remain in `knowledge/wiki/wedm/_staging/deep-domain-research-2026-06-09.md`, owner-gated, because they are numeric cutting constants (PRISM sources these ONLY from `mcp-server/src/physics/constants.ts` / JM Die FA-S extracted tables, never the web) or were not WebFetch-confirmed:

- **All discharge-energy / MRR numbers** — `E ≈ V·I·t_on` *structure* is method (the geometry of the relation is fine to describe), but the per-spark eroded volume (10⁻⁶..10⁻⁴ mm³), spark-frequency, and any MRR magnitude are gated.
- **Plasma/spark temperature (~8,000 °C)** — commercial-source figure; gated. NOTE: the 2nd-pass peer-reviewed sources (PMC8839225, PMC6470516) DID quote specific crater-spot temperature ranges — these are numeric cutting-process constants and were deliberately NOT promoted into §6/§11/§13; they remain owner-gated for mike to extract from those sources and reconcile against `constants.ts`.
- **ANOVA contribution percentages** (pulse-on 75.41% / pulse-off 11.33% / peak-current 3.93% / wire-feed 2.25%) — single-study numbers, not universal constants; gated.
- **Dielectric resistivity/conductivity magnitudes** (18 MΩ·cm ultrapure, 0.1 µS/cm working figures) — gated.
- **Recast-layer thicknesses** (4.8 µm kerosene figure — *which is EDM-drilling, not WEDM*; ~43% trim-cut reduction) — gated.
- **Flushing-pressure ranges** (~0.5-1.5 kg/cm²) — gated.
- **All wire/kerf/offset/spark-gap dimensions** (wire dia 0.05-0.30 mm, kerf ≈ 1.3× wire dia, offset 0.0052″ field value, spark gap 0.01-0.05 mm, min internal radius) — gated; reconcile against the JM Die machine offset table (`jm-die-wedm-tech-tables.ts`, ACU E-code families E952/E56xx per the 2026-06-02 regression note) before any engine use.
- **All Ra / surface-finish numbers** (112/72/35/10 µin progression; VDI 8-12 range mapping; ±0.0001″ / 5 µin carbide figures) — gated; cross-check against a published Mitsubishi/Sodick/Agie VDI finish chart.
- **Zinc gamma-phase draw-limit mechanism** + coating-thickness percentages — the *qualitative benefit* of zinc-coated wire is promoted (§3); the *metallurgical mechanism* was not confirmed by the cited source and is gated.

**Standards pointers** named in the packet (ISO 4287, ASME B46.1, JIS B0601, VDI 3400) are correct *names* and may be cited as pointers, but the specific VDI-range→Ra mapping is a numeric claim and stays gated until mike confirms against a manufacturer VDI table.

## Sources (URLs papa actually WebFetched and that confirmed a promoted claim)

- [Xometry — Wire EDM Machining](https://www.xometry.com/resources/machining/wire-edm-machining/) — non-contact spark-erosion mechanism + deionized-water dielectric roles
- [Modern Machine Shop — Buying a Wire EDM, Part 3: Speed, Accuracy and Finish](https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish) — rough + skim multi-pass strategy
- [MoldMaking Technology — Taper Angles and Wire EDM](https://www.moldmakingtechnology.com/articles/taper-angles-and-wire-edm) — taper differential U/V vs X/Y guide motion + angular error
- [Modern Machine Shop — More Accurate Taper Cutting with Wire EDM](https://www.mmsonline.com/articles/more-accurate-taper-cutting-with-wire-edm) — taper accuracy worse than straight cuts, compensation from a test cut
- [MDPI Micromachines / PMC10140967 — Enhancing Wire-EDM Performance with Zinc-Coated Brass Wire Electrode and Ultrasonic Vibration](https://pmc.ncbi.nlm.nih.gov/articles/PMC10140967/) — brass CuZn37 composition + zinc-coated wire performance benefit (peer-reviewed)

### Deepening pass — newly WebFetch-confirmed (2026-06-09, papa-workflow), untapped source categories

- **[GOV REPORT] [NIST — Effect of Electrical Discharge Machining (EDM) on Miniaturized Charpy Test Results](https://www.nist.gov/publications/effect-electrical-discharge-machining-edm-miniaturized-charpy-test-results)** — §8: standards-authority EDM definition (discharges between electrode and workpiece separated by a dielectric) + recast layer harder/brittle/microcracks, hardening varies with carbon content, EDM-vs-milling comparison, honest impact-toughness scope note
- **[GOV REPORT] [NIST — Effect of EDM on Charpy Test Results from Miniaturized Steel Specimens](https://www.nist.gov/publications/effect-electrical-discharge-machining-edm-charpy-test-results-miniaturized-steel)** — §8 companion: corroborates recast-layer characterization + "no detrimental effect on impact toughness of the materials investigated"
- **[GOV REPORT] [DOE / Sandia National Laboratories — SAND2022-6018 Electrical-Discharge-Machining (OSTI 1871371)](https://www.osti.gov/servlets/purl/1871371/)** — §8: brass-wire volatilization leaves Cu-Zn recast residue on cut + adjacent surfaces; recast removal via mechanical or lower-voltage finishing cuts; removal harder as features shrink/complexify
- **[PEER-REVIEWED] [Electro-Discharge Machining of Ceramics — A Review (PMC6356492)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6356492/)** — §6/§7: dielectric breakdown → plasma channel → flush; EDM hardness/brittleness-independent (thermal removal); minimum-conductivity requirement + assisting-electrode method for non-conductive ceramics
- **[PEER-REVIEWED] [Recent Advances and Perceptive Insights into Powder-Mixed Dielectric Fluid of EDM (PMC7464327)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7464327/)** — §6: four-phase single-spark discharge cycle (voltage → breakdown/plasma → melt/vaporize → collapse/flush) + qualitative pulse-on (erode) vs pulse-off (deionize/cool/flush) roles
- **[FREE COURSEWARE — pointer only, no claim promoted]** [NPTEL Advanced Machining Processes (IIT Kanpur 112104028)](https://archive.nptel.ac.in/courses/112/104/112104028/) + [MIT OCW 2.008 Design and Manufacturing II](https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/) — §9: free IIT/MIT courseware on EDM/W-EDM method + manufacturing-process physics; live pages JS-gated, cited as pointers (R12: no body text confirmed via WebFetch)

### Second deepening pass — newly WebFetch-confirmed (2026-06-10, papa-workflow), peer-reviewed open-access not previously cited

- **[PEER-REVIEWED] [A systematic review on powder mixed electrical discharge machining (PMC6909068)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6909068/)** — §10: flushing is mandatory (debris → arcing → dimensional-accuracy + surface-integrity loss); the six named flushing techniques (side/suction-through-electrode/pressure-through-electrode/jet/vacuum/injection); servo-controlled reciprocation / vibrating electrode = hydraulic pumping action
- **[PEER-REVIEWED] [Ultrasonic Vibration Assisted Electro-Discharge Machining (EDM) — An Overview (PMC6384716)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6384716/)** — §11: debris accumulation drops gap resistance → abnormal discharges / short circuits → tool-wear up, MRR down; quick debris cleansing crucial; vibration = high-frequency dielectric pressure change + circulation for debris removal
- **[PEER-REVIEWED] [Frontiers in Mech. Eng. — Comprehensive review on wire electrical discharge machining: a non-traditional material removal process (10.3389/fmech.2024.1322605)](https://www.frontiersin.org/journals/mechanical-engineering/articles/10.3389/fmech.2024.1322605/full)** — §12: impurity migration localizes the field/breakdown; wire-tension straightness rule (high WT → straight, else drags); up/down vibration draws clean dielectric in + drives debris out; dielectric chemistry/cooling-rate shapes the recast layer
- **[PEER-REVIEWED] [Reviewing Performance Measures of the Die-Sinking Electrical Discharge Machining Process (PMC8839225)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8839225/)** — §13: structural (non-numeric) definitions of MRR (mass-loss/time; depends on crater size × discharge frequency) and TWR (electrode mass-loss/time); MRR governed by discharge energy + frequency
- **[PEER-REVIEWED] [Advanced Electric Discharge Machining of Stainless Steels: Assessment of the State of the Art (PMC6470516)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6470516/)** — §13: polarity tradeoff (positive tool → lower electrode wear; negative tool → higher MRR, less precision); pulse-on energy → MRR, pulse-off → stable machining; dielectric insulation/cooling/debris-cleaning triad (3rd independent confirmation); SR/HAZ/recast-thickness/micro-crack-density + white-layer quality vector

## Cross-refs

- Packet (owner-gated remainder): [`_staging/deep-domain-research-2026-06-09.md`](_staging/deep-domain-research-2026-06-09.md)
- Galaxy doctrine: [`mcp-server/src/engines/wedm/CLAUDE.md`](../../../mcp-server/src/engines/wedm/CLAUDE.md) §2 (canonical constants — never inline) + §5/§6 (gotchas/tribal, owner to expand)
- Galaxy memory: [`mcp-server/src/engines/wedm/MEMORY.md`](../../../mcp-server/src/engines/wedm/MEMORY.md) — Authoritative free-source corpus block
- Physics constants (canonical numeric source): `mcp-server/src/physics/constants.ts` + JM Die FA-S tables `mcp-server/src/data/jm-die-wedm-tech-tables.ts`
