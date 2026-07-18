---
schema: ideablock-v1
title: "Operation ordering — rough, stress-relieve, semi-finish, finish"
domain: "Machining"
category: "operation-ordering"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-b23a56ef:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T19:15:00Z
tags: [op-order, sequencing, stress-relief, roughing, finishing, mill, lathe, hardened, prismatic-parts]
---

## Question

Why do precision parts crab, bow, or move off-tolerance *after* finish machining even though the cuts were clean and the toolpath was correct?

## Answer

Almost always because the part was machined **rough → finish** with no stress-relief stop between them. Hogging out material releases the residual stresses the supplier rolled / forged / cast into the stock. The part doesn't move while the chips are still attached — it moves *after* — and if your finish pass already ran, the movement comes out of your tolerance budget.

**The four-stage rule for any part where tolerance matters or where stock removal exceeds ~40% of starting volume:**

| Stage | Stock left | Spindle / IPM | Coolant | What it's doing |
|---|---|---|---|---|
| 1 — **Rough** | leave +0.030″ all around (mill) / +0.040″ dia (turn) | full hog: HSM trochoidal, deep ADoC, low RDoC | flood | bulk removal, accept moderate surface finish |
| 2 — **Stress relieve** | (no metal touched) | OFF — clamp loose or off entirely | OFF | give the part 20-60 min to crab. Re-indicate before stage 3 |
| 3 — **Semi-finish** | leave +0.005-0.010″ | conservative speeds, sharp tool | flood | clean up the post-stress shape; re-establish geometry |
| 4 — **Finish** | to size | high SFM, low chipload (or wiper insert on lathe), single direction | flood / MQL | hit the final number |

The cost is one extra setup-rest cycle. The benefit is parts that hold ±.0005 instead of ±.002.

**Material-specific stress-relief windows (rule-of-thumb, after rough):**

- **4140PH, 4340PH, 17-4PH H1150**: 30-60 min at room temp. These are the most predictable — the supplier already heat-relieved them, the residual is mostly machining-induced.
- **Hot-rolled 1018 / 1045 / A36 plate**: 60-120 min, or move the part to a different fixture between stages. HR mill scale hides huge residuals; a 6×6×1″ HR plate can bow .015″ over its length after one face is hogged off.
- **6061-T6 / 7075-T651 plate**: 20-30 min. Aluminum moves fast and stops fast. If the part has a thin web or thin wall (<0.080″) under a thick boss, the wall *will* bow when the boss is roughed.
- **A2 / D2 / S7 in annealed state**: 30 min minimum. These move on you if you don't.
- **Cast iron**: 10-20 min. Stable, but cast skin pulls one direction and the core another — surface the casting on one face, flip, then sequence.
- **Hardened steel (post-HT, ≥48 HRC)**: stage 2 not needed for stress (already relieved by HT) — but stage 2 IS needed to take grinding stock down to your finish bar. Different reason, same rule.

**Failure modes if you skip stage 2:**

1. **Crabbing on plate work.** Hog one side, flip, hog the other side, finish — the part comes off flat on the cut side and bowed on the unmachined side. Surface plate check shows .005-.015″ over a 6″ length on a part that was "machined flat."
2. **Bore taper after finish bore.** Bore .500″ ID on a plate after roughing the OD pocket — bore measures .5000 at top, .4995 at bottom. The pocket walls relaxed inward and pushed the bore closed below the top surface.
3. **Concentricity drift on shaft work.** Turn shaft OD rough, finish the same side without flip — Op 2 (between centers or on chuck-and-tail) reads .002 TIR where Op 1 was .0005. The shaft uncoiled itself.
4. **Tap engagement loss.** Tap a .250-20 hole adjacent to a hog-out pocket. With no stress relief between, the tapped hole closes ~.001 (or opens, depending on side) and the bolt drags or the threads feel "soft."

**When you can skip stage 2 (the honest exceptions, not laziness):**

- Stock-to-part volume ratio < 1.5× (you're not hogging significant material).
- Part is fully supported and bolted continuously to a known-flat plate or tombstone face during *both* rough and finish.
- Tolerance is loose: ±.005 or worse, surface finish ≥125 Ra.
- Single-setup parts < 1″ in any direction (small enough that residual stress moments are negligible).

**Heat-treat sequencing variant of the rule:**

For parts that get heat treated, the order is **rough → HT → grind/finish** — NEVER finish-machine-then-heat-treat for any feature that must hold tolerance. HT moves the part. Grind / EDM the post-HT features; leave them oversized before HT by:

- **Bores**: leave +0.005-0.010 dia for post-HT ID grinding
- **OD on shafts**: leave +0.005-0.008 dia for cylindrical grind
- **Slots / keyways**: leave +0.003 each wall for surface grind (or wire EDM after HT)
- **Tapped holes**: ALWAYS tap before HT for A2/D2/H13 — tap drill survives HT fine; tapping post-HT in 60+ HRC steel is a wear-the-tap-in-3-holes experience

**Drill-before-bore corollary** (sub-rule inside stage 1):

When a finished bore is required, the operation sequence is **center drill → pilot drill → drill → rough bore (or boring bar) → semi-finish bore → finish bore (or ream)**. Going straight from drill to finish bore leaves a triangular hole — the drill wanders and the boring bar follows the wander on the first pass. Always rough bore first to round out the drill's lobed entrance, then finish on a known-round wall.

For reamed holes: pre-drill 0.010-0.020″ undersize of nominal. Reamer is a sizing tool, not a cutting tool — it expects round, straight, undersize geometry going in.

## Provenance

- Hand-authored canonical entry for PRISM tribal coverage gap (MACHINING-TRIBAL-COVERAGE/U-MTC02).
- The four-stage rule and stress-relief windows are standard shop floor practice across mold, die, aerospace, and precision job shop work. Material windows are conservative for first-time setup; an experienced operator on a known part may compress the stage-2 wait to 10-20 min for non-critical features.
- Heat-treat sequencing rules cited match standard tool-and-die practice (e.g. Moldmaking Technology, AISI / SAE coolant handling, Society of Manufacturing Engineers training).
- Lifecycle: Current. Re-validate against shop-floor outcome ledger every 90 days.
- Pickup: `tribal-by-domain-inject.mjs` (UserPromptSubmit, slot-domain-aware) + `wiki-precheck-inject.mjs` (BM25 over leaf-index). No additional wiring required.

Cross-refs:
- [[reference_tribal_coverage_audit_2026_05_18]] — the META audit that surfaced this gap
- [[reference_tribal_by_domain_inject]] — the consumer hook
