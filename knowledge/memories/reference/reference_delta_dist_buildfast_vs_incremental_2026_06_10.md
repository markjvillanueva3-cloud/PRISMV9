---
name: reference_delta_dist_buildfast_vs_incremental_2026_06_10
description: build:fast (esbuild bundle) does NOT regenerate per-file dist/engines/*.js — only build/build:incremental (tsc) does; honesty correction of a 25.4x overclaim
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.547Z
aliases: reference_delta_dist_buildfast_vs_incremental_2026_06_10
---


BUILD-ARTIFACT LESSON + R12 honesty correction (slot:delta, 2026-06-10).

While extending the CAD INGEST-extractor regression test, a direct
`node -e "import('./mcp-server/dist/engines/CADGeometryComparisonEngine.js')"` on an
INCH part (AEROSPACE VALVE BODY.STP) returned raw 8.345 (NOT normalized) while the same
`extractMetrics` under vitest (src .ts) returned 211.962 mm (= 8.345 in x 25.4, the
U-CAD-COMPARE-UNIT-NORMALIZE units-first path). I committed a FINDING in
U-CAD-CORPUS-CLASS-COVERAGE that the "live MCP mis-measures inch parts 25.4x until rebuilt."

**That claim was wrong / unverified.** Root cause is the build pipeline, not the live server:
- `npm run build:fast` = **esbuild only**. It rebuilds the BUNDLE `dist/index.js` (+ chunks) —
  which is what the live MCP daemon runs (`TRANSPORT=http node dist/index.js`). It does **NOT**
  regenerate the per-file `dist/engines/*.js` tsc outputs.
- `npm run build:incremental` / `npm run build` = **tsc** (+ esbuild). These DO regenerate the
  per-file `dist/engines/*.js`.
- My `node -e` imported the per-file output (stale tsc artifact) — NOT the bundle the daemon uses.
  So the STALE consumer was direct `dist/engines/*` importers (scripts, my probe), not
  necessarily the daemon. Whether the live daemon ever mis-measured is UNVERIFIED (its bundle was
  kept fresh by build:fast).

FIX: ran `build:incremental` -> per-file dist now returns 211.962 mm + volumeMethod:"bbox-proxy"
(both U-CAD-COMPARE-UNIT-NORMALIZE and U-CAD-VOLUME-METRIC now reflected in per-file dist).

RULE (compounding): to validate engine changes via a direct `dist/engines/*.js` import, rebuild
with `build:incremental`/`build` (tsc), NOT `build:fast`. build:fast is for the daemon bundle only.
A direct per-file dist import after a build:fast-only session can read STALE engine code.

ALSO: `build:incremental` surfaced 4 PRE-EXISTING tsc errors in `src/tools/dispatchers/shopDispatcher.ts`
(TS2352 x2 AutoPipelineInput/DNCTransferRequest casts, TS2576 x2 getLaborByDepartment static-vs-instance)
— shop-floor galaxy, NOT delta/CAD, NOT this session. Flagged, not fixed (out of lane).

Related: [[reference_delta_impeller_second_reference_part_2026_06_10]] · [[feedback_check_units_first]] · [[feedback_verify_actual_contract_not_proxy]]
