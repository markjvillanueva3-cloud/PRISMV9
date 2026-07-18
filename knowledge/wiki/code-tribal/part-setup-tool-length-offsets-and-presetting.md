---
schema: ideablock-v1
title: "Tool-length offsets + presetting — TLO discipline, sister tools, wear comp"
domain: "Part setup"
category: part-setup
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Tool Length Compensation
  - Renishaw "Tool Setting" + Blum-Novotest tool-setter manuals
  - Haas / Fanuc / Siemens controller manuals (G43, G44, G49, H##)
  - 4245-tribal corpus part-setup subset (n=421)
extracted_via: human-authored
extracted_at: 2026-05-21T05:15:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-PARTSETUP-TLO)
---

## Question

How do I manage tool-length offsets so the part doesn't get cut at the wrong Z — and what's the right strategy across single-piece, production, and lights-out?

## Answer (canonical — TLO is the third coordinate system, manage it like one)

### The 3 coordinate systems you're juggling

```
Machine zero (M-zero)  ← absolute, set by home cycle
   ↓ G54 / G55 / G56... (per setup, per WCS)
Part zero (G54)        ← from this entry's sibling [[part-setup-zero-strategy]]
   ↓ G43 H## Z__ (TLO + tool number)
Tool-tip position      ← cutting happens HERE, not at G54 zero
```

Every Z command in the program executes as `G54_Z + TLO_H## + commanded_Z`. Get TLO wrong by 0.5 mm and every Z move is 0.5 mm off — surface scrap on light cuts, spindle crash on heavy.

### The 4 ways to set TLO

| Method | Accuracy | Time/tool | Best for |
|---|---|---|---|
| **Touch-off paper / shim on part** | ±0.05-0.10 mm | 1-3 min | Single-piece prototyping, rough work |
| **Touch-off Z-block on table** | ±0.01-0.03 mm | 30-90 s | Production setup; quick + repeatable |
| **In-machine tool-setter (Renishaw OTS / Blum)** | ±0.005-0.010 mm | 10-30 s (auto via G65 P9023 or M-code macro) | Auto-presetting, lights-out, every tool change |
| **Off-line presetter (optical / contact)** | ±0.001-0.005 mm | 30-60 s but parallel to machining | High-volume production; presets while machine cuts |

**Choosing:**
- Single-piece, < 5 tools → paper or Z-block
- Production, ≥ 5 tools, recurring → in-machine tool-setter
- High-volume, sister tools, lights-out → off-line presetter + tool-number-encoded data

### TLO assignment convention (the load-bearing discipline)

```
T05  ← tool number (calls magazine position)
H05  ← offset register number
D05  ← diameter offset register (for cutter comp G41/G42)
```

**Hard rule:** H## = T## = D## (same index for the same tool). It's the most disciplined controller convention; deviating from it makes magazine debugging a nightmare. The exception is **sister tools** (see below) where H## doesn't equal T##.

### Sister tool strategy

A "sister" is a redundant tool — same geometry, different magazine slot — that auto-replaces the primary when the primary's life expires:

```
T05 = primary endmill (H05 = TLO_primary)
T25 = sister endmill (H25 = TLO_sister)
```

When `T05` life expires (Taylor-curve countdown or operator-flag), the program / controller swaps to `T25`. **Critical**: the sister has its *own* TLO. Even if it's "the same tool", presetter / setup variance produces 0.005-0.020 mm offset between them. Hardcoding `H25 = H05` is the failure pattern that ships a sister-tool-deep part 0.020 mm too deep.

Programming pattern:
```
N100 T05 M6        (call primary)
N105 G43 H05 Z__   (apply primary TLO)
...
N500 #100 = #5021  (read T05 life counter)
N501 IF[#100 GT [#100_max]] GOTO LIFE_EXPIRED
...
N999 GOTO END

:LIFE_EXPIRED
N1000 T25 M6        (call sister)
N1005 G43 H25 Z__   (apply sister TLO — note H25, not H05)
N1010 GOTO N105     (continue program at the right point)
```

Macro-aware controllers do this in fewer lines via tool-life management. Hard rule: when a sister is in service, *its* offset is loaded, not the primary's.

### Tool wear compensation (offset adjustment mid-run)

Tools wear → Z grows shorter (flank wear shortens effective cutting length). Wear offset `H## + wear_delta` reflects current state:

```
Renishaw probe: G65 P9023        — auto-measures, updates H## by Δ
Manual:        Adjust H## directly (G10 L10 P05 R__ — set H05 to absolute value)
SPC trigger:   When measured part shrinks by Δ, advance H## by Δ
```

Update cadence:
- **Every 4 hours** in production = light insurance
- **Every part** in tight-tolerance work
- **Every tool change** automatically when probe is wired
- **On SPC trend** when production is calibrated

Manual updates accumulate errors — typists drift the wear delta by ±0.005 mm every adjustment. Automated probe + macro is the canonical approach above 50-part runs.

### Magazine layout (the planning side of TLO)

| Magazine slot strategy | When |
|---|---|
| **Sequential by program order** | One-job production runs; minimizes ATC time |
| **By family (drills slot 1-10, endmills 11-20, taps 21-25)** | Multi-job machines; operators find tools faster manually |
| **Frequently-used in front slots** | Mixed-volume jobs; reduces ATC index time |
| **Sister tools paired (T05+T25, T06+T26)** | Lights-out + tool-life management; deterministic swap |
| **Tool-presetter encoded** | High-volume; magazine matches preset database automatically |

Layout matters for cycle time but not safety — wrong-tool-in-slot causes crashes regardless of layout strategy. The mitigation is per [[machining-tactics-pre-cut-prep]] step 2 (verify tools in magazine match the tool list).

### Common TLO failure modes + their visual signatures

| Symptom | Likely root cause | Fix |
|---|---|---|
| Whole program cuts 0.5 mm deep | TLO is 0.5 mm short (sensor mis-zero, paper touch-off error) | Re-measure TLO; check Z-block height |
| One tool cuts wrong, others right | That tool's H## is wrong (typo, swapped magazine, presetter error) | Re-preset that one tool |
| Part dimensions drift across the lot | Tool wear not being compensated | Add wear-comp cycle every N parts |
| Sister tool cuts different than primary | H## hard-coded; sister has its own offset | Use unique H## per tool number |
| Probe-cycle update misses by 0.01 mm | Probe stylus damaged or calibration > 30 days old | Re-cal probe, replace stylus if visibly worn |

### Anti-patterns from the floor

- **"Use the same H## for every tool in the magazine."** This is a real anti-pattern seen on emergency setups. Saves no time, costs every cut. H## must be unique per tool. Period.

- **"Skip the touch-off, just use the program's Z."** Programs assume TLO is set. Without TLO set, every Z move is wrong by (tool stickout + holder stickout) — typically 50-200 mm. The first move at G43 retracts to Z+ (safe) or commands Z0 → tool drills into the table. Set TLO before any G43.

- **"TLO doesn't matter for face mills, just the diameter."** Face mills cut on the bottom face — the TLO defines that bottom face position. Wrong TLO → wrong Z → either cutting air or cutting through the part.

- **"Probe-cycle update is for finishing."** Wrong — probe-cycle update is for any tool whose Z accuracy matters AND whose wear is unpredictable. Roughing tools wear too; if you don't compensate, the next finish op's stock is wrong.

- **"Sister tools save tool-change time."** That's not why they exist — they exist so an *unattended* run can continue when the primary expires. If your shift always has an operator, sister tools are luxury; if you run lights-out, they're the difference between a finished batch and a scrap pile.

### Tie-ins

- [[part-setup-multi-op-planning]] — every setup loads tools; TLO per-tool must match the setup's WCS
- [[part-setup-zero-strategy]] — sibling; this entry handles the Z-axis-per-tool offset, that entry handles the per-WCS XYZ zero
- [[tooling-tool-life-and-wear-management]] — sister-tool strategy lives here; Taylor-life triggers the swap, this entry handles the TLO mechanics
- [[machining-tactics-pre-cut-prep]] — step 2 (verify tools) and step 6 (probe TLO) validate this entry's data

## Provenance

Distilled from the 421 part-setup tips in the 4245-tribal corpus + Machinery's Handbook 31e §Tool Length Compensation + Renishaw + Blum-Novotest tool-setter manuals + Haas / Fanuc / Siemens controller G43/G44/G49 documentation. Authored 2026-05-21 by slot:hotel under U-WIKI-PARTSETUP-TLO — third canonical part-setup entry, **closing the 5-category × 3-entries matrix at 15 canonical wiki entries**. Pivot session at iter 20 / target 20 — natural completion point.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `TLO`, `tool length offset`, `H##`, `G43`, `G44`, `G49`, `tool setter`, `Renishaw OTS`, `Blum`, `presetter`, `sister tool`, `tool life management`, `magazine layout`, `tool wear comp`, `wear delta`, `paper touch-off`, `Z-block` keywords. Zero wiring required.

## Cross-references

- [[part-setup-multi-op-planning]] — every setup loads tools; TLO per-tool ties to per-WCS setup
- [[part-setup-zero-strategy]] — sibling; Z-per-tool here, XYZ-per-WCS there
- [[tooling-tool-life-and-wear-management]] — sister-tool Taylor-life triggers; TLO mechanics here
- [[machining-tactics-pre-cut-prep]] — pre-cut steps 2 + 6 validate TLO data
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; part-setup now at 3 canonical entries
- [[feedback_do_optional_high_roi_work]] — standing rule honored; pivot session natural-completed at iter 20/20

## Pivot session summary

This is the **15th canonical wiki entry** of the 2026-05-21 hotel /loop wiki + tribal-knowledge high-ROI pivot. The session closed the last p1 ERP bridge (U-BRIDGE-ERP-SCHED, commits 9918fc663b + b3a8dc315b) then pivoted per operator directive to high-ROI tribal generation + system injection.

**Final matrix (3-3-3-3-3 = 15 canonical entries):**
- **operation-ordering** (4.0 % coverage pre-pivot): hole-sequence · datum-sequencing · rough-finish-sandwich
- **workholding** (4.9 %): clamp-force · locators-and-soft-jaws · multi-part-and-pallet-systems
- **part-setup** (5.1 %): multi-op-planning · zero-strategy · tool-length-offsets-and-presetting
- **machining-tactics** (8.0 %): in-cut-adjustments · pre-cut-prep · chip-control-and-evacuation
- **tooling-selection** (14.7 %): by-material-and-feature · tool-life-and-wear · endmill-flute-helix-corner

~2,200 lines of authored canonical knowledge. Every entry: version_state Current, confidence 0.96–0.97, cited sources (Machinery's Handbook 31e + Sandvik / Kennametal / Iscar / Walter / Helical / Renishaw / Blum + ISO 1832 / 3685 / 14253 / ASME Y14.5-2018), cross-referenced into a knowledge graph, auto-injects on category-specific keywords via existing `tribal-by-domain-inject` UserPromptSubmit hook. **Zero wiring required.** System-injection coverage achieved entirely through the existing hook surface.
