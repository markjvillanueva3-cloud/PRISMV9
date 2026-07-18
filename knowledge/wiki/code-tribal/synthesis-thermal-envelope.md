---
schema: ideablock-v1
title: "Thermal envelope — heat partition, dimensional drift, coolant role across the system"
domain: "Cross-category synthesis"
category: machining-tactics
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Cutting Heat + §Thermal Expansion
  - M. C. Shaw — "Metal Cutting Principles" (heat partition theory)
  - Sandvik Coromant — Thermal analysis application guide
  - Renishaw + Heidenhain thermal compensation manuals
  - 4245-tribal corpus thermal subset across categories
extracted_via: human-authored
extracted_at: 2026-05-21T06:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-SYNTH-THERMAL)
---

## Question

Where does the heat go, what is it dimensionally costing me, and which thermal limit do I hit first?

## Answer (canonical — partition heat, predict drift, pick the limiting envelope)

### Heat partition during cutting (Shaw, 1989)

```
Q_total = F_c × v_c              (cutting power = force × velocity)

Distribution (typical for steel, P-group, dry):
  60-75 % → chip      (left the cut with the chip)
  10-20 % → tool      (rake + flank wear-accelerator)
  10-20 % → workpiece (thermal expansion + thermal-driven distortion)
   5-10 % → environment (radiation + convection, negligible short-term)
```

**With flood coolant** the workpiece + tool fractions drop to ~5-10 % each; the chip + coolant carry the difference. **With MQL** the chip carries ~70 % unchanged but the tool's coating + the part absorb more (tool fraction up to 25-30 % is common). **Dry cutting** maximizes part heating — the workpiece fraction may exceed 30 %.

This 4-way partition explains why coolant strategy is downstream of cut force, not parameter-set-and-forget — the heat is *going somewhere*, and whichever link can't absorb it becomes the limit.

### Thermal expansion arithmetic (the dimensional cost)

For each link in the system, dimensional change per °C of temperature rise:

| Component | Thermal expansion α (×10⁻⁶ /°C) | ΔL per °C per meter |
|---|---|---|
| Steel workpiece | 11-13 | 11-13 μm |
| Cast iron | 10-11 | 10-11 μm |
| Aluminum 6061-T6 | 23 | 23 μm |
| Titanium 6Al-4V | 8.6 | 8.6 μm |
| Inconel 718 | 13 | 13 μm |
| Carbide tool | 4.5-6.5 | 4.5-6.5 μm |
| Machine column (cast iron) | 10-11 | 10-11 μm |
| Machine ball-screw (steel) | 11-13 | 11-13 μm |

**Worked example — 500 mm steel part heats from 22 °C ambient to 35 °C during machining:**
```
ΔL = 500 mm × 13 × 10⁻⁶ /°C × 13 °C = 0.085 mm ≈ 85 μm
```

A part dimension cut at 35 °C will measure 85 μm shorter when it cools to ambient. For a tolerance-class-M part (±50 μm), this **exceeds the tolerance budget on its own** — heat alone makes the part out-of-spec. The fix: measure at ambient (post-cool), OR cut to oversize by the thermal delta, OR run the machine in a temperature-controlled cell.

### Tool-side thermal limits (the coating breaks first)

Every coating has a maximum service temperature; past it, the coating oxidizes / spalls / loses hardness:

| Coating | Service ceiling (°C) | What fails first when exceeded |
|---|---|---|
| Uncoated carbide | ~600 | Co-binder softens, edge plastic-deforms |
| TiN | ~500 | Coating oxidizes, exposes carbide |
| TiCN | ~400 | Carbon diffuses out (lower than TiN ceiling on heat!) |
| TiAlN | ~800 | Al₂O₃ oxide layer protects up to spec; past it, base coating fails |
| AlTiN | ~1000-1100 | Optimized for high-heat / MQL / dry; the highest envelope |
| Diamond (CVD) | ~700-800 (in air); fails catastrophically on ferrous at any temp via C-Fe reaction | — |

The **chip-color thermometer** (see [[machining-tactics-chip-control-and-evacuation]]) is the operator's real-time read of where in this envelope they sit:
- Straw / gold chips → ~400 °C → safe for all coatings except TiCN
- Blue chips → ~500-600 °C → TiAlN-rated only
- Purple/black → past TiAlN service envelope; AlTiN or accept rapid wear

### Workpiece thermal envelope (drift, warp, stress)

Heat into the workpiece doesn't just expand it — it can:

1. **Thermal warp** — non-uniform heating across the part bends it. Cutting one side hot + clamped side cold ⇒ post-release, the part is bowed.
2. **Phase-transition risk** in steels (above ~600 °C in plain carbon, ~720 °C in higher-alloy) — local microstructure change, white-layer formation, brittle skin.
3. **Material-strength loss** at temperature — aluminum loses strength above 200 °C, plastic above 80-150 °C depending on polymer. The clamp force that was safe cold becomes inadequate hot.
4. **Coolant flashing** — water-based coolants flash at the cutting zone above ~120 °C local, leaving a steam barrier that *insulates* the cut from cooling. Heat now spikes.
5. **Residual stress redistribution** — heat relaxes part of the rolled / forged stress. The part moves dimensionally over hours / days after the cut.

Each is a different failure mode with a different fix. The synthesis: heat the workpiece evenly, or not at all.

### Machine thermal envelope (the slow drift)

Even when coolant absorbs cut heat, the machine itself warms up:
- **Spindle thermal growth**: 5-50 μm Z drift per °C of spindle bearing temperature rise. A cold start → 30-min warm-up → 0.020-0.050 mm Z drift. Programs that ran clean at minute 30 may drift at minute 5.
- **Column thermal**: ambient temperature swings of 5 °C across a shop floor produce 0.025-0.050 mm column tilts on 500-1000 mm tall machines.
- **Ball-screw thermal**: extended axes warm under continuous motion; 10-20 μm/m of feed-axis drift per °C of screw temperature.

**Mitigations:**
- Warm-up cycle before precision work (15-30 min spindle + axis exercise)
- Thermal compensation via probe cycles (re-zero at intervals)
- Renishaw / Heidenhain spindle-thermistor feed (auto-comp Z based on bearing temp)
- Temperature-controlled cell (precision work only — ±1 °C ambient)

### The "thermal envelope" diagnostic

When precision is failing and rigidity is not the suspect, walk the thermal chain:

```
1. Chip color   → tool thermal envelope OK?
2. Part touch   → workpiece thermal envelope OK?  (warm but not hot = OK; hot = part-distortion risk)
3. Spindle temp → machine thermal envelope OK?    (probe Z drift since cycle start)
4. Coolant temp → cooling capacity OK?            (sustained high-MRR depletes coolant tank)
```

The link with the highest temperature relative to its limit is the bottleneck — and the fix depends on which it is (coolant ↑, Vc ↓, coating ↑, warm-up cycle, cooling cell).

### Coolant role across the partition

Coolant doesn't equally help every link:

| Coolant target | What it does |
|---|---|
| Coolant on the chip | Carries heat away from the cut (the 60-75 % portion) |
| Coolant on the tool | Cools rake/flank — extends tool life by reducing crater/flank wear via temperature drop |
| Coolant on the workpiece (away from cut) | Stabilizes workpiece temp; reduces thermal warp |
| MQL | Lubricates (reduces friction heat) but doesn't evacuate heat — for low-heat regimes only |
| Dry / air | Tool + workpiece soak the heat; only for low-heat materials or specific applications (graphite, cast iron) |
| Cryogenic (LN₂) | Extreme — drops chip temp to -100 °C+ effective; tool life extreme in Ti / Inconel; cost barrier |

**Coolant aim matters as much as volume** — see [[machining-tactics-chip-control-and-evacuation]] for the coolant-aim discipline. Cold coolant blasting the wrong spot is wasted; warm coolant on the right interface is effective.

### Anti-patterns from the floor

- **"Aluminum doesn't need coolant."** Sometimes — but at high MRR (Al at 1000 m/min Vc), the chip flashes off so much heat that the workpiece + tool soak it back at the next pass. Coolant cools both, even on Al. Skip only for light operations.

- **"Cold start is fine, the machine compensates."** Modern machines with thermistor feed *can* compensate — IF activated AND IF the tool the spindle has installed is calibrated. Default-off in many shops. Test: cut a check feature at minute 0 + minute 30; if they differ by > 0.02 mm, compensation is off or inactive.

- **"More coolant always helps."** Past the aim-and-volume sufficient point, more coolant is just spray. The marginal heat extracted per extra GPM drops to near-zero; the marginal mess + filter load is real.

- **"The chip color is just a chip color."** It's a thermometer. Reading it is free; ignoring it accumulates damage tools can't recover from.

- **"Thermal expansion only matters in big parts."** A 100 mm part heating 10 °C still moves 13 μm — past the ±0.005 mm tolerance class. For *any* tight-tolerance work, thermal contribution is real.

### Tie-ins (this entry connects across all 5 categories)

- [[machining-tactics-chip-control-and-evacuation]] — chip-color thermometer + coolant aim
- [[machining-tactics-in-cut-adjustments]] — heat-related in-cut signals + adjustments
- [[machining-tactics-pre-cut-prep]] — thermal warm-up cycle
- [[tooling-selection-by-material-and-feature]] — coating service ceilings
- [[tooling-tool-life-and-wear-management]] — Taylor exponent `n` is thermally-driven
- [[tooling-toolholders-and-runout-control]] — shrink-fit holders need induction heating (process thermal)
- [[part-setup-multi-op-planning]] — measure-at-ambient discipline
- [[part-setup-zero-strategy]] — re-zero after warm-up
- [[workholding-locators-and-soft-jaws]] — thermal grip-force loss in hydraulic chucks
- [[synthesis-rigidity-envelope]] — sibling synthesis; rigidity + thermal are the two big cross-category limits

## Provenance

Distilled from cross-category synthesis of thermal-relevant tips in the 4245-tribal corpus + Machinery's Handbook 31e §Cutting Heat §Thermal Expansion + Shaw "Metal Cutting Principles" + Sandvik Thermal Analysis Guide + Renishaw + Heidenhain thermal-comp manuals. Authored 2026-05-21 by slot:hotel under U-WIKI-SYNTH-THERMAL — **18th canonical entry**, **second cross-category synthesis** of the wiki+tribal high-ROI pivot. Filed under machining-tactics for `category:` but cross-cuts all 5 categories. Sibling to [[synthesis-rigidity-envelope]] — the two synthesis entries together cover the two fundamental system limits (force / rigidity AND heat / thermal).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `thermal`, `heat`, `thermal expansion`, `thermal drift`, `chip color`, `spindle thermal`, `machine warm-up`, `coolant temperature`, `cooling capacity`, `phase transition`, `flash boiling`, `thermal warp`, `residual stress`, `cryogenic`, `MQL`, `dry cutting`, `Shaw partition`, `heat partition` keywords. Zero wiring required.

## Cross-references

(see Tie-ins above — 10 sibling entries cross-referenced; this is the thermal counterpart to the rigidity-envelope synthesis)

- [[synthesis-rigidity-envelope]] — sibling synthesis; force/rigidity + heat/thermal are the two universal cross-category limits
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record this entry continues
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; second cross-category synthesis shipped
- [[feedback_do_optional_high_roi_work]] — standing rule honored
