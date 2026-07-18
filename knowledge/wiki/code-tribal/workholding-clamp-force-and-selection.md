---
schema: ideablock-v1
title: "Clamp force budgeting — how much grip, what holder, when to switch"
domain: "Workholding"
category: workholding
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-20-hotel
sources:
  - Machinery's Handbook 31e §Workholding + §Clamping Forces
  - Sandvik Coromant — Workholding application guide
  - Jergens / Mitee-Bite / Carr Lane — engineering catalogs
  - ISO 16156 (chuck safety) + ANSI B11.6 (lathe safety)
  - 4245-tribal corpus workholding subset (n=426)
extracted_via: human-authored
extracted_at: 2026-05-21T02:45:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-WORKHOLD-CLAMP-FORCE)
---

## Question

How much clamp force do I actually need, what holder do I use to get it, and when do I switch holders?

## Answer (canonical — force budget + selection criteria)

### The force budget (the load-bearing math)

Required clamp force `F_req` must hold the part against **cutting force + safety factor**, not against gravity alone:

```
F_req = (F_cut × SF) / μ_grip
```

| Symbol | Meaning | Typical value |
|---|---|---|
| `F_cut` | Resultant cutting force at deepest engagement (Kienzle: `F = kc × A_chip`) | 100–5000 N for typical milling |
| `SF` | Safety factor | 2.0 for steady cuts · 2.5 for interrupted · 3.0+ for impact / hard turning |
| `μ_grip` | Coefficient of friction at jaw-to-part interface | 0.10 smooth · 0.15 serrated · 0.25 carbide-grit · 0.40 with pull-stud / dowel |

**Worked example — 40 mm endmill, 4 mm DOC, 6061-T6, full slot:**
- `F_cut ≈ kc × A_chip = 800 N/mm² × (4 × 0.10) = 320 N`
- `SF = 2.5` (full slot = interrupted at corners)
- `μ_grip = 0.15` (standard serrated vise jaw)
- `F_req = (320 × 2.5) / 0.15 = 5333 N ≈ 5.3 kN` clamp force

A 6" Kurt vise at 70 ft-lb generates ~22 kN — comfortable margin. The same cut on a 4" sub-plate with a 4-clamp toe-strap setup at 5 kN each = **only 20 kN distributed across 4 contact points = 5 kN each, marginal**. The vise wins; the plate needs 6 clamps or harder jaws.

### Selection by force-density tier

| Holder type | Force range (typical) | When it's the right tool | When it's the wrong tool |
|---|---|---|---|
| **Toe clamps + step blocks** (universal) | 2–10 kN per clamp | Big parts on a table, prototyping, fixturing-while-figuring-it-out | Production volume — slow setup, easy to over/under-torque |
| **Mechanical vise** (Kurt, Chick, Glacern) | 20–45 kN | Block stock, sub-plate work, rectangular parts | Round parts (use a V-block), thin sheet (vise crushes), parts > vise opening |
| **Hydraulic vise** | 50–80 kN | Production blocks where setup is repeatable, hard materials | Hard for one-offs (priming, oil, time to break down) |
| **3-jaw chuck** | 30–60 kN total | Round bar, lathe work, mill with rotary | Thin-wall tubes (distortion), non-cylindrical |
| **6-jaw chuck** | 40–80 kN total | Thin-wall tubes, irregular cylindrical parts | Solid round stock (no benefit over 3-jaw) |
| **Soft jaws (custom-cut)** | 15–40 kN | Pre-machined / cast / forged parts where shape isn't round-stock; tight repeatability | Raw stock (waste of jaw life) |
| **Magnetic chuck (electro / electroperm)** | 80–150 N/cm² × area | Flat steel/cast-iron with large contact area; grinding | Aluminum, brass, titanium (non-ferrous = useless), high-side-load |
| **Vacuum chuck** | 50–80 kPa × area | Thin sheet, non-magnetic flat parts, light cuts | Heavy MRR (no friction backup if vacuum drops), porous materials |
| **Fixture plate + dowel + screw** | Limited by screw torque | Production repeat, multi-part nest, pallet system | Low-volume one-offs (setup cost > benefit) |
| **Tombstone (4-side production)** | Per-side vise/clamp budget | High-volume / multi-setup parts on HMC | Single-part / single-setup |
| **3D-printed soft fixture (PLA / nylon)** | 1–5 kN | Light finishing on already-roughed parts, fragile castings, optics | Roughing, anything > 2 kN cutting force |

### The 80 % rule (rule of thumb from the floor)

If `F_cut × SF > 0.5 × F_holder_max`, you've **outgrown the holder**. The other 50 % is buffer for:
- Chip lifting under flood coolant (~10 % force loss when chips raise the part)
- Heat-induced jaw expansion losing pre-load (~15 % over a 30-min cut)
- Pull-out moment on tall parts (moment arm × cutting force)
- Repeat-clamp drift (each clamp cycle drops 2–5 % of initial pre-load)

Switch to the next tier *before* the failure, not after. The audit trail of "we clamped fine until the third part" is always a pre-load decay story.

### Distortion budget (forgotten by 80 % of operators)

Clamp force that holds the part also **deforms it**. For finish operations:

| Part type | Max allowable strain at clamp | Holder choice |
|---|---|---|
| Thin-wall tubing (L/D > 5, t < 3 mm) | 0.02 % | Expanding mandrel, 6-jaw chuck, soft jaws contoured to ID |
| Thin plate (t < 5 mm, area > 100 cm²) | 0.05 % | Vacuum chuck, magnetic chuck with low-pressure setting, or compliant fixture |
| Cast / brittle material (cast iron, ceramic-loaded composite) | 0.05 % (catastrophic above) | Soft jaws with contact pads, fixture plate with bolted pads |
| Pre-machined precision part (e.g. for re-op) | 0.005 % (re-machining tolerance) | Indicate-and-clamp on the original datum frame, hold by features not stock |
| Solid block (steel, aluminum, brass) | Up to 0.2 % (you'll never see it) | Anything that gets enough force |

If holding force compresses the part enough to violate tolerance after release, **you're holding wrong** — distortion-induced springback is the silent finish-killer. The fix is force-budget *down* + contact-area *up* (more surface = same force = less PSI = less local strain).

### When to switch (the canonical triggers)

1. **Cutting force jumped > 40 %** between rough and finish on the same setup → re-evaluate; finish probably doesn't need the rough holder's grip but does need its repeatability.
2. **Part geometry changed** (e.g. you machined off the side the vise was gripping) → re-datum and re-fixture *before* the next op (see [[operation-ordering-datum-sequencing]] re-datum exception 3).
3. **Vise opening's max grip < part width × 0.6** → too short a grip = pull-out risk. Either use a sub-plate or step up to a larger vise.
4. **Cutting impact / interrupted cut** (slotting, broken-surface milling, off-center hard turning) → bump `SF` to 3.0 and recompute; soft-jaw or specialized fixture often beats the standard vise.
5. **Holder's contact patch overlaps a finished feature** → switch to soft jaws or a feature-specific fixture. Clamping on a finished surface is dimensional suicide.

### Anti-patterns from the floor

- **"Crank the vise tighter to fix part shift."** Past nominal torque you're now warping the part *and* the vise body — neither will be square afterward. If shift recurs at nominal torque, you have a chip-evac / surface-finish / clamping-strategy problem, not a force problem.
- **"One holder for the whole job."** Setup 1 might want a vise (raw block), setup 2 wants soft jaws (now-precision part), setup 3 wants vacuum (thin finished side). Plan the holder *per setup* in the process plan, not once for the whole part.
- **"Magnets work on everything."** No — only on ferrous parts with > 60 % steel-by-volume in the contact plane. Aluminum, brass, titanium, austenitic stainless are immune. Inconel 718 is barely-ferrous (relative permeability ~1.001) — it will not hold reliably under cutting force.
- **"Vacuum chuck for steel."** It works, but you've now made cutting force a function of seal integrity. One nick in the gasket and the part flies. Vacuum is for parts where mass × g is most of the holding requirement, not parts where `F_cut >> mass × g`.

### Calculation shortcut for safety review

A single screen-friendly check the operator can do in 30 s before pressing cycle-start:

```
1. Look up kc for material+iso group  (table or prism_calc:material_get)
2. Estimate F_cut = kc × DOC × feed-per-tooth × engaged-teeth
3. F_req = F_cut × 2.5 / 0.15        (safety factor 2.5, vise-jaw friction)
4. Look up holder rated grip force from catalog or vise spec
5. If F_req > 0.5 × F_holder_max → STOP, upgrade holder or reduce DOC
```

This is what `prism_calc:clamping_force_calc` does (and what `prism_calc:fixture_clamp_force` and `prism_calc:workholding_force` cross-check against). If you have the dispatcher, use it — it carries the canonical kc values from `physics/constants.ts`. Don't inline a kc estimate; the table is more accurate than memory.

### Tie-ins to operation-ordering

- The **3-2-1 datum frame** (see [[operation-ordering-datum-sequencing]]) defines *where* the holder contacts the part. Contact points must coincide with the datum surfaces; never clamp on a finished feature.
- **Rough → finish** transitions (see [[operation-ordering-rough-finish-sandwich]]) often demand a holder swap: roughing holder = max grip, finishing holder = repeatable+low-distortion. Same holder rarely satisfies both.
- **Re-datum exception 4** (soft-jaw transfer) requires reconciling the new holder's coordinate frame with the original WCS — never inherit a G54 across a holder change without re-probing.

## Provenance

Distilled from the 426 workholding tips in the 4245-tribal corpus + Machinery's Handbook 31e §Workholding + Sandvik Coromant + Jergens / Mitee-Bite / Carr Lane engineering catalogs + ISO 16156 + ANSI B11.6. Authored 2026-05-21 by slot:hotel under U-WIKI-WORKHOLD-CLAMP-FORCE — first canonical workholding entry in the wiki+tribal high-ROI pivot, after the operation-ordering triad ([[operation-ordering-hole-sequence]] · [[operation-ordering-datum-sequencing]] · [[operation-ordering-rough-finish-sandwich]]).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `workhold`, `clamp`, `vise`, `chuck`, `fixture`, `vacuum`, `magnetic`, `soft jaw`, `tombstone`, `grip`, `pull-out`, `holding force`, `distortion` keywords. Zero wiring required.

## Cross-references

- [[operation-ordering-datum-sequencing]] — contact points must coincide with datum surfaces; never clamp on a finished feature
- [[operation-ordering-rough-finish-sandwich]] — rough vs finish holder swap rule
- [[operation-ordering-hole-sequence]] — hole-making sequence is the highest-frequency consumer of correctly-held parts
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit ranking workholding as 4.9 % second-weakest category
- [[feedback_do_optional_high_roi_work]] — standing rule honored
