# Master Hurco Post — Test-Matrix Validation, CHUNK 1/5

**Generated:** 2026-05-31 · **Driver:** `state/shared/master-post-validation/drive-chunk1.mjs`
**Engine under test:** `master_post_hurco_v11` (HurcoV11MillMasterPostEngine) via live MCP bridge `:3100`
**Validators:** `scripts/post-nc-dialect-lint.mjs --dialect hurco` (static dialect/safety) + `scripts/post-nc-conformance.mjs` (semantic vs base-job spec)

## Chunk selection
- Matrix: `state/shared/master-post-validation/test-matrix.json` — 127 rows.
- Rule: `(rowIndex % 5) === 0` interpreted as **0-based array index** → indices 0,5,10,…,125 → **26 combos** (row_ids 1,6,11,16,21,26,31,36,41,46,51,56,61,66,71,76,81,86,91,96,101,106,111,116,121,126).
- **No cap hit** — 26 < 40 cap, so **NO truncation**. Every selected combo was driven.

## Headline result

| Metric | Count |
|--------|-------|
| Combos selected & driven | 26 / 26 |
| NC **generated** (engine accepted params, gcode emitted) | **26 / 26** |
| **Dialect-lint PASS** (0 ERROR findings, `--dialect hurco`) | **26 / 26** |
| **Conformance PASS** (vs fixed base-job spec) | **0 / 26** |
| Total recorded failures | 26 (all `conformance` stage; see analysis) |

NC files: `state/shared/master-post-validation/nc/chunk1-row<id>.nc` (26 files). Raw machine record: `chunk1-results.json`.

## What PASSED — generator is healthy
All 26 combos produced well-formed Hurco/WinMax NC. Spot-verified `chunk1-row1.nc`:
- Safe-start block `G90 G17 G40 G49 G80`, `G54` work offset, units echo (`G21 METRIC` / `G20 INCH`).
- Correct safety ordering: spindle `M03` **before** coolant `M08` (no coolant-before-spindle ERROR on any row).
- `G05.3` UltiMotion smoothing emitted only on `use_ultimotion=true` rows; conventional otherwise.
- Tail: `G91 G28 Z0` retract → `G28 X0 Y0` home → `M30` → `%`. M30 + G28 present on every file.
- **Dialect lint: 26/26 PASS** — each file has exactly ONE non-fatal `WARN` (`feed-no-feedmode`: G1 F… appears before an explicit G94, feed-units advisory) and zero ERROR findings.

Parameter mapping verified correct across the chunk:
- **RPM clamping** to `machine.max_rpm` works (no emitted S exceeds the machine ceiling; e.g. material-K base 1800 on a 6000-rpm OM-2 stays ≤6000).
- **TSC coolant** correctly emitted only where `optional_packages=tsc` AND `machine_coolant_through=true` (rows 76, 86, 96); mist for Al-finish (row 26); flood otherwise.
- **Units** mapping correct: the single G20 combo (row 111, `controller_settings=units-inch-g20`) emits inch; all others metric.
- **operation_type** derived per combo: face/bore/3d_surface/drill/tap/adaptive/pocket all map to valid engine enums and generate.

## What FAILED — and the honest classification

**All 26 failures are `conformance`-stage and are a METHODOLOGY MISMATCH, not a generator defect.**

`post-nc-conformance.mjs` does NOT validate against the combo I generated — it hard-compares the emitted NC against a **single fixed canonical job spec** (`scripts/lib/prism-base-job.mjs`) that expects a specific 4-tool program: T1/T2/T3/T4 at fixed RPMs 3000/6000/8000/4000, `inch` units, and a G83 canned drill on T4. Each matrix combo is a **single-operation** program (one tool, combo-derived RPM, combo-derived units), so it structurally cannot satisfy that fixed 4-tool reference. The failing checks are identical across all 26 rows:

| Conformance check | Failed on | Why (root cause) |
|---|---|---|
| `tool-T2-present` / `tool-T3-present` / `tool-T4-present` | 26/26 | base-job expects 4 tools; combos emit 1 (T1) |
| `spindle-speed-T1..T4` | 26/26 | base-job expects fixed reference RPMs; combos use matrix-derived, material-correct RPMs |
| `drill-T4-canned-cycle` | 26/26 | base-job expects a drill on T4; combos have no T4 |
| `units` | 25/26 | base-job spec is `inch`; 25 combos are metric (the 1 inch combo, row 111, **PASSES** this check) |
| `work-offset`, `tool-T1-present`, `no-unexpected-tools`, `program-number`, `safe-retract`, `program-end` | **PASS 26/26** | these are combo-agnostic structural checks |

So each combo scores **6/15** (7/15 for the inch row) — the 6 passing checks are exactly the structural ones that don't depend on the base-job's tool list. **This is the conformance tool working as designed (it is a self-test of ONE reference job's math), applied to inputs it was not built to score.** It is NOT evidence of a bad post.

### Real generator findings surfaced (and handled)
1. **`tool_flutes` schema floor = 1** — initial tap mapping set flutes=0; the Zod schema rejected with `tool_flutes: Too small: expected >=1` (rows 71, 86). This is a **real, correct safety/schema guard**. Fixed mapping to flutes=1 for taps; both rows then generated cleanly. Recorded as a resolved finding, not a standing failure.
2. **Coordinate `type` enum** — engine schema requires `rapid|linear|arc_cw|arc_ccw` (rejects `feed`). Driver maps cut moves to `linear`. Correct guard; no standing failure.

### Infrastructure notes (not matrix findings)
- `:3100` MCP transport is **stateful** ("Already connected to a transport" on concurrent POST). Driver issues calls **strictly serially** with transport-busy retry — required for any multi-call harness against this bridge.
- Initial validator runs failed with `spawnSync node ENOENT`; fixed by spawning `process.execPath` instead of bare `"node"` (PATH not inherited in the spawned subprocess on Windows). After the fix, all 26 lint runs executed and passed.

## Recommendation for the master post test program
The conformance leg, as written, only meaningfully scores NC that mirrors the `prism-base-job.mjs` 4-tool reference. To make conformance a real per-combo signal, the validator needs a **per-combo expected-spec** (tool list, RPMs, op→cycle expectations derived from the same combo), OR the matrix harness should drive the canonical multi-tool base job through the post and conformance-check THAT, separately from the single-op coverage combos. The **dialect-lint leg is already a valid per-combo signal** and shows the generator is sound (26/26).

---
*Per-combo detail in `chunk1-results.json`; failure histogram in `_analysis.json`.*
