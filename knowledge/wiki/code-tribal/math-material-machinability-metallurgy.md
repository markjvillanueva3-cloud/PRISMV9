---
schema: ideablock-v1
title: "Material machinability & metallurgy — ratings, hardness, heat-treat condition, work-hardening"
domain: "Materials for machining"
category: manufacturing-math
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - ASM Handbook Vol. 16 — Machining
  - Boothroyd & Knight "Fundamentals of Machining" — machinability
  - Trent & Wright "Metal Cutting" — material effects on tool wear
  - Machinery's Handbook 31e — machinability ratings, materials
  - ISO 513 — workpiece material groups (P/M/K/N/S/H)
---

## Question

What makes one material easy and another a nightmare to cut — the machinability
rating, the hardness relationship, how heat-treat condition changes the cut,
and the metallurgy behind every speed/feed decision.

## Answer (canonical — material condition is the input to every cutting parameter)

### 1. The machinability rating — a relative convention

Machinability is rated **relative to a baseline** — AISI 1212 free-machining
steel = 100 %:
```
free-machining brass   ~ 300 %       AISI 1018          ~ 65–70 %
AISI 1212 (baseline)     100 %       304 stainless      ~ 45 %
                                     Ti-6Al-4V          ~ 20 %
                                     Inconel 718        ~ 10–15 %
```
The rating is set mainly by **tool life at a reference cutting speed**, with
finish, force and chip form as secondary factors. It is a *convention*, not a
single physical quantity — always treat it as a planning guide, not a formula
input. (Canonical cutting constants — Kienzle `kc1.1`, Taylor `C/n` per ISO
group — live in `src/physics/constants.ts`; never inline them.)

### 2. What actually governs machinability

Five physical levers, often in tension:
```
hardness / strength     → cutting force and abrasive tool wear rise
ductility               → too low: brittle, chips well; too high: gummy, BUE,
                          stringy chips, poor finish
thermal conductivity k  → low k keeps heat IN the tool (Ti, Ni) → fast wear
work-hardening tendency → the surface hardens ahead of the next pass (§5)
abrasive constituents   → carbides, oxides, silica, sand inclusions saw the edge
```
Plus chemical reactivity at temperature — titanium reacts with almost every
tool material when hot.

### 3. The hardness ↔ machinability relationship

```
harder material → higher specific cutting force kc → more power & deflection
                → more abrasive wear → Taylor C drops → must cut slower
too soft        → ductile/gummy → built-up edge → poor finish, smearing
```
There is a **machinability sweet-spot hardness band** — for steel roughly
200–280 HB (≈ a quenched-and-tempered condition). Above it, force and wear
dominate; below it, the material is gummy. This is why steel is often supplied
pre-hardened to a mid-range condition specifically *to machine it well*.

### 4. Heat-treat condition — the same alloy, different cuts

```
Annealed     — softest; low force but gummy → BUE risk, poor finish
Normalized   — refined uniform grain; good, predictable general machinability
Q&T (quench  — the steel machining sweet spot (~28–34 HRC); strong chips,
 + temper)     clean finish, sane tool life
Through-hard  — > 50 HRC: hard turning/milling with CBN/ceramic, negative rake,
 (>50 HRC)     very low MRR, rigidity- and runout-critical
Case-hardened — soft core + hard skin: machine SOFT, then harden, then
               grind / hard-turn — the hard skin destroys carbide
```
**Never assume a material — always the material *and its condition*.** The
speed/feed for annealed 4140 and Q&T 4140 differ substantially.

### 5. Work-hardening — the failure spiral

The strain-hardening exponent `n` (`σ = K·εⁿ`) is large for **austenitic
stainless, nickel superalloys and Hadfield (Mn) steel**. A tool that rubs,
dwells, or cuts too light **hardens the surface**; the next pass then meets a
harder layer, which makes it rub more — a runaway:
```
rubbing → surface work-hardens → next pass harder → more rubbing → tool fails
```
Rule for these alloys: **never dwell, never rub** — sharp tools, positive
rake, a feed heavy enough to stay *below* the hardened skin, no spring passes
that just burnish.

### 6. Free-machining additives — a deliberate trade

Free-machining grades add **MnS inclusions** (sulfur) that break chips and
lubricate the rake, or **lead/bismuth/tin** that smear-lubricate. They lift
machinability dramatically — but the inclusions are internal discontinuities
that **lower fatigue strength, ductility and weldability**. A free-machining
grade is the wrong choice for a fatigue- or impact-critical part.

### 7. Microstructure effects

- **Steel** — ferrite (soft, gummy) vs pearlite (harder, machines cleaner) vs
  martensite (hard); **spheroidized** carbides machine far better than lamellar
  for high-carbon steels.
- **Cast iron** — graphite morphology decides everything: **gray iron**
  (flake graphite) is self-lubricating and easy; **ductile/nodular iron** is
  tougher and harder to machine.
- Grain size, inclusion content and prior cold work all shift the result.

### 8. The hard-to-machine families

```
Titanium       — low k (heat into tool), chemically reactive when hot, low
                 elastic modulus → springback/chatter, chip-fire risk
Ni superalloys — work-harden hard, retain strength when hot, abrasive carbides
Austenitic SS  — work-harden, gummy, low k
Hardened steel — abrasive + high force; CBN territory
```
Each demands its own regime — Ti at steel speeds burns the tool (and can
ignite); Inconel at "normal" feed work-hardens and stalls.

### 9. Specific cutting energy vs material

The specific cutting force `kc` tracks the material's shear flow strength —
which is exactly why the Kienzle model groups materials by ISO class
(P/M/K/N/S/H) with a `kc1.1` per group. Use the canonical per-group values
from `src/physics/constants.ts`; this entry explains *why* they differ, it
does not restate them.

## Anti-patterns

- **Running titanium / Inconel at steel speeds** — low conductivity dumps the
  heat into the tool; it burns in seconds (and Ti chips can ignite).
- **Dwelling or rubbing in austenitic stainless / Ni alloys** — work-hardens
  the surface into a layer the tool can no longer cut.
- **Machining a case-hardened skin with carbide** — machine soft, then harden,
  then grind/hard-turn; the hard case wrecks the edge.
- **Ignoring heat-treat condition in speed/feed** — annealed vs Q&T of the
  same alloy are different machining problems.
- **A free-machining grade on a fatigue-critical part** — the MnS/Pb
  inclusions that ease cutting are fatigue-crack initiators.
- **Treating the machinability % as a calculation input** — it is a relative
  planning convention, not a physical coefficient.

## Cross-references

- [[math-speed-feed-the-full-physics]] — material + condition set `kc` and Taylor `C/n`; the parameter starting point
- [[math-cutting-mechanics-merchant-oxley]] — shear flow strength → cutting force
- [[math-engineering-mechanics-of-materials]] — the heat-treat ↔ mechanical-property trade-off
- [[math-cutting-fluid-tribology]] — reactivity (titanium) and coolant chemistry choice
- [[math-grinding-abrasive-process]] — abrasivity and hardened-material finishing

## Provenance

Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-MACHINABILITY — a Phase-A
mathematical-depth entry of the operator /goal ("expand wiki to mathematical,
statistical max"). Material and its heat-treat condition are the *input* to
every cutting decision, yet no entry covered machinability/metallurgy
(`cutting-mechanics` covers the shear *process*, `engineering-mechanics` the
elastic response — neither the material's machinability). Confidence 0.95 —
canonical ASM Handbook Vol. 16 / ISO 513.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` +
`tribal-by-domain-inject` auto-surface this on `machinability`, `metallurgy`,
`heat treatment`, `hardness`, `work hardening`, `free machining`,
`microstructure`, `material condition`, `annealed`, `quenched and tempered`,
`case hardened`, `titanium`, `superalloy`, `austenitic stainless` keywords.
Zero new wiring required.
