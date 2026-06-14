---
schema: ideablock-v1
title: "INVENTION SPEC — QueueingLeadTimeEngine: utilization + variability → honest lead-time"
domain: "PRISM architecture"
category: invention
version_state: Current
confidence: 0.93
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - [[prism-invention-high-roi-engine-ideas]] (idea E7)
  - [[math-shop-floor-management-throughput-oee]] §queueing
  - Hopp & Spearman "Factory Physics" (VUT / Kingman)
extracted_via: human-authored
extracted_at: 2026-05-21T18:45:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-INVENTION-QUEUEING-SPEC)
---

## Purpose

Phase-B builder-ready spec for invention E7 — `QueueingLeadTimeEngine`. Makes the most counter-intuitive shop-management result actionable: running a machine at 95 % utilization quadruples queue time vs 80 %. Turns the Kingman VUT equation into a lead-time quote + a "back off the utilization" recommendation.

## The problem it solves

Schedulers + estimators quote lead time as `work_content / capacity` — ignoring queue time entirely. Per [[math-shop-floor-management-throughput-oee]] §queueing, queue time *explodes* as utilization → 1 (`ρ/(1−ρ)`: ρ=0.80 → factor 4; ρ=0.95 → factor 19). A shop running hot quotes lead times it cannot meet, then ships late. E7 computes the honest lead time and names the utilization that would fix it.

## Engine contract

```
QueueingLeadTimeEngine.predict(input) → output

input: {
  workstations: {
    id: string
    effectiveProcessTime_min: number       // t_e, including detractors
    arrivalCV: number                      // Cₐ — coeff of variation of inter-arrival times
    serviceCV: number                      // Cₛ — coeff of variation of process time
    utilization: number                    // ρ ∈ (0,1)
  }[]
  jobRouting: string[]                     // ordered workstation ids the job visits
}

output: {
  perStation: { id, queueTime_min, processTime_min, totalTime_min, isHotspot: boolean }[]
  totalLeadTime_min: number
  totalQueueTime_min: number               // the hidden cost
  queueFraction: number                    // queueTime / leadTime — often 0.7-0.9 in a hot shop
  bottleneck: { id, utilization, recommendedUtilization, leadTimeIfBackedOff_min }
  rationale: string
}
```

## The algorithm — Kingman VUT

For each workstation on the route, the queue time (Kingman / VUT approximation):
```
CT_q = ( (Cₐ² + Cₛ²)/2 ) · ( ρ/(1−ρ) ) · t_e
```
- `(Cₐ²+Cₛ²)/2` — the **V**ariability term
- `ρ/(1−ρ)` — the **U**tilization term (the one that explodes)
- `t_e` — the **T**ime term

Total time at a station = `CT_q + t_e`. Lead time = Σ over the routing. The bottleneck = the station with the largest `CT_q`. The **recommended utilization**: solve for the ρ that brings that station's `CT_q` under a target (e.g. halve it) — usually ρ ≈ 0.85 from a hot 0.95.

## Edge cases (handle from line 1)

| Edge case | Behavior |
|---|---|
| ρ ≥ 1.0 | The station is over capacity — queue → ∞. Return `totalLeadTime: Infinity` + flag "station <id> exceeds capacity; lead time unbounded" |
| ρ ≤ 0 | Invalid — throw |
| ρ exactly at a value that makes (1−ρ) tiny | Cap the displayed factor + warn; don't emit absurd finite numbers near the pole |
| CV negative | Invalid — throw (coefficient of variation is ≥ 0) |
| CV = 0 (deterministic) | Valid — the variability term → 0, queue → 0 (an M/D/1-ish ideal). Note: real shops never have CV=0 |
| Empty routing | Throw — no job to route |
| Routing references an unknown station id | Throw — clear error |
| Single station | Valid — degenerates to one VUT term |

## Failure modes anticipated

- **CV estimation is hard** — operators rarely know `Cₐ`, `Cₛ`. Provide defaults by regime: CV ≈ 0.25 (low-variability, automated), 0.75 (typical job shop), 1.5+ (high-variability, breakdowns + rework). Document that the output is only as good as the CV input — and that CV is the dominant lever after utilization.
- **Kingman is an approximation** — exact only for specific arrival/service distributions (it's an interpolation). Good to ~10-20 %; document it as a planning estimate, not a guarantee.
- **Open vs closed network** — Kingman assumes an open network (arrivals independent of the system state). A CONWIP / closed-loop shop needs Little's Law on the WIP cap instead. Document the assumption; flag if the shop is CONWIP.

## Wiring

- Primary: `prism_scheduling:lead_time_estimate` already exists — E7 should *replace or back* its internals with the VUT model (the existing action may be the naive `work/capacity`). Verify, then extend.
- Secondary: `prism_business` (quoting consumes lead time) — wire the honest lead time into `quote_estimate`.
- The bottleneck + recommended-utilization output feeds `prism_scheduling:bottleneck_find` + `resource_balance`.

## ROI

Late delivery is a top customer-dissatisfaction + penalty cost. The naive `work/capacity` estimate is optimistic by the entire queue time — often 70-90 % of the real lead time in a hot shop. An honest lead-time quote that *also* says "you're at 0.95 utilization; back off to 0.85 and lead time halves" converts a hidden structural problem into a scheduling decision. ~120 LOC. Pure math, deterministic.

## VERIFIED 2026-05-21 — existing lead_time_estimate IS naive; E7 confirmed buildable

`schedulingDispatcher.ts` was read. The `lead_time_estimate` action (lines 116-129) is **confirmed naive**:
```
const queue_factor = params.queue_factor || 2.5;   // hardcoded magic constant
const total_lead_min = total_process_min * queue_factor;
```
No utilization, no variability, no Kingman VUT — `queue_factor` is a hardcoded 2.5. This is exactly the "naive work×factor" the spec predicted. **E7 is a confirmed genuine gap.** `duplicationGuard` ran clean — no `QueueingLeadTimeEngine`, no Kingman/VUT engine exists (the `Queue*` engines are job-queue infra).

**Exact build target (the diff for the next window):**
1. NEW `mcp-server/src/engines/QueueingLeadTimeEngine.ts` — Kingman VUT per the contract above (~120 LOC).
2. NEW test `mcp-server/src/__tests__/QueueingLeadTimeEngine.test.ts` — Kingman has textbook reference values (use them as the oracle); ≥3 failure modes + ≥2 adversarial.
3. WIRE into `schedulingDispatcher.ts` — add `"queue_lead_time"` to the `ACTIONS` enum (line 26-29), a lazy-import in `getEngine()` (line 17-24), a `case "queue_lead_time"` in the switch, and a schema entry in `mcp-server/src/schemas/schedulingActionSchemas.ts` (referenced via `ACTION_SCHEDULING_SCHEMAS`). Keep the existing naive `lead_time_estimate` OR re-point its internals to the engine — operator's call (the spec recommends re-pointing so the naive path dies).
4. Round-trip test: invoke `dispatch({action:"queue_lead_time", params})`.

This entry is now a confirmed, exact build blueprint — not a proposal. Next window picks it up with zero re-discovery.

## Build prerequisites (original — now satisfied by the verification above)

1. `duplicationGuardEngine` check — DONE, clean.
2. `prism_scheduling` schema — `ACTION_SCHEDULING_SCHEMAS` in `mcp-server/src/schemas/schedulingActionSchemas.ts`.
3. Default-CV-by-regime table — confirm with [[math-shop-floor-management-throughput-oee]].

## Cross-references

- [[prism-invention-high-roi-engine-ideas]] — invention queue (E7)
- [[math-shop-floor-management-throughput-oee]] — the VUT / Kingman math
- [[prism-invention-stability-lobe-advisor-spec]] · [[prism-invention-wiki-to-training-pairs-spec]] — sibling Phase-B specs
- [[deep-integration-bridge-pattern]] — ERP bridge consumes lead time
- [[wiring-pattern-engine-to-dispatcher]] — wiring pattern
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (Phase B)
- [[feedback_do_optional_high_roi_work]] — standing rule

## Provenance

Phase-B builder-ready spec — **59th canonical entry** of the 2026-05-21 pivot, deep-diving invention E7 from [[prism-invention-high-roi-engine-ideas]]. Authored 2026-05-21 by slot:hotel under U-WIKI-INVENTION-QUEUEING-SPEC. Confidence 0.93 — sound spec; the verify-then-extend check on the existing `lead_time_estimate` action must run first.

System injection: auto-surfaces on `queueing lead time`, `Kingman`, `VUT equation`, `utilization explosion`, `lead time estimate`, `queue time`, `bottleneck utilization`, `honest lead time` keywords.
