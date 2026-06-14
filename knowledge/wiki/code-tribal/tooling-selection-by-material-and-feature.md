---
schema: ideablock-v1
title: "Tool selection — material × feature × operation → tool, coating, geometry"
domain: "Tooling selection"
category: tooling-selection
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Cutting Tools + §Tool Materials + §Coatings
  - Sandvik Coromant — Tool selection guide (mill / turn / drill)
  - Kennametal, Iscar, Walter — Application catalogs
  - ISO 1832 (turning insert designation) + ISO 5608 (toolholder designation)
  - 4245-tribal corpus tooling-selection subset (n=625)
extracted_via: human-authored
extracted_at: 2026-05-21T03:35:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-TOOLSEL-MATFEATURE)
---

## Question

Given material X, feature Y, and operation Z, what tool body / insert grade / coating / geometry should I pick — and why?

## Answer (canonical — decide in this order: substrate → coating → geometry → tool body)

### The 4-layer decision (each layer constrains the next)

```
Material (ISO group P/M/K/N/S/H)
        ↓
1. Tool SUBSTRATE   ← carbide grade, HSS, CBN, PCD, ceramic
        ↓
2. COATING          ← TiN, TiAlN, AlTiN, TiCN, diamond, none
        ↓
3. EDGE GEOMETRY    ← rake angle, edge prep (sharp / honed / chamfer / T-land), chip-breaker
        ↓
4. TOOL BODY        ← endmill / insert holder / drill / specialty
```

Decide top-down. Reversing the order (e.g. picking the holder first, then trying to find an insert that fits in it) is the second-most-common selection mistake. The first is skipping straight to "what's in the crib".

### Layer 1 — Substrate by ISO material group

| ISO group | Material examples | First-choice substrate | When to upgrade |
|---|---|---|---|
| **P** — low-alloy steel, 1018 / 1045 / 4140 / 4340 | Tough carbide (e.g. P20-P30 Sandvik · K313 Kennametal) | Long production: K10-K20 fine-grain · Hard turning (Rc 50+): CBN |
| **M** — austenitic stainless, 304 / 316 / 17-4 | Tough carbide with high cobalt (M20 ISO) | Work-hardening grades (e.g. M15 with high Co): always pair with positive rake |
| **K** — cast iron, gray / ductile / compacted-graphite | Wear-resistant carbide (K05-K15) · Ceramic (Al₂O₃) for finishing CI | Sialon (Si₃N₄) for high-speed CI roughing > 800 m/min |
| **N** — non-ferrous, aluminum / brass / copper | Sharp-edge uncoated carbide (K10) · PCD for high-volume Al | Diamond-coated for AlSi9 / abrasive Al · PCD for production Al |
| **S** — high-temp alloys, Inconel 718 / Ti-6Al-4V / Hastelloy | Tough sub-micron carbide + AlTiN coating | Whisker-reinforced ceramic (SiC-whisker) for Inconel turning · CBN at very high RPM |
| **H** — hardened steel (Rc 45+) | CBN | Mixed ceramic (Al₂O₃ + TiC) for Rc 55-65; CBN above |

**Rule of thumb on grades:** lower ISO number (P05, K05) = harder & more wear-resistant but more brittle (finishing); higher number (P40, K40) = tougher but wears faster (roughing).

### Layer 2 — Coating selection

Coating extends tool life 2-5× in the right application, ruins it in the wrong one. Match coating to *heat regime* + *chemical compatibility*:

| Coating | Color | Best for | Avoid in |
|---|---|---|---|
| **TiN** (titanium nitride) | Gold | General-purpose mild steel + low-alloy; entry-level coating | Aluminum (forms BUE), Ti alloys (chemical reaction) |
| **TiCN** (titanium carbonitride) | Bronze | Higher abrasion than TiN; cast iron + steel + tough alloys | High-temp alloys (above 400°C the C diffuses out) |
| **TiAlN** (titanium aluminum nitride) | Violet-purple | High-temp (Al forms protective oxide above 700°C); high-speed milling steel + stainless | Aluminum (BUE risk), copper (chemical) |
| **AlTiN** (aluminum titanium nitride) | Black-purple | Hardened steel + dry / MQL machining + high heat (oxide layer at 1000°C) | Wet cuts at low speed (coating optimized for high heat) |
| **Diamond (CVD)** | Gray-silver | Non-ferrous abrasive (AlSi, MMCs, graphite) — outlasts uncoated PCD in graphite 10× | ANY ferrous material (diamond reacts catastrophically with iron) |
| **None (uncoated)** | Carbide-gray | Sharp-edge applications: aluminum finishing, copper, brass; situations needing < 0.005 mm edge radius | High-heat / high-wear applications where coating earns its cost |

### Layer 3 — Edge geometry

Edge geometry controls cutting *force direction* + *heat partition*. Geometry choice often matters more than coating.

| Geometry | Where it goes | Force / chip impact |
|---|---|---|
| **Positive rake** (10-20°) | Aluminum, soft non-ferrous, work-hardening materials, finishing | Low force, sharp chip, cleaner finish; brittle in interrupted cuts |
| **Neutral rake** (0°) | General-purpose steel, balanced applications | Compromise |
| **Negative rake** (-5 to -10°) | Hard turning, interrupted cuts, heavy roughing | High force but strong edge; survives shock loads |
| **Sharp edge** (no prep) | Aluminum finishing, copper, plastic | Cleanest cut, weakest edge — wears fast in steel |
| **Honed edge** (0.02-0.05 mm radius) | General steel / cast iron, default for most production | Tradeoff between life and surface finish |
| **Chamfered edge** (T-land at 15-30°) | Roughing hardened steel, interrupted cuts | Strongest edge, highest force, roughest finish |
| **Wiper geometry** (multi-radius nose) | Finish turning at high feed for low Ra | Lets you double fz without surface penalty — but only on finishing |
| **Chip-breaker geometry** (M5/MM/PR codes vary per maker) | Anywhere the chip won't break naturally (steel, stainless) | Mechanical chip-form; matches Vc/fz to a chip-flow window |

### Layer 4 — Tool body / holder

Body selection is constrained by *insert pocket* (must match the ISO-1832 designation: CNMG, DNMG, TPMR, etc.) + *reach* + *holder ID*. Body choice is operational, not material-driven:

| Operation | Body type | Selection driver |
|---|---|---|
| Endmill profile / pocket | Solid endmill (4-flute steel-cutting · 2-flute Al · variable-helix for chatter suppression) | Length-to-diameter ratio < 4× preferred |
| Face milling | Indexable face mill | Diameter ~1.3× width-of-cut; lead angle 45° for chip thinning, 0° for square shoulder |
| Boring | Boring bar (steel for L/D ≤ 4, carbide for 4-6, anti-vibration / damped for 6-10, ceramic for > 10) | L/D drives material choice — see [[workholding-clamp-force-and-selection]] for the parallel logic |
| Drilling > Ø3 | Indexable drill (carbide insert) for Ø10+; solid carbide drill for Ø3-10 | Diameter + L/D + finish requirement |
| Drilling < Ø3 | Solid carbide micro-drill; spot drill first | Always pre-spot below Ø3 |
| Tapping | Tap geometry per blind vs through, material vs material — see [[operation-ordering-hole-sequence]] §branch | 75 % thread engagement default |
| Turning OD | ISO designation per pocket (CNMG, DNMG, etc.); positive holder rake for finishing, negative for roughing | Insert grade × geometry × nose radius |
| Turning ID (boring) | Boring bar — L/D drives material choice (see above) | Always negative rake unless very small ID |
| Threading | Thread mill (preferred when possible — single tool, multi-pitch) OR single-point ISO insert | See [[operation-ordering-hole-sequence]] |
| Grooving / parting | Grooving insert holder (rigid, short reach) | Width × depth × material |

### Anti-patterns from the floor

- **"It's in the crib, use it."** The available tool is rarely the optimal tool. Sub-optimal selection costs hidden money in: longer cycle, worse finish (rework), shorter life (more changes), more scrap. Selecting "what fits the program" instead of "what the material wants" is the most expensive habit in any shop.

- **"Coating doesn't matter for this short run."** It matters from cut 1 — uncoated carbide in tough steel can fail in seconds; TiAlN-coated lasts the whole run. The right coating earns 10-50× its premium in tool life.

- **"Sharper is always better."** No — sharper is better in aluminum/copper/brass, but in steel and cast iron, sharp = weak = chips off in interrupted cuts. Honed edges last 2-5× longer in production steel; the surface-finish penalty is small (~Ra 0.2 μm above sharp).

- **"This generic geometry will work anywhere."** "Generic" rake angle / chip-breaker / coating is a compromise that's slightly wrong everywhere. For one-off prototyping, a generic insert is acceptable. For production, match the geometry to the cut.

- **"The grade chart is approximate."** It isn't — it's an output of metallurgical R&D worth millions per insert generation. Pick the grade the maker recommends for your ISO group; don't substitute one P-grade for another because "they're both carbide".

- **"Cheap inserts save money."** Per insert, yes. Per part, often no. A premium insert at 2× the price that lasts 4× longer is 50 % cheaper in the cycle, plus saves the tool-change time. Total-cost-per-part is the metric, not insert-cost.

### Quick selection cheat-sheet (the floor's daily question)

When the operator asks "what tool for this part?" without a CAM-system recommendation:

```
1. Material → look up ISO group (P/M/K/N/S/H) — Sandvik chart or prism_data:material_get
2. Feature → match feature to body type (table above, Layer 4)
3. Operation → roughing (negative rake, chip-breaker, tough grade) vs finishing (positive rake, sharp/honed, harder grade)
4. Coating → pick from heat regime (TiAlN above 600°C, TiN below)
5. Validate → cross-check selected tool with prism_calc:cutting_data_recommend
```

This is what `prism_data:tool_get` + `prism_data:tool_recommend` + `prism_data:cross_query` do — automate the 4-layer pick. Use the dispatcher; the canonical tables live in the registry, not in any single operator's head.

### Tie-ins

- [[machining-tactics-in-cut-adjustments]] — wrong tool selection presents as in-cut symptoms (BUE, chip color, chatter) that tactics can't permanently fix
- [[operation-ordering-hole-sequence]] — tool selection for hole-making (spot → drill → bore → ream) follows from this entry's feature → body mapping
- [[workholding-clamp-force-and-selection]] — cutting force = kc × A_chip is a function of tool selection; the right tool reduces the force-budget pressure on the holder

## Provenance

Distilled from the 625 tooling-selection tips in the 4245-tribal corpus + Machinery's Handbook 31e §Cutting Tools §Tool Materials §Coatings + Sandvik / Kennametal / Iscar / Walter catalogs + ISO 1832 + ISO 5608. Authored 2026-05-21 by slot:hotel under U-WIKI-TOOLSEL-MATFEATURE — first canonical tooling-selection entry of the wiki+tribal high-ROI pivot. **Completes 5/5 high-ROI categories with a foundational canonical entry each.**

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `tool`, `insert`, `grade`, `coating`, `TiN`, `TiAlN`, `CBN`, `PCD`, `carbide`, `endmill`, `boring bar`, `wiper`, `chip-breaker`, `rake angle`, `ISO group`, `P-grade`, `K-grade`, `select tool`, `pick insert` keywords. Zero wiring required.

## Cross-references

- [[machining-tactics-in-cut-adjustments]] — sibling layer; tactics is reactive, tooling-selection is preventive
- [[operation-ordering-hole-sequence]] — hole-making tool selection by sub-operation
- [[workholding-clamp-force-and-selection]] — cutting-force coupling between tool choice and holder budget
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit ranking tooling-selection as 14.7 % (5th of 5, least-weak but still under-covered relative to corpus size)
- [[feedback_do_optional_high_roi_work]] — standing rule honored — 5/5 high-ROI category coverage achieved this session
