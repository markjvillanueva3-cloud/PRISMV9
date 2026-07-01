---
title: Regen pipeline -- spawn heavy children with a heap bump + allowlist intentional stale-orphans
type: lessons
domain: system-viz
slot: sierra
created: 2026-06-22
tags: [system-viz, regen-viz, oom, freshness, drift-gate, sierra, fleet-wide]
related:
  - "[[reference_viz_aug_stale_rewire_2026_06_22]]"
  - "[[reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21]]"
  - "[[reference_u_regen_viz_merge_faillod_2026_05_17]]"
---

# Regen pipeline: two correctness bugs surfaced while wiring vault-atomic (2026-06-22, slot:sierra)

Both fixes landed together (commits under `[SIERRA-VIZ]/U-VIZ-VAULT-ATOMIC-WIRE+DRIFT-HEAP` and
`/U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST`). They were discovered by RUNNING a real regen after wiring
a new generator -- the static dual-reg audit passed, but the runtime regen exposed the gaps. Lesson
zero: **a static "both-or-neither" pass is not a full verification; run the regen.**

## Bug 1 -- a heavy spawned child needs the SAME heap bump the parent gives its other children

`regen-viz.mjs` spawns its FAST/HEAVY generators with `--max-old-space-size=24576` (NODE_ARGS), but
spawned `detect-system-viz-drift.mjs` (the post-write integrity gate) with **default heap**. Once the
merged graph crossed ~862MB, the drift detector OOM'd ("Ineffective mark-compacts near heap limit")
on EVERY regen -> `driftFail=true` + `findCacheDegraded=true` + the `.last-successful-regen.json`
success-stamp never advanced. Fleet-wide: every chat's node-context injects degrade until a clean regen.

- **Fix:** inline `--max-old-space-size=24576` on the drift-gate `spawnSync`. Inlined, NOT NODE_ARGS,
  because the `--drift-gate-only` path calls `runDriftGate` at module top-level BEFORE the NODE_ARGS
  const is initialized (temporal dead zone).
- **Generalize:** when a script spawns a child that loads the big graph (or any large input), give that
  child the same heap headroom the script's other heavy children get. Grep every `spawnSync(process.execPath, ...)`
  in a pipeline for a missing heap flag. A child OOM at a *low* reported MB (e.g. 381MB) = a small default
  heap, not small data -- the data (an 862MB graph string + parse) needs multi-GB.

## Bug 2 -- a staleness audit must distinguish "producer gone" from "producer is intentionally out-of-band"

The augmentation-freshness audit flagged 2 merged augmentations as `stale-orphan` ALARM on every regen:
`engine-spotlight.json` (hand-curated static catalog, no generator by design) and
`h-drive-exhaustive-audit.json` (produced by a manual `.ps1`, not a regen generator). A perpetual
2-orphan alarm is **cry-wolf**: it masks REAL future orphans in the alarm count.

- **Fix:** an `INTENTIONAL_NO_PRODUCER` allowlist (mirrors the existing `SLOW_CADENCE` pattern) + a new
  `stale-manual` class checked BEFORE the slow/stale escalation, so an intentional file can never be
  `stale-orphan`. `alarm` stays keyed only on real orphans. Also exempt these from the
  `PRISM_MERGE_STALE_SKIP` data-drop lever (dropping a hand-curated catalog loses real coverage).
- **Generalize:** a "missing producer" signal must allowlist the *intentional* missing-producer cases or
  it desensitizes the operator. Document WHICH out-of-band producer each allowlist entry has -- a missing
  `.mjs` generator is a REAL orphan, not an intentional one.

## Verification pattern (both)

Static audits (`audit-viz-dual-registration.mjs`, `audit-augmentation-freshness.mjs`) verify the WIRING
contract cheaply (no graph load) -> use them as the fast inner loop. But the RUNTIME regen + the
`.last-successful-regen.json` stamp (`pendingCount=0`, `sidecarOk=true`, ts newer than the failure log)
is the load-bearing proof. "regen printed done" is not verified; the stamp + a `system-viz-query find`
smoke test is.
