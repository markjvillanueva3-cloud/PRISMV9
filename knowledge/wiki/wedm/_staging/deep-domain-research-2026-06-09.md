---
status: VERIFIED-PARTIAL
owner_slot: mike
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: wedm
domain: wire electrical discharge machining (WEDM) — spark erosion, dielectric flushing, wire tension/feed, multi-pass skim, kerf/offset, taper
---

**<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/wedm/wedm-foundations.md; numeric/safety specifics below stay owner-gated for mike. -->**

**<!-- UNVERIFIED (remainder): mike (wedm owner) must verify every numeric/safety claim below against the cited source AND against the PRISM physics constants (mcp-server/src/physics/constants.ts) / WEDM engines before integrating into the live galaxy CLAUDE.md/MEMORY.md. PRISM sources physics numbers ONLY from constants.ts + JM Die FA-S tables, never the web. Numbers here are drawn from web sources of mixed authority (peer-reviewed > manufacturer app-notes > commercial blogs) and are flagged per-claim. Treat manufacturer/commercial figures as TYPICAL ILLUSTRATIVE RANGES, not constants. -->**

# WEDM Deep-Domain Research Packet (UNVERIFIED draft for mike)

Source-authority key used inline: **[peer-reviewed]** (journal / academic PDF) · **[trade]** (Modern Machine Shop / MoldMaking Technology / established industry trade press) · **[commercial]** (vendor / shop marketing blog — lowest authority, verify before relying).

---

## 1. Spark-erosion fundamentals (thermoelectric removal)

- **WEDM is a thermoelectric, non-contact process** — a thin conductive wire (brass/copper/tungsten/coated-brass, dia. ~0.05–0.30 mm) discharges a series of discrete sparks across a gap; the wire never touches the work, so there is no mechanical cutting force and no tool-pressure deflection of the part. Material is removed by melting + vaporization, not chip formation. *(src: ScienceDirect "Wire EDM — an overview" [peer-reviewed]; IQS Directory EDM article [commercial])*
- **Plasma-channel temperature exceeds ~8,000 °C** at the spark site; each discharge melts/vaporizes a micro-crater roughly **1–100 µm** across. When the discharge ends, the plasma channel collapses and the pressure wave + inrushing dielectric eject the molten material as microscopic debris. *(src: Entag "EDM Spark Erosion Explained" [commercial] — TREAT TEMP AS ILLUSTRATIVE; cross-check against a peer-reviewed plasma-temp figure before citing as fact)*
- **Per-discharge eroded volume ≈ 10⁻⁶ to 10⁻⁴ mm³**, and total MRR = (volume per spark) × (spark frequency), with thousands of sparks/sec. There is no single closed-form MRR equation in practice; MRR is the cumulative statistical effect of millions of micro-craters. *(src: ScienceDirect "Investigation of the spark cycle on MRR in WEDM" [peer-reviewed])*

## 2. Discharge energy governs the MRR↔finish tradeoff

- **Per-spark erosion volume scales with discharge energy E ≈ V × I × t_on** (gap voltage × peak current × pulse-on time). Higher energy density → higher MRR but coarser craters and worse surface integrity (thicker recast). This is the central WEDM tradeoff. *(src: ScienceDirect spark-cycle study [peer-reviewed])*
- **Pulse-on time dominates MRR sensitivity.** An ANOVA on zinc-coated brass wire reported percentage contribution to MRR of: pulse-on time **75.41%**, pulse-off time **11.33%**, peak current **3.93%**, wire feed **2.25%**. *(src: optimization study on SS410, ijisrt.com PDF + related Taguchi WEDM studies [peer-reviewed] — VERIFY the exact figures map to a single named study before citing; multiple studies report similar rank-ordering with different percentages)*

## 3. Dielectric: deionized water, flushing, resistivity/conductivity

- **WEDM dielectric is deionized water** (low viscosity, carbon-free, high thermal conductivity, high flow rate vs. hydrocarbon oils used in sinker EDM). It (a) insulates until breakdown, (b) cools the gap to limit recast, (c) flushes debris to prevent secondary discharges/short-circuits. *(src: ScienceDirect "Dielectric Fluid — an overview" [peer-reviewed]; Xometry WEDM resource [commercial])*
- **Fully-deionized water resistivity ≈ 1.8 × 10⁵ Ω·m (18 MΩ·cm).** EDM working dielectric is run at MUCH lower resistivity than ultrapure water; micro-EDM that must suppress electrochemistry uses 10⁶–10⁷ Ω·cm. One ceramic WEDM study used DI water at **0.1 µS/cm conductivity** with 0.25 mm brass wire. *(src: ScienceDirect "Resistivity of Deionized Water — an overview" [peer-reviewed]; WEDM ceramic recast study [peer-reviewed])*
- **Higher dielectric conductivity → thicker recast layer** (greater discharge-energy sensitivity). Counter-mechanism: deliberately lowered resistivity can introduce an EDM-ECM electrochemical component with slow servo voltage that THINS recast. Kerosene-based recast (4.8 µm) was ~⅓ of water-based recast in one drilling study. *(src: ScienceDirect "Effects of dielectric fluids on recast layer in high-speed EDM drilling of nickel alloy" [peer-reviewed] — NOTE: that figure is EDM DRILLING not WEDM; cross-check magnitude before quoting for wire)*
- **Flushing pressure in DOE studies ranged ~0.5–1.5 kg/cm²** (≈0.05–0.15 MPa). Inadequate flushing → debris accumulation → short-circuits, wire breakage, higher wire consumption. *(src: "Influence of Nozzle Jet Flushing on Wire Deflection and Breakage in WEDM," ResearchGate PDF [peer-reviewed])*

## 4. Wire: tension, feed, brass vs. zinc-coated

- **Wire is held at constant tension to minimize lateral vibration.** Too high → premature wear + breakage; too low → vibration/deflection. One industrial case reduced breakage **30%** via wire selection + tension tuning. *(src: WEDM wire-breakage prevention study, Inderscience IJMMM 2011 [peer-reviewed]; TOPSCNC blog [commercial])*
- **Brass wire is ~63/37 to 65/35 Cu/Zn.** Zinc lowers melting/vaporization point → faster cutting; but >~40% Zn shifts to brittle gamma phase and can't be drawn — hence **zinc-coated** wire: pure-Zn coating (~18–35 µm) over a brass/copper core, annealed to ~50/50 diffusion zone, exceeding the 40% draw limit. *(src: Novotec / Power-EDM "EDM wire selection" [commercial]; corroborated by MDPI zinc-coated study [peer-reviewed])*
- **Zinc-coated brass outperforms plain brass**: higher cutting rate, better surface finish, lower breakage frequency (better flushing from fast vaporization + "core protection"). Caveat: the thin coating is consumed before exiting **tall** workpieces, limiting its benefit on thick parts. *(src: MDPI Micromachines "Enhancing WEDM Performance with Zinc-Coated Brass Wire" 2023 [peer-reviewed]; The EDM Handbook via Practical Machinist [commercial])*
- **Typical wire selection by pass:** ~0.30 mm for roughing, ~0.20 mm for finishing; high-tensile wire chosen for single-pass / tall parts / fine-diameter to resist breakage. *(src: ultrasonic-resonators.org EDM page [commercial]; Novotec wire-selection [commercial])*

## 5. Kerf, offset, spark gap (overcut)

- **Kerf (cut width) = wire diameter + 2 × spark gap.** Rule of thumb: kerf ≈ **~1.3× wire diameter** (e.g., 0.010″ wire → ~0.013″ kerf). *(src: Lemhunter wire-diameter guide [commercial]; Practical Machinist offset threads [commercial])*
- **Offset = ½ × kerf = wire radius + spark gap (overcut).** Offset is ALWAYS larger than half the wire diameter because of the spark gap. Field example: Charmilles adjustment for 0.010″ wire ≈ **0.0052″** (kerf ~0.012–0.014″ depending on settings). *(src: Practical Machinist "Offset" / "Programming Wire Offset" threads [commercial] — these are operator-reported field values, NOT a spec sheet; verify against the JM Die machine's actual offset table)*
- **Spark gap is NOT fixed** — it varies with voltage, current, and workpiece thickness, typically the controlled wire-to-part distance **~0.01–0.05 mm**. Best practice: measure it empirically by touching the wire to the wall on the machine and back-calculating offset. *(src: USPTO patent US4465914 "automatically measuring a required offset value" [peer-reviewed/primary]; bangid.com WEDM guide [commercial])*

## 6. Multi-pass skim strategy and surface finish (Ra)

- **Standard WEDM strategy = 1 aggressive rough cut + 1–4 progressively lighter skim (trim) passes.** Each skim runs faster, removes less, raises wire tension, lowers current, narrows the gap, and shrinks the offset (last-pass offset can be **~3 µm**). Most parts need **1–4 passes**. *(src: Modern Machine Shop "Buying a Wire EDM Part 3: Speed, Accuracy and Finish" [trade]; Arbiser Machine surface-finish blog [commercial])*
- **Representative Ra progression** (commercial-shop figures, verify): rough cut ~**112 µin (≈2.8 µm) Ra** at ±0.002″ → 2nd pass ~**72 µin** at ±0.0005″ → 3rd ~**35 µin** → 4th ~**10 µin (≈0.25 µm)**. Metric "common" range for tooling/precision parts: **Ra 0.2–0.8 µm**, with multi-skim micro work reaching **Ra 0.1–0.3 µm**. *(src: Arbiser Machine [commercial]; Wefab AI WEDM finish blog [commercial] — ALL surface-finish numbers are commercial shop claims; cross-check against a manufacturer VDI table before asserting)*
- **Skim passes also thin the recast/white layer** (not just lower Ra). Trim-cut operations reduced recast thickness up to **~43%** vs. single low/high-energy cuts. Material matters: dense hard materials (carbide) finish smoother than soft (aluminum); a 3″-thick carbide can hit ±0.0001″ and **5 µin Ra**, whereas even 30 µin is hard in aluminum. *(src: ScienceDirect "Surface Integrity of Tool Steels Multi-cut by WEDM" + recast trim-cut study [peer-reviewed]; MMS finish article [trade])*
- **Finish-spec discipline:** always pair Ra/Rz with the standard + cutoff/eval-length, or the same surface reports different values. Common standards: ISO 4287, ASME B46.1, JIS B0601; mold making commonly uses **VDI 3400** (EDM finishes often VDI 8–12). *(src: ISO 4287 / ASME B46.1 / VDI 3400 standard summaries via Lemhunter finish guide [commercial — standard NAMES are correct; verify the VDI-range mapping])*

## 7. Taper cutting and angular error

- **Taper wire-diameter compensation (WDcomp) = wire radius + discharge gap** (example value ~0.105 mm cited for one machine). Program a taper with taper angle, WDcomp, rotate, and overcut. *(src: Tech EDM taper-programming note [commercial])*
- **Taper/cone angular error from differential erosion**: in a cone, the U/V (upper, smaller-radius) axes move slower than X/Y (lower, larger-radius), so more material is eroded at the top → top radius smaller than programmed and angle off-spec. Modern controls re-angle/offset the wire to compensate; values are empirically derived from a test cut in the operator's own material. Taper cuts consistently show LARGER deviation + more variability than straight cuts. *(src: Modern Machine Shop "More Accurate Taper Cutting with Wire EDM" [trade]; MoldMaking Technology "Taper Angles and Wire EDM" [trade]; MDPI Micromachines 16(5):547 corner/taper study [peer-reviewed])*

## 8. Corner accuracy, wire lag, and minimum internal radius

- **Wire lag (deflection) is the root cause of corner error.** Asymmetric gap forces at a corner bend the flexible wire toward the smaller-machined-area side; error worsens with smaller radius, taller parts (lower wire stiffness), and faster speed. *(src: ScienceDirect "On the influence of cutting-speed limitation on accuracy of WEDM corner-cutting" [peer-reviewed]; ResearchGate corner-error simulation [peer-reviewed])*
- **Minimum internal radius ≈ wire radius + spark gap (overcut).** Practical: 0.010″ (0.25 mm) wire → ~0.005″ internal radius; a 0.127 mm wire → corners ~0.13–0.15 mm with good compensation. Sharper internal corners require a SMALLER wire — internal corners can never be perfectly sharp. *(src: Arbiser Machine small-wire blog [commercial]; Lemhunter EDM wire-sizes guide [commercial])*
- **Best corner-accuracy remedy is multi-factor**, not just slowing down: reduce corner speed + INCREASE wire tension + REDUCE flushing pressure simultaneously (e.g., Seibu Corner Control Circuit), plus CNC wire-lag path compensation and successive trim cuts. Most influential factors found: gap voltage, wire tension, wire diameter. *(src: mfgnewsweb.com "Wire EDM Corner Accuracy" [trade]; ResearchGate corner-control-strategy MRR study [peer-reviewed])*

---

## Owner-verification checklist for mike (before integration)

1. **Spark/plasma temperature (Fact 1):** replace the ~8,000 °C commercial figure with a peer-reviewed plasma-temperature value (or mark TYPICAL).
2. **ANOVA percentages (Fact 2):** confirm the 75.41/11.33/3.93/2.25% set maps to ONE named, citable study; do not present as universal.
3. **Recast 4.8 µm (Fact 3):** that figure is EDM-DRILLING of nickel alloy, not WEDM — adjust or re-source for wire before quoting.
4. **Offset 0.0052″ (Fact 5):** operator-reported field value; reconcile against the actual JM Die machine offset table (`wedm-acu-7pass` / FA-S extracted data per `mitsubishi-fa-s-extracted.ts`).
5. **Ra progression (Fact 6):** all commercial; cross-check against a Mitsubishi/Sodick/Agie published VDI finish chart before asserting in CLAUDE.md.
6. **Cross-check vs PRISM:** validate against existing WEDM engines (`WEDMProgramOptimizerEngine`, `WireEDMDeepAIHardeningEngine`, ACU E-code families E952/E56xx per the 2026-06-02 regression note) so the doctrine does not contradict shipped physics.

---

## Sources

- ScienceDirect — *Wire Electrical Discharge Machining: an overview* — https://www.sciencedirect.com/topics/engineering/wire-electrical-discharge-machining
- ScienceDirect — *Investigation of the spark cycle on material removal rate in wire EDM of advanced materials* — https://www.sciencedirect.com/science/article/abs/pii/S0890695503002712
- ScienceDirect — *Resistivity of Deionized Water — an overview* — https://www.sciencedirect.com/topics/engineering/resistivity-deionized-water
- ScienceDirect — *Dielectric Fluid / Dielectric Liquids — an overview* — https://www.sciencedirect.com/topics/engineering/dielectric-fluid
- ScienceDirect — *Effects of dielectric fluids on surface integrity for the recast layer in high-speed EDM drilling of nickel alloy* — https://www.sciencedirect.com/science/article/abs/pii/S0925838818348370
- ScienceDirect — *Recast Layer — an overview* — https://www.sciencedirect.com/topics/engineering/recast-layer
- ScienceDirect — *On the influence of cutting-speed limitation on the accuracy of wire-EDM corner-cutting* — https://www.sciencedirect.com/science/article/abs/pii/S0924013606008417
- MDPI Micromachines 14(4):862 (2023) — *Enhancing Wire-EDM Performance with Zinc-Coated Brass Wire Electrode and Ultrasonic Vibration* — https://www.mdpi.com/2072-666X/14/4/862 (PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC10140967/)
- MDPI Micromachines 16(5):547 — *Study of Corner and Shape Accuracies in Wire Electro-Discharge Machining of Fin and Gear Profiles and Taper Cutting* — https://www.mdpi.com/2072-666X/16/5/547
- Inderscience IJMMM 2011 Vol.9 — *Prevention of wire breakage in wire EDM* — https://www.inderscienceonline.com/doi/abs/10.1504/IJMMM.2011.038162
- ResearchGate — *Influence of Nozzle Jet Flushing on Wire Deflection and Breakage in wire EDM* — https://www.researchgate.net/publication/278671183
- ResearchGate — *Corner error simulation of rough cutting in wire EDM* — https://www.researchgate.net/publication/245172449
- USPTO US4465914 — *Wire-cut EDM method for automatically measuring a required offset value* — https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4465914
- Modern Machine Shop — *Buying a Wire EDM, Part 3: Speed, Accuracy and Finish* — https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish
- Modern Machine Shop — *More Accurate Taper Cutting with Wire EDM* — https://www.mmsonline.com/articles/more-accurate-taper-cutting-with-wire-edm
- MoldMaking Technology — *Taper Angles and Wire EDM* — https://www.moldmakingtechnology.com/articles/taper-angles-and-wire-edm
- MFG News — *Wire EDM Corner Accuracy* — https://www.mfgnewsweb.com/archives/4/49153/EDM-Machinery-Consumables-jul17/Wire-EDM-Corner-Accuracy.aspx
- ijisrt.com — *Optimization of Wire EDM Parameters to Calculate MRR and Measure Surface Finish on SS410* — https://ijisrt.com/wp-content/uploads/2017/03/Optimization-of-Wire-EDM-Parameters-To-Calculate-MRR-and-Measure-Surface-Finish-On-SS410.pdf
- Novotec EDM — *EDM Wire Selection* — https://us.novotec-edm.com/wire-selection/ ; Power-EDM — https://www.power-edm.com/new/Wire-selection.html
- Arbiser Machine — *Can Wire EDM Services Meet Surface Finish Requirements?* — https://www.arbisermachine.com/blog/can-wire-edm-services-meet-surface-finish-requirements ; *Could Your Part Benefit from Small Wire EDM?* — https://www.arbisermachine.com/blog/could-your-intricate-part-benefit-from-small-wire-edm
- Lemhunter — *Wire EDM Diameter Guide* / *EDM Finish Guide* — https://www.lemhunter.com/news/wire-edm-diameter-guide-standard-sizes-effects-on-speed-and-accuracy/
- Xometry — *Wire EDM Manufacturing* — https://www.xometry.com/resources/machining/wire-edm-machining/
- Practical Machinist forum — *EDM Offset / Programming Wire Offset / Coated Wire* threads — https://www.practicalmachinist.com/forum/threads/offset.432914/
