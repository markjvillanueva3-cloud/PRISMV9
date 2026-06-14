---
title: Mill Work-Holding Reference — vise/zero-point/tombstone/soft-jaw (ratings + calc-feed)
type: reference
domain: mill
tags: [mill, workholding, vise, soft-jaw, zero-point, tombstone, clamping-force, repeatability, distortion, fixturing, calculation-feed]
status: living
created: 2026-06-12
author: slot:bravo
related: [mill-machine-stack-reference, mill-cutting-tool-reference, workholding-practices-locating-clamping-distortion-repeatability, workholding-soft-jaw-cycle, mill-data-contents-inventory]
---

# Mill Work-Holding Reference

> Operator directive 2026-06-12: the comparative-ratings + interactions + **calculation-feed** lens for **work-holding** — the last link in the force loop (tool→holder→spindle→machine→**table→fixture→part**). Grounded in `mcp-server/src/data/workholding-catalog.ts` (real ratable fields) + the existing practice canonical, which this page LINKS not duplicates: [[workholding-practices-locating-clamping-distortion-repeatability]] (3-2-1, clamp-over-support, distortion), [[workholding-soft-jaw-cycle]] (soft-jaw machining cycle).
>
> The fixture is where "is it held hard enough to take this cut without slipping or lifting?" becomes a **calculation** — and the catalog carries the numbers (`clamping_force_kn`, `repeatability_mm`) to make it real.

## Data on hand (cite: `workholding-catalog.ts`)
Sourced from **Orange Vise 2016** (full text) + **REGO-FIX 2026** (image-only). Feeds `WorkholdingEngine`, `FixtureDesignEngine`, `SoftJawProfileEngine`, `ModularFixtureLayoutEngine`, `ClampingSimEngine`, `WorkholdingIntelligenceEngine` (src: `workholding-catalog.ts:10`). Real ratable schema:
- **`ViseSpec`** (`:20`): `jaw_width_mm, max_opening_mm, **clamping_force_kn**, clamping_force_ratio` (force-per-torque, e.g. *"825 lbs per 10 lbs-ft"* `:28`), **`repeatability_mm`**, `type(standard|self_centering|double_station|5axis|single_station)`, `body_material, jaw_interface, features`.
- **`ZeroPointSpec`** (`:38`): `**holding_force_kn**, repeatability_mm, actuation(manual|pneumatic_above|pneumatic_below)`.
- **`TombstoneSpec`** (`:47`): `stations, cross_section_mm, integrated_receivers, receiver_spacing_mm` (4th-axis / HMC).
- **`SoftJawSpec`** (`:61`): `type(machinable|stepped|serrated|vee|extra_wide), fits_vise_width_mm, reversible`.
- **`JawPlateSpec`** (`:70`): `profile, material`.

## §1 — Work-holding TYPE comparison (ratings 1–5, 5=best)
| Type | Holding force | Repeatability | Distortion risk (low=better) | 5-sided access | Setup flexibility | Best for |
|------|---------------|---------------|------------------------------|----------------|--------------------|----------|
| **Standard vise** | 4 (`clamping_force_kn`) | 4 (`repeatability_mm`) | 3 (point clamp can bow long parts) | 2 (jaws block sides) | 4 | prismatic stock, the JM default |
| **Self-centering vise** | 4 | 5 (centers on a datum) | 3 | 2 | 3 | symmetric parts, dual-side ops |
| **5-axis vise** (`type:"5axis"`) | 3 (small footprint) | 4 | 2 | **5 (low-profile, tilt clearance)** | 3 | 5-axis on the M460V — minimal jaw obstruction |
| **Double-station vise** | 4 | 4 | 3 | 2 | 5 (2 parts/setup) | production throughput |
| **Soft jaws** (machinable) | 4 | **5 (machined to the part)** | **5 (full-form support, no point load)** | 2 | 4 | second-op, fragile/odd shapes — see [[workholding-soft-jaw-cycle]] |
| **Zero-point** (`ZeroPointSpec`) | 4 (`holding_force_kn`) | **5 (≈ few µm)** | 2 | 4 | **5 (palletized swap)** | repeat setups, fast changeover |
| **Tombstone** | 4 | 4 | 3 | 4 (4 faces) | 5 (many parts) | HMC / 4th-axis volume |
| **Step clamps / strap** | 3 (localized) | 2 | 4 | 5 (open table) | 5 | large/odd parts a vise can't hold |
| **Vacuum** | 2 (area-limited) | 3 | **5 (no point load)** | 5 | 3 | thin/flat non-ferrous, sheet |
| **Magnetic** | 3 | 3 | 4 | 5 | 4 | flat ferrous, grinding-style holding |

(Ratings *(eng.)*; the force/repeatability columns are real catalog fields — query `workholding-catalog.ts` for a specific model's numbers.)

## §2 — INTERACTIONS
| Couples to | Effect |
|------------|--------|
| **The part** | Thin-wall / hollow → clamp force distorts it (it springs back after release → out-of-tolerance). Use soft jaws / full-form support / lower force. Clamp **over** a supported point, never over a span. ([[workholding-practices-locating-clamping-distortion-repeatability]]) |
| **The table** | The fixture's clamp force is reacted by the table T-slots — exceeding their rating lifts the fixture. Tombstone/zero-point spread load; a single strap concentrates it. |
| **Cutting forces** | The cut tries to **slide** the part (radial) and **lift** it (climb mill upward, high-helix axial). Holding force + friction must beat both with margin — this is the §4 calc. |
| **Toolpath** | Where the tool can reach is gated by the jaws — a vise blocks the sides; a tombstone/clamp opens them. 5-axis tilt needs a low-profile fixture (5-axis vise/zero-point) to clear. |
| **Operation order** | Rough (high force) before the part loses rigidity; finish after stress relief. The fixture must hold through the *highest-force* op in the setup. ([[operation-ordering-sequencing-roughing-finishing-datums]]) |

## §3 — Feeds the calculations (the operator's intent)
- **`clamping_force_kn` vs the cutting-force vector** → a real **hold-down check**: friction (µ·N) + jaw form must exceed the cut's sliding + lifting force with a safety factor, else the part slips/lifts (scrap or crash). `ClampingSimEngine` is the consumer; the catalog supplies N.
- **`clamping_force_ratio`** (force-per-torque) → the operator's torque-wrench setting that actually delivers the needed N (e.g. "825 lbs per 10 lbs-ft" `:28`) — turns a force requirement into a shop instruction.
- **`repeatability_mm`** → the **datum-repeatability term** in the tolerance stack — a 0.01 mm vise repeatability eats into a 0.02 mm true-position budget.
- **Clamp force vs part stiffness** → a **distortion** prediction for thin-wall (how much the part bows under clamp, springs back after release).
- **Jaw geometry vs toolpath** → an **accessibility/collision** pre-check (will the tool hit the jaws on this pass).

Doctrine: a speed/feed calc that maximizes MRR is wrong if the fixture can't hold the resulting force — the work-holding force budget is a **constraint on the cut**, and the catalog's `clamping_force_kn` is how PRISM learns that constraint instead of assuming "the part is held perfectly."

## §4 — JM Die fleet mapping
- **VMC-02 Okuma M460V-5AX** → low-profile 5-axis vise or zero-point (jaw clearance for tilt); the M460V trunnion plus a tall standard vise collides on steep angles. *(eng.)*
- **VMC-01/03/04 (3-axis)** → standard / double-station vise + soft jaws for second ops; step clamps for plate/odd stock.

## Shop-floor tips (tribal)
- Clamp force is a **budget, not a maximum** — more is not better on a thin part; it distorts then springs back out of tolerance. (src: `workholding-catalog.ts` + [[workholding-practices-locating-clamping-distortion-repeatability]])
- The cut tries to **lift** the part in a climb mill — check hold-DOWN, not just side-grip. *(eng.)*
- Soft jaws machined to the part give full-form support + the best repeatability for second ops. ([[workholding-soft-jaw-cycle]])
- Use the vise's `clamping_force_ratio` to set the torque wrench — guessing the handle force guesses the hold. (src: `workholding-catalog.ts:28`)
- Zero-point/pallet systems repeat to a few µm — the fast-changeover answer for repeat jobs. (src: `ZeroPointSpec`)

## Source data (cite)
`workholding-catalog.ts` (ViseSpec/ZeroPointSpec/TombstoneSpec/SoftJawSpec/JawPlateSpec; Orange Vise 2016 + REGO-FIX 2026). Practice canonical: [[workholding-practices-locating-clamping-distortion-repeatability]], [[workholding-soft-jaw-cycle]]. Consumer engines: `ClampingSimEngine`, `WorkholdingEngine`, `FixtureDesignEngine`. Stack siblings: [[mill-machine-stack-reference]], [[mill-cutting-tool-reference]]. Full surface: [[mill-data-contents-inventory]].
