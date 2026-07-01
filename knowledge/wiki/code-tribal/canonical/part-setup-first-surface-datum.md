---
schema: ideablock-v1
title: "Part setup — the first surface machined becomes the datum for everything after"
domain: "Machining"
category: "part-setup"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-b23a56ef:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T19:21:00Z
tags: [part-setup, datum, probing, edge-finder, dial-indicator, wcs, g54, op-1, reference-surface]
---

## Question

A part holds tolerance on Op 1 but goes out on Op 2 or Op 3. The toolpath is right, the tools are sharp, the workholding is locked. Where does the error come from?

## Answer

The Op-1 reference surface. **The first surface you machine becomes the datum for every later op** — whether the print says so or not, whether the operator thinks of it that way or not. If Op-1 was set up by indicating a casting skin to ±0.005 and you reference Op-2 from a flat that was cut against that crooked Op-1 origin, Op-2 inherits the 0.005 error. Op-3 stacks on Op-2's stack. By Op-4 you've drifted 0.012 from print and you blame "the machine."

**Three rules to break the cascade:**

1. **Op-1's job is to make a clean datum, NOT to be a finished feature.** Even if Op-1 is making a finish face, treat that finish face as a *future reference surface* and hold it tighter than the print calls out by 3-5×. A print that says "0.005 flat" on Op-1 → hold 0.0015 flat. The extra effort is paid back on every later op.
2. **Indicate to a tolerance that matches your tightest downstream feature, not the loosest current one.** Loosest current = print-said-0.005. Tightest downstream = the ±0.0005 bore on Op-3 that references this surface. Indicate to **0.0001 TIR per inch** if downstream needs 0.0005 total. The rule is ~3× tighter than your worst stack.
3. **Re-indicate after every flip / re-clamp / heat-cycle.** A part that crabbed 0.001 in stress relief or shifted 0.0003 on re-clamp invalidates your G54. Re-touch the datum surface before running Op-2 — every time, even when "it shouldn't have moved."

**Indicating-in tolerance tiers (the table I wish someone had handed me on day one):**

| Tightest downstream feature tolerance | Indicate-in target (TIR) | Tool to use |
|---|---|---|
| Loose: ±0.010 or worse | 0.005″ TIR | edge finder + visual inspection |
| Standard: ±0.005 | 0.001″ TIR | edge finder (Starrett-style mechanical) |
| Precision: ±0.002 | 0.0005″ TIR | electronic edge finder OR 3D tool (Haimer) OR machine probe |
| Tight: ±0.001 | 0.0002″ TIR per inch | 0.0001 dial indicator + finger touch OR Renishaw probe |
| Very tight: ±0.0005 | 0.0001″ TIR per inch | 0.00005 test indicator (Mitutoyo / Mahr); probe with calibrated stylus |
| Critical: ±0.0002 or finer | ≤ 0.00005″ TIR per inch | granite-block transfer + indicator OR best-fit probing routine |

**The error-budget rule:** the *sum* of (setup TIR + machine roundness + tool runout + workholding clearance + thermal drift) must be ≤ 1/3 of the tightest tolerance. If any single component exceeds 1/3 the budget, the part will be a coin toss — half pass, half fail, no way to dial it in.

**Tool selection — when each datum-touch tool actually wins:**

- **Mechanical edge finder** (0.200″ tip, Starrett 827 style): fast, $50, ±0.0005 repeatable. Best for: Op-1 on cast / hot-rolled / sawn stock where the surface is rough but you only need to find ~±0.002. Worst for: anything where the surface is glossy / oily / hardened (the tip slips or sticks).
- **Haimer 3D Sensor**: ±0.0002, $300-500. Touches in X, Y, AND Z from one setup. Best for: finished surfaces, side-of-feature touches, soft materials where you can't trust an edge finder kick (aluminum, brass, plastic). Best all-around mill setup tool when you only have one to buy.
- **Renishaw OMP60 / OMP40 (or equivalent machine probe)**: ±0.0001, hands-off, scriptable into the program. Best for: production runs (probe is in the cycle, no operator dial-in per part), casting / forging where you need a best-fit-of-several-points datum, jobs where the part location varies (vise-loaded raw bar stock where each part is a different length).
- **Dial test indicator (0.0001 resolution, Mitutoyo / Federal / Mahr)**: best for tramming vises, indicating shafts in chucks, checking parallel seating. NOT the right tool to find a hard X/Y origin on a flat — use the edge finder or probe for that; use the indicator for *verifying* the touch is real.
- **Wiggler / center finder**: legacy, ±0.0005. Still useful for finding the center of an existing bore by feel. Largely replaced by the Haimer.

**The probe-vs-edge-finder decision tree:**

- Production (>10 parts) → probe in program (amortizes cost; eliminates operator drift)
- Prototype, one-off → edge finder OR Haimer (faster per-touch than scripting a probe routine)
- Rough surface (cast / saw / HR plate) → edge finder is fine; probe will give you a single noisy hit
- Finish surface or finished feature → probe or Haimer (edge finder will skid)
- Bore center finding → probe centerbore routine OR wiggler + Indicate-in (3 quadrants)
- Best-fit datum from N touches → MUST be probe + macro (humans can't average 8 touches in their head)

**Setup-sheet discipline (the cheap habit that prevents 70% of setup-error parts):**

Every part should have a setup sheet that lists, in order:

1. Workholding (vise / chuck / soft jaws — including jaw-bore diameter if applicable)
2. Stock orientation (which face up, which edge to back jaw)
3. Datum touches in order (e.g. "left edge X0", "front edge Y0", "top face Z0", "Z verify in pocket = -0.500")
4. Indicate-to tolerance (e.g. "vise jaws to <0.0002 TIR over 6″; part top face to <0.0005 TIR over 4″")
5. **Sanity check feature** — one in-program probe or indicator touch that should read a known value if setup is right. Catches operator-loaded-wrong-side-up before you cut chips.

The sanity check is the most important line. Example: "After datum touches, machine should report a probed pocket center at X=2.5000±0.0005, Y=1.0000±0.0005. If outside this window, STOP — part is loaded wrong or G54 is wrong."

**Failure modes:**

1. **"It indicated good but the parts are still .002 high"** — operator indicated the *top* of the part instead of the *bottom* clamp surface. The part is sitting on chips or on uneven parallels. Re-blow the parallels, re-seat, re-indicate the seat.
2. **"G54 was right yesterday, parts are out today"** — overnight thermal drift (machine column, granite, fixture). On precision work, indicate the datum *every morning* even if no operator touched the machine. Class-A machines drift 0.0005-0.002 with a 5°C shop temperature swing.
3. **Datum surface inherited from a wandering Op-1** — the Op-1 face is 0.003 out of flat; Op-2 references it; Op-2 reads 0.003 of taper on a "vertical" wall. Fix: hold Op-1 tighter (see rule 1). You can't fix a bad reference by being more careful in Op-2.
4. **WCS origin on a worn/burred corner** — operator touched off X0 on a corner that has a 0.005 burr from saw cut. Every part now has a 0.005 X-shift. File the burr or move the touch to a different edge.
5. **Z-zero on a chip** — sets Z0 with the indicator on top of a stuck chip. First cut is 0.005 deep instead of 0.001. Always blow / wipe the touch-off surface before Z-touching.

## Provenance

- Hand-authored canonical entry for the part-setup tribal-coverage gap (MACHINING-TRIBAL-COVERAGE/U-MTC04).
- Tolerance tiers match common precision shop practice; indicator brand examples are illustrative, not exclusive endorsements.
- Error-budget 1/3 rule is the standard precision-engineering allocation (sometimes called the Bryan / Donaldson rule in machine-tool metrology).
- Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.
- Pickup: `tribal-by-domain-inject.mjs` (UserPromptSubmit) + `wiki-precheck-inject.mjs`. No wiring required.

Cross-refs:
- [[op-order-rough-stress-finish]] — what happens between Op-1 and Op-2 (stress relief)
- [[workholding-soft-jaw-cycle]] — workholding that preserves an Op-1 datum on the 2nd op
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage signal
