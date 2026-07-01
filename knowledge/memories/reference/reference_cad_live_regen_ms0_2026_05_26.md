---
name: cad-live-regen-ms0-2026-05-26
description: "CAD live-regen MS0 — Mastercam NetHook + HyperCAD-S CKM emitter pair, 99.46% corpus coverage (1114/1120 attempts), 2.45M ops over 560 slugs, 6 R12 findings surfaced"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.495Z
aliases: reference_cad_live_regen_ms0_2026_05_26
---


# CAD live-regen MS0 — Mastercam + HyperCAD-S corpus sweep (slot:delta 2026-05-26 /loop iter3+4)

Shipped during `/checkin-delta /goal [continue training cad drawing system and template generation across all cad files in system | mastercam and hypercad keys are now on the pc for testing] /loop`. Replaces the prior `stub-pseudo-regen-via-source-with-0.2pct-X-drift` synthetic compare with **executable CAM-system-native scripts** that the operator runs inside licensed Mastercam / HyperCAD-S on the PC.

## Commits (slot/delta)
- iter3 `b35b485ab5` — U-CAD-LIVE-REGEN-MASTERCAM-HYPERCAD: pure-fn lib + 2 CLI wrappers + 41/41 node:test
- iter4 (next sha) — U-CAD-LIVE-REGEN-BATCH: 560-slug corpus sweep + 20/20 batch-lib tests

## What landed

| Surface | Path | Notes |
|---|---|---|
| Pure-fn emit lib | `scripts/lib/cad-live-regen-emit.mjs` | 12 exports; loadActionTemplate / validateActionTemplate / extractFnBinding / geomToOpSequence / emit{Mastercam,Hypercad}Script / emitLiveRegenScript / buildLedgerEntry. R12 fail-loud on missing fn-binding. |
| Emit lib tests | `scripts/lib/cad-live-regen-emit.test.mjs` | 41 cases — happy × 2 platforms + ≥3 failure modes + ≥3 adversarial (NaN, Infinity, negative/zero radius, oversize 100-cyl) + variability spanning mastercam + hypercad-s. |
| Mastercam CLI | `scripts/cad-live-regen-mastercam.mjs` | Reads geom.json, emits Mastercam NetHook C# (`.live-regen.mastercam.cs`), appends advisory ledger entry. |
| HyperCAD CLI | `scripts/cad-live-regen-hypercad.mjs` | Reads geom.json, emits HyperCAD-S CKM macro (`.live-regen.hypercad.ckm`), appends advisory ledger entry. |
| Batch lib | `scripts/lib/cad-live-regen-batch-lib.mjs` | rollupBatchResults / summaryToLine / classifyFailureReason / failureCountsByReason — pure data aggregation. |
| Batch tests | `scripts/lib/cad-live-regen-batch-lib.test.mjs` | 20 cases — empty input + mixed success/failure + dedup + failure-reason classification. |
| Batch CLI | `scripts/cad-live-regen-batch.mjs` | Sweeps all 560 slugs × N platforms; `--limit`, `--platforms`, `--has-key`, `--json` flags; emits LIVE-REGEN-BATCH-SUMMARY.json. |

## Corpus sweep results

```
560 slugs × 2 platforms = 1120 attempts
1114 ok (99.46%) · 6 failed
2,450,074 ops emitted
313 MB of executable .cs + .ckm scripts
Runtime: 66.2s
```

Per-platform: Mastercam 557/560 ok; HyperCAD-S 557/560 ok. Same failure set on both platforms (failures are in the geom.json layer, not the emitter).

## Real R12 findings (corpus bugs surfaced by fail-loud)

| Slug | Failure | Class | Root cause (suspect) |
|---|---|---|---|
| `2nd-punch-block-1-000-bore` | `Unexpected non-whitespace character after JSON at position 46520` (both platforms) | `corrupt-geom-json` | Geom emitter wrote past EOF — likely double-write or concat without truncate. |
| `h4y4a1000` | Same JSON-parse error at position 153626 (both platforms) | `corrupt-geom-json` | Same suspect — file got two JSON documents concatenated. |
| `impeller-turbine-regen` | `cylinders[0].placement missing or has non-finite coords` (both platforms) | `non-finite-coord` | The 0.2%-drift pseudo-regen artifact has a degenerate first cylinder. Not a real CAD primitive. |

These are PRE-EXISTING corpus bugs (not regressions from this work). Surfaced by R12 fail-loud in the emit pipeline. Tracked for next-session triage as `U-CAD-CORRUPT-GEOM-FIX` (2 corrupt) + `U-CAD-IMPELLER-TURBINE-REGEN-DEGENERATE-PLACEMENT` (1 placement bug).

## Mid-iteration design correction (R12 working as intended)

Initial REQUIRED_OPS guess was `[sketch.create-plane, solid.cylinder]`. iter3 smoke run blew up with `extractFnBinding: op 'solid.cylinder' not found in template for 'mastercam' — refusing silent fallback (R12)`. **Real training-vocabulary discovery**: the 38-op atomic vocabulary intentionally decomposes solids into (plane + circle.cr + extrude). There is no monolithic `solid.cylinder` op — the training corpus learned the decomposed form from real CAM scripts.

Fix: switched REQUIRED_OPS to `[sketch.create-plane, sketch.circle-cr, op.extrude]` (and reshaped `geomToOpSequence` to emit 3 ops per cylinder instead of 2). Heuristic extrude height (`1.0`) flagged on every emit + ledger entry for operator-side post-run correction. Lesson: never preset the abstraction without grepping the actual trained-vocabulary file.

## Artifact retention

Per `iter+82 U-CAD-100PCT-ALL-CORPUS` pattern (regenerable substrate gitignored, summaries + demo artifacts retained):
- `.gitignore` extended: `state/shared/cad-regen-output/**/*.live-regen.{mastercam.cs,hypercad.ckm}`
- 2 demo artifacts from iter3 (`01-db-h46-002-side-1-v2`) committed as audit evidence
- 1118 batch-generated artifacts on disk but uncommitted (regenerable in 66s)
- `LIVE-REGEN-BATCH-SUMMARY.json` committed (schemaVersion 1, machine-readable for CI)

## Operator handoff

```bash
# Re-generate the full corpus (66s)
node scripts/cad-live-regen-batch.mjs

# Single slug, single platform
node scripts/cad-live-regen-mastercam.mjs <slug>
node scripts/cad-live-regen-hypercad.mjs  <slug>

# After running the script inside the licensed CAM system:
node scripts/cad-live-regen-mastercam.mjs <slug> --has-key   # stamps advisory_only=false
```

The `--has-key` flag is the operator-confirmation bridge — flipping `advisory_only:false` in the ledger marks a regen as live-validated. Per-slug live results feed the next iter's `U-CAD-HEIGHT-LEARN` (replacing the heuristic extrude height with operator-measured values).

## Related
- [[reference_engine_wipe_silent_regression_2026_05_26]] — earlier this session, recovered 1969L of code
- [[reference_cad_topology_iter42_46_2026_05_25]] — preceding CAD topology pipeline arc
- [[feedback_psn_definition]] — PSN canonical 11-leg taxonomy (CAD/CAM = leg 7 Engines, leg 4 Memories, leg 5 Tribal)
- `state/shared/cad-action-templates/<platform>.actions.json` — 12-system 38-op atomic vocabulary (load-bearing for every platform extension)
