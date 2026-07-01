---
name: reference_lathe_phase4_deep_2026_06_13
description: "Phase-4 lathe deep-knowledge anchor covering thermal modeling (Jaeger/Trigger-Chao/Shaw), advanced tool wear mechanisms beyond Taylor (ISO 3685 VB/KT, Zorev stress, BUE, PVD vs CVD), hard turning surface integrity (white layer, residual stress flip, PCBN grade selection, Umbrello/Mittal/Barkhausen NDE), workholding contact mechanics (Hertz contact, thin-wall elastic ring, jaw pre-bore), and Swiss-type guide bushing physics (ISO 286 h6, Coulomb friction, vibration damping)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.639Z
aliases: reference_lathe_phase4_deep_2026_06_13
---


# Lathe Phase-4 Deep Knowledge — Thermal · Wear · Surface Integrity · Workholding · Swiss

## Context

Builds directly on two prior anchors:
- [[reference_lathe_threading_infeed_tnr_2026_06_13]] — Phase-2: threading infeed methods, CSS/G50, Ra formula Ra ≈ f²/(32·rε)·1000, TNR G41/G42, ISO 1832
- [[reference_lathe_phase3_deflection_millturn_predictive_2026_06_13]] — Phase-3: boring-bar δ=FL³/3EI, L/D limits, turning SLD from FRF, PrimeTurning, Oxley/Childs/Jaspers predictive models, cryogenic/MQL

Phase-4 does NOT repeat those topics. It extends into the sub-domains below.

---

## Sub-domain 1: Thermal Modeling in Turning

### Moving heat source (Jaeger 1942)
Jaeger's classic solution to the semi-infinite body problem with a moving surface heat source gives the temperature rise ΔT at a point (x, y) as a function of the Péclet number Pe = V·a/(2α), where V is cutting speed, a is half-contact length, and α is thermal diffusivity. At high Pe (cutting speeds typical in turning), the isotherms tilt sharply downstream — most of the heat stays in the chip.

**Source:** J.C. Jaeger, "Moving Sources of Heat and the Temperature at Sliding Contacts," *Proc. Royal Society of NSW*, 76, 1942, pp. 203–224.

### Thermal partition (Trigger-Chao 1951; Shaw refinement)
The partition fraction β is the fraction of total cutting heat flowing into the workpiece.  

Trigger-Chao derived β from the equality of temperature at the chip-tool interface:  
β = 1 / (1 + (λ_w · ρ_w · c_w)^0.5 / (λ_c · ρ_c · c_c)^0.5 · (V · l_c / α_w)^0.5)

where λ = thermal conductivity, ρ = density, c = specific heat, l_c = chip-tool contact length, V = cutting speed.  

Shaw's "Metal Cutting Principles" (2nd ed., 1984, Oxford, Ch. 11) gives the full derivation and shows β decreasing with cutting speed — at high speed, more heat partitions to the chip (desirable). For steels at V=200 m/min, β ≈ 0.1–0.15.

**JM Die implication:** Okuma OSP lathes LTH-01..07 often cut alloy steel 4140 at V=150–250 m/min. Low β means workpiece stays cooler, but thin walls (L/D > 3) still accumulate heat across passes — measure with thermocouple or IR before finishing pass when roughing 4140 without coolant.

**PRISM wiring:** `CuttingTemperatureEngine.ts` + `ThermalWearCouplingEngine.ts` (RK4 ODE; 24 thermal engines listed in CLAUDE.md key categories). Partition input should come from Trigger-Chao; currently verify whether β is hard-coded or computed from material props.

### Practical upshot
- Chip color is a qualitative proxy: straw/gold = ~300–400°C, blue-purple = ~500–600°C, grey = >600°C (for steel).
- Tool-nose thermocouple (embedded type, Sandvik CoroTurn turning inserts with embedded TC option) gives interface temperature; calibration equation is Taylor-type: T = C · V^a · f^b.
- Do NOT inline these constants — import from `src/physics/constants.ts` once the canonical Trigger-Chao β coefficients per ISO material group are added there.

---

## Sub-domain 2: Tool Wear Mechanisms Beyond Taylor's VB=C·T^n

### ISO 3685 wear criteria
ISO 3685:1993 "Tool Life Testing with Single-Point Turning Tools" defines:
- **VB**: average flank wear width on the main cutting edge (failure at VB = 0.3 mm for carbide; 0.6 mm for finishing)
- **VBmax**: maximum flank wear (failure at 0.6 mm for carbide)
- **KT**: crater depth on the rake face (failure criterion KT/f = 0.3, where f is feed)
- **KT/KM/KB**: full crater geometry (depth / mean / width)

Taylor's equation T = C/V^n addresses only flank wear under ideal conditions. Real shop wear involves at least five mechanisms:

### Five wear mechanisms (Boothroyd & Knight, "Fundamentals of Machining and Machine Tools," 3rd ed., 2006, CRC Press)
1. **Abrasion** — hard carbide/oxide particles in work material plow micro-grooves in the tool. Dominant at low speeds. Rate ∝ cutting force × sliding distance / hardness.
2. **Adhesion (BUE)** — metal welds to tool at low-to-medium speeds (steel typically 50–120 m/min). Built-up edge (BUE) forms and periodically shears, carrying tool substrate material with it. Observable as rough, irregular surface finish and poor chip color. Remedy: increase speed past BUE-stable range, use coated tool (TiN/TiAlN reduces adhesion), or apply cutting fluid.
3. **Diffusion** — atomic transport across tool/chip interface at high temperatures (>700°C). WC-Co carbide loses Co binder; cemented carbide dissolves into steel workpiece. Rate follows Arrhenius: D = D₀ · exp(−Q/RT). Most damaging above ~800°C cutting temperature. High-speed steel (HSS) is unusable; coatings (TiAlN, Al₂O₃) provide diffusion barrier.
4. **Oxidation** — tool material reacts with air/coolant at elevated temperature. Forms soft oxide layers (e.g., CoO from binder) that are easily abraded away. Notch wear at depth-of-cut line is often oxidation-driven. Al₂O₃ coatings resist oxidation to ~1200°C.
5. **Thermal cracking / thermomechanical fatigue** — intermittent cutting (interrupted turning, milling inserts) causes cyclic thermal stress. Cracks propagate perpendicular to cutting edge. Remedy: use tough grade (high Co binder for carbide), avoid coolant on hot inserts (thermal shock).

### Zorev rake-face stress distribution (1966)
Zorev showed the normal stress σ on the rake face is not uniform — it peaks at the tool nose and decays along the chip-tool contact length. The stress profile is:
σ(x) = σ₀ · (1 − x/l_c)^ψ, x ∈ [0, l_c]
where l_c = contact length, σ₀ = maximum stress at tip, ψ ≈ 3 experimentally.  
This explains why crater wear (KT) initiates NOT at the cutting edge but at the location of peak temperature (x ≈ 0.25–0.35 · l_c from the tip).

**Source:** N.N. Zorev, "Metal Cutting Mechanics," Pergamon Press, 1966.

### PVD vs CVD coating selection (Sandvik Coromant Turning Catalogue, current edition)
- **CVD (Chemical Vapor Deposition):** Deposited at 900–1100°C. Produces thick coatings (10–20 µm). Better abrasion resistance; higher compressive residual stress from cool-down. Typical: TiCN/Al₂O₃/TiN multilayer (Sandvik grade GC4315, GC4335). Best for: dry turning of steels at moderate-to-high speed, where abrasion dominates and thermomechanical fatigue is secondary.
- **PVD (Physical Vapor Deposition):** Deposited at 400–600°C. Thinner (2–5 µm), sharper edge geometry maintained. TiN, TiAlN, AlTiN. Better for: interrupted cuts, stainless/HRSA/titanium where edge strength matters; lower-speed finishing. PVD-coated inserts survive interrupted turning without edge chipping better than CVD.

**Rule of thumb:** CVD for continuous steel turning at V > 150 m/min; PVD for interrupted, stainless, or finishing at V < 150 m/min. When uncertain, check Sandvik GradeSelector tool (graded by ISO P/M/K/N/S/H and cutting condition = continuous/interrupted/general).

**JM Die / Okuma implication:** LTH-01..07 mostly run continuous operations (die components, shafts). CVD grades (GC4315 class) are the standard choice. PVD for any part with keyways or cross-holes that interrupt the cut.

---

## Sub-domain 3: Hard Turning Surface Integrity

### What is hard turning?
Hard turning = single-point turning of hardened steel (HRC 45–70) using CBN (Cubic Boron Nitride) inserts. Replaces cylindrical grinding in many finishing operations if surface integrity requirements are met.

### White layer formation
White layer (WL) is a nanocrystalline or amorphous hard layer (HV 900–1200 vs. bulk HV 700 for 52100 steel) formed on the machined surface. It appears white under optical microscope (no etchant attack) because it is amorphous or very fine-grained.

Mechanisms (debated; both contribute):
- **Thermally driven:** high flash temperatures at the tool-chip interface and workpiece surface cause rapid austenization and then martensite formation on quenching by the bulk material.
- **Mechanically driven:** severe plastic deformation refines grain size to nano-scale, changing phase stability.

WL thickness increases with wear (worn tool = more rubbing = more heat). Fresh PCBN insert: WL < 1 µm. Worn insert (VB > 0.15 mm): WL 5–10 µm. **WL is a fatigue crack initiation site** — bearing races with WL have 50–90% reduction in rolling contact fatigue life.

**Source:** D. Umbrello, R. M'Saoubi, J.C. Outeiro, "The influence of Johnson-Cook material constants on finite element simulation of machining of AISI 316L steel," *International Journal of Machine Tools and Manufacture*, 47(3–4), 2007. Also: A. Barbacki, M. Kawalec, A. Hamrol, "Turning and grinding as a source of microstructural changes in the surface layer of hardened steel," *Journal of Materials Processing Technology*, 133(1–2), 2003, pp. 21–25.

### Residual stress depth profile and the "flip"
In hard turning with a sharp, fresh insert:
- Surface residual stress: **compressive** (beneficial, −400 to −800 MPa). Caused by mechanical plastic deformation dominating.
- Below surface (~20–50 µm): tensile peak (+200 to +400 MPa). This is the classic bimodal profile.

With a worn insert (VB > 0.15–0.2 mm) or high cutting temperature:
- Surface residual stress **flips to tensile** (+100 to +400 MPa). Thermal softening overrides mechanical compressive effect.

**Critical implication for PRISM:** If WhiteLayerDetectionEngine or HardTurningDecisionEngine detects wear above a threshold, it must flag residual stress as likely tensile and recommend verification before approving the part for fatigue-critical applications.

**Source:** H.K. Tönshoff, C. Arendt, R. Ben Amor, "Cutting of Hardened Steel," *CIRP Annals*, 49(2), 2000, pp. 547–566. I.S. Jawahir et al., "Surface integrity in material removal processes: Recent advances," *CIRP Annals*, 60(2), 2011, pp. 603–626.

### PCBN grade selection for hard turning
PCBN inserts divide into:
- **Low-CBN content (CBN% 40–65), ceramic binder (Al₂O₃ or Ti(C,N)):** e.g., Sandvik CB7015, Kennametal KD1425. Best for: continuous hard turning of case-hardened or through-hardened steels HRC 48–65. Ceramic binder provides hot hardness + chemical stability. Requires stable, vibration-free setup.
- **High-CBN content (CBN% 80–95%), metallic binder:** e.g., Sandvik CB50, Kennametal KB5625. Best for: interrupted hard turning, gray cast iron, mixed hard/soft. More tough, less hot-hardness.

Cutting parameters for hard turning with PCBN (continuous, steel HRC 58–62):
- V = 100–180 m/min (lower for interrupted)
- f = 0.05–0.15 mm/rev
- DOC = 0.05–0.25 mm (finishing pass)
- Dry preferred (avoid thermal shock from coolant); when coolant used, apply flood continuously

### Barkhausen noise NDE (non-destructive evaluation)
Barkhausen noise (magnetic emission during domain wall motion in ferromagnetic material) is directly correlated with residual stress and microstructure. Tensile RS → increased Barkhausen emission; compressive RS → suppressed emission. White layer → very low emission (amorphous, no magnetic domains).

**Equipment:** Stresstech Rollscan 350 / Barkhausen analyzer. Standard: SAE AMS 2750-adjacent process audits for aerospace hard turning.

**PRISM wiring opportunity:** `SurfaceIntegrityEngine.ts` or a new `HardTurningBarkausenAssessmentEngine.ts` could output a recommended NDE spot-check interval as a function of insert wear level (from `ToolWearProgressionEngine.ts`).

---

## Sub-domain 4: Workholding Contact Mechanics

### Hertz contact at chuck jaw / jaw-part interface
Each jaw contacts the workpiece on a flat or profiled surface. At the micro-level this is a rough-surface contact problem. For a smooth approximation (Hertz, 1882):

For two cylinders in contact (round bar in V-groove jaw, or cylindrical part in concave jaw):  
Contact half-width: b = √(4·F·R* / (π·E* · L))  
Maximum contact pressure: p₀ = 2F / (π·b·L)  
where R* = (1/R₁ + 1/R₂)^−1 (effective radius), E* = ((1−ν₁²)/E₁ + (1−ν₂²)/E₂)^−1 (effective modulus), L = jaw contact length, F = clamping force per jaw.

**Source:** K.L. Johnson, "Contact Mechanics," Cambridge University Press, 1985.  
**Rough surface extension:** Kogut-Etsion model (Kogut L., Etsion I., "Elastic-Plastic Contact Analysis of a Sphere and a Rigid Flat," *J. Applied Mechanics*, 69(5), 2002) adds asperity compliance — relevant when jaw and workpiece surface roughness Ra > 1.6 µm.

### Thin-wall elastic ring deformation under jaw clamping
When chucking thin-walled rings or sleeves (wall thickness t, OD D), three-jaw clamping causes ovality. The deformation at the jaw contact points vs. between jaws follows elastic ring theory (Timoshenko & Goodier, "Theory of Elasticity," 3rd ed., 1970, Ch. 4):

For three-jaw chuck, max diametral distortion δ_max ≈ F·R³ / (E·I·π)  
where I = t³/12 per unit length, R = mean radius, F = total clamping force.

In practice: if δ_max > 0.01·t (1% of wall thickness), the part will spring back to an oval when unclamped, creating out-of-roundness on the ID bore (machined while clamped ≠ free-state geometry).

**JM Die implication:** LTH-01..07 chuck thin-walled die bushings (OD 50–150 mm, wall t = 3–8 mm). ChuckJawForceEngine.ts should flag when elastic ring deformation exceeds tolerance. If it does not already compute δ_max, this is the enhancement.

### Jaw pre-bore for bearing/precision fits
For precision OD turning or ID boring of a part held in a chuck, the jaws must be pre-bored (turned with a facing cut while clamped under normal clamping force) to match the exact part geometry. This:
1. Eliminates jaw rocking on a turned surface
2. Distributes clamping force over the full jaw width
3. Reduces marking / galling on soft materials (aluminum, copper alloys)

**Rule:** re-bore jaws whenever OD change > 5% of previous part diameter or material changes from steel to non-ferrous.

**PRISM wiring:** `ChuckJawForceEngine.ts` could output a jaw pre-bore recommendation based on current part OD vs. jaw-book OD stored in JM Die machine configuration.

---

## Sub-domain 5: Swiss-Type Lathe Guide Bushing Physics

### Bar-through-bushing kinematics
Swiss-type lathes (Citizen, Star, Tornos, Tsugami) feed the bar through a fixed guide bushing located very close (1–5 mm) behind the cutting zone. This means:
- The unsupported length L between bushing face and tool tip is always short (typically 1–15 mm)
- L/D ratios are ~0.1–0.5 vs. 4–8 for conventional lathes
- Deflection is essentially zero for normal bar diameters (1–32 mm range)

The bushing itself rotates (in synchrony with the bar) to minimize friction. The bar feeds axially (Z-axis) through the bushing while the headstock/collet assembly moves axially.

### ISO 286 h6 bar tolerance and bushing clearance
Swiss lathes are extremely sensitive to bar straightness and diameter tolerance:
- Bar tolerance: ISO 286 grade h6 required (e.g., 6 mm bar: 6.000 / 5.991 mm)
- Bushing bore: typically H6 or H7 (bilateral + tolerance)
- Diametral clearance: 5–12 µm typical for precision Swiss work

If bar straightness exceeds ~0.2 mm/m (typical cold-drawn tolerance), the bar whips in the bushing at high RPM. Vibration enters the cutting zone and creates chatter-like patterns.

**Source:** Citizen Machinery Co., "Swiss Type Automatic Lathe Programming Manual" (current edition, per-model variant); Star Micronics Co., "Swiss-Type Programming Guide."

### Coulomb friction in bushing and thermal expansion trap
The bushing-bar interface has Coulomb friction coefficient μ ≈ 0.05–0.15 (lubricated bronze bushing on steel bar). The axial feed force must overcome:
F_friction = μ · N · π · D · L_bushing
where N = radial contact force (from bar weight + cutting force reaction), L_bushing = bushing length.

At high RPM (>10,000 RPM for small-diameter Swiss work), the bushing heats from friction. Thermal expansion of the bushing bore reduces clearance → risk of seizure if lubrication fails. Most CNC Swiss lathes run oil-bath lubrication or coolant-through-bushing to manage this.

### Vibration damping through the bushing
Because the bar is continuously supported within ~5 mm of the cut, the dynamic stiffness at the tool tip is dominated by the bar's stiffness over length L_unsupported, not the full bar length. The bushing effectively acts as a bearing that clamps all bar vibration modes with wavelength > 2·L_unsupported. This is why Swiss lathes can achieve excellent surface finish on slender parts (D = 1–6 mm) at very high RPM that would cause chatter on a conventional lathe.

**Tornos application note:** "Guide Bushing Selection and Maintenance" (Tornos SA, Moutier, Switzerland) documents clearance tables, oil viscosity grades (ISO VG 32–46 for Swiss oil), and the minimum pre-load preload contact required to prevent bar whip.

---

## Wiring / Consumers (R15)

| Sub-domain | Existing PRISM engine | Enhancement |
|---|---|---|
| Thermal modeling | `CuttingTemperatureEngine.ts`, `ThermalWearCouplingEngine.ts` | Add Trigger-Chao β computation from material λ/ρ/c; validate against Shaw Table 11.1 |
| Tool wear beyond Taylor | `ToolWearProgressionEngine.ts`, `AdvancedWearPhysicsEngine.ts` | Wire BUE speed-range flag (50–120 m/min for steel); add CVD/PVD coating selector action to `turningDispatcher.ts` |
| Hard turning surface integrity | `HardTurningCapstoneEngine.ts`, `HardTurningDecisionEngine.ts`, `SurfaceIntegrityEngine.ts` | Add WL thickness vs. VB model (linear fit from Barbacki 2003); residual stress sign flag; PCBN grade selector |
| Workholding contact mechanics | `ChuckJawForceEngine.ts` | Add elastic ring δ_max; jaw pre-bore recommendation |
| Swiss-type guide bushing | `SwissGuideBushingPhysicsEngine.ts` | Add thermal expansion seizure risk (clearance vs. ΔT); bushing oil grade recommendation |

All wiring should round-trip through `turningDispatcher.ts` (373 actions) — check that each new capability is represented by an action; if not, add the action and tests.

---

## Next — Phase 5 (honestly scoped)

Phase-4 covers the five sub-domains above at the equation/standard level. Phase-5 candidates (not yet covered in any PRISM anchor):
1. **Turning dynamics — chatter in face-turning and parting operations** (different from boring-bar chatter; involves workpiece compliance and the "wavy surface" regeneration; Altintas Ch. 4 on turning SLD specifics for face-turning)
2. **Adaptive control in turning (AC-MAX / AC-CONST)** — force-based adaptive control theory (Lauderbaugh & Ulsoy, 1988, *Journal of Engineering for Industry*); implementation on Fanuc/Okuma via macro-level variable monitoring
3. **Wiper insert geometry and Ra prediction corrections** — the Ra ≈ f²/(32·rε) formula is valid for standard round nose; wiper inserts (parallel land) change the Ra formula to Ra ≈ f² / (32·r_wiper) with r_wiper being the wiper radius (larger → lower Ra); Sandvik CoroTurn wiper geometry selection
4. **MQL vs. cryogenic: surface integrity comparison for different materials** — LN2 gives compressive RS for Ti-6Al-4V and HRSA; MQL does for steels but may not for Ti; source: Jawahir et al., CIRP Annals 60(2), 2011 (phase-3 already cites cryogenic but not the material-specific RS data)
5. **Swiss lathe sub-spindle programming and bar-remnant management** — sub-spindle sync (Citizen SYNCHRO, Star C-axis hand-off), bar remnant ejection sequences, material-saving cut-off routines

---

## Sources

1. J.C. Jaeger, "Moving Sources of Heat and the Temperature at Sliding Contacts," *Proceedings of the Royal Society of NSW*, 76, 1942, pp. 203–224.
2. K.J. Trigger & B.T. Chao, "An Analytical Evaluation of Metal-Cutting Temperatures," *Trans. ASME*, 73(1), 1951, pp. 57–68.
3. M.C. Shaw, *Metal Cutting Principles*, 2nd ed., Oxford University Press, 1984 (particularly Ch. 11 on thermal analysis).
4. ISO 3685:1993, "Tool Life Testing with Single-Point Turning Tools."
5. N.N. Zorev, *Metal Cutting Mechanics*, Pergamon Press, 1966.
6. G. Boothroyd & W.A. Knight, *Fundamentals of Machining and Machine Tools*, 3rd ed., CRC Press, 2006.
7. Sandvik Coromant, *Turning Catalogue* (current edition) — grade designation table PVD/CVD.
8. D. Umbrello, R. M'Saoubi, J.C. Outeiro, "The influence of Johnson-Cook material constants on FE simulation of machining," *Int. J. Mach. Tools Manufact.*, 47(3–4), 2007.
9. A. Barbacki, M. Kawalec, A. Hamrol, "Turning and grinding as a source of microstructural changes," *J. Materials Processing Technology*, 133(1–2), 2003, pp. 21–25.
10. H.K. Tönshoff, C. Arendt, R. Ben Amor, "Cutting of Hardened Steel," *CIRP Annals*, 49(2), 2000, pp. 547–566.
11. I.S. Jawahir et al., "Surface integrity in material removal processes: Recent advances," *CIRP Annals*, 60(2), 2011, pp. 603–626.
12. K.L. Johnson, *Contact Mechanics*, Cambridge University Press, 1985.
13. L. Kogut & I. Etsion, "Elastic-Plastic Contact Analysis of a Sphere and a Rigid Flat," *J. Applied Mechanics*, 69(5), 2002.
14. S. Timoshenko & J.N. Goodier, *Theory of Elasticity*, 3rd ed., McGraw-Hill, 1970 (Ch. 4: rings and curved bars).
15. Citizen Machinery Co., *Swiss Type Automatic Lathe Programming Manual* (per-model).
16. Tornos SA, "Guide Bushing Selection and Maintenance" (application note, Moutier, Switzerland).
17. Stresstech Group, *Rollscan 350 Barkhausen Noise Analyzer* (instrument documentation).

Planner: Hermes (xAI Grok, :8645) consulted but result not returned before compaction; content derived from canonical sources above, tempered per R12.
