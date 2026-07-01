---
name: vendor-parity-loop
description: PRISM's speed/feed vendor-parity methodology — the tri-compare (PRISM vs HSMAdvisor vs G-Wizard), the honest constraint that the two external advisors are state FILES (not drivable engines), the grounded-baseline + best-effort-live-fold design, and the ±10% verdict band. slot:oscar.
metadata:
  node_type: wiki
  type: architecture
  galaxy: speed-feed
---

# Vendor parity — the PRISM × HSMAdvisor × G-Wizard tri-compare

> `SpeedFeedTriComparatorEngine` (`OSCAR-SFC-3WAY-MS0/U-TRI-COMPARE`) answers one question per field: **does PRISM agree with what a working machinist's commercial advisor would say?** It is the vendor-parity check the soul's *verify-vendor-parity-before-publishing-recommendation* rule depends on.

## 1 — The honest constraint (R12)

HSMAdvisor and G-Wizard **are state files, not headless engines.** Neither exposes an API PRISM can drive for an arbitrary (material × tool × operation). Concretely:

- **HSMAdvisor** publishes only its *currently-open* `<Cut>` (the one cut the operator has on screen).
- **G-Wizard** publishes its *tool crib* (the tools the operator has saved).

So PRISM cannot ask either tool "what would you say for this cut?" on demand. Any parity engine that claims to drive them for the full combination space is fabricating. The tri-compare is built around this limitation, not in denial of it.

## 2 — The three layers

For a given (material, tool, operation) the comparator folds up to three reference sources, most-grounded first:

1. **Grounded baseline (always-on)** — `SpeedFeedBaselineComparatorEngine` derives a reference from HSMAdvisor's *public* speed/feed tables. This is the anchor that exists for **every** combination, including the long tail with no live data point.
2. **HSMAdvisor live `<Cut>` (best-effort)** — folded in only if the operator has a cut open **and** it aligns with the queried tool (diameter match within the alignment tolerance, ±5%). Read via `hsmAdvisorAdapterEngine.read`.
3. **G-Wizard crib tool (best-effort)** — folded in if a matching tool exists in the crib. Prepared via `gWizardComparatorBridgeEngine.prepare`.

PRISM's own value comes from a **single** `SpeedFeedNineAxisOrchestratorEngine` run — the same physics run feeds the "PRISM" leg, so the whole tri-compare costs one physics evaluation, not three. **No physics is re-implemented in the comparator.**

## 3 — Consensus and the verdict band

The **consensus** is the per-axis **median** across the *available external* systems — the grounded baseline plus any live HSMAdvisor / G-Wizard — and **PRISM is excluded from its own consensus** (PRISM is the party being judged). The comparator then reports `prism_vs_consensus` with a per-axis verdict (`aligned` / `prism_higher` / `prism_lower` / `no_consensus`):

- **Aligned** when `|Δ| ≤ 10%` of the external consensus (`VERDICT_BAND = 0.1`).
- **Divergent** outside that band — surfaced with the field and the direction of divergence so the divergence can be investigated rather than silently averaged away (R7).

> The ±10% band is the *agreement* threshold, distinct from the ±5% diameter **alignment** tolerance used to decide whether a live HSMAdvisor cut is even comparable. (An older spec referenced a ±30% band; the live engine uses ±10% — read `VERDICT_BAND` in the engine, do not assume.)

## 4 — Why parity matters (and where to expect divergence)

PRISM is physics-first (Kienzle/Taylor/Gilbert/Altintas); HSMAdvisor and G-Wizard blend physics with curated vendor data and machinist heuristics. Expected divergence sources:

- **Tool-vendor-specific data** the commercial tools carry that PRISM models from first principles (coating/grade-specific speed bumps).
- **Conservatism bias** — PRISM is systematically conservative on some cells (see the calibration result `reference_post_ship_oscar-sfc-9axis-ms0-u-osc-calib-train-results`), which a parity check makes visible.
- **Chip-thinning / engagement** handling at low radial immersion, where the three tools apply different effective-feed corrections.

A divergence is a **signal to investigate**, not a defect — sometimes PRISM is right and the vendor table is coarse; sometimes the vendor data exposes a missing PRISM correction. The parity loop is how that gets caught before a recommendation is published.

## Cross-refs
- Engine: `mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts` (`OSCAR-SFC-3WAY-MS0/U-TRI-COMPARE`)
- Baseline anchor: `SpeedFeedBaselineComparatorEngine`; bridges `GWizardComparatorBridgeEngine`, `HSMAdvisorAdapterEngine`
- PRISM physics leg: [[nine-axis-orchestration]] (single run feeds the PRISM value)
- Calibration / conservatism evidence: `reference_post_ship_oscar-sfc-9axis-ms0-u-osc-calib-train-results`
- Foundations: [[speed-feed-foundations-verified-2026-06-14]]
