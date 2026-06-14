---
schema: ideablock-v1
title: "Tool life + wear management — Taylor curve in practice, replacement strategy, cost-per-part"
domain: "Tooling selection"
category: tooling-selection
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Machinery's Handbook 31e §Tool Life + §Tool Wear
  - Sandvik Coromant — Tool life optimization guide
  - F. W. Taylor (1907) "On the Art of Cutting Metals" — original Taylor equation
  - Kennametal + Iscar wear-mode charts
  - 4245-tribal corpus tooling-selection subset (n=625)
extracted_via: human-authored
extracted_at: 2026-05-21T03:50:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-TOOLLIFE-WEAR)
---

## Question

When do I change the tool — and how do I decide between time-based, condition-based, or sister-tool strategies?

## Answer (canonical — read wear, predict life, manage replacement)

### Taylor's equation — the load-bearing tool-life law

Frederick W. Taylor's 1907 formula still governs every modern cutting tool's life prediction:

```
V × T^n = C
```

| Symbol | Meaning | Range |
|---|---|---|
| `V` | Cutting velocity (m/min) | 30–500 mill, 100–800 turn |
| `T` | Tool life (min) at that velocity | 5–120 production targets |
| `n` | Taylor exponent (material × tool grade × geometry) | 0.10–0.45 |
| `C` | Constant (calibration) | 100–500 depending on units + alloy |

**The leverage:** because `n` < 1, *small* changes in V produce *large* changes in T. A 20 % cut in V can double life on tough alloys; a 20 % increase can halve it. This is why "just run it faster" usually loses money — the tool-life penalty exceeds the cycle-time gain.

Worked example — turning 1045 steel with TiAlN-coated carbide:
- `n = 0.25`, `C = 250` (Sandvik chart)
- At `V = 200 m/min`: `T = (250 / 200)^(1/0.25) = 1.25^4 ≈ 2.44 min` → 2.4 min life
- At `V = 250 m/min`: `T = (250 / 250)^4 = 1^4 = 1.0 min` → 1.0 min life
- 25 % more speed → 60 % less life

If your CAM-generated cycle takes 1.5 min and you push V from 200 → 250, you went from 1.6 parts/tool to 0.67 parts/tool — **insert cost per part jumped 240 %**.

Canonical values for `n` and `C` per material/grade combo live in `physics/constants.ts` and are queryable via `prism_calc:tool_life` / `prism_calc:cutting_data_recommend`. **Never inline these — the table is authoritative.**

### Wear modes — what you're looking at when the insert comes out

Each wear mode has a distinct visual signature, a distinct root cause, and a distinct fix:

| Wear mode | What it looks like | Root cause | First fix |
|---|---|---|---|
| **Flank wear (Vb)** | Uniform whitening / scratching on the flank face below the cutting edge | Normal abrasive wear, the default mode | Reduce V slightly; the steady-state mode — expected, just don't let it exceed criterion |
| **Crater wear (KT)** | Concave cup on the rake face, behind the edge | Diffusion at high temperature — chip rubs and chemically erodes the rake | Reduce V; switch to coating with better thermal stability (TiAlN > TiN) |
| **Built-up edge (BUE)** | Silver chunky welded mass on the rake; chip sticks then breaks free, lumpy | Material smears at low-to-mid Vc; cold welding | Increase V to break the BUE band; flood coolant; sharper edge |
| **Built-up layer (BUL)** | Smooth thin film on the rake — finer than BUE, harder to spot | Same as BUE but lower amplitude; transitional mode | Same as BUE; usually less harmful, monitor |
| **Notch wear (V_N)** | Localized notch at depth-of-cut line on the cutting edge | Work-hardened skin or oxidation at the air-chip-tool boundary | Vary DOC slightly between passes; switch to tougher grade |
| **Chipping** | Small fragments missing from the edge; ragged outline | Mechanical shock — interrupted cut, hard-spot, recovery from chatter | Stronger edge prep (T-land), tougher grade, eliminate the shock source |
| **Plastic deformation** | Edge looks bent / smeared / depressed — entire edge shape distorted | Thermal softening at high V × high f together; insert can't hold its geometry | Drop V or f; switch to harder substrate; check chip color — usually purple/blue |
| **Thermal cracking (comb cracks)** | Series of perpendicular cracks across the cutting edge, parallel to each other | Thermal cycling — milling (in-and-out cuts) at high speed | Reduce V; constant-engagement strategy; check coolant flooding consistency |
| **Catastrophic failure** | Edge gone, large chunks broken away, often with insert seat damage | Tool exceeded its limit — multiple modes compounded, or a single big shock | DO NOT just replace and continue — find the root cause first |

### Wear-criterion thresholds (standard limits per ISO 3685)

Replace the insert when wear reaches:

```
Vb (flank wear)      = 0.30 mm (roughing) or 0.15 mm (finishing)
KT (crater depth)    = 0.06 + 0.3 × f  (mm)    [f = feed-per-rev]
V_N (notch wear)     = 1.0 mm (roughing)
```

These are *visible* limits — you can measure with a 10× loupe + scale. Past these, surface finish degrades and the next failure mode (typically chipping or plastic deformation) accelerates.

### Replacement strategy — 3 paradigms

| Strategy | When to use | Pro | Con |
|---|---|---|---|
| **Time-based** ("change every N minutes") | High-volume production, consistent material, known Taylor curve | Predictable, no inspection time | Wastes life if your `n` was conservative; doesn't catch early failures |
| **Condition-based** ("change at Vb 0.30") | Variable material (cast skin, second-op stock), tight finishes | Maximizes life, catches anomalies | Requires operator scoping; risk of running past criterion |
| **Sister tool** (auto-switch to backup at expiration) | Lights-out production, multi-shift, expensive jobs | Hands-off, predictable, can't run a known-dead tool | Requires CAM + post + magazine setup; doubles crib slots per tool |
| **Predictive (broken-tool + wear sensor)** | High-value parts, in-process monitoring available | Catches breakage before damage propagates | Sensor cost + integration; false positives kill throughput |

**Rule of thumb:** production runs > 50 parts → time-based with documented `T` from a tool-life trial. < 50 parts or variable conditions → condition-based with operator scoping. Lights-out production → sister tool. Aerospace / high-value → predictive.

### Cost-per-part calculation (the operator's real metric)

```
cost_per_part = (cycle_time × machine_rate)
              + (insert_cost / parts_per_insert)
              + (changeover_time × machine_rate / parts_per_insert)
```

A faster cycle that doubles insert cost per part can still WIN on cost if the cycle-time savings exceed the insert + changeover deltas. Example:
- Slow: 3 min/part × $75/h ($1.25/min) = $3.75/part + $4 insert / 40 parts ($0.10) + 5 min change / 40 parts ($0.16) = **$4.01/part**
- Fast: 2 min/part × $1.25/min = $2.50 + $4 insert / 20 parts ($0.20) + 5 min change / 20 parts ($0.31) = **$3.01/part**

The "faster" run is $1/part cheaper despite 2× the tool wear — *because the machine rate dominates*. This calculation should drive cycle-speed decisions; "save the tool" is not a real metric in most production contexts.

The flip: lights-out / overnight, machine_rate effectively drops to electricity-only (~$5/h), and now tool cost per part dominates. Same job, different shift, different answer. `prism_business:roi_log` and `prism_business:tool_roi_analyze` automate this.

### Anti-patterns from the floor

- **"Run it until it breaks."** Catastrophic failure damages the part being cut AND often the insert seat in the holder. The savings from one extra part-per-tool are wiped out by one $20 seat repair or one $200 scrapped part.

- **"All inserts wear at the same rate."** No — runout, lot variation in tool grade, and tool-to-tool process variation produce 30-50 % spread in life. A *single* tool-life trial calibrates `T` for one piece; production sees the population. Plan for the 10th-percentile life, not the mean.

- **"Tool change time doesn't matter — operator does it."** It does. A 5-min change × 8 changes/day × 250 days × $75/h ≈ $12,500/year per machine. Sister-tool or auto-change strategies pay for themselves quickly.

- **"This is a hard material, I'll just go slow."** Sometimes — but Taylor's curve has a *minimum cost* point, not a "slower is always cheaper" relationship. Below the optimum V, you wear the tool *more* per part because you spend longer in contact at low V's slow heat-removal regime. There's a V-floor on tool life too.

- **"Just buy more inserts."** Sometimes the right call — but check if the *wear mode* is normal first. Chipping or plastic deformation says "wrong tool / wrong V/f", not "buy more inserts". Buying more inserts of the wrong choice = throwing money at a structural problem.

### Tie-ins

- [[tooling-selection-by-material-and-feature]] — selecting the right tool prevents 80 % of premature wear; this entry handles the other 20 % when wear inevitably happens
- [[machining-tactics-in-cut-adjustments]] — in-cut wear signals (chip color, sound) connect to this entry's wear modes
- [[operation-ordering-rough-finish-sandwich]] — different wear-mode tolerances rough vs finish (rough Vb 0.30 vs finish 0.15)

## Provenance

Distilled from the 625 tooling-selection tips in the 4245-tribal corpus + Machinery's Handbook 31e §Tool Life §Tool Wear + Sandvik tool-life guide + Taylor (1907) original equation + Kennametal/Iscar wear-mode charts + ISO 3685 wear-criterion standard. Authored 2026-05-21 by slot:hotel under U-WIKI-TOOLLIFE-WEAR — second canonical tooling-selection entry, sibling to [[tooling-selection-by-material-and-feature]] (selection prevents wear; this entry manages it). 5/5 categories at 1+ entries, this is the first depth-pass.

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `tool life`, `Taylor curve`, `flank wear`, `crater wear`, `BUE`, `notch wear`, `chipping`, `plastic deformation`, `thermal crack`, `Vb`, `KT`, `sister tool`, `cost per part`, `replacement strategy`, `wear criterion` keywords. Zero wiring required.

## Cross-references

- [[tooling-selection-by-material-and-feature]] — sibling; selection is preventive, wear management is corrective
- [[machining-tactics-in-cut-adjustments]] — in-cut wear-mode signals (chip color, BUE) map directly to this entry's wear-mode table
- [[operation-ordering-rough-finish-sandwich]] — different Vb criterion rough vs finish
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit; tooling-selection now has 2 canonical entries
- [[feedback_do_optional_high_roi_work]] — standing rule honored
