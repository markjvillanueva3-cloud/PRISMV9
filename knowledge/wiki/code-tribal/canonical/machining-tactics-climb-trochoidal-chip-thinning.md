---
schema: ideablock-v1
title: "Machining tactics — climb vs conventional, trochoidal, chip thinning, entry moves"
domain: "Machining"
category: "machining-tactics"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-b23a56ef:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T19:35:00Z
tags: [climb-mill, conventional-mill, trochoidal, hsm, chip-thinning, rdoc, adoc, chipload, entry, plunge, ramp, helical, tab]
---

## Question

When does climb milling actually win vs conventional, and why do "modern" trochoidal toolpaths use stupidly-low radial engagement at huge axial depth? What's the chipload number to program when the cutter is only partially engaged?

## Answer

Three pieces of math run modern milling: **direction of cut**, **radial engagement angle**, and **chip thinning correction**. Get those right and the cutter lasts 3-10× longer at 2-5× the MRR of "safe" 1980s programming.

### 1. Climb vs conventional — when each wins

| Direction | Cutter rotation vs feed | Chip starts at | Chip ends at | Default verdict |
|---|---|---|---|---|
| **Climb (down-milling)** | same direction | max thickness | zero (peeling off) | **default for HSM, CNC, anything with rigid table screws** |
| **Conventional (up-milling)** | opposite direction | zero (rubbing) | max thickness | use only when you have backlash or a known reason |

**Why climb is the default:**

- Chip starts thick → no rub-then-cut at the entry, no work-hardening at the contact point.
- Cutting force pushes the part DOWN onto the table and INTO the fixture — increases workholding stability.
- Surface finish is better — the cutter exits a finished surface rather than cutting away material that's just been smeared.
- Tool life: typically 2-3× longer in steel, 4-6× longer in stainless and inconel (where rubbing kills carbide via thermal cycling).

**When conventional STILL wins (the honest exceptions, not lore):**

- **Manual Bridgeport / older knee mill with backlash >0.002″** — climb force grabs the part and pulls it into the cutter, breaking the tool and the operator's day. Conventional pushes against the backlash and stays stable. Always conventional on a manual mill unless the lead screws were rebuilt yesterday.
- **Cast iron / mill scale / forging skin on Op-1 face cut** — the abrasive skin will glaze a climb-cutting carbide edge in 30 seconds. Conventional lets the cutter punch through the skin to the underlying metal first, then climb the rest. After Op-1 face cut: switch to climb.
- **Work-hardening stainless (304 / 316 / 321 / Inconel 718) at low SFM** — if you can't run >300 SFM (small machine, limited spindle), conventional avoids the rub-cycle that work-hardens the surface ahead of the cut. Modern HMC + sharp carbide + ≥400 SFM → back to climb.
- **Slotting full-width** — direction doesn't matter when both flanks are engaged. Use whichever your CAM defaults to; chip evacuation is the only thing that matters.

### 2. RDoC, ADoC, and the trochoidal reframe

Old programming logic: **wide radial cut, shallow axial cut.** ADoC ≈ 25% of diameter, RDoC ≈ 75-100% of diameter. The "safe" 1980s slotting rule. Result: every tooth slams against full chip thickness, the cutter heats up over a narrow flute span, edge fails by chipping.

Modern HSM (high-speed-machining) / trochoidal logic: **narrow radial cut, deep axial cut.** ADoC = 1.0-2.0× diameter (full flute length), RDoC = 5-15% of diameter. Same MRR or higher, force/load spread over the entire flute span, cutter runs cooler, lasts 3-10×.

| Strategy | ADoC | RDoC | Typical SFM | Use case |
|---|---|---|---|---|
| Classic slotting (legacy) | 25-50% Ø | 100% Ø | 80-120 (steel) | small machine, can't do HSM |
| Heavy roughing | 50-100% Ø | 50% Ø | 80-150 | high MRR with rigid setup |
| **HSM / dynamic / trochoidal** | **100-200% Ø** | **5-15% Ø** | **400-1000 (steel w/coated)** | rigid machine, modern CAM (Mastercam Dynamic, Fusion Adaptive, hyperMILL MAXX) |
| Finish | 5-25% Ø | 5-15% Ø | 600-1200 | dimensional finish pass |

**The trochoidal toolpath looks weird** — the tool spirals or oscillates with the centerline always staying inside the slot, never fully buried. CAM does the math. The key constraint you control: **max engagement angle**. Most modern CAM exposes this as "stepover" or "RDoC" — keep it under 15% of cutter diameter and you're in HSM territory.

### 3. Chip thinning — the formula that bites real money

When the radial engagement is LESS than half the cutter diameter, the actual chip thickness is LESS than your programmed feed per tooth (fz). The cutter runs in the cut for a shorter arc, so each tooth peels a thinner chip than you commanded.

**Effective chipload** = nominal fz × (cutter Ø ÷ (2 × √(RDoC × (cutter Ø − RDoC))))

In practical terms:

| RDoC as % of cutter Ø | Chip thinning factor | Programmed feed-per-tooth → actual chip thickness |
|---|---|---|
| 50% (Ø/2) | 1.0× | 0.005″ → 0.005″ (no thinning) |
| 25% | 1.15× | program 0.0058″ to get 0.005″ chip |
| 15% | 1.40× | program 0.0070″ to get 0.005″ chip |
| 10% | 1.67× | program 0.0083″ to get 0.005″ chip |
| 5% | 2.29× | program 0.0114″ to get 0.005″ chip |

**Why this matters:** running a 0.500″ end mill at 5% RDoC and a "conservative" 0.003″ chipload means the actual chip is 0.0013″ thick. That's **rubbing territory**, not cutting territory. The cutter heats up, work-hardens stainless, and dies in 15 minutes. The "conservative" feed killed the cutter.

The fix: every modern CAM has a "chip thinning compensation" or "lateral chipload compensation" checkbox. **TURN IT ON.** It auto-multiplies fz by the thinning factor based on the actual engagement. If your CAM doesn't have it, do the math in your head: chip thinning compensation = 1 / sin(engagement angle), with engagement angle ≈ 2 × arcsin(RDoC / Ø).

### 4. Entry moves — plunge, ramp, helical, pre-drill

How the cutter gets into the cut matters more than people think — the entry is where most slot-roughing endmills die.

| Entry | When to use | Speed multiplier vs side-cut |
|---|---|---|
| **Straight plunge** | only with center-cutting endmills, only in soft materials (aluminum, brass, plastic), only at ≤0.5× diameter depth | 0.3× side-cut feed |
| **Ramp (linear)** | most common; 1-3° ramp angle in steel, 5° in aluminum | 0.6× side-cut feed |
| **Helical (circular ramp)** | rigid machine + closed-pocket entry; best for HSM | 0.7× side-cut feed |
| **Pre-drill entry hole** | hard material, large endmill, full-depth pocket | full side-cut feed (jumps in vertically through the drilled hole) |

**The hardened-steel rule**: anything ≥45 HRC gets a pre-drill entry. Period. Plunging or ramping a carbide endmill into hardened steel fractures the bottom corner of the cutter; the bottom corner is the most stressed part of the flute.

**Ramp angle by material:**
- Aluminum / brass / plastic: 5-10° (forgiving)
- Mild steel: 1-3°
- Stainless / tool steel (annealed): 1-2°
- Hardened steel ≥45 HRC: NEVER ramp — pre-drill
- Titanium: 1-2°, and pre-drill is safer for production

### 5. Chip evacuation — the silent killer

Even with perfect direction, engagement, and thinning compensation, a chip that re-cuts is a chip that breaks the cutter. **Chip evacuation rules:**

- **Slotting:** flood coolant aimed at the leading edge of the cut. Pressure matters more than volume; 80-150 psi through-spindle beats 10 psi flood for clearing chips out of a deep slot.
- **HSM trochoidal:** lower coolant volume, but air-blast (8-10 bar) is sometimes BETTER than flood — keeps chips from welding to the carbide on titanium / Inconel.
- **MQL (minimum-quantity lubrication):** aluminum-only. Don't try MQL on steel; you need real coolant.
- **Cryo (LN2 through tool):** the new frontier for Inconel / titanium HSM — 2-4× tool life, BUT requires specialized tooling and post-processing.

### 6. Failure modes — what each sounds and looks like

1. **"Squeal-grind-pop" while slotting** → cutter is rubbing, not cutting. Probable cause: RDoC too low without chip thinning compensation → chip is below the minimum thickness for the geometry. Fix: enable thinning OR increase RDoC OR slow the cut.
2. **Top edge of the part chipped / "fuzzy"** → wrong direction (conventional when you should be climbing) OR the cutter exited the cut without unwinding the chip. On finish passes, always climb mill the perimeter; on roughing the chipping is acceptable.
3. **Cutter snaps mid-slot, fragment stays in the part** → plunge entry into hard material, or ramp angle too steep for material. Pre-drill an entry hole next time.
4. **Bottom corner of the endmill chipped after 5 minutes** → entry move slammed the corner. Use helical or pre-drill entry.
5. **Slot wider than programmed** → cutter is deflecting from too-high engagement force. Drop RDoC, raise SFM, compensate chip thinning. Don't "just slow down" — that worsens thinning rub.
6. **Beautiful finish on the climb side, garbage on the return** → you let CAM do conventional on the way back. Force "climb only" in CAM defaults; accept the 5-10% extra time for the no-rapid retract.

### 7. The shop-floor 3-line check before any new program

Before pressing CYCLE START on a new toolpath, mental-check three numbers:

1. **Direction:** climb (the default — verify the CAM didn't slip to conventional on rest material)
2. **Engagement:** RDoC ≤ 15% × cutter Ø for HSM, OR ≥ 50% × cutter Ø for legacy slotting (the in-between zone, 20-40%, is where bad chip thinning + heat compound — avoid)
3. **Compensation:** chip thinning ON if RDoC < 50% of Ø (your CAM should auto-multiply fz)

If any of those three is wrong, fix it before chips fly. Save the diagnosis time later.

## Provenance

- Hand-authored canonical entry for the machining-tactics tribal-coverage gap (MACHINING-TRIBAL-COVERAGE/U-MTC05).
- Chip thinning formula (1/sin(engagement)) is standard; same form as Sandvik/Iscar/Kennametal application engineering tables.
- HSM RDoC/ADoC ranges match current Mastercam Dynamic, Fusion Adaptive, hyperMILL MAXX, and OPEN MIND industry defaults.
- Climb-vs-conventional exceptions match shop-floor practice on Bridgeport-class manual mills + cast-iron Op-1 face-cut wisdom.
- Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.
- Pickup: `tribal-by-domain-inject.mjs` (UserPromptSubmit) + `wiki-precheck-inject.mjs`. No wiring required.

Cross-refs:
- [[op-order-rough-stress-finish]] — sequencing context (where the rough/finish strategy choice goes)
- [[workholding-soft-jaw-cycle]] — workholding that survives HSM force vectors
- [[part-setup-first-surface-datum]] — setup that survives HSM aggressiveness
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage signal that ranked this category 4th-weakest at 8.0%
