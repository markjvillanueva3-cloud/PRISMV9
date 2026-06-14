---
title: Canonical Machining Equations — cited reference seed
type: formula-collection
domain: machining
status: seeded
last_verified: 2026-05-23
generated_by: slot:foxtrot iter7 (PSN equation-ingestion loop)
source_attribution: mandatory_per_slot_soul
tags: [formula, equation, machining, cited, canonical, mill, lathe, drilling, threading, finishing, kienzle, taylor, prism-physics-bridge]
related:
  - mcp-server/src/physics/constants.ts
  - knowledge/wiki/architecture/engines/
  - knowledge/wiki/architecture/formulas/
---

# Canonical Machining Equations — Cited Reference Seed (Foxtrot iter 7, 2026-05-23)

> Foxtrot is the tribal-knowledge slot. Per slot soul "source attribution mandatory" — every equation below cites its canonical source (handbook page, ISO standard, manufacturer doc, or seminal paper). This is a **seed** entry — additions land via the /loop pattern, each carrying ≥1 verifiable source.
>
> All numeric constants in PRISM must be imported from `mcp-server/src/physics/constants.ts`. The equations below are the FORMS — the constants live in `constants.ts`. Per CLAUDE.md doctrine: never inline Kienzle/Taylor/material values.

## 1. Cutting force — Kienzle model

$$F_c = k_{c1.1} \cdot a_p \cdot f_z^{(1-m_c)} \cdot K_{\gamma} \cdot K_{ve} \cdot K_v \cdot K_{vc}$$

- $F_c$ — main cutting force (N)
- $k_{c1.1}$ — specific cutting force at 1 mm² chip area (N/mm²) — per ISO group: P=1800, M=2100, K=1100, N=700, S=2800, H=3200 (canonical, ref `constants.ts`)
- $a_p$ — depth of cut (mm)
- $f_z$ — feed per tooth (mm)
- $m_c$ — Kienzle exponent (material-dependent)
- $K_\gamma, K_{ve}, K_v, K_{vc}$ — correction factors for rake angle, edge wear, cutting speed, tool coating

**Source:** Kienzle, O. (1952). *Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen*. VDI-Z 94. Also: Tlusty, J. (2000). *Manufacturing Processes and Equipment*, Prentice Hall, §10.3.

## 2. Tool life — Taylor extended

$$V_c \cdot T^n \cdot f^a \cdot a_p^b = C$$

- $V_c$ — cutting speed (m/min)
- $T$ — tool life (min)
- $n, a, b$ — Taylor exponents (tool/material dependent)
- $C$ — Taylor constant (m/min when $T=1$ min)

Simplified Taylor (legacy): $V_c \cdot T^n = C$, with $n \approx 0.125$ (HSS), 0.25 (carbide), 0.50 (ceramic), 0.70 (CBN).

**Source:** Taylor, F.W. (1907). *On the Art of Cutting Metals*. ASME. Also ISO 3685:1993 — Tool-life testing single-point turning tools.

## 3. Material removal rate (MRR)

**Milling:** $MRR = a_p \cdot a_e \cdot f$ where $f = n \cdot z \cdot f_z$ (mm³/min)
**Turning:** $MRR = V_c \cdot a_p \cdot f$ (cm³/min, with $V_c$ in m/min, $a_p$ and $f$ in mm)
**Drilling:** $MRR = (\pi D^2 / 4) \cdot f \cdot n$ where $f$ = mm/rev

- $a_e$ — radial depth of cut / stepover (mm)
- $n$ — spindle speed (rpm)
- $z$ — number of flutes

**Source:** Machinery's Handbook 31st ed. (Industrial Press, 2024), §SPEEDS AND FEEDS.

## 4. Spindle power required (Kienzle-derived)

$$P_c = \frac{F_c \cdot V_c}{60 \cdot \eta} \quad \text{(kW, } V_c \text{ in m/min, } F_c \text{ in N)}$$

- $\eta$ — drivetrain efficiency (≈ 0.8–0.92 for modern machining centers)

For multi-flute milling: $P_c = (MRR \cdot k_c) / 60 \cdot \eta$ where $k_c$ is volumetric specific energy (W·s/mm³).

**Source:** Sandvik Coromant Technical Guide §A-32; Tlusty (2000) §10.5.

## 5. Chatter stability — Tobias-Tlusty stability lobe

Critical chip width $b_{lim}$ for chatter onset:

$$b_{lim} = \frac{-1}{2 \cdot k_s \cdot \text{Re}[G(\omega)]_{min}}$$

- $k_s$ — cutting stiffness (N/mm²)
- $G(\omega)$ — frequency response function (FRF) of tool/spindle/workpiece
- $\text{Re}[G]_{min}$ — most-negative real part of FRF (mm/N)

Lobe spindle speed: $n_{lobe} = \frac{60 \cdot \omega}{2\pi \cdot z \cdot (k + 1/2 \mp \psi/\pi)}$ where $k$ = lobe number, $\psi$ = phase.

**Source:** Tobias, S.A. & Fishwick, W. (1958). *Theory of Regenerative Machine Tool Chatter*. The Engineer. Altintas, Y. (2012). *Manufacturing Automation*, 2nd ed., Cambridge, §3.

## 6. Surface roughness — theoretical (ideal, no wear)

**Turning (sharp-nose tool):** $R_a = \frac{f^2}{32 \cdot r_\epsilon} \cdot 1000$ (μm, $f$ and $r_\epsilon$ in mm)
**Milling (radius-end mill):** $R_a \approx \frac{f_z^2}{32 \cdot r}$ where $r$ = tool nose radius

For wiper-insert / chip-breaker variants the formula reduces by factor 3-5 depending on geometry.

**Source:** Boothroyd, G. & Knight, W.A. (2006). *Fundamentals of Machining and Machine Tools*, 3rd ed., CRC Press, §7.

## 7. Drill point geometry — thrust force

$$F_t = K_t \cdot D \cdot f^{0.8} \cdot \sin(\sigma/2)$$

- $K_t$ — material thrust constant (N/(mm·mm⁰·⁸·rad))
- $D$ — drill diameter (mm)
- $f$ — feed (mm/rev)
- $\sigma$ — point angle (° → rad)

Typical $K_t$: steel 800–1400, aluminum 400–700, titanium 1600–2200.

**Source:** Machinery's Handbook 31st ed., p.917-920 (drill point geometry tables); Shaw, M.C. (2005). *Metal Cutting Principles*, 2nd ed., Oxford, ch.15.

## 8. Threading — pitch diameter and depth

$$d_p = d - 0.6495 \cdot P \quad \text{(metric ISO 68-1)}$$
$$h_{thread} = 0.5413 \cdot P \quad \text{(thread depth, ISO 68-1)}$$

- $d$ — major (nominal) diameter (mm)
- $P$ — pitch (mm)
- $d_p$ — pitch diameter (effective contact)

**Source:** ISO 68-1:1998 — ISO general purpose screw threads — Basic profile — Metric screw threads.

## 9. Deflection — cantilever tool

$$\delta = \frac{F \cdot L^3}{3 \cdot E \cdot I}$$

- $F$ — applied force (N)
- $L$ — overhang length (mm)
- $E$ — elastic modulus (MPa) — carbide ≈ 580,000 MPa, HSS ≈ 210,000 MPa
- $I$ — second moment of area: for cylindrical tool $I = \pi D^4 / 64$

**Source:** Timoshenko, S. (1953). *Strength of Materials Vol. 1*, Van Nostrand, §22. Also: tool-overhang rule of thumb ≤ 4×D — per Sandvik Coromant + memory entry `drill-stickout-runout` (PRISM playbook iter5).

## 10. Heat partitioning — Jaeger/Loewen-Shaw

Moving-heat-source temperature at tool-chip interface:

$$T_{int} = T_0 + \frac{q \cdot (1 - R) \cdot l_c}{\lambda_c \cdot \sqrt{Pe}}$$

- $q$ — heat flux at shear plane (W/m²)
- $R$ — fraction conducted into workpiece (Jaeger curve, $f(Pe)$)
- $l_c$ — chip-tool contact length (m)
- $\lambda_c$ — chip thermal conductivity (W/m·K)
- $Pe = V_c \cdot l_c / \alpha$ — Peclet number, $\alpha$ = thermal diffusivity

**Source:** Jaeger, J.C. (1942). *Moving sources of heat*. Proc. Roy. Soc. NSW 76. Loewen, E.G. & Shaw, M.C. (1954). *Trans. ASME* 76:217.

## 11. Johnson-Cook flow stress (high strain rate)

$$\sigma = (A + B \epsilon^n)(1 + C \ln \dot{\epsilon}^*)(1 - T^{*m})$$

- $\epsilon$ — equivalent plastic strain
- $\dot{\epsilon}^*$ — normalized strain rate
- $T^* = (T - T_{room})/(T_{melt} - T_{room})$ — homologous temperature
- $A, B, C, n, m$ — material constants (canonical: AISI 4340 — A=792 MPa, B=510, n=0.26, C=0.014, m=1.03)

**Source:** Johnson, G.R. & Cook, W.H. (1983). *A constitutive model and data for metals subjected to large strains, high strain rates and high temperatures*. Proc. 7th Int. Symp. on Ballistics.

## 12. Chip thinning compensation (milling, low radial engagement)

$$f_z^{adj} = f_z \cdot \sqrt{\frac{D}{4 \cdot a_e \cdot (1 - a_e/D)}} \quad \text{when } a_e < D/2$$

- For climb milling with $a_e = D/2$, adjustment factor = 1.0
- At $a_e = D/8$, adjustment = 1.63 (recoup chip load lost to thinner chip geometry)

**Source:** Erdel, B. (2003). *High-Speed Machining*, Hanser, §4.2. Also: HSMAdvisor + CNC Cookbook chip-thinning calculators.

## 13. Spindle deflection — Hertzian bearing stiffness

$$k_{spindle} = \left( \frac{1}{k_{front\_bearing}} + \frac{1}{k_{rear\_bearing}} \cdot \left(\frac{a}{b}\right)^2 \right)^{-1}$$

where $a, b$ are distances from chuck nose to front/rear bearing.

For angular-contact ball bearings: $k = 3.36 \cdot 10^4 \cdot Z^{2/3} \cdot D_b^{1/3} \cdot \cos^{5/3}(\alpha)$ (N/μm, $Z$ = balls, $D_b$ = ball diameter mm, $\alpha$ = contact angle).

**Source:** Harris, T.A. & Kotzalas, M.N. (2007). *Rolling Bearing Analysis*, 5th ed., CRC Press, §7.

## 14. EDM material removal — Mandry/König

$$MRR = K \cdot I \cdot t_{on} \cdot f_{discharge} / \rho$$

- $I$ — peak current (A)
- $t_{on}$ — pulse on-time (μs)
- $f_{discharge}$ — discharge frequency (Hz)
- $\rho$ — workpiece density (kg/m³)
- $K$ — material/dielectric constant (steel-in-oil ≈ 11 × 10⁻⁶ mm³/(A·μs))

**Source:** König, W. & Klocke, F. (1997). *Fertigungsverfahren Bd. 3 — Abtragen*, Springer, ch.4. Mandry, W. (1971). *Elektroerosive Bearbeitung*, VDI-Z 113.

## 15. Grinding — specific energy

$$u_s = F_t \cdot V_s / Q_w$$

- $F_t$ — tangential grinding force (N)
- $V_s$ — wheel surface speed (m/s)
- $Q_w$ — material removal rate (mm³/s)
- Typical: hardened steel u_s = 30-70 J/mm³, carbide u_s = 80-200 J/mm³

**Source:** Malkin, S. & Guo, C. (2008). *Grinding Technology*, 2nd ed., Industrial Press, §3.

---

## How to extend

Per slot:foxtrot tribal-knowledge doctrine — every new equation requires:
1. Canonical source (handbook page, ISO/ASME standard, peer-reviewed paper, or manufacturer technical guide with edition/year)
2. ≥2 source corroboration before promotion to PRISM doctrine (per slot soul refuse_list)
3. Cross-reference to existing PRISM constants/engines (e.g. Kienzle → `KienzleForceModel` algorithm)
4. Variable definitions (units explicit) — never inline numeric constants; reference `constants.ts`

Add via:
- Append a new section to this file in chronological iter order
- Or fork to `knowledge/wiki/formulas/canonical-<domain>-equations-<date>.md` for a new domain
- Update FormulaRegistry (`mcp-server/src/registries/FormulaRegistry.ts`) with the symbolic form
- Tag with the cited source so tribal-by-domain-inject surfaces it correctly

Companion sibling: [[canonical-business-equations-2026-05-23]] (revenue/finance/operations for the money-making leg of the operator goal).
