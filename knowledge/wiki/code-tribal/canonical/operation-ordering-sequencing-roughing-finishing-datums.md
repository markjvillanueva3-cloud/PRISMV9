---
schema: ideablock-v1
title: "Operation ordering / sequencing — rough-before-finish, datum-driven setups, stress relief, heat-treat insertion"
domain: "Machining"
category: "operation-ordering"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-df944902:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T23:30:00Z
tags: [operation-ordering, sequencing, op10, op20, roughing, finishing, datum, setup-reduction, stress-relief, heat-treat, deburr, inspection, fixturing, distortion, process-planning, traveler]
---

## Question

You have a part print and a blank. What order do the operations actually go in — which faces first, when do you flip it, where does heat-treat slot in, when do you rough vs. finish, and how do you keep the part from moving on you between setups? Getting the *sequence* wrong scraps parts that every individual operation could have made perfectly.

## Answer

Operation ordering is the single highest-leverage process-planning decision and the one most often done by reflex. The rule set below collapses ~90% of prismatic + turned-part sequencing to a deterministic order. The governing principle: **establish datums first, remove the most material while the part is most rigid, release internal stress before you cut the features that must hold tolerance, and touch each tolerance-critical feature last and once.**

### 1. The canonical sequence (prismatic part, the 80% case)

1. **Establish primary datum face + two locating datums.** First cut creates the reference everything else measures from. Mill the primary datum flat, then square two adjacent edges (the 3-2-1 locating scheme). Never finish a feature before its datum exists.
2. **Rough all material, all setups, while the casting/billet is most rigid.** Bulk metal removal induces the most distortion — do it before any finish dimension exists to ruin.
3. **Stress-relieve if roughing removed >50% of volume OR the material is pre-hardened / weld­ed / cast.** (See §4.) The part *will* move; the only question is whether it moves before or after your finish cuts.
4. **Semi-finish** — leave 0.010–0.030″ (0.25–0.75 mm) on tolerance features. This pass cuts through the rough-distorted layer and re-references to the datum.
5. **Secondary ops that perturb the part** — drilling, tapping, deep pockets, heat-treat — *before* final finish. Anything that adds heat or clamping force or removes a chunk of section happens before the cuts that must hold ±0.0005″.
6. **Finish tolerance-critical features last, in one setup if possible, smallest tool last.** Bores, sealing faces, gauge surfaces, mating features. One setup eliminates setup-to-setup datum-shift error.
7. **Deburr → clean → inspect.** Deburr before inspection (a burr reads as a dimension on a CMM and as a leak on a seal). Final inspection is its own "operation" on the traveler, not an afterthought.

### 2. Datum-driven ordering — the rule that prevents tolerance stack-up

- **Cut datums first, reference them forever.** Every dimension on a print is from a datum. If you machine feature B off feature A, then re-fixture and machine the datum, B is now wrong by the A-to-datum error.
- **Tightest tolerance → fewest setups between it and its datum.** A ±0.0002″ bore dimensioned from datum C must be cut in the *same* setup as datum C, or with C physically located in the fixture. Each setup adds ~0.0005–0.002″ of relocation error.
- **Datum-target precedence:** primary (3 points, biggest face) → secondary (2 points) → tertiary (1 point). Machine and locate in that order; never let a tertiary surface carry a primary-datum dimension.
- **Concentricity / position features:** if two bores must be concentric within 0.0005″, they get bored **in one setup without unclamping** — never "bore one, flip, bore the other." Indicate, don't trust the fixture.

### 3. Roughing vs. finishing — separation rules

| Rule | Why |
|---|---|
| **Never finish in the same pass that roughs** | Rough cutting forces deflect the tool + part; the finish dimension is taken under near-zero load so it's repeatable |
| **Separate roughing and finishing tools** | A tool that roughed is worn/chipped; finish with a fresh edge. Dedicated finisher = predictable size |
| **Leave uniform finish stock** | 0.010–0.020″ on walls, 0.005–0.015″ on floors. Uniform stock = uniform spring-back = predictable final size |
| **Finish floors before walls in a pocket** | Wall finishing leaves the floor corner clean; reverse order re-marks the floor |
| **Finish bores after adjacent material is removed** | A bore cut while a thick boss is still attached moves when the boss is later removed (stress redistribution) |
| **Climb-mill the finish pass** | Lower cutting force, better finish, no rubbing; conventional only if backlash/rigidity forces it |
| **Spring pass on tight bores/IDs** | Repeat the final pass at the same depth with zero added DOC to cut the elastic spring-back ~0.0002–0.0008″ |

### 4. Stress relief — when the part moves and where to put the op

Internal stress is released the moment you remove the material constraining it. The part bows, twists, or grows. Insert a relief step when **any** of these is true:

- Roughing removed **>50%** of the billet/casting volume
- Material is **pre-hardened** (4140 PH, 17-4 H900), **welded**, **cast**, or **flame/laser-cut blank**
- Part is **thin / long / asymmetric** (L:t > 10, or a C-section / U-section)
- Final tolerance is **≤0.001″** on a feature spanning >3″

Relief options, in order of cost:
1. **Rough → unclamp → re-clock → semi-finish** (free; lets the part move *before* it matters, re-reference to datum)
2. **Rough → thermal stress relief (sub-critical anneal) → finish** (oven; ~1100–1250 °F for steel, hold 1 hr/in)
3. **Vibratory stress relief** (between rough and finish; cheaper than thermal, no scaling)
4. **Rough → natural age (24–72 h) → finish** (aluminum tooling plate, cast iron — the old-shop trick)

**Heat-treat insertion:** rough everything, leave grind/finish stock (0.015–0.030″ for HT growth + distortion), heat-treat, then finish-grind/hard-mill to print. **Never** finish soft then heat-treat — HT distortion is 0.001–0.010″ and you cannot predict it tightly enough to pre-compensate on anything but flat ground stock.

### 5. Setup-reduction ordering — minimize flips and tool changes (cost driver)

- **Group by setup, then by tool, then by feature** — every flip is relocation error + cycle time; every tool change is ~6–30 s. Plan the traveler to do *all* work reachable in OP10 before flipping to OP20.
- **Most setups should be ≤2** for prismatic parts (OP10 = 5 faces on a vise/fixture; OP20 = the 6th face). A 4+ setup plan on a simple part is a process-planning failure — re-fixture or use a tombstone/4th-axis.
- **Tool-change minimization within a setup:** order features by tool so each tool loads once (rough-mill all → drill all → tap all → finish-bore all), *unless* a tolerance feature demands the part be undisturbed — then tolerance wins over tool grouping.
- **Datum carries across setups:** the OP20 fixture must locate on a *finished* OP10 datum, never on a rough/as-cast surface.

### 6. Secondary-op precedence (the gotchas)

| Op | Goes... | Because |
|---|---|---|
| **Drilling** | before finish-milling adjacent walls | drill thrust + breakthrough burr distorts thin walls; drill first, mill the burr off |
| **Tapping** | after the hole's face is finished | tap to a finished face so thread depth datums are real; deburr the hole *before* tapping |
| **Deep pockets** | before finishing the opposite side | removing a deep core releases stress that bows the far face |
| **Boring** | after roughing the surrounding mass away | a bore in a thick boss closes up when the boss is removed |
| **Reaming** | dead last on that hole, after all heat + clamping | reamed size is ±0.0003″; nothing that moves the part may follow it |
| **Grinding** | after heat-treat, after stress relief | grind is the finish-of-finishes; everything that distorts precedes it |
| **Deburr** | before inspection, after the feature that created the burr | a burr is a false dimension on a CMM and a leak path on a seal |
| **Threading (turned)** | after the OD is finished, before parting | thread to a finished, on-size OD; part-off last so the part is rigid during threading |

### 7. Turned-part sequence (lathe / mill-turn)

1. Face + center-drill (or face + spot) — establishes the Z datum
2. Rough OD + rough bore (largest DOC the setup tolerates, part is full-length-rigid)
3. Stress relief if §4 triggers (long shafts *will* banana)
4. Finish bore → finish OD (bore first: a finished OD springs when you then bore it; reverse order keeps the OD true)
5. Groove → thread (to finished OD)
6. Deburr / chamfer
7. Part off **last** — the part is most rigid while still attached to the bar; parting first turns every later op into a chucking problem

### 8. Shop-floor 5-line sanity check before you cut

1. **Does my first op create the datum every later dimension references?** (If no — re-order.)
2. **Is all roughing done before any feature that holds ≤0.001″ exists?**
3. **Did I put a stress-relief step anywhere >50% volume came out, or the stock was pre-hard/cast/welded?**
4. **Is every tolerance-critical feature cut in the same setup as its datum, or with that datum located in the fixture?**
5. **Is final inspection a line on the traveler — and is deburr the line *before* it?**

### Failure modes — symptom → ordering root cause

| Symptom | Root cause |
|---|---|
| Part in-tolerance at the machine, out-of-tol on the CMM an hour later | finished before stress relief — it moved after you let it go |
| Two bores won't stay concentric | bored in separate setups instead of one undisturbed setup |
| Bore grows/shrinks 0.001″ after an adjacent pocket is cut | bore finished before adjacent mass removed (stress redistribution) |
| Threads gauge shallow/deep inconsistently | tapped/threaded to a rough (not finished) face — depth datum was fake |
| Post-heat-treat part won't clean up to print | not enough finish stock left for HT growth + distortion |
| Scrap rate spikes on a thin part only at final-finish | no rough→unclamp→re-clock step; clamp distortion baked into the finish cut |
| CMM flags a "dimension" that's actually a burr | inspected before deburr |

Pickup: tribal-by-domain-inject.mjs + wiki-precheck-inject.mjs (no wiring required — picked up by keyword on operation-ordering / sequencing / setup / datum / stress-relief / traveler).

Lifecycle: Current. Re-validate against the shop-floor outcome ledger every 90 days. Supersede only with field-measured counter-evidence (a documented case where the sequence rule above produced the scrap, not prevented it).
