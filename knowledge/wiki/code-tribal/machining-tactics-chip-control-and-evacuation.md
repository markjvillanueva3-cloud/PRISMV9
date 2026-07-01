---
schema: ideablock-v1
title: "Chip control + evacuation — chip form, breakage, flush, the silent-killer fix"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Chip Formation + §Coolant + §Chip Disposal
  - Sandvik Coromant — Chip breaker selection guide
  - ISO 3685 — Chip-form classification
  - Iscar / Kennametal chip-control charts
  - 4245-tribal corpus machining-tactics subset (n=339)
extracted_via: human-authored
extracted_at: 2026-05-21T04:50:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-CHIP-CONTROL)
---

## Question

What chip do I want, how do I get it, and what do I do when chips won't leave the cut?

## Answer (canonical — chip form → control parameter → evacuation strategy)

### The 8 chip forms (ISO 3685 + floor names)

The chip is the most information-dense signal during cutting. Each form has a distinct cause + a distinct fix:

| Chip form | Visual | What it means | First fix |
|---|---|---|---|
| **Tight 6 / 9 spirals** | Short curls (3-10 mm), broken cleanly | Ideal — chip-breaker engaged, fz × Vc in window | Don't change anything |
| **Long ribbon / string** | Continuous, 100+ mm, ropey | Vc too high OR fz too low OR wrong breaker geometry | fz ↑ 20 % first; if persists, change insert geometry |
| **Snarled / bird's nest** | Tangles around tool, packs the pocket | Chip can't escape — re-cutting starts immediately | Reduce DOC; increase coolant pressure; add chip evacuation pass |
| **Powder / dust** | No coherent chip, fine debris | Tool is rubbing, not cutting — fz too low | fz ↑ 30 % to engage cutting edge |
| **Sawtooth (serrated)** | Visible saw-edge pattern on chip back | Shear-localized — Ti, hardened steel; normal at high Vc | Accept it unless surface finish suffers; otherwise reduce Vc |
| **Discontinuous (broken)** | Small fragments, brittle break | Cast iron, ceramics, brittle materials | Normal for K-group; if seen in P-group, material is over-cold-worked |
| **Welded / BUE chunk** | Chip with silver streak welded to it | Built-up edge depositing on chip | Vc ↑ to escape BUE band; coolant flood; sharper edge |
| **Blue / purple / black** | Color = heat marker | Too hot — Vc too high OR coolant flow blocked | Vc ↓ 15 % OR fix coolant aim |

The goal chip for most production: **short 6 or 9 spirals** (5-20 mm long, clean break). Sandvik's chip-form chart codes them by 2-digit number; "9_3" means "spirals, 30 mm long". Match the geometry's intended chip-form to the chip you're producing — when they diverge, the *parameters* are off, not the geometry.

### The 3 chip-breaker mechanisms (insert geometry)

Inserts have one of three breaker styles, each tuned for a Vc × fz window:

| Style | Window | Code clue |
|---|---|---|
| **Wave / waveform** | Wide window, general-purpose | Sandvik PM, Kennametal MM |
| **Groove + bump** | Specific Vc × fz target, sharper transition | Sandvik PR (rough) / PF (finish), Iscar M3M |
| **Negative-land + chip-breaker** | High-feed roughing | Sandvik QM, Kennametal NG |

When chip-form fails (long ribbons or bird's nest), checking that the **insert geometry matches the operation** is step 1. Many shops use a single "general-purpose" insert across rough + finish + thread; one fits well, the others fight the geometry.

### Evacuation — chip out of cut, out of fixture, out of machine

The chip's job after the cut is to *leave*. Three failure modes happen in sequence if it doesn't:

```
Chip lingers in cut       → re-cutting → tool wear ↑ × 3-10
Chip lingers in pocket    → packing    → workpiece + tool damage
Chip lingers in machine   → way wear   → axis accuracy degradation
```

| Evacuation method | When | Pro | Con |
|---|---|---|---|
| **Gravity + air** | Light-duty horizontal cuts | Free | Doesn't work in pockets, deep cuts |
| **Flood coolant** | Most milling, deep pockets | Cheap, well-understood | Poor in deep blind holes; can pack chips against bottom |
| **High-pressure coolant (1000+ psi)** | Deep-hole drilling, hard materials, Ti / Inconel | Pushes chips out forcefully; cools cutting zone | Pump cost; coolant degradation faster; aerosol risk |
| **Through-spindle / through-tool coolant** | Drilling, deep cavities, plunging | Coolant + chips both go the right way | Spindle seal cost; coolant filtering critical |
| **MQL (minimum quantity lubrication)** | Light cuts, environmentally constrained | Near-zero coolant cost; clean | Doesn't evacuate chips — only helps cutting |
| **Air blast** | Aluminum, MMC, graphite | Doesn't contaminate part with coolant | No cooling, requires chip-conveyor below |
| **Chip auger / conveyor** | Production HMC, mill-turn | Continuous removal from machine pan | Build cost |
| **Vacuum-extracted (graphite, plastics)** | Dust-class chips | Captures sub-mm debris | Required for graphite; specialized |

### Coolant aim — the most-ignored cheap fix

Half of "chip evac problems" are actually "coolant nozzle pointing wrong". A 30-second nozzle adjustment fixes more chip jams than any other intervention. Rules:

- **Aim at the cutting edge**, not the chip 50 mm downstream. The chip's path is set the moment it leaves the edge.
- **Two nozzles** are better than one big one: one for the lead edge, one to flush the chip away.
- **High-pressure aim** matters more than volume. 50 psi precisely on the chip-tool interface beats 500 GPM blasting the whole spindle.
- **In a deep pocket**, point coolant *down* the pocket wall, not into the bottom. Chips ride the coolant stream up.

### The chip-color thermometer (free, real-time, calibrated)

| Color | Temperature | Material context |
|---|---|---|
| Silver / no color | < 300 °C | Coolant flooded, fz/Vc safe envelope |
| Straw / light gold | ~300-400 °C | Hot but acceptable steel cuts |
| Dark brown | ~400-500 °C | Upper edge — reduce Vc 10-15 % |
| Blue | ~500-600 °C | At the limit — coolant volume up + Vc down |
| Purple | ~600-700 °C | Past the limit — TiAlN coating life dropping fast |
| Black | > 700 °C | STOP — past coating threshold for most carbide grades |

These colors apply to steel. Aluminum chips don't visibly oxidize — for Al, watch the workpiece for warmth (touch with finger 5 s after retract; should be merely warm, never hot). Inconel chips can burn straw at fully-acceptable temps; calibrate to your material.

### Chip thinning — when DOC < tool radius

A common error: cutting with radial DOC `ae` < tool radius `r` produces a chip thinner than the programmed feed-per-tooth `fz`. The cutter rubs more than it cuts → wear ↑ → BUE risk.

Sandvik chip-thinning correction:
```
fz_actual = fz_programmed × sqrt(D / ae)        when ae < D/2
```

Example: 12 mm endmill, ae = 1.5 mm (12.5 % engagement), programmed fz = 0.05 mm:
- `fz_actual = 0.05 × √(12 / 1.5) = 0.05 × 2.83 = 0.14 mm`

Without the correction, the cutter is rubbing at 0.05 mm "real" engagement when it could be cutting at 0.14 mm safely. Use `prism_calc:chip_thinning` or `prism_calc:chip_load` to compute. The CAM that doesn't auto-compensate for chip thinning produces predictable wear failures around 30 % of programmed-tool-life.

### Anti-patterns from the floor

- **"More coolant fixes chip problems."** Sometimes — chip evac, BUE, heat. NOT: long-ribbon chips (geometry problem, not coolant), bird's nest (chip-form problem, not flush volume), tool wear (Vc problem, not coolant). Coolant is one of many levers, not the universal fix.

- **"That chip is fine, look how blue it is."** Blue chip = chip carried the heat *out* of the cutting zone. That's good IF the surface finish is intact. But if the insert is also blue, the chip *and* the tool are at temperature — the tool's coating is degrading. Inspect the rake face, not just the chip.

- **"Just blast more pressure."** 1000 psi coolant aimed wrong does nothing for chip evac and damages the spindle seal faster. Aim first, pressure second.

- **"Bird's nest just means slow down."** Slowing down sometimes works — but bird's nest from chip-thinning (under-engagement) gets *worse* when you slow down. The fix is usually engagement up, not speed down. Check `ae / D` ratio before slowing.

- **"Chip color doesn't matter for stainless."** Wrong. Stainless work-hardens; the chip's color tells you whether you're cutting at the right temperature to break through hardened skin (need it hot enough) without thermal softening the cutting zone (not too hot). Color rules same as for steel, with thinner Vc envelope.

### Tie-ins

- [[machining-tactics-in-cut-adjustments]] — chip control is the most-acted-on signal in the in-cut response table; this entry deepens the "chip" row
- [[machining-tactics-pre-cut-prep]] — coolant nozzle aim is part of the pre-cut setup walkthrough
- [[tooling-selection-by-material-and-feature]] — chip-breaker geometry is the Layer-3 choice that determines chip form
- [[tooling-tool-life-and-wear-management]] — chip recutting (failed evac) accelerates flank wear 3-10×; BUE depends on chip-form management
- [[workholding-clamp-force-and-selection]] — chip pile-up under flood coolant lowers effective grip force (10 % typical); fixture force budget should account for this

## Provenance

Distilled from the 339 machining-tactics tips in the 4245-tribal corpus + Machinery's Handbook 31e §Chip Formation §Coolant §Chip Disposal + Sandvik chip-breaker guide + ISO 3685 chip-form codes + Iscar/Kennametal chip-control charts. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-CHIP-CONTROL — third canonical machining-tactics entry. Machining-tactics now has 3 entries (pre-cut + in-cut + chip-control) — the most-covered category in the pivot session, matching its ROI weight (chip events are the most-frequent machining failure root).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `chip`, `chip form`, `chip color`, `chip break`, `chip breaker`, `bird's nest`, `chip thinning`, `BUE`, `coolant aim`, `flood`, `MQL`, `high pressure coolant`, `chip evacuation`, `chip auger`, `chip recutting`, `Sandvik chip code`, `9_3`, `chip nest` keywords. Zero wiring required.

## Cross-references

- [[machining-tactics-in-cut-adjustments]] — sibling; this entry expands the chip row of the signal-fix table
- [[machining-tactics-pre-cut-prep]] — sibling; coolant aim is part of pre-cut walkthrough
- [[tooling-selection-by-material-and-feature]] — chip-breaker geometry is Layer-3 of tool selection
- [[tooling-tool-life-and-wear-management]] — chip recutting accelerates flank wear; BUE management
- [[workholding-clamp-force-and-selection]] — chip pile-up reduces effective grip
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; machining-tactics now has 3 canonical entries
- [[feedback_do_optional_high_roi_work]] — standing rule honored
