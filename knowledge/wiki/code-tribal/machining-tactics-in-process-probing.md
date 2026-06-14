---
schema: ideablock-v1
title: "In-process probing — mid-cycle offset correction, thermal-comp, wear-comp"
domain: "Machining tactics"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Probing + §In-Process Inspection
  - Renishaw "In-Process Control" guide (G65 P9023 + auto-comp macros)
  - Blum-Novotest in-process probing manuals
  - Heidenhain TT-touch-probe + Z-axis comp documentation
  - 4245-tribal corpus probing subset (cross-category)
extracted_via: human-authored
extracted_at: 2026-05-21T06:35:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MACHTACT-IN-PROC-PROBE)
---

## Question

When should I probe mid-cycle (not just at setup), what does the probe correct, and what's the per-cycle cost?

## Answer (canonical — probe between operations whose tolerance budget is consumed by the gap)

### In-process vs setup probing — the distinction

| | Setup probing ([[part-setup-zero-strategy]]) | In-process probing (this entry) |
|---|---|---|
| When | Before cycle start | Between operations or between parts during cycle |
| Purpose | Establish WCS / TLO at known-cold state | Compensate for drift since setup (thermal, wear, fixture creep) |
| Frequency | Once per setup | Per N operations or per N parts |
| Cycle-time cost | Amortizes across run | Real per-cycle overhead (10-60 s each) |
| Tolerance class enabled | Sets the floor | Lifts the floor (often by 0.005-0.020 mm) |

Setup probing assumes the WCS is stable through the run. In-process probing acknowledges it isn't — and corrects rather than accepting drift.

### The 4 mid-cycle drift sources

In-process probing exists because four things move during a long cycle:

1. **Thermal drift** — spindle warms 0.020-0.050 mm Z over 30 min; column tilts under ambient swings; part heats from cutting. See [[synthesis-thermal-envelope]].
2. **Tool wear** — flank wear 0.005-0.020 mm Z growth per ~50 parts in production steel. See [[tooling-tool-life-and-wear-management]].
3. **Fixture creep** — clamp pre-load drops 2-5 % per cycle, chip dust accumulates between jaw + part; part shifts 0.005-0.030 mm. See [[workholding-clamp-force-and-selection]].
4. **Stress relief from material removal** — large stock removal (>50 %) on stress-prone material moves the part 0.05-0.20 mm. See [[operation-ordering-rough-finish-sandwich]].

Each is invisible to a setup-only probe; each is visible to a well-placed mid-cycle probe.

### The 4 in-process probing modes

| Mode | Macro / cycle | When | What it corrects |
|---|---|---|---|
| **Mid-cycle re-zero** | G65 P9814 (bore) or P9815 (boss) on a pre-machined feature | Between rough + finish, after stress relief, after a flip | Stress-relief drift + setup re-positioning |
| **In-process measurement** | G65 P9811 (single-surface) on a just-cut feature | After roughing, before finishing | Validates roughing-stock; updates G54 if drift > tolerance/3 |
| **Auto wear comp** | G65 P9023 / vendor-specific tool-setter cycle | After each tool change OR at scheduled interval | Tool length / diameter wear → updates H## / D## |
| **First-piece full** | G65 P9023 + P9812 + P9814 sequence | First part of every shift / new lot | Full re-baseline; catches operator error + lot-material variation |

### Per-cycle cost calculation (the operator's go/no-go)

```
cost_per_part = (probe_cycle_time × N_probes_per_part) + (machine_rate × time_saved_by_avoiding_scrap)
```

Example — 3-probe cycle, 30 s each, 1.5 min total, machine rate $75/h:
- Cost: 1.5 min × $1.25/min = **$1.88 per part**
- Break-even: $1.88 / $20 scrap-part cost = 9.4 % scrap-rate reduction justifies probing

If your historical scrap rate is > 10 % AND probing prevents most of those, the math works. If you ship at 1 % scrap, probing is overhead. Measure your baseline first.

### When in-process probing pays off

- **Long cycles** (> 30 min/part) where thermal drift is real
- **Tight tolerances** (class M or tighter, Ra < 1.6 μm)
- **Lights-out runs** where an operator isn't checking parts
- **Lot-to-lot variation** in stock (cast/forged with skin variation)
- **Multi-setup work** where each setup transition consumes tolerance
- **Expensive parts** where scrap cost >> probe-cycle cost

### When in-process probing does NOT pay off

- **Short cycles** (< 5 min) where thermal is negligible
- **Loose tolerances** (IT12+) where drift fits in the budget
- **Pallet systems with proven dowel repeatability** < 0.005 mm
- **One-off prototyping** where the next part may have different geometry anyway
- **No probe / no probe budget** — manual indicator + first-piece-inspection is the next-best fallback

### Probe-driven adaptive feed (the advanced mode)

Modern controllers can use probe output to *change cutting parameters* mid-cycle, not just offsets:

```
G65 P9811 (probe surface) → if surface_deviation > limit → reduce_feed by 20%
G65 P9023 (tool length)   → if wear > 0.020 mm        → switch to sister tool
```

This converts probing from a passive measurement into a closed-loop control. The cycle adapts to what's measured. Renishaw GoProbe, Heidenhain TT, and Blum integrations all support this — the limit is operator setup time, not capability.

### Anti-patterns from the floor

- **"Probe everything every cycle."** Probe time × scale = real money. A 1.5-min probe sequence × 200 parts/day = 5 hours of machine time gone. Probe what *drifts*; trust what doesn't.

- **"Probe-verified parts don't need CMM."** They do — the probe is a *check during cutting*, not a *final inspection per ISO 14253*. The probe has finite accuracy (±0.003-0.010 mm per touch) and its repeatability degrades over time. CMM verifies the part shipped to the customer.

- **"Probe failure = part scrap."** Not necessarily — investigate why the probe failed. Stylus damage? Calibration drift? Coolant on tip? A probe that reads wrong twice in a row is a tool problem, not a part problem.

- **"Cold-start probe is the truth."** It's the *baseline* truth. After 30 min of cutting, the probe-from-cold reading is no longer accurate — thermal expansion + tool wear mean the next probe-from-cold will read slightly different. Probe at the *state the part is in*, not at cold.

- **"Probe-only adjustment, no inspection."** The probe makes mid-cycle adjustments based on its measurement. If the probe is biased (calibration drift), the adjustments compound the bias. Periodic independent inspection (CMM, height gauge, mic) detects probe bias.

### Tie-ins

- [[part-setup-zero-strategy]] — sibling; this entry is the *running* equivalent of that *setup* entry
- [[part-setup-tool-length-offsets-and-presetting]] — auto wear comp uses TLO update macros
- [[tooling-tool-life-and-wear-management]] — wear-comp cadence + sister-tool triggers
- [[synthesis-thermal-envelope]] — thermal drift is a primary in-process probing target
- [[synthesis-rigidity-envelope]] — fixture creep is a primary in-process probing target
- [[machining-tactics-pre-cut-prep]] — first-piece probe sequence is the bridge between pre-cut + in-process
- [[operation-ordering-rough-finish-sandwich]] — re-probe between rough + finish after stress relief
- [[workholding-clamp-force-and-selection]] — fixture creep detection

## Provenance

Distilled from the probing subset of the 4245-tribal corpus + Machinery's Handbook 31e §Probing §In-Process Inspection + Renishaw In-Process Control guide + Blum-Novotest in-process manuals + Heidenhain TT documentation. Authored 2026-05-21 by slot:hotel under U-WIKI-MACHTACT-IN-PROC-PROBE — **20th canonical entry** of the wiki+tribal high-ROI pivot. 4th machining-tactics entry; bridges machining-tactics + part-setup via the running-vs-setup distinction.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `in-process probing`, `mid-cycle probe`, `wear comp`, `thermal comp`, `G65 P9023`, `Renishaw GoProbe`, `Blum touch probe`, `Heidenhain TT`, `auto comp`, `closed-loop control`, `fixture creep`, `probe-driven feed`, `mid-cycle drift`, `auto wear adjustment` keywords. Zero wiring required.

## Cross-references

- [[part-setup-zero-strategy]] — setup-time sibling
- [[part-setup-tool-length-offsets-and-presetting]] — auto wear-comp pathway
- [[tooling-tool-life-and-wear-management]] — wear cadence
- [[synthesis-thermal-envelope]] — thermal drift target
- [[synthesis-rigidity-envelope]] — fixture creep target
- [[machining-tactics-pre-cut-prep]] — first-piece probe bridge
- [[operation-ordering-rough-finish-sandwich]] — rough-finish re-probe
- [[workholding-clamp-force-and-selection]] — fixture creep detection
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule honored
