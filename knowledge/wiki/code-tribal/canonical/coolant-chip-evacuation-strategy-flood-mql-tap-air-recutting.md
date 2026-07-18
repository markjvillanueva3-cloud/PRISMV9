---
schema: ideablock-v1
title: "Coolant & chip-evacuation strategy — flood vs MQL vs TSC vs air, recutting, pecking, by-material"
domain: "Machining"
category: "machining-tactics"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-df944902:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T23:37:00Z
tags: [coolant, chip-evacuation, flood, mql, through-spindle, tsc, air-blast, pecking, recutting, chip-thinning, deep-hole, peck-drill, swarf, nesting, by-material, aluminum, titanium, stainless]
---

## Question

The cutter is right, the feed is right — and the tool still dies in 10 minutes, or the bore goes oversize, or the part welds itself to the flutes. Nine times out of ten the failure isn't the cut, it's that the chip never left and got cut a second time. How do you choose and aim coolant, and when do you peck vs. plunge?

## Answer

Chip evacuation is a first-class process variable, co-equal with speed and feed. The governing rule: **a chip that is cut twice kills the tool and the finish — every coolant/peck/air decision exists to get the chip out of the cut zone before the next tooth arrives.** Recutting is the single most under-diagnosed cause of "good tool, bad result."

### 1. Coolant method selection — by operation + material

| Method | Wins | Loses / watch | Typical material |
|---|---|---|---|
| **Flood (emulsion 5-10%)** | general milling/turning, washes chips, cools part + tool, the default | thermal shock cracks carbide in interrupted cuts; mist/health; settling tanks | steel, stainless, cast iron |
| **Through-spindle / through-tool (TSC, 300-1000 psi)** | deep drilling (>3×D), deep pockets, blind holes — flushes the chip up the flute | needs coolant-thru tools + clean filtered system; pressure ↓ chip size | all, mandatory deep-hole |
| **MQL (minimum quantity, ~10-50 mL/hr)** | aluminum, near-dry, no swarf-soaked chips, recyclable scrap, clean | not enough cooling for hard/stainless heavy cuts; needs chip air-evac | aluminum, brass, some steel |
| **Air blast / cold air gun** | dry-machining cast iron (coolant + graphite = slurry), plastics, where coolant ruins finish; chip clearing in MQL | zero cooling — feed/speed must self-limit heat | cast iron, graphite, plastics, hardened (CBN) |
| **High-pressure jet at the cut (1000+ psi, aimed)** | titanium + superalloys — breaks the chip, lifts heat at the shear zone, doubles tool life | system cost; aim is critical | titanium, Inconel, superalloys |
| **Dry (carbide + coating only)** | hard turning (CBN), interrupted hardened cuts where coolant thermal-cracks | demands the right grade/coating + speed; chips must fall clear by gravity/air | hardened steel, CGI |

**Material defaults (unknown-job starting point):**
- **Aluminum:** flood OR MQL; chip evac dominates — 2-3 flutes, big gullets, air-assist. Aluminum welds to the flute the instant a chip recuts.
- **Steel/stainless:** flood, generous; TSC for any hole >3×D. Stainless work-hardens — a recut chip + dwell = glazed hole + dead tool.
- **Cast iron:** dry or air — coolant + graphite dust = abrasive slurry that wears everything.
- **Titanium:** high-pressure aimed coolant, non-negotiable; Ti holds heat at the tip and the chip is your only heat-exit path.
- **Hardened steel (≥50 HRC):** dry or air with CBN/ceramic — coolant thermal-cracks the insert on entry/exit.

### 2. Recutting — the silent tool-killer (diagnose this FIRST)

A recut chip is harder than the parent stock (work-hardened by the first cut), so the second cut is an interrupted cut against an abrasive, often welded, fragment. Symptoms that scream "recutting," not "wrong speed/feed":

- Tool life wildly inconsistent on identical parts (chip nest forms randomly)
- Built-up edge / welded flutes in aluminum or gummy stainless
- Finish degrades through a pocket from clean → torn as the pocket fills
- Sudden catastrophic failure mid-pocket (chip-packed, no escape, tool snaps)
- Oversize/tapered slots (chips wedge between tool and wall, push the tool off)

Fixes, in order: **(1) get the chip OUT** — TSC, higher-pressure flood aimed at the cut, air assist, climb-milling so the chip ejects behind the tool not in front; **(2) make a smaller chip** — pecking, chip-breaker geometry, lower DOC; **(3) don't let it nest** — toolpath that doesn't dump chips into the next cut (pocket out-to-in for chip clearance, ramp/helix entry not plunge, avoid full-slot where the chip has nowhere to go).

### 3. Pecking & deep-hole strategy

| Hole depth | Strategy |
|---|---|
| **< 3×D** | drill straight, flood or TSC; no peck needed |
| **3-5×D** | chip-break peck (G73, small retract ~0.010″) to fracture the chip; TSC strongly preferred |
| **5-10×D** | full-retract peck (G83, clears the flute completely) OR TSC + chip-break; reduce feed ~30-50% |
| **> 10×D** | gun drill / TSC mandatory; coolant pressure scaled to depth; the chip MUST be flushed, pecking alone won't clear it |

- **G73 (chip-break)** = small retract, breaks the chip but leaves it in the hole — only adequate ≤5×D with good coolant.
- **G83 (full peck)** = full retract to clear, slow but the deep-hole survivor. Each peck out also re-floods the bottom.
- **Peck the FIRST peck shallower** — the drill is least supported as it enters; chip control is worst at the start.
- **Reduce feed as depth increases** — coolant reaches the tip less effectively deep; the chip has farther to travel.

### 4. Coolant aim — the free fix nobody does

Coolant volume is irrelevant if it isn't *at the cut*. The most common shop coolant error is a nozzle pointed at where the tool *was*, not the shear zone.

- **Aim at the cutting edge engagement, not the general area.** For drilling, down the flutes. For milling, at the leading edge in the direction of cut.
- **Two nozzles for a deep pocket** — one floods, one clears the chip out of the pocket.
- **More nozzles, aimed, beats higher flow, unaimed.**
- **TSC needs clean coolant** — a clogged 0.020″ coolant hole at 800 psi is zero coolant at the worst possible place; filtration is part of the strategy.

### 5. Toolpath ↔ chip-evacuation coupling

- **Climb mill for chip ejection** — climb throws the chip behind the cutter (out of the next cut); conventional drags it back through. Climb is the chip-evac default, not just the finish default.
- **Pocket out-to-in (or morph) when chip-packing is the risk** so the cutter always has somewhere to throw chips; in-to-out can bury the tool in its own swarf in a deep pocket.
- **Helical/ramp entry, never plunge into a blind pocket** — a plunged hole has zero chip escape; the second the flutes fill, the tool snaps.
- **Avoid full-slot in gummy material** — 100% radial engagement = chip has nowhere to go = recutting guaranteed; trochoidal/peel at lower radial keeps the chip free.
- **Air blast on MQL/dry** is the toolpath's chip broom — without it MQL just makes hot chips that re-weld.

### 6. Shop-floor 5-line check before you cut

1. **Is the chip getting OUT, or recutting?** (Look at the chips: clean curls = good; tiny welded fragments / nests = recutting → fix evac before touching speed/feed.)
2. **Is the coolant aimed AT the cut, not the general area?**
3. **Hole >3×D — am I pecking and/or running through-spindle coolant?**
4. **Climb-milling so chips eject behind the tool?**
5. **Right method for the material?** (Ti=high-pressure aimed; cast iron=dry/air; aluminum=evac-first; hardened=dry/CBN.)

### Failure modes — symptom → coolant/evac root cause

| Symptom | Root cause |
|---|---|
| Inconsistent tool life, same program | random chip nesting / recutting |
| Welded flutes, built-up edge (Al/SS) | recut chip + insufficient evac; needs air/TSC + bigger gullet |
| Drill snaps deep in a hole | flute packed — under-pecked or no TSC for the depth |
| Bore oversize/tapered | chips wedged between tool and wall, deflecting the tool |
| Finish good at pocket top, torn at bottom | chips accumulating, getting recut as the pocket fills |
| Carbide insert micro-cracks in interrupted cut | flood thermal-shocking it on each re-entry — go dry/air or coated-for-thermal |
| Cast iron job wears every tool fast | coolant + graphite = abrasive slurry — should be dry/air |
| Titanium tool dies at the tip fast | heat not evacuated — needs aimed high-pressure coolant at the shear zone |

Pickup: tribal-by-domain-inject.mjs + wiki-precheck-inject.mjs (no wiring required — keyword pickup on coolant / chip / evacuation / flood / MQL / through-spindle / TSC / pecking / recutting / deep-hole / swarf).

Lifecycle: Current. Re-validate against the shop-floor outcome ledger every 90 days. Supersede only with field-measured counter-evidence.
