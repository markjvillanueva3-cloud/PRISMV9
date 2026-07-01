# Master Hurco Post — Validation Chunk 2/5

**Generated:** 2026-06-01
**Driver:** `state/shared/master-post-validation/run-chunk2.mjs`
**Action under test:** `prism_cam:master_post_hurco_v11` (live drive, :3100)
**Validators:** `scripts/post-nc-dialect-lint.mjs --dialect hurco` + `scripts/post-nc-conformance.mjs`
**Selection rule:** rows where `(rowIndex % 5) === 1` (0-based index into `rows[]`)

> **HONESTY NOTE (R12 — fail loud):** This report went through several wrong interim drafts this session (a phantom "engine seal-defect" from a no-config probe, then a false "26/26 conformance PASS" from a shell-redirect artifact). The numbers below are the FINAL, deterministic truth, produced with `execFileSync(process.execPath, …)` reading `e.status` directly — bypassing both the `node`-not-on-PATH spawn bug and the intermittent shell-redirect exit-code masking that produced the bad drafts. Where readings disagreed, the direct `e.status` capture is authoritative.

## Headline (deterministically verified — `e.status` per file)

| Metric | Value | Verification |
|---|---|---|
| Rows in chunk | 26 | matrix filter `(i%5)===1` → row_ids 2,7,12,17,22,27,32,37,42,47,52,57,62,67,72,77,82,87,92,97,102,107,112,117,122,127 |
| Combos run | 26 (no cap; chunk < 40) | driver |
| **NC generated** | **26 / 26** (non-empty, 671–729 B, 30–31 lines, correct units header) | `NC nonzero=26 zero=0` + direct reads |
| **Lint PASS (hurco dialect)** | **26 / 26** (all exit 0; 0 ERROR, 1 advisory WARN each) | `all lint exit0: true` |
| **Conformance PASS** | **0 / 26** (all exit 3, ok:false, 4/10) — **golden-spec scope mismatch, NOT an engine NC defect** | `all conf exit3: true` |

## What actually happened

### 1. Generation — 26/26 SUCCEED (after 3 driver-side fixes — all MINE, not engine defects)
1. **`coordinates[].type` enum** — used `"feed"`; engine *correctly* rejected (`expected one of "rapid"|"linear"|"arc_cw"|"arc_ccw"`). Fixed → `"linear"`.
2. **`config.work_offset`** — mapped G54→`1`; engine *correctly* rejected (`Too small: expected number to be >=54` — wants the literal register value G54=54..G59=59). Fixed → default `54`, `55` for `workoffset-g54.1`.
3. **gcode extraction + 0-byte writes** — live shape is `{ engine_output: { gcode: string[], ... }, sidecar }` (gcode is an ARRAY under `engine_output`; no top-level `success`). First extractor missed it; combined with the :3100 server crash-looping under fleet load, it wrote 0-byte files while counting them "generated". Fixed: `extractGcode()` reads+joins the array; `callTool` treats empty/contentless 200s as retryable transport flakes (no fake success); the writer refuses empty output.

Representative emitted program (row2, P/endmill, metric, ulti-on/tsc) is correct Hurco WinMax V11 NC: `O5002`, `G21`, safe-start block (`G90 G17 G40 G49 G80`), `T1 M06`, `G05.3 P10` (UltiMotion smoothing), `G43 H1`, `S3500 M03`, `M88` (through-spindle coolant), G00/G01 moves @ F450, `G28` retract, `M30`, `%`.

### 2. Lint (hurco dialect) — 26/26 PASS
Every NC lints **exit 0, 0 ERROR, 1 WARN**. The one warning is `feed-no-feedmode` (cutting `G01 F…` move before any `G93/G94/G95` feed-mode is established → feed units technically ambiguous). A WARN does not fail lint (exit 0 without `--strict`). This is a legitimate **P2 advisory about the engine output** — the Hurco post should emit a `G94` (feed-per-minute) mode block before the first cut. Reported to the post owner; NOT edited (peer-owned, 16 in-flight handoffs).

### 3. Conformance — 0/26 PASS: VALIDATOR-SCOPE mismatch, not an NC defect
`post-nc-conformance.mjs` validates the NC against a **single fixed golden job** (`scripts/lib/prism-base-job.mjs`). `rich` mode expects a 4-tool program (T1@3000/T2@6000/T3@8000/T4@4000, inch, G8x drill on T4); `basic` mode expects T2/T5 @ 6000/9000, inch. My **synthetic single-tool matrix programs** legitimately don't match that golden spec — every row scores 4/10 and exits 3.

The **structural checks PASS** on every program: `program-number` (O-number), `work-offset` (G54), `safe-retract` (G28), `program-end` (M30). The FAILED checks are all golden-spec identity checks: `units expected=inch actual=mm` (correct for the metric combos), `tool-T2/T5-present: absent` (my programs are single-tool), `spindle-speed-Tn expected=<golden rpm> actual=null`.

> **F2 (validator-scope finding):** `post-nc-conformance.mjs` is purpose-built to verify ONE specific golden job, not arbitrary matrix-generated NC. BOTH `rich` and `basic` modes are golden-pinned (tools / RPMs / inch). Used as a matrix conformance gate it false-fails 26/26 by design. The structural sub-checks (program-number / work-offset / safe-retract / program-end) DO pass — those are the meaningful conformance signal for matrix NC. The tool needs a true generic-structural mode before it can gate matrix output.

## Driver harness caveat (chunk2-results.json counts are unreliable)
The driver's in-loop `runValidator` used `execFileSync('node', …)` which failed with **`spawnSync node ENOENT`** (bare `node` not on PATH in that spawn context), recording every validator as exit -1. Therefore `chunk2-results.json` `lintPass`/`conformancePass` are HARNESS ARTIFACTS — disregard them. Its `generated:26`, per-row `gcodeLines`, and `genError:null` fields ARE reliable. The authoritative validator verdicts are the deterministic `execFileSync(process.execPath, …)` runs above (results in `_sweep.json` was used to compute counts, then cleaned).

## Per-combo result (all GENERATED; all LINT exit 0; all CONF exit 3 on golden-spec identity)
combo = material/tooling/machine/motion/packages/controller; U=units; L=lint exit; C=conf exit (basic & rich both 3).

| row_id | combo | U | lines | L | C |
|---|---|---|---|---|---|
| 2 | P/endmill/Okuma-M460V/ulti-on/tsc/diag-independent | mm | 31 | 0 | 3 |
| 7 | P/adaptive/VM30i/g05.1q1/g54.1-ext/hsm-g05p1 | mm | 31 | 0 | 3 |
| 12 | M/adaptive/Haas-OM2/ulti-on/omp40-probe/diag-slowest | mm | 31 | 0 | 3 |
| 17 | K/face/RokuRoku/nc-eia/g54.1-ext/units-inch-g20 | inch | 30 | 0 | 3 |
| 22 | N/drill/Haas-OM2/peck/dxf-import/units-inch-g20 | inch | 31 | 0 | 3 |
| 27 | N/endmill/VM30i/nc-eia/rigid-tap-pkg/smooth-tol | mm | 30 | 0 | 3 |
| 32 | S/face/VMX42SRTi/conversational/rigid-tap-pkg/units-inch-g20 | inch | 30 | 0 | 3 |
| 37 | H/face/Okuma-M460V/ulti-off/rigid-tap-pkg/safestart | mm | 30 | 0 | 3 |
| 42 | H/drill/RokuRoku/peck/rigid-tap-pkg/diag-independent | mm | 31 | 0 | 3 |
| 47 | N/adaptive/VM30i/nc-eia/ultimotion-pkg/setupsheet-prognum | mm | 31 | 0 | 3 |
| 52 | P/face/VM30i/conversational/ultimotion-pkg/units-inch-g20 | inch | 31 | 0 | 3 |
| 57 | K/face/VMX42SRTi/ulti-off/tsc/setupsheet-prognum | mm | 30 | 0 | 3 |
| 62 | H/face/Haas-VF2/ulti-off/omp40-probe/units-inch-g20 | inch | 30 | 0 | 3 |
| 67 | M/bore/Haas-OM2/conversational/g65-macro/units-inch-g20 | inch | 31 | 0 | 3 |
| 72 | P/drill/VMX42SRTi/peck/rtcp-5ax/safestart | mm | 31 | 0 | 3 |
| 77 | N/tap/VMX42SRTi/conversational/rtcp-5ax/diag-independent | mm | 30 | 0 | 3 |
| 82 | K/endmill/VM30i/ulti-on/dxf-import/safestart | mm | 31 | 0 | 3 |
| 87 | P/face/Okuma-M460V/ulti-off/omp40-probe/units-inch-g20 | inch | 30 | 0 | 3 |
| 92 | P/face/VM30i/ulti-off/g65-macro/diag-slowest | mm | 30 | 0 | 3 |
| 97 | N/face/VM30i/ulti-off/ultimotion-pkg/setupsheet-prognum | mm | 31 | 0 | 3 |
| 102 | P/endmill/RokuRoku/ulti-on/dxf-import/hsm-g05p1 | mm | 31 | 0 | 3 |
| 107 | P/tap/VM30i/conversational/ultimotion-pkg/diag-independent | mm | 31 | 0 | 3 |
| 112 | P/face/VM30i/ulti-off/ultimotion-pkg/units-inch-g20 | inch | 31 | 0 | 3 |
| 117 | P/face/VMX42SRTi/ulti-off/rtcp-5ax/units-inch-g20 | inch | 30 | 0 | 3 |
| 122 | N/tap/VM30i/rigid-tap/omp40-probe/diag-slowest | mm | 30 | 0 | 3 |
| 127 | P/endmill/VMX42SRTi/g05.1q1/rtcp-5ax/diag-independent | mm | 30 | 0 | 3 |

> Exit codes uniform across all 26: `all lint exit0: true`, `all conf exit3: true` (conf exit distribution `{"3":26}`). Verified via `execFileSync(process.execPath, …)` reading `e.status` directly.

## Findings
| # | Severity | Finding | Owner |
|---|---|---|---|
| F1 | P2 advisory (lint WARN, exit 0) | Hurco post emits cutting `G01 F…` before any `G93/G94/G95` feed-mode → `feed-no-feedmode` WARN on every program; feed units technically ambiguous. | HurcoV11 post engine (peer-owned — reported, NOT edited) |
| F2 | P1 (validator scope) | `post-nc-conformance.mjs` validates against ONE fixed golden job (`lib/prism-base-job.mjs`); BOTH `rich` and `basic` modes are golden-pinned (tools/RPMs/inch). False-fails 26/26 matrix rows by design. Structural sub-checks (program-number/work-offset/safe-retract/program-end) DO pass. Needs a generic-structural mode for matrix gating. | validation harness / conformance script |
| F3 | P2 (harness) | driver in-loop `execFileSync('node',…)` → `spawnSync node ENOENT`; recorded all validators as exit -1. `chunk2-results.json` lint/conf counts are artifacts; use `process.execPath` for spawns. | this driver |
| F4 | infra (noted) | :3100 MCP server crash-loops under fleet load (uptime resets 646→131→63s). Driver is now resilient (empty-window retry); all 26 still generated. | MCP server / supervisor |

**No engine NC GENERATION defect found.** Units handling correct (G20 on inch rows, G21 on metric — no 25.4× risk). The only NC-quality nit is F1 (missing explicit feed-mode block, advisory).

## Units verification (no scale-error risk)
Engine mm-native. Driver set `units:"inch"` for `controller_settings=units-inch-g20` combos, `metric` otherwise. Verified: row17 emits `G20`; rows 2/77 emit `G21`. Coordinates kept mm-native (units flag controls header + decimal formatting only). No mislabel introduced. (The conformance `units expected=inch actual=mm` FAIL on metric rows is the golden-spec being inch-only, NOT a units bug in the post — the post emitted exactly the units the combo requested.)

## Tool-DB exporters
Out of scope for this NC-generation chunk; not re-exercised. No new exporter built (no genuine gap — all issues were driver/validator-side, documented above).

## Artifacts
- `state/shared/master-post-validation/run-chunk2.mjs` — driver
- `state/shared/master-post-validation/chunk2-results.json` — per-row record (trust `generated`/`results[]`/`gcodeLines`; DISREGARD `lintPass`/`conformancePass` per F3)
- `state/shared/master-post-validation/chunk2-run.log` — driver stdout
- `state/shared/master-post-validation/nc/chunk2-row*.nc` — 26 NC files, all non-empty, all lint-PASS

## Verdict
**Generation 26/26 PASS · Lint 26/26 PASS (1 advisory WARN/program, F1) · Conformance 0/26 (exit 3 — golden-spec scope mismatch F2, NOT an NC defect; structural sub-checks pass).** The Hurco V11 master post emits structurally-correct, dialect-clean NC across all 26 chunk-2 axis combinations (6 materials; all op types incl. drill/tap/bore/adaptive/3d; 6 machines; ulti-on/off + conversational + rigid-tap + g05.1q1; all package + controller-setting axes). The two real action items are F1 (add a feed-mode block to the post) and F2 (give the conformance tool a generic mode so it can gate matrix NC).
