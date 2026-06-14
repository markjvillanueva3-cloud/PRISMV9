---
schema: ideablock-v1
title: "Part setup / probing — edge-find, WCS establishment, tool length offsets, on-machine verification"
domain: "Machining"
category: "part-setup"
version_state: Current
confidence: 0.95
cluster_size: 1
sources:
  - hand-authored:claude-df944902:2026-05-18
extracted_via: hand-authored-canonical
extracted_at: 2026-05-18T23:35:00Z
tags: [part-setup, probing, edge-finder, wcs, g54, work-offset, tool-length-offset, tlo, spindle-probe, tool-setter, datum, presetter, on-machine-verification, renishaw, haimer, indicator]
---

## Question

The part is clamped. Now the machine has to know *where* it is and *how long every tool is* — or the program cuts air, or cuts into the fixture, or puts every feature 0.5″ off. How do you set the work coordinate system and tool offsets so the first part is right, not the third?

## Answer

Setup is coordinate-system bookkeeping: tell the control where the part datum is (the **work offset / WCS**), how long each tool is relative to the spindle gauge line (the **tool length offset**), and how big each tool is (the **diameter/wear offset**). Get the WCS↔datum relationship matching the print's datum scheme and 90% of "the program is wrong" calls disappear.

### 1. Work Coordinate System (WCS / G54…G59) — set it on the print datum

- **The WCS origin MUST coincide with the print's datum origin.** If the print dimensions from the lower-left corner of datum B, set G54 X0Y0 *there* — not "wherever was convenient." Every program offset assumption then matches the print.
- **Z0 convention — pick one and put it on the traveler:** top of part (most common, intuitive, but changes with stock variation) vs. top of fixture/vise (constant, stock-independent — preferred for production + soft-jaw step stops). Mixed Z0 conventions across a shop is a top crash cause.
- **G54 vs. G55…** one work offset per part/fixture location; G54 the primary, G55+ for tombstone faces / multi-part grids. Sub-offsets (G54.1 P1…) for high part counts.
- **Re-establish WCS after ANY of:** re-fixture, vise moved, fixture re-bolted, machine power-cycle if not battery-backed, a crash. "It was set last week" is not "it is set."

### 2. Edge-finding / probing methods — accuracy ladder

| Method | Repeatability | When |
|---|---|---|
| **Mechanical edge finder (wobble, 0.200″ tip)** | ±0.0005″ in skilled hands | manual setup, single part, no probe |
| **Haimer 3D taster / dial test indicator** | ±0.0002″ | precision manual setup, indicating bores/datums true |
| **Spindle touch probe (Renishaw OMP/MP)** | ±0.0001″, automated | production, in-cycle, multi-feature WCS, lights-out |
| **Pick-up by cutting a witness (skim cut)** | ±0.001″ | rough stock with no clean edge — cut a face, then edge-find the cut |

Edge-find rules:
- **Edge finder kicks at contact** — the recorded position is the tip-radius offset from the true edge; subtract the tip radius (0.100″ for a 0.200″ tip) in the right direction. The #1 setup error is forgetting / wrong-signing the tip radius.
- **Probe two points and bisect for a bore/boss center**; probe 3–4 and best-fit for a bored datum. Never single-touch a center.
- **Probe at cutting RPM-relevant thermal state** — a cold probe in a warm machine reads the cold geometry; for ≤0.0005″ work, run the spindle to temp first.
- **Probe finished surfaces, never as-cast/burr** — same rule as locating: the probe believes whatever it touches.

### 3. Tool length offsets (TLO) — the crash-prevention number

The TLO tells the control how far the tool tip is from the spindle gauge line so Z moves land at the real cutting depth.

- **Two TLO philosophies — know which your shop uses:**
  - **Gauge-line / "tool-to-part" (G43 H##):** TLO = distance from gauge line to tip; Z0 is the part. Most common, presetter-friendly.
  - **"Touch-off each tool to the part Z0":** TLO absorbs the part position; re-touch every tool on re-setup. Simple, but slow + error-prone for many tools.
- **Off-machine presetter** (tool length measured at a tool-crib gauge) → TLO is part-independent → swap tools mid-run with no re-touch → the production standard. Verify the presetter↔machine correlation once with a master.
- **On-machine tool setter** (table-mounted touch probe, e.g. Renishaw TS27R) → measures TLO + broken-tool detection in-cycle. The lights-out enabler.
- **Tool diameter / wear offset (D##):** controls cutter-comp + finish size. Set nominal at setup; the *operator measures the first finished feature and dials wear* to bring it to print mid-tolerance. This is the single most common in-process adjustment.

### 4. The setup sequence (deterministic, prevents the classic crashes)

1. **Clamp + verify the part is seated on all locators** (push-test / feeler / probe the locators).
2. **Establish WCS on the print datum** (edge-find / probe X, Y; set Z0 per the traveler convention).
3. **Load + offset every tool** (presetter or touch-off); enter D-offsets nominal.
4. **Verify TLOs against the longest + shortest tool** with a known Z reference — a transposed TLO is a fixture/part crash.
5. **Dry-run / single-block the first part at Z+1.0″ (air cut)** watching the DRO match the print datum logic.
6. **Single-block the first real part**, hand on feed-hold, especially the first rapid-to-Z and the first tool change.
7. **Measure the first part fully** (not just one dim) → dial D-wear offsets to mid-tolerance → release the run.

### 5. On-machine verification (OMV) — catch it before it leaves the vise

- **Probe critical features in-cycle, before unclamping** — a bore that's 0.002″ off is a re-bore while located; off the machine it's a scrap or a re-fixture-and-pray.
- **Probe → auto-update wear offset** (adaptive: Renishaw "Inspection Plus") closes the loop: machine measures, corrects D-offset, recuts within tolerance, lights-out.
- **OMV is not final inspection** — same machine, same thermal state, same probe error as the cut; it catches gross + drift, not absolute CMM-grade truth. Still: a free 100% in-process gate.

### 6. Failure modes — symptom → setup/probing root cause

| Symptom | Root cause |
|---|---|
| Whole part shifted exactly one tip-radius | edge-finder tip radius not subtracted (or wrong sign) |
| Every feature off by a constant X/Y | WCS set on a convenient corner, not the print datum origin |
| One tool crashes into the part/fixture, others fine | that tool's TLO transposed / mis-entered |
| Z depth off only after stock variation | Z0 set on top-of-part with variable stock — should be top-of-fixture |
| First part good, whole run undersize | D-wear offset never dialed off nominal after first-article measure |
| Setup good on day shift, crash on night shift | WCS not re-established after the vise was moved / machine power-cycled |
| Probed dimension good, CMM says scrap | OMV trusted as final inspection (same thermal/probe error as the cut) |
| Bore center off | single-touch instead of multi-point bisect/best-fit |

### 7. Shop-floor 5-line check before you cut

1. **Is the WCS origin on the print's datum origin (not a convenient corner)?**
2. **Is the Z0 convention (top-of-part vs top-of-fixture) on the traveler and matched by the program?**
3. **Did I subtract the edge-finder/probe tip radius in the correct direction?**
4. **Did I verify the longest and shortest tool's TLO against a known Z before the first cut?**
5. **First-article: measured fully, D-wear dialed to mid-tolerance, before releasing the run?**

Pickup: tribal-by-domain-inject.mjs + wiki-precheck-inject.mjs (no wiring required — keyword pickup on setup / probing / edge-find / WCS / G54 / work offset / tool length offset / TLO / presetter / on-machine).

Lifecycle: Current. Re-validate against the shop-floor outcome ledger every 90 days. Supersede only with field-measured counter-evidence.
