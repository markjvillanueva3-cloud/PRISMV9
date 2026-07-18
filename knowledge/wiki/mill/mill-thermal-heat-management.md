---
title: Mill Thermal & Heat Management — partition, dissipation, coolant, distortion (calc-feed)
type: reference
domain: mill
tags: [mill, thermal, heat, heat-partition, coolant, TSC, MQL, thermal-distortion, tool-wear, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-cutting-tool-reference, mill-insert-grade-coating-selection, mill-machine-stack-reference, coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting, mill-data-contents-inventory]
---

# Mill Thermal & Heat Management

> Operator ask 2026-06-12: *"heat dissipation… thermodynamics… tool wear."* Where the heat goes decides tool life, dimensional accuracy, and which coolant strategy wins. Grounded in the **real material thermal data** in `mcp-server/src/physics/constants.ts` (`_RAW_MATERIAL_DB`) + cited milling tips; coolant *practice* links the canonical [[coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting]] (this page = the *why*, that page = the *how*).

## §1 — Heat partition (where the heat goes)
Cutting work converts almost entirely to heat, split three ways: **chip / workpiece / tool** *(eng.)*. The split shifts with cutting speed: **faster cutting pushes a larger fraction into the chip** (it leaves with the chip before it can conduct into the tool/part) — this is why HSC can run hotter at the shear zone yet keep the *tool* cooler. `constants.ts` carries heat-partition fractions (`eta_*`, e.g. `eta_inconel: 0.18` :258) for the force/thermal engines — reference, do not inline.

## §2 — Material thermal conductivity → heat-at-the-edge (cite: `constants.ts:126-147`)
Thermal conductivity `k` [W/(m·K)] decides whether heat *leaves through the part* or *piles up at the cutting edge*:

| Material | ISO | k (W/m·K) | Behavior | Taylor C (life proxy) |
|----------|-----|-----------|----------|------------------------|
| C11000 Copper | N | **391** | dumps heat instantly | 600 |
| **6061 Al** | N | **167** | dissipates fast → high SFM OK | 600 |
| 7075 Al | N | 130 | fast | 600 |
| C26000 Brass | N | 120 | fast | 600 |
| WC (carbide) | H | 84 | — | 120 |
| 1018 / 1045 / 4140 steel | P | 51.9 / 49.8 / 42.7 | moderate | 350 |
| gray iron | K | 46 | moderate | 250 |
| A2 / D2 tool steel | H | 28.6 / 20.5 | retains | 120 |
| 304 / 316 stainless | M | **16.2 / 16.3** | **retains → edge heats** | 200 |
| **Inconel 718** | S | **11.4** | retains hard | 150 |
| **Ti-6Al-4V** | S | **6.7** | **worst — heat stays at the edge** | 150 |

The pattern is unmistakable: **low-k (Ti 6.7, Inconel 11.4, stainless 16) → the heat can't escape through the part, so it cooks the cutting edge → that's why their Taylor C (150–200) is a fraction of aluminium's (600).** It is the thermodynamic reason superalloys/Ti must run low SFM + flood coolant (cite tip Ti SFM 50–250 + flood, `milling-pdf-cited-tips.ts:1114`).

## §3 — The chip as a heat sink (counter-intuitive, cited)
- **High-feed milling: run LOWER SFM than nominal** — the thick chip carries heat away; reducing SFM lets the chip do more cooling per rev, extending life (src: `milling-pdf-cited-tips.ts:775`, DAPRA).
- **Larger radial engagement → each tooth spends less time in the cut → better heat dissipation into the chip** (src: `:1254`, Helical A/B measured). This is the HEM/trochoidal thermal advantage, not just the force one.
- **Sharp + positive rake → lower heat at the edge** (cleaner shear, src: `:551`). Negative rake adds force + heat.

## §4 — Coolant strategy (the *why*; the *how* is the canonical)
| Method | Wins when | Cite |
|--------|-----------|------|
| **Flood** | steel/stainless/Ti continuous cut; needs bulk heat removal | tip Ti flood `:1114` |
| **Through-spindle (TSC) >1000 PSI** | deep pockets/drilling — ejects chips before the next flute recuts them (chip recut = heat + broken insert) | `:3075` |
| **Air / through-spindle air** | aluminium HSC (prevents BUE without thermal-shock cracking) + thermal-shock-sensitive material | `:535` |
| **MQL** | near-dry, aluminium/light — minimal coolant + lubrication | canonical |
| **Dry** | cast iron (K) — coolant causes thermal cracking on interrupted carbide | canonical |
| **Magnesium → flood/MQL MANDATORY** | Mg chips are pyrophoric below proper SFM | `:1176` |

## §5 — Thermal distortion & spindle growth
- A **hot part grows**; measured hot, it reads oversize, and after cooling it's undersize *(eng.)*. Precision work: let the part thermally soak, or temperature-compensate the measurement.
- **Spindle thermal growth** drifts Z over a run (machine-stack [[mill-machine-stack-reference]] §1). The data backs an active fix: a cited tip describes **spindle thermal compensation with temperature sensors + OPC-UA** (`milling-pdf-cited-tips.ts:1860`, USPTO patent + Makino). Warm-up cycles before precision work are non-optional on a cold spindle.

## §6 — Feeds the calculations (operator intent)
- **k + heat-partition (`constants.ts`)** → predicted **edge temperature** → **Taylor tool life** (the table above shows low-k → low Taylor C directly). A life calc that ignores k mis-predicts Ti/Inconel/stainless by a lot.
- **Material + coolant** → the realistic **SFM ceiling** (Ti dry vs Ti flood are different speed regimes).
- **Spindle/part thermal growth** → an **accuracy-over-time** term: first-part-in-spec ≠ Nth-part-in-spec on a warming machine.
- Doctrine: heat is *the* hidden variable behind tool wear and dimensional drift — wiring `k`, the heat-partition η, and a coolant-effectiveness factor into the speed/feed + tool-life calc is how PRISM stops treating every material as if it sheds heat like aluminium.

## Shop-floor tips (tribal)
- Low-k material (Ti 6.7, Inconel 11.4, stainless 16) = **heat stays at the edge** → low SFM + flood, never dry. (src: `constants.ts:129-134`)
- Aluminium dumps heat (k=167) → run fast + air-blast (not flood) to avoid BUE without thermal shock. (src: `constants.ts:131` + tip `:535`)
- High-feed: drop SFM, let the thick chip be the heat sink — counter-intuitive but measured. (src: `:775`)
- Cast iron → dry; coolant thermal-shocks the carbide on the interrupted cut. (canonical)
- Cold spindle → warm-up cycle before precision Z work; the spindle grows microns as it heats. (src: `:1860`)

## Source data (cite)
`constants.ts:126-147` (`_RAW_MATERIAL_DB` k/cp/melting for 15 materials) + `eta_*` heat-partition. Cited thermal/coolant tips `milling-pdf-cited-tips.ts` (:535/:775/:1114/:1176/:1254/:1860/:3075). Coolant practice: [[coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting]]. Full surface: [[mill-data-contents-inventory]] §7.
