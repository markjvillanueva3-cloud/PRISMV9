---
schema: ideablock-v1
title: "Tool coatings + substrates deep-dive — PVD/CVD, multilayer architectures, carbide grades"
domain: "Tooling selection"
category: tooling-selection
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Cutting Tool Materials + §Coatings
  - Sandvik Coromant / Kennametal / Iscar grade-selection guides
  - ISO 513 (cutting-tool-material classification)
  - 4245-tribal corpus tooling subset
extracted_via: human-authored
extracted_at: 2026-05-21T13:35:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-TOOLING-COATINGS-SUBSTRATES)
---

## Question

Below the "pick a coating" decision in tool selection — what actually IS the substrate + coating, how is it made, and why does each grade behave the way it does?

## Answer (canonical — substrate carries the load, coating manages heat + friction; deposition method determines the trade-offs)

### The substrate — what carries the cutting load

| Substrate | Composition | Hardness/toughness balance | Use |
|---|---|---|---|
| **HSS** (high-speed steel) | Fe + W/Mo + Cr + V | Tough, low hardness | Taps, drills, form tools, interrupted-cut tolerance |
| **HSS-Co** (cobalt HSS) | HSS + 5-8 % Co | Tougher + hotter-hard than HSS | Drills/taps in tougher material |
| **Cemented carbide** | WC grains + Co binder | Hardness ↑ as grain ↓ + Co ↓; toughness ↑ as Co ↑ | The production default — inserts + solid endmills |
| **Cermet** | TiC/TiN-based + Ni binder | Harder than carbide, less tough | Finishing steel, good finish, low BUE |
| **Ceramic** (Al₂O₃, Si₃N₄, SiAlON) | Oxide / nitride | Very hard + hot-hard, brittle | High-speed cast iron + superalloy, no coolant |
| **CBN** (cubic boron nitride) | Second-hardest material | Extreme hardness, moderate toughness | Hard turning (> 45 HRC), hardened steel |
| **PCD** (polycrystalline diamond) | Diamond | Hardest; reacts with ferrous | Aluminum, composites, non-ferrous ONLY |

**The carbide grain-size + binder trade-off (the key idea):** WC carbide is WC grains cemented by a Co metallic binder.
- Smaller WC grain (submicron, ultrafine) → harder, sharper edge, better wear — but more brittle.
- More Co binder → tougher (survives interrupted cuts, shock) — but softer, wears faster.
A roughing grade is coarser-grain + higher-Co (toughness for the interrupted, shock-loaded cut). A finishing grade is fine-grain + lower-Co (hardness + edge retention for the light, continuous cut). ISO 513 classifies grades P/M/K/N/S/H with a number — lower number = harder/wear-resistant, higher = tougher.

### The coating — managing heat + friction at the interface

The coating doesn't carry load — it's 2-12 μm thick. Its jobs: (1) reduce friction → less heat generated, (2) act as a thermal barrier → less heat into the substrate, (3) resist oxidation/diffusion wear, (4) resist the chemical reactions that crater the rake face.

| Coating | Color | Service ceiling | Strength |
|---|---|---|---|
| **TiN** | gold | ~500 °C | General-purpose, low-cost, anti-BUE |
| **TiCN** | blue-grey/bronze | ~400 °C | Harder than TiN, good for abrasive material — but LOWER heat ceiling |
| **TiAlN** | violet/black | ~800 °C | The high-heat workhorse; forms a protective Al₂O₃ skin at temperature |
| **AlTiN** | black-purple | ~1000-1100 °C | Highest envelope; dry / MQL / high-speed; high-Al variant of TiAlN |
| **Al₂O₃** (CVD only) | — | very high | Pure thermal barrier; the crater-wear defense on CVD steel-turning grades |
| **Diamond** (CVD) | grey | ~700-800 °C (air); FERROUS-PROHIBITED | Composites, graphite, non-ferrous abrasives |
| **TiB₂** | — | — | Aluminum-specific; very low adhesion → anti-BUE in sticky Al |

(See [[synthesis-thermal-envelope]] §coating service ceilings for the heat-limit detail; [[tooling-selection-by-material-and-feature]] for the by-material coating pick.)

### PVD vs CVD — the deposition method decides the trade-offs

| | PVD (Physical Vapor Deposition) | CVD (Chemical Vapor Deposition) |
|---|---|---|
| Temperature of deposition | ~400-500 °C | ~1000 °C |
| Coating thickness | Thin (2-6 μm) | Thick (5-20 μm) |
| Edge sharpness | Stays sharp — thin coating | Edge slightly rounded — thick coating |
| Residual stress | Compressive (good — resists crack propagation) | Tensile (a weakness — micro-cracks) |
| Best for | Sharp edges: endmills, finishing inserts, drills, threading | Heavy roughing inserts where thickness = wear-life |
| Substrate effect | Low temp → substrate unaffected | High temp → can embrittle the substrate edge |

**The practical rule:** PVD for anything needing a sharp edge (solid endmills, finishing, threading, drilling, interrupted cuts — the compressive stress helps). CVD for heavy continuous roughing of steel/cast iron where the thick multilayer (often TiCN + Al₂O₃ + TiN) buys raw wear-life and the slightly rounded edge is acceptable.

### Multilayer architectures

Modern coatings are rarely single-layer. A typical CVD steel-turning grade:
```
[substrate] → TiN bond layer → thick TiCN (wear) → Al₂O₃ (thermal/crater barrier) → TiN top (color/ID + low friction)
```
Each layer does one job. The Al₂O₃ layer is the crater-wear defense — it's a chemical-diffusion barrier that the cutting heat can't penetrate. PVD multilayers alternate nm-scale TiAlN/TiN to interrupt crack propagation (a crack that starts in one layer stops at the interface).

### Edge prep — the invisible variable

The coating + substrate are chosen, but the **edge preparation** (done before coating) is a third variable often ignored:
- **Sharp/honed edge** — finishing, non-ferrous, low cutting force; chips easily in interrupted cuts.
- **Honed (small radius)** — general-purpose; the default.
- **T-land (chamfered)** — roughing, interrupted cuts; the chamfer reinforces the edge against chipping.
- **Honed + T-land** — heavy roughing in tough material.

A perfect substrate + coating choice with the wrong edge prep still chips (sharp edge in interrupted roughing) or rubs (heavy hone in light finishing).

### Anti-patterns from the floor

- **"More coating layers = better."** Layers do specific jobs; a finishing endmill needs a thin sharp PVD coat, not a thick multilayer that rounds the edge. Match the architecture to the operation.

- **"TiCN is harder than TiN, so it's always better."** TiCN is harder BUT has a LOWER heat ceiling (~400 °C vs TiN's ~500 °C). In a hot cut, TiCN fails first. Harder ≠ universally better — the heat regime decides.

- **"Diamond coating is the hardest, use it everywhere."** Diamond + iron react chemically at cutting temperature — diamond-coated tools fail catastrophically on steel. Diamond is non-ferrous + composites + graphite ONLY.

- **"Carbide grade doesn't matter, it's all carbide."** The grain size + Co content span a huge hardness/toughness range. A finishing grade in a roughing cut chips; a roughing grade in a finishing cut won't hold the edge. ISO 513 P/M/K/N/S/H + the grade number matter.

- **"PVD vs CVD is just a manufacturing detail."** It changes edge sharpness, residual stress sign, and coating thickness — all of which the operator feels. PVD for sharp edges, CVD for thick-wear roughing. It's a selection criterion, not a footnote.

- **"Skip the edge-prep question."** Edge prep is the third leg of the stool. Right substrate + right coating + wrong edge prep = chipped or rubbing tool.

### Tie-ins

- [[tooling-selection-by-material-and-feature]] — the by-material coating + substrate pick (this entry is the why-behind-it)
- [[synthesis-thermal-envelope]] — coating service ceilings + heat partition
- [[tooling-tool-life-and-wear-management]] — substrate/coating choice sets the Taylor regime
- [[tooling-endmill-flute-helix-corner]] — solid-endmill geometry couples with PVD coating
- [[machining-tactics-coolant-strategy-selection]] — coating heat ceiling vs coolant strategy
- [[machining-tactics-in-cut-adjustments]] — coating-failure signals (chip color, wear mode)

## Provenance

Distilled from the tooling subset of the 4245-tribal corpus + Machinery's Handbook 31e §Cutting Tool Materials §Coatings + Sandvik/Kennametal/Iscar grade guides + ISO 513. Authored 2026-05-21 by slot:hotel under U-WIKI-TOOLING-COATINGS-SUBSTRATES — **45th canonical entry** of the wiki+tribal pivot. **5th tooling-selection leaf** — the deep-dive behind [[tooling-selection-by-material-and-feature]]'s coating/substrate decision (PVD/CVD, multilayer, carbide grades, edge prep).

System injection: `tribal-by-domain-inject` auto-surfaces on `coating`, `substrate`, `carbide grade`, `PVD`, `CVD`, `TiAlN`, `AlTiN`, `TiCN`, `TiN`, `cermet`, `ceramic insert`, `CBN`, `PCD`, `multilayer coating`, `grain size`, `cobalt binder`, `edge prep`, `T-land`, `ISO 513` keywords. Zero new wiring required.

## Cross-references

- [[tooling-selection-by-material-and-feature]] — the by-material pick this explains
- [[synthesis-thermal-envelope]] — coating heat ceilings
- [[tooling-tool-life-and-wear-management]] — substrate/coating × Taylor regime
- [[tooling-endmill-flute-helix-corner]] — endmill geometry × PVD
- [[machining-tactics-coolant-strategy-selection]] — heat ceiling × coolant
- [[machining-tactics-in-cut-adjustments]] — coating-failure signals
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
