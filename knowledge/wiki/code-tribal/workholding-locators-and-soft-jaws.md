---
schema: ideablock-v1
title: "Locators + soft jaws — getting repeatability without re-indicating every part"
domain: "Workholding"
category: workholding
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Locating & Clamping + §Soft Jaws
  - Jergens "Fixture Workbook" + Carr Lane Tooling Components catalog
  - Mitee-Bite "Workholding Best Practices" guide
  - ANSI B5.1M (machine tool quality) + ISO 230 (kinematic test methods)
  - 4245-tribal corpus workholding subset (n=426)
extracted_via: human-authored
extracted_at: 2026-05-21T02:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-WORKHOLD-LOCATORS)
---

## Question

How do I locate a part the same way every time without indicating each one — and how do I design soft jaws that don't crush the finish?

## Answer (canonical — separate locating from clamping, then design each)

### The load-bearing principle

**Locating ≠ clamping.** Locators *define* where the part is (constrain DOF); clamps *hold it there* (apply force). Mix them and you get a part whose final position depends on clamping torque — which is non-repeatable by definition.

```
Locator job  → constrain part position (6 DOF: 3 translation + 3 rotation)
Clamp job    → push part against locators with enough force to resist cutting
```

If the clamp can move the part, the part will land in a different position each cycle — you've just baked clamping variability into your repeatability. The fix is mechanical: locators are *rigid* (pin against block, machined pad), clamps are *compliant* (toe clamp, vise jaw, hydraulic piston). Force flows clamp → part → locator → fixture base. Never clamp → part → tool path.

### Locator selection by part feature

| Part feature available | Use this locator | Why |
|---|---|---|
| Flat machined surface | **Flat pad** (rest button or precision block) | Constrains 1 DOF translation + 2 rotations = 3 DOF; biggest leverage per locator |
| 2 holes ≥ 1 dia apart | **Diamond pin + round pin** | Round constrains 2 DOF translation; diamond constrains 1 rotation. Total: 3 DOF. Standard "2-pin" location. |
| Boss / cylindrical OD | **V-block** (90° or 120°) | Constrains 2 DOF translation; combined with a flat = 5 DOF. Self-centers under clamp force. |
| Datum-A face + boss | **Flat + V-block + flat-stop** | Full 6-DOF kinematic location. ANSI B5.1M-style locating frame. |
| Casting / forging skin (no datum yet) | **Adjustable jacks + datum-target buttons** | Datum-targets per ASME Y14.5 §4.10 lock the part to the print, not to the as-cast surface. |
| Pre-machined part for re-op | **Soft jaws cut at clamp pressure** | Conforms to the *already-machined* feature; transfers original WCS to the new setup. |
| Hole + slot | **Round pin + diamond pin (rotated for slot)** | Same as 2 holes — diamond goes in the slot, oriented across its long axis. |
| Curved / lofted surface | **3+ adjustable jacks + edge-locator** | No single feature locates it; build a kinematic nest. |

### The 6-DOF accounting (every locating scheme MUST sum to 6)

If your locators constrain fewer than 6 DOF, the part moves when the cut force is applied — you have a clamping problem masquerading as a locating problem. If they constrain *more* than 6, the part is over-constrained and stresses inward when the clamps close — distortion. Both fail.

| Locator type | DOF constrained | Worked example |
|---|---|---|
| Flat pad (3 of them in a plane) | 3 (1 trans + 2 rot — together) | Bottom of vise jaws or fixture plate |
| V-block | 2 trans | Side-located cylindrical part |
| Round pin in hole | 2 trans | Primary datum hole |
| Diamond pin in hole | 1 rot | Secondary datum hole (kept narrow to avoid over-constraint) |
| End-stop block | 1 trans | "Crash-stop" against a side |
| Datum-target button | varies (typically 1) | Used in groups of 6 (3 + 2 + 1) for cast parts |

**Standard 3-2-1 location scheme:**
- 3 flat pads on the bottom → 3 DOF (primary datum A face)
- 2 pins or pads on one side → 2 DOF (secondary datum B)
- 1 stop on the end → 1 DOF (tertiary datum C)

Total = 6 DOF. Part is fully located before any clamp closes. Clamp force then pushes part *into* the locators (not against the tool path). This is the canonical fixture geometry referenced in [[operation-ordering-datum-sequencing]] — the locating frame must match the print's datum frame.

### Soft jaw design rules (the boring step matters most)

Soft jaws are aluminum or hard-anodized aluminum jaws machined in-place to grip a specific part feature. They give a vise the repeatability of a custom fixture without the build time.

**The 5 rules:**

1. **Bore at the same clamp pressure you'll machine at.** Cutting them open is a transfer of position from "machined-at-X-pressure" to "clamped-at-Y-pressure". If pressures differ, the part lands in a different XY than where the jaw thinks it is. Standardize torque (e.g. 50 ft-lb on a 6" vise) and use that for both jaw-cutting AND production clamping.

2. **Leave a witness mark / reference feature when you bore.** A small flat or a dot on the jaw face, machined at the same time as the jaw form, gives you a re-zero point if the jaws ever come out. Without a witness mark, the jaws become un-re-installable — every removal = re-bore.

3. **Include relief.** The jaw form should match the part *minus a 0.05–0.15 mm relief* at the corners + edges. Without relief, the jaw bottoms out before clamping the part body; the part rocks on corner contact. Witness: a part that "almost fits but spins" = no corner relief.

4. **Don't grip on the finished feature you're about to cut.** Obvious in principle, defeated daily in practice. The jaw form must contact a face/feature that is (a) not the cut zone, (b) not a tolerance-critical surface on the print. A finished bore is sacred; clamp on a non-toleranced OD or a sacrificial pad.

5. **Stop above the cut line.** Jaw height > 2–3 mm above the deepest cut on the gripped face. Otherwise the endmill scrapes the jaw → ruined jaw + ruined finish in one cycle. Set up the WCS so the deepest Z below the part top is still ≥ 3 mm above the jaw top.

### Repeatability budget per holder type

This is what you can *expect* setup-to-setup without re-indicating:

| Holder | Part-to-part variation (typical, 95 %) | Setup-to-setup variation |
|---|---|---|
| Vise + hard jaws, raw stock | 0.05–0.15 mm | 0.10–0.30 mm (face-to-face dependence) |
| Vise + soft jaws, machined-side gripped | 0.005–0.020 mm | 0.020–0.050 mm (if jaws stay in vise) |
| 3-jaw chuck, raw round stock | 0.02–0.10 mm (chuck runout dominates) | Limited by chuck-to-spindle repeatability |
| 6-jaw chuck, soft-cut jaws | 0.005–0.015 mm | 0.020–0.040 mm |
| Fixture plate + dowel pin (8 mm precision) | 0.005–0.010 mm | 0.010–0.020 mm (pin clearance limit) |
| Tombstone / 4th-axis with kinematic mount | 0.002–0.005 mm | 0.005–0.010 mm |
| Magnetic chuck (large flat) | 0.005–0.015 mm | 0.010–0.030 mm |
| Vacuum chuck (thin sheet) | 0.010–0.040 mm | 0.020–0.060 mm |

If your part's tolerance class M (±0.05 mm) or tighter, a vise with hard jaws on raw stock cannot deliver it without per-part probing. Step up to soft jaws or a fixture, or accept that probing becomes part of the cycle (and pay the time).

### Anti-patterns from the floor

- **"We'll just dial in each part."** Repeatability via indicator is operator-skill + time-cost dependent. Fine for a 5-piece prototype, ruinous for 500-piece production. Locators amortize.

- **"More clamps = better grip."** Past 4 clamps on a small part, you're adding distortion sources, not grip. The non-coplanar clamping forces fight each other; the part bows. Two well-placed clamps with high friction (`μ_grip` 0.25+) beat 6 toe clamps with smooth pads.

- **"Diamond pins must be tight."** No — diamond pins are *narrow on purpose* (~ hole diameter − 0.02 mm on the long axis, − 0.10 mm on the short axis). They locate rotation only; the round pin locates translation. A tight diamond pin over-constrains the part = stress + binding.

- **"Soft jaws don't need maintenance."** Aluminum jaws wear at the contact face (~ 0.02 mm per 100 cycles in steel parts). Re-bore them when the variation creeps past your repeatability spec. Cheap: scrap the jaw set, cut new ones. Pretending the wear isn't there is how production parts drift out of spec invisibly.

- **"Locate on the cast skin."** Skin varies 0.5–2.0 mm part-to-part. Locating on it transfers raw-stock variance directly into machined-feature position. Use datum-target buttons per the print, or machine the locating face *first* on the cast and use the now-flat surface as the datum.

### Kinematic vs over-constrained — when to care

A **kinematic** fixture constrains exactly 6 DOF (no more, no less). A part inserted into a kinematic nest seats deterministically — no rocking, no force-dependent positioning.

A **over-constrained** fixture (e.g. 4 flat pads in a plane instead of 3) forces the part to flex to seat. The fourth pad gets contact only after the part bends to it. Result: residual stress in the held part + clamp-force-dependent position.

**When kinematic matters:**
- Sub-micron repeatability targets (optical, ultra-precision)
- Brittle / pre-stressed parts where forcing a seat induces fracture
- Mass-production cycles where any rocking induces a 0.005 mm scatter that's mistaken for spindle thermal drift

**When over-constrained is fine:**
- Steel block on a fixture plate with 4 toe clamps — the steel doesn't care about a few µN of unequal pad contact
- Production work to ±0.05 mm — over-constraint adds 5–10 µm scatter, lost in the tolerance budget anyway

Default to 3-2-1 kinematic; deviate only when you can prove the part can absorb the over-constraint without affecting features.

### Tie-ins to the broader workholding canon

- The **force budget** (see [[workholding-clamp-force-and-selection]]) tells you how much grip — *this* entry tells you where to put the contact points. Both are required; either alone fails.
- The **datum frame** (see [[operation-ordering-datum-sequencing]]) defines which features the locators must reference. Locators on a non-datum surface = an in-spec part referenced to nothing the print expected.
- **Re-datum after roughing** (see [[operation-ordering-rough-finish-sandwich]]): when stress relief moves the part, the original soft jaws cut at pre-relief geometry no longer fit. Re-cut the jaws OR loose-clamp + re-indicate, then finish.

## Provenance

Distilled from the 426 workholding tips in the 4245-tribal corpus + Machinery's Handbook 31e §Locating & Clamping + Jergens / Carr Lane / Mitee-Bite catalogs + ANSI B5.1M + ISO 230 kinematic test methods. Authored 2026-05-21 by slot:hotel under U-WIKI-WORKHOLD-LOCATORS — second canonical workholding entry of the wiki+tribal high-ROI pivot, sibling to [[workholding-clamp-force-and-selection]].

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `locator`, `pin`, `diamond pin`, `V-block`, `soft jaw`, `repeatability`, `kinematic`, `datum-target`, `dowel`, `nest`, `3-2-1`, `over-constrained` keywords. Zero wiring required.

## Cross-references

- [[workholding-clamp-force-and-selection]] — sibling canonical entry; how much force to apply at the contact points this entry defines
- [[operation-ordering-datum-sequencing]] — locators must reference the print's datum frame, not arbitrary surfaces
- [[operation-ordering-rough-finish-sandwich]] — re-cut soft jaws after stress relief or accept lost repeatability
- [[operation-ordering-hole-sequence]] — drilled holes are the most common feature locators reference
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit ranking workholding as 4.9 % second-weakest
- [[feedback_do_optional_high_roi_work]] — standing rule honored
