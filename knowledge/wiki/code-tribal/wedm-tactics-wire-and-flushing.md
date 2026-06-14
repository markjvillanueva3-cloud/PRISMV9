---
schema: ideablock-v1
title: "Wire-EDM tactics — wire selection, tension, and flushing strategy"
domain: "Wire EDM tactics"
category: wedm-tactics
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Electrical Discharge Machining
  - Sodick / Mitsubishi / Makino WEDM operator manuals
  - Sandvik + Bedra wire-electrode technical data
  - 4245-tribal corpus WEDM subset (~600 tips)
  - WEDM_DIGEST.json (PRISM WEDM domain)
extracted_via: human-authored
extracted_at: 2026-05-21T11:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-WEDM-WIRE-FLUSHING)
---

## Question

Which wire for which job, what tension, and how do I get flushing right — the three things that decide WEDM cut quality + wire-break risk?

## Answer (canonical — wire + tension + flushing are coupled; get all three or none work)

### Wire electrode selection

| Wire type | Composition | Best for | Avoid for |
|---|---|---|---|
| **Plain brass** (CuZn37) | 63 Cu / 37 Zn | General-purpose, the default; good cost/performance | Thick sections > 100 mm, high-speed |
| **Zinc-coated brass** (diffusion-annealed) | Brass core + Zn surface | Higher cut speed (zinc evaporates → flushing aid), better surface | Cost-sensitive jobs where plain brass suffices |
| **Coated/stratified** (e.g. Cu core, brass+zinc layers) | Multi-layer | Maximum speed + thick sections + auto-threading reliability | Budget jobs |
| **Hard brass** | Higher tensile CuZn | Tall parts needing tension stability, taper cuts | Fine-detail work (less conformable) |
| **Molybdenum** | Mo | Re-usable-wire machines (Asian "fast wire"), micro-WEDM | Western single-pass machines |
| **Tungsten / fine wire** | W, 0.02-0.07 mm | Micro-features, tight internal radii | Anything not micro |

**Wire diameter:** standard 0.25 mm (0.010"). Smaller (0.10-0.20 mm) for tight internal corner radii — the minimum internal radius ≈ wire_radius + spark_gap. Larger (0.30-0.33 mm) for thick sections + maximum speed where corner radius is generous.

### Wire tension

Tension trades **accuracy** against **break risk**:

- **Too low** → wire bows under flushing pressure + discharge force → barrel-shaped cut, taper error, poor straightness on tall parts.
- **Too high** → wire fatigues + breaks, especially at the discharge zone where heat weakens it.

Typical tension by section height:

| Part height | Tension (relative) | Reason |
|---|---|---|
| < 25 mm | Low-medium | Short unsupported span; bow is small |
| 25-100 mm | Medium-high | Span bows under flushing; tension counters it |
| > 100 mm | High (hard brass) | Long span; need maximum straightness; plain brass may break — switch to hard brass or coated |

The skim passes (finish passes) run at *higher* tension than the rough pass — the rough pass removes most material at higher break-risk; skim passes prioritize straightness + finish at lower discharge energy where high tension is safe.

### Flushing — the cut-quality decider

Flushing = dielectric fluid forced through the cut to (1) evacuate the eroded debris, (2) cool the wire + workpiece, (3) maintain a stable spark gap. Bad flushing → unstable discharge → wire break + poor finish + DC arcing damage.

| Flushing mode | When | Caveat |
|---|---|---|
| **High-pressure coaxial** (both nozzles flush, top + bottom) | Standard through-cut; part fully submerged or nozzles close to the surfaces | Nozzle standoff must be small (< 0.1 mm ideal) — gap kills pressure |
| **Asymmetric flush** | Part surface uneven, one nozzle can't seal | Reduce speed; the cut is flushing-limited |
| **Submerged-only (low-pressure)** | Thin parts where high-pressure would deflect the part; fragile features | Slower; debris evacuation relies on dielectric circulation |
| **Top-flush only** | Blind features, step changes where bottom nozzle can't reach | Debris falls back into cut — expect slower + worse finish |

**The flushing-limited regime:** when nozzle standoff grows (uneven part, step features, taper cuts), flushing pressure at the cut drops. The cut becomes flushing-limited — pushing discharge energy higher just causes wire breaks because debris isn't clearing. The fix is *slow down*, not *more power*.

### The wire-break diagnostic

A wire break is a process-failure event. The 5 common causes + reads:

| Cause | Symptom / read |
|---|---|
| **Flushing failure** | Break correlates with a step/feature where nozzle standoff increased; debris not clearing |
| **Tension too high** | Break in the discharge zone; wire shows fatigue necking |
| **Discharge energy too high for section** | Break in thick section; wire overheats faster than flushing cools |
| **DC arcing / dirty dielectric** | Break + visible burn marks on the part; dielectric resistivity out of range |
| **Mechanical (guide wear, dirty guides)** | Break unrelated to cut params; recurs at the same machine position |

PRISM's `WedmWireBreakPredict` engine models causes 1-3; causes 4-5 are maintenance-side. The dielectric resistivity + guide condition are pre-cut checks, not cut-parameter adjustments.

### Anti-patterns from the floor

- **"Plain brass for everything."** Plain brass is the default, not the universal answer. Tall parts (> 100 mm) + high-speed jobs + auto-threading reliability all favor coated/zinc wire. The wire cost delta is small vs the break-recovery cost.

- **"More tension = straighter cut."** Up to a point — past the wire's fatigue threshold, more tension just breaks the wire. Straightness past that point comes from *flushing* (less bow force) and *lower discharge energy*, not more tension.

- **"More flushing pressure fixes everything."** Only if the nozzle can seal. If standoff is large (uneven part), high pressure just sprays — the cut is flushing-limited and the fix is slowing down. Pressure helps only when the nozzle is close.

- **"Wire break = bad wire."** Usually it's flushing or tension or discharge energy — the wire is the victim, not the cause. Investigate the cut conditions before blaming the spool. A wire that breaks twice at the same Z-height is a flushing/feature problem.

- **"Skim passes use the same wire setup as roughing."** No — skim passes run lower discharge energy + higher tension + tighter offset. The wire's job changes from "remove bulk metal fast" to "finish straight + smooth." See [[wedm-tactics-multipass-and-recast]].

### Tie-ins

- [[wedm-tactics-multipass-and-recast]] — sibling WEDM tactical entry (skim passes + recast)
- [[wedm-wiring-backlog-bridge]] — this entry is the tribal anchor for WEDM wire-management engine wiring
- [[synthesis-thermal-envelope]] — discharge heat partition (WEDM is a thermal process)
- [[machining-tactics-coolant-strategy-selection]] — dielectric is WEDM's analogue to coolant
- [[index-by-symptom-and-task]] — symptom routing (wire break → here)

## Provenance

Distilled from the WEDM subset of the 4245-tribal corpus (~600 WEDM tips) + Machinery's Handbook 31e §EDM + Sodick/Mitsubishi/Makino operator manuals + Bedra/Sandvik wire-electrode data + WEDM_DIGEST.json. Authored 2026-05-21 by slot:hotel under U-WIKI-WEDM-WIRE-FLUSHING — **39th canonical entry** of the wiki+tribal pivot. **First WEDM tactical leaf** — closes the mill/lathe-vs-WEDM tribal-coverage asymmetry flagged in [[wedm-wiring-backlog-bridge]]. New `wedm-tactics` category.

System injection: `tribal-by-domain-inject` auto-surfaces on `WEDM`, `wire EDM`, `wire electrode`, `brass wire`, `coated wire`, `wire tension`, `flushing`, `dielectric`, `wire break`, `spark gap`, `coaxial flush`, `nozzle standoff` keywords. Zero new wiring required.

## Cross-references

- [[wedm-tactics-multipass-and-recast]] — sibling WEDM tactical entry
- [[wedm-wiring-backlog-bridge]] — WEDM engine-wiring bridge (this is its tribal anchor)
- [[synthesis-thermal-envelope]] · [[machining-tactics-coolant-strategy-selection]] — thermal + dielectric analogues
- [[index-by-symptom-and-task]] — symptom navigation root
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
