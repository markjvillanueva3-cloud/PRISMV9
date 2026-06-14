---
schema: ideablock-v1
title: "Setting work zero — probe vs indicator vs edge-finder, when each one is right"
domain: "Part setup"
category: part-setup
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Setting Work Coordinates + §Probing
  - Renishaw "Probing Application Guide" (G65 P98xx macros)
  - Haas / Fanuc / Siemens controller manuals (G54-G59 + macro behavior)
  - 4245-tribal corpus part-setup subset (n=421)
extracted_via: human-authored
extracted_at: 2026-05-21T04:30:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-PARTSETUP-ZERO)
---

## Question

How do I set work zero — and how do I pick between probe cycle, dial indicator, edge finder, and laser/optical?

## Answer (canonical — pick by accuracy required + features available + setup volume)

### The 4 zero-finding methods + their envelopes

| Method | Accuracy (95 %) | Time per axis | Cost / setup overhead | Best for |
|---|---|---|---|---|
| **Edge finder (electronic / mechanical)** | ±0.005-0.020 mm | 30-60 s | $50-300 finder, no controller upgrade | Quick rectangular-stock zero, prototyping, repeat jobs without probe |
| **Dial indicator (sweep / pickup)** | ±0.005-0.010 mm | 2-5 min | $50-300 indicator, $50 magnetic base | Indicating off a hole / boss / shaft; setups already torqued; verifying fixture repeatability |
| **Work probe (touch-trigger, Renishaw OMP40 / Blum) + G65 macros** | ±0.002-0.005 mm | 15-60 s per cycle (auto) | $3000-15000 probe + receiver + integration | Production, lights-out, pallet systems, multi-axis WCS |
| **Laser / optical (vision system)** | ±0.001-0.005 mm | 5-30 s | $5000-30000 system + setup | Tool-presetting (not part-zero), high-precision part recognition |
| **Tool-set (Z-axis touch-off block)** | ±0.005-0.010 mm | 15-30 s | $50-200 block | Z-zero on parts where face is uncertain; first-piece Z-verify |

### Pick by accuracy required

| Print tolerance class | Setup accuracy needed (≤ 1/3 of tolerance per ISO 14253) | Method |
|---|---|---|
| ±0.05 mm (IT12) and looser | ±0.015 mm | Edge finder OR indicator |
| ±0.025 mm (IT10-IT11) | ±0.008 mm | Indicator OR cheap probe |
| ±0.010 mm (IT8-IT9, class M-N) | ±0.003 mm | Probe + macro cycle |
| ±0.005 mm (IT7 or tighter) | ±0.0015 mm | Probe + multi-point cycle + thermal-stable conditions |
| ±0.002 mm (ultra-precision) | ±0.0006 mm | Laser / vision + temperature-controlled environment |

If your method's repeatability ≥ 1/3 of the part tolerance, you've consumed > 1/3 of the budget at setup — measure your remaining error budget *before* any cutting drift. ISO 14253 says > 1/3 means the setup process itself is the dominant uncertainty.

### Pick by what features the part offers

- **Flat face only (no hole, no boss)** → edge finder on the X+ and Y+ sides; indicator-sweep won't help without a feature to sweep
- **Single hole / bore** → indicator pickup on the hole (sweep until needle deflection minimized); OR probe cycle G65 P9814 (4-point bore center)
- **Pair of holes** → probe both, compute X-Y from the line between them (more accurate than single-feature; rotation correction included)
- **External boss / shaft** → indicator sweep on the OD; OR probe G65 P9823 (4-point external)
- **Cast or rough skin** → datum-target buttons + indicator (skin varies too much for direct edge-finding); OR probe with extra-large `mid` tolerance and average multiple touches
- **Pre-machined fixture interface** → trust the fixture's locating pins/dowels; verify with one probe cycle on a known feature (sanity check, < 10 s)

### Probe macro reference (Renishaw OMP-style, common on Haas/Fanuc/Siemens)

```
G65 P9810 X__ Y__ Z__ F__  — single surface (X or Y or Z face)
G65 P9811 X__ Y__ Z__ F__  — single surface, no compensation
G65 P9812 X__ Y__ Z__ F__  — web (between two parallel faces, sets midpoint)
G65 P9814 D__ Z__ F__      — bore / pocket (4-point inside, sets center)
G65 P9815 D__ Z__ F__      — boss / shaft (4-point outside, sets center)
G65 P9816 X__ Y__ R__ Z__  — diagonal corner (sets X+Y from two faces in one cycle)
G65 P9820 — auto-update G54..G59 from probed result (instead of just reading)
```

Convention: D__ = diameter, F__ = feedrate (typically F10-F100 for touch contact). The macros write back to the active WCS (G54 default) or to the WCS you select. Always confirm `#1110-#1115` system variables hold the values you expect post-cycle.

### When to skip the probe and indicate manually

Probes seem like always-better, but the floor knows otherwise:
- **First cut on a new fixture** → indicator-sweep both the fixture AND the part's first-piece. The probe trusts the WCS the fixture defines; if the fixture is wrong, the probe inherits the wrong.
- **Single-piece prototype** → setup time amortizes worse on probe. Edge-finder + indicator is faster wall-clock.
- **Part with no probable surface** → e.g. a curved blade where every face is non-orthogonal; probe macros struggle. Indicator on a datum-target button beats a complex multi-point probe sequence.
- **Probe is overdue for calibration** → an uncalibrated probe with 0.020 mm bias is worse than an edge-finder. Check the probe's last cal date *before* using it.
- **Thermal warm-up incomplete** → < 30 min after machine start, the spindle + Z-column are drifting. A 30 s probe cycle samples the wrong state. Manual indicator with thermal warm-up tolerates this better.

### Edge-finder technique (still load-bearing in 2026)

```
1. Mechanical (cylindrical pointer): rotate at 800-1200 RPM; jog toward part at < 0.05 mm/s; the pointer "kicks" sideways at contact = touch point
2. Electronic: contact closes a circuit, LED/buzzer indicates; jog at < 0.05 mm/s for repeatability
3. After contact, retract; offset by (finder_radius + 0 mm) for the kick method; (finder_radius) only for electronic since it stops AT touch
4. Repeat on the opposite face; halfway between = part center for that axis
```

The pointer-kick method has been around since the 1950s and still produces ±0.010 mm on a steady hand. Practice on scrap until the kick is unmistakable.

### Anti-patterns from the floor

- **"Probe is always more accurate."** No — only if calibrated within 30 days, only if the part has a feature the probe can find, only if the macro is parameterized correctly. An uncalibrated probe ships sub-spec parts confidently — worse than a known-imprecise edge-finder.

- **"Zero on the corner, save time."** Corners are the *worst* place to zero — the corner radius (cast/forged edge, even machined edges have a 0.01-0.05 mm break) introduces 0.02-0.05 mm of error vs a flat face. Zero on a flat 5 mm in from the edge, then offset by 5 mm; far more repeatable.

- **"Skip warm-up, it's fine."** Cold machine → spindle thermal drift = 0.01-0.05 mm over the first 30 min. Set zero, cut after 20 min, the WCS you set is no longer accurate. Either warm up or re-probe after warm-up.

- **"I trust the operator did it right last shift."** First piece of every shift, verify. The previous operator's zero is *their* zero; the WCS that was right for their setup may be wrong for any change in their absence (tool length offset, tip wear, indicator drift).

- **"Edge-finder is for amateurs."** It's a tool with its envelope. Used in its envelope (±0.005-0.020 mm), it's faster than probe + cheaper than indicator. Snobbery isn't a workholding strategy.

### Tie-ins

- [[part-setup-multi-op-planning]] — each setup needs its own zero-strategy decision; pick per setup, not per shop
- [[machining-tactics-pre-cut-prep]] — step 3 of the pre-cut sequence (verify WCS) consumes this entry's output
- [[workholding-locators-and-soft-jaws]] — fixture locators define what feature the zero-method probes/indicates; soft-jaw bore is the most common feature-pickup target
- [[operation-ordering-datum-sequencing]] — zero must reference the print's datum frame, not arbitrary surfaces; the method picks how you find that frame

## Provenance

Distilled from the 421 part-setup tips in the 4245-tribal corpus + Machinery's Handbook 31e §Setting Work Coordinates §Probing + Renishaw Probing Application Guide (G65 P98xx macros) + Haas / Fanuc / Siemens controller manuals. Authored 2026-05-21 by slot:hotel under U-WIKI-PARTSETUP-ZERO — second canonical part-setup entry, sibling to [[part-setup-multi-op-planning]]. Closes the part-setup category's coverage gap (now 2 entries: multi-setup planning macro-level + zero-strategy operator-level).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `probe`, `edge finder`, `dial indicator`, `set zero`, `G54`, `G65`, `P9810`, `P9814`, `P9815`, `Renishaw`, `OMP40`, `work probe`, `touch-off`, `WCS`, `set work coordinate`, `zero method`, `pickup hole`, `sweep` keywords. Zero wiring required.

## Cross-references

- [[part-setup-multi-op-planning]] — sibling; this entry handles per-setup zero, that handles multi-setup orchestration
- [[machining-tactics-pre-cut-prep]] — pre-cut step 3 verifies what this entry sets
- [[workholding-locators-and-soft-jaws]] — features the zero method picks up on are defined here
- [[operation-ordering-datum-sequencing]] — zero must match the print's datum frame
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; part-setup now has 2 canonical entries
- [[feedback_do_optional_high_roi_work]] — standing rule honored
