---
schema: ideablock-v1
title: "In-cut adjustments — what to change mid-cycle, why, and which signal triggers it"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Cutting Conditions + §Troubleshooting
  - Sandvik Coromant — Process optimization guide
  - Iscar / Kennametal — Cutting troubleshooting bulletins
  - Tlusty, "Manufacturing Processes and Equipment" (chatter + chip mechanics)
  - 4245-tribal corpus machining-tactics subset (n=339)
extracted_via: human-authored
extracted_at: 2026-05-21T03:25:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-IN-CUT)
---

## Question

What do I change mid-cut when the cut isn't going right, and which signal tells me which change?

## Answer (canonical — match the signal to the right adjustment)

### The signal → adjustment table

The cut tells you what's wrong if you know the language. Default response is *parameter adjustment*; tool/holder change is the second resort, fixture/setup change is the third.

| Signal (sight / sound / smell / chip) | Diagnosis | Mid-cut adjustment | Persistent fix |
|---|---|---|---|
| **High-pitched whine / chatter mark on wall** | Regenerative chatter (cut frequency = tool natural frequency) | RPM ↓ 20 %, or RPM ↑ 30 % to jump stability lobe. Feed ↑ 20 % helps damping. | Change spindle speed permanently to stable lobe; check tool overhang (shorter = stiffer); use chatter-stable holder |
| **Low-frequency thump / vibration in part** | Workpiece flexure (thin wall, tall stand-up) | Reduce radial DOC by 50 %, feed-per-tooth same | Add a support, change holder, finish-pass at low force |
| **Long ropey blue chips on steel** | Cutting hot, no chip break, surface speed too high | Reduce SFM by 15 %; increase feed-per-tooth by 10 % (chip breaks) | Switch to chip-breaker geometry insert; recheck Vc table |
| **Powder / dust chips, no curl** | Cutting cold, feed too low, insert rubbing not cutting | Feed ↑ 30 % until chips form curls; reduce DOC if force jumps too high | Wrong geometry — wiper/sharp-edge insert; check honed-edge spec |
| **Burnt straw → blue → purple chip color** | Cutting at the upper edge of Vc envelope | Coolant flood ↑ or reduce SFM 10 % | Chip color is the cheapest thermometer — log color, adjust permanently |
| **Spindle load LED flicker / overload alarm** | Excessive MRR for spindle, OR dull tool, OR work-hardened skin | Reduce ae (radial DOC) first; if it persists, suspect tool wear; if first cut on new lot, suspect skin | Confirm tool fresh; check material cert; reduce engagement |
| **Surface finish degrading mid-pass** | Tool wear progressing; built-up edge forming; runout wobble | Add coolant (BUE fix); slow down 10 % (wear extension); check runout | Tool change interval; insert grade check; runout measurement |
| **Chip welding to insert (silver streak on chip)** | BUE — built-up edge. Material smearing onto rake face | Increase SFM (BUE peaks at low-mid speed); flood coolant; sharper edge prep | Switch to coated insert (TiAlN), higher Vc range |
| **Tool walks on entry / spot mark off-position** | Surface unfavorable to drill entry (curved / angled / hardened skin) | Spot drill first if not done; reduce entry feed 50 % for first 1 mm | Hard-skin face-mill before drilling; flat-bottom spot drill |
| **Corner gouge / overshoot on direction reversal** | Accel/decel insufficient or feed not lookaheading | Reduce corner feed by feed_corner=feed × cos(angle/2); enable controller lookahead | Update post to inject corner-decel; use HSM-style smoothing |
| **Tool breaks on plunge entry** | Center-cutting required but tool isn't; or chip can't evacuate at Z-bottom | Helical entry, ramp entry, or pre-drilled pilot hole. NEVER straight-plunge a non-center-cutting tool | Update toolpath strategy globally |
| **Coolant flooding but chips not flushing** | Chip evacuation direction wrong, or coolant volume too low | Pause, retract, blow chips, restart. Increase coolant pressure or aim | Through-spindle coolant; chip auger; reduce DOC |
| **Smoke / smell of burning** | Severe thermal — coolant lost, insert glazed, or carbide overheating | STOP. Don't try to push through. Investigate before restart. | Always — never push through smoke. Catastrophic failure window |

### Universal trigger order (the operator's mental checklist)

When something looks wrong, run this 5-step before reaching for the override panel:

1. **Look at the chip.** Color, shape, length, curl direction. The chip is the most information-dense signal — 70 % of in-cut diagnoses are visible in the chip stream.
2. **Listen to the spindle.** Pitch change = chatter; load growl = overload; smooth hum = nominal.
3. **Check spindle load %.** Above 80 %, you're at the edge of the safe envelope. Above 100 % you're past it.
4. **Check the surface as the tool exits the cut.** Tear-out vs glassy = different problems with different fixes.
5. **Smell the air around the spindle.** Burning coolant, burning oil, burning insert binder = distinct, all bad, each with its own cause.

The override panel comes AFTER this scan. Pressing the spindle-load-fix-button blind is how a small problem becomes a tool change.

### Mid-cut adjustment leverage

Different adjustments have different leverage on different problems. Top-3 leverage by problem class:

| Problem class | First lever | Second lever | Third lever |
|---|---|---|---|
| Heat | Coolant volume/aim, then Vc reduction | Feed increase (less time per area) | Insert grade |
| Force | ae reduction (radial DOC) | ap reduction (axial DOC) | Feed increase (counter-intuitive — sometimes lowers force) |
| Chatter | RPM (up OR down to next stable lobe) | Reduce overhang | Change holder |
| Wear | Vc reduction (Taylor: cheapest extension) | Coolant | Switch to higher-grade insert |
| Surface finish | Reduce nose-radius feed coupling (fz ↓ when finishing) | Sharper insert (less honing) | Reduce runout |
| Chip control | Vc / fz balance for chip-breaker geometry | Switch insert geometry | Change strategy (e.g. trochoidal for slot cuts) |

If the obvious-first lever doesn't help in 2-3 passes, the diagnosis is wrong — not the lever. Go back to chip + sound, re-classify.

### Anti-patterns from the floor

- **"Override panel solves everything."** No — override is a sledgehammer. It can save the part by slowing a borderline cut, but it hides root cause. Each override > 20 % from program nominal should trigger an investigation log entry, not become the next operator's normal.

- **"More coolant fixes more problems."** Sometimes — heat, BUE, chip evac. But not chatter (coolant doesn't damp regenerative chatter much), not workpiece deflection, not entry walk. Knowing what coolant *doesn't* fix is half the value.

- **"Slow it down until it works."** A speed reduction that takes a 4-minute cycle to 40 minutes turned a profit-maker into a loss leader. Slowing down is a last-resort fix; the question to ask first is "why is the program asking for this speed?" — usually the program's right and something else (tool wear, fixture, material lot) is wrong.

- **"Feed and speed override are interchangeable."** They're not. Spindle override changes Vc (heat + wear); feed override changes fz (chip + force). The same problem (e.g. chatter) responds opposite ways to each: feed up can damp chatter, feed down can amplify it. Match the override to the signal.

- **"That weird sound is normal for this material."** It isn't. Every machine has a baseline acoustic signature for "in spec". A deviation is the early-warning of a problem the spindle-load LED hasn't caught yet. Trust the experienced operator who says "that doesn't sound right" — they're decoding it before you do.

### Tactic vs strategy — what each layer owns

This entry is *tactics* — the moment-by-moment decisions during the cut. It is not the same as *strategy* (toolpath choice, like climb vs conventional, adaptive vs traditional). The relationship:

```
Strategy = pre-cut planning that picks the toolpath        (HSM, trochoidal, conventional, etc.)
Tactics  = in-cut adjustments while the planned path runs  (this entry)
Recovery = post-cut diagnosis when tactics didn't save it  ([[operation-ordering-rough-finish-sandwich]] §anti-patterns)
```

A great strategy with bad tactics produces inconsistent parts. Bad strategy + great tactics produces consistent parts in 3× the time. Both layers matter; they're not interchangeable.

### Tie-ins

- [[workholding-clamp-force-and-selection]] — force-budget violation is one of the persistent fixes when the tactical response runs out
- [[workholding-locators-and-soft-jaws]] — locator slip is misdiagnosed as chatter when actually a setup problem
- [[operation-ordering-rough-finish-sandwich]] — wrong-side adjustments on rough vs finish are a sub-class of these tactical failures
- [[part-setup-multi-op-planning]] — re-zero after a major mid-cut intervention is often required to preserve tolerance budget

## Provenance

Distilled from the 339 machining-tactics tips in the 4245-tribal corpus + Machinery's Handbook 31e §Cutting Conditions §Troubleshooting + Sandvik Coromant + Iscar / Kennametal bulletins + Tlusty (chatter + chip mechanics). Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-IN-CUT — first canonical machining-tactics entry of the wiki+tribal high-ROI pivot. Four of the five high-ROI categories now have a foundational canonical entry; tooling-selection (14.7 %) remains the last.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `chatter`, `chip`, `wear`, `BUE`, `built-up edge`, `override`, `coolant`, `surface finish`, `tool walk`, `corner`, `plunge`, `mid-cut`, `troubleshoot`, `feed override`, `spindle override`, `chip color` keywords. Zero wiring required.

## Cross-references

- [[workholding-clamp-force-and-selection]] — persistent-fix layer for force-related tactical failures
- [[workholding-locators-and-soft-jaws]] — locator slip vs chatter misdiagnosis
- [[operation-ordering-rough-finish-sandwich]] — tactic adjustment differs between rough and finish phase
- [[part-setup-multi-op-planning]] — re-zero requirement after mid-cut intervention
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit ranking machining-tactics as 8.0 % (4th weakest)
- [[feedback_do_optional_high_roi_work]] — standing rule honored
