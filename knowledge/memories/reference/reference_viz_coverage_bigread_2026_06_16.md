---
name: reference_viz_coverage_bigread_2026_06_16
description: U-VIZ-COVERAGE-TEST-BIGREAD (slot:sierra) -- viz-domain-coverage.test.mjs crashed with ERR_STRING_TOO_LONG doing JSON.parse(readFileSync(system-graph.json,"utf8")) on the 765MB graph; fixed with a size-gate via canonical exceedsStringParseCap(); R15 sweep found this was the ONLY naive reader of the 765MB file
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.252Z
aliases: reference_viz_coverage_bigread_2026_06_16
---


**SYSTEM-VIZ-HARDEN/U-VIZ-COVERAGE-TEST-BIGREAD** (slot:sierra, system-viz domain, 2026-06-16, commit `100c495bc3` on cad-fusion-live-ms0).

Found via a red-test scan of the system-viz pure-lib tests (283/284 passing; 1 red). The red was NOT an assertion failure -- it was a CRASH: `viz-domain-coverage.test.mjs:297` did `JSON.parse(fs.readFileSync(SYSTEM_GRAPH_PATH, "utf8"))` with no size guard. The live `system-graph.json` is now **765MB** -- over Node's UTF-8 string cap (`0x1fffffe8` ~512MB) -- so `readFileSync(...,"utf8")` threw `ERR_STRING_TOO_LONG` (confirmed: `error: 'Cannot create a string longer than 0x1fffffe8 characters'`). The crash hit BEFORE the test's existing `schemaVersion !== "2.1.0"` skip (lines ~304) that was DESIGNED to skip exactly this merged-product case -- the read crashed before the skip could fire.

**Fix (1-file, additive):** `import { exceedsStringParseCap } from "./graph-io.mjs"` + a size-gate before the read -- `if (exceedsStringParseCap(fs.statSync(SYSTEM_GRAPH_PATH).size)) { t.skip(...); return; }`. Reuses the canonical cap (`V8_MAX_STRING_BYTES`) -- no inlined constant. The gate skips LOUDLY (R12 `t.skip` with size + reason) when the merged regen-viz product is on the shared path (its designed behavior), and the full-read + all 8 assertions still run for the small generate-system-viz 2.1.0 product (< cap). NOT a test-weakening (both reviewers verified R9: the assertions are intact; the gate is the 3rd loud-skip guard in a sequence the author already established). 17 pass / 0 fail / 1 loud-skip (was 1 crash). 2-agent scrutiny PASS 0 P0/P1.

**R15 "build it everywhere" sweep (the bug CLASS):** "naive `JSON.parse(readFileSync(<765MB graph>,'utf8'))`" is a recurring crash class (the same one `validate-ghost-wires.mjs` + `system-viz-ghost-report.mjs` already guard with their `STREAMING_READ_THRESHOLD_BYTES` / streaming readers).

**CORRECTION (R12) -- my FIRST sweep grep was too narrow + overclaimed "0 other naive readers".** The first pattern (`readFileSync(...SYSTEM_GRAPH|system-graph..., "utf8")` on one line) only matched literal-path reads; it MISSED the `JSON.parse(readFileSync(abs,"utf8"))` form where `abs = resolve(REPO, graphPath)` (a resolved variable). A broader re-sweep (`JSON.parse(readFileSync` across scripts + the literal `system-viz/system-graph.json` path) found **2 MORE genuine crashers**. Final tally:
- **3 real bugs FIXED:** (1) `viz-domain-coverage.test.mjs` (commit `100c495bc3`, U-VIZ-COVERAGE-TEST-BIGREAD); (2) `roadmap-to-viz-nodes.mjs` `loadGraphNodeIds` + (3) `audit-roadmap-viz-bindings.mjs` `loadGraphNodeIndex` (commit `d5a21b63df`, U-VIZ-ROADMAP-BIGREAD; the latter was an UNTRACKED file, now committed). Both #2/#3 only need node IDs -> fixed with `streamGraphArray(abs,"nodes",cb)` (projection, low memory), size-gated by `exceedsStringParseCap`. roadmap-to-viz-nodes.test 26/26 (was 3 crash); audit-roadmap-viz-bindings smoke clean on the live 346,676-node graph.
- **1 false-positive:** `audit-token-savings-coverage.mjs:211` reads the curated `architecture-graph.json` (60MB, < cap) by design (alpha's, comment line 26-29). Untouched.
- **NOT exhaustively audited:** ~60 scripts reference the literal `system-graph.json` path; most use `readGraphStreaming` (safe) but a full file-by-file audit was NOT completed (fork-storm + MCP degradation this session). A residual naive reader among the unaudited ~57 is possible -> follow-up: intersect "references system-graph.json" with "JSON.parse(readFileSync) AND no graph-io import". Canonical safe readers confirmed: validate-ghost-wires, system-viz-ghost-report, ghost-wire-outcomes-to-refpool.

**Lesson:** an R15 "build it everywhere" sweep is only as complete as its grep pattern. A naive-read can hide behind a resolved path variable (`readFileSync(abs,...)`) -- sweep by BOTH the construct (`JSON.parse(readFileSync`) AND the target (`system-graph.json` path literal), and state explicitly when the audit is partial (R12) rather than claim "0 others".

**Canonical rule for reading the merged graph (sierra-soul anti-pattern):** NEVER `JSON.parse(readFileSync(system-graph.json,"utf8"))` -- it is 765MB > the V8 string cap. Use `readGraphStreaming()` (full materialize, needs ~12GB heap reexec for the merged product) or `streamGraphArray()` (projection, low memory) or `countGraphArrayStreaming()` from `scripts/lib/graph-io.mjs`. Size-gate with `exceedsStringParseCap(byteLength)` to skip/fallback. The graph crossed 512MB on 2026-05-27 and keeps growing (765MB now).

Related: [[reference_v8_graph_read_mass_migration_2026_05_25]] (papa's mass migration of graph readers to streaming) · [[reference_u_viz_ghost_wire_validate_2026_05_21]] (sibling validator with the STREAMING_READ_THRESHOLD guard) · same session: [[reference_viz_ghost_wire_strength_2026_06_16]].
