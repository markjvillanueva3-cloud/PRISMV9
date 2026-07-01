---
schema: ideablock-v1
title: "Toolholders + runout control — collet, shrink-fit, hydraulic, milling chuck"
domain: "Tooling selection"
category: tooling-selection
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Tool Holders + §Spindle Interfaces
  - Sandvik Coromant — CoroChuck + HydroGrip technical guides
  - ER Collet system (Rego-Fix) + Schunk TENDO hydraulic + Haimer shrink-fit datasheets
  - ISO 26623 (HSK) + ANSI/ASME B5.50 (CAT) + DIN 69893 (BT) spindle taper specs
  - 4245-tribal corpus tooling-selection subset (n=625)
extracted_via: human-authored
extracted_at: 2026-05-21T05:30:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-TOOLSEL-HOLDERS)
---

## Question

What holder do I clamp the tool in — and how do I keep runout below the 0.01 mm threshold that costs tool life?

## Answer (canonical — pick by runout target + tool diameter + Vc envelope)

### The runout cost (why it matters)

Runout multiplies single-tooth chip load. A nominal 4-flute endmill at fz = 0.05 mm with TIR (Total Indicator Reading) = 0.02 mm has:

```
fz_real = fz_nominal × (1 + TIR / nominal_chip_load)
```

For TIR = 0.02 mm and fz = 0.05 mm: `fz_real = 0.05 × (1 + 0.02/0.05) = 0.07 mm` — 40 % more on one tooth than nominal. That tooth wears at 40 % faster *per cycle*, and it gets all the chatter excitation.

**Rule of thumb:** TIR > 0.010 mm cuts tool life ~30 %; TIR > 0.020 mm cuts it ~50 %; TIR > 0.030 mm: scrap that holder's cuts, you can't compensate. The holder choice + assembly quality determines TIR before the cut starts.

### Holder type comparison

| Holder | TIR (good assembly) | Grip mechanism | Tool change | Cost | When |
|---|---|---|---|---|---|
| **ER collet (Rego-Fix)** | 0.010-0.025 mm | Spring collet squeezed by nut torque | Manual, 30-60 s | $50-200 + $30 collet | General-purpose, prototyping, low-spindle-runout machines |
| **Side-lock end-mill holder (Weldon)** | 0.020-0.040 mm | Set screw against flat on tool | Manual, 15-30 s | $50-150 | Heavy roughing, end-mills only, lower precision |
| **Power chuck (milling chuck, e.g. Big Daishowa NBS)** | 0.005-0.015 mm | Roller bearings clamp tool | Manual, 30-60 s | $300-800 | Heavy cuts where set-screw is too rigid, gentler than ER on tool shank |
| **Hydraulic chuck (Schunk TENDO, Big Daishowa HydroChuck)** | 0.003-0.008 mm | Hydraulic membrane squeezes tool | 15-30 s | $400-1500 | Precision finishing, vibration damping (the membrane absorbs chatter); reusable |
| **Shrink-fit (Haimer, Erowa, Big-Plus)** | 0.003-0.005 mm | Thermal expansion + interference fit | Induction heater + 30 s + cool 60 s | $200-600 + heater $4-15k | Production precision, lights-out, repeatable tool stickout |
| **Polygon-clamping (Pokolm)** | 0.002-0.005 mm | Polygon (3 lobed) thermal interference | Specialty, requires heating | $400-1000 | Highest-precision finishing |

### Selection criteria

```
Roughing                → side-lock or ER (TIR not critical)
Production work         → ER or hydraulic (balance cost + TIR)
Finishing precision     → hydraulic or shrink-fit (TIR < 0.010 mm)
Lights-out + sister tools → shrink-fit (deterministic stickout, no torque variance)
Surface-Ra critical (Ra < 0.4 μm) → shrink-fit or polygon
Vibration-prone (long reach, hard material) → hydraulic chuck (membrane damps)
```

### Spindle taper interface (the upstream connection)

The holder shank interfaces with the spindle via a tapered seat. Three common standards:

| Taper | Common machines | Repeatability | Drawing reference |
|---|---|---|---|
| **CAT (V-flange)** | US machines: Haas, Hurco, Fadal, Mori-Seiki | 0.005-0.015 mm | ANSI/ASME B5.50 |
| **BT (Japanese V-flange)** | Asian machines: Mori, Mazak, Okuma; common in mill | 0.005-0.015 mm | DIN 69893 / MAS-BT |
| **HSK (face + taper double contact)** | European HMC, high-RPM: DMG-Mori, Heller, Makino | 0.001-0.005 mm | ISO 12164 / DIN 69893-1 |

HSK is the high-RPM winner — face-contact eliminates the centrifugal-pull problem CAT/BT has > 20,000 RPM. CAT/BT is dominant in the install base.

**Cross-spindle adapters exist** (e.g. CAT-to-HSK) but they add ~0.005-0.010 mm TIR — never use one for finishing. Match the holder to the machine's native taper for best repeatability.

### Assembly discipline (what kills runout that the holder didn't already kill)

The right holder with wrong assembly is no better than a wrong holder. The 6 disciplines:

1. **Clean the taper, every time.** Chip dust + coolant film on the spindle taper or holder taper = 0.005-0.020 mm of TIR added per dirty contact. Wipe with clean cloth + isopropyl before insertion.
2. **Torque the collet nut to spec.** Under-torque = slip. Over-torque = collet over-compression = oval grip → asymmetric TIR. Use a torque wrench; Rego-Fix specs are typically 80-160 N·m for ER32, 200-400 N·m for ER40.
3. **Insert the tool to the design depth.** Shank fully seated in collet, never partially. Partial insertion = lever arm = runout amplified at the tip.
4. **Verify TIR on assembly.** Indicator the tool tip at 4× stickout-length before cycle start. Any TIR > the holder's nominal spec = re-clean + re-assemble.
5. **Replace worn collets.** ER collets wear; the cone surface erodes after 200-500 cycles. A worn collet gives a holder its TIR spec + 0.010-0.030 mm of degradation. Cheap fix; commonly skipped.
6. **Re-grind / replace damaged holders.** Drop a holder → bent shank → permanent runout. Drop check: spin the empty holder on a centers fixture; > 0.010 mm body runout = retire.

### Stickout / overhang trade-off

Tool stickout affects both clearance (need it) and rigidity (don't want it). The right answer:

```
stickout = depth_of_cut + 1.0 mm clearance + safety margin (no more)
```

A 12 mm endmill with 20 mm DOC needs ~21-23 mm stickout, not 35 mm. Every extra mm cubes the deflection at the tip (Euler-Bernoulli for cantilever). The 35-mm-stickout assembly chatters where the 22-mm-stickout assembly cuts clean.

**Necked-down holders** + **necked-down endmills** (see [[tooling-endmill-flute-helix-corner]]) let you reach into deep cavities without the rigid section sticking out further than needed. Specify the assembled stickout in the setup sheet, not "long enough."

### Holder length classes (catalog terms)

| Class | Stickout range | When |
|---|---|---|
| **Short / collar** | 30-50 mm body length | Default for surface / shoulder mills |
| **Standard** | 50-90 mm | General-purpose endmill holding |
| **Long / extended** | 90-150 mm | Deep-pocket reach without necking |
| **Heat-shrink long-reach** | 100-300 mm | Specialty deep cavities; shrink-fit body itself extends in |
| **Boring bar with holder** | 200-1000 mm | ID work; separate Δ topic — see [[tooling-selection-by-material-and-feature]] §boring |

### Anti-patterns from the floor

- **"ER collet works for everything."** It works for *most* things. It does NOT work for high-RPM finishing where TIR < 0.010 mm matters — shrink-fit or hydraulic beats ER there by 2-5×.

- **"Hydraulic chuck is for precision only."** Wrong — hydraulic chucks also damp vibration thanks to the membrane. They're production-rate-capable AND they extend tool life in chatter-prone setups. The cost premium amortizes.

- **"Shrink-fit is too slow."** With a $4-15k induction heater, swap is 30 s + 60 s cool = 90 s. Without, it's "buy or don't use shrink-fit". For lights-out + sister-tool runs, the heater capital amortizes in 1-2 high-volume jobs.

- **"Stickout doesn't matter at low RPM."** It does — deflection is force-dependent, not RPM-dependent. A 35-mm-stickout assembly at 3000 RPM deflects the same as at 12,000 RPM under the same cut force.

- **"Clean the taper if you remember."** Always clean. Every insertion. A spec'd contamination of < 0.5 μg/cm² of dust + coolant residue is enough to add 0.005 mm TIR. The cleaning ritual is 5 s; the diagnostic for missing it is "tool died early for no obvious reason".

- **"Bigger holder = more rigid = better."** Past the diameter that matches the tool shank, more holder body adds mass without stiffness, increases mass-imbalance for high-RPM work, and steals deeper-reach capacity. Match the holder to the tool, not to "the biggest in the crib".

### Tie-ins

- [[tooling-selection-by-material-and-feature]] — Layer 4 (tool body) selection; this entry expands the holder side
- [[tooling-endmill-flute-helix-corner]] — sibling; flute/helix/corner picks the cutter, this entry picks how it's held
- [[tooling-tool-life-and-wear-management]] — TIR cuts tool life 30-50 %; this entry's discipline preserves the life-budget the wear-mode entry tries to spend
- [[machining-tactics-in-cut-adjustments]] — runout-induced chatter is one of the chatter row's persistent fixes
- [[part-setup-tool-length-offsets-and-presetting]] — shrink-fit gives the most-deterministic TLO (no torque variance between assemblies); pairs naturally

## Provenance

Distilled from the 625 tooling-selection tips in the 4245-tribal corpus + Machinery's Handbook 31e §Tool Holders §Spindle Interfaces + Sandvik CoroChuck + HydroGrip + ER (Rego-Fix) + Schunk TENDO + Big Daishowa HydroChuck + Haimer shrink-fit datasheets + ISO 26623 (HSK) + ANSI/ASME B5.50 (CAT) + DIN 69893 (BT). Authored 2026-05-21 by slot:hotel under U-WIKI-TOOLSEL-HOLDERS — **fourth canonical tooling-selection entry**. Tooling-selection now at 4 entries (matching its 624-tip absolute count); category is the deepest in the pivot session.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `toolholder`, `holder`, `ER collet`, `collet`, `Rego-Fix`, `Weldon`, `side-lock`, `milling chuck`, `Big Daishowa`, `hydraulic chuck`, `Schunk TENDO`, `HydroChuck`, `shrink-fit`, `Haimer`, `polygon clamping`, `TIR`, `runout`, `total indicator reading`, `stickout`, `taper`, `HSK`, `CAT`, `BT taper`, `V-flange`, `tool assembly` keywords. Zero wiring required.

## Cross-references

- [[tooling-selection-by-material-and-feature]] — Layer 4 sibling; this entry deepens the holder dimension
- [[tooling-endmill-flute-helix-corner]] — sibling; cutter + holder are the assembled pair
- [[tooling-tool-life-and-wear-management]] — TIR-life coupling
- [[machining-tactics-in-cut-adjustments]] — runout-chatter linkage
- [[part-setup-tool-length-offsets-and-presetting]] — shrink-fit + TLO coupling
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; tooling-selection now 4 entries
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record this entry continues
- [[feedback_do_optional_high_roi_work]] — standing rule honored
