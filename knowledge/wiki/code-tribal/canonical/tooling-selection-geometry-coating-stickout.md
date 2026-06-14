---
schema: ideablock-v1
title: "Tooling selection — geometry, coating, substrate, stickout, by-material defaults"
domain: "Machining"
category: "tooling-selection"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-9033b60c:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T20:05:00Z
tags: [endmill, flutes, helix, coating, tialn, altin, tic, dlc, substrate, carbide, hss, stickout, ld-ratio, insert, turning, drilling, tapping, by-material-defaults]
---

## Question

Walking into the tool crib for a new job — how do you pick the endmill, drill, tap, or insert without guessing? What does each coating actually do, why does helix angle matter more than people think, and what L:D ratio is the cutter going to chatter at?

## Answer

Five decisions, every time, in this order: **substrate → geometry (flutes + helix + corner) → coating → length/stickout → workholding-aware diameter choice**. Skip any one and the cutter either dies in 15 minutes or never reaches the target finish. The choices are mostly material-driven; the lookups below collapse 90% of shop-floor selection to a one-table glance.

### 1. Substrate — solid carbide vs HSS vs indexable

| Substrate | When it wins | When it loses | Cost ratio |
|---|---|---|---|
| **HSS (M2, M42)** | manual machines, tapping, low-volume drilling, hand-ground tools, very low SFM, interrupted cuts that snap carbide | high-SFM modern CNC — heats up + fails | 1× |
| **Cobalt HSS (M42, M35)** | tougher version of HSS for stainless taps, hand-grindable | still slower than carbide for production | 2-3× |
| **Solid carbide (micrograin)** | the production default — CNC, ≥4× HSS feed, 5-10× life | brittle in interrupted/shock cuts, snaps if you ham-fist a manual machine with it | 8-15× |
| **Indexable carbide (replaceable inserts)** | roughing, large diameters ≥0.625″, face mills, long-run production | finish quality limited by insert geometry; 4-flute solid carbide beats most indexables ≤0.5″ | 5-10× upfront, 2× insert refills |
| **PCD (polycrystalline diamond)** | aluminum HSM, CFRP/graphite, GFRP — 50-200× life vs carbide | useless in steel (chemical wear with iron), $$$ | 30-50× |
| **CBN (cubic boron nitride)** | hardened steel ≥55 HRC, hard turning, gear teeth | useless in soft material, brittle | 30-50× |

**Default for unknown job in steel/stainless/aluminum on a CNC:** solid carbide micrograin, 4-flute, AlTiN-coated. That covers ~70% of shop-floor work.

### 2. Flute count — the math is about chip-load × engagement

| Flutes | Best for | Why |
|---|---|---|
| **2-flute** | aluminum, plastics, deep slotting, anything soft + gummy | huge chip gullet → chip evacuation dominates; low chipload-per-tooth |
| **3-flute** | aluminum production endmills (Hanita Varimill, Helical) | balance of evacuation + tooth count for HSM aluminum |
| **4-flute** | the steel/stainless default | enough gullet for chips, more teeth → higher feed-per-rev at same chipload |
| **5-flute** | stainless + titanium finishing | extra teeth keep cutting forces low + smooth |
| **6-flute** | hardened steel finishing, ≥0.500″ in steel | smooth cut, low per-tooth load; useless if you can't get chip-thinning compensation right |
| **7-flute / 9-flute** | finishing-only specialty (mold work, hardened steel ≥48 HRC) | almost zero gullet → finish passes only, RDoC ≤5% |

**Slotting cap:** flutes × 2 = max slot depth in diameters with reliable chip evacuation. A 4-flute 0.5″ endmill slots reliably to 1.0″ deep (2D); past that you NEED helical/trochoidal entry, NOT a deeper slot.

### 3. Helix angle — finish, force direction, and the "high helix" myth

| Helix | Behavior | Use case |
|---|---|---|
| **0° (straight)** | flat radial force, no axial pull | tiny cutters, EDM electrodes, brass |
| **30° (standard)** | balanced; default for general-purpose | most steel/stainless jobs |
| **35-40°** | smoother cut, better finish, pulls chip UP (axial pull = lifts chip out of slot) | stainless, finish work, slotting in steel |
| **45° (high helix)** | very smooth, very high axial pull (can lift small parts off vise!), excellent for aluminum | aluminum HSM, finish work |
| **50-60° (variable / extreme)** | chatter-suppression specialty; the angle changes along the flute | titanium, Inconel HSM, anti-chatter |

**Variable-helix / variable-pitch** endmills are not a gimmick — the inter-tooth angle is irregular, so each tooth's chatter frequency is different, breaking up the resonance. Worth the 30% premium for anything that's chattered before, OR for titanium/Inconel under any condition.

**Axial pull warning:** a 0.5″ 45° helix 5-flute endmill at 8K RPM and 0.005″ chipload pulls ~120 lbf axially. If a small part is held in a vise without a stop pin, it WILL lift. Use ≥35° helix or add a hard stop on small parts.

### 4. Coating — what each does, where it dies

| Coating | Color | Where it wins | Where it dies | Operating temp |
|---|---|---|---|---|
| **Naked carbide (uncoated)** | grey | aluminum, brass, plastic — coatings make the chip stick | anything that gets hot — bare carbide oxidizes ≥600°C | <500°C |
| **TiN (titanium nitride)** | gold | general purpose, low-cost, dry steel ≤30 HRC | nickel alloys, ≥35 HRC steel | <600°C |
| **TiCN (titanium carbonitride)** | grey-blue | high-toughness applications, abrasive material, drilling | high-heat finishing | <400°C (but tough) |
| **TiAlN (titanium aluminum nitride)** | dark grey/purple | the modern default — steel, stainless, hardened ≤50 HRC, HSM | aluminum (Al in coating reacts with workpiece Al) | <900°C |
| **AlTiN (aluminum titanium nitride)** | purple-black | hardened steel ≥50 HRC, dry machining, HSM steel | aluminum, also slightly less tough than TiAlN at low temp | <950°C |
| **AlCrN (aluminum chromium nitride)** | dark grey | stainless, titanium, Inconel — Cr resists nickel adhesion | aluminum, low-SFM applications | <1100°C |
| **DLC (diamond-like carbon)** | black | aluminum (the BEST coating for alu — anti-built-up-edge), plastic, copper | steel — flakes off under load | <400°C |
| **CrN (chromium nitride)** | silver-grey | aluminum die-cast pins, mold release, low-friction | steel cutting | <700°C |
| **nACo / nACRo (nanostructured)** | dark | high-end HSM in stainless/Inconel — thermal shock resistance | premium pricing only justified for production volume | <1100°C |

**Aluminum rule:** uncoated polished, DLC, or CrN. NEVER TiAlN/AlTiN on aluminum — the Al in the coating cold-welds to the workpiece Al, builds up edge, finish goes to garbage in 3 parts.

**Hardened steel rule (≥45 HRC):** AlTiN or nACo. Not TiAlN — the temp at the cutting edge in hardened steel HSM can exceed TiAlN's stable range.

**Stainless rule:** AlCrN if you have it; TiAlN as default; AVOID TiCN (low temp tolerance + stainless heats fast).

### 5. Length / stickout / L:D ratio — the chatter law

The cutter is a cantilever beam. Deflection ∝ L³ / D⁴. Every doubling of stickout = **8×** the deflection. Cutting force compresses + bends + vibrates this beam.

| L:D ratio | Stability | Practical use |
|---|---|---|
| **≤3:1** | rock solid | the default — always shorter is always better |
| **3-4:1** | very stable | normal pocketing depth |
| **4-5:1** | usable with care | reduce RDoC, slow feed 30%, may need rougher to clear most material first |
| **5-6:1** | chatter-prone | use extended-reach tools designed for it (necked endmills, reduced shank), variable-helix, drop SFM 30% |
| **6-8:1** | only with HSK shrink-fit or hydraulic, variable-helix, reduced-shank, and patience | typical mold work, deep cavity finishing |
| **>8:1** | "long-reach" specialty tools — graphite, carbide-shank ribbed, taper-shank cores | rib finishing in deep molds; usually finish-only with tiny stepover |

**Stickout = TIP to HOLDER NOSE, not flute length.** A 4-flute 0.5″ endmill with 1.5″ stickout and 1.0″ flute length is 3:1, not 2:1.

**Holder hierarchy (least → most rigid):**
1. ER collet — flexible, drops accuracy past 4:1
2. Shrink-fit (HSK or BT) — grip the shank with thermal interference, no slip
3. Hydraulic — best rigidity, can re-tighten on the floor
4. Side-lock weldon — only for indexable holders / drills; the side-flat creates an asymmetric grip + runout

For ≥4:1 reach in finish work, **shrink-fit is the difference between chatter and no-chatter**, period.

### 6. Drills / taps / reamers — fast-pick lookup

**Drills:**
- **Twist drill, 118° point:** general purpose for steel/aluminum
- **Twist drill, 135° split-point:** self-centering, harder material, no center-drill needed
- **Carbide spot drill (90°/120°/142°)** before a twist drill in CNC for accurate hole location
- **Indexable insert drill** ≥0.625″: production roughing; finish with reamer or boring bar
- **Coolant-through (CT) drill:** required >5×D depth; mandatory in titanium and Inconel deep holes
- **Parabolic flute drill:** deep holes (≥8×D) — better chip evacuation than standard helix

**Taps:**
- **Spiral-point (gun tap):** through-hole, pushes chips ahead — fast + clean
- **Spiral-flute:** blind hole, lifts chips out — slower but no chip-pack
- **Form tap (rolling/cold-forming):** ductile aluminum/copper/brass — no chips, stronger threads, finer pitch only
- **STI (Screw Thread Insert) tap:** larger pitch hole for helicoil installation
- **Tap drill size:** look up from a chart, never guess. 75% thread engagement is the default for steel; 65% for stainless/titanium (reduces tap breakage).

**Reamers:**
- **Chucking reamer (straight or spiral flute):** 0.0001″-0.0005″ tolerance on hole
- **Adjustable reamer:** hand work / one-off fixtures
- **Step reamer:** combo of two diameters in one tool
- **Reamer prep:** drill 0.005-0.015″ under finish diameter; never reamer-cut more than 0.020″ off side

### 7. Insert selection for turning / boring / facing

ISO insert nomenclature is the universal language. The first letter is the SHAPE — memorize these:

| Code | Shape | Strength | Versatility |
|---|---|---|---|
| **C** | 80° diamond | high | most common roughing |
| **D** | 55° diamond | low | finish only, accessible profiles |
| **V** | 35° diamond | very low | profiling only, very sharp tip |
| **T** | triangle | medium | one of the three useful corners; common |
| **W** | trigon | high | 6 corners, roughing |
| **S** | square | very high | facing, slotting, 8 corners |
| **R** | round | highest | full-radius finishing, button mills |

**Insert grade (carbide):**
- **C-grade (P-class)** = steel (P05-P50, low = finish, high = rough)
- **K-class** = cast iron
- **M-class** = stainless
- **N-class** = aluminum / non-ferrous (often uncoated or DLC)
- **S-class** = heat-resistant superalloys (titanium, Inconel)
- **H-class** = hardened (≥45 HRC)

**Chipbreaker geometry** matters more than grade for chip control:
- Finish (sharp positive) → tiny tight chips, fine finish, low force
- Medium → general purpose
- Rough (negative + chipbreaker groove) → heavy chips break short, high MRR

### 8. Failure modes — what each looks/sounds like

1. **Built-up edge (BUE) on aluminum** → wrong coating (TiAlN on Al). Switch to DLC or uncoated polished.
2. **Cutter glazes on first pass in stainless** → SFM too low → coating doesn't form thermal barrier. Run AT the recommended SFM, not below.
3. **Cracked carbide corner after 2 minutes** → ramp/plunge into hardened material with the wrong tool. Pre-drill or use a tool designed for shock entry.
4. **Chatter in deep pocket** → L:D > 5 in a holder that's not shrink-fit. Use shorter tool, or upgrade holder, or drop RDoC to 5% and run variable-helix.
5. **Hole oversize by 0.001-0.003″** → drill runout from poor holder or no spot drill. Spot first, then drill, then reamer if tolerance < 0.001″.
6. **Tap breaks mid-thread** → tap-drill too small (insufficient clearance) OR cutting compound wrong (use thread-cutting oil, not coolant). Drop to 65% thread engagement in stainless/titanium.
7. **Insert wears uniformly + smoothly within spec time** → you are running it correctly. Don't change anything.
8. **Insert chips at one corner only** → interrupted cut + brittle grade. Switch to tougher grade (higher P-number for steel).

### 9. The shop-floor 5-line check before pulling a tool from the crib

Before reaching into the tool drawer, mental-check five numbers:

1. **Material → substrate + coating** (steel + AlTiN 4FL solid carbide is the default 70% of jobs)
2. **Cut type → flute count** (slotting deep? 2-3FL. Profile? 4-5FL. Finish hardened? 6-9FL.)
3. **L:D ratio → holder** (>4:1 = shrink-fit or hydraulic, not ER)
4. **Material hardness → entry strategy** (≥45 HRC = pre-drill, no plunge, no ramp)
5. **Aluminum check** (any aluminum coating? STOP. Use DLC, CrN, or uncoated polished.)

If any of those five is mismatched, you're a 15-minute tool away from a fast death. Three minutes at the crib saves an hour at the spindle.

## Provenance

- Hand-authored canonical entry for the tooling-selection tribal-coverage gap (MACHINING-TRIBAL-COVERAGE/U-MTC06).
- Coating thermal limits match Sandvik / Iscar / Kennametal / Walter / OSG application engineering published data tables.
- ISO insert nomenclature is ISO 1832 standard; per-letter shapes match catalog conventions across all major manufacturers.
- Helix-angle axial-pull math is straightforward statics (F_axial = F_cut × tan(helix)); the 120 lbf example uses representative 4-flute 0.5″ end mill at 0.005″ chipload, 8K RPM.
- L:D deflection law (∝ L³ / D⁴) is Euler-Bernoulli beam theory; the chatter zones at L:D ≥ 5 match Tlusty / Altintas chatter-stability lobe literature.
- Tap drill engagement % rules of thumb match Machinery's Handbook tap-drill tables.
- Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.
- Pickup: `tribal-by-domain-inject.mjs` (UserPromptSubmit) + `wiki-precheck-inject.mjs`. No wiring required.

Cross-refs:
- [[op-order-rough-stress-finish]] — sequencing context (which tool comes when)
- [[workholding-soft-jaw-cycle]] — workholding that survives high-axial-pull cuts
- [[part-setup-first-surface-datum]] — setup integrity for tools you trust
- [[machining-tactics-climb-trochoidal-chip-thinning]] — how the chosen cutter is actually swept through material
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage signal that ranked this category 5th-weakest at 14.7%
