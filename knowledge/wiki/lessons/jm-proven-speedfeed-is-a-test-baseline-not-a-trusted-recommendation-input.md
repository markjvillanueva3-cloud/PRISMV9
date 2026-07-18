---
title: JM proven speed/feed is a TEST BASELINE, not a trusted recommendation input
tags: [decision, sfc, speed-feed, proven-blend, jm-die, trust-policy, units, oscar]
created: 2026-06-25
slot: oscar
status: decision
---

# JM proven speed/feed = test baseline, NOT a trusted recommendation input

## The decision (operator directive, 2026-06-25)

> "we need to run ... exhaustive testing ... utilize ALL JM die parts and programs first to run full live
> tests of parameters (**remember that our programs are mostly written by amateurs so don't trust the
> speeds, feeds and parameters, use them as the GUIDELINE to test against**)."

This resolves a standing fork on the SFC **proven-blend**: `SpeedFeedOrchestratorEngine.compute()` has a
`KAR-MS2 U-KAR14` block that would blend proven JM speeds/feeds into the live recommendation at **60%**
(`Vc = 0.4*physics + 0.6*proven` when the proven Vc is within +-30% of physics). Per the directive, **JM
proven data must NOT be trusted as a 60% recommendation input** — it is a comparison/test baseline.

## Current state (correctly aligned with the directive — no change required)

- The proven-blend is **dormant for JM lathe data**: the stored cssSpeed is in **SFM**, so when read as
  m/min it is ~3.28x the physics Vc -> rejected by the `[0.7, 1.3]` blend guard
  (`SpeedFeedOrchestratorEngine.ts`, `classifyProvenVcDeviation`). So untrusted amateur speeds are already
  NOT blending into recommendations. (`classifyProvenVcDeviation` also now FLAGS the ~3.28x ratio as an
  SFM/m-min units artifact so the dormancy is visible, not silent.)
- The **comparison / divergence** path (`scripts/sfc-jm-proven-divergence.mjs`) already converts the units
  for an apples-to-apples PRISM-vs-JM test (the "test against" use the operator wants).

## Verified units (empirical, from the raw NC — so a future session never re-guesses)

Read directly from `JM DIE/CNC LATHE/*.MIN`:
- **cssSpeed = SFM** -> m/min via `*0.3048`. Evidence: `G96 S200`/`S250` (CSS mode) on inch machines (no
  G20/G21 in the programs -> JM machine-default inch) with `G50 S600..S800` RPM caps. 200 SFM = 61 m/min
  (conservative, consistent with "amateur programs"); 200 m/min is impossible at those caps.
- **feedRate = IPR (inch/rev)** -> mm/rev via `*25.4`. Evidence: `G95 G1 ... F.005` (feed-per-rev), feeds
  span `F.0005..F.02` (dominant .005/.002/.003) — the classic turning ipr range. mm/rev (5 um/rev) and G94
  ipm are both physically absurd.

## Guidance for the next session

1. **Do NOT "fix" the proven-store units to ACTIVATE the 60% blend** — that would trust amateur data,
   violating the directive. The dormancy is intentional.
2. If/when the proven units ARE normalized (so the comparison/divergence tooling is exact), keep the
   recommendation blend **reference-only / low-weight / flag-gated-off by default**, and physics-review any
   weight change.
3. The correct fix LOCATION for any units normalization is the **consumer-read / `loadFromStore` hydrate
   chokepoint** (gated by a store `cssUnit`/`feedUnit` marker, round-trip-safe) — NOT `aggregateLatheData`
   ingestion (the orchestrator reads the persisted store via `ensureHydrated`, so an ingestion-only change
   is a no-op; that is why the prior attempt no-op'd).

Memory: [[reference_oscar_proven_css_sfm_mitigated_not_dangerous_2026_06_25]]. Sibling:
[[capped-achievable-vc-vs-uncapped-vendor-surface-speed-is-not-a-physics-bug]].
