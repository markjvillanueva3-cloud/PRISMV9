---
name: reference_whiskey_jm_stock_turning_state_2026_06_26
description: "U-W9 (slot:whiskey): the closed-loop Rung-B material grid was empirically INVERTED from JM's real stock (tool-steel-dominant), now grounded in real purchases at the ANNEALED turning state (P) -- validated 100% SFM-envelope accuracy. Plus 2 findings: oscar's stock-prior maps these grades to hardened-H (wrong for turning), and a pre-existing material-loader read bug OOMs the harness."
type: reference
slot: whiskey
galaxy: lathe
source: prism-memory
synced: 2026-06-27T20:30:47.256Z
aliases: reference_whiskey_jm_stock_turning_state_2026_06_26
---


# U-W9: closed-loop Rung-B material grid grounded in JM's real stock + turning state (2026-06-26)

Surfaced verifying the closed-loop test's "machining efficiency factored in" requirement: the
Rung-B harness (`mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts`) generated programs over a
hand-picked material grid whose PREMISE comment was empirically FALSE.

## The finding (verified from real data, R12)
- The grid comment claimed *"the bulk of JM lathe work is free-machining + medium-carbon steel"* and
  had 6/10 entries as P-group commodity steel (1018/12L14/1144/4140/8620), tool steel only at the tail (A2).
- JM's ACTUAL purchases (`mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json`, juliett,
  from QuickBooks 2014-2026: 27 grades, 2212 stock lines) are **tool-steel-DOMINANT**: H13 38% · M2 17%
  · D2 12% · S7 11% · M4 5% · A2 5% · then 4140/O1/52100/DC53/M42/12L14/17-4/1045/L6/1018... JM is a
  TOOL-AND-DIE shop -- H13/M2/D2/S7 were entirely ABSENT from the test grid.

## The machining-STATE call (the R7 conflict, settled by evidence)
- oscar's `scripts/lib/sfc-jm-stock-prior.mjs` (`STOCK_GRADE_ISO`) maps these tool-steel grades -> ISO **H**
  (hardened SERVICE state). Correct for an SFC unknown-material DEFAULT prior; WRONG for the turning op.
- The Rung-A measured cloud (JM's real .MIN, 800-program sample) is **G96-literal SFM p50 = 200 [100-550]
  ft/min** = carbide-on-ANNEALED-steel, NOT CBN hard-turning. JM turns these tool steels ANNEALED
  (rough/semi-finish), then hardens + grinds OFF the lathe. So the turning op the .MIN programs cut is
  ISO **P**, not H.
- **Empirical proof:** with the grid mapped to annealed P, the harness scores **envelope_sfm 100% /
  envelope_feed 96.3%** vs JM's cloud (60 programs, 0 gen errors, mean_confidence 0.85). Mapping to H
  (hard-turning speeds) would NOT match JM's 200-SFM annealed cloud -> the 100% SFM validates annealed-P.
- **CROSS-GALAXY FLAG for oscar:** the H service-state prior may bias SFC turning DEFAULTS too high/wrong
  when a JM material is unknown. Joint whiskey+oscar SFC-default calibration is a real follow-on unit.

## What shipped (U-W9)
- Grid rewritten (`lathe-roundtrip-accuracy-harness.ts`): real JM high-volume grades H13/M2/D2/S7 (annealed P)
  + A2 hard-turn (H, the CBN-finish minority) + 4140/12L14/1018 (P) + 17-4 PH (M) + 6061 (N, ISO-span).
  Held to **10 materials = the proven 60-program scale** (swap-not-grow) so no new OOM regression.
- Driver hardened (`scripts/lathe-closed-loop-full.mjs:102`): RUNG_B spawn now passes
  `NODE_OPTIONS=--max-old-space-size=8192` (was default 4GB).

## FLEET-WIDE BLOCKER -- precise root cause (code-read confirmed; NOT fixed here, shared-core lane, R12)
The harness logs `FileSystemError: File system error during parse` for every
`H:/PRISM/data/materials/*/*.json`, yet the files parse FINE standalone (`tool_steel.json` 4.4MB ->
valid JSON, 314 materials). Code-read root cause is a TRIO of interacting bugs in shared core (used by
EVERY physics consumer, not just the lathe harness):
1. **`mcp-server/src/utils/files.ts:20-29` `readJsonFile`** -- the catch only special-cases `ENOENT`
   (-> op "read"); ANY other read error falls to line 28 and is MISLABELED op "parse". So a failing
   READ (most likely **EMFILE / handle exhaustion**) is reported as a parse failure -- the files aren't
   malformed, the reads are failing.
2. **`mcp-server/src/registries/MaterialRegistry.ts:52` `load()`** -- `await Promise.all(isoGroups.map(...))`
   over ~7 groups, each `loadISOGroup` doing its own `Promise.all` over ~42 files = unbounded concurrent
   `fs.readFile` (groups x files) -> EMFILE on Windows under the full material set.
3. **`MaterialRegistry.ts:69-101` "W5" guard** -- when 0 materials load "despite data files existing" it
   DELIBERATELY does NOT set `this.loaded=true` ("will retry on next call"). So every per-program lookup
   re-runs the FULL concurrent load -> EMFILE again -> 0 loaded -> retry -> ... an infinite per-call
   reload storm (the repeated `loadISOGroup` logs) that accumulates heap -> OOM past ~60 programs at 4GB.
**Fleet impact:** under concurrency `MaterialRegistry` is silently EMPTY, so consumers fall back to
canonical `CANONICAL_KIENZLE` by ISO everywhere (SAFE -- canonical constants -- but loses per-grade
enrichment).

**RESOLVED -- EMFILE confirmed + FIXED (U-W10, commit on cad-fusion-live-ms0, 2026-06-26):**
A temporary diagnostic (logging the raw `error.code` at `readJsonFile`'s catch, then reverted) proved
the underlying error is **`EMFILE: too many open files`** -- 4806 occurrences in one harness run, ALL
EMFILE. My first attempt (outer-group sequential ONLY) did NOT fix it because each group's INNER
`Promise.all` over ~40 files still opened too many handles (~40 concurrent already trips EMFILE on this
box once other harness I/O is counted). **Fix that worked:** `MaterialRegistry.load()` loads groups
SEQUENTIALLY + `loadISOGroup` reads each group's files in bounded batches of 8 (`READ_CONCURRENCY=8`,
peak <=8 open handles). Pure concurrency change -- same materials, no handle exhaustion. **Validated via
the harness:** EMFILE 4806->0, `MaterialRegistry loaded: 3989 materials` (was 0 -- the registry was
silently EMPTY fleet-wide), no OOM at 8GB, accuracy unchanged (60 programs, 0 errors, 100% SFM / 96.3%
feed). tsc clean for the changed file. So per-grade material physics is now available fleet-wide (every
consumer was previously falling back to canonical-ISO defaults under load).

**REMAINING follow-up (separate, NOT root-caused -- flagged, do R8 first):** the registry still does
REDUNDANT full loads (multiple `MaterialRegistry loaded: 3989` lines in one run) -> the harness is slow
(timeout, not OOM). Root-cause BEFORE fixing: is it multiple registry INSTANCES (not a singleton) or
concurrent `load()` callers racing past `if (this.loaded) return` before the first load finishes (=
needs an async-init in-flight `loadPromise` guard)? Two candidate fixes depending on which. Also still
open (low priority): `readJsonFile` mislabels non-ENOENT read errors as op "parse" (utils/files.ts:25-28)
-- harmless now that EMFILE is gone, but a real diagnostic bug. Owner: oscar/SFC + papa/backend-helper.
Whiskey's closed-loop driver heap-flag (U-W9) remains good headroom for the now-larger (real-material) load.

Related: [[reference_whiskey_rungb_safety_finding_boring_collision_2026_06_26]] · [[reference_lathe_roundtrip_accuracy_rung_b_2026_06_03]] · [[reference_whiskey_kienzle_session_2026_06_26]]
