---
status: VERIFIED-PARTIAL
owner_slot: oscar
staged_by: papa-deepdomain-research
promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
date: 2026-06-09
galaxy: speed-feed
domain_focus: cutting physics — Kienzle, Taylor, Merchant, chip thinning, surface speed/feed selection, size effect
---

<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/wiki/speed-feed/speed-feed-foundations.md; numeric/safety specifics below stay owner-gated for oscar. -->

**<!-- UNVERIFIED: oscar must verify every cited claim below against the primary source URL before integrating into the live speed-feed CLAUDE.md / MEMORY.md / engines. Two notation conventions and value ranges vary by source; cross-check kc1.1 constants against PRISM's canonical `mcp-server/src/physics/constants.ts` before use. -->**

# Speed-Feed Galaxy — Deep-Domain Cutting Physics Research Packet (UNVERIFIED)

This packet stages 13 high-value, cited cutting-physics facts/formulas for the SFC (Speed-Feed Calculator) domain. Each carries an inline source. Nothing here is asserted as PRISM truth until oscar verifies it. Where the SFC engine already encodes a value (e.g. kc1.1 per ISO group in `constants.ts`: P=1800, M=2100, K=1100, N=700, S=2800, H=3200 — per PRISM CLAUDE.md §SAFETY), prefer the canonical PRISM source and use this packet only to corroborate/extend.

---

## 1. Kienzle Specific Cutting Force (the SFC force core)

**Fact 1 — The Kienzle power law.** The specific cutting force `kc` is NOT constant; it depends almost exclusively on the undeformed (uncut) chip thickness `h`, not on chip width `b`. Kienzle expressed this as a power law `kc = kc1.1 · h^(−mc)` (N/mm²), which substituted into `Fc = kc · b · h` gives the canonical main-cutting-force equation:

> **Fc = kc1.1 · b · h^(1 − mc)**

where `b` = chip width (scales linearly, ∝ depth of cut ap), `h` = uncut chip thickness (∝ feed, scales as a power law), and `mc` (also written `Zc`) is the chip-thickness exponent = the slope of the `kc` vs `h` line on a log-log plot. (Source: Sirris, "Key to model-based machining: Kienzle's cutting force formula"; corroborated by Machining Doctor, "Specific Cutting Force (KC & KC1)")

**Fact 2 — Definition of kc1.1.** `kc1.1` is the specific cutting force at the unit reference geometry `b = h = 1 mm` with a 0° top rake angle — i.e. the cutting force to remove a 1 mm² chip cross-section of 1 mm thickness. For typical engineering materials, `kc1.1` ranges roughly **700 to 4000 N/mm²** and is the primary factor in the force/power result. (Source: Machining Doctor, "Specific Cutting Force (KC & KC1)")
> *oscar-verify note:* PRISM's canonical per-ISO-group kc1.1 values live in `constants.ts` (P=1800…H=3200) — confirm this 700–4000 envelope brackets them and DO NOT re-inline these numbers per PRISM §SAFETY ("NEVER inline Kienzle/Taylor/material constants").

**Fact 3 — Tool-catalog rake correction.** Vendor catalogs extend the bare Kienzle law with a rake-angle correction term: **KC = KC1.1 · h^(−mc) · (1 − 0.01 · GAMF)**, where `GAMF` is the effective top rake angle in degrees. This is the form used when matching a catalog's published kc1.1/mc to a real tool geometry. (Source: Machining Doctor, "Specific Cutting Force (KC & KC1)")

**Fact 4 — Extension to all three force components.** The same power-law form applies to the feed force and passive (radial) force: **Ff = kf1.1 · b · h^(1 − mf)** and **Fp = kp1.1 · b · h^(1 − mp)**, each with its own coefficient and exponent. (Source: Sirris, "Key to model-based machining: Kienzle's cutting force formula")

---

## 2. Taylor Tool Life (the SFC tool-life / speed-tradeoff core)

**Fact 5 — Taylor's tool-life equation.** Empirically (F.W. Taylor, 1907): **V·Tⁿ = C**, where V = cutting speed (m/min), T = tool life (min), `n` = exponent set by tool material, and `C` = the cutting speed giving a 1-minute tool life (depends on tool material, workpiece material, and feed). Higher cutting speed → shorter tool life. (Source: IIT Bombay Virtual Labs, machine-tools experiment theory; corroborated by Mechical, "Taylor's Tool Life Equation")

**Fact 6 — Exponent `n` by tool material (verify ranges — sources disagree).** Representative tabulated values: HSS ≈ 0.1–0.18; uncoated tungsten carbide (WC) ≈ 0.2–0.25; TiC/TiN-coated WC ≈ 0.3; Al₂O₃-coated WC ≈ 0.4; ceramics ≈ 0.4–0.7. Broader cited ranges put carbides at 0.2–0.5, coated carbides 0.4–0.6, and diamond/CBN 0.7–0.9. (Source: Mechical, "Taylor's Tool Life Equation"; ranges vary across the surveyed references — oscar must pin the convention before encoding)

**Fact 7 — Extended (generalized) Taylor equation.** To include feed and depth of cut: **V·T^n·f^p·d^q = C**, where f = feed (mm/rev), d = depth of cut, and p, q are exponents (< 1). Order of influence on tool life is **V > f > d** — i.e. cutting speed dominates wear, then feed, then depth. This is the basis for trading reduced speed against increased feed/depth to maximize material-removal-rate at a fixed tool life. (Source: ACS College of Engineering machining notes, "Tool Wear/Tool Life"; corroborated by Mechical)

---

## 3. Merchant Shear-Angle (the SFC chip-mechanics core)

**Fact 8 — Merchant's shear-angle equation.** From the minimum-energy principle (Ernst & Merchant), the shear-plane angle φ in orthogonal cutting is: **φ = 45° + α/2 − β/2**, where α = rake angle and β = friction angle. Equivalently **2φ + β − α = 90°**. (Source: ScienceDirect/MDPI, "Determination of the Shear Angle in the Orthogonal Cutting Process"; IIT Kanpur lecture L6, "Mechanics of Cutting")

**Fact 9 — Why φ matters for efficiency.** A higher shear angle → smaller shear-plane area → lower shear force, lower cutting energy, and lower cutting temperature. To raise φ you increase rake angle α or reduce friction angle β (lower tool-chip coefficient of friction, e.g. via coating/coolant). (Source: ScienceDirect, "Shear Angle — an overview")

**Fact 10 — Known limitation (R12 honesty flag).** Merchant's single-shear-plane minimum-energy prediction does NOT generally match experimental data or numerical simulation; it is a teaching/first-order model. More accurate practice supplements it with a chip-morphology stability criterion (modified Merchant) or uses the Lee–Shaffer slip-line model. Do not treat the Merchant φ as production-accurate without empirical calibration. (Source: ScienceDirect, "The Merchant's model of orthogonal cutting revisited")

---

## 4. Surface Speed / Feed Selection (the SFC kinematics core)

**Fact 11 — SFM↔RPM and feed-rate chain.** Spindle speed from surface speed: **RPM = (SFM × 12)/(π × D)** = **SFM × 3.82 / D** (D in inches; 3.82 ≈ 12/π). Metric: **RPM = (Vc × 1000)/(π × D_mm)** ≈ **Vc × 318 / D_mm**. Feed rate then: **IPM = RPM × (number of flutes) × (chip load per tooth)**. Caution: if a vendor publishes feed *per revolution*, do NOT multiply by flute count. Smaller tools must run at higher RPM for the same SFM. (Source: CNCoptimization, "SFM to RPM Formula & Chart"; Harvey Performance, "Speeds and Feeds 101")

**Fact 12 — Machine-limit feed scaling.** When the calculated spindle speed exceeds the machine's max, reduce feed *proportionally* to preserve chip load: if achievable speed is 25% of calculated, set feed to 25% of calculated. Typical chip-load band for general work is **0.001–0.010 in** per tooth — too small → rubbing/heat/tool death; too large → tool breakage. (Source: CNCoptimization, "CNC Speed & Feed Formulas"; Harvey Performance, "Speeds and Feeds 101")

---

## 5. Chip Thinning + Size Effect (the SFC light-engagement / micro-feed core)

**Fact 13a — Radial chip-thinning factor (RCTF).** When radial engagement (width of cut, Ae) is below 50% of cutter diameter D, actual chip thickness < programmed feed per tooth, so feed must be increased to keep true chip thickness on target:

> **RCTF = 1 / √(1 − [1 − (2·Ae/D)]²)**, and effective feed **Fz = RCTF × (target chip load)**.

RCTF = 1 at Ae ≥ D/2; it can reach ~3× at very small Ae. Quick refs: ~25% stepover → ≈ +30% feed; ~10% → ≈ 1.67–1.70× feed. For round/ballnose tools, also apply an axial factor: **CTF = RCTF × ACTF**. (Source: Machining Doctor, "Chip Thinning Calculators and Formulas"; ISCAR, "Radial Chip Thinning Calculator User Guide"; DAPRA, "Radial Chip Thinning")

**Fact 13b — Size effect (why too-light a chip is dangerous).** Specific cutting energy `Kc` rises monotonically as uncut chip thickness `h` decreases — the "size effect." When `h` approaches or drops below the tool edge radius (ratio h/edge-radius < 1), ploughing/rubbing dominates over shearing, driving up energy, heat, work-hardening (especially in stainless), and flank wear. Below the minimum uncut chip thickness (MUCT) no chip forms at all (pure ploughing). This is the physical reason chip-thinning compensation exists: keep actual `h` above the rubbing regime. (Source: Nature Scientific Reports 2021, "In-SEM micro-machining reveals the origins of the size effect in the cutting energy"; ScienceDirect, "Size effect and minimum chip thickness in micromilling")

---

## Sources

1. Sirris — "Key to model-based machining: Kienzle's cutting force formula" — https://www.sirris.be/en/inspiration/key-model-based-machining-kienzles-cutting-force-formula
2. Machining Doctor — "Specific Cutting Force (KC & KC1)" — https://www.machiningdoctor.com/glossary/specific-cutting-force-kc-kc1/
3. Machining Doctor — "Chip Thinning: Calculators and Formulas (Radial and Axial)" — https://www.machiningdoctor.com/calculators/chip-thinning-calculator/
4. ISCAR — "User Guide for Radial Chip Thinning Calculator in Milling" — https://www.iscar.com/ITC/UserGuide/ITA_USER_GUIDE_RadialChipThinningCalculator_EN.pdf
5. DAPRA Corporation — "Radial Chip Thinning — How to Max Out Your Milling Tool Feed Rate" — https://www.dapra.com/articles/radial-chip-thinning
6. IIT Bombay Virtual Labs — Machine Tools, tool-life experiment theory — http://vlabs.iitb.ac.in/vlabs-dev/labs/mit_bootcamp/machine_tools/labs/exp1/theory.php
7. Mechical — "Tool Life, Taylor's Tool Life Equation, Calculation, Factor" — https://www.mechical.com/2022/01/tool-life-taylors-tool-life-equation.html
8. ACS College of Engineering — "Tool Wear/Tool Life, Machine Time" (Metal Cutting & Forming, Module 3) — https://www.acsce.edu.in/acsce/wp-content/uploads/2020/04/Metal-Cutting-Forming-Module-3.pdf
9. MDPI J. Manuf. Mater. Process. — "Determination of the Shear Angle in the Orthogonal Cutting Process" — https://www.mdpi.com/2504-4494/6/6/132
10. IIT Kanpur — V.K. Jain, "Mechanics of Cutting" (Lecture L6, TA-202) — https://home.iitk.ac.in/~vkjain/L6-TA-202%20MECHANICS%20OF%20CUTTING.pdf
11. ScienceDirect Topics — "Shear Angle — an overview" — https://www.sciencedirect.com/topics/engineering/shear-angle
12. ScienceDirect — "The Merchant's model of orthogonal cutting revisited: A new insight into the modeling of chip formation" — https://www.sciencedirect.com/science/article/abs/pii/S0020740307001233
13. CNCoptimization — "SFM to RPM Formula & Chart: Diameter Converter" — https://www.cncoptimization.com/resources/guides/sfm-rpm-conversion/
14. CNCoptimization — "CNC Speed & Feed Formulas: RPM, Feed Rate & Chip Load" — https://www.cncoptimization.com/resources/guides/cnc-cutting-speed-feed-formulas/
15. Harvey Performance — "Speeds and Feeds 101 (In The Loupe)" — https://www.harveyperformance.com/in-the-loupe/speeds-and-feeds-101/
16. Nature Scientific Reports (2021) — "In-SEM micro-machining reveals the origins of the size effect in the cutting energy" — https://www.nature.com/articles/s41598-021-81125-7
17. ScienceDirect — "Size effect and minimum chip thickness in micromilling" — https://www.sciencedirect.com/science/article/abs/pii/S0890695514400130
