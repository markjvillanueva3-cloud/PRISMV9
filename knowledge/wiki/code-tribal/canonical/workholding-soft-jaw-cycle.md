---
schema: ideablock-v1
title: "Workholding — the soft-jaw cycle for 2nd-op concentricity"
domain: "Machining"
category: "workholding"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-b23a56ef:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T19:18:00Z
tags: [workholding, soft-jaws, chuck, lathe, mill, 2nd-op, concentricity, vise, fixture, parallels]
---

## Question

How do you hold a turned part for the 2nd op (back-side machining, or a mill op after first-side turning) and still hold <0.001 TIR concentricity to the 1st-op features?

## Answer

The soft-jaw cycle: **bore the jaws on the same machine, same chuck, same WCS, immediately before the 2nd-op part loads**. The jaws inherit the chuck's runout because they're cut in place — when you load the part, it lands concentric to the chuck's actual rotational axis, not the chuck's nominal axis.

**The cycle, on a lathe (most common case):**

1. Mount three soft jaws (typically 1018 or aluminum) on the chuck and torque to the chuck's spec — usually 25-50 ft-lb on a 8-10″ 3-jaw, 50-100 ft-lb on a 12″+. Same torque you'll use on production.
2. Clamp a **boring slug** in the jaws. The slug is a hardened ring or solid round, ID matched to the part's clamp diameter you're about to bore. The slug *pre-loads* the jaws against the chuck wedges in the same direction the part will load them.
   - For OD-gripped parts: slug OD = part clamp OD, slug clamped on jaw step face.
   - For ID-expanded jaws (less common): slug ID = jaw expansion diameter.
3. With the chuck closed on the slug, **bore the jaw step** to the target part-grip diameter +0.0005 to +0.001 (just enough clearance for the part to drop in without binding).
4. Open the chuck, remove the slug, load the part. Re-clamp at the same torque.
5. Indicate the 1st-op feature you care about (turned OD, finished face). It should read **≤0.0005 TIR** if the cycle was done right. If it reads >0.001, the slug was the wrong diameter or the torque was inconsistent — re-bore, don't try to compensate.

**Why the slug matters (the part most people skip):**

A 3-jaw chuck has internal clearance in its scroll + wedge mechanism. With no clamping force, the jaws float on that clearance. When you clamp on the slug, the wedges drive in one consistent direction; bore-in-that-state and the bore's center matches the *clamped* center, which is what the part will see. If you bore the jaws against air (no slug), you bore against the *unloaded* center — load the part and the jaws shift by the clearance amount, giving you 0.001-0.003″ runout.

**Soft-jaw stick-out — the safe-grip rule:**

| Jaw step depth | Max safe ADoC | Notes |
|---|---|---|
| < 0.5 × ID | full ADoC, finish included | the jaws hug enough surface to resist torque |
| 0.5 - 1.5 × ID | rough OK, finish at reduced ap | finish pass deflection visible |
| > 1.5 × ID | DO NOT — switch to longer jaws or a face driver | part will spin or kick |

Where ID is the part's gripped diameter. A part with a 1.000″ grip diameter and 1.500″ stick-out beyond the jaw face is at the safe limit; 2.000″ is *not* — get longer jaws or add a tailstock / live center.

**Mill workholding — corresponding rules:**

For 2nd-op milling that needs to reference 1st-op features:

1. **Vise + parallels:** parallels must be ≥0.020″ taller than the jaw rise (so the cut clears the jaw top). Verify the part is fully seated on parallels — tap with a soft mallet, both parallels should "ring" the same; if one rings dull, the part is cocked.
2. **Indicate the vise itself** to <0.0002″ TIR across 6″ before mounting the part. A cocked vise is the #1 source of mystery surprise-tolerance failures on 2nd-op mill work. Tighten the vise mounting bolts in a star pattern, not sequentially.
3. **Soft jaws in the mill vise** — same cycle as the lathe, but the "slug" is a precision-ground gage block stack or a known-square pre-machined block. Bore (or face-machine) the soft jaws against the slug to the part's clamp surface profile.
4. **Tombstone HMC work:** face-flat tolerance of each tombstone face must be ≤0.0005″ across the face. Indicate before bolting fixtures; a 0.002 cocked tombstone face propagates into every Op-3+ on that pallet.

**Material choice for soft jaws:**

- **1018 cold-rolled steel** — default. Cuts easily, holds finish, lasts ~50-200 re-borings.
- **6061-T6** — when the part is also aluminum (avoids galvanic / coolant interaction) or when you need to soft-clamp a delicate finish without marring.
- **Brass / acetal** — for finished part surfaces where any steel mark is unacceptable (e.g. polished optics housings, hard-anodized parts post-finish).
- **NEVER use hardened steel as soft jaws** — defeats the purpose; the chuck wedges and the jaw step face will gall and chatter under boring.

**Failure modes:**

1. **Boring jaws against air (no slug)** → 0.001-0.003″ TIR on every part loaded. Operator blames the chuck; it's the cycle.
2. **Changing torque between bore and run** → bore at 50 ft-lb, run production at 30 ft-lb → jaws don't load to the same position, parts shift ~0.0005-0.001. Use one torque, write it on the chuck.
3. **Re-using jaws bored for a different diameter** → operator opens the jaws wider to fit a larger-than-bored part. The jaw step no longer contacts evenly — the part rocks under clamp force, drops out of round on cut. Always re-bore for each new clamp diameter, OR keep a dedicated jaw set per part family.
4. **Bored too tight** (part won't drop in) → operator hammers the part in → part is now plastically pre-stressed, releases stress on unclamp, finished feature reads out-of-round on the floor plate. Always bore +0.0005-0.001 over part OD; finger-press fit, not press fit.
5. **Coolant flush blocks the seat** — chips trapped under the jaw face during load → the part lifts ~0.0002-0.0005. Blast the jaw faces clean *and* the part clamp surface before every load. Air blow alone misses chips welded in by coolant.

**When NOT to use the soft-jaw cycle:**

- Single-piece prototype where setup time exceeds runtime — use a 4-jaw independent chuck and indicate the part in directly (slower per-load, no jaw prep).
- Parts with thin walls where the jaw clamp force will distort the part itself — use a **collet** (more uniform force) or a **mandrel** (expand from inside) or a **soft-jaw with a relief groove** (clamp on a rib, not the wall).
- Heat-cycled parts (cryo-treated, recently HT'd) — wait for thermal stabilization first or the part dimension drifts during the work.

## Provenance

- Hand-authored canonical entry for the workholding tribal-coverage gap (MACHINING-TRIBAL-COVERAGE/U-MTC03).
- The soft-jaw cycle is universal across precision turning shops; specifics on slug pre-load match Hardinge/Kitagawa/Schunk training literature.
- TIR figures are conservative real-world (0.0005 achievable with care; 0.001 typical first-time setup).
- Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.
- Pickup: `tribal-by-domain-inject.mjs` (UserPromptSubmit) + `wiki-precheck-inject.mjs`. No wiring required.

Cross-refs:
- [[op-order-rough-stress-finish]] — sequencing context for 1st-op → 2nd-op work
- [[reference_tribal_coverage_audit_2026_05_18]] — gap detection
