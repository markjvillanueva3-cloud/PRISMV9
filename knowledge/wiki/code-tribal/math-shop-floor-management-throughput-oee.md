---
schema: ideablock-v1
title: "Shop-floor management mathematics — OEE, throughput, scheduling, queueing, line balancing, ToC"
domain: "Shop-floor management mathematics"
category: shopfloor-math
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - Goldratt "The Goal" (Theory of Constraints)
  - Hopp & Spearman "Factory Physics"
  - Nakajima — OEE / TPM definition
  - Machinery's Handbook 31e §Manufacturing Management
extracted_via: human-authored
extracted_at: 2026-05-21T16:25:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-MATH-SHOPFLOOR)
---

## Question

The quantitative toolkit for running a shop floor — OEE, throughput, queueing, scheduling, line balancing, and the Theory of Constraints math.

## Answer (canonical — measure utilization, find the constraint, schedule to it)

### 1. OEE — Overall Equipment Effectiveness

```
OEE = Availability × Performance × Quality
Availability = run_time / planned_time            (downtime losses)
Performance  = (ideal_cycle × count) / run_time   (speed losses)
Quality      = good_count / total_count           (defect losses)
```
Worked example: Availability 0.90 × Performance 0.95 × Quality 0.99 = **OEE 0.846**. World-class ≈ 0.85; typical shop 0.40-0.60. OEE multiplies — a 0.90 on each of three factors is only 0.73 overall. The factor furthest from 1.0 is where to improve.

### 2. Factory Physics — the fundamental laws

**Little's Law** (the most important — universal, assumption-free):
```
WIP = Throughput × Cycle_Time          →   CT = WIP / TH
```
Work-in-process equals throughput times cycle time. To cut cycle time without adding capacity: cut WIP.

**Critical-WIP** `W₀ = r_b · T₀` (bottleneck rate × raw process time). Below W₀ the line is starved; above it, WIP just adds queue time without adding throughput.

**Best-case** TH = `min(W/T₀, r_b)`; **worst-case** TH = `W/(W₀+W−1)·r_b`. Real lines fall between — the gap is variability.

### 3. Theory of Constraints (Goldratt)

Every system has one constraint (the bottleneck) that limits throughput. The 5 focusing steps:
1. **Identify** the constraint (the slowest resource / largest queue).
2. **Exploit** it — never let the constraint idle or work on scrap.
3. **Subordinate** everything else to the constraint's pace.
4. **Elevate** the constraint (add capacity) — only after 1-3.
5. **Repeat** — the constraint moves once elevated.

**Drum-Buffer-Rope**: the constraint is the *drum* (sets the pace); a time *buffer* protects it from upstream variability; the *rope* releases material upstream only at the drum's consumption rate. An hour lost at the constraint is an hour lost for the whole plant; an hour saved at a non-constraint is a mirage.

### 4. Queueing — why utilization ≠ free

The VUT equation (Kingman's approximation) for queue time at a workstation:
```
CT_q = ( (Cₐ² + Cₛ²)/2 ) · ( ρ/(1−ρ) ) · t_e
```
- `ρ` = utilization (arrival rate / service rate)
- `Cₐ, Cₛ` = coefficients of variation of arrivals + service
- `t_e` = effective process time

The `ρ/(1−ρ)` term **explodes as ρ → 1**: at ρ=0.80 the factor is 4; at ρ=0.90 it's 9; at ρ=0.95 it's 19. **Running a machine at 95 % utilization quadruples queue time vs 80 %.** This is the deepest counter-intuitive result in shop management: chasing 100 % machine utilization destroys lead time. Plan the constraint near 100 %, plan *non*-constraints with slack.

### 5. Scheduling rules

| Rule | Optimizes | Use |
|---|---|---|
| **SPT** (shortest processing time first) | Minimizes mean flow time + WIP | Throughput focus |
| **EDD** (earliest due date) | Minimizes maximum lateness | On-time-delivery focus |
| **Critical Ratio** = time_remaining / work_remaining | Balances both | General |
| **Johnson's rule** | Optimal 2-machine flow-shop makespan | 2-stage sequences |
| **CPM** (critical path) | Project makespan | The longest dependency chain sets the floor |

For a single machine, SPT provably minimizes average completion time. No simple rule is optimal for the general job-shop (NP-hard) — heuristics + dispatching rules.

### 6. Line balancing

Distribute tasks across `N` stations to minimize idle time. **Takt time** = available_time / demand. The theoretical minimum stations = `Σ task_times / takt`. **Balance efficiency** = `Σ task_times / (N · cycle_time)`. The bottleneck station's time = the line cycle time; balancing pulls work off the bottleneck.

### 7. Capacity + utilization

```
Capacity = available_time / cycle_time
Utilization ρ = demand / capacity
Rated capacity must exceed demand AND leave variability slack — see the queueing law.
```

### Anti-patterns

- **"Maximize every machine's utilization."** The queueing law: ρ→1 explodes lead time. Only the *constraint* runs near 100 %; non-constraints need slack. 100 % utilization everywhere = a plant drowning in WIP with terrible lead times.
- **"An hour saved anywhere helps."** An hour saved at a non-constraint is a mirage — the constraint still gates throughput. ToC: improve the constraint, subordinate the rest.
- **"More WIP = more output."** Above critical-WIP, added WIP only adds queue time (Little's Law). Lean's low-WIP is mathematically grounded, not ideology.
- **"OEE 60 % is fine."** Decompose it — a 60 % OEE hides which of Availability/Performance/Quality is the loss. The factor furthest from 1.0 is the lever.
- **"Schedule by gut."** SPT, EDD, critical-ratio each provably optimize a specific objective. Pick the rule that matches the goal (throughput vs on-time).

### Tie-ins

- [[math-business-management-costing-finance]] — cost accounting + the financial side
- [[machining-tactics-material-removal-economics]] — per-part cost feeds the schedule
- [[deep-integration-bridge-pattern]] — the ERP bridge (#11) implements scheduling
- [[print-to-program-pipeline-canonical]] — pipeline stage 18 (lead-time estimate)
- [[quality-first-article-inspection-and-spc-cadence]] — the Quality factor of OEE

## Provenance

Distilled from Goldratt "The Goal" + Hopp & Spearman "Factory Physics" + Nakajima OEE/TPM + Machinery's Handbook 31e §Manufacturing Management. Authored 2026-05-21 by slot:hotel under U-WIKI-MATH-SHOPFLOOR — **53rd canonical entry**, Phase-A mathematical expansion (shop-floor management domain). New `shopfloor-math` category.

System injection: `tribal-by-domain-inject` + `master-index-precheck-inject` auto-surface on `OEE`, `overall equipment effectiveness`, `Little's Law`, `throughput`, `WIP`, `cycle time`, `Theory of Constraints`, `bottleneck`, `drum buffer rope`, `queueing`, `utilization`, `Kingman`, `scheduling`, `SPT`, `EDD`, `Johnson's rule`, `line balancing`, `takt time`, `factory physics` keywords. Zero new wiring required.

## Cross-references

- [[math-business-management-costing-finance]] — financial side
- [[machining-tactics-material-removal-economics]] — per-part cost
- [[deep-integration-bridge-pattern]] — ERP bridge implements scheduling
- [[print-to-program-pipeline-canonical]] — lead-time stage
- [[quality-first-article-inspection-and-spc-cadence]] — OEE Quality factor
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record
- [[feedback_do_optional_high_roi_work]] — standing rule
