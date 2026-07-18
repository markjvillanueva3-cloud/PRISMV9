---
schema: ideablock-v1
title: "First-article inspection + SPC cadence — the measurement triple's production-discipline link"
domain: "Quality control"
category: quality-control
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - AS9102 (Aerospace First Article Inspection Requirement)
  - ISO 9001 §8.6 (Release of products) + ISO 13485 §7.5.6 (Medical device)
  - PPAP (Production Part Approval Process) — AIAG automotive
  - ISO 7870 SPC standards + Western Electric Statistical Quality Control Handbook (Nelson rules)
  - Machinery's Handbook 31e §SPC + §Process Capability
  - 4245-tribal corpus inspection subset
extracted_via: human-authored
extracted_at: 2026-05-21T08:40:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-QUALITY-FAI-SPC)
---

## Question

When is first-article inspection required, what's the right SPC cadence, and how do Cp/Cpk/Pp/Ppk differ?

## Answer (canonical — FAI is the production-discipline final link in the measurement triple)

### The measurement triple

| Stage | When | Tool | Purpose |
|---|---|---|---|
| Setup probing ([[part-setup-zero-strategy]]) | Before cycle | Touch-probe / edge-finder | Establish WCS / TLO baseline |
| In-process probing ([[machining-tactics-in-process-probing]]) | Between operations | Spindle-mounted probe | Mid-cycle drift compensation |
| **First-article + SPC** (this entry) | After part complete | CMM / micrometer / height gauge / surface profilometer | Per-part conformity verification |

Each layer catches different drift; together they bound the tolerance budget over a production run.

### First-article inspection (FAI) — when required + what it includes

| Industry | Standard | When triggered |
|---|---|---|
| Aerospace | AS9102 | New part / engineering change / production gap > 24 mo / facility change |
| Automotive | PPAP (AIAG) | New part / engineering change / lot-supplier change |
| Medical device | ISO 13485 §7.5.6 + 21 CFR 820 | New part / process change / per design control protocol |
| ISO 9001 general | §8.6 (no specific FAI standard) | Per quality plan, supplier-customer agreement |

**The 3-form AS9102 package** (the most rigorous):

- **Form 1** — Part identification: revision, drawing number, customer, supplier, raw material certification.
- **Form 2** — Process material identification: every material / process step with traceability. Includes heat-treat charts, plating thicknesses, coatings.
- **Form 3** — Inspection of all design characteristics: every dimension + GD&T tolerance + note on the drawing receives a ballooned number + inspection result.

For the operator: **Form 3 is the load-bearing one**. A drawing with 47 dimensions becomes a 47-row table where each row reads: balloon number, characteristic, nominal, ± tolerance, measured value, gauge used, pass/fail.

### The "ballooning" discipline

1. Print the drawing at full scale.
2. Place a numbered balloon next to every dimension + every tolerance callout (GD&T frame, surface finish, note).
3. Build the Form 3 table with one row per balloon.
4. Cross-check: every drawing feature → exactly one balloon. Missing → measurement gap; duplicate → false-confidence.

Modern CAM packages (Fusion 360, Mastercam, hyperMILL) generate ballooned drawings automatically; doing this by hand for legacy parts is the bottleneck — budget 1-2 hours per complex aerospace part.

### SPC cadence selection

After FAI passes, ongoing production uses sampling — every-part inspection is rarely economic. The cadence:

| Cadence | When | Sampling math |
|---|---|---|
| **100 % inspection** | Safety-critical (aerospace flight-control, medical implant), cost-sensitive (single feature dimensions a $5k part) | All parts measured |
| **Every Nth part** (every 5 / 10 / 20) | High-volume CNC production, stable process | AQL 0.65-1.0 % typical |
| **First + every Nth + last** | Pallet / multi-part fixture | Detects setup drift + tool wear |
| **First-piece + each tool change** | Lights-out with sister tools | Tied to tool-life cycle |
| **Random sampling** (X̄-R chart) | Continuous production, large lot | ISO 7870 sampling plans |

The decision driver: **cost of scrap × failure probability** vs **inspection cost per part**. A $50 inspection on a $5 part is overkill; a $5 inspection on a $5000 part is essential.

### Cp / Cpk / Pp / Ppk — the four numbers + what they actually mean

**Cp** (process capability): `Cp = (USL - LSL) / 6σ_within` — how wide the tolerance is vs the process's *within-subgroup* spread. Ignores centering.

**Cpk** (process capability index): `Cpk = min[(USL - μ) / 3σ_within, (μ - LSL) / 3σ_within]` — accounts for both spread AND centering. The smaller of the two distances to spec.

**Pp** (process performance): `Pp = (USL - LSL) / 6σ_total` — same as Cp but uses *total* spread (including between-subgroup variation).

**Ppk** (process performance index): same as Cpk but with σ_total.

**Reading the numbers:**
- Cpk < 1.0 → process produces out-of-spec parts (3σ of tail past spec)
- Cpk = 1.33 → standard industry target (4σ of tail past spec)
- Cpk = 1.67 → safety-critical target (5σ)
- Cpk = 2.0 → Six Sigma (6σ)
- Cp > Cpk → process is off-center; centering will improve Cpk without reducing spread
- Pp < Cp → between-subgroup drift; tool wear / thermal / fixture creep dominates over within-subgroup noise

The operator's interpretation: **Cpk tells you what's happening within an hour of cutting; Ppk tells you what's happening across an 8-hour shift.** A Cpk = 1.67 / Ppk = 1.20 means the process is capable but drifting — investigate thermal, fixture, tool-wear sources.

### Western Electric / Nelson rules for SPC charts

When X̄-R or X-MR charts trigger an "out-of-control" signal:

1. One point > 3σ outside control limits.
2. 9 points in a row on same side of centerline.
3. 6 points in a row trending up or down.
4. 14 points in a row alternating up + down.
5. 2 of 3 consecutive points > 2σ on same side.
6. 4 of 5 consecutive points > 1σ on same side.
7. 15 points in a row within 1σ (process is *too good* — usually means the gauge is broken or measurements are being rounded).
8. 8 points in a row > 1σ from centerline on either side.

Rules 1-4 are the must-act; rules 5-8 are diagnostic. ISO 7870 + Western Electric SQC Handbook are the canonical sources.

### Anti-patterns from the floor

- **"FAI is a one-time thing."** It's per-revision. A revision change (drawing rev B → C) triggers a new FAI on the FIRST part of the new revision. Skipping → ship out-of-spec parts because the change wasn't measured against.

- **"Cpk = 1.33 is good enough."** It's the *industry default*, not "good enough." For aerospace flight-critical or medical implant, the target is 1.67 or 2.0. For cost-conscious commercial CNC, 1.33 might be excessive — the cost of getting from 1.0 to 1.33 may exceed the scrap cost from running at 1.0.

- **"100 % inspection eliminates scrap."** No — 100 % inspection catches scrap *after* it's made. SPC + process improvement *prevents* scrap. The two are complementary, not substitutable.

- **"My CMM is accurate to 0.001 mm, so my Cpk includes gauge variation."** Only if your Gauge R&R study confirms it. Per ISO 14253-1, the *gauge* must consume < 10 % of the tolerance band — if your CMM repeatability is 0.005 mm and tolerance is ±0.01 mm, the gauge eats 50 % of the budget and Cpk numbers are unreliable.

- **"More frequent sampling = better Cpk."** No — more frequent sampling reveals the *true* process variability that was hidden by sparse sampling. Cpk doesn't change; Ppk often goes DOWN because between-subgroup drift becomes visible. The metric was right; your prior view of the process was optimistic.

- **"Western Electric rules fire too often."** They fire at ~0.27 % per point under truly-stable process (3σ). If they fire at > 1 % per point, the process is NOT truly stable — investigate the assignable cause. The rules are calibrated; if they trip frequently, the chart's right.

### Tie-ins

- [[part-setup-zero-strategy]] — first link of measurement triple (setup probing)
- [[machining-tactics-in-process-probing]] — middle link of measurement triple (in-cycle compensation)
- [[part-setup-multi-op-planning]] — tolerance-transfer RSS budget couples to Cpk / Ppk
- [[machining-tactics-material-removal-economics]] — inspection cost is part of cost-per-part calculation
- [[synthesis-thermal-envelope]] — thermal drift is the largest Ppk vs Cpk divergence driver
- [[machining-tactics-pre-cut-prep]] — prove-out includes first-piece full inspection
- [[index-by-symptom-and-task]] — "part out of tolerance" routing → here

## Provenance

Distilled from the inspection subset of the 4245-tribal corpus + AS9102 + ISO 9001 §8.6 + ISO 13485 + AIAG PPAP + ISO 7870 + Western Electric Statistical Quality Control Handbook + Machinery's Handbook 31e §SPC §Process Capability. Authored 2026-05-21 by slot:hotel under U-WIKI-QUALITY-FAI-SPC — **26th canonical entry** of the wiki+tribal high-ROI pivot. Tier-2 universally-applicable (every shop with QA discipline). **New category: `quality-control`** (first taxonomy expansion since the pivot started; cleaner than forcing it under machining-tactics — the inspection workflow is its own discipline).

System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces on `FAI`, `first article inspection`, `AS9102`, `PPAP`, `Form 3`, `ballooning`, `SPC`, `Cp`, `Cpk`, `Pp`, `Ppk`, `process capability`, `Western Electric rules`, `Nelson rules`, `X-bar`, `gauge R&R`, `sampling plan`, `AQL`, `ISO 7870`, `ISO 14253` keywords. Zero wiring required.

## Cross-references

- [[part-setup-zero-strategy]] — measurement-triple link 1
- [[machining-tactics-in-process-probing]] — measurement-triple link 2
- [[part-setup-multi-op-planning]] — tolerance-transfer × Cpk
- [[machining-tactics-material-removal-economics]] — inspection cost in cost-per-part
- [[synthesis-thermal-envelope]] — Ppk-vs-Cpk thermal driver
- [[machining-tactics-pre-cut-prep]] — first-piece inspection in prove-out
- [[index-by-symptom-and-task]] — out-of-tolerance routing
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule honored
