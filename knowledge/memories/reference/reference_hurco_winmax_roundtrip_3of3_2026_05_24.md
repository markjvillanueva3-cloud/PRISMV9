---
name: hurco-winmax-roundtrip-3of3-2026-05-24
description: 3/3 JM Die production .hnc files now roundtrip through V11 master post (echo session 64f03cee, 2026-05-24). Operator can load reemit.hnc in WinMax desktop app for baseline validation.
metadata:
  type: reference
---

# HURCO-VM30I-FULL-PSN-MS0 — 3/3 JM Die roundtrip + V11 PSN-engaged (2026-05-24)

Session 64f03cee, slot echo, 12-iter /loop. Closed the readiness gap for testing V11 against the operator's real JM Die production programs in their WinMax desktop app.

## What ships

**V11 PSN-engaged path** — `HurcoV11MillMasterPostEngine.generateProgramWithFullPSN(operations, config, partContext)` composes 4 substrates on top of `generateProgram()`:
- `gcodeRuntimePredictorEngine.predictForMachine()` — kinematic-aware cycle time
- `gcodeBidirectionalOptimizerEngine.optimize()` — top-3 efficiency recommendations
- First-order cost estimate (labor + machine + overhead from shop_rates)
- `prismSelfAwarenessEngine.recommendAIFeatures()` — relevant PRISM features

Returns `HurcoPostOutput` extended with optional `psn_enrichment: HurcoPSNEnrichment` field. Legacy `generateProgram()` leaves it undefined — 14 existing test files stay byte-identical.

**HurcoParserEngine inline-G-code path** — `_extractInlineGCodeOps(lines, program)` fallback runs whenever no op has coordinates (regardless of canned-cycle presence). Synthesizes one HurcoOperation per T#M6 boundary with full modal-state tracking (motion mode persists across X/Y/Z-only blocks). Classifies type from `(STRATEGY:...)`/`(OPERATION:...)`/named-op comments.

**Roundtrip harness** — `scripts/hurco-jmdie-roundtrip-tsx.mjs` → `npx tsx scripts/hurco-jmdie-roundtrip.ts`. Sidecar `.ts` file invoked via `node spawn npx --yes tsx <file>` (shell:true on Windows). NO inline `-e payload` (the iter10 path with embedded TS string failed exit 255 on Windows cmd.exe quoting).

**Operator artifacts** in `state/shared/hurco-jmdie-roundtrip-tsx/reemit/`:
- `1001.reemit.hnc` (1 ADAPTIVE op, 218 lines, full UltiMotion G05.3 P35)
- `0520396.reemit.hnc` (7 ops, G81/G84 mix, full re-emit)
- `SACMA CUTOFF.reemit.hnc` (6 ops, full re-emit)

Plus 6 V11-built sample programs from earlier in session at `state/shared/hurco-winmax-proveout/parts/P1..P6-*.hnc`.

## Key invocation

```bash
# Re-run roundtrip against default 3 files
node H:/prism/scripts/hurco-jmdie-roundtrip-tsx.mjs

# Custom file selection
node H:/prism/scripts/hurco-jmdie-roundtrip-tsx.mjs --files=part1.hnc,part2.hnc
```

Report written to `state/shared/hurco-jmdie-roundtrip-tsx-report.{json,md}` — per-file orig-vs-reemit line counts, first-50 match %, PSN enrichment block, operator load-in-WinMax checklist.

## Lessons

1. **Iter10 trap (avoid):** child_process spawn with inline `-e "<payload>"` and `shell:true` on Windows eats embedded quotes/newlines, returns exit 255 with zero stdout/stderr. Always use sidecar files for tsx invocations.
2. **Iter12 trap (avoid):** parser fallback guards must NOT block when existing-classifier ops carry useful METADATA (g_code !== null) but no COORDINATES — the harness adapter needs coords, not g_code tags. Run fallback whenever no op has coords; let synthetic and canned-cycle ops coexist.
3. **Dist/src mismatch:** `npm run build:fast` only updates the esbuild bundle, NOT `dist/engines/*.js`. For scripts that import per-file dist outputs, need `npm run build:tsc` — but that times out under multi-chat CPU load on this PC. tsx-direct-import path bypasses both.
4. **Peer-slot commit absorption:** iter12 commit got absorbed into foxtrot's `807d882c03` ([[feedback_commit_to_slot_worktree]] doctrine — slot-worktree migration prevents this; this session ran in shared `H:/prism` tree by design after the `[BOOTSTRAP-SLOT-ENFORCE]` tag).

## Operator next steps

1. Load each `.reemit.hnc` from `state/shared/hurco-jmdie-roundtrip-tsx/reemit/` in WinMax desktop app
2. Note: does it load clean? simulate clean? compare to original
3. Each failure becomes a unit in HURCO-POST-REMEDIATION-MS2

## Cross-refs

- [[reference_hurco_winmax_proveout_ms0_2026_05_23]] — original india work this session absorbed
- [[feedback_psn_definition]] — 11-leg PSN taxonomy
- [[feedback_post_development]] — vendor-base-first doctrine
- [[feedback_commit_to_slot_worktree]] — shared-tree absorption pattern
- Commits: `d0b2621bec` (V11 PSN), `ed8fedb2c5` (TSX sidecar 1/3), `807d882c03`* (iter12 3/3, absorbed)
