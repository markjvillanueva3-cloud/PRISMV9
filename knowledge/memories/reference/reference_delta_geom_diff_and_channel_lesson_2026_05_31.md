---
name: reference_delta_geom_diff_and_channel_lesson_2026_05_31
description: U-CADTP-GEOM-DIFF shipped (two-model CAD convergence comparator + extracted normalizeModel) AND the session's channel-corruption lesson — RTK pipe panics + read-cache content corruption produced THREE false "tests pass" greens; defeated only by exit-code + marker-filename + nonce verification (measure-before-claim).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.549Z
aliases: reference_delta_geom_diff_and_channel_lesson_2026_05_31
---


# U-CADTP-GEOM-DIFF + channel-reliability lesson (slot:delta, 2026-05-31)

## Shipped: U-CADTP-GEOM-DIFF (commit a0060e7119) — the round-trip convergence metric
`scripts/lib/cad-fusion-geom-diff.mjs` + test (24/24) + `normalizeModel` extracted into
`cad-fusion-buildmap-lib.mjs`. Compares TWO independently-generated model snapshots (REFERENCE vs CANDIDATE)
→ `{verdict, convergence, coverage, checks, bodyDiffs, mismatches, caveats}`. verdict ∈
match|converging|diverged|no-data. This is the numeric "does our CAD match the target?" both
MS-CAD-TRAINING-PIPELINE round-trips need (A: print+CAD→replicate; B: print→scan→generate).
- **Order-independent body matching** (greedy nearest-signature) — two models don't share body order.
- **R12 honesty, load-bearing:** missing volume/bbox → `unavailable`, NEVER a pass; `match` requires
  convergence===1 AND coverage===1 (can't fake 100% on absent data); both-empty → `no-data` not vacuous match;
  `topoEqual` = finite-AND-equal so `undefined===undefined` can't false-pass a topology count.
- `normalizeModel(geometry,status)` now the SINGLE canonical normalizer (raw snake_case `/geometry`,
  `bounding_box_mm` ARRAY → `bboxMm` OBJECT {x,y,z}, missing→0/false) shared by verifyBuildMap + geom-diff (R8).
- `compareConvergence(prev,cur)` feeds the future convergence-harness (unit #15). DEFAULT_TOLERANCE = frozen
  model-equivalence bands (caller-overridable, NEVER an inlined ISO/fit tolerance).
- Per-file 2-reviewer gate: PASS×2 on final bytes (after fixing 3 P0s, see below). Pairs with
  [[reference_delta_cad_training_pipeline_2026_05_31]].

## THE LESSON — this session's tool-output channel was CORRUPTING, and it manufactured false greens
Three distinct false "tests pass" signals this session, each nearly committed:
1. `node --test … | head` → **RTK rust-wrapper panics** ("failed printing to stdout: The pipe has been ended")
   → exit 255 / garbage. NEVER pipe RTK-wrapped commands to `head`/`tail` (early pipe-close kills the wrapper).
2. The **read-cache hook intermittently corrupts file CONTENT** — `.out` files I wrote via node read back with
   their middle lines replaced by RTK telemetry ("count tokens saved", "trees clean", "exports: 1"). First/last
   lines often survive; middle corrupts. Same path re-read returns the SAME corrupted cache.
3. `node --test` RC and TAP counts came back **RC=0 / "20 pass"** while the module actually FAILED TO LOAD
   (a missing `normalizeModel` import = ESM link error). The green was entirely fabricated by the channel.

**What actually worked (the trustworthy channels):**
- **Exit code of MY OWN node script** (`node probe.mjs; echo RC=$?`) — reliable. Encode the verdict in the exit
  code (`process.exit(fail>0?2:pass<EXPECTED?3:0)`) — guards false-green-by-too-few-tests.
- **Marker FILENAMES** — content corrupts, but `fs.writeFileSync(".GDX_"+sanitized(detail), "")` then `ls` →
  the filename carries the answer (the failing test + actual/expected values) intact.
- **Nonce in file content** (`"NONCE-55821\n"+…`) — proves a read is fresh vs a stale cache hit.
- **Dynamic `await import()` in a probe** caught the ESM link error as a catchable rejection → definitive truth.

**Discipline reaffirmed (measure-before-claim / R12):** run → read the artifact in a SEPARATE step via a
trustworthy channel → THEN state the number. The two parallel scrutiny reviewers BOTH caught the
non-loading-module P0 the corrupted channel hid — the per-file gate is what saved this unit. Root cause of the
P0 itself: I imported `normalizeModel` ASSUMING it existed in buildmap-lib (it didn't) — R8: verify the export
before importing, don't assume.
