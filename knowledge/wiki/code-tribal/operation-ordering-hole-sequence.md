---
schema: ideablock-v1
title: "Hole-making operation sequence — spot → drill → bore → ream"
domain: "Operation ordering"
category: operation-ordering
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-20-hotel
sources:
  - Machinery's Handbook 31e §Drilling and Reaming
  - Sandvik Coromant — Hole-making application guide
  - Kennametal — Drilling and reaming best practices
  - 4245-tribal corpus operation-ordering subset (n=353)
extracted_via: human-authored
extracted_at: 2026-05-20T20:50:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-OPORDER-HOLES)
---

## Question

What is the correct order of operations for a precision hole, and what dictates each step?

## Answer (canonical — applies to almost every machined hole)

The sequence is **`spot drill → drill → (interpolated cb/csk if needed) → bore → ream`**, with **`tap`** branching off after drill if the hole is threaded. Each step has a single load-bearing reason — skipping or reordering trades a measurable property for cycle time:

| Order | Op | Why this step exists | What breaks if you skip it |
|------|-----|-----------------------|------------------------------|
| 1 | **Spot drill** (90° or 120°) | Establishes the drill's start point so the lip doesn't walk on the cosine of the surface. | Drill wanders 0.05-0.30 mm on entry — kills hole-to-hole positional tolerance and snaps small drills (<Ø3 mm). |
| 2 | **Drill** | Removes 80-95 % of stock. Cheapest MRR for hole removal. | If you bore from solid, you burn 5-10× the cycle time and load the boring bar past its rigidity envelope. |
| 3 | **Counterbore / countersink** (if needed) | Done BEFORE bore/ream so the chamfer or seat doesn't bell-mouth the finished bore. | A reamed bore with a post-op csk gets a recut edge — diameter grows by 1-2× the csk depth's springback at the entry. |
| 4 | **Bore** (single-point or rough) | Trues up the drilled hole's position and geometry. Drill drift is typically 0.05-0.15 mm; bore corrects to 0.005-0.020 mm. | Reaming on a drilled hole inherits drill drift — the reamer follows the existing axis, it does not correct it. (Reamers cut on the diameter, not the axis.) |
| 5 | **Ream** | Sizes the hole to final diameter + surface finish (Ra 0.4-1.6 μm typical). Stock allowance: 0.10-0.25 mm on diameter for ≤Ø12, 0.25-0.50 mm for Ø12-25, 0.5-1.0 mm above Ø25. | Too much stock loads the reamer corners and bell-mouths the entry; too little stock and the reamer rubs instead of cuts (heat, work-hardening on stainless / Inconel). |
| Branch | **Tap** (post-drill) | Threads. Tap drill is per Machinery's Handbook 75 %-thread chart for the tolerance/material combo. | Wrong tap drill = stripped threads (too small) or weak threads (too large). 75 % thread carries 95 % of the strength at half the torque of 100 %. |

## Edge cases the canonical order does NOT cover

- **Deep holes (L/D > 5)**: insert a **peck cycle** (G83) at drill step. Beyond L/D > 10, swap drill for **gun-drilling** or **trepanning** — chip evacuation, not removal rate, is the constraint.
- **Thin-wall parts**: bore BEFORE drilling adjacent features whose forces would distort the wall. The fixture's clamping moment changes once the hole is open.
- **Hole intersecting an angled surface**: spot drill must be perpendicular to the SURFACE, not the spindle axis. Use a 5-axis tilt or accept the walk. Flat-bottom spot drills exist for this — keep one in the crib.
- **Pre-hardened materials (Rc 45+)**: replace bore with **single-point hard-turn bore** (CBN insert) or **rigid-grinding**. Reaming pre-hardened material destroys the reamer in 1-3 holes.
- **Hole in a casting / forging skin**: skin-skip with a stub drill or face mill the entry surface first. Skin scale destroys spot drills and walks subsequent ops.
- **Through-hole vs blind-hole reaming**: through-hole reams can use spiral-flute (chips push forward); blind holes need straight-flute (chips pull back) — wrong flute = chips packed at the bottom + scored bore.

## Setup invariants (must hold for the canonical order to apply)

1. **Datum frame is established BEFORE any hole op.** Spot drilling onto an unindicated face propagates the face's error into every downstream feature. Indicate datum-A, set WCS, THEN start spotting.
2. **Tool length offsets verified.** Off-by-one in the magazine = wrong tool at the spot step = ruined position on every hole.
3. **Workholding's clamp load doesn't move between operations.** Re-clamping between drill and bore introduces 0.01-0.05 mm shift — kills positional tolerance class M and tighter.
4. **Coolant is matched to the step.** Drilling tolerates flood; reaming on stainless wants flood + through-coolant; tapping wants neat oil or HD water-soluble for galling control.

## Cycle-time leverage of getting this right

| Failure mode | Typical fix cost |
|---|---|
| Drill walk → out-of-tolerance position | Scrap part or re-fixture + bore-truing op (15-45 min) |
| Bore + ream on drilled hole (no bore) → bell-mouth | Re-ream (if oversize spec) or scrap |
| Tap on drilled-only hole at 100 % thread → broken tap | 5-30 min tap removal + scrap risk |
| Reverse csk/bore order → recut entry edge | Re-bore + accept oversize OR scrap |

The canonical order is **free** to enforce — it costs nothing extra over the wrong order and saves the four scrap modes above.

## When to deviate

- **Production volume + locked-down process**: skip spot drill if SC/SD drill geometry self-centers (Ø ≥ 6 mm, ≥4 % web thickness, on a CNC with <0.005 mm position repeatability). Validate with 5-part trial run.
- **High-volume drill-and-tap**: combo drill-tap tools fold steps 2+branch into one cycle, but only valid for blind holes at standard pitches.
- **Tight tolerance bore (H6 or tighter)**: replace ream with **rough bore → finish bore → cylindrical hone** — reaming bottoms out around H7.

## Provenance

- Distilled from 353 operation-ordering tips in the 4245-tribal corpus (see [[reference_tribal_coverage_audit_2026_05_18]]).
- Verified against Machinery's Handbook 31e, Sandvik Coromant + Kennametal application guides.
- Authored 2026-05-20 by slot:hotel under U-WIKI-OPORDER-HOLES — the pivot from U-BRIDGE-ERP-SCHED close-out to wiki + tribal-knowledge high-ROI generation per operator directive.
- System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces this entry as a top-3 hit when chats reference "drill", "bore", "ream", "hole", or "operation sequence" — no further wiring required.

## Cross-references

- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit that flagged operation-ordering as 4 % weakest
- [[feedback_high_roi_backend_first_slot_queue]] — pickup discipline this entry honors
- [[feedback_do_optional_high_roi_work]] — standing rule: always do high-ROI in-scope
