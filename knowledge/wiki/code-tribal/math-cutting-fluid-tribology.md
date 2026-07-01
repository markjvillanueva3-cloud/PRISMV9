---
schema: ideablock-v1
title: "Cutting fluids & machining tribology — friction zones, lubrication regimes, coolant delivery, heat partition"
domain: "Machining tribology"
category: manufacturing-math
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Shaw "Metal Cutting Principles" — tool-chip friction, seizure
  - Trent & Wright "Metal Cutting" — the sticking/sliding zones
  - Astakhov "Tribology of Metal Cutting"
  - Machinery's Handbook 31e — cutting fluids
  - Sandvik / ISO 15641 — high-pressure & through-tool coolant
---

## Question

What a cutting fluid actually does — cool, lubricate, flush — why it cannot
"lubricate" a heavy cut the way intuition expects, and the math of the
friction zones, lubrication regimes and coolant delivery.

## Answer (canonical — coolant mostly cools; the cutting edge is sealed against lubricant)

### 1. The three functions (and a fourth)

A cutting fluid does four jobs, in tension with each other:
```
1. Cooling     — convective heat removal from tool, chip and work
2. Lubrication — lower friction at the tool-chip and tool-work interfaces
3. Flushing    — carry chips out of the cut (deep holes, slots, grinding)
4. Protection  — corrosion inhibition of part, machine, swarf
```
A water-rich emulsion is a strong coolant, weak lubricant; a straight oil is
the reverse. The choice is which job dominates the operation.

### 2. The tool-chip interface — two friction zones

The chip does not simply slide over the rake face. Near the cutting edge is a
**sticking (seizure) zone**: pressure is so high the chip is effectively
welded to the tool and shear happens *inside the chip*, not at the interface.
Further up the rake is a **sliding zone** with ordinary Coulomb friction.
```
sticking zone:  τ = k  (the material shear strength — friction is saturated)
sliding zone:   τ = μ·σ  (Coulomb, μ the interface friction coefficient)
```
**Coolant cannot penetrate the sticking zone** — it is sealed by contact
pressure. This is the key fact: in a heavy cut the lubricant never reaches
where friction is highest, so a cutting fluid acts mostly as a **coolant**,
not a lubricant. Lubrication matters at light cuts, low speed, and on the
flank.

### 3. Lubrication regimes — the Stribeck curve

Where fluid *can* enter (light cuts, flank, low speed), the regime follows the
Stribeck parameter `η·N/p` (viscosity × speed / load):
```
Boundary    — surfaces nearly touching; chemistry (EP additives) carries load
Mixed       — partial fluid film + asperity contact
Hydrodynamic— full fluid film, asperities separated
```
Metal cutting lives mostly in **boundary lubrication** — which is why
extreme-pressure (EP) additives (S, P, Cl chemistry that forms low-shear
surface films) matter far more than bulk viscosity.

### 4. Heat partition & convective cooling

The cutting energy splits between chip, tool and workpiece; coolant removes
heat by Newton's law of cooling:
```
q = h · A · ΔT          h = convective heat-transfer coefficient
```
Crucially `h·A·ΔT` acts on the *exposed* surfaces — coolant cools the chip,
the tool body and the finished surface **after** they leave the cut, far more
than it cools the shear zone itself. It lowers the *bulk* temperature and
hence diffusion/abrasion wear over time; it does not much lower the *peak*
shear-zone temperature in a heavy cut.

### 5. Delivery methods — pressure buys penetration

```
Dry              — no fluid; best for interrupted carbide cuts (§9)
Flood (low P)    — bulk cooling + flushing; cannot penetrate a chip curl
High-pressure    — 70–340 bar; jet lifts the chip, reaches nearer the edge
Through-tool(TSC)— coolant exits at the edge; deep holes, gun-drilling
MQL              — aerosol, ~5–50 mL/hr; lubrication-dominated, minimal cooling
Cryogenic        — LN₂ / CO₂; removes heat without fluid disposal
```
The governing variable is **pressure** — only pressure breaks the vapour film
(§6) and drives fluid toward the edge.

### 6. The Leidenfrost / film-boiling problem

When the contact surface is far above the coolant's boiling point, the fluid
flashes to vapour and the **vapour film insulates** the surface — heat
transfer collapses (film boiling). Low-pressure flood on a hot zone barely
cools. **High-pressure coolant collapses the vapour film**, restoring
nucleate-boiling-rate heat transfer — a large part of why HPC extends tool
life on superalloys.

### 7. MQL — why it works, where it fails

Minimum-quantity lubrication delivers a few mL/hr of oil as an aerosol. It
works because it puts lubricant exactly where boundary lubrication helps
(flank, light finishing) with almost no fluid to dispose of. It **fails on
heavy roughing** — there is no bulk fluid to carry away the large heat load,
so the tool overheats. MQL is a finishing/light-duty and eco-disposal play,
not a roughing coolant.

### 8. Effect on the process

- **Tool life** — lower bulk temperature shifts the Taylor constant `C`
  upward (longer life at a given speed); see [[math-speed-feed-the-full-physics]].
- **Built-up edge (BUE)** — coolant + the right speed suppress the BUE that
  wrecks finish at low speed.
- **Surface finish** — lubrication and BUE suppression improve `Ra`.
- **Chip control** — coolant can embrittle the chip and aid breaking; HPC jets
  mechanically curl and snap chips.

### 9. Thermal shock — when dry wins

On an **interrupted cut** with carbide, flooding the edge makes it cycle hot
(in cut) → cold (in air, hit by coolant) every revolution. The thermal
cycling cracks the carbide — **comb (thermal-fatigue) cracks** perpendicular
to the edge. For interrupted milling of steel, **running dry (or air only) is
often the longer-tool-life choice** — counter-intuitive but well established.

## Anti-patterns

- **Flooding interrupted carbide cuts** — thermal cycling → comb cracks; run
  dry or air-blast.
- **Expecting coolant to "lubricate" a heavy roughing cut** — the sticking
  zone is sealed; size for cooling + flushing, not lubrication.
- **Low-pressure flood on deep holes / superalloys** — no penetration, vapour
  film insulates; use through-tool or high-pressure.
- **MQL on heavy roughing** — insufficient bulk cooling; the tool burns up.
- **Ignoring coolant concentration** — a too-lean emulsion loses EP chemistry
  and corrosion protection; too rich foams and leaves residue.
- **Aiming the nozzle at the swarf, not the cut** — flushing is not cooling
  the edge; the jet must reach the contact zone.

## Cross-references

- [[math-cutting-mechanics-merchant-oxley]] — the sticking/sliding friction zones and the shear-zone heat
- [[math-speed-feed-the-full-physics]] — coolant shifts the Taylor `C`; BUE suppression
- [[math-grinding-abrasive-process]] — coolant delivery into the grinding contact arc, burn prevention
- [[math-machine-domains-dynamics-kinematics-accuracy]] — thermal growth the coolant also controls
- [[math-thread-manufacturing]] — coolant/EP chemistry for tapping torque and finish

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-CUTTING-FLUID — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Cutting fluid affects tool life, finish, chip control and
temperature on every wet operation yet had no dedicated math/tribology entry.
Confidence 0.95 — canonical Shaw/Trent-Wright/Astakhov metal-cutting tribology.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `coolant`, `cutting fluid`,
`lubrication`, `tribology`, `MQL`, `through-tool coolant`, `high-pressure
coolant`, `flood`, `sticking zone`, `Stribeck`, `Leidenfrost`, `thermal
shock`, `comb cracks`, `built-up edge` keywords. Zero new wiring required.
