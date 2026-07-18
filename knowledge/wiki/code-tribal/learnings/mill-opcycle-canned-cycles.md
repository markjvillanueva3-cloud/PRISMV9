---
title: Mill op.cycle canned drilling cycles -- all 5 JM mill posts + the additive Workflow build
slug: mill-opcycle-canned-cycles
domain: post-processor
slot: echo
created: 2026-06-28
commits: [5974b5415c, 230a144efe]
tags: [post-processor, mill, canned-cycle, g81, g83, op-cycle, hurco, okuma, haas, rokuroku, workflow, additive, golden-safe]
---

# Mill op.cycle canned drilling cycles -- all 5 JM mill posts

All five JM mill master-posts now emit modal drilling CANNED CYCLES (G81 drill / G82 dwell / G83 peck /
G73 chip-break / G84 tap / G85 bore) when an operation carries an `op.cycle` field. Before 2026-06-28
only **HaasNGC + RokuRoku** did (native); **HurcoV11 + OkumaOSP** emitted a move-list `G0/G1` plunge.
`U-PP-MILL-OPCYCLE` closed that.

## The contract (mirror across all 4 generator mills)

Each engine's mill-operation interface has an OPTIONAL `cycle`:
`{ type: "drill"|"dwell"|"peck"|"chip_break"|"tap"|"bore", depth_mm, retract_mm, peck_mm?, dwell_s? }`.
In the toolpath emitter: `if (op.cycle && (op.operation_type === "drill" || "bore"))` emit a modal canned
cycle -- a BARE first-hole definition line `{G98|G99} G8x Z R [Q] [P] F`, then modal `X Y` for the
remaining holes from `coordinates[]`, then a closing `G80`. Otherwise the EXISTING move-list (unchanged).
Type->G-code map: drill:G81, dwell:G82, peck:G83, chip_break:G73, tap:G84, bore:G85 (universal ISO/Fanuc
codes; Hurco WinMax ISNC + Okuma OSP-P300M ISO mode both use them).

## Two rules that made it safe

1. **ADDITIVE-ONLY.** The branch only fires when `op.cycle` is present; a drill op WITHOUT it emits
   byte-identical output to before. This is what keeps the **golden snapshots byte-unchanged** (existing
   golden ops carry no `cycle`). Verify with `git diff HEAD <engine>` showing 0 removed lines + a test
   that a no-cycle drill still emits its long-hand `G01` (no `G8x`).
2. **Dialect codes from the DB, not a manual.** OkumaOSP sources its codes from
   `ControllerDialectEngine.okuma_osp_p300.canned_cycles` (not an inline table) -- the echo-soul refuse
   `re-deriving-dialect-codes-from-copyrighted-manuals`. HurcoV11 mirrors the proven HaasNGC `CYCLE_GCODE`
   map (same Fanuc family). Mirror an existing proven engine or read the dialect DB; never re-derive.

## The build pattern (ultracode Workflow)

This was built with the `Workflow` tool: one `coder` agent per engine (parallel/pipeline, isolated
contexts so the orchestrator's context stays light) + an adversarial `code-analyzer` verifier per engine
that independently re-runs the tests, confirms additive-only + golden-safe, and **verifies the actual
emitted NC** (not a grep/comment). Both PASS. Then the orchestrator independently re-runs the
whole-corpus verifier and commits only its own files via explicit paths (Workflow agents edit the shared
tree; peers' files auto-unstage). 29 new engine tests; the closed-loop verifier
(`scripts/verify-jm-fleet-coverage.ts`) asserts all 4 mill posts emit `canned G8x OK` for the
`drill-canned` corpus job -- the R15 round-trip gate.

## Related
- [[post-feature-coverage-verify-the-emit]] -- the verify-the-EMIT lesson that surfaced these gaps
- [[jm-fleet-master-post-coverage]] -- the machine-coverage layer
- `state/shared/specs/POST-FEATURE-COVERAGE-MATRIX-2026-06-28.md` -- the per-engine feature matrix
- HaasNGCMillMasterPostEngine (emitCannedCycle ~L384) -- the pattern of record
