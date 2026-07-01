---
schema: ideablock-v1
title: "Multi-setup planning — counting setups, ordering them, transferring tolerance between them"
domain: "Part setup"
category: part-setup
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Multi-Setup Machining + §Tolerance Stack-Up
  - Sandvik Coromant — Application guide §Process planning
  - ASME Y14.5-2018 §4 datums + §6 tolerance zone interpretation
  - Schmid & Kalpakjian — Manufacturing Engineering, ch. on process planning
  - 4245-tribal corpus part-setup subset (n=421)
extracted_via: human-authored
extracted_at: 2026-05-21T03:10:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-PARTSETUP-MULTI-OP)
---

## Question

How many setups does this part need, in what order, and how does tolerance survive the jumps between them?

## Answer (canonical — minimize setups, maximize tolerance survival)

### Setup-count law

**Every setup transition leaks 0.005–0.030 mm of position tolerance.** This is the irreducible repeatability of (a) un-clamp, (b) move part, (c) re-clamp, (d) re-zero. Tighter machines + soft jaws + pallets push it toward 0.005; vise + indicator + manual touch pushes it toward 0.030.

```
setup_count = max(
   ceil(machinable_features_count / features_per_setup),
   tool_access_required_orientations,
   workholding_re-clamp_required
)
```

The minimum-setup answer is rarely 1 (very few parts have all features reachable from one orientation). The maximum is "however many it takes for a vertical mill with hard jaws", which is usually 2× what a 4-axis or 5-axis would need.

**Rule of thumb (the floor's verdict):**
| Machine | Typical setup count for a "normal" prismatic part |
|---|---|
| 3-axis VMC + vise | 4–6 (one per face) |
| 3-axis VMC + tombstone | 1–2 (vertical features ganged) |
| 4-axis HMC | 2–3 (1 per non-trunnion side) |
| 5-axis trunnion | 1–2 (one setup for most, one if part has both ends featured) |
| 5-axis with bar feed | 1 (mill-turn complete) |
| Mill-turn lathe | 1–2 (one main + sub-spindle hand-off) |

If your setup count exceeds the rule-of-thumb by > 50 %, you're either machining a genuinely weird shape OR mis-planning. Re-check feature-orientation grouping before accepting the higher count.

### How to count: feature-orientation grouping

1. **List every feature** with its dimensional/positional dependencies (Y14.5 datum frame). Sample row: `bore_A1 | dia 25H7 | datum frame A|B|C | finish 0.8 Ra | tolerance class M`.
2. **Group by feature normal vector** — features whose tool axis approach is the same can share a setup.
3. **Constrain by datum-frame compatibility** — features sharing datum frame A|B|C must be cut after A, B, C are established. Cutting them out-of-order injects setup-transition-tolerance into their position.
4. **Constrain by stiffness** — a thin-wall feature can't be finished while the rough-side workholding presses the same wall (see [[workholding-clamp-force-and-selection]] distortion budget).
5. **Constrain by access** — pockets deeper than 4× endmill flute-length need a different tool from the same setup, OR a different setup with a longer-reach machine.

The group count = the setup count, minus the savings you get from a 4th or 5th axis. The orientation grouping is *first*; machine selection is *second*.

### Setup-sequence ordering — first to last

Once you have N setups, the order matters as much as the count. The canonical rule:

```
Setup 1 = the one that establishes the most-referenced datum frame
Setup 2..N = ordered by datum-dependency chain
```

In practice:
1. **Setup 1 cuts datum A + B + C from raw stock.** Even if those datums aren't the largest features, they must exist before any toleranced feature can reference them (see [[operation-ordering-datum-sequencing]]).
2. **Setup 2 takes the cut datum frame as locating surfaces** (parallel block + fixed jaw + dowel/hard-stop), then cuts everything that references A|B|C and is reachable from a different orientation.
3. **Setup 3+ progressively cut features whose datum-frame references are now-machined surfaces from setup 1 or 2.** Each setup gains *more* repeatability because each setup gets more flat-machined references.
4. **Heat treat / stress relief, if needed, goes between setups N-1 and N** — not at the very end. The final-finish setup re-references post-HT geometry, so it cleans up HT-induced drift.

**Anti-pattern**: finishing the bore (toleranced 25 H7) in setup 2 when datum-A face won't be machined until setup 3. The bore's position is now measured from raw-stock A — non-deterministic. Re-sequence so A is cut in setup 1.

### Tolerance transfer between setups (the budget calculation)

Each setup transition consumes part of the tolerance budget. A useful conservative estimate:

```
σ_transition = 0.015 mm (typical, vise + soft jaws + careful indicator)
σ_transition = 0.005 mm (pallet + dowel + 5-axis trunnion)
σ_transition = 0.030 mm (vise + hard jaws + manual edge-find)
```

For a feature with tolerance ±T whose final position depends on N transitions:

```
σ_required ≤ T / (3 × sqrt(N))     (RSS budget at 3σ — half the print spec on each side)
```

Worked example:
- Bore 25H7 (tolerance +0.021 / -0 mm, so half-spec ≈ 0.010 mm)
- Cut in setup 3 of 3 (2 transitions before it)
- `σ_required ≤ 0.010 / (3 × √2) = 0.0024 mm` per transition
- Available `σ_transition`: 0.015 (vise) >> 0.0024 → **FAIL the budget**

The fix is one of:
- Cut the bore in setup 1 (no transitions before it)
- Switch holders to pallet+dowel (`σ_transition` ≈ 0.005, still fails for a 3-setup chain but passes for 2)
- Add an in-process probe to re-zero before the bore (collapses N→1 effective transitions)
- Loosen the bore tolerance (engineering negotiation)
- Switch to a 5-axis 1-setup plan (`N = 0`, σ_required irrelevant)

This calculation is what `prism_quality:tolerance_stack` does for the *dimensional* side; the multi-setup side is the operator's call. If you can't make the budget work, the print's tolerance + the shop's holders + the setup count are inconsistent — *change one of those three*, don't pray it works.

### Setup-sheet structure (what every setup should document)

Each setup gets a one-page sheet. Minimum content per setup:
- **Setup number + part orientation** (sketch or photo)
- **Workholding spec** — exact holder, jaw type, torque, contact points
- **WCS assignment** (G54 / G55 / G56 / G57 — one per setup)
- **Zero method** — edge find vs probe vs indicate, with the reference feature named
- **Tool list** for this setup only (with magazine slots, lengths, holder type)
- **Operation list** — ordered, with cycle time estimate
- **Critical-dimension call-outs** — which features cut here that are on the print's CTQ list
- **Inspection plan** — what to measure before next setup (CMM, mic, in-process probe)
- **Transition spec** — how the part leaves this setup and enters the next

A setup sheet's value is at the *handoff*, not during the cut. The night-shift operator who has never seen the part should be able to set up from the sheet alone. If your sheet leaves any of the above implicit, the next setup will inherit a "we always knew it" assumption that is one operator-rotation away from a scrap pile.

### When to re-zero vs trust the WCS

Each setup has its own G5x. The temptation to skip re-zeroing because "the dowel will repeat" is the silent source of setup-2 drift.

```
Re-zero IF:
  - Holder changed (vise → soft jaw → fixture plate → pallet)
  - Datum frame changed (different reference surfaces used than last cycle)
  - Machine sat > 4 h since last setup (thermal drift on column / spindle)
  - Last cycle produced ANY part outside ±50 % of tolerance
  - First piece of a new lot (always)
  - Tool that establishes WCS was changed or re-presetting

Trust WCS IF:
  - Pallet + dowel system with proven repeatability < 0.005 mm
  - Same workholding, same fixture, same machine, within 4 h, same lot
  - Probe-cycle verification at cycle-start passes (< 0.01 mm to nominal)
```

### Anti-patterns from the floor

- **"Setup 3 will fix what setup 2 cut wrong."** It can't. The downstream setup inherits the upstream error and adds its own. Setup 2's mistakes are setup 2's responsibility — re-set or scrap before continuing.

- **"One WCS for the whole part."** When the part has more than one orientation, you need a WCS per orientation. Reusing G54 across setups is a recipe for axis-direction sign-error on the third setup (the day-shift operator confuses + and − Z, and a 0.5 mm crash follows).

- **"Skip the setup sheet for prototypes."** The prototype is exactly when the setup sheet is most useful — it's the moment you write down what the future production sheet will say. Skipping it forces a re-discovery the second time the part is run, costing more than the sheet would have.

- **"Setup ordering can wait until we cut."** No — ordering decides which features get the tight tolerance and which absorb drift. Pre-cut planning costs nothing; post-cut re-ordering costs scrap.

- **"We always do faces first."** Sometimes. Sometimes the hole-pair that locates everything must be cut first because every face-mill pass references it. The rule isn't "faces first" — it's "datum frame first" (per [[operation-ordering-datum-sequencing]]).

### Tie-ins

- [[workholding-clamp-force-and-selection]] — per-setup holder selection drives per-setup `σ_transition`
- [[workholding-locators-and-soft-jaws]] — locator scheme defines what repeats across setups
- [[operation-ordering-datum-sequencing]] — setup 1 cuts the datum frame; this rule fixes the sequence
- [[operation-ordering-rough-finish-sandwich]] — stress relief goes between setup N-1 and setup N, not at the end
- [[operation-ordering-hole-sequence]] — drilled-hole pairs are the most common cross-setup locators

## Provenance

Distilled from the 421 part-setup tips in the 4245-tribal corpus + Machinery's Handbook 31e §Multi-Setup Machining + Sandvik §Process planning + ASME Y14.5-2018 + Schmid & Kalpakjian. Authored 2026-05-21 by slot:hotel under U-WIKI-PARTSETUP-MULTI-OP — first canonical part-setup entry of the wiki+tribal high-ROI pivot, completing one foundational entry in each of the three weakest categories (operation-ordering, workholding, part-setup).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `setup`, `multi-setup`, `setup count`, `WCS`, `G54`, `G55`, `pallet`, `tombstone`, `re-zero`, `setup sheet`, `tolerance stack`, `process plan` keywords. Zero wiring required.

## Cross-references

- [[workholding-clamp-force-and-selection]] — per-setup holder + force budget
- [[workholding-locators-and-soft-jaws]] — per-setup locator design + repeatability
- [[operation-ordering-datum-sequencing]] — setup-1 datum-cut order
- [[operation-ordering-rough-finish-sandwich]] — stress-relief placement in the setup sequence
- [[operation-ordering-hole-sequence]] — hole-pair pickups as cross-setup locators
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit ranking part-setup as 5.1 % third-weakest
- [[feedback_do_optional_high_roi_work]] — standing rule honored
