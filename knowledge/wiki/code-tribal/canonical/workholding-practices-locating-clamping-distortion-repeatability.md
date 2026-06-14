---
schema: ideablock-v1
title: "Workholding practices — 3-2-1 locating, clamp force vs distortion, soft jaws, thin-wall, repeatability"
domain: "Machining"
category: "workholding"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-df944902:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T23:33:00Z
tags: [workholding, fixturing, vise, soft-jaws, 3-2-1, locating, clamping-force, distortion, thin-wall, repeatability, chuck, collet, vacuum, magnetic, datum, deflection, tombstone, dovetail]
---

## Question

You have a part and a machine table. How do you hold it so it (a) doesn't move under cutting force, (b) doesn't distort under clamp force, (c) lands in the same place every cycle, and (d) lets the tool reach every feature? Bad workholding scraps parts that the spindle and toolpath would have made perfectly — and it's the #1 cause of "it was good yesterday."

## Answer

Workholding is constraint engineering: locate 6 degrees of freedom with the *minimum* force in the *right* places, then clamp without fighting the locators. The governing rule: **locate against finished/datum surfaces, clamp toward the locators, and never let clamp force exceed what distorts the part below its tolerance.**

### 1. The 3-2-1 locating principle (the foundation of every fixture)

A rigid body has 6 DOF (3 translation + 3 rotation). 3-2-1 removes all 6 with 6 contact points:

- **Primary datum — 3 points** on the largest, flattest face → kills 1 translation + 2 rotations (the part can't sink or rock)
- **Secondary datum — 2 points** on the next face, perpendicular → kills 1 translation + 1 rotation
- **Tertiary datum — 1 point** on the third face → kills the last translation
- **Clamps then remove the remaining freedom by holding the part *against* these 6 points** — clamps are NOT locators; they only maintain contact.

Rules that fall out of this:
- **Locate on finished/datum surfaces, never as-cast/rough/burr.** A rough surface under a locator = part rocks = every dimension off by the rock.
- **Locators are points (or short pads), not planes.** Three points define a plane deterministically; a full plane traps chips + dirt + burrs and the part rocks on whichever high spot it finds.
- **Clamp force vectors point at the locators.** A clamp that pushes the part *off* its locator (or twists it) destroys the location it took 6 points to establish.

### 2. Clamp force vs. distortion — the rule that scraps thin parts

Clamp force does two jobs in tension: it must exceed the cutting-force-induced slip tendency, but stay below the part's elastic distortion limit. The order of magnitude:

- **Required holding force ≈ (cutting force × safety factor 2–3) / (μ friction coeff ~0.1–0.3).** A 200 lbf cut needs ~1500–4000 lbf clamp on a friction-only grip.
- **Distortion budget:** clamp force × part compliance must produce <½ the tightest tolerance. A part that springs 0.001″ under the vise reads 0.001″ oversize when released.
- **When required-grip > distortion-limit:** you cannot solve it with more clamp. You must (a) add locating area / form-fit so friction isn't the only grip, (b) reduce cutting force (lighter DOC, climb, sharper tool), (c) clamp on a sacrificial tab / gripping stock removed last, or (d) go to vacuum/adhesive/low-melt fixturing.

| Part class | Workholding strategy |
|---|---|
| Solid prismatic, generous tolerance | precision vise, parallels, 1 clamp |
| Thin plate / panel | vacuum chuck or full-contact subplate + many low-force clamps spread out |
| Thin wall ring/tube | expanding mandrel (grip ID) or wrap-around soft jaws (distribute force around the circumference, never 3-jaw point-load) |
| Tall/long (high L:D) | steady rest / tailstock support / sub-fixture mid-span — never cantilever |
| Already-finished, hold for OP20 | locate on finished OP10 datum, clamp on non-critical area only |
| Family of small parts | tombstone / grid plate / sub-plate — amortize setup across many parts |

### 3. Soft jaws — the highest-leverage shop technique

Machined-to-the-part soft jaws (aluminum/steel blanks bored or milled to the part profile) convert a point-contact 3-jaw/vise into a **form-fit wrap**:

- **Grip force spreads over the contact arc** → 5–10× lower peak pressure → far less distortion on rings, tubes, thin walls.
- **Repeatability ↑**: the part seats the same way every cycle because the jaw *is* the part's negative.
- **Bore/mill soft jaws at the SAME pressure you'll clamp the part at**, with a ring/slug in the jaws to load them — cut them relaxed and they grip oversize/chattery.
- **Step jaws for OP20**: machine a shoulder so a finished OD drops to a hard Z-stop → Z datum is the jaw, not operator feel.
- Serrated/pyramid jaws bite hard but mar + point-load — use only on rough stock that gets cut away.

### 4. Repeatability — "it was good yesterday" root causes

| Symptom | Cause | Fix |
|---|---|---|
| First part good, drift over the run | chips/coolant building under locators | chip-clear or air-blast locators every cycle; relieve locator pads so chips fall away |
| Random size jumps part-to-part | part rocking on a rough/full-plane locator | switch to 3-point locating on a finished surface |
| Good on machine A, bad on machine B | fixture located off table T-slots (machine-specific) | locate off a hard-pinned sub-plate, qualify the fixture to its own datums |
| Drift after lunch / overnight | thermal — fixture + part + machine grew | let coolant/spindle reach steady-state; qualify the fixture warm |
| Operator-dependent results | clamp torque by feel | torque-spec the clamps (in-lb), or use a pneumatic/hydraulic fixture with regulated pressure |
| Part pops loose mid-cut | clamp force < cutting force, or clamp on a springy area that relaxed | recompute grip vs cut; clamp over solid section, not an overhang |

### 5. Clamp placement rules

- **Clamp over a locator, never over a span.** A clamp on unsupported material bends the part into the cut, then it springs back oversize.
- **Clamp low, cut high** — keep the clamp footprint out of the toolpath and below the cut plane so it doesn't get in the way or take a hit.
- **More small clamps > one big clamp** on flexible parts — distributes force, reduces local crush.
- **Clamp sequence matters**: seat the part against ALL locators first (light clamp/toe), verify seating, then final-torque. Final-torquing one corner first cocks the part off its datums.
- **Edge clamps / toe clamps pull down AND in** toward locators — ideal for low-profile work where top clamps block the tool.

### 6. Special-case workholding

| Method | Wins | Watch out |
|---|---|---|
| **Vacuum chuck** | thin plates, panels, non-magnetic, full-surface support, zero distortion | needs flat sealed bottom; cutting force must stay < holding vacuum × area; air leak = launched part |
| **Magnetic chuck** | flat ferrous, grinding + light milling, fast load | only ferrous; residual magnetism; force drops with air gap / non-flat |
| **Expanding mandrel / collet** | concentric grip on a bore/OD, near-zero distortion if force is radial-uniform | needs an existing accurate bore/OD to grip |
| **Low-melt alloy / fixture wax / glue** | tiny / fragile / freeform parts, full encapsulation | thermal cycle; release process; not for heavy cuts |
| **Dovetail / Mitee-Bite** | grip on a tiny machined dovetail tab → 5-side access in one setup | needs a sacrificial dovetail allowance in the stock |
| **Tombstone (4th-axis / HMC)** | many parts per cycle, lights-out, amortized setup | fixture stiffness across the column; balance for rotary |

### 7. Fixture stiffness — the silent tolerance killer

The part is only as rigid as the fixture under it. A stiff part on a springy fixture chatters and mislocates exactly as if the part were soft.

- Fixture deflection under max cut should be **< 10% of the part's tightest tolerance**.
- Keep the **clamp-to-cut load path short and triangulated** — long thin clamp straps are springs.
- **Locate close to the cut.** A locator 6″ from the cutting zone lets the part lever between them.
- Bolt fixtures to the table at **≥4 points near the cutting zone**, not just the corners.

### 8. Shop-floor 5-line check before you cut

1. **Am I locating on finished/datum surfaces with 3-2-1 points, not a rough full plane?**
2. **Do my clamp force vectors point AT the locators (not off them or twisting)?**
3. **Is clamp force × part compliance < ½ the tightest tolerance?** (thin/long part — prove it, don't assume)
4. **Are locators relieved/clearable so chips can't build under them mid-run?**
5. **Is the clamp out of the toolpath, over a solid section, torqued to spec (not by feel)?**

### Failure modes — symptom → workholding root cause

| Symptom | Root cause |
|---|---|
| Part in-tol clamped, out-of-tol released | clamp force distorted it past the tolerance — elastic spring-back |
| Concentricity lost between OP10 and OP20 | OP20 located on a non-datum / unfinished surface |
| Walls taper or bow on a thin part | point-load 3-jaw on a thin ring — needs wrap soft jaws / mandrel |
| Chatter that tooling changes won't fix | fixture (not tool) is the spring — short the load path, locate near the cut |
| Size walks across a production run | chips packing under a full-plane locator |
| Launched part / crash | vacuum/clamp force < cutting force, or clamp on a relaxing overhang |

Pickup: tribal-by-domain-inject.mjs + wiki-precheck-inject.mjs (no wiring required — keyword pickup on workholding / fixture / soft-jaw / clamp / locating / 3-2-1 / distortion / repeatability).

Lifecycle: Current. Re-validate against the shop-floor outcome ledger every 90 days. Supersede only with field-measured counter-evidence.
