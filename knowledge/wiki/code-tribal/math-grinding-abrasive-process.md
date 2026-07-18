---
schema: ideablock-v1
title: "Grinding & abrasive machining — undeformed chip, specific energy, G-ratio, thermal damage"
domain: "Abrasive machining"
category: manufacturing-math
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Malkin & Guo "Grinding Technology" 2e
  - Rowe "Principles of Modern Grinding Technology"
  - Marinescu et al. "Handbook of Machining with Grinding Wheels"
  - Jaeger moving-heat-source solution / Malkin thermal model
  - Machinery's Handbook 31e — grinding & abrasive processes
---

## Question

Grinding is cutting by thousands of random abrasive grits — what is the
undeformed chip each grit takes, why is the specific energy 10–100× milling,
and where does all that heat go (and burn the part).

## Answer (canonical — tiny chips, huge specific energy, heat into the workpiece)

### 1. The process — random grits, each a negative-rake micro-tool

A grinding wheel presents thousands of abrasive grits, each a tiny cutting
edge with a large **negative rake** and a rounded tip. Each grit passes
through three regimes as its depth builds: **rubbing** (elastic, no removal) →
**ploughing** (plastic side-flow, no removal) → **cutting** (a chip forms).
Only the cutting fraction removes metal; rubbing + ploughing is pure heat.

### 2. Undeformed chip thickness

The maximum undeformed chip thickness per grit (Malkin):
```
h_max = [ (4 / (C·r)) · (v_w / v_s) · √(a / d_e) ]^½
```
`v_w` workpiece speed, `v_s` wheel speed, `C` active cutting-grit density per
unit area, `r` the chip width-to-thickness ratio, `a` depth of cut, `d_e` the
equivalent wheel diameter (§3). `h_max` is on the order of **micrometres** —
the **size effect**: chips this small make specific energy explode (§5).

### 3. Equivalent wheel diameter

The kinematic contact depends on whether the workpiece curves with or against
the wheel:
```
1/d_e = 1/d_s + 1/d_w     external cylindrical grinding
1/d_e = 1/d_s − 1/d_w     internal grinding  (d_e > d_s — longer, hotter contact)
d_e   = d_s               surface grinding   (flat work, d_w → ∞)
```
`d_s` wheel diameter, `d_w` workpiece diameter. The contact length
`l_c ≈ √(a · d_e)`.

### 4. Material removal rate

The **specific MRR** (per unit width of cut) is the headline productivity
number:
```
Q'_w = a · v_w           [mm³/(mm·s)]   — the "Q-prime"
```
Total MRR = `Q'_w · b`, `b` the grinding width.

### 5. Specific grinding energy — the size effect

```
u = P / (Q'_w · b) = F_t · v_s / (a · v_w · b)        [J/mm³]
```
Grinding's specific energy is **10–100× that of milling/turning** because the
chips are micrometre-scale — at that size the energy is dominated by
ploughing, rubbing and the material's strengthening at high strain. **Almost
all of `u` becomes heat**, and that is the central problem of grinding.

### 6. Grinding forces

Tangential `F_t` (sets power, `P = F_t·v_s`) and normal `F_n`. Because grits
have steep negative rake the **force ratio is high**:
```
F_n / F_t ≈ 1.5 – 3        (vs ≈ 0.3–0.5 typical for milling)
```
A high normal force means grinding deflects slender work badly — spark-out
passes exist to let that deflection relax.

### 7. The grinding ratio G

The wheel wears as it cuts; the economic indicator:
```
G = (volume of workpiece removed) / (volume of wheel wear)
```
High `G` = a hard/durable wheel (fewer dresses, but more heat as grits dull);
low `G` = a free-cutting wheel (cool, but consumed fast). Wheel grade is the
`G`-vs-heat trade.

### 8. Thermal damage — where grinding goes wrong

Unlike milling (the chip carries most heat away), in grinding **most of the
heat enters the workpiece** — the chips are too small to be a heat sink. The
contact zone is a moving heat source; the Jaeger / Malkin solution gives the
peak surface temperature:
```
T_max ∝ (energy partition β) · u · Q'_w / √(l_c · thermal properties)
```
Exceed the material's threshold and you get **grinding burn**: temper burn
(softening), rehardening burn (a brittle untempered-martensite layer) and,
worst, **tensile residual stress** at the surface — a fatigue-life killer.
The burn threshold caps real-world `Q'_w` far below the power limit.

### 9. Dressing — resetting the wheel

The wheel must be **dressed** to expose fresh sharp grits and true its form.
The dressing **lead** and **depth** set the surface roughness of the wheel,
hence the effective grit density `C` and `h_max`:
- coarse dressing → fewer, sharper cutting points → free, cool cutting, rough
  finish;
- fine dressing → many dull contacts → smoother finish but more rubbing → heat.
Dressing is the primary "sharpness" control knob.

### 10. Wheel specification

Grit (material + size), **grade** (bond strength — how easily grits release),
**structure** (grit spacing / porosity) and **bond** type. A wheel that is too
hard for the job glazes (grits dull instead of releasing) → rubbing → burn;
too soft → it wears too fast (low `G`). Match grade to `Q'_w` and workpiece.

## Anti-patterns

- **Chasing MRR into the burn threshold** — the power limit is far above the
  thermal limit; `Q'_w` is capped by `T_max`, not by spindle power.
- **Poor coolant delivery** — grinding coolant must penetrate the contact arc,
  not just flood the area; a blocked or mis-aimed nozzle → instant burn.
- **A glazed (too-hard) wheel** — dull grits rub instead of cut, all energy
  becomes heat; dress, or pick a softer grade.
- **Ignoring `d_e`** — internal grinding has a much longer contact arc (hotter)
  than external at the same `a`; it cannot run the same `Q'_w`.
- **No spark-out** — the high `F_n` leaves the part deflected; ending without
  spark-out passes leaves a tapered/oversize result.
- **Over-fine dressing for "finish"** — trades a smoother wheel for more
  rubbing heat; finish from a burnt surface is worthless.

## Cross-references

- [[math-cutting-mechanics-merchant-oxley]] — the size effect, contrasted: grinding is the extreme small-chip limit
- [[math-speed-feed-the-full-physics]] — wheel/work-speed selection feeding `h_max` and `Q'_w`
- [[math-machine-domains-dynamics-kinematics-accuracy]] — the high `F_n` and part deflection
- [[math-metrology-measurement-uncertainty]] — residual-stress and burn measurement
- [[math-engineering-mechanics-of-materials]] — residual stress, the fatigue consequence of tensile surface stress

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-GRINDING — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Grinding is a core finishing process with physics distinct
from milling/turning (random abrasive grits, thermal-dominated) and had no
dedicated math entry. Confidence 0.95 — canonical Malkin/Rowe grinding theory.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `grinding`, `abrasive`,
`undeformed chip thickness`, `specific grinding energy`, `grinding ratio`,
`G-ratio`, `grinding burn`, `equivalent wheel diameter`, `dressing`, `Q-prime`,
`spark-out` keywords. Zero new wiring required.
