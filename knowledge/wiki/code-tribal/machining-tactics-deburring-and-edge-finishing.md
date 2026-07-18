---
schema: ideablock-v1
title: "Deburring + edge finishing — burr formation, edge-break specs, deburring method selection"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.95
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Burrs and Deburring + §Edge Conditions
  - Gillespie "Deburring and Edge Finishing Handbook"
  - ISO 13715 (edge specification — burr / undercut)
  - 4245-tribal corpus deburring subset
extracted_via: human-authored
extracted_at: 2026-05-21T13:50:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-DEBURRING)
---

## Question

Where do burrs come from, what does the print's edge callout actually require, and which deburring method for which part?

## Answer (canonical — prevent the burr at the cut, then deburr to the spec — not beyond)

### Burr formation — where burrs come from

A burr is plastically-deformed material pushed out at the edge where the tool exits the cut. Four burr types (Gillespie taxonomy):

| Burr type | Where | Cause |
|---|---|---|
| **Exit / rollover burr** | Where the tool leaves the workpiece | Material rolls over the edge instead of shearing — the most common |
| **Entrance burr** | Where the tool enters | Smaller; material pushed up at entry |
| **Poisson burr** | Side of the cut | Material bulges sideways under compression |
| **Tear / breakout burr** | Drilled-hole exit, thin-wall exit | Material tears rather than shears as the tool breaks through |

**The burr is born at the cut — controlling it there is cheaper than removing it later:**
- **Sharp tool** → shears cleanly; a worn tool rolls material over → bigger burr.
- **Climb vs conventional** — exit-burr direction depends on cut direction (see [[machining-tactics-climb-vs-conventional-milling]]); plan the exit toward a face that will be deburred anyway.
- **Exit chamfer / backing** — chamfering the exit edge first, or backing the part with sacrificial material, prevents the rollover.
- **Feed reduction at breakthrough** — drilling: slowing the feed in the last 1-2 mm before breakthrough dramatically reduces the tear burr.
- **Tool exit angle** — exiting the cut at a shallow angle (rather than perpendicular) reduces the rollover burr.

### Reading the print's edge callout

The print specifies the edge condition — and "deburr" is not one thing:

| Callout | Meaning | Method implication |
|---|---|---|
| **"Break all edges"** / "break sharp edges" | Remove the knife-edge; ~0.1-0.3 mm break, no spec dimension | Hand deburr / brush / tumble — fast |
| **"0.5 × 45° chamfer"** (or similar dimensioned) | A specified chamfer — it's a feature, not a deburr | Machine it (chamfer mill / countersink) — it has a tolerance |
| **"Edge per ISO 13715"** | Formal edge spec: permissible burr / undercut range | Measure against the standard's edge zone |
| **(nothing — no callout)** | Default per the shop's general note (often "break sharp edges") | Apply the shop's default |
| **"Deburr — no secondary burr"** | Critical: the deburring itself must not create a new burr | Controlled method (machined chamfer, abrasive flow) — not aggressive hand work |

**The distinction that matters:** a dimensioned chamfer (`0.5 × 45°`) is a **machined feature** with a tolerance — it goes in the toolpath, not the deburring bench. "Break edges" is a **finishing operation** with no dimension. Confusing the two either over-processes (machining a "break edges" call) or under-processes (hand-breaking a dimensioned chamfer that needed a tolerance).

### Deburring method selection

| Method | Best for | Caveat |
|---|---|---|
| **Hand (file, scraper, deburr tool)** | Low volume, accessible edges, one-offs | Operator-variable; slow; can't reach internal features |
| **Brush (nylon-abrasive, wheel)** | Flat surfaces, consistent light edge-break, volume | Won't reach deep internal edges |
| **Countersink / chamfer mill** | Hole edges, dimensioned chamfers | It's machining — goes in the program (see [[machining-tactics-gcode-safety-and-macros]] secondary ops) |
| **Tumbling / vibratory** | High volume, small parts, all-over edge-break | Not for tight-tolerance surfaces (removes material everywhere); long cycle |
| **Abrasive flow machining (AFM)** | Internal passages, cross-holes, intersecting bores | Specialized; expensive; for the burrs you can't reach |
| **Thermal (TEM)** / **electrochemical (ECD)** | Complex internal burrs, simultaneous all-edge | Capital equipment; production-volume justification |
| **Robotic / CNC deburr** | Volume + consistency + complex 3D edges | Programming + fixture cost; pays at volume |

### The cross-hole burr problem

The hardest burr is the one at an **intersecting-hole junction** — drill a cross-hole through an existing bore and the exit burr is *inside* the bore, often unreachable by hand or brush. This is where AFM, thermal, or electrochemical deburring earn their cost. Best practice: **drill the cross-hole BEFORE the bore is finished** where the sequence allows — then the bore's finishing pass removes the cross-hole's burr. Operation ordering ([[operation-ordering-hole-sequence]]) can design the burr out.

### Deburring is a cost — match it to the spec

Deburring is non-value-added time that the customer rarely pays for explicitly. The discipline:
- **Deburr to the spec, not beyond.** "Break edges" doesn't need a measured 0.3 mm chamfer — a quick pass that removes the knife-edge satisfies it.
- **Prevent at the cut where cheap.** A sharp tool + planned exit direction + breakthrough feed-reduction eliminates burrs that would otherwise cost bench time.
- **Batch it.** Tumbling/vibratory amortizes across many parts; hand-deburring scales linearly. At volume, the method that doesn't scale linearly wins (same logic as [[machining-tactics-material-removal-economics]]).

### Anti-patterns from the floor

- **"Deburring is the deburr bench's problem."** Burr *control* starts at the cut — sharp tool, exit planning, breakthrough feed. The bench *removes* what the cut couldn't prevent. A machinist who ignores burr formation hands the bench an avoidable workload.

- **"Break edges = make a chamfer."** A dimensioned chamfer (`0.5×45°`) is a machined feature; "break edges" is just knife-edge removal. Machining every "break edges" call wastes program + cycle time.

- **"Tumble everything."** Tumbling/vibratory removes material from EVERY surface — fine for an edge-break-all part, ruinous for a part with tight-tolerance datum surfaces. Mask or exclude precision features.

- **"Deburring doesn't affect tolerance."** It does — an aggressive deburr on an edge adjacent to a toleranced feature can remove enough material to shift the dimension. Deburr away from the tolerance, or after final inspection-critical features are verified.

- **"Cross-hole burrs — just poke at them."** The intersecting-hole burr is often physically unreachable. Either design the sequence so a later finishing pass removes it, or budget for AFM/thermal/ECD. Poking blindly at an internal burr risks damaging the bore.

### Tie-ins

- [[machining-tactics-climb-vs-conventional-milling]] — cut direction sets exit-burr direction
- [[operation-ordering-hole-sequence]] — sequence cross-holes to design out the junction burr
- [[machining-tactics-gcode-safety-and-macros]] — chamfer/countersink as a programmed secondary op
- [[machining-tactics-material-removal-economics]] — deburring is non-value-added; batch it
- [[quality-first-article-inspection-and-spc-cadence]] — edge condition per ISO 13715 is an inspection item
- [[machining-tactics-in-cut-adjustments]] — a worn tool (bigger burrs) is an in-cut signal

## Provenance

Distilled from the deburring subset of the 4245-tribal corpus + Machinery's Handbook 31e §Burrs and Deburring §Edge Conditions + Gillespie "Deburring and Edge Finishing Handbook" + ISO 13715. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-DEBURRING — **46th canonical entry** of the wiki+tribal pivot. Tier-2 universal (every part has edges); closes the deburring/edge-finishing gap.

System injection: `tribal-by-domain-inject` auto-surfaces on `deburr`, `burr`, `edge break`, `break edges`, `edge finishing`, `chamfer`, `rollover burr`, `cross-hole burr`, `tumbling`, `vibratory deburr`, `abrasive flow`, `ISO 13715`, `edge callout` keywords. Zero new wiring required.

## Cross-references

- [[machining-tactics-climb-vs-conventional-milling]] — exit-burr direction
- [[operation-ordering-hole-sequence]] — designing out the cross-hole burr
- [[machining-tactics-gcode-safety-and-macros]] — chamfer as a programmed op
- [[machining-tactics-material-removal-economics]] — deburring cost discipline
- [[quality-first-article-inspection-and-spc-cadence]] — edge condition inspection
- [[machining-tactics-in-cut-adjustments]] — worn-tool burr signal
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
