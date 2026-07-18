---
name: reference_oscar_sfc_frontier_2026_06_10
description: SFC (oscar) frontier 2026-06-10 — CSFH combinatorial harness STALLED at unit 01; resume at U-CSFH-02; single-source ledger location.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_frontier_2026_06_10
---


# SFC (oscar) frontier — 2026-06-10 context-regain

**Single-source map:** `state/shared/specs/SFC-OPEN-THREADS-2026-06-10.md` — every open SFC thread
(shipped/next/stalled/dormant/deferred) + ROI ranking, in one read. Hit it first on a cold oscar session.

**State:** milestone `OSCAR-SFC-9AXIS-MS0` active. Live `sfc-awareness-snapshot.mjs`: 45 engines · 32 tests ·
52 dispatcher actions · 11/11 quality gates · verdict SYNERGIZED (PSN legs 8🟢/1🟡/1⚪).

**Primary unfinished thread:** the **CSFH combinatorial validation harness** (plan
`SFC-COMBINATORIAL-HARNESS-PLAN-2026-06-04.md`, 13 units) is **STALLED at unit 01**. Only
`U-CSFH-01-AXES-EXTRACT` (`df68a51086`) + the `U-OSC9-DRILL-CHIPGEOM` drilling-physics fix (`81a3eb72c8`)
shipped — then the chat drifted onto `U-OSC9-OPEN-CARTESIAN-COMPARE` (`b69f872681`) + the
`U-OSC9-HARDENED-CARBIDE-DERATE` safety fix (`7431657f68`, S(x)=1.00, keep). Harness units 02–13 are MISSING on disk.
**Resume at `U-CSFH-02-VALIDITY-MATRIX`** (LOW risk, deps 01 ✓, unblocks the SAMPLER → whole harness), then
`U-CSFH-03-DB-ACCESSORS` (romeo+juliett cited-data, cross-slot fragile → snapshot/fail-loud) → 04…13.
Keystone `U-OSC9-CALIB-APPLY-WIRE` (orphaned auto-tune loop — calibrationFactors read only by the DL engine,
never by `UltimateSpeedFeedEngine.calculate()`) is the **finish line**, not an early pick: flag-gated
(`PRISM_SFC_CALIB_APPLY` default OFF) + byte-identical anti-regression test + needs CALIB-PERSIST first.

**Open Q:** 12 N-aluminum Vc divergences (real algorithm delta, unresolved) — [[reference_oscar_sfc_divergence_investigation_2026_05_27]].
**Deferred:** SF-AI L1/L2/L3 closed loop (india-owned; Ollama-blocked at design time — Ollama now UP, re-check worth it).

Galaxy brain: `mcp-server/src/engines/speed-feed/MEMORY.md` §Current frontier. Related:
[[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_oscar_sfc_awareness_surface_2026_05_28]] · [[reference_oscar_sfc_gsd_2026_05_29]].
